/**
 * Kirkestræde in 3D, at eye level (src/player/interfaces/street/StreetScene.js): geometry made from the
 * street's data (src/player/vaerker/streets.js). OSM has only the footprints, so the rest is made up, after
 * the street as it stands: low houses side by side along it, one or two storeys, most of them
 * half-timbered, with steep tiled roofs — some with the gable to the street — chimneys, small
 * windows with bars, a door in each; the church at the end with its tall roof and its tower.
 *
 * Every surface carries what its shader needs to draw itself (StreetScene.js):
 *
 *   aUv    metres across and up the surface (a facade: along the street and up from the ground;
 *          a roof: along the eaves and up the slope)
 *   aInfo  [style, seed, width, eave]  style — facades: 0 plastered, 1 half-timbered, 2 timbered
 *          with dark infill; seed — 0–1, picks shades, which windows are lit, where the door is;
 *          width — the facade's width; eave — its height to the eaves (a facade with storeys: the
 *          storeys are worked out from it)
 *
 * Nothing here needs three.js but the BufferGeometry at the end.
 */

import * as THREE from 'three';

/* ---------- RANDOM, BUT THE SAME EVERY TIME ---------- */

export function random(seed) {
    let s = seed >>> 0 || 1;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* ---------- THE STREET AS A LINE ---------- */

/**
 * A line through the street's middle, with metres along it (s). It runs on straight past both ends
 * by `extend` metres, so anything can be measured against it; s = 0 stays at the first point.
 */
export function makePath(flat, extend = 400) {
    const pts = [];
    for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
    const unit = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
    const d0 = unit(pts[1], pts[0]), d1 = unit(pts.at(-2), pts.at(-1));
    pts.unshift([pts[0][0] + d0[0] * extend, pts[0][1] + d0[1] * extend]);
    pts.push([pts.at(-1)[0] + d1[0] * extend, pts.at(-1)[1] + d1[1] * extend]);
    const s = [-extend];
    for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));

    /** Where s is: { x, z, tx, tz } (the direction there, along the piece it is on) */
    const at = (sv) => {
        let i = 1;
        while (i < pts.length - 1 && s[i] < sv) i++;
        const t = (sv - s[i - 1]) / (s[i] - s[i - 1] || 1);
        const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
        const [tx, tz] = unit(pts[i - 1], pts[i]);
        return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, tx, tz };
    };
    /** The direction at s, smoothed over `span` metres either way, so a bend is turned gently */
    const direction = (sv, span = 7) => {
        const a = at(sv - span), b = at(sv + span);
        const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        return [(b.x - a.x) / l, (b.z - a.z) / l];
    };
    /** A point measured against the line: s along it, d across (+ to the right walking towards the end) */
    const project = (x, z) => {
        let best = Infinity, out = { s: 0, d: 0 };
        for (let i = 1; i < pts.length; i++) {
            const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
            const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
            const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
            const ex = x - (ax + dx * t), ez = z - (az + dz * t);
            const e = ex * ex + ez * ez;
            if (e < best) {
                best = e;
                const l = Math.sqrt(l2);
                out = { s: s[i - 1] + t * l, d: (ex * -dz + ez * dx) / l };
            }
        }
        return out;
    };
    return { at, direction, project, length: s.at(-2) };
}

/* ---------- RINGS ---------- */

const ringOf = (flat) => { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i], flat[i + 1]]); return r; };

function inside([x, z], ring) {
    let ins = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, zi] = ring[i], [xj, zj] = ring[j];
        if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins;
    }
    return ins;
}

/** How far a ray goes before it meets one of the edges (Infinity: none) */
function rayHit([ox, oz], [dx, dz], edges, max = Infinity) {
    let best = max;
    for (const [[ax, az], [bx, bz]] of edges) {
        const ex = bx - ax, ez = bz - az;
        const den = dx * ez - dz * ex;
        if (Math.abs(den) < 1e-9) continue;
        const t = ((ax - ox) * ez - (az - oz) * ex) / den;
        const u = ((ax - ox) * dz - (az - oz) * dx) / den;
        if (t > 1e-4 && u >= 0 && u <= 1 && t < best) best = t;
    }
    return best;
}

