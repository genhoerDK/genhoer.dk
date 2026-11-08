'use client';

/**
 * The 3D map for the walk interface (three.js): the town's street net (src/data/maps/), drawn as
 * pale bands on dark ground with the harbour beside it, the town's landmarks in 3D (the church,
 * the water tower, Dronningens Pakhus and more, scene/landmarks.js) and houses along the streets
 * (made up from the streets, scene/town.js), seen at a slant from above. Round where you
 * are the streets are clear; further out they grey over and dissolve into a haze, with mist
 * drifting over them, and the map fades out at its own edges too — so it has no edge, only distance.
 *
 * Each place in the work is a 3D marker, a listening station: a sphere floating over the place on a thin
 * beam of light, with a soft pool of light on the ground under it. The place you are at is white
 * and lit; the one that is playing sends rings out over the ground. Walking to another place glides
 * you there.
 *
 * The pointer tips and turns the view a little (it drifts by itself, too); a drag turns it further
 * and the wheel goes nearer or further. The places' names are buttons over their markers; one that is
 * out of view waits at the edge of the screen, pointing the way.
 *
 * @param {string} map           The name of a map in src/data/maps/
 * @param {object[]} places      [{ name, at, label? }]  at: [x, y] in the map's units
 * @param {number} here          The place you are at
 * @param {number|null} sounding The place whose story is playing
 * @param {(p: number) => void} onWalk
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { colors } from '@/styles/colors';
import { maps } from '@/data/maps';
import { makeHouses, houseGeometry } from '@/components/Player/scene/town';
import { landmarkGeometry } from '@/components/Player/scene/landmarks';

/* ---------- THE LOOK ---------- */

const GROUND = '#1f1f22';
const WATER = '#3d4047';
const ZONE = '#3f3f46';               // the walking streets and the squares, soft under the streets
const QUAY = '#6b6b73';               // the quay's edge
const PATH = { width: 2.4, color: '#6b6b73' };   // widths with the soft edges; the solid middle is about 0.55 of it
const SIDE = { width: 7.5, color: '#9a9aa1' };
const MAIN = { width: 13, color: '#d4d4d8' };
const POOL = 70;                      // metres across the light on the ground under a marker
const EDGE = 150;                     // metres over which the map fades out at its own edges
const HAZE = [0.36, 0.36, 0.38];      // sRGB: the grey the distance fades into
const NEAR = 80, FAR = 400;          // metres from where you are: clear within NEAR, gone at FAR (on the near side, towards
                                      // you, it reaches further: the haze lies out in the distance, not at your feet)
const MIST = 0xc9cacd;
const REACH = { wide: 560, tall: 720 }; // metres from the camera to where you are, on a wide and a tall screen
const SCALE_AT = 700;                 // the markers are drawn their true size seen from this far, and grow with the distance

const BEAM = 30, BALL_AT = 37;        // metres: the marker's beam, and where its sphere floats
const TILT = 0.92, TILT_RANGE = 0.22; // radians above the horizon the view looks down from, and how far the pointer tips it
const TURN_RANGE = 0.32;              // radians the pointer turns it either way
const LABEL_TOP = 72;                 // px kept free at the top (the header)

/* ---------- GEOMETRY ---------- */

/**
 * An SVG path (absolute M, L, H, V, C, Q and Z, as the maps are written) as lines of points,
 * [[x, y, x, y, ...], ...], one per subpath, with the curves broken into short straight pieces.
 * `to` turns the map's units into metres.
 */
