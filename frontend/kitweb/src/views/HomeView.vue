<script setup>
import { ref, onMounted } from 'vue';
import VideoCard from '../components/video-card.vue';
import KitCraftAds from '../components/kitcraft-ads.vue';
import ItemSlider from '../components/item-slider.vue';

// 1. Define your data array
const items = ref([
  {
    id: 1,
    category: 'Yarn',
    title: 'Premium Yarn Collection',
    price: '฿199',
    image: 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg',
    alt: 'yarn'
  },
  {
    id: 2,
    category: 'Buttons',
    title: 'Designer Buttons Set',
    price: '฿89',
    image: 'https://m.media-amazon.com/images/I/81U7rrsM8zL._AC_UF894,1000_QL80_.jpg',
    alt: 'buttons'
  },
  {
    id: 3,
    category: 'Needles',
    title: 'Professional Needle Kit',
    price: '฿149',
    image: 'https://cdn.sparkfun.com/assets/parts/4/8/7/5/10405-04b.jpg',
    alt: 'needle'
  },
  {
    id: 4,
    category: 'Needles',
    title: 'Professional Needle Kit',
    price: '฿149',
    image: 'https://cdn.sparkfun.com/assets/parts/4/8/7/5/10405-04b.jpg',
    alt: 'needle'
  },
  // ... add as many as you need
]);

// Function for the button
const handleQuickView = (item) => {
  console.log('Viewing:', item.title);
};
</script>
<template>
  <div class="content">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">Premium Quality Yarn & Sewing Supplies</h1>
          <p class="hero-subtitle">Discover the finest materials for your creative projects. From professional-grade
            yarns to precision needles.</p>
          <div class="hero-buttons">
            <button class="cta-primary">Shop Now</button>
            <button class="cta-secondary">View Catalog</button>
          </div>
        </div>
        <div class="hero-decoration">
          <div class="floating-card card-1">
            <!-- <video controls>
              <source src="/shop-clip01.mp4" type="video/mp4">
            </video> -->
            <img src="../assets/card-img03.jpg" alt="">
          </div>
          <div class="floating-card card-2">
            <img src="../assets/card-img01.jpg" alt="">
          </div>
          <div class="floating-card card-3">
            <img src="../assets/card-img02.jpg" alt="">
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Categories -->
    <section class="categories-section">
      <div class="section-header">
        <h2 class="section-title">Shop by Category</h2>
        <p class="section-subtitle">Find exactly what you need</p>
      </div>
      <div class="categories-grid">
        <div class="category-card">
          <div class="category-icon">🧶</div>
          <h3>Premium Yarn</h3>
          <p>High-quality yarns in various colors</p>
        </div>
        <div class="category-card">
          <div class="category-icon">🪡</div>
          <h3>Needles & Tools</h3>
          <p>Professional sewing equipment</p>
        </div>
        <div class="category-card">
          <div class="category-icon">🔘</div>
          <h3>Buttons & Fasteners</h3>
          <p>Decorative and functional buttons</p>
        </div>
        <div class="category-card">
          <div class="category-icon">✂️</div>
          <h3>Accessories</h3>
          <p>Everything for your craft</p>
        </div>
      </div>
    </section>
    <!-- Video Card Display -->
    <VideoCard />
    <KitCraftAds />
    <ItemSlider />

    <!-- All Products / Stocks -->
    <section class="stock-sec">
      <div class="section-header-wrapper">
        <div class="section-header">
          <h2 class="section-title">All Products</h2>
          <p class="section-subtitle">Browse our complete collection</p>
        </div>
        <div class="search-bar">
          <ion-icon name="search-outline"></ion-icon>
          <input type="text" placeholder="Search products...">
        </div>
      </div>
      <div class="itemlist">
        <div v-for="item in items" :key="item.id" class="item">
          <div class="item-image">
            <img :src="item.image" :alt="item.alt">
            <div class="item-overlay">
              <button class="quick-view" @click="handleQuickView(item)">
                Quick View
              </button>
            </div>
          </div>
          <div class="item-content">
            <span class="item-category">{{ item.category }}</span>
            <h4 class="item-title">{{ item.title }}</h4>
            <div class="item-price">From {{ item.price }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Promotional Banner -->
    <section class="promo-section">
      <div class="promo-content">
        <h1>Special Offer!</h1>
        <p>Get 20% off on all yarn products this week</p>
        <button class="promo-button">Shop Sale Items</button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-column">
          <h3>Kitcharoen</h3>
          <p>Your trusted source for premium yarn and sewing supplies since 1995.</p>
        </div>
        <div class="footer-column">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#">About Us</a></li>
            <li><a href="#">Products</a></li>
            <li><a href="#">Contact</a></li>
            <li><a href="#">FAQ</a></li>
          </ul>
        </div>
        <div class="footer-column">
          <h4>Contact Info</h4>
          <ul>
            <li>📍 376 Wanich 1 Chakkrawat</li>
            <li>📍 Samphantawong Bangkok</li>
            <li>📞 +66 (0) 2-XXX-XXXX</li>
            <li>✉️ info@kitcharoen.com</li>
          </ul>
        </div>
        <div class="footer-column">
          <h4>Follow Us</h4>
          <div class="social-links">
            <a href="#" class="social-icon">📘</a>
            <a href="#" class="social-icon">📷</a>
            <a href="#" class="social-icon">🐦</a>
            <a href="#" class="social-icon">📺</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 Kitcharoen. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>


<style scoped>
* {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.content {
  padding: 0;
  margin: 0;
  background: #fafafa;
}

/* ===== HERO SECTION ===== */
.hero-section {
  /* background: linear-gradient(135deg, #8b6f47 0%, #b89968 50%, #d4a574 100%); */
  background: url('../assets/shop02.jpg');
  background-size: contain;
  background-position: center;
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.1)"/></svg>');
  opacity: 0.3;
}

.hero-content {
  max-width: 1200px;
  width: 90%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 60px;
  position: relative;
  z-index: 1;
}

.hero-text {
  flex: 1;
  color: white;
}

.hero-title {
  font-size: 56px;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 20px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  animation: fadeInUp 0.8s ease;
}

.hero-subtitle {
  font-size: 20px;
  font-weight: 400;
  line-height: 1.6;
  margin: 0 0 40px 0;
  opacity: 0.95;
  animation: fadeInUp 0.8s ease 0.2s backwards;
}

.hero-buttons {
  display: flex;
  gap: 20px;
  animation: fadeInUp 0.8s ease 0.4s backwards;
}

.cta-primary,
.cta-secondary {
  padding: 16px 40px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cta-primary {
  background: white;
  color: #8b6f47;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.cta-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.cta-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
  backdrop-filter: blur(10px);
}

.cta-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-3px);
}

