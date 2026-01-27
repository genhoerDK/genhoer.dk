export default function MapSection({ isDark, children }) {
    return (
        <section className={`relative size-full overflow-hidden backdrop-grayscale backdrop-blur-xs transition-colors delay-200 duration-300 ${isDark ? 'bg-zinc-800/100' : 'bg-zinc-50/95'}`}>
            {children}
        </section>
    );
}