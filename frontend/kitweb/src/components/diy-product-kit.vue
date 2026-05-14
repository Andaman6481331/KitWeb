<script setup>
import { ref } from 'vue';

const diyProducts = ref([
    {
        id: 2,
        name: 'Beaded Bracelet Set',
        image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=500',
        price: 399,
        difficulty: 'Beginner',
        duration: '1-2 hours',
        includes: ['Assorted Beads (200pcs)', 'Elastic Cord', 'Charms', 'Storage Box'],
        description: 'Design your own unique bracelets with colorful beads and charms.'
    },
    {
        id: 3,
        name: 'Crochet Tote Bag Kit',
        image: 'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=500',
        price: 799,
        difficulty: 'Intermediate',
        duration: '4-6 hours',
        includes: ['T-Shirt Yarn (3 rolls)', 'Crochet Hook', 'Video Tutorial', 'Pattern'],
        description: 'Crochet a stylish and eco-friendly tote bag perfect for shopping.'
    },
    {
        id: 4,
        name: 'Embroidery Starter Set',
        image: 'https://images.unsplash.com/photo-1452696193712-6cabf5103b63?w=500',
        price: 499,
        difficulty: 'Beginner',
        duration: '3-4 hours',
        includes: ['Embroidery Hoop', '12 Thread Colors', 'Needles', 'Fabric', 'Pattern Sheets'],
        description: 'Learn the art of embroidery with modern floral patterns.'
    }
]);
</script>

<template>
    <section class="diy-kits-section">
        <div class="container">
            <div class="section-header" v-reveal>
                <span class="section-tag">{{ $t('diyKits.tag') }}</span>
                <h2 class="section-title">{{ $t('diyKits.title') }}</h2>
                <p class="section-description">
                    {{ $t('diyKits.description') }}
                </p>
            </div>

            <div class="kits-grid">
                <div v-for="(product, index) in diyProducts" :key="product.id" class="kit-card" v-reveal
                    :style="{ animationDelay: (index * 0.15) + 's' }">

                    <div class="kit-image-wrapper">
                        <img :src="product.image" :alt="product.name" class="kit-image" />
                        <div class="kit-badge" :class="product.difficulty.toLowerCase()">
                            {{ product.difficulty }}
                        </div>
                    </div>

                    <div class="kit-content">
                        <div class="kit-header">
                            <h3 class="kit-name">{{ product.name }}</h3>
                            <p class="kit-description">{{ product.description }}</p>
                        </div>


                        <div class="kit-features">
                            <div class="feature">
                                <ion-icon name="time-outline"></ion-icon>
                                <span>{{ product.duration }}</span>
                            </div>
                            <div class="feature">
                                <ion-icon name="layers-outline"></ion-icon>
                                <span>{{ product.includes.length }} {{ $t('diyKits.essentialItems') }}</span>
                            </div>
                        </div>

                        <button class="kit-btn">
                            {{ $t('diyKits.exploreDetails') }}
                            <ion-icon name="chevron-forward-outline"></ion-icon>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.diy-kits-section {
    padding: 20px 5% 100px 5%;
    background-color: #FBF7F2;
    position: relative;
    overflow: hidden;
}

.container {
    max-width: 1300px;
    margin: 0 auto;
}

.section-header {
    margin-bottom: 30px;
    text-align: left;
}

.section-tag {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: #8b6f47;
    letter-spacing: 4px;
}

.section-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 48px;
    color: #2D241E;
}

.section-description {
    font-size: 18px;
    color: #6B5D54;
    line-height: 1.6;
    margin: 0 auto;
}

/* Grid Layout */
.kits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 40px;
}

/* Card Design */
.kit-card {
    background: #FFFAF6;
    border-radius: 24px;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
    border: 1px solid #F3EEEA;
    display: flex;
    flex-direction: column;
}

.kit-card:hover {
    transform: translateY(-12px);
    box-shadow: 0 25px 50px -12px rgba(84, 61, 47, 0.15);
    border-color: #00666633;
}

.kit-image-wrapper {
    position: relative;
    height: 300px;
    overflow: hidden;
}

.kit-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s ease;
}

.kit-card:hover .kit-image {
    transform: scale(1.08);
}

.kit-badge {
    position: absolute;
    top: 20px;
    right: 20px;
    padding: 8px 18px;
    background: white;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #2D241E;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.kit-badge.beginner {
    color: #006666;
}

.kit-badge.intermediate {
    color: #8b6f47;
}

.kit-content {
    padding: 35px;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
}

.kit-header {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 5px;

}

.kit-name {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 26px;
    color: #2D241E;
    flex: 1;
}

.kit-description {
    font-size: 15px;
    color: #6B5D54;
    line-height: 1.6;
    margin-bottom: 25px;
    flex-grow: 1;
}

.kit-features {
    display: flex;
    gap: 25px;
    margin-bottom: 30px;
    padding-top: 20px;
    border-top: 1px solid #E8E2DD;
}

.feature {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-weight: 600;
    color: #A0948C;
}

.feature ion-icon {
    font-size: 18px;
    color: #8b6f47;
}

.kit-btn {
    width: 100%;
    padding: 18px;
    background: transparent;
    border: 1px solid #006666;
    border-radius: 50px;
    color: #006666;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.3s ease;
}

.kit-card:hover .kit-btn {
    background: #006666;
    color: white;
}

@media (max-width: 768px) {
    .section-title {
        font-size: 36px;
    }

    .desktop-only {
        display: none;
    }

    .kits-grid {
        grid-template-columns: 1fr;
    }
}
</style>