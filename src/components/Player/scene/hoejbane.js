/**
 * Højbanen in Viborg — the horizontal lift between the hospital's buildings, over Heibergs Allé —
 * built in code for 53 sekunder til fælles: soft low-poly forms, faceted, no textures, the trees
 * from scene/forest.js. Two looks: 'pale' (muted colours under a sky, as Kanon i G3) and 'dark'
 * (in greys on the dark, as Tværveje's map).
 *
 * Built from photos, not from drawings, so the sizes are guesses at the right proportions:
 *
 *  - The track is level all the way, about 15 m up: out of the hospital parallel to the road, round
 *    a wide bend — a rounded L — and straight over the road. A deep steel lattice, zigzag on the
 *    sides and on top, a grating walkway down the middle with the rails and the toothed rack beside
 *    it, a handrail tube along each side. Pale round columns hold it, with struts from a cross-head.
 *  - The hospital end: the arrival house, a tall pale box hung on the right-hand end of the
 *    sand-coloured block by the road (sand panels, grey window bands), open at the bottom where the track comes in; the cabin
 *    waits inside it.
 *    Behind it Regionshospitalet: the long white slab with its brown ribbon windows and the taller
 *    white towers at its ends, the dark brown blocks beside it, the parking deck in front, and the
 *    old yellow house with its mansard roof.
 *  - The other end, at the patient hotel: a slim tower in grey zinc, its gable to the track with all
 *    the glass in a strip down the middle of it and the white station box mounted on that, the
 *    track running right up to it; the long pale hotel with balconies against it.
 *  - Three columns: by the arrival house, on the hospital's side of the road, and before the hotel.
 *  - The cabin: a white box with a band of windows on a dark carriage.
 *  - Round it all a town of houses, low blocks of flats and trees, thinning out and fading into the
 *    haze (`hazed`): the further from the middle, the more it takes the haze's colour, so at the edge
 *    the ground and the town meet the sky's horizon and there is no end to see.
 *
 * Metres, z up. The track crosses the road along x; the road runs along y, away from the viewer
 * (who stands on the -y side, as in the photos taken from the road).
 *
 * @returns {{
 *   group: THREE.Group,
 *   size: number,               metres across the part worth framing (the track and the stations)
 *   centre: THREE.Vector3,      the middle of that part
 *   cabinAt(p): THREE.Vector3,  where the cabin is at p (0 = the hospital, 1 = the other side), for the camera
 *   setCabin(p, lamp, t),       put the cabin at p; lamp 0 = off, 1 = on, 2 = blinking (stuck)
 *   update(dt, still),          the traffic on the road
 *   haze(colour, back),         the haze's colour and what lies behind; also tells it where the place is (every frame)
 *   dispose()
 * }}
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { random, toyTree } from '@/components/Player/scene/forest';

const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);

/* ---------- THE PLACE ---------- */

const ROAD = { x: 24, width: 12, walk: 3.6, length: 900 };   // Heibergs Allé, running along y

// The lattice track, metres from the rails' line: chords on top and under, the walkway, rails, handrails
const TRUSS = { half: 0.85, bottomHalf: 0.6, depth: 1.6, panel: 1.7, walk: 0.55, rail: 0.5, hand: 0.95, handUp: 0.45 };

// The track's line, level at HEIGHT: from the hospital along the road (x = BEND.x), round the bend
// (a quarter circle), and straight over the road (y = BEND.y) to the other side
const HEIGHT = 15;
const BEND = { x: -4.5, y: -6, radius: 12, from: 20, to: 50.6 };   // from: the hospital's station (y); to: the other side's (x), where the cabin stops
const DOCK = 1.55;   // metres on from where the cabin stops at the other side to the building's face: the track runs right up to it

// Where the columns stand (x, y): the nearest point of the track is above each
const COLUMNS = [[-4.5, 12], [13.6, -6], [48.4, -6]];   // three: by the arrival house, on the hospital's side of the road, before the hotel

/* ---------- COLOURS ---------- */

// The pale look: muted, a little warm, as in Kanon i G3
const PALE = {
    grass: '#a4aa84', verge: '#9aa07a', road: '#a3a39e', line: '#f2f0e8', walk: '#d3cec3', curb: '#e3dfd6',
    steel: '#7d8387', grating: '#949a9d', rack: '#5c6266', handrail: '#b9bec1', column: '#c9cdcf', foot: '#bdb9b0',
    panel: '#e6e8e8', panelDark: '#c3c6c7', roof: '#d6d9da', seal: '#3c4145', bracket: '#a8a58f', glass: '#56646f', carriage: '#41474b', wheel: '#2f3336', lamp: '#ffcf7a',
    peach: '#d9a581', sand: '#e4d4ba', band: '#a9adaf', window: '#5d6a75', ribbon: '#4f5b66', concrete: '#bcb8ae', parapet: '#ece8df',
    clad: '#b3b8bb', cladLight: '#d5d9db', yellowBrick: '#cdb87c', dock: '#454d54', greyBlock: '#9da1a2',
    slate: '#6c7176', slateLight: '#8a9095', station: '#f1efea',
    white: '#ece7da', brown: '#7c6250', bronze: '#6f5b4b', bronzeLight: '#a39280', deck: '#8f9192', yellow: '#dcc68a',
    paleCool: '#d6d8d8', pale: '#e4e0d8', balcony: '#b7c7cd', brick: '#b7735d', tiles: '#6f5a52', trim: '#efe9df',
    pole: '#a5aaad', signBlue: '#3f6fa6', arrival: '#e3e6e7', arrivalSeam: '#cfd3d5',
    glassLow: '#34404a', glassHigh: '#8796a2', cars: ['#5b6168', '#ece9e2', '#7c8fa0', '#a8574a', '#cbbf9d'],
    leaves: null,   // the trees keep their own colours (scene/forest.js)
};

