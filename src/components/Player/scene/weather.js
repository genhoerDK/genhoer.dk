/**
 * Weather for the 3D scenes: rain as thin streaks falling on a slant, in a box that moves with the
 * point in focus, so there is always rain where you look and never more than needed.
 *
 *   const rain = createRain();
 *   room.add(rain.mesh);
 *   rain.update(dt, focus, { amount, size, height, length, fall, wind });   // every frame
 *
 * amount 0–1 (0 hides it), size: metres across the box, height: metres of it above the ground,
 * length: metres a streak is long, fall: metres a second, wind: metres a second sideways (x).
 */

import * as THREE from 'three';

export function createRain({ count = 5000, colour = '#e7ebee' } = {}) {
    // Where each drop is in the box, 0–1 on each axis; it moves through the box and wraps round
    const spot = new Float32Array(count * 3);
    for (let i = 0; i < spot.length; i++) spot[i] = Math.random();
    const speed = Float32Array.from({ length: count }, () => 0.8 + Math.random() * 0.4);

    const positions = new Float32Array(count * 6);   // a streak: its top and its bottom
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.LineSegments(geometry, material);
    mesh.frustumCulled = false;   // the drops move every frame; the box is always round the view
    mesh.visible = false;

    return {
        mesh,
        update(dt, focus, { amount = 0, size = 60, height = 40, length = 1, fall = 14, wind = 3 } = {}) {
            mesh.visible = amount > 0.01;
            if (!mesh.visible) return;
            material.opacity = 0.55 * amount;
            const slant = (wind / fall) * length;
            for (let i = 0; i < count; i++) {
                const k = i * 3;
                spot[k + 2] -= (fall * speed[i] * dt) / height;
                spot[k] += (wind * speed[i] * dt) / size;
                if (spot[k + 2] < 0) { spot[k + 2] += 1; spot[k + 1] = Math.random(); }
                spot[k] -= Math.floor(spot[k]);
                const x = focus.x + (spot[k] - 0.5) * size, y = focus.y + (spot[k + 1] - 0.5) * size, z = spot[k + 2] * height;
                const p = i * 6;
                positions[p] = x; positions[p + 1] = y; positions[p + 2] = z;
                positions[p + 3] = x - slant; positions[p + 4] = y; positions[p + 5] = z - length;
            }
            geometry.attributes.position.needsUpdate = true;
        },
    };
}
