/**
 * The 3D style (STIL.md): every grey, the light, the edges, the vignette and the resolution that
 * the works' 3D scenes share. A scene takes its greys from here and writes none of its own.
 *
 * The rule: the world is grey and only the sound is lit. Everything that does not sound is a matt
 * zinc grey in a fixed step; the landmark stands a step lighter; only what has to do with the sound
 * (the listening station, the cabin, the speakers and their waves) is white.
 *
 * Try the traits on one test scene in the style lab: https://claude.ai/artifact/X7Z4P38MDqWgmMQejeN467
 */

import * as THREE from 'three';

/* ---------- THE GREYS: Tailwind's zinc scale (the site's greys are its 50–800) ---------- */

const SCALE = { 50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b', 950: '#09090b' };

/** A zinc step, also a half step between two neighbours: zinc(750) is midway between 700 and 800 */
export function zinc(step) {
    if (SCALE[step]) return SCALE[step];
    const steps = Object.keys(SCALE).map(Number).sort((a, b) => a - b);
    const lo = steps.filter((s) => s < step).pop(), hi = steps.find((s) => s > step);
    const f = (step - lo) / (hi - lo);
    const channel = (i) => Math.round(parseInt(SCALE[lo].slice(i, i + 2), 16) * (1 - f) + parseInt(SCALE[hi].slice(i, i + 2), 16) * f);
    return '#' + [1, 3, 5].map((i) => channel(i).toString(16).padStart(2, '0')).join('');
}

/** Each thing in a scene has its step */
export const GREYS = {
    back: zinc(800),                              // behind everything: ink, as the player, the hero and the header
    ground: zinc(850),
    water: zinc(900),                             // darker than the land
    walls: [zinc(750), zinc(725), zinc(700)],
    roofs: [zinc(775), zinc(650)],                // slate, tiles
    streets: zinc(650),                           // muted: a few steps over the ground, never light
    sideStreets: zinc(700),
    paths: zinc(750),
    squares: zinc(750),
    leaves: [zinc(700), zinc(650), zinc(600)],
    trunk: zinc(775),
    landmark: zinc(550), landmarkRoof: zinc(500), // one per work, a step lighter than the rest
    haze: zinc(575),                              // the distance greys over into this, then is gone into the dark
    mist: zinc(300),
    edge: zinc(50),                               // the faint edges
    sound: zinc(50),                              // white: only the sound
    soundAway: zinc(400),                         // a sound you are not at
};

/* ---------- THE LIGHT: one set for every scene ---------- */

export const LIGHT = {
    sky: 0xe8e8ec, fromBelow: 0x202024, skyStrength: 1.6,   // soft light from the whole sky
    sun: 0xffffff, sunStrength: 1.5,                         // a low sun from the south-west, soft shadows
};

/** The sky's light and the sun. Place the sun (low from the south-west of the scene) and its shadow yourself */
export function lights() {
    return {
        sky: new THREE.HemisphereLight(LIGHT.sky, LIGHT.fromBelow, LIGHT.skyStrength),
        sun: new THREE.DirectionalLight(LIGHT.sun, LIGHT.sunStrength),
    };
}

/** The one material for everything grey: matt, faceted, its colours in the vertices */
export function greyMaterial(options = {}) {
    return new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...options });
}

/* ---------- THE EDGES: very faint, as pencil on a model ---------- */

export const EDGES = { buildings: 0.064, trees: 0.04, landmark: 0.18, angle: 30 };

/**
 * Faint white lines along a geometry's edges (where faces meet at more than EDGES.angle degrees).
 * @param {THREE.BufferGeometry} geometry
 * @param {number} strength  EDGES.buildings, EDGES.trees or EDGES.landmark
 */
export function edgeLines(geometry, strength, angle = EDGES.angle) {
    const lines = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, angle),
        new THREE.LineBasicMaterial({ color: GREYS.edge, transparent: true, opacity: strength, depthWrite: false }),
    );
    lines.renderOrder = 1;
    return lines;
}

/* ---------- THE FRAME: one vignette, the resolution, the renderer ---------- */

/** The picture fades into the dark at the top and the bottom, behind the header and the controls */
export const VIGNETTE = { top: 15, bottom: [60, 92] };   // percent of the height

/** The vignette as a CSS background over the canvas */
export const vignette = `linear-gradient(to bottom, ${GREYS.back} 0%, transparent ${VIGNETTE.top}%, transparent ${VIGNETTE.bottom[0]}%, ${GREYS.back} ${VIGNETTE.bottom[1]}%)`;

/** The same as a CSS mask, for a canvas over the player's dark background */
export const vignetteMask = `linear-gradient(to bottom, transparent 0%, black ${VIGNETTE.top}%, black ${VIGNETTE.bottom[0]}%, transparent ${VIGNETTE.bottom[1]}%)`;

/** A phone or a tablet: a touch screen with no mouse */
export const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;

/** Pixels per CSS pixel: up to 1.5 on a phone (with antialiasing that is sharp enough), up to 2 elsewhere */
export const pixelRatio = () => Math.min(window.devicePixelRatio || 1, isPhone() ? 1.5 : 2);

/** The sun's shadow map: smaller on a phone */
export const shadowMapSize = () => (isPhone() ? 1024 : 2048);

/** How long the way into the room takes: the 3D picture tones in once it is ready (ms) */
export const FADE_IN = 700;

/**
 * Tones a canvas in from the dark once its first picture is drawn: call it right after starting to
 * draw. With "reduce motion" it is there at once.
 */
export function fadeIn(canvas) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    canvas.style.opacity = '0';
    canvas.style.transition = `opacity ${FADE_IN}ms ease-out`;
    // two frames: the first picture is drawn before the toning starts
    requestAnimationFrame(() => requestAnimationFrame(() => { canvas.style.opacity = '1'; }));
}

/** The renderer in the style: the greys as written (no tone mapping), the dark behind */
export function styleRenderer(renderer, { clear = true } = {}) {
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setPixelRatio(pixelRatio());
    if (clear) renderer.setClearColor(GREYS.back, 1);
}
