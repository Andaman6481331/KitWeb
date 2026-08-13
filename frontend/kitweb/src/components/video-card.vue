<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

import { getUtilsUrl } from '@/services/api'

const { t } = useI18n()

// Video data with localized content.
//
// `ratio` is the clip's real frame shape, read from the mp4 track headers. The
// four are not uniform — clip1/clip2 are landscape, clip3/clip4 were shot on a
// phone — so the card takes each clip's own shape rather than forcing one box
// and cropping the rest away with object-fit: cover.
const videos = computed(() => [
  {
    id: 1,
    src: getUtilsUrl('shop-clip00.mp4'),
    poster: getUtilsUrl('shop-clip00-tn-large.webp'),
    title: t('videoSection.videos.clip1.title'),
    description: t('videoSection.videos.clip1.description'),
    duration: '1:03',
    ratio: '16 / 9'
  },
  {
    id: 2,
    src: getUtilsUrl('shop-clip01.mp4'),
    poster: getUtilsUrl('video-clip02-tn-large.webp'),
    title: t('videoSection.videos.clip2.title'),
    description: t('videoSection.videos.clip2.description'),
    duration: '0:44',
    ratio: '16 / 9'
  },
  {
    id: 3,
    src: getUtilsUrl('shop-clip02.mp4'),
    poster: getUtilsUrl('video-clip03-tn-large.webp'),
    title: t('videoSection.videos.clip3.title'),
    description: t('videoSection.videos.clip3.description'),
    duration: '2:44',
    ratio: '9 / 16'
  },
  {
    id: 4,
    src: getUtilsUrl('shop-clip03.mp4'),
    poster: getUtilsUrl('video-clip04-tn-large.webp'),
    title: t('videoSection.videos.clip4.title'),
    description: t('videoSection.videos.clip4.description'),
    duration: '1:34',
    ratio: '3 / 4'
  }
])

const currentIndex = ref(0)
const isPlaying = ref(false)
const videoElements = ref([])
// Clear the slot when the element unmounts, otherwise detached <video> nodes pile
// up every time `videos` recomputes — and it is a computed over t(), so that
// happens on every language change.
const setVideoRef = (el, index) => {
  if (el) videoElements.value[index] = el
  else delete videoElements.value[index]
}

// Below this width the carousel becomes a single full-bleed vertical player and
// the desktop modal is never opened.
const isCompact = ref(false)
let compactQuery = null
const syncCompact = (e) => { isCompact.value = e.matches }
const modalVideoElement = ref(null)
const containerElement = ref(null)
const isExpanded = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progress = ref(0)
const showControls = ref(true)
let controlsTimeout = null

let lastMouseX = 0
let lastMouseY = 0

const resetControlsTimeout = (forceShow = true, event = null) => {
  // If it's a mousemove event, check if the mouse actually moved
  if (event && event.type === 'mousemove') {
    const { clientX, clientY } = event
    if (clientX === lastMouseX && clientY === lastMouseY) return
    lastMouseX = clientX
    lastMouseY = clientY
  }

  if (forceShow) showControls.value = true
  if (controlsTimeout) clearTimeout(controlsTimeout)

  if (isPlaying.value) {
    controlsTimeout = setTimeout(() => {
      showControls.value = false
    }, 500)
  }
}

// Helper to calculate card position (1-5) based on currentIndex
const getPosition = (index) => {
  const offset = index - currentIndex.value
  return 3 + offset
}

// Touch/Swipe handling.
//
// `hasMoved` is the important part: a tap fires touchstart -> touchend with no
// touchmove in between. Reading a stored "end" coordinate that only touchmove
// ever writes means a tap is measured against the *previous* gesture (or 0 on
// the first one), which reads as a ~200px swipe and advances the carousel
// instead of playing. Measure from changedTouches and require real movement.
let touchStartX = 0
let touchStartY = 0
let hasMoved = false

const handleTouchStart = (e) => {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  hasMoved = false
}

const handleTouchMove = (e) => {
  const dx = Math.abs(e.touches[0].clientX - touchStartX)
  const dy = Math.abs(e.touches[0].clientY - touchStartY)
  if (dx > 10 || dy > 10) hasMoved = true
}

