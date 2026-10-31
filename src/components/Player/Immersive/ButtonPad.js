'use client';

import { useEffect, useState } from 'react';
import Label from '@/components/UI/Label';

/**
 * The buttons of an interactive work as real buttons — the same as pressing
 * them in the 3D scene, but reachable by touch, mouse, keyboard and screen readers.
 * Each finger holds its own button.
 */
export default function ButtonPad({ engine }) {
    const [pressed, setPressed] = useState([]);

    useEffect(() => {
        if (!engine) return;
        const sync = () => setPressed([...engine.pressed]);
        sync();
        return engine.subscribe(sync);
    }, [engine]);

    if (!engine) return <div className="flex-1" />;

    const down = (i) => (e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        engine.press(i);
    };
    const up = (i) => () => engine.release(i);
    const keyDown = (i) => (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); engine.press(i); } };
    const keyUp = (i) => (e) => { if (e.key === ' ' || e.key === 'Enter') engine.release(i); };

    return (
        <div className="flex-1 min-w-0 flex items-center justify-center gap-2 md:gap-3">
            {engine.buttons.map((b, i) => {
                const label = b.label ?? i + 1;
                const isShort = String(label).length <= 2;
                return (
                    <button
                        key={i}
                        aria-pressed={!!pressed[i]}
                        aria-label={`Knap ${label}`}
                        onPointerDown={down(i)}
                        onPointerUp={up(i)}
                        onPointerCancel={up(i)}
                        onKeyDown={keyDown(i)}
                        onKeyUp={keyUp(i)}
                        onContextMenu={(e) => e.preventDefault()}
                        className={`flex items-center justify-center h-10 rounded-full cursor-pointer touch-none transition ${isShort ? 'w-10' : 'px-4'} ${pressed[i] ? 'bg-hard text-paper scale-95' : 'bg-ink text-paper md:hover:bg-shade'}`}
                    >
                        <Label size="lg">{label}</Label>
                    </button>
                );
            })}
        </div>
    );
}
