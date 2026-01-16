"use client";

import { useSearchParams } from 'next/navigation';
import { projects } from "@/data/projects";

export default function Player() {
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('lyt');

    return (
        <article className={`fixed inset-0 w-screen h-dvh ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
            <section className='relative size-full overflow-hidden mt-10 bg-zinc-100'>
                
            </section>
        </article>
    );
}