const edgesOf = (ring) => ring.map((p, i) => [p, ring[(i + 1) % ring.length]]);

function distToLine([x, z], line) {
    let best = Infinity;
    for (let i = 2; i < line.length; i += 2) {
        const ax = line[i - 2], az = line[i - 1], dx = line[i] - ax, dz = line[i + 1] - az;
        const l2 = dx * dx + dz * dz;
        const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
        best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z));
    }
    return best;
}

/* ---------- A MESH, PIECE BY PIECE ---------- */

class Builder {
    constructor() { this.pos = []; this.nrm = []; this.uv = []; this.info = []; }

    /** A flat polygon (3 or 4 points, [x, y, z]) facing `normal`, with its uvs */
    face(points, uvs, normal, info) {
        const [a, b, c] = points;
        const n = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a))
            .cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c), new THREE.Vector3(...a)));
        let order = points.map((_, i) => i);
        if (n.dot(new THREE.Vector3(...normal)) < 0) order = order.reverse();
        const nn = new THREE.Vector3(...normal).normalize();
        const put = (i) => { this.pos.push(...points[order[i]]); this.nrm.push(nn.x, nn.y, nn.z); this.uv.push(...uvs[order[i]]); this.info.push(...info); };
        for (let k = 1; k < points.length - 1; k++) { put(0); put(k); put(k + 1); }
    }

    geometry() {
        if (!this.pos.length) return null;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
        g.setAttribute('aUv', new THREE.Float32BufferAttribute(this.uv, 2));
        g.setAttribute('aInfo', new THREE.Float32BufferAttribute(this.info, 4));
        g.computeBoundingSphere();
        return g;
    }
}

/* ---------- THE HOUSES ---------- */

const PLINTH = 0.35;

/**
 * The houses: each footprint walled up to its eaves, with a roof sloping in from every edge that
 * doesn't face a street; along the edges that face a street (or Torvet) a row of narrow houses,
 * each with its own height, roof and front.
 */
