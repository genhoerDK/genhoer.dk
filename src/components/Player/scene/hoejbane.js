/**
 * Højbanen in Viborg — the horizontal lift between the hospital's buildings, over Heibergs Allé —
 * built in code for 53 sekunder til fælles, in the same pale, simple look as Kanon i G3: soft
 * low-poly forms in muted colours, faceted, no textures, the trees from scene/forest.js.
 *
 * Built from photos, not from drawings, so the sizes are guesses at the right proportions: a steel
 * lattice track, about 1.5 m wide, leaves the glass lift tower in front of the hospital at about
 * 9 m, sweeps out and up in a curve round a tall column, and runs straight and level at about
 * 17 m over the road to the building on the other side. The cabin is a white box with a band of
 * windows on a dark carriage; it stays level while the carriage under it tips with the track.
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
const TRUSS = { half: 0.75, bottomHalf: 0.55, depth: 1.25, panel: 1.6 };   // the lattice track
const COLUMNS = [1, 14, 35, 49];                             // where the columns stand (x), under the track

// The track's line: out of the lift tower, out and up round the curve, level over the road to the other side
const TRACK = [
    [-18, 4.4, 9], [-17.3, 0.6, 9.6], [-14.5, -2.8, 11], [-9.5, -5, 13], [-3, -5.4, 15],
    [4, -4.6, 16.6], [12, -3.6, 17.4], [24, -3, 17.5], [40, -2.4, 17.5], [56.4, -2, 17.5],
];

/* ---------- COLOURS: muted, a little warm, as in Kanon i G3 ---------- */

const C = {
    grass: '#a4aa84', verge: '#9aa07a', road: '#a3a39e', line: '#f2f0e8', walk: '#d3cec3', curb: '#e3dfd6',
    steel: '#7d8387', column: '#a2a7a9', foot: '#bdb9b0',
    cabin: '#f3f1eb', roof: '#e3e0d8', glass: '#56646f', carriage: '#41474b', wheel: '#2f3336', lamp: '#ffcf7a',
    bronze: '#8b6d59', sand: '#dccfb6', window: '#66737e', ribbon: '#525f6a', concrete: '#bcb8ae', parapet: '#ece8df',
    tower: '#cfd9dc', mullion: '#f1efea', dock: '#4f5961',
    pale: '#e4e0d8', balcony: '#b7c7cd', brick: '#b7735d', tiles: '#6f5a52', trim: '#efe9df',
    pole: '#a5aaad', signBlue: '#3f6fa6',
};
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
function house(parts, x, y, w, d, h, roof, turn = 0) {
    const local = [];
    local.push(box(w, d, h, 0, 0, 0, C.brick));
    const shape = new THREE.Shape([new THREE.Vector2(-d / 2 - 0.4, 0), new THREE.Vector2(d / 2 + 0.4, 0), new THREE.Vector2(0, roof)]);
    const prism = new THREE.ExtrudeGeometry(shape, { depth: w + 0.6, bevelEnabled: false });
    prism.rotateX(Math.PI / 2);             // the triangle stands up; extruded along -y
    prism.rotateZ(Math.PI / 2);             // ridge along x
    prism.translate(-(w + 0.6) / 2, 0, h);
    local.push(paint(prism, C.tiles));
    // two rows of small windows on the long sides, white-framed
    for (const side of [-1, 1]) {
        for (let k = 0; k < Math.floor(w / 2.6); k++) {
            const wx = -w / 2 + 1.4 + k * 2.6;
            for (const wz of [0.9, h - 2]) local.push(box(1.1, 0.12, 1.2, wx, side * (d / 2 + 0.02), wz, k % 2 ? C.ribbon : C.window));
        }
    }
    for (const g of local) { g.rotateZ(turn); g.translate(x, y, 0); parts.push(g); }
}

/* ---------- THE TRACK ---------- */

