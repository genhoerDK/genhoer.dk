'use client';

/**
 * The 3D street for the street interface (three.js): the town round the street seen at a slant from
 * above, as Tværveje's Nakskov, and built the same way (kit/townmap.js): the streets from
 * OpenStreetMap as muted bands, the church, and houses and trees made up from the streets, in the
 * 3D style (STIL.md), clear in the town and lost in a haze where it ends.
 *
 * You walk the street from stop to stop (the pairs of speakers): a scroll, a drag up or down or an
 * arrow key takes you to the next or the one before, and the view follows, turned down the street. Along it hang the speakers (speaker.js), on the facades on
 * either side; the ones near you are white, and while the work plays, rings go out from them.
 * The view is otherwise locked: no turning, tipping or zooming.
 *
 * @param {object} data           The street's map (src/player/vaerker/streets.js): a map as nakskov.js,
 *                                with `street` (the street you walk, an SVG path) and `walk` ([from, to] in metres along it)
 * @param {{ s: number, side: number }[]} speakers  Metres along the street, and the side: −1 left, 1 right walking on
 * @param {boolean} sounding      The work is playing
 * @param {(where: { s: number, f: number }) => void} onMove   Where you are: metres along, and 0–1 of the walk
 * @param {number[]} [stops]     Metres along the street where you can stand (default: the walk's two ends)
 * @param {{ current: ((s: number) => void) | null }} [walkRef]  Set to a function that walks you to the stop nearest a place (metres along)
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { pixelRatio, vignetteMask, fadeIn } from '@/player/kit/style';
import { buildTownMap, alongLine } from '@/player/kit/townmap';
import { pathLines } from '@/player/kit/roads';
import { createSpeaker } from '@/player/interfaces/street/speaker';

const REACH = { wide: 115, tall: 150 };   // metres from the camera to where you are, on a wide and a tall screen: close, in the street
const SCALE_AT = 150;                     // the speakers are drawn their true size seen from this far, and grow with the distance
const TILT = 0.8;                         // radians above the horizon the view looks down from (locked): a little from the side, into the street
const SCROLL = 40;                        // pixels scrolled that make a step to the next stop
const REST = 400;                         // ms the wheel must rest after a step before a scroll can make the next
const DRAG = 36;                          // pixels dragged that make a step
const WALL = 3.6;                         // metres from the middle of the street to the speakers' walls
const NEAR = 24;                          // metres along the street over which a speaker lights as you come
const HAZE = { town: [36, 150], edge: 120 };   // metres from the nearest street: clear, lost; the map's edge

export default function StreetScene({ data, speakers, stops, sounding, onMove, walkRef }) {
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
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        const canvas = renderer.domElement;
        canvas.className = 'absolute inset-0 size-full touch-none';
        // The style's vignette: faded out under the header and under the controls
        canvas.style.maskImage = canvas.style.webkitMaskImage = vignetteMask;
        container.prepend(canvas);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 5, 6000);

        /* ---------- the street you walk, and where the speakers hang ---------- */

        const k = data.metres ?? 1;
        const to = (x, y) => [(x - data.width / 2) * k, (y - data.height / 2) * k];
        const path = alongLine(pathLines(data.street, to)[0]);
        const [w0, w1] = data.walk;
        const spots = speakers.map(({ s, side }) => {
            const [x, z] = path.at(s);
            const [tx, tz] = path.direction(s, 4);
            const wall = [-tz * side, tx * side];   // from the middle of the street to the wall: to the right walking on for side 1
            return { s, x: x + wall[0] * WALL, z: z + wall[1] * WALL, wall };
        });

        /* ---------- the town (kit/townmap.js), with the street you walk among its streets ---------- */

        const town = buildTownMap({
            scene,
            map: { ...data, side: [data.street, ...(data.side ?? [])] },
            to,
            clear: { trees: spots.map((p) => new THREE.Vector2(p.x, p.z)) },
            haze: HAZE,
        });

        /* ---------- the speakers, on the walls, out over the street ---------- */

        const markers = spots.map((spot, i) => {
            const speaker = createSpeaker({ wall: spot.wall.map((v) => -v), seed: i });
            speaker.group.position.set(spot.x, 0, spot.z);
            speaker.pool.position.set(spot.x - spot.wall[0] * 1.5, 0.3, spot.z - spot.wall[1] * 1.5);
            scene.add(speaker.group, speaker.pool);
            return { speaker, spot };
        });

        /* ---------- size ---------- */

        const size = { w: 1, h: 1 };
        const resize = () => {
            const { clientWidth: w, clientHeight: h } = container;
            if (!w || !h) return;
            size.w = w; size.h = h;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.fov = w < h ? 46 : 38;
            // Where you are stands a little above the middle, clear of the controls under it
            camera.setViewOffset(w, h, 0, (0.5 - (w < h ? 0.4 : 0.44)) * h, w, h);
            camera.updateProjectionMatrix();
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();
        const reach = () => (size.w < size.h ? REACH.tall : REACH.wide);

        /* ---------- walking: from stop to stop — the wheel, a drag, the keys ---------- */

        // You stand at one of the stops (the pairs of speakers) and go to the next or the one before:
        // one scroll, one drag or one key is one step, however hard. The walk between eases.
        const places = stops?.length ? [...stops].sort((a, b) => a - b) : [w0, w1];
        let at = 0;
        const walk = { target: places[0], s: places[0] };
        const step = (dir) => {
            at = THREE.MathUtils.clamp(at + dir, 0, places.length - 1);
            walk.target = places[at];
        };
        // From outside: walk to the stop nearest a place (the timeline's events happen at the stops)
        if (walkRef) walkRef.current = (s) => {
            at = places.reduce((best, p, i) => (Math.abs(p - s) < Math.abs(places[best] - s) ? i : best), 0);
            walk.target = places[at];
        };
        // One scroll gesture is one step, however long: after a step, the wheel must rest a moment
        // (a trackpad's swipe goes on sending as it glides out) before it can make the next
        let wheel = 0, wheelAt = 0, spent = false;
        const onWheel = (e) => {
            e.preventDefault();
            const now = performance.now();
            if (now - wheelAt > REST) { wheel = 0; spent = false; }   // a new gesture
            wheelAt = now;
            if (spent) return;
            const lines = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? size.h : 1;
            wheel += e.deltaY * lines;
            if (Math.abs(wheel) > SCROLL) {
                step(Math.sign(wheel));
                spent = true;
            }
        };
        // Dragging the town towards you (down) walks you on, as scrolling down does: one drag, one step
        let drag = null;
        const onDown = (e) => {
            drag = { id: e.pointerId, y: e.clientY };
            try { canvas.setPointerCapture(e.pointerId); } catch { /* gone already */ }
        };
        const onUp = (e) => {
            if (drag?.id !== e.pointerId) return;
            const dy = e.clientY - drag.y;
            if (Math.abs(dy) > DRAG) step(Math.sign(dy));
            drag = null;
        };
        const onKey = (e) => {
            if (e.repeat || e.target?.closest?.('input, textarea, select, [role="slider"]')) return;
            const dir = { ArrowUp: 1, w: 1, W: 1, ArrowDown: -1, s: -1, S: -1 }[e.key];
            if (!dir) return;
            e.preventDefault();
            step(dir);
        };
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('pointerdown', onDown);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        window.addEventListener('keydown', onKey);

        /* ---------- every frame ---------- */

        const focus = new THREE.Vector2(...path.at(walk.s));
        const facing = new THREE.Vector2(...path.direction(walk.s, 30));
        const here = new THREE.Vector2(), ahead = new THREE.Vector2();
        let frame, last = performance.now(), t = 0, reported = { s: -1, at: 0 };

        const tick = (time) => {
            frame = requestAnimationFrame(tick);
            const dt = Math.min((time - last) / 1000, 0.1);
            last = time;
            t += dt;

            walk.s += (walk.target - walk.s) * (still ? 1 : 1 - Math.exp(-dt * 3));

            // The view follows you down the street, turned the way it goes
            focus.lerp(here.set(...path.at(walk.s)), still ? 1 : 1 - Math.exp(-dt * 6));
            facing.lerp(ahead.set(...path.direction(walk.s, 30)), still ? 1 : 1 - Math.exp(-dt * 1.5)).normalize();
            const r = reach();
            camera.position.set(focus.x - facing.x * Math.cos(TILT) * r, Math.sin(TILT) * r, focus.y - facing.y * Math.cos(TILT) * r);
            camera.lookAt(focus.x, 0, focus.y);

            // The speakers near you light up; while the work plays, they ring out
            const playing = state.current.sounding;
            for (const { speaker, spot } of markers) {
                speaker.group.scale.setScalar(r / SCALE_AT);
                const near = Math.max(0, 1 - Math.abs(spot.s - walk.s) / NEAR);
                speaker.update(dt, t, { near: near * near * (3 - 2 * near), sounding: playing, still });
            }

            town.update(t, still);
            renderer.render(scene, camera);

            // Tell where you are, now and then
            if (state.current.onMove && (Math.abs(walk.s - reported.s) > 0.3 || (time - reported.at > 400 && walk.s !== reported.s))) {
                reported = { s: walk.s, at: time };
                state.current.onMove({ s: walk.s, f: (walk.s - w0) / (w1 - w0) });
            }
        };
        frame = requestAnimationFrame(tick);
        fadeIn(canvas);   // the way into the room: a toning (STIL.md)

        return () => {
            cancelAnimationFrame(frame);
            if (walkRef) walkRef.current = null;
            resizeObserver.disconnect();
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            window.removeEventListener('keydown', onKey);
            markers.forEach(({ speaker }) => speaker.dispose());
            scene.traverse((obj) => {
                obj.geometry?.dispose();
                (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m?.dispose());
            });
            town.dispose();
            renderer.dispose();
            canvas.remove();
        };
    }, [data, speakers, stops, walkRef]);

    return (
        <div ref={containerRef} className='absolute inset-0'>
            {failed && (
                <p className='absolute inset-x-gutter top-1/3 text-center text-faint'>Gaden kan ikke vises i denne browser.</p>
            )}
        </div>
    );
}
