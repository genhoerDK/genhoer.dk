import * as THREE from 'three';
import { palette, damp, disposeTree, createRoom, createOrbit, createPushButton, createBarRing, createLabel, createRipples } from './shared';

/**
 * "Knapper" — for works played with push buttons and layers (Troldetoner).
 *
 * The buttons stand in a circle on the paper floor, the way they would in the
 * installation. Around them each layer of the work is a ring of sound bars that
 * rises when the layer is heard: the music bed always moves, the drums ring
 * grows while buttons are held and dies away after, the narrator's ring lights
 * up while the voice speaks. Held buttons send circles across the floor.
 *
 * Press and hold a button (several at once on touch, or keys 1–9). Drag the
 * floor to walk around.
 */

const BUTTON_RADIUS = 0.62;

export default function knapper({ size, actions, getState }) {
    const scene = new THREE.Scene();
    createRoom(scene, { fogNear: 16, fogFar: 46 });

    const camera = new THREE.PerspectiveCamera(42, size.width / size.height, 0.1, 120);
    const orbit = createOrbit(camera, { elevation: 0.72, distance: 14, autoSpin: 0.025 });

    const { engine } = getState();
    const config = engine?.buttons ?? [];
    const trackInfo = engine?.tracks ?? [];

    /* ---------- BUTTONS ---------- */

    const ringRadius = config.length > 1 ? Math.max(1.8, (config.length * BUTTON_RADIUS * 3.4) / (Math.PI * 2)) : 0;
    const buttons = config.map((b, i) => {
        const button = createPushButton(b.label ?? i + 1, { radius: BUTTON_RADIUS });
        // Start at the front and go round clockwise, so button 1 faces the listener
        const a = Math.PI - (i / config.length) * Math.PI * 2 + Math.PI;
        button.group.position.set(Math.sin(a) * ringRadius, 0, Math.cos(a) * ringRadius);
        button.index = i;
        for (const t of button.hitTargets) t.userData.button = i;
        scene.add(button.group);
        return button;
    });
    const hitTargets = buttons.flatMap((b) => b.hitTargets);

    /* ---------- LAYERS ---------- */

    const layers = trackInfo.map((t, i) => {
        const radius = ringRadius + 2.4 + i * 1.25;
        const ring = createBarRing({ radius, count: Math.round(radius * 22), width: 0.06, color: palette.ink });
        scene.add(ring.mesh);
        const label = createLabel(t.label ?? t.id, { scale: 0.9 });
        label.position.set(0, 0.25, radius + 0.45);
        scene.add(label);
        return { ring, label, radius, gain: 0, seed: i * 1.7 };
    });

    const ripples = createRipples(scene);

    /* ---------- STATE ---------- */

    const held = new Map(); // pointerId → button index
    const lastRipple = buttons.map(() => 0);
    let hovered = null;
    let level = 0;

    return {
        scene,
        camera,

        resize(width, height) {
            camera.aspect = width / height;
            const portrait = width < height;
            camera.fov = portrait ? 58 : 42;
            orbit.state.distance = portrait ? 17 : 14;
            camera.updateProjectionMatrix();
        },

        update(frame, pointer) {
            const { dt, elapsed, engineState: s } = frame;
            level = damp(level, s?.level ?? 0, 10, dt);

            orbit.update(dt);

            const hit = pointer.raycaster.intersectObjects(hitTargets, false)[0];
            hovered = hit ? hit.object.userData.button : null;

            buttons.forEach((b, i) => {
                const pressed = !!s?.pressed[i];
                b.update(pressed, dt, level);
                if (pressed && elapsed - lastRipple[i] > 0.45) {
                    ripples.emit(b.group.position, { from: BUTTON_RADIUS * 1.5, to: 9 + level * 4 });
                    lastRipple[i] = elapsed;
                }
            });
            ripples.update(dt);

            layers.forEach((layer, li) => {
                const t = s?.tracks[li];
                layer.gain = damp(layer.gain, t?.gain ?? 0, 6, dt);
                const g = layer.gain;
                const speed = 0.8 + li * 0.5;
                layer.ring.update((i, a) => {
                    const wave = 0.55 + 0.45 * Math.sin(a * (5 + li * 3) + elapsed * speed + layer.seed);
                    return 0.03 + g * (0.12 + level * 1.4) * wave;
                });
                layer.ring.mesh.material.color.copy(palette.muted).lerp(palette.ink, Math.min(1, g * 1.2));
                layer.label.material.opacity = 0.35 + g * 0.65;
            });
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
