// The engines behind the interfaces that don't play one file through the audio element
// (src/player/interfaces/registry.js says which interface uses which). Each is a
// class with start(), pause(), dispose(), getState() and position / duration for the mini player.

import Instrument from './Instrument';
import Loop from './Loop';
import Quad from './Quad';
import Street from './Street';
import { instruments } from '@/player/vaerker/instruments';
import { streetConfig } from '@/player/interfaces/street/speakers';

export function createEngine(kind, player) {
    switch (kind) {
        case 'instrument': return new Instrument(instruments[player.instrument]);
        case 'loop': return new Loop(player);
        case 'quad': return new Quad(player);
        case 'street': return new Street(streetConfig(player));
        default: throw new Error(`Unknown engine: ${kind}`);
    }
}
