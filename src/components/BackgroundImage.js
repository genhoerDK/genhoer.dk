export default function BackgroundImage({ portrait, landscape, visible = true, dark = true }) {
    return (
        <picture className={`absolute inset-0 transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"} ${dark ? "bg-ink" : "bg-paper"}`}>
            <source media="(max-width: 768px)" srcSet={portrait} />
            <img src={landscape} className="size-full object-cover opacity-10" loading="lazy" alt="" />
        </picture>
    );
}