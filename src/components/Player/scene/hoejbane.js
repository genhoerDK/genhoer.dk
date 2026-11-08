/**
 * Højbanen in Viborg — the horizontal lift between the hospital's buildings, over Heibergs Allé —
 * built in code for 53 sekunder til fælles, in the same pale, simple look as Kanon i G3: soft
 * low-poly forms in muted colours, faceted, no textures, the trees from scene/forest.js.
 *
 * Built from photos, not from drawings, so the sizes are guesses at the right proportions:
 *
 *  - The hospital end: a grey-clad tower beside a yellow-brick shaft, in front of the hospital's
 *    blocks (peach and beige panels, grey bands, a tall grey block behind). The cabin docks in a
 *    grey portal that juts out of the tower, at about 8 m.
 *  - The track: a deep steel lattice, zigzag on the sides and on top, a grating walkway down the
 *    middle with the rails and the toothed rack beside it, and a handrail tube along each side. It
 *    leaves the portal low, winds round in a wide spiral up to about 17.5 m, and runs straight and
 *    level over the road. Pale round columns hold it, with struts up to it from a cross-head.
 *  - The other end: a tall, slim, dark grey tower with the white station box on its corner, where
 *    the cabin docks, and a long pale block with glass balconies beside it.
 *  - The cabin: a white box with a band of windows on a dark carriage. It stays level while the
 *    carriage under it tips with the track.
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

// The lattice track, metres from the rails' line: chords on top and under, the walkway, rails, handrails
const TRUSS = { half: 0.85, bottomHalf: 0.6, depth: 1.6, panel: 1.7, walk: 0.6, rail: 0.5, hand: 0.95, handUp: 0.45 };

// The spiral: round a centre, from the portal (low) to where it runs straight over the road
const SPIRAL = { centre: [-14, 8], radius: 11, from: 140, to: 270, low: 8, high: 17.5 };   // degrees round the centre
const STRAIGHT = [[-6, -3], [10, -3], [24, -2.9], [40, -2.5], [54.2, -2]];                // level, at SPIRAL.high

// Where the columns stand (x, y): the nearest point of the track is above each
const COLUMNS = [[-25, 4.5], [-19, -2.3], [0, -3], [14, -3], [35, -2.6], [48, -2.2]];

/* ---------- COLOURS: muted, a little warm, as in Kanon i G3 ---------- */

