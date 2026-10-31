import * as THREE from 'three';
import { palette, damp, disposeTree, createRoom, createOrbit, createPushButton, createBarRing, createLabel, createRipples } from './shared';

/**
 * "Overflade" — for works with a hidden layer (Under overfladen).
 *
 * The listener looks down at a still surface with the button standing on it.
 * Holding the button sends waves across the surface, which turns clear and lets
 * the view sink a little: underneath, the hidden track appears as a ring of
 * bars that moves with it. Let go, and the surface closes again as the hidden
 * track fades.
 */

const SURFACE_RADIUS = 46; // reaches into the fog, so the surface has no visible edge
const DEPTH = -3.2;

export default function overflade({ size, actions, getState }) {
    const scene = new THREE.Scene();
    createRoom(scene, { fogNear: 14, fogFar: 40, shadowSize: 22 });

    const camera = new THREE.PerspectiveCamera(42, size.width / size.height, 0.1, 120);
    const orbit = createOrbit(camera, { elevation: 0.62, distance: 13, autoSpin: 0.015, target: new THREE.Vector3(0, -0.4, 0) });

    const { engine } = getState();
    const config = engine?.buttons ?? [];
    const trackInfo = engine?.tracks ?? [];
    // The track(s) a button raises are the hidden ones; the rest is the surface
    const hiddenIds = new Set(config.flatMap((b) => b.raises ?? []));
    const surfaceTrack = trackInfo.findIndex((t) => !hiddenIds.has(t.id));
    const hiddenTrack = trackInfo.findIndex((t) => hiddenIds.has(t.id));

    /* ---------- SURFACE ---------- */

    // A polar grid: dense in the middle where the waves start, sparse towards the fog
    const surfaceGeometry = new THREE.RingGeometry(0.001, SURFACE_RADIUS, 128, 90).rotateX(-Math.PI / 2);
    {
        const p = surfaceGeometry.attributes.position.array;
        for (let v = 0; v < p.length; v += 3) {
            const r = Math.hypot(p[v], p[v + 2]);
            if (r < 1e-6) continue;
            const k = Math.pow(r / SURFACE_RADIUS, 1.8) * SURFACE_RADIUS / r; // pull rings towards the centre
            p[v] *= k;
            p[v + 2] *= k;
        }
    }
    const surfaceMaterial = new THREE.MeshStandardMaterial({ color: palette.soft, roughness: 0.35, metalness: 0, side: THREE.DoubleSide });
    const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    surface.receiveShadow = true;
    scene.add(surface);
    const base = surfaceGeometry.attributes.position.array.slice();
    const waves = []; // { x, z, age }

    /* ---------- BENEATH ---------- */

    const beneath = new THREE.Group();
    beneath.position.y = DEPTH;
    scene.add(beneath);

    const hiddenRings = [3.2, 4.6, 6].map((radius, i) => {
        const ring = createBarRing({ radius, count: Math.round(radius * 26), width: 0.08, color: palette.ink });
        beneath.add(ring.mesh);
        return { ring, radius, i };
    });
    const hiddenLabel = createLabel(trackInfo[hiddenTrack]?.label ?? 'Under overfladen', { scale: 0.9 });
    hiddenLabel.position.set(0, 0.4, 6.6);
    beneath.add(hiddenLabel);

    /* ---------- ON THE SURFACE ---------- */

    const surfaceRing = createBarRing({ radius: 4.4, count: 110, width: 0.05, color: palette.hard });
    scene.add(surfaceRing.mesh);
    const surfaceLabel = createLabel(trackInfo[surfaceTrack]?.label ?? 'Overfladen', { scale: 0.9 });
    surfaceLabel.position.set(0, 0.3, 4.9);
    scene.add(surfaceLabel);

    const buttons = config.map((b, i) => {
        const button = createPushButton(b.label ?? 'Tryk', { radius: config.length === 1 ? 1 : 0.7 });
        const x = (i - (config.length - 1) / 2) * 2.4;
        button.group.position.set(x, 0, 0);
        for (const t of button.hitTargets) t.userData.button = i;
        scene.add(button.group);
        return button;
    });
    const hitTargets = buttons.flatMap((b) => b.hitTargets);
    const ripples = createRipples(scene, { y: 0.05 });

    /* ---------- STATE ---------- */

    const held = new Map();
    const lastWave = buttons.map(() => 0);
    let hovered = null;
    let level = 0;
    let open = 0; // 0 = closed surface, 1 = fully see-through

    return {
        scene,
        camera,

        resize(width, height) {
            camera.aspect = width / height;
            const portrait = width < height;
            camera.fov = portrait ? 58 : 42;
            orbit.state.distance = portrait ? 16 : 13;
            camera.updateProjectionMatrix();
        },

        update(frame, pointer) {
            const { dt, elapsed, engineState: s } = frame;
            level = damp(level, s?.level ?? 0, 10, dt);
            const hiddenGain = s?.tracks[hiddenTrack]?.gain ?? 0;
            const surfaceGain = s?.tracks[surfaceTrack]?.gain ?? 0;
            open = damp(open, hiddenGain, 5, dt);

            // Sink a little towards the surface as it opens
            orbit.update(dt, -open * 1.6);

            const hit = pointer.raycaster.intersectObjects(hitTargets, false)[0];
            hovered = hit ? hit.object.userData.button : null;

            buttons.forEach((b, i) => {
                const pressed = !!s?.pressed[i];
                b.update(pressed, dt, level);
                if (pressed && elapsed - lastWave[i] > 0.6) {
                    waves.push({ x: b.group.position.x, z: b.group.position.z, age: 0 });
                    ripples.emit(b.group.position, { from: 1.4, to: 12, life: 3.2 });
                    lastWave[i] = elapsed;
                }
            });
            ripples.update(dt);

            /* Waves on the surface */
            for (const w of waves) w.age += dt;
            while (waves.length && waves[0].age > 6) waves.shift();
            const pos = surfaceGeometry.attributes.position.array;
            for (let v = 0; v < pos.length; v += 3) {
                const x = base[v], z = base[v + 2];
                let y = Math.sin(x * 0.4 + elapsed * 0.5) * Math.sin(z * 0.35 + elapsed * 0.4) * 0.03 * (0.3 + surfaceGain);
                for (const w of waves) {
                    const d = Math.hypot(x - w.x, z - w.z);
                    const front = w.age * 3.2;
                    const k = d - front;
                    if (k < 0 && k > -6) y += Math.sin(k * 2.2) * 0.12 * Math.exp(k * 0.5) * Math.exp(-w.age * 0.5);
                }
                pos[v + 1] = y;
            }
            surfaceGeometry.attributes.position.needsUpdate = true;
            surfaceGeometry.computeVertexNormals();

            // Fully opaque while closed — a transparent surface is sorted per object and can let the depths show through
            const transparent = open > 0.01;
            if (surfaceMaterial.transparent !== transparent) {
                surfaceMaterial.transparent = transparent;
                surfaceMaterial.depthWrite = !transparent;
                surfaceMaterial.needsUpdate = true;
            }
            surfaceMaterial.opacity = 1 - open * 0.82;
            surfaceMaterial.color.copy(palette.soft).lerp(palette.paper, open);

            /* The hidden layer only moves when it's heard */
            hiddenRings.forEach(({ ring, i }) => {
                ring.update((n, a) => 0.02 + open * (0.25 + level * 1.6) * (0.5 + 0.5 * Math.sin(a * (4 + i * 2) - elapsed * (1.2 + i * 0.4))));
            });
            beneath.rotation.y += dt * (0.04 + open * 0.2);
            hiddenLabel.material.opacity = open;

            surfaceRing.update((n, a) => 0.02 + surfaceGain * (0.08 + level * 0.5) * (0.5 + 0.5 * Math.sin(a * 6 + elapsed * 0.7)));
            surfaceRing.mesh.material.color.copy(palette.hard).lerp(palette.muted, open);
            surfaceLabel.material.opacity = 0.9 - open * 0.6;
        },

        pointerDown(pointer) {
            const hit = pointer.raycaster.intersectObjects(hitTargets, false)[0];
            if (!hit) return false;
            const index = hit.object.userData.button;
            held.set(pointer.id, index);
            actions.press(index);
            return true;
        },

        pointerUp(pointer) {
            const index = held.get(pointer.id);
            if (index === undefined) return;
            held.delete(pointer.id);
            if (![...held.values()].includes(index)) actions.release(index);
        },

        drag: (dx, dy) => orbit.drag(dx, dy),
        hovering: () => hovered !== null,

        dispose() {
            for (const index of held.values()) actions.release(index);
            disposeTree(scene);
        },
    };
}
