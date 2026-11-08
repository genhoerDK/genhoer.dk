/**
 * Houses and blocks of flats. Every work builds its houses with these, so a roof changed here
 * changes in every work. Metres, z up (with `up: 'y'` for a scene that has y up, as Tværveje).
 *
 *   houses(list, options)       many houses as one geometry, each from its footprint (four corners)
 *   houseAt({ x, y, w, d, … })  one house's footprint from where it stands, its size and its turn
 *   block(parts, { … })         a block of flats: a box with a parapet, optionally bands of windows
 *
 * The style (STIL.md) leaves out what does not tell anything at a distance: houses have no windows.
 */

import * as THREE from 'three';
import { GREYS } from '@/player/kit/style';
import { box, colour } from '@/player/kit/shapes';

/**
 * One house's footprint from where it stands: w along its front (the ridge runs this way), d deep,
 * turned by `turn` radians, with the rest of its settings
 */
export function houseAt({ x, y, w, d, turn = 0, ...rest }) {
    const c = Math.cos(turn), s = Math.sin(turn);
    const at = (u, v) => [x + u * c - v * s, y + u * s + v * c];
    return { corners: [at(-w / 2, -d / 2), at(w / 2, -d / 2), at(w / 2, d / 2), at(-w / 2, d / 2)], ...rest };
}

/**
 * The houses as one geometry: walls a little darker at the foot, pitched roofs with the ridge along
 * the front (or flat). Each house is one closed shape: the gable ends are a wall up to the eaves,
 * shaded exactly as the long walls, and above it a triangle in the eaves' colour, so no seam shows
 * where the walls end and the gable begins.
 *
 * @param {{ corners: number[][], height: number, pitched?: boolean, ridge?: number,
 *           wall?: number|string, roof?: number|string }[]} list
 *   corners  front left, front right, back right, back left: [x, y] on the ground
 *   height   to the eaves; ridge = how far the ridge stands above them (default 0.38 × the depth)
 *   wall     0–1 picks from `walls`, or a colour; roof 0–1 picks from `slates` below 0.5 and from
 *            `tiles` above, or a colour
 * @param {object} [options]
 * @param {string[]} [options.walls]  [options.tiles]  [options.slates]  default: the style's greys
 * @param {'z'|'y'} [options.up='z']   'y': corners are [x, z] and y is up (Tværveje)
 */
export function houses(list, { walls = GREYS.walls, tiles = [GREYS.roofs[1]], slates = [GREYS.roofs[0]], up = 'z' } = {}) {
    if (!list.length) return null;
    const pos = [], nor = [], col = [];
    const pick = (palette, t) => colour(palette[Math.min(palette.length - 1, Math.floor(t * palette.length))]);
    const p = new THREE.Vector3(), q = new THREE.Vector3(), r = new THREE.Vector3(), n = new THREE.Vector3(), out = new THREE.Vector3();
    const at = ([a, b], h) => (up === 'y' ? [a, h, b] : [a, b, h]);
    /** A flat face, its normal turned away from the house's middle */
    const face = (verts, colours, middle) => {
        p.fromArray(verts[0]); q.fromArray(verts[1]); r.fromArray(verts[2]);
        n.subVectors(q, p).cross(out.subVectors(r, p)).normalize();
        const centre = verts.reduce((s, v) => s.add(out.fromArray(v)), new THREE.Vector3()).divideScalar(verts.length);
        if (n.dot(centre.sub(middle)) < 0) { n.negate(); verts = verts.slice().reverse(); colours = colours.slice().reverse(); }
        for (let i = 1; i < verts.length - 1; i++) {
            for (const k of [0, i, i + 1]) { pos.push(...verts[k]); nor.push(n.x, n.y, n.z); col.push(colours[k].r, colours[k].g, colours[k].b); }
        }
    };
    for (const { corners, height: h, pitched = true, ridge: rise, wall = 0.5, roof = 0.5 } of list) {
        const cHigh = typeof wall === 'number' ? pick(walls, wall) : colour(wall);
        const cLow = cHigh.clone().multiplyScalar(0.72);
        const cRoof = typeof roof === 'number' ? (roof < 0.5 ? pick(slates, roof * 2) : pick(tiles, (roof - 0.5) * 2)) : colour(roof);
        const [a, b, c, d] = corners;
        const depth = Math.hypot(d[0] - a[0], d[1] - a[1]);
        const ridge = pitched ? h + (rise ?? depth * 0.38) : h;
        const middle = new THREE.Vector3(...at([(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], h * 0.5));
        const mid1 = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2], mid2 = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
        // The long walls, to the front and to the back
        face([at(a, 0), at(b, 0), at(b, h), at(a, h)], [cLow, cLow, cHigh, cHigh], middle);
        face([at(c, 0), at(d, 0), at(d, h), at(c, h)], [cLow, cLow, cHigh, cHigh], middle);
        // The ends: a wall up to the eaves, and the gable above it
        face([at(d, 0), at(a, 0), at(a, h), at(d, h)], [cLow, cLow, cHigh, cHigh], middle);
        face([at(b, 0), at(c, 0), at(c, h), at(b, h)], [cLow, cLow, cHigh, cHigh], middle);
        if (pitched) {
            face([at(d, h), at(a, h), at(mid1, ridge)], [cHigh, cHigh, cHigh], middle);
            face([at(b, h), at(c, h), at(mid2, ridge)], [cHigh, cHigh, cHigh], middle);
            face([at(a, h), at(b, h), at(mid2, ridge), at(mid1, ridge)], [cRoof, cRoof, cRoof, cRoof], middle);
            face([at(c, h), at(d, h), at(mid1, ridge), at(mid2, ridge)], [cRoof, cRoof, cRoof, cRoof], middle);
        } else {
            const below = new THREE.Vector3(...at([middle.x, up === 'y' ? middle.z : middle.y], -1));
            face([at(a, h), at(b, h), at(c, h), at(d, h)], [cRoof, cRoof, cRoof, cRoof], below);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));   // so it merges with the other parts
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
}

/**
 * A block of flats from x0..x1, y0..y1, z0..z1 (z up): a box with a parapet on top; with `windows`
 * bands of windows round it every `every` metres
 */
export function block(parts, { x0, x1, y0, y1, z0 = 0, z1, hex, windows, parapet = true, parapetHex = hex }) {
    const w = x1 - x0, d = y1 - y0, x = (x0 + x1) / 2, y = (y0 + y1) / 2;
    parts.push(box(w, d, z1 - z0, x, y, z0, hex));
    if (windows) {
        const { first = 1.1, every = 3.5, height = 1.4, hex: glass } = windows;
        for (let z = z0 + first; z + height < z1 - 0.6; z += every) parts.push(box(w + 0.12, d + 0.12, height, x, y, z, glass));
    }
    if (parapet) parts.push(box(w + 0.25, d + 0.25, 0.45, x, y, z1, parapetHex));
}
