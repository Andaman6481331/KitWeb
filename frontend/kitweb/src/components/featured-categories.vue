<template>
    <section class="categories-section">
        <div class="section-header">
            <h2 class="section-title">Shop by Category</h2>
            <p class="section-subtitle">Find exactly what you need</p>
        </div>
        <div class="categories-grid">
            <div class="category-card cat-card-1">
                <div class="category-icon">🧶</div>
                <h3>Premium Yarn</h3>
                <p>High-quality yarns in various colors</p>
            </div>
            <div class="category-card cat-card-2">
                <div class="category-icon">🪡</div>
                <h3>Needles & Tools</h3>
                <p>Professional sewing equipment</p>
            </div>
            <div class="category-card cat-card-3">
                <div class="category-icon">🔘</div>
                <h3>Buttons & Fasteners</h3>
                <p>Decorative and functional buttons</p>
            </div>
            <div class="category-card cat-card-4">
                <div class="category-icon">✂️</div>
                <h3>Accessories</h3>
                <p>Everything for your craft</p>
            </div>
            <div class="popup popup-1">
                <div class="floating-card-container">
                    <div class="floating-card card-5">
                        <img src="../assets/card-img09.jpg" alt="">
                    </div>
                    <div class="floating-card card-6">
                        <img src="../assets/card-img06.jpg" alt="">
                    </div>
                </div>
            </div>
            <div class="popup popup-2">
                <div class="floating-card-container">
                    <div class="floating-card card-5">
                        <img src="../assets/card-img09.jpg" alt="">
                    </div>
                    <div class="floating-card card-6">
                        <img src="../assets/card-img06.jpg" alt="">
                    </div>
                </div>
            </div>
            <div class="popup popup-3">
                <div class="floating-card-container">
                    <div class="floating-card card-5">
                        <img src="../assets/card-img09.jpg" alt="">
                    </div>
                    <div class="floating-card card-6">
                        <img src="../assets/card-img06.jpg" alt="">
                    </div>
                </div>
            </div>
            <div class="popup popup-4">
                <div class="floating-card-container">
                    <div class="floating-card card-5">
                        <img src="../assets/card-img09.jpg" alt="">
                    </div>
                    <div class="floating-card card-6">
                        <img src="../assets/card-img06.jpg" alt="">
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<style scope>
/* ===== CATEGORIES SECTION ===== */
.categories-section {
    padding: 60px 0;
    background: white;
}

.categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 30px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 5%;
}

.category-card {
    background: linear-gradient(135deg, #f8f4f0 0%, #efe7da 100%);
    padding: 40px 30px;
    border-radius: 20px;
    text-align: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    border: 2px solid transparent;
}

.category-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    border-color: #b89968;
}

.category-icon {
    font-size: 64px;
    margin-bottom: 20px;
    filter: grayscale(0.3);
    transition: all 0.3s ease;
}

.category-card:hover .category-icon {
    filter: grayscale(0);
    transform: scale(1.1);
}

.category-card h3 {
    font-size: 22px;
    font-weight: 600;
    color: #2d2d2d;
    margin: 0 0 10px 0;
}

.category-card p {
    font-size: 14px;
    color: #666;
    margin: 0;
}

.category-card:hover .popup {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.cat-card-1:hover~.popup-1,
.cat-card-2:hover~.popup-2,
.cat-card-3:hover~.popup-3,
.cat-card-4:hover~.popup-4 {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
}

.popup {
    position: fixed;
    inset: 0;
    /* full screen */
    display: flex;
    align-items: center;
    justify-content: center;

    opacity: 0;
    visibility: hidden;
    pointer-events: none;

    transition: opacity 0.3s ease, visibility 0.3s ease;
    z-index: 50;
}

.popup::before {
    content: "";
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
}

.floating-card-container {
    position: relative;
    width: 600px;
    height: 400px;
    z-index: 1;
}

@keyframes fade-in-up-sequence {

    /* 0-5%: Fade In and Move Up */
    0% {
        opacity: 0;
        transform: translateY(30px);
        pointer-events: none;
    }

    5% {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
    }

    /* 5-28%: Stay Visible */
    30% {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
    }

    /* 28-33%: Fade Out and continue moving Down slightly */
    33% {
        opacity: 0;
        transform: translateY(20px);
        pointer-events: none;
    }

    /* 33-100%: Remain Hidden while other groups play */
    100% {
        opacity: 0;
        pointer-events: none;
    }
}

.floating-card {
    position: absolute;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 20px;
    animation: float 6s ease-in-out infinite;
    overflow: hidden;
    display: flex;
    z-index: 99;
}

.floating-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.card-1 {
    width: 280px;
    height: 320px;
    top: 40px;
    right: -10px;
    animation-delay: 0s;
}

.card-2 {
    width: 250px;
    height: 280px;
    top: 200px;
    right: -120px;
    animation-delay: 2s;
}

.card-3 {
    width: 200px;
    height: 220px;
    top: 310px;
    right: 100px;
    animation-delay: 1.5s;
}

.card-4 {
    width: 200px;
    height: 200px;
    top: 410px;
    right: -20px;
    animation-delay: 1s;
}

.card-5 {
    width: 250px;
    height: 400px;
    top: 40px;
    right: -40px;
    animation-delay: 1s;
}

.card-6 {
    width: 200px;
    height: 200px;
    top: 280px;
    right: -120px;
    animation-delay: 2s;
}

.card-7 {
    width: 220px;
    height: 280px;
    top: 40px;
    right: -40px;
    animation-delay: 1s;
}

.card-8 {
    width: 220px;
    height: 220px;
    top: 180px;
    right: 130px;
    animation-delay: 2s;
}

.card-9 {
    width: 210px;
    height: 170px;
    top: 300px;
    right: 20px;
    animation-delay: 1.5s;
}
</style>