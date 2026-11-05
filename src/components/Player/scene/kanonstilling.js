/**
 * Kanonstilling G3 at Dueodde, Bornholm, in 3D — built from code rather than loaded, after Jørgen
 * Lumbye's measurements on hanstholmregistreringen.dk: the plan "Kanonbygning (halvfærdig)" (read
 * off at 21.6 px to the metre), the section of the machine block's side towards the gun pit, the
 * drawings of the side blocks and the crane-rail foundations — and photos of the place, old and new.
 *
 * Metres, z up, the middle of the gun pit at the origin, the ground outside at z 0. Angles are
 * degrees clockwise from straight ahead: +y is north, towards the machine block; +x is east.
 *
 *   - the base slab: the pit's floor and, outside the ring wall, the walk round it at the same
 *     height, out to r 13.75 — where the machine block's wall and the side blocks' back walls stand
 *   - the ring wall (2.85 m above the floor, 1.95 m thick) with three passages through it, their
 *     floors 0.6 m over the pit's (a sheer drop inside, steps up from the walk), climbing irons
 *     beside them, a row of holes in its inner face
 *   - the pivot cone: steep, four flights of stairs cut into it; on top a rim round a sunken floor
 *     with 24 bolts and a square shaft; the rim open where the south stair and two cable runs go through
 *   - the crane-rail foundations: two rectangular, four triangular in the corners by the wall
 *   - north: the machine block, its side to the pit in one piece with Lumbye's profile (overhang,
 *     ledge, the crest on top), small openings in it under the overhang, a raised slab and the
 *     boiler room's vent on its roof, the machine hall's entrance to the west
 *   - east and west: the side blocks, their middle higher than their ends; over the walk their
 *     upper part hangs out from the back wall, square at the north end and curving back at the
 *     south; under it a bench, a pier at each end and a dark alcove behind it
 *
 * Heights the drawings don't give are read off the photos. The machine block and the side blocks
 * are built face by face: each face one surface with its openings cut into it, meeting its
 * neighbours on shared edges, so no seams show where pieces would otherwise meet. All of it is
 * merged into one mesh of one concrete, its edges crisp, dark only where an opening leads in.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { concreteMaterial } from './concrete';

/* ---------- MEASUREMENTS (metres) ---------- */

const P = 1.1;                                       // top of the base slab: the pit's floor and the walk
export const PIT = { radius: 9.35, floor: P };
export const WALL = { inner: 9.35, outer: 11.3, top: P + 2.85, passages: [-59.85, 59.85, 180], passage: 0.95 };
export const LEDGE = { outer: 13.75 };
const CONE = { base: 3.7, foot: 3.75, edge: 2.75, rim: 2.05, top: P + 1.55, floor: P + 1.1, stair: 1.0, stairs: [0, 90, 180, 270], cables: [-59.85, 59.85], bolts: 1.72, shaft: 0.8 };
const BLOCK = { face: 13.73, x: 8, back: 28.1, roof: P + 4.37 };   // the machine block: its roof as in the section
const SIDE = { outer: 15, back: 13.7, alcove: 14.0, front: 12.35, pier: 13.1, pierInner: 13.0, top: 5.45, shoulder: 4.65, step: 5.45 };
const WALK = { soffit: P + 2.3 };                    // the underside of the overhangs over the walk

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
                tris.push({ p, n: [n, n, n], c: f.map((k) => colourOf(closeEnds[k][2] ?? 1)) });
            }
        }
    }
    return fromTriangles(tris);
}