function buildHouses(data, path, rand, out) {
    const rings = data.buildings.map(ringOf);
    const allEdges = rings.flatMap(edgesOf);
    const square = ringOf(data.square);
    const others = Object.values(data.streets).flat();
    const [w0, w1] = data.walk;

    // Houses inside another's footprint (sheds in a yard) can't be seen
    const centroid = (r) => r.reduce((a, p) => [a[0] + p[0] / r.length, a[1] + p[1] / r.length], [0, 0]);
    const keep = rings.map((r, i) => !rings.some((o, j) => j !== i && inside(centroid(r), o)));

    /**
     * Walls already standing, so none is drawn twice: footprints in OSM often share a wall with the
     * next, or overlap it, and two faces in one place flicker
     */
    const used = [];
    const freeParts = ([a, c]) => {
        const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
        if (len < 0.05) return [];
        const dir = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
        const cover = [];
        for (const u of used) {
            if (Math.abs(dir[0] * u.dir[0] + dir[1] * u.dir[1]) < 0.97) continue;
            if (Math.abs((a[0] - u.a[0]) * u.dir[1] - (a[1] - u.a[1]) * u.dir[0]) > 0.45) continue;
            const t0 = (u.a[0] - a[0]) * dir[0] + (u.a[1] - a[1]) * dir[1];
            const t1 = t0 + u.len * (dir[0] * u.dir[0] + dir[1] * u.dir[1]);
            const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(len, Math.max(t0, t1));
            if (hi - lo > 0.05) cover.push([lo, hi]);
        }
        cover.sort((x, y) => x[0] - y[0]);
        const free = [];
        let at = 0;
        for (const [lo, hi] of cover) { if (lo > at) free.push([at, lo]); at = Math.max(at, hi); }
        if (at < len) free.push([at, len]);
        return free.filter(([lo, hi]) => hi - lo > 0.6).map(([lo, hi]) => [[a[0] + dir[0] * lo, a[1] + dir[1] * lo], [a[0] + dir[0] * hi, a[1] + dir[1] * hi]]);
    };

    rings.forEach((ring, b) => {
        if (!keep[b]) return;
        const own = edgesOf(ring);
        const parts = own.flatMap(freeParts).map(([a, c]) => {
            const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
            const dir = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
            const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
            let n = [dir[1], -dir[0]];
            if (inside([mid[0] + n[0] * 0.05, mid[1] + n[1] * 0.05], ring)) n = [-n[0], -n[1]];
            return { a, c, len, dir, mid, n };
        });
        for (const p of parts) used.push({ a: p.a, dir: p.dir, len: p.len });
        const units = [];
        const front = new Set();

        parts.forEach(({ a, len, dir, mid, n }, e) => {
            if (len < 2.5) return;
            // Facing open ground: nothing in front of it for 4 m (past a wall right on it: the next house's)
            if (rayHit([mid[0] + n[0] * 0.45, mid[1] + n[1] * 0.45], n, allEdges, 3.5) < 3.5) return;
            const { s, d } = path.project(...mid);
            const onStreet = Math.abs(d) < 16 && s > w0 - 70 && s < w1 + 120;
            const onOther = others.some((l) => distToLine(mid, l) < 11);
            const onSquare = inside([mid[0] + n[0] * 5, mid[1] + n[1] * 5], square);
            if (!onStreet && !onOther && !onSquare) return;
            front.add(e);

            // Narrow houses side by side along the edge
            const count = Math.max(1, Math.round(len / (6 + rand() * 3.5)));
            const widths = Array.from({ length: count }, () => 0.85 + rand() * 0.3);
            const sum = widths.reduce((x, y) => x + y, 0);
            let at = 0;
            widths.forEach((wr, i) => {
                const w = (wr / sum) * len;
                const start = [a[0] + dir[0] * at, a[1] + dir[1] * at];
                const m = [start[0] + dir[0] * w / 2 - n[0] * 0.05, start[1] + dir[1] * w / 2 - n[1] * 0.05];
                const depth = Math.min(9.5, rayHit(m, [-n[0], -n[1]], own, 40));
                /** A corner house: its side faces open ground too, and gets a front of its own */
                const sideOpen = (x, sign) => {
                    const q = [start[0] + dir[0] * x - n[0] * Math.min(depth, 9.5) / 2, start[1] + dir[1] * x - n[1] * Math.min(depth, 9.5) / 2];
                    const d = [dir[0] * sign, dir[1] * sign];
                    return rayHit([q[0] + d[0] * 0.45, q[1] + d[1] * 0.45], d, allEdges, 3.5) >= 3.5;
                };
                const r = rand();
                const storeys = r < 0.32 ? 1 : r < 0.95 ? 2 : 3;
                const eave = storeys === 1 ? 3.1 + rand() * 0.6 : storeys === 2 ? 5.7 + rand() * 0.9 : 8.4 + rand() * 0.6;
                units.push({
                    start, dir, n, w, depth: Math.max(2.5, depth), eave, storeys,
                    pitch: THREE.MathUtils.degToRad(47 + rand() * 9),
                    gable: w < 7.8 && depth > 5 && rand() < 0.3,
                    style: rand() < 0.62 ? (rand() < 0.75 ? 1 : 2) : 0,
                    seed: rand(),
                    chimney: rand() < 0.55 ? 0.2 + rand() * 0.6 : null,
                    shade: rand(),
                    open: [i === 0 && sideOpen(0, -1), i === count - 1 && sideOpen(w, 1)],
                });
                at += w;
            });
        });

        // The footprint: walls to the eaves, low enough that the houses in front hide them
        const eave = units.length ? Math.max(2.8, Math.min(...units.map((u) => u.eave)) - 0.25) : 3.4 + rand() * 3;
        const shade = rand();
        let along = 0;
        parts.forEach(({ a, c, len, mid, n }, e) => {
            out.walls.face(
                [[a[0], 0, a[1]], [c[0], 0, c[1]], [c[0], eave, c[1]], [a[0], eave, a[1]]],
                [[along, 0], [along + len, 0], [along + len, eave], [along, eave]],
                [n[0], 0, n[1]], [0, shade, len, eave],
            );
            along += len;
            if (front.has(e) || len < 1) return;
            // A roof sloping in from this edge, no further than halfway across
            const inward = rayHit([mid[0] - n[0] * 0.05, mid[1] - n[1] * 0.05], [-n[0], -n[1]], own, 60);
            const run = Math.min(4.2, inward / 2);
            const rise = run * 1.1;
            const o = 0.3;   // the eaves stand out a little
            const p = (q, k, y) => [q[0] - n[0] * k, y, q[1] - n[1] * k];
            const slope = Math.hypot(run + o, rise + o * 1.1);
            out.roofs.face(
                [p(a, -o, eave - o * 1.1), p(c, -o, eave - o * 1.1), p(c, run, eave + rise), p(a, run, eave + rise)],
                [[0, 0], [len, 0], [len, slope], [0, slope]],
                [n[0] * 1.1, 1, n[1] * 1.1], [0, shade, len, slope],
            );
        });

        for (const u of units) unitGeometry(u, out);
    });
}

