function formatAlt(name) {
    return name
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function ProjectSponsors({ logos }) {
    return (
        <div className='absolute right-4 bottom-14 flex gap-2 h-4 md:right-6 md:bottom-6 md:gap-4 md:h-6'>
            {logos.map((l, i) => (
                <img src={`/sponsor-logos/${l}-logo.svg`} alt={`Logo for ${formatAlt(l)}`} key={i} />
            ))}
        </div>
    );
}