/**
 * Højbanen in Viborg — the horizontal lift between the hospital's buildings, over Heibergs Allé —
 * built in code for 53 sekunder til fælles: soft low-poly forms, faceted, no textures; the trees,
 * houses, blocks and the haze from the kit (src/player/kit/), in the 3D style (STIL.md).
 *
 * Built from photos, not from drawings, so the sizes are guesses at the right proportions:
 *
 *  - The track is level all the way, about 15 m up: out of the hospital parallel to the road, round
 *    a wide bend — a rounded L — and straight over the road. A deep steel lattice, zigzag on the
 *    sides and on top, a grating walkway down the middle with the rails and the toothed rack beside
 *    it, a handrail tube along each side. Pale round columns hold it, with struts from a cross-head.
 *  - The hospital end: the arrival house, a tall pale box hung on the gable of the
 *    sand-coloured block by the road, at its corner (sand panels, grey window bands), open at the bottom where the track comes in; the cabin
 *    waits inside it.
 *    Behind it Regionshospitalet: the long white slab with its brown ribbon windows and the taller
 *    white towers at its ends, the dark brown blocks beside it, the parking deck in front, and the
 *    old yellow house with its mansard roof.
 *  - The other end, at the patient hotel: a slim tower in grey zinc, its gable to the track with all
 *    the glass in a strip down the middle of it, the track running right up to it; the long pale
 *    hotel with balconies against it.
 *  - Three columns: by the arrival house, and one on each side of the road.
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
 *   haze(colour, back),         the haze's colour and what lies behind; also tells it where the place is (every frame)
 *   dispose()
 * }}
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { random } from '@/player/kit/random';
import { box, rod, band, paint, placed, colour } from '@/player/kit/shapes';
import { tree as kitTree, TREES } from '@/player/kit/trees';
import { houses, houseAt, block as kitBlock } from '@/player/kit/houses';
import { createHazeAround, hazedAround as hazed } from '@/player/kit/haze';
import { GREYS, zinc, EDGES } from '@/player/kit/style';

const Z = new THREE.Vector3(0, 0, 1);

/* ---------- THE PLACE ---------- */

const ROAD = { x: 24, width: 12, walk: 3.6, length: 900 };   // Heibergs Allé, running along y

// The lattice track, metres from the rails' line: chords on top and under, the walkway, rails, handrails
const TRUSS = { half: 0.85, bottomHalf: 0.6, depth: 1.6, panel: 1.7, walk: 0.55, rail: 0.5, hand: 0.95, handUp: 0.45 };

// The track's line, level at HEIGHT: from the hospital along the road (x = BEND.x), round the bend
// (a quarter circle), and straight over the road (y = BEND.y) to the other side
const HEIGHT = 15;
// The sand-coloured block at the hospital end, by the road: the arrival house hangs on its gable (x1)
const HOSPITAL_SHIFT = -8;   // metres the whole hospital stands moved along x (to the left, away from the road)
const SAND = { x0: -27 + HOSPITAL_SHIFT, x1: -1 + HOSPITAL_SHIFT, y0: 21.6, y1: 41.6 };
const BEND = { x: SAND.x1 + 3.2, y: -6, radius: 12, from: SAND.y0 + 2.1, to: 50.6 };   // from: the hospital's station (y); to: the other side's (x), where the cabin stops
const DOCK = 1.55;   // metres on from where the cabin stops at the other side to the building's face: the track runs right up to it

// Where the columns stand (x, y): the nearest point of the track is above each
const COLUMNS = [[SAND.x1 + 3.2, 13], [13.6, -6], [35.8, -6]];   // three: by the arrival house, on each side of the road

/* ---------- COLOURS ---------- */

