<script setup>
// Instagram embedding is handled in the instagram-card child component
import instagramCard from './instragram-card.vue';

</script>
<template>
    <section class="kitcraft-section">
        <div class="text-content">
            <div v-reveal class="eyebrow">Handmade Crafts</div>
            <h2 v-reveal>Transform Yarn & Beads Into Art</h2>
            <p v-reveal class="subtitle">
                Discover the therapeutic joy of creating beautiful handmade accessories,
                décor, and gifts with our simple DIY tutorials.
            </p>

            <div v-reveal class="benefits">
                <div class="benefit-item">
                    <div class="benefit-icon">✓</div>
                    <div class="benefit-text">
                        <div class="benefit-title">Beginner Friendly</div>
                        <div class="benefit-desc delay2">Step-by-step guides perfect for all skill levels</div>
                    </div>
                </div>
                <div class="benefit-item">
                    <div class="benefit-icon">✓</div>
                    <div class="benefit-text">
                        <div class="benefit-title">Affordable Materials</div>
                        <div class="benefit-desc delay2">Create stunning pieces without breaking the bank</div>
                    </div>
                </div>
                <div class="benefit-item">
                    <div class="benefit-icon">✓</div>
                    <div class="benefit-text">
                        <div class="benefit-title">Endless Creativity</div>
                        <div class="benefit-desc delay2">Personalize every project to match your style</div>
                    </div>
                </div>
            </div>

            <div class="cta-group">
                <button class="btn-primary" @click="handleStartCrafting">Start Crafting</button>
                <router-link to="/event" class="btn-secondary">Learn More</router-link>
            </div>
        </div>

        <instagramCard />
    </section>
</template>
<style scoped>
.kitcraft-section {
    /* background: linear-gradient(135deg, #ff6b6b, #ff9f43); */
    padding: 5rem 10rem;
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 20px;
    align-items: center;
}

.text-content {
    max-width: 600px;
}

.eyebrow {
    color: #e91e63;
    font-weight: 600;
    font-size: 0.9rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.eyebrow::before {
    content: '';
    width: 40px;
    height: 2px;
    background: #e91e63;
}

h2 {
    font-size: 3rem;
    color: #1a1a1a;
    line-height: 1.2;
    margin-bottom: 24px;
    font-weight: 700;
}

.subtitle {
    font-size: 1.3rem;
    color: #666;
    line-height: 1.6;
    margin-bottom: 32px;
}

.benefits {
    margin-bottom: 40px;
}

.benefit-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
}

.benefit-icon {
    width: 24px;
    height: 24px;
    background: linear-gradient(135deg, #e91e63, #f06292);
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 14px;
}

.benefit-text {
    flex: 1;
}

.benefit-title {
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 4px;
    font-size: 1.1rem;
}

.benefit-desc {
    color: #666;
    font-size: 0.95rem;
    line-height: 1.5;
}

.cta-group {
    display: flex;
    gap: 16px;
    align-items: center;
}

.btn-primary {
    background: linear-gradient(135deg, #e91e63, #f06292);
    color: white;
    border: none;
    padding: 16px 36px;
    border-radius: 50px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(233, 30, 99, 0.3);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(233, 30, 99, 0.4);
}

.btn-secondary {
    background: transparent;
    color: #e91e63;
    border: 2px solid #e91e63;
    padding: 14px 34px;
    border-radius: 50px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-secondary:hover {
    background: #e91e63;
    color: white;
}

@media (max-width: 1024px) {
    .promo-section {
        grid-template-columns: 1fr;
        gap: 50px;
        padding: 60px 30px;
    }

    h2 {
        font-size: 2.5rem;
    }
}

@media (max-width: 640px) {
    h2 {
        font-size: 2rem;
    }

    .subtitle {
        font-size: 1.1rem;
    }

    .cta-group {
        flex-direction: column;
        align-items: stretch;
    }

    .btn-primary,
    .btn-secondary {
        width: 100%;
        text-align: center;
    }
}
</style>