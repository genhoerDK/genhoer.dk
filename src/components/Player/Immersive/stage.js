import * as THREE from 'three';

/**
 * The WebGL stage the immersive player draws on. It owns the renderer, the
 * render loop, resizing and pointer input, and hosts one "interface" at a time
 * (see interfaces/index.js). An interface owns its own scene and camera.
 *
 * Interfaces receive every frame:
 *   frame = { dt, elapsed, ...state }   state comes from getState() — playback, envelope, chapter
 * and the pointer:
 *   pointer = { x, y, ndc: Vector2, down, dragX, dragY, raycaster }
 */
export function createStage(container, { getState, actions }) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const pointer = { id: null, x: 0, y: 0, ndc: new THREE.Vector2(), down: false, dragX: 0, dragY: 0, moved: 0, raycaster };

    let size = { width: 1, height: 1 };
    let current = null;
    let frameId = null;

    const resize = () => {
        const width = container.clientWidth || 1;
        const height = container.clientHeight || 1;
        size = { width, height };
        renderer.setSize(width, height, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        current?.resize?.(width, height);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    /* ---------- POINTER ---------- */

    const setPointer = (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = e.clientX - rect.left;
        pointer.y = e.clientY - rect.top;
        pointer.ndc.set((pointer.x / rect.width) * 2 - 1, -(pointer.y / rect.height) * 2 + 1);
    };

    // An interface can take a pointer for itself (e.g. holding a push button) by returning
    // true from pointerDown — that pointer then doesn't drag or click. Each finger has its
    // own id, so several buttons can be held at once.
    const captured = new Set();
    let last = null;
    const onDown = (e) => {
        setPointer(e);
        pointer.id = e.pointerId;
        renderer.domElement.setPointerCapture?.(e.pointerId);
        if (current?.camera) raycaster.setFromCamera(pointer.ndc, current.camera);
        if (current?.pointerDown?.(pointer) === true) {
            captured.add(e.pointerId);
            return;
        }
        pointer.down = true;
        pointer.moved = 0;
        last = { x: e.clientX, y: e.clientY, id: e.pointerId };
    };
    const onMove = (e) => {
        if (captured.has(e.pointerId)) return;
        setPointer(e);
        if (pointer.down && last && last.id === e.pointerId) {
            const dx = e.clientX - last.x;
            const dy = e.clientY - last.y;
            pointer.dragX += dx;
            pointer.dragY += dy;
            pointer.moved += Math.abs(dx) + Math.abs(dy);
            last = { x: e.clientX, y: e.clientY, id: e.pointerId };
            current?.drag?.(dx / size.width, dy / size.height, pointer);
        }
        current?.pointerMove?.(pointer);
        renderer.domElement.style.cursor = current?.hovering?.() ? 'pointer' : pointer.down ? 'grabbing' : 'grab';
    };
    const onUp = (e) => {
        if (captured.delete(e.pointerId)) {
            current?.pointerUp?.({ ...pointer, id: e.pointerId });
            return;
        }
        if (last && last.id !== e.pointerId) return;
        setPointer(e);
        pointer.id = e.pointerId;
        const wasClick = pointer.down && pointer.moved < 6;
        pointer.down = false;
        last = null;
        current?.pointerUp?.(pointer);
        if (wasClick) {
            if (current?.camera) raycaster.setFromCamera(pointer.ndc, current.camera);
            current?.click?.(pointer, actions);
        }
    };
    const onLeave = () => current?.pointerLeave?.(pointer);

    const el = renderer.domElement;
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onLeave);

    /* ---------- LOOP ---------- */

    const loop = () => {
        frameId = requestAnimationFrame(loop);
        if (!current) return;
        const dt = Math.min(clock.getDelta(), 0.1);
        const frame = { dt, elapsed: clock.elapsedTime, ...getState() };
        if (current.camera) raycaster.setFromCamera(pointer.ndc, current.camera);
        current.update(frame, pointer);
        renderer.render(current.scene, current.camera);
    };

    /* ---------- API ---------- */

    return {
        renderer,
        /** Swap the interface. `factory(ctx)` returns { scene, camera, update, resize, dispose, ... } */
        mount(factory, options = {}) {
            current?.dispose?.();
            current = factory({ renderer, size, actions, options, getState });
            resize();
            if (frameId === null) frameId = requestAnimationFrame(loop);
        },
        dispose() {
            cancelAnimationFrame(frameId);
            frameId = null;
            resizeObserver.disconnect();
            el.removeEventListener('pointerdown', onDown);
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', onUp);
            el.removeEventListener('pointercancel', onUp);
            el.removeEventListener('pointerleave', onLeave);
            current?.dispose?.();
            current = null;
            renderer.dispose();
            el.remove();
        },
    };
}
