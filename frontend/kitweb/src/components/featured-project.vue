<script setup>
// The homepage's freshness anchor: whichever project is flagged is_featured in the
// admin panel. The API falls back to the newest published post when nothing is
// flagged, so this slot is never empty — but it can go stale, which is the point:
// it is meant to be changed weekly.
import { computed, onMounted, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useProjects } from '../composables/useProjects';
import { getProjectImageUrl } from '../services/api';
import { defaultLang } from '../utils/localeRoutes';

const props = defineProps({
    // Pass the post in when the host page already loaded it. A child's
    // onServerPrefetch resolves after the parent's markup is committed, so a page
    // that has to know which post is featured (to avoid repeating it lower down)
    // must own the fetch and hand the result down.
    project: { type: Object, default: null },
    // "Weekly Featured Project" on the homepage, "Weekly Inspiration" on KitCraft.
    eyebrowKey: { type: String, default: 'projects.featuredEyebrow' }
});

const route = useRoute();
const { locale } = useI18n();
const currentLang = computed(() => route.params.lang || defaultLang);

const { projects, fetchProjects } = useProjects();
// Returns the promise: onServerPrefetch awaits it, and a loader that resolves to
// undefined prerenders an empty band.
const load = () => (props.project ? Promise.resolve() : fetchProjects({ featured: true }));

onServerPrefetch(load);
onMounted(load);

const activeProject = computed(() => props.project || projects.value[0] || null);
const isThai = computed(() => String(locale.value).toLowerCase() === 'th');

const tp = (field) => {
    if (!activeProject.value) return '';
    if (isThai.value && activeProject.value[`${field}_th`]) return activeProject.value[`${field}_th`];
    return activeProject.value[field] || '';
};
</script>

<template>
    <section v-if="activeProject" class="featured-project">
        <div class="fp-inner">
            <router-link
                :to="{ name: 'project', params: { lang: currentLang, slug: activeProject.slug } }"
                class="fp-media"
                :aria-label="tp('title')"
            >
                <img
                    v-if="activeProject.cover_image_key"
                    :src="getProjectImageUrl(activeProject.cover_image_key)"
                    :alt="tp('title')"
                    loading="lazy"
                />
            </router-link>

            <div class="fp-text">
                <p class="fp-eyebrow">
                    <span class="fp-star" aria-hidden="true">★</span>
                    {{ $t(eyebrowKey) }}
                </p>
                <h2 class="fp-title">
                    <router-link :to="{ name: 'project', params: { lang: currentLang, slug: activeProject.slug } }">
                        {{ tp('title') }}
                    </router-link>
                </h2>
                <p v-if="tp('excerpt')" class="fp-excerpt">{{ tp('excerpt') }}</p>
                <router-link
                    :to="{ name: 'project', params: { lang: currentLang, slug: activeProject.slug } }"
                    class="fp-cta"
                >
                    {{ $t('projects.readTutorial') }}
                    <span aria-hidden="true">&rarr;</span>
                </router-link>
            </div>
        </div>
    </section>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Work+Sans:wght@300;400;500;600&display=swap');

.featured-project {
    background: #F6EDE1;
    padding: clamp(40px, 6vw, 72px) 5%;
    border-bottom: 1px solid #ecdfcd;
}

.fp-inner {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: clamp(24px, 4vw, 56px);
    align-items: center;
}

.fp-media {
    display: block;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 16px 38px rgba(96, 69, 57, 0.16);
}

.fp-media img {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    display: block;
    transition: transform 0.5s ease;
}

.fp-media:hover img { transform: scale(1.035); }

.fp-eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 14px 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #8b6f47;
}

.fp-star { color: #DD876E; font-size: 14px; }

.fp-title {
    margin: 0 0 16px 0;
    font-family: 'Crimson Pro', serif;
    font-size: clamp(1.8rem, 3.4vw, 2.7rem);
    font-weight: 600;
    line-height: 1.18;
    color: #4a3529;
}

.fp-title a {
    color: inherit;
    text-decoration: none;
}

.fp-title a:hover { color: #8b6f47; }

.fp-excerpt {
    margin: 0 0 24px 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 1rem;
    line-height: 1.75;
    color: #6f5b4d;
}

.fp-cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    background: #604539;
    color: #fff;
    border-radius: 12px;
    font-family: 'Work Sans', sans-serif;
    font-size: 14.5px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.2s, transform 0.2s;
}

.fp-cta:hover {
    background: #8b6f47;
    transform: translateY(-2px);
}

@media (max-width: 900px) {
    .fp-inner {
        grid-template-columns: 1fr;
    }
}
</style>
