'use client';

/**
 * 3D listening stand for button instruments (three.js) — modelled on the stand at the exhibition:
 * a post of vertical boards with a slanted top, a white sign plate with the text, and five
 * black rubber push buttons. Drawn in the site's zinc palette. The project's cover image hangs
 * far behind as a backdrop, so the camera's small movements with the pointer give real depth.
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
const BOARDS = 4;
const BOARD_GAP = 0.006;

const PLATE_W = POST_W + 0.03;
const PLATE_L = POST_D / Math.cos(SLOPE) + 0.03;
const PLATE_T = 0.006;

const BUTTON_SPACING = 0.068;
const BUTTON_Z = -0.012;              // along the plate, negative = up the slope
const CAP_TRAVEL = 0.006;

const PIVOT = new THREE.Vector3(0, (POST_FRONT + POST_BACK) / 2, 0);

/** Post side profile in (z, y), extruded along x */
function postGeometry(width, inset = 0) {
    const d = POST_D / 2 - inset;
    const shape = new THREE.Shape();
    shape.moveTo(d, 0);
    shape.lineTo(d, POST_FRONT - inset * 0.5);
    shape.lineTo(-d, POST_BACK - inset * 0.5);
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

/** The sign's print: title, story, credits and logo, laid out like the real plate */
async function plateTexture({ title, paragraphs }) {
    await document.fonts?.ready;
    const font = getComputedStyle(document.body).fontFamily;

    const w = 2048;
    const h = Math.round(w * PLATE_L / PLATE_W);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, w, h);

    const pad = w * 0.06;
    const wrap = (text, x, y, maxWidth, lineHeight, maxLines) => {
        const words = (text ?? '').split(' ');
        let line = '';
        let lines = 0;
        for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (ctx.measureText(test).width > maxWidth && line) {
                ctx.fillText(line, x, y);
                y += lineHeight;
                line = word;
                if (++lines >= maxLines) return y;
            } else line = test;
        }
        ctx.fillText(line, x, y);
        return y + lineHeight;
    };

    ctx.textBaseline = 'top';
    ctx.fillStyle = colors.ink;
    ctx.font = `300 ${w * 0.045}px ${font}`;
    ctx.fillText(title ?? '', pad, pad);

    ctx.fillStyle = colors.shade;
    ctx.font = `300 ${w * 0.022}px ${font}`;
    wrap(paragraphs?.[0], pad, pad + w * 0.07, w - pad * 2, w * 0.032, 3);

    ctx.fillStyle = colors.dim;
    ctx.font = `300 ${w * 0.018}px ${font}`;
    wrap(paragraphs?.[1], w * 0.56, h * 0.6, w * 0.38, w * 0.027, 8);

    ctx.fillStyle = colors.ink;
    ctx.font = `800 ${w * 0.03}px ${font}`;
    ctx.fillText('GENHØR', pad, h - pad - w * 0.03);

    // Screw heads in the corners
    ctx.fillStyle = colors.faint;
    const s = w * 0.025;
    [[s, s], [w - s, s], [s, h - s], [w - s, h - s]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, w * 0.009, 0, Math.PI * 2);
        ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
}

function disposeTree(root) {
    root.traverse((obj) => {
        obj.geometry?.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
        materials.forEach((m) => { m.map?.dispose(); m.alphaMap?.dispose(); m.dispose(); });
    });
}

