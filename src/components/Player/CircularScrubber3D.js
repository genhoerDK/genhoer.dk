'use client';

/**
 * 3D version of CircularScrubber, built with three.js.
 *
 * Same anatomy as the 2D player — a thin progress track with a thumb, the
 * track's chapters (segments) as a thick ring inside it, and the current
 * chapter's image in the middle — but the ring is a tilted, extruded object
 * that casts a shadow, leans towards the pointer and lifts the chapter that
 * is playing or hovered.
 *
 * Interaction mirrors the 2D version: drag the outer track to scrub (seeks on
 * release), click a chapter to jump to its start. Arrow keys seek ±5 s.
 */

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAudio } from '@/context/AudioContext';
import { PlayCircleIcon } from '@heroicons/react/20/solid';
import { colors } from '@/styles/colors';
import TrackSegmentInfo from '@/components/Player/TrackSegmentInfo';

/* ---------- GEOMETRY CONSTANTS (world units, outer track radius = 1) ---------- */

const TRACK_RADIUS = 1;
const TRACK_WIDTH = 0.05;
const SEGMENT_RADIUS = 0.8;
const SEGMENT_WIDTH = 0.25;
const SEGMENT_DEPTH = 0.07;
const SEGMENT_GAP = 0.003;           // fraction of the circle, same as TrackSegment.js
const DISC_RADIUS = 0.625;
const THUMB_RADIUS = 0.075;
const BASE_TILT = -0.38;              // how far the ring leans back (radians)
const POINTER_TILT = 0.12;            // extra lean towards the pointer
const PROGRESS_STEPS = 512;
const TEXTURE_ROTATION = Math.PI / 2;

/** Fraction of the circle (0 at 12 o'clock, clockwise) → angle in the XY plane */
const angleAt = (f) => Math.PI / 2 - f * Math.PI * 2;

/** Angle in the XY plane → fraction of the circle */
const fractionAt = (x, y) => {
    const f = (Math.PI / 2 - Math.atan2(y, x)) / (Math.PI * 2);
    return ((f % 1) + 1) % 1;
};

/** Flat annular sector from fraction `start` to `end` */
function sectorShape(start, end, inner, outer) {
    const shape = new THREE.Shape();
    const a0 = angleAt(start);
    const a1 = angleAt(end);
    shape.moveTo(Math.cos(a0) * outer, Math.sin(a0) * outer);
    shape.absarc(0, 0, outer, a0, a1, true);
    shape.lineTo(Math.cos(a1) * inner, Math.sin(a1) * inner);
    shape.absarc(0, 0, inner, a1, a0, false);
    shape.closePath();
    return shape;
}