/** The lattice track along the curve: two rails on top, two chords under, zigzag sides, ties across */
function buildTrack(parts, curve) {
    const n = Math.max(8, Math.round(curve.getLength() / TRUSS.panel));
    const rows = { topL: [], topR: [], botL: [], botR: [] };
    for (let i = 0; i <= n; i++) {
        const { p, side, up } = frameAt(curve, i / n);
        rows.topL.push(p.clone().addScaledVector(side, -TRUSS.half));
        rows.topR.push(p.clone().addScaledVector(side, TRUSS.half));
        rows.botL.push(p.clone().addScaledVector(side, -TRUSS.bottomHalf).addScaledVector(up, -TRUSS.depth));
        rows.botR.push(p.clone().addScaledVector(side, TRUSS.bottomHalf).addScaledVector(up, -TRUSS.depth));
    }
    // The four chords
    for (const [key, r] of [['topL', 0.1], ['topR', 0.1], ['botL', 0.085], ['botR', 0.085]]) {
        const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rows[key]), n * 2, r, 6, false);
        parts.push(paint(tube, C.steel));
    }
    // The sides: a post at every panel and a diagonal across it, turning the other way each time; ties under and over
    for (let i = 0; i <= n; i++) {
        for (const [top, bot] of [['topL', 'botL'], ['topR', 'botR']]) {
            parts.push(rod(rows[top][i], rows[bot][i], 0.045, C.steel, 5));
            if (i < n) parts.push(i % 2 ? rod(rows[top][i], rows[bot][i + 1], 0.04, C.steel, 5) : rod(rows[bot][i], rows[top][i + 1], 0.04, C.steel, 5));
        }
        parts.push(rod(rows.botL[i], rows.botR[i], 0.04, C.steel, 5));
        if (i % 2 === 0) parts.push(rod(rows.topL[i], rows.topR[i], 0.05, C.steel, 5));
    }
}

/** The track's frame at t: the point on the rails, the way along, sideways (level) and up */
function frameAt(curve, t) {
    const p = curve.getPointAt(t);
    const along = curve.getTangentAt(t);
    const side = new THREE.Vector3().crossVectors(along, Z).normalize();
    const up = new THREE.Vector3().crossVectors(side, along).normalize();
    return { p, along, side, up };
}

/** A column under the track where it passes x: a tapered pole on a footing, a cross-head under the truss */
function column(parts, curve, x) {
    let best = 0, bestGap = Infinity;
    for (let i = 0; i <= 400; i++) {
        const gap = Math.abs(curve.getPointAt(i / 400).x - x);
        if (gap < bestGap) { bestGap = gap; best = i / 400; }
    }
    const { p, side, up } = frameAt(curve, best);
    const under = p.clone().addScaledVector(up, -TRUSS.depth - 0.1);
    parts.push(box(1.6, 1.6, 0.35, under.x, under.y, 0, C.foot, 0.12));
    parts.push(rod(new THREE.Vector3(under.x, under.y, 0.3), new THREE.Vector3(under.x, under.y, under.z - 0.35), 0.44, C.column, 12, 0.32));
    // the cross-head: a short beam across the track, the truss sits on it
    parts.push(rod(under.clone().addScaledVector(side, -0.9).setZ(under.z - 0.3), under.clone().addScaledVector(side, 0.9).setZ(under.z - 0.3), 0.16, C.column, 8));
}

/* ---------- THE CABIN ---------- */

