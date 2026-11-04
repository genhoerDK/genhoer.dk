'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { colors } from '@/styles/colors';
import { formatDates } from '@/utilities/formatDates';
import { useIsPortrait } from '@/hooks/useIsPortrait';
import BackgroundImage from '@/components/Layout/BackgroundImage';
import Label from '@/components/UI/Label';
import Text from '@/components/UI/Text';

const MIN_DURATION = 1200;      // ms, shortest zoom between two kommuner
const MAX_DURATION = 2600;      // ms, longest zoom (far apart, e.g. Jylland → Sjælland)
const MARKER_RADIUS = 6;        // px on screen, independent of zoom
const SWIPE_THRESHOLD = 50;     // px of horizontal finger movement that changes project
const COVER_OPACITY = 0.6;      // cover image in the kommune; the white fill shows through, so lower = paler

// Same file and Bornholm offset as the map in components/Map (Bornholm is moved closer to the rest of Denmark)
async function loadKommuner() {
    const topology = await d3.json('/map_low_modified.json');
    return topojson.feature(topology, topology.objects.kommuner);
}
const mapCoordinates = ({ coordinates: [lon, lat], komkode }) =>
    komkode === '0400' || komkode === '0411' ? [lon - 2.5, lat + 2] : [lon, lat];

// Where the kommune sits on screen and how much of the screen it may fill
function layout(width, height, isPortrait) {
    return isPortrait
        ? { anchor: [width * 0.5, height * 0.46], fill: [0.5, 0.26] }
        : { anchor: [width * 0.5, height * 0.46], fill: [0.3, 0.46] };
}

