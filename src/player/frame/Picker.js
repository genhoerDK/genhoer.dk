'use client';

/**
 * Picking one of a work's parts — the timeline's chapters, 53 sekunder's variations: a marker that
 * names the one that plays (number / count and title) and opens, upwards from where it stands, the
 * list of them all to pick from.
 *
 *   <PickerMarker number={3} count={12} title='Stormen Egon' onClick={open} what='Variation' list='variationerne' />
 *   <PickerList ref={listRef} heading='Variationer' items={[{ index, title, detail }]} current={2}
 *               onPick={(i) => …} onClose={close} />
 */

import { ChevronUpIcon, XMarkIcon } from '@heroicons/react/20/solid';
import Label from '@/components/UI/Label';

const pad = (n) => String(n).padStart(2, '0');

/**
 * Number and title of the part. Opens the list when it has an onClick.
 * @param {boolean} [hovering]  Another part than the playing one is under the pointer (the number dims)
 * @param {string} [what]       What a part is called, for screen readers ('Kapitel', 'Variation')
 * @param {string} [list]       What the list holds, for screen readers ('kapitlerne', 'variationerne')
 */
export function PickerMarker({ number, count, title, hovering = false, onClick, what = 'Kapitel', list = 'kapitlerne' }) {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            onClick={onClick}
            aria-haspopup={onClick ? 'listbox' : undefined}
            aria-label={onClick ? `${what} ${number} af ${count}: ${title}. Vis ${list}` : undefined}
            className={`flex items-stretch max-w-full group/marker ${onClick ? 'cursor-pointer' : 'pointer-events-none'}`}
        >
            <span className={`flex items-center px-1.5 tabular-nums transition-colors ${hovering ? 'bg-muted' : 'bg-paper'} text-ink`}>
                <Label size='lg'>{pad(number)}<span className='opacity-50'>/{pad(count)}</span></Label>
            </span>
            <span className='flex items-center gap-1 min-w-0 pl-2 pr-1.5 py-1.5 bg-ink/70 backdrop-blur-sm text-paper transition-colors md:group-hover/marker:bg-shade'>
                <Label size='lg' className='truncate'>{title}</Label>
                {onClick && <ChevronUpIcon className='size-3.5 shrink-0 text-faint' />}
            </span>
        </Tag>
    );
}

/**
 * The parts, to pick between. `items`: [{ index, title, detail? }] — detail stands to the right
 * (the chapter's time, or a note such as 'næste'). `current` is marked as the one that plays.
 * `className` places and sizes it (by default it opens upwards from the left of where the marker
 * stands, as wide as that, up to max-w-sm).
 */
export function PickerList({ ref, heading, items, current, onPick, onClose, className = 'left-0 w-full' }) {
    return (
        <div ref={ref} role='listbox' aria-label={heading} className={`absolute bottom-0 max-w-sm max-h-[55svh] overflow-y-auto bg-ink/85 backdrop-blur-md text-paper ${className}`}>
            <div className='flex items-center justify-between pl-3 pr-1 py-1 border-b border-paper/10'>
                <Label size='lg' className='text-faint'>{heading}</Label>
                <button onClick={onClose} aria-label='Luk' className='p-1.5 cursor-pointer text-faint md:hover:text-paper'><XMarkIcon className='size-4' /></button>
            </div>
            {items.map((item) => (
                <button
                    key={item.index}
                    role='option'
                    aria-selected={item.index === current}
                    onClick={() => onPick(item.index)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left cursor-pointer transition-colors md:hover:bg-shade ${item.index === current ? 'bg-paper/10' : ''}`}
                >
                    <Label size='lg' className='w-5 tabular-nums text-faint'>{pad(item.index + 1)}</Label>
                    <Label size='lg' className='flex-1 truncate'>{item.title}</Label>
                    {item.detail != null && <Label size='lg' className='tabular-nums text-faint'>{item.detail}</Label>}
                </button>
            ))}
        </div>
    );
}
