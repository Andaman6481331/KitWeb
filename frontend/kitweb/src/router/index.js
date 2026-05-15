import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/HomeView.vue';
import Catalog from '../views/CatalogPage.vue';
import CategoryView from '../views/CategoryView.vue';
import OrderPage from '../views/OrderPage.vue';
import ContactUsPage from '../views/ContactUsPage.vue';
import Login from '../views/Login.vue';
import EventPage from '../views/EventPage.vue';
import PartnerPage from '../views/PartnerPage.vue';
import AdminDashboard from '../views/AdminDashboard.vue';

import { authStore } from '../stores/authStore';

// Define routes
const routes = [
    {
        path: '/admin',
        name: 'admin',
        component: AdminDashboard,
        meta: { requiresAuth: true }
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
        component: CategoryView
    },
    {
        path: '/orderpage',
        name: 'orderpage',
        component: OrderPage,
        meta: { requiresAuth: true }
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
        path: '/partners',
        name: 'partners',
        component: PartnerPage
    }

];

// Create router instance
const router = createRouter({
    history: createWebHistory(), // or createWebHistory(process.env.BASE_URL) if needed
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition;
        } else {
            return { top: 0 };
        }
    }
});

// Navigation Guard
router.beforeEach((to, from, next) => {
    const isAuthenticated = authStore.isAuthenticated;
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

    if (requiresAuth && !isAuthenticated) {
        // Redirect to login if trying to access a protected route without being logged in
        next({ name: 'login' });
    } else if (to.name === 'login' && isAuthenticated) {
        // Redirect to orderpage if already logged in and trying to access login page
        next({ name: 'orderpage' });
    } else {
        next();
    }
});

// Export the router instance as default
export default router;