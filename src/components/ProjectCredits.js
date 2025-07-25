"use client";

import React from "react";
import { projects } from "@/data/projects";

export default function ProjectCredits({ slug, show }) {
  const project = projects.find((p) => p.slug === slug);
  if (!project) return null;

  const { title, credits } = project;

  return (
    <div className={`fixed inset-0 w-full h-screen bg-zinc-200 text-zinc-900 transition-transform duration-500 ease-in-out ${show ? "translate-y-0" : "translate-y-full"}`}>
      
      {/* Scrollable wrapper */}
      <div className="h-full overflow-y-auto pointer-events-none">
        
        {/* Flex container to vertically center if content is short */}
        <div className="min-h-screen flex flex-col justify-center py-12">
          
          <div className="grid grid-cols-12 xl:grid-cols-16 px-2 lg:px-4">
            <div className="col-span-10 sm:col-span-8 sm:col-start-2 md:col-span-8 md:col-start-3 xl:col-span-6 xl:col-start-4 space-y-4">
              <h2 className="uppercase font-light text-lg md:text-xl leading-none">{title}</h2>

              {credits.map((credit, i) => (
                <div key={`${slug}-credit-${i}`}>
                  <p className="text-[0.5rem] uppercase leading-none mb-1">{credit.label}</p>
                  {credit.input.map((entry, j) => (
                    <p key={`${slug}-entry-${i}-${j}`} className="text-sm font-light">{entry}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}