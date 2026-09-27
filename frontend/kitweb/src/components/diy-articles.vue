<script setup>
// The full article archive. The homepage carries a three-card teaser; this is
// where the rest live, filtered by the one thing that actually separates them: a
// post with a video is a tutorial, a post without is inspiration. Same split the
// product page uses, so an article is filed the same way everywhere.
import { ref, computed, onMounted, onServerPrefetch } from 'vue';
import ProjectCard from './project-card.vue';
import { useProjects } from '../composables/useProjects';

const props = defineProps({
    // Pass the list in when the host page already loaded it (see featured-project
    // for why); otherwise this fetches its own.
    items: { type: Array, default: null },
    // The page above already features one post; pass its id to keep the archive
    // from repeating it directly underneath.
    excludeId: { type: [Number, String], default: null }
});

const { projects, fetchProjects } = useProjects();
// Returns the promise so onServerPrefetch actually waits on it.
const load = () => (props.items ? Promise.resolve() : fetchProjects({}));

onServerPrefetch(load);
onMounted(load);

const filter = ref('all');

const pool = computed(() =>
    (props.items || projects.value)
        .filter(p => !props.excludeId || Number(p.id) !== Number(props.excludeId))
);

const counts = computed(() => ({
    all: pool.value.length,
    tutorial: pool.value.filter(p => p.video_url).length,
    inspiration: pool.value.filter(p => !p.video_url).length
}));

const filtered = computed(() => {
    if (filter.value === 'tutorial') return pool.value.filter(p => p.video_url);
    if (filter.value === 'inspiration') return pool.value.filter(p => !p.video_url);
    return pool.value;
});

// A filter chip that would show an empty grid is not offered at all.
const availableFilters = computed(() =>
    ['all', 'tutorial', 'inspiration'].filter(key => counts.value[key] > 0)
);
</script>

<template>
    <section v-if="pool.length" class="diy-articles">
        <div class="da-inner">
            <div class="da-head">
                <p class="da-eyebrow">{{ $t('projects.latestEyebrow') }}</p>
                <h2 class="da-title">{{ $t('projects.archiveTitle') }}</h2>
                <p class="da-sub">{{ $t('projects.archiveSubtitle') }}</p>
            </div>

            <div v-if="availableFilters.length > 1" class="da-filters" role="tablist">
                <button
                    v-for="key in availableFilters"
                    :key="key"
                    type="button"
                    role="tab"
                    class="da-chip"
                    :class="{ active: filter === key }"
                    :aria-selected="filter === key"
                    @click="filter = key"
                >
                    {{ $t(`projects.filter.${key}`) }}
                    <span class="da-count">{{ counts[key] }}</span>
                </button>
            </div>

            <div class="da-grid">
                <ProjectCard v-for="p in filtered" :key="p.id" :project="p" />
            </div>
        </div>
    </section>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Work+Sans:wght@300;400;500;600&display=swap');

.diy-articles {
    background: #FBF7F2;
    padding: clamp(48px, 6vw, 84px) 5%;
}

.da-inner {
    max-width: 1300px;
    margin: 0 auto;
}

.da-head {
    text-align: center;
    margin-bottom: 24px;
}

.da-eyebrow {
    margin: 0 0 8px 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #8b6f47;
}

.da-title {
    margin: 0 0 10px 0;
    font-family: 'Crimson Pro', serif;
    font-size: clamp(1.8rem, 3.2vw, 2.5rem);
    font-weight: 600;
    color: #4a3529;
    line-height: 1.15;
}

.da-sub {
    margin: 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 1rem;
    color: #7a6355;
}

.da-filters {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 30px;
}

.da-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 18px;
    border: 1px solid #e3d3c0;
    border-radius: 22px;
    background: #fff;
    font-family: 'Work Sans', sans-serif;
    font-size: 13.5px;
    font-weight: 600;
    color: #7a6355;
    cursor: pointer;
    transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.da-chip:hover { border-color: #c9ab8d; }

.da-chip.active {
    background: #604539;
    border-color: #604539;
    color: #fff;
}

.da-count {
    font-size: 11.5px;
    opacity: 0.7;
}

.da-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
}
</style>
