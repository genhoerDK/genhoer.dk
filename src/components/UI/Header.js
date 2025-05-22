import Link from 'next/link';

const Header = () => (
    <header style={{ padding: '1rem', background: '#f5f5f5' }}>
        <nav>
            <ul style={{ display: 'flex', gap: '1rem', listStyle: 'none', margin: 0, padding: 0 }}>
                <li><Link href="/deltag">Deltag</Link></li>
                <li><Link href="/projekter">Projekter</Link></li>
                <li><Link href="/organisationen">Organisationen</Link></li>
                <li><Link href="/kontakt">Kontakt</Link></li>
            </ul>
        </nav>
    </header>
);

export default Header;
