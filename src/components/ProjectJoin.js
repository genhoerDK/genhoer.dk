"use client";

import React from "react";
import { projects } from "@/data/projects";

export default function ProjectJoin({ slug, show }) {
    const project = projects.find((p) => p.slug === slug);
    if (!project) return null;

    const { workshop } = project;

    return (
        <section className={`fixed inset-0 w-full h-screen bg-zinc-200 text-zinc-900 transition-transform duration-500 ease-in-out ${show ? "translate-y-0" : "translate-y-full"}`}>
            {/* Scrollable wrapper */}
            <div className="h-full overflow-y-auto">
                {/* Flex container to vertically center if content is short */}
                <div className="min-h-dvh flex flex-col justify-center pointer-events-none px-2 md:px-4">
                    <div className="grid grid-cols-12 xl:grid-cols-16 gap-x-4">
                        <div className="col-span-10 sm:col-span-8 sm:col-start-2 md:col-span-8 md:col-start-3 xl:col-span-6 xl:col-start-4">
                            <h2 className="md:text-xl uppercase font-light pb-2">Vær med</h2>
                            {workshop.map((string, i) => (
                                <p className="font-light pb-4 text-xs md:text-sm" key={`${slug}-workshop-${i}`}>
                                    {string}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}