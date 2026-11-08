'use client';

/**
 * 3D scene for 53 sekunder til fælles (three.js): højbanen in Viborg — the horizontal lift over
 * Heibergs Allé between the hospital's buildings (hoejbane.js) — in the 3D style (STIL.md,
 * kit/style.js), on the shared stage (scene/stage.js).
 *
 * The cabin goes where `cabin()` says: the interface knows the ride, the scene asks it every
 * frame where the cabin is, so the cabin glides along with the countdown.
 *
 * The view is fixed (VIEW): turned and tipped as it was chosen, it does not follow the pointer or
 * drift, and it cannot be zoomed by hand. Only zoomRef from outside moves it, gliding slowly from
 * the whole place (0) in towards the cabin (1), which the view then follows — close in, from the
 * angles that look past the bend and the buildings rather than through them.
 *
 * Weather: when `cabin()` says 'storm', it comes over the place in a few seconds — a grey fog
 * close in, the light dims, the sun goes, rain falls on a slant and now and then lightning
 * flashes — and lifts again as slowly when the ride is over.
 *
 * @param {() => { at: number, lamp: number, weather?: 'storm' | null }} cabin  Where the cabin is (0 = the hospital, 1 = the other side) and its lamp (0 off, 1 on, 2 blinking)
 * @param {{ current: number }} [zoomRef]  0 = the whole place, 1 = close to the cabin
 * @param {(close: boolean) => void} [onZoom]  Told when you go in close or back out
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createStage, PANEL_DISTANCE } from '@/player/scene/stage';
import { buildHoejbane } from '@/player/vaerker/53-sekunder-til-faelles/hoejbane';
import { createRain } from '@/player/kit/weather';
import { GREYS, LIGHT, zinc, vignette, shadowMapSize, styleRenderer } from '@/player/kit/style';

// The 3D style (kit/style.js). back: behind it all; haze: the colour the town greys into before it
// is gone into the dark; storm: the same in a storm, and the light
const L = {
    back: GREYS.back, haze: GREYS.haze, fog: GREYS.back,
    sun: [LIGHT.sun, LIGHT.sunStrength], light: [LIGHT.sky, LIGHT.fromBelow, LIGHT.skyStrength], rain: zinc(400),
    storm: { back: GREYS.back, haze: zinc(650), fog: zinc(675), light: zinc(400), sun: 0.25, lit: 1.1 },
};
const ABOVE_FOV = 32, CLOSE_FOV = 42;
const TILT = { far: [0.95, 1.32], close: [1.1, 1.45] };   // radians from straight down: pointer at the top, at the bottom
// The fixed view, from the whole place: turned (radians) and tipped (0 = most from above, 1 = most
// from the side; see TILT) as with the pointer at the top right. Close to the cabin: tipped this far
const VIEW = { turn: 0.75, look: 0, closeLook: 0.45 };
const BEND_TURN = 0.7;                           // close in, at the hospital end: turned this far, to look into the bend
const PORTRAIT_SHIFT = new THREE.Vector3(12, -12, 0);  // upright screens look at the middle of the track (the fixed view puts it on a slant)
const CLOSE_SIZE = 10;                           // metres across the view, close to the cabin

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
        const sun = new THREE.DirectionalLight(...L.sun);
        sun.castShadow = true;
        sun.shadow.mapSize.setScalar(shadowMapSize());
        const SUN = new THREE.Vector3(-55, -60, 85);
        sun.position.copy(place.centre).add(SUN);
        sun.target.position.copy(place.centre);
        room.add(sun, sun.target);
        const skyLight = new THREE.HemisphereLight(...L.light);
        tilt.add(skyLight);
        const fair = { sky: skyLight.color.clone(), sun: L.sun[1], light: L.light[2] };

        // The weather: 0 = fair, 1 = storm; eased, so it comes and goes over a few seconds
        const rain = createRain({ colour: L.rain });
        room.add(rain.mesh);
        const weather = { storm: 0, flash: 0, nextFlash: 4 };
        const tone = (fair, storm) => ({ fair: new THREE.Color(fair), storm: new THREE.Color(storm), now: new THREE.Color() });
        const backs = tone(L.back, L.storm.back), hazes = tone(L.haze, L.storm.haze), fogs = tone(L.fog, L.storm.fog);
        const haze = hazes.now, back = backs.now;
        const stormLight = new THREE.Color(L.storm.light), white = new THREE.Color(1, 1, 1);

        /* ---------- LAYOUT ---------- */

        // The whole place: the track and its two ends fill most of the width, a little above the controls
        let farScale = 1, closeScale = 1, aboveY = 0, closeY = 0, portrait = false;
        const layout = () => {
            const { view } = stage;
            const height = 2 * PANEL_DISTANCE * Math.tan(THREE.MathUtils.degToRad(ABOVE_FOV / 2));
            const across = Math.min(height * view.aspect * 0.95, height * 1.05);
            // Upright screens: closer, and turned a little, so the track crosses the screen on a slant
            portrait = view.aspect < 0.8;
            farScale = across / (place.size * (portrait ? 0.85 : 1));
            closeScale = (2 * PANEL_DISTANCE * Math.tan(THREE.MathUtils.degToRad(CLOSE_FOV / 2)) * Math.min(1, view.aspect)) / CLOSE_SIZE;
            aboveY = view.aspect < 1 ? height * 0.14 : height * 0.1;   // up, clear of the count and the button
            closeY = height * 0.2;
        };

        /* ---------- HOW CLOSE: set from outside (zoomRef), eased; nothing here changes it ---------- */

        const current = { zoom: zoomRef?.current ?? 0 };

        /* ---------- THE VIEW ---------- */

        // The point in focus is PANEL_DISTANCE in front of the camera; the place is scaled round it.
        // Far out it is the middle of the track, close in the cabin, which the view then follows.
        const focus = new THREE.Vector3(), cabinFocus = new THREE.Vector3();
        const fog = new THREE.Fog(L.fog, 1e6, 2e6);
        let close = current.zoom > 0.5;
        const frame = (zoom, at, dt) => {
            const u = zoom * zoom * (3 - 2 * zoom);
            const s = Math.exp(THREE.MathUtils.lerp(Math.log(farScale), Math.log(closeScale), u));
            cabinFocus.copy(place.cabinAt(at)).add({ x: 0, y: 0, z: 2 });
            focus.copy(place.centre).addScaledVector(PORTRAIT_SHIFT, portrait ? 1 : 0).lerp(cabinFocus, smooth(0, 0.6, u));
            room.scale.setScalar(s);
            room.position.copy(focus).multiplyScalar(-s);
            // From afar, the fixed view. Close to the cabin at the hospital and round the bend, the view
            // comes round to look at it from the front left, past the bend rather than through it; over
            // the road, straight on
            turn.rotation.z = THREE.MathUtils.lerp(VIEW.turn, BEND_TURN * (1 - smooth(0.2, 0.5, at)), u);
            const far = THREE.MathUtils.lerp(TILT.far[0], TILT.far[1], VIEW.look);
            const near = THREE.MathUtils.lerp(TILT.close[0], TILT.close[1], VIEW.closeLook);
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
            // (in a storm, a grey fog close in: the far side of the road is only just there)
            const storm = weather.storm;
            fog.near = (distance + THREE.MathUtils.lerp(THREE.MathUtils.lerp(140, 60, u), THREE.MathUtils.lerp(-20, 0, u), storm)) * s;
            fog.far = (distance + THREE.MathUtils.lerp(THREE.MathUtils.lerp(520, 260, u), THREE.MathUtils.lerp(120, 48, u), storm)) * s;

            // The rain falls round the point in focus: longer, faster streaks seen from afar, so they read
            rain.update(reducedMotion ? 0 : dt, focus, {
                amount: storm,
                size: THREE.MathUtils.lerp(170, 30, u),
                height: THREE.MathUtils.lerp(70, 26, u),
                length: THREE.MathUtils.lerp(5, 1.1, u),
                fall: THREE.MathUtils.lerp(40, 13, u),
                wind: THREE.MathUtils.lerp(14, 4, u),
            });

            if ((u > 0.5) !== close) { close = u > 0.5; onZoom?.(close); }
        };

        /* ---------- THE WEATHER ---------- */

        /** Ease towards fair (0) or storm (1), and light the place for it; lightning now and then in a storm */
        const stormy = (goal, dt, elapsed) => {
            weather.storm += (goal - weather.storm) * (1 - Math.exp(-elapsed * (goal > weather.storm ? 0.7 : 0.45)));
            const storm = weather.storm;
            // lightning: a double flash every few seconds once the storm is up
            weather.nextFlash -= dt;
            if (storm > 0.8 && weather.nextFlash <= 0 && !reducedMotion) { weather.flash = 1; weather.nextFlash = 5 + Math.random() * 9; }
            weather.flash = Math.max(0, weather.flash - dt * 3.2);
            const flash = weather.flash > 0 ? (weather.flash > 0.75 || (weather.flash > 0.3 && weather.flash < 0.5) ? 1 : 0) : 0;

            for (const t of [backs, hazes, fogs]) t.now.copy(t.fair).lerp(t.storm, storm).lerp(white, flash * 0.12);
            fog.color.copy(fogs.now);
            stage.renderer.setClearColor(back, 1);
            sun.intensity = THREE.MathUtils.lerp(fair.sun, L.storm.sun, storm);
            skyLight.color.copy(fair.sky).lerp(stormLight, storm);
            skyLight.intensity = THREE.MathUtils.lerp(fair.light, L.storm.lit, storm) + flash * 2.2;
        };

        /* ---------- STAGE ---------- */

        const stage = createStage(container, {
            smoke: 0,
            still: true,      // the camera holds still: no drifting, no following the pointer
            light: 0,         // no light of the stage's own: the scene's light is the style's
            shadows: true,
            onResize: layout,
            onFrame: (dt, t, elapsed) => {
                if (zoomRef) current.zoom += (zoomRef.current - current.zoom) * (1 - Math.exp(-elapsed * 0.9));   // a slow, calm glide in and out

                const { at, lamp, weather: forecast } = cabin?.() ?? { at: 0, lamp: 0 };
                stormy(forecast === 'storm' ? 1 : 0, dt, elapsed);
                place.setCabin(at, lamp, t);
                frame(current.zoom, at, dt);
                place.haze(haze, back);   // after the place has been moved for this frame
            },
        });
        stage.panel.add(tilt);
        stage.scene.fog = fog;
        styleRenderer(stage.renderer);   // no colour grading, ink behind (kit/style.js)
        stage.start();

        return () => {
            place.dispose();
            rain.mesh.geometry.dispose();
            rain.mesh.material.dispose();
            stage.dispose();
        };
    }, [cabin, zoomRef, onZoom]);

    // The picture fades into the dark at the top and the bottom (kit/style.js)
    return (
        <div ref={containerRef} className='absolute inset-0 touch-none'>
            <div className='absolute inset-0 pointer-events-none' style={{ background: vignette }} />
        </div>
    );
}
