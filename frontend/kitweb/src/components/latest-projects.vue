<script setup>
// Three-card teaser of recent posts. Deliberately a teaser, not an archive: the
// full list lives on the KitCraft page, and the homepage only needs to prove that
// new writing exists.
import { computed, onMounted, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import ProjectCard from './project-card.vue';
import { useProjects } from '../composables/useProjects';
import { defaultLang } from '../utils/localeRoutes';

const route = useRoute();
const currentLang = computed(() => route.params.lang || defaultLang);

const { projects, fetchProjects } = useProjects();
// One extra is requested so the featured post can be dropped without leaving a gap.
const load = () => fetchProjects({ limit: 4 });

onServerPrefetch(load);
onMounted(load);

// The featured post already has its own band higher up the page; showing it again
// here would make two of the five homepage content slots identical.
const teasers = computed(() =>
    projects.value.filter(p => !p.is_featured).slice(0, 3)
);
</script>

<template>
    <section v-if="teasers.length" class="latest-projects">
        <div class="lp-head">
            <div>
                <p class="lp-eyebrow">{{ $t('projects.latestEyebrow') }}</p>
                <h2 class="lp-title">{{ $t('projects.latestTitle') }}</h2>
            </div>
            <router-link :to="{ name: 'event', params: { lang: currentLang } }" class="lp-viewall">
                {{ $t('projects.viewAll') }}
                <span aria-hidden="true">&rarr;</span>
            </router-link>
        </div>

        <div class="lp-grid">
            <ProjectCard v-for="p in teasers" :key="p.id" :project="p" />
        </div>
    </section>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Work+Sans:wght@300;400;500;600&display=swap');

.latest-projects {
    padding: clamp(44px, 5vw, 70px) clamp(18px, 5%, 40px);
    background: #FBF7F2;
}

.lp-head {
    max-width: 1300px;
    margin: 0 auto 26px auto;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
}

.lp-eyebrow {
    margin: 0 0 6px 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #8b6f47;
}

.lp-title {
    margin: 0;
    font-family: 'Crimson Pro', serif;
    font-size: clamp(1.7rem, 3vw, 2.3rem);
    font-weight: 600;
    color: #4a3529;
    line-height: 1.15;
}

.lp-viewall {
    flex-shrink: 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #8b6f47;
    text-decoration: none;
    white-space: nowrap;
    transition: color 0.2s;
}

.lp-viewall:hover { color: #DD876E; }

.lp-grid {
    max-width: 1300px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
}
</style>
