"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import projectData from "../data/projects.json";

const ProjectMap = () => {
    const svgRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [isDimensionsReady, setIsDimensionsReady] = useState(false);
    const [isPortrait, setIsPortrait] = useState(false);
    const [focusProject, setFocusProject] = useState(false);

    const updateDimensions = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        setDimensions({ w, h });
        setIsDimensionsReady(true);
        setIsPortrait(w < h);
    };

    useEffect(() => {
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const toPortraitMode = (mainMap, projects, projection, g, scaleFactor) => {
        const offset = [-2.5, 2];
        const affectedSections = mainMap.filter(d => ["0400", "0411"].includes(d.properties.KOMKODE));
        const affectedProjects = projects.filter(project => ["0400", "0411"].includes(project.komkode));
    
        affectedSections.forEach(d => {
            d.geometry.coordinates = d.geometry.coordinates.map(polygon =>
                polygon.map(ring => [ring[0] + offset[0], ring[1] + offset[1]])
            );
        });
    
        affectedProjects.forEach(project => {
            project.coordinates[0] += offset[0];
            project.coordinates[1] += offset[1];
        });
    
        mainMap = mainMap.map(d => ["0400", "0411"].includes(d.properties.KOMKODE) ? d : { ...d });
    
        const boxCoordinates = [14.91701 + offset[0], 55.14497 + offset[1]];
        const [cx, cy] = projection(boxCoordinates);
        const boxSize = scaleFactor / 60;
        g.append("rect")
            .attr("x", cx - boxSize / 2)
            .attr("y", cy - boxSize / 2)
            .attr("width", boxSize)
            .attr("height", boxSize)
            .attr("fill", "none")
            .attr("stroke", "#020202")
            .attr("stroke-width", 1);
    };
    
    const drawMap = (g, mainMap, pathGenerator) => {
        g.append("g")
            .selectAll("path")
            .data(mainMap)
            .enter().append("path")
            .attr("d", pathGenerator)
            .attr("class", "land")
            .attr("fill", "#020202")
            .attr("stroke", "#ffffff")
            .attr("stroke-opacity", 0)
            .attr("stroke-width", 0)
            .attr("data-komkode", d => d.properties.KOMKODE);
    };
    
    const addMarkers = (g, projects, projection, svg, zoom, dimensions, setFocusProject) => {
        projects.forEach(project => {
            const [x, y] = projection(project.coordinates);
            g.append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", 6)
                .attr("fill", "#87ae73")
                .attr("stroke", "#020202")
                .attr("stroke-width", 1)
                .style("cursor", "pointer")
                .attr("class", "marker")
                .on("click", (e) => {
                    e.stopPropagation();
                    zoomToProject(x, y, project, svg, zoom, dimensions, setFocusProject)
                });
        });
    };
    
    const zoomToProject = (x, y, project, svg, zoom, dimensions, setFocusProject) => {
        const newX = project.screenPosition === "left" ? dimensions.w * 0.25 : dimensions.w * 0.75;
        const newY = dimensions.h / 2;
        const transform = d3.zoomIdentity.translate(newX, newY).scale(project.zoom).translate(-x, -y);
        svg.transition().duration(700).call(zoom.transform, transform);
        highlightKommune(project.komkode);
        setFocusProject(true);
    }
    
    const highlightKommune = (komkode) => {
        d3.selectAll(".land")
            .attr("fill-opacity", 0)
            .attr("stroke-width", 0.25)
            .attr("stroke-opacity", 0.25);
    
        d3.selectAll(`[data-komkode='${komkode}']`)
            .attr("fill", "#fff")
            .attr("fill-opacity", 0.75)
            .attr("stroke-width", 0);
    }

    useEffect(() => {
        if (!isDimensionsReady && !svgRef.current) return;

        const { w, h } = dimensions;
        const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${w} ${h}`).style("width", `${w}`).style("height", `${h}`);
        const ratio = Math.min(w / h, 2.75);
        const scaleFactor = Math.min(w, h) * (isPortrait ? 10.5 - ratio : 6.75 + ratio);
        const centerPoint = isPortrait ? [10.45, 56.19] : [11.62, 56.19];
        const projection = d3.geoMercator().scale(scaleFactor).center(centerPoint).translate([w / 2, h / 2]);
        const pathGenerator = d3.geoPath().projection(projection);
        const zoom = d3.zoom().scaleExtent([1, 10]).on("zoom", (event) => svg.select("g").attr("transform", event.transform));

        const projects = projectData.map(data => ({
            name: data.name,
            coordinates: [data.coordinates[0], data.coordinates[1]],
            komkode: data.komkode,
            screenPosition: data.screenPosition,
            zoom: data.zoom
        }));

        d3.json('/map.json').then((data) => {
            if (!data) return;
            const geoData = topojson.feature(data, data.objects[Object.keys(data.objects)[0]]);
            let mainMap = geoData.features;
            svg.selectAll("g").remove();
            const g = svg.append("g");
            isPortrait && toPortraitMode(mainMap, projects, projection, g, scaleFactor);
            drawMap(g, mainMap, pathGenerator);
            addMarkers(g, projects, projection, svg, zoom, dimensions, setFocusProject);
        });

        // Add click event listener to reset zoom
        svg.on("click", () => resetZoom(svg, zoom));
    }, [isDimensionsReady, dimensions]);

    const resetZoom = (svg, zoom) => {
        svg.transition().duration(700).call(zoom.transform, d3.zoomIdentity);
        setFocusProject(false);

        d3.selectAll(".land")
            .attr("fill", "#020202")
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 0)
            .attr("stroke-width", 0);

        d3.selectAll(".marker")
            .attr("opacity", 1)
            .attr("r", 6);
    };

    if (!isDimensionsReady) return <p>Loading map...</p>;

    return (
        <section className={`w-full min-h-screen transition duration-700 ease-in-out ${focusProject ? 'bg-black' : 'bg-white'}`}>
            <svg className="z-1 relative"ref={svgRef}/>
        </section>
    );
};

export default ProjectMap;
