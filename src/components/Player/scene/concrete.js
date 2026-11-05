/**
 * Raw, weathered concrete for the 3D models, made in the browser — after the photos of the gun
 * emplacement: the boards it was cast against showing on its upright faces, each a shade of its
 * own; dark streaks where rain has run down; grime and damp at the foot of the walls; dark wet
 * patches on the floors; lichen on the tops; a rough, pitted surface.
 *
 * A tileable noise texture is laid on by position rather than by UV (triplanar), so any geometry
 * gets it at the same scale without unwrapping. Positions are read from the geometry itself
 * (metres in the model), so the weathering stays put while the model turns and scales.
 *
 *   R  grain and pits        G  large stains        B  streaks (stretched up and down)
 *   A  where lichen grows
 */

import * as THREE from 'three';

/** Tileable fractal value noise, 0–1; cx × cy cells in the first octave (cx ≠ cy stretches it) */
function tileNoise(size, cx, cy, octaves, seed) {
    const out = new Float32Array(size * size);
    const hash = (x, y, o) => {
        const n = Math.sin(x * 127.1 + y * 311.7 + o * 74.7 + seed * 19.3) * 43758.5453;
        return n - Math.floor(n);
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    let amp = 0.5, total = 0;
    for (let o = 0; o < octaves; o++) {
        const gx = cx << o, gy = cy << o;
        for (let y = 0; y < size; y++) {
            const fy = (y / size) * gy, yi = Math.floor(fy), ty = smooth(fy - yi);
            for (let x = 0; x < size; x++) {
                const fx = (x / size) * gx, xi = Math.floor(fx), tx = smooth(fx - xi);
                const x0 = xi % gx, x1 = (xi + 1) % gx, y0 = yi % gy, y1 = (yi + 1) % gy;
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

function weatherTexture(size = 512) {
    const grain = tileNoise(size, 64, 64, 2, 2);
    const pits = tileNoise(size, 128, 128, 1, 5);
    const stains = tileNoise(size, 3, 3, 5, 1);
    const streaks = tileNoise(size, 40, 3, 3, 4);   // many across, few up and down: runs of water
    const lichen = tileNoise(size, 6, 6, 4, 3);
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
        const k = i * 4;
        data[k] = Math.min(1, grain[i] * (pits[i] < 0.3 ? 0.55 : 1)) * 255;
        data[k + 1] = stains[i] * 255;
        data[k + 2] = streaks[i] * 255;
        data[k + 3] = lichen[i] * 255;
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
}

/**
 * A material for geometry with vertex colours (shade / tint) in metres, z up.
 *   textured  false = plain grey concrete; true = weathered
 *   floors    heights (z) where floors are: walls get grimy at their foot there
 *   scale     metres one texture tile covers
 *   lichen    0–1 how much lichen on top faces
 *   boards    0–1 how much the formwork's boards show on upright faces
 */
export function concreteMaterial({ textured = true, floors = [0], scale = 4, lichen = 0.5, boards = 1, color = 0xc4c3bf, lichenColor = 0x5f6156 } = {}) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, vertexColors: true });
    if (!textured) return material;

    const texture = weatherTexture();
    material.userData.texture = texture;
    const floorList = [...floors, ...Array(4).fill(-1000)].slice(0, 4);
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, {
            uWeather: { value: texture },
            uTexScale: { value: 1 / scale },
            uLichen: { value: lichen },
            uBoards: { value: boards },
            uLichenColor: { value: new THREE.Color(lichenColor) },
            uFloors: { value: new THREE.Vector4(...floorList) },
        });
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vModelPos;\nvarying vec3 vModelNormal;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvModelPos = position;\nvModelNormal = normal;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
                uniform sampler2D uWeather;
                uniform float uTexScale, uLichen, uBoards;
                uniform vec3 uLichenColor;
                uniform vec4 uFloors;
                varying vec3 vModelPos;
                varying vec3 vModelNormal;
                vec4 triplanar(vec3 p, vec3 w) {
                    return texture2D(uWeather, p.yz) * w.x + texture2D(uWeather, p.xz) * w.y + texture2D(uWeather, p.xy) * w.z;
                }
                // Grime at the foot of a wall standing on a floor at height f
                float footGrime(float z, float f) {
                    float above = z - f;
                    return above < -0.02 ? 0.0 : exp(-max(above, 0.0) / 0.45);
                }
                vec3 roughen(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
                    vec3 sx = normalize(dFdx(surfPos)), sy = normalize(dFdy(surfPos));
                    vec3 r1 = cross(sy, surfNorm), r2 = cross(surfNorm, sx);
                    float det = dot(sx, r1) * faceDir;
                    vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
                    return normalize(abs(det) * surfNorm - grad);
                }`)
            .replace('#include <map_fragment>', `
                vec3 cn = normalize(vModelNormal);
                vec3 cw = pow(abs(cn), vec3(4.0));
                cw /= cw.x + cw.y + cw.z;
                float upright = 1.0 - cw.z;
                float level = smoothstep(0.85, 0.98, cn.z);
                vec3 cp = vModelPos * uTexScale;
                vec4 near = triplanar(cp, cw);
                vec4 far = triplanar(cp * 0.23 + 0.37, cw);   // a coarser layer breaks up the tiling
                float stain = mix(near.g, far.g, 0.6);

                float tone = 0.56 + (near.r - 0.5) * 0.26 + (stain - 0.5) * 0.7;

                // The formwork: a board every 20 cm up the upright faces, each a little lighter or darker
                // (only on walls standing straight up; the sloping cone was cast otherwise)
                float wall = smoothstep(0.8, 0.97, 1.0 - abs(cn.z)) * uBoards;
                float bz = vModelPos.z / 0.2 + far.g * 0.08 + near.g * 0.04;
                float seam = smoothstep(0.88, 1.0, fract(bz)) * mix(0.4, 1.0, near.b);
                float plank = texture2D(uWeather, vec2(floor(bz) * 0.173 + 0.05, 0.31)).g;
                tone *= mix(1.0, (0.9 + plank * 0.2) * (1.0 - seam * 0.2), wall);

                // Rain has run down the upright faces in dark streaks
                float streak = smoothstep(0.52, 0.85, near.b) * mix(0.35, 1.0, far.b) * upright;
                tone *= 1.0 - 0.5 * streak;

                // Grime and damp at the foot of the walls
                float grime = max(max(footGrime(vModelPos.z, uFloors.x), footGrime(vModelPos.z, uFloors.y)),
                                  max(footGrime(vModelPos.z, uFloors.z), footGrime(vModelPos.z, uFloors.w)));
                tone *= 1.0 - 0.38 * grime * upright;

                // Dark wet patches on the floors, lighter dry crust round them
                float wet = smoothstep(0.6, 0.68, far.g) * level;
                float crust = smoothstep(0.3, 0.22, far.g) * level;
                tone *= (1.0 - 0.45 * wet) * (1.0 + 0.12 * crust);

                // Lichen on the tops
                float lichen = smoothstep(0.6, 0.82, near.a * 0.5 + far.a * 0.6) * smoothstep(0.3, 0.9, cn.z) * uLichen * (1.0 - wet);
                vec3 col = mix(vec3(tone), uLichenColor * (0.65 + near.r * 0.5), lichen);
                col *= mix(vec3(1.02, 1.0, 0.96), vec3(0.96, 0.98, 1.02), stain);   // warmer and cooler stains
                diffuseColor.rgb *= col * 1.6;
                float weatherBump = near.r * 0.12 + (1.0 - seam) * 0.05 * wall;`)
            .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
                roughnessFactor = mix(roughnessFactor, 0.55, wet);`)
            .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
                normal = roughen(-vViewPosition, normal, vec2(dFdx(weatherBump), dFdy(weatherBump)), faceDirection);`);
    };
    return material;
}
