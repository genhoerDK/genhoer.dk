/**
 * Old, raw bunker concrete for the 3D models, made in the browser — after the photos of the gun
 * emplacement: eighty years of weather on concrete cast against boards.
 *
 *   - the boards it was cast against show on its upright faces, each a shade of its own, the joints
 *     between them darker, white lime bleeding out under some of them
 *   - rain has run down the walls in dark streaks; damp and moss climb the walls from below, darkest
 *     where they stand in the ground; lichen on the tops; dark wet patches on the floors
 *   - its outer edges and corners are worn round, unevenly, chipped in places down to the coarse
 *     stones in it; dirt gathers in its inner corners
 *   - a rough, pitted skin, the stones showing through where it has weathered most
 *
 * A tileable noise texture is laid on by position rather than by UV (triplanar), so any geometry gets
 * it at the same scale without unwrapping. Positions are read from the geometry itself (metres in
 * the model), so the weathering stays put while the model turns and scales.
 *
 * Edges: the geometry may carry, per vertex, aBary (one-hot per triangle corner) and aConvex /
 * aConcave (each triangle's altitudes to its outer and inner creases, 1e4 where an edge is none) —
 * see markEdges in kanonstilling.js — and aExtraConvex / aExtraConcave, each corner's distance to
 * up to two creases that end at the triangle without being its edges. From them the shader knows how far a point is from the nearest
 * outer and inner edge. Without them the edges are left sharp.
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
 *   walk      the height below which walls stand in the ground: damp and moss climb them from below
 *   scale     metres one texture tile covers
 *   lichen    0–1 how much lichen on top faces
 *   boards    0–1 how much the formwork's boards show on upright faces
 */
