/**
 * Kanonstilling G3 at Dueodde, Bornholm, in 3D — built from code rather than loaded, after Jørgen
 * Lumbye's measured plan ("Kanonbygning (halvfærdig)", hanstholmregistreringen.dk) and photos of
 * the place. Metres, z up, the middle of the gun pit at the origin, ground at z 0. Angles are
 * degrees clockwise from straight ahead (+y, towards the gun building), like the speakers'.
 *
 *   - the pit (r 9.35), sunk a little, inside the ring wall (2 m thick, a broad top) with three
 *     covered passages through it; outside the wall a raised platform out to r 13
 *   - the gun's foundation in the middle: a cone cut off flat (r 4.3 → 2.9), four flights of
 *     stairs up it; on top a low collar, the gun's bolts in a circle and a plinth in the middle
 *   - six ammunition boxes in the pit, four of them against the wall, three slots in each
 *   - ahead: the gun building (half finished, 15.6 m wide), its corners cut off towards the ring
 *   - to the sides: the walled wings and the posts beyond them
 *
 * Heights are read off the photos, not measured. Everything is merged into one mesh with vertex
 * colours (shade in the corners, the dark openings, the rusty bolts), so it costs one draw call.
 * Curves are fine-grained and edges bevelled a little, so the light runs smoothly round it.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { concreteMaterial } from './concrete';

/* ---------- MEASUREMENTS (metres) ---------- */

export const PIT = { radius: 9.35, floor: 0.5 };
export const WALL = { inner: 9.35, outer: 11.3, top: 3.4, passages: [-61, 61, 180], passage: 1.4 };
export const PLATFORM = { outer: 13, top: 1.2 };
const FOUNDATION = { base: 4.3, top: 2.9, height: 1.5, stairs: [0, 90, 180, 270], stair: 1.15, collar: { inner: 1.95, outer: 2.3, height: 0.45 }, bolts: 1.75 };

/* ---------- GEOMETRY HELPERS ---------- */

const rad = THREE.MathUtils.degToRad;
const at = (r, a, z) => new THREE.Vector3(r * Math.sin(rad(a)), r * Math.cos(rad(a)), z);

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

const grey = (v) => new THREE.Color(v, v, v);

/**
 * A profile turned round the centre: points [r, z, shade], walked so the solid lies to the right
 * (outward faces get normal (-dz, dr)). Each step of the profile is its own band, so corners stay
 * sharp while the way round stays smooth. With from/to less than a full turn, the ends are closed.
 */
function revolve(profile, { from = 0, to = 360, segments = 192, tint, closeEnds } = {}) {
    const steps = Math.max(6, Math.round((segments * (to - from)) / 360));
    const tris = [];
    const colourOf = (shade) => (tint ? grey(shade).multiply(tint) : grey(shade));
    for (let i = 0; i < profile.length - 1; i++) {
        const [r0, z0, s0 = 1] = profile[i], [r1, z1, s1 = 1] = profile[i + 1];
        const len = Math.hypot(r1 - r0, z1 - z0);
        const nr = -(z1 - z0) / len, nz = (r1 - r0) / len;
        const c0 = colourOf(s0), c1 = colourOf(s1);
        for (let j = 0; j < steps; j++) {
            const a0 = from + ((to - from) * j) / steps, a1 = from + ((to - from) * (j + 1)) / steps;
            const n = (a) => new THREE.Vector3(nr * Math.sin(rad(a)), nr * Math.cos(rad(a)), nz);
            const A = at(r0, a0, z0), B = at(r1, a0, z1), C = at(r1, a1, z1), D = at(r0, a1, z0);
            tris.push({ p: [A, B, C], n: [n(a0), n(a0), n(a1)], c: [c0, c1, c1] });
            tris.push({ p: [A, C, D], n: [n(a0), n(a1), n(a1)], c: [c0, c1, c0] });
        }
    }
    if (closeEnds) {
        const contour = closeEnds.map(([r, z]) => new THREE.Vector2(r, z));
        const faces = THREE.ShapeUtils.triangulateShape(contour, []);
        for (const [a, sign] of [[from, -1], [to, 1]]) {
            const n = new THREE.Vector3(Math.cos(rad(a)) * sign, -Math.sin(rad(a)) * sign, 0);
            for (const f of faces) {
                const p = f.map((k) => at(closeEnds[k][0], a, closeEnds[k][1]));
                const c = f.map((k) => colourOf(closeEnds[k][2] ?? 0.9));
                tris.push({ p, n: [n, n, n], c });
            }
        }
    }
    return fromTriangles(tris);
}

