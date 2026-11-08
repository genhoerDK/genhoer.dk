'use client';

/**
 * The works' one button: round, white and waiting to be pressed; dark and see-through while it
 * sounds. A ring round it runs with the sound (or counts down), and what stands in it is up to
 * the work: a number (53 sekunder's display), an icon (play, pause), a note (Troldetoner).
 * Round and white means sound on genhoer.dk (STIL.md), so every work is played with this button.
 *
 *   <SoundButton size='md' on={playing} ring={progress} label='Kirstine' detail='1620'
 *                onClick={…}>…</SoundButton>
 *
 * @param {'lg'|'md'|'sm'} [size='md']  lg: one big button (53 sekunder, the start); md: a row of
 *                                      them (Tværveje's stories, Troldetoner's notes); sm: in a bar
 *                                      (the timeline)
 * @param {boolean} [on]       It sounds: dark and see-through, its content white
 * @param {boolean} [held]     Held down right now (pressed a little in)
 * @param {number|null} [ring] 0–1: how much of the ring is drawn (null: only the faint track)
 * @param {boolean} [ringTrack=true]  The faint full circle under the ring
 * @param {React.ReactNode} [label]   A line under it (uppercase), [detail] a second, fainter line
 * @param {string} ariaLabel   What it does, in Danish
 * Other props (onClick, onPointerDown, aria-*, disabled …) go to the <button>.
 */

import Label from '@/components/UI/Label';

const RADIUS = 47;   // as the ring in 53 sekunder and Under overfladen
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SIZES = {
    lg: { box: 'size-28 md:size-32', text: 'text-[2.6rem] md:text-[3rem]', stroke: 1.2, gap: 'mt-4' },
    md: { box: 'size-16 sm:size-20 md:size-24', text: 'text-[1.3rem] sm:text-[1.6rem] md:text-[1.9rem]', stroke: 1.8, gap: 'mt-3' },
    sm: { box: 'size-12 md:size-12', text: 'text-base', stroke: 3, gap: 'mt-2' },
};

export default function SoundButton({ size = 'md', on = false, held = false, ring = null, ringTrack = true, label, detail, ariaLabel, className = '', children, ...button }) {
    const s = SIZES[size] ?? SIZES.md;
    const waiting = !on;
    return (
        <div className={`flex flex-col items-center ${className}`}>
            <button
                type='button'
                aria-label={ariaLabel}
                onContextMenu={(e) => e.preventDefault()}
                {...button}
                className={`relative flex items-center justify-center ${s.box} shrink-0 rounded-full group touch-none select-none ${button.disabled || button['aria-disabled'] ? 'cursor-default' : 'cursor-pointer'}`}
            >
                {/* The ring: the sound running, or a count running down */}
                <svg viewBox='0 0 100 100' className='absolute inset-0 size-full -rotate-90' aria-hidden='true'>
                    {ringTrack && (
                        <circle cx='50' cy='50' r={RADIUS} fill='none' stroke='currentColor' strokeWidth={s.stroke} className={`transition-opacity ${on ? 'opacity-20' : 'opacity-30 md:group-hover:opacity-100'}`} />
                    )}
                    {ring != null && (
                        <circle
                            cx='50' cy='50' r={RADIUS} fill='none' stroke='currentColor' strokeWidth={s.stroke} strokeLinecap='round'
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, ring)))}
                            style={{ transition: 'stroke-dashoffset 0.3s linear' }}
                        />
                    )}
                </svg>
                {/* The disc: white and waiting, or dark and sounding */}
                <span
                    className={`flex items-center justify-center size-[84%] rounded-full font-extralight tabular-nums leading-none ${s.text} transition-[background-color,color,transform] duration-300 ${
                        waiting ? 'bg-paper text-ink/70 md:group-hover:bg-muted' : 'bg-paper/15 text-paper'
                    } ${held ? 'scale-95' : ''}`}
                >
                    {children}
                </span>
            </button>
            {label && <Label size='lg' className={`${s.gap} text-muted`}>{label}</Label>}
            {detail && <Label size='lg' className='mt-1 text-faint tabular-nums'>{detail}</Label>}
        </div>
    );
}
