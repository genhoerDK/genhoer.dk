"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function VantaFog({ dimensions }) {
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState(null);

  useEffect(() => {
    let script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/vanta/0.5.24/vanta.fog.min.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (!vantaEffect && window.VANTA && window.VANTA.FOG) {
        setVantaEffect(
          window.VANTA.FOG({
            el: vantaRef.current,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: dimensions.height,
            minWidth: dimensions.width,
            highlightColor: 0xffffff,
            midtoneColor: 0x0,
            lowlightColor: 0x0,
            baseColor: 0xffffff,
            blurFactor: 0.5,
            speed: 0.75,
            zoom: 0.5,
            THREE,
          })
        );

        // Apply opacity to the canvas element
        const canvas = vantaRef.current.querySelector("canvas");
        if (canvas) {
          canvas.style.opacity = "0.5";
        }
      }
    };

    return () => {
      if (vantaEffect) vantaEffect.destroy();
      document.body.removeChild(script);
    };
  }, [vantaEffect]);

  return <div ref={vantaRef} className="absolute inset-0 size-full" />;
}