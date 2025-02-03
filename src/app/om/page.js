
import ProjectCard from '@/components/ProjectCard';

export default function About() {
    return (
      <div>
        <h1>Om os</h1>
        <p>Velkommen til om-siden.</p>
        <ProjectCard title="Projekt A" description="Beskrivelse her" imageUrl="/example.jpg" />
      </div>
    );
  }