'use client';

/**
 * 3D scene for button instruments (three.js): black rubber push buttons that sit right on the
 * screen, as if mounted on the glass, with the project's cover image far behind and smoke
 * drifting in between. The buttons ride along with the camera, so they stay put while the
 * camera drifts a little with the pointer — the photo and smoke move behind them: depth.
 *
 * Buttons are played with the pointer (several fingers at once on touch screens):
 * pointer down on a button = press, pointer up = let go — same as the physical buttons.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { colors } from '@/styles/colors';

/* ---------- DIMENSIONS (metres) ---------- */

const BUTTON_SPACING = 0.072;
const BUTTON_SIZE = 0.05;             // bezel diameter
const CAP_TRAVEL = 0.009;
const PANEL_DISTANCE = 0.6;           // buttons' distance in front of the camera
const BACKDROP_DISTANCE = 14;         // photo's distance behind the focus point
const MAX_ORBIT_X = 0.16;             // camera drift with the pointer + by itself, radians

/** A wisp of smoke: fractal noise (several octaves of smooth value noise) inside a soft,
 *  stretched falloff — so it reads as smoke with structure, not a round blob */
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

/** Rubber bezel with two ridges, like the 1911 push button */
function bezelGeometry() {
    const p = [
        [0.0175, 0], [0.025, 0], [0.025, 0.003], [0.0225, 0.004], [0.022, 0.006], [0.0235, 0.007],
        [0.0235, 0.0095], [0.0215, 0.0105], [0.021, 0.0125], [0.0222, 0.0135], [0.0222, 0.016],
        [0.0195, 0.017], [0.0175, 0.017],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(p, 48);
}

function capGeometry() {
    const p = [[0, 0.004], [0.017, 0.004], [0.017, 0.022], [0.0163, 0.0245], [0.0145, 0.0255], [0, 0.0255]]
        .map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(p, 48);
}

/** Soft round shadow, for under each button */
function shadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
}

function disposeTree(root) {
    root.traverse((obj) => {
        obj.geometry?.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
        materials.forEach((m) => { m.map?.dispose(); m.alphaMap?.dispose(); m.dispose(); });
    });
}