// The dark look, as Tværveje's map: dark ground, the buildings in dark greys, the hospital a shade
// lighter, the streets and the track pale, the cabin white — no colour at all
const DARK = {
    grass: '#1f1f22', verge: '#232327', road: '#7c7c84', line: '#d4d4d8', walk: '#4a4a51', curb: '#6b6b73',
    steel: '#a1a1aa', grating: '#8a8a92', rack: '#55555c', handrail: '#c4c4cb', column: '#9a9aa1', foot: '#55555c',
    panel: '#f2f2f3', panelDark: '#c9c9ce', roof: '#dcdce0', seal: '#2b2b31', bracket: '#7a7a82', glass: '#2e2e33', carriage: '#323238', wheel: '#232327', lamp: '#fafafa',
    peach: '#5c5c63', sand: '#6a6a72', band: '#4a4a51', window: '#33333a', ribbon: '#2b2b31', concrete: '#4a4a51', parapet: '#7a7a82',
    clad: '#62626a', cladLight: '#74747c', yellowBrick: '#7a7a82', dock: '#1f1f22', greyBlock: '#4a4a51',
    slate: '#4a4a51', slateLight: '#55555c', station: '#d4d4d8',
    white: '#6a6a72', brown: '#3f3f46', bronze: '#3a3a41', bronzeLight: '#55555c', deck: '#3f3f46', yellow: '#4a4a51',
    paleCool: '#42424a', pale: '#3a3a41', balcony: '#55555c', brick: '#33333a', tiles: '#55555c', trim: '#5c5c63',
    pole: '#6b6b73', signBlue: '#52525b', arrival: '#9a9aa1', arrivalSeam: '#8a8a92',
    glassLow: '#1c1c20', glassHigh: '#4a4a51', cars: ['#3f3f46', '#9a9aa1', '#55555c', '#6b6b73', '#2b2b31'],
    leaves: ['#3f3f46', '#4a4a51', '#55555c'], trunk: '#2e2e33',   // the trees, in greys
};

let C = PALE;   // the look being built (set by buildHoejbane)
const colour = (hex) => new THREE.Color(hex);

/* ---------- BUILDING BLOCKS ---------- */

/** Every part as one faceted, vertex-coloured, non-indexed geometry, so they can all be merged */
function paint(g, hex) {
    const out = g.index ? g.toNonIndexed() : g;
    if (out !== g) g.dispose();
    const c = colour(hex), list = [];
    for (let i = 0; i < out.attributes.position.count; i++) list.push(c.r, c.g, c.b);
    out.setAttribute('color', new THREE.Float32BufferAttribute(list, 3));
    return out;
}

/** A box w × d × h standing on z at (x, y); round > 0 softens its edges */
function box(w, d, h, x, y, z, hex, round = 0) {
    const g = round > 0 ? new RoundedBoxGeometry(w, d, h, 2, Math.min(round, w / 2.01, d / 2.01, h / 2.01)) : new THREE.BoxGeometry(w, d, h);
    g.translate(x, y, z + h / 2);
    return paint(g, hex);
}

/** A round rod from a to b */
function rod(a, b, r, hex, sides = 6, r1 = r) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const g = new THREE.CylinderGeometry(r1, r, dir.length(), sides, 1);
    g.translate(0, dir.length() / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize()));
    g.translate(a.x, a.y, a.z);
    return paint(g, hex);
}