function pathLines(d, to) {
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
function fillGeometry(lines, y) {
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
function joinChains(lines) {
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
function reverse(l) {
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
function bandGeometry(lines, width, y, color, all = []) {
    const half = width / 2;
    const c = new THREE.Color(color);
    const pos = [], col = [], idx = [];
    const ACROSS = [[-1, 0], [-0.55, 1], [0.55, 1], [1, 0]];   // offset (× half) and opacity across the band
    const DEAD_END = 14;                                        // metres a dead end fades over

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

/** Tileable soft noise for the mist, as a texture */
function mistTexture(seed) {
    const size = 128, out = new Float32Array(size * size);
    const hash = (x, y, o) => { const v = Math.sin(x * 127.1 + y * 311.7 + o * 74.7 + seed * 19.3) * 43758.5453; return v - Math.floor(v); };
    const smooth = (t) => t * t * (3 - 2 * t);
    let amp = 0.5, total = 0;
    for (let o = 0; o < 4; o++) {
        const cells = 4 << o;
        for (let y = 0; y < size; y++) {
            const fy = (y / size) * cells, yi = Math.floor(fy), ty = smooth(fy - yi);
            for (let x = 0; x < size; x++) {
                const fx = (x / size) * cells, xi = Math.floor(fx), tx = smooth(fx - xi);
                const a = hash(xi % cells, yi % cells, o), b = hash((xi + 1) % cells, yi % cells, o);
                const c = hash(xi % cells, (yi + 1) % cells, o), d = hash((xi + 1) % cells, (yi + 1) % cells, o);
                out[y * size + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
            }
        }
        total += amp;
        amp *= 0.5;
    }
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < out.length; i++) { const v = Math.round((out[i] / total) * 255); data.set([v, v, v, 255], i * 4); }
    const tex = new THREE.DataTexture(data, size, size);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
}

/* ---------- THE HAZE: every material greys over and fades out with the distance from where you are ---------- */

/** How far into the haze a point on the ground is: its distance from where you are, the part towards you counted at half */
const HAZE_GLSL = `
    uniform vec2 uFocus, uForward;
    uniform vec4 uExtent;
    uniform float uNear, uFar, uEdge;
    uniform vec3 uHaze;
    float hazeEdge(vec2 at) {
        float d = min(min(at.x - uExtent.x, uExtent.z - at.x), min(at.y - uExtent.y, uExtent.w - at.y));
        return smoothstep(0.0, uEdge, d);
    }
    float hazeDistance(vec2 at) {
        vec2 rel = at - uFocus;
        float along = dot(rel, uForward);
        float across = dot(rel, vec2(-uForward.y, uForward.x));
        return length(vec2(across, along > 0.0 ? along : along * 0.5));
    }`;

function hazed(material, haze, { fade = true } = {}) {
    material.transparent = true;
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, haze);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vHazeAt;')
            .replace('#include <project_vertex>', '#include <project_vertex>\nvHazeAt = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>\nvarying vec3 vHazeAt;\n${HAZE_GLSL}`)
            .replace('#include <dithering_fragment>', `
                float hazeD = hazeDistance(vHazeAt.xz);
                float hazeE = hazeEdge(vHazeAt.xz);
                gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, max(smoothstep(uNear, uFar, hazeD), 1.0 - hazeE) * ${fade ? '0.95' : '0.45'});
                ${fade ? 'gl_FragColor.a *= (1.0 - smoothstep(mix(uNear, uFar, 0.45), uFar * 1.05, hazeD)) * hazeE;' : ''}
                #include <dithering_fragment>`);
    };
    return material;
}

/* ---------- THE SCENE ---------- */

export default function WalkScene({ map: mapName, places, here, sounding, onWalk }) {
    const map = maps[mapName];
    const containerRef = useRef(null);
    const labelRefs = useRef([]);
    const state = useRef({ here, sounding });
    const [failed, setFailed] = useState(false);

    useEffect(() => { state.current.here = here; state.current.sounding = sounding; }, [here, sounding]);

    /** The map's units → metres on the ground, with the middle of the map at 0, 0 */
    const to = useMemo(() => {
        const k = map.metres ?? 1;
        return (x, y) => [(x - map.width / 2) * k, (y - map.height / 2) * k];
    }, [map]);

    /** Where each place is on the ground */
    const spots = useMemo(() => places.map((place) => new THREE.Vector2(...to(...(place.at ?? [map.width / 2, map.height / 2])))), [map, places, to]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        } catch {
            setFailed(true);
            return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        const canvas = renderer.domElement;
        canvas.className = 'absolute inset-0 size-full touch-none';
        // Faded out at the top (under the header) and the bottom (under the stories)
        canvas.style.maskImage = canvas.style.webkitMaskImage = 'linear-gradient(to bottom, transparent 0%, black 12%, black 60%, transparent 86%)';
        container.prepend(canvas);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 5, 6000);
        const haze = {
            uFocus: { value: spots[state.current.here].clone() },
            uForward: { value: new THREE.Vector2(0, -1) },
            uNear: { value: NEAR },
            uFar: { value: FAR },
            uHaze: { value: new THREE.Vector3(...HAZE) },
            uExtent: { value: new THREE.Vector4(...to(0, 0), ...to(map.width, map.height)) },
            uEdge: { value: EDGE },
        };

        scene.add(new THREE.HemisphereLight(0xe8e8ec, 0x202024, 1.6));
        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(-300, 420, 520);   // low from the south-south-west, so the spheres are lit from one side
        scene.add(sun);

        /* ---------- the town ---------- */

        let order = 0;
        const add = (geometry, material) => {
            if (!geometry) return null;
            const mesh = new THREE.Mesh(geometry, material);
            mesh.renderOrder = order++;
            mesh.frustumCulled = false;
            scene.add(mesh);
            return mesh;
        };
        const flatMaterial = (color, opacity = 1) => hazed(new THREE.MeshBasicMaterial({ color, opacity, side: THREE.DoubleSide, depthWrite: false }), haze);
        const lines = (paths) => [paths ?? []].flat().flatMap((d) => pathLines(d, to));

        const [x0, z0] = to(0, 0), [x1, z1] = to(map.width, map.height);
        const R = Math.max(x1 - x0, z1 - z0) / 2;
        const ground = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
        add(ground, flatMaterial(GROUND, 0.94));
        add(fillGeometry(lines(map.water), 0.04), flatMaterial(WATER));
        add(fillGeometry(lines(map.squares), 0.05), flatMaterial(ZONE));
        const zoneWidth = map.zoneWidth ?? 18;
        const streets = [
            { lines: lines(map.main), half: MAIN.width / 2 },
            { lines: lines(map.side), half: SIDE.width / 2 },
            { lines: lines(map.zone), half: zoneWidth / 2 },
            { lines: lines(map.path), half: PATH.width / 2 },
        ];
        const softMaterial = () => { const m = flatMaterial(0xffffff); m.vertexColors = true; return m; };
        add(bandGeometry(streets[2].lines, zoneWidth, 0.06, ZONE, streets), softMaterial());
        add(bandGeometry(lines(map.quay), 1.6, 0.08, QUAY), softMaterial());
        add(bandGeometry(streets[3].lines, PATH.width, 0.09, PATH.color, streets), softMaterial());
        add(bandGeometry(streets[1].lines, SIDE.width, 0.1, SIDE.color, streets), softMaterial());
        add(bandGeometry(streets[0].lines, MAIN.width, 0.12, MAIN.color, streets), softMaterial());

        /* ---------- a pool of light on the ground under each place, brighter where you are ---------- */

        const poolGeometry = new THREE.CircleGeometry(POOL / 2, 48).rotateX(-Math.PI / 2);
        const pools = spots.map((spot) => {
            const material = new THREE.ShaderMaterial({
                uniforms: { uColor: { value: new THREE.Color(colors.paper) }, uStrength: { value: 0.2 } },
                vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
                fragmentShader: 'uniform vec3 uColor; uniform float uStrength; varying vec2 vUv; void main() { float r = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(uColor, pow(max(0.0, 1.0 - r), 2.0) * uStrength); }',
                transparent: true,
                depthWrite: false,
            });
            const mesh = add(poolGeometry, material);
            mesh.position.set(spot.x, 0.3, spot.y);
            return material;
        });

        /* ---------- the landmarks (scene/landmarks.js); one named like a place lights up when you are there ---------- */

        const marks = Object.entries(map.landmarks ?? {}).map(([name, mark]) => {
            const ring = lines(mark.ring)[0];
            if (ring.length > 6 && ring[0] === ring.at(-2) && ring[1] === ring.at(-1)) ring.splice(-2);
            const material = hazed(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: 0 }), haze);
            add(landmarkGeometry(mark, ring), material);
            return { place: places.findIndex((place) => place.name === name), ring, material };
        });

        /* ---------- houses along the streets, made up from the streets (scene/town.js) ---------- */

        const houses = makeHouses({
            // The houses keep to the solid middle of each street's band
            streets: streets.map((st, i) => ({ lines: st.lines, half: st.half * 0.62, build: i !== 3 })),
            water: lines(map.water),
            squares: lines(map.squares),
            blocks: marks.map((m) => m.ring),
            clear: spots.filter((_, p) => !marks.some((m) => m.place === p)),
        });
        add(houseGeometry(houses), hazed(new THREE.MeshLambertMaterial({ vertexColors: true }), haze));

        /* ---------- the markers, the listening stations: a sphere floating over each place on a beam of light ---------- */

        const beamMaterial = new THREE.ShaderMaterial({
            uniforms: { uColor: { value: new THREE.Color(colors.paper) }, uStrength: { value: 0.5 } },
            vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
            fragmentShader: 'uniform vec3 uColor; uniform float uStrength; varying vec2 vUv; void main() { gl_FragColor = vec4(uColor, pow(1.0 - vUv.y, 1.6) * uStrength); }',
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const beamGeometry = new THREE.CylinderGeometry(0.7, 0.7, BEAM, 10, 1, true).translate(0, BEAM / 2, 0);
        const ballGeometry = new THREE.SphereGeometry(5.5, 40, 24);
        const ringGeometry = new THREE.RingGeometry(0.86, 1, 64).rotateX(-Math.PI / 2);
        const markers = spots.map((spot) => {
            const group = new THREE.Group();
            group.position.set(spot.x, 0, spot.y);
            const ballMaterial = new THREE.MeshStandardMaterial({ color: colors.faint, roughness: 0.3, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0 });
            const ball = new THREE.Mesh(ballGeometry, ballMaterial);
            ball.position.y = BALL_AT;
            const beam = new THREE.Mesh(beamGeometry, beamMaterial.clone());
            const rings = [0, 1, 2].map(() => {
                const m = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: colors.paper, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
                m.position.y = 0.7;
                group.add(m);
                return m;
            });
            group.add(ball, beam);
            group.renderOrder = 1000;
            [ball, beam, ...rings].forEach((m) => { m.renderOrder = 1000; });
            scene.add(group);
            return { group, ball, beam, rings, lit: 0 };
        });

        /* ---------- mist drifting over the streets, thicker out in the distance ---------- */

        const mistTex = [mistTexture(3), mistTexture(11)];
        const mists = [{ y: 14, scale: 420, speed: [6, 2.5], amount: 0.45 }, { y: 32, scale: 640, speed: [-4, 3.5], amount: 0.38 }, { y: 58, scale: 900, speed: [3, -2], amount: 0.32 }].map((layer, i) => {
            const material = new THREE.ShaderMaterial({
                uniforms: { ...haze, uTex: { value: mistTex[i % 2] }, uShift: { value: new THREE.Vector2() }, uScale: { value: layer.scale }, uAmount: { value: layer.amount }, uColor: { value: new THREE.Color(MIST) } },
                vertexShader: 'varying vec3 vAt; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vAt = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
                fragmentShader: `
                    uniform sampler2D uTex; uniform vec2 uShift; uniform float uScale, uAmount; uniform vec3 uColor;
                    ${HAZE_GLSL}
                    varying vec3 vAt;
                    void main() {
                        float n = texture2D(uTex, vAt.xz / uScale + uShift).r * 0.6 + texture2D(uTex, vAt.xz / (uScale * 0.37) - uShift * 1.7).r * 0.4;
                        float d = hazeDistance(vAt.xz);
                        float far = smoothstep(uNear * 0.5, uFar, d);
                        float edge = (1.0 - smoothstep(uFar * 0.85, uFar * 1.3, d)) * (0.4 + 0.6 * hazeEdge(vAt.xz));
                        gl_FragColor = vec4(uColor, smoothstep(0.38, 0.8, n) * uAmount * (0.18 + 0.82 * far) * edge);
                    }`,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
            });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(R * 3, R * 3).rotateX(-Math.PI / 2), material);
            mesh.position.y = layer.y;
            mesh.renderOrder = 2000 + i;
            scene.add(mesh);
            return { mesh, material, layer };
        });

        /* ---------- size ---------- */

        const size = { w: 1, h: 1 };
        const widths = [];   // the names' widths in px
        const resize = () => {
            const { clientWidth: w, clientHeight: h } = container;
            if (!w || !h) return;
            size.w = w; size.h = h;
            widths.length = 0;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.fov = w < h ? 46 : 38;
            // Where you are stands a little above the middle, clear of the stories under it
            camera.setViewOffset(w, h, 0, (0.5 - (w < h ? 0.36 : 0.42)) * h, w, h);
            camera.updateProjectionMatrix();
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        /* ---------- the pointer: tips and turns; a drag turns further; the wheel goes nearer ---------- */

        const pointer = { x: 0, y: 0 };
        const view = { turn: 0, tilt: 0, zoom: 1 };
        let drag = null;
        const onMove = (e) => {
            if (drag && e.pointerId === drag.id) {
                view.turn -= ((e.clientX - drag.x) / size.w) * 2.4;
                view.tilt = THREE.MathUtils.clamp(view.tilt + ((e.clientY - drag.y) / size.h) * 1.2, -0.3, 0.45);
                drag.x = e.clientX; drag.y = e.clientY;
                return;
            }
            if (e.pointerType !== 'mouse') return;
            pointer.x = e.clientX / window.innerWidth - 0.5;
            pointer.y = e.clientY / window.innerHeight - 0.5;
        };
        const onDown = (e) => {
            drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
            try { canvas.setPointerCapture(e.pointerId); } catch { /* gone already */ }
        };
        const onUp = (e) => { if (drag?.id === e.pointerId) drag = null; };
        const onWheel = (e) => {
            e.preventDefault();
            view.zoom = THREE.MathUtils.clamp(view.zoom * Math.exp(e.deltaY * 0.0012), 0.45, 1.5);
        };
        window.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerdown', onDown);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });

        /* ---------- every frame ---------- */

        const focus = spots[state.current.here].clone();
        const eased = { x: 0, y: 0, turn: 0, tilt: 0, zoom: 1 };
        const v = new THREE.Vector3();
        let frame, last = performance.now(), t = 0;

        const tick = (time) => {
            frame = requestAnimationFrame(tick);
            const dt = Math.min((time - last) / 1000, 0.1);
            last = time;
            t += dt;
            const { here: at, sounding: playing } = state.current;

            // Walk: glide to the place you are going to
            const goal = spots[at];
            if (still) focus.copy(goal);
            else focus.lerp(goal, 1 - Math.exp(-dt * 1.8));
            haze.uFocus.value.copy(focus);

            // The view: the pointer, a drag, the wheel, and a slow drift of its own
            const k = 1 - Math.exp(-dt * 3);
            eased.x += (pointer.x + (still ? 0 : Math.sin(t * 0.21) * 0.12) - eased.x) * k;
            eased.y += (pointer.y - eased.y) * k;
            eased.turn += (view.turn - eased.turn) * k;
            eased.tilt += (view.tilt - eased.tilt) * k;
            eased.zoom += (view.zoom - eased.zoom) * k;
            const yaw = eased.turn + eased.x * TURN_RANGE * 2;
            const pitch = THREE.MathUtils.clamp(TILT + eased.tilt - eased.y * TILT_RANGE, 0.45, 1.45);
            const reach = (size.w < size.h ? REACH.tall : REACH.wide) * eased.zoom;
            camera.position.set(focus.x + Math.sin(yaw) * Math.cos(pitch) * reach, Math.sin(pitch) * reach, focus.y + Math.cos(yaw) * Math.cos(pitch) * reach);
            camera.lookAt(focus.x, 0, focus.y);
            haze.uForward.value.set(-Math.sin(yaw), -Math.cos(yaw));

            // The markers: the one you are at is lit; the playing one rings out
            markers.forEach((m, p) => {
                m.lit += ((p === at ? 1 : 0) - m.lit) * (1 - Math.exp(-dt * 4));
                m.ball.position.y = BALL_AT + (still ? 0 : Math.sin(t * 1.1 + p * 1.7) * 1.4);
                m.group.scale.setScalar(reach / SCALE_AT);
                m.ball.scale.setScalar(1 + m.lit * 0.3);
                m.ball.material.color.set(m.lit > 0.5 ? colors.paper : colors.faint);
                m.ball.material.emissiveIntensity = m.lit * 0.55;
                m.beam.material.uniforms.uStrength.value = 0.28 + m.lit * 0.5;
                m.rings.forEach((ring, i) => {
                    const phase = (t * 0.35 + i / 3) % 1;
                    const on = p === playing && !still;
                    ring.scale.setScalar(6 + phase * 46);
                    ring.material.opacity = on ? (1 - phase) * 0.55 : Math.max(0, ring.material.opacity - dt);
                });
                pools[p].uniforms.uStrength.value = 0.18 + m.lit * 0.42;
                for (const mark of marks) if (mark.place === p) mark.material.emissiveIntensity = m.lit * 0.35;
            });

            mists.forEach(({ material, layer }) => {
                if (!still) material.uniforms.uShift.value.set((t * layer.speed[0]) / layer.scale, (t * layer.speed[1]) / layer.scale);
            });

            renderer.render(scene, camera);

            // The names over the markers; one out of view waits at the edge, pointing the way
            const bottom = size.h * (size.w < size.h ? 0.6 : 0.68);
            const labels = [];
            spots.forEach((spot, p) => {
                const el = labelRefs.current[p];
                if (!el) return;
                v.set(spot.x, markers[p].ball.position.y * markers[p].group.scale.y, spot.y).project(camera);
                const behind = v.z > 1;
                let x = ((v.x + 1) / 2) * size.w, y = ((1 - v.y) / 2) * size.h;
                if (behind) { x = size.w - x; y = bottom; }
                const cx = THREE.MathUtils.clamp(x, 28, size.w - 28);
                let cy = THREE.MathUtils.clamp(y, LABEL_TOP, bottom);
                const away = behind || cx !== x || cy !== y;
                // Out of view, the name stands on the side towards the middle of the screen; in view, on its
                // own side unless it would run off the edge there
                let side = places[p].label ?? 'right';
                if (away) side = cx !== x || behind ? (cx > size.w / 2 ? 'left' : 'right') : cy < y ? 'above' : 'below';
                if (!widths[p]) widths[p] = el.lastElementChild?.offsetWidth ?? 0;   // measured once (again after a resize)
                const width = widths[p] + 24;
                if (side === 'left' && cx - width < 0) side = 'right';
                else if (side === 'right' && cx + width > size.w) side = 'left';
                else if ((side === 'above' || side === 'below') && (cx - width / 2 < 0 || cx + width / 2 > size.w)) side = cx > size.w / 2 ? 'left' : 'right';
                // Names out of view that would cover one another move apart, down from the top or up from the bottom
                const box = (cy) => {
                    const [x0, y0] = side === 'right' ? [cx + 16, cy - 12] : side === 'left' ? [cx - 16 - width, cy - 12] : [cx - width / 2, side === 'above' ? cy - 48 : cy + 24];
                    return [x0, y0, x0 + width, y0 + 24];
                };
                for (let tries = 0; away && tries < labels.length + 1; tries++) {
                    const [x0, y0, x1, y1] = box(cy);
                    if (!labels.some((o) => x0 < o.box[2] && x1 > o.box[0] && y0 < o.box[3] && y1 > o.box[1])) break;
                    cy += cy < size.h / 2 ? 28 : -28;
                }
                labels.push({ box: box(cy) });
                el.style.transform = `translate(${cx}px, ${cy}px)`;
                el.dataset.away = away ? 'true' : 'false';
                el.dataset.side = side;
                const arrow = el.querySelector('[data-arrow]');
                if (arrow) arrow.style.transform = `rotate(${Math.atan2(y - cy, x - cx)}rad)`;
            });
        };
        frame = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            window.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            canvas.removeEventListener('wheel', onWheel);
            scene.traverse((obj) => {
                obj.geometry?.dispose();
                (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m?.dispose());
            });
            mistTex.forEach((tex) => tex.dispose());
            renderer.dispose();
            canvas.remove();
        };
    }, [map, places, spots, to]);

    return (
        <div ref={containerRef} className='absolute inset-0'>
            <nav aria-label='Steder' className={failed ? 'absolute inset-x-0 top-1/3 flex flex-wrap justify-center gap-3 px-gutter' : 'absolute inset-0 pointer-events-none'}>
                {places.map((place, p) => {
                    const isHere = p === here;
                    return (
                        <button
                            key={place.name}
                            ref={(el) => { labelRefs.current[p] = el; }}
                            data-side={place.label ?? 'right'}
                            onClick={() => onWalk(p)}
                            aria-current={isHere ? 'location' : undefined}
                            className={`${failed ? 'relative' : 'absolute left-0 top-0'} group pointer-events-auto cursor-pointer`}
                            style={failed ? undefined : { transform: 'translate(-999px, -999px)' }}
                        >
                            {/* The marker's sphere is under the middle of this: a target the size of a finger */}
                            <span className='absolute -left-6 -top-6 size-12 rounded-full' />
                            <span className={`absolute whitespace-nowrap uppercase leading-none text-xs px-1.5 py-1 transition-colors ${SIDES} ${isHere ? 'text-paper' : 'text-muted md:group-hover:text-paper'} group-data-[away=true]:bg-ink/60 group-data-[away=true]:backdrop-blur-sm`} style={failed ? { position: 'static', transform: 'none' } : undefined}>
                                <span data-arrow className='hidden group-data-[away=true]:inline-block mr-1.5'>→</span>
                                {place.name}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}

/** Where a place's name stands round its marker: data-side on the button (right, left, above, below) */
const SIDES = [
    'group-data-[side=right]:left-4 group-data-[side=right]:top-0 group-data-[side=right]:-translate-y-1/2',
    'group-data-[side=left]:right-4 group-data-[side=left]:top-0 group-data-[side=left]:-translate-y-1/2',
    'group-data-[side=above]:bottom-6 group-data-[side=above]:left-0 group-data-[side=above]:-translate-x-1/2',
    'group-data-[side=below]:top-6 group-data-[side=below]:left-0 group-data-[side=below]:-translate-x-1/2',
].join(' ');
