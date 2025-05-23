
import Link from 'next/link';

const navItems = [
  { href: "/projekter", label: "Projekter" },
  { href: "/deltag", label: "Deltag" },
  { href: "/organisationen", label: "Organisationen" },
  { href: "/kontakt", label: "Kontakt" },
];

const Nav = () => {
  return (
    <nav>
        <ul className="flex">
            {navItems.map(({ href, label }) => (
                <li key={href}>
                    <Link href={href} className="font-rem font-semibold text-sm uppercase px-4 py-2 hover:underline">{label}</Link>
                </li>
            ))}
      </ul>
    </nav>
  );
};

export default Nav;
