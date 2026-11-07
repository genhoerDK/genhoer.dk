'use client';

/**
 * 3D scene for a work made for four speakers (three.js): the gun emplacement seen from above
 * (scene/kanonstilling.js), in its forest (scene/forest.js), with the four loudspeakers on the ring wall where the work was played;
 * you are in the middle of the pit. The photo (with depth) and smoke lie behind, on the shared
 * stage (scene/stage.js). A low sun from beyond the room throws its shadows towards the viewer,
 * so the pit's depth shows whichever way the room is turned.
 *
 * The sound: from where each speaker stands, wavefronts drift slowly in towards the listener, one
 * for every note or hit on that track and otherwise the more often the louder it plays, each as
 * bright as the track was when it left. The levels are eased, so it breathes rather than flickers.
 *
 * Zoom (the wheel, a pinch, ↑/↓, or zoomRef from outside) takes you from the view from above down
 * into the emplacement, to stand at eye height on the pivot cone in the middle: the trees round
 * you, the walls at full height, the waves coming in from the speakers; up and down then looks up
 * into the trees and down at the floor, and the distance hazes over into a sky round it all.
 *
 * The pointer turns you: to the right and you turn right — the room turns anticlockwise under you,
 * so what was on your right comes round to the front, as you hear it. A full turn from one edge of
 * the screen to the other; up and down tilts the view. The engine
 * (src/audio/Quad.js) is told which way the listener faces.
 *
 * @param {Quad} engine
 * @param {boolean} [textured=false] The concrete texture (false: plain grey)
 * @param {number[]} angles          Where the speakers stand, degrees clockwise from straight ahead
 * @param {string} cover             Photo URL behind
 * @param {string} [coverDepth]
 * @param {{ current: number }} [turnRef]  Extra turn in radians (the keyboard, the compass), added to the pointer's
 * @param {(yaw: number) => void} [onTurn]
 * @param {{ current: number }} [zoomRef]  Where to be: 0 = above, 1 = standing in the middle
 * @param {(inside: boolean) => void} [onZoom]  Told when you go in or come out
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createStage, PANEL_DISTANCE } from '@/components/Player/scene/stage';
import { buildKanonstilling } from '@/components/Player/scene/kanonstilling';
import { colors } from '@/styles/colors';

const TILT_MIN = 0.5, TILT_MAX = 1.0;   // radians the room is tipped towards the viewer: pointer high = flatter, low = steeper
const LOOK_UP = 0.55, LOOK_DOWN = 0.75;  // standing in the middle: how far up and down you can look, radians from level
const EYE_SCALE = 0.5;                  // the room's scale standing inside (keeps the camera's near plane at 10 cm)
const EYE_FOV = 50, ABOVE_FOV = 32;     // wider when you stand in it
const HAZE = { horizon: 0x9a9d96, sky: 0xd2d5d1, ground: 0x4f5149 };   // the sky round you, and the haze the distance fades into
const WAVE_SPEED = 2.4;                 // metres a second (slowed right down from sound's 343, so it can be seen)
const WAVE_QUIET = 1.6, WAVE_LOUD = 0.45; // seconds between a speaker's wavefronts, when it plays softly and loudly
const ONSET = 0.12;                     // a rise in level this sudden (a note, a hit) sends a wavefront at once

/* A wavefront: a shell round the speaker, bright at its rim and only on the side facing the listener */
const waveShader = {
    vertexShader: `
        varying vec3 vDir, vNormal, vView;
        void main() {
            vDir = normalize(position);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
        }`,
    fragmentShader: `
        uniform vec3 uColor, uToward;
        uniform float uOpacity;
        varying vec3 vDir, vNormal, vView;
        void main() {
            float rim = pow(1.0 - abs(dot(vNormal, vView)), 2.0);
            float facing = smoothstep(0.35, 0.95, dot(vDir, uToward));
            gl_FragColor = vec4(uColor * (rim * 0.9 + 0.12) * facing * uOpacity, 1.0);
        }`,
};

