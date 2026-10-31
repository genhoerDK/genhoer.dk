import * as THREE from 'three';
import { colors } from '@/styles/colors';

export const palette = {
    paper: new THREE.Color(colors.paper),
    soft: new THREE.Color(colors.soft),
    muted: new THREE.Color(colors.muted),
    faint: new THREE.Color(colors.faint),
    hard: new THREE.Color(colors.hard),
    dim: new THREE.Color(colors.dim),
    shade: new THREE.Color(colors.shade),
    ink: new THREE.Color(colors.ink),
};

const loader = new THREE.TextureLoader();
loader.setCrossOrigin('anonymous');

/**
 * Load an image as a texture. If the image can't be used in WebGL (missing file
 * or no CORS headers on the CDN) a quiet placeholder with the chapter number is
 * returned instead, so the scene still works.
 */
export function loadTexture(url, fallbackText, onReady) {
    const fallback = textTexture(fallbackText, { width: 512, height: 512, size: 120, background: colors.soft, color: colors.faint });
    if (!url) {
        onReady?.(fallback);
        return fallback;
    }
    const texture = loader.load(
        url,
        (t) => { t.colorSpace = THREE.SRGBColorSpace; onReady?.(t); },
        undefined,
        () => onReady?.(fallback),
    );
    return texture;
}

/** Crop a texture like CSS object-fit: cover for a plane of the given aspect (width / height) */
export function coverTexture(texture, planeAspect) {
    const image = texture.image;
    if (!image?.width) return;
    const imageAspect = image.width / image.height;
    texture.matrixAutoUpdate = true;
    if (imageAspect > planeAspect) {
        texture.repeat.set(planeAspect / imageAspect, 1);
        texture.offset.set((1 - texture.repeat.x) / 2, 0);
    } else {
        texture.repeat.set(1, imageAspect / planeAspect);
        texture.offset.set(0, (1 - texture.repeat.y) / 2);
    }
    texture.needsUpdate = true;
}

/** A canvas texture with text — chapter numbers and placeholders */
export function textTexture(text, { width = 256, height = 128, size = 64, color = colors.ink, background = null, weight = 300, uppercase = false, tracking = 0 } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
    }
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${siteFont()}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (tracking) ctx.letterSpacing = `${tracking}px`;
    ctx.fillText(uppercase ? (text ?? '').toUpperCase() : (text ?? ''), width / 2, height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/** Chapter number as two digits: 1 → "01" */
export const pad = (n) => String(n).padStart(2, '0');

/** Frame-rate independent easing towards a target */
export const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

/** Shortest signed difference between two angles */
export const angleDelta = (from, to) => {
    let d = (to - from) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
};

/** Chapters as fractions of the track: [{ index, start, end, mid, title, image }] */
export function chapterSpans(segments, duration) {
    if (!segments?.length || !duration) return [];
    return segments.map((s, i) => {
        const start = Math.min(1, s.start / duration);
        const end = Math.min(1, (segments[i + 1]?.start ?? duration) / duration);
        return { index: i, start, end, mid: (start + end) / 2, title: s.title, image: s.image, startSec: s.start };
    });
}

/** Dispose everything under an object */
export function disposeTree(root) {
    root.traverse((obj) => {
        obj.geometry?.dispose?.();
        const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
        for (const m of materials) {
            for (const key of ['map', 'alphaMap']) m[key]?.dispose?.();
            m.dispose?.();
        }
    });
}

/** The site's font (REM, loaded by next/font under a generated name) */
function siteFont() {
    if (typeof document === 'undefined') return 'monospace';
    return getComputedStyle(document.body).fontFamily || 'monospace';
}

/* ---------- THE GENHØR ROOM ---------- */
// Shared look for all scenes: an endless sheet of paper, soft daylight from above,
// greyscale objects and circles. Colour only comes from the works' own images.

export function createRoom(scene, { fogNear = 18, fogFar = 60, shadowSize = 14 } = {}) {
    scene.background = palette.paper.clone();
    scene.fog = new THREE.Fog(palette.paper, fogNear, fogFar);

    const hemi = new THREE.HemisphereLight(0xffffff, palette.muted, 2.4);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(5, 12, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 8;
    sun.shadow.bias = -0.0005;
    Object.assign(sun.shadow.camera, { left: -shadowSize, right: shadowSize, top: shadowSize, bottom: -shadowSize, near: 1, far: 40 });
    scene.add(sun);

    // Catches shadows only — the paper colour is the background, so the floor has no edge
    const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 64).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.14 }));
    floor.receiveShadow = true;
    scene.add(floor);

    return { floor, sun };
}

