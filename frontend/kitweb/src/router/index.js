import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/HomeView.vue'; // Ensure the path is correct

// Define routes
const routes = [
    {
        path: '/home',
        name: 'home',
        component: Home
    }
];

// Create router instance
const router = createRouter({
    history: createWebHistory(), // or createWebHistory(process.env.BASE_URL) if needed
    routes
});

// Export the router instance as default
export default router;


// import { createRouter, createWebHistory } from 'vue-router';
// import Home from '../views/Home.vue';
// import Login from '../views/Login.vue';
// import Signup from '../views/Signup.vue';
// import Songs from '../views/Songs.vue';
// import Artistpage from '../views/Artistpage.vue';
// import ArtistList from '../views/Artistlist.vue';
// import temp from '../views/temp.vue';

// import {getAuth, onAuthStateChanged} from 'firebase/auth'

// const routerHistory = createWebHistory()

// const routes = [
//   {
//     path: '/',
//     redirect: '/login'
//   },
//   {
//     path: '/:catchAll(.*)',
//     redirect: '/login'
//   },
//   {
//     path: '/home',
//     name: 'home',
//     component: Home,
//     meta: {
//       requiresAuth: true
//     }
//   },
//   {
//     path: '/songs',
//     name: 'songs',
//     component: Songs,
//     meta: {
//       requiresAuth: true
//   }
//   },
//   {
//     path: '/login',
//     name: 'login',
//     component: Login,
//   },
//   {
//     path:'/temp',
//     name:'temp',
//     component: temp,
//   },
//   {
//     path: '/signup',
//     name: 'signup',
//     component: Signup,
//   },
//   {
//     path: '/artist/:artistName',
//     name: 'artist',
//     component: Artistpage,
//     meta: {
//       requiresAuth: true
//   }
//   },
//   {
//     path: '/artist',
//     name: 'artistlist',
//     component: ArtistList,
//     meta: {
//       requiresAuth: true
//   }
//   }
// ];