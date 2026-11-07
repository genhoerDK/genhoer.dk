/**
 * The forest round Kanonstilling G3 (three.js), after the photos of the place: pine forest on sand
 * at Dueodde, the emplacement half taken back by it.
 *
 *   - forestFloorMaterial: the forest floor, painted in the browser. Where moss, dry grass, a
 *     trodden path and damp earth lie is worked out for the whole floor; over that are drawn pine
 *     needles old and new, moss, grass, dead leaves, twigs, cones and grit, each where it belongs.
 *     Close up a small tile of needle litter adds single needles, with a little relief.
 *   - createForest: Scots pines (tall, bare, orange high up, their crowns flat clumps), spruces
 *     (dark cones), beeches and birches, young trees, shrubs against the walls, grass tufts and
 *     bracken on the ground and in the pit, fallen trunks. Trees between the viewer and the
 *     emplacement thin out in a fine dither, so they never hide it: call update() each frame.
 *
 * Metres, z up, the middle of the gun pit at the origin. Everything comes from one seed, so it
 * looks the same each time.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const SEED = 1944;

/* ---------- RANDOM AND NOISE ---------- */

function random(seed) {
    let s = seed;
    const next = () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.range = (a, b) => a + (b - a) * next();
    next.pick = (list) => list[Math.floor(next() * list.length)];
    return next;
}

/** Smooth fractal 2D noise, 0–1 */
function noise(seed) {
    const hash = (x, y) => {
        let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    const value = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = smooth(x - xi), yf = smooth(y - yi);
        const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
    };
    return (x, y, octaves = 4) => {
        let f = 0, amp = 0.5, freq = 1, total = 0;
        for (let o = 0; o < octaves; o++) {
            f += amp * value(x * freq + o * 17.3, y * freq - o * 9.1);
            total += amp;
            amp *= 0.5;
            freq *= 2.03;
        }
        return f / total;
    };
}

const smoothstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

const linear = (hex) => new THREE.Color(hex);   // sRGB → the renderer's linear working colour

/* ---------- THE FOREST FLOOR ---------- */

/**
 * What covers the ground where (each 0–1): moss, grass, the trodden path, damp.
 * @param {(x, y) => number} distance  How far from the bunker's footprint, in metres
 */
function coverAt(distance) {
    const moss = noise(SEED + 2), grass = noise(SEED + 3), path = noise(SEED + 4), damp = noise(SEED + 5);
    return (x, y) => {
        const d = distance(x, y);
        const r = Math.hypot(x, y);
        // Trodden along the walk's edge and round the blocks, and a path leading off to the south
        const along = smoothstep(2.2, 0.6, Math.abs(d - 1.1 - (path(x * 0.15, y * 0.15, 2) - 0.5) * 1.4)) * smoothstep(-0.2, 0.3, d);
        const wander = (path(r * 0.06, 3.3, 2) - 0.5) * 6;
        const trail = smoothstep(1.8, 0.7, Math.abs(x - 2.5 - wander - (r - 14) * 0.15)) * (y < -12 ? 1 : 0) * smoothstep(0, 1.5, d);
        const trodden = Math.min(1, Math.max(along * 0.8, trail) * smoothstep(0.3, 0.5, path(x * 0.4, y * 0.4, 3) * 0.6 + 0.4));
        const wet = smoothstep(0.55, 0.75, damp(x * 0.09, y * 0.09, 3)) * 0.6 + Math.exp(-Math.max(0, d) / 1.2) * 0.45;
        const m = smoothstep(0.45, 0.65, moss(x * 0.11, y * 0.11, 4) + wet * 0.2) * (1 - trodden);
        // Grass where more light gets in: out towards the open and along the bunker's clearing
        const light = smoothstep(18, 32, r) * 0.45 + smoothstep(5, 1, d) * 0.2;
        const g = smoothstep(0.58, 0.72, grass(x * 0.14, y * 0.14, 4) + light * 0.3) * (1 - trodden) * (1 - m * 0.6);
        return { moss: m, grass: g, path: trodden, damp: Math.min(1, wet) };
    };
}

/**
 * The forest floor, painted over [-R, R] at about 3 cm a pixel: the coarse cover blended, then
 * needles, moss, grass, dead leaves, twigs, cones and grit drawn over it where each belongs
 */
