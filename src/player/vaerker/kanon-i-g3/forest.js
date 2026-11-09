/**
 * The forest round Kanonstilling G3 (three.js), after the photos of the place: pine forest on sand
 * at Dueodde, the emplacement half taken back by it. The trees are the kit's (kit/trees.js): tall
 * ones out in the forest, young ones and bushes nearer the concrete, fallen trunks, the forest
 * going on beyond into the haze. Trees between the viewer and the emplacement thin out in a fine
 * dither, so they never hide it: call update() each frame.
 *
 * Metres, z up, the middle of the gun pit at the origin. Everything comes from one seed, so it
 * looks the same each time.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { greyMaterial, edgeLines, EDGES } from '@/player/kit/style';
import { random } from '@/player/kit/random';
import { limb } from '@/player/kit/shapes';
import { tree, TREES } from '@/player/kit/trees';

const SEED = 1944;

/** Smooth fractal 2D noise, 0–1 */
function noise(seed) {
    const hash = (x, y) => {
        let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    const value = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = smooth(x - xi), yf = smooth(y - yi);
        const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
    };
    return (x, y, octaves = 4) => {
        let f = 0, amp = 0.5, freq = 1, total = 0;
        for (let o = 0; o < octaves; o++) {
            f += amp * value(x * freq + o * 17.3, y * freq - o * 9.1);
            total += amp;
            amp *= 0.5;
            freq *= 2.03;
        }
        return f / total;
    };
}

const smoothstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

/**
 * Where the ground is trodden (0–1): along the walk's edge and round the blocks, and a path leading
 * off to the south. No trees stand there.
 * @param {(x, y) => number} distance  How far from the bunker's footprint, in metres
 */
function troddenAt(distance) {
    const path = noise(SEED + 4);
    return (x, y) => {
        const d = distance(x, y);
        const r = Math.hypot(x, y);
        const along = smoothstep(2.2, 0.6, Math.abs(d - 1.1 - (path(x * 0.15, y * 0.15, 2) - 0.5) * 1.4)) * smoothstep(-0.2, 0.3, d);
        const wander = (path(r * 0.06, 3.3, 2) - 0.5) * 6;
        const trail = smoothstep(1.8, 0.7, Math.abs(x - 2.5 - wander - (r - 14) * 0.15)) * (y < -12 ? 1 : 0) * smoothstep(0, 1.5, d);
        return Math.min(1, Math.max(along * 0.8, trail) * smoothstep(0.3, 0.5, path(x * 0.4, y * 0.4, 3) * 0.6 + 0.4));
    };
}

/* ---------- SHADER TWEAKS ---------- */

