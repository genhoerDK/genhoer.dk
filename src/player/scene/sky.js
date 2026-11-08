// The stylised sky, shared by the 3D scenes in the pale, simple look (Kanon i G3, 53 sekunder til fælles)

import * as THREE from 'three';

/** The stylised sky, wrapped round a sphere: soft blue overhead, pale haze at the horizon, light clouds */
export function skyTexture() {
    const W = 1024, H = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    // the top of the canvas is the top of the sky; the horizon is halfway down
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#9fbbd0');
    g.addColorStop(0.3, '#bccfdb');
    g.addColorStop(0.45, '#dcdcd4');
    g.addColorStop(1, '#dcdcd4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    let seed = 5;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let c = 0; c < 26; c++) {
        const x = rand() * W, y = H * (0.12 + rand() * 0.28), w = 50 + rand() * 120;
        for (let k = 0; k < 7; k++) {
            const px = x + (rand() - 0.5) * w * 1.6, py = y + (rand() - 0.5) * w * 0.25, r = w * (0.25 + rand() * 0.3);
            for (const ox of [-W, 0, W]) {
                const blob = ctx.createRadialGradient(px + ox, py, 0, px + ox, py, r);
                blob.addColorStop(0, 'rgba(250,250,247,0.85)');
                blob.addColorStop(1, 'rgba(250,250,247,0)');
                ctx.fillStyle = blob;
                ctx.beginPath(); ctx.ellipse(px + ox, py, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
            }
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    return texture;
}
