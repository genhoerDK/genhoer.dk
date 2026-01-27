export default function Overlay({ active, children }) {
    return <article className={`fixed inset-0 w-screen h-dvh transition-transform duration-300 ${active ? 'translate-y-0' : 'translate-y-full'}`}>{children}</article>;
}