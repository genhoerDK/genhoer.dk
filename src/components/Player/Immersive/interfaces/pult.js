import * as THREE from 'three';
import { colors } from '@/styles/colors';
import { palette, damp, disposeTree, createRoom, createOrbit, createBarRing, createLabel, createRipples, wrapText, siteFont } from './shared';

/**
 * "Pult" — the work's own sign, as it stands where the work is installed
 * (Troldetoner at Esterhøj): a sloping white plate on a post, the work's text
 * printed on it and the push buttons in a row across it.
 *
 * The plate text comes from the work: title, the first paragraph of the
 * description as the story, and `player.panel.info` (or the second paragraph)
 * as the column on the right. The layers of the work rise as rings of sound
 * bars on the ground around the post; held buttons send circles out from it.
 *
 * Press and hold the buttons (several at once on touch, or keys 1–9).
 * Drag to step a little to the side; the view returns by itself.
 */

const PLATE = 5.2;        // width and depth of the square plate
const TILT = 0.42;        // radians — the front edge is lower, facing the reader
const POST_HEIGHT = 2.6;
const POST_WIDTH = 4.4;
const ROW_Y = 0.353;      // the buttons' row, as a fraction from the top of the plate (as on the real sign)
const ROW_X = [0.164, 0.324, 0.484, 0.644, 0.804];

export default function pult({ size, actions, getState, options }) {
    const scene = new THREE.Scene();
    createRoom(scene, { fogNear: 16, fogFar: 48, shadowSize: 12 });

    const camera = new THREE.PerspectiveCamera(40, size.width / size.height, 0.1, 120);
    // The plate rests on the post with its low front edge; its centre is lifted by the tilt
    const PLATE_Y = POST_HEIGHT + 0.05 + (PLATE / 2) * Math.sin(TILT);
    const target = new THREE.Vector3(0, PLATE_Y - 0.2, 0.3);
    const orbit = createOrbit(camera, { elevation: 0.62, distance: 9.5, autoSpin: 0, target, azimuthRange: 0.9, elevationRange: [0.25, 1.3], returnHome: true });

    const { engine } = getState();
    const config = engine?.buttons ?? [];
    const trackInfo = engine?.tracks ?? [];
    const work = options?.work ?? {};

    /* ---------- POST ---------- */

    const post = new THREE.Mesh(
        new THREE.BoxGeometry(POST_WIDTH, POST_HEIGHT, POST_WIDTH * 0.62),
        new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.95 }),
    );
    post.position.y = POST_HEIGHT / 2;
    post.castShadow = true;
    post.receiveShadow = true;
    scene.add(post);

    /* ---------- PLATE ---------- */

    // The plate is a group tilted around its back edge; children are laid out on its top face
    const plate = new THREE.Group();
    plate.position.set(0, PLATE_Y, 0);
    plate.rotation.x = TILT;
    scene.add(plate);

    const face = plateTexture(work, options?.panel, config.length);
    const slab = new THREE.Mesh(
        new THREE.BoxGeometry(PLATE, 0.06, PLATE),
        [
            new THREE.MeshStandardMaterial({ color: palette.muted, roughness: 0.5 }), // sides
            new THREE.MeshStandardMaterial({ color: palette.muted, roughness: 0.5 }),
            new THREE.MeshStandardMaterial({ map: face, roughness: 0.55 }),          // top
            new THREE.MeshStandardMaterial({ color: palette.soft, roughness: 0.6 }),  // bottom
            new THREE.MeshStandardMaterial({ color: palette.muted, roughness: 0.5 }),
            new THREE.MeshStandardMaterial({ color: palette.muted, roughness: 0.5 }),
        ],
    );
    slab.castShadow = true;
    slab.receiveShadow = true;
    plate.add(slab);

    // Screws in the corners
    const screwGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 20);
    const screwMaterial = new THREE.MeshStandardMaterial({ color: palette.faint, roughness: 0.3, metalness: 0.6 });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const screw = new THREE.Mesh(screwGeometry, screwMaterial);
        screw.position.set(sx * (PLATE / 2 - 0.12), 0.04, sz * (PLATE / 2 - 0.12));
        plate.add(screw);
    }

    /* ---------- BUTTONS ---------- */

    const xs = config.length === ROW_X.length ? ROW_X : config.map((_, i) => (i + 1) / (config.length + 1));
    const buttons = config.map((b, i) => {
        const button = createDomeButton();
        button.group.position.set((xs[i] - 0.5) * PLATE, 0.03, (ROW_Y - 0.5) * PLATE);
        for (const t of button.hitTargets) t.userData.button = i;
        plate.add(button.group);
        return button;
    });
    const hitTargets = buttons.flatMap((b) => b.hitTargets);

    /* ---------- LAYERS ON THE GROUND ---------- */

    const layers = trackInfo.map((t, i) => {
        const radius = 4.6 + i * 1.3;
        const ring = createBarRing({ radius, count: Math.round(radius * 20), width: 0.07, color: palette.ink });
        scene.add(ring.mesh);
        const label = createLabel(t.label ?? t.id, { scale: 0.9 });
        label.position.set(0, 0.25, radius + 0.45);
        scene.add(label);
        return { ring, label, gain: 0, seed: i * 1.7 };
    });
    const ripples = createRipples(scene);

    /* ---------- STATE ---------- */

    const held = new Map();
    const lastRipple = buttons.map(() => 0);
    const worldPos = new THREE.Vector3();
    let hovered = null;
    let level = 0;

    return {
        scene,
        camera,

        resize(width, height) {
            camera.aspect = width / height;
            const portrait = width < height;
            camera.fov = portrait ? 52 : 40;
            orbit.state.distance = portrait ? 12.5 : 9.5;
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
                b.update(pressed, dt, hovered === i);
                if (pressed && elapsed - lastRipple[i] > 0.5) {
                    b.group.getWorldPosition(worldPos);
                    ripples.emit(worldPos.setY(0), { from: 2.6, to: 12 + level * 4, life: 3 });
                    lastRipple[i] = elapsed;
                }
            });
            ripples.update(dt);

            layers.forEach((layer, li) => {
                const t = s?.tracks[li];
                layer.gain = damp(layer.gain, t?.gain ?? 0, 6, dt);
                const g = layer.gain;
                layer.ring.update((n, a) => 0.03 + g * (0.12 + level * 1.4) * (0.55 + 0.45 * Math.sin(a * (5 + li * 3) + elapsed * (0.8 + li * 0.5) + layer.seed)));
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

/** Black arcade-style button: ribbed collar and a low dome, like the ones on the sign */
function createDomeButton() {
    const group = new THREE.Group();
    const black = (roughness) => new THREE.MeshStandardMaterial({ color: palette.ink.clone(), roughness });

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.12, 40), black(0.8));
    collar.position.y = 0.06;
    const ribs = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.018, 8, 40).rotateX(Math.PI / 2), black(0.9));
    ribs.position.y = 0.1;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2.6), black(0.35));
    cap.scale.y = 0.75;
    cap.position.y = 0.04;
    for (const m of [collar, ribs, cap]) { m.castShadow = true; m.receiveShadow = true; }
    group.add(collar, ribs, cap);
    group.scale.setScalar(0.66); // a little wider than the printed dot, as on the sign

    let press = 0;
    return {
        group,
        hitTargets: [cap, collar],
        update(pressed, dt, hover) {
            press = damp(press, pressed ? 1 : 0, pressed ? 30 : 12, dt);
            cap.position.y = 0.04 - press * 0.06;
            cap.material.color.copy(palette.ink).lerp(palette.hard, press * 0.5 + (hover ? 0.15 : 0));
        },
    };
}

