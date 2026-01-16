export default function BackgroundImage({ visible = true, src }) {
    return (
        <div className={`absolute inset-0 transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
            <img src={src} className="object-cover size-full" loading="lazy" />
            <div className="absolute inset-0 bg-zinc-800 opacity-90" />
        </div>
    );
}