export default function InstrumentScene({ instrument, ready, cover, coverFocus = 0.5 }) {
    const containerRef = useRef(null);
    const readyRef = useRef(ready);

    useEffect(() => { readyRef.current = ready; }, [ready]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !instrument) return;
        let disposed = false;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.domElement.className = 'absolute inset-0 size-full';
        renderer.domElement.style.touchAction = 'none';
        container.prepend(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
        scene.add(camera);   // the buttons and their light ride along with it

        /* ---------- LIGHT (fixed to the camera, so the buttons always look the same) ---------- */

        camera.add(new THREE.HemisphereLight(0xffffff, 0xc8c8cc, 1.8));
        const key = new THREE.DirectionalLight(0xffffff, 2.6);
        key.position.set(-1, 1.6, 1.2);
        camera.add(key);
        key.target.position.set(0, 0, -PANEL_DISTANCE);
        camera.add(key.target);

        /* ---------- BACKDROP: the cover image, far behind ---------- */

        // Fades out towards its lower edge and towards the sides, so no edge ever shows
        const backdropFade = document.createElement('canvas');
        backdropFade.width = backdropFade.height = 256;
        const bctx = backdropFade.getContext('2d');
        const vgrad = bctx.createLinearGradient(0, 0, 0, 256);
        vgrad.addColorStop(0, '#fff');
        vgrad.addColorStop(0.55, '#fff');
        vgrad.addColorStop(0.9, '#000');
        bctx.fillStyle = vgrad;
        bctx.fillRect(0, 0, 256, 256);
        bctx.globalCompositeOperation = 'multiply';
        const hgrad = bctx.createLinearGradient(0, 0, 256, 0);
        hgrad.addColorStop(0, '#000');
        hgrad.addColorStop(0.08, '#fff');
        hgrad.addColorStop(0.92, '#fff');
        hgrad.addColorStop(1, '#000');
        bctx.fillStyle = hgrad;
        bctx.fillRect(0, 0, 256, 256);

        const backdropMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0, fog: false, depthWrite: false, toneMapped: false,
            alphaMap: new THREE.CanvasTexture(backdropFade),
        });
        const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), backdropMaterial);
        backdrop.renderOrder = -1;
        backdrop.userData.aspect = 16 / 9;
        scene.add(backdrop);

        if (cover) {
            new THREE.TextureLoader().setCrossOrigin('anonymous').load(cover, (texture) => {
                if (disposed) { texture.dispose(); return; }
                texture.colorSpace = THREE.SRGBColorSpace;
                backdropMaterial.map = texture;
                backdropMaterial.needsUpdate = true;
                backdrop.userData.aspect = texture.image.width / texture.image.height;
                backdrop.userData.fadeIn = true;
                fitBackdrop();
            });
        }


        /* ---------- SMOKE drifting between the buttons and the photo ---------- */

        // Light wisps show over the dark parts of the photo, grey (shadowed) ones over the sky
        const smokeTextures = [1, 2, 3, 4].map(smokeTexture);
        const smokeTones = [colors.paper, colors.paper, colors.hard];
        const smoke = Array.from({ length: 26 }, (_, i) => {
            const material = new THREE.SpriteMaterial({
                map: smokeTextures[i % 4], transparent: true, depthWrite: false, fog: false, toneMapped: false,
                color: smokeTones[i % 3], opacity: 0,
            });
            const sprite = new THREE.Sprite(material);
            const scale = 2.5 + Math.random() * 4;
            sprite.scale.set(scale * 1.6, scale, 1);
            sprite.position.set(
                (Math.random() - 0.5) * 16,
                0 + Math.random() * 4,
                -2 - Math.random() * 8,
            );
            material.rotation = Math.random() * Math.PI * 2;
            scene.add(sprite);
            return {
                sprite,
                speed: 0.03 + Math.random() * 0.06,
                spin: (Math.random() - 0.5) * 0.015,
                phase: Math.random() * Math.PI * 2,
                strength: i % 3 === 2 ? 0.35 + Math.random() * 0.2 : 0.7 + Math.random() * 0.3,
            };
        });

        /* ---------- BUTTONS, on the screen ---------- */

        // The panel faces the camera: x right, y towards the viewer (button axis), z down the screen
        const panel = new THREE.Group();
        panel.rotation.x = Math.PI / 2;
        camera.add(panel);

        const rubber = new THREE.MeshStandardMaterial({ color: colors.ink, roughness: 0.9 });
        const bezelGeo = bezelGeometry();
        const capGeo = capGeometry();
        const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false });
        const shadowGeo = new THREE.PlaneGeometry(BUTTON_SIZE * 1.5, BUTTON_SIZE * 1.5);

        const count = instrument.config.samples.length;
        const rowWidth = (count - 1) * BUTTON_SPACING + BUTTON_SIZE;

        // One invisible hit area over the row, split into a column per button — easy to hit
        const hitArea = new THREE.Mesh(
            new THREE.PlaneGeometry(rowWidth + 0.02, BUTTON_SIZE * 1.8),
            new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
        );
        hitArea.rotation.x = -Math.PI / 2;
        hitArea.position.y = 0.012;
        panel.add(hitArea);

        const buttons = Array.from({ length: count }, (_, i) => {
            const group = new THREE.Group();
            group.position.x = (i - (count - 1) / 2) * BUTTON_SPACING;

            const shadow = new THREE.Mesh(shadowGeo, shadowMaterial);
            shadow.rotation.x = -Math.PI / 2;
            shadow.position.set(0.004, -0.002, 0.006);   // light from the top left

            const bezel = new THREE.Mesh(bezelGeo, rubber);
            const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: colors.ink, roughness: 0.7 }));

            group.add(shadow, bezel, cap);
            panel.add(group);
            return { cap, held: false };
        });
        const local = new THREE.Vector3();
        const capUp = new THREE.Color(colors.ink);
        const capDown = new THREE.Color(colors.dim);

        /** Size the row (big on wide screens, fitted to the width on narrow ones) and put it near
         *  the bottom — on phones above the mini-player bar */
        const fitPanel = (heightPx) => {
            const viewH = 2 * PANEL_DISTANCE * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
            const viewW = viewH * camera.aspect;
            const scale = Math.min(viewW * 0.84 / rowWidth, viewH * 0.5 / rowWidth, 1);
            panel.scale.setScalar(scale);
            const marginPx = camera.aspect < 1 ? 96 : 56;
            const y = -viewH / 2 + viewH * (marginPx / heightPx) + BUTTON_SIZE * scale * 0.75;
            panel.position.set(0, y, -PANEL_DISTANCE);
        };

        /* ---------- CAMERA FRAMING ---------- */

        const lookAt = new THREE.Vector3(0, 1.6, 0);
        const baseDirection = new THREE.Vector3(0, 0.08, 1).normalize();   // straight on
        const distance = 4;

        /** Hang the photo along the camera's view, big enough to cover the view while it drifts */
        const fitBackdrop = () => {
            const dir = baseDirection.clone().negate();
            const from = lookAt.clone().addScaledVector(baseDirection, distance);
            backdrop.position.copy(from).addScaledVector(dir, distance + BACKDROP_DISTANCE);
            backdrop.position.y += 0.6;
            backdrop.lookAt(from);

            // What the camera sees at the photo's distance, plus room for the camera's drift
            const far = distance + BACKDROP_DISTANCE;
            const viewH = 2 * far * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
            const viewW = viewH * camera.aspect;
            const drift = 2 * BACKDROP_DISTANCE * Math.tan(MAX_ORBIT_X) + 1;
            const needW = viewW + drift;
            const needH = viewH + 2;
            const height = Math.max(needW / backdrop.userData.aspect, needH);
            backdrop.scale.set(height * backdrop.userData.aspect, height, 1);

            // Narrow screens only see a slice of the photo: slide it so the focus point is in it
            if (camera.aspect < 1) {
                const slack = Math.max(0, (backdrop.scale.x - needW) / 2);
                backdrop.translateX(-THREE.MathUtils.clamp((coverFocus - 0.5) * backdrop.scale.x, -slack, slack));
            }
        };

        const resize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            fitBackdrop();
            fitPanel(h);
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        /* ---------- POINTER ---------- */

        const canvas = renderer.domElement;
        const raycaster = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        const orbitTarget = new THREE.Vector2();
        const orbit = new THREE.Vector2();
        const pointers = new Map();   // pointerId → button index

        const buttonAt = (e) => {
            const rect = canvas.getBoundingClientRect();
            ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            raycaster.setFromCamera(ndc, camera);
            camera.updateMatrixWorld();
            const hit = raycaster.intersectObject(hitArea, false)[0];
            if (!hit) return -1;
            panel.worldToLocal(local.copy(hit.point));
            return THREE.MathUtils.clamp(Math.round(local.x / BUTTON_SPACING + (count - 1) / 2), 0, count - 1);
        };

        const onPointerDown = (e) => {
            if (!readyRef.current) return;
            const i = buttonAt(e);
            if (i < 0) return;
            try { canvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
            pointers.set(e.pointerId, i);
            buttons[i].held = true;
            instrument.press(i);
        };

        const onPointerUp = (e) => {
            const i = pointers.get(e.pointerId);
            if (i === undefined) return;
            pointers.delete(e.pointerId);
            if ([...pointers.values()].includes(i)) return;   // another finger still holds it
            buttons[i].held = false;
            instrument.release(i);
        };

        const onPointerMove = (e) => {
            if (e.pointerType === 'mouse') {
                const i = buttonAt(e);
                orbitTarget.set(ndc.x, ndc.y);
                canvas.style.cursor = i >= 0 && readyRef.current ? 'pointer' : '';
            }
        };

        const onPointerLeave = () => orbitTarget.set(0, 0);

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerleave', onPointerLeave);
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        /* ---------- RENDER LOOP ---------- */

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const offset = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);
        let last = performance.now();
        let t = 0;
        let frame;

        const tick = () => {
            frame = requestAnimationFrame(tick);
            const now = performance.now();
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            t += dt;
            const ease = 1 - Math.exp(-dt * 4);

            // Camera drifts a little with the pointer (and slowly by itself); the buttons ride
            // along, the photo and smoke shift behind them: that's the depth
            const driftX = reducedMotion ? 0 : Math.sin(t * 0.25) * 0.03;
            orbit.x += (orbitTarget.x * (MAX_ORBIT_X - 0.03) + driftX - orbit.x) * ease;
            orbit.y += (orbitTarget.y * 0.1 - orbit.y) * ease;
            offset.copy(baseDirection).applyAxisAngle(up, -orbit.x).multiplyScalar(distance);
            offset.y += orbit.y * 0.4;
            camera.position.copy(lookAt).add(offset);
            camera.lookAt(lookAt);

            // Smoke drifts sideways, turns slowly and breathes; wraps around at the sides
            smoke.forEach((puff) => {
                const { sprite } = puff;
                if (!reducedMotion) {
                    sprite.position.x += puff.speed * dt;
                    if (sprite.position.x > 8) sprite.position.x -= 16;
                    sprite.material.rotation += puff.spin * dt;
                }
                const breathe = 0.65 + 0.35 * Math.sin(t * 0.1 + puff.phase);
                const edge = 1 - Math.min(1, Math.abs(sprite.position.x) / 8) ** 4;   // fade near the wrap
                const fadeIn = Math.min(1, t / 3);
                sprite.material.opacity = puff.strength * breathe * edge * fadeIn;
            });

            if (backdrop.userData.fadeIn && backdropMaterial.opacity < 1) {
                backdropMaterial.opacity = Math.min(1, backdropMaterial.opacity + dt);
            }

            // Caps go down while held (by pointer or keyboard)
            const voices = instrument.voices;
            buttons.forEach((b, i) => {
                const down = b.held || voices[i]?.state === 'body';
                const target = down ? -CAP_TRAVEL : 0;
                b.cap.position.y += (target - b.cap.position.y) * Math.min(1, dt * 40);
                b.cap.material.color.lerp(down ? capDown : capUp, Math.min(1, dt * 30));
            });

            renderer.render(scene, camera);
        };
        tick();

        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            pointers.forEach((i) => instrument.release(i));
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerleave', onPointerLeave);
            disposeTree(scene);
            renderer.dispose();
            canvas.remove();
        };
    }, [instrument, cover, coverFocus]);

    return <div ref={containerRef} className='absolute inset-0' />;
}
