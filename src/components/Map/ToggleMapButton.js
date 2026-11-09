'use client';

import { useSearchParams } from 'next/navigation';
import Button from "@/components/UI/Button";
import Label from "@/components/UI/Label";
import { XMarkIcon, MapIcon } from "@heroicons/react/20/solid";
import { setOverlay } from '@/hooks/setOverlay';

export default function ToggleMapButton() {
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('kort');

    const handleToggle = () => {
        isOpen ? setOverlay('?') : setOverlay('?kort');
    }

    return (
        <Button variant="ghost" onClick={handleToggle} className="relative gap-1 h-10 px-2">
            {isOpen ? <XMarkIcon className="size-5" /> : <MapIcon className="size-5" />}
            <Label size="lg">Kort</Label>
            {isOpen && <div className="absolute inset-0 h-0.5 w-full bg-chrome"></div>}
        </Button>
    );
}