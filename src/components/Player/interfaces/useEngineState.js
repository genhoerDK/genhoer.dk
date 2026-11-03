'use client';

import { useEffect, useState } from 'react';

/** The engine's getState(), read a number of times a second (null without an engine) */
export function useEngineState(engine, fps = 30) {
    const [state, setState] = useState(null);

    useEffect(() => {
        if (!engine) return;
        let frame;
        let last = 0;
        const read = (t) => {
            frame = requestAnimationFrame(read);
            if (t - last < 1000 / fps) return;
            last = t;
            setState(engine.getState());
        };
        frame = requestAnimationFrame(read);
        return () => cancelAnimationFrame(frame);
    }, [engine, fps]);

    return engine ? state : null;
}
