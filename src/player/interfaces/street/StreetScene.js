'use client';

/**
 * The street interface's 3D (three.js): Kirkestræde in Køge at eye level, from Torvet to Sankt
 * Nicolai Kirke, in the 3D style (STIL.md, kit/style.js): the style's zinc greys, its light from the
 * sky and a low sun, the church a step lighter as the landmark, faint edges. Only the sound is lit:
 * the speakers round no. 20. The street is clear between the square and the church; past both ends
 * it dissolves into the haze, with mist drifting in it, so the walk ends in mist whichever way you go.
 *
 * The houses are built from their footprints in OpenStreetMap (src/player/vaerker/<værk>/, street.js);
 * their faces — half-timbering, windows, doors, tiles, the cobbles — are drawn by the shaders here.
 *
 * Scrolling walks: down goes up the street towards the church, up goes back towards Torvet (a
 * finger drags the same way, the arrow keys and W / S walk too). You turn to face the way you go.
 * The pointer looks about a little; a drag looks further, and up at the tower.
 *
 * The installation stood round Kirkestræde 20: eight speakers on the walls, over some 30 m. They
 * glow white while the work plays, and light the walls round them.
 *
 * @param {object} data           The street (src/player/vaerker/streets.js)
 * @param {boolean} sounding      Whether the work is playing
 * @param {(at: { s: number, f: number }) => void} [onMove]  Where you are: metres along the street, and 0–1 of the walk
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildStreet, cobbleTexture, hazeMap } from '@/player/interfaces/street/street';
import { GREYS, LIGHT, EDGES, zinc, vignetteMask, pixelRatio, fadeIn } from '@/player/kit/style';

/* ---------- THE LOOK: the 3D style (kit/style.js) ---------- */

const rgb = (hex) => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
const hex = (s) => parseInt(s.slice(1), 16);
/** A style grey as a GLSL constant, in the renderer's linear working colour */
const glsl = (c) => { const v = new THREE.Color(c); return `vec3(${v.r.toFixed(4)}, ${v.g.toFixed(4)}, ${v.b.toFixed(4)})`; };
const MIST = hex(GREYS.haze);   // the mist drifting in the haze, the haze's grey (sRGB, as it is drawn)
const SUN = new THREE.Vector3(-0.45, 0.62, 0.64).normalize();   // low from the south-west

/** The surfaces' greys, each a zinc step (STIL.md): written into the shaders */
const PALETTE = `
    const vec3 PLASTER_A = ${glsl(zinc(650))}, PLASTER_B = ${glsl(zinc(600))}, PLASTER_DARK = ${glsl(zinc(700))};
    const vec3 TIMBER = ${glsl(zinc(825))}, TIMBER_PALE = ${glsl(zinc(500))};
    const vec3 GLASS_LOW = ${glsl(zinc(900))}, GLASS_HIGH = ${glsl(zinc(800))};
    const vec3 FRAME_DARK = ${glsl(zinc(800))}, FRAME_PALE = ${glsl(zinc(500))};
    const vec3 DOOR = ${glsl(zinc(825))}, PLINTH_C = ${glsl(zinc(775))}, CHIMNEY = ${glsl(zinc(750))};
    const vec3 SLATE = ${glsl(GREYS.roofs[0])}, TILES = ${glsl(GREYS.roofs[1])};
    const vec3 LANDMARK = ${glsl(GREYS.landmark)}, LANDMARK_LIGHT = ${glsl(zinc(400))}, LANDMARK_DARK = ${glsl(zinc(700))};
    const vec3 HOLE = ${glsl(zinc(900))}, HANDS = ${glsl(zinc(825))};
    const vec3 GAP = ${glsl(zinc(875))}, STONE_A = ${glsl(zinc(700))}, STONE_B = ${glsl(zinc(600))};
    const vec3 SKY_LIGHT = ${glsl(LIGHT.sky)}, FROM_BELOW = ${glsl(LIGHT.fromBelow)}, SUN_LIGHT = ${glsl(LIGHT.sun)};
    const float SKY_STRENGTH = ${LIGHT.skyStrength.toFixed(3)}, SUN_STRENGTH = ${LIGHT.sunStrength.toFixed(3)};`;
const EYE = 1.65;            // metres
const STEP = 0.032;          // metres walked per pixel scrolled
const TOUCH = 0.09;          // metres walked per pixel dragged

/* ---------- THE SHADERS ---------- */

