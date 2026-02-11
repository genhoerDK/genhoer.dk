'use client';

import { useEffect, useState } from "react";

export default function LogoAnimation() {
    const [entered, setEntered] = useState(false);
    const [hideOverlay, setHideOverlay] = useState(false);
    const [mounted, setMounted] = useState(true);

    useEffect(() => {
        setEntered(true);

        // Timing of the g delays
        const lastDelayMs = 500;
        const animDurationMs = 100;

        // Keep it visible a tiny moment after finishing
        const holdMs = 300;

        // Fade overlay out, then unmount it
        const fadeDurationMs = 300; // match duration-300 below
        const tHide = setTimeout(
            () => setHideOverlay(true),
            lastDelayMs + animDurationMs + holdMs
        );
        const tUnmount = setTimeout(
            () => setMounted(false),
            lastDelayMs + animDurationMs + holdMs + fadeDurationMs
        );

        return () => {
            clearTimeout(tHide);
            clearTimeout(tUnmount);
        };
    }, []);

    if (!mounted) return null;

    return (
        <div className={`fixed inset-0 flex justify-center bg-paper z-20  duration-300 ease-out ${hideOverlay ? "opacity-0 pointer-events-none" : "opacity-100"}`}>

            <div className="flex items-center w-full md:w-1/2 h-full">

                <svg width="2472" height="426" viewBox="0 0 2472 426" fill="none" xmlns="http://www.w3.org/2000/svg" className="translate-x-0 bg-paper">
                    <g transform="translate(500,0)" className={`transition-all duration-100 ease-in ${entered ? "translate-x-0 opacity-100" : "translate-x-50 opacity-0"}`}>
                        <path d="M44 289.049C-14.6666 255.178 -14.6667 170.5 43.9999 136.629L260 11.9211C318.667 -21.9502 392 20.3888 392 88.1312V337.547C392 405.289 318.667 447.628 260 413.757L44 289.049Z" fill="#FAFAFA" />
                        <path d="M65.9999 282.163C12.6666 251.371 12.6667 174.391 66.0001 143.599L246 39.6762C299.333 8.88416 366 47.3742 366 108.958V316.804C366 378.388 299.333 416.878 246 386.086L65.9999 282.163Z" fill="#27272A" />
                    </g>
                    <g transform="translate(740,6)" className={`transition-all duration-100 ease-in delay-100 ${entered ? "translate-x-0 opacity-100" : "translate-x-50 opacity-0"}`}>
                        <path d="M48 290.133C-16 253.183 -16 160.806 48 123.856L240 13.0048C304 -23.9456 384 22.2423 384 96.1432V317.846C384 391.746 304 437.935 240 400.984L48 290.133Z" fill="#FAFAFA" />
                        <path d="M69.9999 283.403C11.3332 249.531 11.3333 164.853 70 130.982L226 40.9154C284.667 7.04422 358 49.3833 358 117.126V297.259C358 365.002 284.667 407.34 226 373.469L69.9999 283.403Z" fill="#27272A" />
                    </g>
                    <g transform="translate(972,11.5)" className={`transition-all duration-100 ease-in delay-200 ${entered ? "translate-x-0 opacity-100" : "translate-x-50 opacity-0"}`}>
                        <path d="M52 291.217C-17.3333 251.187 -17.3334 151.113 51.9999 111.083L220 14.0885C289.333 -25.9411 376 24.0959 376 104.155V298.145C376 378.204 289.333 428.241 220 388.211L52 291.217Z" fill="#FAFAFA" />
                        <path d="M73.9998 284.642C9.9998 247.691 9.99995 155.315 74 118.365L206 42.1547C270 5.20425 350 51.3924 350 125.293V277.714C350 351.615 270 397.802 206 360.852L73.9998 284.642Z" fill="#27272A" />
                    </g>
                    <g transform="translate(1196,17.5)" className={`transition-all duration-100 ease-in delay-300 ${entered ? "translate-x-0 opacity-100" : "translate-x-50 opacity-0"}`}>
                        <path d="M56.0001 292.3C-18.6666 249.192 -18.6667 141.419 55.9999 98.3107L200 15.1723C274.667 -27.9366 368 25.9494 368 112.167V278.444C368 364.661 274.667 418.548 200 375.439L56.0001 292.3Z" fill="#FAFAFA" />
                        <path d="M77.9998 284.881C8.66648 244.851 8.66661 144.777 77.9999 104.748L186 42.3939C255.333 2.36433 342 52.4015 342 132.461V257.168C342 337.228 255.333 387.265 186 347.235L77.9998 284.881Z" fill="#27272A" />
                    </g>
                    <g transform="translate(1412,23.5)" className={`transition-all duration-100 ease-in delay-400 ${entered ? "translate-x-0 opacity-100" : "translate-x-50 opacity-0"}`}>
                        <path d="M60.0001 293.384C-19.9999 247.196 -20.0001 131.726 59.9999 85.538L180 16.256C260 -29.932 360 27.8029 360 120.179V258.743C360 351.119 260 408.854 180 362.666L60.0001 293.384Z" fill="#FAFAFA" />
                        <path d="M81.9999 286.12C7.33326 243.011 7.33341 135.24 82.0001 92.1307L166 43.6332C240.667 0.524376 334 54.4105 334 140.628V237.623C334 323.841 240.667 377.727 166 334.618L81.9999 286.12Z" fill="#27272A" />
                    </g>
                    <g transform="translate(1620,29)" className={`transition-all duration-100 ease-in delay-500 ${entered ? "translate-x-0 opacity-100" : "translate-x-50 opacity-0"}`}>
                        <path d="M64.0001 294.468C-21.3333 245.201 -21.3334 122.033 63.9999 72.7653L160 17.3397C245.333 -31.9275 352 29.6564 352 128.191V239.042C352 337.576 245.333 399.161 160 349.893L64.0001 294.468Z" fill="#FAFAFA" />
                        <path d="M85.9999 287.36C5.99992 241.172 6.00008 125.702 86.0001 79.5135L146 44.8724C226 -1.31557 326 56.4195 326 148.796V218.078C326 310.454 226 368.189 146 322.001L85.9999 287.36Z" fill="#27272A" />
                    </g>
                </svg>

            </div>

        </div>
    );
}