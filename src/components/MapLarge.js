"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

export default function MapLarge({ projects }) {
    const svgRef = useRef(null);

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
            const paddingBottom = 64;
            const paddingX = 16;

            svg.selectAll("*").remove();

            svg
                .attr("viewBox", `0 0 ${width} ${height}`)
                .attr("preserveAspectRatio", "xMidYMid meet");

            if (!geoData) return;

            const projection = d3
                .geoMercator()
                .fitExtent([[paddingX, paddingTop], [width -paddingX, height - paddingBottom]], geoData);

            const path = d3.geoPath().projection(projection);
            const g = svg.append("g");

            // Draw the map
            g.selectAll("path")
                .data(geoData.features)
                .join("path")
                .attr("d", path)
                .attr("fill", "#27272A")
                .attr("stroke", "#27272A");

            const zoomScale = 4;

            // Draw the markers
            projects.forEach((project) => {
                const [lon, lat] = project.coordinates;
                const [x, y] = projection([lon, lat]);

                g.append("circle")
                    .attr("cx", x)
                    .attr("cy", y)
                    .attr("r", 6)
                    .attr("fill", "#f43f5e")
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 2)
                    .style("cursor", "pointer")
                    .on("mouseenter", function (event) {
                        const [mouseX, mouseY] = d3.pointer(event);

                        // Compute transform so marker ends up centered under the cursor
                        const translateX = mouseX - x * zoomScale;
                        const translateY = mouseY - y * zoomScale;

                        // Highlight paths with matching KOMKODE
                        g.selectAll("path")
                            .filter(d => d.properties.KOMKODE === String(project.komkode))
                            .transition()
                            .duration(300)
                            .attr("fill", "#fde047");

                        g.transition()
                            .duration(1000)
                            .attr("transform", `translate(${translateX},${translateY}) scale(${zoomScale})`);
                    })
                    .on("mouseleave", function () {
                        // Transition back to original fill
                        g.selectAll("path")
                            .filter(d => d.properties.KOMKODE === String(project.komkode))
                            .transition()
                            .duration(300)
                            .attr("fill", "#27272A");

                        g.transition()
                            .duration(600)
                            .attr("transform", `translate(0,0) scale(1)`);
                    });
            });
        };

        d3.json("/map_low.json").then((topology) => {
            geoData = topojson.feature(topology, topology.objects["kommuner"]);
            renderMap();
        });

        window.addEventListener("resize", renderMap);
        return () => window.removeEventListener("resize", renderMap);
    }, []);

    return (
        <div className="relative size-full">
            <svg ref={svgRef} className="size-full" />
        </div>
    );
}