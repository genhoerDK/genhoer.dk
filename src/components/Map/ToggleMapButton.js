'use client';

import { Suspense } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import LabelLarge from "@/components/LabelLarge";
import { XMarkIcon, MapIcon } from "@heroicons/react/20/solid";

export default function ToggleButton() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('kort');

    const handleToggle = () => {
        isOpen
            ? router.replace('?', { scroll: false })
            : router.replace('?kort', { scroll: false });
    }

    return (
        <Suspense fallback={null}>
            <button onClick={handleToggle} className="relative flex items-center gap-1 h-10 px-2 cursor-pointer md:hover:bg-zinc-800 md:hover:text-zinc-50">
                {isOpen ? <XMarkIcon className="size-5" /> : <MapIcon className="size-5" />}
                <LabelLarge>Kort</LabelLarge>
                {isOpen && <div className="absolute inset-0 bg-zinc-800 h-0.5 w-full"></div>}
            </button>
        </Suspense>
    );
}