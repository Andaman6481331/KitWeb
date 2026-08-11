<script setup>
// Grid/teaser card for a project. Shared by the homepage teaser and (in the next
// phase) the KitCraft article archive, so it takes the project as a prop rather
// than fetching anything itself.
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getProjectImageUrl } from '../services/api';
import { defaultLang } from '../utils/localeRoutes';

const props = defineProps({
    project: { type: Object, required: true }
});

const route = useRoute();
const { locale } = useI18n();
const currentLang = computed(() => route.params.lang || defaultLang);
const isThai = computed(() => String(locale.value).toLowerCase() === 'th');

const tp = (field) => {
    if (isThai.value && props.project[`${field}_th`]) return props.project[`${field}_th`];
    return props.project[field] || '';
};

const formattedDate = computed(() => {
    if (!props.project.published_at) return '';
    const d = new Date(props.project.published_at);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(isThai.value ? 'th-TH' : 'en-GB', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
});
</script>

<template>
    <router-link
        :to="{ name: 'project', params: { lang: currentLang, slug: project.slug } }"
        class="project-card"
    >
        <div class="pc-img">
            <img
                v-if="project.cover_image_key"
                :src="getProjectImageUrl(project.cover_image_key)"
                :alt="tp('title')"
                loading="lazy"
            />
        </div>
        <div class="pc-body">
            <p v-if="formattedDate" class="pc-date">{{ formattedDate }}</p>
            <h3 class="pc-title">{{ tp('title') }}</h3>
            <p v-if="tp('excerpt')" class="pc-excerpt">{{ tp('excerpt') }}</p>
        </div>
    </router-link>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Work+Sans:wght@300;400;500;600&display=swap');

.project-card {
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid #efe3d6;
    border-radius: 14px;
    overflow: hidden;
    text-decoration: none;
    height: 100%;
    transition: transform 0.22s, box-shadow 0.22s;
}

.project-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(96, 69, 57, 0.14);
}

.pc-img {
    width: 100%;
    aspect-ratio: 16 / 10;
    background: #f6efe6;
    overflow: hidden;
}

.pc-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.45s ease;
}

.project-card:hover .pc-img img { transform: scale(1.04); }

.pc-body {
    padding: 16px 18px 20px 18px;
}

.pc-date {
    margin: 0 0 8px 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: #a8917f;
}

.pc-title {
    margin: 0 0 10px 0;
    font-family: 'Crimson Pro', serif;
    font-size: 1.28rem;
    font-weight: 600;
    line-height: 1.28;
    color: #4a3529;
}

.pc-excerpt {
    margin: 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 13.5px;
    line-height: 1.65;
    color: #7a6355;
    /* Three lines keeps cards in a row visually even. */
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