/** One narrow house: front, sides, back, roof, maybe a chimney */
function unitGeometry(u, out) {
    const { start, dir, n, w, depth, eave, pitch, gable } = u;
    const lift = 0.04;   // stands a hair in front of the footprint's wall
    const P = (along, inward, y) => [start[0] + dir[0] * along - n[0] * (inward - lift), y, start[1] + dir[1] * along - n[1] * (inward - lift)];
    const info = (width, top) => [u.style, u.seed, width, top];
    const wallInfo = [0, u.shade, w, eave];
    const sideInfo = [u.style, (u.seed + 0.5) % 1, depth, eave];   // a corner house's side, with windows
    const N = [n[0], 0, n[1]], B = [-n[0], 0, -n[1]], L = [-dir[0], 0, -dir[1]], R = [dir[0], 0, dir[1]];
    const tan = Math.tan(pitch);

    if (!gable) {
        // The eaves along the street: the ridge runs along it, halfway back
        const ridge = eave + (depth / 2) * tan;
        out.facades.face([P(0, 0, 0), P(w, 0, 0), P(w, 0, eave), P(0, 0, eave)], [[0, 0], [w, 0], [w, eave], [0, eave]], N, info(w, eave));
        out.walls.face([P(0, depth, 0), P(w, depth, 0), P(w, depth, eave), P(0, depth, eave)], [[0, 0], [w, 0], [w, eave], [0, eave]], B, wallInfo);
        for (const [x, side, k] of [[0, L, 0], [w, R, 1]]) {
            out[u.open[k] ? 'facades' : 'walls'].face([P(x, 0, 0), P(x, depth, 0), P(x, depth, eave), P(x, depth / 2, ridge), P(x, 0, eave)],
                k ? [[depth, 0], [0, 0], [0, eave], [depth / 2, ridge], [depth, eave]] : [[0, 0], [depth, 0], [depth, eave], [depth / 2, ridge], [0, eave]],
                side, u.open[k] ? sideInfo : wallInfo);
        }
        const o = 0.4, g = 0.18;   // the eaves and the gables stand out
        const len = Math.hypot(depth / 2 + o, (depth / 2 + o) * tan);
        for (const [edge, sign] of [[0, 1], [depth, -1]]) {
            const e0 = edge - sign * o;
            out.roofs.face([P(-g, e0, eave - o * tan), P(w + g, e0, eave - o * tan), P(w + g, depth / 2, ridge), P(-g, depth / 2, ridge)],
                [[0, 0], [w + 2 * g, 0], [w + 2 * g, len], [0, len]],
                [sign * n[0] * tan, 1, sign * n[1] * tan], [0, u.shade, w, len]);
        }
        if (u.chimney !== null) chimney(P(u.chimney * w, depth / 2 + 0.6, 0), dir, n, ridge, out, u.shade);
    } else {
        // The gable to the street: the ridge runs back from it, across the house's middle
        const ridge = eave + (w / 2) * tan;
        out.facades.face([P(0, 0, 0), P(w, 0, 0), P(w, 0, eave), P(w / 2, 0, ridge), P(0, 0, eave)],
            [[0, 0], [w, 0], [w, eave], [w / 2, ridge], [0, eave]], N, info(w, eave));
        out.walls.face([P(0, depth, 0), P(w, depth, 0), P(w, depth, eave), P(w / 2, depth, ridge), P(0, depth, eave)],
            [[0, 0], [w, 0], [w, eave], [w / 2, ridge], [0, eave]], B, wallInfo);
        out[u.open[0] ? 'facades' : 'walls'].face([P(0, 0, 0), P(0, depth, 0), P(0, depth, eave), P(0, 0, eave)], [[0, 0], [depth, 0], [depth, eave], [0, eave]], L, u.open[0] ? sideInfo : wallInfo);
        out[u.open[1] ? 'facades' : 'walls'].face([P(w, 0, 0), P(w, depth, 0), P(w, depth, eave), P(w, 0, eave)], [[depth, 0], [0, 0], [0, eave], [depth, eave]], R, u.open[1] ? sideInfo : wallInfo);
        const o = 0.35, g = 0.25;
        const len = Math.hypot(w / 2 + o, (w / 2 + o) * tan);
        for (const [x, sign] of [[0, -1], [w, 1]]) {
            const x0 = x + sign * o;
            out.roofs.face([P(x0, -g, eave - o * tan), P(x0, depth, eave - o * tan), P(w / 2, depth, ridge), P(w / 2, -g, ridge)],
                [[0, 0], [depth + g, 0], [depth + g, len], [0, len]],
                [sign * dir[0] * tan, 1, sign * dir[1] * tan], [0, u.shade, depth, len]);
        }
        if (u.chimney !== null) chimney(P(w / 2 + 0.5, depth * (0.4 + u.chimney * 0.4), 0), dir, n, ridge, out, u.shade);
    }
}

