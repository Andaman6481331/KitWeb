<script setup>
// KitCraft: the craft side of the business. Everything editorial lives here —
// the week's inspiration, the article archive, video tutorials, community photos,
// and the workshops themselves. The homepage only teases these; this is the page
// that has to be worth coming back to.
import { ref, computed, onMounted, onServerPrefetch } from 'vue';
import { useI18n } from 'vue-i18n';
import AutoScrollEvent from '../components/auto-scroll-event.vue';
import SectionNav from '../components/section-nav.vue';
import InfoBanner from '../components/info-banner.vue';
import VideoCard from '../components/video-card.vue';
import FeaturedProject from '../components/featured-project.vue';
import DiyArticles from '../components/diy-articles.vue';
import CreatorGallery from '../components/creator-gallery.vue';
import InstagramCard from '../components/instragram-card.vue';
import { api, getUtilsUrl, getEventMediaUrl } from '@/services/api';
import comingSoonImg from '../assets/card-img05.webp';
import emailjs from '@emailjs/browser';

const { t, locale } = useI18n();
const isThai = computed(() => String(locale.value).toLowerCase() === 'th');

// Section navigator (right-side mini-map rail)
const sections = computed(() => [
    { id: 'event-articles', label: t('events.nav.articles') },
    { id: 'event-videos',   label: t('events.nav.videos') },
    { id: 'event-gallery',  label: t('events.nav.gallery') },
    { id: 'event-past',     label: t('events.nav.past') },
    { id: 'event-contact',  label: t('events.nav.contact') },
]);

const contactFormLoc = ref(null); // Create the template ref

const scrollToContact = () => {
    // contactForm.value points directly to the DOM element once rendered
    contactFormLoc.value?.scrollIntoView({ behavior: 'smooth' });
};

// ── Content ──────────────────────────────────────────────────────
// Articles and workshops both come from D1. The page owns the fetch rather than
// letting each section fetch for itself, because it has to know which post is
// featured in order to keep the archive from repeating it — and a child's
// onServerPrefetch resolves too late for the parent to read during prerendering.
const projects = ref([]);
const pastEvents = ref([]);
const hasLoaded = ref(false);

async function loadContent() {
    // Settled, not all: an empty gallery should not also cost us the workshops.
    const [projectsResult, eventsResult] = await Promise.allSettled([
        api.getProjects({}),
        api.getEvents()
    ]);

    if (projectsResult.status === 'fulfilled') projects.value = projectsResult.value;
    else console.error('Error loading projects:', projectsResult.reason);

    if (eventsResult.status === 'fulfilled') pastEvents.value = eventsResult.value;
    else console.error('Error loading events:', eventsResult.reason);

    hasLoaded.value = true;
}

onServerPrefetch(loadContent);
onMounted(() => { if (!hasLoaded.value) loadContent(); });

// Whichever post is flagged, else the newest — the same rule the API applies for
// the homepage slot, repeated here because this page fetches the full list.
const featuredProject = computed(() =>
    projects.value.find(p => p.is_featured) || projects.value[0] || null
);

// Thai copy where a row has it, English otherwise (zh/ja have no translations).
const te = (row, field) => {
    if (!row) return '';
    if (isThai.value && row[`${field}_th`]) return row[`${field}_th`];
    return row[field] || '';
};

const eventCover = (event) =>
    event.cover_image_key ? getEventMediaUrl(event.cover_image_key) : comingSoonImg;

const mediaCount = (event, type) => (event.gallery || []).filter(m => m.type === type).length;

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

const errorMessage = ref(false);
const formSubmitted = ref(false);

