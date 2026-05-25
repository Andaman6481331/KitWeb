import { createRouter as createVueRouter, createWebHistory, createMemoryHistory, RouterView } from 'vue-router';
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
import { setLocale } from '../i18n';

const savedMap = { EN: 'en', TH: 'th', CN: 'zh', JP: 'ja' };
function getSavedLocale() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return 'EN';
    }
    return localStorage.getItem('locale') || 'EN';
}
const defaultLang = savedMap[getSavedLocale()] || 'en';

export const routes = [
    { path: '/', redirect: `/${defaultLang}` },
    {
        path: '/:lang',
        component: RouterView,
        children: [
            { path: '', name: 'home', component: Home },
            { path: 'catalog', name: 'catalog', component: Catalog },
            { path: 'catalog/:category', name: 'category-products', component: CategoryView },
            { path: 'orderpage', name: 'orderpage', component: OrderPage, meta: { requiresAuth: true } },
            { path: 'contactus', name: 'contactus', component: ContactUsPage },
            { path: 'login', name: 'login', component: Login },
            { path: 'event', name: 'event', component: EventPage },
            { path: 'partners', name: 'partners', component: PartnerPage },
            { path: 'admin', name: 'admin', component: AdminDashboard, meta: { requiresAuth: true } },
            { path: ':pathMatch(.*)*', redirect: to => `/${to.params.lang}` }
        ]
    },
    // Fallback for paths without locale prefix
    { path: '/:pathMatch(.*)*', redirect: to => `/${defaultLang}${to.fullPath}` }
];

export function createRouter() {
    const history = import.meta.env.SSR ? createMemoryHistory() : createWebHistory();
    return createVueRouter({
        history,
        routes,
        scrollBehavior(to, from, savedPosition) {
            if (savedPosition) {
                return savedPosition;
            } 
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({ top: 0, left: 0 });
                }, 0); 
            });
        }
    });
}

const router = createRouter();

// Navigation Guard - handle locale from path and auth
router.beforeEach((to, from, next) => {
    const lang = to.params.lang;
    const pathToCode = { en: 'EN', th: 'TH', zh: 'CN', ja: 'JP' };

    if (!lang) {
        // no lang param - allow redirects to apply
        next();
        return;
    }

    if (!pathToCode[lang]) {
        // invalid lang -> redirect to default
        next({ path: `/${defaultLang}` });
        return;
    }

    // Set i18n locale based on path
    setLocale(pathToCode[lang]);

    const isAuthenticated = authStore.isAuthenticated;
    const requiresAuth = to.matched.some(record => record.meta && record.meta.requiresAuth);

    if (requiresAuth && !isAuthenticated) {
        // Redirect to localized login
        next({ path: `/${lang}/login` });
    } else if (to.name === 'login' && isAuthenticated) {
        // Redirect to localized orderpage if already logged in
        next({ path: `/${lang}/orderpage` });
    } else {
        next();
    }
});

// 🌟 ADD THIS ROUTER GUARD FOR THE TITLES 🌟
router.afterEach((to) => {
    if (typeof document === 'undefined') {
        return;
    }

    const isThai = to.path.startsWith('/th');
    const engTitle = 'Kitcharoen - Premium Yarn & Sewing Supplies';
    const thaiTitle = 'กิจเจริญ - ไหมพรมและอุปกรณ์เย็บปักถักร้อยเกรดพรีเมียม สำเพ็ง';

    const engDesc = 'Kitcharoen craft and sewing supplies from Bangkok\'s Sampeng Market. Trusted materials, honest prices, and friendly service since 1984.';
    const thaiDesc = 'กิจเจริญ ร้านขายอุปกรณ์งานฝีมือแบบครอบครัวในตลาดสำเพ็ง กรุงเทพฯ ใกล้เยาวราช จำหน่ายไหมพรม คุณภาพสูง และอุปกรณ์ตัดเย็บครบวงจร ราคาเป็นกันเอง';

    document.title = isThai ? thaiTitle : engTitle;
    document.documentElement.lang = isThai ? 'th' : 'en';

    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
        descriptionMeta = document.createElement('meta');
        descriptionMeta.setAttribute('name', 'description');
        document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.setAttribute('content', isThai ? thaiDesc : engDesc);
});

// Export the router instance as default
export default router;