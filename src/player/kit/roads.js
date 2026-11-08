/**
 * Roads, streets and paths drawn on a map (Tværveje): the map's SVG paths as lines of points, the
 * streets as soft-edged bands along them, and filled areas (water, squares). y up, as the map lies
 * on the ground (x to the east, z to the south). Their colours are the style's muted streets
 * (GREYS.streets, .sideStreets, .paths in kit/style.js).
 *
 * A straight road in a z-up scene (53 sekunder) is a flat box: box() in kit/shapes.js.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * An SVG path (absolute M, L, H, V, C, Q and Z, as the maps are written) as lines of points,
 * [[x, y, x, y, ...], ...], one per subpath, with the curves broken into short straight pieces.
 * `to` turns the map's units into metres.
 */
export function pathLines(d, to) {
    const tokens = d.match(/[MLHVCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
    const lines = [];
    let line = null, cmd = null, i = 0, x = 0, y = 0, sx = 0, sy = 0;
    const num = () => Number(tokens[i++]);
    const put = (px, py) => { const [mx, my] = to(px, py); line.push(mx, my); };
    while (i < tokens.length) {
        if (/[A-Z]/i.test(tokens[i])) cmd = tokens[i++].toUpperCase();
        if (cmd === 'M') { line = []; lines.push(line); x = sx = num(); y = sy = num(); put(x, y); cmd = 'L'; continue; }
        if (cmd === 'L') { x = num(); y = num(); put(x, y); continue; }
        if (cmd === 'H') { x = num(); put(x, y); continue; }
        if (cmd === 'V') { y = num(); put(x, y); continue; }
        if (cmd === 'Z') { x = sx; y = sy; put(x, y); continue; }
        if (cmd === 'C' || cmd === 'Q') {
            const pts = cmd === 'C' ? [num(), num(), num(), num(), num(), num()] : [num(), num(), num(), num()];
            const [x0, y0] = [x, y];
            for (let k = 1; k <= 12; k++) {
                const t = k / 12, u = 1 - t;
                if (cmd === 'C') {
                    put(u * u * u * x0 + 3 * u * u * t * pts[0] + 3 * u * t * t * pts[2] + t * t * t * pts[4],
                        u * u * u * y0 + 3 * u * u * t * pts[1] + 3 * u * t * t * pts[3] + t * t * t * pts[5]);
                } else {
                    put(u * u * x0 + 2 * u * t * pts[0] + t * t * pts[2], u * u * y0 + 2 * u * t * pts[1] + t * t * pts[3]);
                }
            }
            [x, y] = cmd === 'C' ? [pts[4], pts[5]] : [pts[2], pts[3]];
            continue;
        }
        i++;   // anything else: skip it
    }
    return lines.filter((l) => l.length >= 4);
}

/** Closed lines lying flat on the ground at height y */
export function fillGeometry(lines, y) {
    const parts = lines.filter((l) => l.length >= 6).map((l) => {
        const pts = [];
        for (let i = 0; i < l.length; i += 2) pts.push(new THREE.Vector2(l[i], l[i + 1]));
        const g = new THREE.ShapeGeometry(new THREE.Shape(pts));
        g.rotateX(Math.PI / 2);
        g.translate(0, y, 0);
        return g;
    });
    return parts.length > 1 ? mergeGeometries(parts) : parts[0] ?? null;
}

/** Lines that meet end to end, and only two of them at that point, joined into one */
export function joinChains(lines) {
    const k = (x, z) => `${Math.round(x * 10)},${Math.round(z * 10)}`;
    let chains = lines.map((l) => l.slice());
    for (let changed = true; changed;) {
        changed = false;
        const ends = new Map();
        chains.forEach((l, i) => {
            for (const key of [k(l[0], l[1]), k(l.at(-2), l.at(-1))]) ends.set(key, [...(ends.get(key) ?? []), i]);
        });
        for (const [key, at] of ends) {
            if (at.length !== 2 || at[0] === at[1]) continue;
            let [a, b] = at.map((i) => chains[i]);
            if (k(a[0], a[1]) === key) a = reverse(a);          // a ends here
            if (k(b.at(-2), b.at(-1)) === key) b = reverse(b);  // b starts here
            chains[at[0]] = a.concat(b.slice(2));
            chains[at[1]] = null;
            chains = chains.filter(Boolean);
            changed = true;
            break;
        }
    }
    return chains;
}
export function reverse(l) {
    const out = [];
    for (let i = l.length - 2; i >= 0; i -= 2) out.push(l[i], l[i + 1]);
    return out;
}

/**
 * Lines as flat bands with soft edges, so streets fade into one another rather than ending in round
 * caps: across, the band fades out at its sides; along, an end that meets another street runs on
 * a little past it, fading as it goes, and a dead end fades away into the ground.
 *
 * @param {number[][]} lines
 * @param {number} width
 * @param {number} y
 * @param {string} color
 * @param {{ lines: number[][], half: number }[]} all  Every street, to tell a crossing from a dead end
 */
export function bandGeometry(lines, width, y, color, all = []) {
    const half = width / 2;
    const c = new THREE.Color(color);
    const pos = [], col = [], idx = [];
    const ACROSS = [[-1, 0], [-0.8, 1], [0.8, 1], [1, 0]];     // offset (× half) and opacity across the band: a crisp edge
    const DEAD_END = 9;                                         // metres a dead end fades over

    /** How wide the street is that a point meets (0: none); the line's own pieces don't count */
    const key = (x, z) => `${Math.round(x * 10)},${Math.round(z * 10)}`;
    const meets = (x, z, self) => {
        const own = new Set();
        for (let i = 0; i < self.length; i += 2) own.add(key(self[i], self[i + 1]));
        let widest = 0;
        for (const { lines: ls, half: h } of all) {
            for (const l of ls) {
                for (let i = 2; i < l.length; i += 2) {
                    if (own.has(key(l[i - 2], l[i - 1])) && own.has(key(l[i], l[i + 1]))) continue;
                    const ax = l[i - 2], az = l[i - 1], dx = l[i] - ax, dz = l[i + 1] - az;
                    const len = dx * dx + dz * dz;
                    const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len)) : 0;
                    const ex = ax + dx * t - x, ez = az + dz * t - z;
                    if (ex * ex + ez * ez < (h + 1.5) ** 2) widest = Math.max(widest, h);
                }
            }
        }
        return widest;
    };

    for (const flat of joinChains(lines)) {
        if (flat.length < 4) continue;
        // The points along it, with how opaque the band is at each
        let pts = [];
        for (let i = 0; i < flat.length; i += 2) pts.push({ x: flat[i], z: flat[i + 1], a: 1 });
        const first = meets(pts[0].x, pts[0].z, flat), last = meets(pts.at(-1).x, pts.at(-1).z, flat);
        const along = (list) => { let d = 0; return list.map((q, i) => (d += i ? Math.hypot(q.x - list[i - 1].x, q.z - list[i - 1].z) : 0)); };
        /** A point added at distance d along, so a fade can start exactly there */
        const insertAt = (list, d) => {
            const s = along(list);
            const i = s.findIndex((v) => v >= d);
            if (i <= 0 || s[i] === d) return list;
            const t = (d - s[i - 1]) / (s[i] - s[i - 1]);
            return [...list.slice(0, i), { x: list[i - 1].x + (list[i].x - list[i - 1].x) * t, z: list[i - 1].z + (list[i].z - list[i - 1].z) * t, a: 1 }, ...list.slice(i)];
        };
        const length = along(pts).at(-1);
        const fade = Math.min(DEAD_END, length / 3);
        // A dead end fades away over its last stretch
        if (!first) pts = insertAt(pts, fade);
        if (!last) pts = insertAt(pts, length - fade);
        const s = along(pts);
        pts.forEach((q, i) => {
            if (!first) q.a = Math.min(q.a, s[i] / fade);
            if (!last) q.a = Math.min(q.a, (length - s[i]) / fade);
        });
        // An end that meets another street runs on into it a little, fading
        const tip = (p0, p1, other) => {
            const dx = p0.x - p1.x, dz = p0.z - p1.z, l = Math.hypot(dx, dz) || 1;
            const run = Math.max(3, other + half * 0.5);
            return { x: p0.x + (dx / l) * run, z: p0.z + (dz / l) * run, a: 0 };
        };
        if (first) pts.unshift(tip(pts[0], pts[1], first));
        if (last) pts.push(tip(pts.at(-1), pts.at(-2), last));
        // The band, four vertices across
        const base = pos.length / 3;
        const n = pts.length;
        for (let i = 0; i < n; i++) {
            const { x, z, a } = pts[i];
            const dir = (i0, i1) => {
                const ddx = pts[i1].x - pts[i0].x, ddz = pts[i1].z - pts[i0].z;
                const dl = Math.hypot(ddx, ddz) || 1;
                return [ddx / dl, ddz / dl];
            };
            const d1 = i > 0 ? dir(i - 1, i) : dir(i, i + 1);
            const d2 = i < n - 1 ? dir(i, i + 1) : d1;
            let tx = d1[0] + d2[0], tz = d1[1] + d2[1];
            const tl = Math.hypot(tx, tz);
            if (tl < 1e-3) { tx = d1[0]; tz = d1[1]; } else { tx /= tl; tz /= tl; }
            const mx = -tz, mz = tx;                                         // the miter's direction
            const miter = half / Math.max(0.35, mx * -d1[1] + mz * d1[0]);   // longer at sharp bends, within reason
            for (const [o, alpha] of ACROSS) {
                pos.push(x + mx * miter * o, y, z + mz * miter * o);
                col.push(c.r, c.g, c.b, alpha * a);
            }
            if (i) {
                const r0 = base + (i - 1) * 4, r1 = base + i * 4;
                for (let k = 0; k < 3; k++) idx.push(r0 + k, r0 + k + 1, r1 + k, r0 + k + 1, r1 + k + 1, r1 + k);
            }
        }
    }
    if (!idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    g.setIndex(idx);
    return g;
}

