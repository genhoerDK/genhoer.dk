"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import NavLink from "@/components/NavLink";

export default function Header() {
    return (
        <header className="fixed inset-x-0 h-10 px-2 bg-zinc-50 z-10 md:px-4">
            <nav className="flex items-center justify-between h-full">
                <Link href="/">
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
