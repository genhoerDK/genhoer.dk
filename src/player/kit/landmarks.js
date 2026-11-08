/**
 * The town's landmark buildings for the walk interface's map (WalkScene.js), from their footprints
 * in the map (src/player/vaerker/maps.js): a church with a tower and a tall spire at its west end, a round
 * tower in banded brick with a cone (the water tower by Axeltorv), and long buildings with pitched
 * roofs (Dronningens Pakhus, the harbour building, the museum, the small church), each in the
 * colours it has in the photos of the town.
 *
 * Metres, x to the east and z to the south.
 */

import * as THREE from 'three';
import { GREYS } from '@/player/kit/style';

/** Each kind's colours (wall, roof, and the tower's bands and the church's spire); `colours` on a call overrides them */
// Every kind in the style (kit/style.js): the landmark's grey, its roof a step lighter
const LANDMARK = { wall: GREYS.landmark, roof: GREYS.landmarkRoof, band: GREYS.landmarkRoof, spire: GREYS.landmarkRoof };
const LOOK = { church: LANDMARK, tower: LANDMARK, warehouse: LANDMARK, hall: LANDMARK, chapel: LANDMARK };

/** The footprint's long axis, short axis, middle and size (an oriented box round it) */
export function boxOf(ring) {
    const n = ring.length / 2;
    let cx = 0, cz = 0;
    for (let i = 0; i < ring.length; i += 2) { cx += ring[i]; cz += ring[i + 1]; }
    cx /= n; cz /= n;
    let xx = 0, zz = 0, xz = 0;
    for (let i = 0; i < ring.length; i += 2) { const x = ring[i] - cx, z = ring[i + 1] - cz; xx += x * x; zz += z * z; xz += x * z; }
    const angle = 0.5 * Math.atan2(2 * xz, xx - zz);
    const u = [Math.cos(angle), Math.sin(angle)], v = [-u[1], u[0]];
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (let i = 0; i < ring.length; i += 2) {
        const x = ring[i] - cx, z = ring[i + 1] - cz;
        const a = x * u[0] + z * u[1], b = x * v[0] + z * v[1];
        u0 = Math.min(u0, a); u1 = Math.max(u1, a); v0 = Math.min(v0, b); v1 = Math.max(v1, b);
    }
    const at = (a, b) => [cx + u[0] * a + v[0] * b, cz + u[1] * a + v[1] * b];
    return { u, v, u0, u1, v0, v1, at, length: u1 - u0, width: v1 - v0, middle: at((u0 + u1) / 2, (v0 + v1) / 2) };
}

function area(ring) {
    let s = 0;
    for (let i = 0; i < ring.length; i += 2) {
        const j = (i + 2) % ring.length;
        s += ring[i] * ring[j + 1] - ring[j] * ring[i + 1];
    }
    return Math.abs(s) / 2;
}

/** Collects faces into one geometry with normals and vertex colours */
function builder() {
    const pos = [], nor = [], col = [];
    const n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), p = new THREE.Vector3();
    return {
        /** A flat face; its normal is turned away from `middle` */
        face(verts, colours, middle) {
            const [a, b, c] = verts.map((v) => new THREE.Vector3(...v));
            n.subVectors(b, a).cross(e1.subVectors(c, a)).normalize();
            if (!Number.isFinite(n.x)) return;
            const centre = verts.reduce((s, v) => s.add(p.set(...v)), new THREE.Vector3()).divideScalar(verts.length);
            if (n.dot(e2.subVectors(centre, middle)) < 0) { n.negate(); verts = verts.slice().reverse(); colours = colours.slice().reverse(); }
            for (let i = 1; i < verts.length - 1; i++) {
                for (const k of [0, i, i + 1]) { pos.push(...verts[k]); nor.push(n.x, n.y, n.z); col.push(colours[k].r, colours[k].g, colours[k].b); }
            }
        },
        geometry() {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
            g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
            return g;
        },
    };
}

const colour = (c) => new THREE.Color(c);

/** Walls round a footprint, from y0 up to y1 */
function walls(b, ring, y0, y1, low, high, middle) {
    for (let i = 0; i < ring.length; i += 2) {
        const j = (i + 2) % ring.length;
        b.face([[ring[i], y0, ring[i + 1]], [ring[j], y0, ring[j + 1]], [ring[j], y1, ring[j + 1]], [ring[i], y1, ring[i + 1]]], [low, low, high, high], middle);
    }
}

/** A flat roof over a footprint */
function flatRoof(b, ring, y, c) {
    const pts = [];
    for (let i = 0; i < ring.length; i += 2) pts.push(new THREE.Vector2(ring[i], ring[i + 1]));
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(pts, [])) {
        b.face([[pts[i].x, y, pts[i].y], [pts[j].x, y, pts[j].y], [pts[k].x, y, pts[k].y]], [c, c, c], new THREE.Vector3(pts[i].x, y - 1, pts[i].y));
    }
}

/** A pitched roof over the footprint's box, the ridge along its length, with its gables */
function pitchedRoof(b, box, from, to, eaves, pitch, roofC, wallC) {
    const ridge = eaves + box.width * pitch;
    const at = (a, side, y) => { const [x, z] = box.at(a, side); return [x, y, z]; };
    const vm = (box.v0 + box.v1) / 2;
    const middle = new THREE.Vector3(...[box.at((from + to) / 2, vm)].map(([x, z]) => [x, eaves, z])[0]);
    b.face([at(from, box.v0, eaves), at(to, box.v0, eaves), at(to, vm, ridge), at(from, vm, ridge)], [roofC, roofC, roofC, roofC], middle);
    b.face([at(from, box.v1, eaves), at(to, box.v1, eaves), at(to, vm, ridge), at(from, vm, ridge)], [roofC, roofC, roofC, roofC], middle);
    b.face([at(from, box.v0, eaves), at(from, box.v1, eaves), at(from, vm, ridge)], [wallC, wallC, wallC], middle);
    b.face([at(to, box.v0, eaves), at(to, box.v1, eaves), at(to, vm, ridge)], [wallC, wallC, wallC], middle);
    return ridge;
}

