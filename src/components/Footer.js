'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

export default function Footer() {
    const pathname = usePathname();
    const isMap = pathname === '/kort';

    return (
        <div className="fixed bottom-0 w-full bg-zinc-50 py-2 px-2 md:px-4">
            <div className="relative inline-flex overflow-hidden border border-zinc-800">
                
                <div className={`absolute top-0 left-0 z-0 h-full w-1/2 bg-zinc-800 transition-transform duration-300 ease-in-out ${isMap ? 'translate-x-full' : 'translate-x-0'}`} />

                <Link href="/" aria-label="Se projektgalleri" className={`z-10 flex items-center justify-center size-8 md:size-10 transition-colors duration-300 ${!isMap ? 'text-zinc-50' : 'text-zinc-800'}`}>
                    <Squares2X2Icon className="size-5" />
                </Link>

                <Link href="/kort" aria-label="Se projektkort" className={`z-10 flex items-center justify-center size-8 md:size-10 transition-colors duration-300 ${!isMap ? 'text-zinc-800' : 'text-zinc-50'}`}>
                    <MapIcon className="size-5" />
                </Link>
            </div>
        </div>
    );
}