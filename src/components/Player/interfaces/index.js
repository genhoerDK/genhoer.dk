// The interface components, by the name a work's player uses (src/data/players.js). What each one
// needs (its engine, the overlay's tone, whether it opens from the project page) is in registry.js,
// which the audio layer reads without pulling in React.
//
// To add an interface: a component here, a line in registry.js, and its settings in players.js.

import CircularScrubber from '@/components/Player/CircularScrubber';
import TimelinePlayer from '@/components/Player/TimelinePlayer';
import InstrumentPlayer from '@/components/Player/InstrumentPlayer';
import LoopPlayer from '@/components/Player/interfaces/Loop';
import CountdownPlayer from '@/components/Player/interfaces/Countdown';
import WalkPlayer from '@/components/Player/interfaces/Walk';
import QuadPlayer from '@/components/Player/interfaces/Quad';

export const components = {
    circular: CircularScrubber,
    timeline: TimelinePlayer,
    buttons: InstrumentPlayer,
    loop: LoopPlayer,
    countdown: CountdownPlayer,
    walk: WalkPlayer,
    quad: QuadPlayer,
};