function chimney([x, , z], dir, n, ridge, out, shade) {
    const h0 = ridge - 1.2, h1 = ridge + 0.9 + shade * 0.5, r = 0.32;
    const c = (a, b, y) => [x + dir[0] * a - n[0] * b, y, z + dir[1] * a - n[1] * b];
    const sides = [[[-r, -r], [r, -r], [n[0], 0, n[1]]], [[r, -r], [r, r], [dir[0], 0, dir[1]]], [[r, r], [-r, r], [-n[0], 0, -n[1]]], [[-r, r], [-r, -r], [-dir[0], 0, -dir[1]]]];
    for (const [[a0, b0], [a1, b1], N] of sides) {
        out.walls.face([c(a0, b0, h0), c(a1, b1, h0), c(a1, b1, h1), c(a0, b0, h1)], [[0, 0], [0.64, 0], [0.64, h1 - h0], [0, h1 - h0]], N, [1, 0.1, 0.64, h1 - h0]);
    }
}

/* ---------- THE CHURCH ---------- */

/**
 * Sankt Nicolai Kirke: the footprint walled up high, under a tall roof along its length, and the
 * tower at its west end (the end towards the street), with a spire.
 */
function buildChurch(data, path, out) {
    const ring = ringOf(data.church);
    const c = ring.reduce((a, p) => [a[0] + p[0] / ring.length, a[1] + p[1] / ring.length], [0, 0]);
    // Its length: the main axis of the footprint
    let xx = 0, zz = 0, xz = 0;
    for (const [x, z] of ring) { xx += (x - c[0]) ** 2; zz += (z - c[1]) ** 2; xz += (x - c[0]) * (z - c[1]); }
    const angle = 0.5 * Math.atan2(2 * xz, xx - zz);
    let ax = [Math.cos(angle), Math.sin(angle)];
    // West = the end nearest the street
    const ends = ring.map(([x, z]) => (x - c[0]) * ax[0] + (z - c[1]) * ax[1]);
    const lo = Math.min(...ends), hi = Math.max(...ends);
    const pLo = [c[0] + ax[0] * lo, c[1] + ax[1] * lo], pHi = [c[0] + ax[0] * hi, c[1] + ax[1] * hi];
    if (Math.abs(path.project(...pHi).d) < Math.abs(path.project(...pLo).d)) ax = [-ax[0], -ax[1]];
    const across = [-ax[1], ax[0]];
    const along = ring.map(([x, z]) => (x - c[0]) * ax[0] + (z - c[1]) * ax[1]);
    const side = ring.map(([x, z]) => (x - c[0]) * across[0] + (z - c[1]) * across[1]);
    const west = Math.min(...along), east = Math.max(...along);
    // The nave's width: what most of the footprint spans (the porches stick out further)
    const sorted = side.slice().sort((a, b) => a - b);
    const half = Math.min(11, Math.max(Math.abs(sorted[1]), Math.abs(sorted.at(-2))));
    const W = (a, s, y) => [c[0] + ax[0] * a + across[0] * s, y, c[1] + ax[1] * a + across[1] * s];

    const EAVE = 11;
    let u = 0;
    edgesOf(ring).forEach(([a, b]) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        let n = [(b[1] - a[1]) / len, -(b[0] - a[0]) / len];
        if (inside([mid[0] + n[0] * 0.05, mid[1] + n[1] * 0.05], ring)) n = [-n[0], -n[1]];
        out.church.face([[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], EAVE, b[1]], [a[0], EAVE, a[1]]],
            [[u, 0], [u + len, 0], [u + len, EAVE], [u, EAVE]], [n[0], 0, n[1]], [0, 0.5, len, EAVE]);
        u += len;
    });

    // The roof along the nave, with the east gable (the west one is behind the tower)
    const tan = Math.tan(THREE.MathUtils.degToRad(54));
    const ridge = EAVE + half * tan;
    const o = 0.5;
    const len = Math.hypot(half + o, (half + o) * tan);
    for (const sign of [1, -1]) {
        out.roofs.face([W(west, sign * (half + o), EAVE - o * tan), W(east + 0.4, sign * (half + o), EAVE - o * tan), W(east + 0.4, 0, ridge), W(west, 0, ridge)],
            [[0, 0], [east - west, 0], [east - west, len], [0, len]], [across[0] * sign * tan, 1, across[1] * sign * tan], [0, 0.35, east - west, len]);
    }
    out.church.face([W(east, -half, EAVE), W(east, half, EAVE), W(east, 0, ridge)], [[0, EAVE], [2 * half, EAVE], [half, ridge]], [ax[0], 0, ax[1]], [0, 0.5, 2 * half, EAVE]);

    // The tower: square, at the west end, with a spire
    const T = Math.min(5.2, half * 0.55);
    const TOP = 34, SPIRE = 17;
    const t0 = west - 0.6, t1 = west + 2 * T - 0.6;
    const corners = [[t0, -T], [t1, -T], [t1, T], [t0, T]];
    corners.forEach((p, i) => {
        const q = corners[(i + 1) % 4];
        const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        const nx = m[0] - (t0 + t1) / 2, ns = m[1];
        const nl = Math.hypot(nx, ns);
        const N = [(ax[0] * nx + across[0] * ns) / nl, 0, (ax[1] * nx + across[1] * ns) / nl];
        out.tower.face([W(p[0], p[1], 0), W(q[0], q[1], 0), W(q[0], q[1], TOP), W(p[0], p[1], TOP)],
            [[0, 0], [2 * T, 0], [2 * T, TOP], [0, TOP]], N, [1, 0.5, 2 * T, TOP]);
        const apex = W((t0 + t1) / 2, 0, TOP + SPIRE);
        const g = 0.35;
        const pp = [p[0] + Math.sign(p[0] - (t0 + t1) / 2) * g, p[1] + Math.sign(p[1]) * g];
        const qq = [q[0] + Math.sign(q[0] - (t0 + t1) / 2) * g, q[1] + Math.sign(q[1]) * g];
        const slant = Math.hypot(SPIRE, T);
        out.roofs.face([W(pp[0], pp[1], TOP - 0.3), W(qq[0], qq[1], TOP - 0.3), apex], [[0, 0], [2 * T, 0], [T, slant]],
            [N[0] * SPIRE, T, N[2] * SPIRE], [0, 0.15, 2 * T, slant]);
    });
    return { top: W((t0 + t1) / 2, 0, TOP + SPIRE) };
}

