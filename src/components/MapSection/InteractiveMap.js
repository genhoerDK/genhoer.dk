import { useRef, useEffect } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

const InteractiveMap = ({ dimensions, projects, isPortrait }) => {
    const svgRef = useRef(null);

    const svg = d3.select(svgRef.current)
            .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
            .style("width", `${dimensions.width}px`)
            .style("height", `${dimensions.height}px`);

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
        if (!dimensions.width || !dimensions.height) return;

        d3.json('/map.json').then((data) => {
            const geoData = topojson.feature(data, data.objects[Object.keys(data.objects)[0]]);
            const mapData = geoData.features;

            svg.selectAll("g").remove();
            const g = svg.append("g");

            if (isPortrait) {
                const offset = [-2.5, 2];
                mapData.forEach(d => {
                    if (["0400", "0411"].includes(d.properties.KOMKODE)) {
                        d.geometry.coordinates = d.geometry.coordinates.map(polygon =>
                            polygon.map(ring => [ring[0] + offset[0], ring[1] + offset[1]])
                        );
                    }
                });
                drawInsetBox(g, offset);
            }

            drawMap(g, mapData);
            drawMarkers(g);
            
            svg.on("click", () => resetZoom());
        });
    }, [dimensions]);

    // Reset zoom on resize
    useEffect(() => { svg.transition().call(zoom.transform, d3.zoomIdentity); }, [dimensions]);

    const drawInsetBox = (g, offset) => {
        const [cx, cy] = projection([14.91701 + offset[0], 55.14497 + offset[1]]);
        const boxSize = scaleFactor / 60;
        g.append("rect")
            .attr("x", cx - boxSize / 2)
            .attr("y", cy - boxSize / 2)
            .attr("width", boxSize)
            .attr("height", boxSize)
            .attr("class", "inset-box");
    };

    const drawMap = (g, mapData) => {
        g.selectAll("path")
            .data(mapData)
            .enter().append("path")
            .attr("d", pathGenerator)
            .attr("class", "municipality")
            .attr("data-komkode", d => d.properties.KOMKODE);
    };

    const drawMarkers = (g) => {
        projects.forEach((project) => {
            const [x, y] = projection(project.coordinates);
            g.append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("class", "marker")
                .on("click", (e) => {
                    e.stopPropagation();
                    zoomToProject(x, y, project, e.target);
                });
        });
    };

    const zoomToProject = (x, y, project, clickedMarker) => {
        const newX = dimensions.width * project.screenPosition;
        const newY = dimensions.height / 2;
        const transform = d3.zoomIdentity.translate(newX, newY).scale(project.zoom).translate(-x, -y);
        
        svg.transition().duration(700).call(zoom.transform, transform);
    
        d3.selectAll(".municipality")
            .classed("dim", true);
    
        d3.selectAll(`[data-komkode='${project.komkode}']`)
            .classed("dim", false)
            .classed("highlight", true);

        d3.selectAll(".marker")
            .classed("shrink", false)
            .classed("hide", true);
        
        d3.select(clickedMarker)
            .classed("hide", false)
            .classed("shrink", true);
    };

    const resetZoom = () => {
        svg.transition().duration(700).call(zoom.transform, d3.zoomIdentity);
    
        d3.selectAll(".municipality")
            .classed("dim", false)
            .classed("highlight", false);
    
        d3.selectAll(".marker")
            .classed("hide", false)
            .classed("shrink", false);
    };

    return <svg ref={svgRef} />;
};

export default InteractiveMap;