/** A flat band between two lines of points (left and right, as seen going along), `thick` deep */
function band(left, right, thick, hex) {
    const pos = [];
    const down = (v) => [v.x, v.y, v.z - thick];
    for (let i = 0; i < left.length - 1; i++) {
        const a = left[i], b = right[i], c = left[i + 1], d = right[i + 1];
        pos.push(...a.toArray(), ...b.toArray(), ...d.toArray(), ...a.toArray(), ...d.toArray(), ...c.toArray());   // the top, facing up
        pos.push(...down(a), ...down(d), ...down(b), ...down(a), ...down(c), ...down(d));                           // the underside
    }
    // the two long edges
    for (const [line, flip] of [[left, false], [right, true]]) {
        for (let i = 0; i < line.length - 1; i++) {
            const a = line[i], c = line[i + 1];
            const quad = [a.toArray(), down(a), down(c), a.toArray(), down(c), c.toArray()];
            if (flip) quad.reverse();
            quad.forEach((p) => pos.push(...p));
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    g.computeVertexNormals();
    return paint(g, hex);
}

/** Parts built round their own origin (facing -y), turned by `angle` and moved to (x, y) */
function placed(parts, local, x, y, angle = 0) {
    for (const g of local) { g.rotateZ(angle); g.translate(x, y, 0); parts.push(g); }
}

/** A block of a building from x0..x1, y0..y1, z0..z1, with ribbon windows every `every` metres */
function block(parts, { x0, x1, y0, y1, z0 = 0, z1, hex, windows, parapet = true }) {
    const w = x1 - x0, d = y1 - y0, x = (x0 + x1) / 2, y = (y0 + y1) / 2;
    parts.push(box(w, d, z1 - z0, x, y, z0, hex));
    if (windows) {
        const { first = 1.1, every = 3.5, height = 1.4, hex: glass = C.ribbon } = windows;
        for (let z = z0 + first; z + height < z1 - 0.6; z += every) parts.push(box(w + 0.12, d + 0.12, height, x, y, z, glass));
    }
    if (parapet) parts.push(box(w + 0.25, d + 0.25, 0.45, x, y, z1, C.parapet));
}

/** A gabled house, its ridge along x */
function house(parts, x, y, w, d, h, roof, turn = 0, wall = C.brick, tiles = C.tiles) {
    const local = [];
    local.push(box(w, d, h, 0, 0, 0, wall));
    const shape = new THREE.Shape([new THREE.Vector2(-d / 2 - 0.4, 0), new THREE.Vector2(d / 2 + 0.4, 0), new THREE.Vector2(0, roof)]);
    const prism = new THREE.ExtrudeGeometry(shape, { depth: w + 0.6, bevelEnabled: false });
    prism.rotateX(Math.PI / 2);             // the triangle stands up; extruded along -y
    prism.rotateZ(Math.PI / 2);             // ridge along x
    prism.translate(-(w + 0.6) / 2, 0, h);
    local.push(paint(prism, tiles));
    // two rows of small windows on the long sides
    for (const side of [-1, 1]) {
        for (let k = 0; k < Math.floor(w / 2.6); k++) {
            const wx = -w / 2 + 1.4 + k * 2.6;
            for (const wz of [0.9, h - 2]) local.push(box(1.1, 0.12, 1.2, wx, side * (d / 2 + 0.02), wz, k % 2 ? C.ribbon : C.window));
        }
    }
    placed(parts, local, x, y, turn);
}

/** The dark look: a tree's colours (green leaves, pale bark) turned into its greys */
function greyTree(g, rand) {
    const c = g.attributes.color;
    const leaf = colour(C.leaves[Math.floor(rand() * C.leaves.length)]), trunk = colour(C.trunk);
    for (let i = 0; i < c.count; i++) {
        const green = c.getY(i) > c.getX(i) * 1.02;   // the leaves are greener than red; bark is not
        const to = green ? leaf : trunk;
        c.setXYZ(i, to.r, to.g, to.b);
    }
}

/* ---------- THE TOWN ROUND IT, AND THE HAZE IT FADES INTO ---------- */

// Where the town thins into the haze: everything is haze-coloured by HAZE.far metres from HAZE.centre
const HAZE = { centre: [18, 20], near: 115, far: 300 };
// The part already built by hand (the hospital, the road's two sides), which the town leaves alone
const BUILT = { x0: -100, x1: 112, y0: -60, y1: 112 };
const STREETS = { across: [-120, 152, 240], along: [-150, 172, -262] };   // side streets: y = …, x = …

/**
 * The town round the hospital, out into the haze: houses in red and yellow brick, a few low blocks
 * of flats, clumps of trees, side streets — on a loose grid, thinning towards the edge
 */
function outskirts(parts, wood, rand) {
    const { x: rx, width: rw } = ROAD;
    const span = 760;
    for (const y of STREETS.across) parts.push(box(span, 7, 0.04, HAZE.centre[0], y, 0, C.road));
    for (const x of STREETS.along) parts.push(box(7, span, 0.04, x, HAZE.centre[1], 0, C.road));
    const onStreet = (x, y) => STREETS.across.some((v) => Math.abs(y - v) < 11) || STREETS.along.some((v) => Math.abs(x - v) < 11);

    const step = 24;
    for (let gx = -330; gx <= 360; gx += step) {
        for (let gy = -330; gy <= 380; gy += step) {
            const x = gx + rand.range(-5, 5), y = gy + rand.range(-5, 5);
            const r = Math.hypot(x - HAZE.centre[0], y - HAZE.centre[1]);
            if (r > HAZE.far + 40) continue;
            if (x > BUILT.x0 && x < BUILT.x1 && y > BUILT.y0 && y < BUILT.y1) continue;
            if (Math.abs(x - rx) < rw / 2 + 14 || onStreet(x, y)) continue;
            const pick = rand();
            const turn = (rand() < 0.5 ? 0 : Math.PI / 2) + rand.range(-0.06, 0.06);
            if (pick < 0.5) {
                const yellow = rand() < 0.3;
                house(parts, x, y, rand.range(9, 14), rand.range(7.5, 9.5), rand.range(5.5, 7), rand.range(3.8, 5),
                    turn, yellow ? C.yellow : C.brick, rand() < 0.25 ? C.slate : C.tiles);
                if (rand() < 0.6) toyTree('beech', new THREE.Vector3(x + rand.range(-9, 9), y + rand.range(-9, 9), 0), rand.range(8, 12), rand, wood);
            } else if (pick < 0.62) {
                // a low block of flats
                const long = rand.range(24, 34), deep = rand.range(10, 12), high = rand.range(9, 13);
                const [w, d] = turn < 1 ? [long, deep] : [deep, long];
                block(parts, { x0: x - w / 2, x1: x + w / 2, y0: y - d / 2, y1: y + d / 2, z1: high, hex: rand() < 0.5 ? C.yellow : C.pale, windows: { first: 1.2, every: 3, height: 1.3, hex: C.window } });
            } else {
                // a clump of trees
                const n = 2 + Math.floor(rand() * 3);
                for (let k = 0; k < n; k++) toyTree(rand() < 0.8 ? 'beech' : 'birch', new THREE.Vector3(x + rand.range(-9, 9), y + rand.range(-9, 9), 0), rand.range(9, 15), rand, wood);
            }
        }
    }
}

/**
 * The haze, put into a material: whatever it draws is mixed into the haze's colour the further it
 * stands from the town's middle — from HAZE.near to HAZE.far metres out — after the light, so at
 * the far edge it is exactly the colour of what lies behind — the sky's horizon, or the dark — and
 * the town fades out into it. The uniforms are shared: the haze's and the background's colours
 * (the scene changes them with the weather) and `toPlace` (the inverse
 * of the place's world matrix, set every frame, so the distance is measured in the place's metres).
 */
function hazed(material, haze) {
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, haze.uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nuniform mat4 uToPlace;\nvarying vec2 vPlace;')
            .replace('#include <project_vertex>', '#include <project_vertex>\nvPlace = (uToPlace * modelMatrix * vec4(transformed, 1.0)).xy;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform vec3 uHaze, uBack;\nuniform vec2 uHazeCentre, uHazeRange;\nvarying vec2 vPlace;')
            .replace('#include <fog_fragment>', `{
                float k = smoothstep(uHazeRange.x, uHazeRange.y, length(vPlace - uHazeCentre));
                gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, k * k * (3.0 - 2.0 * k));
                gl_FragColor.rgb = mix(gl_FragColor.rgb, uBack, smoothstep(0.6, 1.0, k));   // and at the very edge, into what is behind
            }
            #include <fog_fragment>`);
    };
    return material;
}

/* ---------- THE TRACK ---------- */

/** The track's line: along the road from the hospital, round the bend, straight over the road — level all the way */
function trackCurve() {
    const { x, y, radius: r, from, to } = BEND;
    const cx = x + r, cy = y + r;                 // the bend's centre
    const points = [];
    for (let v = from; v > cy + 0.5; v -= 3.5) points.push(new THREE.Vector3(x, v, HEIGHT));
    for (let deg = 180; deg <= 270; deg += 15) {
        const a = THREE.MathUtils.degToRad(deg);
        points.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, HEIGHT));
    }
    for (let u = cx + 4; u < to + DOCK; u += 8) points.push(new THREE.Vector3(u, y, HEIGHT));
    points.push(new THREE.Vector3(to + DOCK, y, HEIGHT));   // right up to the building
    // centripetal keeps the straight legs straight and the bend round
    return new THREE.CatmullRomCurve3(points, false, 'centripetal');
}

/** The track's frame at t: the point on the rails' line, the way along, sideways (level, to the right) and up */
function frameAt(curve, t) {
    const p = curve.getPointAt(t);
    const along = curve.getTangentAt(t);
    const side = new THREE.Vector3().crossVectors(along, Z).normalize();
    const up = new THREE.Vector3().crossVectors(side, along).normalize();
    return { p, along, side, up };
}

