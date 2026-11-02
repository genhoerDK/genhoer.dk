'use client';

/**
 * 3D player for a sound work with chapters (segments), e.g. Grindsted Station: a play / pause
 * button and one numbered button per chapter, sitting on the screen, each chapter with a thin
 * timeline bar under it. Behind them the playing chapter's image, with depth (scene/stage.js);
 * it cross-fades when the next chapter starts.
 *
 * - play / pause button: toggles playback
 * - chapter button: jumps to the start of that chapter (and plays). The playing chapter's
 *   button stays pressed in
 * - timeline bar: click / drag to seek within that chapter
 *
 * Depth maps are found by convention: the image cdn.genhoer.dk/media/<folder>/<name>.webp has its
 * depth map in public/depth/<folder>/<name>.webp (made with scripts/depth-map.py). Without one
 * the image just moves as a flat layer.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { colors } from '@/styles/colors';
import { createStage } from '@/components/Player/scene/stage';
import { createButtonRow, BUTTON_SIZE, BUTTON_SPACING } from '@/components/Player/scene/buttons';

const PLAY_GAP = 0.03;                    // extra space between the play button and the chapters
const BAR_Z = 0.043;                      // timeline bars, below the buttons (z = down the screen)
const BAR_W = BUTTON_SPACING - 0.012;
const BAR_H = 0.0045;

/** public/depth/<folder>/<name>.webp for cdn.genhoer.dk/media/<folder>/<name>.webp */
export function depthMapFor(image) {
    const match = image?.match(/\/media\/([^/]+)\/([^/]+?)\.\w+$/);
    return match ? `/depth/${match[1]}/${match[2]}.webp` : null;
}

/** Index of the chapter playing at `time` */
const chapterAt = (segments, time) => segments.reduce((found, s, i) => (s.start <= time ? i : found), 0);

