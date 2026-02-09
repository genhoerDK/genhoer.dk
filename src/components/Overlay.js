export default function Overlay({ active, children }) {
    return (
        <article className={`fixed inset-0 transition-transform duration-300 ${active ? 'translate-y-0' : 'translate-y-full'}`}>
            <section className="relative flex justify-center items-center w-screen min-h-svh bg-paper/80 backdrop-blur-md backdrop-grayscale">{children}</section>
        </article>
    );
}