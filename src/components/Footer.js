'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

export default function Footer() {
    const pathname = usePathname();
    const isMap = pathname === '/kort';

    const buttonClass = 'flex items-center gap-1 border border-zinc-800 px-3 py-2 transition-colors';
    const annotationClass = 'text-xs uppercase leading-none font-light';

    return (
        <div className="fixed bottom-0 w-full bg-zinc-50 py-2 px-2 md:px-4 flex gap-2 md:gap-4">
            <Link
                href="/"
                aria-label="Se projektgalleri"
                className={`${buttonClass} ${isMap ? 'hover:bg-zinc-100 hover:text-zinc-500 hover:border-zinc-500 text-zinc-800' : 'bg-zinc-800 text-zinc-50'}`}
            >
                <Squares2X2Icon className="h-4 w-4" />
                <p className={`${annotationClass}`}>Galleri</p>
            </Link>
            <Link
                href="/kort"
                aria-label="Se projektkort"
                className={`${buttonClass} ${isMap ? 'bg-zinc-800 text-zinc-50' : 'hover:bg-zinc-100 hover:text-zinc-500 hover:border-zinc-500 text-zinc-800'}`}
            >
                <MapIcon className="h-4 w-4" />
                <p className={`${annotationClass}`}>Kort</p>
            </Link>
        </div>
    );
}