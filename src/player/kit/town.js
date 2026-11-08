/**
 * A town made up from its streets alone, for a map (the walk interface, WalkScene.js): where the
 * houses and the trees stand. Their shapes come from kit/houses.js and kit/trees.js.
 *
 * makeHouses: no building data: rows of houses along both sides of every street and round the squares, gables to
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

/* ---------- TREES ---------- */

/*
 * makeTrees, after drone photos of Nakskov: a row of small trees along the harbour promenade
 * between the street and the quay, a few on the squares, and gardens of them in the yards inside
 * the blocks, placed from a seed so the town is the same every time. They keep off the streets, the
 * water, the houses, the landmarks and the places' markers.
 *
 * Metres, x to the east and z to the south.
 */

/** Distance from p to the segment a–b */
function distanceToSegment(px, pz, ax, az, bx, bz) {
    return Math.sqrt(toSegment(px, pz, ax, az, bx, bz));
}

/**
 * @param {object} town
 * @param {{ lines: number[][], half: number }[]} town.streets
 * @param {number[][]} town.water     Closed lines
 * @param {number[][]} town.squares   Closed lines
 * @param {number[][]} town.blocks    Closed lines (the landmarks)
 * @param {{ corners: number[][] }[]} town.houses
 * @param {THREE.Vector2[]} town.clear  The places' markers
 * @param {number[]} town.extent      [x0, z0, x1, z1]
 * @returns {{ x: number, z: number, size: number, shade: number }[]}
 */
