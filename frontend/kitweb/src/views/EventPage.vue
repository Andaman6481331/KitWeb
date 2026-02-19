<script setup>
import { ref } from 'vue';
import AutoScrollEvent from '../components/auto-scroll-event.vue';

const pastEvents = ref([
    {
        id: 1,
        title: 'Summer Macramé Workshop',
        date: 'June 15, 2024',
        image: 'https://images.unsplash.com/photo-1556910110-b4a8e538d65e?w=800',
        participants: 24,
        location: 'KitCraft Studio, Bangkok',
        description: 'A wonderful afternoon creating beautiful plant hangers and wall art.',
        gallery: ['📸', '📸', '📸']
    },
    {
        id: 2,
        title: 'Holiday Ornament Crafting',
        date: 'December 10, 2024',
        image: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=800',
        participants: 32,
        location: 'Siam Paragon Hall',
        description: 'Festive workshop where we made yarn ornaments and beaded decorations.',
        gallery: ['📸', '📸', '📸', '📸']
    },
    {
        id: 3,
        title: 'Beginner Crochet Circle',
        date: 'August 22, 2024',
        image: 'https://images.unsplash.com/photo-1559131397-f94da358f7ca?w=800',
        participants: 18,
        location: 'KitCraft Studio, Bangkok',
        description: 'Friendly gathering for crochet beginners learning basic stitches.',
        gallery: ['📸', '📸']
    }
]);

const contactForm = ref({
    name: '',
    email: '',
    phone: '',
    eventType: 'workshop',
    groupSize: '',
    message: '',
    preferredDate: ''
});

const selectedProduct = ref(null);
const showProductModal = ref(false);

const viewProduct = (product) => {
    selectedProduct.value = product;
    showProductModal.value = true;
};

const closeModal = () => {
    showProductModal.value = false;
};

const handleContactSubmit = () => {
    console.log('Contact form:', contactForm.value);
    alert('Thank you! We will contact you within 24 hours to discuss your event.');
    contactForm.value = {
        name: '',
        email: '',
        phone: '',
        eventType: 'workshop',
        groupSize: '',
        message: '',
        preferredDate: ''
    };
};
</script>

