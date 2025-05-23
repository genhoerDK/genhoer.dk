'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const Header = () => {
    const headerRef = useRef(null);
    const [isSticky, setIsSticky] = useState(false);

    useEffect(() => {
  let ticking = false;

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        setIsSticky(headerRef.current.getBoundingClientRect().top <= 0);
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial check

  return () => window.removeEventListener('scroll', onScroll);
}, []);

  return (
    <header ref={headerRef} className={`sticky top-0 flex justify-between items-center w-full h-14 mt-6 px-8 transition-colors ${isSticky ? 'bg-zinc-50' : 'bg-none'}`}>
        <div>
            <div className={`absolute top-0 flex items-center h-14 transition-opacity ${!isSticky ? 'opacity-0' : 'opacity-100 duration-600'}`}>
                <h1 className="text-[42px] leading-10">GENHØR</h1>
            </div>
            <svg className={`transition-opacity duration-300 ${isSticky ? 'opacity-0' : 'opacity-100'}`} width="190" height="48" viewBox="0 0 190 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path className={`transition-opacity ${!isSticky ? 'opacity-100 delay-[800ms]' : 'opacity-0'}`} d="M35.6575 13.1521C27.3288 17.9706 27.3288 30.0169 35.6575 34.8354L44.0354 39.6823C42.6688 46.4281 34.9338 50.2337 28.6301 46.5868L5.20547 33.0347C-1.73517 29.0193 -1.73515 18.9807 5.20549 14.9653L28.6302 1.41324C34.9304 -2.23167 42.6603 1.56772 44.0332 8.30648L35.6575 13.1521Z" fill="#27272A"/>
                <path className={`transition-opacity ${!isSticky ? 'opacity-100 delay-[600ms]' : 'opacity-0'}`} d="M67.4109 12.2689C58.3881 17.489 58.3881 30.5391 67.411 35.7591L74.6988 39.9754C72.2698 46.1977 64.6299 49.3649 58.3014 45.7036L38 33.9584C30.3653 29.5415 30.3653 18.4991 38 14.0821L58.3014 2.33699C64.6264 -1.32229 72.2615 1.83946 74.6948 8.05493L67.4109 12.2689Z" fill="#27272A"/>
                <path className={`transition-opacity ${!isSticky ? 'opacity-100 delay-[450ms]' : 'opacity-0'}`} d="M98.1233 11.3857C88.4064 17.0073 88.4064 31.0613 98.1233 36.6829L104.081 40.1296C100.85 45.863 93.2848 48.496 86.9315 44.8204L69.7534 34.8822C61.4247 30.0637 61.4247 18.0174 69.7534 13.1989L86.9315 3.26074C93.2814 -0.412883 100.841 2.21522 104.076 7.94209L98.1233 11.3857Z" fill="#27272A"/>
                <path className={`transition-opacity ${!isSticky ? 'opacity-100 delay-[300ms]' : 'opacity-0'}`} d="M127.795 10.3721C117.384 16.3953 117.384 31.4531 127.795 37.4762L132.245 40.0509C128.39 45.322 120.893 47.4933 114.521 43.8068L100.466 35.6756C91.4429 30.4555 91.4429 17.4054 100.466 12.1853L114.521 4.05409C120.889 0.369665 128.381 2.53647 132.238 7.80122L127.795 10.3721Z" fill="#27272A"/>
                <path className={`transition-opacity ${!isSticky ? 'opacity-100 delay-[200ms]' : 'opacity-0'}`} d="M156.425 9.48894C145.32 15.9136 145.32 31.9753 156.425 38.4L159.15 39.9767C154.791 44.7423 147.412 46.4633 141.068 42.7932L130.137 36.4689C120.42 30.8473 120.42 16.7933 130.137 11.1717L141.069 4.84743C147.484 1.13577 154.959 2.93803 159.297 7.82714L156.425 9.48894Z" fill="#27272A"/>
                <path className={`transition-opacity ${!isSticky ? 'opacity-100 delay-[100ms]' : 'opacity-0'}`} d="M158.767 37.3926C148.356 31.3695 148.356 16.3117 158.767 10.2885L166.575 5.77119C176.986 -0.251949 190 7.27698 190 19.3233V28.358C190 40.4042 176.986 47.9331 166.575 41.91L158.767 37.3926Z" fill="#27272A"/>
            </svg>
        </div>
        <nav>
          <ul className="hidden">
            <li><Link href="/deltag" className="hover:underline">Deltag</Link></li>
            <li><Link href="/projekter" className="hover:underline">Projekter</Link></li>
            <li><Link href="/organisationen" className="hover:underline">Organisationen</Link></li>
            <li><Link href="/kontakt" className="hover:underline">Kontakt</Link></li>
          </ul>
        </nav>
    </header>
  );
};

export default Header;