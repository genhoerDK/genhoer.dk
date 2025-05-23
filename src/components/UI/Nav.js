"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

const navItems = [
  { href: "/projekter", label: "Projekter" },
  { href: "/deltag", label: "Deltag" },
  { href: "/organisationen", label: "Organisationen" },
  { href: "/kontakt", label: "Kontakt" },
];

const Nav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  // 👇 Automatically close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <nav className="relative">
      {/* Desktop nav */}
      <ul className="hidden md:flex">
        {navItems.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className="font-rem font-semibold text-sm uppercase px-4 py-2 hover:underline">{label}</Link>
          </li>
        ))}
      </ul>

      {/* Mobile burger icon */}
      <button onClick={toggleMenu} className="md:hidden p-2 focus:outline-none z-50 relative" aria-label="Toggle menu">
        {isOpen ? ( <XMarkIcon className="h-8 w-8 text-zinc-800" /> ) : ( <Bars3Icon className="h-8 w-8 text-zinc-800" /> )}
      </button>

      {/* Fullscreen mobile nav overlay */}
      <div
        className={`fixed inset-0 bg-zinc-50 z-40 flex flex-col items-center justify-center gap-12 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navItems.map(({ href, label }) => (
          <Link key={href} href={href} onClick={closeMenu} className="font-rem font-semibold text-xl uppercase hover:underline">{label}</Link>
        ))}
      </div>
    </nav>
  );
};

export default Nav;