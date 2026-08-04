"use client";

import { motion } from "framer-motion";
import LabelSmall from "@/components/LabelSmall";

export default function TextSection({ label, largeText = [], smallText = [] }) {
    return (
        <motion.section className="grid grid-cols-24 items-center min-h-svh px-2 md:px-4 pt-14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.1 }}>
            <div className="col-span-full lg:col-start-3 lg:col-span-18 xl:col-start-5 xl:col-span-14">
                <div className="pb-12">
                    {label && <LabelSmall>{label}</LabelSmall>}
                    {largeText.map((text) => (
                        <p key={text} className="pt-1 font-light md:text-xl">{text}</p>
                    ))}
                </div>

                <div className="flex flex-col gap-4 w-2xs md:w-xs ml-auto text-left">
                    {smallText.map((text) => (
                        <p key={text} className="text-xs font-light md:text-sm">{text}</p>
                    ))}
                </div>
            </div>
        </motion.section>
    );
}