/** What stands between the camera and the emplacement thins out, in a fine dither */
function patchCutaway(shader, uniforms) {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCutWorld;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvCutWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
            varying vec3 vCutWorld;
            uniform vec3 uCutCentre;
            uniform float uCutRadius;`)
        .replace('void main() {', `void main() {
            {
                vec3 toCentre = uCutCentre - cameraPosition;
                float centreAlong = length(toCentre);
                vec3 dir = toCentre / centreAlong;
                vec3 toPoint = vCutWorld - cameraPosition;
                float along = dot(toPoint, dir);
                float off = length(toPoint - dir * along);
                float cut = (1.0 - smoothstep(uCutRadius * 0.95, uCutRadius * 1.2, off))
                          * (1.0 - smoothstep(centreAlong - uCutRadius * 0.9, centreAlong - uCutRadius * 0.35, along));
                float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
                if (cut > dither * 0.9 + 0.05) discard;
            }`);
}

/* ---------- THE FOREST ---------- */

/**
 * @param {object} options
 * @param {(x, y) => number} options.groundAt   The forest floor's height
 * @param {(x, y) => number} options.distance   How far from the bunker's footprint
 * @param {number} options.radius               How far out the forest goes before it thins into the haze
 * @returns {{ group, update(centre: THREE.Vector3, radius: number), dispose() }}
 */
export function createForest({ groundAt, distance, radius: R }) {
    const rand = random(SEED);
    const trodden = troddenAt(distance);
    const group = new THREE.Group();
    const wood = [];

    /* Trees: tall ones out in the forest, young ones and bushes nearer the concrete */
    const placed = [];
    const free = (x, y, room) => placed.every((q) => Math.hypot(q.x - x, q.y - y) > room + q.room);
    const plant = (kind, h, minD, maxD, tries = 40) => {
        for (let t = 0; t < tries; t++) {
            const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * R;
            const x = Math.sin(a) * r, y = Math.cos(a) * r;
            const d = distance(x, y);
            if (d < minD || d > maxD) continue;
            if (trodden(x, y) > 0.35 && kind !== 'bush') continue;
            if (groundAt(x, y) > 2.4 && kind !== 'bush') continue;   // the hill's top stays open
            const room = h * (kind === 'bush' ? 0.12 : kind === 'spruce' ? 0.13 : 0.1);
            if (!free(x, y, room)) continue;
            placed.push({ x, y, room });
            tree(kind, new THREE.Vector3(x, y, groundAt(x, y) - 0.1), h, rand, wood, TREES);
            return true;
        }
        return false;
    };
    const kinds = ['pine', 'pine', 'pine', 'pine', 'spruce', 'spruce', 'spruce', 'beech', 'beech', 'birch'];
    const heights = { pine: [17, 23], spruce: [11, 17], beech: [12, 17], birch: [10, 14] };
    for (let i = 0; i < 70; i++) {
        const kind = kinds[i % kinds.length];
        plant(kind, rand.range(...heights[kind]), 2.5, Infinity);
    }
    for (let i = 0; i < 40; i++) plant(rand.pick(['spruce', 'spruce', 'beech', 'beech', 'birch', 'pine']), rand.range(2.5, 7.5), 1.2, Infinity);
    for (let i = 0; i < 50; i++) plant('bush', rand.range(1.2, 2.6), i < 30 ? 0.1 : 2, i < 30 ? 2 : Infinity);
    // The forest goes on beyond, out into the haze
    const kindsFar = ['pine', 'pine', 'spruce', 'spruce', 'beech', 'birch'];
    for (let i = 0; i < 420; i++) {
        const a = rand() * Math.PI * 2, r = R + Math.sqrt(rand()) * (78 - R);
        const x = Math.sin(a) * r, y = Math.cos(a) * r;
        const kind = rand.pick(kindsFar);
        tree(kind, new THREE.Vector3(x, y, groundAt(x, y) - 0.1), rand.range(...heights[kind]), rand, wood, TREES);
    }

    /* Fallen trunks and branches */
    for (let i = 0; i < 10; i++) {
        for (let t = 0; t < 30; t++) {
            const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * R * 0.95;
            const x = Math.sin(a) * r, y = Math.cos(a) * r;
            if (distance(x, y) < 2 || trodden(x, y) > 0.3) continue;
            const heading = rand() * Math.PI * 2, length = i < 4 ? rand.range(5, 10) : rand.range(1.5, 3.5);
            const ex = x + Math.cos(heading) * length, ey = y + Math.sin(heading) * length;
            if (distance(ex, ey) < 2) continue;
            const thick = i < 4 ? rand.range(0.15, 0.3) : rand.range(0.04, 0.08);
            const from = new THREE.Vector3(x, y, groundAt(x, y) + thick * 0.6), to = new THREE.Vector3(ex, ey, groundAt(ex, ey) + thick * 0.5);
            wood.push(limb(from, to, thick, thick * 0.7, TREES.trunk, TREES.trunk, 8));
            break;
        }
    }

    /* One geometry for all of it, with the style's faint edges; both thin out in front of the emplacement */
    const cut = { uCutCentre: { value: new THREE.Vector3() }, uCutRadius: { value: 0 } };
    const woodMaterial = greyMaterial();
    woodMaterial.onBeforeCompile = (shader) => patchCutaway(shader, cut);
    const woodMesh = new THREE.Mesh(mergeGeometries(wood), woodMaterial);
    wood.forEach((g) => g.dispose());
    woodMesh.castShadow = woodMesh.receiveShadow = true;
    const lines = edgeLines(woodMesh.geometry, EDGES.trees);
    lines.material.onBeforeCompile = (shader) => patchCutaway(shader, cut);
    group.add(woodMesh, lines);

    return {
        group,
        /** Where the emplacement is (world space), so what stands in front of it thins out */
        update(centre, radius) {
            cut.uCutCentre.value.copy(centre);
            cut.uCutRadius.value = radius;
        },
        dispose() {
            woodMesh.geometry.dispose();
            lines.geometry.dispose();
        },
    };
}
