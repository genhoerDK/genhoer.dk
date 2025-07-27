"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

export default function MapLarge() {
    const svgRef = useRef(null);

    useEffect(() => {
        let geoData = null;

        const markers = [
            { name: "Gedser", coords: [11.9694, 54.5589] },
            { name: "Skagen", coords: [10.6000, 57.7200] },
        ];

        const renderMap = () => {
            if (!svgRef.current) return;
            const svg = d3.select(svgRef.current);
            const container = svgRef.current.parentElement;
            if (!container) return;

            const width = container.offsetWidth;
            const height = container.offsetHeight;
            const padding = 12;

            svg.selectAll("*").remove();

            svg
                .attr("viewBox", `0 0 ${width} ${height}`)
                .attr("preserveAspectRatio", "xMidYMid meet");

            if (!geoData) return;

            const projection = d3
                .geoMercator()
                .fitExtent([[padding, padding], [width - padding, height - padding]], geoData);

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

            // Draw markers
            markers.forEach((marker) => {
                const [x, y] = projection(marker.coords);

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
                        const translateX = mouseX - mouseX * zoomScale;
                        const translateY = mouseY - mouseY * zoomScale;

                        g.transition()
                            .duration(500)
                            .attr("transform", `translate(${translateX},${translateY}) scale(${zoomScale})`);
                    })
                    .on("mouseleave", function () {
                        g.transition()
                            .duration(500)
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
        <div className="relative size-full pt-10 pb-14">
            <svg ref={svgRef} className="size-full" />
        </div>
    );
}