const C = {
    // the 3D style (kit/style.js): the ground, the streets muted (no markings), the track a step lighter as
    // the landmark, the buildings in the walls' and roofs' steps, the cabin white as the sound
    grass: GREYS.ground, verge: zinc(825), road: GREYS.streets, line: GREYS.streets, walk: GREYS.paths, curb: GREYS.sideStreets,
    steel: GREYS.landmarkRoof, grating: GREYS.landmark, rack: zinc(650), handrail: GREYS.landmarkRoof, column: GREYS.landmark, foot: zinc(650),
    panel: GREYS.sound, panelDark: zinc(300), roof: zinc(200), seal: zinc(775), bracket: zinc(500), glass: zinc(775), carriage: zinc(750), wheel: zinc(825), lamp: GREYS.sound,
    peach: zinc(650), sand: zinc(600), band: zinc(700), window: zinc(750), ribbon: zinc(775), concrete: zinc(700), parapet: zinc(600),
    clad: zinc(650), cladLight: zinc(600), yellowBrick: zinc(600), dock: GREYS.ground, greyBlock: zinc(700),
    slate: GREYS.roofs[0], slateLight: zinc(700), station: GREYS.landmark,
    white: zinc(600), brown: zinc(700), bronze: zinc(725), bronzeLight: zinc(650), deck: zinc(700), yellow: zinc(700),
    paleCool: zinc(700), pale: zinc(725), balcony: zinc(650), brick: GREYS.walls[0], tiles: GREYS.roofs[1], trim: zinc(650),
    pole: zinc(650), signBlue: zinc(600), arrival: GREYS.landmark, arrivalSeam: zinc(575),
    glassLow: zinc(875), glassHigh: zinc(700),
    leaves: GREYS.leaves, trunk: GREYS.trunk,
};


/* ---------- BUILDING BLOCKS ---------- */

/* ---------- FROM THE KIT ---------- */

/** A gabled house (kit/houses.js), its ridge along x unless turned, in the style's brick and tiles */
function house(parts, x, y, w, d, h, roof, turn = 0, wall = C.brick, tiles = C.tiles) {
    parts.push(houses([houseAt({ x, y, w, d, turn, height: h, ridge: roof, wall, roof: tiles })]));
}

/** A block of flats (kit/houses.js) with its parapet */
const block = (parts, options) => kitBlock(parts, { parapetHex: C.parapet, ...options });

/** A tree or a bush (kit/trees.js) */
const toyTree = (kind, base, h, rand, out) => kitTree(kind, base, h, rand, out, TREES);

/* ---------- THE TOWN ROUND IT, AND THE HAZE IT FADES INTO ---------- */

// Where the town thins into the haze: everything is haze-coloured by HAZE.far metres from HAZE.centre
const HAZE = { centre: [18, 20], near: 15, far: 170 };   // begins close, fades out slowly
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
    const glassMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
    const glass = new THREE.Mesh(glassBox(L - 0.2, W - 0.2, H - 0.05, B + 0.02), glassMaterial);
    body.add(bodyMesh, glass);

    // A small lamp on the roof: on while it rides, blinking when it has stopped on the way
    const lampMaterial = new THREE.MeshLambertMaterial({ color: C.lamp, emissive: C.lamp, emissiveIntensity: 0 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), lampMaterial);
    lamp.position.set(0.6, 0, B + H + 0.2);
    body.add(lamp);

    for (const mesh of [bogieMesh, bodyMesh, lamp]) mesh.castShadow = mesh.receiveShadow = true;
    return { cabin, bogie, body, lampMaterial };
}

/* ---------- THE STATIONS ---------- */

/**
 * The hospital end: the sand-coloured block by the road (SAND), with its grey window bands, and on
 * its gable — the narrow end, to the road — the arrival house: a tall pale box hung on the gable,
 * open at the bottom in front, where the track comes in and the cabin waits; a strip of yellow brick
 * on the gable behind it. The box is built facing -y round the point where the cabin waits, turned
 * to face the way the track leaves.
 */
