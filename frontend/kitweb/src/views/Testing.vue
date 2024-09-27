<template>
    <div class="content">
        <div class="container">
            <h1 class="text-center section-header">Today's Recommendation</h1>
        </div>
        <div class="container">
            <div class="swiper slider">
                <div class="swiper-wrapper">
                    <!-- card start -->
                    <div class="swiper-card card">
                        <div class="card-img">
                            <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="item">
                        </div>
                        <div class="card-content">
                            <h1 class="product-price">$20</h1>
                            <div class="card-content-bottom">
                                <h2 class="product-name">Eagle Yarn</h2>
                            </div>
                        </div>
                    </div>
                    <!-- card-end -->
                </div>
            </div>
            <div class="slider-control">
                <div class="swiper-button-prev slider-arrow">
                    <ion-icon name="arrow-forward-outline"></ion-icon>
                </div>
                <div class="swiper-button-next slider-arrow">
                    <ion-icon name="arrow-back-outline"></ion-icon>
                </div>
                <div class="swiper-pagination"></div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap");

.text-center{
    text-align: center;
}
.section-header{
    font-size: 3rem;
    background-color: #b3907a;
    color: #684536;
    padding: 2rem 0;
}
.swiper-wrapper{
    display: flex;
}
.slider{
    height: 52rem;
    padding: 2rem 0;
    position: relative;
}
@media (max-width:500px){
        .slider{
            height: 45rem;
        }
    }

.card{
    width: 37rem;
    height: 42rem;
    position:relative;
}
.card .card-img img{
    width: 37rem;
    height: 42rem;
    border-radius: 2rem;
    object-fit: cover;
}
@media (max-width:500px){
    .card{
        width: 28rem !important;
        height: 36rem !important;
    }
    .card .card-img img{
        width: 28rem !important;
        height: 36rem !important;
    }
}

.card .card-content{
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
}
.card-content .product-price h1{
    position: absolute;
    top: 2rem;
    right: 2rem;
    color: var(--white);
}
.card-content .card-content-bottom{
    position: absolute;
    top: 2rem;
    right: 2rem;
    color: var(--white);
}
.swiper-slide-shadow-left,
.swiper-slide-shadow-right {
  display: none;
}

.slider-control {
  position: relative;
  bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.slider-control .swiper-button-next {
  left: 58% !important;
  transform: translateX(-58%) !important;
}
@media (max-width:990px) {
  .slider-control .swiper-button-next {
    left: 70% !important;
    transform: translateX(-70%) !important;
  }
}
@media (max-width:450px) {
  .slider-control .swiper-button-next {
    left: 80% !important;
    transform: translateX(-80%) !important;
  }
}
@media (max-width:990px) {
  .slider-control .swiper-button-prev {
    left: 30% !important;
    transform: translateX(-30%) !important;
  }
}
@media (max-width:450px) {
  .slider-control .swiper-button-prev {
    left: 20% !important;
    transform: translateX(-20%) !important;
  }
}

.slider-control .slider-arrow {
  background: var(--white);
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  left: 42%;
  transform: translateX(-42%);
  filter: drop-shadow(0px 8px 24px rgba(18, 28, 53, 0.1));
}

.slider-control .slider-arrow ion-icon {
  font-size: 2rem;
  color: #222224;
}

.slider-control .slider-arrow::after {
  content: '';
}

.slider-control .swiper-pagination {
  position: relative;
  width: 15rem;
  bottom: 1rem;
}

.slider-control .swiper-pagination .swiper-pagination-bullet {
  filter: drop-shadow(0px 8px 24px rgba(18, 28, 53, 0.1));
}

.slider-control .swiper-pagination .swiper-pagination-bullet-active {
  background: var(--primary);
}

*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  list-style-type: none;
  text-decoration: none;
}

:root {
  --primary: #ec994b;
  --white: #ffffff;
  --bg: #f5f5f5;
}

html {
  font-size: 62.5%;
  font-family: "Montserrat", sans-serif;
  scroll-behavior: smooth;
}

@media (min-width: 1440px) {
  html {
    zoom: 1.5;
  }
}

@media (min-width: 2560px) {
  html {
    zoom: 1.7;
  }
}

@media (min-width: 3860px) {
  html {
    zoom: 2.5;
  }
}

::-webkit-scrollbar {
  width: 1.3rem;
}

::-webkit-scrollbar-thumb {
  border-radius: 1rem;
  background: #797979;
  transition: all 0.5s ease-in-out;
}

::-webkit-scrollbar-thumb:hover {
  background: #222224;
}

::-webkit-scrollbar-track {
  background: #f9f9f9;
}


.content{
    margin-top: 10rem;
    max-width: 124rem;
    padding: 0 1rem;
    /* margin: 0 auto; */
}

</style>