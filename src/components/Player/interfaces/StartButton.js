'use client';

import { PlayIcon } from '@heroicons/react/20/solid';
import Label from '@/components/UI/Label';

/** The one press that starts a work with an engine — browsers only play sound after a press */
export default function StartButton({ onClick, label = 'Tryk for at starte' }) {
    return (
        <button onClick={onClick} className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 cursor-pointer group'>
            <span className='flex items-center justify-center size-24 rounded-full bg-paper text-ink transition-colors md:group-hover:bg-muted'>
                <PlayIcon className='size-10 ml-1' />
            </span>
            <Label size='lg' className='text-muted'>{label}</Label>
        </button>
    );
}
