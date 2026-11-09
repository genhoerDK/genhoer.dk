'use client';

import { useSearchParams } from 'next/navigation';
import { XMarkIcon, MusicalNoteIcon } from '@heroicons/react/20/solid';
import Button from '@/components/UI/Button';
import Label from '@/components/UI/Label';
import { setOverlay } from '@/hooks/setOverlay';

/** Opens the overview of works on top of the player (?lyt=vaerker). In the toolbar, only while the player is open */
export default function TracksOverviewButton() {
    const searchParams = useSearchParams();
    if (!searchParams.has('lyt')) return null;
    const isOpen = searchParams.get('lyt') === 'vaerker';

    return (
        <Button variant="ghost" onClick={() => setOverlay(isOpen ? '?lyt' : '?lyt=vaerker')} className="relative shrink-0 gap-1 h-10 px-2">
            {isOpen ? <XMarkIcon className="size-5" /> : <MusicalNoteIcon className="size-5" />}
            <Label size="lg">Værker</Label>
            {isOpen && <div className="absolute inset-0 h-0.5 w-full bg-chrome"></div>}
        </Button>
    );
}
