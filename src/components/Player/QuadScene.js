'use client';

/**
 * 3D scene for a work made for four speakers (three.js): the gun emplacement seen from above
 * (scene/kanonstilling.js), the four speakers standing on its ammunition boxes, and the listener — a ball
 * floating over the middle of the pit. The photo (with depth) and smoke lie behind, on the shared
 * stage (scene/stage.js). A low sun from beyond the room throws its shadows towards the viewer,
 * so the pit's depth shows whichever way the room is turned.
 *
 * The sound: each speaker's front glows as loud as it plays, and sends wavefronts in towards the
 * listener — more and brighter the louder it is.
 *
 * The pointer turns you: to the right and you turn right — the room turns anticlockwise under you,
 * so what was on your right comes round to the front, as you hear it. A full turn from one edge of
 * the screen to the other; up and down tilts the view. The engine
 * (src/audio/Quad.js) is told which way the listener faces.
 *
 * @param {Quad} engine
 * @param {boolean} [textured=true]  The concrete texture (false: plain grey)
 * @param {number[]} angles          Where the speakers stand, degrees clockwise from straight ahead
 * @param {string} cover             Photo URL behind
 * @param {string} [coverDepth]
 * @param {{ current: number }} [turnRef]  Extra turn in radians (the keyboard, the compass), added to the pointer's
 * @param {(yaw: number) => void} [onTurn]
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createStage } from '@/components/Player/scene/stage';
import { buildKanonstilling } from '@/components/Player/scene/kanonstilling';
import { colors } from '@/styles/colors';

const TILT_MIN = 0.5, TILT_MAX = 1.0;   // radians the room is tipped towards the viewer: pointer high = flatter, low = steeper
const WAVE_EVERY = 0.32;                // seconds between a speaker's wavefronts
const WAVE_SPEED = 6.5;                 // metres a second (slowed right down from sound's 343, so it can be seen)

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

/** A soft round glow */
function glowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
}