export function concreteMaterial({ textured = true, floors = [0], walk = 0, scale = 4, lichen = 0.6, boards = 1, color = 0xc4c3bf, lichenColor = 0x5b5f50, mossColor = 0x2f3529 } = {}) {
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
            uMossColor: { value: new THREE.Color(mossColor) },
            uFloors: { value: new THREE.Vector4(...floorList) },
            uWalk: { value: walk },
        });
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                attribute vec3 aBary, aConvex, aConcave;
                attribute vec2 aExtraConvex, aExtraConcave;
                varying vec3 vModelPos, vModelNormal, vBary, vConvex, vConcave;
                varying vec2 vExtraConvex, vExtraConcave;
                varying float vModelScale;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
                vModelPos = position;
                vModelNormal = normal;
                vBary = aBary;
                // without edge data (all zero) no edge counts as near
                vConvex = dot(aConvex, vec3(1.0)) == 0.0 ? vec3(1e4) : aConvex;
                vConcave = dot(aConcave, vec3(1.0)) == 0.0 ? vec3(1e4) : aConcave;
                bool noExtra = dot(aExtraConvex, vec2(1.0)) == 0.0 && dot(aExtraConcave, vec2(1.0)) == 0.0 && dot(aConvex, vec3(1.0)) == 0.0;
                vExtraConvex = noExtra ? vec2(1e4) : aExtraConvex;
                vExtraConcave = noExtra ? vec2(1e4) : aExtraConcave;
                vModelScale = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
                uniform sampler2D uWeather;
                uniform float uTexScale, uLichen, uBoards, uWalk;
                uniform vec3 uLichenColor, uMossColor;
                uniform vec4 uFloors;
                varying vec3 vModelPos, vModelNormal, vBary, vConvex, vConcave;
                varying vec2 vExtraConvex, vExtraConcave;
                varying float vModelScale;
                vec4 triplanar(vec3 p, vec3 w) {
                    return texture2D(uWeather, p.yz) * w.x + texture2D(uWeather, p.xz) * w.y + texture2D(uWeather, p.xy) * w.z;
                }
                float footGrime(float z, float f) {
                    float above = z - f;
                    return above < -0.02 ? 0.0 : exp(-max(above, 0.0) / 0.45);
                }
                // How far from the nearest of a triangle's creases: an edge that is none counts as far away
                float edgeDistance(vec3 alt) {
                    vec3 d = vBary * alt + step(1000.0, alt) * 1e4;
                    return min(min(d.x, d.y), d.z);
                }
                // Bump from a height in metres (unnormalised surface gradients, so it is true to size)
                vec3 bumped(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
                    vec3 sx = dFdx(surfPos), sy = dFdy(surfPos);
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
                vec4 fine = triplanar(cp * 3.7 + 0.11, cw);
                vec4 far = triplanar(cp * 0.23 + 0.37, cw);   // a coarser layer breaks up the tiling
                float stain = mix(near.g, far.g, 0.6);

                float tone = 0.48 + (near.r - 0.5) * 0.32 + (fine.r - 0.5) * 0.14 + (stain - 0.5) * 0.95;

                // Where the skin has weathered off, the stones show: coarse, lighter and darker flecks
                float exposed = smoothstep(0.55, 0.72, far.r * 0.6 + near.g * 0.6);
                tone *= mix(1.0, 0.8 + fine.r * 0.5, exposed);

                // The formwork: a board every 20 cm up the walls, each a shade of its own
                float wall = smoothstep(0.8, 0.97, 1.0 - abs(cn.z)) * uBoards;
                float bz = vModelPos.z / 0.2 + far.g * 0.08 + near.g * 0.04;
                // (faded out where the boards get closer than a few pixels apart, so they don't shimmer)
                float sharp = 1.0 - smoothstep(0.12, 0.35, fwidth(bz));
                float seam = smoothstep(0.8, 1.0, fract(bz)) * mix(0.55, 1.0, far.b) * sharp;
                float plank = texture2D(uWeather, vec2(floor(bz) * 0.173 + 0.05, 0.31)).g;
                tone *= mix(1.0, (0.88 + plank * 0.24 * sharp + 0.12 * (1.0 - sharp)) * (1.0 - seam * 0.3), wall);
                // white lime bleeding out under some of the joints
                float lime = smoothstep(0.62, 0.8, near.b) * smoothstep(0.55, 0.75, far.g) * wall
                    * mix(0.35, exp(-fract(bz + 0.12) * 3.5), sharp) * smoothstep(0.4, 0.7, fine.b);

                // Rain has run down the walls in dark streaks
                vec4 runs = triplanar(vec3(vModelPos.x * 0.35, vModelPos.y * 0.35, vModelPos.z * 0.12) * uTexScale + 0.21, cw);
                float streak = smoothstep(0.6, 0.85, runs.b) * smoothstep(0.35, 0.75, far.b) * upright;
                tone *= 1.0 - 0.5 * streak;

                // Grime at the foot of the walls, damp and moss climbing them from the ground
                float grime = max(max(footGrime(vModelPos.z, uFloors.x), footGrime(vModelPos.z, uFloors.y)),
                                  max(footGrime(vModelPos.z, uFloors.z), footGrime(vModelPos.z, uFloors.w)));
                tone *= 1.0 - 0.35 * grime * upright;
                float damp = smoothstep(uWalk + 0.6, uWalk - 1.4, vModelPos.z + (far.g - 0.5) * 1.2) * upright;
                float moss = damp * smoothstep(0.3, 0.55, near.a * 0.6 + far.g * 0.5);

                // Dark wet patches on the floors, a lighter dry crust round them
                float wet = smoothstep(0.6, 0.68, far.g) * level;
                float crust = smoothstep(0.3, 0.22, far.g) * level;
                tone *= (1.0 - 0.45 * wet) * (1.0 + 0.12 * crust);

                // The edges: outer ones worn round over an uneven 3–12 cm and chipped in places to the
                // stones; dirt gathered in the inner ones
                float dOut = min(edgeDistance(vConvex), min(vExtraConvex.x, vExtraConvex.y));
                float dIn = min(edgeDistance(vConcave), min(vExtraConcave.x, vExtraConcave.y));
                float wearW = 0.03 + 0.09 * smoothstep(0.25, 0.8, fine.g * 0.6 + near.r * 0.5);
                float worn = 1.0 - smoothstep(0.0, wearW, dOut);
                float chip = smoothstep(0.45, 0.62, worn * (0.55 + fine.r * 0.9));
                tone *= mix(1.0, 1.15 + (fine.r - 0.5) * 0.7, chip);
                tone *= 1.0 - 0.12 * worn * (1.0 - chip);
                float corner = 1.0 - smoothstep(0.0, 0.18 + 0.12 * near.g, dIn);
                tone *= 1.0 - 0.3 * corner;

                // Lichen on the tops
                float lichen = smoothstep(0.6, 0.82, near.a * 0.5 + far.a * 0.6) * smoothstep(0.3, 0.9, cn.z) * uLichen * (1.0 - wet);
                vec3 col = vec3(tone) + lime * 0.28;
                col = mix(col, uLichenColor * (0.65 + near.r * 0.5), lichen);
                col = mix(col, uMossColor * (0.6 + fine.r * 0.8), moss * 0.85);
                col = mix(col, col * vec3(0.8, 0.83, 0.78), damp * 0.7);
                col *= mix(vec3(1.02, 1.0, 0.96), vec3(0.96, 0.98, 1.02), stain);   // warmer and cooler stains
                diffuseColor.rgb *= col * 1.6;

                // The surface's height in metres: grain and pits, the boards' joints, the chips, and
                // the outer edges falling away round (a quarter circle across the worn band)
                float u = clamp(1.0 - dOut / wearW, 0.0, 1.0);
                float roundOff = wearW * (1.0 - sqrt(max(0.0, 1.0 - u * u)));
                float weatherHeight = (near.r * 0.0012 + fine.r * 0.0018 + exposed * fine.r * 0.004 - seam * 0.0025 * wall
                    - chip * fine.r * 0.012 - roundOff) * vModelScale;`)
            .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
                roughnessFactor = mix(roughnessFactor, 0.55, wet);`)
            .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
                // the fine relief fades where a centimetre is less than a pixel, so far off it doesn't shimmer
                float pixelSize = length(fwidth(vModelPos));
                float detail = 1.0 - smoothstep(0.012, 0.04, pixelSize);
                normal = bumped(-vViewPosition, normal, vec2(dFdx(weatherHeight), dFdy(weatherHeight)) * detail, faceDirection);`);
    };
    return material;
}
