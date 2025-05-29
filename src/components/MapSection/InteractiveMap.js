"use client";

import { useRef, useEffect, useState } from "react";
import { useWindowSize } from "react-use";
import { usePathname, useRouter } from "next/navigation";
import * as d3 from "d3";
import * as topojson from "topojson-client";

export default function Map({ projects }) {
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const { width, height } = useWindowSize();
  const router = useRouter();
  const pathname = usePathname();
  const activeSlug = pathname.split("/").pop();

  const [mapData, setMapData] = useState(null);

  const isPortrait = width < height;
  const ratio = Math.min(width / height, 2.75);
  const defaultScale = Math.min(width, height) * (isPortrait ? 10.5 - ratio : 6.75 + ratio);
  const defaultCenter = isPortrait ? [10.45, 56.19] : [11.62, 56.19];

  // Zoom parameters
  const zoomScaleFactor = 4;

  // Current projection & path generator (recalculated on render)
  const projection = d3.geoMercator()
    .scale(defaultScale)
    .center(defaultCenter)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  // D3 zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .on("zoom", (event) => {
      d3.select(gRef.current).attr("transform", event.transform);
    });

  // Load map data
  useEffect(() => {
    d3.json("/map.json").then((data) => {
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

  // Initialize zoom on SVG element
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.call(zoom);
  }, [width, height]);

  // Draw map and markers when data or dimensions change
  useEffect(() => {
    if (!mapData || !width || !height) return;

    const g = d3.select(gRef.current);
    g.selectAll("*").remove();

    // Redefine projection & path for current zoom level
    const proj = d3.geoMercator()
      .scale(defaultScale)
      .center(defaultCenter)
      .translate([width / 2, height / 2]);

    const pathGen = d3.geoPath().projection(proj);

    // Draw map
    g.selectAll("path")
      .data(mapData)
      .enter()
      .append("path")
      .attr("d", pathGen)
      .attr("class", "municipality")
      .attr("data-komkode", d => d.properties.KOMKODE);

    // Draw markers
    Object.entries(projects).forEach(([slug, project]) => {
      const [lon, lat] = project.coordinates;
      const [x, y] = proj([lon, lat]);

      g.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", slug === activeSlug ? 10 : 6)
        .attr("fill", slug === activeSlug ? "#2563eb" : "#ef4444")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .attr("cursor", "pointer")
        .on("click", (event) => {
          event.stopPropagation();
          router.push(`/projekter/${slug}`);
          zoomToProject([lon, lat]);
        });
    });
  }, [mapData, width, height, projects, activeSlug]);

  // Zoom and center on project coordinates with transition
  const zoomToProject = (coordinates) => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    // Create a new projection with zoomed scale and center on project coords
    const scale = defaultScale * zoomScaleFactor;
    const proj = d3.geoMercator()
      .scale(scale)
      .center(coordinates)
      .translate([width / 2, height / 2]);

    // Calculate the transform to center the project coords
    const [x, y] = proj(coordinates);

    // Construct transform
    // We want to move the group so the marker is centered in the SVG
    const translateX = width / 2 - x;
    const translateY = height / 2 - y;

    // Compose the transform string
    const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale / defaultScale);

    // Animate zoom transition
    svg.transition()
      .duration(1000)
      .call(zoom.transform, transform);
  };

  // Reset zoom on background click
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const onClick = () => {
      svg.transition()
        .duration(1000)
        .call(zoom.transform, d3.zoomIdentity);
    };

    svg.on("click", onClick);

    return () => {
      svg.on("click", null);
    };
  }, []);

  return (
    <svg ref={svgRef} width={width} height={height} style={{ display: "block" }}>
      <g ref={gRef} />
    </svg>
  );
}