/** The lattice track along the curve */
function buildTrack(parts, curve) {
    const n = Math.max(8, Math.round(curve.getLength() / TRUSS.panel));
    const fine = n * 3;   // the smooth parts (walkway, rails, handrails) follow the curve more closely
    const line = (count, across, up) => Array.from({ length: count + 1 }, (_, i) => {
        const { p, side, up: u } = frameAt(curve, i / count);
        return p.addScaledVector(side, across).addScaledVector(u, up);
    });
    const tube = (points, r, hex) => paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length * 2, r, 6, false), hex);

    // The chords: two at the top, under the walkway, and two under them
    const topL = line(n, -TRUSS.half, -0.12), topR = line(n, TRUSS.half, -0.12);
    const botL = line(n, -TRUSS.bottomHalf, -TRUSS.depth), botR = line(n, TRUSS.bottomHalf, -TRUSS.depth);
    for (const row of [topL, topR]) parts.push(tube(row, 0.1, C.steel));
    for (const row of [botL, botR]) parts.push(tube(row, 0.09, C.steel));

    // Zigzag on both sides and on top, a post at every panel, a tie across underneath
    for (let i = 0; i <= n; i++) {
        for (const [top, bot] of [[topL, botL], [topR, botR]]) {
            parts.push(rod(top[i], bot[i], 0.045, C.steel, 5));
            if (i < n) parts.push(i % 2 ? rod(top[i], bot[i + 1], 0.045, C.steel, 5) : rod(bot[i], top[i + 1], 0.045, C.steel, 5));
        }
        parts.push(rod(botL[i], botR[i], 0.04, C.steel, 5));
        parts.push(rod(topL[i], topR[i], 0.04, C.steel, 5));
        if (i < n) parts.push(i % 2 ? rod(topL[i], topR[i + 1], 0.04, C.steel, 5) : rod(topR[i], topL[i + 1], 0.04, C.steel, 5));
    }

    // On top: the grating walkway, the two rails, the toothed rack beside the middle, a handrail each side
    parts.push(band(line(fine, -TRUSS.walk, 0), line(fine, TRUSS.walk, 0), 0.06, C.grating));
    for (const s of [-1, 1]) parts.push(tube(line(fine, s * TRUSS.rail, 0.06), 0.05, C.steel));
    parts.push(band(line(fine, 0.14, 0.1), line(fine, 0.24, 0.1), 0.1, C.rack));
    const handL = line(n, -TRUSS.hand, TRUSS.handUp), handR = line(n, TRUSS.hand, TRUSS.handUp);
    parts.push(tube(line(fine, -TRUSS.hand, TRUSS.handUp), 0.075, C.handrail), tube(line(fine, TRUSS.hand, TRUSS.handUp), 0.075, C.handrail));
    for (let i = 0; i <= n; i += 2) {
        parts.push(rod(topL[i], handL[i], 0.035, C.handrail, 5), rod(topR[i], handR[i], 0.035, C.handrail, 5));
    }
}

/** A column under the track nearest (x, y): a tapered pole on a footing, a cross-head and two struts up to the truss */
function column(parts, curve, x, y) {
    let best = 0, bestGap = Infinity;
    for (let i = 0; i <= 600; i++) {
        const q = curve.getPointAt(i / 600);
        const gap = Math.hypot(q.x - x, q.y - y);
        if (gap < bestGap) { bestGap = gap; best = i / 600; }
    }
    const { p, side, up } = frameAt(curve, best);
    const under = p.clone().addScaledVector(up, -TRUSS.depth);
    const head = new THREE.Vector3(under.x, under.y, under.z - 1.3);
    parts.push(box(1.6, 1.6, 0.35, head.x, head.y, 0, C.foot, 0.12));
    parts.push(rod(new THREE.Vector3(head.x, head.y, 0.3), head, 0.42, C.column, 12, 0.3));
    // the cross-head, and a strut from each end up to the chord above it
    const left = head.clone().addScaledVector(side, -1.1), right = head.clone().addScaledVector(side, 1.1);
    parts.push(rod(left, right, 0.13, C.column, 8));
    for (const [end, s] of [[left, -1], [right, 1]]) parts.push(rod(end, under.clone().addScaledVector(side, s * TRUSS.bottomHalf), 0.09, C.column, 6));
    parts.push(rod(head, under, 0.12, C.column, 6));
}

/* ---------- THE CABIN ---------- */

// The cabin's box, from the photos: a little longer than it is wide, about as tall as it is wide
const CAB = { length: 2.7, width: 2.3, height: 2.35, base: 0.95, wall: 0.05 };

/**
 * One wall of the box: a flat panel with real openings for the windows, its outer face at z = 0
 * facing +z, `u` across it from -w/2 to w/2 and `v` up it from 0. The glass sits further in, so the
 * windows are set into the wall and nothing stands out of it.
 */
function wallPanel(w, h, openings, hex) {
    const shape = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(w / 2, h), new THREE.Vector2(-w / 2, h)]);
    for (const [u0, u1, v0, v1] of openings) {
        shape.holes.push(new THREE.Path([new THREE.Vector2(u0, v0), new THREE.Vector2(u0, v1), new THREE.Vector2(u1, v1), new THREE.Vector2(u1, v0)]));
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: CAB.wall, bevelEnabled: false });
    g.translate(0, 0, -CAB.wall);
    return paint(g, hex);
}

/** Turn a wall built facing +z to face `side` (-y, +x, +y, -x) and push it out to the box's edge */
function faceTo(g, side, z) {
    g.rotateX(Math.PI / 2);                                   // up the wall is up; it now faces -y
    const turn = { '-y': 0, '+x': Math.PI / 2, '+y': Math.PI, '-x': -Math.PI / 2 }[side];
    g.rotateZ(turn);
    const out = side[1] === 'x' ? CAB.length / 2 : CAB.width / 2;
    const dir = { '-y': [0, -1], '+x': [1, 0], '+y': [0, 1], '-x': [-1, 0] }[side];
    g.translate(dir[0] * out, dir[1] * out, z);
    return g;
}

/** Glass, darker low down and lighter where it catches the sky */
function glassBox(w, d, h, z) {
    const g = new THREE.BoxGeometry(w, d, h).toNonIndexed();
    g.translate(0, 0, z + h / 2);
    const low = colour(C.glassLow), high = colour(C.glassHigh), c = new THREE.Color(), list = [];
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        c.copy(low).lerp(high, THREE.MathUtils.smoothstep(pos.getZ(i), z + h * 0.35, z + h));
        list.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(list, 3));
    return g;
}

/**
 * The cabin: origin on the rails' line, travelling along local +x. The box (`body`) stays level;
 * the carriage under it (`bogie`) tips with the track.
 *
 *  - the box: light aluminium panels with real openings, closed below and windows over the upper
 *    half: three on each long side with a small top-hung vent window over the middle one, four
 *    smaller ones in each end. Rounded
 *    posts at the corners, a dark seal along the roof's edge, a flat roof with a low hatch.
 *  - under it: a dark tray, narrower at the bottom, then the carriage with a bracket at each corner
 *    reaching round the rail, a wheel on top of the rail and a guide wheel under it.
 */
