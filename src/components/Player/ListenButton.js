import { useAudio } from '@/context/AudioContext';
import Button from "@/components/UI/Button";
import Label from "@/components/UI/Label";
import { PlayCircleIcon } from "@heroicons/react/20/solid";

export default function ListenButton() {
    const { play } = useAudio();

    const handleClick = () => {
        play();
    }

    return (
        <Button variant="ghost" onClick={handleClick} className="gap-1 h-10 px-2.5">
            <PlayCircleIcon className="size-6" />
            <Label size="lg">Lyt</Label>
        </Button>
    );
}