const handleTouchEnd = (e) => {
  if (!hasMoved) return

  const swipeThreshold = 50
  const touch = e.changedTouches[0]
  const diffX = touchStartX - touch.clientX
  const diffY = touchStartY - touch.clientY

  // Vertical intent is a page scroll, not a slide change.
  if (Math.abs(diffX) <= Math.abs(diffY)) return
  if (Math.abs(diffX) <= swipeThreshold) return

  diffX > 0 ? nextVideo() : prevVideo()
}

const handleTouchCancel = () => {
  hasMoved = false
}

const nextVideo = () => {
  if (currentIndex.value < videos.value.length - 1) {
    pauseVideo()
    currentIndex.value++
  }
}

const prevVideo = () => {
  if (currentIndex.value > 0) {
    pauseVideo()
    currentIndex.value--
  }
}

const goToVideo = (index) => {
  if (index !== currentIndex.value) {
    pauseVideo()
    currentIndex.value = index
  }
}

// `isPlaying` is never set optimistically — the <video> element's own play/pause
// events are the single source of truth. Setting it up front is what used to
// leave the flag stuck true when a browser refused autoplay, which in turn hid
// the entire control layer behind `v-if="showControls || !isPlaying"`.
const handlePlaying = () => { isPlaying.value = true }
const handlePaused = () => {
  isPlaying.value = false
  showControls.value = true
}

const playSafely = (el) => {
  if (!el) return
  const attempt = el.play()
  if (attempt?.catch) {
    attempt.catch((error) => {
      // Rejected autoplay/gesture policy. The pause handler keeps the UI honest.
      console.error('Video playback failed:', error)
      isPlaying.value = false
      showControls.value = true
    })
  }
}

const togglePlay = () => {
  const cardVideo = videoElements.value[currentIndex.value]
  const modalVideo = modalVideoElement.value

  if (isPlaying.value) {
    modalVideo?.pause()
    cardVideo?.pause()
    return
  }

  // On a phone the card itself is the player — no modal, so the tap that got us
  // here is the user gesture that authorises playback.
  if (isCompact.value) {
    playSafely(cardVideo)
    return
  }

  if (isExpanded.value) {
    playSafely(modalVideo)
    return
  }

  cardVideo?.pause()
  isExpanded.value = true
  showControls.value = true
  // The element is created by the transition, so play once it exists.
  nextTick(() => playSafely(modalVideoElement.value))
}

const closeExpanded = () => {
  const modalVideo = modalVideoElement.value
  const cardVideo = videoElements.value[currentIndex.value]

  if (modalVideo) modalVideo.pause()
  if (cardVideo) cardVideo.pause()

  isExpanded.value = false
  isPlaying.value = false
  showControls.value = true
}

const seek = (seconds) => {
  const activeVideo = isExpanded.value ? modalVideoElement.value : videoElements.value[currentIndex.value]
  if (activeVideo && !isNaN(activeVideo.duration)) {
    let newTime = activeVideo.currentTime + seconds
    // Ensure we stay within bounds [0, duration]
    activeVideo.currentTime = Math.max(0, Math.min(newTime, activeVideo.duration))
    resetControlsTimeout()
  }
}

const restartVideo = () => {
  const activeVideo = isExpanded.value ? modalVideoElement.value : videoElements.value[currentIndex.value]
  if (activeVideo) {
    activeVideo.currentTime = 0
    playSafely(activeVideo)
    resetControlsTimeout()
  }
}

const handleTimelineClick = (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percentage = x / rect.width
  const activeVideo = isExpanded.value ? modalVideoElement.value : videoElements.value[currentIndex.value]
  if (activeVideo && !isNaN(activeVideo.duration)) {
    activeVideo.currentTime = percentage * activeVideo.duration
    resetControlsTimeout()
  }
}

const handleMouseLeave = () => {
  if (isPlaying.value) {
    showControls.value = false
  }
}

const handleTimeUpdate = (e) => {
  const video = e.target
  currentTime.value = video.currentTime
  duration.value = video.duration
  progress.value = (video.currentTime / video.duration) * 100
}

