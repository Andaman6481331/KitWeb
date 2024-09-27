<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div>
    <div class="NavBar">
      <div class="nav-group">
        <img src="../components/icons/twitter.svg" alt="logo" class="logo">
        <div>
          <h1>Kitcharoen Webpage</h1>
          <p>376 Wanich 1 Chakkrawat Samphantawong Bangkok</p>
        </div>
      </div>
      <div class="nav-group">
        <button class="item">Your<br>Suggestion</button>
        <button class="item">Order</button>
      </div>
    </div>
    
    <RouterView /> <!-- This is other page will be rendered -->
    
  </div>
</template>


<style scoped>
.NavBar {
  /* position: fixed; */
  top: 0;
  left: 0;
  width: 86%;
  min-width: 1000px;
  height: 130px;
  background: radial-gradient(#b3907a,#9c7862);
  color: #342c22;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 7%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Subtle shadow */
  /* z-index: 1000; */
}

.nav-group {
  display: flex;
  align-items: center;
  gap: 10px;
  h1{
    margin: 0;
    font-size: 60px !important; 
    /* color: azure; */
  }
  p{
    margin: 0;
    font-size: 20px !important;
    /* color: azure; */
  }
}

.item {
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