/* ---------- WHAT SITS IN THE STREET ---------- */

/**
 * How wide the street is at s: how far to the walls on either side ([left, right], null where
 * there is no wall within reach — a side street, the churchyard, the square)
 */
function widthsAt(path, data, step = 2) {
    const rings = [...data.buildings.map(ringOf), ringOf(data.church)];
    const edges = rings.flatMap(edgesOf);
    const out = [];
    for (let s = data.walk[0] - 30; s <= data.walk[1] + 40; s += step) {
        const p = path.at(s);
        const [tx, tz] = path.direction(s, 3);
        const right = [-tz, tx];
        const hit = (sign) => { const d = rayHit([p.x, p.z], [right[0] * sign, right[1] * sign], edges, 11); return d < 11 ? d : null; };
        out.push({ s, left: hit(-1), right: hit(1) });
    }
    return out;
}

/** Lamps on the walls (or on posts where there is no wall), every 15 m, from side to side */
function placeLamps(path, data, widths) {
    const lamps = [];
    let side = 1;
    for (let s = data.walk[0] - 18; s <= data.walk[1] + 24; s += 15) {
        const w = widths.reduce((a, b) => (Math.abs(b.s - s) < Math.abs(a.s - s) ? b : a));
        let d = side > 0 ? w.right : w.left, onWall = true;
        if (d === null) { d = side > 0 ? w.left : w.right; if (d !== null) side = -side; }
        if (d === null) { d = 4.2; onWall = false; }
        const p = path.at(s);
        const [tx, tz] = path.direction(s, 3);
        const k = side * (d - (onWall ? 0.55 : 0));
        lamps.push({ x: p.x - tz * k, y: 4.1, z: p.z + tx * k, wall: onWall ? [tz * side, -tx * side] : null });
        side = -side;
    }
    return lamps;
}

