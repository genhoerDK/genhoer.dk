"use client";

import React from "react";
import { projects } from "@/data/projects";

export default function ProjectCredits({ slug, show }) {
  const project = projects.find((p) => p.slug === slug);
  if (!project) return null;

  const { credits } = project;

  return (
    <section className={`fixed inset-0 w-full h-screen bg-zinc-200 text-zinc-900 transition-transform duration-500 ease-in-out ${show ? "translate-y-0" : "translate-y-full"}`}>
      
      {/* Scrollable wrapper */}
      <div className="h-full overflow-y-auto">
        
        {/* Flex container to vertically center if content is short */}
        <div className="min-h-dvh flex flex-col justify-center pt-10 pb-14 pointer-events-none">
          
          <div className="grid grid-cols-12 xl:grid-cols-16 px-2 lg:px-4 gap-x-4">
            <div className="col-span-full sm:col-start-2 md:col-start-3 xl:col-start-4 space-y-4">
              <h2 className="text-xl font-extralight uppercase">Tak til</h2>

              {credits.map((credit, i) => (
                <div key={`${slug}-credit-${i}`}>
                  <p className="text-[0.5rem] uppercase leading-none mb-0.5">{credit.label}</p>
                  {credit.input.map((entry, j) => (
                    <p key={`${slug}-entry-${i}-${j}`} className="text-sm font-light">{entry}</p>
                  ))}
                </div>
              ))}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}