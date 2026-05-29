<script setup>
import { ref } from 'vue';
import AutoScrollEvent from '../components/auto-scroll-event.vue';
import { getUtilsUrl } from '@/services/api';
import comingSoonImg from '../assets/card-img05.webp';
import emailjs from '@emailjs/browser';

const contactFormLoc = ref(null); // Create the template ref

const scrollToContact = () => {
    // contactForm.value points directly to the DOM element once rendered
    contactFormLoc.value?.scrollIntoView({ behavior: 'smooth' });
};

const pastEvents = ref([
    {
        id: 1,
        title: 'KitCraft DIY Workshop | Libi Home Cafe',
        date: 'December 13-14, 2025',
        image: getUtilsUrl('eventA_tn-large.webp'),
        participants: '50+',
        location: 'Libi home cafe, Bangkok',
        description: 'A fun casual workshow of our DIY beads collection and handcrafted accessories.',
        gallery: [
            { type: 'video', src: 'eventA_0.mp4', title: 'KitCraft Weekend Vibes' },
            { type: 'image', src: 'eventA_1-large.webp', title: '' },
            { type: 'image', src: 'eventA_2-large.webp', title: '' },
            { type: 'image', src: 'eventA_3-large.webp', title: '' },
            { type: 'image', src: 'eventA_4-large.webp', title: '' },
            { type: 'image', src: 'eventA_5-large.webp', title: '' },
            { type: 'image', src: 'eventA_6-large.webp', title: '' },
            { type: 'image', src: 'eventA_7-large.webp', title: '' },
            { type: 'image', src: 'eventA_8-large.webp', title: '' },
            { type: 'image', src: 'eventA_9-large.webp', title: '' },
        ]
    },
    {
        id: 2,
        title: 'KIN KAN CRAFTS | THE LUENRIT STREET CRAFTS',
        date: 'February 7-8, 2026',
        image: getUtilsUrl('eventB_tn-large.webp'),
        participants: '80+',
        location: 'The Luenrit, Yaowarat, Bangkok',
        description: 'An interactive premium showcase of our handcrafted accessories, custom DIY crochet sets, and wholesale yarn creations.',
        gallery: [
            { type: 'image', src: 'eventB_2-large.webp', title: 'Craft Showcase & Beads' },
            { type: 'image', src: 'eventB_3-large.webp', title: 'Premium Yarn Detail' },
            { type: 'video', src: 'eventB_0.mp4', title: 'Grand Showcase Walkthrough' },
            { type: 'video', src: 'eventB_1.mp4', title: 'Craft Workshop Highlights (.mp4)' }
        ]
    },
]);

const selectedEvent = ref(null);
const showEventPopup = ref(false);

const openEventPopup = (event) => {
    selectedEvent.value = event;
    showEventPopup.value = true;
};

const closeEventPopup = () => {
    selectedEvent.value = null;
    showEventPopup.value = false;
};

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
const errorMessage = ref(false);
const formSubmitted = ref(false);
const submitForm = async () => {
    // 1. Run your validation block
    if (
        !contactForm.value.preferredDate || 
        contactForm.value.groupSize === '' || 
        contactForm.value.groupSize < 0 || 
        !contactForm.value.name.trim() || 
        !contactForm.value.email.trim() || 
        !contactForm.value.phone.trim() || 
        !contactForm.value.eventType.trim() || 
        !/^\S+@\S+\.\S+$/.test(contactForm.value.email)
    ) {
        errorMessage.value = true;
        setTimeout(() => { errorMessage.value = false; }, 2000);
        return; 
    }

    // 2. Send the data if validation passes
    try {
        // Replace these string placeholders with your actual keys from EmailJS dashboard
        await emailjs.send(
            'service_gnqb7po', 
            'template_om8vuv9', 
            {
                name: contactForm.value.name,
                email: contactForm.value.email,
                phone: contactForm.value.phone,
                eventType: contactForm.value.eventType,
                groupSize: contactForm.value.groupSize,
                preferredDate: contactForm.value.preferredDate,
            },
            'WtvQxxvgU57WMDs6K'
        );

        // Success state
        formSubmitted.value = true;
        
        // Reset form fields after successful sending
        contactForm.value = {
            name: '', email: '', phone: '', eventType: 'workshop',
            groupSize: '', message: '', preferredDate: ''
        };

        setTimeout(() => { formSubmitted.value = false; }, 3000);

    } catch (error) {
        console.error('Email failed to send:', error);
        alert('Something went wrong. Please try again.');
    }
};

</script>

