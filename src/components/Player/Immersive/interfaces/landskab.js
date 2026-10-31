import * as THREE from 'three';
import { envelopeAtFraction } from '../useAudioEnvelope';
import { palette, loadTexture, coverTexture, textTexture, pad, damp, chapterSpans, disposeTree } from './shared';

/**
 * "Landskab" — the work as a landscape you travel through.
 *
 * The loudness of the whole track is laid out as terrain stretching ahead of
 * the listener; time is distance. Each chapter is a gate with its image that
 * you pass through. Move the pointer (or drag) to lean and look around, click
 * a gate or a point in the terrain to travel there.
 */

const LENGTH = 260;   // world units for the whole track
const WIDTH = 30;
const COLS = 90;
const ROWS = 520;
const GATE_W = 4.2;
const GATE_H = 2.9;

export default function landskab({ size }) {
    const scene = new THREE.Scene();
    scene.background = palette.paper.clone();
    scene.fog = new THREE.Fog(palette.paper, 14, 95);

    const camera = new THREE.PerspectiveCamera(58, size.width / size.height, 2.5, 200); // near plane hides the terrain right under the camera

    /* ---------- TERRAIN ---------- */

    const count = COLS * ROWS;
    const positions = new Float32Array(count * 3);
    const fractions = new Float32Array(count);
    const terrainColors = new Float32Array(count * 3);
    const lateral = new Float32Array(COLS);
    for (let c = 0; c < COLS; c++) {
        const x = (c / (COLS - 1) - 0.5) * WIDTH;
        lateral[c] = x;
    }
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const i = r * COLS + c;
            positions[i * 3] = lateral[c];
            positions[i * 3 + 2] = -(r / (ROWS - 1)) * LENGTH;
            fractions[i] = r / (ROWS - 1);
        }
    }
    const terrainGeometry = new THREE.BufferGeometry();
    terrainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    terrainGeometry.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));
    const terrainMaterial = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, sizeAttenuation: true });
    const terrain = new THREE.Points(terrainGeometry, terrainMaterial);
    terrain.frustumCulled = false;
    scene.add(terrain);

    const heightAt = (env, x, f) => {
        const ridge = Math.exp(-Math.pow(x / 6, 2));
        const shoulders = 0.35 * Math.exp(-Math.pow((Math.abs(x) - 9) / 3, 2));
        const ripple = 0.12 * Math.sin(x * 1.3 + f * 90) * Math.sin(f * 400 + x * 0.3);
        return -1.2 + env * (3.4 * ridge + 1.2 * shoulders) + ripple * (0.3 + env);
    };

    const shapeTerrain = (envelope) => {
        for (let r = 0; r < ROWS; r++) {
            const f = r / (ROWS - 1);
            const env = envelope ? envelopeAtFraction(envelope, f) : 0.15;
            for (let c = 0; c < COLS; c++) {
                positions[(r * COLS + c) * 3 + 1] = heightAt(env, lateral[c], f);
            }
        }
        terrainGeometry.attributes.position.needsUpdate = true;
        terrainGeometry.computeBoundingSphere();
    };
    shapeTerrain(null);

    /* ---------- PLAYHEAD ---------- */

    const playhead = new THREE.Mesh(
        new THREE.PlaneGeometry(WIDTH, 0.05).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: palette.ink, transparent: true, opacity: 0.8 }),
    );
    scene.add(playhead);

    /* ---------- GATES ---------- */

    const gateGroup = new THREE.Group();
    scene.add(gateGroup);
    let gates = [];

    const buildGates = (spans) => {
        disposeTree(gateGroup);
        gateGroup.clear();
        gates = spans.map((span, i) => {
            const z = -span.start * LENGTH;
            const group = new THREE.Group();
            group.position.set(0, 1.4, z);

            const frame = new THREE.LineSegments(
                new THREE.EdgesGeometry(new THREE.PlaneGeometry(GATE_W + 0.3, GATE_H + 0.3)),
                new THREE.LineBasicMaterial({ color: palette.hard, transparent: true }),
            );
            const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, side: THREE.DoubleSide });
            material.map = loadTexture(span.image, pad(i + 1), (t) => {
                material.map = t;
                coverTexture(t, GATE_W / GATE_H);
                material.needsUpdate = true;
            });
            const image = new THREE.Mesh(new THREE.PlaneGeometry(GATE_W, GATE_H), material);
            image.userData.chapter = span;

            const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(pad(i + 1), { size: 72 }), transparent: true, depthWrite: false }));
            label.scale.set(0.6, 0.3, 1);
            label.position.set(-GATE_W / 2 + 0.2, GATE_H / 2 + 0.4, 0);

            // Posts down to the terrain
            const posts = new THREE.LineSegments(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(-GATE_W / 2 - 0.15, -GATE_H / 2 - 0.15, 0), new THREE.Vector3(-GATE_W / 2 - 0.15, -4, 0),
                    new THREE.Vector3(GATE_W / 2 + 0.15, -GATE_H / 2 - 0.15, 0), new THREE.Vector3(GATE_W / 2 + 0.15, -4, 0),
                ]),
                new THREE.LineBasicMaterial({ color: palette.muted, transparent: true }),
            );

            group.add(frame, image, label, posts);
            gateGroup.add(group);
            return { span, group, image, frame, label, posts, z };
        });
    };

    /* ---------- STATE ---------- */

    let built = { duration: 0, segments: null, envelope: undefined, progress: -1 };
    let travel = 0;      // camera progress, eased
    let lean = new THREE.Vector2();
    let dragLook = new THREE.Vector2();
    let level = 0;
    let hovered = null;

    const colorTerrain = (progress) => {
        const tmp = new THREE.Color();
        for (let r = 0; r < ROWS; r++) {
            const f = r / (ROWS - 1);
            const ahead = f >= progress;
            for (let c = 0; c < COLS; c++) {
                const i = r * COLS + c;
                const h = positions[i * 3 + 1];
                const k = THREE.MathUtils.clamp((h + 1.2) / 3.2, 0, 1);
                if (ahead) tmp.copy(palette.faint).lerp(palette.ink, 0.2 + k * 0.8);
                else tmp.copy(palette.soft).lerp(palette.muted, k);
                terrainColors[i * 3] = tmp.r;
                terrainColors[i * 3 + 1] = tmp.g;
                terrainColors[i * 3 + 2] = tmp.b;
            }
        }
        terrainGeometry.attributes.color.needsUpdate = true;
    };

    return {
        scene,
        camera,

        resize(width, height) {
            camera.aspect = width / height;
            camera.fov = width < height ? 74 : 58;
            camera.updateProjectionMatrix();
        },

        update(frame, pointer) {
            const { dt, elapsed, progress, isPlaying, envelope, duration, segments, chapterIndex } = frame;

            if (duration !== built.duration || segments !== built.segments) buildGates(chapterSpans(segments, duration));
            const envelopeChanged = envelope !== built.envelope;
            if (envelopeChanged) shapeTerrain(envelope);
            // Recolour when the playhead moves a row (or the shape changed)
            const row = Math.floor(progress * ROWS);
            if (envelopeChanged || row !== Math.floor(built.progress * ROWS)) colorTerrain(progress);
            built = { duration, segments, envelope, progress };

            const instant = envelope ? envelopeAtFraction(envelope, progress) : 0.3;
            level = damp(level, isPlaying ? instant : 0, 8, dt);

            // A jump in time is travelled quickly, normal playback follows closely
            const jump = Math.abs(progress - travel) > 0.01;
            travel = damp(travel, progress, jump ? 2.2 : 10, dt);

            const z = -travel * LENGTH;
            const envHere = envelope ? envelopeAtFraction(envelope, travel) : 0.15;
            const ground = heightAt(envHere, 0, travel);

            lean.x = damp(lean.x, pointer.ndc.x, 2, dt);
            lean.y = damp(lean.y, pointer.ndc.y, 2, dt);
            if (!pointer.down) dragLook.multiplyScalar(Math.exp(-0.8 * dt));

            camera.position.set(lean.x * 2.2, Math.max(ground + 1.8, 1.9) + lean.y * 0.5 + Math.sin(elapsed * 0.5) * 0.05, z + 5);
            camera.lookAt(lean.x * 1.2 + dragLook.x * 10, 1.6 + dragLook.y * 6 + lean.y * 0.5, z - 16);

            playhead.position.set(0, ground + 0.02, z);
            playhead.material.opacity = 0.5 + level * 0.5;

            terrainMaterial.size = 0.06 + level * 0.03;

            const hits = pointer.raycaster.intersectObjects(gates.map((g) => g.image), false);
            hovered = hits[0]?.object.userData.chapter ?? null;

            for (const g of gates) {
                // Distance from the camera to the gate; the gate dissolves as the camera passes through it
                const ahead = camera.position.z - g.z;
                const isActive = g.span.index === chapterIndex;
                const base = hovered === g.span || isActive ? 1 : 0.85;
                const opacity = base * THREE.MathUtils.clamp((ahead - 2) / 8, 0, 1);
                g.image.material.opacity = damp(g.image.material.opacity, opacity, 6, dt);
                g.frame.material.opacity = g.image.material.opacity;
                g.label.material.opacity = g.image.material.opacity;
                g.posts.material.opacity = g.image.material.opacity * 0.6;
                g.group.position.y = 1.4 + Math.sin(elapsed * 0.7 + g.span.index) * 0.06;
                const s = hovered === g.span ? 1.05 : 1;
                g.image.scale.setScalar(damp(g.image.scale.x, s, 8, dt));
            }
        },

        drag(dx, dy) {
            dragLook.x = THREE.MathUtils.clamp(dragLook.x - dx * 2, -1.5, 1.5);
            dragLook.y = THREE.MathUtils.clamp(dragLook.y + dy * 2, -0.6, 0.8);
        },

        hovering: () => !!hovered,

        click(pointer, actions) {
            if (hovered) {
                actions.seek(hovered.startSec);
                actions.play();
                return;
            }
            pointer.raycaster.params.Points.threshold = 0.4;
            const hit = pointer.raycaster.intersectObject(terrain, false)[0];
            if (hit) {
                actions.seekFraction(THREE.MathUtils.clamp(-hit.point.z / LENGTH, 0, 1));
                actions.play();
            }
        },

        dispose() {
            disposeTree(scene);
        },
    };
}
