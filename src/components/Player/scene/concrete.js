/**
 * Concrete for the 3D models, made in the browser: a tileable texture (grey with stains, grain,
 * streaks running down, and where moss would grow) laid on by position rather than by UV
 * (triplanar), so any geometry gets it at the same scale without unwrapping. Top faces get the moss.
 *
 * Positions are read from the geometry itself (metres in the model), so the texture stays put
 * while the model turns and scales. Upright faces show the boards the concrete was cast against.
 */

import * as THREE from 'three';

/** Tileable fractal value noise, 0–1 */
function tileNoise(size, cells, octaves, seed) {
    const out = new Float32Array(size * size);
    const hash = (x, y, o) => {
        const n = Math.sin(x * 127.1 + y * 311.7 + o * 74.7 + seed * 19.3) * 43758.5453;
        return n - Math.floor(n);
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    let amp = 0.5, total = 0;
    for (let o = 0; o < octaves; o++) {
        const g = cells << o;
        for (let y = 0; y < size; y++) {
            const fy = (y / size) * g, yi = Math.floor(fy), ty = smooth(fy - yi);
            for (let x = 0; x < size; x++) {
                const fx = (x / size) * g, xi = Math.floor(fx), tx = smooth(fx - xi);
                const x0 = xi % g, x1 = (xi + 1) % g, y0 = yi % g, y1 = (yi + 1) % g;
                const a = hash(x0, y0, o), b = hash(x1, y0, o), c = hash(x0, y1, o), d = hash(x1, y1, o);
                out[y * size + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
            }
        }
        total += amp;
        amp *= 0.5;
    }
    for (let i = 0; i < out.length; i++) out[i] /= total;
    return out;
}

/** RGB: the concrete's colour (sRGB); A: where moss grows */
function concreteTexture(size = 512) {
    const stains = tileNoise(size, 3, 5, 1);
    const grain = tileNoise(size, 48, 2, 2);
    const moss = tileNoise(size, 5, 4, 3);
    const streakOf = tileNoise(size, 64, 1, 4);   // one row of it: how strong each column's streak is
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = y * size + x;
            const streak = Math.max(0, streakOf[x] - 0.62) * 2.5 * stains[((y * 2) % size) * size + x];
            let v = (0.56 + (stains[i] - 0.5) * 0.4 + (grain[i] - 0.5) * 0.1 - streak * 0.07) * (grain[i] < 0.22 ? 0.82 : 1);
            v = Math.min(1, Math.max(0.08, v));
            const k = i * 4;
            data[k] = v * 255;
            data[k + 1] = v * 254;
            data[k + 2] = v * 251;   // only a touch warm: the photo behind is black and white
            data[k + 3] = Math.min(1, Math.max(0, moss[i] * 1.25 + (stains[i] - 0.5) * 0.4)) * 255;
        }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 4;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
}

/**
 * A material for geometry with vertex colours (shade / tint) in metres.
 *   textured  false = the raw look: flat grey, no texture
 *   scale     metres one texture tile covers
 *   moss      0–1 how much moss on top faces
 *   boards    0–1 how much the formwork's boards show on upright faces
 */
export function concreteMaterial({ textured = true, scale = 3.2, moss = 0.35, boards = 1, color = 0xc2c2c0, mossColor = 0x66695e } = {}) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, vertexColors: true });
    if (!textured) return material;

    const texture = concreteTexture();
    material.userData.texture = texture;
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uConcrete = { value: texture };
        shader.uniforms.uTexScale = { value: 1 / scale };
        shader.uniforms.uMoss = { value: moss };
        shader.uniforms.uBoards = { value: boards };
        shader.uniforms.uMossColor = { value: new THREE.Color(mossColor) };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vModelPos;\nvarying vec3 vModelNormal;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvModelPos = position;\nvModelNormal = normal;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
                uniform sampler2D uConcrete;
                uniform float uTexScale, uMoss, uBoards;
                uniform vec3 uMossColor;
                varying vec3 vModelPos;
                varying vec3 vModelNormal;
                vec4 triplanar(vec3 p, vec3 w) {
                    return texture2D(uConcrete, p.yz) * w.x + texture2D(uConcrete, p.xz) * w.y + texture2D(uConcrete, p.xy) * w.z;
                }`)
            .replace('#include <map_fragment>', `
                vec3 cn = normalize(vModelNormal);
                vec3 cw = pow(abs(cn), vec3(4.0));
                cw /= cw.x + cw.y + cw.z;
                vec3 cp = vModelPos * uTexScale;
                vec4 near = triplanar(cp, cw);
                vec4 far = triplanar(cp * 0.21 + 0.37, cw);   // a coarser layer breaks up the tiling
                vec3 concrete = near.rgb * mix(0.8, 1.15, far.r);
                // The formwork: a board every 20 cm up the upright faces, each a little lighter or darker
                float bz = vModelPos.z / 0.2 + far.g * 0.08;
                float seam = smoothstep(0.88, 1.0, fract(bz));
                float plank = texture2D(uConcrete, vec2(floor(bz) * 0.173 + 0.05, 0.31)).r;
                concrete *= mix(1.0, (0.9 + plank * 0.22) * (1.0 - seam * 0.28), (1.0 - cw.z) * uBoards);
                float mossy = smoothstep(0.7, 0.95, near.a * 0.45 + far.a * 0.75) * smoothstep(0.35, 0.9, cn.z) * uMoss;
                diffuseColor.rgb *= mix(concrete * 1.8, uMossColor * (0.7 + near.r), mossy);`);
    };
    return material;
}
