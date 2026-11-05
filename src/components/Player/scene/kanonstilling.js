/**
 * Kanonstilling G3 at Dueodde, Bornholm, in 3D — built from code rather than loaded, after Jørgen
 * Lumbye's measurements on hanstholmregistreringen.dk: the plan "Kanonbygning (halvfærdig)" (read
 * off at 21.6 px to the metre), the section of the machine block's side towards the gun pit, the
 * drawings of the side blocks, their shafts, the shaft in the pivot cone, the crane-rail
 * foundations and pillars — and photos of the place, old and new.
 *
 * Metres, z up, the middle of the gun pit at the origin, the ground outside at z 0. Angles are
 * degrees clockwise from straight ahead: +y is north, towards the machine block; +x is east.
 *
 *   - the base slab: the pit's floor and, outside the ring wall, a ledge at the same height, its
 *     edge standing 1.1 m above the ground
 *   - the ring wall (2.85 m above the floor, 1.95 m thick) with three passages through it, each
 *     with a door rebate and climbing irons beside it, and a row of small holes in its inner face
 *   - the pivot cone: four flights of stairs up between parallel cheeks; on top a rim round a
 *     sunken floor with 24 bolts and the square shaft down to the engineers' passage; the rim is
 *     open where the south stair and two cable runs (±61°, in line with the passages) go through
 *   - the crane-rail foundations: two rectangular, four triangular in the corners by the wall
 *   - north: the machine block, its curved side to the pit with an overhang, a door in the middle,
 *     a raised slab on its roof, the boiler room's vent and the machine hall's entrance to the west
 *   - east and west: the side blocks, stepped down at their ends, a curved face to the ring, an
 *     open shaft at their north ends; the brick shaft (east) and the shaft cover (west) before them
 *   - out in the terrain: four tapering crane-rail pillars
 *
 * Heights the drawings don't give are read off the photos. Everything is merged into one mesh with
 * vertex colours (shade in the corners, the dark openings, the rusty iron), one draw call.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { concreteMaterial } from './concrete';

/* ---------- MEASUREMENTS (metres) ---------- */

const P = 1.1;                                       // top of the base slab: the pit's floor and the ledge
export const PIT = { radius: 9.35, floor: P };
export const WALL = { inner: 9.35, outer: 11.3, top: P + 2.85, passages: [-60.6, 60.6, 180], passage: 1.25 };
export const LEDGE = { outer: 13.1 };
const CONE = { base: 4.25, edge: 2.75, rim: 2.05, top: P + 1.55, floor: P + 1.1, stair: 1.0, stairs: [0, 90, 180, 270], cables: [-61, 61], bolts: 1.5 };
const BLOCK = { face: 13.73, x: 8, back: 28.1, roof: 4.5, band: 16.2, crest: P + 5.2 };   // the machine block
const SIDE = { outer: 15, face: 12.95, band: 13.66, top: 5.3, shoulder: 4.55 };   // the side blocks: their front, as drawn

/* ---------- GEOMETRY HELPERS ---------- */

const rad = THREE.MathUtils.degToRad;
const deg = THREE.MathUtils.radToDeg;
const at = (r, a, z) => new THREE.Vector3(r * Math.sin(rad(a)), r * Math.cos(rad(a)), z);
const grey = (v) => new THREE.Color(v, v, v);

