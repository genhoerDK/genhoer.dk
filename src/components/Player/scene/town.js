/**
 * Houses for the walk interface's map (WalkScene.js), made up from the streets alone — no
 * building data: rows of houses along both sides of every street and round the squares, gables to
 * the side and the ridge along the street as in an old market town, with the yards inside the blocks
 * left open. Nothing is built on a street, on the water, on a square, on a landmark, too near one of
 * the work's places, or on another house. Widths, depths, heights and gaps vary, from a seed, so it
 * comes out the same every time.
 *
 * After drone photos of the town: along the harbour the houses stand wall to wall in an unbroken row
 * of tall town houses, with nothing on the quay side but the promenade; facades and roofs vary
 * between pale and dark (white, yellow and red houses; red tile and grey slate roofs).
 *
 * Metres, x to the east and z to the south, as the map is drawn in WalkScene.js.
 */

import * as THREE from 'three';

/** A small seeded random number generator (mulberry32) */
function random(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Squared distance from p to the segment a–b */
function toSegment(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const l = dx * dx + dz * dz;
    const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l)) : 0;
    const x = ax + dx * t - px, z = az + dz * t - pz;
    return x * x + z * z;
}

/** Do segments p–q and a–b cross? */
function cross(px, pz, qx, qz, ax, az, bx, bz) {
    const d = (x1, z1, x2, z2, x3, z3) => (x2 - x1) * (z3 - z1) - (z2 - z1) * (x3 - x1);
    const d1 = d(ax, az, bx, bz, px, pz), d2 = d(ax, az, bx, bz, qx, qz), d3 = d(px, pz, qx, qz, ax, az), d4 = d(px, pz, qx, qz, bx, bz);
    return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Is a street segment (with its half width and a margin) clear of a quad? */
function clearOf(quad, s, margin) {
    const reach = (s.half + margin) ** 2;
    const ring = quad.flat();
    if (inside(s.ax, s.az, ring) || inside(s.bx, s.bz, ring)) return false;
    for (let i = 0; i < 4; i++) {
        const [x1, z1] = quad[i], [x2, z2] = quad[(i + 1) % 4];
        if (cross(x1, z1, x2, z2, s.ax, s.az, s.bx, s.bz)) return false;
        if (toSegment(x1, z1, s.ax, s.az, s.bx, s.bz) < reach) return false;   // a corner too near the street
        if (toSegment(s.ax, s.az, x1, z1, x2, z2) < reach || toSegment(s.bx, s.bz, x1, z1, x2, z2) < reach) return false;   // the street's end too near a wall
    }
    return true;
}

function inside(px, pz, ring) {
    let c = false;
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
        const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
        if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) c = !c;
    }
    return c;
}

/** Do two convex quads (four corners each, [[x, z], ...]) overlap? Separating axes */
function overlap(a, b) {
    for (const quad of [a, b]) {
        for (let i = 0; i < 4; i++) {
            const [x1, z1] = quad[i], [x2, z2] = quad[(i + 1) % 4];
            const nx = z2 - z1, nz = x1 - x2;
            let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
            for (const [x, z] of a) { const d = x * nx + z * nz; aMin = Math.min(aMin, d); aMax = Math.max(aMax, d); }
            for (const [x, z] of b) { const d = x * nx + z * nz; bMin = Math.min(bMin, d); bMax = Math.max(bMax, d); }
            if (aMax <= bMin || bMax <= aMin) return false;
        }
    }
    return true;
}

/**
 * @param {object} town
 * @param {{ lines: number[][], half: number, build?: boolean }[]} town.streets  Each kind of street: its lines ([x, z, x, z, ...]),
 *                                    half its width, and build: false for paths that houses keep off but don't line
 * @param {number[][]} [town.water]    Closed lines the houses keep off
 * @param {number[][]} [town.squares]  Closed lines the houses keep off, and line
 * @param {number[][]} [town.blocks]   Closed lines the houses keep off (the landmarks)
 * @param {THREE.Vector2[]} [town.clear]  Points to keep a little space round (the work's places)
 * @param {number} [town.seed]
 * @returns {{ corners: number[][], height: number, pitched: boolean, wall: number, roof: number }[]}
 *          corners: front left, front right, back right, back left; wall, roof: 0–1, dark to pale
 */
