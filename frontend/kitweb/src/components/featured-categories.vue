<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getUtilsUrl } from '@/services/api';

const { t } = useI18n();
const activeCat = ref(null);

const categories = [
    {
        id: 1,
        key: 'needles',
        image: getUtilsUrl('card-img06.jpg')
    },
    {
        id: 2,
        key: 'yarn',
        image: getUtilsUrl('card-img01.jpg')
    },
    {
        id: 3,
        key: 'accessories',
        image: getUtilsUrl('card-img10.png')
    },
    {
        id: 4,
        key: 'beads',
        image: getUtilsUrl('card-img04.jpg')
    }
];
</script>

<template>
    <section class="categories-section">
        <div v-reveal class="section-header">
            <h2 class="section-title" style="margin: 0;">{{ $t('featuredCategories.title') }}</h2>
            <p class="section-subtitle">{{ $t('featuredCategories.subtitle') }}</p>
        </div>

        <div class="categories-accordion" v-reveal>
                <div v-for="cat in categories" :key="cat.id" class="accordion-item"
                :class="{ active: activeCat === cat.id }" @mouseenter="activeCat = cat.id"
                @mouseleave="activeCat = null">

                <div class="cat-image-wrapper">
                    <img :src="cat.image" :alt="$t(`featuredCategories.items.${cat.key}.name`)" class="cat-bg" />
                    <div class="cat-overlay"></div>
                </div>

                <div class="cat-content">
                    <div class="cat-icon-container">
                        <span class="cat-icon">{{ cat.icon }}</span>
                        <h3 class="cat-name-vertical">{{ $t(`featuredCategories.items.${cat.key}.name`) }}</h3>
                    </div>

                    <div class="cat-details">
                        <h3 class="cat-name">{{ $t(`featuredCategories.items.${cat.key}.name`) }}</h3>
                        <p class="cat-desc">{{ $t(`featuredCategories.items.${cat.key}.description`) }}</p>
                        <button class="explore-btn">
                            {{ $t('featuredCategories.explore') }}
                            <span class="btn-arrow">→</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.categories-section {
    max-width: 1400px;
    margin: 0 auto;
}

.section-header {
    text-align: center;
    margin-bottom: 60px;
}

.section-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 3.5rem;
    color: #5E4535;
}

.section-subtitle {
    font-size: 1.2rem;
    color: #8b6f47;
    font-weight: 500;
}

/* Accordion Layout */
.categories-accordion {
    display: flex;
    gap: 20px;
    height: 600px;
    padding: 0 40px;
}

.accordion-item {
    flex: 1;
    position: relative;
    border-radius: 30px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
    background: #f8f4f0;
}

.accordion-item.active {
    flex: 3;
    box-shadow: 0 30px 60px rgba(94, 69, 53, 0.2);
}

/* Image Handling */
.cat-image-wrapper {
    position: absolute;
    inset: 0;
}

.cat-bg {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 1s ease;
    filter: saturate(0.8) contrast(1.1);
}

.accordion-item.active .cat-bg {
    transform: scale(1.1);
    filter: saturate(1.1) contrast(1.1);
}

.cat-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom,
            rgba(94, 69, 53, 0.1) 0%,
            rgba(0, 0, 0, 0.4) 100%);
    transition: opacity 0.5s ease;
}

.accordion-item.active .cat-overlay {
    background: linear-gradient(to bottom,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.7) 100%);
}

/* Content Layout */
.cat-content {
    position: absolute;
    inset: 0;
    padding: 40px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    z-index: 2;
}

.cat-icon-container {
    position: absolute;
    top: 40px;
    left: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    transition: opacity 0.3s ease;
}

.cat-icon {
    font-size: 3rem;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.3));
}

.cat-name-vertical {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 2rem;
    color: white;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    margin: 0;
    letter-spacing: 4px;
    opacity: 1;
    transition: opacity 0.3s ease, transform 0.5s ease;
}

.accordion-item.active .cat-name-vertical {
    opacity: 0;
    transform: translateY(-20px);
}

/* Expanded Details */
.cat-details {
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.5s ease 0.2s;
    pointer-events: none;
    max-width: 500px;
}

.accordion-item.active .cat-details {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
}

.cat-name {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 3rem;
    color: white;
    margin-bottom: 15px;
}

.cat-desc {
    color: rgba(255, 255, 255, 0.9);
    font-size: 1.1rem;
    line-height: 1.6;
    margin-bottom: 30px;
}

.explore-btn {
    background: white;
    color: #5E4535;
    border: none;
    padding: 15px 35px;
    border-radius: 50px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 15px;
    transition: all 0.3s ease;
}

.explore-btn:hover {
    background: #5E4535;
    color: white;
    transform: translateX(10px);
}

.btn-arrow {
    transition: transform 0.3s ease;
}

.explore-btn:hover .btn-arrow {
    transform: translateX(5px);
}

/* Responsive */
@media (max-width: 1024px) {
    .categories-accordion {
        flex-direction: column;
        height: auto;
        min-height: 800px;
        padding: 0 20px;
        gap: 15px;
    }

    .accordion-item {
        width: 100%;
        flex: 1;
        min-height: 120px;
    }

    .accordion-item.active {
        flex: 4;
    }

    .cat-name-vertical {
        writing-mode: horizontal-tb;
        transform: none !important;
        opacity: 1 !important;
    }

    .cat-icon-container {
        flex-direction: row;
        align-items: center;
        top: 20px;
        left: 20px;
    }

    .cat-content {
        padding: 20px;
    }
}

@media (max-width: 768px) {
    .section-title {
        font-size: 2.5rem;
    }

    .categories-accordion {
        min-height: 1000px;
    }

    .cat-name {
        font-size: 2.2rem;
    }

    .cat-desc {
        font-size: 1rem;
        margin-bottom: 20px;
    }

    .cat-icon {
        font-size: 2rem;
    }

    .cat-name-vertical {
        font-size: 1.5rem;
    }
}
</style>