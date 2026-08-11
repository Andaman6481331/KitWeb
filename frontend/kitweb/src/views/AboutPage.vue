<script setup>
// The full company story, moved off the homepage so the landing page can lead
// with products. The homepage keeps a one-line heritage strip that links here.
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AboutKitcharoen from '../components/AboutKitcharoen.vue';
import { defaultLang } from '../utils/localeRoutes';

const route = useRoute();
const currentLang = computed(() => route.params.lang || defaultLang);
</script>

<template>
    <div class="about-page">
        <!-- Breadcrumb, matching the catalog's bar so navigation reads the same
             everywhere the user is one level below home. -->
        <nav class="about-breadcrumb" :aria-label="$t('catalog.breadcrumb')">
            <ol class="breadcrumb-list">
                <li>
                    <router-link :to="{ name: 'home', params: { lang: currentLang } }">{{ $t('nav.home') }}</router-link>
                </li>
                <li aria-hidden="true" class="breadcrumb-sep">
                    <ion-icon name="chevron-forward-outline"></ion-icon>
                </li>
                <li class="breadcrumb-current" aria-current="page">{{ $t('about.title') }}</li>
            </ol>
        </nav>

        <h1 class="about-page-title">{{ $t('about.title') }}</h1>

        <AboutKitcharoen />

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

/* ── Breadcrumb bar (mirrors CatalogPage) ───────────── */
.about-breadcrumb {
    background: #FBF7F2;
    border-bottom: 1px solid #f0e6da;
    padding: 0 clamp(12px, 5%, 48px);
}

.breadcrumb-list {
    display: flex;
    align-items: center;
    gap: 7px;
    height: 42px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0;
    list-style: none;
    font-family: 'Work Sans', sans-serif;
    font-size: 13px;
    white-space: nowrap;
}

.breadcrumb-list a { color: #9e8272; text-decoration: none; transition: color 0.15s; }
.breadcrumb-list a:hover { color: #DD876E; }
.breadcrumb-sep { display: flex; align-items: center; color: #c9b8a8; font-size: 11px; }
.breadcrumb-current { color: #5d4037; font-weight: 600; }

.about-page-title {
    max-width: 1300px;
    margin: 40px auto 0 auto;
    padding: 0 40px;
    font-family: 'Crimson Pro', serif;
    font-size: 2.6rem;
    font-weight: 600;
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
    .breadcrumb-list { height: 38px; font-size: 12px; }

    .about-page-title {
        margin-top: 28px;
        padding: 0 20px;
        font-size: 2rem;
    }

    .visit-section { padding: 20px 20px 60px 20px; }
}
</style>
