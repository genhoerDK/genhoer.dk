'use client';

import Link from 'next/link';

export default function Nav() {

  return (
    <nav className="fixed bottom-0 w-full h-10 md:h-12 flex items-center gap-2 md:gap-4 px-2 md:px-4 bg-zinc-50 z-10">
        <Link href="" className="text-xl md:text-2xl font-light">Deltag</Link>
        <Link href="" className="text-xl md:text-2xl font-light">Info</Link>
    </nav>
  );
};