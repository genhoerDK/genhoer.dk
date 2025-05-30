"use client";

import { useRef, useEffect, useState } from "react";
import { usePathname, useRouter } from 'next/navigation';
import * as d3 from "d3";
import * as topojson from "topojson-client";

export default function Map({ projects, width, height }) {
    const router = useRouter();
    const pathname = usePathname();
    const currentSlug = pathname.split('/').pop();
    const isProjectActive = !!projects[currentSlug];
    const svgRef = useRef(null);
    const [mapData, setMapData] = useState(null);

    // Map settings
    const isPortrait = width < height;
    const ratio = Math.min(width / height, 2.75);
    const scale = Math.min(width, height) * (isPortrait ? 10.5 - ratio : 6.75 + ratio);
    const center = isPortrait ? [10.45, 56.19] : [11.62, 56.19];
    const projection = d3.geoMercator().scale(scale).center(center).translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    // Load and adjust map data
    useEffect(() => {
        d3.json('/map_comp.json').then((data) => {
            const features = topojson.feature(data, data.objects[Object.keys(data.objects)[0]]).features;
            
            // Offset Bornholm map data if in portrait
            if (isPortrait) {
                features.forEach(({ properties: { KOMKODE }, geometry }) => {
                    if (KOMKODE === "0400" || KOMKODE === "0411") {
                        geometry.coordinates = geometry.coordinates.map(polygon =>
                            polygon.map(([x, y]) => [x - 2.5, y + 2])
                        );
                    }
                });
            }

            setMapData(features);
        });
    }, [isPortrait]);


    ///////////////////////////////////////////////////
    // Draw map, markers, labels and add transitions //
    ///////////////////////////////////////////////////

    useEffect(() => {
        if (!svgRef.current || !width || !height || !mapData) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        svg.attr("viewBox", `0 0 ${width} ${height}`)
            .style("width", `${width}px`)
            .style("height", `${height}px`);
        const g = svg.append("g");

        // Inset box if portrait
        if (isPortrait) {
            const [cx, cy] = projection([12.41701, 57.14497]);
            const boxSize = scale / 60;
            g.append("rect")
                .attr("x", cx - boxSize / 2)
                .attr("y", cy - boxSize / 2)
                .attr("width", boxSize)
                .attr("height", boxSize)
                .attr("fill", "none")
                .attr("stroke", "#27272A")
                .attr("stroke-width", isProjectActive ? 0 : 1);
        }

        // Append all paths
        const paths = g.selectAll("path")
            .data(mapData)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", "#27272A")
            .attr("fill-opacity", 1)
            .attr("stroke", "#27272A")
            .attr("stroke-opacity", 1)
            .attr("stroke-width", 1);

        // Apply path transitions
        setTimeout(() => {
            if (!isProjectActive) return;

            const currentKomkode = projects[currentSlug]?.komkode;

            paths.transition()
                .duration(600)
                .attr("fill", "#fafafa")
                .attr("stroke", "#fafafa")
                .attr("fill-opacity", d => d.properties.KOMKODE === currentKomkode ? 0.8 : 0)
                .attr("stroke-opacity", 0.1)
                .attr("stroke-width", d => d.properties.KOMKODE === currentKomkode ? 0 : 0.25);
        }, 0);

        // Project markers and labels
        const markerArray = [];

        Object.entries(projects).forEach(([slug, project]) => {
            // Offset Bornholm marker if in portrait
            const offset = [-2.5, 2];
            const adjustedCoordinates = (["0400", "0411"].includes(project.komkode) && isPortrait)
                ? project.coordinates.map((coord, i) => coord + offset[i])
                : project.coordinates;

            // Apply markers
            const [x, y] = projection(adjustedCoordinates);
            const markerGroup = g.append('g');
            const marker = markerGroup.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', isProjectActive ? 8 : 2)
                .attr('fill', '#fafafa')
                .attr('stroke', '#27272A')
                .attr('stroke-width', 2)
                .style('cursor', isProjectActive ? 'default' : 'pointer')
                .style('pointer-events', isProjectActive ? 'none' : 'auto')
                .on('click', function (event) {
                    event.stopPropagation();
                    router.push(`/projekter/${slug}`);
                })
                .on('mouseover', function () {
                    if (isPortrait || isProjectActive) return;

                    d3.select(this)
                        .attr('fill', '#52525b')
                        .attr('stroke', '#fafafa');

                    const labelText = project.city.toUpperCase();
                    const text = markerGroup.append("text")
                        .attr("x", x)
                        .attr("y", y - 16)
                        .attr("text-anchor", "middle")
                        .attr("class", "marker-label")
                        .text(labelText);
                    const bbox = text.node().getBBox();

                    markerGroup.insert("rect", "text")
                        .attr("x", bbox.x - 4)
                        .attr("y", bbox.y - 2)
                        .attr("width", bbox.width + 8)
                        .attr("height", bbox.height + 4)
                        .attr("fill", "#52525b")
                        .attr("rx", 4);
                })
                .on('mouseout', function () {
                    if (isPortrait || isProjectActive) return;

                    d3.select(this)
                        .attr('fill', '#fafafa')
                        .attr('stroke', '#27272A');

                    markerGroup.select("text").remove();
                    markerGroup.select("rect").remove();
                });

            // Collect markers for slug update
            markerArray.push({ marker, slug });

            // Style markers for active projects
            setTimeout(() => {
                markerArray.forEach(({ marker, slug }) => {
                    const hide = isProjectActive && slug !== currentSlug;
                    marker.transition()
                        .duration(150)
                        .attr('r', hide ? 0 : (slug === currentSlug ? 2 : 8))
                        .style('opacity', hide ? 0 : 1)
                });
            }, 0);
        });
    }, [width, height, mapData, projects, isProjectActive, currentSlug]);


    ////////////////////////////////////////////////
    // Setup zoom, panning and slug reponsitivity //
    ////////////////////////////////////////////////

    useEffect(() => {
        if (!svgRef.current || !mapData) return;

        const svg = d3.select(svgRef.current);
        const g = svg.select("g");

        // Zoom and pan settings
        const zoom = d3.zoom()
            .scaleExtent([1, 4])
            .translateExtent([[0, height * 0.05], [width, height * 0.95]])
            .filter((event) => {
                if (event.type === 'zoom') return true;
                const isTwoFinger = event.type === 'touchstart' && event.touches?.length === 2;
                return isPortrait && isTwoFinger && !isProjectActive;
            })
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        // Apply zoom
        svg.call(zoom)
            .on("wheel.zoom", null)
            .on("dblclick.zoom", null);

        // Allow two-finger zoom
        svg.on('touchstart.custom', (event) => {
            const isTwoFinger = event.touches?.length === 2;
            if (isPortrait && isTwoFinger && isProjectActive) {
                event.preventDefault();
                router.push('/projekter');
            }
        });

        // Reset on single click
        svg.on('click', () => {
            if (isProjectActive) router.push('/projekter');
        });

        // Zoom to project on slug change
        if (currentSlug && isProjectActive) {
            // Offset Bornholm zoom if in portrait
            const offset = [-2.5, 2];
            const project = projects[currentSlug];
            const isOffsetNeeded = ["0400", "0411"].includes(project.komkode) && isPortrait;
            const adjustedCoordinates = isOffsetNeeded
                ? project.coordinates.map((coord, i) => coord + offset[i])
                : project.coordinates;

            // Apply zoom
            const [x, y] = projection(adjustedCoordinates);
            const zoomLevel = 4;
            const targetX = isPortrait ? width / 2 : width / 4;
            const targetY = isPortrait ? height / 3 : height / 2;
            const transform = d3.zoomIdentity.translate(targetX - x * zoomLevel, targetY - y * zoomLevel).scale(zoomLevel);

            svg.transition().duration(600).call(zoom.transform, transform);
        } else {
            svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity);
        }

    }, [width, height, mapData, projects, currentSlug, isProjectActive, isPortrait]);

    return <svg ref={svgRef} />;
}