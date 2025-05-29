'use client';

import { projects } from "@/data/projects";
import Map from '@/components/Map';

export default function ProjectsLayout({ children }) {

  return (
    <div>
      <div className='h-svh'>
        <Map projects={projects}/>
      </div>
      {children}
    </div>
  );
}