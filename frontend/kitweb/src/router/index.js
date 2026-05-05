import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/HomeView.vue';
import Catalog from '../views/CatalogPage.vue';
import OrderPage from '../views/OrderPage.vue';
import ContactUsPage from '../views/ContactUsPage.vue';
import Login from '../views/Login.vue';
import EventPage from '../views/EventPage.vue';
import DIYProductPage from '../views/DIYProductPage.vue';
import PartnerPage from '../views/PartnerPage.vue';
import AdminDashboard from '../views/AdminDashboard.vue';

// Define routes
const routes = [
    {
        path: '/admin',
        name: 'admin',
        component: AdminDashboard
    },
    {
        path: '/',
        name: 'home',
        component: Home
    },
    {
        path: '/catalog',
        name: 'catalog',
        component: Catalog
    },
    {
        path: '/catalog/:category',
        name: 'category-products',
        component: Catalog
    },
    {
        path: '/orderpage',
        name: 'orderpage',
        component: OrderPage
    },
    {
        path: '/contactus',
        name: 'contactus',
        component: ContactUsPage
    },
    {
        path: '/login',
        name: 'login',
        component: Login
    },
    {
        path: '/event',
        name: 'event',
        component: EventPage
    },
    {
        path: '/diyproduct',
        name: 'diyproduct',
        component: DIYProductPage
    },
    {
        path: '/partners',
        name: 'partners',
        component: PartnerPage
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