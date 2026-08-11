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