const formatTime = (time) => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const pauseVideo = () => {
  // The element's own pause event clears isPlaying.
  videoElements.value[currentIndex.value]?.pause()
}

// Auto-advance on video end
const handleVideoEnd = () => {
  if (currentIndex.value < videos.value.length - 1) {
    nextVideo()
  } else {
    pauseVideo()
  }
}

// Keyboard navigation. Scoped deliberately: this listener is on window, and the
// component sits on pages that also carry forms (ContactUsPage), so an
// unconditional `preventDefault()` on Space swallowed spaces typed into the
// message box. Only act while the modal is open or focus is inside the carousel,
// and never while the user is typing.
const isTypingTarget = (el) => {
  if (!el) return false
  if (el.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

const handleKeydown = (e) => {
  if (isTypingTarget(e.target)) return

  const focusInside = containerElement.value?.contains(e.target)
  if (!isExpanded.value && !focusInside) return

  if (e.key === 'ArrowLeft') prevVideo()
  if (e.key === 'ArrowRight') nextVideo()
  if (e.key === ' ') {
    e.preventDefault()
    togglePlay()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  compactQuery = window.matchMedia('(max-width: 768px)')
  isCompact.value = compactQuery.matches
  compactQuery.addEventListener?.('change', syncCompact)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  compactQuery?.removeEventListener?.('change', syncCompact)
  if (controlsTimeout) clearTimeout(controlsTimeout)
})
</script>

<template>
  <!-- Decorative wave top -->
  <div style="width: 100%; overflow: hidden; line-height: 0;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" preserveAspectRatio="none"
      style="width: 100%; height: 120px; display: block;">
      <path fill="#FDF3E6"
        d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z">
      </path>
    </svg>
  </div>
  <div class="video-card-container">
    <!-- Teleported Modal for Expanded Video -->
    <Teleport to="body">
      <transition name="modal-scale">
        <div v-if="isExpanded" class="video-modal-overlay" @click="closeExpanded">
          <div class="video-modal-content" @mousemove.stop="resetControlsTimeout(true, $event)"
            @mouseleave="handleMouseLeave" @click.stop>
            <!-- No `autoplay`: iOS rejects unmuted autoplay outright, which used
                 to leave a black overlay with no controls. togglePlay() calls
                 play() from the user's own tap instead, so the sound survives. -->
            <video :src="videos[currentIndex].src" :poster="videos[currentIndex].poster" playsinline
              class="modal-video-player" @timeupdate="handleTimeUpdate" @ended="handleVideoEnd"
              @play="handlePlaying" @pause="handlePaused" ref="modalVideoElement"
              crossorigin="anonymous" />

            <!-- Modal Controls -->
            <!-- Outside the fading control layer on purpose: the way out of a
                 fullscreen video must never be conditional on a hover timer. -->
            <button class="modal-close-btn" @click="closeExpanded" :aria-label="t('videoSection.controls.close')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <!-- `showControls` is driven by mousemove, which never fires on a
                 touch screen — so touch devices always get the controls. -->
            <transition name="fade">
              <div v-if="showControls || !isPlaying || isCompact" class="modal-controls">
                <div class="modal-controls-center">
                  <button class="modal-restart-btn" @click="restartVideo" :title="t('videoSection.controls.restart')">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 4v6h6M23 20v-6h-6" />
                      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                    </svg>
                  </button>

                  <button class="modal-seek-btn" @click="seek(-10)">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
                    </svg>
                    <span>{{ t('videoSection.controls.seekBack') }}</span>
                  </button>

                  <button class="modal-play-btn" @click="togglePlay">
                    <svg v-if="isPlaying" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 4h4v16H6zm8 0h4v16h4z" />
                    </svg>
                    <svg v-else width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>

                  <button class="modal-seek-btn" @click="seek(10)">
                    <span>{{ t('videoSection.controls.seekForward') }}</span>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                    </svg>
                  </button>
                </div>

                <div class="modal-controls-bottom">
                  <div class="modal-progress-container" @click="handleTimelineClick">
                    <div class="modal-progress-bar" :style="{ width: progress + '%' }"></div>
                  </div>
                  <div class="modal-time-info">
                    <span>{{ formatTime(currentTime) }}</span>
                    <span>{{ formatTime(duration) }}</span>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </transition>
    </Teleport>

    <div v-reveal class="section-header">
      <h2 style="margin: 0;">{{ t('videoSection.title') }}</h2>
      <p style="margin: 0;">{{ t('videoSection.subtitle') }}</p>
    </div>

    <div v-reveal class="carousel-container delay4" ref="containerElement" @touchstart.passive="handleTouchStart"
      @touchmove.passive="handleTouchMove" @touchend="handleTouchEnd" @touchcancel="handleTouchCancel">
      <!-- Navigation Arrows -->
      <button class="nav-arrow nav-arrow-left" @click="prevVideo" :disabled="currentIndex === 0"
        v-show="currentIndex > 0">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <button class="nav-arrow nav-arrow-right" @click="nextVideo" :disabled="currentIndex === videos.length - 1"
        v-show="currentIndex < videos.length - 1">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      <div class="cards-stack">
        <div v-for="(video, index) in videos" :key="video.id" class="video-card-item"
          :data-position="getPosition(index)"
          :style="{
            display: getPosition(index) < 1 || getPosition(index) > 5 ? 'none' : 'block',
            '--clip-ratio': video.ratio
          }">

          <!-- Click overlay to select non-center cards -->
          <div class="click-overlay" @click.stop="goToVideo(index)" v-if="getPosition(index) !== 3"></div>

          <!-- The poster is painted as a cover background rather than the
               video's own `poster`, because the two do not agree: clips 3 and 4
               are portrait video with landscape thumbnails, and `poster` obeys
               the video's object-fit, which letterboxed them into a black band.
               As a background it fills the card; the video still letterboxes
               honestly once it plays. -->
          <div class="video-wrapper" :style="{ backgroundImage: `url(${video.poster})` }">
            <!-- `playsinline` is what keeps iOS from yanking the video out of the
                 page into its native fullscreen player. On a phone the card is
                 the player, so it also gets the platform's own controls. -->
            <video :ref="el => setVideoRef(el, index)" :src="video.src" playsinline
              :controls="isCompact && isPlaying && getPosition(index) === 3"
              @ended="handleVideoEnd" @play="handlePlaying" @pause="handlePaused"
              class="video-player" preload="metadata" crossorigin="anonymous" />

            <!-- Play/Pause Overlay (only for center card). Unmounted while a
                 phone is playing so it cannot swallow taps meant for the native
                 control bar underneath it. -->
            <div class="video-overlay" @click="togglePlay" v-if="getPosition(index) === 3 && !(isCompact && isPlaying)">
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
                <h3>{{ video.title }}</h3>
                <p>{{ video.description }}</p>
              </div>
              <div class="video-duration">{{ video.duration }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Indicator Dots -->
      <div class="indicators">
        <button v-for="(video, index) in videos" :key="video.id" class="indicator-dot"
          :class="{ active: index === currentIndex }" @click="goToVideo(index)"
          :aria-label="$t('videoSection.indicatorLabel', { index: index + 1 })">
          <span class="dot-inner"></span>
        </button>
      </div>

      <!-- Progress Indicator
      <div class="video-counter">
        <span class="current">{{ currentIndex + 1 }}</span>
        <span class="separator">/</span>
        <span class="total">{{ videos.length }}</span>
      </div> -->
    </div>
  </div>

  <!-- Decorative wave bottom -->
  <div style="width: 100%; overflow: hidden; line-height: 0;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" preserveAspectRatio="none"
      style="width: 100%; height: 120px; display: block;">
      <path fill="#FDF3E6"
        d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z">
      </path>
    </svg>
  </div>
</template>

<style scoped>
.slant-top {
  background: linear-gradient(to bottom right, transparent 50%, #fff 50%);
  padding-top: 100px;
}

/* Using clip-path */
.diagonal-border {
  /* background: #fff; */
  clip-path: polygon(0 10%, 100% 0, 100% 90%, 0 100%);
}

.video-card-container {
  background-color: #FDF3E6;
  background-size: cover;
  background-position: center;
  margin: 0 auto;
  padding: 0 20px;
}

.section-header {
  text-align: center;
}

.section-header h2 {
  font-size: 42px;
  font-weight: 700;
  color: #604539;
  margin: 0 0 10px 0;
  letter-spacing: -0.5px;
}

.section-header p {
  color: #8b6f47;
}

.carousel-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 600px;
  perspective: 1500px;
}

.cards-stack {
  position: relative;
  width: 100%;
  height: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.video-card-item {
  position: absolute;
  width: 800px;
  max-width: 90vw;
  aspect-ratio: 16 / 9;
  background: #1a1a1a;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(94, 69, 53, 0.3);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
}

/* Position States */
.video-card-item[data-position="1"] {
  transform: translateX(-40rem) scale(0.7);
  z-index: 1;
  opacity: 0;
  pointer-events: none;
}

.video-card-item[data-position="2"] {
  transform: translateX(-20rem) scale(0.85);
  z-index: 2;
  opacity: 0.6;
}

.video-card-item[data-position="3"] {
  transform: translateX(0) scale(1);
  z-index: 3;
  opacity: 1;
  box-shadow: 0 30px 60px rgba(94, 69, 53, 0.4);
}

.video-card-item[data-position="4"] {
  transform: translateX(20rem) scale(0.85);
  z-index: 2;
  opacity: 0.6;
}

.video-card-item[data-position="5"] {
  transform: translateX(40rem) scale(0.7);
  z-index: 1;
  opacity: 0;
  pointer-events: none;
}

/* If there are more than 5, hide them */
.video-card-item[data-position^="-"],
.video-card-item[data-position="6"],
.video-card-item[data-position="7"],
.video-card-item[data-position="8"] {
  opacity: 0;
  pointer-events: none;
}

.click-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.2);
  transition: background 0.3s ease;
}

.click-overlay:hover {
  background: rgba(0, 0, 0, 0.1);
}

.video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #1a1a1a;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  overflow: hidden;
}

