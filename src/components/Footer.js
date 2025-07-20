'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

export default function Footer() {
    const pathname = usePathname();
    const isMap = pathname === '/kort';

    const baseButton = 'flex items-center gap-1 px-3 py-2 text-xs uppercase leading-none font-light transition-colors';
    const activeStyles = 'bg-zinc-800 text-zinc-50';
    const inactiveStyles = 'bg-zinc-50 text-zinc-800 hover:bg-zinc-100 hover:text-zinc-500';

    return (
        <div className="fixed bottom-0 w-full bg-zinc-50 py-2 px-2 md:px-4">
            <div className="inline-flex overflow-hidden border border-zinc-800">
                <Link
                    href="/"
                    aria-label="Se projektgalleri"
                    className={`${baseButton} ${!isMap ? activeStyles : inactiveStyles}`}
                >
                    <Squares2X2Icon className="h-4 w-4" />
                    <span>Galleri</span>
                </Link>
                <Link
                    href="/kort"
                    aria-label="Se projektkort"
                    className={`${baseButton} ${isMap ? activeStyles : inactiveStyles}`}
                >
                    <MapIcon className="h-4 w-4" />
                    <span>Kort</span>
                </Link>
            </div>
        </div>
    );
}