<template>
    <div class="diy-page">
        <!-- Hero Section -->
        <img :src="getUtilsUrl('shop05-large.webp')" fetchpriority="high" aria-hidden="true"
            style="position: absolute; width: 0; height: 0; overflow: hidden; z-index: -1;">
        <section class="hero" :style="{ backgroundImage: `url(${getUtilsUrl('shop05-large.webp')})` }">
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <div class="logo">
                    <!-- <span class="logo-icon">✂️</span> -->
                    <h1 v-reveal>KitCraft</h1>
                </div>
                <p class="tagline" v-reveal style="animation-delay: 0.2s;">{{ $t('events.heroTagline') }}</p>
                <p class="subtitle" v-reveal style="animation-delay: 0.4s;">{{ $t('events.heroSubtitle') }}</p>
                <button class="cta-btn" v-reveal style="animation-delay: 0.6s;"
                    @click="scrollToContact">{{ $t('events.contactUs') }}
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
                    <div v-for="event in pastEvents" :key="event.id" class="event-card" @click="openEventPopup(event)"
                        style="cursor: pointer;">
                        <div class="event-image">
                            <img :src="event.image" :alt="event.title" />
                            <div class="event-overlay">
                                <div class="gallery-preview"
                                    style="display: flex; gap: 10px; justify-content: center; width: 100%;">
                                    <span class="preview-badge"
                                        style="background: rgba(255,255,255,0.2); backdrop-filter: blur(5px); padding: 6px 12px; border-radius: 20px; color: white; font-weight: 700; font-size: 13px; border: 1px solid rgba(255,255,255,0.3);">
                                        📸 {{event.gallery.filter(m => m.type === 'image').length}} {{
                                            $t('events.images') || 'Images' }}
                                    </span>
                                    <span class="preview-badge"
                                        style="background: rgba(255,255,255,0.2); backdrop-filter: blur(5px); padding: 6px 12px; border-radius: 20px; color: white; font-weight: 700; font-size: 13px; border: 1px solid rgba(255,255,255,0.3);">
                                        🎥 {{event.gallery.filter(m => m.type === 'video').length}} {{
                                            $t('events.videos') || 'Videos' }}
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

                    <!-- Coming Soon Event Card -->
                    <div class="event-card coming-soon-card" @click="scrollToContact" style="cursor: pointer;">
                        <div class="event-image">
                            <img :src="comingSoonImg" alt="Coming Soon Event" />
                            <div class="coming-soon-overlay">
                                <span class="coming-soon-badge">✨ Coming Soon</span>
                            </div>
                        </div>
                        <div class="event-details">
                            <div class="event-date">Stay Tuned!</div>
                            <h3>Cozy Crochet & Vibing Workshop</h3>
                            <p class="event-desc">We are preparing our next intimate DIY workshop! Learn advanced crochet techniques while enjoying premium teas and sweets.</p>
                            <div class="event-meta">
                                <span class="meta-item">
                                    <span class="icon">👥</span>
                                    Limited Seats
                                </span>
                                <span class="meta-item">
                                    <span class="icon">📍</span>
                                    Bangkok (Secret Location)
                                </span>
                            </div>
                            <div class="rsvp-teaser">
                                <span>Get Notified Early</span>
                                <span class="arrow">→</span>
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
                            <a href="tel:+662211414" class="contact-link">
                                <span class="icon">📞</span>
                                +66 2 221 1414
                            </a>
                            <a href="mailto:kitsampeng@gmail.com" class="contact-link">
                                <span class="icon">✉️</span>
                                kitsampeng@gmail.com
                            </a>
                            <a href="#" class="contact-link">
                                <span class="icon">💬</span>
                                IG: @kit_craft376
                            </a>
                        </div>
                    </div>

                    <!-- Right - Contact Form -->
                    <div class="contact-form" ref="contactFormLoc">
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
                                        :placeholder="$t('events.howManyPeople')" required/>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>{{ $t('events.preferredDate') }}</label>
                                <input type="date" v-model="contactForm.preferredDate" required/>
                            </div>

                            <div class="form-group">
                                <label>{{ $t('events.message') }}</label>
                                <textarea v-model="contactForm.message" rows="4"
                                    :placeholder="$t('events.messagePlaceholder')"></textarea>
                            </div>
                            <button type="submit" class="submit-btn" @click="submitForm()">{{ $t('events.sendRequest') }}</button>
                            <div v-if="formSubmitted" class="form-note">
                                <span>* {{ $t('events.thankyou') }}</span>
                            </div>
                            <div v-if="errorMessage" class="error-alert">
                                {{ $t('events.requiredFields') }}
                            </div>
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

    <!-- Past Event Details Popup Modal -->
    <Teleport to="body">
        <transition name="fade">
            <div v-if="showEventPopup && selectedEvent" class="event-modal-overlay" @click.self="closeEventPopup">
                <div class="event-modal-card">
                    <button class="event-close-btn" @click="closeEventPopup" aria-label="Close">✕</button>

                    <div class="event-modal-header">
                        <span class="event-modal-date">{{ selectedEvent.date }}</span>
                        <h2 class="event-modal-title">{{ selectedEvent.title }}</h2>
                        <p class="event-modal-desc">{{ selectedEvent.description }}</p>

                        <div class="event-modal-meta">
                            <span class="meta-item">👥 {{ selectedEvent.participants }} {{ $t('events.attendees')
                            }}</span>
                            <span class="meta-item">📍 {{ selectedEvent.location }}</span>
                        </div>
                    </div>

                    <div class="event-modal-gallery">
                        <h3 class="gallery-section-title">Event Media Gallery</h3>
                        <div class="gallery-grid">
                            <div v-for="(media, idx) in selectedEvent.gallery" :key="idx" class="gallery-item-card">
                                <!-- Image Card -->
                                <div v-if="media.type === 'image'" class="gallery-image-wrapper">
                                    <img :src="getUtilsUrl(media.src)" :alt="media.title" class="gallery-media-img" />
                                    <div class="media-title-overlay">{{ media.title }}</div>
                                </div>
                                <!-- Video Card -->
                                <div v-else-if="media.type === 'video'" class="gallery-video-wrapper">
                                    <video :src="getUtilsUrl(media.src)" controls playsinline
                                        class="gallery-media-video" crossorigin="anonymous" preload="metadata"></video>
                                    <div class="media-title-overlay">
                                        🎥 {{ media.title }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </transition>
    </Teleport>
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
    height: 65vh;
    background-size: cover;
    background-position: center;
    justify-content: center;
    color: #604539;
    text-align: center;
    position: relative;
}

.hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    inset: 0;

    background:
        radial-gradient(
            circle at center,
            rgba(250, 244, 236, 0.838) 0%,
            rgba(80, 60, 45, 0.18) 60%,
            rgba(40, 28, 20, 0.337) 100%
        );

    z-index: 1;
}

.hero-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    position: relative;
    z-index: 2;
}

.logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
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
    
    color: #604539e0;
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
    grid-template-columns: repeat(3, minmax(350px, 1fr));
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
    height: 400px;
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
    font-size: 0.8rem;
}

.event-details h3 {
    font-size: 1.2rem;
    color: #2d2d2d;
    margin-bottom: 5px;
}

.event-desc {
    font-size: 0.8rem;
    color: #666;
    line-height: 1.4;
    margin-bottom: 8px;
}

.event-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.coming-soon-card {
    position: relative;
    border: 1px dashed rgba(255, 107, 107, 0.4);
    background: linear-gradient(to bottom, #ffffff, #fffdfb);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.coming-soon-card:hover {
    border-style: solid;
    border-color: #ff6b6b;
}

.coming-soon-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
    transition: all 0.3s ease;
}

.coming-soon-card:hover .coming-soon-overlay {
    background: rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(0px);
}

.coming-soon-badge {
    background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
    color: white;
    font-weight: 700;
    padding: 10px 20px;
    border-radius: 30px;
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
    font-size: 0.95rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    transform: scale(1);
    transition: transform 0.3s ease;
}

.coming-soon-card:hover .coming-soon-badge {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
}

.rsvp-teaser {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid #f3ebd8;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 700;
    font-size: 0.95rem;
    color: #ff6b6b;
    transition: color 0.3s ease;
}

.rsvp-teaser .arrow {
    transition: transform 0.3s ease;
}

.coming-soon-card:hover .rsvp-teaser {
    color: #ee5a6f;
}

