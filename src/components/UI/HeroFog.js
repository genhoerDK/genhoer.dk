"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HeroFog() {
  const vantaRef = useRef(null);
  const effectRef = useRef(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/vanta/0.5.24/vanta.fog.min.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (!effectRef.current && window.VANTA?.FOG) {
        effectRef.current = window.VANTA.FOG({
          el: vantaRef.current,
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          highlightColor: 0x27272a,
          midtoneColor: 0xe4e4e7,
          lowlightColor: 0x52525b,
          baseColor: 0xfafafa,
          blurFactor: 0.5,
          speed: 0.5,
          zoom: 0.5,
          THREE,
        });
      }
    };

    return () => {
      if (effectRef.current) {
        effectRef.current.destroy();
      }
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div
      ref={vantaRef}
      className="absolute inset-0 -z-10 w-screen h-svh opacity-25"
    />
  );
}