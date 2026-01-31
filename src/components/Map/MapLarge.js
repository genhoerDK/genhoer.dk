"use client";

import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { projects } from "@/data/projects";

export default function MapLarge({ setActiveProject }) {
    const svgRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
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
                .attr("stroke-width", .25)
                .attr("stroke-opacity", 1);

            const zoomScale = 4;

            // Draw the markers
            const markers = g.selectAll(".marker")
                .data(projects)
                .enter()
                .append("circle")
                .attr("class", "marker")
                .attr("cx", d => projection(d.coordinates)[0])
                .attr("cy", d => projection(d.coordinates)[1])
                .attr("r", 6)
                .attr("fill", "#71717A")
                .attr("stroke", "#FAFAFA")
                .attr("stroke-width", 2)
                .style("cursor", "pointer")
                .on("mouseenter", function (event, d) {
                    const [x, y] = projection(d.coordinates);
                    const [mouseX, mouseY] = d3.pointer(event);
                    const translateX = mouseX - x * zoomScale;
                    const translateY = mouseY - y * zoomScale;

                    setActiveProject(d);

                    g.transition()
                        .delay(200)
                        .duration(500)
                        .attr("transform", `translate(${translateX},${translateY}) scale(${zoomScale})`);

                    g.selectAll("path")
                        .transition()
                        .delay(200)
                        .duration(500)
                        .attr("fill", p => p.properties.KOMKODE === d.komkode ? "#FAFAFA" : "#27272A")
                        .attr("fill-opacity", p => p.properties.KOMKODE === d.komkode ? 1 : 0)
                        .attr("stroke", "#FAFAFA")
                        .attr("stroke-opacity", p => p.properties.KOMKODE === d.komkode ? 1 : 0.1);


                    markers.transition()
                        .delay(200)
                        .duration(500)
                        .attr("r", r => r === d ? 4 : 0)
                        .attr("fill", "#27272A")
                        .attr("stroke-width", 1);

                })
                .on("mouseleave", function () {
                    g.transition()
                        .duration(500)
                        .attr("transform", `translate(0,0) scale(1)`);

                    g.selectAll("path")
                        .transition()
                        .duration(500)
                        .attr("fill", "#27272A")
                        .attr("fill-opacity", 1)
                        .attr("stroke", "#27272A")
                        .attr("stroke-opacity", 1);

                    markers.transition()
                        .duration(500)
                        .attr("r", 6)
                        .attr("fill", "#71717A")
                        .attr("stroke-width", 2);

                    setActiveProject(null);
                })
                .on("click", (event, d) => {
                    router.push(`/${d.slug}`);
                });
        };

        d3.json("/map_low.json").then((topology) => {
            geoData = topojson.feature(topology, topology.objects["kommuner"]);
            renderMap();
        });

        window.addEventListener("resize", renderMap);
        return () => window.removeEventListener("resize", renderMap);
    }, []);

    return <svg ref={svgRef} className="relative size-full" />;
}