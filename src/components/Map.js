"use client";

import { useRef, useEffect, useState } from "react";
import { usePathname, useRouter } from 'next/navigation';
import { useWindowSize } from 'react-use';
import * as d3 from "d3";
import * as topojson from "topojson-client";

export default function Map({ projects }) {
    const svgRef = useRef(null);
    const { width, height } = useWindowSize();
    const router = useRouter();
    const pathname = usePathname();
    const activeProject = pathname.split('/').pop();

    const [mapData, setMapData] = useState(null);

    const isPortrait = width < height;
    const ratio = Math.min(width / height, 2.75);
    const scale = Math.min(width, height) * (isPortrait ? 10.5 - ratio : 6.75 + ratio);
    const center = isPortrait ? [10.45, 56.19] : [11.62, 56.19];
    const projection = d3.geoMercator().scale(scale).center(center).translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    // LOAD MAP DATA + ADAPT MAP DATA TO PORTRAIT MODE
    useEffect(() => {
        d3.json('/map.json').then((data) => {
            const features = topojson.feature(data, data.objects[Object.keys(data.objects)[0]]).features;

            if (isPortrait) { features.forEach(({ properties: { KOMKODE }, geometry }) => {
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


    // DRAW MAP, MARKERS AND INLET-BOX
    useEffect(() => {
        if (!svgRef.current || !width || !height || !mapData) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        svg.attr("viewBox", `0 0 ${width} ${height}`).style("width", `${width}px`).style("height", `${height}px`);

        if (isPortrait) {
            const [cx, cy] = projection([12.41701, 57.14497]);
            const boxSize = scale / 60;
            svg.append("rect")
                .attr("x", cx - boxSize / 2)
                .attr("y", cy - boxSize / 2)
                .attr("width", boxSize)
                .attr("height", boxSize)
                .attr("class", "inset-box");
        }

        // Click background to exit project
        svg.on('click', () => { activeProject && router.push('/projekter'); });

        const g = svg.append("g");

        g.selectAll("path")
            .data(mapData)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", "municipality")
            .attr("data-komkode", d => d.properties.KOMKODE);

        Object.entries(projects).forEach(([slug, project]) => {
            const [lon, lat] = project.coordinates;
            const [x, y] = projection([lon, lat]);

            g.append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 6)
            .attr('fill', '#ef4444')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('cursor', 'pointer')
            .on('click', (event) => {
                event.stopPropagation(); // Block click bubbling to background
                router.push(`/projekter/${slug}`);
            });
        });
    }, [width, height, mapData, projects, activeProject]);

    return <svg ref={svgRef} />;
}