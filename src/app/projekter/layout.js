'use client';

import { useRef, useState, useEffect } from 'react';
import { projects } from "@/data/projects";
import Map from '@/components/Map';

export default function ProjectsLayout({ children }) {
  const mapContainerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDimensions({ width, height });
    });

    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div ref={mapContainerRef} className="h-svh">
        <Map projects={projects} width={dimensions.width} height={dimensions.height} />
      </div>
      {children}
    </div>
  );
}