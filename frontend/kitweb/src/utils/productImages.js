import { API_URL } from '../services/api';

const PLACEHOLDER = 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg';

// Product images are stored under a bare key and served in a few sizes
// (`<key>-large.webp`, `<key>-thumb.webp`). Rows seeded before that convention
// hold either a full URL or a filename with its own extension, so both pass
// through untouched.
export function getProductImageUrl(key, variant = 'large') {
    if (!key) return PLACEHOLDER;
    const keyStr = String(key);
    if (keyStr.startsWith('http')) return keyStr;
    if (keyStr.includes('.')) return `${API_URL}/images/${keyStr}`;
    return `${API_URL}/images/${keyStr}-${variant}.webp`;
}

// The only two variants the uploader writes (hidden-water-ed9d/src/index.ts:224):
// an 800px `-large` master at ~70KB and a 250px `-thumb` at ~10KB. A grid card
// shows the image at roughly 170–280 CSS px, so `-large` alone is up to 7x more
// bytes than the slot can use — offer both and let the browser pick by slot
// width and pixel density. Keys that are already a full URL, or carry their own
// extension, predate the convention and have no variants, so they get no srcset
// and fall back to `src`.
export const PRODUCT_IMAGE_WIDTHS = { thumb: 250, large: 800 };

export function getProductImageSrcset(key) {
    if (!key) return undefined;
    const keyStr = String(key);
    if (keyStr.startsWith('http') || keyStr.includes('.')) return undefined;
    return Object.entries(PRODUCT_IMAGE_WIDTHS)
        .map(([variant, width]) => `${getProductImageUrl(keyStr, variant)} ${width}w`)
        .join(', ');
}