/** Non-indexed geometry from triangles, each wound so its face points along the given normal */
function fromTriangles(tris) {
    const position = [], normal = [], color = [];
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), face = new THREE.Vector3();
    for (const { p, n, c } of tris) {
        e1.subVectors(p[1], p[0]);
        e2.subVectors(p[2], p[0]);
        face.crossVectors(e1, e2);
        const order = face.dot(n[0]) < 0 ? [0, 2, 1] : [0, 1, 2];
        for (const k of order) {
            position.push(p[k].x, p[k].y, p[k].z);
            normal.push(n[k].x, n[k].y, n[k].z);
            color.push(c[k].r, c[k].g, c[k].b);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
    return g;
}

/**
 * Where a turned piece ends, at radius r. A cut is an angle (a radial end) or { axis, half }: a
 * plane parallel to the line out from the centre at `axis`, `half` metres to its side — so a
 * flight of stairs or a passage between two such pieces has parallel sides.
 */
function cutAngle(cut, r, end) {
    if (typeof cut === 'number') return cut;
    const d = deg(Math.asin(Math.min(1, cut.half / Math.max(r, 1e-6))));
    return end === 'from' ? cut.axis + d : cut.axis - d;
}
function cutNormal(cut, end) {
    const a = typeof cut === 'number' ? cut : cut.axis;
    const sign = end === 'from' ? -1 : 1;
    return new THREE.Vector3(Math.cos(rad(a)) * sign, -Math.sin(rad(a)) * sign, 0);
}

/**
 * A profile turned round the centre: points [r, z, shade], walked so the solid lies to the right
 * (outward faces get normal (-dz, dr)). Each step of the profile is its own band, so corners stay
 * sharp while the way round stays smooth. from / to are cuts (see cutAngle); with less than a full
 * turn, `closeEnds` (a closed outline [r, z, shade] of the solid's cross-section) caps both ends.
 */
function revolve(profile, { from = 0, to = 360, segments = 256, tint, closeEnds } = {}) {
    const rMax = Math.max(...profile.map((p) => p[0]));
    const span = cutAngle(to, rMax, 'to') - cutAngle(from, rMax, 'from');
    const steps = Math.max(6, Math.round((segments * span) / 360));
    const tris = [];
    const colourOf = (shade) => (tint ? grey(shade).multiply(tint) : grey(shade));
    const angle = (r, t) => { const a0 = cutAngle(from, r, 'from'); return a0 + (cutAngle(to, r, 'to') - a0) * t; };
    for (let i = 0; i < profile.length - 1; i++) {
        const [r0, z0, s0 = 1] = profile[i], [r1, z1, s1 = 1] = profile[i + 1];
        const len = Math.hypot(r1 - r0, z1 - z0);
        const nr = -(z1 - z0) / len, nz = (r1 - r0) / len;
        const c0 = colourOf(s0), c1 = colourOf(s1);
        const n = (a) => new THREE.Vector3(nr * Math.sin(rad(a)), nr * Math.cos(rad(a)), nz);
        for (let j = 0; j < steps; j++) {
            const a00 = angle(r0, j / steps), a01 = angle(r0, (j + 1) / steps);
            const a10 = angle(r1, j / steps), a11 = angle(r1, (j + 1) / steps);
            const A = at(r0, a00, z0), B = at(r1, a10, z1), C = at(r1, a11, z1), D = at(r0, a01, z0);
            tris.push({ p: [A, B, C], n: [n(a00), n(a10), n(a11)], c: [c0, c1, c1] });
            tris.push({ p: [A, C, D], n: [n(a00), n(a11), n(a01)], c: [c0, c1, c0] });
        }
    }
    if (closeEnds) {
        const faces = THREE.ShapeUtils.triangulateShape(closeEnds.map(([r, z]) => new THREE.Vector2(r, z)), []);
        for (const [cut, end] of [[from, 'from'], [to, 'to']]) {
            const n = cutNormal(cut, end);
            for (const f of faces) {
                const p = f.map((k) => at(closeEnds[k][0], cutAngle(cut, closeEnds[k][0], end), closeEnds[k][1]));
                tris.push({ p, n: [n, n, n], c: f.map((k) => colourOf(closeEnds[k][2] ?? 0.85)) });
            }
        }
    }
    return fromTriangles(tris);
}

/** A flat shape (x, y in metres) raised from z0 to z1, its edges bevelled */
function prism(shape, z0, z1, { bevel = 0.03, shade = 1, tint, curveSegments = 12 } = {}) {
    const b = Math.min(bevel, (z1 - z0) / 3);
    const g = new THREE.ExtrudeGeometry(shape, {
        depth: z1 - z0 - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments,
    });
    g.translate(0, 0, z0 + b);
    g.deleteAttribute('uv');
    const c = tint ? grey(shade).multiply(tint) : grey(shade);
    const colour = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colour.length; i += 3) c.toArray(colour, i);
    g.setAttribute('color', new THREE.BufferAttribute(colour, 3));
    return g.index ? g.toNonIndexed() : g;
}

const shapeOf = (points, holes = []) => {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    shape.holes = holes.map((h) => new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    return shape;
};

/** A flat outline [[x, y], …] (with holes) raised from z0 to z1 */
const outline = (points, z0, z1, options = {}) => prism(shapeOf(points, options.holes), z0, z1, options);

/** Points along an arc of radius r from angle a0 to a1 (our angles: clockwise from +y) */
function arc(r, a0, a1, step = 1) {
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step));
    return Array.from({ length: n + 1 }, (_, i) => { const a = rad(a0 + ((a1 - a0) * i) / n); return [r * Math.sin(a), r * Math.cos(a)]; });
}

