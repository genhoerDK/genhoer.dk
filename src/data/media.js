// The sound works' files on the CDN (cdn.genhoer.dk/media/<folder>/), by slug. Set here, not in
// genhoer-data: projects.js lays them over projects.json. The cover video and the gallery come from
// genhoer-data (projects.json), where the dashboard's media uploader sets them.
//
// folder       The project's folder on the CDN (its id in genhoer-data, e.g. kolding-2026)
// audio        The sound work, when it is one file (works with several have them in their player.js)
// artwork      Lock screen image while playing (none = public/fallback-artwork.jpg)
// segments     The sound work's chapters: [title, start in seconds, image]. The image is
//              segment-01.webp, segment-02.webp … unless a file is given
//
// A work whose slug changes keeps its entry under the new slug.
import { cdn } from '@/player/vaerker/files';

export const media = {
    'guldminebyen-paa-doedens-kyst': {
        folder: 'hvide-sande-2026', audio: 'track-v1.mp3',
        segments: [
            ['Tyskerhavnen', 0, 'cover-image-small.webp'],
            ['Fjord og hav', 60, 'cover-image-small.webp'],
            ['Sand, legende børn og jernaffald', 140, 'cover-image-small.webp'],
            ['Profiler af en by', 268, 'cover-image-small.webp'],
            ['Mager er jorden', 315, 'cover-image-small.webp'],
            ['Ingen forbindelse', 400, 'cover-image-small.webp'],
        ],
    },
    'bulows-kaserne': {
        folder: 'fredericia-2025', audio: 'track-v1.mp3', artwork: 'artwork.jpg',
        segments: [
            ['Angreb på ubåde', 0],
            ['Indkvartering', 126],
            ['Træning', 240],
            ['"Kommunikation I"', 346],
            ['"Kommunikation II"', 380],
            ['Skydetræning', 503.5],
            ['"Langsom march I"', 540.1],
            ['"March I"', 604.2],
            ['FUT', 653],
            ['"Langsom march II"', 695.2],
            ['Morgenstund', 828],
            ['"March II"', 878],
            ['Kommandanten', 904],
            ['"March III"', 930.2],
            ['Kontoret', 1009],
        ],
    },
    'kirkestraede': {
        folder: 'koege-2025', audio: 'track-v1.mp3', artwork: 'artwork.jpg',
        segments: [
            ['Bødkermester Reerslev', 0],
            ['Enkefru Ahlers, Hr. Svendsen og Pastoren', 90],
            ['Anton og tøndebåndet', 165],
            ['Fingerpolka i avistrykkeriet', 200],
            ['Smedjen', 272],
            ['Fællessang', 396],
        ],
    },
    'unge-stemmer': {
        folder: 'holbaek-2025', audio: 'track-v1.mp3', artwork: 'artwork.jpg',
        segments: [
            ['Isefjorden og Buena Vista', 0],
            ['Efterår', 165],
            ['Tidsrejse', 228],
            ['Jazzklub', 326],
            ['Her i Østre Anlæg', 410],
            ['Forårskomsammen', 502],
            ['Vi er mange unge i Holbæk', 604],
            ['Oprør', 756],
            ['Isoleret i offentligheden', 835],
            ['Ahlgade', 1026],
            ['Holbæks kommunale modborgerhus', 1120],
        ],
    },
    'vi-vokser-og-flytter-os': {
        folder: 'faaborg-2025', audio: 'track-v1.mp3', artwork: 'artwork.jpg',
        segments: [
            ['Udvikling', 0],
            ['Arbejde', 379],
            ['Maskiner I', 648],
            ['Stemmer', 895],
            ['Maskiner II', 1137],
        ],
    },
    'slotsgade-20': {
        folder: 'haderslev-2025', audio: 'track-v1.mp3', artwork: 'artwork.jpg',
        segments: [
            ['Huset opføres af Philip af Neuss', 0],
            ['Torstenssonfejden og plettyfys-epidemi', 150],
            ['Hestevogne og herberg', 295],
            ['Treårskrigen og Hans Nielsens krigsvise', 450],
            ['Industrialisering, arbejdere og de mange børn', 602],
        ],
    },
    'vordingborg-station': {
        folder: 'vordingborg-2025', audio: 'track-v1.mp3', artwork: 'artwork.jpg',
        segments: [
            ['Frihed under ansvar', 0],
            ['Sådan var det jo dengang', 74],
            ['Kiosk, billetter, støj og damp', 101],
            ['Eksport af tømmer', 166],
            ['Devantiers ankomst', 250],
            ['Når soldaterne skulle hjem', 318],
            ['Det gik stille og roligt ned', 415],
            ['Nogen til kasernen?', 442],
            ['Man vænner sig til alting', 523.5],
        ],
    },
    'grindsted-station': {
        folder: 'grindsted-2024', audio: 'track-v1.mp3', artwork: 'artwork.jpg',
        segments: [
            ['Ankomst', 0],
            ['Godshåndtering', 154],
            ['Togfløjtesynth', 310],
            ['Ventetid', 426],
            ['Afgang', 548],
        ],
    },
};

/** The project with its files from media above (null where there are none) */
export function withMedia(project) {
    const m = media[project.slug] ?? {};
    const url = (file) => (file ? cdn(m.folder, file) : null);
    return {
        ...project,
        audio: url(m.audio),
        artwork: url(m.artwork),
        segments: m.segments
            ? m.segments.map(([title, start, image], i) => ({ title, start, image: url(image ?? `segment-${String(i + 1).padStart(2, '0')}.webp`) }))
            : null,
    };
}
