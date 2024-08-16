<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useRoute} from 'vue-router';
</script>

<template>
  <div class="NavBar">
    <div class="nav-group">
      <img src="../components/icons/twitter.svg" alt="logo" class="logo">
      <button class="item">Home</button>
      <button class="item">About</button>
      <button class="item">Contact</button>
    </div>
    <div class="nav-group">
      <button class="item">Login</button>
    </div>
  </div>
</template>

<style scoped>
.NavBar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 80px;
  background: #87551d;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10%; /* Adjusted to center content and add padding */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Subtle shadow */
  z-index: 1000; /* Keep the navbar on top */
}

.nav-group {
  display: flex;
  align-items: center;
}

.logo {
  height: 40px; /* Adjust the logo size */
  margin-right: 20px; /* Space between the logo and buttons */
}

.item {
  color: white;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  background: none; /* Remove default button styling */
  border: none;
  padding: 10px 20px;
}
.item:hover {
  background: rgba(255, 255, 255, 0.2); /* Slight hover effect */
  border-radius: 5px;
}
</style>