export default function ChapterScene({ track, audio, focus = 0.5 }) {
    const containerRef = useRef(null);
    const audioRef = useRef(audio);

    useEffect(() => { audioRef.current = audio; });

    useEffect(() => {
        const container = containerRef.current;
        const segments = track?.segments;
        if (!container || !segments?.length) return;

        const count = segments.length;
        // Play button first, then the chapters
        const xOf = (i) => {
            const total = count * BUTTON_SPACING + PLAY_GAP;
            const left = -total / 2;
            return i === 0 ? left : left + PLAY_GAP + i * BUTTON_SPACING;
        };
        const { row, buttons, dispose: disposeButtons } = createButtonRow(count + 1, {
            label: (i) => (i === 0 ? 'play' : i),
            x: xOf,
        });
        const rowWidth = xOf(count) - xOf(0) + BUTTON_SIZE;
        row.children.forEach((child) => { child.position.x -= (xOf(0) + xOf(count)) / 2; });   // centre the row

        /* ---------- TIMELINE BARS ---------- */

        const barGeo = new THREE.BoxGeometry(BAR_W, 0.002, BAR_H);
        const fillGeo = barGeo.clone().translate(BAR_W / 2, 0.0004, 0);   // grows from the left edge
        const trackMaterial = new THREE.MeshStandardMaterial({ color: colors.paper, roughness: 0.8, transparent: true, opacity: 0.85 });
        const fillMaterial = new THREE.MeshStandardMaterial({ color: colors.ink, roughness: 0.6 });
        const hitMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });

        const bars = segments.map((_, s) => {
            const x = buttons[s + 1].group.position.x;
            const bar = new THREE.Mesh(barGeo, trackMaterial);
            bar.position.set(x, 0.001, BAR_Z);
            const fill = new THREE.Mesh(fillGeo, fillMaterial);
            fill.position.set(x - BAR_W / 2, 0.001, BAR_Z);
            fill.scale.x = 0.0001;
            // Generous hit strip around the bar
            const hit = new THREE.Mesh(new THREE.PlaneGeometry(BUTTON_SPACING, 0.022), hitMaterial);
            hit.rotation.x = -Math.PI / 2;
            hit.position.set(x, 0.002, BAR_Z);
            hit.userData = { bar: s };
            row.add(bar, fill, hit);
            return { fill, hit, x };
        });

        // Hit areas for the buttons (a column each, from the top of the button to the bar)
        const buttonHits = buttons.map((b, i) => {
            const hit = new THREE.Mesh(new THREE.PlaneGeometry(BUTTON_SPACING, BUTTON_SIZE * 1.4), hitMaterial);
            hit.rotation.x = -Math.PI / 2;
            hit.position.set(b.group.position.x, 0.012, -0.004);
            hit.userData = { button: i };
            row.add(hit);
            return hit;
        });
        const hitTargets = [...buttonHits, ...bars.map(b => b.hit)];

        /* ---------- STAGE ---------- */

        let shownChapter = -1;
        const stage = createStage(container, {
            focus,
            onResize: ({ view }) => {
                const scale = Math.min(view.width * 0.86 / rowWidth, view.height * 0.55 / rowWidth, 1);
                row.scale.setScalar(scale);
                const marginPx = view.aspect < 1 ? 96 : 56;
                row.position.y = -view.height / 2 + view.height * (marginPx / view.pixelHeight) + (BUTTON_SIZE * 0.75 + BAR_Z) * scale;
            },
            onFrame: (dt) => {
                const { isPlaying, currentTime, duration } = audioRef.current;
                const current = chapterAt(segments, currentTime);

                // The chapter's image (with depth) behind everything
                if (current !== shownChapter) {
                    shownChapter = current;
                    stage.setBackdrop(segments[current].image, depthMapFor(segments[current].image));
                }

                buttons[0].setLabel(isPlaying ? 'pause' : 'play');
                buttons.forEach((b, i) => b.update(dt, b.held || (i > 0 && i - 1 === current && duration > 0)));

                // Timeline: full for chapters before, partly for the one playing, empty after
                bars.forEach((bar, s) => {
                    const start = segments[s].start;
                    const end = segments[s + 1]?.start ?? duration;
                    const progress = duration ? THREE.MathUtils.clamp((currentTime - start) / (end - start), 0, 1) : 0;
                    bar.fill.scale.x = Math.max(0.0001, progress);
                });
            },
        });
        stage.panel.add(row);

        /* ---------- POINTER ---------- */

        const { canvas } = stage;
        const local = new THREE.Vector3();
        let held = null;                 // { button } or { bar } under the pointer that went down

        const seekInBar = (e, s) => {
            const hit = stage.pick(e, [bars[s].hit])[0];
            if (!hit) return;
            row.worldToLocal(local.copy(hit.point));
            const f = THREE.MathUtils.clamp((local.x - (bars[s].x - BAR_W / 2)) / BAR_W, 0, 0.999);
            const { duration, seek } = audioRef.current;
            const start = segments[s].start;
            const end = segments[s + 1]?.start ?? duration;
            if (duration) seek(start + f * (end - start));
        };

        const onPointerDown = (e) => {
            const target = stage.pick(e, hitTargets)[0]?.object.userData;
            if (!target) return;
            try { canvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
            held = target;
            const { isPlaying, play, pause, seek } = audioRef.current;

            if (target.button === 0) {
                buttons[0].held = true;
                isPlaying ? pause() : play();
            } else if (target.button > 0) {
                buttons[target.button].held = true;
                seek(segments[target.button - 1].start);
                if (!isPlaying) play();
            } else if (target.bar !== undefined) {
                seekInBar(e, target.bar);
            }
        };

        const onPointerMove = (e) => {
            if (held?.bar !== undefined) { seekInBar(e, held.bar); return; }
            if (e.pointerType === 'mouse') canvas.style.cursor = stage.pick(e, hitTargets).length ? 'pointer' : '';
        };

        const onPointerUp = () => {
            if (held?.button !== undefined) buttons[held.button].held = false;
            held = null;
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);

        /* ---------- KEYS: space = play / pause, 1–9 = chapter ---------- */

        const onKey = (e) => {
            if (e.repeat || e.target.closest?.('input, textarea')) return;
            const { isPlaying, play, pause, seek } = audioRef.current;
            if (e.key === ' ') {
                e.preventDefault();
                isPlaying ? pause() : play();
            }
            const n = Number(e.key);
            if (n >= 1 && n <= count) {
                seek(segments[n - 1].start);
                if (!isPlaying) play();
            }
        };
        window.addEventListener('keydown', onKey);

        stage.start();

        return () => {
            window.removeEventListener('keydown', onKey);
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
            disposeButtons();
            stage.dispose();
        };
    }, [track, focus]);

    return <div ref={containerRef} className='absolute inset-0' />;
}