.coming-soon-card:hover .rsvp-teaser .arrow {
    transform: translateX(6px);
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

.form-note {
    color: #38a169;
    font-weight: 600;
    text-align: center;
}
.error-alert{
    color: #ff6b6b;
    font-weight: 600;
    text-align: center;
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

/* ===== PREMIUM PAST EVENT GALLERY MODAL STYLE ===== */
.event-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(43, 33, 27, 0.7);
    backdrop-filter: blur(12px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeInModal 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.event-modal-card {
    background: #FFFAF6;
    border-radius: 24px;
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 30px 60px rgba(53, 35, 29, 0.25);
    border: 1px solid rgba(139, 111, 71, 0.15);
    padding: 40px;
    scrollbar-width: thin;
    scrollbar-color: #8b6f47 rgba(139, 111, 71, 0.05);
}

.event-modal-card::-webkit-scrollbar {
    width: 6px;
}

.event-modal-card::-webkit-scrollbar-track {
    background: rgba(139, 111, 71, 0.05);
    border-radius: 10px;
}

.event-modal-card::-webkit-scrollbar-thumb {
    background: #8b6f47;
    border-radius: 10px;
}

.event-close-btn {
    position: absolute;
    top: 25px;
    right: 25px;
    width: 45px;
    height: 45px;
    background: rgba(139, 111, 71, 0.1);
    border: none;
    border-radius: 50%;
    font-size: 1.3rem;
    color: #5d4037;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    z-index: 100;
}

.event-close-btn:hover {
    background: #5d4037;
    color: white;
    transform: rotate(90deg) scale(1.1);
}

.event-modal-header {
    margin-bottom: 35px;
    border-bottom: 1px solid rgba(139, 111, 71, 0.15);
    padding-bottom: 25px;
}

.event-modal-date {
    display: inline-block;
    font-size: 14px;
    font-weight: 700;
    color: #8b6f47;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
}

.event-modal-title {
    font-size: 2.2rem;
    font-weight: 800;
    color: #2D241E;
    margin: 0 0 15px 0;
    line-height: 1.2;
}

.event-modal-desc {
    font-size: 1.1rem;
    line-height: 1.6;
    color: #6b5d54;
    margin-bottom: 20px;
}

.event-modal-meta {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
}

.event-modal-meta .meta-item {
    font-size: 0.4rem;
    color: #8b6f47;
    font-weight: 600;
    background: rgba(139, 111, 71, 0.08);
    padding: 6px 14px;
    border-radius: 20px;
}

.event-modal-gallery {
    margin-top: 20px;
}

.gallery-section-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #2D241E;
    margin-bottom: 20px;
    text-align: left;
}

.gallery-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
}

@media (max-width: 1024px) {
    .events-grid {
        grid-template-columns: 1fr 1fr;
    }
}

@media (max-width: 768px) {
    .gallery-grid {
        grid-template-columns: 1fr;
    }

    .event-modal-title {
        font-size: 1.8rem;
    }
}

.gallery-item-card {
    background: #FFFAF6;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(53, 35, 29, 0.08);
    border: 1px solid rgba(139, 111, 71, 0.1);
    position: relative;
    transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1), box-shadow 0.4s ease;
}

.gallery-item-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(53, 35, 29, 0.15);
}

.gallery-image-wrapper {
    position: relative;
    aspect-ratio: 16 / 10;
    width: 100%;
}

.gallery-media-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s ease;
}

.gallery-item-card:hover .gallery-media-img {
    transform: scale(1.05);
}

.gallery-video-wrapper {
    position: relative;
    aspect-ratio: 16 / 10;
    width: 100%;
    background: #000;
}

.gallery-media-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.media-title-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(43, 33, 27, 0.95), transparent);
    color: white;
    font-size: 13px;
    font-weight: 600;
    padding: 20px 15px 10px;
    pointer-events: none;
    text-align: left;
}

@keyframes fadeInModal {
    from {
        opacity: 0;
        backdrop-filter: blur(0px);
    }

    to {
        opacity: 1;
        backdrop-filter: blur(12px);
    }
}

/* Responsive Layout Adjustments */
@media (max-width: 1024px) {
    .contact-grid {
        grid-template-columns: 1fr;
        gap: 40px;
    }
    
    .section-header h2 {
        font-size: 2.2rem;
    }
    
    .logo h1 {
        font-size: 3rem;
    }
    
    .tagline {
        font-size: 1.6rem;
    }
}

@media (max-width: 768px) {
    .hero {
        height: 60vh;
    }
    
    .logo h1 {
        font-size: 2.2rem;
    }
    
    .tagline {
        font-size: 1.2rem;
        letter-spacing: 1px;
        line-height: 1.3;
    }
    
    .subtitle {
        font-size: 1rem;
        margin-bottom: 24px;
        line-height: 1.4;
    }
    
    .cta-btn {
        padding: 12px 30px;
        font-size: 1rem;
    }
    
    .container {
        padding: 0 20px;
    }
    
    .section-header {
        margin-bottom: 40px;
    }
    
    .section-header h2 {
        font-size: 1.8rem;
    }
    
    .section-header p {
        font-size: 1rem;
    }
    
    .events-section {
        padding: 60px 0;
    }
    
    .events-grid {
        grid-template-columns: 1fr;
        gap: 24px;
    }
    
    .contact-section {
        padding: 60px 0;
    }
    
    .contact-form {
        padding: 24px;
    }
    
    .form-row {
        grid-template-columns: 1fr;
        gap: 0;
    }
    
    /* Product Details Modal Mobile */
    .modal-grid {
        grid-template-columns: 1fr;
    }
    
    .modal-image {
        height: 250px;
    }
    
    .modal-details {
        padding: 24px;
    }
    
    .modal-details h2 {
        font-size: 1.6rem;
    }
    
    .modal-price {
        font-size: 2rem;
        margin-bottom: 12px;
    }
    
    .event-modal-card {
        padding: 24px;
    }
    
    .event-modal-title {
        font-size: 1.6rem;
    }
}
</style>