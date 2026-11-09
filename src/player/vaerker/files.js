// Where the works' files are: the CDN, and placeholder sound until the real files are there.
//
// Placeholder sound: a file written as 'placeholder:<name>?s=<seconds>&seed=<n>' is synthesised in
// the browser (src/player/audio/placeholder.js) until the real file is on the CDN. Swap the string for
// the file's URL — nothing else changes.

export const cdn = (folder, file) => `https://cdn.genhoer.dk/media/${folder}/${file}`;
export const placeholder = (name, seconds, seed, extra = '') => `placeholder:${name}?s=${seconds}&seed=${seed}${extra}`;
