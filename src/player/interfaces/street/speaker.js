/**
 * A speaker on a facade, the street interface's marker for the sound (Kirkestræde): a sphere on a
 * short bracket out from the wall, over a soft pool of light on the street. The ones near you are
 * white and lit; while the work plays, rings go out from them over the street. Only the sound is
 * white (STIL.md).
 *
 *   const speaker = createSpeaker({ wall: [x, z] });   wall: the way into the wall, a unit vector
 *   scene.add(speaker.group, speaker.pool);            place both where the speaker hangs
 *   speaker.update(dt, t, { near, sounding, still })   near: 0–1, how close you are
 *   speaker.dispose()
 *
 * Metres, y up. Scale `group` to keep the marker a readable size from far off; the pool and the
 * rings stay their size on the ground.
 */

import * as THREE from 'three';
import { GREYS, zinc } from '@/player/kit/style';

export const SPEAKER = {
    at: 5,              // metres up the wall
    ball: 0.75,         // the sphere's radius
    out: 1.4,           // metres out from the wall
    pool: 16,           // metres across the light on the street
};

const uvVertex = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

/**
 * @param {object} o
 * @param {number[]} o.wall  [x, z]: the way from the speaker into the wall it hangs on
 * @param {number} [o.seed]  Sets its rings out of step with the others
 */
export function createSpeaker({ wall, seed = 0 }) {
    const white = new THREE.Color(GREYS.sound), away = new THREE.Color(GREYS.soundAway);

    /* the pool of light on the street, out from the wall */
    const pool = new THREE.Mesh(new THREE.CircleGeometry(SPEAKER.pool / 2, 40).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
        uniforms: { uColor: { value: white }, uStrength: { value: 0 } },
        vertexShader: uvVertex,
        fragmentShader: 'uniform vec3 uColor; uniform float uStrength; varying vec2 vUv; void main() { float r = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(uColor, pow(max(0.0, 1.0 - r), 2.0) * uStrength); }',
        transparent: true,
        depthWrite: false,
    }));

    /* the sphere, on its bracket */
    const group = new THREE.Group();
    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(SPEAKER.ball, 24, 16),
        new THREE.MeshLambertMaterial({ color: away.clone(), emissive: 0xffffff, emissiveIntensity: 0 }),
    );
    ball.position.y = SPEAKER.at;
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, SPEAKER.out), new THREE.MeshLambertMaterial({ color: new THREE.Color(zinc(800)) }));
    bracket.position.set(wall[0] * SPEAKER.out / 2, SPEAKER.at, wall[1] * SPEAKER.out / 2);
    bracket.lookAt(wall[0] * SPEAKER.out, SPEAKER.at, wall[1] * SPEAKER.out);
    group.add(ball, bracket);

    /* the rings, going out over the street while it plays */
    const ringGeometry = new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
    const rings = [0, 1].map(() => {
        const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: white, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
        ring.position.y = 0.4;
        return ring;
    });
    const ground = new THREE.Group();
    ground.add(pool, ...rings);
    // drawn over the town and the haze, so it is never lost
    for (const m of [group, ball, bracket, pool, ...rings]) m.renderOrder = 1000;

    let lit = 0;
    return {
        group,
        pool: ground,
        ball,
        get lit() { return lit; },
        /**
         * @param {number} dt  seconds since the last frame
         * @param {number} t   seconds since the start
         * @param {{ near?: number, sounding?: boolean, still?: boolean }} state
         */
        update(dt, t, { near = 0, sounding = false, still = false } = {}) {
            lit += (near - lit) * (1 - Math.exp(-dt * 4));
            ball.material.color.copy(away).lerp(white, lit);
            ball.material.emissiveIntensity = lit * 0.5;
            pool.material.uniforms.uStrength.value = 0.05 + lit * (sounding ? 0.4 : 0.22);
            rings.forEach((ring, i) => {
                const phase = (t * 0.4 + i / 2 + seed * 0.37) % 1;
                ring.scale.setScalar(1.5 + phase * 13);
                ring.material.opacity = sounding && !still ? (1 - phase) * (0.15 + lit * 0.45) : Math.max(0, ring.material.opacity - dt);
            });
        },
        dispose() {
            for (const m of [pool, ball, bracket]) { m.geometry.dispose(); m.material.dispose(); }
            ringGeometry.dispose();
            rings.forEach((r) => r.material.dispose());
        },
    };
}