function buildCabin(material) {
    const cabin = new THREE.Group();
    const bogie = new THREE.Group();
    const body = new THREE.Group();
    cabin.add(bogie, body);
    const { length: L, width: W, height: H, base: B } = CAB;

    /* The carriage on the rails */
    const under = [box(2.3, 1.25, 0.3, 0, 0, 0.2, C.carriage, 0.06)];
    for (const x of [-0.8, 0.8]) {
        for (const s of [-1, 1]) {
            const y = s * TRUSS.rail;
            under.push(box(0.34, 0.09, 0.62, x, s * (TRUSS.rail + 0.13), -0.24, C.bracket, 0.03));   // the bracket, outside the rail
            under.push(box(0.34, 0.2, 0.08, x, y + s * 0.05, -0.24, C.bracket, 0.02));                  // its foot, under the rail
            const wheel = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12);
            wheel.translate(x, y, 0.26);
            under.push(paint(wheel, C.wheel));
            const guide = new THREE.CylinderGeometry(0.07, 0.07, 0.08, 10);
            guide.translate(x, y, -0.08);
            under.push(paint(guide, C.wheel));
        }
    }
    under.push(box(0.4, 0.3, 0.08, 0, 0.19, 0.12, C.wheel, 0.03));   // the drive, over the rack
    const bogieMesh = new THREE.Mesh(mergeGeometries(under), material);
    under.forEach((g) => g.dispose());
    bogie.add(bogieMesh);

    /* The box */
    const parts = [];
    // the dark tray under it, narrower at the bottom
    const tray = new THREE.CylinderGeometry(1, 0.78, 0.45, 4, 1);
    tray.rotateY(Math.PI / 4);
    tray.rotateX(Math.PI / 2);
    tray.scale((L - 0.1) / Math.SQRT2, (W - 0.1) / Math.SQRT2, 1);
    tray.translate(0, 0, B - 0.225);
    parts.push(paint(tray, C.carriage));
    parts.push(box(L - 0.02, W - 0.02, 0.06, 0, 0, B, C.panelDark));   // the floor's edge

    // the long sides: closed below, three windows over the upper half, a small top-hung vent over the middle one
    const sideW = L - 0.12, pane = (sideW - 0.36 - 2 * 0.07) / 3;
    const sides = [0, 1, 2].flatMap((k) => {
        const u0 = -sideW / 2 + 0.18 + k * (pane + 0.07), u1 = u0 + pane;
        return k === 1 ? [[u0, u1, 1.05, 1.72], [u0, u1, 1.78, 2.02]] : [[u0, u1, 1.05, 2.02]];
    });
    // the ends: four smaller windows, also only over the upper half
    const endW = W - 0.12, small = (endW - 0.32 - 3 * 0.07) / 4;
    const ends = [0, 1, 2, 3].map((k) => {
        const u0 = -endW / 2 + 0.16 + k * (small + 0.07);
        return [u0, u0 + small, 1.05, 2.02];
    });
    parts.push(faceTo(wallPanel(W - 0.12, H, ends, C.panel), '+x', B));
    parts.push(faceTo(wallPanel(W - 0.12, H, ends, C.panel), '-x', B));
    parts.push(faceTo(wallPanel(L - 0.12, H, sides, C.panel), '-y', B));
    parts.push(faceTo(wallPanel(L - 0.12, H, sides, C.panel), '+y', B));
    // the posts at the corners, over the walls' joins
    for (const x of [-1, 1]) for (const y of [-1, 1]) parts.push(box(0.16, 0.16, H, x * (L / 2 - 0.06), y * (W / 2 - 0.06), B, C.panel, 0.06));
    // the roof: a dark seal round its edge, the cap a little over, a low hatch
    parts.push(box(L + 0.03, W + 0.03, 0.06, 0, 0, B + H - 0.02, C.seal, 0.02));
    parts.push(box(L + 0.06, W + 0.06, 0.1, 0, 0, B + H + 0.04, C.roof, 0.04));
    parts.push(box(0.8, 0.65, 0.1, -0.45, 0, B + H + 0.14, C.panel, 0.04));
    const bodyMesh = new THREE.Mesh(mergeGeometries(parts), material);
    parts.forEach((g) => g.dispose());

    // the glass: a dark box just inside the walls, seen through the openings
    const glassMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.25 });
    const glass = new THREE.Mesh(glassBox(L - 0.2, W - 0.2, H - 0.05, B + 0.02), glassMaterial);
    body.add(bodyMesh, glass);

    // A small lamp on the roof: on while it rides, blinking when it has stopped on the way
    const lampMaterial = new THREE.MeshStandardMaterial({ color: C.lamp, emissive: C.lamp, emissiveIntensity: 0, roughness: 0.4 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), lampMaterial);
    lamp.position.set(0.6, 0, B + H + 0.2);
    body.add(lamp);

    for (const mesh of [bogieMesh, bodyMesh, lamp]) mesh.castShadow = mesh.receiveShadow = true;
    return { cabin, bogie, body, lampMaterial };
}

/* ---------- THE STATIONS ---------- */

/**
 * The hospital end, built facing -y round the point where the cabin docks and turned to face the
 * way the track leaves: the sand-coloured block by the road with its grey window bands, and hung
 * on its face the arrival house — a tall pale box, open at the bottom in front, where the track
 * comes in and the cabin waits — with a strip of yellow brick beside it.
 */
function hospitalStation(parts, at, heading) {
    const local = [];
    const back = 1.6;                         // the block's face, behind the cabin's middle
    const floor = at.z - 1.5;                 // the arrival house's floor, under the carriage
    // the block: a grey base, then sand panels with grey bands of windows. The arrival house is at
    // its right-hand end, out towards the road
    const bx = -9.5;
    local.push(box(26, 20, 4.2, bx, back + 10, 0, C.band));
    local.push(box(26, 20, 18.6, bx, back + 10, 4.2, C.sand));
    for (let z = 5.4; z < 22; z += 3.5) local.push(box(26.12, 20.12, 1.5, bx, back + 10, z, C.band));
    for (let z = 5.6; z < 22; z += 3.5) local.push(box(26.2, 20.2, 1.0, bx, back + 10, z + 0.12, C.window));
    local.push(box(26.3, 20.3, 0.45, bx, back + 10, 22.8, C.parapet));
    // the yellow brick beside the arrival house
    local.push(box(2.6, 1, 23.8, -4.9, back, 0, C.yellowBrick));
    // the arrival house: a tall pale box hung on the block, out towards the road, open at the bottom
    // in front where the track comes in; the cabin waits inside it
    const out = 4.2, half = 3.2, gap = 2.1, top = 23.6, low = floor - 1.1, lintel = at.z + 4.4;
    const mid = back - out / 2;
    for (const sx of [-1, 1]) local.push(box(half - gap, out, top - low, sx * (half + gap) / 2, mid, low, C.arrival));   // its two sides
    local.push(box(2 * half, out, floor - low, 0, mid, low, C.arrival));                                                  // under the opening
    local.push(box(2 * half, out, top - lintel, 0, mid, lintel, C.arrival));                                              // over it
    for (let z = lintel + 3; z < top - 0.5; z += 3) local.push(box(2 * half + 0.04, out + 0.04, 0.06, 0, mid, z, C.arrivalSeam));   // panel seams
    local.push(box(2 * half + 0.2, out + 0.2, 0.3, 0, mid, top, C.parapet));
    local.push(box(2 * gap, 0.1, lintel - floor, 0, back - 0.05, floor, C.dock));                                          // the dark inside, at the back
    const angle = Math.atan2(Math.cos(heading), -Math.sin(heading));   // local -y along the heading
    placed(parts, local, at.x, at.y, angle);
}

