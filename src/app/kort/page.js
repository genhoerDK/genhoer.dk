"use client";

import { useRef, useEffect, useState } from 'react';
import Map from '@/components/Old UI/Map';
import { projects } from '@/data/projects';

export default function Kort() {
  const mapContainerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (mapContainerRef.current) {
        const { width, height } = mapContainerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateSize(); // Initial size
    window.addEventListener('resize', updateSize); // Handle resizing

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div ref={mapContainerRef} className="relative w-full h-[100vh]">
      <Map projects={projects} width={dimensions.width} height={dimensions.height} />
    </div>
  );
}