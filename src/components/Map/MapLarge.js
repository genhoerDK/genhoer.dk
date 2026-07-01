"use client";

import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { projects } from "@/data/projects";
import { formatDates } from "@/utilities/formatDates"; // NY: bruges til at formatere datoer i label

const ZOOM_SCALE = 4; // NY: udtrukket som konstant (var før en variabel inde i renderMap)
const DEFAULT_LABEL_OFFSET = { x: 60, y: 0 }; // NY: fallback-placering hvis et projekt ikke har labelOffset sat

export default function MapLarge({ setActiveProject, onMarkerNavigate }) {
    const svgRef = useRef(null);
    const router = useRouter();

    const now = new Date();

    const upcomingProjects = projects.filter(
        (project) => new Date(project.startDate) > now
    );

    upcomingProjects.sort(
        (a, b) => new Date(a.startDate) - new Date(b.startDate)
    );

    const finishedProjects = projects.filter(
        (project) => new Date(project.startDate) <= now
    );

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

            // Draw upcoming markers
            const upcomingMarkers = g.selectAll(".upcoming-marker")
                .data(upcomingProjects)
                .enter()
                .append("circle")
                .attr("class", "upcoming-marker")
                .attr("cx", d => projection(d.coordinates)[0])
                .attr("cy", d => projection(d.coordinates)[1])
                .attr("r", 6)
                .attr("fill", "#27272A")
                .attr("stroke", "#fafafa")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", 3.14)

            // NY: cirkel flyttet fra direkte g.selectAll(".finished-marker") ind i en fælles <g> pr. marker,
            // så cirkel + label kan style/animeres/håndteres samlet
            const finishedGroups = g.selectAll(".finished-marker-group")
                .data(finishedProjects)
                .enter()
                .append("g")
                .attr("class", "finished-marker-group")
                .style("cursor", "pointer"); // NY: flyttet hertil fra den gamle .finished-marker selection

            // NY: appendes nu på finishedGroups i stedet for direkte på g
            const finishedMarkers = finishedGroups.append("circle")
                .attr("class", "finished-marker")
                .attr("cx", d => projection(d.coordinates)[0])
                .attr("cy", d => projection(d.coordinates)[1])
                .attr("r", 6)
                .attr("fill", "#71717A")
                .attr("stroke", "#FAFAFA")
                .attr("stroke-width", 2);

            // NY: hele denne label-blok er tilføjet fra bunden
            // Label-gruppe pr. marker, kontra-skaleret ift. ZOOM_SCALE så teksten forbliver fast størrelse
            // uanset hvor meget kortet zoomer ind (transform-skaleringerne ganges sammen til 1)
            const finishedLabels = finishedGroups.append("g")
                .attr("class", "marker-label")
                .attr("transform", d => {
                    const [x, y] = projection(d.coordinates);
                    return `translate(${x},${y}) scale(${1 / ZOOM_SCALE})`;
                })
                .style("opacity", 0) // NY: skjult som udgangspunkt, vises kun ved hover
                .style("pointer-events", "none");

            // NY: bruger hardcoded offset fra projects.js (d.labelOffset) i stedet for
            // automatisk beregnet retning ud fra afstand til kortets centrum
            finishedLabels.each(function (d) {
                const offset = d.labelOffset ?? DEFAULT_LABEL_OFFSET;
                const group = d3.select(this);

                group.append("text")
                    .attr("class", "marker-label-title fill-paper text-xs uppercase") // NY: Tailwind i stedet for .attr("fill"/"font-size"/"font-weight")
                    .attr("x", offset.x)
                    .attr("y", offset.y + 6)
                    .text(d.title);

                group.append("text")
                    .attr("class", "marker-label-location fill-paper text-[0.5rem] uppercase") // NY
                    .attr("x", offset.x + 1)
                    .attr("y", offset.y + 20)
                    .text(d.location);

                group.append("text")
                    .attr("class", "marker-label-date fill-paper text-[0.5rem] uppercase") // NY
                    .attr("x", offset.x + 1)
                    .attr("y", offset.y + 32)
                    .text(formatDates(d.startDate, d.endDate));
            });

            // NY: event-håndtering flyttet fra finishedMarkers til finishedGroups,
            // så både cirkel og label reagerer på samme hover-flade
            finishedGroups
                .on("mouseenter", function (event, d) {
                    const [x, y] = projection(d.coordinates);
                    const [mouseX, mouseY] = d3.pointer(event, g.node()); // NY: reference ændret fra event til (event, g.node())
                    const translateX = mouseX - x * ZOOM_SCALE;
                    const translateY = mouseY - y * ZOOM_SCALE;

                    setActiveProject(d);

                    g.transition()
                        .delay(200)
                        .duration(500)
                        .attr("transform", `translate(${translateX},${translateY}) scale(${ZOOM_SCALE})`);

                    g.selectAll("path")
                        .transition()
                        .delay(200)
                        .duration(500)
                        .attr("fill", p => p.properties.KOMKODE === d.komkode ? "#FAFAFA" : "#27272A")
                        .attr("fill-opacity", p => p.properties.KOMKODE === d.komkode ? 1 : 0)
                        .attr("stroke", "#FAFAFA")
                        .attr("stroke-opacity", p => p.properties.KOMKODE === d.komkode ? 1 : 0.1);

                    finishedMarkers.transition()
                        .delay(200)
                        .duration(500)
                        .attr("r", p => p === d ? 4 : 0)
                        .attr("fill", "#27272A")
                        .attr("stroke-width", 1);

                    upcomingMarkers.transition()
                        .delay(200)
                        .duration(500)
                        .attr("r", 0)
                        .attr("stroke-width", 1);

                    // NY: vis kun label for den markør, der hoveres over
                    finishedLabels
                        .transition()
                        .delay(200)
                        .duration(300)
                        .style("opacity", p => p === d ? 1 : 0);
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

                    finishedMarkers.transition()
                        .duration(500)
                        .attr("r", 6)
                        .attr("fill", "#71717A")
                        .attr("stroke-width", 2);

                    upcomingMarkers.transition()
                        .duration(500)
                        .attr("r", 6)
                        .attr("stroke-width", 2);

                    // NY: skjul label igen ved mouseleave
                    finishedLabels
                        .transition()
                        .duration(150)
                        .style("opacity", 0);

                    setActiveProject(null);
                })
                .on("click", (event, d) => {
                    onMarkerNavigate?.();
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

    return <svg ref={svgRef} className="relative w-full h-svh" />;
}