/**
 * The installation: eight speakers round Kirkestræde 20, over about 30 m, on the walls on either
 * side (on brackets where there is no wall)
 */
function placeSpeakers(path, data, widths) {
    const out = [];
    for (let i = 0; i < 8; i++) {
        const s = data.at20 - 14 + i * 4;
        const side = i % 2 ? 1 : -1;
        const w = widths.reduce((a, b) => (Math.abs(b.s - s) < Math.abs(a.s - s) ? b : a));
        const d = (side > 0 ? w.right : w.left) ?? 4;
        const p = path.at(s);
        const [tx, tz] = path.direction(s, 3);
        const k = side * (d - 0.35);
        out.push({ s, x: p.x - tz * k, y: 2.9, z: p.z + tx * k, wall: [tz * side, -tx * side] });
    }
    return out;
}

/* ---------- THE COBBLES ---------- */

/**
 * The cobbles, as a texture 2 m square that tiles: rows of small stones across the street, each
 * row shifted, the stones rounded. r = how light the stone is, g = how high (the shader lights
 * the stones from it), b = the joints.
 */
export function cobbleTexture(seed = 7, size = 512) {
    const rand = random(seed);
    const PX = size / 2;   // pixels per metre
    const height = new Float32Array(size * size);
    const light = new Float32Array(size * size).fill(0.35);
    const rowH = Math.round(0.125 * PX);
    const rows = Math.round(size / rowH);
    for (let r = 0; r < rows; r++) {
        const y0 = Math.round((r * size) / rows), y1 = Math.round(((r + 1) * size) / rows);
        let x = Math.floor(rand() * 40);
        const startX = x;
        while (x < startX + size) {
            const w = Math.round((0.1 + rand() * 0.07) * PX);
            const shade = 0.55 + rand() * 0.45;
            const bump = 0.7 + rand() * 0.3;
            const tilt = (rand() - 0.5) * 0.25;
            const g = 2 + Math.floor(rand() * 2);   // the joint
            const hw = w / 2 - g, hh = (y1 - y0) / 2 - g;
            const cx = x + w / 2, cy = (y0 + y1) / 2 + (rand() - 0.5) * 2;
            for (let py = y0; py < y1; py++) {
                for (let px = x; px < x + w; px++) {
                    const dx = (px + 0.5 - cx) / hw, dy = (py + 0.5 - cy) / hh;
                    const e = Math.pow(Math.abs(dx), 3) + Math.pow(Math.abs(dy), 3);   // a rounded square
                    if (e >= 1) continue;
                    const i = (py % size) * size + (((px % size) + size) % size);
                    height[i] = Math.pow(1 - e, 0.45) * bump + dx * tilt;
                    light[i] = shade * (0.9 + rand() * 0.1);
                }
            }
            x += w;
        }
    }
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
        data[i * 4] = Math.round(Math.min(1, light[i]) * 255);
        data[i * 4 + 1] = Math.round(Math.max(0, Math.min(1, height[i])) * 255);
        data[i * 4 + 2] = height[i] > 0.02 ? 255 : 0;
        data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, size, size);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
}

