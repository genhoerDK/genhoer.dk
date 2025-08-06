'use client';

export default function ProjectMedia({ project }) {
    const { mediaCount, slug, title } = project;
    const folder = `https://cdn.genhoer.dk/media/${slug}/`;

    const createMedia = (count, prefix, type) =>
        Array.from({ length: count }, (_, i) => ({
            type,
            src: `${folder}${prefix}-${String(i + 1).padStart(2, '0')}.${type === 'vid' ? 'mp4' : prefix === 'text' ? 'svg' : 'webp'}`,
        }));

    const images = createMedia(mediaCount.img, 'image', 'img');
    const vids = createMedia(mediaCount.vid, 'video', 'vid');
    const txts = createMedia(mediaCount.txt, 'text', 'img');

    const media = [];
    let i = 0, v = 0, t = 0;

    while (i < images.length || v < vids.length || t < txts.length) {
        if (i < images.length) media.push(images[i++]);
        if (v < vids.length) media.push(vids[v++]);
        if (i < images.length) media.push(images[i++]);
        if (t < txts.length) media.push(txts[t++]);
    }

    return (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-4 p-2 md:p-4">
            {media.map(({ type, src }, i) => (
                <figure key={`${slug}-media-${i}`} className="relative aspect-square overflow-hidden">
                    {type === 'vid' ? (
                        <video src={src} playsInline muted loop autoPlay className="object-cover w-full h-full" />
                    ) : (
                        <img src={src} alt={`${title} media ${i}`} className="object-cover w-full h-full" loading="lazy" />
                    )}
                </figure>
            ))}
        </section>
    );
}