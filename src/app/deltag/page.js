"use client";

import LabelSmall from "@/components/LabelSmall";

export default function Participate() {

  return (
    <article className="pt-24">

      <section className="px-2 md:px-4 py-24">
        <div className="grid grid-cols-12 md:grid-cols-24 gap-8">
          <figure className="col-span-6 col-start-2">
            <video src="https://cdn.genhoer.dk/media/workshop.mp4" playsInline muted loop autoPlay className="object-cover size-full" />
          </figure>
          <div className="col-span-13 md:col-start-8 py-8">
            <LabelSmall>Workshops</LabelSmall>
            <p className="font-light py-1 text-sm md:text-lg">I forbindelse med hvert udstillingsprojekt afholder Genhør et workshopforløb for lokale unge mellem 12-24 år. Her dykker vi ned i den stedbundne historie og udforsker hvordan vi med musik og lyddesign kan skabe en lydinstallation der gør lokalhistorien levende for publikum.</p>
          </div>
        </div>
      </section>

    </article>
  );
}