export function makeHouses({ streets, water = [], squares = [], blocks = [], clear = [], seed = 7 }) {
    const rand = random(seed);
    const CELL = 40;

    // Every street segment in a grid, so the nearest ones are quick to find
    const grid = new Map();
    const key = (i, j) => `${i},${j}`;
    const segments = [];
    for (const { lines, half, build = true } of [...streets, { lines: squares, half: 0.5 }]) {
        for (const l of lines) {
            for (let i = 2; i < l.length; i += 2) {
                const s = { ax: l[i - 2], az: l[i - 1], bx: l[i], bz: l[i + 1], half, build };
                segments.push(s);
                const [i0, i1] = [Math.floor(Math.min(s.ax, s.bx) / CELL) - 1, Math.floor(Math.max(s.ax, s.bx) / CELL) + 1];
                const [j0, j1] = [Math.floor(Math.min(s.az, s.bz) / CELL) - 1, Math.floor(Math.max(s.az, s.bz) / CELL) + 1];
                for (let gi = i0; gi <= i1; gi++) for (let gj = j0; gj <= j1; gj++) {
                    const k = key(gi, gj);
                    if (!grid.has(k)) grid.set(k, []);
                    grid.get(k).push(s);
                }
            }
        }
    }
    const onStreet = (x, z, margin) => (grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) ?? [])
        .some((s) => toSegment(x, z, s.ax, s.az, s.bx, s.bz) < (s.half + margin) ** 2);
    /** Does a house stand on any street: its walls crossing one, or near enough to touch it? */
    const onAnyStreet = (quad, margin) => {
        const seen = new Set();
        for (const [x, z] of quad) {
            for (const s of grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) ?? []) {
                if (seen.has(s)) continue;
                seen.add(s);
                if (!clearOf(quad, s, margin)) return true;
            }
        }
        return false;
    };

    /** How near the water's edge a point is (only checked close by) */
    const edges = [];
    for (const r of water) for (let i = 2; i < r.length; i += 2) edges.push([r[i - 2], r[i - 1], r[i], r[i + 1]]);
    const nearWater = (x, z, within) => edges.some(([ax, az, bx, bz]) => toSegment(x, z, ax, az, bx, bz) < within * within);
    const inBlock = (x, z) => blocks.some((r) => inside(x, z, r));
    const blockCorners = blocks.flatMap((r) => { const out = []; for (let i = 0; i < r.length; i += 2) out.push([r[i], r[i + 1]]); return out; });
    const coversBlock = (quad) => blockCorners.some(([x, z]) => inside(x, z, quad.flat()));

    const houses = [];
    const placed = new Map();   // grid cell → houses
    const clashes = (quad) => {
        const cx = quad.reduce((s, p) => s + p[0], 0) / 4, cz = quad.reduce((s, p) => s + p[1], 0) / 4;
        const gi = Math.floor(cx / CELL), gj = Math.floor(cz / CELL);
        for (let i = gi - 1; i <= gi + 1; i++) for (let j = gj - 1; j <= gj + 1; j++) {
            if ((placed.get(key(i, j)) ?? []).some((h) => overlap(h.corners, quad))) return true;
        }
        return false;
    };
    const place = (house) => {
        const cx = house.corners.reduce((s, p) => s + p[0], 0) / 4, cz = house.corners.reduce((s, p) => s + p[1], 0) / 4;
        const k = key(Math.floor(cx / CELL), Math.floor(cz / CELL));
        if (!placed.has(k)) placed.set(k, []);
        placed.get(k).push(house);
        houses.push(house);
    };

    // The bigger streets first, so their rows are the unbroken ones
    const order = [...segments].sort((a, b) => b.half - a.half);
    for (const s of order) {
        if (!s.build) continue;
        const dx = s.bx - s.ax, dz = s.bz - s.az;
        const length = Math.hypot(dx, dz);
        if (length < 10) continue;
        const ux = dx / length, uz = dz / length;
        for (const side of [1, -1]) {
            const nx = -uz * side, nz = ux * side;
            const setback = s.half + 1.2 + rand() * 1.5;
            // Is this the harbour front: the water near, but on the other side of the street?
            const mx = (s.ax + s.bx) / 2, mz = (s.az + s.bz) / 2;
            const quaySide = nearWater(mx + nx * 22, mz + nz * 22, 16);
            if (quaySide) continue;   // the promenade side: nothing built
            const harbour = nearWater(mx - nx * 30, mz - nz * 30, 26);
            let t = 3 + rand() * 4;
            const big = s.half > 4 || harbour;
            while (t < length - 6) {
                const width = (big ? 8 : 6) + rand() * (big ? 10 : 8);
                const depth = harbour ? 12 + rand() * 4 : 8 + rand() * 5;
                const along = Math.min(width, length - 3 - t);
                if (along < 5) break;
                const fx = s.ax + ux * t + nx * setback, fz = s.az + uz * t + nz * setback;
                const corners = [
                    [fx, fz],
                    [fx + ux * along, fz + uz * along],
                    [fx + ux * along + nx * depth, fz + uz * along + nz * depth],
                    [fx + nx * depth, fz + nz * depth],
                ];
                const samples = [...corners, [fx + ux * along / 2 + nx * depth / 2, fz + uz * along / 2 + nz * depth / 2], [fx + ux * along / 2 + nx * depth, fz + uz * along / 2 + nz * depth]];
                const free = !samples.some(([x, z]) => onStreet(x, z, 0.6)
                    || water.some((r) => inside(x, z, r))
                    || squares.some((r) => inside(x, z, r))
                    || inBlock(x, z)
                    || clear.some((c) => (c.x - x) ** 2 + (c.y - z) ** 2 < 14 * 14))
                    && !coversBlock(corners)
                    && !onAnyStreet(corners, 0.5)
                    && !clashes(corners);
                if (free) {
                    const storeys = harbour ? (rand() < 0.6 ? 3 : 2) : rand() < (big ? 0.45 : 0.2) ? 3 : rand() < 0.25 ? 1 : 2;
                    place({
                        corners,
                        height: storeys * 3 + 0.8 + rand() * 1.2,
                        pitched: rand() < 0.88,
                        wall: rand(),
                        roof: rand() < 0.66 ? 0.5 + rand() * 0.5 : rand() * 0.5,   // mostly red tile, some slate
                    });
                }
                // Mostly wall to wall; now and then a gap, a gateway into the yard (never on the harbour front)
                t += along + (!harbour && rand() < 0.18 ? 2 + rand() * 6 : 0.05);
            }
        }
    }
    return houses;
}