/** A flat shape (x, y in metres) raised from z0 to z1; its edges crisp unless `bevel` is given */
function prism(shape, z0, z1, { bevel = 0, segments = 1, shade = 1, tint, curveSegments = 12 } = {}) {
    const b = Math.min(bevel, (z1 - z0) / 3);
    const g = new THREE.ExtrudeGeometry(shape, {
        depth: z1 - z0 - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: segments, curveSegments,
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

/** Points along an arc of radius r from angle a0 to a1 (our angles: clockwise from +y), both ends included */
function arc(r, a0, a1, step = 1) {
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step));
    return Array.from({ length: n + 1 }, (_, i) => { const a = rad(a0 + ((a1 - a0) * i) / n); return [r * Math.sin(a), r * Math.cos(a)]; });
}

/** A box from (x0, y0) to (x1, y1), optionally turned round the centre by an angle */
function box(x0, x1, y0, y1, z0, z1, { turn = 0, ...options } = {}) {
    const g = outline([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, z1, options);
    if (turn) g.rotateZ(-rad(turn));
    return g;
}

/** A solid with a polygon at its foot (z0) and another, the same number of corners, at its top (z1): sloping sides */
function frustum(base, top, z0, z1, shade = 1) {
    const c = grey(shade);
    const B = base.map(([x, y]) => new THREE.Vector3(x, y, z0)), T = top.map(([x, y]) => new THREE.Vector3(x, y, z1));
    const centre = B.reduce((m, p) => m.add(p), new THREE.Vector3()).divideScalar(B.length);
    const tris = [];
    for (let i = 0; i < B.length; i++) {
        const j = (i + 1) % B.length;
        const n = new THREE.Vector3().crossVectors(B[j].clone().sub(B[i]), T[i].clone().sub(B[i])).normalize();
        if (n.dot(B[i].clone().sub(centre)) < 0) n.negate();
        tris.push({ p: [B[i], B[j], T[j]], n: [n, n, n], c: [c, c, c] }, { p: [B[i], T[j], T[i]], n: [n, n, n], c: [c, c, c] });
    }
    const up = new THREE.Vector3(0, 0, 1);
    for (const f of THREE.ShapeUtils.triangulateShape(top.map(([x, y]) => new THREE.Vector2(x, y)), [])) {
        tris.push({ p: f.map((k) => T[k]), n: [up, up, up], c: [c, c, c] });
    }
    return fromTriangles(tris);
}

/**
 * The inside of a hole: walls facing in and a floor, darker the deeper they go. corners: the
 * hole's outline at its mouth [[x, y], …] (counter-clockwise), from zTop down `depth` metres.
 */
function shaft(corners, zTop, depth, { light = 0.7, dark = 0.16 } = {}) {
    const tris = [];
    const top = grey(light), bottom = grey(dark);
    const n = corners.length;
    const cx = corners.reduce((m, p) => m + p[0], 0) / n, cy = corners.reduce((m, p) => m + p[1], 0) / n;
    for (let i = 0; i < n; i++) {
        const [x0, y0] = corners[i], [x1, y1] = corners[(i + 1) % n];
        const nn = new THREE.Vector3(y1 - y0, -(x1 - x0), 0).normalize();
        if (nn.x * (cx - x0) + nn.y * (cy - y0) < 0) nn.negate();   // facing into the hole
        const A = new THREE.Vector3(x0, y0, zTop), B = new THREE.Vector3(x1, y1, zTop);
        const C = new THREE.Vector3(x1, y1, zTop - depth), D = new THREE.Vector3(x0, y0, zTop - depth);
        tris.push({ p: [A, B, C], n: [nn, nn, nn], c: [top, top, bottom] }, { p: [A, C, D], n: [nn, nn, nn], c: [top, bottom, bottom] });
    }
    const up = new THREE.Vector3(0, 0, 1);
    for (const f of THREE.ShapeUtils.triangulateShape(corners.map(([x, y]) => new THREE.Vector2(x, y)), [])) {
        tris.push({ p: f.map((k) => new THREE.Vector3(corners[k][0], corners[k][1], zTop - depth)), n: [up, up, up], c: [bottom, bottom, bottom] });
    }
    return fromTriangles(tris);
}

/**
 * The dark inside of a small opening in a wall of any direction: p0, p1 its edges on the face
 * ([x, y]), `inward` the unit direction into the wall, from z0 to z1. Its faces sit a centimetre
 * inside the opening cut in the wall, so they cover its light faces.
 */
function niche(p0, p1, inward, depth, z0, z1) {
    const e = 0.01;
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const t = [(p1[0] - p0[0]) / len, (p1[1] - p0[1]) / len];
    const along = (p, v, s) => [p[0] + v[0] * s, p[1] + v[1] * s];
    const a = along(p0, t, e), b = along(p0, t, len - e);
    const a2 = along(a, inward, depth - e), b2 = along(b, inward, depth - e);
    const lo = z0 + e, hi = z1 - e;
    const V = (p, z) => new THREE.Vector3(p[0], p[1], z);
    const mouth = grey(0.16), deep = grey(0.04);
    const quad = (q, n, c) => [{ p: [q[0], q[1], q[2]], n: [n, n, n], c: [c[0], c[1], c[2]] }, { p: [q[0], q[2], q[3]], n: [n, n, n], c: [c[0], c[2], c[3]] }];
    const out = new THREE.Vector3(-inward[0], -inward[1], 0);
    const towardB = new THREE.Vector3(t[0], t[1], 0), towardA = towardB.clone().negate();
    return fromTriangles([
        ...quad([V(a2, lo), V(b2, lo), V(b2, hi), V(a2, hi)], out, [deep, deep, deep, deep]),
        ...quad([V(a, lo), V(a2, lo), V(a2, hi), V(a, hi)], towardB, [mouth, deep, deep, mouth]),
        ...quad([V(b, lo), V(b2, lo), V(b2, hi), V(b, hi)], towardA, [mouth, deep, deep, mouth]),
        ...quad([V(a, lo), V(b, lo), V(b2, lo), V(a2, lo)], new THREE.Vector3(0, 0, 1), [mouth, mouth, deep, deep]),
        ...quad([V(a, hi), V(b, hi), V(b2, hi), V(a2, hi)], new THREE.Vector3(0, 0, -1), [mouth, mouth, deep, deep]),
    ]);
}

/** The dark inside of a round hole in a wall facing east: from x0 in towards −x, its middle at (y, z) */
function tube(x0, y, z, r, depth) {
    const n = 24, e = 0.008, rr = r - e;
    const mouth = grey(0.16), deep = grey(0.04);
    const tris = [];
    for (let i = 0; i < n; i++) {
        const t0 = (i / n) * Math.PI * 2, t1 = ((i + 1) / n) * Math.PI * 2;
        const V = (t, x) => new THREE.Vector3(x, y + rr * Math.cos(t), z + rr * Math.sin(t));
        const N = (t) => new THREE.Vector3(0, -Math.cos(t), -Math.sin(t));   // facing in
        const a = x0 - e, b = x0 - depth;
        tris.push({ p: [V(t0, a), V(t1, a), V(t1, b)], n: [N(t0), N(t1), N(t1)], c: [mouth, mouth, deep] });
        tris.push({ p: [V(t0, a), V(t1, b), V(t0, b)], n: [N(t0), N(t1), N(t0)], c: [mouth, deep, deep] });
        const back = new THREE.Vector3(1, 0, 0);
        tris.push({ p: [new THREE.Vector3(x0 - depth, y, z), V(t0, x0 - depth), V(t1, x0 - depth)], n: [back, back, back], c: [deep, deep, deep] });
    }
    return fromTriangles(tris);
}

/** A flat face: a closed outline of [x, y, z] points (the last not repeating the first), with holes, facing `normal` */
function face(points, normal, { holes = [], shade = 1 } = {}) {
    const n = new THREE.Vector3(...normal).normalize();
    const u = new THREE.Vector3(...(Math.abs(n.z) < 0.9 ? [0, 0, 1] : [1, 0, 0])).cross(n).normalize();
    const v = new THREE.Vector3().crossVectors(n, u);
    const flat = ([x, y, z]) => new THREE.Vector2(x * u.x + y * u.y + z * u.z, x * v.x + y * v.y + z * v.z);
    const all = [...points, ...holes.flat()];
    const c = grey(shade);
    const tris = THREE.ShapeUtils.triangulateShape(points.map(flat), holes.map((h) => h.map(flat)));
    return fromTriangles(tris.map((t) => ({ p: t.map((k) => new THREE.Vector3(...all[k])), n: [n, n, n], c: [c, c, c] })));
}

/** Angles from a0 to a1, in that order, at most `step` apart on a grid shared by every face on the same circle, with `extra` angles between */
function stops(a0, a1, step = 0.5, extra = []) {
    const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
    const list = [lo, hi, ...extra.filter((a) => a > lo + 1e-6 && a < hi - 1e-6)];
    for (let k = Math.floor(lo / step) + 1; k * step < hi - 1e-6; k++) if (k * step > lo + 1e-6) list.push(k * step);
    const sorted = [...new Set(list)].sort((p, q) => p - q);
    return a0 <= a1 ? sorted : sorted.reverse();
}

/** [x, y] on the circle of radius r round `centre` at angle a (ours: clockwise from +y) */
const onCircle = (r, a, centre = [0, 0]) => [centre[0] + r * Math.sin(rad(a)), centre[1] + r * Math.cos(rad(a))];

/**
 * A face on the upright cylinder of radius r round `centre`: its columns at `angles` (either order),
 * from z0 to z1, facing 'in' (towards the centre) or 'out'; holes { a0, a1, z0, z1 } are left open.
 * Faces that meet it share its columns, so no seam shows between them
 */
function cylFace(centre, r, angles, z0, z1, { facing = 'in', holes = [], shade = 1 } = {}) {
    const as = [...new Set([...angles, ...holes.flatMap((h) => [h.a0, h.a1])])].sort((p, q) => p - q);
    const zs = [...new Set([z0, z1, ...holes.flatMap((h) => [h.z0, h.z1]).filter((z) => z > z0 && z < z1)])].sort((p, q) => p - q);
    const c = grey(shade), sign = facing === 'in' ? -1 : 1;
    const V = (a, z) => new THREE.Vector3(...onCircle(r, a, centre), z);
    const N = (a) => new THREE.Vector3(sign * Math.sin(rad(a)), sign * Math.cos(rad(a)), 0);
    const tris = [];
    for (let i = 0; i < as.length - 1; i++) {
        const [p, q] = [as[i], as[i + 1]];
        for (let k = 0; k < zs.length - 1; k++) {
            const [lo, hi] = [zs[k], zs[k + 1]];
            const am = (p + q) / 2, zm = (lo + hi) / 2;
            if (holes.some((h) => am > Math.min(h.a0, h.a1) && am < Math.max(h.a0, h.a1) && zm > h.z0 && zm < h.z1)) continue;
            tris.push({ p: [V(p, lo), V(q, lo), V(q, hi)], n: [N(p), N(q), N(q)], c: [c, c, c] });
            tris.push({ p: [V(p, lo), V(q, hi), V(p, hi)], n: [N(p), N(q), N(p)], c: [c, c, c] });
        }
    }
    return fromTriangles(tris);
}

/** Turn [x, y] round the centre by an angle (our angles: clockwise) */
const turned = ([x, y], a) => { const t = -rad(a); return [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)]; };

/** Pieces of a full turn left between gaps, as pairs of cuts ({ axis, half }) */
function between(gaps, half) {
    const sorted = [...gaps].map((a) => ((a % 360) + 360) % 360).sort((a, b) => a - b);
    return sorted.map((a, i) => [{ axis: a, half }, { axis: i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + 360, half }]);
}

/** Where the line from p0 along the unit vector d first meets the circle of radius r round the centre */
function hitCircle(p0, d, r) {
    const b = p0[0] * d[0] + p0[1] * d[1], c = p0[0] ** 2 + p0[1] ** 2 - r * r;
    const t = -b - Math.sqrt(b * b - c);
    return [p0[0] + d[0] * t, p0[1] + d[1] * t];
}

/** A polyline moved `d` metres to its left, its corners mitred */
function offsetLeft(points, d) {
    const normal = (i) => {
        const [x0, y0] = points[i], [x1, y1] = points[i + 1];
        const l = Math.hypot(x1 - x0, y1 - y0);
        return [-(y1 - y0) / l, (x1 - x0) / l];
    };
    const last = points.length - 1;
    return points.map((p, i) => {
        const a = normal(Math.max(0, i - 1)), b = normal(Math.min(last - 1, i));
        const k = d / (1 + a[0] * b[0] + a[1] * b[1]);
        return [p[0] + (a[0] + b[0]) * k, p[1] + (a[1] + b[1]) * k];
    });
}

/* ---------- THE PARTS ---------- */

const RUST = new THREE.Color(0.6, 0.42, 0.32);
const SMALL_PIT = [[-0.42, 4.32], [0.42, 4.32], [0.42, 4.96], [-0.42, 4.96]];   // a small pit in the floor by the cone, north-east

/** The base slab: the pit's floor and the walk outside the ring wall, one height */
function baseSlab(parts) {
    const pit = SMALL_PIT.map((q) => turned(q, 24.7));
    parts.push(outline(arc(WALL.inner + 0.02, 0, 360, 0.5).slice(0, -1), P - 0.3, P, { holes: [pit] }));
    parts.push(shaft(pit, P - 0.3, 0.3, { light: 0.45, dark: 0.15 }));
    parts.push(revolve([[WALL.outer, P], [LEDGE.outer, P], [LEDGE.outer, -0.3]]));
}

/** The ring wall, its three passages (steps, door rebate, climbing irons), the holes in its inner face */
function ringWall(parts) {
    const { inner: Ri, outer: Ro, top: T, passage } = WALL;
    const half = passage / 2;

    // The holes for the crane rail's brackets: a row in the inner face 1.8 m over the floor, every
    // 12°, real holes 14 cm square and 30 cm deep (photos 0023, 0024, 05)
    const hole = { z0: P + 1.75, z1: P + 1.89, half: deg(0.07 / Ri), depth: 0.3 };
    const holes = [];
    for (let a = 6; a < 360; a += 12) {
        if (!WALL.passages.some((p) => Math.abs(((a - p + 540) % 360) - 180) < 7)) holes.push(a > 180 ? a - 360 : a);
    }

    // The doorways sit high in the wall (photo 0024): their floor 0.6 m over the pit's floor, a sheer
    // drop on the inside; the opening 1.95 m high, 25 cm of wall over it
    const sill = P + 0.6, head = sill + 1.95;
    for (const [from, to] of between(WALL.passages, half)) {
        // The wall, all but its inner face; its ends (the passages' sides) up to the doors' head, where
        // the lintels go on without a seam
        parts.push(revolve([[Ri, T - 0.04], [Ri + 0.04, T], [Ro - 0.04, T], [Ro, T - 0.04], [Ro, head], [Ro, P]], {
            from, to, closeEnds: [[Ri, P], [Ro, P], [Ro, head], [Ri, head]],
        }));
        // … which is built here, round the holes in it
        const a0 = cutAngle(from, Ri, 'from'), a1 = cutAngle(to, Ri, 'to');
        const mine = holes.map((h) => [h, h + 360, h - 360].find((x) => x - hole.half > a0 && x + hole.half < a1)).filter((h) => h !== undefined);
        const angles = new Set();
        for (let x = a0; x < a1; x += 0.75) angles.add(x);
        angles.add(a1);
        for (const h of mine) { angles.add(h - hole.half); angles.add(h + hole.half); }
        const sorted = [...angles].sort((p, q) => p - q);
        const zs = [P, hole.z0, hole.z1, head, T - 0.04];
        const c = grey(1);
        const tris = [];
        for (let j = 0; j < sorted.length - 1; j++) {
            const [p0, p1] = [sorted[j], sorted[j + 1]];
            const mid = (p0 + p1) / 2;
            const n0 = new THREE.Vector3(-Math.sin(rad(p0)), -Math.cos(rad(p0)), 0), n1 = new THREE.Vector3(-Math.sin(rad(p1)), -Math.cos(rad(p1)), 0);
            for (let k = 0; k < zs.length - 1; k++) {
                if (k === 1 && mine.some((h) => Math.abs(mid - h) < hole.half)) continue;
                const [z0, z1] = [zs[k], zs[k + 1]];
                const A = at(Ri, p0, z0), B = at(Ri, p1, z0), C = at(Ri, p1, z1), D = at(Ri, p0, z1);
                tris.push({ p: [A, B, C], n: [n0, n1, n1], c: [c, c, c] }, { p: [A, C, D], n: [n0, n1, n0], c: [c, c, c] });
            }
        }
        parts.push(fromTriangles(tris));
        for (const h of mine) {
            const w = 0.07;
            const g = shaft([[-w, hole.z0 - P], [w, hole.z0 - P], [w, hole.z1 - P], [-w, hole.z1 - P]], 0, hole.depth, { light: 0.55, dark: 0.12 });
            // shaft() digs down along z: lay it on its side so it digs outward into the wall
            g.rotateX(Math.PI / 2);
            g.translate(0, Ri, P);
            g.rotateZ(-rad(h));
            parts.push(g);
        }
    }

    const iron = (a, r, z, out) => {   // a climbing iron, a bar standing 13 cm off the face at radius r
        const s = out ? 1 : -1;
        parts.push(box(-0.16, 0.16, r + s * 0.1, r + s * 0.13, z, z + 0.03, { turn: a, tint: RUST, shade: 0.45 }));
        for (const k of [-1, 1]) parts.push(box(k * 0.16 - 0.015, k * 0.16 + 0.015, r - s * 0.01, r + s * 0.13, z, z + 0.03, { turn: a, tint: RUST, shade: 0.45 }));
    };

    for (const a of WALL.passages) {
        // The lintel, exactly between the passage's sides
        parts.push(revolve([[Ri, head], [Ri, T - 0.04], [Ri + 0.04, T], [Ro - 0.04, T], [Ro, T - 0.04], [Ro, head], [Ri, head]], {
            from: { axis: a, half: -half }, to: { axis: a, half: -half },
        }));
        if (a !== 180) {
            // Four steps up from the walk (photos 52, 54): the lowest outside, wider, two inside, then the floor
            parts.push(box(-half - 0.15, half + 0.15, Ro - 0.05, Ro + 0.3, P - 0.1, P + 0.15, { turn: a }));
            parts.push(box(-half, half, Ro - 0.28, Ro + 0.005, P - 0.1, P + 0.3, { turn: a }));
            parts.push(box(-half, half, Ro - 0.56, Ro - 0.28, P - 0.1, P + 0.45, { turn: a }));
            parts.push(box(-half, half, Ri - 0.005, Ro - 0.56, P - 0.1, sill, { turn: a }));
        } else {
            // A level floor at the sill and a loose block on the walk before it (photo 53), climbing
            // irons up the outside to its west
            parts.push(box(-half, half, Ri - 0.005, Ro + 0.005, P - 0.1, sill, { turn: a }));
            parts.push(box(-0.3, 0.3, Ro + 0.3, Ro + 0.72, P - 0.05, P + 0.32, { turn: a }));
            for (let k = 0; k < 9; k++) iron(a + deg((half + 0.55) / Ro), Ro, P + 0.35 + k * 0.28, true);
        }
        for (const s of [-1, 1]) parts.push(box(s * half, s * (half - 0.08), 10.15, 10.5, sill, head, { turn: a }));   // the door's rebate
        // Climbing irons on the inner face beside the passage, on its north side (photos 05 and 0024:
        // between the doorway and the corner foundation), up to the top
        const side = a + (a > 0 && a < 180 ? -1 : 1) * deg(1.15 / Ri);
        for (let k = 0; k < 8; k++) iron(side, Ri, P + 0.3 + k * 0.32, false);
    }
}

/**
 * The pivot cone: steep (about 58°, as the photos show it), its four flights of stairs cut into
 * it; on top the rim round the sunken floor, the bolts close inside the rim, the shaft in the middle
 */
function pivotCone(parts) {
    const { base: R0, foot: Rs, edge: R1, rim: RI, top: H, floor: F } = CONE;
    const half = CONE.stair / 2;

    // The slope between the four flights of stairs; its inner face shows where the rim is open
    for (const [from, to] of between(CONE.stairs, half)) {
        parts.push(revolve([[R1, F], [R1, H], [R1 + 0.04, H - 0.05], [R0, P]], {
            from, to, closeEnds: [[R1, H], [R1, P], [R0, P], [R1 + 0.04, H - 0.05]],
        }));
    }
    // The rim on top, open at the south stair and the two cable runs, its inner edge chamfered (photo 55)
    const gaps = [...CONE.cables.map((a) => ({ axis: a, half: 0.3 })), { axis: 180, half }];
    const sorted = gaps.map((g) => ({ ...g, axis: (g.axis + 360) % 360 })).sort((a, b) => a.axis - b.axis);
    sorted.forEach((g, i) => {
        const next = sorted[(i + 1) % sorted.length];
        parts.push(revolve([[RI, F], [RI, H - 0.1], [RI + 0.1, H], [R1, H], [R1, P]], {
            from: g, to: { ...next, axis: next.axis + (i + 1 < sorted.length ? 0 : 360) },
            closeEnds: [[RI, F], [R1, F], [R1, H], [RI + 0.1, H], [RI, H - 0.1]],
        }));
    });
    for (const g of gaps) parts.push(box(-g.half, g.half, RI - 0.05, R1 + 0.01, F - 0.3, F, { turn: g.axis }));   // their floors

    // The sunken floor with the shaft through it, and the bolts — thin, close inside the rim
    const s = CONE.shaft / 2;
    const square = [[-s, -s], [s, -s], [s, s], [-s, s]];
    parts.push(outline(arc(RI + 0.02, 0, 360, 2).slice(0, -1), F - 0.05, F, { holes: [square] }));
    parts.push(shaft(square, F - 0.049, 2.3, { light: 0.62, dark: 0.1 }));
    for (let k = 0; k < 6; k++) {   // the step irons down one side
        const z = F - 0.35 - k * 0.32;
        parts.push(box(-0.14, 0.14, s - 0.1, s - 0.08, z, z + 0.025, { shade: 0.4, tint: RUST }));
    }
    for (let i = 0; i < 24; i++) {
        const p = at(CONE.bolts, i * 15 + 7.5, 0);
        const bolt = new THREE.Shape();
        bolt.absarc(p.x, p.y, 0.022, 0, Math.PI * 2, false);
        parts.push(prism(bolt, F - 0.01, H + 0.25, { shade: 0.42, tint: new THREE.Color(0.95, 0.9, 0.85), curveSegments: 8 }));
    }

    // The stairs, cut into the cone: from its foot up to one step below the rim (on three sides) or
    // onto the sunken floor (from the south). The cone's own cut faces are their sides (photos 56, 57)
    for (const a of CONE.stairs) {
        const toFloor = a === 180;
        const n = toFloor ? 5 : 6;
        const top = toFloor ? F : H - 0.2;
        const rise = (top - P) / n;
        for (let i = 0; i < n; i++) {
            const front = Rs - (i * (Rs - R1)) / n;
            parts.push(box(-half, half, toFloor ? RI - 0.05 : R1 - 0.02, front, P - 0.05, P + rise * (i + 1), { turn: a }));
        }
    }

}

/**
 * The crane rail's foundations in the pit, as drawn: 45 cm high, their top edges chamfered at 45°
 * (9 cm), three slots in each. Two rectangular ones and four right-angled triangles (2.25 × 2.2 m)
 * in the corners, their long side straight, standing just free of the curved wall
 */
function craneFoundations(parts) {
    const z1 = P + 0.45, z0 = P - 0.25;   // the lower chamfer is under the floor
    const look = { bevel: 0.09, segments: 1 };
    // Two rectangular ones, 1.6 × 1.4 m, north and south of the cone (a little east of the middle)
    for (const sy of [1, -1]) {
        const cx = 0.7, cy = 6.25 * sy;
        const slot = (x0, x1) => [[cx + x0, cy - 0.5], [cx + x1, cy - 0.5], [cx + x1, cy + 0.5], [cx + x0, cy + 0.5]];
        const w = 0.8 - 0.09, d = 0.7 - 0.09;   // the chamfer adds its width round the outline
        parts.push(outline([[cx - w, cy - d], [cx + w, cy - d], [cx + w, cy + d], [cx - w, cy + d]], z0, z1, {
            ...look, holes: [slot(-0.6, -0.43), slot(-0.2, 0.2), slot(0.43, 0.61)],
        }));
        parts.push(box(cx - 0.75, cx + 0.75, cy - 0.65, cy + 0.65, P, P + 0.15, { shade: 0.25 }));   // the slots' bottoms
    }
    // Four triangles in the corners: the right angle towards the cone, the legs along the axes
    for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
        const m = ([x, y]) => [x * sx, y * sy];
        const c = 0.09;
        const pts = [[5.2 + c, 5.55 + c], [5.2 + c, 7.75 - 2.2 * c], [7.45 - 2.2 * c, 5.55 + c]].map(m);
        const slot = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(m);
        parts.push(outline(pts, z0, z1, { ...look, holes: [slot(6.4, 6.6, 5.75, 6.35), slot(5.65, 6.1, 5.75, 6.7), slot(5.35, 5.55, 5.75, 6.7)] }));
        const [bx0, by0] = m([5.3, 5.7]), [bx1, by1] = m([6.65, 6.75]);
        parts.push(box(Math.min(bx0, bx1), Math.max(bx0, bx1), Math.min(by0, by1), Math.max(by0, by1), P, P + 0.15, { shade: 0.25 }));
    }
}

