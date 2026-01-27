export default function MapImage({ isVisible, src }) {
    return <div className={`absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-opacity duration-500 ${isVisible ? "opacity-10" : "opacity-0"}`} style={{ backgroundImage: `url(${src})` }} />;
}