.hero-decoration {
  flex: 1;
  position: relative;
  height: 400px;
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
}

.floating-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-1 {
  width: 200px;
  height: 250px;
  top: 0;
  right: 100px;
  animation-delay: 0s;
}

.card-2 {
  width: 180px;
  height: 220px;
  top: 100px;
  right: 0;
  animation-delay: 2s;
}

.card-3 {
  width: 160px;
  height: 200px;
  top: 200px;
  right: 150px;
  animation-delay: 4s;
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0px);
  }

  50% {
    transform: translateY(-10px);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== SECTION HEADERS ===== */
.section-header {
  text-align: center;
  margin: 60px 0 40px 0;
}

.section-title {
  font-size: 42px;
  font-weight: 700;
  color: #2d2d2d;
  margin: 0 0 10px 0;
}

.section-subtitle {
  font-size: 18px;
  color: #666;
  margin: 0;
  font-weight: 400;
}

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



/* ===== STOCK/ALL PRODUCTS SECTION ===== */
.stock-sec {
  padding: 60px 0;
  background: white;
}

.section-header-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 5%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.section-header-wrapper .section-header {
  text-align: left;
  margin: 0;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f5f5f5;
  padding: 12px 20px;
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.search-bar:focus-within {
  border-color: #b89968;
  background: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.search-bar ion-icon {
  font-size: 20px;
  color: #999;
}

.search-bar input {
  border: none;
  background: transparent;
  font-size: 15px;
  outline: none;
  width: 250px;
  font-family: 'Inter', sans-serif;
}

.itemlist {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 5%;
}

.item {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.item:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.item-image {
  position: relative;
  overflow: hidden;
  height: 280px;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.item:hover .item-image img {
  transform: scale(1.1);
}

.item-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.item:hover .item-overlay {
  opacity: 1;
}

.quick-view {
  padding: 12px 28px;
  background: white;
  color: #2d2d2d;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transform: translateY(10px);
  transition: all 0.3s ease;
}

.item:hover .quick-view {
  transform: translateY(0);
}

.item-content {
  padding: 20px;
}

.item-category {
  display: inline-block;
  background: linear-gradient(135deg, #8b6f47, #b89968);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.item-title {
  font-size: 18px;
  font-weight: 600;
  color: #2d2d2d;
  margin: 0 0 10px 0;
}

.item-price {
  font-size: 20px;
  font-weight: 700;
  color: #8b6f47;
  margin: 0;
}

/* ===== PROMO SECTION ===== */
.promo-section {
  background: linear-gradient(135deg, #ff6b6b, #ff9f43);
  padding: 80px 5%;
  text-align: center;
  color: white;
}

.promo-content h2 {
  font-size: 48px;
  font-weight: 800;
  margin: 0 0 16px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.promo-content p {
  font-size: 22px;
  margin: 0 0 32px 0;
  opacity: 0.95;
}

.promo-button {
  padding: 16px 48px;
  background: white;
  color: #ff6b6b;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.promo-button:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
}

/* ===== FOOTER ===== */
.footer {
  background: linear-gradient(135deg, #2d2d2d, #1a1a1a);
  color: white;
  padding: 60px 5% 20px 5%;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
  margin-bottom: 40px;
}

.footer-column h3 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: #b89968;
}

.footer-column h4 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.footer-column p {
  font-size: 14px;
  line-height: 1.6;
  opacity: 0.8;
  margin: 0;
}

.footer-column ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-column ul li {
  margin-bottom: 10px;
  font-size: 14px;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.footer-column ul li:hover {
  opacity: 1;
}

.footer-column a {
  color: white;
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer-column a:hover {
  color: #b89968;
}

.social-links {
  display: flex;
  gap: 15px;
}

.social-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  font-size: 20px;
  transition: all 0.3s ease;
}

.social-icon:hover {
  background: #b89968;
  transform: translateY(-3px);
}

.footer-bottom {
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-bottom p {
  margin: 0;
  font-size: 14px;
  opacity: 0.6;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .hero-content {
    flex-direction: column;
    text-align: center;
  }

  .hero-title {
    font-size: 36px;
  }

  .hero-decoration {
    display: none;
  }

  .section-header-wrapper {
    flex-direction: column;
    gap: 20px;
  }

  .search-bar input {
    width: 200px;
  }
}
</style>
