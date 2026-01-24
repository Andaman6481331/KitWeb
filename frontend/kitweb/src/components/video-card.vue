<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Sample video data - replace with your actual videos
const videos = ref([
  {
    id: 1,
    src: '/shop-clip01.mp4',
    poster: '/shop-clip01.jpg',
    title: 'Signature Thai Dishes',
    description: 'Authentic flavors from Bangkok',
    duration: '2:30'
  },
  {
    id: 2,
    src: '/shop-clip01.mp4',
    poster: '/shop-clip01.jpg',
    title: 'Fresh Ingredients',
    description: 'Quality you can taste',
    duration: '1:45'
  },
  {
    id: 3,
    src: '/shop-clip01.mp4',
    poster: '/shop-clip01.jpg',
    title: 'Chef\'s Special',
    description: 'Handcrafted with love',
    duration: '3:00'
  },
  {
    id: 4,
    src: '/shop-clip01.mp4',
    poster: '/shop-clip01.jpg',
    title: 'Delivery Service',
    description: 'Hot & fresh to your door',
    duration: '1:20'
  }
])

const currentIndex = ref(0)
const isPlaying = ref(false)
const videoElement = ref(null)
const containerElement = ref(null)

// Touch/Swipe handling
let touchStartX = 0
let touchEndX = 0

const handleTouchStart = (e) => {
  touchStartX = e.touches[0].clientX
}

const handleTouchMove = (e) => {
  touchEndX = e.touches[0].clientX
}

const handleTouchEnd = () => {
  const swipeThreshold = 50
  const diff = touchStartX - touchEndX
  
  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0) {
      nextVideo()
    } else {
      prevVideo()
    }
  }
}

const nextVideo = () => {
  if (currentIndex.value < videos.value.length - 1) {
    currentIndex.value++
    pauseVideo()
  }
}

const prevVideo = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    pauseVideo()
  }
}

const goToVideo = (index) => {
  currentIndex.value = index
  pauseVideo()
}

const togglePlay = () => {
  if (!videoElement.value) return
  
  if (isPlaying.value) {
    videoElement.value.pause()
  } else {
    videoElement.value.play()
  }
  isPlaying.value = !isPlaying.value
}

const pauseVideo = () => {
  if (videoElement.value) {
    videoElement.value.pause()
    isPlaying.value = false
  }
}

// Auto-advance on video end
const handleVideoEnd = () => {
  if (currentIndex.value < videos.value.length - 1) {
    nextVideo()
  } else {
    pauseVideo()
  }
}

