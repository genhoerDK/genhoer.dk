function formatAlt(name) {
    return name
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
}

// Logos sit bottom right. If they don't fit between the side margins, they all shrink by the same factor
// (min-w-0 lets them shrink, object-contain keeps their proportions)
export default function ProjectSponsors({ logos }) {
    return (
        <div className='absolute inset-x-4 bottom-14 flex justify-end gap-2 h-4 md:inset-x-6 md:bottom-6 md:gap-4 md:h-6 animate-fade-in'>
            {logos.map((l, i) => (
                <img src={`/logos/${l}-logo.svg`} alt={`Logo for ${formatAlt(l)}`} key={i} className="min-w-0 object-contain" />
            ))}
        </div>
    );
}