/** A ring segment from r0 to r1 between angles a0 and a1 */
const sector = (r0, r1, a0, a1, z0, z1, options) => outline([...arc(r1, a0, a1, 0.5), ...arc(r0, a1, a0, 0.5)], z0, z1, options);

/** A box from (x0, y0) to (x1, y1), optionally turned round the centre by an angle */
function box(x0, x1, y0, y1, z0, z1, { turn = 0, ...options } = {}) {
    const g = outline([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, z1, options);
    if (turn) g.rotateZ(-rad(turn));
    return g;
}

/** A block narrowing upwards: (cx, cy) its middle, w/d its size at the foot along x/y, wt/dt at the top */
function taper(cx, cy, w, d, wt, dt, z0, z1, shade = 1) {
    const c = grey(shade);
    const q = (sx, sy, top) => new THREE.Vector3(cx + (sx * (top ? wt : w)) / 2, cy + (sy * (top ? dt : d)) / 2, top ? z1 : z0);
    const faces = [
        [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],      // top
        [[-1, -1, 0], [1, -1, 0], [1, -1, 1], [-1, -1, 1]],    // sides
        [[1, -1, 0], [1, 1, 0], [1, 1, 1], [1, -1, 1]],
        [[1, 1, 0], [-1, 1, 0], [-1, 1, 1], [1, 1, 1]],
        [[-1, 1, 0], [-1, -1, 0], [-1, -1, 1], [-1, 1, 1]],
    ];
    const tris = [];
    for (const f of faces) {
        const p = f.map(([sx, sy, top]) => q(sx, sy, top));
        const n = new THREE.Vector3().crossVectors(p[1].clone().sub(p[0]), p[2].clone().sub(p[0])).normalize();
        const centre = new THREE.Vector3(cx, cy, (z0 + z1) / 2);
        if (n.dot(p[0].clone().sub(centre)) < 0) n.negate();
        tris.push({ p: [p[0], p[1], p[2]], n: [n, n, n], c: [c, c, c] }, { p: [p[0], p[2], p[3]], n: [n, n, n], c: [c, c, c] });
    }
    return fromTriangles(tris);
}

/**
 * A curved band between radii r0 and r1, cut off by the planes x = ±halfWidth, from z0 up to a top
 * whose height follows x: top(x)
 */
function band(r0, r1, halfWidth, z0, top, shade = 1) {
    const from = { axis: 0, half: -halfWidth }, to = { axis: 0, half: -halfWidth };
    const c = grey(shade), cs = grey(shade * 0.85);
    const n = 160;
    const ring = (r, t) => { const a0 = cutAngle(from, r, 'from'); return a0 + (cutAngle(to, r, 'to') - a0) * t; };
    const pt = (r, t, z) => { const p = at(r, ring(r, t), 0); p.z = z ?? top(p.x); return p; };
    const radial = (r, t, sign) => { const a = rad(ring(r, t)); return new THREE.Vector3(Math.sin(a) * sign, Math.cos(a) * sign, 0); };
    const tris = [];
    for (let j = 0; j < n; j++) {
        const t0 = j / n, t1 = (j + 1) / n;
        // top
        const A = pt(r0, t0), B = pt(r1, t0), C = pt(r1, t1), D = pt(r0, t1);
        const up = new THREE.Vector3().crossVectors(B.clone().sub(A), D.clone().sub(A)).normalize();
        if (up.z < 0) up.negate();
        tris.push({ p: [A, B, C], n: [up, up, up], c: [c, c, c] }, { p: [A, C, D], n: [up, up, up], c: [c, c, c] });
        // inner and outer faces
        for (const [r, sign] of [[r0, -1], [r1, 1]]) {
            const E = pt(r, t0, z0), F = pt(r, t0), G = pt(r, t1), K = pt(r, t1, z0);
            const n0 = radial(r, t0, sign), n1 = radial(r, t1, sign);
            tris.push({ p: [E, F, G], n: [n0, n0, n1], c: [cs, c, c] }, { p: [E, G, K], n: [n0, n1, n1], c: [cs, c, cs] });
        }
    }
    // the ends
    for (const [t, cut, end] of [[0, from, 'from'], [1, to, 'to']]) {
        const nn = cutNormal(cut, end);
        const A = pt(r0, t, z0), B = pt(r1, t, z0), C = pt(r1, t), D = pt(r0, t);
        tris.push({ p: [A, B, C], n: [nn, nn, nn], c: [cs, cs, c] }, { p: [A, C, D], n: [nn, nn, nn], c: [cs, c, c] });
    }
    return fromTriangles(tris);
}

/** A ridge roof from x0 to x1, running from y0 to y1, its eaves at z0 and ridge at z1 */
function gable(x0, x1, y0, y1, z0, z1, options) {
    const shape = shapeOf([[x0, 0], [x1, 0], [(x0 + x1) / 2, z1 - z0]]);
    const g = prism(shape, 0, y1 - y0, { bevel: 0, ...options });
    g.rotateX(Math.PI / 2);
    g.translate(0, y1, z0);
    return g;
}

/** Pieces of a full turn left between gaps, as pairs of cuts ({ axis, half }) */
function between(gaps, half) {
    const sorted = [...gaps].map((a) => ((a % 360) + 360) % 360).sort((a, b) => a - b);
    return sorted.map((a, i) => [{ axis: a, half }, { axis: i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + 360, half }]);
}

/* ---------- THE PARTS ---------- */

const RUST = new THREE.Color(0.6, 0.42, 0.32);
const DARK = 0.12;

/** The base slab: the pit's floor, darker by the wall, and the ledge outside the ring wall */
function baseSlab(parts) {
    parts.push(revolve([[0, P, 1], [7.2, P, 0.97], [8.7, P, 0.82], [WALL.inner, P, 0.6]]));
    parts.push(revolve([[WALL.outer, P, 0.6], [12.2, P, 0.9], [LEDGE.outer - 0.05, P, 1], [LEDGE.outer, P - 0.05, 0.95], [LEDGE.outer, -0.3, 0.6]]));
    parts.push(sector(LEDGE.outer - 0.2, BLOCK.face + 0.1, -34.5, 34.5, P - 1, P, { bevel: 0, shade: 0.85 }));   // under the machine block's wall
    // Small square pockets in the ledge, in pairs every 22.5°
    for (let i = 0; i < 16; i++) {
        const a = i * 22.5;
        if (a === 0) continue;
        for (const r of [11.95, 12.9]) parts.push(box(-0.12, 0.12, r - 0.12, r + 0.12, P - 0.02, P + 0.004, { turn: a, bevel: 0, shade: DARK }));
    }
}

/** The ring wall, its three passages (door rebate, climbing irons beside), the holes in its face */
function ringWall(parts) {
    const { inner: Ri, outer: Ro, top: T, passage } = WALL;
    const half = passage / 2;
    for (const [from, to] of between(WALL.passages, half)) {
        parts.push(revolve([[Ri, P, 0.5], [Ri, T - 0.04, 0.97], [Ri + 0.04, T, 1], [Ro - 0.04, T, 1], [Ro, T - 0.04, 0.95], [Ro, P, 0.6]], {
            from, to, closeEnds: [[Ri, P, 0.55], [Ro, P, 0.55], [Ro, T, 0.85], [Ri, T, 0.85]],
        }));
    }
    for (const a of WALL.passages) {
        parts.push(box(-half, half, Ri - 0.03, Ro + 0.03, P + 2.2, T, { turn: a, bevel: 0.02, shade: 0.9 }));           // over the door
        parts.push(box(-half, half, Ri - 0.02, Ro + 0.02, P - 0.1, P + 0.005, { turn: a, bevel: 0, shade: 0.7 }));        // its floor
        for (const s of [-1, 1]) parts.push(box(s * half, s * (half - 0.12), 10.15, 10.5, P, P + 2.2, { turn: a, bevel: 0, shade: 0.75 }));   // the rebate
        // Climbing irons on the inner face, beside the passage
        const side = a + deg(1.15 / Ri);
        for (let k = 0; k < 8; k++) {
            const z = P + 0.3 + k * 0.32;
            parts.push(box(-0.16, 0.16, Ri - 0.13, Ri - 0.1, z, z + 0.03, { turn: side, bevel: 0, shade: 0.45, tint: RUST }));
            for (const s of [-1, 1]) parts.push(box(s * 0.16 - 0.015, s * 0.16 + 0.015, Ri - 0.13, Ri + 0.01, z, z + 0.03, { turn: side, bevel: 0, shade: 0.45, tint: RUST }));
        }
    }
    // The holes for the crane rail's brackets, high in the inner face
    for (let a = 7.5; a < 360; a += 15) {
        if (WALL.passages.some((p) => Math.abs(((a - p + 540) % 360) - 180) < 6)) continue;
        parts.push(box(-0.07, 0.07, Ri - 0.004, Ri + 0.05, P + 2.2, P + 2.34, { turn: a, bevel: 0, shade: DARK }));
    }
}

/** The pivot cone: slope, stairs, rim, sunken floor, bolts and shaft */
function pivotCone(parts) {
    const { base: R0, edge: R1, rim: RI, top: H, floor: F } = CONE;
    const half = CONE.stair / 2;

    // The slope between the four flights of stairs; its inner face shows where the rim is open
    for (const [from, to] of between(CONE.stairs, half)) {
        parts.push(revolve([[R1, F, 0.6], [R1, H, 0.95], [R0, P, 0.6]], {
            from, to, closeEnds: [[R1, H, 0.9], [R1, P, 0.7], [R0, P, 0.6]],
        }));
    }
    // The rim on top, open at the south stair and the two cable runs
    const gaps = [...CONE.cables.map((a) => ({ axis: a, half: 0.3 })), { axis: 180, half }];
    const sorted = gaps.map((g) => ({ ...g, axis: (g.axis + 360) % 360 })).sort((a, b) => a.axis - b.axis);
    sorted.forEach((g, i) => {
        const next = sorted[(i + 1) % sorted.length];
        parts.push(revolve([[RI, F, 0.5], [RI, H - 0.03, 0.85], [RI + 0.03, H, 0.95], [R1, H, 1], [R1, P, 0.7]], {
            from: g, to: { ...next, axis: next.axis + (i + 1 < sorted.length ? 0 : 360) },
            closeEnds: [[RI, F, 0.7], [R1, F, 0.7], [R1, H, 0.9], [RI, H, 0.9]],
        }));
    });
    for (const g of gaps) parts.push(box(-g.half, g.half, RI - 0.05, R1 + 0.01, F - 0.3, F, { turn: g.axis, bevel: 0, shade: 0.8 }));   // their floors

    // The sunken floor, the square shaft through it (1.2 m, 2.3 m deep) and the 24 bolts
    const s = 0.62;
    const square = [[-s, -s], [s, -s], [s, s], [-s, s]];
    parts.push(outline(arc(RI + 0.02, 0, 360, 2).slice(0, -1), F - 0.6, F, { holes: [square], bevel: 0, shade: 0.82 }));
    for (const [x0, x1, y0, y1, shade] of [[-s, s, -s, -s + 0.02, 0.32], [-s, s, s - 0.02, s, 0.42], [-s, -s + 0.02, -s, s, 0.38], [s - 0.02, s, -s, s, 0.3]]) {
        parts.push(box(x0, x1, y0, y1, F - 2.3, F - 0.005, { bevel: 0, shade }));
    }
    parts.push(box(-s, s, -s, s, F - 2.32, F - 2.3, { bevel: 0, shade: 0.05 }));
    for (let i = 0; i < 24; i++) {
        const p = at(CONE.bolts, i * 15 + 7.5, 0);
        const bolt = new THREE.Shape();
        bolt.absarc(p.x, p.y, 0.035, 0, Math.PI * 2, false);
        parts.push(prism(bolt, F - 0.01, F + 0.85, { bevel: 0.008, shade: 0.45, tint: RUST, curveSegments: 8 }));
    }

    // The stairs: up to the rim on three sides, down onto the sunken floor from the south
    for (const a of CONE.stairs) {
        const toFloor = a === 180;
        const n = toFloor ? 5 : 7;
        const rise = ((toFloor ? F : H) - P) / n;
        for (let i = 0; i < n; i++) {
            const front = R0 - (i * (R0 - R1)) / n;
            parts.push(box(-half, half, toFloor ? RI - 0.05 : R1 - 0.02, front, P - 0.05, P + rise * (i + 1), { turn: a, bevel: 0.012, shade: 0.93 - i * 0.012 }));
        }
    }

    // A small pit by the cone, to the north-east
    parts.push(box(-0.42, 0.42, 4.32, 4.96, P - 0.02, P + 0.004, { turn: 24.7, bevel: 0, shade: DARK }));
}

/** The crane rail's foundations in the pit: 45 cm high, three slots each (the drawing's measures) */
function craneFoundations(parts) {
    const z1 = P + 0.45;
    // Two rectangular ones, 1.6 × 1.4 m, north and south of the cone (a little east of the middle)
    for (const sy of [1, -1]) {
        const cx = 0.7, cy = 6.25 * sy;
        const slot = (x0, x1) => [[cx + x0, cy - 0.5], [cx + x1, cy - 0.5], [cx + x1, cy + 0.5], [cx + x0, cy + 0.5]];
        parts.push(outline([[cx - 0.8, cy - 0.7], [cx + 0.8, cy - 0.7], [cx + 0.8, cy + 0.7], [cx - 0.8, cy + 0.7]], P - 0.05, z1, {
            bevel: 0.06, holes: [slot(-0.6, -0.43), slot(-0.2, 0.2), slot(0.43, 0.61)],
        }));
        parts.push(box(cx - 0.75, cx + 0.75, cy - 0.65, cy + 0.65, P, P + 0.2, { bevel: 0, shade: 0.2 }));   // the slots' bottoms
    }
    // Four triangular ones in the corners: two legs along the axes, the third side the wall
    for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
        const R = WALL.inner + 0.05;
        const yw = Math.sqrt(R * R - 5.2 * 5.2), xw = Math.sqrt(R * R - 5.55 * 5.55);
        const a0 = deg(Math.atan2(5.2, yw)), a1 = deg(Math.atan2(xw, 5.55));
        const pts = [[5.2, 5.55], [5.2, yw], ...arc(R, a0, a1, 1).slice(1, -1), [xw, 5.55]].map(([x, y]) => [x * sx, y * sy]);
        const slot = (x0, x1, y0, y1) => [[x0 * sx, y0 * sy], [x1 * sx, y0 * sy], [x1 * sx, y1 * sy], [x0 * sx, y1 * sy]];
        parts.push(outline(pts, P - 0.05, z1, { bevel: 0.05, holes: [slot(6.4, 6.6, 5.75, 6.35), slot(5.65, 6.1, 5.75, 6.7), slot(5.35, 5.55, 5.75, 6.7)] }));
        parts.push(box(Math.min(5.3 * sx, 6.65 * sx), Math.max(5.3 * sx, 6.65 * sx), Math.min(5.7 * sy, 6.75 * sy), Math.max(5.7 * sy, 6.75 * sy), P, P + 0.2, { bevel: 0, shade: 0.2 }));
    }
}

