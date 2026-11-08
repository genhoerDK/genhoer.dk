/**
 * Trees and bushes: soft, faceted low-poly forms with no texture. Every work draws its trees with
 * these, so a tree changed here changes in every work. Metres, z up; each part goes into `out` as
 * a painted, non-indexed geometry (merge them all into one, with greyMaterial()).
 *
 *   tree(kind, base, height, rand, out, palette)   one tree or bush standing at base
 *   hedge(from, to, height, rand, out, palette)    bushes in a row from one point to another
 *   trees(list, { seed, palette, up })              many, as one geometry
 *
 * Kinds: 'beech' (a broad leafy tree), 'birch', 'pine', 'spruce' and 'bush'.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GREYS, zinc } from '@/player/kit/style';
import { random } from '@/player/kit/random';
import { colour, limb, paint, standUp } from '@/player/kit/shapes';

/** The 3D style's trees: zinc greys, their trunks darker (STIL.md) */
export const TREES = {
    leaves: GREYS.leaves,
    pine: [GREYS.leaves[0], GREYS.leaves[1]],
    spruce: [zinc(725), GREYS.leaves[0]],
    birch: [GREYS.leaves[2], zinc(575)],
    trunk: GREYS.trunk, pineBark: zinc(750), birchBark: zinc(550),
};

/** The older pale looks (Kanon i G3 'stylised', 53 sekunder 'pale'): muted greens */
export const TREES_PALE = {
    leaves: ['#8a9270', '#7d8766', '#949a7a', '#86906c'],
    pine: ['#7b8466', '#737d60', '#838b6c'],
    spruce: ['#5f6b57', '#56614f', '#66715c'],
    birch: ['#a3a77f', '#9aa078'],
    trunk: '#b3aa9d', pineBark: '#a8998a', birchBark: '#ddd7cb',
};

const vary = (rand, hex, amount = 0.06) => colour(hex).clone().multiplyScalar(1 - amount + rand() * amount * 2);

/** A lumpy, faceted ball of foliage */
function blob(centre, r, tint, rand, flat = 1) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const pos = g.attributes.position;
    const seen = new Map();
    for (let i = 0; i < pos.count; i++) {
        // the same jitter for a corner wherever it repeats, so the ball stays closed
        const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
        if (!seen.has(key)) seen.set(key, 0.85 + rand() * 0.3);
        const k = seen.get(key);
        pos.setXYZ(i, centre.x + pos.getX(i) * r * k, centre.y + pos.getY(i) * r * k, centre.z + pos.getZ(i) * r * k * flat);
    }
    g.computeVertexNormals();
    return paint(g, tint);
}

/**
 * One tree or bush standing at base (a THREE.Vector3), h metres tall, its parts into `out`
 * @param {'beech'|'birch'|'pine'|'spruce'|'bush'} kind
 */
export function tree(kind, base, h, rand, out, palette = TREES) {
    const top = (t) => base.clone().add(new THREE.Vector3(0, 0, t * h));
    const shade = (list) => vary(rand, rand.pick(list));
    if (kind === 'pine') {
        out.push(limb(base, top(0.8), h * 0.022, h * 0.01, palette.pineBark, palette.pineBark));
        const crown = 2 + Math.floor(rand() * 3);
        for (let i = 0; i < crown; i++) {
            const a = rand() * Math.PI * 2, reach = rand() * h * 0.08;
            const c = top(rand.range(0.74, 0.92)).add(new THREE.Vector3(Math.cos(a) * reach, Math.sin(a) * reach, 0));
            out.push(blob(c, h * rand.range(0.1, 0.15), shade(palette.pine), rand, 0.55));
        }
    } else if (kind === 'spruce') {
        out.push(limb(base, top(0.3), h * 0.02, h * 0.015, palette.trunk, palette.trunk));
        const tint = shade(palette.spruce);
        const tiers = 3 + Math.floor(rand() * 2);
        for (let k = 0; k < tiers; k++) {
            const t0 = 0.15 + (k / tiers) * 0.6, r = h * 0.22 * (1 - k / (tiers + 0.6));
            const cone = new THREE.ConeGeometry(r, h * 0.42, 7, 1).toNonIndexed();
            cone.rotateX(Math.PI / 2);
            cone.rotateZ(rand() * Math.PI);
            const c = top(t0 + 0.21);
            cone.translate(c.x, c.y, c.z);
            cone.computeVertexNormals();
            out.push(paint(cone, tint.clone().multiplyScalar(0.9 + k * 0.06)));
        }
    } else if (kind === 'beech' || kind === 'birch') {
        const birch = kind === 'birch';
        const bark = birch ? palette.birchBark : palette.trunk;
        out.push(limb(base, top(0.55), h * (birch ? 0.016 : 0.024), h * 0.012, bark, bark));
        const blobs = birch ? 2 : 3 + Math.floor(rand() * 2);
        for (let i = 0; i < blobs; i++) {
            const a = rand() * Math.PI * 2, reach = rand() * h * (birch ? 0.06 : 0.12);
            const c = top(rand.range(0.6, 0.78)).add(new THREE.Vector3(Math.cos(a) * reach, Math.sin(a) * reach, 0));
            out.push(blob(c, h * rand.range(birch ? 0.13 : 0.17, birch ? 0.17 : 0.24), shade(birch ? palette.birch : palette.leaves), rand, birch ? 1.2 : 0.85));
        }
    } else {
        // a bush: one or two low balls
        const blobs = 1 + Math.floor(rand() * 2);
        for (let i = 0; i < blobs; i++) {
            const a = rand() * Math.PI * 2, reach = rand() * h * 0.3;
            const c = base.clone().add(new THREE.Vector3(Math.cos(a) * reach, Math.sin(a) * reach, h * 0.4));
            out.push(blob(c, h * rand.range(0.4, 0.55), shade(palette.leaves), rand, 0.75));
        }
    }
}

/** Bushes in a row from `from` to `to` (THREE.Vector3s on the ground), `height` metres tall, about every `step` metres */
export function hedge(from, to, height, rand, out, palette = TREES, step = height * 1.1) {
    const length = from.distanceTo(to), n = Math.max(1, Math.round(length / step));
    for (let i = 0; i <= n; i++) {
        const at = from.clone().lerp(to, i / n);
        at.x += (rand() - 0.5) * height * 0.3;
        at.y += (rand() - 0.5) * height * 0.3;
        tree('bush', at, height, rand, out, palette);
    }
}

/**
 * Many trees as one geometry
 * @param {{ x: number, y: number, height: number, kind?: string }[]} list  On the ground; kind defaults to 'beech'
 * @param {object} [options]
 * @param {number} [options.seed=1]
 * @param {object} [options.palette=TREES]
 * @param {'z'|'y'} [options.up='z']  'y' for a scene with y up (Tværveje): ground (x, y) lands at (x, −y)
 */
export function trees(list, { seed = 1, palette = TREES, up = 'z' } = {}) {
    if (!list.length) return null;
    const rand = random(seed), out = [];
    for (const t of list) tree(t.kind ?? 'beech', new THREE.Vector3(t.x, t.y, 0), t.height, rand, out, palette);
    const g = mergeGeometries(out);
    out.forEach((p) => p.dispose());
    return up === 'y' ? standUp(g) : g;
}
