export default function BackgroundImage({ portrait, landscape, visible = true }) {
    return (
        <picture className={`absolute inset-0 transition-opacity duration-500 bg-ink ${visible ? "opacity-100" : "opacity-0"}`}>
            <source media="(max-width: 768px)" srcSet={portrait} />
            <img src={landscape} className="size-full object-cover opacity-15" loading="lazy" alt="" />
        </picture>
    );
}