// EmailJS credentials. These ship in the client bundle either way — moving them to
// env is about being able to change the account without a code edit, not secrecy.
// Set them in frontend/kitweb/.env; the form reports a failure rather than posting
// into the void when they are missing.
const EMAILJS = {
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY
};

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
    if (!EMAILJS.serviceId || !EMAILJS.templateId || !EMAILJS.publicKey) {
        console.error('EmailJS is not configured: set VITE_EMAILJS_* in .env');
        alert(t('events.sendFailed'));
        return;
    }

    try {
        await emailjs.send(
            EMAILJS.serviceId,
            EMAILJS.templateId,
            {
                name: contactForm.value.name,
                email: contactForm.value.email,
                phone: contactForm.value.phone,
                eventType: contactForm.value.eventType,
                groupSize: contactForm.value.groupSize,
                preferredDate: contactForm.value.preferredDate,
                message: contactForm.value.message,
            },
            EMAILJS.publicKey
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
        alert(t('events.sendFailed'));
    }
};

</script>

<template>
    <div class="diy-page">
        <!-- Info Banner -->
        <InfoBanner :badge="$t('events.bannerBadge')" :text="$t('events.bannerText')" />

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

        <!-- This week's inspiration: the post flagged in the admin panel. Same
             component as the homepage band, different eyebrow — it is the one
             thing on this page that is meant to change every week. -->
        <FeaturedProject :project="featuredProject" eyebrow-key="projects.weeklyInspiration" />

        <!-- The article archive, filtered into tutorials and inspiration. -->
        <section id="event-articles" class="event-anchor">
            <DiyArticles :items="projects" :exclude-id="featuredProject?.id" />
        </section>

        <!-- Video Tutorials. Moved here from the homepage: the clips are craft
             instruction, so they belong beside the workshops rather than above
             the product categories. -->
        <section id="event-videos" class="videos-section event-anchor">
            <VideoCard />
        </section>

        <!-- Creator Gallery: photos from workshops and from makers. -->
        <section id="event-gallery" class="event-anchor">
            <CreatorGallery />
        </section>

        <!-- Instagram. The card alone, not the homepage's full KitCraft pitch —
             that band already exists one click away and repeating it here would
             sell the page the visitor is already on. -->
        <section class="ig-section">
            <div class="container">
                <div class="section-header">
                    <h2>{{ $t('events.followTitle') }}</h2>
                    <p>{{ $t('events.followSubtitle') }}</p>
                </div>
                <div class="ig-wrap">
                    <InstagramCard />
                </div>
            </div>
        </section>

        <!-- Past Events Section -->
        <section id="event-past" class="events-section event-anchor">
            <div class="container">
                <div class="section-header">
                    <h2>{{ $t('events.pastEvents') }}</h2>
                    <p>{{ $t('events.pastEventsSubtitle') }}</p>
                </div>

                <div v-if="pastEvents.length" class="events-grid">
                    <!-- One card shape for both: an upcoming row swaps the media
                         badges for the notify-me treatment and scrolls to the form
                         instead of opening a gallery it does not have yet. -->
                    <div
                        v-for="event in pastEvents"
                        :key="event.id"
                        class="event-card"
                        :class="{ 'coming-soon-card': event.is_upcoming }"
                        style="cursor: pointer;"
                        @click="event.is_upcoming ? scrollToContact() : openEventPopup(event)"
                    >
                        <div class="event-image">
                            <img :src="eventCover(event)" :alt="te(event, 'title')" />

                            <div v-if="event.is_upcoming" class="coming-soon-overlay">
                                <span class="coming-soon-badge">✨ {{ $t('events.comingSoon') }}</span>
                            </div>
                            <div v-else-if="event.gallery.length" class="event-overlay">
                                <div class="gallery-preview">
                                    <span v-if="mediaCount(event, 'image')" class="preview-badge">
                                        📸 {{ mediaCount(event, 'image') }} {{ $t('events.images') }}
                                    </span>
                                    <span v-if="mediaCount(event, 'video')" class="preview-badge">
                                        🎥 {{ mediaCount(event, 'video') }} {{ $t('events.videos') }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="event-details">
                            <div class="event-date">{{ te(event, 'date_label') }}</div>
                            <h3>{{ te(event, 'title') }}</h3>
                            <p class="event-desc">{{ te(event, 'description') }}</p>
                            <div class="event-meta">
                                <span v-if="te(event, 'participants')" class="meta-item">
                                    <span class="icon">👥</span>
                                    {{ te(event, 'participants') }}
                                    <template v-if="!event.is_upcoming">{{ $t('events.attendees') }}</template>
                                </span>
                                <span v-if="te(event, 'location')" class="meta-item">
                                    <span class="icon">📍</span>
                                    {{ te(event, 'location') }}
                                </span>
                            </div>
                            <div v-if="event.is_upcoming" class="rsvp-teaser">
                                <span>{{ $t('events.getNotified') }}</span>
                                <span class="arrow">→</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Contact for Event Participation -->
        <section class="contact-section event-anchor" id="event-contact">
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
                        <!-- Submitting with Enter used to call a handler that does
                             not exist; the button's click was the only path in. -->
                        <form @submit.prevent="submitForm">
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
                            <button type="submit" class="submit-btn">{{ $t('events.sendRequest') }}</button>
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


    </div>

    <!-- Section Navigator: right-side mini-map rail -->
    <SectionNav :sections="sections" />

    <!-- Past Event Details Popup Modal -->
    <Teleport to="body">
        <transition name="fade">
            <div v-if="showEventPopup && selectedEvent" class="event-modal-overlay" @click.self="closeEventPopup">
                <div class="event-modal-card">
                    <button class="event-close-btn" @click="closeEventPopup" aria-label="Close">✕</button>

                    <div class="event-modal-header">
                        <span class="event-modal-date">{{ te(selectedEvent, 'date_label') }}</span>
                        <h2 class="event-modal-title">{{ te(selectedEvent, 'title') }}</h2>
                        <p class="event-modal-desc">{{ te(selectedEvent, 'description') }}</p>

                        <div class="event-modal-meta">
                            <span v-if="te(selectedEvent, 'participants')" class="meta-item">
                                👥 {{ te(selectedEvent, 'participants') }} {{ $t('events.attendees') }}
                            </span>
                            <span v-if="te(selectedEvent, 'location')" class="meta-item">
                                📍 {{ te(selectedEvent, 'location') }}
                            </span>
                        </div>
                    </div>

                    <div v-if="selectedEvent.gallery.length" class="event-modal-gallery">
                        <h3 class="gallery-section-title">{{ $t('events.mediaGallery') }}</h3>
                        <div class="gallery-grid">
                            <div v-for="(media, idx) in selectedEvent.gallery" :key="idx" class="gallery-item-card">
                                <!-- Image Card -->
                                <div v-if="media.type === 'image'" class="gallery-image-wrapper">
                                    <img :src="getEventMediaUrl(media.src)" :alt="media.title" class="gallery-media-img" />
                                    <div v-if="media.title" class="media-title-overlay">{{ media.title }}</div>
                                </div>
                                <!-- Video Card -->
                                <div v-else class="gallery-video-wrapper">
                                    <video :src="getEventMediaUrl(media.src)" controls playsinline
                                        class="gallery-media-video" crossorigin="anonymous" preload="metadata"></video>
                                    <div v-if="media.title" class="media-title-overlay">
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

/* Land section headings clear of the sticky navbar when jumped to via the rail */
.event-anchor {
    scroll-margin-top: 100px;
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

/* Video tutorials. VideoCard brings its own inner spacing and heading, so this
   wrapper only sets the surrounding ground colour. */
.videos-section {
    background: #FBF7F2;
}

/* Instagram. The embed component is right-aligned for the homepage's two-column
   band; centre it here, where it stands on its own. */
.ig-section {
    background: #fff;
    padding: clamp(48px, 6vw, 84px) 0;
}

.ig-wrap {
    display: flex;
    justify-content: center;
}

.ig-wrap :deep(.ig-card) {
    justify-self: center;
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
    gap: 10px;
    justify-content: center;
    width: 100%;
}

/* Was a wall of inline style on every badge; same look, declared once. */
.preview-badge {
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 20px;
    padding: 6px 12px;
    color: #fff;
    font-weight: 700;
    font-size: 13px;
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