"use client";

import { projects } from "@/data/projects";

export default function Participate() {

  function formatLocations(list) {
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} og ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} og ${list[list.length - 1]}`;
}

const workshops = formatLocations(
  projects
    .filter((project) => project.workshop)
    .map((project) => project.city)
);

  return (
    <article>

      <section className="flex flex-col justify-center px-2 md:px-4 py-14 min-h-screen">
        <div className="grid grid-cols-12 md:grid-cols-24 gap-4 py-8">
          <div className="col-span-full md:col-start-4 max-w-3xl">
            <h2 className="uppercase font-light md:text-xl mb-1">Deltag i workshops om lyd</h2>
            <p className="font-light pb-2 text-sm md:text-lg">I forbindelse med hvert udstillingsprojekt afholder Genhør et workshopforløb for lokale unge mellem 12-24 år. Her dykker vi ned i den stedbundne historie og udforsker hvordan vi med musik og lyddesign, kan skabe en lydinstallation der gør lokalhistorien levende for publikum.</p>
            <p className="font-light text-sm md:text-lg"></p>
            {workshops && ( <p className="font-light text-sm md:text-lg">Der bliver i fremtiden afholdt kreative workshops i {workshops}. Hvis du har lyst til at være med til at udvikle og udforme en udstilling, så ræk ud til os eller tag fat i en af vores lokale samarbejdspartnere!</p> )}
          </div>
        </div>
      </section>

    </article>
  );
}