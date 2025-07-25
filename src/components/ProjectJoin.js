"use client";

import React from "react";
import { projects } from "@/data/projects";

export default function ProjectJoin({ slug, show }) {
    const project = projects.find((p) => p.slug === slug);
    if (!project) return null;

    const { title, credits } = project;

    return (
        <div className={`fixed inset-0 w-full h-screen bg-zinc-200 text-zinc-900 transition-transform duration-500 ease-in-out ${show ? "translate-y-0" : "translate-y-full"}`}>

            {/* Scrollable wrapper */}
            <div className="h-full overflow-y-auto pointer-events-none">

            </div>
        </div>
    );
}