function Tile({ className = "", children }) {
    return <div className={`aspect-square p-1 md:p-2 ${className}`}>{children}</div>
}

export default function ProjectMediaSection({ slug, media }) {
    if (!media) return null;
    const folder = `https://cdn.genhoer.dk/media/${slug}/`;

    return (
        <section className="grid grid-cols-1 p-1 md:p-2 md:grid-cols-2 md:grid-flow-dense xl:grid-cols-3">
            {media.map((file, i) => {
                const isVideo = file.endsWith(".mp4");

                const tileClass =
                    i === 3
                        ? "md:aspect-2/1 md:col-span-2 xl:row-span-2 xl:aspect-square" // Big tile
                        : i === 10
                            ? "xl:aspect-2/1 xl:col-span-2" // Wide tile
                            : "";

                return (
                    <Tile key={file} className={tileClass}>
                        {isVideo
                            ? <video src={folder + file} className="size-full" playsInline muted loop autoPlay />
                            : <img src={folder + file} alt="" className="size-full" loading="lazy" decoding="async" />
                        }
                    </Tile>
                );
            })}
        </section>
    );
}