/** Orbit camera around a target: azimuth/elevation/distance, eased */
export function createOrbit(camera, { azimuth = 0, elevation = 0.75, distance = 13, target = new THREE.Vector3(), autoSpin = 0.02, azimuthRange = null, elevationRange = [0.15, 1.35], returnHome = false } = {}) {
    const home = { azimuth, elevation };
    const state = { azimuth, elevation, distance, target, autoSpin, goal: { azimuth, elevation }, idle: 10 };
    return {
        state,
        drag(dx, dy) {
            state.idle = 0;
            state.goal.azimuth -= dx * Math.PI * 1.4;
            if (azimuthRange) state.goal.azimuth = THREE.MathUtils.clamp(state.goal.azimuth, home.azimuth - azimuthRange, home.azimuth + azimuthRange);
            state.goal.elevation = THREE.MathUtils.clamp(state.goal.elevation + dy * 1.6, ...elevationRange);
        },
        update(dt, extraY = 0) {
            state.idle += dt;
            if (state.idle > 3) state.goal.azimuth += state.autoSpin * dt;
            // Drift back to the starting view after the user has looked around
            if (returnHome && state.idle > 4) {
                state.goal.azimuth = damp(state.goal.azimuth, home.azimuth, 0.6, dt);
                state.goal.elevation = damp(state.goal.elevation, home.elevation, 0.6, dt);
            }
            state.azimuth = damp(state.azimuth, state.goal.azimuth, 4, dt);
            state.elevation = damp(state.elevation, state.goal.elevation, 4, dt);
            const { azimuth: a, elevation: e, distance: d } = state;
            camera.position.set(
                state.target.x + Math.sin(a) * Math.cos(e) * d,
                state.target.y + Math.sin(e) * d + extraY,
                state.target.z + Math.cos(a) * Math.cos(e) * d,
            );
            camera.lookAt(state.target);
        },
    };
}

/**
 * A physical push button: plinth, collar and a cap that sinks when pressed.
 * Its label sits on top of the cap in the site's type.
 */
export function createPushButton(label, { radius = 0.7 } = {}) {
    const group = new THREE.Group();
    const standard = (color, roughness = 0.65) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.45, radius * 1.55, 0.22, 64), standard(palette.soft, 0.9));
    plinth.position.y = 0.11;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.12, radius * 1.12, 0.34, 64), standard(palette.muted, 0.8));
    collar.position.y = 0.39;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.42, 64), standard(palette.ink.clone(), 0.45));
    cap.position.y = 0.62;

    const short = String(label).length <= 2;
    const face = new THREE.Mesh(
        new THREE.CircleGeometry(radius * 0.8, 48).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: textTexture(label, { width: 256, height: 256, size: short ? 110 : 54, color: colors.paper, uppercase: true, tracking: short ? 0 : 4 }), transparent: true }),
    );
    face.position.y = 0.212;
    cap.add(face);

    for (const m of [plinth, collar, cap]) { m.castShadow = true; m.receiveShadow = true; }
    group.add(plinth, collar, cap);

    let press = 0;
    return {
        group,
        hitTargets: [cap, collar, face],
        update(pressed, dt, level = 0) {
            press = damp(press, pressed ? 1 : 0, pressed ? 30 : 12, dt);
            cap.position.y = 0.62 - press * 0.22;
            cap.material.color.copy(palette.ink).lerp(palette.dim, press * 0.6);
            collar.scale.setScalar(1 + press * level * 0.06);
        },
    };
}

/** A ring of sound bars on the floor — the same figure as the chapter ring */
export function createBarRing({ radius, count = 120, width = 0.07, color = palette.ink }) {
    const geometry = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.castShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const dummy = new THREE.Object3D();
    return {
        mesh,
        /** height(i, angle) → bar height */
        update(height) {
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2;
                dummy.position.set(Math.sin(a) * radius, 0, Math.cos(a) * radius);
                dummy.rotation.set(0, a, 0);
                dummy.scale.set(width, Math.max(0.005, height(i, a)), width);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
        },
    };
}

/** Small uppercase text that always faces the camera — the 3D version of <Label> */
export function createLabel(text, { scale = 1, color = colors.hard } = {}) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: textTexture(text, { width: 512, height: 64, size: 26, color, uppercase: true, tracking: 3, weight: 400 }),
        transparent: true, depthWrite: false,
    }));
    sprite.scale.set(2.4 * scale, 0.3 * scale, 1);
    return sprite;
}

/** Expanding circles on the floor — sent out by held buttons */
export function createRipples(scene, { max = 40, y = 0.01, color = palette.ink } = {}) {
    // Hairlines (not filled rings) so they stay thin however far they travel
    const points = Array.from({ length: 128 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    });
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const pool = Array.from({ length: max }, () => {
        const mesh = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
        mesh.visible = false;
        mesh.position.y = y;
        scene.add(mesh);
        return { mesh, age: 0, life: 1, from: 1, to: 1 };
    });
    let next = 0;
    return {
        list: pool,
        emit(position, { from = 0.9, to = 6, life = 2.6 } = {}) {
            const r = pool[next++ % max];
            Object.assign(r, { age: 0, life, from, to });
            r.mesh.position.x = position.x;
            r.mesh.position.z = position.z;
            r.mesh.visible = true;
        },
        update(dt) {
            for (const r of pool) {
                if (!r.mesh.visible) continue;
                r.age += dt;
                const t = r.age / r.life;
                if (t >= 1) { r.mesh.visible = false; continue; }
                const s = THREE.MathUtils.lerp(r.from, r.to, 1 - Math.pow(1 - t, 2));
                r.mesh.scale.setScalar(s);
                r.mesh.material.opacity = 0.6 * (1 - t);
            }
        },
    };
}

/** Draw wrapped text on a canvas; returns the y after the last line */
export function wrapText(ctx, text, x, y, maxWidth, lineHeight, { indent = 0 } = {}) {
    const words = String(text).split(/\s+/);
    let line = '';
    let first = true;
    for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        const room = maxWidth - (first ? indent : 0);
        if (ctx.measureText(test).width > room && line) {
            ctx.fillText(line, x + (first ? indent : 0), y);
            y += lineHeight;
            line = word;
            first = false;
        } else {
            line = test;
        }
    }
    if (line) { ctx.fillText(line, x + (first ? indent : 0), y); y += lineHeight; }
    return y;
}

export { siteFont };