/**
 * The machine block, north of the pit, built face by face: every wall is one surface with real
 * openings in it, so no seams show where pieces would meet
 */
function machineBlock(parts) {
    const { face: Rf, x: X, back: Y, roof } = BLOCK;
    const S = WALK.soffit, base = -0.3, F0 = P - 0.05;
    const corner = deg(Math.atan2(7.55, 11.47));          // where the curved face ends: the corners, cut off radially
    const cE = onCircle(Rf, corner), cW = onCircle(Rf, -corner);

    // The boiler room's vent on the roof, to the east behind the crest (photos 0036–0038, 0311): a
    // triangle with its top cut off, 3.8 m at its foot, 1.1 m at its flat top, 1.9 m tall; its east
    // face is the block's east wall going on up. In it (photo 0037) a rectangular opening near the
    // top, a little south of the middle, a round pipe to its north, a round hole low under it
    const vent = { x0: 6.3, y0: 15.25, y1: 19.05, t0: 16.6, t1: 17.7, top: roof + 1.9 };
    const vRect = { u0: 16.83, u1: 17.33, z0: vent.top - 1.2, z1: vent.top - 0.45, depth: 0.6 };
    const vRounds = [{ y: 17.49, z: vent.top - 0.7, r: 0.15 }, { y: 17.08, z: roof + 0.22, r: 0.165 }];

    // Openings: a door to the north and one to the east, the machine hall's entrance to the west (the
    // plan), a window high in the west wall north of the entrance (photo 0046), a small one by the corner (58)
    const north = { u0: 3.0, u1: 3.85, z0: 0, z1: 2.3, depth: 2.5 };
    const east = { u0: 17.65, u1: 18.6, z0: 0, z1: 2.3, depth: 2.5 };
    const west = [
        { u0: 13.15, u1: 15.25, z0: 0, z1: 2.6, depth: 2.5 },
        { u0: 16.85, u1: 17.55, z0: roof - 1.8, z1: roof - 1.05, depth: 1.0 },
        { u0: 12.45, u1: 12.85, z0: 0.7, z1: 1.2, depth: 0.5 },
    ];
    const onX = (x, o) => [[x, o.u0, o.z0], [x, o.u1, o.z0], [x, o.u1, o.z1], [x, o.u0, o.z1]];
    const round = (x, { y, z, r }) => Array.from({ length: 24 }, (_, i) => [x, y + r * Math.cos((i / 24) * Math.PI * 2), z + r * Math.sin((i / 24) * Math.PI * 2)]);

    // The walls
    parts.push(face([[-X, Y, base], [X, Y, base], [X, Y, roof], [-X, Y, roof]], [0, 1, 0], {
        holes: [[[north.u0, Y, north.z0], [north.u1, Y, north.z0], [north.u1, Y, north.z1], [north.u0, Y, north.z1]]],
    }));
    parts.push(face([
        [X, 12.15, base], [X, Y, base], [X, Y, roof], [X, vent.y1, roof], [X, vent.t1, vent.top], [X, vent.t0, vent.top], [X, vent.y0, roof], [X, 12.15, roof],
    ], [1, 0, 0], { holes: [onX(X, east), onX(X, vRect), ...vRounds.map((c) => round(X, c))] }));
    parts.push(face([[-X, 12.15, base], [-X, Y, base], [-X, Y, roof], [-X, 12.15, roof]], [-1, 0, 0], { holes: west.map((o) => onX(-X, o)) }));
    // The corners, cut off radially; on their inner edges the heights where the curved face starts and ends
    for (const [c, sx] of [[cE, 1], [cW, -1]]) {
        parts.push(face([[sx * X, 12.15, base], [...c, base], [...c, F0], [...c, S + 0.01], [...c, roof], [sx * X, 12.15, roof]],
            [sx * Math.cos(rad(corner)), -Math.sin(rad(corner)), 0]));
    }
    // The curved face towards the pit, under the overhang; three small openings in it at its west end
    // (photo 58): two high under the overhang, a low slot by the corner. Above the overhang's underside
    // the block's face is inside the overhang
    const faceOpenings = [
        { a: -19.6, w: 0.4, d: 0.5, z0: S - 0.5, z1: S - 0.02 },
        { a: -27.9, w: 0.4, d: 0.5, z0: S - 0.5, z1: S - 0.02 },
        { a: -31.8, w: 0.25, d: 0.4, z0: P + 0.3, z1: P + 0.8 },
    ].map((o) => ({ ...o, a0: o.a - deg(o.w / 2 / Rf), a1: o.a + deg(o.w / 2 / Rf) }));
    const faceAngles = stops(-corner, corner, 0.5);
    parts.push(cylFace([0, 0], Rf, faceAngles, F0, S + 0.01, { facing: 'in', holes: faceOpenings }));
    // The roof
    parts.push(face([
        [-X, Y, roof], [X, Y, roof], [X, vent.y1, roof], [X, vent.y0, roof], [X, 12.15, roof],
        ...faceAngles.slice().reverse().map((a) => [...onCircle(Rf, a), roof]), [-X, 12.15, roof],
    ], [0, 0, 1]));

    // Dark inside every opening
    parts.push(niche([north.u0, Y], [north.u1, Y], [0, -1], north.depth, north.z0, north.z1));
    parts.push(niche([X, east.u0], [X, east.u1], [-1, 0], east.depth, east.z0, east.z1));
    for (const o of west) parts.push(niche([-X, o.u0], [-X, o.u1], [1, 0], o.depth, o.z0, o.z1));
    for (const o of faceOpenings) parts.push(niche(onCircle(Rf, o.a0), onCircle(Rf, o.a1), [Math.sin(rad(o.a)), Math.cos(rad(o.a))], o.d, o.z0, o.z1));
    parts.push(niche([X, vRect.u0], [X, vRect.u1], [-1, 0], vRect.depth, vRect.z0, vRect.z1));
    for (const c of vRounds) parts.push(tube(X, c.y, c.z, c.r, 0.5));

    // The vent's other faces, reaching a little down into the roof
    const slope = (vent.top - roof) / (vent.t0 - vent.y0), e = 0.05 / slope, lo = roof - 0.05, ns = Math.hypot(1, slope);
    parts.push(face([[vent.x0, vent.y0 - e, lo], [vent.x0, vent.y1 + e, lo], [vent.x0, vent.t1, vent.top], [vent.x0, vent.t0, vent.top]], [-1, 0, 0]));
    parts.push(face([[vent.x0, vent.y0 - e, lo], [X, vent.y0, roof], [X, vent.t0, vent.top], [vent.x0, vent.t0, vent.top]], [0, -slope / ns, 1 / ns]));
    parts.push(face([[vent.x0, vent.y1 + e, lo], [X, vent.y1, roof], [X, vent.t1, vent.top], [vent.x0, vent.t1, vent.top]], [0, slope / ns, 1 / ns]));
    parts.push(face([[vent.x0, vent.t0, vent.top], [X, vent.t0, vent.top], [X, vent.t1, vent.top], [vent.x0, vent.t1, vent.top]], [0, 0, 1]));

    // The side to the pit, in one piece — Lumbye's section of it ("Profil af maskinblokkens side ind
    // mod kanonbrønden", 1.95 m of ring wall = 103.5 px), heights over the walk: the soffit at 2.3 m,
    // the fascia 0.92 m high standing 1.13 m out from the face, a ledge 0.52 m deep; from it a face
    // leaning a little out towards the pit up through the roof (4.37 m) to the crest on top — its
    // front corner at 5.41 m, its ridge at 5.68 m, its back sloping down to 5.50 m and then
    // straight down to the roof. Cut off at the block's corners in one plane with them, so the
    // profile shows at its ends and the corner below it comes down to the walk (photos 43, 58)
    const z = (h) => P + h;
    const prof = { fascia: Rf - 1.13, ledge: Rf - 0.61, lean: Rf - 0.85, ridge: Rf + 0.34, back: 14.55 };
    parts.push(revolve([
        [Rf + 0.05, S], [prof.fascia + 0.04, S], [prof.fascia, S + 0.04], [prof.fascia, z(3.19)], [prof.fascia + 0.04, z(3.23)],
        [prof.ledge, z(3.23)], [prof.ledge, z(3.52)], [prof.lean, z(5.41)], [prof.ridge, z(5.68)],
        [prof.back - 0.1, z(5.5)], [prof.back, z(5.3)], [prof.back, roof - 0.05],
    ], {
        from: -corner, to: corner,
        // its ends, but where the block itself already has its corner face
        closeEnds: [[prof.fascia, S], [prof.fascia, z(3.23)], [prof.ledge, z(3.23)], [prof.ledge, z(3.52)], [prof.lean, z(5.41)],
            [prof.ridge, z(5.68)], [prof.back - 0.1, z(5.5)], [prof.back, z(5.3)], [prof.back, roof - 0.01], [Rf + 0.01, roof - 0.01], [Rf + 0.01, S]],
    }));

    // On the roof, to the west: a raised slab with sloping sides, from the crest to near the back
    // (drone and air photos)
    parts.push(frustum([[-X, 14.6], [-X, 24.7], [-2.0, 24.7], [-2.0, 14.6]], [[-X, 14.6], [-X, 24.05], [-2.65, 24.05], [-2.65, 14.6]], roof - 0.05, roof + 0.45));
}

