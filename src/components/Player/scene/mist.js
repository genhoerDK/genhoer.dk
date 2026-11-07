/**
 * Smoke and mist in the forest round Kanonstilling G3 (three.js):
 *
 *   - mist lying in thin layers over the ground and in the pit, each a sheet of soft noise drifting
 *     its own way, so together they thicken and thin as they pass over one another
 *   - smoke: large soft puffs drifting through the trees on the wind, rising slowly, turning,
 *     swelling and fading; thickest low down and out among the trees, thinner over the concrete.
 *     A puff close to the eye fades away, so standing among them you look through, not into, it.
 *
 * Metres, z up, the middle of the pit at the origin; put the group in the room so it turns with it.
 */

import * as THREE from 'three';

const COLOUR = 0xd6d8d3;

/** Tileable fractal noise, 0–1 */
function tileNoise(size, cells, octaves, seed) {
    const out = new Float32Array(size * size);
    const hash = (x, y, o) => {
        const n = Math.sin(x * 127.1 + y * 311.7 + o * 74.7 + seed * 19.3) * 43758.5453;
        return n - Math.floor(n);
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    let amp = 0.5, total = 0;
    for (let o = 0; o < octaves; o++) {
        const g = cells << o;
        for (let y = 0; y < size; y++) {
            const fy = (y / size) * g, yi = Math.floor(fy), ty = smooth(fy - yi);
            for (let x = 0; x < size; x++) {
                const fx = (x / size) * g, xi = Math.floor(fx), tx = smooth(fx - xi);
                const a = hash(xi % g, yi % g, o), b = hash((xi + 1) % g, yi % g, o), c = hash(xi % g, (yi + 1) % g, o), d = hash((xi + 1) % g, (yi + 1) % g, o);
                out[y * size + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
            }
        }
        total += amp;
        amp *= 0.5;
    }
    for (let i = 0; i < out.length; i++) out[i] /= total;
    return out;
}

/** A sheet of mist: white, its alpha soft patches of noise (tiles seamlessly) */
function sheetTexture(seed) {
    const size = 256;
    const n = tileNoise(size, 4, 5, seed);
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
        const a = Math.min(1, Math.max(0, (n[i] - 0.38) * 2.6));
        data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 255;
        data[i * 4 + 3] = a * a * 255;
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
}

/** A puff of smoke: billowing noise inside a soft round falloff */
function puffTexture(seed) {
    const size = 128;
    const n = tileNoise(size, 3, 5, seed);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = (x / size - 0.5) * 2, dy = (y / size - 0.5) * 2;
            const falloff = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
            const a = Math.min(1, Math.max(0, (n[y * size + x] - 0.25) * 2)) * Math.pow(falloff, 1.6);
            const k = (y * size + x) * 4;
            // a little shade in the billows: darker where the noise is thin
            const v = 225 + n[y * size + x] * 30;
            image.data[k] = image.data[k + 1] = image.data[k + 2] = v;
            image.data[k + 3] = a * 255;
        }
    }
    ctx.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/**
 * @param {object} options
 * @param {(x, y) => number} options.groundAt  The forest floor's height
 * @param {number} options.radius               How far out the mist goes
 * @param {number} [options.amount=1]           0–1+
 */
export function createMist({ groundAt, radius: R, amount = 1 }) {
    const group = new THREE.Group();
    const textures = [];
    let seed = 7;
    const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };

    /* Layers over the ground: soft sheets at different heights, drifting different ways */
    const sheets = [];
    const sheetHeights = [0.15, 0.6, 1.1, 1.7, 2.4, 3.3];
    sheetHeights.forEach((z, i) => {
        const texture = sheetTexture(11 + i * 3);
        textures.push(texture);
        texture.repeat.set(3 + i * 0.4, 3 + i * 0.4);
        const material = new THREE.MeshBasicMaterial({
            map: texture, color: COLOUR, transparent: true, depthWrite: false, opacity: Math.min(0.75, (0.3 - i * 0.025) * amount), side: THREE.DoubleSide,
        });
        // the sheet's edge fades out, with the forest floor
        material.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nvarying float vEdge;')
                .replace('#include <begin_vertex>', `#include <begin_vertex>\nvEdge = length(position.xy) / ${R.toFixed(1)};`);
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', '#include <common>\nvarying float vEdge;')
                .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= 1.0 - smoothstep(0.65, 1.0, vEdge);');
        };
        const mesh = new THREE.Mesh(new THREE.CircleGeometry(R, 64), material);
        mesh.position.z = z;
        mesh.renderOrder = 2;
        group.add(mesh);
        const a = rand() * Math.PI * 2;
        sheets.push({ texture, drift: new THREE.Vector2(Math.cos(a), Math.sin(a)).multiplyScalar(0.004 + rand() * 0.006) });
    });

    /* Puffs drifting through the trees */
    const puffTextures = [1, 2, 3, 4].map((k) => puffTexture(k * 5 + 1));
    textures.push(...puffTextures);
    const wind = new THREE.Vector2(0.35, 0.12);          // metres a second
    const puffs = Array.from({ length: Math.round(110 * Math.min(1.5, amount)) }, (_, i) => {
        const material = new THREE.SpriteMaterial({ map: puffTextures[i % 4], color: COLOUR, transparent: true, depthWrite: false, opacity: 0 });
        material.rotation = rand() * Math.PI * 2;
        const sprite = new THREE.Sprite(material);
        const a = rand() * Math.PI * 2, r = 6 + Math.sqrt(rand()) * (R - 6);
        const x = Math.sin(a) * r, y = Math.cos(a) * r;
        const low = rand() < 0.65;
        const height = low ? 0.6 + rand() * 2.5 : 3 + rand() * 12;
        sprite.position.set(x, y, groundAt(x, y) + height);
        const size = (low ? 4 : 6) + rand() * 7;
        sprite.scale.setScalar(size);
        sprite.renderOrder = 3;
        group.add(sprite);
        return {
            sprite, size,
            rise: 0.02 + rand() * 0.06,
            spin: (rand() - 0.5) * 0.03,
            phase: rand() * Math.PI * 2,
            strength: (low ? 0.35 : 0.22) + rand() * 0.2,
            age: rand() * 40,
            life: 30 + rand() * 40,
            floor: groundAt(x, y),
        };
    });

    const world = new THREE.Vector3();
    let t = 0;
    return {
        group,
        /**
         * @param {number} dt          Seconds since the last frame
         * @param {THREE.Vector3} eye  The camera, in world space
         * @param {number} scale       World units to a metre (the room's scale)
         * @param {boolean} still      Reduced motion: no drifting
         */
        update(dt, eye, scale, still = false) {
            t += dt;
            const move = still ? 0 : dt;
            for (const sheet of sheets) sheet.texture.offset.addScaledVector(sheet.drift, move);
            for (const puff of puffs) {
                const { sprite } = puff;
                puff.age += move;
                if (puff.age > puff.life) {
                    // born again upwind, out at the edge or anywhere low
                    puff.age = 0;
                    const a = rand() * Math.PI * 2, r = 6 + Math.sqrt(rand()) * (R - 6);
                    sprite.position.x = Math.sin(a) * r;
                    sprite.position.y = Math.cos(a) * r;
                    puff.floor = groundAt(sprite.position.x, sprite.position.y);
                    sprite.position.z = puff.floor + 0.6 + rand() * 3;
                }
                sprite.position.x += wind.x * move;
                sprite.position.y += wind.y * move;
                sprite.position.z += puff.rise * move;
                sprite.material.rotation += puff.spin * move;
                const life = puff.age / puff.life;
                sprite.scale.setScalar(puff.size * (0.7 + life * 0.6));
                // fades in and out over its life, breathes, thins over the concrete and at the edge
                const r = Math.hypot(sprite.position.x, sprite.position.y);
                const fade = Math.sin(Math.PI * life) * (0.75 + 0.25 * Math.sin(t * 0.2 + puff.phase));
                const place = THREE.MathUtils.smoothstep(r, 5, 13) * 0.65 + 0.35;
                const edge = 1 - THREE.MathUtils.smoothstep(r, R * 0.75, R);
                // close to the eye it thins away
                sprite.getWorldPosition(world);
                const near = THREE.MathUtils.smoothstep(world.distanceTo(eye) / scale - puff.size * 0.3, 1, 6);
                sprite.material.opacity = puff.strength * amount * fade * place * edge * near;
            }
        },
        dispose() {
            textures.forEach((tex) => tex.dispose());
        },
    };
}