function groundTexture(cov, R, rand) {
    const SIZE = 2048, MACRO = 512;
    const toWorld = (px, size) => (px / size) * 2 * R - R;

    // Large scale: blend what covers the ground, with slow variation in tone
    const macro = document.createElement('canvas');
    macro.width = macro.height = MACRO;
    const mctx = macro.getContext('2d');
    const img = mctx.createImageData(MACRO, MACRO);
    const tone = noise(SEED + 6);
    const c = (hex) => new THREE.Color(hex);   // stays in sRGB: we only blend for the canvas
    const cNeedles = c('#5e4532'), cNeedlesLight = c('#80613f'), cMoss = c('#4e5e25'), cMossLight = c('#6f7f36');
    const cGrass = c('#7f7c47'), cPath = c('#8c7e68'), cPathDark = c('#6d6151'), cDamp = c('#34291f');
    const field = new Float32Array(MACRO * MACRO * 3);
    const mix = new THREE.Color(), tmp = new THREE.Color();
    for (let j = 0; j < MACRO; j++) {
        for (let i = 0; i < MACRO; i++) {
            const x = toWorld(i + 0.5, MACRO), y = -toWorld(j + 0.5, MACRO);
            const w = cov(x, y);
            const k = j * MACRO + i;
            field[k * 3] = w.moss; field[k * 3 + 1] = w.grass; field[k * 3 + 2] = w.path;
            const t = tone(x * 0.3, y * 0.3, 4);
            mix.copy(cNeedles).lerp(cNeedlesLight, t);
            mix.lerp(tmp.copy(cMoss).lerp(cMossLight, tone(x * 0.75 + 9, y * 0.75, 3)), w.moss);
            mix.lerp(cGrass, w.grass * 0.8);
            mix.lerp(tmp.copy(cPathDark).lerp(cPath, t), w.path);
            mix.lerp(cDamp, w.damp * 0.45);
            img.data[k * 4] = mix.r * 255; img.data[k * 4 + 1] = mix.g * 255; img.data[k * 4 + 2] = mix.b * 255; img.data[k * 4 + 3] = 255;
        }
    }
    mctx.putImageData(img, 0, 0);
    const zone = (px, py) => {
        const i = Math.min(MACRO - 1, Math.floor((px / SIZE) * MACRO)), j = Math.min(MACRO - 1, Math.floor((py / SIZE) * MACRO));
        const k = (j * MACRO + i) * 3;
        return { moss: field[k], grass: field[k + 1], path: field[k + 2] };
    };

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(macro, 0, 0, SIZE, SIZE);

    /** Strokes batched by colour: one path per colour */
    const strokes = (count, colours, width, alpha, each) => {
        const paths = colours.map(() => new Path2D());
        for (let n = 0; n < count; n++) each(paths[Math.floor(rand() * paths.length)]);
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.globalAlpha = alpha;
        paths.forEach((p, i) => { ctx.strokeStyle = colours[i]; ctx.stroke(p); });
        ctx.globalAlpha = 1;
    };

    // Shade first: little dark gaps between everything
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#1e1813';
    for (let n = 0; n < 9000; n++) {
        const x = rand() * SIZE, y = rand() * SIZE;
        ctx.beginPath();
        ctx.ellipse(x, y, 2 + rand() * 6, 1 + rand() * 3, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Pine needles in layers, old (grey) under fresh (rust)
    const needle = (amount, colours, len, width, alpha) => strokes(amount, colours, width, alpha, (p) => {
        const x = rand() * SIZE, y = rand() * SIZE;
        const z = zone(x, y);
        if (rand() < z.path * 0.85 + z.moss * 0.55 + z.grass * 0.4) return;
        const a = rand() * Math.PI, l = len * (0.6 + rand() * 0.7);
        const bend = (rand() - 0.5) * 2;
        p.moveTo(x, y);
        p.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + bend, y + Math.sin(a) * l * 0.5 - bend, x + Math.cos(a) * l, y + Math.sin(a) * l);
    });
    needle(70000, palette.needlesGrey, 11, 1.1, 0.7);
    needle(110000, palette.needles, 12, 1.2, 0.85);
    needle(30000, palette.needlesFresh, 12, 1.1, 0.9);

    // Moss: dense specks with light tips
    for (let n = 0; n < 160000; n++) {
        const x = rand() * SIZE, y = rand() * SIZE;
        const z = zone(x, y);
        if (rand() > z.moss) continue;
        ctx.fillStyle = palette.moss[Math.floor(rand() * palette.moss.length)];
        const s = 1 + rand() * 2.2;
        ctx.fillRect(x, y, s, s);
    }

    // Grass: tufts of blades fanning out
    strokes(5000, palette.grass, 1.1, 0.9, (p) => {
        const x = rand() * SIZE, y = rand() * SIZE;
        const z = zone(x, y);
        if (rand() > z.grass * 1.2) return;
        const blades = 6 + Math.floor(rand() * 10);
        const lean = rand() * Math.PI * 2;
        for (let b = 0; b < blades; b++) {
            const a = lean + (rand() - 0.5) * 2.4, l = 6 + rand() * 12;
            p.moveTo(x, y);
            p.quadraticCurveTo(x + Math.cos(a) * l * 0.6, y + Math.sin(a) * l * 0.4, x + Math.cos(a) * l, y + Math.sin(a) * l);
        }
    });

    // Dead leaves (beech, oak): small pointed shapes, some curled dark
    for (let n = 0; n < 4500; n++) {
        const x = rand() * SIZE, y = rand() * SIZE;
        const z = zone(x, y);
        if (rand() < z.path * 0.6 + z.moss * 0.7) continue;
        const l = 4 + rand() * 6, w = l * (0.35 + rand() * 0.25), a = rand() * Math.PI * 2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.fillStyle = palette.leaves[Math.floor(rand() * palette.leaves.length)];
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(-l, 0);
        ctx.quadraticCurveTo(0, -w, l, 0);
        ctx.quadraticCurveTo(0, w, -l, 0);
        ctx.fill();
        ctx.strokeStyle = 'rgba(40,28,18,0.5)';
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(-l, 0); ctx.lineTo(l, 0); ctx.stroke();
        ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Twigs and small fallen branches
    strokes(700, palette.twigs, 1.8, 0.95, (p) => {
        const x = rand() * SIZE, y = rand() * SIZE;
        if (rand() < zone(x, y).path * 0.7) return;
        let a = rand() * Math.PI * 2, cx = x, cy = y;
        const parts = 2 + Math.floor(rand() * 4);
        p.moveTo(cx, cy);
        for (let s = 0; s < parts; s++) {
            a += (rand() - 0.5) * 0.7;
            const l = 6 + rand() * 14;
            cx += Math.cos(a) * l; cy += Math.sin(a) * l;
            p.lineTo(cx, cy);
            if (rand() < 0.5) {   // a side shoot
                const b = a + (rand() < 0.5 ? 1 : -1) * (0.4 + rand() * 0.6), m = 4 + rand() * 7;
                p.moveTo(cx, cy); p.lineTo(cx + Math.cos(b) * m, cy + Math.sin(b) * m); p.moveTo(cx, cy);
            }
        }
    });

    // Pine cones
    for (let n = 0; n < 500; n++) {
        const x = rand() * SIZE, y = rand() * SIZE;
        if (rand() < zone(x, y).path * 0.9) continue;
        const a = rand() * Math.PI, l = 3 + rand() * 2.5;
        ctx.save();
        ctx.translate(x, y); ctx.rotate(a);
        ctx.fillStyle = '#3d2c1e';
        ctx.beginPath(); ctx.ellipse(0, 0, l, l * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6e5236';
        for (let s = -l * 0.6; s < l * 0.7; s += 1.6) { ctx.fillRect(s, -l * 0.3, 0.9, l * 0.6); }
        ctx.restore();
    }

    // Stones and gravel where the path is worn
    for (let n = 0; n < 9000; n++) {
        const x = rand() * SIZE, y = rand() * SIZE;
        const z = zone(x, y);
        if (rand() > z.path * 0.9 + 0.02) continue;
        const r = rand() < 0.92 ? 0.6 + rand() * 1.2 : 2 + rand() * 3;
        ctx.fillStyle = palette.stones[Math.floor(rand() * palette.stones.length)];
        ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.6 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2); ctx.fill();
        if (r > 2) {
            ctx.fillStyle = 'rgba(30,25,20,0.35)';
            ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.35, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
}

const palette = {
    needles: ['#6b4c35', '#7a573b', '#5d4331', '#87633f', '#4f3a2b', '#93704b', '#6e5a48'],
    needlesFresh: ['#a0683d', '#b07b4a', '#8e5a34', '#c08a55'],
    needlesGrey: ['#7b7266', '#8a8174', '#666056', '#958b7c'],
    moss: ['#4a5a24', '#5b6d2a', '#3e4d1f', '#6d7f34', '#556626', '#7d8a3c', '#34421a'],
    grass: ['#8d8a52', '#a49a63', '#7b7d43', '#6e7a36', '#b3a874', '#5f6c2e', '#c4b98a'],
    leaves: ['#7d5a32', '#8f6a3a', '#5e4128', '#a07a45', '#6b5434', '#4e3a26'],
    twigs: ['#3b3029', '#4a3d33', '#2f2722', '#5a4a3d'],
    stones: ['#9b968c', '#87827a', '#aca69b', '#76716a', '#c2bcb0'],
};

/**
 * A tile that repeats seamlessly: paint(ctx, wrap, rand) draws on it; wrap(x, y, reach, fn) calls
 * fn at (x, y) and again across whichever edges something that big would cross
 */
function tile(base, paint, rand, S = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, S, S);
    const wrap = (x, y, reach, fn) => {
        const xs = [0], ys = [0];
        if (x < reach) xs.push(S); else if (x > S - reach) xs.push(-S);
        if (y < reach) ys.push(S); else if (y > S - reach) ys.push(-S);
        for (const ox of xs) for (const oy of ys) fn(x + ox, y + oy);
    };
    paint(ctx, wrap, S);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
}

/** Strokes in batches of one colour each */
function strokes(ctx, rand, count, colours, width, alpha, each) {
    const paths = colours.map(() => new Path2D());
    for (let n = 0; n < count; n++) each(paths[Math.floor(rand() * paths.length)]);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.globalAlpha = alpha;
    paths.forEach((p, i) => { ctx.strokeStyle = colours[i]; ctx.stroke(p); });
    ctx.globalAlpha = 1;
}

function blots(ctx, wrap, rand, S, count, colour, alpha, rx, ry) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    for (let n = 0; n < count; n++) {
        const x = rand() * S, y = rand() * S, a = rx * (0.4 + rand()), b = ry * (0.4 + rand()), t = rand() * Math.PI;
        wrap(x, y, Math.max(a, b), (px, py) => { ctx.beginPath(); ctx.ellipse(px, py, a, b, t, 0, Math.PI * 2); ctx.fill(); });
    }
    ctx.globalAlpha = 1;
}

function needleLayer(ctx, wrap, rand, S, count, colours, len, width, alpha) {
    strokes(ctx, rand, count, colours, width, alpha, (p) => {
        const x = rand() * S, y = rand() * S, a = rand() * Math.PI * 2, l = len * (0.6 + rand() * 0.7), bend = (rand() - 0.5) * len * 0.25;
        wrap(x, y, l, (px, py) => {
            p.moveTo(px, py);
            p.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + bend, py + Math.sin(a) * l * 0.5 - bend, px + Math.cos(a) * l, py + Math.sin(a) * l);
        });
    });
}

function leafLayer(ctx, wrap, rand, S, count, size) {
    for (let n = 0; n < count; n++) {
        const x = rand() * S, y = rand() * S, l = size * (0.6 + rand() * 0.8), w = l * (0.35 + rand() * 0.25), a = rand() * Math.PI * 2;
        const colour = palette.leaves[Math.floor(rand() * palette.leaves.length)];
        wrap(x, y, l, (px, py) => {
            ctx.save();
            ctx.translate(px, py); ctx.rotate(a);
            ctx.fillStyle = 'rgba(20,14,8,0.35)';
            ctx.beginPath(); ctx.moveTo(-l + 2, 3); ctx.quadraticCurveTo(2, -w + 3, l + 2, 3); ctx.quadraticCurveTo(2, w + 3, -l + 2, 3); ctx.fill();
            ctx.fillStyle = colour;
            ctx.beginPath(); ctx.moveTo(-l, 0); ctx.quadraticCurveTo(0, -w, l, 0); ctx.quadraticCurveTo(0, w, -l, 0); ctx.fill();
            ctx.strokeStyle = 'rgba(40,28,18,0.55)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-l, 0); ctx.lineTo(l, 0); ctx.stroke();
            ctx.restore();
        });
    }
}

function twigLayer(ctx, wrap, rand, S, count, size) {
    strokes(ctx, rand, count, palette.twigs, size * 0.12, 0.95, (p) => {
        const x = rand() * S, y = rand() * S;
        let a = rand() * Math.PI * 2;
        const pts = [[0, 0]];
        const parts = 2 + Math.floor(rand() * 4);
        for (let s = 0; s < parts; s++) {
            a += (rand() - 0.5) * 0.7;
            const [lx, ly] = pts[pts.length - 1], l = size * (0.5 + rand());
            pts.push([lx + Math.cos(a) * l, ly + Math.sin(a) * l]);
        }
        wrap(x, y, size * 5, (px, py) => {
            p.moveTo(px, py);
            pts.forEach(([dx, dy]) => p.lineTo(px + dx, py + dy));
        });
    });
}

function coneLayer(ctx, wrap, rand, S, count, size) {
    for (let n = 0; n < count; n++) {
        const x = rand() * S, y = rand() * S, a = rand() * Math.PI, l = size * (0.8 + rand() * 0.4);
        wrap(x, y, l, (px, py) => {
            ctx.save();
            ctx.translate(px, py); ctx.rotate(a);
            ctx.fillStyle = 'rgba(15,10,6,0.45)';
            ctx.beginPath(); ctx.ellipse(l * 0.25, l * 0.3, l, l * 0.55, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#3d2c1e';
            ctx.beginPath(); ctx.ellipse(0, 0, l, l * 0.55, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#7a5a3a';
            for (let s = -l * 0.7; s < l * 0.8; s += l * 0.28) {
                for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s, side * l * 0.2, l * 0.1, l * 0.13, 0, 0, Math.PI * 2); ctx.fill(); }
            }
            ctx.restore();
        });
    }
}

/** The close-up tile of needle litter, covering TILE metres: fine detail when seen near */
const TILE = 2.5;
function floorTiles(rand) {
    // Needle litter: old grey needles under brown and fresh rust ones, cones, twigs, a few leaves
    const needles = tile('#4a3829', (ctx, wrap, S) => {
        blots(ctx, wrap, rand, S, 900, '#2a1f17', 0.35, 18, 10);
        blots(ctx, wrap, rand, S, 500, '#7d6650', 0.18, 26, 14);
        needleLayer(ctx, wrap, rand, S, 26000, palette.needlesGrey, 22, 2, 0.75);
        needleLayer(ctx, wrap, rand, S, 34000, palette.needles, 24, 2.2, 0.85);
        blots(ctx, wrap, rand, S, 400, '#1e1610', 0.25, 10, 5);
        needleLayer(ctx, wrap, rand, S, 14000, palette.needlesFresh, 24, 2, 0.9);
        leafLayer(ctx, wrap, rand, S, 70, 16);
        twigLayer(ctx, wrap, rand, S, 26, 26);
        coneLayer(ctx, wrap, rand, S, 7, 18);
        needleLayer(ctx, wrap, rand, S, 5000, palette.needlesFresh, 22, 1.8, 0.95);
    }, rand);

    return { needles };
}

/**
 * The forest floor's material, for a ground mesh in metres (z up) with vertex colours carrying
 * only its fade (alpha) at the far edge.
 * @param {(x, y) => number} distance  How far from the bunker's footprint
 */
export function forestFloorMaterial(distance) {
    const rand = random(SEED + 11);
    const PAINTED = 32;                                   // metres out the painted floor reaches (beyond it has faded)
    const painted = groundTexture(coverAt(distance), PAINTED, rand);
    const { needles } = floorTiles(rand);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, vertexColors: true, transparent: true });
    material.userData.textures = [painted, needles];
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, {
            uPainted: { value: painted }, uR: { value: PAINTED }, uTile: { value: TILE }, uNeedles: { value: needles },
        });
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vFloor;\nvarying float vFloorScale;')
            .replace('#include <begin_vertex>', `#include <begin_vertex>
                vFloor = position;
                vFloorScale = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
                uniform sampler2D uPainted, uNeedles;
                uniform float uR, uTile;
                varying vec3 vFloor;
                varying float vFloorScale;
                vec3 bumpedFloor(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
                    vec3 sx = dFdx(surfPos), sy = dFdy(surfPos);
                    vec3 r1 = cross(sy, surfNorm), r2 = cross(surfNorm, sx);
                    float det = dot(sx, r1) * faceDir;
                    vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
                    return normalize(abs(det) * surfNorm - grad);
                }`)
            .replace('#include <map_fragment>', `
                vec2 fp = vFloor.xy;
                vec3 col = texture2D(uPainted, clamp(fp / (2.0 * uR) + 0.5, 0.0, 1.0)).rgb;
                // close up, single needles: the tile's light and shade over the painted colour (two
                // scales, turned, so it doesn't repeat; it evens out to nothing when seen from afar)
                vec2 q = mat2(0.8, -0.6, 0.6, 0.8) * fp / (uTile * 1.73) + 0.37;
                vec3 near = texture2D(uNeedles, fp / uTile).rgb * 0.5 + texture2D(uNeedles, q).rgb * 0.5;
                vec3 mean = texture2D(uNeedles, vec2(0.5), 20.0).rgb;
                float detail = dot(near, vec3(0.3, 0.6, 0.1)) / max(dot(mean, vec3(0.3, 0.6, 0.1)), 1e-3);
                col *= mix(1.0, detail, 0.55);
                diffuseColor.rgb *= col;
                float floorHeight = dot(col, vec3(0.3, 0.6, 0.1)) * 0.03 * vFloorScale;`)
            .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
                float floorDetail = 1.0 - smoothstep(0.02, 0.08, length(fwidth(vFloor)));
                normal = bumpedFloor(-vViewPosition, normal, vec2(dFdx(floorHeight), dFdy(floorHeight)) * floorDetail, faceDirection);`);
    };
    return material;
}

/* ---------- FOLIAGE ---------- */

// The foliage atlas: four cells side by side — broad leaves, pine twigs, grass, bracken
const CELLS = 4;
const LEAVES = 0, NEEDLES = 1, GRASS = 2, FERN = 3;

function foliageTexture(rand) {
    const S = 512;
    const canvas = document.createElement('canvas');
    canvas.width = S * CELLS;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    const pick = (list) => list[Math.floor(rand() * list.length)];

    // Broad leaves: a cluster of overlapping leaves, darker inside
    for (let n = 0; n < 150; n++) {
        const r = Math.sqrt(rand()) * S * 0.4, a = rand() * Math.PI * 2;
        const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
        const l = 26 + rand() * 22, w = l * (0.45 + rand() * 0.15);
        const inner = 1 - r / (S * 0.4);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + (rand() - 0.5) * 1.4);
        ctx.fillStyle = inner > 0.5 && rand() < 0.6 ? pick(['#2c3d1a', '#33461d', '#28371a']) : pick(['#4f7a2b', '#5f8a33', '#6c963a', '#45692a', '#7ca545', '#3d5e24']);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(l * 0.5, -w, l, 0);
        ctx.quadraticCurveTo(l * 0.5, w, 0, 0);
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,30,10,0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(l * 0.9, 0); ctx.stroke();
        ctx.restore();
    }

    // Pine and spruce: twigs radiating from the middle, needles all along them
    ctx.save();
    ctx.translate(S, 0);
    ctx.lineCap = 'round';
    for (let t = 0; t < 9; t++) {
        const a = (t / 9) * Math.PI * 2 + rand() * 0.5;
        const len = S * (0.3 + rand() * 0.15);
        const sx = S / 2, sy = S / 2;
        ctx.strokeStyle = '#4a3a28';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len); ctx.stroke();
        for (let s = 0.1; s < 1; s += 0.025) {
            const px = sx + Math.cos(a) * len * s, py = sy + Math.sin(a) * len * s;
            for (const side of [-1, 1]) {
                const b = a + side * (0.7 + rand() * 0.5);
                const l = 22 + rand() * 18 - s * 8;
                ctx.strokeStyle = pick(['#2b4426', '#34512b', '#3e5e31', '#264022', '#466a35', '#1f3520']);
                ctx.lineWidth = 2.2;
                ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(b) * l, py + Math.sin(b) * l); ctx.stroke();
            }
        }
    }
    ctx.restore();

    // Grass: blades from the bottom middle
    ctx.save();
    ctx.translate(S * 2, 0);
    ctx.lineCap = 'round';
    for (let n = 0; n < 90; n++) {
        const x0 = S / 2 + (rand() - 0.5) * S * 0.25;
        const h = S * (0.45 + rand() * 0.5), lean = (rand() - 0.5) * S * 0.7;
        ctx.strokeStyle = pick(['#7d8a3e', '#6b7a33', '#9a9a58', '#b3aa70', '#5c6d2c', '#8c8a4c', '#c2b582']);
        ctx.lineWidth = 3 + rand() * 3;
        ctx.beginPath();
        ctx.moveTo(x0, S);
        ctx.quadraticCurveTo(x0 + lean * 0.2, S - h * 0.6, x0 + lean, S - h);
        ctx.stroke();
    }
    ctx.restore();

    // Bracken: a few fronds from the bottom middle, leaflets along them
    ctx.save();
    ctx.translate(S * 3, 0);
    for (let f = 0; f < 5; f++) {
        const lean = (f - 2) * 0.35 + (rand() - 0.5) * 0.2;
        const len = S * (0.7 + rand() * 0.25);
        const pts = [];
        for (let s = 0; s <= 20; s++) {
            const t = s / 20;
            pts.push([S / 2 + Math.sin(lean) * len * t + lean * len * 0.25 * t * t, S - Math.cos(lean) * len * t + len * 0.15 * t * t]);
        }
        ctx.strokeStyle = '#5b5a2a';
        ctx.lineWidth = 3;
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        pts.forEach(([x, y], i) => {
            if (i < 3) return;
            const t = i / 20, l = (1 - t) * 60 + 14;
            for (const side of [-1, 1]) {
                const a = -Math.PI / 2 + lean + side * 1.2;
                ctx.fillStyle = pick(['#4f7128', '#5d7f2f', '#6a8a36', '#43622a']);
                ctx.save();
                ctx.translate(x, y); ctx.rotate(a);
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(l * 0.5, -l * 0.18, l, 0); ctx.quadraticCurveTo(l * 0.5, l * 0.18, 0, 0); ctx.fill();
                ctx.restore();
            }
        });
    }
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}

/** Collects quads (leaf clusters, grass) into one geometry */
function cardBuilder(rand) {
    const position = [], normal = [], uv = [], color = [], index = [];
    const u = new THREE.Vector3(), v = new THREE.Vector3(), n = new THREE.Vector3(), tmp = new THREE.Vector3();
    /**
     * centre, facing (the quad's orientation), shade (its lighting normal), w, h, atlas cell, tint;
     * anchored: its bottom edge at the centre (grass), with `upward` the way up along it
     */
    const add = (centre, facing, shade, w, h, cell, tint, anchored = false, upward = null) => {
        n.copy(facing).normalize();
        if (upward) { v.copy(upward).normalize(); u.crossVectors(v, n).normalize(); }
        else {
            tmp.set(Math.abs(n.z) < 0.9 ? 0 : 1, 0, Math.abs(n.z) < 0.9 ? 1 : 0);
            u.crossVectors(tmp, n).normalize();
            v.crossVectors(n, u).normalize();
            const r = rand() * Math.PI * 2, cs = Math.cos(r), sn = Math.sin(r);
            tmp.copy(u).multiplyScalar(cs).addScaledVector(v, sn);
            v.multiplyScalar(cs).addScaledVector(u, -sn);
            u.copy(tmp);
        }
        const base = position.length / 3;
        const corners = anchored ? [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]] : [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
        const uvs = [[0, 0], [1, 0], [1, 1], [0, 1]];
        corners.forEach(([a, b], i) => {
            position.push(centre.x + u.x * a * w + v.x * b * h, centre.y + u.y * a * w + v.y * b * h, centre.z + u.z * a * w + v.z * b * h);
            normal.push(shade.x, shade.y, shade.z);
            uv.push((cell + 0.004 + uvs[i][0] * 0.992) / CELLS, uvs[i][1]);
            color.push(tint.r, tint.g, tint.b);
        });
        index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const build = () => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
        g.setIndex(index);
        return g;
    };
    return { add, build };
}

/* ---------- WOOD ---------- */

const Z = new THREE.Vector3(0, 0, 1);

/** A tapered piece of trunk or branch from a to b, coloured from one end to the other */
function limb(a, b, r0, r1, c0, c1, sides = 7) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const length = dir.length();
    const g = new THREE.CylinderGeometry(r1, r0, length, sides, 3, true);
    g.deleteAttribute('uv');
    g.rotateX(Math.PI / 2);           // along z
    g.translate(0, 0, length / 2);
    const colours = [];
    const pos = g.attributes.position;
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
        const t = pos.getZ(i) / length;
        const ridge = 0.85 + 0.15 * Math.sin(pos.getZ(i) * 9 + Math.atan2(pos.getY(i), pos.getX(i)) * 3);   // bark in uneven bands
        tmp.copy(c0).lerp(c1, t).multiplyScalar(ridge);
        colours.push(tmp.r, tmp.g, tmp.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Z, dir.normalize()));
    g.translate(a.x, a.y, a.z);
    return g;
}

/* ---------- TREES ---------- */

const bark = {
    pineLow: linear('#4f443b'), pineHigh: linear('#b06a3c'),
    spruce: linear('#4a3f36'),
    beech: linear('#77736b'), beechHigh: linear('#8a867d'),
    birch: linear('#d9d6cc'), birchLow: linear('#3b3631'),
};
const tints = {
    pine: ['#9fb08f', '#b4c09e', '#8a9c7c'],
    spruce: ['#7f9179', '#6f8370', '#8b9a80'],
    beech: ['#ffffff', '#e6f0c8', '#cfe0a8', '#f2f5d0'],
    birch: ['#f0f5c8', '#e2ecb0'],
    shrub: ['#ffffff', '#e8f2c0', '#d8e8a8'],
};

const vary = (rand, hex, amount = 0.12) => linear(hex).multiplyScalar(1 - amount + rand() * amount * 2);

/**
 * One tree standing at base, h metres tall: its wood into `wood`, its foliage into `cards`
 * @param {'pine'|'spruce'|'beech'|'birch'|'shrub'} kind
 */
function tree(kind, base, h, rand, wood, cards) {
    const lean = new THREE.Vector3(rand.range(-1, 1), rand.range(-1, 1), 0).multiplyScalar(kind === 'pine' ? 0.06 : 0.03);
    const along = (t, wobble = 0) => new THREE.Vector3(
        base.x + (lean.x * t + Math.sin(t * 5 + base.x) * wobble) * h,
        base.y + (lean.y * t + Math.cos(t * 4 + base.y) * wobble) * h,
        base.z + t * h,
    );
    const centre = new THREE.Vector3(), shade = new THREE.Vector3(), facing = new THREE.Vector3(), p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 0, 0.45);

    /** A rounded clump of foliage cards */
    const clump = (c, radius, flat, count, cell, tintList, size) => {
        for (let i = 0; i < count; i++) {
            const r = Math.cbrt(rand()) * radius;
            const a = rand() * Math.PI * 2, b = Math.acos(rand() * 2 - 1);
            p.set(Math.sin(b) * Math.cos(a), Math.sin(b) * Math.sin(a), Math.cos(b) * flat);
            const pos = c.clone().addScaledVector(p, r);
            shade.copy(p).normalize().multiplyScalar(0.8).add(up).normalize();
            facing.set(rand() - 0.5, rand() - 0.5, rand() - 0.5).add(shade);
            const tint = vary(rand, rand.pick(tintList), 0.15).multiplyScalar(0.7 + 0.3 * (p.z * 0.5 + 0.5));
            cards.add(pos, facing, shade, size * rand.range(0.8, 1.25), size * rand.range(0.8, 1.25), cell, tint);
        }
    };

    if (kind === 'pine') {
        // Tall and straight, bare up to the crown, orange bark high up; the crown in flat clumps
        const segments = 4;
        for (let s = 0; s < segments; s++) {
            const t0 = (s / segments) * 0.97, t1 = ((s + 1) / segments) * 0.97;   // the pieces meet end to end
            const c0 = bark.pineLow.clone().lerp(bark.pineHigh, Math.pow(t0, 1.5)), c1 = bark.pineLow.clone().lerp(bark.pineHigh, Math.pow(t1, 1.5));
            wood.push(limb(along(t0, 0.01), along(t1, 0.01), h * 0.02 * (1 - t0 * 0.75), h * 0.02 * (1 - t1 * 0.75), c0, c1));
        }
        const clumps = 8 + Math.floor(rand() * 5);
        for (let i = 0; i < clumps; i++) {
            const t = rand.range(0.62, 0.97);
            const a = rand() * Math.PI * 2, out = rand.range(0.03, 0.16) * h * (1.1 - (t - 0.66) * 1.5);
            const from = along(t - 0.04);
            centre.set(from.x + Math.cos(a) * out, from.y + Math.sin(a) * out, from.z + rand.range(0, 0.05) * h);
            wood.push(limb(from, centre, h * 0.006, h * 0.003, bark.pineHigh, bark.pineHigh, 5));
            clump(centre, h * rand.range(0.08, 0.13), 0.55, 46, NEEDLES, tints.pine, h * 0.09);
        }
        for (let i = 0; i < 4; i++) {   // dead branch stubs low down
            const from = along(rand.range(0.3, 0.6)), a = rand() * Math.PI * 2;
            wood.push(limb(from, from.clone().add(new THREE.Vector3(Math.cos(a), Math.sin(a), -0.2).multiplyScalar(h * 0.05)), h * 0.003, h * 0.001, bark.spruce, bark.spruce, 4));
        }
    } else if (kind === 'spruce') {
        // A dark cone, branched all the way down
        wood.push(limb(along(0), along(1), h * 0.018, h * 0.003, bark.spruce, bark.spruce));
        const count = 150 + Math.floor(rand() * 60);
        for (let i = 0; i < count; i++) {
            const t = Math.pow(rand(), 0.8) * 0.9 + 0.08;
            const full = (1 - t) * h * 0.24;
            const radius = full * Math.sqrt(rand.range(0.3, 1));
            const a = rand() * Math.PI * 2;
            const stem = along(t);
            const pos = new THREE.Vector3(stem.x + Math.cos(a) * radius, stem.y + Math.sin(a) * radius, stem.z - radius * 0.25);
            shade.set(Math.cos(a), Math.sin(a), 0.7).normalize();
            facing.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 1).add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.6));
            const tint = vary(rand, rand.pick(tints.spruce), 0.15).multiplyScalar(0.55 + 0.45 * (radius / (full + 1e-3)));
            cards.add(pos, facing, shade, h * 0.11 * (1 - t * 0.5), h * 0.08 * (1 - t * 0.5), NEEDLES, tint);
        }
    } else if (kind === 'beech' || kind === 'birch') {
        // A trunk that forks into a few limbs, each ending in clumps of leaves
        const birch = kind === 'birch';
        const low = birch ? bark.birchLow : bark.beech, high = birch ? bark.birch : bark.beechHigh;
        const fork = rand.range(0.3, 0.45);
        wood.push(limb(along(0, 0.01), along(fork, 0.01), h * (birch ? 0.016 : 0.024), h * (birch ? 0.013 : 0.019), low, high));
        const crown = along(birch ? 0.7 : 0.66);
        const width = h * (birch ? 0.17 : 0.27), depth = h * (birch ? 0.27 : 0.22);
        const limbs = birch ? 2 : 3 + Math.floor(rand() * 2);
        const top = along(fork, 0.01);
        for (let l = 0; l < limbs; l++) {
            const a = (l / limbs) * Math.PI * 2 + rand() * 0.8;
            const end = crown.clone().add(new THREE.Vector3(Math.cos(a) * width * 0.55, Math.sin(a) * width * 0.55, rand.range(-0.2, 0.5) * depth));
            wood.push(limb(top, end, h * (birch ? 0.01 : 0.015), h * 0.005, high, high));
        }
        const clumps = birch ? 7 : 9 + Math.floor(rand() * 4);
        for (let i = 0; i < clumps; i++) {
            const a = rand() * Math.PI * 2, r = Math.sqrt(rand());
            centre.set(crown.x + Math.cos(a) * width * r, crown.y + Math.sin(a) * width * r, crown.z + rand.range(-0.6, 0.85) * depth * (1 - r * 0.4));
            clump(centre, h * rand.range(0.09, 0.13), 0.8, birch ? 20 : 26, LEAVES, birch ? tints.birch : tints.beech, h * (birch ? 0.08 : 0.1));
        }
    } else {
        // Shrub: a few stems, leaves close to the ground
        const clumps = 3 + Math.floor(rand() * 3);
        for (let i = 0; i < clumps; i++) {
            const a = rand() * Math.PI * 2, r = rand() * h * 0.35;
            centre.set(base.x + Math.cos(a) * r, base.y + Math.sin(a) * r, base.z + rand.range(0.35, 0.75) * h);
            wood.push(limb(base, centre, h * 0.02, h * 0.01, bark.beech, bark.beech, 5));
            clump(centre, h * rand.range(0.3, 0.45), 0.75, 22, LEAVES, tints.shrub, h * 0.3);
        }
    }
}

/* ---------- SHADER TWEAKS ---------- */

/** Foliage lit by its rounded normals on both sides (no flipping for back faces) */
function patchFoliage(shader) {
    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        `float faceDirection = gl_FrontFacing ? 1.0 : -1.0;
        vec3 normal = normalize( vNormal );
        vec3 nonPerturbedNormal = normal;`,
    );
}

/** What stands between the camera and the emplacement thins out, in a fine dither */
function patchCutaway(shader, uniforms) {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCutWorld;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvCutWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
            varying vec3 vCutWorld;
            uniform vec3 uCutCentre;
            uniform float uCutRadius;`)
        .replace('void main() {', `void main() {
            {
                vec3 toCentre = uCutCentre - cameraPosition;
                float centreAlong = length(toCentre);
                vec3 dir = toCentre / centreAlong;
                vec3 toPoint = vCutWorld - cameraPosition;
                float along = dot(toPoint, dir);
                float off = length(toPoint - dir * along);
                float cut = (1.0 - smoothstep(uCutRadius * 0.95, uCutRadius * 1.2, off))
                          * (1.0 - smoothstep(centreAlong - uCutRadius * 0.9, centreAlong - uCutRadius * 0.35, along));
                float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
                if (cut > dither * 0.9 + 0.05) discard;
            }`);
}

