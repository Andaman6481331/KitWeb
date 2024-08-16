//standard import
import { createApp } from 'vue'
import App from './App.vue'
import router from '/src/router'


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

app.mount('#app')