/** Regionshospitalet behind the station: the white slab, its end towers, the brown blocks, the parking deck, the old house */
function hospital(parts, rand) {
    // the long white slab, its long face to the road, brown ribbon windows; taller white towers at its ends
    block(parts, { x0: -64, x1: -46, y0: 4, y1: 96, z1: 40, hex: C.white, windows: { first: 4.4, every: 3.1, height: 1.0, hex: C.brown } });
    parts.push(box(18.6, 92.6, 3.6, -55, 50, 0, C.band));
    parts.push(box(10, 12, 44, -50, 92, 0, C.white), box(10, 12, 44, -58, 8, 0, C.white));
    parts.push(box(1.2, 12.2, 40, -45.4, 92, 2, C.brown), box(1.2, 12.2, 40, -53.4, 8, 2, C.brown));   // the dark slit up each tower
    parts.push(box(10.4, 12.4, 0.5, -50, 92, 44, C.parapet), box(10.4, 12.4, 0.5, -58, 8, 44, C.parapet));
    parts.push(box(8, 14, 2.4, -56, 60, 40, C.band), box(6, 6, 3, -54, 30, 40, C.band));               // plant on the roof
    // the dark brown blocks beside the station's block
    block(parts, { x0: -44, x1: -26, y0: -26, y1: -4, z1: 18, hex: C.bronze, windows: { first: 1.4, every: 3.4, height: 1.3, hex: C.bronzeLight } });
    block(parts, { x0: -45, x1: -27, y0: -4, y1: 20, z1: 21, hex: C.bronze, windows: { first: 1.4, every: 3.4, height: 1.3, hex: C.bronzeLight } });
    // a low glass link from the station's block to the slab
    parts.push(box(18, 8, 7, -36, 28, 0, C.balcony));
    // the parking deck in front of the slab, with a few cars on it
    parts.push(box(32, 34, 4.2, -18, 62, 0, C.deck));
    parts.push(box(32.4, 34.4, 0.6, -18, 62, 4.2, C.concrete));
    for (let k = 0; k < 9; k++) parts.push(box(0.15, 5, 0.04, -30 + k * 3, 52, 4.8, C.line), box(0.15, 5, 0.04, -30 + k * 3, 72, 4.8, C.line));
    for (const [x, y, k] of [[-28.5, 52, 0], [-22.5, 52, 2], [-13.5, 52, 4], [-25.5, 72, 1], [-10.5, 72, 3], [-4.5, 72, 0]]) {
        const car = carGeometry(C.cars[k]);
        car.translate(x, y, 4.8);
        parts.push(car);
    }
    parts.push(box(6, 14, 0.5, 2.5, 62, 0, C.road));   // the ramp
    // the old yellow house: walls, a mansard roof, dormers
    const local = [box(26, 15, 9, 0, 0, 0, C.yellow), box(26.6, 15.6, 0.5, 0, 0, 9, C.trim)];
    const mansard = new THREE.CylinderGeometry(0.62, 1, 1, 4, 1);
    mansard.rotateY(Math.PI / 4);
    mansard.rotateX(Math.PI / 2);
    mansard.scale(26.6 / Math.SQRT2, 15.6 / Math.SQRT2, 6);
    mansard.translate(0, 0, 12.5);
    local.push(paint(mansard, C.slate));
    for (const side of [-1, 1]) for (let x = -10; x <= 10; x += 4) local.push(box(1.4, 1, 1.8, x, side * 6.2, 10.2, C.trim, 0.1));
    for (const side of [-1, 1]) for (let x = -11; x <= 11; x += 2.75) for (const z of [1.2, 5]) local.push(box(1.1, 0.12, 2, x, side * 7.5, z, C.window));
    placed(parts, local, -32, 96, Math.PI / 2 + (rand() - 0.5) * 0.05);
}

/** A point block: a pale tower with balconies on two faces */
function pointBlock(parts, x, y, w, d, h, hex) {
    block(parts, { x0: x - w / 2, x1: x + w / 2, y0: y - d / 2, y1: y + d / 2, z1: h, hex, windows: { first: 1.2, every: 3, height: 1.4, hex: C.window } });
    for (let z = 3; z < h - 1; z += 3) {
        parts.push(box(w * 0.5, 1.6, 0.2, x - w * 0.2, y - d / 2 - 0.8, z, C.parapet), box(w * 0.5, 0.08, 1, x - w * 0.2, y - d / 2 - 1.55, z + 0.2, C.balcony));
        parts.push(box(1.6, d * 0.5, 0.2, x - w / 2 - 0.8, y + d * 0.2, z, C.parapet), box(0.08, d * 0.5, 1, x - w / 2 - 1.55, y + d * 0.2, z + 0.2, C.balcony));
    }
}

/**
 * The other end, at the patient hotel, from photos and simplified: a slim tower in grey zinc, its
 * gable to the track. Down the middle of the gable runs all the glass — a strip from the door at the
 * bottom to the top — and on it, where the track comes in, the white station box is mounted, a
 * little out from the gable; the track runs right up to it. The hotel, long and pale with balconies,
 * stands against the tower's far side.
 *
 * `face` is where the track ends, on the station box; `at` where the cabin stops.
 */