/** The cabin: origin on the rails, travelling along local +x. The carriage (`bogie`) tips with the track */
function buildCabin(material) {
    const cabin = new THREE.Group();
    const bogie = new THREE.Group();
    cabin.add(bogie);

    const under = [];
    under.push(box(2.5, 1.85, 0.32, 0, 0, 0.12, C.carriage, 0.08));
    for (const x of [-0.85, 0.85]) {
        for (const y of [-TRUSS.half, TRUSS.half]) {
            const wheel = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 10);
            wheel.translate(x, y, 0.16);
            under.push(paint(wheel, C.wheel));
        }
    }
    const bogieMesh = new THREE.Mesh(mergeGeometries(under), material);
    under.forEach((g) => g.dispose());
    bogie.add(bogieMesh);

    const body = [];
    // the dark frame under the box, narrower at the bottom
    const frame = new THREE.CylinderGeometry(1.45, 1.05, 0.55, 4, 1);
    frame.rotateY(Math.PI / 4);
    frame.rotateX(Math.PI / 2);
    frame.scale(1.05, 0.9, 1);
    frame.translate(0, 0, 0.78);
    body.push(paint(frame, C.carriage));
    body.push(box(2.9, 2.5, 2.5, 0, 0, 1.05, C.cabin, 0.22));                     // the box
    body.push(box(2.94, 2.54, 0.95, 0, 0, 2.15, C.glass, 0.2));                  // the band of windows, all round
    for (const x of [-0.5, 0.5]) for (const y of [-1, 1]) body.push(box(0.12, 0.1, 0.95, x, y * 1.27, 2.15, C.cabin));   // mullions on the sides
    body.push(box(0.1, 0.1, 0.95, 1.47, 0, 2.15, C.cabin));                       // and one in each end
    body.push(box(0.1, 0.1, 0.95, -1.47, 0, 2.15, C.cabin));
    body.push(box(3.04, 2.64, 0.2, 0, 0, 3.5, C.roof, 0.09));                     // the roof, a little over
    body.push(box(0.9, 0.7, 0.28, -0.4, 0, 3.66, C.roof, 0.08));                  // a vent on it
    const bodyMesh = new THREE.Mesh(mergeGeometries(body), material);
    body.forEach((g) => g.dispose());
    cabin.add(bodyMesh);

    // A small lamp on the roof: on while it rides, blinking when it has stopped on the way
    const lampMaterial = new THREE.MeshStandardMaterial({ color: C.lamp, emissive: C.lamp, emissiveIntensity: 0, roughness: 0.4 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), lampMaterial);
    lamp.position.set(0.55, 0, 3.78);
    cabin.add(lamp);

    for (const mesh of [bogieMesh, bodyMesh, lamp]) mesh.castShadow = mesh.receiveShadow = true;
    return { cabin, bogie, body: bodyMesh, lampMaterial };
}

/* ---------- THE TRAFFIC ---------- */

const CAR_COLOURS = ['#5b6168', '#ece9e2', '#7c8fa0', '#a8574a', '#cbbf9d'];

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

