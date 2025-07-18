'use client';
import Link from 'next/link';
import { MapPinIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

export default function Footer() {
    return (
        <div className="fixed bottom-0 flex items-center w-full bg-zinc-50 py-3 px-2 md:px-4">
            <button className="bg-zinc-800 px-4 py-1">
                <Link 
                    href="/kort" 
                    className="group inline-flex items-center gap-1 text-zinc-50 uppercase font-light" 
                    aria-label="Se kort"
                >
                    {/* Default icon (visible normally) */}
                    <MapPinIcon 
                        className="w-4 h-4 transition-opacity duration-200 opacity-100 group-hover:opacity-0" 
                        aria-hidden="true" 
                    />

                    {/* Hover icon (chevron shown on hover) */}
                    <ChevronUpIcon 
                        className="w-4 h-4 absolute transition-opacity duration-200 opacity-0 group-hover:opacity-100" 
                        aria-hidden="true" 
                    />

                    Kort
                </Link>
            </button>
        </div>
    );
}