/** The machine block, north of the pit */
function machineBlock(parts) {
    const { face: Rf, x: X, back: Y, roof } = BLOCK;
    // Its corners meet the curved face; the door in the middle of the face, the machine hall's entrance on the west
    const corner = deg(Math.atan2(7.55, 11.47));
    const door = deg(Math.asin(0.6 / Rf));
    parts.push(outline([
        [-X, Y], [X, Y], [X, 12.4], [7.55, 11.47],
        ...arc(Rf, corner, door, 1).slice(1),
        [0.45, 14.0], [0.45, 15.1], [-0.45, 15.1], [-0.45, 14.0],
        ...arc(Rf, -door, -corner, 1),
        [-X, 12.4], [-X, 13.1], [-7.5, 13.35], [-7.5, 15.05], [-X, 15.3],
    ], -0.3, roof, { bevel: 0.05 }));
    parts.push(box(-0.6, 0.6, 13.6, 15.1, P + 2.0, roof, { bevel: 0 }));                     // over the door
    parts.push(box(-0.45, 0.45, 15.05, 15.1, P, P + 2.0, { bevel: 0, shade: DARK }));
    parts.push(box(-0.6, 0.6, 13.6, 15.1, P - 0.1, P, { bevel: 0, shade: 0.7 }));
    parts.push(box(-X, -7.5, 13.1, 15.3, 2.6, roof, { bevel: 0 }));                          // over the entrance
    parts.push(box(-7.55, -7.5, 13.35, 15.05, 0, 2.6, { bevel: 0, shade: DARK }));

    // The side to the pit, as in the section: an overhang (1.1 m out, 2.0–3.15 m over the ledge);
    // above it the top slab (0.7 m out, to 3.9 m), a curved band reaching out over the roof and a
    // little past the block's sides; and on it the crest — the section's dashed pentagon, 1.8 m
    // wide, up to 5 m over the pit's floor — level in the middle and sloping down at its ends, as
    // the photos from the pit and of its end show
    const reach = 35.5;
    parts.push(revolve([[Rf + 0.05, P + 2.0, 0.5], [Rf - 1.1, P + 2.0, 0.55], [Rf - 1.1, P + 3.15, 0.85], [Rf + 0.6, P + 3.15, 0.85]], {
        from: -reach, to: reach, closeEnds: [[Rf - 1.1, P + 2.0, 0.7], [Rf + 0.6, P + 2.0, 0.7], [Rf + 0.6, P + 3.15, 0.8], [Rf - 1.1, P + 3.15, 0.8]],
    }));
    parts.push(revolve([[Rf - 0.7, P + 3.15, 0.8], [Rf - 0.7, P + 3.85, 0.95], [Rf - 0.65, P + 3.9, 1], [BLOCK.band, P + 3.9, 1], [BLOCK.band, roof - 0.2, 0.85]], {
        from: -reach, to: reach, closeEnds: [[Rf - 0.7, P + 3.15, 0.8], [BLOCK.band, P + 3.15, 0.8], [BLOCK.band, P + 3.9, 0.9], [Rf - 0.7, P + 3.9, 0.9]],
    }));
    for (const s of [-1, 1]) parts.push(sector(Rf - 0.05, BLOCK.band, s > 0 ? 29 : -reach, s > 0 ? reach : -29, -0.3, P + 3.2, { bevel: 0.03, shade: 0.92 }));   // where it reaches past the block, down to the ground
    parts.push(band(Rf - 0.77, Rf + 1.05, 8.25, P + 3.85, (x) => {
        const t = THREE.MathUtils.clamp((Math.abs(x) - 5.2) / (8.25 - 5.2), 0, 1);
        return BLOCK.crest + (P + 3.9 - BLOCK.crest) * t * t * (3 - 2 * t);
    }));

    // On the roof: the raised slab to the west, and to the east, by the band, the boiler room's
    // vent: a shaft with a pitched top, its gables (an opening in each) facing east and west
    parts.push(box(-X, -2.2, 16.2, 24.5, roof - 0.05, roof + 0.9, { bevel: 0.05 }));
    parts.push(box(6.1, X, 15.9, 17.7, roof - 0.05, roof + 1.3, { bevel: 0.03 }));
    const ridge = gable(15.85, 17.75, 6.05, X + 0.05, roof + 1.3, roof + 2.3, { shade: 0.95 });
    ridge.rotateZ(-Math.PI / 2);                                                              // the ridge along x
    ridge.translate(0, 15.85 + 17.75, 0);
    parts.push(ridge);
    for (const x of [6.04, X + 0.01]) parts.push(box(x - 0.03, x + 0.03, 16.55, 17.05, roof + 1.45, roof + 1.95, { bevel: 0, shade: DARK }));
    // Small openings high in the west wall
    for (const y of [18, 21, 24]) parts.push(box(-X - 0.02, -X + 0.03, y, y + 0.4, 3.3, 3.7, { bevel: 0, shade: DARK }));
}

