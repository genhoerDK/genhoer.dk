'use client';

/**
 * The 3D map for the walk interface (three.js): the town's street net (src/player/vaerker/maps.js), drawn as
 * pale bands on dark ground with the harbour beside it, the town's landmarks in 3D (the church,
 * the water tower, Dronningens Pakhus and more, kit/landmarks.js) and houses along the streets
 * (made up from the streets, kit/town.js), seen at a slant from above. The town is clear; where
 * it ends — over the fjord, the open land and past the last streets — it greys over and dissolves
 * into a haze that lies still there (hazeMap), with mist drifting over it.
 *
 * Each place in the work is a 3D marker, a listening station: a sphere floating over the place on a thin
 * beam of light, with a soft pool of light on the ground under it. The place you are at is white
 * and lit; the one that is playing sends rings out over the ground. Walking to another place glides
 * you there.
 *
 * The pointer tips and turns the view a little (it drifts by itself, too); a drag turns it further
 * and the wheel goes nearer or further. The places' names are buttons over their markers; one that is
 * out of view waits at the edge of the screen, pointing the way.
 *
 * @param {string} map           The name of a map in src/player/vaerker/maps.js
 * @param {object[]} places      [{ name, at, label? }]  at: [x, y] in the map's units
 * @param {number} here          The place you are at
 * @param {number|null} sounding The place whose story is playing
 * @param {(p: number) => void} onWalk
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GREYS, LIGHT, EDGES, vignetteMask, pixelRatio, fadeIn } from '@/player/kit/style';
import { maps } from '@/player/vaerker/maps';
import { makeHouses, makeTrees } from '@/player/kit/town';
import { houses as houseShapesOf } from '@/player/kit/houses';
import { trees as treeShapesOf } from '@/player/kit/trees';
import { landmarkGeometry } from '@/player/kit/landmarks';
import { pathLines, fillGeometry, bandGeometry } from '@/player/kit/roads';
import { hazeMap, hazedOverMap as hazed, HAZE_GLSL } from '@/player/kit/haze';
import { createStation } from '@/player/kit/station';

/* ---------- THE LOOK: the 3D style (kit/style.js) — greys, the streets muted, only the stations white ---------- */

const GROUND = GREYS.ground;
const WATER = GREYS.water;
const ZONE = GREYS.squares;           // the walking streets and the squares, soft under the streets
const QUAY = GREYS.sideStreets;       // the quay's edge
const PATH = { width: 1.8, color: GREYS.paths };   // widths with the soft edges; the solid middle is about 0.8 of it
const SIDE = { width: 5.5, color: GREYS.sideStreets };
const MAIN = { width: 9, color: GREYS.streets };
const LANDMARK = { wall: GREYS.landmark, roof: GREYS.landmarkRoof, band: GREYS.landmarkRoof, spire: GREYS.landmarkRoof };   // a step lighter than the houses
const EDGE = 150;                     // metres over which the map fades out at its own edges
const HAZE = new THREE.Color(GREYS.haze).convertLinearToSRGB().toArray();   // sRGB: the grey the haze fades into
const TOWN = [30, 140];               // metres from the nearest street: the town is clear within the first, lost in haze by the second
const MIST = GREYS.mist;
const REACH = { wide: 560, tall: 720 }; // metres from the camera to where you are, on a wide and a tall screen
const SCALE_AT = 700;                 // the markers are drawn their true size seen from this far, and grow with the distance

const TILT = 0.92, TILT_RANGE = 0.22; // radians above the horizon the view looks down from, and how far the pointer tips it
const TURN_RANGE = 0.32;              // radians the pointer turns it either way
const LABEL_TOP = 72;                 // px kept free at the top (the header)

