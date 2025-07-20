'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MapIcon,
  Squares2X2Icon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
} from 'react-icons/fa';

export default function Footer() {
  const pathname = usePathname();
  const isMap = pathname === '/kort';
  const isGalleryOrMap = pathname === '/' || pathname === '/kort';
  const isInfo = pathname === '/info';
  const isProject = !['/', '/kort', '/info'].includes(pathname);

  return (
    <div className="fixed bottom-0 w-full bg-zinc-50 py-2 px-2 md:px-4 flex justify-between items-center flex-wrap gap-2">

      {/* Gallery / Map toggle */}
      {isGalleryOrMap && (
        <div className="relative inline-flex overflow-hidden border border-zinc-800">
          <div
            className={`absolute top-0 left-0 z-0 h-full w-1/2 bg-zinc-800 transition-transform duration-300 ease-in-out ${
              isMap ? 'translate-x-full' : 'translate-x-0'
            }`}
          />
          <Link
            href="/"
            aria-label="Se projektgalleri"
            className={`z-10 flex items-center justify-center size-8 md:size-10 transition-colors duration-300 ${
              !isMap ? 'text-zinc-50' : 'text-zinc-800'
            }`}
          >
            <Squares2X2Icon className="size-5" />
          </Link>
          <Link
            href="/kort"
            aria-label="Se projektkort"
            className={`z-10 flex items-center justify-center size-8 md:size-10 transition-colors duration-300 ${
              !isMap ? 'text-zinc-800' : 'text-zinc-50'
            }`}
          >
            <MapIcon className="size-5" />
          </Link>
        </div>
      )}

      {/* Project page: show credits button */}
      {isProject && (
        <button className="text-zinc-800 underline">Open Credits</button>
      )}

      {/* Info page: show contact and social icons */}
      {isInfo && (
        <div className="flex gap-4 items-center text-zinc-800 text-sm flex-wrap">
          <Link
            href="tel:+4591611093"
            className="flex items-center gap-1 hover:underline"
          >
            <PhoneIcon className="size-4" />
            <span>+45 91 61 10 93</span>
          </Link>

          <Link
            href="mailto:hej@genhoer.dk"
            className="flex items-center gap-1 hover:underline"
          >
            <EnvelopeIcon className="size-4" />
            <span>hej@genhoer.dk</span>
          </Link>

          <Link
            href="https://www.facebook.com/genhoer"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="hover:text-blue-600"
          >
            <FaFacebookF className="size-5" />
          </Link>

          <Link
            href="https://www.instagram.com/genhoer"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="hover:text-pink-600"
          >
            <FaInstagram className="size-5" />
          </Link>

          <Link
            href="https://www.linkedin.com/company/genhoer"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="hover:text-blue-700"
          >
            <FaLinkedinIn className="size-5" />
          </Link>
        </div>
      )}
    </div>
  );
}