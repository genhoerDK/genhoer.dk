'use client';

/**
 * 3D scene for a work made for four speakers (three.js): a model of the room — the gun
 * emplacement — seen from above, with the four speakers hanging evenly around it and the listener
 * in the middle, facing up the screen. The photo (with depth) and smoke lie behind, on the shared
 * stage (scene/stage.js).
 *
 * The pointer turns the room: its place across the screen is where you face, a full turn from
 * the left edge to the right one, and up and down tilts the view. The speakers glow as loud as
 * they are. The engine (src/audio/Quad.js) is told which way the listener faces.
 *
 * @param {Quad} engine
 * @param {string} model          URL of the room's STL model (z up)
 * @param {number[]} angles       Where the speakers hang, degrees clockwise from straight ahead
 * @param {string} cover          Photo URL behind
 * @param {string} [coverDepth]
 * @param {{ current: number }} [turnRef]  Extra turn in radians (the keyboard, the compass), added to the pointer's
 * @param {(yaw: number) => void} [onTurn]
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { createStage } from '@/components/Player/scene/stage';
import { colors } from '@/styles/colors';

const TILT_MIN = 0.55, TILT_MAX = 1.05;   // radians the room is tipped towards the viewer: pointer high = flatter, low = steeper

export default function QuadScene({ engine, model, angles, cover, coverDepth, turnRef, onTurn }) {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !engine) return;

        /* ---------- THE ROOM ---------- */

        const tilt = new THREE.Group();            // tipped towards the viewer
        const room = new THREE.Group();            // turns with the listener
        tilt.add(room);

        const concrete = new THREE.MeshStandardMaterial({ color: colors.hard, roughness: 1, metalness: 0 });
        let size = 1;                               // the model's footprint, in its own units
        new STLLoader().load(model, (geometry) => {
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const centre = box.getCenter(new THREE.Vector3());
            geometry.translate(-centre.x, -centre.y, -box.min.z);
            size = Math.max(box.max.x - box.min.x, box.max.y - box.min.y);
            geometry.computeVertexNormals();
            room.add(new THREE.Mesh(geometry, concrete));
            layout();
        });

        // Soft shadow under the room
        const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), new THREE.MeshBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.35, depthWrite: false }));
        shadow.position.z = -0.001;
        room.add(shadow);

        /* The speakers, hanging evenly around the ring */
        const speakerGeo = new THREE.SphereGeometry(0.5, 20, 14);
        const haloTexture = (() => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 128;
            const ctx = canvas.getContext('2d');
            const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
            g.addColorStop(0, 'rgba(250,250,250,0.9)');
            g.addColorStop(0.3, 'rgba(250,250,250,0.35)');
            g.addColorStop(1, 'rgba(250,250,250,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 128, 128);
            return new THREE.CanvasTexture(canvas);
        })();
        const speakers = angles.map((deg) => {
            const group = new THREE.Group();
            const a = (deg * Math.PI) / 180;
            group.userData.angle = a;
            const ball = new THREE.Mesh(speakerGeo, new THREE.MeshBasicMaterial({ color: colors.paper, toneMapped: false }));
            const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.5 }));
            group.add(ball, halo);
            room.add(group);
            return { group, ball, halo };
        });

        /* You, in the middle, facing up the screen — fixed while the room turns */
        const you = new THREE.Group();
        const dot = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: colors.paper, toneMapped: false }));
        const nose = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.45, 0.6), new THREE.Vector2(0, 1.6), new THREE.Vector2(0.45, 0.6)])), new THREE.MeshBasicMaterial({ color: colors.paper, toneMapped: false }));
        you.add(dot, nose);
        tilt.add(you);

        /* ---------- LAYOUT ---------- */

        let scale = 1;
        const layout = () => {
            const { view } = stage;
            // The room fills a good part of the screen, and sits a little above the title bar
            const across = Math.min(view.width * 0.9, view.height * 0.62);
            scale = across / size;
            room.scale.setScalar(scale);
            room.position.set(0, 0, 0);
            tilt.position.y = view.aspect < 1 ? view.height * 0.04 : view.height * 0.02;
            const ringRadius = size * 0.3;    // just inside the ring's wall
            speakers.forEach(({ group, ball, halo }) => {
                group.position.set(Math.sin(group.userData.angle) * ringRadius, Math.cos(group.userData.angle) * ringRadius, size * 0.18);
                ball.scale.setScalar(size * 0.035);
                halo.scale.setScalar(size * 0.3);
            });
            you.scale.setScalar(across * 0.045);
            you.position.z = scale * size * 0.2;
            shadow.scale.setScalar(size * 1.15);
        };

        /* ---------- POINTER: where you face ---------- */

        const target = { yaw: 0, tilt: (TILT_MIN + TILT_MAX) / 2 };
        const current = { yaw: 0, tilt: target.tilt };
        const onPointerMove = (e) => {
            const rect = container.getBoundingClientRect();
            const fx = THREE.MathUtils.clamp((e.clientX - rect.left) / rect.width, 0, 1);
            const fy = THREE.MathUtils.clamp((e.clientY - rect.top) / rect.height, 0, 1);
            target.yaw = (fx - 0.5) * Math.PI * 2;                      // a full turn across the screen
            target.tilt = TILT_MIN + (TILT_MAX - TILT_MIN) * fy;         // pointer low = seen more from the side
        };
        container.addEventListener('pointermove', onPointerMove);

        /* ---------- STAGE ---------- */

        const stage = createStage(container, {
            smoke: 0.5,
            onResize: layout,
            onFrame: (dt, t, elapsed) => {
                const ease = 1 - Math.exp(-elapsed * 6);
                const extra = turnRef?.current ?? 0;
                current.yaw += (target.yaw + extra - current.yaw) * ease;
                current.tilt += (target.tilt - current.tilt) * ease;
                room.rotation.z = -current.yaw;                           // the room turns the other way: you turn
                tilt.rotation.x = -current.tilt;
                engine.setYaw(current.yaw);
                onTurn?.(current.yaw);
                const levels = engine.levels();
                speakers.forEach(({ ball, halo }, i) => {
                    const level = levels[i] ?? 0;
                    const glow = 0.35 + level * 0.65;
                    ball.material.color.setRGB(glow, glow, glow);
                    halo.material.opacity = 0.15 + level * 0.85;
                    halo.scale.setScalar(size * (0.26 + level * 0.35));
                });
            },
        });
        stage.panel.add(tilt);
        stage.setBackdrop(cover, coverDepth);
        stage.start();

        return () => {
            container.removeEventListener('pointermove', onPointerMove);
            haloTexture.dispose();
            stage.dispose();
        };
    }, [engine, model, angles, cover, coverDepth, turnRef, onTurn]);

    return <div ref={containerRef} className='absolute inset-0 touch-none' />;
}