/** A flat shape (x, y in metres) raised from z0 to z1, its edges bevelled */
function prism(shape, z0, z1, { bevel = 0.04, shade = 1, tint, curveSegments = 12 } = {}) {
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

/** A ring segment from r0 to r1 between angles a0 and a1 */
function sector(r0, r1, a0, a1, z0, z1, options = {}) {
    const t0 = Math.PI / 2 - rad(a0), t1 = Math.PI / 2 - rad(a1);   // to the maths angle (ccw from +x)
    const shape = new THREE.Shape();
    shape.moveTo(r1 * Math.cos(t0), r1 * Math.sin(t0));
    shape.absarc(0, 0, r1, t0, t1, true);
    shape.lineTo(r0 * Math.cos(t1), r0 * Math.sin(t1));
    shape.absarc(0, 0, r0, t1, t0, false);
    shape.closePath();
    return prism(shape, z0, z1, { curveSegments: Math.max(8, Math.round(Math.abs(a1 - a0) * 1.2)), ...options });
}

/** A box from (x0, y0) to (x1, y1), optionally turned round the centre by an angle */
function box(x0, x1, y0, y1, z0, z1, { turn = 0, ...options } = {}) {
    const shape = new THREE.Shape();
    shape.moveTo(x0, y0); shape.lineTo(x1, y0); shape.lineTo(x1, y1); shape.lineTo(x0, y1); shape.closePath();
    const g = prism(shape, z0, z1, options);
    if (turn) g.rotateZ(-rad(turn));
    return g;
}

/* ---------- THE EMPLACEMENT ---------- */

const RUST = new THREE.Color(0.55, 0.36, 0.25);
const DARK = 0.13;

/** A flat outline [[x, y], …] raised from z0 to z1 */
function outline(points, z0, z1, options) {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    return prism(shape, z0, z1, options);
}

/** Pieces of a full turn left between gaps (centred on the given angles, each `gap` degrees wide) */
function between(gaps, gap) {
    const sorted = [...gaps].map((a) => ((a % 360) + 360) % 360).sort((a, b) => a - b);
    return sorted.map((a, i) => [a + gap / 2, (i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + 360) - gap / 2]);
}

function emplacementGeometry() {
    const parts = [];
    const P = PIT.floor;
    const { inner: Ri, outer: Ro, top: T } = WALL;
    const { outer: Rp, top: Tp } = PLATFORM;
    const F = FOUNDATION, C = F.collar;
    const H = P + F.height;   // the foundation's top

    /* The pit's floor, darker by the wall */
    parts.push(revolve([[0, P, 1], [7.4, P, 0.95], [8.8, P, 0.8], [Ri, P, 0.6]]));

    /* The ring wall, cut by its three passages, and the platform outside it */
    const passageAngle = (WALL.passage / ((Ri + Ro) / 2)) * (180 / Math.PI);
    for (const [from, to] of between(WALL.passages, passageAngle)) {
        parts.push(revolve([
            [Ri, P, 0.5], [Ri, T - 0.12, 0.95], [Ri + 0.12, T, 1], [Ro - 0.12, T + 0.04, 1], [Ro, T - 0.08, 0.95], [Ro, Tp, 0.65],
        ], { from, to, closeEnds: [[Ri, 0, 0.45], [Ro, 0, 0.45], [Ro, Tp, 0.55], [Ro, T - 0.08, 0.8], [Ri, T - 0.12, 0.8]] }));
    }
    for (const a of WALL.passages) {
        const h = passageAngle / 2 + 0.3;
        parts.push(sector(Ri - 0.02, Ro + 0.02, a - h, a + h, P + 2.05, T, { bevel: 0.03, shade: 0.9 }));   // over the passage
        parts.push(sector(Ri, Ro, a - h, a + h, 0, P + 0.25, { bevel: 0, shade: 0.55 }));                    // its floor
    }
    parts.push(revolve([[Ro, Tp, 0.75], [Rp - 0.06, Tp, 1], [Rp, Tp - 0.06, 0.95], [Rp, 0, 0.55]]));

    /* The gun's foundation: four quarters of a cut-off cone between four flights of stairs */
    const half = (F.stair / ((F.base + F.top) / 2)) * (180 / Math.PI) / 2;
    for (const [from, to] of between(F.stairs, half * 2)) {
        parts.push(revolve([[0, H, 1], [F.top - 0.06, H, 1], [F.top, H - 0.06, 0.95], [F.base, P, 0.62]], {
            from, to, closeEnds: [[0, P, 0.55], [F.base, P, 0.6], [F.top, H - 0.06, 0.85], [F.top - 0.06, H, 0.9], [0, H, 0.9]],
        }));
        parts.push(revolve([
            [C.inner, H, 0.6], [C.inner, H + C.height - 0.03, 0.95], [C.inner + 0.03, H + C.height, 1],
            [C.outer - 0.03, H + C.height, 1], [C.outer, H + C.height - 0.03, 0.95], [C.outer, H, 0.7],
        ], { from: from + 3, to: to - 3, closeEnds: [[C.inner, H, 0.8], [C.outer, H, 0.8], [C.outer, H + C.height, 0.95], [C.inner, H + C.height, 0.95]] }));
    }
    parts.push(revolve([[0, H + 0.005, 0.85], [C.inner, H + 0.005, 0.7]]));   // the floor inside the collar, whole
    const steps = 8;
    for (const a of F.stairs) {
        for (let i = 0; i < steps; i++) {
            const outer = F.base + 0.25 - (i * (F.base + 0.25 - F.top)) / steps;
            parts.push(sector(C.inner, outer, a - half + 0.4, a + half - 0.4, P - 0.05, P + (F.height * (i + 1)) / steps, { bevel: 0.015, shade: 0.92 - i * 0.015 }));
        }
    }
    for (let i = 0; i < 32; i++) {
        const shape = new THREE.Shape();
        const p = at(F.bolts, (i * 360) / 32 + 5.6, 0);
        shape.absarc(p.x, p.y, 0.035, 0, Math.PI * 2, false);
        parts.push(prism(shape, H - 0.01, H + 0.55, { bevel: 0.008, shade: 0.55, tint: RUST, curveSegments: 6 }));
    }
    parts.push(box(-0.55, 0.55, -0.55, 0.55, H - 0.01, H + 0.3, { bevel: 0.03, shade: 0.8 }));   // the plinth in the middle

    /* The ammunition boxes: three slots in each */
    for (const [a, r] of [[45, 8.55], [135, 8.55], [-135, 8.55], [-45, 8.55], [0, 5.7], [180, 5.7]]) {
        parts.push(box(-0.8, 0.8, r - 0.6, r + 0.6, P - 0.05, P + 0.9, { turn: a, bevel: 0.04 }));
        for (const x of [-0.42, 0, 0.42]) parts.push(box(x - 0.1, x + 0.1, r - 0.42, r + 0.42, P + 0.86, P + 0.92, { turn: a, bevel: 0, shade: DARK }));
    }
    parts.push(box(1.45, 2.3, 3.3, 4.15, P - 0.05, P + 0.6, { bevel: 0.03, shade: 0.9 }));      // a block by the foundation

    /* Ahead: the gun building, its corners cut off towards the ring, a raised slab on its roof */
    parts.push(outline([[-7.8, 11.1], [-2.8, 13.9], [2.8, 13.9], [7.8, 11.1], [7.8, 27.6], [-7.8, 27.6]], -0.05, 5.0, { bevel: 0.06 }));
    parts.push(box(0.8, 7.0, 16.0, 26.6, 4.95, 5.55, { bevel: 0.05 }));
    parts.push(box(-1.1, 1.1, 12.8, 14.0, -0.05, Tp, { bevel: 0.03, shade: 0.9 }));              // the step up to its door
    parts.push(box(-0.6, 0.6, 13.86, 13.95, Tp, Tp + 2.1, { bevel: 0, shade: DARK }));          // the door
    for (const y of [17, 22.5]) {
        parts.push(box(-7.86, -7.79, y, y + 0.9, 1.6, 2.2, { bevel: 0, shade: DARK }));         // loopholes
        parts.push(box(7.79, 7.86, y, y + 0.9, 1.6, 2.2, { bevel: 0, shade: DARK }));
    }

    /* To the sides: the walled wings, the plinths before them and the posts beyond */
    for (const side of [-1, 1]) {
        const X = (x0, x1) => (side < 0 ? [x0, x1] : [-x1, -x0]);
        parts.push(box(...X(-15.0, -14.4), -7.2, 6.4, -0.05, 1.7, { bevel: 0.04 }));
        parts.push(outline([[-15.0, 5.8], [-12.4, 5.8], [-11.0, 4.2], [-11.4, 6.4], [-15.0, 6.4]].map(([x, y]) => [x * -side, y]), -0.05, 1.7, { bevel: 0.04 }));
        parts.push(outline([[-15.0, -6.6], [-12.4, -6.6], [-11.0, -5.0], [-11.4, -7.2], [-15.0, -7.2]].map(([x, y]) => [x * -side, y]), -0.05, 1.7, { bevel: 0.04 }));
        parts.push(box(...X(-14.45, -12.2), -6.65, 5.85, -0.05, 0.15, { bevel: 0, shade: 0.7 }));
        parts.push(box(...X(-16.5, -15.6), -0.45, 0.45, -0.05, 1.0, { bevel: 0.03 }));
        for (const y of [5.8, -6.6]) parts.push(box(...X(-20.3, -19.5), y, y + 0.8, -0.05, 0.8, { bevel: 0.03 }));
    }

    return mergeGeometries(parts);
}

/** Forest floor round the emplacement, fading out at its edge */
function groundMesh() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.5, '#aaa');
    g.addColorStop(1, '#000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const alphaMap = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(
        new THREE.RingGeometry(PLATFORM.outer, 34, 192, 1),
        new THREE.MeshStandardMaterial({ color: 0x3f3e3a, roughness: 1, alphaMap, transparent: true, opacity: 0.75, depthWrite: false }),
    );
    mesh.receiveShadow = true;
    return mesh;
}

/**
 * The emplacement as a group (metres, z up).
 *   textured  false = plain grey concrete, true = the concrete texture
 */
export function buildKanonstilling({ textured = true } = {}) {
    const group = new THREE.Group();
    const model = new THREE.Mesh(emplacementGeometry(), concreteMaterial({ textured }));
    model.castShadow = true;
    model.receiveShadow = true;
    group.add(model, groundMesh());
    return {
        group,
        /** Across the platform, for fitting it to the screen */
        size: PLATFORM.outer * 2,
        /** Where a speaker stands: on the ammunition box at that angle (the boxes against the wall stand at ±45° and ±135°) */
        speakerSpot: (angle) => at(8.4, angle, PIT.floor + 0.9),
        /** Above the middle, where the listener floats */
        listenerSpot: new THREE.Vector3(0, 0, 4.4),
    };
}
