/**
 * A town on a map, seen from above (Tværveje's Nakskov, Kirkestræde's Køge): the ground, the water,
 * the squares and the streets as muted bands, the landmarks (landmarks.js), houses along the streets
 * and trees in the yards, made up from the streets alone (town.js, houses.js, trees.js), the faint
 * edges, and a haze that lies still where the town ends (haze.js), with mist drifting over it.
 *
 *   const town = buildTownMap({ scene, map, to, clear });
 *   town.add(mesh) / town.next()   lay more on top, in drawing order
 *   town.haze                      the haze's uniforms, for materials of the scene's own (hazedOverMap)
 *   town.marks                     the landmarks: [{ name, ring, material }] (material.emissiveIntensity lights one)
 *   town.update(t, still)          every frame (the mist)
 *   town.dispose()
 *
 * The map is written as nakskov.js: units on a sheet (x to the east, y to the south), `metres` per
 * unit, SVG paths for water, quay, main, side, zone, path and squares, and landmarks by name.
 * Metres, y up, x to the east and z to the south; `to(x, y)` turns the map's units into metres.
 */

import * as THREE from 'three';
import { GREYS, LIGHT, EDGES } from '@/player/kit/style';
import { makeHouses, makeTrees } from '@/player/kit/town';
import { houses as houseShapesOf } from '@/player/kit/houses';
import { trees as treeShapesOf } from '@/player/kit/trees';
import { landmarkGeometry } from '@/player/kit/landmarks';
import { pathLines, fillGeometry, bandGeometry } from '@/player/kit/roads';
import { hazeMap, hazedOverMap as hazed, HAZE_GLSL } from '@/player/kit/haze';

/* The style's greys for a map: the streets muted, the landmarks a step lighter than the houses */
const ZONE = GREYS.squares;           // the walking streets and the squares, soft under the streets
const QUAY = GREYS.sideStreets;       // the quay's edge
const PATH = { width: 1.8, color: GREYS.paths };   // widths with the soft edges; the solid middle is about 0.8 of it
const SIDE = { width: 5.5, color: GREYS.sideStreets };
const MAIN = { width: 9, color: GREYS.streets };
const LANDMARK = { wall: GREYS.landmark, roof: GREYS.landmarkRoof, band: GREYS.landmarkRoof, spire: GREYS.landmarkRoof };
const HAZE = new THREE.Color(GREYS.haze).convertLinearToSRGB().toArray();   // sRGB: the grey the haze fades into

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

/**
 * @param {object} o
 * @param {THREE.Scene} o.scene
 * @param {object} o.map                The map (see above)
 * @param {(x: number, y: number) => [number, number]} o.to  The map's units → metres on the ground
 * @param {{ houses?: THREE.Vector2[], trees?: THREE.Vector2[] }} [o.clear]  Points the houses and the trees keep a little space round
 * @param {{ town?: number[], edge?: number }} [o.haze]  Metres from the nearest street where the town is clear and where it is lost; over which the map fades at its edges
 * @param {{ y: number, scale: number, speed: number[], amount: number }[]} [o.mist]  The mist's layers
 * @param {number} [o.trees=2.6]        How tall the trees are, against their spacing
 */
