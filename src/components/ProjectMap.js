"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import projects from "../data/projects.json";

const ProjectMap = () => {
    const svgRef = useRef(null);
    const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

    // Set dimensions to window size (initial and on resizing)
    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setDimensions({ w, h });
        };
        
        handleResize(); // Initialize dimensions
        window.addEventListener('resize', handleResize); // Listen for resize events
        return () => { window.removeEventListener('resize', handleResize); }; // Cleanup on unmount
    }, []);

    // Create d3 map on mount and update on dimensions change
    useEffect(() => {
        if (!svgRef.current) return;

        const { w, h } = dimensions;

        // Set up the SVG element with the current dimensions
        const svg = d3.select(svgRef.current)
            .attr("viewBox", `0 0 ${w} ${h}`)
            .style("width", `${w}`)
            .style("height", `${h}`);

        // Check if portrait or landscape
        const isPortrait = h > w;

        // Calculate aspect ratio (maximum 2.75)
        const ratio = Math.min(w / h, 2.75);

        // Calculate scale factor based on the smallest dimension, the ratio, and the orientation
        const scaleFactor = Math.min(w, h) * (isPortrait ? 10.5 - ratio : 6.75 + ratio);

        // Different centers for portrait and landscape orientation
        const centerPoint = isPortrait ? [10.45, 56.19] : [11.62, 56.19]; 

        // Projection setup
        const projection = d3.geoMercator().scale(scaleFactor).center(centerPoint).translate([w / 2, h / 2]);

        // Path generator function
        const pathGenerator = d3.geoPath().projection(projection);

        // Zoom behavior setup
        const zoom = d3.zoom()
            .scaleExtent([1, 50]) // Set zoom limits
            .on("zoom", function (event) {
                svg.select("g").attr("transform", event.transform); // Apply zoom & pan transform to the map group
            });

        // User zoom behavior on the SVG element
        // svg.call(zoom);
        
        // City list with coordinates and kommunekoder
        const cities = projects.data.map(project => ({
            name: project.name,
            coordinates: [project.coordinates[0], project.coordinates[1]],
            komkode: project.komkode,
            screenPosition: project.screenPosition,
            zoom: project.zoom
        }));

        // Load and render map data
        d3.json('/map.json').then((data) => {
            if (!data) return;

            // Convert TopoJSON to GeoJSON
            const geoData = topojson.feature(data, data.objects[Object.keys(data.objects)[0]]);

            // Get the map features
            let mainMap = geoData.features;

            // Remove previous map elements
            svg.selectAll("g").remove();

            // Create a group for the map elements
            const g = svg.append("g");

            // Adjust Bornholm, Christiansø and affected markers based on orientation + add box
            if (isPortrait) {
                let offset = [-2.5, 2];

                // Filter affected cities and map sections
                const affectedSections = mainMap.filter(d => ["0400", "0411"].includes(d.properties.KOMKODE));
                const affectedCities = cities.filter(city => ["0400", "0411"].includes(city.komkode));
            
                // Adjust coordinates for affected map polygons
                affectedSections.forEach(d => {
                    d.geometry.coordinates = d.geometry.coordinates.map(polygon =>
                        polygon.map(ring => [ring[0] + offset[0], ring[1] + offset[1]])
                    );
                });
            
                // Update the coordinates for the affected cities
                affectedCities.forEach(city => {
                    // Update the offset of coordinates
                    city.coordinates[0] = city.coordinates[0] + offset[0];  // longitude
                    city.coordinates[1] = city.coordinates[1] + offset[1];  // latitude
                });
            
                // Apply changes to the main map 
                mainMap = mainMap.map(d => ["0400", "0411"].includes(d.properties.KOMKODE) ? d : { ...d } );


                // Draw bounding box around the affected area
                // Define the center coordinate (longitude, latitude)
                const boxCoordinates = [14.91701 + offset[0], 55.14497 + offset[1]]; // Adjust as needed

                // Convert to SVG space using projection
                const [cx, cy] = projection(boxCoordinates);

                // Define box size
                const boxSize = scaleFactor / 60;

                // Draw bounding box centered at the projected coordinate
                g.append("rect")
                    .attr("x", cx - boxSize / 2)
                    .attr("y", cy - boxSize / 2)
                    .attr("width", boxSize)
                    .attr("height", boxSize)
                    .attr("fill", "none")
                    .attr("stroke", "#020202")
                    .attr("stroke-width", 1);
            }

            // Draw map
            g.append("g")
                .selectAll("path")
                .data(mainMap)
                .enter().append("path")
                .attr("d", pathGenerator)
                .attr("fill", "#020202")
                .attr("stroke", "#020202")
                .attr("stroke-width", "0")
                .attr("data-komkode", d => d.properties.KOMKODE);

            // Add markers
            cities.forEach(city => {
                const [x, y] = projection(city.coordinates);

                g.append("circle")
                    .attr("cx", x)
                    .attr("cy", y)
                    .attr("r", 6)
                    .attr("fill", "#87ae73")
                    .attr("stroke", "#020202")
                    .attr("stroke-width", 1)
                    .style("cursor", "pointer")
                    .on("click", function () {
                        // Determine the new view position
                        const newX = city.screenPosition === "left" ? dimensions.w * 0.25 : dimensions.w * 0.75;
                        const newY = dimensions.h / 2; // Centered vertically
            
                        // Compute the transformation
                        const transform = d3.zoomIdentity
                            .translate(newX, newY) // Move the view to the new position
                            .scale(city.zoom) // Zoom in on the city
                            .translate(-x, -y); // Center the city
            
                        // Apply the zoom transformation smoothly
                        svg.transition()
                            .duration(750)
                            .call(zoom.transform, transform);
                    });
            });

        });
    }, [dimensions]);

    return (
        <section className="map-section w-full min-h-screen bg-cyan-200">
            <svg ref={svgRef} className="bg-gray-100" />
        </section>
    );
};

export default ProjectMap;