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
    const fallback = textTexture(fallbackText, { width: 512, height: 512, size: 120, background: colors.shade, color: colors.faint });
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
export function textTexture(text, { width = 256, height = 128, size = 64, color = colors.paper, background = null, weight = 200 } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
    }
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px Rem, ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text ?? '', width / 2, height / 2);
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