function farStation(parts, face, at) {
    const out = 1.4;                                // how far the box stands out from the gable
    const x0 = face.x + out, depth = 9, width = 11, high = 28;
    const y0 = at.y - width / 2, cy = at.y;         // the gable is centred on the track
    parts.push(box(depth, width, high, x0 + depth / 2, cy, 0, C.slate));
    for (let z = 0.9; z < high; z += 0.9) parts.push(box(depth + 0.04, width + 0.04, 0.05, x0 + depth / 2, cy, z, C.slateLight));   // the zinc's seams
    parts.push(box(depth + 0.3, width + 0.3, 0.45, x0 + depth / 2, cy, high, C.parapet));
    parts.push(box(0.2, 1.6, high, x0 - 0.05, y0 + width - 0.8, 0, C.slateLight));   // a paler strip at its far corner
    // the glass down the middle of the gable, in a pale frame, from the door to the top
    const gw = 3.4;
    parts.push(box(0.12, gw, high - 3.4, x0 - 0.02, cy, 3, C.glass));
    for (let z = 3 + 3.1; z < high - 0.6; z += 3.1) parts.push(box(0.16, gw, 0.14, x0 - 0.05, cy, z, C.station));
    for (const s of [-1, 1]) parts.push(box(0.2, 0.16, high - 0.4, x0 - 0.06, cy + s * gw / 2, 0, C.station));
    parts.push(box(0.16, 0.12, high - 3.4, x0 - 0.05, cy, 3, C.station));                   // the mullion
    parts.push(box(0.12, gw - 0.6, 2.6, x0 - 0.02, cy, 0, C.dock));                          // the door
    parts.push(box(1.4, gw + 0.4, 0.15, x0 - 0.7, cy, 2.9, C.station));                     // under a canopy
    // the station box, mounted on the glass where the track comes in: closed below, windows above
    const top = at.z + 3.9, bottom = at.z - 1.7, sill = at.z + 0.9, bw = 4.4;
    parts.push(box(out, bw, sill - bottom, face.x + out / 2, cy, bottom, C.station));
    parts.push(box(out - 0.15, bw - 0.2, top - sill, face.x + out / 2 + 0.07, cy, sill, C.glass));
    parts.push(box(out, bw, 0.4, face.x + out / 2, cy, top - 0.4, C.station));
    for (const s of [-1, 1]) parts.push(box(0.3, 0.3, top - sill, face.x + 0.15, cy + s * (bw / 2 - 0.15), sill, C.station));
    parts.push(box(0.12, 3.4, sill - bottom - 0.3, face.x - 0.02, cy, at.z - 1.4, C.dock));   // the opening the cabin docks in
    // the patient hotel against it: long and pale, balconies on its front
    const hx0 = x0 + depth, hx1 = hx0 + 32, hy0 = y0 - 1.2, hy1 = hy0 + 15, hh = 26;
    block(parts, { x0: hx0, x1: hx1, y0: hy0, y1: hy1, z1: hh, hex: C.sand, windows: { first: 1.2, every: 3, height: 1.4, hex: C.window } });
    for (let z = 3; z < hh - 1; z += 3) for (let x = hx0 + 5; x < hx1 - 2; x += 7) {
        parts.push(box(4.4, 1.6, 0.2, x, hy0 - 0.8, z, C.parapet), box(4.4, 0.08, 1, x, hy0 - 1.55, z + 0.2, C.balcony));
    }
    // pale point blocks round it
    pointBlock(parts, x0 + 14, at.y - 22, 15, 15, 24, C.pale);
    pointBlock(parts, x0 + 4, at.y + 40, 14, 14, 21, C.pale);
}

/* ---------- THE TRAFFIC ---------- */


/** A small, rounded car pointing along +y */
function carGeometry(hex) {
    const parts = [
        box(1.8, 3.9, 0.78, 0, 0, 0.3, hex, 0.28),
        box(1.6, 2.1, 0.68, 0, -0.2, 0.98, C.glass, 0.24),
        box(1.64, 1.7, 0.1, 0, -0.2, 1.62, hex, 0.04),
    ];
    for (const x of [-0.82, 0.82]) for (const y of [-1.25, 1.25]) {
        const wheel = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10);
        wheel.rotateZ(Math.PI / 2);
        wheel.translate(x, y, 0.34);
        parts.push(paint(wheel, C.wheel));
    }
    const g = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    return g;
}

/* ---------- THE SIGN ---------- */

function signTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = C.signBlue;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 92px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', 64, 70);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/* ---------- ALL OF IT ---------- */

