/**
 * Fullscreen overlay that slides up from the bottom when active.
 * Used as a container for the map, player and forms.
 *
 * @param {boolean} active - Whether the overlay is visible
 */

// TODO: Add fadeout option on certain navigation (map marker navigation to project pages)

export default function Overlay({ active, children }) {
    return (
        <article className={`fixed inset-0 transition-transform duration-300 z-10 ${active ? 'translate-y-0' : 'translate-y-full'}`}>
            <section className="relative flex justify-center items-center w-screen min-h-svh bg-paper/80 backdrop-blur-md backdrop-grayscale">
                {children}
            </section>
        </article>
    );
}