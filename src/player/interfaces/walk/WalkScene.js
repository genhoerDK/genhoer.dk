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
 * The view is locked: no turning, tipping, dragging or zooming, and no drift. It shows the place
 * you are at, and walking to another (the arrows in Walk.js, or a place's name) glides you there.
 * The places' names are buttons over their markers, shown while the place is in view.
 *
 * @param {string} map           The name of a map in src/player/vaerker/maps.js
 * @param {object[]} places      [{ name, at, label? }]  at: [x, y] in the map's units
 * @param {number} here          The place you are at
 * @param {number|null} sounding The place whose story is playing
 * @param {(p: number) => void} onWalk
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { pixelRatio, vignetteMask, fadeIn } from '@/player/kit/style';
import { maps } from '@/player/vaerker/maps';
import { buildTownMap } from '@/player/kit/townmap';
import { createStation } from '@/player/kit/station';

/* ---------- THE VIEW: the town is the style's (kit/townmap.js); only the stations are white ---------- */

const REACH = { wide: 560, tall: 720 }; // metres from the camera to where you are, on a wide and a tall screen
const SCALE_AT = 700;                 // the markers are drawn their true size seen from this far, and grow with the distance
const TILT = 0.92;                    // radians above the horizon the view looks down from (locked)
const LABEL_TOP = 72;                 // px kept free at the top (the header)

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

        /* ---------- the town: streets, landmarks, houses, trees, haze and mist (kit/townmap.js) ---------- */

        const placesOnMarks = new Set(places.map((place, p) => (map.landmarks?.[place.name] ? p : -1)));
        const town = buildTownMap({
            scene, map, to,
            clear: { houses: spots.filter((_, p) => !placesOnMarks.has(p)), trees: spots },
        });

        /* ---------- the listening stations (kit/station.js): a sphere over each place, a pool of light under it ---------- */

        const stations = spots.map((spot, p) => {
            const station = createStation({ seed: p });
            station.pool.position.set(spot.x, 0.3, spot.y);
            station.pool.renderOrder = town.next();
            station.pool.frustumCulled = false;
            station.group.position.set(spot.x, 0, spot.y);
            scene.add(station.pool, station.group);
            return station;
        });

        // A landmark named like a place lights up when you are there
        const marks = town.marks.map((mark) => ({ ...mark, place: places.findIndex((place) => place.name === mark.name) }));

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

        const placeCamera = (at, reach) => {
            camera.position.set(at.x, Math.sin(TILT) * reach, at.y + Math.cos(TILT) * reach);
            camera.lookAt(at.x, 0, at.y);
        };

        const v = new THREE.Vector3();
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        /* ---------- every frame ---------- */

        const focus = spots[state.current.here].clone();
        const reach = () => (size.w < size.h ? REACH.tall : REACH.wide);
        let frame, last = performance.now(), t = 0;

        const tick = (time) => {
            frame = requestAnimationFrame(tick);
            const dt = Math.min((time - last) / 1000, 0.1);
            last = time;
            t += dt;
            const { here: at, sounding: playing } = state.current;

            // Glide to the place you are at
            focus.lerp(spots[at], still ? 1 : 1 - Math.exp(-dt * 1.8));
            placeCamera(focus, reach());

            // The stations: the one you are at is lit; the playing one rings out
            stations.forEach((station, p) => {
                station.group.scale.setScalar(reach() / SCALE_AT);
                station.update(dt, t, { here: p === at, sounding: p === playing, still });
                for (const mark of marks) if (mark.place === p) mark.material.emissiveIntensity = station.lit * 0.35;
            });

            town.update(t, still);

            renderer.render(scene, camera);

            // The names over the markers, only for the places in view
            const bottom = size.h * (size.w < size.h ? 0.6 : 0.68);
            spots.forEach((spot, p) => {
                const el = labelRefs.current[p];
                if (!el) return;
                v.set(spot.x, stations[p].ball.position.y * stations[p].group.scale.y, spot.y).project(camera);
                const x = ((v.x + 1) / 2) * size.w, y = ((1 - v.y) / 2) * size.h;
                const inView = v.z <= 1 && x >= 0 && x <= size.w && y >= LABEL_TOP && y <= bottom;
                el.style.visibility = inView ? 'visible' : 'hidden';
                if (!inView) return;
                // On its own side, unless it would run off the edge there
                let side = places[p].label ?? 'right';
                if (!widths[p]) widths[p] = el.lastElementChild?.offsetWidth ?? 0;   // measured once (again after a resize)
                const width = widths[p] + 24;
                if (side === 'left' && x - width < 0) side = 'right';
                else if (side === 'right' && x + width > size.w) side = 'left';
                else if ((side === 'above' || side === 'below') && (x - width / 2 < 0 || x + width / 2 > size.w)) side = x > size.w / 2 ? 'left' : 'right';
                el.style.transform = `translate(${x}px, ${y}px)`;
                el.dataset.side = side;
            });
        };
        frame = requestAnimationFrame(tick);
        fadeIn(canvas);   // the way into the room: a toning (STIL.md)

        return () => {
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            scene.traverse((obj) => {
                obj.geometry?.dispose();
                (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m?.dispose());
            });
            town.dispose();
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
                            <span className={`absolute whitespace-nowrap uppercase leading-none text-xs px-1.5 py-1 transition-colors ${SIDES} ${isHere ? 'text-paper' : 'text-muted md:group-hover:text-paper'}`} style={failed ? { position: 'static', transform: 'none' } : undefined}>
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
