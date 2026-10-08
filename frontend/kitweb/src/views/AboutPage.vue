<script setup>
// The full company story, moved off the homepage so the landing page can lead
// with products. The homepage keeps a one-line heritage strip that links here.
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AboutKitcharoen from '../components/AboutKitcharoen.vue';
import VideoCard from '../components/video-card.vue';
import { defaultLang } from '../utils/localeRoutes';

// No breadcrumb: this page is reached from the Company menu, not by drilling down
// through a hierarchy, so there is no trail to retrace.
const route = useRoute();
const currentLang = computed(() => route.params.lang || defaultLang);
</script>

<template>
    <div class="about-page">
        <h1 class="about-page-title">{{ $t('about.title') }}</h1>

        <AboutKitcharoen />

        <!-- The third generation's own chapter: the history above ends with "now to
             me", this says what "me" is doing with it. Written in first person on
             purpose, so visitors see one person building this rather than a firm. -->
        <section v-reveal class="next-chapter">
            <div class="next-chapter-eyebrow">{{ $t('about.nextChapterEyebrow') }}</div>
            <h2 class="next-chapter-title">{{ $t('about.nextChapterTitle') }}</h2>
            <p class="next-chapter-body">{{ $t('about.nextChapterBody') }}</p>
        </section>

        <!-- The story, shown rather than told. Sits between the written history
             and the address, which is the order someone reads this page in. -->
        <section class="about-videos">
            <VideoCard />
        </section>

        <!-- Visit us: the shop is a physical destination in Sampeng, so the
             address belongs on the story page, not only in the footer. -->
        <section class="visit-section">
            <h2 class="visit-title">{{ $t('about.visitTitle') }}</h2>
            <dl class="visit-grid">
                <div class="visit-item">
                    <dt>{{ $t('about.visitAddress') }}</dt>
                    <dd>376 Wanich 1, Chakkrawat,<br />Samphantawong, Bangkok 10100</dd>
                </div>
                <div class="visit-item">
                    <dt>{{ $t('about.visitPhone') }}</dt>
                    <dd>
                        <a href="tel:+6622211414">+66 (0)2-221-1414</a><br />
                        <a href="tel:+6626226573">+66 (0)2-622-6573</a>
                    </dd>
                </div>
                <div class="visit-item">
                    <dt>{{ $t('about.visitEmail') }}</dt>
                    <dd><a href="mailto:kitsampeng@gmail.com">kitsampeng@gmail.com</a></dd>
                </div>
            </dl>
            <router-link :to="{ name: 'contactus', params: { lang: currentLang } }" class="visit-cta">
                {{ $t('nav.contactUs') }}
            </router-link>
        </section>
    </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Work+Sans:wght@300;400;500;600&display=swap');

.about-page {
    background-color: #FBF7F2;
}

/* ── Our next chapter ───────────────────────────────── */
/* Same 1300px / 40px container as the story above; the copy itself is capped at
   a readable measure rather than stretching across the full width. */
.next-chapter {
    max-width: 1300px;
    margin: 0 auto;
    padding: 24px 40px 56px 40px;
}

.next-chapter-eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-family: 'Work Sans', sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #8b6f47;
}

.next-chapter-eyebrow::before {
    content: '';
    width: 40px;
    height: 2px;
    background: #E7C9A2;
}

.next-chapter-title {
    margin: 0 0 16px 0;
    font-family: 'Crimson Pro', serif;
    font-size: clamp(1.7rem, 4vw, 2.2rem);
    font-weight: 600;
    line-height: 1.2;
    color: #604539;
}

.next-chapter-body {
    max-width: 760px;
    margin: 0;
    font-size: 1.1rem;
    line-height: 1.8;
    color: #555;
}

/* ── Video showcase ─────────────────────────────────── */
/* VideoCard brings its own heading and inner spacing, so this only separates it
   from the story above and the address below. */
.about-videos {
    margin-top: 8px;
    border-top: 1px solid #f0e6da;
}

/* Shares AboutKitcharoen's container geometry (1300px cap, 40px gutters falling
   to 20px) so the title sits on the same left edge as the story below it. The
   `margin: 0 auto` is what was missing: with a max-width and no auto margin the
   block hugged the viewport's left edge on anything wider than 1380px, while the
   content under it stayed centred. */
.about-page-title {
    max-width: 1300px;
    margin: 0 auto;
    padding: 40px 40px 0 40px;
    font-family: 'Crimson Pro', serif;
    /* One fluid ramp instead of two fixed sizes with a jump at 640px. */
    font-size: clamp(1.9rem, 4.6vw, 2.6rem);
    font-weight: 600;
    line-height: 1.15;
    color: #604539;
}

/* ── Visit us ───────────────────────────────────────── */
.visit-section {
    max-width: 1300px;
    margin: 0 auto;
    padding: 20px 40px 80px 40px;
}

.visit-title {
    font-family: 'Crimson Pro', serif;
    font-size: 1.9rem;
    font-weight: 600;
    color: #604539;
    margin: 0 0 24px 0;
}

.visit-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 28px;
    margin: 0 0 32px 0;
}

.visit-item dt {
    font-family: 'Work Sans', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #8b6f47;
    margin-bottom: 8px;
}

.visit-item dd {
    margin: 0;
    font-size: 15px;
    line-height: 1.7;
    color: #555;
}

.visit-item dd a {
    color: #555;
    text-decoration: none;
}

.visit-item dd a:hover { color: #DD876E; }

.visit-cta {
    display: inline-block;
    padding: 11px 28px;
    background: #604539;
    color: #fff;
    border-radius: 12px;
    font-family: 'Work Sans', sans-serif;
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.2s, transform 0.2s;
}

.visit-cta:hover {
    background: #8b6f47;
    transform: translateY(-2px);
}

@media (max-width: 640px) {
    /* Matches .container's 20px gutter in AboutKitcharoen at the same breakpoint. */
    .about-page-title { padding: 28px 20px 0 20px; }

    .next-chapter { padding: 16px 20px 40px 20px; }

    .next-chapter-body { font-size: 1rem; }

    .visit-section { padding: 20px 20px 60px 20px; }
}
</style>