export default function ListeningStand({ instrument, ready, title, paragraphs, cover, coverFocus = 0.5 }) {
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
        scene.fog = new THREE.Fog(colors.paper, 3, 12);
        const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);

        /* ---------- LIGHT ---------- */

        scene.add(new THREE.HemisphereLight(0xffffff, 0xc8c8cc, 1.6));
        const sun = new THREE.DirectionalLight(0xffffff, 2.4);
        sun.position.set(-1.6, 3.2, 1.8);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        Object.assign(sun.shadow.camera, { left: -1.2, right: 1.2, top: 1.8, bottom: -0.4, near: 0.5, far: 8 });
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

        /* ---------- BACKDROP: the cover image, far behind ---------- */

        // Fades out towards its lower edge, so the photo dissolves into the ground
        const backdropFade = document.createElement('canvas');
        backdropFade.width = 4;
        backdropFade.height = 256;
        const bctx = backdropFade.getContext('2d');
        const vgrad = bctx.createLinearGradient(0, 0, 0, 256);
        vgrad.addColorStop(0, '#fff');
        vgrad.addColorStop(0.55, '#fff');
        vgrad.addColorStop(0.9, '#000');
        bctx.fillStyle = vgrad;
        bctx.fillRect(0, 0, 4, 256);

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
        const BACKDROP_DISTANCE = 10;

        /* ---------- POST: vertical boards around a dark core ---------- */

        const stand = new THREE.Group();
        scene.add(stand);

        const boardMaterial = new THREE.MeshStandardMaterial({ color: colors.muted, roughness: 0.85 });
        const coreMaterial = new THREE.MeshStandardMaterial({ color: colors.hard, roughness: 1 });

        const core = new THREE.Mesh(postGeometry(POST_W - 0.02, 0.01), coreMaterial);
        stand.add(core);

        const boardW = (POST_W - BOARD_GAP * (BOARDS - 1)) / BOARDS;
        for (let i = 0; i < BOARDS; i++) {
            const board = new THREE.Mesh(postGeometry(boardW), boardMaterial);
            board.position.x = -POST_W / 2 + boardW / 2 + i * (boardW + BOARD_GAP);
            board.castShadow = true;
            board.receiveShadow = true;
            stand.add(board);
        }

        /* ---------- PLATE ---------- */

        // A frame on the slanted top: x right, y out of the plate, z down the slope
        const plateFrame = new THREE.Group();
        plateFrame.position.set(0, (POST_FRONT + POST_BACK) / 2, 0);
        plateFrame.rotation.x = SLOPE;
        stand.add(plateFrame);

        const edgeMaterial = new THREE.MeshStandardMaterial({ color: colors.soft, roughness: 0.4, metalness: 0.2 });
        const faceMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
        const plate = new THREE.Mesh(
            new THREE.BoxGeometry(PLATE_W, PLATE_T, PLATE_L),
            [edgeMaterial, edgeMaterial, faceMaterial, edgeMaterial, edgeMaterial, edgeMaterial],
        );
        plate.position.y = PLATE_T / 2;
        plate.castShadow = true;
        plate.receiveShadow = true;
        plateFrame.add(plate);

        plateTexture({ title, paragraphs }).then((texture) => {
            if (disposed) { texture.dispose(); return; }
            faceMaterial.map = texture;
            faceMaterial.needsUpdate = true;
        });

        /* ---------- BUTTONS ---------- */

        const rubber = new THREE.MeshStandardMaterial({ color: colors.ink, roughness: 0.9 });
        const bezelGeo = bezelGeometry();
        const capGeo = capGeometry();
        const hitGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.04, 16);
        const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });

        const count = instrument.config.samples.length;
        const buttons = Array.from({ length: count }, (_, i) => {
            const group = new THREE.Group();
            group.position.set((i - (count - 1) / 2) * BUTTON_SPACING, PLATE_T, BUTTON_Z);

            const bezel = new THREE.Mesh(bezelGeo, rubber);
            bezel.castShadow = true;
            bezel.receiveShadow = true;

            const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: colors.ink, roughness: 0.7 }));
            cap.castShadow = true;

            const hit = new THREE.Mesh(hitGeo, hitMaterial);
            hit.position.y = 0.015;
            hit.userData.index = i;

            group.add(bezel, cap, hit);
            plateFrame.add(group);
            return { cap, hit, held: false };
        });
        const hitTargets = buttons.map(b => b.hit);

        /* ---------- CAMERA FRAMING ---------- */

        const lookAt = PIVOT.clone().add(new THREE.Vector3(0, 0.12, -0.1));
        const baseDirection = new THREE.Vector3(0.3, 0.42, 1).normalize();
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
            const cover = Math.max(viewW / backdrop.userData.aspect, viewH) * 1.3;
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
            distance = THREE.MathUtils.clamp(1.3 / Math.min(1, camera.aspect * 1.1), 1.3, 2.8);
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
            const hit = raycaster.intersectObjects(hitTargets, false)[0];
            return hit ? hit.object.userData.index : -1;
        };

        const onPointerDown = (e) => {
            if (!readyRef.current) return;
            const i = buttonAt(e);
            if (i < 0) return;
            canvas.setPointerCapture(e.pointerId);
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
            const driftX = reducedMotion ? 0 : Math.sin(t * 0.25) * 0.08;
            orbit.x += (orbitTarget.x * 0.35 + driftX - orbit.x) * ease;
            orbit.y += (orbitTarget.y * 0.18 - orbit.y) * ease;
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
    }, [instrument, title, paragraphs, cover, coverFocus]);

    return <div ref={containerRef} className='absolute inset-0' />;
}
