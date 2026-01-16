export default function MapInfoContainer({ isVisible, children }) {
    return (
        <div className={`absolute top-12 md:top-14 left-0 w-md max-w-full pointer-events-none transition delay-200 duration-500 ${isVisible ? "translate-x-0" : "-translate-x-full"}`}>
            {children}
        </div>
    );
}