import { ref } from 'vue';
import { api } from '../services/api';

/**
 * Editorial content loader. Mirrors useProducts: paint from localStorage first so
 * the homepage slot is never blank on a repeat visit, then revalidate in the
 * background and patch only if the payload actually changed.
 *
 * Cache is keyed per query, since the homepage asks for one featured post while
 * the archive asks for the full list.
 */
export function useProjects() {
  const projects = ref([]);
  const isLoading = ref(false);
  const error = ref(null);

  const cacheKeyFor = (opts) => `kitweb_projects_${JSON.stringify(opts)}`;

  const fetchProjects = async (opts = {}) => {
    isLoading.value = true;
    const cacheKey = cacheKeyFor(opts);

    // 1. STALE: paint whatever we had last time.
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          projects.value = JSON.parse(cached);
        } catch {
          // A corrupted entry is not worth surfacing; the fetch below replaces it.
        }
      }
    }

    // 2. REVALIDATE
    try {
      const data = await api.getProjects(opts);
      if (JSON.stringify(data) !== JSON.stringify(projects.value)) {
        projects.value = data;
        if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        }
      }
    } catch (err) {
      error.value = err.message;
      console.error('Failed to load projects:', err);
    } finally {
      isLoading.value = false;
    }
  };

  return { projects, isLoading, error, fetchProjects };
}
