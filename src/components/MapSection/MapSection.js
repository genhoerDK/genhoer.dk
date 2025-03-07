"use client";

import { useEffect, useState } from "react";
import InteractiveMap from "./InteractiveMap";
import projectData from "../../data/projects.json";

const MapSection = () => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [isPortrait, setIsPortrait] = useState(false);
    const [activeProject, setActiveProject] = useState(null);
    const [projects, setProjects] = useState([]);

    const updateDimensions = () => {
        const { innerWidth: width, innerHeight: height } = window;
        setDimensions({ width, height });
        setIsPortrait(width < height);
    };

    const loadProjects = () => {
        const offset = [-2.5, 2];
        setProjects(projectData.map(project => ({
            ...project,
            coordinates: ["0400", "0411"].includes(project.komkode) && isPortrait
                ? project.coordinates.map((coord, i) => coord + offset[i])
                : project.coordinates
        })));
    };

    useEffect(() => {
        updateDimensions();
        loadProjects();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [isPortrait]);

    return (
        <section className={`transition duration-700 ${activeProject !== null ? "bg-black" : "bg-white"}`}>
            <InteractiveMap dimensions={dimensions} isPortrait={isPortrait} projects={projects} setActiveProject={setActiveProject} />
        </section>
    );
};

export default MapSection;