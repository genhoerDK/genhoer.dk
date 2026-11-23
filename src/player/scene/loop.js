/**
 * The frame loop of a 3D scene: `tick(time)` once per frame, but only while the scene is on the
 * screen. The player stays mounted when it is closed — it then lies just below the screen
 * (Layout/Overlay.js) — and a browser draws a canvas off the screen as readily as one on it, so
 * without this a closed player keeps the graphics card busy on every page.
 *
 * A closed overlay touches the bottom edge of the screen, which counts as intersecting; so only
 * a real sliver on the screen (SHOWING) counts as shown. The first frame is always drawn, so there
 * is a picture when the player slides in. In a hidden tab the browser stops the frames anyway.
 *
 *   const stop = frameLoop(container, (time) => { ... renderer.render(scene, camera); });
 *   stop();   // when the scene is taken down
 *
 * After a pause, `time` jumps: cap the step a frame moves things by (as the scenes do).
 */

const SHOWING = 0.001;   // share of the element on the screen

export function frameLoop(element, tick) {
    let frame = null;
    let shown = true;
    let stopped = false;

    const run = (time) => {
        frame = null;
        if (stopped || !shown) return;
        frame = requestAnimationFrame(run);
        tick(time);
    };

    const observer = new IntersectionObserver(([entry]) => {
        shown = entry.intersectionRatio >= SHOWING;
        if (shown && frame === null && !stopped) frame = requestAnimationFrame(run);
    }, { threshold: SHOWING });
    observer.observe(element);
    frame = requestAnimationFrame(run);

    return () => {
        stopped = true;
        if (frame !== null) cancelAnimationFrame(frame);
        observer.disconnect();
    };
}