function hospitalStation(parts, at, heading) {
    // the block, where it stands
    const { x0, x1, y0, y1 } = SAND, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = x1 - x0, d = y1 - y0;
    parts.push(box(w, d, 4.2, cx, cy, 0, C.band));
    parts.push(box(w, d, 18.6, cx, cy, 4.2, C.sand));
    for (let z = 5.4; z < 22; z += 3.5) parts.push(box(w + 0.12, d + 0.12, 1.5, cx, cy, z, C.band));
    for (let z = 5.6; z < 22; z += 3.5) parts.push(box(w + 0.2, d + 0.2, 1.0, cx, cy, z + 0.12, C.window));
    parts.push(box(w + 0.3, d + 0.3, 0.45, cx, cy, 22.8, C.parapet));

    // the arrival house on the gable: its sides, the part under the opening and over it, its back
    const local = [];
    const floor = at.z - 1.5;                 // its floor, under the carriage
    const front = -2.6, back = 3.4, half = 3.2, gap = 2.1, top = 23.6, low = floor - 1.1, lintel = at.z + 4.4;
    const out = back - front, mid = (front + back) / 2;
    for (const sx of [-1, 1]) local.push(box(half - gap, out, top - low, sx * (half + gap) / 2, mid, low, C.arrival));
    local.push(box(2 * half, out, floor - low, 0, mid, low, C.arrival));
    local.push(box(2 * half, out, top - lintel, 0, mid, lintel, C.arrival));
    local.push(box(2 * half, 0.4, top - low, 0, back - 0.2, low, C.arrival));
    for (let z = lintel + 3; z < top - 0.5; z += 3) local.push(box(2 * half + 0.04, out + 0.04, 0.06, 0, mid, z, C.arrivalSeam));   // panel seams
    local.push(box(2 * half + 0.2, out + 0.2, 0.3, 0, mid, top, C.parapet));
    local.push(box(2 * gap, 0.1, lintel - floor, 0, back - 0.45, floor, C.dock));   // the dark inside, behind the cabin
    const angle = Math.atan2(Math.cos(heading), -Math.sin(heading));   // local -y along the heading
    placed(parts, local, at.x, at.y, angle);
    // the yellow brick on the gable, just behind it
    parts.push(box(0.4, 2.6, 23.8, x1 + 0.2, at.y + back + 1.3, 0, C.yellowBrick));
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
    // the parking deck in front of the slab
    parts.push(box(32, 34, 4.2, -18, 62, 0, C.deck));
    parts.push(box(32.4, 34.4, 0.6, -18, 62, 4.2, C.concrete));
    for (let k = 0; k < 9; k++) parts.push(box(0.15, 5, 0.04, -30 + k * 3, 52, 4.8, C.line), box(0.15, 5, 0.04, -30 + k * 3, 72, 4.8, C.line));
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
 * bottom to the top — and the track runs right up to it, the cabin docking at an opening in the
 * glass. The hotel, long and pale with balconies, stands against the tower's far side.
 *
 * `face` is where the track ends, on the gable; `at` where the cabin stops.
 */
function farStation(parts, face, at) {
    const x0 = face.x, depth = 9, width = 11, high = 28;
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
    parts.push(box(0.12, gw, 4.8, x0 - 0.04, cy, at.z - 1.4, C.dock));   // the opening in the glass where the cabin docks
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

export function buildHoejbane() {
    const group = new THREE.Group();
    const rand = random(53);
    const haze = createHazeAround(HAZE);   // the scene sets its colours with the weather
    const material = hazed(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), haze);   // the style's one material

    const curve = trackCurve();
    const stop = 1 - DOCK / curve.getLength();       // where along the curve the cabin stops at the far end (p = 1)
    const start = frameAt(curve, 0), end = frameAt(curve, stop);

    /* The ground, the road and the pavements */
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), hazed(new THREE.MeshLambertMaterial({ color: C.grass }), haze));
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
    const hospitalParts = [];
    hospital(hospitalParts, rand);
    for (const g of hospitalParts) { g.translate(HOSPITAL_SHIFT, 0, 0); parts.push(g); }
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

    const built = mergeGeometries(parts);
    const merged = mergeGeometries([built, ...wood]);
    parts.forEach((g) => g.dispose());
    wood.forEach((g) => g.dispose());
    const scenery = new THREE.Mesh(merged, material);
    scenery.castShadow = scenery.receiveShadow = true;
    group.add(scenery);
    // the style's faint edges on what is built (not the trees), in the haze like the rest
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(built, EDGES.angle),
        hazed(new THREE.LineBasicMaterial({ color: GREYS.edge, transparent: true, opacity: EDGES.buildings, depthWrite: false }), haze));
    edges.renderOrder = 1;
    group.add(edges);
    built.dispose();

    const sign = signTexture();
    const signFace = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshLambertMaterial({ map: sign }));
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

    const centre = new THREE.Vector3(8, 16, 10);
    return {
        group,
        size: 88,
        centre,
        cabinAt: (p) => frameAt(curve, THREE.MathUtils.clamp(p, 0, 1) * stop).p,
        setCabin,
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
