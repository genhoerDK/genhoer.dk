'use client';
import Link from 'next/link';
import { ChevronUpIcon } from '@heroicons/react/24/outline';

export default function Footer() {
    return (
        <div className="fixed bottom-0 flex items-center w-full bg-zinc-50 py-3 px-2 md:px-4">
            <button className="bg-zinc-800 px-4 py-1">
                <Link 
                    href="/kort" 
                    className="inline-flex items-center gap-2 text-zinc-50 uppercase font-light" 
                    aria-label="Se kort"
                >
                    <ChevronUpIcon className="w-4 h-4" aria-hidden="true" />
                    Kort
                </Link>
            </button>
        </div>
    );
}