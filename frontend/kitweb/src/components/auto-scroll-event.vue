<script setup>
import { getUtilsUrl } from '@/services/api';

// One source of truth; the template renders it twice to make the loop seamless.
const cards = [
    'shop-card01-large.webp',
    'shop-card02-large.webp',
    'shop-card03-large.webp',
    'shop-card04-large.webp',
];
</script>
<template>
    <div class="banner-section">
        <div class="scroll-banner">
            <div class="scroll-track">
                <div class="scroll-set">
                    <div v-for="src in cards" :key="src" class="banner-item">
                        <img :src="getUtilsUrl(src)" alt="" loading="lazy" />
                    </div>
                </div>

                <!-- The second copy is what makes the loop seamless. Hidden from
                     assistive tech so the same four images are not announced twice. -->
                <div class="scroll-set" aria-hidden="true">
                    <div v-for="src in cards" :key="`dup-${src}`" class="banner-item">
                        <img :src="getUtilsUrl(src)" alt="" loading="lazy" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* The containing block. Without it the track's own width escapes the page on
   narrow viewports. */
.banner-section {
    overflow: hidden;
    max-width: 100%;
}

.scroll-banner {
    --sb-gap: clamp(10px, 2.5vw, 20px);
    width: 100%;
    overflow: hidden;
    position: relative;
    margin-top: 24px;
    margin-bottom: 24px;
    user-select: none;
}

.scroll-banner::before,
.scroll-banner::after {
    content: '';
    position: absolute;
    top: 0;
    /* A fixed 100px ate 200px of a 500px screen. */
    width: clamp(24px, 8vw, 100px);
    height: 100%;
    z-index: 10;
    pointer-events: none;
}

/* Matches .diy-page on EventPage; the old #f8f9fa left a visible seam. */
.scroll-banner::before {
    left: 0;
    background: linear-gradient(to right, #fafafa, transparent);
}

.scroll-banner::after {
    right: 0;
    background: linear-gradient(to left, #fafafa, transparent);
}

/* Scroll Track */
.scroll-track {
    display: flex;
    gap: var(--sb-gap);
    width: max-content;
    animation: scroll 30s linear infinite;
    will-change: transform;
    backface-visibility: hidden;
}

.scroll-set {
    display: flex;
    gap: var(--sb-gap);
}

/* Two equal sets plus the one gap between them: a bare -50% lands half a gap
   short and visibly jumps on every loop. */
@keyframes scroll {
    from { transform: translateX(0); }
    to { transform: translateX(calc(-50% - var(--sb-gap) / 2)); }
}

/* Banner Item — fluid, and the same portrait shape at every width. The old
   fixed sizes flipped these portrait shop cards to 200x120 landscape on mobile
   while object-fit stayed `cover`, which cropped them beyond recognition. */
.banner-item {
    flex-shrink: 0;
    width: clamp(140px, 42vw, 300px);
    aspect-ratio: 7 / 10;
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.banner-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

/* Touch and reduced-motion both get a rail they can move themselves — there is
   no hover to pause the drift with. */
@media (max-width: 768px), (prefers-reduced-motion: reduce) {
    .scroll-banner {
        overflow-x: auto;
        scroll-snap-type: x proximity;
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
    }

    .scroll-banner::-webkit-scrollbar { display: none; }

    .scroll-banner::before,
    .scroll-banner::after { display: none; }

    .scroll-track { animation: none; }

    .banner-item { scroll-snap-align: start; }
}
</style>
