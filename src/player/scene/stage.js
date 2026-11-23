/**
 * The shared 3D stage behind the 3D players (three.js):
 *
 *  - a photo far behind, shifted per pixel as the camera drifts: the lower part of the photo counts
 *    as near and the top as far, so the ground moves a little more than the sky. Changing the photo
 *    cross-fades. Fades out at its edges so no edge ever shows.
 *  - smoke drifting between the photo and the viewer.
 *  - a camera that drifts a little by itself and with the pointer (up = look up at the sky).
 *  - a `panel` that rides along with the camera: whatever is put on it sits on the screen, as if
 *    mounted on the glass, while the photo and smoke move behind it. Lit by its own fixed light.
 *
 * Used by the works' 3D scenes (Kanon i G3, 53 sekunder til fælles) and by PhotoBackdrop (the
 * photo behind the other interfaces).
 */

import * as THREE from 'three';
import { colors } from '@/styles/colors';
import { pixelRatio, fadeIn } from '@/player/kit/style';
import { frameLoop } from '@/player/scene/loop';

const BACKDROP_DISTANCE = 14;         // photo's distance behind the focus point
const MAX_ORBIT_X = 0.16;             // camera drift sideways (pointer + by itself), radians
const MAX_ORBIT_Y = 0.13;             // up/down: pointer up = look up, towards the sky
const PARALLAX = 0.16;                // how much the lower (near) part of the photo moves extra
export const PANEL_DISTANCE = 0.6;    // the panel's distance in front of the camera

/* ---------- TEXTURES ---------- */

/** A wisp of smoke: fractal noise inside a soft, stretched falloff */
function smokeTexture(seed) {
    const size = 256;
    const grid = 16;
    const rand = (x, y, o) => {
        const n = Math.sin(x * 127.1 + y * 311.7 + o * 74.7 + seed * 19.3) * 43758.5453;
        return n - Math.floor(n);
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    const noise = (x, y, o) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = smooth(x - xi), yf = smooth(y - yi);
        const a = rand(xi, yi, o), b = rand(xi + 1, yi, o), c = rand(xi, yi + 1, o), d = rand(xi + 1, yi + 1, o);
        return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
    };

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            let f = 0, amp = 0.5, freq = 1;
            for (let o = 0; o < 5; o++) {
                f += amp * noise(u * grid * freq / 4, v * grid * freq / 4, o);
                amp *= 0.5;
                freq *= 2;
            }
            const dx = (u - 0.5) * 2, dy = (v - 0.5) * 2.6;
            const falloff = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
            const alpha = Math.min(1, Math.max(0, (f - 0.3) * 3.2)) * Math.pow(falloff, 1.3);
            const k = (y * size + x) * 4;
            image.data[k] = image.data[k + 1] = image.data[k + 2] = 255;
            image.data[k + 3] = alpha * 255;
        }
    }
    ctx.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/** Alpha for the photo: fades out at the bottom, the sides and (a little) the top */
function edgeFadeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const v = ctx.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, '#000');
    v.addColorStop(0.04, '#fff');
    v.addColorStop(0.7, '#fff');
    v.addColorStop(0.97, '#000');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 256, 256);
    ctx.globalCompositeOperation = 'multiply';
    const h = ctx.createLinearGradient(0, 0, 256, 0);
    h.addColorStop(0, '#000');
    h.addColorStop(0.08, '#fff');
    h.addColorStop(0.92, '#fff');
    h.addColorStop(1, '#000');
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
}

/* ---------- BACKDROP SHADER ---------- */

// Two photos, so a new one can cross-fade over the old one. The plane has the view's shape, and each
// photo has its own scale and offset so a photo of any shape covers it (like object-fit: cover, slid
// towards the focus point). A few fixed-point steps find which pixel ends up where after the shift,
// which keeps edges from smearing.
const backdropShader = {
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
    fragmentShader: `
        uniform sampler2D uMapA, uMapB, uFade;
        uniform vec2 uScaleA, uScaleB, uOffsetA, uOffsetB, uShift;
        uniform float uMix, uOpacity, uMono;
        varying vec2 vUv;

        // How near a point of the photo is: the ground (the lower part) is near, the sky is far
        float nearness(vec2 uv) {
            return pow(clamp(1.0 - uv.y, 0.0, 1.0), 1.7) * 0.8;
        }

        vec3 sampleShifted(sampler2D map, vec2 scale, vec2 offset) {
            vec2 base = (vUv - 0.5) * scale + 0.5 + offset;
            vec2 uv = base;
            for (int i = 0; i < 4; i++) uv = base + uShift * nearness(uv);
            return texture2D(map, uv).rgb;
        }

        void main() {
            vec3 a = sampleShifted(uMapA, uScaleA, uOffsetA);
            vec3 b = uMix > 0.0 ? sampleShifted(uMapB, uScaleB, uOffsetB) : a;
            vec3 colour = mix(a, b, uMix);
            float grey = dot(colour, vec3(0.299, 0.587, 0.114));
            gl_FragColor = vec4(mix(colour, vec3(grey), uMono), texture2D(uFade, vUv).g * uOpacity);
            #include <colorspace_fragment>
        }`,
};

