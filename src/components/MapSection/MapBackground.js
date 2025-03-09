import { useEffect, useRef } from "react";

const MapBackground = ({ dimensions, activeProject }) => {
    const canvasRef = useRef(null);
    const noiseInterval = useRef(null);

    useEffect(() => {
        if (!dimensions.width || !dimensions.height) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        canvas.width = dimensions.width;
        canvas.height = dimensions.height;

        const generateNoise = () => {
            const imageData = ctx.createImageData(canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const randomColor = Math.random() * 255;
                data[i] = randomColor; // Red
                data[i + 1] = randomColor; // Green
                data[i + 2] = randomColor; // Blue
                data[i + 3] = 50; // Alpha
            }

            ctx.putImageData(imageData, 0, 0);
        };

        const startNoiseLayer = () => {
            console.log("Starting noise");
            if (!noiseInterval.current) {
                noiseInterval.current = setInterval(generateNoise, 200);
            }
        };

        const stopNoiseLayer = () => {
            if (noiseInterval.current) {
                clearInterval(noiseInterval.current);
                noiseInterval.current = null;
            }
            console.log("Stopping noise");
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas when stopping
        };

        if (activeProject !== null) {
            startNoiseLayer();
        } else {
            stopNoiseLayer();
        }

        return () => stopNoiseLayer(); // Cleanup on unmount
    }, [dimensions, activeProject]); // Re-run when activeProject changes

    return (
        <div
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ backgroundImage: "url('/images/grindsted.png')" }}
        >
            <canvas ref={canvasRef} id="noiseCanvas" className="absolute inset-0 size-full" />
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