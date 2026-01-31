export default function BackgroundImage({ portrait, landscape, visible = true }) {
    return (
        <picture className={`absolute inset-0 bg-ink transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
            <source media="(max-width: 768px)" srcSet={portrait} />
            <img src={landscape} className="size-full object-cover opacity-10" loading="lazy" alt="" />
        </picture>
    );
}