//////////////////////////////////////////////////
//// Shared d3 drawing for MapLarge + MapSmall ////
//////////////////////////////////////////////////

import * as d3 from "d3";
import * as topojson from "topojson-client";
import { colors } from "@/styles/colors";
import { formatDates } from "@/utilities/formatDates";

export const ZOOM_SCALE = 4;         // Zoom when a project is selected
export const MARKER_RADIUS = 6;
export const MARKER_STROKE_WIDTH = 2;
export const HIGHLIGHT_DELAY = 200;  // ms before highlight starts
export const DURATION = 500;         // ms for zoom/highlight transitions

/** Load a TopoJSON file of Danish kommuner and convert it to GeoJSON */
export async function loadKommuner(url) {
    const topology = await d3.json(url);
    return topojson.feature(topology, topology.objects["kommuner"]);
}

/**
 * Draw kommuner, upcoming markers and opened markers (with hidden labels) into g.
 *
 * @param {Function} position - Returns [x, y] in the svg for a project
 * @param {string} labelOffsetKey - Which offset from projects.js to place labels by ('labelOffsetLarge' | 'labelOffsetSmall')
 * @returns Selections the map components animate or attach events to
 */
export function drawMap(g, geoData, projection, { upcoming, opened, position, labelOffsetKey }) {
    const path = d3.geoPath().projection(projection);

    // Kommuner
    g.selectAll(".kommune")
        .data(geoData.features)
        .join("path")
        .attr("class", "kommune")
        .attr("d", path)
        .attr("fill", colors.ink)
        .attr("fill-opacity", 1)
        .attr("stroke", colors.ink)
        .attr("stroke-width", 0.25)
        .attr("stroke-opacity", 1);

    // Upcoming projects: dashed outline, not clickable
    const upcomingMarkers = g.selectAll(".upcoming-marker")
        .data(upcoming)
        .enter()
        .append("circle")
        .attr("class", "upcoming-marker")
        .attr("cx", (d) => position(d)[0])
        .attr("cy", (d) => position(d)[1])
        .attr("r", MARKER_RADIUS)
        .attr("fill", colors.ink)
        .attr("stroke", colors.paper)
        .attr("stroke-width", MARKER_STROKE_WIDTH)
        .attr("stroke-dasharray", 3.14);

    // Opened projects: marker + label in one group, so both share the same hover/click area
    const openedGroups = g.selectAll(".opened-marker-group")
        .data(opened)
        .enter()
        .append("g")
        .attr("class", "opened-marker-group")
        .style("cursor", "pointer");

    const openedMarkers = openedGroups.append("circle")
        .attr("class", "opened-marker")
        .attr("cx", (d) => position(d)[0])
        .attr("cy", (d) => position(d)[1])
        .attr("r", MARKER_RADIUS)
        .attr("fill", colors.hard)
        .attr("stroke", colors.paper)
        .attr("stroke-width", MARKER_STROKE_WIDTH);

    // Labels are scaled down by ZOOM_SCALE so the text has normal size once the map is zoomed in.
    // Hidden until the project is highlighted. Offsets per project are set by hand in projects.js.
    const labels = openedGroups.append("g")
        .attr("class", "marker-label")
        .attr("transform", (d) => {
            const [x, y] = position(d);
            return `translate(${x},${y}) scale(${1 / ZOOM_SCALE})`;
        })
        .style("opacity", 0)
        .style("pointer-events", "none");

    labels.each(function (d) {
        const offset = d[labelOffsetKey];
        const label = d3.select(this);

        label.append("text")
            .attr("class", "fill-paper text-xs uppercase")
            .attr("x", offset.x)
            .attr("y", offset.y + 6)
            .text(d.title);

        label.append("text")
            .attr("class", "fill-paper text-[0.5rem] uppercase")
            .attr("x", offset.x + 1)
            .attr("y", offset.y + 20)
            .text(formatDates(d.startDate, d.endDate));

        label.append("text")
            .attr("class", "fill-paper text-[0.5rem] uppercase")
            .attr("x", offset.x + 1)
            .attr("y", offset.y + 32)
            .text(d.kommune);
    });

    return { upcomingMarkers, openedGroups, openedMarkers };
}

/** Light up the project's kommune and label, and hide all other markers */
export function highlightProject(g, project, activeRadius) {
    const isProjectKommune = (feature) => feature.properties.KOMKODE === project.komkode;

    g.selectAll(".kommune").transition()
        .delay(HIGHLIGHT_DELAY)
        .duration(DURATION)
        .attr("fill", (p) => (isProjectKommune(p) ? colors.paper : colors.ink))
        .attr("fill-opacity", (p) => (isProjectKommune(p) ? 1 : 0))
        .attr("stroke", colors.paper)
        .attr("stroke-opacity", (p) => (isProjectKommune(p) ? 1 : 0.1));

    g.selectAll(".opened-marker").transition()
        .delay(HIGHLIGHT_DELAY)
        .duration(DURATION)
        .attr("r", (p) => (p === project ? activeRadius : 0))
        .attr("fill", colors.ink)
        .attr("stroke-width", 1);

    g.selectAll(".upcoming-marker").transition()
        .delay(HIGHLIGHT_DELAY)
        .duration(DURATION)
        .attr("r", 0)
        .attr("stroke-width", 1);

    g.selectAll(".marker-label").transition()
        .delay(HIGHLIGHT_DELAY)
        .duration(300)
        .style("opacity", (p) => (p === project ? 1 : 0));
}

/** Undo highlightProject */
export function resetHighlight(g) {
    g.selectAll(".kommune").transition()
        .duration(DURATION)
        .attr("fill", colors.ink)
        .attr("fill-opacity", 1)
        .attr("stroke", colors.ink)
        .attr("stroke-opacity", 1);

    g.selectAll(".opened-marker").transition()
        .duration(DURATION)
        .attr("r", MARKER_RADIUS)
        .attr("fill", colors.hard)
        .attr("stroke-width", MARKER_STROKE_WIDTH)
        .style("cursor", "pointer");

    g.selectAll(".upcoming-marker").transition()
        .duration(DURATION)
        .attr("r", MARKER_RADIUS)
        .attr("stroke-width", MARKER_STROKE_WIDTH);

    g.selectAll(".marker-label").transition()
        .duration(150)
        .style("opacity", 0);
}
