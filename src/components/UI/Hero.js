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
    <section className="relative w-svw h-svh overflow-hidden -mt-20">
      <VantaFog dimensions={dimensions} />
    </section>
  );
}