/** Sprite with a centred number, used as chapter label */
function numberSprite(n) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = colors.paper;
    ctx.font = `300 ${size * 0.62}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), size / 2, size / 2 + size * 0.04);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.setScalar(0.085);
    return sprite;
}

/** Dispose every geometry, material and texture under `root` */
function disposeTree(root) {
    root.traverse((obj) => {
        obj.geometry?.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
        materials.forEach((m) => { m.map?.dispose(); m.dispose(); });
    });
}

export default function CircularScrubber3D() {
    const { progress, duration, currentTime, seek, currentTrack, play, isPlaying } = useAudio();

    const containerRef = useRef(null);
    const sceneRef = useRef(null);          // everything three.js lives here, created once
    const [radiusPx, setRadiusPx] = useState(0);   // on-screen ring radius, for the HTML overlays

    /** Values the render loop reads every frame — refs so the loop never restarts */
    const live = useRef({ progress: 0, isPlaying: false, dragging: false, dragValue: 0, hovered: -1 });

    /** Callbacks the pointer handlers need, kept fresh without re-binding listeners */
    const actions = useRef({});

    useEffect(() => {
        live.current.progress = progress;
        live.current.isPlaying = isPlaying;
        actions.current.seekFraction = (f) => { if (duration) seek(f * duration); };
    });

    /* ---------- SCENE SETUP (once) ---------- */

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.style.touchAction = 'none';
        renderer.domElement.className = 'absolute inset-0 size-full';
        container.prepend(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

        /* Lights: soft fill + one key light that casts the shadow */
        scene.add(new THREE.HemisphereLight(0xffffff, 0xd4d4d8, 2.2));
        const key = new THREE.DirectionalLight(0xffffff, 1.6);
        key.position.set(-2, 3, 5);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = key.shadow.camera.bottom = -2;
        key.shadow.camera.right = key.shadow.camera.top = 2;
        key.shadow.radius = 6;
        key.shadow.bias = -0.0005;
        scene.add(key);

        /* The tilted ring — everything that rotates together */
        const ring = new THREE.Group();
        ring.rotation.x = BASE_TILT;
        scene.add(ring);

        /* Shadow catcher just beneath the ring */
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.12 }));
        ground.position.z = -0.25;
        ground.receiveShadow = true;
        ring.add(ground);

        /* Outer track + progress (flat, exact colours like the 2D version) */
        const track = new THREE.Mesh(
            new THREE.RingGeometry(TRACK_RADIUS - TRACK_WIDTH / 2, TRACK_RADIUS + TRACK_WIDTH / 2, 256),
            new THREE.MeshBasicMaterial({ color: colors.faint }),
        );
        ring.add(track);

        // RingGeometry runs counter-clockwise; mirroring X makes it run clockwise from 12 o'clock,
        // and its indices are ordered by angle, so drawRange draws exactly `progress` of it.
        const progressMesh = new THREE.Mesh(
            new THREE.RingGeometry(TRACK_RADIUS - TRACK_WIDTH / 2, TRACK_RADIUS + TRACK_WIDTH / 2, PROGRESS_STEPS, 1, Math.PI / 2, Math.PI * 2),
            new THREE.MeshBasicMaterial({ color: colors.dim, side: THREE.DoubleSide }),
        );
        progressMesh.scale.x = -1;
        progressMesh.position.z = 0.001;
        ring.add(progressMesh);

        /* Invisible, wider hit area for grabbing the track */
        const trackHit = new THREE.Mesh(
            new THREE.RingGeometry(TRACK_RADIUS - 0.09, TRACK_RADIUS + 0.12, 128),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
        );
        ring.add(trackHit);

        const thumb = new THREE.Mesh(
            new THREE.SphereGeometry(THUMB_RADIUS, 48, 24),
            new THREE.MeshStandardMaterial({ color: colors.dim, roughness: 0.45 }),
        );
        thumb.castShadow = true;
        ring.add(thumb);

        /* Centre disc with the chapter image on its face */
        const discFace = new THREE.MeshBasicMaterial({ color: colors.ink });
        const disc = new THREE.Mesh(
            new THREE.CylinderGeometry(DISC_RADIUS, DISC_RADIUS, 0.05, 96),
            [new THREE.MeshStandardMaterial({ color: colors.ink, roughness: 0.6 }), discFace, discFace],
        );
        disc.rotation.x = Math.PI / 2;
        disc.position.z = 0.025;
        disc.castShadow = true;
        ring.add(disc);

        /* Chapter meshes are (re)built whenever the track changes */
        const segmentGroup = new THREE.Group();
        ring.add(segmentGroup);

        /* ---------- SIZING ---------- */

        const resize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;

            // Same footprint as the 2D version: ring radius = min(w, h - 80) / 2.5 px
            const targetPx = Math.min(w, h - 80) / 2.5;
            const halfHeightWorld = (TRACK_RADIUS * h) / (2 * targetPx);
            camera.position.set(0, 0, halfHeightWorld / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
            setRadiusPx(targetPx);
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        /* ---------- POINTER ---------- */

        const raycaster = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        const tiltTarget = new THREE.Vector2();
        const plane = new THREE.Plane();
        const hitPoint = new THREE.Vector3();

        const toNdc = (e) => {
            const rect = renderer.domElement.getBoundingClientRect();
            ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            raycaster.setFromCamera(ndc, camera);
        };

        /** Fraction under the pointer, projected onto the ring's plane */
        const fractionFromPointer = () => {
            plane.set(new THREE.Vector3(0, 0, 1), 0).applyMatrix4(ring.matrixWorld);
            if (!raycaster.ray.intersectPlane(plane, hitPoint)) return null;
            ring.worldToLocal(hitPoint);
            return fractionAt(hitPoint.x, hitPoint.y);
        };

        const segmentUnderPointer = () => {
            const hit = raycaster.intersectObjects(segmentGroup.children, false)[0];
            return hit ? hit.object.userData.index : -1;
        };

        const onPointerDown = (e) => {
            toNdc(e);
            const seg = segmentUnderPointer();
            if (seg >= 0) {
                actions.current.seekFraction(segmentGroup.children[seg].userData.start);
                return;
            }
            if (raycaster.intersectObjects([trackHit, thumb], false).length) {
                const f = fractionFromPointer();
                if (f === null) return;
                live.current.dragging = true;
                live.current.dragValue = f;
                renderer.domElement.setPointerCapture(e.pointerId);
            }
        };

        const onPointerMove = (e) => {
            toNdc(e);
            tiltTarget.set(ndc.x, ndc.y);
            if (live.current.dragging) {
                const f = fractionFromPointer();
                // Don't let a drag wrap around through 12 o'clock
                if (f !== null && Math.abs(f - live.current.dragValue) < 0.5) live.current.dragValue = f;
                return;
            }
            const seg = segmentUnderPointer();
            live.current.hovered = e.pointerType === 'mouse' ? seg : -1;
            const overTrack = seg >= 0 || raycaster.intersectObjects([trackHit, thumb], false).length > 0;
            renderer.domElement.style.cursor = overTrack ? 'pointer' : '';
        };

        const onPointerUp = () => {
            if (!live.current.dragging) return;
            live.current.dragging = false;
            actions.current.seekFraction(live.current.dragValue);
        };

        const onPointerLeave = () => {
            live.current.hovered = -1;
            tiltTarget.set(0, 0);
        };

        const canvas = renderer.domElement;
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerleave', onPointerLeave);
        window.addEventListener('pointerup', onPointerUp);

        /* ---------- RENDER LOOP ---------- */

        let last = performance.now();
        let t = 0;
        const inkColor = new THREE.Color(colors.ink);
        const shadeColor = new THREE.Color(colors.shade);
        const tmpColor = new THREE.Color();
        let frame;

        const tick = () => {
            frame = requestAnimationFrame(tick);
            const now = performance.now();
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            t += dt;
            const ease = 1 - Math.exp(-dt * 8);
            const state = live.current;
            const value = state.dragging ? state.dragValue : state.progress;

            // Lean towards the pointer, plus a slow idle drift
            const drift = reducedMotion ? 0 : Math.sin(t * 0.4) * 0.02;
            ring.rotation.x += (BASE_TILT - tiltTarget.y * POINTER_TILT + drift - ring.rotation.x) * ease;
            ring.rotation.y += (tiltTarget.x * POINTER_TILT - ring.rotation.y) * ease;
            ring.position.z = reducedMotion ? 0 : Math.sin(t * 0.6) * 0.015;

            // Progress arc + thumb
            progressMesh.geometry.setDrawRange(0, Math.floor(value * PROGRESS_STEPS) * 6);
            const a = angleAt(value);
            thumb.position.set(Math.cos(a) * TRACK_RADIUS, Math.sin(a) * TRACK_RADIUS, 0.03);
            const thumbScale = state.dragging ? 1.25 : 1;
            thumb.scale.setScalar(thumb.scale.x + (thumbScale - thumb.scale.x) * ease);

            // Chapters: the playing one lifts and breathes, the hovered one lifts a bit
            segmentGroup.children.forEach((mesh, i) => {
                const { start, end } = mesh.userData;
                const isActive = value >= start && value < end;
                const isHovered = state.hovered === i;
                const lift = isActive ? 0.09 : isHovered ? 0.05 : 0;
                mesh.position.z += (lift - mesh.position.z) * ease;

                const pulse = state.isPlaying && isActive && !reducedMotion ? (Math.sin(t * 3) + 1) / 2 : 0;
                tmpColor.copy(inkColor).lerp(shadeColor, isHovered ? 1 : pulse * 0.7);
                mesh.material.color.lerp(tmpColor, ease);
            });

            renderer.render(scene, camera);
        };
        tick();

        sceneRef.current = { segmentGroup, discFace, renderer };

        return () => {
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerleave', onPointerLeave);
            window.removeEventListener('pointerup', onPointerUp);
            disposeTree(scene);
            renderer.dispose();
            canvas.remove();
            sceneRef.current = null;
        };
    }, []);

    /* ---------- CHAPTER MESHES (when the track or its duration changes) ---------- */

    useEffect(() => {
        const s = sceneRef.current;
        if (!s) return;
        const { segmentGroup } = s;

        disposeTree(segmentGroup);
        segmentGroup.clear();

        const segments = currentTrack?.segments;
        if (!segments?.length || !duration) return;

        segments.forEach((segment, i) => {
            const start = segment.start / duration;
            const end = (segments[i + 1]?.start ?? duration) / duration;

            const shape = sectorShape(start, end - SEGMENT_GAP, SEGMENT_RADIUS - SEGMENT_WIDTH / 2, SEGMENT_RADIUS + SEGMENT_WIDTH / 2);
            const geometry = new THREE.ExtrudeGeometry(shape, {
                depth: SEGMENT_DEPTH,
                bevelEnabled: true,
                bevelThickness: 0.012,
                bevelSize: 0.008,
                bevelSegments: 3,
                curveSegments: Math.max(8, Math.ceil((end - start) * 160)),
            });
            const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colors.ink, roughness: 0.55, metalness: 0.05 }));
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = { index: i, start, end };

            const label = numberSprite(i + 1);
            const mid = angleAt((start + end - SEGMENT_GAP) / 2);
            label.position.set(Math.cos(mid) * SEGMENT_RADIUS, Math.sin(mid) * SEGMENT_RADIUS, SEGMENT_DEPTH + 0.025);
            mesh.add(label);

            segmentGroup.add(mesh);
        });
    }, [currentTrack, duration]);

    /* ---------- CHAPTER IMAGE ON THE DISC ---------- */

    const segments = currentTrack?.segments ?? [];
    const currentIndex = segments.reduce((found, seg, i) => (seg.start <= currentTime ? i : found), -1);
    const image = segments[currentIndex]?.image ?? segments[0]?.image;

    useEffect(() => {
        const s = sceneRef.current;
        if (!s || !image) return;
        let cancelled = false;

        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(image, (texture) => {
            if (cancelled) { texture.dispose(); return; }
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = s.renderer.capabilities.getMaxAnisotropy();

            // object-cover: crop the long side so the image fills the round face
            // (the cylinder's lid maps UVs a quarter turn off, hence the rotation)
            const { width, height } = texture.image;
            const aspect = width / height;
            texture.center.set(0.5, 0.5);
            texture.rotation = TEXTURE_ROTATION;
            texture.repeat.set(aspect > 1 ? 1 / aspect : 1, aspect > 1 ? 1 : aspect);

            s.discFace.map?.dispose();
            s.discFace.map = texture;
            s.discFace.color.set(0xc4c4c4);   // ≈ the 2D version's 75 % opacity over ink
            s.discFace.needsUpdate = true;
        });

        return () => { cancelled = true; };
    }, [image]);

    /* ---------- KEYBOARD ---------- */

    const handleKeyDown = (e) => {
        if (!duration) return;
        const step = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5 }[e.key];
        if (step === undefined) return;
        e.preventDefault();
        seek(Math.max(0, Math.min(duration, currentTime + step)));
    };

    return (
        <div
            ref={containerRef}
            role="slider"
            tabIndex={0}
            aria-label={`Afspilningsposition i ${currentTrack?.title ?? 'værket'}`}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(currentTime)}
            onKeyDown={handleKeyDown}
            className='relative flex justify-center items-center size-full min-h-160 h-svh outline-none'
        >
            <h2 className='absolute left-gutter top-12 leading-none font-extralight text-lg md:text-xl'>{currentTrack?.title}</h2>

            {isPlaying ?
                <TrackSegmentInfo segments={segments} radius={radiusPx} showImage={false} />
            :
                <button className="absolute inset-auto flex items-center justify-center cursor-pointer rounded-full z-10" style={{ width: radiusPx * 2.25, height: radiusPx * 2.25 }} onClick={() => play()}>
                    <div className="absolute size-full bg-radial from-paper to-paper blur-sm opacity-80 rounded-full"></div>
                    <PlayCircleIcon className="size-24 text-ink z-10" />
                </button>
            }
        </div>
    );
}
