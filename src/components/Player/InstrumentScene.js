'use client';

/**
 * 3D scene for button instruments (three.js): black rubber push buttons that sit right on the
 * screen, with the project's cover image (with depth) far behind and smoke drifting in between —
 * see scene/stage.js.
 *
 * Played with the pointer (several fingers at once on touch screens): pointer down on a button =
 * press, pointer up = let go — same as the physical buttons.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createStage } from '@/components/Player/scene/stage';
import { createButtonRow, BUTTON_SIZE, BUTTON_SPACING } from '@/components/Player/scene/buttons';

export default function InstrumentScene({ instrument, ready, cover, coverDepth, coverFocus = 0.5 }) {
    const containerRef = useRef(null);
    const readyRef = useRef(ready);

    useEffect(() => { readyRef.current = ready; }, [ready]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !instrument) return;

        const count = instrument.config.samples.length;
        const rowWidth = (count - 1) * BUTTON_SPACING + BUTTON_SIZE;
        const { row, buttons, dispose: disposeButtons } = createButtonRow(count);

        // One invisible hit area over the row, split into a column per button — easy to hit
        const hitArea = new THREE.Mesh(
            new THREE.PlaneGeometry(rowWidth + 0.02, BUTTON_SIZE * 1.8),
            new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
        );
        hitArea.rotation.x = -Math.PI / 2;
        hitArea.position.y = 0.012;
        row.add(hitArea);

        const stage = createStage(container, {
            focus: coverFocus,
            /** Size the row (big on wide screens, fitted on narrow ones) and put it near the bottom */
            onResize: ({ view }) => {
                const scale = Math.min(view.width * 0.84 / rowWidth, view.height * 0.5 / rowWidth, 1);
                row.scale.setScalar(scale);
                const marginPx = view.aspect < 1 ? 150 : 56;   // room for the title bar under them on phones
                row.position.y = -view.height / 2 + view.height * (marginPx / view.pixelHeight) + BUTTON_SIZE * scale * 0.75;
            },
            /** Caps go down while held (by pointer or keyboard) */
            onFrame: (dt) => {
                buttons.forEach((b, i) => b.update(dt, b.held || instrument.voices[i]?.state === 'body'));
            },
        });
        stage.panel.add(row);
        stage.setBackdrop(cover, coverDepth);

        /* ---------- POINTER ---------- */

        const local = new THREE.Vector3();
        const pointers = new Map();   // pointerId → button index
        const { canvas } = stage;

        const buttonAt = (e) => {
            const hit = stage.pick(e, [hitArea])[0];
            if (!hit) return -1;
            row.worldToLocal(local.copy(hit.point));
            return THREE.MathUtils.clamp(Math.round(local.x / BUTTON_SPACING + (count - 1) / 2), 0, count - 1);
        };

        const onPointerDown = (e) => {
            if (!readyRef.current) return;
            const i = buttonAt(e);
            if (i < 0) return;
            try { canvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
            pointers.set(e.pointerId, i);
            buttons[i].held = true;
            instrument.press(i);
        };

        const onPointerUp = (e) => {
            const i = pointers.get(e.pointerId);
            if (i === undefined) return;
            pointers.delete(e.pointerId);
            if ([...pointers.values()].includes(i)) return;   // another finger still holds it
            buttons[i].held = false;
            instrument.release(i);
        };

        const onPointerMove = (e) => {
            if (e.pointerType === 'mouse') canvas.style.cursor = buttonAt(e) >= 0 && readyRef.current ? 'pointer' : '';
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        canvas.addEventListener('pointermove', onPointerMove);

        stage.start();

        return () => {
            pointers.forEach((i) => instrument.release(i));
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
            canvas.removeEventListener('pointermove', onPointerMove);
            disposeButtons();
            stage.dispose();
        };
    }, [instrument, cover, coverDepth, coverFocus]);

    return <div ref={containerRef} className='absolute inset-0' />;
}