/** The printed face of the plate — laid out like the real sign */
function plateTexture(work, panel = {}, buttonCount = 5) {
    const S = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    const font = siteFont();
    const u = S / 1000; // the design is 1000 × 1000

    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = colors.ink;
    ctx.textBaseline = 'alphabetic';

    const description = work.description ?? [];
    const story = panel.text ?? (description[0] ? [description[0]] : []);
    const info = panel.info ?? (description[1] ? [description[1]] : []);

    ctx.font = `400 ${32 * u}px ${font}`;
    ctx.fillText(work.title ?? '', 50 * u, 75 * u);

    ctx.font = `400 ${19 * u}px ${font}`;
    let y = 125 * u;
    story.forEach((p, i) => { y = wrapText(ctx, p, 50 * u, y, 900 * u, 30 * u, { indent: i ? 50 * u : 0 }); });

    // Where the buttons sit — printed dots under the physical buttons
    const xs = buttonCount === ROW_X.length ? ROW_X : Array.from({ length: buttonCount }, (_, i) => (i + 1) / (buttonCount + 1));
    for (const x of xs) {
        ctx.beginPath();
        ctx.arc(x * S, ROW_Y * S, 30 * u, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.font = `400 ${18 * u}px ${font}`;
    y = 502 * u;
    info.forEach((p) => { y = wrapText(ctx, p, 605 * u, y, 345 * u, 28 * u) + 28 * u; });

    ctx.font = `700 ${16 * u}px ${font}`;
    ctx.fillText('GENHØR', 50 * u, 945 * u);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
}

/** Vertical planks in greys — the wooden post, in the site's palette */
function plankTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = colors.soft;
    ctx.fillRect(0, 0, 512, 512);
    const planks = 4;
    for (let i = 0; i < planks; i++) {
        const x = (i / planks) * 512;
        ctx.fillStyle = i % 2 ? colors.soft : colors.muted;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, 0, 512 / planks, 512);
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.faint;
        ctx.fillRect(x, 0, 3, 512);
        // grain
        ctx.globalAlpha = 0.12;
        for (let g = 0; g < 14; g++) {
            const gx = x + 10 + Math.random() * (512 / planks - 20);
            ctx.fillRect(gx, 0, 1, 512);
        }
        ctx.globalAlpha = 1;
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}
