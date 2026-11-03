'use client';

import Link from "next/link";
import Logo from "@/components/UI/Logo";
import NavLink from "@/components/Layout/NavLink";
import { useChrome } from "@/hooks/useChrome";

// The logo is not a heading: each page sets its own <h1>.
// See-through, in light or dark, over parts of the page that ask for it (useChrome)
export default function Header() {
    const tone = useChrome();

    return (
        <header
            data-chrome={tone ?? undefined}
            className={`fixed top-0 inset-x-0 h-10 px-gutter z-20 text-chrome transition-colors duration-300 ${tone ? 'bg-transparent' : 'bg-paper'}`}
        >
            <nav className="flex items-center justify-between h-full">
                <Link href="/">
                    <span className="sr-only">Genhør</span>
                    <Logo />
                </Link>
                <div className="flex gap-4">
                    <NavLink href="/deltag">Deltag</NavLink>
                    <NavLink href="/info">Info</NavLink>
                </div>
            </nav>
        </header>
    );
}
