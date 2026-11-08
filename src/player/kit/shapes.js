/**
 * The simplest building blocks every part of the kit is made from. Metres, z up (see kit/README):
 * each part is one non-indexed geometry with its colour in the vertices, so all the parts of a
 * scene can be merged into one geometry per material (few draw calls, see STIL.md).
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);

/** A colour from a hex string or number, or a THREE.Color as it is */
export const colour = (c) => (c?.isColor ? c : new THREE.Color(c));

/** The geometry, non-indexed, in one colour */
export function paint(g, hex) {
    const out = g.index ? g.toNonIndexed() : g;
    if (out !== g) g.dispose();
    const c = colour(hex), list = [];
    for (let i = 0; i < out.attributes.position.count; i++) list.push(c.r, c.g, c.b);
    out.setAttribute('color', new THREE.Float32BufferAttribute(list, 3));
    return out;
}

/** A box w × d × h standing on z at (x, y); round > 0 softens its edges */
export function box(w, d, h, x, y, z, hex, round = 0) {
    const geometry = round > 0 ? new RoundedBoxGeometry(w, d, h, 2, Math.min(round, w / 2.01, d / 2.01, h / 2.01)) : new THREE.BoxGeometry(w, d, h);
    geometry.translate(x, y, z + h / 2);
    return paint(geometry, hex);
}

/** A round rod from a to b */
export function rod(a, b, r, hex, sides = 6, r1 = r) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const g = new THREE.CylinderGeometry(r1, r, dir.length(), sides, 1);
    g.translate(0, dir.length() / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize()));
    g.translate(a.x, a.y, a.z);
    return paint(g, hex);
}

/** A tapered trunk or branch from a to b, its colour going from c0 to c1 */
export function limb(a, b, r0, r1, c0, c1, sides = 6) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const length = dir.length();
    const g = new THREE.CylinderGeometry(r1, r0, length, sides, 1, true);
    g.rotateX(Math.PI / 2);           // along z
    g.translate(0, 0, length / 2);
    const from = colour(c0), to = colour(c1), tmp = new THREE.Color(), colours = [];
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        tmp.copy(from).lerp(to, pos.getZ(i) / length);
        colours.push(tmp.r, tmp.g, tmp.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Z, dir.normalize()));
    g.translate(a.x, a.y, a.z);
    return g.toNonIndexed();
}

/** A flat band between two lines of points (left and right, as seen going along), `thick` deep */
export function band(left, right, thick, hex) {
    const pos = [];
    const down = (v) => [v.x, v.y, v.z - thick];
    for (let i = 0; i < left.length - 1; i++) {
        const a = left[i], b = right[i], c = left[i + 1], d = right[i + 1];
        pos.push(...a.toArray(), ...b.toArray(), ...d.toArray(), ...a.toArray(), ...d.toArray(), ...c.toArray());   // the top, facing up
        pos.push(...down(a), ...down(d), ...down(b), ...down(a), ...down(c), ...down(d));                           // the underside
    }
    // the two long edges
    for (const [line, flip] of [[left, false], [right, true]]) {
        for (let i = 0; i < line.length - 1; i++) {
            const a = line[i], c = line[i + 1];
            const quad = [a.toArray(), down(a), down(c), a.toArray(), down(c), c.toArray()];
            if (flip) quad.reverse();
            quad.forEach((p) => pos.push(...p));
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    g.computeVertexNormals();
    return paint(g, hex);
}

/** Parts built round their own origin (facing -y), turned by `angle` and moved to (x, y) */
export function placed(parts, local, x, y, angle = 0) {
    for (const g of local) { g.rotateZ(angle); g.translate(x, y, 0); parts.push(g); }
}

/** A geometry built z up, stood up for a scene that has y up (Tværveje): ground (x, y) becomes (x, −z) */
export const standUp = (g) => g.rotateX(-Math.PI / 2);
