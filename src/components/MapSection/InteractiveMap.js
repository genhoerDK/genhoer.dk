import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

const InteractiveMap = ({ dimensions, isPortrait, projects, setActiveProject }) => {
    const [mapData, setMapData] = useState(null);
    const svgRef = useRef(null);
    const gRef = useRef(null);

    const svg = d3.select(svgRef.current)
            .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
            .style("width", `${dimensions.width}px`)
            .style("height", `${dimensions.height}px`)
            .on("click", () => resetZoom());

    const g = d3.select(gRef.current);

    const ratio = Math.min(dimensions.width / dimensions.height, 2.75);
    const scaleFactor = Math.min(dimensions.width, dimensions.height) * (isPortrait ? 10.5 - ratio : 6.75 + ratio);
    const centerPoint = isPortrait ? [10.45, 56.19] : [11.62, 56.19];

    const projection = d3.geoMercator()
            .scale(scaleFactor)
            .center(centerPoint)
            .translate([dimensions.width / 2, dimensions.height / 2]);

    const pathGenerator = d3.geoPath().projection(projection);

    const zoom = d3.zoom()
            .scaleExtent([1, 10])
            .on("zoom", (e) => svg.select("g").attr("transform", e.transform));

    useEffect(() => {
        d3.json('/map.json').then((data) => {
            let geoData = topojson.feature(data, data.objects[Object.keys(data.objects)[0]]);
            let updatedMapData = geoData.features;
            
            if (isPortrait) {
                updatedMapData.forEach(d => {
                    if (["0400", "0411"].includes(d.properties.KOMKODE)) {
                        d.geometry.coordinates = d.geometry.coordinates.map(polygon =>
                            polygon.map(ring => [ring[0] - 2.5, ring[1] + 2])
                        );
                    }
                });
            }
            setMapData(updatedMapData);
        });
    }, [isPortrait]);
            
    useEffect(() => {
        if (!dimensions.width || !dimensions.height || !mapData) return;
        g.selectAll("*").remove();
        drawMap();
        drawMarkers();
        isPortrait && drawInsetBox();
    }, [dimensions, mapData]);

    // Reset zoom on resize
    useEffect(() => { resetZoom(); }, [dimensions]);

    const drawInsetBox = () => {
        const [cx, cy] = projection([12.41701, 57.14497]);
        const boxSize = scaleFactor / 60;
        g.append("rect")
            .attr("x", cx - boxSize / 2)
            .attr("y", cy - boxSize / 2)
            .attr("width", boxSize)
            .attr("height", boxSize)
            .attr("class", "inset-box");
    };

    const drawMap = () => {
        g.selectAll("path")
            .data(mapData)
            .enter().append("path")
            .attr("d", pathGenerator)
            .attr("class", "municipality")
            .attr("data-komkode", d => d.properties.KOMKODE);
    };

    const drawMarkers = () => {
        projects.forEach((project, index) => {
            const [x, y] = projection(project.coordinates);
            g.append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", 6)
                .attr("class", "marker")
                .on("click", (e) => {
                    e.stopPropagation();
                    zoomToProject(x, y, project, index, e.target);
                });
        });
    };

    const zoomToProject = (x, y, project, projectIndex, clickedMarker) => {
        const newX = dimensions.width * project.screenPosition;
        const newY = dimensions.height / 2;
        const transform = d3.zoomIdentity.translate(newX, newY).scale(project.zoom).translate(-x, -y);
        
        svg.transition().duration(1000).call(zoom.transform, transform);
    
        setActiveProject(projectIndex);

        d3.selectAll(".municipality")
            .classed("dim", true);
    
        d3.selectAll(`[data-komkode='${project.komkode}']`)
            .classed("dim", false)
            .classed("highlight", true);

        d3.selectAll(".marker")
            .attr("r", 0)
            .classed("shrink", false)
            .classed("hide", true);
        
        d3.select(clickedMarker)
            .attr("r", 1)
            .classed("hide", false)
            .classed("shrink", true);
    };

    const resetZoom = () => {
        svg.transition().duration(1000).call(zoom.transform, d3.zoomIdentity);
    
        setActiveProject(null);

        d3.selectAll(".municipality")
            .classed("dim", false)
            .classed("highlight", false);
    
        d3.selectAll(".marker")
            .attr("r", 6)
            .classed("hide", false)
            .classed("shrink", false);
    };

    return (
        <svg ref={svgRef}>
            <g ref={gRef} />
        </svg>
    );
};

export default InteractiveMap;
