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
    <section className="relative flex justify-center items-end w-screen h-svh overflow-hidden -mt-20">
        <VantaFog dimensions={dimensions} />
        <div className="md:container md:mx-auto">
            <h2 className="font-rem font-thin text-4xl">Et lydligt vindue til den nære Danmarkshistorie</h2>
        </div>
      
    </section>
  );
}