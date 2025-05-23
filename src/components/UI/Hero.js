"use client";

import { useEffect, useState } from "react";
import VantaFog from "@/components/MapSection/VantaFog";

export default function Hero() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <section className="relative flex justify-center items-end w-screen h-svh overflow-hidden -mt-20 px-8">
        <VantaFog dimensions={dimensions} />
        <div className="container w-3xl text-center py-24">
            <h2 className="font-rem font-thin text-5xl uppercase">Et lydligt vindue til den nære Danmarkshistorie</h2>
            <p className="py-4">Genhør er en nonprofitorganisation, der i samarbejde med kommuner, arkiver og museer engagerer unge i lokal kulturskabelse og udstiller offentlig tilgængelig lydkunst, der styrker kendskabet til den stedbundne kulturarv og den lokale kulturhistorie.</p>
        </div>
      
    </section>
  );
}