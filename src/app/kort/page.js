"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useControlBar } from "@/context/ControlBarContext";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { projects } from "@/data/projects";
import { Squares2X2Icon } from "@heroicons/react/24/outline";

export default function FullscreenMap() {
  const mapContainerRef = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const router = useRouter();

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [mapData, setMapData] = useState(null);
  const [hoveredImage, setHoveredImage] = useState(null);
  const [hoveredKommune, setHoveredKommune] = useState(null);

  const { setButtons } = useControlBar();
  useEffect(() => {
    setButtons([{ label: "Galleri", icon: <Squares2X2Icon />, onClick: () => router.push("/") }]);
    return () => setButtons([]);
  }, []);

  // Update container size
  useEffect(() => {
    const updateSize = () => {
      if (mapContainerRef.current) {
        const { width, height } = mapContainerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const { width, height } = dimensions;
  const isPortrait = width < height;
  const ratio = Math.min(width / height, 2.75);
  const baseScale = Math.min(width, height) * (isPortrait ? 10.5 - ratio : 6.75 + ratio);
  const center = isPortrait ? [10.45, 56.19] : [11.62, 56.19];
  const projection = d3.geoMercator().scale(baseScale).center(center).translate([width / 2, height / 2]);
  const path = d3.geoPath().projection(projection);

  // Load map data
  useEffect(() => {
    d3.json("/map_low.json").then((data) => {
      const features = topojson.feature(data, data.objects[Object.keys(data.objects)[0]]).features;

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

  // Draw the map
  useEffect(() => {
    if (!svgRef.current || !width || !height || !mapData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`)
      .style("width", `${width}px`)
      .style("height", `${height}px`);

    const g = svg.append("g");
    gRef.current = g;

    if (isPortrait) {
      const [cx, cy] = projection([12.41701, 57.14497]);
      const boxSize = baseScale / 60;
      g.append("rect")
        .attr("x", cx - boxSize / 2)
        .attr("y", cy - boxSize / 2)
        .attr("width", boxSize)
        .attr("height", boxSize)
        .attr("fill", "none")
        .attr("stroke", "#27272A")
        .attr("stroke-width", 1);
    }

    // Kommune paths with highlight + fade logic
    g.selectAll("path")
      .data(mapData)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", d => d.properties.KOMKODE === hoveredKommune ? "#fafafa" : "#27272A")
      .attr("stroke", "#27272A")
      .attr("opacity", d => {
        if (!hoveredKommune) return 1;
        return d.properties.KOMKODE === hoveredKommune ? 1 : 0.2;
      })
      .attr("class", "kommune-path");

    // Project markers
    projects.forEach(({ slug, komkode, coordinates, city, coverImage }) => {
      const offset = ["0400", "0411"].includes(komkode) && isPortrait ? [-2.5, 2] : [0, 0];
      const [x, y] = projection([coordinates[0] + offset[0], coordinates[1] + offset[1]]);
      const markerGroup = g.append("g");

      markerGroup.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 8)
        .attr("fill", "#fafafa")
        .attr("stroke", "#27272A")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("click", () => router.push(`/${slug}`))
        .on("mouseover", function () {
          if (isPortrait) return;

          // Kommune highlight + fade others
          setHoveredKommune(komkode);

          // Zoom slightly toward the marker
          const zoomScale = 1.5;
          g.transition()
            .duration(500)
            .attr("transform", `translate(${x * (1 - zoomScale)}, ${y * (1 - zoomScale)}) scale(${zoomScale})`);

          d3.select(this).attr("fill", "#52525b").attr("stroke", "#fafafa");
          setHoveredImage(coverImage);

          const labelText = city.toUpperCase();
          const text = markerGroup.append("text")
            .attr("x", x)
            .attr("y", y - 16)
            .attr("text-anchor", "middle")
            .attr("class", "marker-label")
            .text(labelText);

          const bbox = text.node().getBBox();
          markerGroup.insert("rect", "text")
            .attr("x", bbox.x - 5)
            .attr("y", bbox.y - 2)
            .attr("width", bbox.width + 10)
            .attr("height", bbox.height + 4)
            .attr("fill", "#52525b");
        })
        .on("mouseout", function () {
          if (isPortrait) return;

          // Reset kommune highlight + zoom
          setHoveredKommune(null);
          g.transition().duration(500).attr("transform", "translate(0,0) scale(1)");

          d3.select(this).attr("fill", "#fafafa").attr("stroke", "#27272A");
          setHoveredImage(null);
          markerGroup.select("text").remove();
          markerGroup.select("rect").remove();
        });
    });

  }, [width, height, mapData, isPortrait, baseScale, hoveredKommune]);

  return (
    <div ref={mapContainerRef} className="w-full h-svh bg-zinc-200">
      <div
        className="absolute inset-0 z-0 transition-opacity duration-300 bg-center bg-cover filter grayscale contrast-125"
        style={{
          backgroundImage: hoveredImage ? `url(${hoveredImage})` : "none",
          opacity: hoveredImage ? 0.3 : 0,
        }}
      />
      <svg ref={svgRef} className="relative z-0" />
    </div>
  );
}