const VERTEX = `
    attribute vec2 aUv;
    attribute vec4 aInfo;
    varying vec3 vWorld;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec4 vInfo;
    void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vUv = aUv;
        vInfo = aInfo;
        gl_Position = projectionMatrix * viewMatrix * w;
    }`;

/** Light and haze, shared by every surface */
const COMMON = `${PALETTE}
    #ifndef PI
    #define PI 3.141592653589793
    #endif
    uniform vec3 uSpeakers[8];
    uniform float uSound;
    uniform vec3 uCamera;
    uniform vec3 uSun;
    uniform vec3 uHaze;
    uniform sampler2D uHazeMap;
    uniform vec4 uExtent;
    uniform float uTime;
    varying vec3 vWorld;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec4 vInfo;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float band(float x, float a, float b) { return step(a, x) * step(x, b); }

    float hazeAt(vec2 at) {
        vec2 uv = (at - uExtent.xy) / (uExtent.zw - uExtent.xy);
        if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 1.0;
        return texture2D(uHazeMap, uv).r;
    }

    /** The light on a surface, as the style's (kit/style.js): the whole sky, a low sun and, while the work plays, the speakers */
    vec3 lit(vec3 albedo, vec3 n, float shine) {
        vec3 p = vWorld;
        vec3 irradiance = mix(FROM_BELOW, SKY_LIGHT, n.y * 0.5 + 0.5) * SKY_STRENGTH + SUN_LIGHT * max(dot(n, uSun), 0.0) * SUN_STRENGTH;
        for (int i = 0; i < 8; i++) {
            vec3 L = uSpeakers[i] - p;
            float d = length(L);
            irradiance += vec3(max(dot(n, L / d), 0.0) / (1.0 + d * d / 3.0) * uSound * 4.5);
        }
        return albedo * irradiance / PI;
    }

    /** Into the haze: past the street's ends, away from it, and a little with the distance */
    vec4 hazed(vec3 c) {
        float h = hazeAt(vWorld.xz);
        float far = 1.0 - exp(-distance(uCamera, vWorld) * 0.0065);
        return linearToOutputTexel(vec4(mix(c, uHaze, max(h * 0.97, far * 0.75)), 1.0));
    }`;

