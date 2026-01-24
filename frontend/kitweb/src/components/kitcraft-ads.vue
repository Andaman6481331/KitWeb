<script setup>
// Instagram embedding is handled in the instagram-card child component
</script>
<template>
    <section class="kitcraft-section">
        <div class="text-content">
            <div class="eyebrow">Handmade Crafts</div>
            <h2>Transform Yarn & Beads Into Art</h2>
            <p class="subtitle">
                Discover the therapeutic joy of creating beautiful handmade accessories,
                décor, and gifts with our simple DIY tutorials.
            </p>

            <div class="benefits">
                <div class="benefit-item">
                    <div class="benefit-icon">✓</div>
                    <div class="benefit-text">
                        <div class="benefit-title">Beginner Friendly</div>
                        <div class="benefit-desc">Step-by-step guides perfect for all skill levels</div>
                    </div>
                </div>
                <div class="benefit-item">
                    <div class="benefit-icon">✓</div>
                    <div class="benefit-text">
                        <div class="benefit-title">Affordable Materials</div>
                        <div class="benefit-desc">Create stunning pieces without breaking the bank</div>
                    </div>
                </div>
                <div class="benefit-item">
                    <div class="benefit-icon">✓</div>
                    <div class="benefit-text">
                        <div class="benefit-title">Endless Creativity</div>
                        <div class="benefit-desc">Personalize every project to match your style</div>
                    </div>
                </div>
            </div>

            <div class="cta-group">
                <button class="btn-primary" @click="handleStartCrafting">Start Crafting</button>
                <button class="btn-secondary" @click="handleLearnMore">Learn More</button>
            </div>
        </div>

        <div class="ig-card">
            <instagramCard />
        </div>
    </section>
</template>
<style>
.kitcraft-section {
    background: linear-gradient(135deg, #ff6b6b, #ff9f43);
    padding: 80px 40px;
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 80px;
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

.ig-card {
    width: 100%;
    max-width: 400px;
    justify-self: end;
}

.ig-reel {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    position: relative;
}

.ig-header {
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid #efefef;
}

.profile-pic {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e91e63, #f06292);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 16px;
}

.profile-info {
    flex: 1;
}

.username {
    font-weight: 600;
    font-size: 0.9rem;
    color: #1a1a1a;
}

.location {
    font-size: 0.75rem;
    color: #666;
}

.ig-video-container {
    position: relative;
    aspect-ratio: 9/16;
    background: #000;
    overflow: hidden;
}

video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.video-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 20px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
    color: white;
}

.overlay-text {
    font-size: 0.9rem;
    margin-bottom: 8px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.hashtags {
    font-size: 0.85rem;
    color: #64b5f6;
}

.ig-actions {
    padding: 12px 16px;
    display: flex;
    gap: 16px;
}

.action-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.3rem;
    padding: 0;
    transition: transform 0.2s ease;
}

.action-btn:hover {
    transform: scale(1.2);
}

.play-button-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60px;
    height: 60px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    opacity: 0.9;
}

.play-button-overlay:hover {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
}

.play-button-overlay.hidden {
    opacity: 0;
    pointer-events: none;
}

.play-icon {
    width: 0;
    height: 0;
    border-left: 16px solid #e91e63;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    margin-left: 4px;
}

@media (max-width: 1024px) {
    .promo-section {
        grid-template-columns: 1fr;
        gap: 50px;
        padding: 60px 30px;
    }

    .ig-card {
        justify-self: center;
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