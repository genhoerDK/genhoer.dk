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
            gyroControls: true,
            minHeight: dimensions.height,
            minWidth: dimensions.width,
            highlightColor: 0x27272a,
            midtoneColor: 0xe4e4e7,
            lowlightColor: 0x52525b,
            baseColor: 0xfafafa,
            blurFactor: 0.5,
            speed: 0.5,
            zoom: 0.5,
            THREE,
          })
        );
      }
    };

    return () => {
      vantaEffect && vantaEffect.destroy();
      document.body.removeChild(script);
    };
  }, [vantaEffect]);

  return <div ref={vantaRef} className="absolute inset-0 -z-10 size-full opacity-50" />;
}