// The interface components, by the name a work's player uses (src/player/players.js). What each one
// needs (its engine, the overlay's tone, whether it opens from the project page) is in registry.js,
// which the audio layer reads without pulling in React.
//
// To add an interface: a component here, a line in registry.js, and its settings in players.js.

import TimelinePlayer from '@/player/interfaces/timeline/TimelinePlayer';
import InstrumentPlayer from '@/player/interfaces/buttons/InstrumentPlayer';
import LoopPlayer from '@/player/interfaces/loop/LoopPlayer';
import CountdownPlayer from '@/player/interfaces/countdown/Countdown';
import WalkPlayer from '@/player/interfaces/walk/Walk';
import QuadPlayer from '@/player/interfaces/quad/Quad';
import StreetPlayer from '@/player/interfaces/street/Street';

export const components = {
    timeline: TimelinePlayer,
    buttons: InstrumentPlayer,
    loop: LoopPlayer,
    countdown: CountdownPlayer,
    walk: WalkPlayer,
    quad: QuadPlayer,
    street: StreetPlayer,
};
