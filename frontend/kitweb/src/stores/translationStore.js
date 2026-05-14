import { reactive } from 'vue';
import { api } from '../services/api';

const store = reactive({
    translations: {}, // key: "productId-field-lang", value: "translated text"
    loading: {},      // key: "productId-field-lang", value: boolean

    async getTranslation(productId, field, text, targetLang) {
        if (!text || targetLang === 'en' || targetLang === 'EN') return text;

        const key = `${productId}-${field}-${targetLang.toLowerCase()}`;
        
        // Return from cache if exists
        if (this.translations[key]) return this.translations[key];

        // If already loading, return original text for now
        if (this.loading[key]) return text;

        // Fetch translation
        this.loading[key] = true;
        try {
            const translated = await api.translateText(text, targetLang.toLowerCase());
            this.translations[key] = translated;
            return translated;
        } catch (error) {
            console.error(`Translation failed for ${key}:`, error);
            return text; // Fallback to original
        } finally {
            this.loading[key] = false;
        }
    }
});

export default store;
