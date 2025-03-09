import VantaFog from "./VantaFog";
import SimpleNoise from "./SimpleNoise";

const MapBackground = ({ dimensions, activeProject }) => {
    return (
        <div
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ backgroundImage: "url('/images/grindsted.png')" }}
        >
            <SimpleNoise dimensions={dimensions} activeProject={activeProject} />
            <VantaFog dimensions={dimensions} />
            <div
                className={`absolute inset-0 transition-all duration-700`}
                style={{
                    backgroundColor: activeProject === null ? "rgba(255, 255, 255, 1)" : "rgba(0, 0, 0, 0.5)",
                }}
            />
        </div>
    );
};

export default MapBackground;