import { useAudio } from '@/context/AudioContext';
import LabelLarge from "@/components/LabelLarge";
import { PlayCircleIcon } from "@heroicons/react/20/solid";

export default function ListenButton() {
    const { play } = useAudio();

    const handleClick = () => {
        play();
    }

    return (
         <button onClick={handleClick} className="flex items-center gap-1 h-10 px-2.5 cursor-pointer md:hover:bg-zinc-800 md:hover:text-zinc-50">
            <PlayCircleIcon className="size-6" />
            <LabelLarge>Lyt</LabelLarge>
        </button>
    );
}