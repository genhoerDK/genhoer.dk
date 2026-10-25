"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import { projects } from "@/data/projects";
import { getProjectsByStatus } from "@/utilities/projectsByStatus";
import { loadKommuner, drawMap, highlightProject, resetHighlight, ZOOM_SCALE, MARKER_RADIUS, MARKER_STROKE_WIDTH, DURATION } from "@/components/Map/mapDrawing";

const USER_ZOOM_MAX = 3;             // Max pinch zoom
const MARKER_RADIUS_AT_MAX_ZOOM = 4; // Markers shrink while zooming so they don't cover each other

// Mobile map: pinch to zoom, tap a marker to select it (MapControls then shows "Se mere")
export default function MapSmall({ activeProject, setActiveProject }) {
    const svgRef = useRef(null);
    const activeProjectRef = useRef(null);
    const zoomRef = useRef(null);

    useEffect(() => {
        activeProjectRef.current = activeProject;
    }, [activeProject]);

    useEffect(() => {
        const { upcoming, opened } = getProjectsByStatus(projects);
        let geoData = null;

        const renderMap = () => {
            if (!svgRef.current) return;
            const svg = d3.select(svgRef.current);
            const container = svgRef.current.parentElement;
            if (!container) return;

            const width = container.offsetWidth;
            const height = container.offsetHeight;
            const paddingTop = 48;
            const paddingBottom = 48;
            const paddingX = 8;

            svg.selectAll("*").remove();

            svg.attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");

            if (!geoData) return;

            const projection = d3
                .geoMercator()
                .fitExtent([[paddingX, paddingTop], [width - paddingX, height - paddingBottom]], geoData);

            // Bornholm + Christiansø are moved closer to the rest of Denmark in map_low_modified.json,
            // so their markers are moved the same way
            const position = (d) => {
                const [lon, lat] = d.coordinates;
                const isBornholm = d.komkode === "0400" || d.komkode === "0411";
                return projection(isBornholm ? [lon - 2.5, lat + 2] : [lon, lat]);
            };

            const g = svg.append("g");

            const { upcomingMarkers, openedGroups, openedMarkers } = drawMap(g, geoData, projection, {
                upcoming,
                opened,
                position,
                labelOffsetKey: "labelOffsetSmall",
            });

            const radiusForZoom = (k) => {
                const t = Math.max(0, Math.min(1, (k - 1) / (USER_ZOOM_MAX - 1)));
                return MARKER_RADIUS + (MARKER_RADIUS_AT_MAX_ZOOM - MARKER_RADIUS) * t;
            };

            // User zoom and pan — blocked while a project is selected
            const zoom = d3
                .zoom()
                .scaleExtent([1, USER_ZOOM_MAX])
                .translateExtent([
                    [0, 0],
                    [width, height],
                ])
                .filter(() => !activeProjectRef.current)
                .on("zoom", (event) => {
                    g.attr("transform", event.transform);
                    const r = radiusForZoom(event.transform.k);
                    const strokeWidth = Math.max(0.5, MARKER_STROKE_WIDTH * (r / MARKER_RADIUS));
                    upcomingMarkers.attr("r", r).attr("stroke-width", strokeWidth);
                    openedMarkers.attr("r", r).attr("stroke-width", strokeWidth);
                });

            svg.call(zoom);
            zoomRef.current = zoom;

            openedGroups.on("click", (event, d) => {
                if (activeProjectRef.current) return;
                event.stopPropagation();
                setActiveProject(d);

                // Zoom in so the marker ends up in the center
                const [x, y] = position(d);
                const translateX = width / 2 - x * ZOOM_SCALE;
                const translateY = height / 2 - y * ZOOM_SCALE;
                const t = d3.zoomIdentity.translate(translateX, translateY).scale(ZOOM_SCALE);

                svg.transition().duration(DURATION).call(zoom.transform, t);

                highlightProject(g, d, 3);
                openedMarkers.style("cursor", "default");
            });
        };

        loadKommuner("/map_low_modified.json").then((data) => {
            geoData = data;
            renderMap();
        });

        // Deselect when the window grows to desktop size (Map then switches to MapLarge)
        const handleResize = () => {
            if (window.innerWidth >= 768) setActiveProject(null);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draw once on mount; d3 owns the svg after that
    }, []);

    /** Reset zoom and highlight when the selection is cleared */
    useEffect(() => {
        if (activeProject !== null || !svgRef.current || !zoomRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.transition().duration(DURATION).call(zoomRef.current.transform, d3.zoomIdentity);
        resetHighlight(svg.select("g"));
    }, [activeProject]);

    return <svg ref={svgRef} className="relative w-full h-svh" />;
}
