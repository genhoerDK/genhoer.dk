import Link from "next/link";
import Logo from "@/components/UI/Logo";
import NavLink from "@/components/Layout/NavLink";

// The logo is not a heading: each page sets its own <h1>
export default function Header() {
    return (
        <header className="fixed inset-x-0 h-10 px-gutter bg-paper z-20">
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
