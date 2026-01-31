"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { projects } from "@/data/projects";

export default function MapSmall({ activeProject, setActiveProject }) {
    const svgRef = useRef(null);
    const activeProjectRef = useRef(null);
    const zoomRef = useRef(null);

    useEffect(() => {
        activeProjectRef.current = activeProject;
    }, [activeProject]);

    useEffect(() => {
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

            const getCoordinates = (d) => {
                const [lon, lat] = d.coordinates;

                // Bornholm + Christiansø
                if (d.komkode === "0400" || d.komkode === "0411") {
                    return [lon - 2.5, lat + 2];
                }

                return [lon, lat];
            };

            const path = d3.geoPath().projection(projection);
            const g = svg.append("g");

            // Draw the map
            g.selectAll("path")
                .data(geoData.features)
                .join("path")
                .attr("d", path)
                .attr("fill", "#27272A")
                .attr("fill-opacity", 1)
                .attr("stroke", "#27272A")
                .attr("stroke-width", 0.25)
                .attr("stroke-opacity", 1);

            // Zoom amount on clicking marker
            const clickZoomScale = 6;

            // Draw the markers
            const markerRadius = 6;
            const markerStrokeWidth = 2;

            const markers = g
                .selectAll(".marker")
                .data(projects)
                .enter()
                .append("circle")
                .attr("class", "marker")
                .attr("cx", (d) => projection(getCoordinates(d))[0])
                .attr("cy", (d) => projection(getCoordinates(d))[1])
                .attr("r", markerRadius)
                .attr("fill", "#71717A")
                .attr("stroke", "#FAFAFA")
                .attr("stroke-width", markerStrokeWidth)
                .style("cursor", "pointer")
                .on("click", function (event, d) {
                    if (activeProjectRef.current) return;
                    event.stopPropagation();
                    setActiveProject(d);

                    const [x, y] = projection(getCoordinates(d));

                    const centerX = width / 2;
                    const centerY = height / 2;
                    const translateX = centerX - x * clickZoomScale;
                    const translateY = centerY - y * clickZoomScale;
                    const t = d3.zoomIdentity.translate(translateX, translateY).scale(clickZoomScale);

                    svg.transition().duration(500).call(zoom.transform, t);

                    g.selectAll("path")
                        .transition()
                        .delay(200)
                        .duration(500)
                        .attr("fill", (p) => (p.properties.KOMKODE === d.komkode ? "#FAFAFA" : "#27272A"))
                        .attr("fill-opacity", (p) => (p.properties.KOMKODE === d.komkode ? 1 : 0))
                        .attr("stroke", "#FAFAFA")
                        .attr("stroke-opacity", (p) => (p.properties.KOMKODE === d.komkode ? 1 : 0.1));

                    markers
                        .transition()
                        .delay(200)
                        .duration(500)
                        .attr("r", (r) => (r === d ? 3 : 0))
                        .attr("fill", "#27272A")
                        .attr("stroke-width", 1)
                        .style("cursor", "default");
                });

            const userZoomExtent = 3;
            const maxMarkerRadiusZoom = 4;

            const radiusForMarker = (k) => {
                const t = Math.max(0, Math.min(1, (k - 1) / (userZoomExtent - 1)));
                return markerRadius + (maxMarkerRadiusZoom - markerRadius) * Math.pow(t, 1);
            };

            // User zoom and pan
            const zoom = d3
                .zoom()
                .scaleExtent([1, userZoomExtent])
                .translateExtent([
                    [0, 0],
                    [width, height],
                ])
                // Block zoom/pan when project is active
                .filter((event) => {
                    return !activeProjectRef.current;
                })
                .on("zoom", (event) => {
                    g.attr("transform", event.transform);
                    // Scale markers to zoom
                    const k = event.transform.k;
                    const r = radiusForMarker(k);
                    markers
                        .attr("r", r)
                        .attr("stroke-width", Math.max(0.5, markerStrokeWidth * (r / markerRadius)));
                });

            svg.call(zoom);
            zoomRef.current = zoom;
        };

        d3.json("/map_low_modified.json").then((topology) => {
            geoData = topojson.feature(topology, topology.objects["kommuner"]);
            renderMap();
        });

        window.addEventListener("resize", () => {
            window.innerWidth >= 768 && setActiveProject(null);
        });

        return () => window.removeEventListener("resize", renderMap);
    }, []);

    /** Reset project selection */
    useEffect(() => {
        if (activeProject === null && svgRef.current && zoomRef.current) {
            const svg = d3.select(svgRef.current);
            const g = svg.select("g");
            const markerRadius = 6;
            const markerStrokeWidth = 2;

            // Reset zoom
            svg.transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);

            // Reset paths
            g.selectAll("path")
                .transition()
                .duration(500)
                .attr("fill", "#27272A")
                .attr("fill-opacity", 1)
                .attr("stroke", "#27272A")
                .attr("stroke-opacity", 1);

            // Reset markers
            g.selectAll(".marker")
                .transition()
                .duration(500)
                .attr("r", markerRadius)
                .attr("fill", "#71717A")
                .attr("stroke-width", markerStrokeWidth)
                .style("cursor", "pointer");
        }
    }, [activeProject]);

    return <svg ref={svgRef} className="relative size-full" />;
}