/** The fronts of the houses: plaster or half-timbering, windows with bars, a door */
const FACADE = `
    void main() {
        // Rounded: a value carried to every pixel of a face arrives a hair different at each, and the hashes would make noise of it
        float style = floor(vInfo.x + 0.5), seed = floor(vInfo.y * 1000.0 + 0.5) / 1000.0, W = vInfo.z, E = vInfo.w;
        vec2 uv = vUv;
        float PLINTH = 0.35;
        float storeys = E < 4.5 ? 1.0 : (E < 7.8 ? 2.0 : 3.0);
        float sh = (E - PLINTH) / storeys;
        float st = clamp(floor((uv.y - PLINTH) / sh), 0.0, storeys - 1.0);
        float sv = uv.y - PLINTH - st * sh;
        float nb = max(2.0, floor(W / 1.5));
        float bw = W / nb;
        float b = floor(uv.x / bw);
        float bx = uv.x - b * bw;
        bool gable = uv.y > E;

        vec3 plaster = style > 1.5 ? PLASTER_DARK : mix(PLASTER_A, PLASTER_B, hash(vec2(seed * 9.1, 3.0)));
        vec3 col = plaster * (0.93 + 0.1 * noise(uv * 2.5) + 0.04 * noise(uv * 19.0));

        // The windows and the door: where they are
        float wy0 = st < 0.5 ? 0.75 : 0.42, wy1 = sh - 0.34;
        float door = floor(hash(vec2(seed * 13.0, 1.0)) * nb);
        bool isDoor = !gable && st < 0.5 && b == door && W > 3.5;
        bool hasWin = !gable && !isDoor && hash(vec2(b + 0.5, st + seed * 17.0)) > 0.1;
        float ww = min(0.95, bw * 0.56);
        float wx0 = (bw - ww) * 0.5, wx1 = wx0 + ww;
        bool inWin = hasWin && bx > wx0 && bx < wx1 && sv > wy0 && sv < wy1;
        // The gable's window
        float gx = abs(uv.x - W * 0.5);
        bool inGableWin = gable && gx < 0.36 && uv.y > E + 0.55 && uv.y < E + 1.45 && W > 4.5;

        // Half-timbering: posts at the bays, beams at the floors and the eaves, rails at the windows
        if (style > 0.5) {
            float t = 0.085;
            float beam = 0.0;
            beam += step(min(bx, bw - bx), t);
            beam += band(uv.y, PLINTH, PLINTH + 0.17);
            for (float k = 1.0; k < 3.0; k++) if (k < storeys) beam += step(abs(uv.y - PLINTH - k * sh), 0.1);
            beam += band(uv.y, E - 0.2, E);
            if (!gable) {
                beam += step(abs(sv - wy0 + 0.05), 0.05) + step(abs(sv - wy1 - 0.05), 0.05);
                // A brace across a bay with no window
                if (!hasWin && !isDoor) {
                    float x = bx / bw, y = sv / sh;
                    beam += step(abs(x - y), 0.06);
                }
            } else {
                beam += step(abs(uv.x - W * 0.5), t);
                beam += step(abs(fract((uv.y - E) / 1.5) - 0.5), 0.06);
            }
            vec3 wood = style > 1.5 ? TIMBER_PALE : TIMBER;
            col = mix(col, wood * (0.9 + 0.2 * noise(uv * vec2(1.0, 14.0))), clamp(beam, 0.0, 1.0));
        } else if (!gable) {
            // Plaster: a band under the eaves
            col *= 1.0 - 0.18 * band(uv.y, E - 0.35, E);
        }

        // A window: frame, bars, dark glass (no window is lit: only the sound is, STIL.md)
        if (inWin || inGableWin) {
            vec2 q = inWin ? vec2(bx - wx0, sv - wy0) : vec2(uv.x - W * 0.5 + 0.36, uv.y - E - 0.55);
            vec2 sz = inWin ? vec2(ww, wy1 - wy0) : vec2(0.72, 0.9);
            float frame = step(min(min(q.x, sz.x - q.x), min(q.y, sz.y - q.y)), 0.07);
            float bars = step(abs(q.x - sz.x * 0.5), 0.025) + step(abs(q.y - sz.y * 0.56), 0.025);
            if (sz.y > 1.2) bars += step(abs(q.y - sz.y * 0.28), 0.02);
            vec3 glass = mix(GLASS_LOW, GLASS_HIGH, q.y / sz.y);
            vec3 frameCol = style > 0.5 && style < 1.5 ? FRAME_DARK : FRAME_PALE;
            col = mix(glass, frameCol, clamp(frame + bars, 0.0, 1.0));
        }
        if (isDoor && bx > bw * 0.17 && bx < bw * 0.83 && uv.y > PLINTH && uv.y < PLINTH + 2.05) {
            float x = (bx - bw * 0.17) / (bw * 0.66);
            col = DOOR * (0.85 + 0.3 * step(0.08, min(x, 1.0 - x)) * step(abs(fract(x * 2.0) - 0.5), 0.42));
        }
        if (uv.y < PLINTH) col = PLINTH_C * (0.8 + 0.4 * noise(uv * 6.0));
        col *= 0.55 + 0.45 * smoothstep(0.0, 1.3, uv.y);

        vec3 c = lit(col, normalize(vNormal), 0.0);
        gl_FragColor = hazed(c);
    }`;

/** Walls round the sides and backs: plain plaster; chimneys: brick */
const WALL = `
    void main() {
        vec3 col = mix(PLASTER_A, PLASTER_B, vInfo.y) * (0.92 + 0.12 * noise(vUv * 2.0));
        if (vInfo.x > 0.5) col = CHIMNEY * (0.85 + 0.15 * step(0.1, fract(vUv.y / 0.28)));
        col *= 0.55 + 0.45 * smoothstep(0.0, 1.3, vUv.y);
        gl_FragColor = hazed(lit(col, normalize(vNormal), 0.0));
    }`;

/** The roofs: rows of curved tiles, darker under each row; some slate-dark */
const ROOF = `
    void main() {
        vec2 uv = vUv;
        float row = floor(uv.y / 0.34);
        float x = (uv.x + mod(row, 2.0) * 0.11) / 0.22;
        float tile = fract(x);
        float rr = fract(uv.y / 0.34);
        vec3 tone = vInfo.y < 0.22 ? SLATE : TILES;
        vec3 c = tone * (0.85 + 0.25 * hash(vec2(floor(x), row)));
        c *= 0.72 + 0.28 * sin(tile * 3.14159);
        c *= 0.55 + 0.45 * smoothstep(0.0, 0.3, rr);
        c *= 0.9 + 0.2 * noise(uv * 0.6);
        gl_FragColor = hazed(lit(c, normalize(vNormal), 0.0));
    }`;