/** A pyramid (n sides) from a ring of corners at y up to a point */
function spire(b, cx, cz, radius, sides, y, top, c, turn = 0) {
    const apex = [cx, top, cz];
    const middle = new THREE.Vector3(cx, y, cz);
    for (let i = 0; i < sides; i++) {
        const a0 = turn + (i / sides) * Math.PI * 2, a1 = turn + ((i + 1) / sides) * Math.PI * 2;
        b.face([[cx + Math.cos(a0) * radius, y, cz + Math.sin(a0) * radius], [cx + Math.cos(a1) * radius, y, cz + Math.sin(a1) * radius], apex], [c, c, c], middle);
    }
}

/**
 * One landmark as a geometry
 * @param {{ kind: string, height: number }} mark
 * @param {number[]} ring  Its footprint in metres, [x, z, x, z, ...]
 * @param {{ wall?: string, roof?: string, band?: string, spire?: string }} [colours]
 */
export function landmarkGeometry(mark, ring, colours = {}) {
    const b = builder();
    const look = { ...LOOK.hall, ...LOOK[mark.kind], ...colours };
    const high = colour(look.wall), low = high.clone().multiplyScalar(0.75), roof = colour(look.roof);
    const band = colour(look.band ?? look.wall), spireC = colour(look.spire ?? look.roof);
    const box = boxOf(ring);
    const [mx, mz] = box.middle;
    const middle = new THREE.Vector3(mx, mark.height / 2, mz);
    const boxy = area(ring) / (box.length * box.width) > 0.78;

    if (mark.kind === 'tower') {
        // Round, in brick with pale bands, and a cone with a point
        let r = 0;
        for (let i = 0; i < ring.length; i += 2) r += Math.hypot(ring[i] - mx, ring[i + 1] - mz);
        r /= ring.length / 2;
        const sides = 24, cone = mark.height * 0.24, shaft = mark.height - cone;
        const bands = [0, 0.18, 0.2, 0.55, 0.57, 0.86, 0.88, 1];
        for (let k = 0; k < bands.length - 1; k++) {
            const c = k % 2 ? band : high;
            for (let i = 0; i < sides; i++) {
                const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
                const y0 = bands[k] * shaft, y1 = bands[k + 1] * shaft;
                const p = (a, y) => [mx + Math.cos(a) * r, y, mz + Math.sin(a) * r];
                b.face([p(a0, y0), p(a1, y0), p(a1, y1), p(a0, y1)], [k ? c : low, k ? c : low, c, c], new THREE.Vector3(mx, (y0 + y1) / 2, mz));
            }
        }
        spire(b, mx, mz, r * 1.12, sides, shaft, mark.height, roof);
        return b.geometry();
    }

    if (mark.kind === 'church') {
        // A nave from the tower to the east end with its roof along it, and at the west end a square
        // tower with a tall spire: two volumes that meet face to face, neither passing into the other
        const west = box.u[0] < 0 ? -1 : 1;   // which end of the long axis is the west one
        const side = Math.min(box.width * 0.5, 11);
        const towerAt = west < 0 ? box.u1 - side / 2 : box.u0 + side / 2;
        const naveFrom = west < 0 ? box.u0 : box.u0 + side, naveTo = west < 0 ? box.u1 - side : box.u1;
        const nave = [box.at(naveFrom, box.v0), box.at(naveTo, box.v0), box.at(naveTo, box.v1), box.at(naveFrom, box.v1)].flat();
        walls(b, nave, 0, mark.height, low, high, middle);
        pitchedRoof(b, box, naveFrom, naveTo, mark.height, 0.55, roof, high);
        const [tx, tz] = box.at(towerAt, (box.v0 + box.v1) / 2);
        const top = mark.height * 2.7, h = side / 2;
        const corner = (a, c) => box.at(towerAt + a * h, (box.v0 + box.v1) / 2 + c * h);
        const sq = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)].flat();
        walls(b, sq, 0, top, low, high, new THREE.Vector3(tx, top / 2, tz));
        flatRoof(b, sq, top, roof);
        spire(b, tx, tz, h * 0.95, 8, top, top + mark.height * 2.1, spireC, Math.atan2(box.u[1], box.u[0]) + Math.PI / 8);
        return b.geometry();
    }

    // Long buildings: near enough a box, they are built as that box under a pitched roof (walls and
    // roof from the same rectangle, so they meet exactly); otherwise walls round the footprint and a
    // flat roof
    if (boxy) {
        const rect = [box.at(box.u0, box.v0), box.at(box.u1, box.v0), box.at(box.u1, box.v1), box.at(box.u0, box.v1)].flat();
        walls(b, rect, 0, mark.height, low, high, middle);
        pitchedRoof(b, box, box.u0, box.u1, mark.height, mark.kind === 'warehouse' ? 0.6 : 0.42, roof, high);
    } else {
        walls(b, ring, 0, mark.height, low, high, middle);
        flatRoof(b, ring, mark.height, roof);
    }
    return b.geometry();
}