// Front page: upcoming projects on a map of Denmark. Each project zooms the map to its kommune,
// filled with its cover image. Title and dates sit in the bottom left corner.
export default function UpcomingMap({ projects }) {
    const isPortrait = useIsPortrait();
    const containerRef = useRef(null);
    const svgRef = useRef(null);
    const clipId = useId().replace(/:/g, ''); // unique clipPath ids, valid inside url(#…)
    const map = useRef(null);         // { geo, path, g, markers, width, height, view }
    const run = useRef(0);            // increases per zoom, so an interrupted zoom doesn't reveal the card

    const [ready, setReady] = useState(false);
    const [active, setActive] = useState(0);        // project the map shows / is moving to
    const [shown, setShown] = useState(0);          // project in the card (changes while it is hidden)
    const [cardVisible, setCardVisible] = useState(false);

    const count = projects.length;
    const go = useCallback((index) => setActive((index + count) % count), [count]);

    // Kommune outline in map pixels and the zoom view [x, y, width] that puts it at the anchor
    const viewFor = useCallback((project) => {
        const { geo, path, width, height } = map.current;
        const features = geo.features.filter((f) => f.properties.KOMKODE === project.komkode);
        const [[x0, y0], [x1, y1]] = path.bounds({ type: 'FeatureCollection', features });
        const { fill } = layout(width, height, isPortrait);
        const k = Math.max(2, Math.min(14, (width * fill[0]) / (x1 - x0), (height * fill[1]) / (y1 - y0)));
        return [(x0 + x1) / 2, (y0 + y1) / 2, width / k];
    }, [isPortrait]);

    const applyView = useCallback(([cx, cy, w]) => {
        const { g, markers, width, height } = map.current;
        const [ax, ay] = layout(width, height, isPortrait).anchor;
        const k = width / w;
        map.current.view = [cx, cy, w];
        g.attr('transform', `translate(${ax - cx * k},${ay - cy * k}) scale(${k})`);
        markers.attr('r', MARKER_RADIUS / k);
    }, [isPortrait]);

    // Load the map once
    useEffect(() => {
        let cancelled = false;
        loadKommuner().then((geo) => {
            if (cancelled) return;
            map.current = { geo };
            setReady(true);
        });
        return () => { cancelled = true; };
    }, []);

    // Draw (and redraw on resize). Jumps straight to the active project, no animation.
    useEffect(() => {
        if (!ready) return;
        const container = containerRef.current;

        const draw = () => {
            const { width, height } = container.getBoundingClientRect();
            if (!width || !height) return;
            const { geo } = map.current;
            const projection = d3.geoMercator().fitExtent([[0, 0], [width, height]], geo);
            const path = d3.geoPath(projection);

            const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${width} ${height}`);
            svg.interrupt();
            const g = svg.selectAll('g.upcoming-map').data([null]).join('g').attr('class', 'upcoming-map');

            g.selectAll('path.kommune')
                .data(geo.features)
                .join('path')
                .attr('class', 'kommune')
                .attr('d', path)
                .attr('fill', colors.paper)
                .attr('stroke', colors.paper)
                .attr('stroke-width', 0.6)
                .attr('vector-effect', 'non-scaling-stroke')
                .style('transition', 'fill-opacity 700ms ease, stroke-opacity 700ms ease');

            // Each project's cover image, cut to the shape of its kommune and drawn on top of the white fill
            const kommuneOf = (project) => ({ type: 'FeatureCollection', features: geo.features.filter((f) => f.properties.KOMKODE === project.komkode) });
            svg.selectAll('defs').data([null]).join('defs')
                .selectAll('clipPath')
                .data(projects, (d) => d.slug)
                .join((enter) => enter.append('clipPath').call((c) => c.append('path')))
                .attr('id', (d) => `${clipId}-${d.slug}`)
                .select('path')
                .attr('d', (d) => path(kommuneOf(d)));

            g.selectAll('image.cover')
                .data(projects, (d) => d.slug)
                .join('image')
                .attr('class', 'cover')
                .attr('href', (d) => d.coverImageSmall)
                .attr('preserveAspectRatio', 'xMidYMid slice')
                .attr('clip-path', (d) => `url(#${clipId}-${d.slug})`)
                .each(function (d) {
                    const [[x0, y0], [x1, y1]] = path.bounds(kommuneOf(d));
                    d3.select(this).attr('x', x0).attr('y', y0).attr('width', x1 - x0).attr('height', y1 - y0);
                })
                .style('transition', 'opacity 700ms ease')
                .on('error', function () { d3.select(this).attr('display', 'none'); }); // keep the white fill, not a broken image

            const markers = g.selectAll('circle.marker')
                .data(projects, (d) => d.slug)
                .join('circle')
                .attr('class', 'marker')
                .attr('cx', (d) => projection(mapCoordinates(d))[0])
                .attr('cy', (d) => projection(mapCoordinates(d))[1])
                .attr('fill', colors.ink)
                .attr('stroke', colors.paper)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', 3.14)
                .attr('vector-effect', 'non-scaling-stroke');

            Object.assign(map.current, { path, g, markers, width, height });
            highlight(g, projects[active]);
            applyView(viewFor(projects[active]));
        };

        draw();
        const observer = new ResizeObserver(draw);
        observer.observe(container);
        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `active` is handled by the zoom effect below
    }, [ready, projects, viewFor, applyView]);

    // Zoom to the active project: hide the card, fly out and in (d3.interpolateZoom), then show the card
    useEffect(() => {
        if (!ready || !map.current.g) return;
        const id = ++run.current;
        const { g, view: from } = map.current;
        const project = projects[active];
        const to = viewFor(project);
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Swap the card's content while it is hidden, then fade it in
        const reveal = () => {
            if (id !== run.current) return;
            highlight(g, project);
            setShown(active);
            setCardVisible(true);
        };

        const alreadyThere = from && from.every((v, i) => Math.abs(v - to[i]) < 0.5);
        if (reduceMotion || !from || alreadyThere) {
            applyView(to);
            reveal();
            return;
        }

        setCardVisible(false);
        highlight(g, null);
        const zoom = d3.interpolateZoom(from, to);
        const duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, zoom.duration * 1.1));

        d3.select(svgRef.current)
            .interrupt()
            .transition()
            .duration(duration)
            .ease(d3.easeCubicInOut)
            .tween('zoom', () => (t) => applyView(zoom(t)))
            .end()
            .then(reveal, () => {}); // rejected when a newer zoom interrupts this one
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on project change only
    }, [active, ready]);

    // Swipe on touch screens
    const touchStart = useRef(null);
    const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
        if (touchStart.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(dx) > SWIPE_THRESHOLD) go(active + (dx < 0 ? 1 : -1));
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowRight') go(active + 1);
        if (e.key === 'ArrowLeft') go(active - 1);
    };

    const project = projects[shown];

    return (
        <section
            aria-roledescription="karrusel"
            aria-label="Kommende projekter"
            className="relative h-page md:pt-24 md:pb-4 md:mx-4 overflow-hidden animate-fade-in"
            onKeyDown={onKeyDown}
        >
            <div
                ref={containerRef}
                className="relative size-full overflow-hidden bg-ink text-paper"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                {projects.map((p, i) => (
                    <BackgroundImage key={p.slug} portrait={p.coverImagePortrait} landscape={p.coverImageLandscape} visible={i === active} />
                ))}

                <svg ref={svgRef} className="absolute inset-0 size-full pointer-events-none" aria-hidden="true" />

                {/* ── Heading ── */}
                <div className="absolute top-14 left-4 md:top-6 md:left-6 flex items-baseline gap-3">
                    <h2><Label size="lg" className="font-bold tracking-wider">Kommende projekter</Label></h2>
                    {count > 1 && <Label size="lg" className="opacity-60 tabular-nums" as="span">{active + 1} / {count}</Label>}
                </div>

                {/* ── Title and dates, bottom left ── */}
                <div
                    className="absolute w-2/3 left-4 bottom-24 pointer-events-none md:left-6 md:bottom-16 md:w-[40vw] md:max-w-xl"
                    aria-live="polite"
                >
                    <div className={`transition-[opacity,translate] duration-500 ease-out ${cardVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                        <h3 className="font-black uppercase leading-none" style={{ fontSize: 'clamp(1rem, 5vw, 2rem)' }}>{project.title}</h3>
                        <Text size="small" className="mt-1">{formatDates(project.startDate, project.endDate)}</Text>
                    </div>
                </div>

                {count > 1 && (
                    <>
                        {/* ── Pagination lines ── */}
                        <div className="absolute left-4 bottom-[60px] md:bottom-[18px] flex gap-2">
                            {projects.map((p, i) => (
                                <button key={p.slug} onClick={() => go(i)} aria-label={`Vis ${p.title}`} aria-current={i === active} className="py-3 cursor-pointer">
                                    <span className={`block h-px transition-all duration-300 ${i === active ? 'w-8 bg-paper/80' : 'w-4 bg-paper/25'}`} />
                                </button>
                            ))}
                        </div>

                        {/* ── Arrows ── */}
                        <div className="absolute right-4 bottom-[56px] md:bottom-[14px] flex gap-1.5">
                            <ArrowButton onClick={() => go(active - 1)} label="Forrige projekt"><ChevronLeftIcon className="size-4" /></ArrowButton>
                            <ArrowButton onClick={() => go(active + 1)} label="Næste projekt"><ChevronRightIcon className="size-4" /></ArrowButton>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}

function ArrowButton({ onClick, label, children }) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            className="grid place-items-center size-8 border border-paper/50 text-paper cursor-pointer transition-colors duration-200 hover:bg-paper hover:text-ink focus-visible:outline-1 focus-visible:outline-paper"
        >
            {children}
        </button>
    );
}

// Active kommune filled with the project's cover image (white underneath while it loads), all others as thin outlines.
// project = null: outlines only.
function highlight(g, project) {
    // style (not attr), so the CSS transition set in the draw effect fades the change
    g.selectAll('path.kommune')
        .style('fill-opacity', (f) => (project && f.properties.KOMKODE === project.komkode ? 1 : 0))
        .style('stroke-opacity', (f) => (project && f.properties.KOMKODE === project.komkode ? 1 : 0.18));
    g.selectAll('image.cover')
        .style('opacity', (d) => (project && d.slug === project.slug ? COVER_OPACITY : 0));
}
