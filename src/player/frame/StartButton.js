'use client';

import { PlayIcon } from '@heroicons/react/20/solid';
import SoundButton from '@/player/frame/SoundButton';

/** The one press that starts a work with an engine — browsers only play sound after a press. The works' button (SoundButton.js), in the middle, with no text: `label` is for screen readers */
export default function StartButton({ onClick, label = 'Start' }) {
    return (
        <div className='absolute inset-0 z-10 flex items-center justify-center'>
            <SoundButton size='lg' onClick={onClick} ariaLabel={label}>
                <PlayIcon className='size-10 ml-1' />
            </SoundButton>
        </div>
    );
}
