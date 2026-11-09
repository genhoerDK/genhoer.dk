/**
 * A car: small, rounded, in one colour with dark glass and wheels. Metres, z up, pointing along +y.
 * They drive where a place has traffic (53 sekunder til fælles), slowly, in the haze like the rest.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { zinc } from '@/player/kit/style';
import { box, paint } from '@/player/kit/shapes';

/** The style's cars: in the steps of the houses */
export const CARS = [zinc(700), zinc(600), zinc(650), zinc(550), zinc(775)];

/** One car as one geometry */
export function car(hex, { glass = zinc(775), wheel = zinc(825) } = {}) {
    const parts = [
        box(1.8, 3.9, 0.78, 0, 0, 0.3, hex, 0.28),
        box(1.6, 2.1, 0.68, 0, -0.2, 0.98, glass, 0.24),
        box(1.64, 1.7, 0.1, 0, -0.2, 1.62, hex, 0.04),
    ];
    for (const x of [-0.82, 0.82]) for (const y of [-1.25, 1.25]) {
        const g = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10);
        g.rotateZ(Math.PI / 2);
        g.translate(x, y, 0.34);
        parts.push(paint(g, wheel));
    }
    const g = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    return g;
}

