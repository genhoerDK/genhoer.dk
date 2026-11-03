/** public/depth/<folder>/<name>.webp for cdn.genhoer.dk/media/<folder>/<name>.webp
 *  (made with scripts/depth-map.py). Kept apart from DepthBackdrop so it can be used without
 *  loading three.js. */
export function depthMapFor(image) {
    const match = image?.match(/\/media\/([^/]+)\/([^/]+?)\.\w+$/);
    return match ? `/depth/${match[1]}/${match[2]}.webp` : null;
}