export default function QuadScene({ engine, textured = false, angles, cover, coverDepth, turnRef, onTurn, zoomRef, onZoom }) {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !engine) return;

        /* ---------- THE ROOM ---------- */

        const tilt = new THREE.Group();            // tipped towards the viewer
        const room = new THREE.Group();            // turns with the listener; metres inside
        tilt.add(room);

        const emplacement = buildKanonstilling({ textured });
        room.add(emplacement.group);

        // The sun, from beyond the room on the left; it stays put while the room turns under it
        const sun = new THREE.DirectionalLight(0xfff6ea, 3.2);
        const SUN = new THREE.Vector3(-20, 22, 30);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        tilt.add(sun, sun.target);

        /* ---------- THE LISTENER: a ball floating over the middle ---------- */

        /* ---------- THE LOUDSPEAKERS, where the work was played ---------- */

        const listenerAt = emplacement.listenerSpot;
        for (const deg of angles) room.add(emplacement.loudspeaker(deg));

        /* ---------- THE SOUND: wavefronts from where each speaker stands ---------- */

        const waveGeo = new THREE.SphereGeometry(1, 48, 24);
        const speakers = angles.map((deg) => {
            const mouth = emplacement.speakerSpot(deg);
            const toward = listenerAt.clone().sub(mouth);
            const reach = toward.length();
            toward.normalize();

            const waves = Array.from({ length: Math.ceil(reach / WAVE_SPEED / 0.25) + 2 }, () => {
                const mesh = new THREE.Mesh(waveGeo, new THREE.ShaderMaterial({
                    ...waveShader,
                    uniforms: { uColor: { value: new THREE.Color(colors.paper) }, uToward: { value: toward }, uOpacity: { value: 0 } },
                    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
                }));
                mesh.position.copy(mouth);
                mesh.visible = false;
                room.add(mesh);
                return { mesh, age: 0, strength: 0, alive: false };
            });
            return { waves, reach, level: 0, fast: 0, since: Math.random() * WAVE_QUIET };
        });

        /* ---------- THE SKY: only seen from inside, round everything ---------- */

        const skyGeo = new THREE.SphereGeometry(45, 48, 24);
        const skyColours = [];
        const horizon = new THREE.Color(HAZE.horizon), sky = new THREE.Color(HAZE.sky), groundHaze = new THREE.Color(HAZE.ground), c = new THREE.Color();
        for (let i = 0; i < skyGeo.attributes.position.count; i++) {
            const h = skyGeo.attributes.position.getY(i) / 45;   // the sphere's poles are on y: turned below
            if (h >= 0) c.copy(horizon).lerp(sky, Math.pow(h, 0.6)); else c.copy(horizon).lerp(groundHaze, Math.min(1, -h * 4));
            skyColours.push(c.r, c.g, c.b);
        }
        skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyColours, 3));
        skyGeo.rotateX(Math.PI / 2);                         // poles on z
        const skyDome = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false }));
        skyDome.renderOrder = -0.5;                          // over the photo, under the rest
        skyDome.visible = false;
        room.add(skyDome);

        /* ---------- LAYOUT ---------- */

        // From above: the ledge round the ring fills a good part of the screen, a little above the
        // title bar (the machine block ahead may run off the top)
        let aboveScale = 1, aboveY = 0;
        const layout = () => {
            const { view } = stage;
            const height = 2 * PANEL_DISTANCE * Math.tan(THREE.MathUtils.degToRad(ABOVE_FOV / 2));   // the view at the overview's lens
            const across = Math.min(height * view.aspect * 0.9, height * 0.66);
            aboveScale = across / emplacement.size;
            aboveY = view.aspect < 1 ? -height * 0.02 : -height * 0.04;
        };

        /** The room at a scale: the sun and its shadow go with it */
        let scale = 1;
        const setScale = (s) => {
            scale = s;
            room.scale.setScalar(s);
            sun.position.copy(SUN).multiplyScalar(s);
            // The sun's shadow covers the emplacement and the trees round it, in the scaled room's units
            const cam = sun.shadow.camera;
            const reach = 36 * s;
            Object.assign(cam, { left: -reach, right: reach, top: reach, bottom: -reach, near: 2 * s, far: 100 * s });
            cam.updateProjectionMatrix();
            sun.shadow.bias = -0.0004;
            sun.shadow.normalBias = 0.03 * s;
        };

        /* ---------- POINTER: which way you face, how close you are ---------- */

        const target = { yaw: 0, look: 0.5 };               // look: 0–1, the pointer from the top of the screen to the bottom
        const current = { yaw: 0, look: 0.5, zoom: zoomRef?.current ?? 0 };
        const touches = new Map();
        let pinch = null;
        const zoomBy = (amount) => {
            const z = THREE.MathUtils.clamp((zoomRef?.current ?? current.zoom) + amount, 0, 1);
            if (zoomRef) zoomRef.current = z; else current.zoom = z;
        };
        const onPointerMove = (e) => {
            if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
            if (touches.size >= 2) {
                // Two fingers: spread them to go in, pinch to come out
                const [[ax, ay], [bx, by]] = [...touches.values()];
                const spread = Math.hypot(ax - bx, ay - by);
                if (pinch) zoomBy((spread - pinch) * 0.004);
                pinch = spread;
                return;
            }
            const rect = container.getBoundingClientRect();
            const fx = THREE.MathUtils.clamp((e.clientX - rect.left) / rect.width, 0, 1);
            const fy = THREE.MathUtils.clamp((e.clientY - rect.top) / rect.height, 0, 1);
            target.yaw = (fx - 0.5) * Math.PI * 2;                      // a full turn across the screen: right = you turn right
            target.look = fy;                                            // from above: low = seen more from the side; inside: low = look down
        };
        const onPointerDown = (e) => { if (e.pointerType === 'touch') touches.set(e.pointerId, [e.clientX, e.clientY]); };
        const onPointerUp = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
        const onWheel = (e) => {
            e.preventDefault();
            zoomBy(-e.deltaY * (e.deltaMode === 1 ? 0.04 : 0.0015));
        };
        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointerup', onPointerUp);
        container.addEventListener('pointercancel', onPointerUp);
        container.addEventListener('wheel', onWheel, { passive: false });

        /* ---------- THE WAY DOWN ---------- */

        // Seen through the camera, the room is placed so that a point F on its middle axis is D (metres)
        // in front of the eye: from above F is the ground in the middle and D far enough for the
        // overview; inside F is your eyes and D nothing. Everything in between eases from one to the other.
        const eye = emplacement.eyeSpot;
        const focus = new THREE.Vector3();
        const fog = new THREE.Fog(HAZE.horizon, 1e6, 2e6);
        let inside = current.zoom > 0.5;
        const place = (zoom, look) => {
            const u = zoom * zoom * (3 - 2 * zoom);
            const s = Math.exp(THREE.MathUtils.lerp(Math.log(aboveScale), Math.log(EYE_SCALE), u));
            setScale(s);
            const aboveTilt = TILT_MIN + (TILT_MAX - TILT_MIN) * look;
            const insideTilt = Math.PI / 2 - LOOK_UP + (LOOK_UP + LOOK_DOWN) * look;
            tilt.rotation.x = -THREE.MathUtils.lerp(aboveTilt, insideTilt, u);
            const distance = (PANEL_DISTANCE / aboveScale) * Math.pow(1 - u, 1.5);   // metres from the eye
            focus.set(0, 0, eye.z * u).multiplyScalar(s).applyEuler(tilt.rotation);
            tilt.position.set(0, aboveY * (1 - u), PANEL_DISTANCE - distance * s).sub(focus);

            const lens = THREE.MathUtils.lerp(ABOVE_FOV, EYE_FOV, u);
            if (Math.abs(stage.camera.fov - lens) > 0.01) { stage.camera.fov = lens; stage.camera.updateProjectionMatrix(); }

            // The distance hazes over into the sky as you come down
            skyDome.visible = u > 0.001;
            skyDome.material.opacity = smooth(0.35, 0.9, u);
            fog.near = THREE.MathUtils.lerp(400, 7, u) * s;
            fog.far = THREE.MathUtils.lerp(800, 36, u) * s;

            if ((u > 0.5) !== inside) { inside = u > 0.5; onZoom?.(inside); }
            return u;
        };
        const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

        /* ---------- STAGE ---------- */

        const cutCentre = new THREE.Vector3();
        const stage = createStage(container, {
            smoke: 0.45,
            light: 0.35,
            shadows: true,
            onResize: layout,
            onFrame: (dt, t, elapsed) => {
                const ease = 1 - Math.exp(-elapsed * 6);
                const extra = turnRef?.current ?? 0;
                current.yaw += (target.yaw + extra - current.yaw) * ease;
                current.look += (target.look - current.look) * ease;
                if (zoomRef) current.zoom += (zoomRef.current - current.zoom) * (1 - Math.exp(-elapsed * 2.5));
                room.rotation.z = current.yaw;                            // you turn right: the room turns anticlockwise under you
                const u = place(current.zoom, current.look);
                engine.setYaw(current.yaw);
                onTurn?.(current.yaw);

                // Trees between you and the emplacement thin out — not once you are down among them
                stage.camera.updateMatrixWorld(true);
                emplacement.forest.update(room.localToWorld(cutCentre.set(0, 0, 1.5)), emplacement.size * 0.5 * scale * (1 - smooth(0.3, 0.7, u)));

                const levels = engine.levels();
                speakers.forEach((speaker, i) => {
                    const raw = levels[i] ?? 0;
                    // Eased: rises in about a tenth of a second, falls over most of a second
                    const before = speaker.fast;
                    speaker.fast += (raw - speaker.fast) * (1 - Math.exp(-elapsed * 25));
                    speaker.level += (raw - speaker.level) * (1 - Math.exp(-elapsed * (raw > speaker.level ? 9 : 1.6)));
                    const { level } = speaker;

                    // A wavefront at every sudden rise (a note, a hit), otherwise the more often the louder it plays
                    speaker.since += dt;
                    const onset = speaker.fast - before > ONSET * elapsed * 30 && speaker.since > 0.25;
                    const every = WAVE_QUIET + (WAVE_LOUD - WAVE_QUIET) * level;
                    if ((onset || speaker.since >= every) && level > 0.06) {
                        speaker.since = 0;
                        const wave = speaker.waves.find((w) => !w.alive);
                        if (wave) Object.assign(wave, { alive: true, age: 0, strength: Math.max(level, speaker.fast) });
                    }
                    for (const wave of speaker.waves) {
                        if (!wave.alive) { wave.mesh.visible = false; continue; }
                        wave.age += dt;
                        const p = (wave.age * WAVE_SPEED) / speaker.reach;   // 0 at the speaker, 1 at the listener
                        if (p >= 1) { wave.alive = false; wave.mesh.visible = false; continue; }
                        wave.mesh.visible = true;
                        wave.mesh.scale.setScalar(Math.max(0.05, p * speaker.reach));
                        wave.mesh.material.uniforms.uOpacity.value = wave.strength ** 1.5 * Math.min(1, p * 5) * (1 - p) ** 1.6 * 1.1;
                    }
                });
            },
        });
        stage.panel.add(tilt);
        stage.scene.fog = fog;
        stage.setBackdrop(cover, coverDepth);
        stage.start();

        return () => {
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerdown', onPointerDown);
            container.removeEventListener('pointerup', onPointerUp);
            container.removeEventListener('pointercancel', onPointerUp);
            container.removeEventListener('wheel', onWheel);
            emplacement.group.traverse((obj) => {
                obj.material?.userData?.texture?.dispose();
                obj.material?.userData?.textures?.forEach((t) => t.dispose());
            });
            emplacement.forest.dispose();
            stage.dispose();
        };
    }, [engine, textured, angles, cover, coverDepth, turnRef, onTurn, zoomRef, onZoom]);

    return <div ref={containerRef} className='absolute inset-0 touch-none' />;
}
