import { ref } from 'vue';
import { api } from '../services/api';

export function useProducts() {
  const products = ref([]);
  const isLoading = ref(false);
  const error = ref(null);

  const CACHE_KEY = 'kitweb_products_cache';

  const fetchProducts = async (category = 'All') => {
    isLoading.value = true;
    
    // 1. STALE: Load from localStorage immediately
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        products.value = JSON.parse(cached);
      } catch (e) {
        console.warn('Cache corrupted, ignoring.');
      }
    }

    // 2. REVALIDATE: Fetch in background
    try {
      const data = await api.getProducts(category === 'All' ? null : category);
      
      // Patch UI only if data changed
      if (JSON.stringify(data) !== JSON.stringify(products.value)) {
        products.value = data;
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
    } catch (err) {
      error.value = err.message;
      console.error('Failed to revalidate products:', err);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    products,
    isLoading,
    error,
    fetchProducts
  };
}
