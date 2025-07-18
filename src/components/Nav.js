'use client';
import Link from 'next/link';

export default function Nav() {

    const navLinks = [
        { label: 'Projekter', slug: '' },
        { label: 'Deltag', slug: '' },
        { label: 'Info', slug: '' }
    ];

    return (
        <nav className="fixed bottom-0 w-full h-10 md:h-12 flex items-center gap-4 md:gap-6 px-2 md:px-4 bg-zinc-50 z-10">
            {navLinks.map(({ label, slug }) => (
                <Link key={`nav-link-${label}`} href={slug} className="text-lg md:text-xl font-light">{label}</Link>
            ))}
        </nav>
    );
};