/**
 * A side block, west (side −1) or east (+1) of the pit — after the plan, Lumbye's drawings of the
 * east one and the photos from the walk (31, 32, 41, 48–51); drawn for the west, mirrored for the east.
 * Built face by face, so every face is one surface:
 *
 *   - at the walk its back wall stands where the walk ends (r 13.7), set deeper at both ends (an
 *     alcove behind a pier, splayed into the middle); a low bench runs along it
 *   - the piers stand on the walk's outer edge (their front at r 13.1, so the walk passes them)
 *   - from 2.3 m over the walk the block hangs out over the walk to r 12.35, in one face up to its
 *     top: at the north end squared off along the end's diagonal, at the south end curving back
 *     onto the pier
 *   - its middle rises 0.8 m higher than its ends (Lumbye's drawing of the front)
 *   - a small opening in the south end, 1.2 m over the ground, into the block (photo 41)
 */
function sideBlock(parts, side) {
    const mx = -side;                                    // x × 1 for the west, × −1 for the east
    const add = (points, [nx, ny, nz], options) => parts.push(face(points.map(([x, y, z]) => [x * mx, y, z]), [nx * mx, ny, nz], options));
    const cyl = ([cx, cy], r, angles, z0, z1, options) => parts.push(cylFace([cx * mx, cy], r, angles.map((a) => a * mx), z0, z1, options));
    const S = WALK.soffit, F0 = P - 0.05, base = -0.3;
    const { outer: X, back: Rb, alcove: Xa, front: Rf, pier: Rp, pierInner: Xp, top, shoulder, step } = SIDE;
    const yN = 7.0, yS = -6.6, yAN = 6.5, yAS = -6.1, yP = 5.3, ySplay = 2.05, yDeep = 2.6;
    const unit = ([x, y]) => { const l = Math.hypot(x, y); return [x / l, y / l]; };
    const along = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k];
    const angleAt = ([x, y], [cx, cy] = [0, 0]) => deg(Math.atan2(x - cx, y - cy));

    // The ends' diagonals, as drawn, from the end walls towards the ring
    const B = [-12.8, yN], Q = [-12.8, yS];
    const dN = unit([1.3, -0.9]), dS = unit([1.4, 1.25]), inS = [-dS[1], dS[0]];
    const C1 = hitCircle(B, dN, Rp), C2 = hitCircle(B, dN, Rf), P1 = hitCircle(Q, dS, Rp);
    const D = [-Math.sqrt(Rp * Rp - yP * yP), yP], O = [D[0], -yP];
    const I = [-Math.sqrt(Rb * Rb - ySplay * ySplay), ySplay], J = [I[0], -ySplay];
    // The overhang's south end curves back onto the pier, round cB
    const rho = 1.1;
    const cB = hitCircle(along(Q, inS, rho), dS, Rf + rho);
    const T1 = onCircle(Rf, angleAt(cB)), T2 = along(cB, inS, -rho);
    // Where the top steps up to the middle: on the front's arc to the north, on the curve to the south
    const aStep = angleAt([-Math.sqrt(Rf * Rf - step * step), step]);
    const bStep = deg(Math.acos((-step - cB[1]) / rho));

    // The columns of the curved faces, shared by the faces that meet them
    const front = stops(angleAt(C2), angleAt(T1), 0.5, [aStep]);
    const bend = stops(angleAt(T1, cB), angleAt(T2, cB), 5, [bStep]);
    const nPier = stops(angleAt(C1), angleAt(D), 0.5);
    const sPier = stops(angleAt(O), angleAt(P1), 0.5);
    const back = stops(angleAt(I), angleAt(J), 0.5);
    const onFront = (a) => onCircle(Rf, a), onBend = (a) => onCircle(rho, a, cB), onPier = (a) => onCircle(Rp, a), onBack = (a) => onCircle(Rb, a);

    // The outer faces: the west one in one piece up to the stepped top, the ends
    add([[-X, yS, base], [-X, yN, base], [-X, yN, shoulder], [-X, step, shoulder], [-X, step, top], [-X, -step, top], [-X, -step, shoulder], [-X, yS, shoulder]], [-1, 0, 0]);
    add([[-X, yN, base], [B[0], yN, base], [B[0], yN, shoulder], [-X, yN, shoulder]], [0, 1, 0]);
    add([[-X, yS, base], [Q[0], yS, base], [Q[0], yS, shoulder], [-X, yS, shoulder]], [0, -1, 0]);
    // The north end, along its diagonal: the pier below, the overhang above, one face
    add([[...B, base], [...C1, base], [...C1, F0], [...C1, S], [...C2, S], [...C2, shoulder], [...B, shoulder]], [-dN[1], dN[0], 0]);
    // The south end, along its diagonal, with the small opening in it
    const ha = along(Q, dS, 0.14), hb = along(Q, dS, 0.63), hz = [P + 0.1, P + 0.6];
    add([[...Q, base], [...P1, base], [...P1, F0], [...P1, S], [...T2, S], [...T2, shoulder], [...Q, shoulder]], [dS[1], -dS[0], 0], {
        holes: [[[...ha, hz[0]], [...hb, hz[0]], [...hb, hz[1]], [...ha, hz[1]]]],
    });
    parts.push(niche([ha[0] * mx, ha[1]], [hb[0] * mx, hb[1]], [inS[0] * mx, inS[1]], 0.4, hz[0], hz[1]));

    // Under the overhang, from the walk up to its underside: the piers, the alcoves behind them (in
    // shadow, darker), the back wall
    const wall = (p0, p1, normal, shade = 1) => add([[...p0, F0], [...p1, F0], [...p1, S], [...p0, S]], normal, { shade });
    const dark = 0.45;
    const sN = unit([I[0] + Xa, I[1] - yDeep]), sS = unit([-Xa - J[0], -yDeep - J[1]]);
    cyl([0, 0], Rp, nPier, F0, S, { facing: 'in' });
    wall(D, [-Xp, yP], [0, -1, 0]);
    wall([-Xp, yP], [-Xp, yAN], [-1, 0, 0], dark);
    wall([-Xp, yAN], [-Xa, yAN], [0, -1, 0], dark);
    wall([-Xa, yAN], [-Xa, yDeep], [1, 0, 0], dark);
    wall([-Xa, yDeep], I, [-sN[1], sN[0], 0]);
    cyl([0, 0], Rb, back, F0, S, { facing: 'in' });
    wall(J, [-Xa, -yDeep], [-sS[1], sS[0], 0]);
    wall([-Xa, -yDeep], [-Xa, yAS], [1, 0, 0], dark);
    wall([-Xa, yAS], [-Xp, yAS], [0, 1, 0], dark);
    wall([-Xp, yAS], [-Xp, -yP], [-1, 0, 0], dark);
    wall([-Xp, -yP], O, [0, 1, 0]);
    cyl([0, 0], Rp, sPier, F0, S, { facing: 'in' });

    // The overhang's underside
    add([
        ...front.map(onFront), ...bend.slice(1).map(onBend), ...sPier.slice().reverse().map(onPier),
        [-Xp, -yP], [-Xp, yAS], [-Xa, yAS], [-Xa, -yDeep], ...back.slice().reverse().map(onBack),
        [-Xa, yDeep], [-Xa, yAN], [-Xp, yAN], [-Xp, yP], ...nPier.slice().reverse().map(onPier),
    ].map(([x, y]) => [x, y, S]), [0, 0, -1]);

    // The overhang's front, in one face up to the top, and its curving south end
    const highF = front.filter((a) => a <= aStep + 1e-9), lowF = front.filter((a) => a >= aStep - 1e-9);
    const highB = bend.filter((a) => a <= bStep + 1e-9), lowB = bend.filter((a) => a >= bStep - 1e-9);
    cyl([0, 0], Rf, front, S, shoulder, { facing: 'in' });
    cyl([0, 0], Rf, highF, shoulder, top, { facing: 'in' });
    cyl(cB, rho, bend, S, shoulder, { facing: 'out' });
    cyl(cB, rho, highB, shoulder, top, { facing: 'out' });

    // The tops: the ends a step lower than the middle
    const sA = onFront(aStep), sB = onBend(bStep);
    add([[-X, step], [-X, yN], B, ...lowF.map(onFront)].map(([x, y]) => [x, y, shoulder]), [0, 0, 1]);
    add([[-X, -step], ...lowB.map(onBend), Q, [-X, yS]].map(([x, y]) => [x, y, shoulder]), [0, 0, 1]);
    add([[-X, step], ...highF.map(onFront), ...highB.slice(1).map(onBend), [-X, -step]].map(([x, y]) => [x, y, top]), [0, 0, 1]);
    add([[-X, step, shoulder], [sA[0], step, shoulder], [sA[0], step, top], [-X, step, top]], [0, 1, 0]);
    add([[-X, -step, shoulder], [sB[0], -step, shoulder], [sB[0], -step, top], [-X, -step, top]], [0, -1, 0]);

    // The alcoves' floors, beyond the walk's edge (reaching 5 cm in over it)
    const L = LEDGE.outer - 0.05;
    const edgeAt = (y) => [-Math.sqrt(L * L - y * y), y];
    const floor = (points) => add(points.map(([x, y]) => [x, y, P]), [0, 0, 1], { shade: 0.85 });
    floor([...stops(angleAt(edgeAt(yP)), angleAt(I), 0.5).map((a) => onCircle(L, a)), [-Xa, yDeep], [-Xa, yAN], [-Xp, yAN], [-Xp, yP]]);
    floor([...stops(angleAt(edgeAt(-yP)), angleAt(J), 0.5).map((a) => onCircle(L, a)), [-Xa, -yDeep], [-Xa, yAS], [-Xp, yAS], [-Xp, -yP]]);

    // The bench along the back wall, 0.45 m deep and 0.35 m high
    const backLine = [[-Xa, yP], [-Xa, yDeep], ...back.map(onBack), [-Xa, -yDeep], [-Xa, -yP]];
    parts.push(outline([...backLine, ...offsetLeft(backLine, 0.45).reverse()].map(([x, y]) => [x * mx, y]), P - 0.05, P + 0.35));
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
 *   textured  true = the weathered concrete; false (default) = plain grey concrete
 */
export function buildKanonstilling({ textured = false } = {}) {
    const group = new THREE.Group();
    const model = new THREE.Mesh(emplacementGeometry(), concreteMaterial({ textured, floors: [0, P, CONE.floor, BLOCK.roof] }));
    model.castShadow = true;
    model.receiveShadow = true;
    group.add(model, groundMesh());
    return {
        group,
        /** Across the walk round the ring, for fitting it to the screen */
        size: LEDGE.outer * 2,
        /** Where the sound of a speaker at an angle comes from: in the pit, by the wall, at ear height */
        speakerSpot: (angle) => at(8.2, angle, P + 1.3),
        /** Above the middle, where the listener floats */
        listenerSpot: new THREE.Vector3(0, 0, P + 3.6),
    };
}
