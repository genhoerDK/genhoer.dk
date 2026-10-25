"use client";

import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import { projects } from "@/data/projects";
import { getProjectsByStatus } from "@/utilities/projectsByStatus";
import { loadKommuner, drawMap, highlightProject, resetHighlight, ZOOM_SCALE, HIGHLIGHT_DELAY, DURATION } from "@/components/Map/mapDrawing";

// Desktop map: hover a marker to zoom in on its kommune, click to open the project
export default function MapLarge({ setActiveProject, onMarkerNavigate }) {
    const svgRef = useRef(null);
    const router = useRouter();

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
            const paddingTop = 64;
            const paddingBottom = 48;
            const paddingX = 16;

            svg.selectAll("*").remove();

            svg
                .attr("viewBox", `0 0 ${width} ${height}`)
                .attr("preserveAspectRatio", "xMidYMid meet");

            if (!geoData) return;

            const projection = d3
                .geoMercator()
                .fitExtent([[paddingX, paddingTop], [width - paddingX, height - paddingBottom]], geoData);

            const position = (d) => projection(d.coordinates);
            const g = svg.append("g");

            const { openedGroups } = drawMap(g, geoData, projection, {
                upcoming,
                opened,
                position,
                labelOffsetKey: "labelOffsetLarge",
            });

            openedGroups
                .on("mouseenter", (event, d) => {
                    // Zoom in so the marker stays under the mouse
                    const [x, y] = position(d);
                    const [mouseX, mouseY] = d3.pointer(event, g.node());
                    const translateX = mouseX - x * ZOOM_SCALE;
                    const translateY = mouseY - y * ZOOM_SCALE;

                    setActiveProject(d);

                    g.transition()
                        .delay(HIGHLIGHT_DELAY)
                        .duration(DURATION)
                        .attr("transform", `translate(${translateX},${translateY}) scale(${ZOOM_SCALE})`);

                    highlightProject(g, d, 4);
                })
                .on("mouseleave", () => {
                    g.transition()
                        .duration(DURATION)
                        .attr("transform", `translate(0,0) scale(1)`);

                    resetHighlight(g);
                    setActiveProject(null);
                })
                .on("click", (event, d) => {
                    onMarkerNavigate?.();
                    router.push(`/${d.slug}`);
                });
        };

        loadKommuner("/map_low.json").then((data) => {
            geoData = data;
            renderMap();
        });

        window.addEventListener("resize", renderMap);
        return () => window.removeEventListener("resize", renderMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draw once on mount; d3 owns the svg after that
    }, []);

    return <svg ref={svgRef} className="relative w-full h-svh" />;
}
