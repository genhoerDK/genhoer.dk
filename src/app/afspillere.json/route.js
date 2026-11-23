// genhoer.dk/afspillere.json: the works that have their own entry in src/player/players.js, by slug, with their
// interface ({ "tvaerveje": "walk", ... }). The dashboard in genhoer-data reads it so it doesn't offer a sound file
// and segments for a work that plays in its own (3D) interface. Written once at build time.
import { players } from '@/player/players';
import { DEFAULT_INTERFACE } from '@/player/interfaces/registry';

export const dynamic = 'force-static';

export function GET() {
    return Response.json(Object.fromEntries(Object.entries(players).map(([slug, p]) => [slug, p.interface ?? DEFAULT_INTERFACE])));
}
