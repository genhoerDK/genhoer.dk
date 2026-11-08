'use client';

/**
 * 3D scene for 53 sekunder til fælles (three.js): højbanen in Viborg — the horizontal lift over
 * Heibergs Allé between the hospital's buildings — in the pale, simple look of Kanon i G3
 * (scene/hoejbane.js), on the shared stage (scene/stage.js) under the shared sky (scene/sky.js).
 *
 * The cabin goes where `cabin()` says: the interface knows the ride, the scene asks it every
 * frame where the cabin is, so the cabin glides along with the countdown.
 *
 * The pointer looks round: to the side and the place turns a little under you, up and down and it
 * is seen more from above or more from the side. The wheel, a pinch, ↑/↓ or zoomRef from outside
 * take you from the whole place (0) in close to the cabin (1), which the view then follows. ←/→
 * turn too.
 *
 * @param {() => { at: number, lamp: number }} cabin  Where the cabin is (0 = the hospital, 1 = the other side) and its lamp (0 off, 1 on, 2 blinking)
 * @param {{ current: number }} [zoomRef]  0 = the whole place, 1 = close to the cabin
 * @param {(close: boolean) => void} [onZoom]  Told when you go in close or back out
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createStage, PANEL_DISTANCE } from '@/components/Player/scene/stage';
import { buildHoejbane } from '@/components/Player/scene/hoejbane';
import { skyTexture } from '@/components/Player/scene/sky';
import { keyIsTaken } from '@/components/Player/interfaces/keys';

const PALE = { horizon: 0xdcdcd4 };              // the haze the distance fades into (as Kanon i G3, stylised)
const ABOVE_FOV = 32, CLOSE_FOV = 42;
const TILT = { far: [0.95, 1.32], close: [1.1, 1.45] };   // radians from straight down: pointer at the top, at the bottom
const TURN = 0.75;                               // how far the pointer turns the place either way, radians
const BEND_TURN = 0.7;                           // close in, at the hospital end: turned this far, to look into the bend
const PORTRAIT_SHIFT = new THREE.Vector3(-9, 4, 0);  // and look a little further towards the hospital, so the spiral is in
const PORTRAIT_TURN = -0.45;                      // upright screens start turned this far, the track on a slant
const CLOSE_SIZE = 10;                           // metres across the view, close to the cabin
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export default function ElevatorScene({ cabin, zoomRef, onZoom }) {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        /* ---------- THE PLACE ---------- */

        const tilt = new THREE.Group();     // tipped towards the viewer
        const turn = new THREE.Group();     // turns round the point in focus
        const room = new THREE.Group();     // metres inside, moved so the point in focus is at the origin
        tilt.add(turn);
        turn.add(room);

        const place = buildHoejbane();
        room.add(place.group);

        // A low sun from the front left, and soft light from the sky and back up from the grass
        const sun = new THREE.DirectionalLight(0xfff1de, 1.8);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        const SUN = new THREE.Vector3(-55, -60, 85);
        sun.position.copy(place.centre).add(SUN);
        sun.target.position.copy(place.centre);
        room.add(sun, sun.target);
        tilt.add(new THREE.HemisphereLight(0xf4f1e8, 0x8f9473, 0.65));

        // The sky, always round everything, far out
        const skyMap = skyTexture();
        const sky = new THREE.Mesh(
            new THREE.SphereGeometry(1300, 64, 32).rotateX(Math.PI / 2),
            new THREE.MeshBasicMaterial({ map: skyMap, side: THREE.BackSide, depthWrite: false, fog: false }),
        );
        sky.position.copy(place.centre).setZ(0);
        room.add(sky);

        /* ---------- LAYOUT ---------- */

        // The whole place: the track and its two ends fill most of the width, a little above the controls
        let farScale = 1, closeScale = 1, aboveY = 0, closeY = 0, portrait = false;
        const layout = () => {
            const { view } = stage;
            const height = 2 * PANEL_DISTANCE * Math.tan(THREE.MathUtils.degToRad(ABOVE_FOV / 2));
            const across = Math.min(height * view.aspect * 0.95, height * 1.05);
            // Upright screens: closer, and turned a little, so the track crosses the screen on a slant
            portrait = view.aspect < 0.8;
            farScale = across / (place.size * (portrait ? 0.9 : 1));
            closeScale = (2 * PANEL_DISTANCE * Math.tan(THREE.MathUtils.degToRad(CLOSE_FOV / 2)) * Math.min(1, view.aspect)) / CLOSE_SIZE;
            aboveY = view.aspect < 1 ? height * 0.14 : height * 0.1;   // up, clear of the count and the button
            closeY = height * 0.2;
        };

        /* ---------- POINTER ---------- */

        const target = { yaw: 0, look: 0.45 };
        const current = { yaw: 0, look: 0.45, zoom: zoomRef?.current ?? 0 };
        const keyTurn = { value: 0 };
        const touches = new Map();
        let pinch = null;
        const zoomBy = (amount) => {
            const z = THREE.MathUtils.clamp((zoomRef?.current ?? current.zoom) + amount, 0, 1);
            if (zoomRef) zoomRef.current = z; else current.zoom = z;
        };
        const onPointerMove = (e) => {
            if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
            if (touches.size >= 2) {
                const [[ax, ay], [bx, by]] = [...touches.values()];
                const spread = Math.hypot(ax - bx, ay - by);
                if (pinch) zoomBy((spread - pinch) * 0.004);
                pinch = spread;
                return;
            }
            const rect = container.getBoundingClientRect();
            const fx = THREE.MathUtils.clamp((e.clientX - rect.left) / rect.width, 0, 1);
            const fy = THREE.MathUtils.clamp((e.clientY - rect.top) / rect.height, 0, 1);
            target.yaw = (fx - 0.5) * 2 * TURN;
            target.look = fy;
        };
        const onPointerDown = (e) => { if (e.pointerType === 'touch') touches.set(e.pointerId, [e.clientX, e.clientY]); };
        const onPointerUp = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
        const onWheel = (e) => { e.preventDefault(); zoomBy(-e.deltaY * (e.deltaMode === 1 ? 0.03 : 0.0012)); };
        const onKey = (e) => {
            if (keyIsTaken(e)) return;
            if (e.key === 'ArrowLeft') keyTurn.value = Math.max(-TURN, keyTurn.value - 0.2);
            if (e.key === 'ArrowRight') keyTurn.value = Math.min(TURN, keyTurn.value + 0.2);
            if (e.key === 'ArrowUp') { e.preventDefault(); zoomBy(0.25); }
            if (e.key === 'ArrowDown') { e.preventDefault(); zoomBy(-0.25); }
        };
        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointerup', onPointerUp);
        container.addEventListener('pointercancel', onPointerUp);
        container.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('keydown', onKey);

        /* ---------- THE VIEW ---------- */

        // The point in focus is PANEL_DISTANCE in front of the camera; the place is scaled round it.
        // Far out it is the middle of the track, close in the cabin, which the view then follows.
        const focus = new THREE.Vector3(), cabinFocus = new THREE.Vector3();
        const fog = new THREE.Fog(PALE.horizon, 1e6, 2e6);
        let close = current.zoom > 0.5;
        const frame = (zoom, look, yaw, at) => {
            const u = zoom * zoom * (3 - 2 * zoom);
            const s = Math.exp(THREE.MathUtils.lerp(Math.log(farScale), Math.log(closeScale), u));
            cabinFocus.copy(place.cabinAt(at)).add({ x: 0, y: 0, z: 2 });
            focus.copy(place.centre).addScaledVector(PORTRAIT_SHIFT, portrait ? 1 : 0).lerp(cabinFocus, smooth(0, 0.6, u));
            room.scale.setScalar(s);
            room.position.copy(focus).multiplyScalar(-s);
            // close to the cabin at the hospital and round the bend, the view comes round to look at it
            // from the front left, past the bend rather than through it; over the road, straight on again
            turn.rotation.z = yaw + BEND_TURN * u * (1 - smooth(0.12, 0.42, at));
            const far = THREE.MathUtils.lerp(TILT.far[0], TILT.far[1], look);
            const near = THREE.MathUtils.lerp(TILT.close[0], TILT.close[1], look);
            tilt.rotation.x = -THREE.MathUtils.lerp(far, near, u);
            tilt.position.set(0, THREE.MathUtils.lerp(aboveY, closeY, u), 0);

            const lens = THREE.MathUtils.lerp(ABOVE_FOV, CLOSE_FOV, u);
            if (Math.abs(stage.camera.fov - lens) > 0.01) { stage.camera.fov = lens; stage.camera.updateProjectionMatrix(); }

            // The sun's shadow covers what is round the point in focus
            const reach = THREE.MathUtils.lerp(110, 40, u) * s;
            Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 10 * s, far: 260 * s });
            sun.shadow.camera.updateProjectionMatrix();
            sun.position.copy(focus).add(SUN);
            sun.target.position.copy(focus);
            sun.shadow.bias = -0.0004;
            sun.shadow.normalBias = 0.04 * s;

            // The distance fades into the haze: only far off, so the near things stay clear
            const distance = PANEL_DISTANCE / s;
            fog.near = (distance + THREE.MathUtils.lerp(140, 60, u)) * s;
            fog.far = (distance + THREE.MathUtils.lerp(520, 260, u)) * s;

            if ((u > 0.5) !== close) { close = u > 0.5; onZoom?.(close); }
        };

        /* ---------- STAGE ---------- */

        const stage = createStage(container, {
            smoke: 0,
            light: 0.35,
            shadows: true,
            onResize: layout,
            onFrame: (dt, t, elapsed) => {
                const ease = 1 - Math.exp(-elapsed * 5);
                current.yaw += (THREE.MathUtils.clamp(target.yaw + keyTurn.value + (portrait ? PORTRAIT_TURN : 0), -TURN, TURN) - current.yaw) * ease;
                current.look += (target.look - current.look) * ease;
                if (zoomRef) current.zoom += (zoomRef.current - current.zoom) * (1 - Math.exp(-elapsed * 2.5));

                const { at, lamp } = cabin?.() ?? { at: 0, lamp: 0 };
                place.setCabin(at, lamp, t);
                place.update(dt, reducedMotion);
                frame(current.zoom, current.look, current.yaw, at);
            },
        });
        stage.panel.add(tilt);
        stage.scene.fog = fog;
        stage.renderer.setClearColor(PALE.horizon, 1);
        stage.start();

        return () => {
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerdown', onPointerDown);
            container.removeEventListener('pointerup', onPointerUp);
            container.removeEventListener('pointercancel', onPointerUp);
            container.removeEventListener('wheel', onWheel);
            window.removeEventListener('keydown', onKey);
            place.dispose();
            skyMap.dispose();
            stage.dispose();
        };
    }, [cabin, zoomRef, onZoom]);

    // Pale: a shade at the top and the bottom, so the title, the count and the button can be read; a fine grain
    return (
        <div ref={containerRef} className='absolute inset-0 touch-none'>
            <div className='absolute inset-0 pointer-events-none' style={{ background: 'linear-gradient(to bottom, rgba(40,40,34,0.4), transparent 16%, transparent 50%, rgba(40,40,34,0.78))' }} />
            <div className='absolute inset-0 pointer-events-none opacity-[0.09] mix-blend-overlay' style={{ backgroundImage: GRAIN }} />
        </div>
    );
}