/** The church, the landmark: a step lighter, tall pointed windows, a plinth */
const CHURCH = `
    void main() {
        vec2 uv = vUv;
        vec3 col = LANDMARK * (0.9 + 0.12 * noise(uv * 1.5) + 0.05 * step(0.12, fract(uv.y / 0.3)));
        float x = mod(uv.x, 6.4) - 3.2;
        float top = 7.6 + 1.05 * sqrt(max(0.0, 1.0 - pow(abs(x) / 0.85, 1.4)));
        if (abs(x) < 0.85 && uv.y > 3.0 && uv.y < top) {
            float bar = step(abs(x), 0.04) + step(abs(fract((uv.y - 3.0) / 0.9) - 0.5), 0.03);
            col = mix(GLASS_HIGH, LANDMARK_DARK, clamp(bar, 0.0, 1.0));
        }
        if (uv.y < 0.6) col *= 0.75;
        col *= 0.6 + 0.4 * smoothstep(0.0, 1.5, uv.y);
        gl_FragColor = hazed(lit(col, normalize(vNormal), 0.0));
    }`;

/** The tower: brick, a clock, and openings for the bells near the top */
const TOWER = `
    void main() {
        vec2 uv = vUv;
        float W = vInfo.z, H = vInfo.w;
        vec3 col = LANDMARK * (0.9 + 0.12 * noise(uv * 1.5) + 0.05 * step(0.12, fract(uv.y / 0.3)));
        float cx = uv.x - W * 0.5;
        // The bells' openings: a pair under the top
        float ox = abs(abs(cx) - 1.0);
        if (ox < 0.42 && uv.y > H - 6.5 && uv.y < H - 3.0 + 0.42 * sqrt(max(0.0, 1.0 - ox * ox / 0.18))) col = HOLE;
        // The clock
        vec2 q = vec2(cx, uv.y - (H - 10.0));
        float r = length(q);
        if (r < 1.25) {
            col = LANDMARK_LIGHT;
            float a = atan(q.y, q.x);
            if (r > 1.1) col = LANDMARK_DARK;
            if (r < 1.05 && r > 0.88 && abs(fract(a / 6.28318 * 12.0 + 0.5) - 0.5) < 0.06) col = HANDS;
            vec2 h1 = vec2(cos(1.1), sin(1.1)), h2 = vec2(cos(-0.35), sin(-0.35));
            if (abs(dot(q, vec2(-h1.y, h1.x))) < 0.05 && dot(q, h1) > 0.0 && dot(q, h1) < 0.6) col = HANDS;
            if (abs(dot(q, vec2(-h2.y, h2.x))) < 0.04 && dot(q, h2) > 0.0 && dot(q, h2) < 0.9) col = HANDS;
        }
        // Blind niches up the tower
        float nx = abs(cx);
        if (nx < 0.5 && uv.y > 6.0 && uv.y < 14.0) col *= 0.7;
        col *= 0.6 + 0.4 * smoothstep(0.0, 1.5, uv.y);
        gl_FragColor = hazed(lit(col, normalize(vNormal), 0.0));
    }`;

/** The cobbles, from the texture (street.js): lit from their own bumps, the street's muted greys */
const GROUND = `
    uniform sampler2D uCobbles;
    uniform vec2 uAlong;
    void main() {
        vec2 across = vec2(-uAlong.y, uAlong.x);
        vec2 g = vec2(dot(vWorld.xz, across), dot(vWorld.xz, uAlong)) / 2.0;
        vec4 t = texture2D(uCobbles, g);
        float e = 1.0 / 512.0;
        float hx = texture2D(uCobbles, g + vec2(e, 0.0)).g - texture2D(uCobbles, g - vec2(e, 0.0)).g;
        float hy = texture2D(uCobbles, g + vec2(0.0, e)).g - texture2D(uCobbles, g - vec2(0.0, e)).g;
        float near = 1.0 - smoothstep(6.0, 40.0, distance(uCamera, vWorld));
        vec3 n = normalize(vec3(0.0, 1.0, 0.0) - (vec3(across.x, 0.0, across.y) * hx + vec3(uAlong.x, 0.0, uAlong.y) * hy) * 2.2 * near);
        vec3 stone = mix(GAP, mix(STONE_A, STONE_B, t.r), t.b);
        stone *= 0.85 + 0.28 * noise(vWorld.xz * 0.35);
        gl_FragColor = hazed(lit(stone, n, 0.0));
    }`;