/* `contain`, not `cover`: two of the four clips are portrait, so cover in the
   16:9 desktop card cropped them down to a narrow centre strip. Letterboxing
   against the dark wrapper is what a real player does. Transparent until the
   first frame decodes, so the wrapper's poster shows through. */
.video-player {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
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
  z-index: 15;
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
  pointer-events: none;
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
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
  transition: all 0.3s ease;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  color: #5E4535;
}

.nav-arrow:hover {
  background: white;
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
}

.nav-arrow:disabled {
  opacity: 0;
  pointer-events: none;
}

.nav-arrow-left {
  left: 40px;
}

.nav-arrow-right {
  right: 40px;
}

/* Indicators */
.indicators {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 40;
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

.indicator-dot.active .dot-inner {
  background: white;
  width: 30px;
  border-radius: 5px;
}

/* Video Counter */
.video-counter {
  position: absolute;
  top: 20px;
  right: 40px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 10px 20px;
  border-radius: 20px;
  color: white;
  font-weight: 600;
  font-size: 16px;
  z-index: 40;
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

/* Swipe Hint */
.swipe-hint {
  text-align: center;
  margin-top: 30px;
  color: #93735E;
  opacity: 0.6;
  animation: fadeInOut 3s ease-in-out infinite;
}

/* Animations */
@keyframes fadeInOut {

  0%,
  100% {
    opacity: 0.3;
  }

  50% {
    opacity: 0.8;
  }
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

/* Modal Expansion */
.video-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.video-modal-content {
  position: relative;
  width: 90vw;
  max-width: 1200px;
  aspect-ratio: 16 / 9;
  background: black;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
}

.modal-video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.modal-controls {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 20%, transparent 80%, rgba(0, 0, 0, 0.8) 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 40px;
  z-index: 10;
}

/* The close button now sits outside this layer, so it is positioned against the
   modal itself and stacks above the control gradient. */
.modal-close-btn {
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: rgba(0, 0, 0, 0.45);
  border: none;
  color: white;
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.3s ease;
  z-index: 20;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

/* `auto` margins centre this vertically while the bottom bar stays pinned. */
.modal-controls-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 50px;
  margin: auto;
}

.modal-seek-btn {
  background: none;
  border: none;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.modal-seek-btn:hover {
  transform: scale(1.1);
  color: #ffd4a3;
}

.modal-restart-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.7;
}

.modal-restart-btn:hover {
  opacity: 1;
  transform: rotate(-30deg);
  color: #ffd4a3;
}

.modal-play-btn {
  background: white;
  border: none;
  color: #5E4535;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-play-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
}

.modal-controls-bottom {
  width: 100%;
}

.modal-progress-container {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  margin-bottom: 20px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
}

.modal-progress-container::after {
  content: '';
  position: absolute;
  top: -10px;
  bottom: -10px;
  left: 0;
  right: 0;
}

.modal-progress-bar {
  height: 100%;
  background: #ffd4a3;
}

.modal-time-info {
  display: flex;
  justify-content: space-between;
  color: white;
  font-size: 16px;
  font-weight: 600;
}

/* Modal Transitions */
.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .video-modal-content {
    width: 95vw;
  }

  .modal-controls-center {
    gap: 25px;
  }

  .modal-play-btn {
    width: 60px;
    height: 60px;
  }

  .modal-controls {
    padding: 20px;
  }
}

/* Responsive Design */
@media (max-width: 1200px) {
  .carousel-container {
    min-height: 500px;
  }

  .video-card-item {
    width: 600px;
  }

  .video-card-item[data-position="2"] {
    transform: translateX(-15rem) scale(0.8);
  }

  .video-card-item[data-position="4"] {
    transform: translateX(15rem) scale(0.8);
  }
}

/* Phone: one full-bleed vertical video per screen. The coverflow above is not
   scaled down here, it is replaced — perspective, side cards and the fixed
   stack height all come off, and the card is laid out in normal flow so the
   section grows with it instead of being trapped in a 500px box. */
@media (max-width: 768px) {
  .section-header h2 {
    font-size: 32px;
  }

  /* The container's side padding is what the card escapes from below. */
  .video-card-container {
    padding: 0;
  }

  .section-header {
    padding: 0 20px;
  }

  .carousel-container {
    min-height: 0;
    perspective: none;
    flex-direction: column;
  }

  .cards-stack {
    height: auto;
    width: 100%;
    display: block;
  }

  .video-card-item[data-position="1"],
  .video-card-item[data-position="2"],
  .video-card-item[data-position="4"],
  .video-card-item[data-position="5"] {
    display: none !important;
  }

  .video-card-item {
    position: relative;
    width: 100%;
    max-width: none;
    /* Each clip's own shape, so nothing is cropped and a phone-shot clip
       genuinely fills the screen. Falls back to 9:16 if a clip has no ratio. */
    aspect-ratio: var(--clip-ratio, 9 / 16);
    max-height: 78svh;
    margin: 0 auto;
    border-radius: 0;
    box-shadow: none;
    /* No slide animation when there is only ever one card on screen. */
    transition: none;
  }

  .video-card-item[data-position="3"] {
    transform: none;
    box-shadow: none;
  }

  /* Arrows are replaced by swipe + the dots below. */
  .nav-arrow {
    display: none;
  }

  .video-info {
    padding: 16px 20px 20px 20px;
  }

  .video-details h3 {
    font-size: 20px;
  }

  .video-counter {
    top: 10px;
    right: 10px;
  }

  .indicators {
    position: static;
    transform: none;
    justify-content: center;
    margin-top: 16px;
    gap: 4px;
  }

  /* Real tap targets: the dot stays small, the hit area does not. */
  .indicator-dot {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* The dots sit on the cream section background here, not over the video, so
     the white-on-video treatment would be invisible. */
  .dot-inner {
    background: rgba(96, 69, 57, 0.28);
    box-shadow: none;
  }

  .indicator-dot.active .dot-inner {
    background: #DD876E;
  }

  .controls-center {
    gap: 20px;
  }

  .play-pause-btn {
    width: 60px;
    height: 60px;
  }

  .modal-close-btn {
    top: 12px;
    right: 12px;
  }
}

@media (min-width: 769px) {
  .swipe-hint {
    display: none;
  }
}
</style>
