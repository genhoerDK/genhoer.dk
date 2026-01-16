export default function MapSection({ isDark, children }) {
    return (
        <section className={`relative size-full overflow-hidden transition-colors delay-200 duration-500 ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
            {children}
        </section>
    );
}