// Keyboard navigation
const handleKeydown = (e) => {
  if (e.key === 'ArrowLeft') prevVideo()
  if (e.key === 'ArrowRight') nextVideo()
  if (e.key === ' ') {
    e.preventDefault()
    togglePlay()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="video-card-container">
    <div class="section-header">
      <h2>✨ Discover Our Story</h2>
      <p>Swipe through our culinary journey</p>
    </div>

    <div 
      class="video-card"
      ref="containerElement"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- Navigation Arrows -->
      <button 
        class="nav-arrow nav-arrow-left" 
        @click="prevVideo"
        :disabled="currentIndex === 0"
        v-show="currentIndex > 0"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      <button 
        class="nav-arrow nav-arrow-right" 
        @click="nextVideo"
        :disabled="currentIndex === videos.length - 1"
        v-show="currentIndex < videos.length - 1"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      <!-- Video Display -->
      <div class="video-wrapper">
        <transition name="fade" mode="out-in">
          <div :key="currentIndex" class="video-content">
            <video 
              ref="videoElement"
              :src="videos[currentIndex].src"
              :poster="videos[currentIndex].poster"
              @ended="handleVideoEnd"
              class="video-player"
              preload="metadata"
            />
            
            <!-- Play/Pause Overlay -->
            <div class="video-overlay" @click="togglePlay">
              <transition name="scale-fade">
                <div v-if="!isPlaying" class="play-button">
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="30" fill="rgba(255, 255, 255, 0.9)" />
                    <path d="M26 20 L26 44 L44 32 Z" fill="#5E4535" />
                  </svg>
                </div>
              </transition>
            </div>

            <!-- Video Info -->
            <div class="video-info">
              <div class="video-details">
                <h3>{{ videos[currentIndex].title }}</h3>
                <p>{{ videos[currentIndex].description }}</p>
              </div>
              <div class="video-duration">{{ videos[currentIndex].duration }}</div>
            </div>
          </div>
        </transition>
      </div>

      <!-- Indicator Dots -->
      <div class="indicators">
        <button
          v-for="(video, index) in videos"
          :key="video.id"
          class="indicator-dot"
          :class="{ active: index === currentIndex }"
          @click="goToVideo(index)"
          :aria-label="`Go to video ${index + 1}`"
        >
          <span class="dot-inner"></span>
        </button>
      </div>

      <!-- Progress Indicator -->
      <div class="video-counter">
        <span class="current">{{ currentIndex + 1 }}</span>
        <span class="separator">/</span>
        <span class="total">{{ videos.length }}</span>
      </div>
    </div>

    <!-- Swipe Hint (shows briefly on mobile) -->
    <div class="swipe-hint">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M10 20 L20 10 M20 10 L30 20 M20 10 L20 30" stroke="#93735E" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p>Swipe to explore</p>
    </div>
  </div>
</template>

<style scoped>
.video-card-container {
  background-image: url('../assets/texture-bg02.jpg');
  background-size: cover;
  background-position: center;
  /* max-width: 1200px; */
  margin: 0 auto;
  padding: 40px 20px;
}

.section-header {
  text-align: center;
  margin-bottom: 40px;
}

.section-header h2 {
  font-size: 42px;
  font-weight: 700;
  color: #5E4535;
  margin: 0 0 10px 0;
  letter-spacing: -0.5px;
}

.section-header p {
  font-size: 18px;
  color: #93735E;
  margin: 0;
  opacity: 0.8;
}

.video-card {
  position: relative;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  background: linear-gradient(135deg, rgba(94, 69, 53, 0.05), rgba(147, 115, 94, 0.05));
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(94, 69, 53, 0.15);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.video-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 50px rgba(94, 69, 53, 0.25);
}

.video-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #1a1a1a;
  overflow: hidden;
}

.video-content {
  position: relative;
  width: 100%;
  height: 100%;
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
}

.play-button {
  transition: transform 0.3s ease;
}

.play-button:hover {
  transform: scale(1.1);
}

.video-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 30px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.video-details h3 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.video-details p {
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.video-duration {
  font-size: 16px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* Navigation Arrows */
.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  color: #5E4535;
}

.nav-arrow:hover {
  background: white;
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.nav-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-arrow-left {
  left: 20px;
}

.nav-arrow-right {
  right: 20px;
}

/* Indicators */
.indicators {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 15;
}

.indicator-dot {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dot-inner {
  display: block;
  width: 10px;
  height: 10px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.indicator-dot:hover .dot-inner {
  background: rgba(255, 255, 255, 0.8);
  transform: scale(1.2);
}

.indicator-dot.active .dot-inner {
  background: white;
  width: 30px;
  border-radius: 5px;
}

/* Video Counter */
.video-counter {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 10px 20px;
  border-radius: 20px;
  color: white;
  font-weight: 600;
  font-size: 16px;
  z-index: 15;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.current {
  color: #ffd4a3;
  font-size: 20px;
}

.separator {
  margin: 0 6px;
  opacity: 0.6;
}

.total {
  opacity: 0.8;
}

/* Swipe Hint */
.swipe-hint {
  text-align: center;
  margin-top: 30px;
  color: #93735E;
  opacity: 0.6;
  animation: fadeInOut 3s ease-in-out infinite;
}

.swipe-hint svg {
  margin-bottom: 10px;
}

.swipe-hint p {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

/* Animations */
@keyframes fadeInOut {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-fade-enter-active,
.scale-fade-leave-active {
  transition: all 0.3s ease;
}

.scale-fade-enter-from,
.scale-fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* Responsive Design */
@media (max-width: 768px) {
  .section-header h2 {
    font-size: 32px;
  }

  .section-header p {
    font-size: 16px;
  }

  .video-card {
    border-radius: 16px;
  }

  .nav-arrow {
    width: 40px;
    height: 40px;
  }

  .nav-arrow-left {
    left: 10px;
  }

  .nav-arrow-right {
    right: 10px;
  }

  .video-info {
    padding: 20px;
  }

  .video-details h3 {
    font-size: 20px;
  }

  .video-details p {
    font-size: 14px;
  }

  .video-duration {
    font-size: 14px;
    padding: 6px 12px;
  }

  .video-counter {
    top: 10px;
    right: 10px;
    padding: 8px 16px;
    font-size: 14px;
  }

  .current {
    font-size: 18px;
  }

  .swipe-hint {
    display: block;
  }
}

@media (min-width: 769px) {
  .swipe-hint {
    display: none;
  }
}
</style>
