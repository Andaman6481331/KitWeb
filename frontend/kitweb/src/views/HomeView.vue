
<template>
  <div class="content">
    <!-- Recommend -->
    <div class="Recommendation">
      <h1>Today's Recommendation</h1>
      <div class="scroller" ref="scroller">
        <div class="item">
          <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1">
        </div>
        <div class="item">
          <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1">
        </div>
        <div class="item">
          <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1">
        </div>
        <div class="item">
          <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1">
        </div>
        <div class="item">
          <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1">
        </div>
      </div>
    </div>
    <!-- Stocks -->
    <div class="Stock">
      <h1>Stocks</h1>
      <div class="itemlist">
        <div class="item"><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1"></div>
        <div class="item"><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1"></div>
        <div class="item"><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1"></div>
        <div class="item"><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1"></div>
        <div class="item"><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1"></div>
        <div class="item"><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1"></div>
        <div class="item"><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1"></div>
        <div class="item"><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1"></div>
        <div class="item"><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1"></div>
        <div class="item"><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1"></div>
        <div class="item"><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1"></div>
      </div>  
    </div>
  </div>
</template>


<style scoped>
  .content {
    margin: 150px auto 0 auto;
    width: 90%;
    background-color: azure;
  }

  .Recommendation {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .Stock {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .Recommendation h1,
  .Stock h1 {
    margin: 0;
  }

  .itemlist {
    display: grid;
    grid-template-columns: repeat(4, 1fr); /* Three columns of equal width */
    gap: 10px; /* Space between items */
    width: 80%; /* Adjust as needed */
    margin: 0 auto;
  }

  .itemlist .item {
    width: 100%; /* Ensure item takes full width of grid column */
    height: 200px; /* Fixed height */
    background-color: lightcoral; /* Just for visibility */
    display: flex; /* Center content vertically and horizontally */
    align-items: center;
    justify-content: center;
    &.item:hover{
      cursor: pointer;
    }
  }

  .itemlist .item img {
    width: 100%; /* Make image fill the item width */
    height: 100%; /* Make image fill the item height */
    object-fit: cover; /* Ensure the image covers the container without distortion */
  
  }

  .scroller {
    display: flex;
    flex-direction: row;
    overflow: hidden;
    width: 80%;
    position: relative;
    white-space: nowrap;
    gap: 10px;
    padding: 2%;
  }

  .scroller .item {
    width: 300px;
    height: 300px;
    display: inline-block;
    background-color: lightcoral; /* Just for visibility */
    margin: 0 10px; /* Space between items */
    text-align: center;
    line-height: 300px; /* Center text vertically */
    color: white;
    font-size: 1.5rem;
    &.item:hover{
      cursor: pointer;
    }
  }

  .scroller .item img {
    width: 300px; /* Ensure image fills the item width */
    height: 300px; /* Ensure image fills the item height */
    object-fit: cover; /* Ensure the image covers the container without distortion */
  }

  ::-webkit-scrollbar {
    width: 0; /* Hide scrollbar */
  }
</style>


<script setup>
import { ref, onMounted } from 'vue';

const scroller = ref(null);

const startDragging = (event) => {
  event.preventDefault();
  scroller.value.dataset.dragging = 'true';
  scroller.value.dataset.startX = event.clientX;
  scroller.value.dataset.scrollLeft = scroller.value.scrollLeft;
};

const stopDragging = () => {
  scroller.value.dataset.dragging = 'false';
  const scrollerWidth = scroller.value.offsetWidth;
  const itemWidth = scroller.value.querySelector('.item').offsetWidth + 20; // Including margin
  const scrollLeft = scroller.value.scrollLeft;
  const index = Math.round(scrollLeft / itemWidth);
  scroller.value.scrollTo({
    left: index * itemWidth,
    behavior: 'smooth'
  });
};

const onDragging = (event) => {
  if (scroller.value.dataset.dragging === 'true') {
    const x = event.clientX;
    const startX = parseInt(scroller.value.dataset.startX, 10);
    const scrollLeft = parseInt(scroller.value.dataset.scrollLeft, 10);
    const walk = (x - startX) * 2; // Scroll speed multiplier
    scroller.value.scrollLeft = scrollLeft - walk;
  }
};

onMounted(() => {
  scroller.value.addEventListener('mousedown', startDragging);
  scroller.value.addEventListener('mousemove', onDragging);
  scroller.value.addEventListener('mouseup', stopDragging);
  scroller.value.addEventListener('mouseleave', stopDragging);

  // Handle touch events
  scroller.value.addEventListener('touchstart', startDragging);
  scroller.value.addEventListener('touchmove', onDragging);
  scroller.value.addEventListener('touchend', stopDragging);
});
</script>