export function makeTrees({ streets, water, squares, blocks, houses, clear, extent, seed = 11 }) {
    const rand = random(seed);
    const CELL = 30;
    const key = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;

    // The streets' segments and the houses in grids, to find the near ones quickly
    const segGrid = new Map(), houseGrid = new Map();
    const put = (grid, x0, z0, x1, z1, item, pad) => {
        for (let i = Math.floor((Math.min(x0, x1) - pad) / CELL); i <= Math.floor((Math.max(x0, x1) + pad) / CELL); i++) {
            for (let j = Math.floor((Math.min(z0, z1) - pad) / CELL); j <= Math.floor((Math.max(z0, z1) + pad) / CELL); j++) {
                const k = `${i},${j}`;
                if (!grid.has(k)) grid.set(k, []);
                grid.get(k).push(item);
            }
        }
    };
    for (const { lines, half } of streets) {
        for (const l of lines) for (let i = 2; i < l.length; i += 2) put(segGrid, l[i - 2], l[i - 1], l[i], l[i + 1], [l[i - 2], l[i - 1], l[i], l[i + 1], half], 20);
    }
    for (const h of houses) {
        const xs = h.corners.map((c) => c[0]), zs = h.corners.map((c) => c[1]);
        put(houseGrid, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), h.corners.flat(), 4);
    }
    const waterEdges = water.flatMap((r) => { const out = []; for (let i = 2; i < r.length; i += 2) out.push([r[i - 2], r[i - 1], r[i], r[i + 1]]); return out; });

    /** How far a point is from the edge of the nearest street (Infinity: none near) */
    const fromStreet = (x, z) => Math.min(Infinity, ...(segGrid.get(key(x, z)) ?? []).map(([ax, az, bx, bz, h]) => distanceToSegment(x, z, ax, az, bx, bz) - h));
    const inHouse = (x, z, pad) => (houseGrid.get(key(x, z)) ?? []).some((ring) => {
        if (inside(x, z, ring)) return true;
        for (let i = 0; i < 8; i += 2) if (distanceToSegment(x, z, ring[i], ring[i + 1], ring[(i + 2) % 8], ring[(i + 3) % 8]) < pad) return true;
        return false;
    });
    const nearHouse = (x, z, within) => (houseGrid.get(key(x, z)) ?? []).some((ring) => {
        for (let i = 0; i < 8; i += 2) if (distanceToSegment(x, z, ring[i], ring[i + 1], ring[(i + 2) % 8], ring[(i + 3) % 8]) < within) return true;
        return false;
    });
    const fromWater = (x, z) => Math.min(Infinity, ...waterEdges.map(([ax, az, bx, bz]) => distanceToSegment(x, z, ax, az, bx, bz)));
    const wet = (x, z) => water.some((r) => inside(x, z, r));
    const [x0, z0, x1, z1] = extent;
    const free = (x, z, size) => x > x0 + 20 && x < x1 - 20 && z > z0 + 20 && z < z1 - 20
        && !wet(x, z) && !blocks.some((r) => inside(x, z, r)) && !inHouse(x, z, size * 0.8)
        && !clear.some((c) => Math.hypot(c.x - x, c.y - z) < 12);

    const trees = [];
    const spaced = (x, z, gap) => !trees.some((t) => Math.abs(t.x - x) < gap && Math.abs(t.z - z) < gap && Math.hypot(t.x - x, t.z - z) < gap);
    const plant = (x, z, size, shade) => { if (free(x, z, size) && spaced(x, z, size * 1.2)) trees.push({ x, z, size, shade }); };

    // The harbour promenade: a row along each street that has the quay on one side
    for (const { lines, half } of streets) {
        if (half < 2.5) continue;
        for (const l of lines) {
            for (let i = 2; i < l.length; i += 2) {
                const [ax, az, bx, bz] = [l[i - 2], l[i - 1], l[i], l[i + 1]];
                const len = Math.hypot(bx - ax, bz - az);
                if (len < 8) continue;
                const ux = (bx - ax) / len, uz = (bz - az) / len;
                for (const side of [1, -1]) {
                    const nx = -uz * side, nz = ux * side, off = half + 3.5;
                    const mx = (ax + bx) / 2 + nx * off, mz = (az + bz) / 2 + nz * off;
                    if (fromWater(mx, mz) > 14 || wet(mx, mz)) continue;
                    for (let t = 5; t < len - 3; t += 10 + rand() * 2) {
                        const x = ax + ux * t + nx * off, z = az + uz * t + nz * off;
                        if (fromWater(x, z) > 1.8 && fromStreet(x, z) > 1.2) plant(x, z, 2.6 + rand() * 0.6, 0.55 + rand() * 0.2);
                    }
                }
            }
        }
    }

    // The squares: a few trees in rows near their edges
    for (const ring of squares) {
        for (let i = 2; i < ring.length; i += 2) {
            const [ax, az, bx, bz] = [ring[i - 2], ring[i - 1], ring[i], ring[i + 1]];
            const len = Math.hypot(bx - ax, bz - az);
            for (let t = 6; t < len - 4; t += 11) {
                const x = ax + ((bx - ax) * t) / len, z = az + ((bz - az) * t) / len;
                // a little in from the edge
                for (const step of [5, -5]) {
                    const px = x + (-(bz - az) / len) * step, pz = z + ((bx - ax) / len) * step;
                    if (inside(px, pz, ring) && fromStreet(px, pz) > 1) { plant(px, pz, 2.4 + rand() * 0.5, 0.6 + rand() * 0.2); break; }
                }
            }
        }
    }

    // The yards: gardens inside the blocks, among the houses but off the streets
    for (let x = x0 + 20; x < x1 - 20; x += 7) {
        for (let z = z0 + 20; z < z1 - 20; z += 7) {
            const px = x + (rand() - 0.5) * 6, pz = z + (rand() - 0.5) * 6;
            if (rand() > 0.16) continue;
            if (fromStreet(px, pz) < 9 || squares.some((r) => inside(px, pz, r))) continue;
            if (!nearHouse(px, pz, 14)) continue;   // only in the yards, among the houses, not out on the open ground
            plant(px, pz, 3 + rand() * 2.4, rand());
        }
    }
    return trees;
}