/** Tileable soft noise for the mist, as a texture */
function mistTexture(seed) {
    const size = 128, out = new Float32Array(size * size);
    const hash = (x, y, o) => { const v = Math.sin(x * 127.1 + y * 311.7 + o * 74.7 + seed * 19.3) * 43758.5453; return v - Math.floor(v); };
    const smooth = (t) => t * t * (3 - 2 * t);
    let amp = 0.5, total = 0;
    for (let o = 0; o < 4; o++) {
        const cells = 4 << o;
        for (let y = 0; y < size; y++) {
            const fy = (y / size) * cells, yi = Math.floor(fy), ty = smooth(fy - yi);
            for (let x = 0; x < size; x++) {
                const fx = (x / size) * cells, xi = Math.floor(fx), tx = smooth(fx - xi);
                const a = hash(xi % cells, yi % cells, o), b = hash((xi + 1) % cells, yi % cells, o);
                const c = hash(xi % cells, (yi + 1) % cells, o), d = hash((xi + 1) % cells, (yi + 1) % cells, o);
                out[y * size + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
            }
        }
        total += amp;
        amp *= 0.5;
    }
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < out.length; i++) { const v = Math.round((out[i] / total) * 255); data.set([v, v, v, 255], i * 4); }
    const tex = new THREE.DataTexture(data, size, size);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
}

/* ---------- THE SCENE ---------- */

