import { useAudio } from '@/player/AudioContext';
import { useListen } from '@/player/frame/useListen';
import Button from "@/components/UI/Button";
import Label from "@/components/UI/Label";
import { PlayCircleIcon } from "@heroicons/react/20/solid";

export default function ListenButton() {
    const { currentTrack } = useAudio();
    const listen = useListen();

    // The current work, as from its project page: a work that only its own buttons start is opened
    const handleClick = () => {
        if (currentTrack) listen(currentTrack);
    }

    return (
        <Button variant="ghost" onClick={handleClick} className="gap-1 h-10 px-2.5">
            <PlayCircleIcon className="size-6" />
            <Label size="lg">Lyt</Label>
        </Button>
    );
}