const C = {
    grass: '#a4aa84', verge: '#9aa07a', road: '#a3a39e', line: '#f2f0e8', walk: '#d3cec3', curb: '#e3dfd6',
    steel: '#7d8387', grating: '#949a9d', rack: '#5c6266', handrail: '#b9bec1', column: '#c9cdcf', foot: '#bdb9b0',
    cabin: '#f3f1eb', roof: '#e3e0d8', glass: '#56646f', carriage: '#41474b', wheel: '#2f3336', lamp: '#ffcf7a',
    peach: '#d9a581', sand: '#e4d4ba', band: '#a9adaf', window: '#5d6a75', ribbon: '#4f5b66', concrete: '#bcb8ae', parapet: '#ece8df',
    clad: '#b3b8bb', cladLight: '#d5d9db', yellowBrick: '#cdb87c', dock: '#454d54', greyBlock: '#9da1a2',
    slate: '#6c7176', slateLight: '#8a9095', station: '#f1efea',
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
function house(parts, x, y, w, d, h, roof, turn = 0) {
    const local = [];
    local.push(box(w, d, h, 0, 0, 0, C.brick));
    const shape = new THREE.Shape([new THREE.Vector2(-d / 2 - 0.4, 0), new THREE.Vector2(d / 2 + 0.4, 0), new THREE.Vector2(0, roof)]);
    const prism = new THREE.ExtrudeGeometry(shape, { depth: w + 0.6, bevelEnabled: false });
    prism.rotateX(Math.PI / 2);             // the triangle stands up; extruded along -y
    prism.rotateZ(Math.PI / 2);             // ridge along x
    prism.translate(-(w + 0.6) / 2, 0, h);
    local.push(paint(prism, C.tiles));
    // two rows of small windows on the long sides
    for (const side of [-1, 1]) {
        for (let k = 0; k < Math.floor(w / 2.6); k++) {
            const wx = -w / 2 + 1.4 + k * 2.6;
            for (const wz of [0.9, h - 2]) local.push(box(1.1, 0.12, 1.2, wx, side * (d / 2 + 0.02), wz, k % 2 ? C.ribbon : C.window));
        }
    }
    placed(parts, local, x, y, turn);
}

/* ---------- THE TRACK ---------- */

/** The track's line: round the spiral, rising softly, then straight and level over the road */
function trackCurve() {
    const { centre: [cx, cy], radius, from, to, low, high } = SPIRAL;
    const points = [];
    for (let deg = from; deg <= to; deg += 10) {
        const f = (deg - from) / (to - from);
        const a = THREE.MathUtils.degToRad(deg);
        points.push(new THREE.Vector3(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, low + (high - low) * f * f * (3 - 2 * f)));
    }
    for (const [x, y] of STRAIGHT) points.push(new THREE.Vector3(x, y, high));
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

/** The cabin: origin on the rails' line, travelling along local +x. The carriage (`bogie`) tips with the track */
function buildCabin(material) {
    const cabin = new THREE.Group();
    const bogie = new THREE.Group();
    cabin.add(bogie);

    const under = [];
    under.push(box(2.4, 1.4, 0.34, 0, 0, 0.16, C.carriage, 0.08));
    for (const x of [-0.85, 0.85]) {
        for (const y of [-TRUSS.rail, TRUSS.rail]) {
            const wheel = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 10);
            wheel.translate(x, y, 0.24);
            under.push(paint(wheel, C.wheel));
        }
    }
    const bogieMesh = new THREE.Mesh(mergeGeometries(under), material);
    under.forEach((g) => g.dispose());
    bogie.add(bogieMesh);

    const body = [];
    // the dark frame under the box, narrower at the bottom
    const frame = new THREE.CylinderGeometry(1.45, 0.95, 0.5, 4, 1);
    frame.rotateY(Math.PI / 4);
    frame.rotateX(Math.PI / 2);
    frame.scale(1.05, 0.9, 1);
    frame.translate(0, 0, 0.85);
    body.push(paint(frame, C.carriage));
    body.push(box(2.9, 2.5, 2.5, 0, 0, 1.1, C.cabin, 0.22));                      // the box
    body.push(box(2.94, 2.54, 0.95, 0, 0, 2.2, C.glass, 0.2));                   // the band of windows, all round
    for (const x of [-0.5, 0.5]) for (const y of [-1, 1]) body.push(box(0.12, 0.1, 0.95, x, y * 1.27, 2.2, C.cabin));   // mullions on the sides
    body.push(box(0.1, 0.1, 0.95, 1.47, 0, 2.2, C.cabin));                        // and one in each end
    body.push(box(0.1, 0.1, 0.95, -1.47, 0, 2.2, C.cabin));
    body.push(box(3.04, 2.64, 0.2, 0, 0, 3.55, C.roof, 0.09));                    // the roof, a little over
    body.push(box(0.9, 0.7, 0.28, -0.4, 0, 3.71, C.roof, 0.08));                  // a vent on it
    const bodyMesh = new THREE.Mesh(mergeGeometries(body), material);
    body.forEach((g) => g.dispose());
    cabin.add(bodyMesh);

    // A small lamp on the roof: on while it rides, blinking when it has stopped on the way
    const lampMaterial = new THREE.MeshStandardMaterial({ color: C.lamp, emissive: C.lamp, emissiveIntensity: 0, roughness: 0.4 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), lampMaterial);
    lamp.position.set(0.55, 0, 3.83);
    cabin.add(lamp);

    for (const mesh of [bogieMesh, bodyMesh, lamp]) mesh.castShadow = mesh.receiveShadow = true;
    return { cabin, bogie, body: bodyMesh, lampMaterial };
}

/* ---------- THE STATIONS ---------- */

/**
 * The hospital end, built facing -y round the point where the cabin docks and turned to face the
 * way the track leaves: the grey-clad tower, the yellow-brick shaft beside it, and the grey portal
 * jutting out of the tower with the dark opening the cabin waits in.
 */
function hospitalStation(parts, at, heading) {
    const local = [];
    const back = 1.6;                         // the tower's face, behind the cabin's middle
    const floor = at.z - 1.5;                 // the portal's floor, under the carriage
    local.push(box(10, 9, 27, 0, back + 4.5, 0, C.clad));
    for (let z = 3.4; z < 27; z += 3.4) local.push(box(10.1, 9.1, 0.12, 0, back + 4.5, z, C.cladLight));   // seams in the cladding
    local.push(box(10.3, 9.3, 0.45, 0, back + 4.5, 27, C.parapet));
    local.push(box(2.2, 0.12, 1.3, -3, back - 0.02, 20, C.ribbon), box(2.2, 0.12, 1.3, 3, back - 0.02, 20, C.ribbon));
    local.push(box(4.5, 7, 31, -7.2, back + 5.2, 0, C.yellowBrick));
    local.push(box(4.7, 7.2, 0.4, -7.2, back + 5.2, 31, C.parapet));
    // the portal: two walls, a roof and a floor round the opening, out from the tower's face
    const out = 2.6, inner = 3.4, high = 5.6;
    local.push(box(0.35, out, high, -(inner / 2 + 0.17), back - out / 2, floor, C.clad));
    local.push(box(0.35, out, high, inner / 2 + 0.17, back - out / 2, floor, C.clad));
    local.push(box(inner + 0.7, out, 0.35, 0, back - out / 2, floor + high, C.clad));
    local.push(box(inner + 0.7, out, 0.3, 0, back - out / 2, floor - 0.3, C.clad));
    local.push(box(inner, 0.1, high, 0, back - 0.05, floor, C.dock));
    const angle = Math.atan2(Math.cos(heading), -Math.sin(heading));   // local -y along the heading
    placed(parts, local, at.x, at.y, angle);
}

/** The other end: the slim dark tower, the white station box on its corner, the long block with balconies */
function farStation(parts, at) {
    const x0 = at.x + 1.6;                    // the station box's face, in front of the cabin
    parts.push(box(9, 12, 28, x0 + 6.4, at.y - 1, 0, C.slate));
    for (let x = x0 + 2.6; x < x0 + 10.5; x += 1.6) parts.push(box(0.7, 12.12, 26, x, at.y - 1, 0.6, C.slateLight));   // tall windows
    parts.push(box(9.3, 12.3, 0.45, x0 + 6.4, at.y - 1, 28, C.parapet));
    // the white box the cabin docks in, with a band of windows like the cabin's own, and the dark opening
    parts.push(box(6, 7.4, 7.2, x0 + 2.6, at.y - 0.4, at.z - 1.6, C.station, 0.15));
    parts.push(box(6.04, 7.44, 1.2, x0 + 2.6, at.y - 0.4, at.z + 2.6, C.glass, 0.12));
    parts.push(box(0.1, 3.4, 4.8, x0 - 0.42, at.y, at.z - 1.4, C.dock));
    // the long pale block beside it, glass balconies facing the road
    block(parts, { x0: x0 + 11, x1: x0 + 38, y0: -14, y1: 12, z1: 22, hex: C.pale, windows: { first: 1.3, every: 3.3, height: 1.3, hex: C.window } });
    for (let z = 3.6; z < 22; z += 3.3) for (let x = x0 + 14.5; x < x0 + 37; x += 6.5) {
        parts.push(box(4, 1.5, 0.18, x, -14.75, z, C.parapet));
        parts.push(box(4, 0.08, 1.0, x, -15.45, z + 0.18, C.balcony));
    }
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

    const curve = trackCurve();
    const start = frameAt(curve, 0), end = frameAt(curve, 1);

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

    /* The hospital: peach and beige panels with grey bands, a tall grey block behind, a low wing to the side */
    block(parts, { x0: -70, x1: -27, y0: 22, y1: 46, z1: 12, hex: C.peach, windows: { first: 1.1, every: 3.6, height: 1.7 }, parapet: false });
    parts.push(box(43.2, 24.2, 1.1, -48.5, 34, 12, C.band));
    block(parts, { x0: -70, x1: -27, y0: 22, y1: 46, z0: 13.1, z1: 30, hex: C.sand, windows: { first: 1.3, every: 3.4, height: 1.4, hex: C.window } });
    block(parts, { x0: -64, x1: -40, y0: 46, y1: 62, z1: 46, hex: C.greyBlock, windows: { first: 1.4, every: 3.3, height: 1.3 } });
    block(parts, { x0: -72, x1: -46, y0: -6, y1: 22, z1: 4.5, hex: C.concrete, parapet: false });
    block(parts, { x0: -72, x1: -46, y0: -6, y1: 22, z0: 4.5, z1: 12, hex: C.peach, windows: { first: 0.9, every: 3.4, height: 1.6 }, parapet: false });
    parts.push(box(26.2, 28.2, 0.9, -59, 8, 12, C.band));
    block(parts, { x0: -72, x1: -46, y0: -6, y1: 22, z0: 12.9, z1: 19, hex: C.sand, windows: { first: 1.2, every: 3.4, height: 1.3, hex: C.window } });
    hospitalStation(parts, start.p, Math.atan2(start.along.y, start.along.x));

    // the wall along the drive, and steps up it; a bit of lawn on the slope in front of the hospital
    parts.push(box(22, 1.2, 3.4, -10, -16.6, 0, C.concrete));
    for (let k = 0; k < 7; k++) parts.push(box(2.4, 0.5, 0.48 * (k + 1), 2.6, -17.8 + k * 0.5, 0, C.concrete));
    parts.push(box(32, 12, 0.1, -6, -29, 0, C.verge));

    /* The other side, and red-brick houses behind */
    farStation(parts, end.p);
    house(parts, 46, 34, 14, 9, 6.5, 4.6);
    house(parts, 64, 38, 12, 9, 6.5, 4.8);
    house(parts, 50, 60, 16, 10, 7, 5);
    house(parts, 96, 30, 13, 9, 6.5, 4.6, Math.PI / 2);
    house(parts, -8, 58, 14, 9, 6.5, 4.6);

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
            if (Math.abs(y + 3) < 9) continue;                                    // none right under the track
            tree(rx + s * (rw / 2 + walk + 2.6 + rand() * 2), y, rand.range(11, 15), 'beech');
        }
    }
    for (const [x, y, h] of [[-2, -11, 12], [6, -13, 12], [-8, -26, 12], [2, -30, 13], [9, -22, 12], [-16, -32, 11], [-14, 8, 11], [-4, 15, 12], [6, 12, 13], [12, 22, 14]]) tree(x, y, h, 'beech');
    for (const [x, y, h] of [[40, 16, 12], [36, 26, 13], [38, -20, 12], [44, -30, 14], [52, -26, 11], [100, -18, 13], [30, 48, 14], [76, 22, 10]]) tree(x, y, h);
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

    const centre = new THREE.Vector3(12, 3, 9);
    return {
        group,
        size: 72,
        centre,
        cabinAt: (p) => frameAt(curve, THREE.MathUtils.clamp(p, 0, 1)).p,
        setCabin,
        update,
        dispose() {
            sign.dispose();
        },
    };
}
