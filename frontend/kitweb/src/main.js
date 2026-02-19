//standard import
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n'


//UI import
// import FomanticUI from 'vue-fomantic-ui'
// import 'fomantic-ui-css/semantic.min.css'


//backend
// import { initializeApp } from "firebase/app";

// const firebaseConfig = {
//     apiKey: "AIzaSyBNvUSZplbpPebD_UbCZ2EBEDknrZq7hok",
//     authDomain: "hello-7f9eb.firebaseapp.com",
//     projectId: "hello-7f9eb",
//     storageBucket: "hello-7f9eb.appspot.com",
//     messagingSenderId: "374219009585",
//     appId: "1:374219009585:web:090f81ec32f9d81dca6f10"
//   };

// const firebaseApp = initializeApp(firebaseConfig);


//initializing app
const app = createApp(App)

app.use(router)
app.use(i18n)

app.directive('reveal', {
  mounted(el) {
    el.classList.add('reveal-hidden'); // Initial state
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // Runs only once
        }
      });
    }, { threshold: 0.1 });
    observer.observe(el);
  }
});

app.mount('#app')






