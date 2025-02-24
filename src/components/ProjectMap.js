"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

const ProjectMap = () => {
    const svgRef = useRef(null);
    const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

    // Update dimensions to window size (initial and on resizing)
    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setDimensions({ w, h });
        };

        handleResize(); // Initialize dimensions
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize); // Cleanup on unmount
        };
    }, []);

    // Create and update d3 map 
    useEffect(() => {
        if (!svgRef.current) return;

        // Get current dimensions
        const { w, h } = dimensions;

        // Set up the SVG element with the current dimensions
        const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${w} ${h}`).style("width", `${w}`).style("height", `${h}`);

        // Check if portrait or landscape
        const isPortrait = h > w;

        // Calculate aspect ratio (maximum 3)
        const ratio = Math.min(w / h, 3);

        // Calculate scale factor based on the smallest dimension, the ratio and the orientation
        const scaleFactor = Math.min(w, h) * (isPortrait ? 10.5 - ratio : 6.5 + ratio);

        // Different centers for portrait and landscape orientation
        const centerPoint = isPortrait ? [10.45, 56.19] : [11.63, 56.19]; 

        // Projection
        const projection = d3.geoMercator().scale(scaleFactor).center(centerPoint).translate([w / 2, h / 2]);

        // Path generator
        const pathGenerator = d3.geoPath().projection(projection);

        // Load and render map data
        d3.json('/map.json').then((data) => {
            if (!data) return;

            // Convert TopoJSON to GeoJSON
            const geoData = topojson.feature(data, data.objects[Object.keys(data.objects)[0]]);

            // Filter out Bornholm and Christiansø based on portrait orientation
            const mainMap = geoData.features.filter(
                (d) => !(isPortrait && ["0400", "0411"].includes(d.properties.KOMKODE))
            );

            // Remove previous map elements
            svg.selectAll("g").remove();

            // Draw map
            svg.append("g")
                .selectAll("path")
                .data(mainMap)
                .enter().append("path")
                .attr("d", pathGenerator)
                .attr("fill", "#020202")
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 0.1)
                .attr("data-komkode", d => d.properties.KOMKODE);
        });
    }, [dimensions]);

    return (
        <section className="map-section w-full min-h-screen bg-cyan-200">
            <svg ref={svgRef} className="bg-gray-100" />
        </section>
    );
};

export default ProjectMap;