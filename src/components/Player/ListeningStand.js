'use client';

/**
 * 3D listening stand for button instruments (three.js): a plain post with a slanted top and
 * five black rubber push buttons, standing on a small hill. Drawn in the site's zinc palette.
 * The project's cover image hangs far behind as a hazy backdrop, so the camera's small
 * movements with the pointer give real depth.
 *
 * Buttons are played with the pointer (several fingers at once on touch screens):
 * pointer down on a button = press, pointer up = let go — same as the physical buttons.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { colors } from '@/styles/colors';

/* ---------- DIMENSIONS (metres) ---------- */

const POST_W = 0.36;                  // width (x)
const POST_D = 0.24;                  // depth (z)
const POST_FRONT = 1.0;               // height at the front edge
const SLOPE = THREE.MathUtils.degToRad(30);
const POST_BACK = POST_FRONT + POST_D * Math.tan(SLOPE);
const BUTTON_SPACING = 0.068;
const BUTTON_Z = 0;                   // along the top, negative = up the slope
const CAP_TRAVEL = 0.011;            // a bit more than the real button, so it reads from a distance

const HILL_H = 0.6;
const HILL_R = 1.8;

/** Post side profile in (z, y), extruded along x */
function postGeometry(width) {
    const d = POST_D / 2;
    const shape = new THREE.Shape();
    shape.moveTo(d, 0);
    shape.lineTo(d, POST_FRONT);
    shape.lineTo(-d, POST_BACK);
    shape.lineTo(-d, 0);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
    geometry.rotateY(-Math.PI / 2);   // shape x → world z, extrusion → world -x
    geometry.translate(width / 2, 0, 0);
    return geometry;
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

function disposeTree(root) {
    root.traverse((obj) => {
        obj.geometry?.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
        materials.forEach((m) => { m.map?.dispose(); m.alphaMap?.dispose(); m.dispose(); });
    });
}

export default function ListeningStand({ instrument, ready, cover, coverFocus = 0.5 }) {
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
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.className = 'absolute inset-0 size-full';
        renderer.domElement.style.touchAction = 'none';
        container.prepend(renderer.domElement);

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(colors.paper, 5, 16);
        const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);

        /* ---------- LIGHT ---------- */

        scene.add(new THREE.HemisphereLight(0xffffff, 0xc8c8cc, 1.6));
        const sun = new THREE.DirectionalLight(0xffffff, 2.4);
        sun.position.set(-2.4, 4.4, 2.6);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -1.5, near: 0.5, far: 12 });
        sun.shadow.bias = -0.0004;
        sun.shadow.normalBias = 0.01;
        sun.shadow.radius = 4;
        scene.add(sun);

        /* ---------- GROUND (fades out at the edges) ---------- */

        const fadeCanvas = document.createElement('canvas');
        fadeCanvas.width = fadeCanvas.height = 256;
        const fctx = fadeCanvas.getContext('2d');
        const grad = fctx.createRadialGradient(128, 128, 30, 128, 128, 128);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(1, '#000');
        fctx.fillStyle = grad;
        fctx.fillRect(0, 0, 256, 256);

        const ground = new THREE.Mesh(
            new THREE.CircleGeometry(12, 64),
            new THREE.MeshStandardMaterial({ color: colors.soft, roughness: 1, transparent: true, alphaMap: new THREE.CanvasTexture(fadeCanvas) }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // A small, smooth hill for the stand to stand on
        const hillProfile = Array.from({ length: 33 }, (_, i) => {
            const r = (i / 32) * HILL_R;
            return new THREE.Vector2(r, HILL_H * (1 + Math.cos(Math.PI * r / HILL_R)) / 2);
        }).reverse();
        const hill = new THREE.Mesh(
            new THREE.LatheGeometry(hillProfile, 96),
            new THREE.MeshStandardMaterial({ color: colors.muted, roughness: 1, side: THREE.DoubleSide }),
        );
        hill.receiveShadow = true;
        scene.add(hill);

        /* ---------- BACKDROP: the cover image, far behind ---------- */

        // Fades out towards its lower edge, so the photo dissolves into the ground
        // …and towards the left and right edges, so they never show
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
        hgrad.addColorStop(0.15, '#fff');
        hgrad.addColorStop(0.85, '#fff');
        hgrad.addColorStop(1, '#000');
        bctx.fillStyle = hgrad;
        bctx.fillRect(0, 0, 256, 256);

        const backdropMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0, fog: false, depthWrite: false,
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

        // The photo hangs this far behind the camera's focus point; opacity < 1 lets the paper through as haze
        const BACKDROP_DISTANCE = 14;

        /* ---------- STAND: a plain post with a slanted top, on the hill ---------- */

        const stand = new THREE.Group();
        stand.position.y = HILL_H - 0.02;
        scene.add(stand);

        const post = new THREE.Mesh(postGeometry(POST_W), new THREE.MeshStandardMaterial({ color: colors.faint, roughness: 0.85 }));
        post.castShadow = true;
        post.receiveShadow = true;
        stand.add(post);

        // A frame on the slanted top: x right, y out of the top, z down the slope
        const top = new THREE.Group();
        top.position.set(0, (POST_FRONT + POST_BACK) / 2, 0);
        top.rotation.x = SLOPE;
        stand.add(top);

        /* ---------- BUTTONS ---------- */

        const rubber = new THREE.MeshStandardMaterial({ color: colors.ink, roughness: 0.9 });
        const bezelGeo = bezelGeometry();
        const capGeo = capGeometry();
        // One invisible hit area over the whole top (a bit bigger), split into a column per button —
        // much easier to hit with a finger than the small buttons themselves
        const hitArea = new THREE.Mesh(
            new THREE.PlaneGeometry(POST_W + 0.06, POST_D / Math.cos(SLOPE) + 0.08),
            new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
        );
        hitArea.rotation.x = -Math.PI / 2;
        hitArea.position.y = 0.02;

        const count = instrument.config.samples.length;
        const buttons = Array.from({ length: count }, (_, i) => {
            const group = new THREE.Group();
            group.position.set((i - (count - 1) / 2) * BUTTON_SPACING, 0, BUTTON_Z);

            const bezel = new THREE.Mesh(bezelGeo, rubber);
            bezel.castShadow = true;
            bezel.receiveShadow = true;

            const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: colors.ink, roughness: 0.7 }));
            cap.castShadow = true;

            group.add(bezel, cap);
            top.add(group);
            return { cap, held: false };
        });
        top.add(hitArea);
        const local = new THREE.Vector3();
        const capUp = new THREE.Color(colors.ink);
        const capDown = new THREE.Color(colors.dim);

        /* ---------- CAMERA FRAMING ---------- */

        const lookAt = new THREE.Vector3(0, HILL_H * 0.6 + POST_FRONT * 0.6, 0);
        const baseDirection = new THREE.Vector3(0.28, 0.32, 1).normalize();
        let distance = 1.6;

        /** Hang the photo along the camera's view, big enough to cover the view while it drifts */
        const fitBackdrop = () => {
            const dir = baseDirection.clone().negate();
            const from = lookAt.clone().addScaledVector(baseDirection, distance);
            backdrop.position.copy(from).addScaledVector(dir, BACKDROP_DISTANCE);
            backdrop.position.y += 0.6;
            backdrop.lookAt(from);
            const viewH = 2 * BACKDROP_DISTANCE * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
            const viewW = viewH * camera.aspect;
            const cover = Math.max(viewW / backdrop.userData.aspect, viewH) * 1.25;
            backdrop.scale.set(cover * backdrop.userData.aspect, cover, 1);
            // Narrow screens only see a slice of the photo: slide it so the focus point is in it
            const slack = Math.max(0, (backdrop.scale.x - viewW) / 2);
            backdrop.translateX(-THREE.MathUtils.clamp((coverFocus - 0.5) * backdrop.scale.x, -slack, slack));
        };

        const resize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            // Keep the plate a comfortable size: further away on narrow (portrait) screens
            distance = THREE.MathUtils.clamp(4.2 / Math.min(1, camera.aspect * 1.6), 4.2, 5.4);
            camera.updateProjectionMatrix();
            fitBackdrop();
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
            const hit = raycaster.intersectObject(hitArea, false)[0];
            if (!hit) return -1;
            top.worldToLocal(local.copy(hit.point));
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

            // Camera drifts a little with the pointer (and slowly by itself) — the backdrop
            // is far away, so it moves less than the stand: that's the depth
            const driftX = reducedMotion ? 0 : Math.sin(t * 0.25) * 0.04;
            orbit.x += (orbitTarget.x * 0.12 + driftX - orbit.x) * ease;
            orbit.y += (orbitTarget.y * 0.1 - orbit.y) * ease;
            offset.copy(baseDirection).applyAxisAngle(up, -orbit.x).multiplyScalar(distance);
            offset.y += orbit.y * 0.4;
            camera.position.copy(lookAt).add(offset);
            camera.lookAt(lookAt);

            if (backdrop.userData.fadeIn && backdropMaterial.opacity < 0.8) {
                backdropMaterial.opacity = Math.min(0.8, backdropMaterial.opacity + dt);
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