/** A side block, west (side −1) or east (+1) of the pit */
function sideBlock(parts, side) {
    const m = ([x, y]) => [x * -side, y];   // drawn for the west, mirrored for the east
    const { outer: X, face: Rf, band: Rb, top, shoulder } = SIDE;
    const top0 = deg(Math.atan2(-12.07, 6.39)), bottom0 = deg(Math.atan2(-12.22, -6.11));
    const slit = [[-14.0, 6.5], [-13.05, 6.5], [-13.05, 5.4], [-13.45, 3.0], [-13.6, 2.1], [-14.0, 2.7]];
    // The mass, at the height of its ends
    parts.push(outline([[-X, 7.0], [-13.3, 7.0], ...arc(Rb, top0, bottom0, 1), [-13.2, -6.6], [-X, -6.6]].map(m), -0.3, shoulder, {
        bevel: 0.04, holes: [slit.map(m)],
    }));
    // Its middle rises higher
    const yTop = 5.9, yBottom = -5.5;
    const a0 = deg(Math.atan2(-Math.sqrt(Rb * Rb - yTop * yTop), yTop)), a1 = deg(Math.atan2(-Math.sqrt(Rb * Rb - yBottom * yBottom), yBottom));
    parts.push(outline([[-X, yTop], ...arc(Rb, a0, a1, 1), [-X, yBottom]].map(m), shoulder - 0.05, top, {
        bevel: 0.05, holes: [slit.map(([x, y]) => [x, Math.min(y, yTop - 0.05)]).map(m)],
    }));
    // The curved face to the ring, a step lower
    parts.push(side < 0 ? sector(Rf, Rb + 0.02, bottom0, top0, P - 0.1, shoulder) : sector(Rf, Rb + 0.02, -top0, -bottom0, P - 0.1, shoulder));
    // The open shaft at its north end: dark at the bottom
    parts.push(outline(slit.map(m), -0.3, 0.1, { bevel: 0, shade: 0.08 }));
    // A loophole in its south end
    parts.push(box(...(side < 0 ? [-14.4, -13.9] : [13.9, 14.4]), -6.64, -6.58, 2.9, 3.3, { bevel: 0, shade: DARK }));

    if (side < 0) {
        // West: the shaft's cover at the ground, 1.25 × 1.3 m with an 0.8 m opening
        const hole = [[-15.95, -0.2], [-15.15, -0.2], [-15.15, 0.6], [-15.95, 0.6]];
        parts.push(outline([[-16.25, -0.45], [-15.0, -0.45], [-15.0, 0.85], [-16.25, 0.85]], -0.2, 0.3, { bevel: 0.03, holes: [hole] }));
        parts.push(outline(hole, -0.25, -0.2, { bevel: 0, shade: 0.04 }));
    } else {
        // East: what is left of the brick shaft, 1.25 × 1.5 m
        const inner = [[15.22, -0.38], [16.03, -0.38], [16.03, 0.68], [15.22, 0.68]];
        parts.push(outline([[15.0, -0.6], [16.25, -0.6], [16.25, 0.9], [15.0, 0.9]], -0.2, 1.1, { bevel: 0.02, shade: 0.88, holes: [inner] }));
        parts.push(outline(inner, -0.25, -0.2, { bevel: 0, shade: 0.04 }));
    }
}