export function buildTownMap({ scene, map, to, clear = {}, haze: hazeAt = {}, mist = MIST, trees: treeScale = 2.6 }) {
    const extent = [...to(0, 0), ...to(map.width, map.height)];
    const haze = {
        uHazeMap: { value: null },   // made once the streets are drawn, below
        uHaze: { value: new THREE.Vector3(...HAZE) },
        uExtent: { value: new THREE.Vector4(...extent) },
    };

    scene.add(new THREE.HemisphereLight(LIGHT.sky, LIGHT.fromBelow, LIGHT.skyStrength));
    const sun = new THREE.DirectionalLight(LIGHT.sun, LIGHT.sunStrength);
    sun.position.set(-300, 420, 520);   // low from the south-south-west
    scene.add(sun);

    let order = 0;
    const next = () => order++;
    const add = (geometry, material) => {
        if (!geometry) return null;
        const mesh = geometry.isObject3D ? geometry : material.isLineBasicMaterial ? new THREE.LineSegments(geometry, material) : new THREE.Mesh(geometry, material);
        mesh.renderOrder = next();
        mesh.frustumCulled = false;
        scene.add(mesh);
        return mesh;
    };
    // The faint edges (kit/style.js): lines in the haze like the rest
    const edgeMaterial = (strength) => new THREE.LineBasicMaterial({ color: GREYS.edge, transparent: true, opacity: strength, depthWrite: false });
    const flatMaterial = (color, opacity = 1) => hazed(new THREE.MeshBasicMaterial({ color, opacity, side: THREE.DoubleSide, depthWrite: false }), haze);
    const lines = (paths) => [paths ?? []].flat().flatMap((d) => pathLines(d, to));

    /* ---------- the ground, the water and the streets ---------- */

    const [x0, z0, x1, z1] = extent;
    const R = Math.max(x1 - x0, z1 - z0) / 2;
    add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2), flatMaterial(GREYS.ground));
    add(fillGeometry(lines(map.water), 0.04), flatMaterial(GREYS.water));
    add(fillGeometry(lines(map.squares), 0.05), flatMaterial(ZONE));
    const zoneWidth = map.zoneWidth ?? 12;
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
    haze.uHazeMap.value = hazeMap(streets, extent, { town: hazeAt.town ?? [30, 140], edge: hazeAt.edge ?? 150 });

    /* ---------- the landmarks ---------- */

    const marks = Object.entries(map.landmarks ?? {}).map(([name, mark]) => {
        const ring = lines(mark.ring)[0];
        if (ring.length > 6 && ring[0] === ring.at(-2) && ring[1] === ring.at(-1)) ring.splice(-2);
        const material = hazed(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: 0xffffff, emissiveIntensity: 0 }), haze);
        const geometry = landmarkGeometry(mark, ring, LANDMARK);
        add(geometry, material);
        if (geometry) add(new THREE.EdgesGeometry(geometry, EDGES.angle), hazed(edgeMaterial(EDGES.landmark), haze));
        return { name, ring, material };
    });

    /* ---------- houses along the streets, and trees in the yards, made up from the streets ---------- */

    const houses = makeHouses({
        // The houses keep to the solid middle of each street's band
        streets: streets.map((st, i) => ({ lines: st.lines, half: st.half * 0.85, build: i !== 3 })),
        water: lines(map.water),
        squares: lines(map.squares),
        blocks: marks.map((m) => m.ring),
        clear: clear.houses ?? [],
    });
    const houseShapes = houseShapesOf(houses, { up: 'y' });
    add(houseShapes, hazed(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), haze));
    if (houseShapes) add(new THREE.EdgesGeometry(houseShapes, EDGES.angle), hazed(edgeMaterial(EDGES.buildings), haze));

    const treeSpots = makeTrees({
        streets: streets.map((st) => ({ lines: st.lines, half: st.half * 0.85 })),
        water: lines(map.water),
        squares: lines(map.squares),
        blocks: marks.map((m) => m.ring),
        houses,
        clear: clear.trees ?? [],
        extent,
    });
    // The style's broad leafy tree; ground (x, z) is (x, −y) z up
    const treeShapes = treeShapesOf(treeSpots.map((t) => ({ x: t.x, y: -t.z, height: t.size * treeScale, kind: 'beech' })), { seed: 11, up: 'y' });
    add(treeShapes, hazed(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), haze));

    /* ---------- mist drifting over the streets, thicker out in the haze ---------- */

    const mistTex = [mistTexture(3), mistTexture(11)];
    const mists = mist.map((layer, i) => {
        const material = new THREE.ShaderMaterial({
            uniforms: { ...haze, uTex: { value: mistTex[i % 2] }, uShift: { value: new THREE.Vector2() }, uScale: { value: layer.scale }, uAmount: { value: layer.amount }, uColor: { value: new THREE.Color(GREYS.mist) } },
            vertexShader: 'varying vec3 vAt; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vAt = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
            fragmentShader: `
                uniform sampler2D uTex; uniform vec2 uShift; uniform float uScale, uAmount; uniform vec3 uColor;
                ${HAZE_GLSL}
                varying vec3 vAt;
                void main() {
                    float n = texture2D(uTex, vAt.xz / uScale + uShift).r * 0.6 + texture2D(uTex, vAt.xz / (uScale * 0.37) - uShift * 1.7).r * 0.4;
                    float h = hazeAt(vAt.xz);
                    vec2 out2 = max(uExtent.xy - vAt.xz, vAt.xz - uExtent.zw);
                    float beyond = 1.0 - smoothstep(0.0, 220.0, max(out2.x, out2.y));   // thinning out past the map's edge
                    gl_FragColor = vec4(uColor, smoothstep(0.38, 0.8, n) * uAmount * (0.12 + 0.88 * h) * beyond);
                }`,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(R * 3, R * 3).rotateX(-Math.PI / 2), material);
        mesh.position.y = layer.y;
        mesh.renderOrder = 2000 + i;
        scene.add(mesh);
        return { material, layer };
    });

    return {
        add,
        next,
        haze,
        marks,
        extent,
        update(t, still) {
            if (still) return;
            for (const { material, layer } of mists) material.uniforms.uShift.value.set((t * layer.speed[0]) / layer.scale, (t * layer.speed[1]) / layer.scale);
        },
        dispose() {
            mistTex.forEach((tex) => tex.dispose());
            haze.uHazeMap.value?.dispose();
        },
    };
}

/** The mist over a town, in metres: as high as it lies, how big its swirls are, how it drifts */
const MIST = [{ y: 14, scale: 420, speed: [6, 2.5], amount: 0.2 }, { y: 32, scale: 640, speed: [-4, 3.5], amount: 0.2 }, { y: 58, scale: 900, speed: [3, -2], amount: 0.24 }];

/**
 * A line to move along (the street you walk): where you are s metres along it, and which way it goes
 * there. `flat` is [x, z, x, z, ...] in metres.
 */
export function alongLine(flat) {
    const pts = [];
    for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
    const s = [0];
    for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const at = (sv) => {
        let i = 1;
        while (i < pts.length - 1 && s[i] < sv) i++;
        const t = (sv - s[i - 1]) / (s[i] - s[i - 1] || 1);
        const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
        return [ax + (bx - ax) * t, az + (bz - az) * t];
    };
    return {
        length: s.at(-1),
        at,
        /** The direction at s, [x, z], smoothed over `span` metres either way, so a bend is turned gently */
        direction(sv, span = 10) {
            const a = at(sv - span), b = at(sv + span);
            const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
            return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
        },
    };
}
