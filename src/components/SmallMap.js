"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

export default function SmallMap() {
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
            const padding = 12;

            svg
                .attr("viewBox", `0 0 ${width} ${height}`)
                .attr("preserveAspectRatio", "xMidYMid meet");

            if (!geoData) return;

            const projection = d3.geoMercator().fitExtent(
                [[padding, padding], [width - padding, height - padding]],
                geoData
            );

            const path = d3.geoPath().projection(projection);

            svg.selectAll("path")
                .data(geoData.features)
                .join("path")
                .attr("d", path)
                .attr("fill", "#27272A")
                .attr("stroke", "#27272A");
        };

        d3.json("/map_low_modified.json").then((topology) => {
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