<template>
    <div class="diy-page">
        <!-- Hero Section -->
        <section class="hero">
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <div class="logo">
                    <span class="logo-icon">✂️</span>
                    <h1>KitCraft</h1>
                </div>
                <p class="tagline">{{ $t('events.heroTagline') }}</p>
                <p class="subtitle">{{ $t('events.heroSubtitle') }}</p>
                <button class="cta-btn"
                    @click="document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })">
                    {{ $t('events.joinNextEvent') }}
                </button>
            </div>
        </section>


        <AutoScrollEvent />

        <!-- Past Events Section -->
        <section class="events-section">
            <div class="container">
                <div class="section-header">
                    <h2>{{ $t('events.pastEvents') }}</h2>
                    <p>{{ $t('events.pastEventsSubtitle') }}</p>
                </div>

                <div class="events-grid">
                    <div v-for="event in pastEvents" :key="event.id" class="event-card">
                        <div class="event-image">
                            <img :src="event.image" :alt="event.title" />
                            <div class="event-overlay">
                                <div class="gallery-preview">
                                    <span v-for="(photo, idx) in event.gallery" :key="idx" class="photo-icon">
                                        {{ photo }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="event-details">
                            <div class="event-date">{{ event.date }}</div>
                            <h3>{{ event.title }}</h3>
                            <p class="event-desc">{{ event.description }}</p>
                            <div class="event-meta">
                                <span class="meta-item">
                                    <span class="icon">👥</span>
                                    {{ event.participants }} {{ $t('events.attendees') }}
                                </span>
                                <span class="meta-item">
                                    <span class="icon">📍</span>
                                    {{ event.location }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>



        <!-- Contact for Event Participation -->
        <section class="contact-section" id="contact">
            <div class="container">
                <div class="contact-grid">
                    <!-- Left - Contact Info -->
                    <div class="contact-info">
                        <h2>{{ $t('events.joinWorkshop') }}</h2>
                        <p class="contact-intro">
                            {{ $t('events.workshopIntro') }}
                        </p>

                        <div class="event-types">
                            <h3>{{ $t('events.eventTypes') }}</h3>
                            <div class="event-type-item">
                                <span class="type-icon">🎨</span>
                                <div>
                                    <h4>{{ $t('events.publicWorkshops') }}</h4>
                                    <p>{{ $t('events.publicWorkshopsDesc') }}</p>
                                </div>
                            </div>
                            <div class="event-type-item">
                                <span class="type-icon">🎉</span>
                                <div>
                                    <h4>{{ $t('events.privateParties') }}</h4>
                                    <p>{{ $t('events.privatePartiesDesc') }}</p>
                                </div>
                            </div>
                            <div class="event-type-item">
                                <span class="type-icon">💼</span>
                                <div>
                                    <h4>{{ $t('events.corporateEvents') }}</h4>
                                    <p>{{ $t('events.corporateEventsDesc') }}</p>
                                </div>
                            </div>
                            <div class="event-type-item">
                                <span class="type-icon">🏫</span>
                                <div>
                                    <h4>{{ $t('events.schoolPrograms') }}</h4>
                                    <p>{{ $t('events.schoolProgramsDesc') }}</p>
                                </div>
                            </div>
                        </div>

                        <div class="direct-contact">
                            <h3>{{ $t('events.contactDirectly') }}</h3>
                            <a href="tel:+6622223456" class="contact-link">
                                <span class="icon">📞</span>
                                +66 2 222 3456
                            </a>
                            <a href="mailto:events@kitcraft.com" class="contact-link">
                                <span class="icon">✉️</span>
                                events@kitcraft.com
                            </a>
                            <a href="#" class="contact-link">
                                <span class="icon">💬</span>
                                Line: @kitcraft
                            </a>
                        </div>
                    </div>

                    <!-- Right - Contact Form -->
                    <div class="contact-form">
                        <h3>{{ $t('events.requestEvent') }}</h3>
                        <form @submit.prevent="handleContactSubmit">
                            <div class="form-group">
                                <label>{{ $t('events.yourName') }} *</label>
                                <input type="text" v-model="contactForm.name" required />
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>{{ $t('events.email') }} *</label>
                                    <input type="email" v-model="contactForm.email" required />
                                </div>
                                <div class="form-group">
                                    <label>{{ $t('events.phone') }} *</label>
                                    <input type="tel" v-model="contactForm.phone" required />
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>{{ $t('events.eventType') }} *</label>
                                    <select v-model="contactForm.eventType" required>
                                        <option value="workshop">{{ $t('events.publicWorkshop') }}</option>
                                        <option value="private">{{ $t('events.privateParty') }}</option>
                                        <option value="corporate">{{ $t('events.corporateEvent') }}</option>
                                        <option value="school">{{ $t('events.schoolProgram') }}</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>{{ $t('events.groupSize') }}</label>
                                    <input type="number" v-model="contactForm.groupSize"
                                        :placeholder="$t('events.howManyPeople')" />
                                </div>
                            </div>

                            <div class="form-group">
                                <label>{{ $t('events.preferredDate') }}</label>
                                <input type="date" v-model="contactForm.preferredDate" />
                            </div>

                            <div class="form-group">
                                <label>{{ $t('events.message') }}</label>
                                <textarea v-model="contactForm.message" rows="4"
                                    :placeholder="$t('events.messagePlaceholder')"></textarea>
                            </div>

                            <button type="submit" class="submit-btn">{{ $t('events.sendRequest') }}</button>
                        </form>
                    </div>
                </div>
            </div>
        </section>


        <!-- Product Modal -->
        <div v-if="showProductModal" class="modal-overlay" @click="closeModal">
            <div class="modal-content" @click.stop>
                <button class="close-btn" @click="closeModal">✕</button>
                <div class="modal-grid" v-if="selectedProduct">
                    <div class="modal-image">
                        <img :src="selectedProduct.image" :alt="selectedProduct.name" />
                    </div>
                    <div class="modal-details">
                        <div class="difficulty-badge" :class="selectedProduct.difficulty.toLowerCase()">
                            {{ selectedProduct.difficulty }}
                        </div>
                        <h2>{{ selectedProduct.name }}</h2>
                        <div class="modal-price">฿{{ selectedProduct.price }}</div>
                        <p class="modal-desc">{{ selectedProduct.description }}</p>

                        <div class="modal-meta">
                            <div class="meta-row">
                                <span class="icon">⏱️</span>
                                <span>{{ $t('events.completionTime') }}: {{ selectedProduct.duration }}</span>
                            </div>
                            <div class="meta-row">
                                <span class="icon">📊</span>
                                <span>{{ $t('events.difficulty') }}: {{ selectedProduct.difficulty }}</span>
                            </div>
                        </div>

                        <div class="kit-includes">
                            <h4>What's Included:</h4>
                            <ul>
                                <li v-for="(item, idx) in selectedProduct.includes" :key="idx">
                                    {{ item }}
                                </li>
                            </ul>
                        </div>

                        <button class="add-cart-btn">{{ $t('events.addToCart') }}</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

.diy-page {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #fafafa;
}

/* Hero Section */
.hero {
    height: 70vh;
    background: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
        url('https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1600') center/cover;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    text-align: center;
    position: relative;
}

.hero-content {
    position: relative;
    z-index: 2;
}

.logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 24px;
}

.logo-icon {
    font-size: 3.5rem;
    background: white;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo h1 {
    font-size: 4rem;
    font-weight: 700;
}

.tagline {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 16px;
    letter-spacing: 2px;
}

.subtitle {
    font-size: 1.3rem;
    margin-bottom: 32px;
    opacity: 0.9;
}

.cta-btn {
    padding: 16px 40px;
    background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
    color: white;
    border: none;
    border-radius: 50px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
}

.cta-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 35px rgba(255, 107, 107, 0.5);
}

/* Container */
.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 40px;
}

