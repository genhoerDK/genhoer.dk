import Link from 'next/link';

export default function NavLink({ href, children }) {
    return <Link href={href} className="font-light text-xl" >{children}</Link>
}