/**
 * Randomness from a seed, so a scene looks the same every time it is built.
 */

/** A random number generator from a seed: rand() is 0–1, rand.range(a, b), rand.pick(list) */
export function random(seed) {
    let s = seed;
    const next = () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.range = (a, b) => a + (b - a) * next();
    next.pick = (list) => list[Math.floor(next() * list.length)];
    return next;
}
