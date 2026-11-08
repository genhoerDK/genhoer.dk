/**
 * The haze the distance greys over into (STIL.md): everything far off takes the haze's colour, and
 * then what lies behind it, so a place never has an edge to see. Two kinds, both patched into a
 * material's shader, so any material can stand in the haze:
 *
 *   around a point:  createHazeAround({ centre, near, far }) and hazedAround(material, haze)
 *                    the further from the middle, the hazier (53 sekunder til fælles, z up)
 *   over a map:      hazeMap(streets, extent) and hazedOverMap(material, haze)
 *                    clear in the town, hazy where it ends, lying still there (Tværveje, y up)
 *
 * The colour is the style's haze (GREYS.haze, kit/style.js).
 */

import * as THREE from 'three';
import { GREYS } from '@/player/kit/style';

/* ---------- AROUND A POINT ---------- */

/**
 * The shared uniforms for hazedAround: the haze's colour, what lies behind (both may change, with
 * the weather), the middle and the range in metres. Set `uToPlace` to the inverse of the place's
 * world matrix every frame, so the distance is measured in the place's own metres.
 */
export function createHazeAround({ centre, near, far, colour = GREYS.haze, back = GREYS.back }) {
    return {
        uniforms: {
            uHaze: { value: new THREE.Color(colour) },
            uBack: { value: new THREE.Color(back) },
            uToPlace: { value: new THREE.Matrix4() },
            uHazeCentre: { value: new THREE.Vector2(...centre) },
            uHazeRange: { value: new THREE.Vector2(near, far) },
        },
    };
}

/**
 * The haze, put into a material: whatever it draws is mixed into the haze's colour the further it
 * stands from the town's middle — from `near` to `far` metres out — after the light, so at
 * the far edge it is exactly the colour of what lies behind — the sky's horizon, or the dark — and
 * the town fades out into it. The uniforms are shared: the haze's and the background's colours
 * (the scene changes them with the weather) and `toPlace` (the inverse
 * of the place's world matrix, set every frame, so the distance is measured in the place's metres).
 */
export function hazedAround(material, haze) {
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, haze.uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nuniform mat4 uToPlace;\nvarying vec2 vPlace;')
            .replace('#include <project_vertex>', '#include <project_vertex>\nvPlace = (uToPlace * modelMatrix * vec4(transformed, 1.0)).xy;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform vec3 uHaze, uBack;\nuniform vec2 uHazeCentre, uHazeRange;\nvarying vec2 vPlace;')
            .replace('#include <fog_fragment>', `{
                // eased in only at the start, then an even greying out over the whole range, long drawn out
                float k = clamp((length(vPlace - uHazeCentre) - uHazeRange.x) / (uHazeRange.y - uHazeRange.x), 0.0, 1.0);
                k = (k < 0.15 ? k * k / 0.3 : k - 0.075) / 0.925;
                gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, k * 0.7);                  // a grey veil, thickening evenly all the way
                gl_FragColor.rgb = mix(gl_FragColor.rgb, uBack, smoothstep(0.3, 1.0, k));    // and slowly gone into what is behind
            }
            #include <fog_fragment>`);
    };
    return material;
}

/* ---------- OVER A MAP: fixed where the town ends (Tværveje, y up) ---------- */

/**
 * A map of the haze over the ground, made once: 0 in the town, rising with the distance from the
 * nearest street, and 1 at the map's own edges. It lies still while you walk and look about —
 * over the fjord, the open land and beyond the last streets.
 */
export function hazeMap(streets, [x0, z0, x1, z1], { town = [30, 140], edge: fadeEdge = 150 } = {}) {
    const W = 160, H = Math.max(2, Math.round((W * (z1 - z0)) / (x1 - x0)));
    const segments = streets.flatMap(({ lines, half }) => lines.flatMap((l) => {
        const out = [];
        for (let i = 2; i < l.length; i += 2) out.push([l[i - 2], l[i - 1], l[i], l[i + 1], half]);
        return out;
    }));
    const data = new Uint8Array(W * H * 4);
    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
            const x = x0 + ((i + 0.5) / W) * (x1 - x0), z = z0 + ((j + 0.5) / H) * (z1 - z0);
            let d = Infinity;
            for (const [ax, az, bx, bz, half] of segments) {
                const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz;
                const t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l)) : 0;
                const ex = ax + dx * t - x, ez = az + dz * t - z;
                d = Math.min(d, Math.sqrt(ex * ex + ez * ez) - half);
            }
            const edge = Math.min(x - x0, x1 - x, z - z0, z1 - z);
            const v = Math.max(smooth(town[0], town[1], d), 1 - smooth(0, fadeEdge, edge));
            data.set([v * 255, v * 255, v * 255, 255], (j * W + i) * 4);
        }
    }
    const tex = new THREE.DataTexture(data, W, H);
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
}

/** How deep in the haze a point on the ground is (0–1), from the haze map */
export const HAZE_GLSL = `
    uniform sampler2D uHazeMap;
    uniform vec4 uExtent;
    uniform vec3 uHaze;
    float hazeAt(vec2 at) {
        vec2 uv = (at - uExtent.xy) / (uExtent.zw - uExtent.xy);
        if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 1.0;
        return texture2D(uHazeMap, uv).r;
    }`;

export function hazedOverMap(material, haze, { fade = true } = {}) {
    material.transparent = true;
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, haze);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vHazeAt;')
            .replace('#include <project_vertex>', '#include <project_vertex>\nvHazeAt = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>\nvarying vec3 vHazeAt;\n${HAZE_GLSL}`)
            .replace('#include <dithering_fragment>', `
                float hazeH = hazeAt(vHazeAt.xz);
                gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, hazeH * ${fade ? '0.95' : '0.45'});
                ${fade ? 'gl_FragColor.a *= 1.0 - smoothstep(0.55, 1.0, hazeH);' : ''}
                #include <dithering_fragment>`);
    };
    return material;
}

