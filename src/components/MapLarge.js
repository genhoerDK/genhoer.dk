"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDates, formatPartners } from '@/utilities/formatters';
import * as d3 from "d3";
import * as topojson from "topojson-client";

export default function MapLarge({ projects }) {
    const svgRef = useRef(null);
    const router = useRouter();
    const [activeProject, setActiveProject] = useState(null);

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
                        .attr("stroke-opacity", p => p.properties.KOMKODE === d.komkode ? 1 : 0.1)
                        .attr("fill-opacity", p => p.properties.KOMKODE === d.komkode ? 1 : 0);

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
                        .attr("stroke-opacity", 1)
                        .attr("fill-opacity", 1);

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

    return (
        <div className="relative size-full">
            <div className={`absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-opacity delay-200 duration-500 ${activeProject ? "opacity-20" : "opacity-0"}`} style={{ backgroundImage: activeProject ? `url(${activeProject.coverImage})` : undefined, }} />
            <svg ref={svgRef} className="size-full" />

            {activeProject && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none transition-opacity duration-1000">
                    <div className="bg-zinc-800/90 text-zinc-50 px-4 pt-4 pb-2">
                        <h2 className="font-light uppercase text-xl leading-none mb-2">{activeProject.title}</h2>
                        {[
                            { label: "Udstilling", info: formatDates(activeProject.startDate, activeProject.endDate) },
                            { label: "Lokalitet", info: activeProject.location },
                            { label: "Partnere", info: formatPartners(activeProject.partners) },
                        ].map(({ label, info }) => (
                            <div key={`${activeProject.title}-card-info-${label}`} className="grid grid-cols-6 gap-x-2 pb-2 pointer-events-none">
                                <p className="col-span-1 text-[0.5rem] uppercase leading-none mt-[5px]">{label}</p>
                                <p className="col-start-2 col-span-full font-light text-xs">{info}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}