/**
 * The houses as one geometry: walls a little darker at the foot, pitched roofs with the ridge along
 * the street (flat on a few). Each house is one closed shape: the gable ends are a wall up to the
 * eaves, shaded exactly as the long walls, and above it a triangle in the eaves' colour, so no seam
 * shows where the walls end and the gable begins. Each house's `wall` (0–1) picks its facade from `walls`; its `roof`
 * picks from `slates` below 0.5 and from `tiles` above.
 */
export function houseGeometry(houses, {
    walls = ['#3a3a40', '#4a4a51'],
    tiles = ['#55555c'],
    slates = ['#2b2b31'],
} = {}) {
    const pos = [], nor = [], col = [];
    const pick = (list, t) => new THREE.Color(list[Math.min(list.length - 1, Math.floor(t * list.length))]);
    let cLow, cHigh, cRoof;
    const p = new THREE.Vector3(), q = new THREE.Vector3(), r = new THREE.Vector3(), n = new THREE.Vector3(), out = new THREE.Vector3();
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
    for (const { corners, height: h, pitched, wall = 0.5, roof = 0.5 } of houses) {
        cHigh = pick(walls, wall);
        cLow = cHigh.clone().multiplyScalar(0.72);
        cRoof = roof < 0.5 ? pick(slates, roof * 2) : pick(tiles, (roof - 0.5) * 2);
        const [a, b, c, d] = corners;   // front left, front right, back right, back left
        const at = ([x, z], y) => [x, y, z];
        const depth = Math.hypot(d[0] - a[0], d[1] - a[1]);
        const ridge = pitched ? h + depth * 0.38 : h;
        const middle = new THREE.Vector3((a[0] + c[0]) / 2, h * 0.5, (a[1] + c[1]) / 2);
        const mid1 = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2], mid2 = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
        // The long walls, to the street and to the yard
        face([at(a, 0), at(b, 0), at(b, h), at(a, h)], [cLow, cLow, cHigh, cHigh], middle);
        face([at(c, 0), at(d, 0), at(d, h), at(c, h)], [cLow, cLow, cHigh, cHigh], middle);
        // The ends: a wall up to the eaves, and the gable above it
        face([at(d, 0), at(a, 0), at(a, h), at(d, h)], [cLow, cLow, cHigh, cHigh], middle);
        face([at(b, 0), at(c, 0), at(c, h), at(b, h)], [cLow, cLow, cHigh, cHigh], middle);
        if (pitched) {
            face([at(d, h), at(a, h), at(mid1, ridge)], [cHigh, cHigh, cHigh], middle);
            face([at(b, h), at(c, h), at(mid2, ridge)], [cHigh, cHigh, cHigh], middle);
        }
        if (pitched) {
            face([at(a, h), at(b, h), at(mid2, ridge), at(mid1, ridge)], [cRoof, cRoof, cRoof, cRoof], middle);
            face([at(c, h), at(d, h), at(mid1, ridge), at(mid2, ridge)], [cRoof, cRoof, cRoof, cRoof], middle);
        } else {
            face([at(a, h), at(b, h), at(c, h), at(d, h)], [cRoof, cRoof, cRoof, cRoof], middle.set(middle.x, -1, middle.z));
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
}