export default function WalkScene({ map: mapName, places, here, sounding, onWalk }) {
    const map = maps[mapName];
    const containerRef = useRef(null);
    const labelRefs = useRef([]);
    const state = useRef({ here, sounding });
    const [failed, setFailed] = useState(false);

    useEffect(() => { state.current.here = here; state.current.sounding = sounding; }, [here, sounding]);

    /** The map's units → metres on the ground, with the middle of the map at 0, 0 */
    const to = useMemo(() => {
        const k = map.metres ?? 1;
        return (x, y) => [(x - map.width / 2) * k, (y - map.height / 2) * k];
    }, [map]);

    /** Where each place is on the ground */
    const spots = useMemo(() => places.map((place) => new THREE.Vector2(...to(...(place.at ?? [map.width / 2, map.height / 2])))), [map, places, to]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        } catch {
            setFailed(true);
            return;
        }
        renderer.setPixelRatio(pixelRatio());
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        const canvas = renderer.domElement;
        canvas.className = 'absolute inset-0 size-full touch-none';
        // Faded out at the top (under the header) and the bottom (under the stories)
        canvas.style.maskImage = canvas.style.webkitMaskImage = vignetteMask;
        container.prepend(canvas);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 5, 6000);
        const extent = [...to(0, 0), ...to(map.width, map.height)];
        const haze = {
            uHazeMap: { value: null },   // made once the streets are drawn, below
            uHaze: { value: new THREE.Vector3(...HAZE) },
            uExtent: { value: new THREE.Vector4(...extent) },
        };

        scene.add(new THREE.HemisphereLight(LIGHT.sky, LIGHT.fromBelow, LIGHT.skyStrength));
        const sun = new THREE.DirectionalLight(LIGHT.sun, LIGHT.sunStrength);
        sun.position.set(-300, 420, 520);   // low from the south-south-west, so the spheres are lit from one side
        scene.add(sun);

        /* ---------- the town ---------- */

        let order = 0;
        const add = (geometry, material) => {
            if (!geometry) return null;
            const mesh = material.isLineBasicMaterial ? new THREE.LineSegments(geometry, material) : new THREE.Mesh(geometry, material);
            mesh.renderOrder = order++;
            mesh.frustumCulled = false;
            scene.add(mesh);
            return mesh;
        };
        // The faint edges (kit/style.js): lines in the haze like the rest
        const edgeMaterial = (strength) => new THREE.LineBasicMaterial({ color: GREYS.edge, transparent: true, opacity: strength, depthWrite: false });
        const flatMaterial = (color, opacity = 1) => hazed(new THREE.MeshBasicMaterial({ color, opacity, side: THREE.DoubleSide, depthWrite: false }), haze);
        const lines = (paths) => [paths ?? []].flat().flatMap((d) => pathLines(d, to));

        const [x0, z0] = to(0, 0), [x1, z1] = to(map.width, map.height);
        const R = Math.max(x1 - x0, z1 - z0) / 2;
        const ground = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
        add(ground, flatMaterial(GROUND));
        add(fillGeometry(lines(map.water), 0.04), flatMaterial(WATER));
        add(fillGeometry(lines(map.squares), 0.05), flatMaterial(ZONE));
        const zoneWidth = map.zoneWidth ?? 12;
        const streets = [
            { lines: lines(map.main), half: MAIN.width / 2 },
            { lines: lines(map.side), half: SIDE.width / 2 },
            { lines: lines(map.zone), half: zoneWidth / 2 },
            { lines: lines(map.path), half: PATH.width / 2 },
        ];
        const softMaterial = () => { const m = flatMaterial(0xffffff); m.vertexColors = true; return m; };
        add(bandGeometry(streets[2].lines, zoneWidth, 0.06, ZONE, streets), softMaterial());
        add(bandGeometry(lines(map.quay), 1.6, 0.08, QUAY), softMaterial());
        add(bandGeometry(streets[3].lines, PATH.width, 0.09, PATH.color, streets), softMaterial());
        add(bandGeometry(streets[1].lines, SIDE.width, 0.1, SIDE.color, streets), softMaterial());
        add(bandGeometry(streets[0].lines, MAIN.width, 0.12, MAIN.color, streets), softMaterial());
        haze.uHazeMap.value = hazeMap(streets, extent, { town: TOWN, edge: EDGE });

        /* ---------- the listening stations (kit/station.js): a sphere over each place, a pool of light under it ---------- */

        const stations = spots.map((spot, p) => {
            const station = createStation({ seed: p });
            station.pool.position.set(spot.x, 0.3, spot.y);
            station.pool.renderOrder = order++;
            station.pool.frustumCulled = false;
            station.group.position.set(spot.x, 0, spot.y);
            scene.add(station.pool, station.group);
            return station;
        });

        /* ---------- the landmarks (kit/landmarks.js); one named like a place lights up when you are there ---------- */

        const marks = Object.entries(map.landmarks ?? {}).map(([name, mark]) => {
            const ring = lines(mark.ring)[0];
            if (ring.length > 6 && ring[0] === ring.at(-2) && ring[1] === ring.at(-1)) ring.splice(-2);
            const material = hazed(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: 0xffffff, emissiveIntensity: 0 }), haze);
            const geometry = landmarkGeometry(mark, ring, LANDMARK);
            add(geometry, material);
            if (geometry) add(new THREE.EdgesGeometry(geometry, EDGES.angle), hazed(edgeMaterial(EDGES.landmark), haze));
            return { place: places.findIndex((place) => place.name === name), ring, material };
        });

        /* ---------- houses along the streets, made up from the streets (kit/town.js) ---------- */

        const houses = makeHouses({
            // The houses keep to the solid middle of each street's band
            streets: streets.map((st, i) => ({ lines: st.lines, half: st.half * 0.85, build: i !== 3 })),
            water: lines(map.water),
            squares: lines(map.squares),
            blocks: marks.map((m) => m.ring),
            clear: spots.filter((_, p) => !marks.some((m) => m.place === p)),
        });
        const houseShapes = houseShapesOf(houses, { up: 'y' });   // kit/houses.js, in the style's greys
        add(houseShapes, hazed(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), haze));
        if (houseShapes) add(new THREE.EdgesGeometry(houseShapes, EDGES.angle), hazed(edgeMaterial(EDGES.buildings), haze));

        /* ---------- trees on the promenade, on Axeltorv and in the yards (kit/trees.js, placed by kit/town.js) ---------- */

        const trees = makeTrees({
            streets: streets.map((st) => ({ lines: st.lines, half: st.half * 0.85 })),
            water: lines(map.water),
            squares: lines(map.squares),
            blocks: marks.map((m) => m.ring),
            houses,
            clear: spots,
            extent,
        });
        // kit/trees.js: the style's broad leafy tree, as tall as the old round ones; ground (x, z) is (x, −y) z up
        const treeShapes = treeShapesOf(trees.map((t) => ({ x: t.x, y: -t.z, height: t.size * 2.6, kind: 'beech' })), { seed: 11, up: 'y' });
        add(treeShapes, hazed(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), haze));

        /* ---------- mist drifting over the streets, thicker out in the distance ---------- */

        const mistTex = [mistTexture(3), mistTexture(11)];
        const mists = [{ y: 14, scale: 420, speed: [6, 2.5], amount: 0.2 }, { y: 32, scale: 640, speed: [-4, 3.5], amount: 0.2 }, { y: 58, scale: 900, speed: [3, -2], amount: 0.24 }].map((layer, i) => {
            const material = new THREE.ShaderMaterial({
                uniforms: { ...haze, uTex: { value: mistTex[i % 2] }, uShift: { value: new THREE.Vector2() }, uScale: { value: layer.scale }, uAmount: { value: layer.amount }, uColor: { value: new THREE.Color(MIST) } },
                vertexShader: 'varying vec3 vAt; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vAt = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
                fragmentShader: `
                    uniform sampler2D uTex; uniform vec2 uShift; uniform float uScale, uAmount; uniform vec3 uColor;
                    ${HAZE_GLSL}
                    varying vec3 vAt;
                    void main() {
                        float n = texture2D(uTex, vAt.xz / uScale + uShift).r * 0.6 + texture2D(uTex, vAt.xz / (uScale * 0.37) - uShift * 1.7).r * 0.4;
                        float h = hazeAt(vAt.xz);
                        vec2 out2 = max(uExtent.xy - vAt.xz, vAt.xz - uExtent.zw);
                        float beyond = 1.0 - smoothstep(0.0, 220.0, max(out2.x, out2.y));   // thinning out past the map's edge
                        gl_FragColor = vec4(uColor, smoothstep(0.38, 0.8, n) * uAmount * (0.12 + 0.88 * h) * beyond);
                    }`,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
            });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(R * 3, R * 3).rotateX(-Math.PI / 2), material);
            mesh.position.y = layer.y;
            mesh.renderOrder = 2000 + i;
            scene.add(mesh);
            return { mesh, material, layer };
        });

        /* ---------- size ---------- */

        const size = { w: 1, h: 1 };
        const widths = [];   // the names' widths in px
        const resize = () => {
            const { clientWidth: w, clientHeight: h } = container;
            if (!w || !h) return;
            size.w = w; size.h = h;
            widths.length = 0;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.fov = w < h ? 46 : 38;
            // Where you are stands a little above the middle, clear of the stories under it
            camera.setViewOffset(w, h, 0, (0.5 - (w < h ? 0.36 : 0.42)) * h, w, h);
            camera.updateProjectionMatrix();
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        /* ---------- the pointer: tips and turns; a drag turns further; the wheel goes nearer ---------- */

        const pointer = { x: 0, y: 0 };
        const view = { turn: 0, tilt: 0, zoom: 1 };
        let drag = null;
        const onMove = (e) => {
            if (drag && e.pointerId === drag.id) {
                view.turn -= ((e.clientX - drag.x) / size.w) * 2.4;
                view.tilt = THREE.MathUtils.clamp(view.tilt + ((e.clientY - drag.y) / size.h) * 1.2, -0.3, 0.45);
                drag.x = e.clientX; drag.y = e.clientY;
                return;
            }
            if (e.pointerType !== 'mouse') return;
            pointer.x = e.clientX / window.innerWidth - 0.5;
            pointer.y = e.clientY / window.innerHeight - 0.5;
        };
        const onDown = (e) => {
            drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
            try { canvas.setPointerCapture(e.pointerId); } catch { /* gone already */ }
        };
        const onUp = (e) => { if (drag?.id === e.pointerId) drag = null; };
        const onWheel = (e) => {
            e.preventDefault();
            view.zoom = THREE.MathUtils.clamp(view.zoom * Math.exp(e.deltaY * 0.0012), 0.45, 1.5);
        };
        window.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerdown', onDown);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });

        /* ---------- every frame ---------- */

        const focus = spots[state.current.here].clone();
        const eased = { x: 0, y: 0, turn: 0, tilt: 0, zoom: 1 };
        const v = new THREE.Vector3();
        let frame, last = performance.now(), t = 0;

        const tick = (time) => {
            frame = requestAnimationFrame(tick);
            const dt = Math.min((time - last) / 1000, 0.1);
            last = time;
            t += dt;
            const { here: at, sounding: playing } = state.current;

            // Walk: glide to the place you are going to
            const goal = spots[at];
            if (still) focus.copy(goal);
            else focus.lerp(goal, 1 - Math.exp(-dt * 1.8));

            // The view: the pointer, a drag, the wheel, and a slow drift of its own
            const k = 1 - Math.exp(-dt * 3);
            eased.x += (pointer.x + (still ? 0 : Math.sin(t * 0.21) * 0.12) - eased.x) * k;
            eased.y += (pointer.y - eased.y) * k;
            eased.turn += (view.turn - eased.turn) * k;
            eased.tilt += (view.tilt - eased.tilt) * k;
            eased.zoom += (view.zoom - eased.zoom) * k;
            const yaw = eased.turn + eased.x * TURN_RANGE * 2;
            const pitch = THREE.MathUtils.clamp(TILT + eased.tilt - eased.y * TILT_RANGE, 0.45, 1.45);
            const reach = (size.w < size.h ? REACH.tall : REACH.wide) * eased.zoom;
            camera.position.set(focus.x + Math.sin(yaw) * Math.cos(pitch) * reach, Math.sin(pitch) * reach, focus.y + Math.cos(yaw) * Math.cos(pitch) * reach);
            camera.lookAt(focus.x, 0, focus.y);

            // The stations: the one you are at is lit; the playing one rings out
            stations.forEach((station, p) => {
                station.group.scale.setScalar(reach / SCALE_AT);
                station.update(dt, t, { here: p === at, sounding: p === playing, still });
                for (const mark of marks) if (mark.place === p) mark.material.emissiveIntensity = station.lit * 0.35;
            });

            mists.forEach(({ material, layer }) => {
                if (!still) material.uniforms.uShift.value.set((t * layer.speed[0]) / layer.scale, (t * layer.speed[1]) / layer.scale);
            });

            renderer.render(scene, camera);

            // The names over the markers; one out of view waits at the edge, pointing the way
            const bottom = size.h * (size.w < size.h ? 0.6 : 0.68);
            const labels = [];
            spots.forEach((spot, p) => {
                const el = labelRefs.current[p];
                if (!el) return;
                v.set(spot.x, stations[p].ball.position.y * stations[p].group.scale.y, spot.y).project(camera);
                const behind = v.z > 1;
                let x = ((v.x + 1) / 2) * size.w, y = ((1 - v.y) / 2) * size.h;
                if (behind) { x = size.w - x; y = bottom; }
                const cx = THREE.MathUtils.clamp(x, 28, size.w - 28);
                let cy = THREE.MathUtils.clamp(y, LABEL_TOP, bottom);
                const away = behind || cx !== x || cy !== y;
                // Out of view, the name stands on the side towards the middle of the screen; in view, on its
                // own side unless it would run off the edge there
                let side = places[p].label ?? 'right';
                if (away) side = cx !== x || behind ? (cx > size.w / 2 ? 'left' : 'right') : cy < y ? 'above' : 'below';
                if (!widths[p]) widths[p] = el.lastElementChild?.offsetWidth ?? 0;   // measured once (again after a resize)
                const width = widths[p] + 24;
                if (side === 'left' && cx - width < 0) side = 'right';
                else if (side === 'right' && cx + width > size.w) side = 'left';
                else if ((side === 'above' || side === 'below') && (cx - width / 2 < 0 || cx + width / 2 > size.w)) side = cx > size.w / 2 ? 'left' : 'right';
                // Names out of view that would cover one another move apart, down from the top or up from the bottom
                const box = (cy) => {
                    const [x0, y0] = side === 'right' ? [cx + 16, cy - 12] : side === 'left' ? [cx - 16 - width, cy - 12] : [cx - width / 2, side === 'above' ? cy - 48 : cy + 24];
                    return [x0, y0, x0 + width, y0 + 24];
                };
                for (let tries = 0; away && tries < labels.length + 1; tries++) {
                    const [x0, y0, x1, y1] = box(cy);
                    if (!labels.some((o) => x0 < o.box[2] && x1 > o.box[0] && y0 < o.box[3] && y1 > o.box[1])) break;
                    cy += cy < size.h / 2 ? 28 : -28;
                }
                labels.push({ box: box(cy) });
                el.style.transform = `translate(${cx}px, ${cy}px)`;
                el.dataset.away = away ? 'true' : 'false';
                el.dataset.side = side;
                const arrow = el.querySelector('[data-arrow]');
                if (arrow) arrow.style.transform = `rotate(${Math.atan2(y - cy, x - cx)}rad)`;
            });
        };
        frame = requestAnimationFrame(tick);
        fadeIn(canvas);   // the way into the room: a toning (STIL.md)

        return () => {
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            window.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            canvas.removeEventListener('wheel', onWheel);
            scene.traverse((obj) => {
                obj.geometry?.dispose();
                (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m?.dispose());
            });
            mistTex.forEach((tex) => tex.dispose());
            haze.uHazeMap.value?.dispose();
            renderer.dispose();
            canvas.remove();
        };
    }, [map, places, spots, to]);

    return (
        <div ref={containerRef} className='absolute inset-0'>
            <nav aria-label='Steder' className={failed ? 'absolute inset-x-0 top-1/3 flex flex-wrap justify-center gap-3 px-gutter' : 'absolute inset-0 pointer-events-none'}>
                {places.map((place, p) => {
                    const isHere = p === here;
                    return (
                        <button
                            key={place.name}
                            ref={(el) => { labelRefs.current[p] = el; }}
                            data-side={place.label ?? 'right'}
                            onClick={() => onWalk(p)}
                            aria-current={isHere ? 'location' : undefined}
                            className={`${failed ? 'relative' : 'absolute left-0 top-0'} group pointer-events-auto cursor-pointer`}
                            style={failed ? undefined : { transform: 'translate(-999px, -999px)' }}
                        >
                            {/* The marker's sphere is under the middle of this: a target the size of a finger */}
                            <span className='absolute -left-6 -top-6 size-12 rounded-full' />
                            <span className={`absolute whitespace-nowrap uppercase leading-none text-xs px-1.5 py-1 transition-colors ${SIDES} ${isHere ? 'text-paper' : 'text-muted md:group-hover:text-paper'} group-data-[away=true]:bg-ink/60 group-data-[away=true]:backdrop-blur-sm`} style={failed ? { position: 'static', transform: 'none' } : undefined}>
                                <span data-arrow className='hidden group-data-[away=true]:inline-block mr-1.5'>→</span>
                                {place.name}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}

/** Where a place's name stands round its marker: data-side on the button (right, left, above, below) */
const SIDES = [
    'group-data-[side=right]:left-4 group-data-[side=right]:top-0 group-data-[side=right]:-translate-y-1/2',
    'group-data-[side=left]:right-4 group-data-[side=left]:top-0 group-data-[side=left]:-translate-y-1/2',
    'group-data-[side=above]:bottom-6 group-data-[side=above]:left-0 group-data-[side=above]:-translate-x-1/2',
    'group-data-[side=below]:top-6 group-data-[side=below]:left-0 group-data-[side=below]:-translate-x-1/2',
].join(' ');