/* ---------- STAGE ---------- */

/**
 * @param {HTMLElement} container  Gets the canvas
 * @param {object} options
 * @param {number} [options.focus=0.5]  0–1 across the photo: what stays in view on narrow screens
 * @param {number} [options.smoke=1]  0–1: how much smoke (0 = none)
 * @param {boolean} [options.still=false]  true: the camera neither drifts nor follows the pointer
 * @param {boolean} [options.mono=true]  The photo in black and white, like the covers
 * @param {number} [options.light=1]  How strong the panel's fixed light is (a scene with its own sun turns it down)
 * @param {boolean} [options.shadows=false]  Shadows for lights that cast them
 * @param {(stage) => void} [options.onResize]  Lay out the panel; stage.view has the panel's visible size
 * @param {(dt, t, elapsed) => void} [options.onFrame]  dt is capped (motion), elapsed is wall time (easing)
 */
export function createStage(container, { focus = 0.5, smoke: smokeLevel = 1, mono = true, light = 1, shadows = false, still = false, onResize, onFrame } = {}) {
    let disposed = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(pixelRatio());   // up to 1.5 on a phone, 2 elsewhere (kit/style.js)
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = shadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const canvas = renderer.domElement;
    canvas.className = 'absolute inset-0 size-full';
    canvas.style.touchAction = 'none';
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    container.prepend(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
    scene.add(camera);

    /* Light for the panel, fixed to the camera so things on it always look the same */
    camera.add(new THREE.HemisphereLight(0xffffff, 0xc8c8cc, 1.8 * light));
    const key = new THREE.DirectionalLight(0xffffff, 2.6 * light);
    key.position.set(-1, 1.6, 1.2);
    key.target.position.set(0, 0, -PANEL_DISTANCE);
    camera.add(key, key.target);

    const panel = new THREE.Group();
    panel.position.z = -PANEL_DISTANCE;
    camera.add(panel);

    /* ---------- BACKDROP ---------- */

    const uniforms = {
        uMapA: { value: null }, uScaleA: { value: new THREE.Vector2(1, 1) }, uOffsetA: { value: new THREE.Vector2() },
        uMapB: { value: null }, uScaleB: { value: new THREE.Vector2(1, 1) }, uOffsetB: { value: new THREE.Vector2() },
        uMix: { value: 0 },
        uOpacity: { value: 0 },
        uMono: { value: mono ? 1 : 0 },
        uShift: { value: new THREE.Vector2() },
        uFade: { value: edgeFadeTexture() },
    };
    const backdrop = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.ShaderMaterial({ ...backdropShader, uniforms, transparent: true, depthWrite: false }),
    );
    backdrop.renderOrder = -1;
    scene.add(backdrop);

    // The plane follows the view (fit), not the photo, so a photo of another shape (portrait after
    // landscape, a chapter without a photo of its own showing the cover) is cropped no more than the
    // view needs, whichever photo came first
    let planeAspect = 1;
    const photoAspect = { A: null, B: null };
    let fading = false;
    const loader = new THREE.TextureLoader().setCrossOrigin('anonymous');
    const loadTexture = (url) => new Promise((resolve) => {
        if (!url) return resolve(null);
        loader.load(url, resolve, undefined, () => resolve(null));   // a photo that can't load keeps the one before
    });

    /** Photo A or B covering the plane: its scale, and on narrow screens slid so the focus point is in view */
    const cover = (k) => {
        const aspect = photoAspect[k], scale = uniforms[`uScale${k}`].value;
        if (!aspect) return;
        if (aspect > planeAspect) scale.set(planeAspect / aspect, 1);
        else scale.set(1, aspect / planeAspect);
        const slack = (1 - scale.x) / 2;
        uniforms[`uOffset${k}`].value.set(camera.aspect < 1 ? THREE.MathUtils.clamp(focus - 0.5, -slack, slack) : 0, 0);
    };

    let latest = 0;
    /** Show a photo; cross-fades from the one before */
    const setBackdrop = async (image) => {
        const request = ++latest;
        const map = await loadTexture(image);
        if (disposed || request !== latest || !map) { map?.dispose(); return; }
        map.colorSpace = THREE.SRGBColorSpace;
        const aspect = map.image.width / map.image.height;

        if (!uniforms.uMapA.value) {
            uniforms.uMapA.value = map;
            photoAspect.A = aspect;
            cover('A');
            return;
        }

        // A cross-fade still running finishes instantly, then the new photo fades in over it
        if (fading) settle();
        uniforms.uMapB.value = map;
        photoAspect.B = aspect;
        cover('B');
        uniforms.uMix.value = 0;
        fading = true;
    };

    /** Make B the current photo */
    const settle = () => {
        uniforms.uMapA.value?.dispose();
        uniforms.uMapA.value = uniforms.uMapB.value;
        uniforms.uScaleA.value.copy(uniforms.uScaleB.value);
        uniforms.uOffsetA.value.copy(uniforms.uOffsetB.value);
        photoAspect.A = photoAspect.B;
        uniforms.uMapB.value = null;
        photoAspect.B = null;
        uniforms.uMix.value = 0;
        fading = false;
    };

    /* ---------- SMOKE ---------- */

    // Light wisps show over the dark parts of the photo, grey (shadowed) ones over the sky
    const smokeTextures = [1, 2, 3, 4].map(smokeTexture);
    const smokeTones = [colors.paper, colors.paper, colors.hard];
    const smoke = Array.from({ length: smokeLevel > 0 ? 26 : 0 }, (_, i) => {
        const material = new THREE.SpriteMaterial({
            map: smokeTextures[i % 4], transparent: true, depthWrite: false, fog: false, toneMapped: false,
            color: smokeTones[i % 3], opacity: 0,
        });
        material.rotation = Math.random() * Math.PI * 2;
        const sprite = new THREE.Sprite(material);
        const scale = 2.5 + Math.random() * 4;
        sprite.scale.set(scale * 1.6, scale, 1);
        sprite.position.set((Math.random() - 0.5) * 16, Math.random() * 4, -2 - Math.random() * 8);
        scene.add(sprite);
        return {
            sprite,
            speed: 0.03 + Math.random() * 0.06,
            spin: (Math.random() - 0.5) * 0.015,
            phase: Math.random() * Math.PI * 2,
            strength: i % 3 === 2 ? 0.35 + Math.random() * 0.2 : 0.7 + Math.random() * 0.3,
        };
    });

    /* ---------- CAMERA ---------- */

    const lookAt = new THREE.Vector3(0, 1.6, 0);
    const baseDirection = new THREE.Vector3(0, 0.08, 1).normalize();   // straight on
    const distance = 4;
    const view = { width: 1, height: 1, pixelHeight: 1, aspect: 1 };   // panel's visible size

    /** Hang the photo along the camera's view, big enough to cover the view while it drifts */
    const fit = () => {
        const from = lookAt.clone().addScaledVector(baseDirection, distance);
        backdrop.position.copy(from).addScaledVector(baseDirection, -(distance + BACKDROP_DISTANCE));
        backdrop.position.y -= 0.6;   // a bit low, for more sky
        backdrop.lookAt(from);

        const far = distance + BACKDROP_DISTANCE;
        const viewH = 2 * far * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const viewW = viewH * camera.aspect;
        // Only part of the drift: at the far ends the photo's soft edges may just show, which
        // looks fine and keeps the photo from being enlarged more than needed
        const needW = viewW + 2 * BACKDROP_DISTANCE * Math.tan(MAX_ORBIT_X) * 0.6;
        const needH = viewH + 2 * BACKDROP_DISTANCE * Math.tan(MAX_ORBIT_Y) * 0.5;
        backdrop.scale.set(needW, needH, 1);
        planeAspect = needW / needH;
        cover('A');
        cover('B');
    };

    const resize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        view.height = 2 * PANEL_DISTANCE * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        view.width = view.height * camera.aspect;
        view.pixelHeight = h;
        view.aspect = camera.aspect;
        fit();
        onResize?.(stage);
    };

    /* ---------- POINTER ---------- */

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const orbitTarget = new THREE.Vector2();
    const orbit = new THREE.Vector2();

    /** Objects under the pointer (closest first) */
    const pick = (e, objects) => {
        const rect = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        camera.updateMatrixWorld();
        raycaster.setFromCamera(ndc, camera);
        return raycaster.intersectObjects(objects, false);
    };

    // The camera follows the mouse, and on touch screens a finger on the photo (back to the middle when it lifts)
    const onPointerMove = (e) => {
        if (still || (e.pointerType !== 'mouse' && !e.isPrimary)) return;
        const rect = canvas.getBoundingClientRect();
        orbitTarget.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    };
    const onPointerLeave = () => orbitTarget.set(0, 0);
    const onPointerEnd = (e) => { if (e.pointerType !== 'mouse') orbitTarget.set(0, 0); };
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointerup', onPointerEnd);
    canvas.addEventListener('pointercancel', onPointerEnd);

    /* ---------- LOOP ---------- */

    const offset = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const sideways = new THREE.Vector3();
    let last = performance.now();
    let t = 0;
    let stopLoop = null;

    // Only while the stage is on the screen (scene/loop.js)
    const tick = () => {
        const now = performance.now();
        const elapsed = (now - last) / 1000;      // wall time, for the fades
        const dt = Math.min(elapsed, 0.05);       // capped, for the motion (no jumps after a stall)
        last = now;
        t += dt;
        const ease = 1 - Math.exp(-dt * 4);

        // Camera drifts with the pointer (and slowly by itself); the panel rides along
        const driftX = reducedMotion || still ? 0 : Math.sin(t * 0.25) * 0.03;
        orbit.x += (orbitTarget.x * (MAX_ORBIT_X - 0.03) + driftX - orbit.x) * ease;
        orbit.y += (orbitTarget.y * MAX_ORBIT_Y - orbit.y) * ease;
        offset.copy(baseDirection).applyAxisAngle(up, -orbit.x);
        sideways.crossVectors(up, offset).normalize();
        offset.applyAxisAngle(sideways, orbit.y).multiplyScalar(distance);   // pointer up: camera dips, looks up
        camera.position.copy(lookAt).add(offset);
        camera.lookAt(lookAt);

        // Near parts of the photo move further than the camera's drift alone moves it
        uniforms.uShift.value.set(-orbit.x * PARALLAX, orbit.y * PARALLAX);
        if (uniforms.uMapA.value && uniforms.uOpacity.value < 1) uniforms.uOpacity.value = Math.min(1, uniforms.uOpacity.value + elapsed);
        if (fading) {
            uniforms.uMix.value = Math.min(1, uniforms.uMix.value + elapsed / 1.2);
            if (uniforms.uMix.value >= 1) settle();
        }

        // Smoke drifts sideways, turns slowly and breathes; wraps around at the sides
        smoke.forEach((puff) => {
            const { sprite } = puff;
            if (!reducedMotion) {
                sprite.position.x += puff.speed * dt;
                if (sprite.position.x > 8) sprite.position.x -= 16;
                sprite.material.rotation += puff.spin * dt;
            }
            const breathe = 0.65 + 0.35 * Math.sin(t * 0.1 + puff.phase);
            const edge = 1 - Math.min(1, Math.abs(sprite.position.x) / 8) ** 4;
            sprite.material.opacity = puff.strength * smokeLevel * breathe * edge * Math.min(1, t / 3);
        });

        onFrame?.(dt, t, elapsed);
        renderer.render(scene, camera);
    };

    const resizeObserver = new ResizeObserver(resize);

    const stage = {
        scene, camera, renderer, canvas, panel, view, pick, setBackdrop,
        start() {
            resizeObserver.observe(container);
            resize();
            stopLoop = frameLoop(container, tick);
            fadeIn(canvas);   // the way into the room: a toning (STIL.md)
        },
        dispose() {
            disposed = true;
            stopLoop?.();
            resizeObserver.disconnect();
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerleave', onPointerLeave);
            canvas.removeEventListener('pointerup', onPointerEnd);
            canvas.removeEventListener('pointercancel', onPointerEnd);
            scene.traverse((obj) => {
                obj.geometry?.dispose();
                const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
                materials.forEach((m) => { m.map?.dispose(); m.dispose(); });
            });
            Object.values(uniforms).forEach(({ value }) => value?.isTexture && value.dispose());
            renderer.dispose();
            canvas.remove();
        },
    };
    return stage;
}
