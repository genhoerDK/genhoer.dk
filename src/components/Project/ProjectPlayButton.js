import { PauseCircleIcon, PlayCircleIcon } from "@heroicons/react/20/solid";

export default function ProjectPlayButton({ active, playing, togglePlayback }) {
    if (!active) return null;

    return (
        <button onClick={togglePlayback} className="sm:-ml-8 md:-ml-10 mr-2 pointer-events-auto cursor-pointer" aria-label={playing ? "Pause lydværk" : "Afspil lydværk"}>
            {playing ? <PauseCircleIcon className="size-6 md:size-8" /> : <PlayCircleIcon className="size-6 md:size-8" />}
        </button>
    );
}