import * as THREE from 'three';
import { envelopeAtFraction } from '../useAudioEnvelope';
import { palette, loadTexture, coverTexture, textTexture, pad, damp, angleDelta, chapterSpans, disposeTree } from './shared';

/**
 * "Kapitler" — the circular scrubber turned into a room.
 *
 * The listener stands in the middle of the work. The whole track is drawn as a
 * ring of sound bars on the floor around them, and the chapters hang as images
 * at the angle where they occur. As the work plays, the view turns slowly
 * through it. Drag to look around, click a chapter or a point on the ring to go there.
 */

const RING_RADIUS = 10;
const RING_BARS = 300;
const FLOOR_Y = -1.6;
const CHAPTER_RADIUS = 7;
const CHAPTER_Y = 0.45;
const TAU = Math.PI * 2;

/** f = 0 is straight ahead, increasing clockwise seen from above */
const onCircle = (fraction, radius, y) => new THREE.Vector3(Math.sin(fraction * TAU) * radius, y, -Math.cos(fraction * TAU) * radius);

export default function kapitler({ size }) {
    const scene = new THREE.Scene();
    scene.background = palette.ink.clone();
    scene.fog = new THREE.Fog(palette.ink, 6, 22);

    const camera = new THREE.PerspectiveCamera(60, size.width / size.height, 0.1, 100);
    camera.rotation.order = 'YXZ';
    camera.position.set(0, 0.35, 0);

    /* ---------- FLOOR RING ---------- */

    const barGeometry = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const barMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const bars = new THREE.InstancedMesh(barGeometry, barMaterial, RING_BARS);
    bars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(bars);

    const floorLine = new THREE.Mesh(
        new THREE.RingGeometry(RING_RADIUS - 0.02, RING_RADIUS + 0.02, 256).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: palette.shade, transparent: true, opacity: 0.8 }),
    );
    floorLine.position.y = FLOOR_Y;
    scene.add(floorLine);

    // Invisible, wider band on the floor that catches clicks on the ring
    const ringHit = new THREE.Mesh(
        new THREE.RingGeometry(RING_RADIUS - 2, RING_RADIUS + 2, 128).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ visible: false }),
    );
    ringHit.position.y = FLOOR_Y;
    scene.add(ringHit);

    const barHeights = new Float32Array(RING_BARS).fill(0.1);
    const dummy = new THREE.Object3D();
    const tmpColor = new THREE.Color();

    /* ---------- DUST ---------- */

    const dustCount = 1400;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
        const r = 3 + Math.random() * 18;
        const a = Math.random() * TAU;
        dustPositions[i * 3] = Math.sin(a) * r;
        dustPositions[i * 3 + 1] = -2 + Math.random() * 8;
        dustPositions[i * 3 + 2] = Math.cos(a) * r;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({ color: palette.faint, size: 0.035, sizeAttenuation: true, transparent: true, opacity: 0.6, depthWrite: false });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);

    /* ---------- CHAPTERS ---------- */

    const chapterGroup = new THREE.Group();
    scene.add(chapterGroup);
    let chapters = []; // { span, mesh, label, base, width, height }

    const buildChapters = (spans) => {
        disposeTree(chapterGroup);
        chapterGroup.clear();
        chapters = spans.map((span, i) => {
            const arc = (span.end - span.start) * TAU * CHAPTER_RADIUS;
            const width = THREE.MathUtils.clamp(arc * 0.86, 0.9, 2.6);
            const height = width * 0.72;
            // Short chapters are staggered up and down so neighbours don't overlap
            const stagger = arc < 2.2 ? (i % 2 ? 0.75 : -0.55) : 0;
            const base = onCircle(span.mid, CHAPTER_RADIUS, CHAPTER_Y + stagger);

            const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, color: 0xffffff, fog: true });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
            mesh.scale.set(width, height, 1);
            mesh.position.copy(base);
            mesh.lookAt(0, base.y, 0);
            mesh.userData.chapter = span;
            material.map = loadTexture(span.image, pad(i + 1), (t) => {
                material.map = t;
                coverTexture(t, width / height);
                material.needsUpdate = true;
            });

            const labelMaterial = new THREE.SpriteMaterial({ map: textTexture(pad(i + 1), { size: 72 }), transparent: true, opacity: 0, depthWrite: false });
            const label = new THREE.Sprite(labelMaterial);
            label.scale.set(0.5, 0.25, 1);

            chapterGroup.add(mesh, label);
            return { span, mesh, label, base, width, height, focus: 0 };
        });
    };

    /* ---------- STATE ---------- */

    let builtFor = { duration: 0, segments: null, envelope: undefined };
    let yaw = 0;
    let lookOffset = 0;   // from dragging
    let pitch = -0.08;
    let pitchOffset = 0;
    let idle = 10;        // seconds since the user last dragged
    let hovered = null;
    let level = 0;
    let fov = 60;

    const rebuildIfNeeded = (frame) => {
        const { duration, segments, envelope } = frame;
        if (duration !== builtFor.duration || segments !== builtFor.segments) {
            buildChapters(chapterSpans(segments, duration));
        }
        if (envelope !== builtFor.envelope) {
            for (let i = 0; i < RING_BARS; i++) {
                barHeights[i] = envelope ? 0.06 + envelopeAtFraction(envelope, i / RING_BARS) * 1.5 : 0.06;
            }
        }
        builtFor = { duration, segments, envelope };
    };

    return {
        scene,
        camera,

        resize(width, height) {
            camera.aspect = width / height;
            fov = width < height ? 78 : 60; // see more of the room in portrait
            camera.fov = fov;
            camera.updateProjectionMatrix();
        },

        update(frame, pointer) {
            const { dt, elapsed, progress, isPlaying, envelope, chapterIndex } = frame;
            rebuildIfNeeded(frame);

            const instant = envelope ? envelopeAtFraction(envelope, progress) : 0.3;
            level = damp(level, isPlaying ? instant : 0, 8, dt);

            /* Camera: face the active chapter, drifting with the playhead */
            const active = chapters[chapterIndex]?.span;
            const targetFraction = active ? THREE.MathUtils.lerp(active.mid, progress, 0.2) : progress;
            yaw += angleDelta(yaw, targetFraction * TAU) * (1 - Math.exp(-1.6 * dt));

            idle += dt;
            if (!pointer.down && idle > 2.5) {
                lookOffset = damp(lookOffset, 0, 0.8, dt);
                pitchOffset = damp(pitchOffset, 0, 0.8, dt);
            }

            camera.rotation.y = -(yaw + lookOffset);
            camera.rotation.x = pitch + pitchOffset + Math.sin(elapsed * 0.2) * 0.01;
            camera.position.y = 0.35 + Math.sin(elapsed * 0.3) * 0.04;

            /* Hover */
            const hits = pointer.raycaster.intersectObjects(chapters.map((c) => c.mesh), false);
            hovered = hits[0]?.object.userData.chapter ?? null;

            /* Ring of bars */
            const playheadBar = Math.floor(progress * RING_BARS);
            for (let i = 0; i < RING_BARS; i++) {
                const f = i / RING_BARS;
                const p = onCircle(f, RING_RADIUS, FLOOR_Y);
                const isHead = i === playheadBar;
                const atBoundary = chapters.some((c) => c.span.index > 0 && Math.abs(c.span.start - f) < 0.5 / RING_BARS);
                let h = atBoundary ? 0.02 : barHeights[i];
                if (isHead) h += 0.4 + level * 1.2;
                dummy.position.copy(p);
                dummy.rotation.set(0, -f * TAU, 0);
                dummy.scale.set(0.11, h, 0.11);
                dummy.updateMatrix();
                bars.setMatrixAt(i, dummy.matrix);

                if (isHead) tmpColor.copy(palette.paper);
                else if (f < progress) tmpColor.copy(palette.faint);
                else tmpColor.copy(palette.shade).lerp(palette.dim, 0.5);
                bars.setColorAt(i, tmpColor);
            }
            bars.instanceMatrix.needsUpdate = true;
            if (bars.instanceColor) bars.instanceColor.needsUpdate = true;

            /* Chapters: the active one steps forward */
            for (const c of chapters) {
                const isActive = c.span.index === chapterIndex;
                const isHovered = hovered === c.span;
                c.focus = damp(c.focus, isActive ? 1 : 0, 3, dt);
                const radius = CHAPTER_RADIUS - c.focus * 0.9;
                const pos = onCircle(c.span.mid, radius, THREE.MathUtils.lerp(c.base.y, CHAPTER_Y + 0.15, c.focus));
                pos.y += Math.sin(elapsed * 0.6 + c.span.index) * 0.04 + c.focus * level * 0.08;
                c.mesh.position.copy(pos);
                c.mesh.lookAt(0, pos.y, 0);
                const scale = 1 + c.focus * 0.25 + (isHovered ? 0.05 : 0);
                c.mesh.scale.set(c.width * scale, c.height * scale, 1);

                const m = c.mesh.material;
                m.opacity = damp(m.opacity, isActive ? 1 : isHovered ? 0.85 : 0.42, 4, dt);
                m.color.setScalar(isActive || isHovered ? 1 : 0.7);

                c.label.position.set(pos.x * 0.98, pos.y + (c.height * scale) / 2 + 0.25, pos.z * 0.98);
                c.label.material.opacity = m.opacity;
            }

            /* Dust breathes with the sound */
            dust.rotation.y += dt * (0.01 + level * 0.05);
            dustMaterial.size = 0.03 + level * 0.03;
            dustMaterial.opacity = 0.35 + level * 0.45;

            floorLine.material.opacity = 0.5 + level * 0.4;
        },

        drag(dx, dy) {
            idle = 0;
            lookOffset -= dx * Math.PI * 1.2;
            pitchOffset = THREE.MathUtils.clamp(pitchOffset - dy * 1.2, -0.35, 0.4);
        },

        hovering: () => !!hovered,

        click(pointer, actions) {
            if (hovered) {
                actions.seek(hovered.startSec);
                actions.play();
                idle = 10;
                return;
            }
            // A click on the floor ring jumps to that point in time
            const hit = pointer.raycaster.intersectObject(ringHit, false)[0];
            if (hit) {
                const angle = Math.atan2(hit.point.x, -hit.point.z);
                const fraction = ((angle / TAU) + 1) % 1;
                actions.seekFraction(fraction);
                actions.play();
                idle = 10;
            }
        },

        dispose() {
            disposeTree(scene);
        },
    };
}