.section-header {
    text-align: center;
    margin-bottom: 60px;
}

.section-header h2 {
    font-size: 2.8rem;
    color: #2d2d2d;
    margin-bottom: 12px;
    font-weight: 700;
}

.section-header p {
    font-size: 1.2rem;
    color: #666;
}

/* Events Section */
.events-section {
    padding: 100px 0;
    background: linear-gradient(135deg, #f5f7fa 0%, #e8ebe8 100%);
}

.events-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 32px;
}

.event-card {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
}

.event-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 35px rgba(0, 0, 0, 0.12);
}

.event-image {
    position: relative;
    height: 220px;
    overflow: hidden;
}

.event-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.event-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
    padding: 16px;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.event-card:hover .event-overlay {
    opacity: 1;
}

.gallery-preview {
    display: flex;
    gap: 8px;
}

.photo-icon {
    font-size: 1.5rem;
}

.event-details {
    padding: 24px;
}

.event-date {
    color: #ff6b6b;
    font-weight: 600;
    font-size: 0.9rem;
    margin-bottom: 8px;
}

.event-details h3 {
    font-size: 1.4rem;
    color: #2d2d2d;
    margin-bottom: 12px;
}

.event-desc {
    font-size: 0.95rem;
    color: #666;
    line-height: 1.6;
    margin-bottom: 16px;
}

.event-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* Contact Section */
.contact-section {
    padding: 100px 0;
    background: white;
}

.contact-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: start;
}

.contact-info h2 {
    font-size: 2.5rem;
    color: #2d2d2d;
    margin-bottom: 16px;
}

.contact-intro {
    font-size: 1.1rem;
    color: #666;
    line-height: 1.7;
    margin-bottom: 40px;
}

.event-types {
    margin-bottom: 40px;
}

.event-types h3 {
    font-size: 1.5rem;
    color: #2d2d2d;
    margin-bottom: 20px;
}

.event-type-item {
    display: flex;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid #f0f0f0;
}

.event-type-item:last-child {
    border-bottom: none;
}

.type-icon {
    font-size: 2rem;
    flex-shrink: 0;
}

.event-type-item h4 {
    font-size: 1.1rem;
    color: #2d2d2d;
    margin-bottom: 4px;
}

.event-type-item p {
    font-size: 0.9rem;
    color: #666;
}

.direct-contact h3 {
    font-size: 1.5rem;
    color: #2d2d2d;
    margin-bottom: 16px;
}

.contact-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    font-size: 1.05rem;
    color: #667eea;
    text-decoration: none;
    transition: all 0.3s ease;
}

.contact-link:hover {
    color: #764ba2;
    transform: translateX(5px);
}

.contact-link .icon {
    font-size: 1.3rem;
}

/* Contact Form */
.contact-form {
    background: #f8f9fa;
    padding: 40px;
    border-radius: 16px;
}

.contact-form h3 {
    font-size: 1.8rem;
    color: #2d2d2d;
    margin-bottom: 24px;
}

.form-group {
    margin-bottom: 20px;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.form-group label {
    display: block;
    font-size: 0.95rem;
    font-weight: 600;
    color: #2d2d2d;
    margin-bottom: 8px;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.3s ease;
    outline: none;
    font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.submit-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.submit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

/* Modal */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
}

.modal-content {
    background: white;
    border-radius: 20px;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(50px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.close-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: white;
    border: none;
    border-radius: 50%;
    font-size: 1.5rem;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    z-index: 10;
    transition: all 0.3s ease;
}

.close-btn:hover {
    transform: rotate(90deg);
    background: #f0f0f0;
}

.modal-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
}

.modal-image {
    height: 100%;
}

.modal-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.modal-details {
    padding: 40px;
}

.modal-details h2 {
    font-size: 2rem;
    color: #2d2d2d;
    margin-bottom: 16px;
    margin-top: 12px;
}

.modal-price {
    font-size: 2.5rem;
    font-weight: 700;
    color: #ff6b6b;
    margin-bottom: 20px;
}

.modal-desc {
    font-size: 1.05rem;
    color: #666;
}
</style>