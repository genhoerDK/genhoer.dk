function Tile({ className = "", children }) {
    return <div className={`aspect-square p-1 md:p-2 ${className}`}>{children}</div>
}

export default function ProjectMediaSection({ slug, media }) {
    if (!media) return null;
    const folder = `https://cdn.genhoer.dk/media/${slug}/`;

    return (
        <section className="grid grid-cols-1 p-1 md:p-2 md:grid-cols-2 md:grid-flow-dense xl:grid-cols-3">
            {media.map((file, i) => {
                // Entries are either full URLs or file names in the project's cdn folder
                const src = file.startsWith("https://") ? file : folder + file;
                const isVideo = file.endsWith(".mp4");

                // Layout depends on position: the 4th file (index 3) is the big tile, the 11th (index 10) the wide one.
                // Order the files in projects.js > media accordingly.
                const tileClass =
                    i === 3
                        ? "md:aspect-2/1 md:col-span-2 xl:row-span-2 xl:aspect-square" // Big tile
                        : i === 10
                            ? "xl:aspect-2/1 xl:col-span-2" // Wide tile
                            : "";

                return (
                    <Tile key={file} className={tileClass}>
                        {isVideo
                            ? <video src={src} className="size-full object-cover bg-soft" playsInline muted loop autoPlay />
                            : <img src={src} alt="" className="size-full object-cover bg-soft" loading="lazy" decoding="async" />
                        }
                    </Tile>
                );
            })}
        </section>
    );
}