export function buildHoejbane() {
    const group = new THREE.Group();
    const rand = random(53);
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true });

    const curve = new THREE.CatmullRomCurve3(TRACK.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal');

    /* The ground, the road and the pavements */
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ color: C.grass, roughness: 1, metalness: 0 }));
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

    /* The hospital, the lift tower in front of it, the low wing and the concrete wall by the road */
    block(parts, { x0: -66, x1: -24, y0: 8, y1: 36, z1: 13, hex: C.bronze, windows: { first: 1.2, every: 3.6, height: 1.6 }, parapet: false });
    block(parts, { x0: -66, x1: -24, y0: 8, y1: 36, z0: 13, z1: 34, hex: C.sand, windows: { first: 1.4, every: 3.4, height: 1.3, hex: C.window } });
    block(parts, { x0: -46, x1: -24, y0: -16, y1: 8, z1: 4.5, hex: C.concrete, parapet: false });
    block(parts, { x0: -46, x1: -24, y0: -16, y1: 8, z0: 4.5, z1: 12, hex: C.bronze, windows: { first: 0.9, every: 3.4, height: 1.6 }, parapet: false });
    block(parts, { x0: -46, x1: -24, y0: -16, y1: 8, z0: 12, z1: 19, hex: C.sand, windows: { first: 1.2, every: 3.4, height: 1.3, hex: C.window } });
    // the lift tower: light glass in white frames, the dock where the cabin stops
    parts.push(box(8, 7, 22, -18, 9.5, 0, C.tower));
    for (let x = -21.9; x <= -14; x += 2) parts.push(box(0.16, 7.1, 22, x, 9.5, 0, C.mullion));
    for (let z = 3; z < 22; z += 3.6) parts.push(box(8.1, 7.1, 0.18, -18, 9.5, z, C.mullion));
    parts.push(box(8.4, 7.4, 0.5, -18, 9.5, 22, C.parapet));
    parts.push(box(3.6, 0.3, 5.4, -18, 5.95, 7.9, C.dock));
    // the wall along the drive, and steps up it
    parts.push(box(22, 1.2, 3.4, -10, -16.6, 0, C.concrete));
    for (let k = 0; k < 7; k++) parts.push(box(2.4, 0.5, 0.48 * (k + 1), 2.6, -17.8 + k * 0.5, 0, C.concrete));
    // a bit of lawn on the slope in front of the hospital
    parts.push(box(32, 12, 0.1, -6, -29, 0, C.verge));

    /* The other side: a pale block with glass balconies, its own dock, and red-brick houses behind */
    block(parts, { x0: 58, x1: 78, y0: -14, y1: 12, z1: 24, hex: C.pale, windows: { first: 1.3, every: 3.3, height: 1.3, hex: C.window } });
    for (let z = 3.6; z < 22; z += 3.3) for (const x of [61.5, 68, 74.5]) {
        parts.push(box(4, 1.5, 0.18, x, -14.75, z, C.parapet));
        parts.push(box(4, 0.08, 1.0, x, -15.45, z + 0.18, C.balcony));
    }
    parts.push(box(0.3, 3.6, 5.4, 57.95, -2, 16.4, C.dock));
    house(parts, 46, 34, 14, 9, 6.5, 4.6);
    house(parts, 64, 38, 12, 9, 6.5, 4.8);
    house(parts, 84, 30, 13, 9, 6.5, 4.6, Math.PI / 2);
    house(parts, 50, 60, 16, 10, 7, 5);
    house(parts, -8, 58, 14, 9, 6.5, 4.6);

    /* The track and its columns */
    buildTrack(parts, curve);
    for (const x of COLUMNS) column(parts, curve, x);

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
            if (Math.abs(y + 3) < 9) continue;                                    // none right under the track
            tree(rx + s * (rw / 2 + walk + 2.6 + rand() * 2), y, rand.range(11, 15), 'beech');
        }
    }
    for (const [x, y, h] of [[-4, -11, 12], [5, -13, 12], [-8, -26, 12], [2, -30, 13], [9, -22, 12], [-14, -34, 11], [6, 10, 13], [-4, 14, 12], [12, 20, 14]]) tree(x, y, h, 'beech');
    for (const [x, y, h] of [[40, 16, 12], [48, 22, 13], [38, -20, 12], [44, -30, 14], [52, -26, 11], [86, -10, 13], [30, 48, 14], [72, 22, 10]]) tree(x, y, h);
    for (let k = 0; k < 26; k++) {
        const x = rand.range(-60, 90), y = rand.range(-110, -50);
        if (Math.abs(x - rx) < rw / 2 + walk + 2) continue;
        tree(x, y, rand.range(9, 14));
    }
    // low hedges along the hospital's drive and the wall
    for (let x = -30; x < 12; x += 2.4) toyTree('bush', new THREE.Vector3(x, -18.6 - rand() * 0.6, 0), 2.2, rand, wood);

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
            const { p: point, along } = frameAt(curve, at);
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
        const mesh = new THREE.Mesh(carGeometry(CAR_COLOURS[i % CAR_COLOURS.length]), material);
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

    const centre = new THREE.Vector3(19, -2, 9);
    return {
        group,
        size: 66,
        centre,
        cabinAt: (p) => frameAt(curve, THREE.MathUtils.clamp(p, 0, 1)).p,
        setCabin,
        update,
        dispose() {
            sign.dispose();
        },
    };
}