/* ---------- THE FOREST ---------- */

/**
 * @param {object} options
 * @param {(x, y) => number} options.groundAt   The forest floor's height
 * @param {(x, y) => number} options.distance   How far from the bunker's footprint
 * @param {number} options.radius               How far out the forest goes
 * @param {{ radius: number, inner: number, floor: number }} options.pit  The open pit (plants on its floor)
 * @returns {{ group, update(centre: THREE.Vector3, radius: number), dispose() }}
 */
export function createForest({ groundAt, distance, radius: R, pit }) {
    const rand = random(SEED);
    const cover = coverAt(distance);
    const group = new THREE.Group();
    const wood = [];
    const cards = cardBuilder(rand);

    /* Trees: tall ones out in the forest, young ones and shrubs nearer the concrete */
    const placed = [];
    const free = (x, y, room) => placed.every((q) => Math.hypot(q.x - x, q.y - y) > room + q.room);
    const plant = (kind, h, minD, maxD, tries = 40) => {
        for (let t = 0; t < tries; t++) {
            const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * R;
            const x = Math.sin(a) * r, y = Math.cos(a) * r;
            const d = distance(x, y);
            if (d < minD || d > maxD) continue;
            if (cover(x, y).path > 0.35 && kind !== 'shrub') continue;
            const room = h * (kind === 'shrub' ? 0.12 : kind === 'spruce' ? 0.13 : 0.1);
            if (!free(x, y, room)) continue;
            placed.push({ x, y, room });
            tree(kind, new THREE.Vector3(x, y, groundAt(x, y) - 0.1), h, rand, wood, cards);
            return true;
        }
        return false;
    };
    const kinds = ['pine', 'pine', 'pine', 'pine', 'spruce', 'spruce', 'spruce', 'beech', 'beech', 'birch'];
    const heights = { pine: [17, 23], spruce: [11, 17], beech: [12, 17], birch: [10, 14] };
    for (let i = 0; i < 52; i++) {
        const kind = kinds[i % kinds.length];
        plant(kind, rand.range(...heights[kind]), 2.5, Infinity);
    }
    for (let i = 0; i < 28; i++) plant(rand.pick(['spruce', 'beech', 'beech', 'birch', 'pine']), rand.range(3, 7.5), 1.2, Infinity);
    for (let i = 0; i < 50; i++) plant('shrub', rand.range(1.2, 2.6), i < 30 ? 0.1 : 2, i < 30 ? 2 : Infinity);

    /* Fallen trunks and branches */
    for (let i = 0; i < 10; i++) {
        for (let t = 0; t < 30; t++) {
            const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * R * 0.95;
            const x = Math.sin(a) * r, y = Math.cos(a) * r;
            if (distance(x, y) < 2 || cover(x, y).path > 0.3) continue;
            const heading = rand() * Math.PI * 2, length = i < 4 ? rand.range(5, 10) : rand.range(1.5, 3.5);
            const ex = x + Math.cos(heading) * length, ey = y + Math.sin(heading) * length;
            if (distance(ex, ey) < 2) continue;
            const thick = i < 4 ? rand.range(0.15, 0.3) : rand.range(0.04, 0.08);
            const from = new THREE.Vector3(x, y, groundAt(x, y) + thick * 0.6), to = new THREE.Vector3(ex, ey, groundAt(ex, ey) + thick * 0.5);
            const colour = i < 4 ? linear('#5a4d40') : linear('#4a3d32');
            wood.push(limb(from, to, thick, thick * 0.7, colour, colour.clone().multiplyScalar(0.8), 8));
            break;
        }
    }

    /* Grass and bracken on the ground; grass on the pit's floor */
    const up = new THREE.Vector3(0, 0, 1);
    const grassTuft = (x, y, z, scale) => {
        const height = rand.range(0.25, 0.55) * scale;
        const tint = vary(rand, rand.pick(['#b8bf98', '#a9b088', '#c2b994', '#9aa37a']), 0.12);
        for (let k = 0; k < 2; k++) {
            const a = rand() * Math.PI + (k * Math.PI) / 2;
            const facing = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
            const upward = new THREE.Vector3(rand.range(-0.2, 0.2), rand.range(-0.2, 0.2), 1);
            cards.add(new THREE.Vector3(x, y, z - 0.02), facing, up.clone().addScaledVector(facing, 0.3).normalize(), height * 1.2, height, GRASS, tint, true, upward);
        }
    };
    for (let i = 0; i < 4000; i++) {
        const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * R;
        const x = Math.sin(a) * r, y = Math.cos(a) * r;
        if (distance(x, y) < 0.15) continue;
        const c = cover(x, y);
        if (rand() > c.grass * 0.9 + 0.01 - c.path * 0.5) continue;
        grassTuft(x, y, groundAt(x, y), 1);
    }
    for (let i = 0; i < 2000; i++) {
        const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * R;
        const x = Math.sin(a) * r, y = Math.cos(a) * r;
        const c = cover(x, y);
        if (distance(x, y) < 0.6 || c.path > 0.2 || rand() > 0.07 + c.moss * 0.15) continue;
        const z = groundAt(x, y), height = rand.range(0.5, 1.0);
        const tint = vary(rand, rand.pick(['#c8d0a8', '#b8c09a', '#c4b484']), 0.12);
        for (let k = 0; k < 3; k++) {
            const a2 = rand() * Math.PI * 2;
            const facing = new THREE.Vector3(Math.cos(a2), Math.sin(a2), 0);
            const upward = new THREE.Vector3(Math.cos(a2 + Math.PI / 2), Math.sin(a2 + Math.PI / 2), 0).multiplyScalar(rand.range(-0.4, 0.4)).add(up);
            cards.add(new THREE.Vector3(x, y, z - 0.02), facing, up, height, height, FERN, tint, true, upward);
        }
    }
    if (pit) {
        // Grass come up through the cracks in the pit's floor, mostly at the foot of the walls
        for (let i = 0; i < 160; i++) {
            const a = rand() * Math.PI * 2;
            const r = rand() < 0.6 ? pit.radius - rand.range(0.05, 0.5) : rand.range(pit.inner + 0.3, pit.radius);
            grassTuft(Math.sin(a) * r, Math.cos(a) * r, pit.floor, 0.6);
        }
    }

    /* One geometry for all the wood, one for all the foliage */
    const cut = { uCutCentre: { value: new THREE.Vector3() }, uCutRadius: { value: 0 } };
    const woodMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    woodMaterial.onBeforeCompile = (shader) => patchCutaway(shader, cut);
    const woodMesh = new THREE.Mesh(mergeGeometries(wood), woodMaterial);
    wood.forEach((g) => g.dispose());
    woodMesh.castShadow = woodMesh.receiveShadow = true;

    const foliageMap = foliageTexture(rand);
    const foliageMaterial = new THREE.MeshStandardMaterial({
        map: foliageMap, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85, metalness: 0,
    });
    foliageMaterial.onBeforeCompile = (shader) => { patchFoliage(shader); patchCutaway(shader, cut); };
    const foliage = new THREE.Mesh(cards.build(), foliageMaterial);
    foliage.castShadow = foliage.receiveShadow = true;
    group.add(woodMesh, foliage);

    return {
        group,
        /** Where the emplacement is (world space), so what stands in front of it thins out */
        update(centre, radius) {
            cut.uCutCentre.value.copy(centre);
            cut.uCutRadius.value = radius;
        },
        dispose() {
            foliageMap.dispose();
        },
    };
}
