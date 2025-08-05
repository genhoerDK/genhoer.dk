'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useAudio } from '@/context/AudioContext'
import { useFooter } from "@/context/FooterContext";
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';

export default function Footer() {
    const { buttons } = useFooter();
    const { isPlaying, togglePlay } = useAudio()

    return (
        <footer className="fixed bottom-0 flex flex-row-reverse items-center justify-between w-full p-2 md:px-4 bg-zinc-50 text-zinc-900">

            {/* Audio button and text */}
            <motion.div className="flex items-center" layout>
                <motion.button layout onClick={togglePlay} className="flex justify-center items-center size-10 border border-zinc-900 bg-zinc-50 md:hover:bg-zinc-900 md:hover:text-zinc-50 cursor-pointer" aria-label={isPlaying ? "Pause" : "Afspil"}>
                    {isPlaying ? ( <PauseIcon className="size-5" /> ) : ( <PlayIcon className="size-5" /> )}
                </motion.button>

                <AnimatePresence mode="popLayout">
                    {isPlaying && (
                        <motion.div
                            className="flex flex-col justify-center ml-2 pointer-events-none"
                            initial={{ x: 200, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 200, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                            layout
                        >
                            <p className="text-[0.6rem] font-medium uppercase">Du lytter til</p>
                            <p className="text-[0.6rem] uppercase truncate">Genhør Grindsted Station</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Page buttons */}
            <div className="flex gap-2">
                {buttons.map((btn, index) => (
                    <motion.button
                        key={`page-button-${btn.label}`}
                        onClick={btn.onClick}
                        className="flex justify-center items-center h-10 px-3 border border-zinc-900 bg-zinc-50 md:hover:bg-zinc-900 md:hover:text-zinc-50 cursor-pointer"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 700,
                            damping: 20,
                            delay: 0.3 + index * 0.1,
                        }}
                    >
                        {btn.icon && <span className="size-5 mr-1">{btn.icon}</span>}
                        <p className="text-xs uppercase leading-none">{btn.label}</p>
                    </motion.button>
                ))}
            </div>

        </footer>
    );
}