const SKY_SHADER = {
    vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: `
        uniform vec3 uHaze, uSky;
        varying vec3 vDir;
        void main() {
            float y = normalize(vDir).y;
            gl_FragColor = linearToOutputTexel(vec4(mix(uHaze, uSky, smoothstep(-0.02, 0.42, y)), 1.0));
        }`,
};

/** Tileable soft noise, for the mist */
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

/** A soft round light, for the speakers' glow */
function glowTexture() {
    const size = 64, data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const r = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2);
            const a = Math.pow(Math.max(0, 1 - r), 2.2);
            data.set([255, 255, 255, Math.round(a * 255)], (y * size + x) * 4);
        }
    }
    const tex = new THREE.DataTexture(data, size, size);
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
}

/* ---------- THE SCENE ---------- */

export default function StreetScene({ data, sounding, onMove }) {
    const containerRef = useRef(null);
    const state = useRef({ sounding, onMove });
    const [failed, setFailed] = useState(false);

    useEffect(() => { state.current.sounding = sounding; state.current.onMove = onMove; }, [sounding, onMove]);

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
        renderer.setPixelRatio(pixelRatio());
        renderer.setClearColor(0x000000, 0);
        const canvas = renderer.domElement;
        canvas.className = 'absolute inset-0 size-full touch-none';
        // The style's vignette: faded out under the header and under the controls
        canvas.style.maskImage = canvas.style.webkitMaskImage = vignetteMask;
        container.prepend(canvas);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 2000);

        /* ---------- the street ---------- */

        const street = buildStreet(data);
        const { path, extent } = street;
        const [w0, w1] = data.walk;
        const hazeTex = hazeMap(path, data, extent);

        const uniforms = {
            uSpeakers: { value: street.speakers.map((s) => new THREE.Vector3(s.x, s.y, s.z)) },
            uSound: { value: 0 },
            uCamera: { value: new THREE.Vector3() },
            uSun: { value: SUN },
            uHaze: { value: new THREE.Color(GREYS.haze) },
            uHazeMap: { value: hazeTex },
            uExtent: { value: new THREE.Vector4(...extent) },
            uTime: { value: 0 },
        };
        const material = (body, extra = {}) => new THREE.ShaderMaterial({
            uniforms: { ...uniforms, ...extra },
            vertexShader: VERTEX,
            fragmentShader: COMMON + body,
        });
        const add = (geometry, mat) => {
            if (!geometry) return null;
            const mesh = new THREE.Mesh(geometry, mat);
            mesh.frustumCulled = false;
            scene.add(mesh);
            return mesh;
        };

        // The sky: dark above, the haze's grey low down
        const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
            ...SKY_SHADER, uniforms: { uHaze: { value: new THREE.Color(GREYS.haze) }, uSky: { value: new THREE.Color(GREYS.back) } }, side: THREE.BackSide, depthWrite: false,
        }));
        sky.renderOrder = -1;
        scene.add(sky);

        // The cobbles, everywhere, the rows across the street
        const [ex0, ez0, ex1, ez1] = extent;
        const ground = new THREE.PlaneGeometry(ex1 - ex0, ez1 - ez0).rotateX(-Math.PI / 2).translate((ex0 + ex1) / 2, 0, (ez0 + ez1) / 2);
        ground.setAttribute('aUv', new THREE.Float32BufferAttribute(new Float32Array(ground.attributes.position.count * 2), 2));
        ground.setAttribute('aInfo', new THREE.Float32BufferAttribute(new Float32Array(ground.attributes.position.count * 4), 4));
        const cobbles = cobbleTexture();
        cobbles.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const mid = path.direction((w0 + w1) / 2, 60);
        add(ground, material(GROUND, { uCobbles: { value: cobbles }, uAlong: { value: new THREE.Vector2(...mid) } }));

        const g = street.geometries;
        add(g.facades, material(FACADE));
        add(g.walls, material(WALL));
        add(g.roofs, material(ROOF));
        add(g.church, material(CHURCH));
        add(g.tower, material(TOWER));

        // The faint edges of the style (EDGES), fading into the haze as the surfaces do
        const EDGE = 'uniform float uOpacity; void main() { float h = hazeAt(vWorld.xz); float far = 1.0 - exp(-distance(uCamera, vWorld) * 0.0065); gl_FragColor = vec4(1.0, 1.0, 1.0, uOpacity * (1.0 - max(h * 0.97, far * 0.75))); }';
        for (const [geometry, opacity] of [[g.facades, EDGES.buildings], [g.walls, EDGES.buildings], [g.roofs, EDGES.buildings], [g.church, EDGES.landmark], [g.tower, EDGES.landmark]]) {
            if (!geometry) continue;
            const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, EDGES.angle), new THREE.ShaderMaterial({
                uniforms: { ...uniforms, uOpacity: { value: opacity } },
                vertexShader: VERTEX,
                fragmentShader: COMMON + EDGE,
                transparent: true,
                depthWrite: false,
            }));
            lines.frustumCulled = false;
            scene.add(lines);
        }

        /* ---------- the speakers: a sphere on a bracket, white while the work plays ---------- */

        const glowTex = glowTexture();
        const fixture = new THREE.MeshBasicMaterial({ color: new THREE.Color(zinc(800)) });
        const speakerMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(GREYS.soundAway) });
        const away = new THREE.Color(GREYS.soundAway), white = new THREE.Color(GREYS.sound);
        const speakers = street.speakers.map((s, i) => {
            const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 12), speakerMaterial.clone());
            ball.position.set(s.x, s.y, s.z);
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.35), fixture);
            arm.position.set(s.x - s.wall[0] * 0.17, s.y, s.z - s.wall[1] * 0.17);
            arm.lookAt(s.x, s.y, s.z);
            const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(GREYS.sound), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
            halo.position.copy(ball.position);
            scene.add(ball, arm, halo);
            return { ball, halo, phase: i * 0.7 };
        });

        /* ---------- the mist: sheets of it past both ends, and low over the cobbles ---------- */

        const mistTex = [mistTexture(3), mistTexture(11)];
        const mists = [];
        const MIST_FRAGMENT = `
            uniform sampler2D uTex; uniform vec2 uShift; uniform float uAmount, uScale; uniform vec3 uColor, uCamera;
            uniform sampler2D uHazeMap; uniform vec4 uExtent; uniform float uLow;
            varying vec3 vAt; varying vec2 vUv;
            float hazeAt(vec2 at) {
                vec2 uv = (at - uExtent.xy) / (uExtent.zw - uExtent.xy);
                if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 1.0;
                return texture2D(uHazeMap, uv).r;
            }
            void main() {
                vec2 p = (uLow > 0.5 ? vAt.xz : vec2(vAt.x + vAt.z, vAt.y)) / uScale;
                float n = texture2D(uTex, p + uShift).r * 0.6 + texture2D(uTex, p * 2.7 - uShift * 1.6).r * 0.4;
                float a = smoothstep(0.3, 0.85, n) * uAmount;
                float near = smoothstep(2.0, 12.0, distance(uCamera, vAt));
                if (uLow > 0.5) a *= 0.2 + 0.8 * hazeAt(vAt.xz);
                else a *= smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y)) * smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
                gl_FragColor = vec4(uColor, a * near);
            }`;
        const MIST_VERTEX = 'varying vec3 vAt; varying vec2 vUv; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vAt = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
        const mistMaterial = (i, amount, scale, low) => new THREE.ShaderMaterial({
            uniforms: {
                uTex: { value: mistTex[i % 2] }, uShift: { value: new THREE.Vector2() }, uAmount: { value: amount }, uScale: { value: scale },
                uColor: { value: rgb(MIST) }, uCamera: uniforms.uCamera, uHazeMap: uniforms.uHazeMap, uExtent: uniforms.uExtent, uLow: { value: low ? 1 : 0 },
            },
            vertexShader: MIST_VERTEX,
            fragmentShader: MIST_FRAGMENT,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        // Sheets across the street, one behind another, thicker the further out
        const sheet = new THREE.PlaneGeometry(70, 26).translate(0, 11, 0);
        for (const [from, dir] of [[w0 - 6, -1], [w1 + 5, 1]]) {
            for (let k = 0; k < 7; k++) {
                const s = from + dir * k * 8;
                const p = path.at(s);
                const [tx, tz] = path.direction(s, 10);
                const mesh = new THREE.Mesh(sheet, mistMaterial(k, 0.22 + k * 0.08, 26 + k * 3, false));
                mesh.position.set(p.x, 0, p.z);
                mesh.rotation.y = Math.atan2(tx, tz);
                mesh.renderOrder = 10 + (dir > 0 ? k : 7 - k);
                scene.add(mesh);
                mists.push({ mesh, speed: [0.012 * (k % 2 ? 1 : -1), 0.004] });
            }
        }
        // Low over the cobbles, thicker where the haze is
        for (const [y, amount, scale, i] of [[0.35, 0.35, 34, 0], [1.1, 0.22, 52, 1]]) {
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ex1 - ex0, ez1 - ez0).rotateX(-Math.PI / 2), mistMaterial(i, amount, scale, true));
            mesh.position.set((ex0 + ex1) / 2, y, (ez0 + ez1) / 2);
            mesh.renderOrder = 5 + i;
            scene.add(mesh);
            mists.push({ mesh, speed: [0.008 * (i ? -1 : 1), 0.005] });
        }

        /* ---------- size ---------- */

        const size = { w: 1, h: 1 };
        const resize = () => {
            const { clientWidth: w, clientHeight: h } = container;
            if (!w || !h) return;
            size.w = w; size.h = h;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.fov = w < h ? 74 : 60;
            // The street's vanishing point a little above the middle, clear of the controls
            camera.setViewOffset(w, h, 0, (0.5 - (w < h ? 0.42 : 0.44)) * h, w, h);
            camera.updateProjectionMatrix();
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        /* ---------- walking: the wheel, a finger, the keys; looking: the pointer and a drag ---------- */

        const walk = { target: w0 + 2, s: w0 + 2, facing: 1, against: 0, phase: 0 };
        const go = (metres) => { walk.target = THREE.MathUtils.clamp(walk.target + metres, w0, w1); };
        const pointer = { x: 0, y: 0 };
        const hover = window.matchMedia('(hover: hover)').matches;   // only a mouse that hovers looks about by itself
        const view = { turn: 0, tilt: 0 };
        let drag = null;
        const onWheel = (e) => {
            e.preventDefault();
            const lines = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? size.h : 1;
            go(THREE.MathUtils.clamp(e.deltaY * lines, -240, 240) * STEP);
        };
        const onDown = (e) => {
            drag = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: null, touch: e.pointerType !== 'mouse' };
            try { canvas.setPointerCapture(e.pointerId); } catch { /* gone already */ }
        };
        const onMovePointer = (e) => {
            if (drag && e.pointerId === drag.id) {
                const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
                // A finger walks when it goes up and down, and looks when it goes sideways; a mouse only looks
                if (!drag.axis && Math.hypot(dx, dy) > 6) drag.axis = drag.touch && Math.abs(dy) > Math.abs(dx) ? 'walk' : 'look';
                if (drag.axis === 'walk') go(-dy * TOUCH);
                if (drag.axis === 'look') {
                    view.turn -= (dx / size.w) * 2.6;
                    view.tilt = THREE.MathUtils.clamp(view.tilt - (dy / size.h) * 1.4, -0.35, 0.9);
                }
                if (drag.axis) { drag.x = e.clientX; drag.y = e.clientY; }
                return;
            }
            if (e.pointerType !== 'mouse' || !hover) return;
            pointer.x = e.clientX / window.innerWidth - 0.5;
            pointer.y = e.clientY / window.innerHeight - 0.5;
        };
        // The mouse leaving the window lets the view settle back
        const onOut = (e) => { if (!e.relatedTarget) { pointer.x = 0; pointer.y = 0; } };
        const onUp = (e) => { if (drag?.id === e.pointerId) drag = null; };
        const held = new Set();
        const onKey = (e) => {
            if (e.target?.closest?.('input, textarea, select, [role="slider"]')) return;
            const k = { ArrowUp: 1, w: 1, W: 1, ArrowDown: -1, s: -1, S: -1 }[e.key];
            if (!k) return;
            e.preventDefault();
            if (e.type === 'keydown') held.add(k); else held.delete(k);
        };
        const onBlur = () => held.clear();
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('pointerdown', onDown);
        window.addEventListener('pointermove', onMovePointer);
        document.addEventListener('pointerout', onOut);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKey);
        window.addEventListener('blur', onBlur);

        /* ---------- every frame ---------- */

        const eased = { x: 0, y: 0, turn: 0, tilt: 0, yaw: null };
        const look = new THREE.Vector3();
        let frame, last = performance.now(), t = 0, sound = 0, reported = { s: -1, at: 0 };

        const tick = (time) => {
            frame = requestAnimationFrame(tick);
            const dt = Math.min((time - last) / 1000, 0.1);
            last = time;
            t += dt;

            // Walk: the keys walk at an even pace; the wheel and a finger set where to, and you get there
            for (const k of held) go(k * 4.2 * dt);
            const before = walk.s;
            walk.s = still ? walk.target : walk.s + (walk.target - walk.s) * (1 - Math.exp(-dt * 2.4));
            const moved = walk.s - before;
            // You turn to face the way you go, once you have gone a few metres that way
            if (moved * walk.facing < 0) walk.against += Math.abs(moved);
            else walk.against = Math.max(0, walk.against - Math.abs(moved) * 2);
            if (walk.against > 2.2) { walk.facing = -walk.facing; walk.against = 0; }
            const speed = Math.abs(moved) / Math.max(dt, 1e-3);
            walk.phase += Math.abs(moved) * (Math.PI / 0.72);

            // The view: along the street the way you face, the pointer, a drag; a drag lets go as you walk on
            if (speed > 0.6 && !drag) view.turn *= Math.exp(-dt * 0.8);
            const k = 1 - Math.exp(-dt * 3);
            eased.x += (pointer.x - eased.x) * k;
            eased.y += (pointer.y - eased.y) * k;
            eased.turn += (view.turn - eased.turn) * k;
            eased.tilt += (view.tilt - eased.tilt) * k;
            const [dx, dz] = path.direction(walk.s);
            const heading = Math.atan2(dx * walk.facing, dz * walk.facing);
            if (eased.yaw === null || still) eased.yaw = heading;
            else {
                let diff = heading - eased.yaw;
                diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                eased.yaw += diff * (1 - Math.exp(-dt * 2.2));
            }
            const yaw = eased.yaw + eased.turn - eased.x * 0.9 + (still ? 0 : Math.sin(t * 0.17) * 0.03);
            const pitch = THREE.MathUtils.clamp(0.04 + eased.tilt - eased.y * 0.5 + (still ? 0 : Math.sin(t * 0.23) * 0.01), -0.4, 1.0);
            const p = path.at(walk.s);
            const bob = still ? 0 : Math.sin(walk.phase) * 0.028 * Math.min(1, speed / 1.2);
            camera.position.set(p.x, EYE + bob, p.z);
            look.set(p.x + Math.sin(yaw) * Math.cos(pitch), EYE + bob + Math.sin(pitch), p.z + Math.cos(yaw) * Math.cos(pitch));
            camera.lookAt(look);
            sky.position.copy(camera.position);
            uniforms.uCamera.value.copy(camera.position);
            uniforms.uTime.value = t;

            // The speakers glow while the work plays, swelling a little
            sound += ((state.current.sounding ? 1 : 0) - sound) * (1 - Math.exp(-dt * 2));
            uniforms.uSound.value = sound;
            speakers.forEach((sp) => {
                const pulse = still ? 1 : 0.8 + 0.2 * Math.sin(t * 2.1 + sp.phase);
                sp.ball.material.color.copy(away).lerp(white, sound);
                sp.halo.material.opacity = sound * 0.55 * pulse;
                sp.halo.scale.setScalar(1.1 + sound * 0.5 * pulse);
            });

            mists.forEach(({ mesh, speed: [sx, sy] }) => {
                if (!still) mesh.material.uniforms.uShift.value.set(t * sx, t * sy);
            });

            renderer.render(scene, camera);

            // Tell where you are, now and then
            if (state.current.onMove && (Math.abs(walk.s - reported.s) > 0.3 || (time - reported.at > 400 && walk.s !== reported.s))) {
                reported = { s: walk.s, at: time };
                state.current.onMove({ s: walk.s, f: (walk.s - w0) / (w1 - w0) });
            }
        };
        frame = requestAnimationFrame(tick);
        fadeIn(canvas);

        return () => {
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMovePointer);
            document.removeEventListener('pointerout', onOut);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKey);
            window.removeEventListener('blur', onBlur);
            scene.traverse((obj) => {
                obj.geometry?.dispose();
                (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m?.dispose());
            });
            [...mistTex, cobbles, hazeTex, glowTex].forEach((tex) => tex.dispose());
            renderer.dispose();
            canvas.remove();
        };
    }, [data]);

    return (
        <div ref={containerRef} className='absolute inset-0'>
            {failed && (
                <p className='absolute inset-x-gutter top-1/3 text-center text-faint'>Gaden kan ikke vises i denne browser.</p>
            )}
        </div>
    );
}