/** The four crane-rail pillars out in the terrain: 0.8 m deep, 1.1 m wide at the top and wider at the foot */
function cranePillars(parts) {
    for (const [x, y] of [[-20.15, 6.1], [-20.1, -6.15], [20.1, 6.1], [20.05, -6.15]]) {
        parts.push(taper(x, y, 0.8, 1.6, 0.8, 1.1, -0.3, 3.2, 0.95));
        for (const dy of [-0.18, 0.18]) parts.push(box(x - 0.03, x + 0.03, y + dy - 0.03, y + dy + 0.03, 3.19, 3.3, { bevel: 0, shade: 0.45, tint: RUST }));
    }
}

function emplacementGeometry() {
    const parts = [];
    baseSlab(parts);
    ringWall(parts);
    pivotCone(parts);
    craneFoundations(parts);
    machineBlock(parts);
    sideBlock(parts, -1);
    sideBlock(parts, 1);
    cranePillars(parts);
    return mergeGeometries(parts);
}

/** Forest floor round the emplacement, fading out at its edge */
function groundMesh() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.6, '#aaa');
    g.addColorStop(1, '#000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const alphaMap = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(
        new THREE.RingGeometry(LEDGE.outer - 0.05, 40, 256, 1),
        new THREE.MeshStandardMaterial({ color: 0x4a4944, roughness: 1, alphaMap, transparent: true, opacity: 0.8, depthWrite: false }),
    );
    mesh.receiveShadow = true;
    return mesh;
}

/**
 * The emplacement as a group (metres, z up).
 *   textured  true = the concrete texture; false (default for now) = plain grey concrete
 */
export function buildKanonstilling({ textured = false } = {}) {
    const group = new THREE.Group();
    const model = new THREE.Mesh(emplacementGeometry(), concreteMaterial({ textured }));
    model.castShadow = true;
    model.receiveShadow = true;
    group.add(model, groundMesh());
    return {
        group,
        /** Across the ledge, for fitting it to the screen */
        size: LEDGE.outer * 2,
        /** Where the sound of a speaker at an angle comes from: in the pit, by the wall, at ear height */
        speakerSpot: (angle) => at(8.2, angle, P + 1.3),
        /** Above the middle, where the listener floats */
        listenerSpot: new THREE.Vector3(0, 0, P + 3.6),
    };
}
