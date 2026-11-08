/**
 * A listening station: where a sound is. A sphere floating on a thin beam of light over a soft
 * pool of light on the ground; the one you are at is white and lit, the one that is playing sends
 * rings out over the ground. Only the sound is white (STIL.md), so the station is the brightest
 * thing in a scene.
 *
 *   const station = createStation();
 *   scene.add(station.group, station.pool);
 *   station.group.position / station.pool.position: where it stands
 *   station.update(dt, t, { here, sounding, still })   every frame
 *   station.dispose()
 *
 * Metres, y up (Tværveje); { up: 'z' } stands it in a z-up scene. Scale `group` to keep the marker
 * a readable size from far off; the pool stays its size on the ground.
 */

import * as THREE from 'three';
import { GREYS } from '@/player/kit/style';

export const STATION = {
    pool: 46,                 // metres across the light on the ground
    beam: 30, ballAt: 37,     // metres: the beam, and where the sphere floats
    ball: 5.5,                // the sphere's radius
    here: GREYS.sound, away: GREYS.soundAway,
};

const uvVertex = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

/**
 * @param {object} [options]
 * @param {'y'|'z'} [options.up='y']
 * @param {number} [options.seed=0]  Sets it bobbing out of step with the others
 */
export function createStation({ up = 'y', seed = 0 } = {}) {
    const here = new THREE.Color(STATION.here), away = new THREE.Color(STATION.away);

    /* the pool of light on the ground */
    const poolGeometry = new THREE.CircleGeometry(STATION.pool / 2, 48);
    if (up === 'y') poolGeometry.rotateX(-Math.PI / 2);
    const pool = new THREE.Mesh(poolGeometry, new THREE.ShaderMaterial({
        uniforms: { uColor: { value: here }, uStrength: { value: 0.14 } },
        vertexShader: uvVertex,
        fragmentShader: 'uniform vec3 uColor; uniform float uStrength; varying vec2 vUv; void main() { float r = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(uColor, pow(max(0.0, 1.0 - r), 2.0) * uStrength); }',
        transparent: true,
        depthWrite: false,
    }));

    /* the marker: a sphere on a beam, and rings on the ground (built y up, turned for z up) */
    const group = new THREE.Group();
    const marker = new THREE.Group();
    if (up === 'z') marker.rotation.x = Math.PI / 2;
    group.add(marker);
    const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, STATION.beam, 10, 1, true).translate(0, STATION.beam / 2, 0),
        new THREE.ShaderMaterial({
            uniforms: { uColor: { value: here }, uStrength: { value: 0.28 } },
            vertexShader: uvVertex,
            fragmentShader: 'uniform vec3 uColor; uniform float uStrength; varying vec2 vUv; void main() { gl_FragColor = vec4(uColor, pow(1.0 - vUv.y, 1.6) * uStrength); }',
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        }),
    );
    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(STATION.ball, 40, 24),
        new THREE.MeshLambertMaterial({ color: away, emissive: 0xffffff, emissiveIntensity: 0 }),
    );
    ball.position.y = STATION.ballAt;
    const ringGeometry = new THREE.RingGeometry(0.86, 1, 64).rotateX(-Math.PI / 2);
    const rings = [0, 1, 2].map(() => {
        const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: here, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
        ring.position.y = 0.7;
        return ring;
    });
    marker.add(ball, beam, ...rings);
    // drawn over the haze and the town, so it is never lost
    for (const m of [group, ball, beam, ...rings]) m.renderOrder = 1000;

    let lit = 0;
    return {
        group,
        pool,
        ball,
        /** How lit it is now (0–1), eased */
        get lit() { return lit; },
        /**
         * @param {number} dt  seconds since the last frame
         * @param {number} t   seconds since the start
         * @param {{ here?: boolean, sounding?: boolean, still?: boolean }} state  you are at it; it is playing; reduced motion
         */
        update(dt, t, { here: isHere = false, sounding = false, still = false } = {}) {
            lit += ((isHere ? 1 : 0) - lit) * (1 - Math.exp(-dt * 4));
            ball.position.y = STATION.ballAt + (still ? 0 : Math.sin(t * 1.1 + seed * 1.7) * 1.4);
            ball.scale.setScalar(1 + lit * 0.3);
            ball.material.color.copy(lit > 0.5 ? here : away);
            ball.material.emissiveIntensity = lit * 0.55;
            beam.material.uniforms.uStrength.value = 0.28 + lit * 0.5;
            rings.forEach((ring, i) => {
                const phase = (t * 0.35 + i / 3) % 1;
                ring.scale.setScalar(6 + phase * 46);
                ring.material.opacity = sounding && !still ? (1 - phase) * 0.55 : Math.max(0, ring.material.opacity - dt);
            });
            pool.material.uniforms.uStrength.value = 0.14 + lit * 0.36;
        },
        dispose() {
            for (const m of [pool, beam, ball, ...rings]) { m.geometry.dispose(); m.material.dispose(); }
        },
    };
}