/* ---------- THE HAZE ---------- */

/**
 * A map of the haze over the ground, made once: clear in the street between Torvet and the church,
 * thickening past both ends — over the square behind you, and on past the church — and out to the
 * sides away from the street. Lies still while you walk.
 */
export function hazeMap(path, data, extent, { ends = [6, 75], sides = [26, 95] } = {}) {
    const [x0, z0, x1, z1] = extent;
    const W = 192, H = Math.max(2, Math.round((W * (z1 - z0)) / (x1 - x0)));
    const [w0, w1] = data.walk;
    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const out = new Uint8Array(W * H * 4);
    for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
            const x = x0 + ((i + 0.5) / W) * (x1 - x0), z = z0 + ((j + 0.5) / H) * (z1 - z0);
            const { s, d } = path.project(x, z);
            const v = Math.max(
                smooth(w0 - ends[0], w0 - ends[1], s),
                smooth(w1 + ends[0], w1 + ends[1], s),
                smooth(sides[0], sides[1], Math.abs(d)),
            );
            out.set([v * 255, v * 255, v * 255, 255], (j * W + i) * 4);
        }
    }
    const tex = new THREE.DataTexture(out, W, H);
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
}

/* ---------- ALL OF IT ---------- */

/**
 * The street, ready for the scene: the geometry by material, and where the lamps and speakers are
 *
 * @returns {{ path, extent, geometries: { facades, walls, roofs, church, tower }, lamps, speakers, spire }}
 */
export function buildStreet(data, seed = 20) {
    const rand = random(seed);
    const path = makePath(data.street);
    const out = { facades: new Builder(), walls: new Builder(), roofs: new Builder(), church: new Builder(), tower: new Builder() };
    buildHouses(data, path, rand, out);
    const { top } = buildChurch(data, path, out);
    const widths = widthsAt(path, data);

    const xs = [], zs = [];
    for (const flat of [...data.buildings, data.church, data.square, data.street]) for (let i = 0; i < flat.length; i += 2) { xs.push(flat[i]); zs.push(flat[i + 1]); }
    const M = 60;
    const extent = [Math.min(...xs) - M, Math.min(...zs) - M, Math.max(...xs) + M, Math.max(...zs) + M];

    return {
        path,
        extent,
        geometries: Object.fromEntries(Object.entries(out).map(([k, b]) => [k, b.geometry()])),
        lamps: placeLamps(path, data, widths),
        speakers: placeSpeakers(path, data, widths),
        spire: top,
    };
}