export function buildHoejbane({ look = 'pale' } = {}) {
    C = look === 'dark' ? DARK : PALE;
    const group = new THREE.Group();
    const rand = random(53);
    const haze = {
        uniforms: {
            uHaze: { value: new THREE.Color('#dcdcd4') },
            uBack: { value: new THREE.Color('#dcdcd4') },
            uToPlace: { value: new THREE.Matrix4() },
            uHazeCentre: { value: new THREE.Vector2(...HAZE.centre) },
            uHazeRange: { value: new THREE.Vector2(HAZE.near, HAZE.far) },
        },
    };
    const material = hazed(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }), haze);

    const curve = trackCurve();
    const stop = 1 - DOCK / curve.getLength();       // where along the curve the cabin stops at the far end (p = 1)
    const start = frameAt(curve, 0), end = frameAt(curve, stop);

    /* The ground, the road and the pavements */
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), hazed(new THREE.MeshStandardMaterial({ color: C.grass, roughness: 1, metalness: 0 }), haze));
    ground.receiveShadow = true;
    group.add(ground);

    const parts = [];
    const { x: rx, width: rw, walk, length: L } = ROAD;
    parts.push(box(rw, L, 0.04, rx, 0, 0, C.road));
    for (const s of [-1, 1]) {
        parts.push(box(walk, L, 0.16, rx + s * (rw / 2 + walk / 2), 0, 0, C.walk));
        parts.push(box(0.3, L, 0.2, rx + s * (rw / 2 + 0.15), 0, 0, C.curb));
        parts.push(box(0.15, L, 0.05, rx + s * (rw / 2 - 0.6), 0, 0, C.line));
    }
    for (let y = -L / 2; y < L / 2; y += 9) parts.push(box(0.18, 4, 0.05, rx, y, 0, C.line));
    // a zebra crossing a little way down the road
    for (let k = -4; k <= 4; k++) parts.push(box(0.55, 3, 0.05, rx + k * 1.2, -34, 0, C.line));
    // the hospital's drive, in from the left
    parts.push(box(rx - rw / 2 - walk + 12, 8, 0.04, (rx - rw / 2 - walk - 12) / 2, -40, 0, C.road));

    /* Regionshospitalet, and the station in the block by the road */
    hospital(parts, rand);
    hospitalStation(parts, start.p, Math.atan2(start.along.y, start.along.x));

    // the wall along the drive, and steps up it; a bit of lawn on the slope in front of the hospital
    parts.push(box(22, 1.2, 3.4, -10, -16.6, 0, C.concrete));
    for (let k = 0; k < 7; k++) parts.push(box(2.4, 0.5, 0.48 * (k + 1), 2.6, -17.8 + k * 0.5, 0, C.concrete));
    parts.push(box(32, 12, 0.1, -6, -29, 0, C.verge));

    /* The other side, and red-brick houses behind */
    farStation(parts, frameAt(curve, 1).p, end.p);
    house(parts, 42, 58, 14, 9, 6.5, 4.6);
    house(parts, 60, 66, 12, 9, 6.5, 4.8);
    house(parts, 88, 40, 16, 10, 7, 5, Math.PI / 2);
    house(parts, 96, 8, 13, 9, 6.5, 4.6, Math.PI / 2);
    house(parts, -86, 30, 14, 9, 6.5, 4.6, Math.PI / 2);
    house(parts, -88, 60, 14, 9, 6.5, 4.6, Math.PI / 2);
    house(parts, -84, -10, 12, 9, 6.5, 4.6, Math.PI / 2);

    /* The track and its columns */
    buildTrack(parts, curve);
    for (const [x, y] of COLUMNS) column(parts, curve, x, y);

    /* Lamp posts along the road, leaning their arms over it */
    for (const s of [-1, 1]) {
        for (let y = -150; y <= 150; y += 26) {
            const x = rx + s * (rw / 2 + 0.6);
            parts.push(rod(new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y, 9), 0.11, C.pole, 6, 0.08));
            parts.push(rod(new THREE.Vector3(x, y, 9), new THREE.Vector3(x - s * 1.6, y, 9.3), 0.06, C.pole, 5));
            parts.push(box(0.7, 0.3, 0.16, x - s * 1.9, y, 9.15, C.pole, 0.06));
        }
    }

    /* The hospital sign by the drive */
    parts.push(rod(new THREE.Vector3(14.6, -20, 0), new THREE.Vector3(14.6, -20, 2.3), 0.05, C.pole, 6));
    parts.push(box(0.9, 0.08, 1.1, 14.6, -20.02, 1.9, C.trim));

    /* Trees: big round ones along the road, a group in front of the hospital, some on the far side */
    const wood = [];
    const tree = (x, y, h, kind = rand() < 0.75 ? 'beech' : 'birch') => toyTree(kind, new THREE.Vector3(x, y, 0), h, rand, wood);
    for (const s of [-1, 1]) {
        for (let y = -130; y <= 140; y += rand.range(9, 13)) {
            if (Math.abs(y - BEND.y) < 9) continue;                                    // none right under the track
            tree(rx + s * (rw / 2 + walk + 2.6 + rand() * 2), y, rand.range(11, 15), 'beech');
        }
    }
    for (const [x, y, h] of [[-2, -14, 12], [6, -15, 12], [-8, -26, 12], [2, -30, 13], [9, -22, 12], [-16, -32, 11], [-20, 4, 11], [-2, 10, 11], [6, 16, 12], [8, 34, 13], [10, 84, 12]]) tree(x, y, h, 'beech');
    for (const [x, y, h] of [[40, 16, 12], [38, 30, 13], [38, -20, 12], [44, -36, 14], [80, -18, 13], [100, -30, 13], [30, 48, 14], [84, 22, 10]]) tree(x, y, h);
    for (let k = 0; k < 26; k++) {
        const x = rand.range(-60, 90), y = rand.range(-110, -50);
        if (Math.abs(x - rx) < rw / 2 + walk + 2) continue;
        tree(x, y, rand.range(9, 14));
    }
    // low hedges along the hospital's drive and the wall
    for (let x = -30; x < 12; x += 2.4) toyTree('bush', new THREE.Vector3(x, -18.6 - rand() * 0.6, 0), 2.2, rand, wood);

    /* The town round it all, out into the haze */
    outskirts(parts, wood, rand);

    if (C.leaves) wood.forEach((g) => greyTree(g, rand));
    const merged = mergeGeometries([...parts, ...wood]);
    parts.forEach((g) => g.dispose());
    wood.forEach((g) => g.dispose());
    const scenery = new THREE.Mesh(merged, material);
    scenery.castShadow = scenery.receiveShadow = true;
    group.add(scenery);

    const sign = signTexture();
    const signFace = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 }));
    signFace.rotation.x = Math.PI / 2;            // facing -y, the way people come
    signFace.position.set(14.6, -20.07, 2.45);
    group.add(signFace);

    /* The cabin */
    const { cabin, bogie, body, lampMaterial } = buildCabin(material);
    group.add(cabin);
    let lastP = -1, lastLamp = -1;
    const setCabin = (p, lamp = 0, t = 0) => {
        const at = THREE.MathUtils.clamp(p, 0, 1);
        if (at !== lastP) {
            const { p: point, along } = frameAt(curve, at * stop);
            cabin.position.copy(point);
            cabin.rotation.z = Math.atan2(along.y, along.x);
            bogie.rotation.y = -Math.asin(THREE.MathUtils.clamp(along.z, -1, 1));
            lastP = at;
        }
        // stuck on the way: the lamp blinks and the box rocks a little on its carriage
        body.rotation.x = lamp === 2 ? Math.sin(t * 2.2) * 0.012 : 0;
        const glow = lamp === 1 ? 1.6 : lamp === 2 ? (Math.sin(t * 6) > 0 ? 2.2 : 0) : 0;
        if (glow !== lastLamp) { lampMaterial.emissiveIntensity = glow; lastLamp = glow; }
    };
    setCabin(0);

    /* The traffic: a few small cars up and down the road */
    const cars = Array.from({ length: 7 }, (_, i) => {
        const mesh = new THREE.Mesh(carGeometry(C.cars[i % C.cars.length]), material);
        mesh.castShadow = mesh.receiveShadow = true;
        const way = i % 2 ? 1 : -1;                   // drive on the right
        mesh.position.set(rx + way * 2.9, -300 + rand() * 600, 0);
        mesh.rotation.z = way > 0 ? 0 : Math.PI;
        group.add(mesh);
        return { mesh, way, speed: rand.range(8, 11) };
    });
    const update = (dt, still = false) => {
        if (still) return;
        for (const car of cars) {
            car.mesh.position.y += car.way * car.speed * dt;
            if (car.mesh.position.y > 320) car.mesh.position.y -= 640;
            if (car.mesh.position.y < -320) car.mesh.position.y += 640;
        }
    };

    const centre = new THREE.Vector3(8, 16, 10);
    return {
        group,
        size: 88,
        centre,
        cabinAt: (p) => frameAt(curve, THREE.MathUtils.clamp(p, 0, 1) * stop).p,
        setCabin,
        update,
        /** The haze's colour and the background's, and where the place is now (call after it has been moved, before drawing) */
        haze(colour, back = colour) {
            haze.uniforms.uHaze.value.copy(colour);
            haze.uniforms.uBack.value.copy(back);
            group.updateWorldMatrix(true, false);
            haze.uniforms.uToPlace.value.copy(group.matrixWorld).invert();
        },
        dispose() {
            sign.dispose();
        },
    };
}