export default function QuadScene({ engine, textured = true, angles, cover, coverDepth, turnRef, onTurn }) {
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

        const listenerAt = emplacement.listenerSpot;
        const listener = new THREE.Mesh(
            new THREE.SphereGeometry(0.55, 48, 32),
            new THREE.MeshStandardMaterial({ color: colors.paper, emissive: colors.paper, emissiveIntensity: 0.35, roughness: 0.4 }),
        );
        listener.castShadow = true;
        listener.position.copy(listenerAt);
        const glow = glowTexture();
        const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.35, blending: THREE.AdditiveBlending }));
        aura.scale.setScalar(2.6);
        listener.add(aura);
        room.add(listener);

        /* ---------- THE SPEAKERS: cabinets on the wall, facing in ---------- */

        const cabinetGeo = new THREE.BoxGeometry(0.62, 0.5, 0.82);   // a little larger than life, to be seen
        cabinetGeo.translate(0, 0, 0.41);
        const coneGeo = new THREE.CircleGeometry(0.2, 32);
        const waveGeo = new THREE.SphereGeometry(1, 48, 24);
        const cabinetMaterial = new THREE.MeshStandardMaterial({ color: colors.ink, roughness: 0.6 });

        const speakers = angles.map((deg) => {
            const group = new THREE.Group();
            group.position.copy(emplacement.speakerSpot(deg));
            group.rotation.z = -THREE.MathUtils.degToRad(deg);   // local +y points out from the middle
            const cabinet = new THREE.Mesh(cabinetGeo, cabinetMaterial);
            cabinet.castShadow = true;
            cabinet.scale.setScalar(1.4);
            const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: colors.paper, toneMapped: false }));
            cone.position.set(0, -0.255, 0.46);
            cone.rotation.x = Math.PI / 2;                       // faces the middle (-y)
            const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, toneMapped: false, opacity: 0, blending: THREE.AdditiveBlending }));
            halo.position.set(0, -0.36, 0.46);
            cabinet.add(cone, halo);
            group.add(cabinet);
            room.add(group);

            // Where the sound leaves the speaker, and which way the listener is from there (room space)
            group.updateMatrix();
            cabinet.updateMatrix();
            const mouth = new THREE.Vector3(0, -0.26, 0.46).applyMatrix4(cabinet.matrix).applyMatrix4(group.matrix);
            const toward = listenerAt.clone().sub(mouth);
            const reach = toward.length();
            toward.normalize();

            const waves = Array.from({ length: Math.ceil(reach / WAVE_SPEED / WAVE_EVERY) + 1 }, () => {
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
            return { cone, halo, waves, reach, level: 0, since: Math.random() * WAVE_EVERY };
        });

        /* ---------- LAYOUT ---------- */

        let scale = 1;
        const layout = () => {
            const { view } = stage;
            // The ring fills a good part of the screen, a little above the title bar; the bunker
            // ahead may run off the top
            const across = Math.min(view.width * 0.9, view.height * 0.66);
            scale = across / emplacement.size;
            room.scale.setScalar(scale);
            sun.position.copy(SUN).multiplyScalar(scale);
            tilt.position.y = view.aspect < 1 ? -view.height * 0.02 : -view.height * 0.04;
            // The sun's shadow covers the whole emplacement, in the scaled room's units
            const cam = sun.shadow.camera;
            const reach = 30 * scale;
            Object.assign(cam, { left: -reach, right: reach, top: reach, bottom: -reach, near: 2 * scale, far: 100 * scale });
            cam.updateProjectionMatrix();
            sun.shadow.bias = -0.0004;
            sun.shadow.normalBias = 0.03 * scale;
        };

        /* ---------- POINTER: which way you face ---------- */

        const target = { yaw: 0, tilt: (TILT_MIN + TILT_MAX) / 2 };
        const current = { yaw: 0, tilt: target.tilt };
        const onPointerMove = (e) => {
            const rect = container.getBoundingClientRect();
            const fx = THREE.MathUtils.clamp((e.clientX - rect.left) / rect.width, 0, 1);
            const fy = THREE.MathUtils.clamp((e.clientY - rect.top) / rect.height, 0, 1);
            target.yaw = (fx - 0.5) * Math.PI * 2;                      // a full turn across the screen: right = you turn right
            target.tilt = TILT_MIN + (TILT_MAX - TILT_MIN) * fy;         // pointer low = seen more from the side
        };
        container.addEventListener('pointermove', onPointerMove);

        /* ---------- STAGE ---------- */

        const stage = createStage(container, {
            smoke: 0.45,
            light: 0.35,
            shadows: true,
            onResize: layout,
            onFrame: (dt, t, elapsed) => {
                const ease = 1 - Math.exp(-elapsed * 6);
                const extra = turnRef?.current ?? 0;
                current.yaw += (target.yaw + extra - current.yaw) * ease;
                current.tilt += (target.tilt - current.tilt) * ease;
                room.rotation.z = current.yaw;                            // you turn right: the room turns anticlockwise under you
                tilt.rotation.x = -current.tilt;
                engine.setYaw(current.yaw);
                onTurn?.(current.yaw);

                listener.position.z = listenerAt.z + Math.sin(t * 0.9) * 0.12;

                const levels = engine.levels();
                let total = 0;
                speakers.forEach((speaker, i) => {
                    const raw = levels[i] ?? 0;
                    speaker.level += (raw - speaker.level) * (raw > speaker.level ? 0.5 : 0.12);
                    const { level } = speaker;
                    total += level;
                    const glowing = 0.25 + level * 0.75;
                    speaker.cone.material.color.setRGB(glowing, glowing, glowing);
                    speaker.halo.material.opacity = level * 0.9;
                    speaker.halo.scale.setScalar(0.6 + level * 1.6);

                    // A new wavefront every so often while it plays
                    speaker.since += dt;
                    if (speaker.since >= WAVE_EVERY && level > 0.05) {
                        speaker.since = 0;
                        const wave = speaker.waves.find((w) => !w.alive);
                        if (wave) Object.assign(wave, { alive: true, age: 0, strength: level });
                    }
                    for (const wave of speaker.waves) {
                        if (!wave.alive) { wave.mesh.visible = false; continue; }
                        wave.age += dt;
                        const p = (wave.age * WAVE_SPEED) / speaker.reach;   // 0 at the speaker, 1 at the listener
                        if (p >= 1) { wave.alive = false; wave.mesh.visible = false; continue; }
                        wave.mesh.visible = true;
                        wave.mesh.scale.setScalar(Math.max(0.05, p * speaker.reach));
                        wave.mesh.material.uniforms.uOpacity.value = wave.strength * Math.min(1, p * 8) * (1 - p) ** 1.2 * 1.3;
                    }
                });
                const heard = total / Math.max(1, speakers.length);
                listener.material.emissiveIntensity = 0.3 + heard * 0.6;
                aura.material.opacity = 0.25 + heard * 0.5;
            },
        });
        stage.panel.add(tilt);
        stage.setBackdrop(cover, coverDepth);
        stage.start();

        return () => {
            container.removeEventListener('pointermove', onPointerMove);
            emplacement.group.traverse((obj) => obj.material?.userData?.texture?.dispose());
            glow.dispose();
            stage.dispose();
        };
    }, [engine, textured, angles, cover, coverDepth, turnRef, onTurn]);

    return <div ref={containerRef} className='absolute inset-0 touch-none' />;
}
