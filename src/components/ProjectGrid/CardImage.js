export default function CardImage({ alt, src }) {
    return <img alt={alt} src={src} loading="lazy" className="object-cover aspect-video" />;
}