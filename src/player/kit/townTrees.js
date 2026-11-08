/**
 * Trees for the walk interface's map (WalkScene.js), after drone photos of Nakskov: a row of small
 * trees along the harbour promenade between the street and the quay, a few on Axeltorv, and
 * gardens of them in the yards inside the blocks. Round, soft crowns on short trunks, in a few
 * greens, placed from a seed so the town is the same every time. They keep off the streets, the
 * water, the houses, the landmarks and the places' markers.
 *
 * Metres, x to the east and z to the south.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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

function toSegment(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const l = dx * dx + dz * dz;
    const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l)) : 0;
    const x = ax + dx * t - px, z = az + dz * t - pz;
    return Math.sqrt(x * x + z * z);
}

function inside(px, pz, ring) {
    let c = false;
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
        const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
        if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) c = !c;
    }
    return c;
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
    const fromStreet = (x, z) => Math.min(Infinity, ...(segGrid.get(key(x, z)) ?? []).map(([ax, az, bx, bz, h]) => toSegment(x, z, ax, az, bx, bz) - h));
    const inHouse = (x, z, pad) => (houseGrid.get(key(x, z)) ?? []).some((ring) => {
        if (inside(x, z, ring)) return true;
        for (let i = 0; i < 8; i += 2) if (toSegment(x, z, ring[i], ring[i + 1], ring[(i + 2) % 8], ring[(i + 3) % 8]) < pad) return true;
        return false;
    });
    const nearHouse = (x, z, within) => (houseGrid.get(key(x, z)) ?? []).some((ring) => {
        for (let i = 0; i < 8; i += 2) if (toSegment(x, z, ring[i], ring[i + 1], ring[(i + 2) % 8], ring[(i + 3) % 8]) < within) return true;
        return false;
    });
    const fromWater = (x, z) => Math.min(Infinity, ...waterEdges.map(([ax, az, bx, bz]) => toSegment(x, z, ax, az, bx, bz)));
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

/** The trees as one geometry: a short trunk and a soft, faceted crown, with vertex colours */
export function treeGeometry(trees, { trunk = '#8b6b4e', greens = ['#5f9e57', '#79b26a', '#9cc77f'] } = {}) {
    if (!trees.length) return null;
    const trunkC = new THREE.Color(trunk);
    const greenC = greens.map((g) => new THREE.Color(g));
    const trunkShape = new THREE.CylinderGeometry(0.22, 0.3, 1, 6).translate(0, 0.5, 0).toNonIndexed();
    const crownShape = new THREE.IcosahedronGeometry(1, 1).toNonIndexed();
    const parts = [];
    const colour = (g, c, vary = 0) => {
        const n = g.attributes.position.count;
        const arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            const y = g.attributes.position.getY(i);
            const k = 1 + vary * (y > 0 ? 0.12 : -0.18);   // a little lighter on top, darker underneath
            arr.set([c.r * k, c.g * k, c.b * k], i * 3);
        }
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
        return g;
    };
    for (const { x, z, size, shade } of trees) {
        const height = size * 0.9;
        parts.push(colour(trunkShape.clone().scale(size * 0.5, height, size * 0.5).translate(x, 0, z), trunkC));
        const g = shade < 0.5 ? greenC[0].clone().lerp(greenC[1], shade * 2) : greenC[1].clone().lerp(greenC[2], (shade - 0.5) * 2);
        parts.push(colour(crownShape.clone().scale(size, size * 0.95, size).translate(x, height + size * 0.75, z), g, 1));
    }
    trunkShape.dispose();
    crownShape.dispose();
    const merged = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    merged.computeVertexNormals();
    return merged;
}
