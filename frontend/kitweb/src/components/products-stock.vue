<script setup>
import { ref, computed } from 'vue';

// Current view: 'categories' or 'items'
const currentView = ref('categories');
const selectedCategory = ref(null);
const showPopup = ref(false);
const selectedProduct = ref(null);

// Define your data array with detailed information
const items = ref([
    {
        id: 1,
        category: 'Yarn',
        title: 'Premium Yarn Collection',
        image: 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg',
        alt: 'yarn',
        description: 'High-quality premium yarn perfect for all your knitting and crochet projects.',
        usage: 'Ideal for sweaters, scarves, blankets, and decorative items',
        useFor: 'Knitting, crocheting, weaving, and textile crafts',
        varieties: ['Merino Wool', 'Cotton Blend', 'Acrylic', 'Silk Blend'],
        sizes: ['50g', '100g', '200g', '500g'],
        colors: ['Natural White', 'Deep Blue', 'Forest Green', 'Burgundy', 'Charcoal Grey', 'Mustard Yellow', 'Coral Pink', 'Lavender']
    },
    {
        id: 2,
        category: 'Buttons',
        title: 'Designer Buttons Set',
        image: 'https://m.media-amazon.com/images/I/81U7rrsM8zL._AC_UF894,1000_QL80_.jpg',
        alt: 'buttons',
        description: 'Elegant designer buttons to add a professional finish to your garments.',
        usage: 'Perfect for shirts, jackets, coats, and decorative accents',
        useFor: 'Clothing fasteners, decorative embellishments, craft projects',
        varieties: ['Plastic', 'Metal', 'Wood', 'Shell', 'Leather'],
        sizes: ['10mm', '15mm', '20mm', '25mm', '30mm'],
        colors: ['Black', 'White', 'Gold', 'Silver', 'Bronze', 'Navy', 'Brown', 'Clear']
    },
    {
        id: 3,
        category: 'Needles',
        title: 'Professional Needle Kit',
        image: 'https://cdn.sparkfun.com/assets/parts/4/8/7/5/10405-04b.jpg',
        alt: 'needle',
        description: 'Complete professional needle kit for all sewing and embroidery needs.',
        usage: 'Essential for hand sewing, embroidery, quilting, and repair work',
        useFor: 'General sewing, embroidery, quilting, beading, leather work',
        varieties: ['Sharps', 'Betweens', 'Embroidery', 'Tapestry', 'Quilting', 'Beading'],
        sizes: ['Size 1', 'Size 3', 'Size 5', 'Size 7', 'Size 9', 'Size 10'],
        colors: ['Steel Silver', 'Gold Plated', 'Nickel']
    },
    {
        id: 4,
        category: 'Needles',
        title: 'Professional Needle Kit 2',
        image: 'https://cdn.sparkfun.com/assets/parts/4/8/7/5/10405-04b.jpg',
        alt: 'needle',
        description: 'Advanced needle collection for specialized sewing projects.',
        usage: 'Designed for professional tailoring and advanced needlework',
        useFor: 'Heavy-duty sewing, upholstery, canvas work, industrial projects',
        varieties: ['Heavy-duty', 'Curved', 'Sailmaker', 'Upholstery', 'Leather'],
        sizes: ['Size 12', 'Size 14', 'Size 16', 'Size 18'],
        colors: ['Steel Silver', 'Black Coated']
    },
]);

// Get unique categories with their items count
const categories = computed(() => {
    const categoryMap = new Map();
    
    items.value.forEach(item => {
        if (categoryMap.has(item.category)) {
            categoryMap.get(item.category).count++;
        } else {
            categoryMap.set(item.category, {
                name: item.category,
                count: 1,
                image: item.image
            });
        }
    });
    
    return Array.from(categoryMap.values());
});

// Filter items by selected category
const filteredItems = computed(() => {
    if (!selectedCategory.value) return [];
    return items.value.filter(item => item.category === selectedCategory.value);
});

// Handle category selection
const selectCategory = (categoryName) => {
    selectedCategory.value = categoryName;
    currentView.value = 'items';
};

// Go back to categories view
const backToCategories = () => {
    currentView.value = 'categories';
    selectedCategory.value = null;
};

// Handle quick view popup
const handleQuickView = (item) => {
    selectedProduct.value = item;
    showPopup.value = true;
};

// Close popup
const closePopup = () => {
    showPopup.value = false;
    selectedProduct.value = null;
};
</script>

<template>
    <!-- Categories View -->
    <section v-if="currentView === 'categories'" class="stock-sec">
        <div class="section-header-wrapper">
            <div class="section-header">
                <h2 class="section-title">Product Categories</h2>
                <p class="section-subtitle">Browse by category</p>
            </div>
            <div class="search-bar">
                <ion-icon name="search-outline"></ion-icon>
                <input type="text" placeholder="Search categories...">
            </div>
        </div>
        
        <div class="category-list">
            <div 
                v-for="category in categories" 
                :key="category.name" 
                class="category-card"
                @click="selectCategory(category.name)"
            >
                <div class="category-image">
                    <img :src="category.image" :alt="category.name">
                    <div class="category-overlay">
                        <ion-icon name="arrow-forward-outline"></ion-icon>
                    </div>
                </div>
                <div class="category-content">
                    <h3 class="category-name">{{ category.name }}</h3>
                    <p class="category-count">{{ category.count }} {{ category.count === 1 ? 'product' : 'products' }}</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Items View (when category is selected) -->
    <section v-else class="stock-sec">
        <div class="section-header-wrapper">
            <div class="section-header">
                <button class="back-button" @click="backToCategories">
                    <ion-icon name="arrow-back-outline"></ion-icon>
                    Back to Categories
                </button>
                <h2 class="section-title">{{ selectedCategory }}</h2>
                <p class="section-subtitle">{{ filteredItems.length }} {{ filteredItems.length === 1 ? 'product' : 'products' }}</p>
            </div>
            <div class="search-bar">
                <ion-icon name="search-outline"></ion-icon>
                <input type="text" placeholder="Search products...">
            </div>
        </div>
        
        <div class="itemlist">
            <div v-for="item in filteredItems" :key="item.id" class="item">
                <div class="item-image">
                    <img :src="item.image" :alt="item.alt">
                    <div class="item-overlay">
                        <button class="quick-view" @click="handleQuickView(item)">
                            Quick View
                        </button>
                    </div>
                </div>
                <div class="item-content">
                    <span class="item-category">{{ item.category }}</span>
                    <h4 class="item-title">{{ item.title }}</h4>
                </div>
            </div>
        </div>
    </section>

    <!-- Product Details Popup -->
    <div v-if="showPopup" class="popup-overlay" @click="closePopup">
        <div class="popup-content" @click.stop>
            <button class="close-button" @click="closePopup">
                <ion-icon name="close-outline"></ion-icon>
            </button>
            
            <div class="popup-body" v-if="selectedProduct">
                <div class="popup-image">
                    <img :src="selectedProduct.image" :alt="selectedProduct.alt">
                </div>
                
                <div class="popup-details">
                    <span class="popup-category">{{ selectedProduct.category }}</span>
                    <h2 class="popup-title">{{ selectedProduct.title }}</h2>
                    <p class="popup-description">{{ selectedProduct.description }}</p>
                    
                    <div class="detail-section">
                        <h3 class="detail-heading">
                            <ion-icon name="hammer-outline"></ion-icon>
                            How It's Used
                        </h3>
                        <p class="detail-text">{{ selectedProduct.usage }}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h3 class="detail-heading">
                            <ion-icon name="checkmark-circle-outline"></ion-icon>
                            What It's For
                        </h3>
                        <p class="detail-text">{{ selectedProduct.useFor }}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h3 class="detail-heading">
                            <ion-icon name="grid-outline"></ion-icon>
                            Varieties
                        </h3>
                        <div class="tags-container">
                            <span v-for="variety in selectedProduct.varieties" :key="variety" class="tag">
                                {{ variety }}
                            </span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3 class="detail-heading">
                            <ion-icon name="resize-outline"></ion-icon>
                            Available Sizes
                        </h3>
                        <div class="tags-container">
                            <span v-for="size in selectedProduct.sizes" :key="size" class="tag size-tag">
                                {{ size }}
                            </span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3 class="detail-heading">
                            <ion-icon name="color-palette-outline"></ion-icon>
                            Available Colors
                        </h3>
                        <div class="tags-container">
                            <span v-for="color in selectedProduct.colors" :key="color" class="tag color-tag">
                                {{ color }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
/* ===== STOCK/ALL PRODUCTS SECTION ===== */
.stock-sec {
    padding: 60px 0;
    background: white;
}

.section-header-wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 5%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
}

.section-header-wrapper .section-header {
    text-align: left;
    margin: 0;
}

.back-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: 2px solid #8b6f47;
    color: #8b6f47;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-bottom: 15px;
    font-family: 'Inter', sans-serif;
}

.back-button:hover {
    background: #8b6f47;
    color: white;
}

.back-button ion-icon {
    font-size: 18px;
}

.search-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #f5f5f5;
    padding: 12px 20px;
    border-radius: 12px;
    border: 2px solid transparent;
    transition: all 0.3s ease;
}

.search-bar:focus-within {
    border-color: #b89968;
    background: white;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.search-bar ion-icon {
    font-size: 20px;
    color: #999;
}

.search-bar input {
    border: none;
    background: transparent;
    font-size: 15px;
    outline: none;
    width: 250px;
    font-family: 'Inter', sans-serif;
}

/* ===== CATEGORY LIST ===== */
.category-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 30px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 5%;
}

.category-card {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
}

.category-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.category-image {
    position: relative;
    overflow: hidden;
    height: 250px;
}

.category-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
}

.category-card:hover .category-image img {
    transform: scale(1.15);
}

.category-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(139, 111, 71, 0.9), rgba(184, 153, 104, 0.9));
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.category-card:hover .category-overlay {
    opacity: 1;
}

.category-overlay ion-icon {
    font-size: 48px;
    color: white;
    transform: translateX(-10px);
    transition: transform 0.3s ease;
}

.category-card:hover .category-overlay ion-icon {
    transform: translateX(0);
}

.category-content {
    padding: 25px;
    text-align: center;
}

.category-name {
    font-size: 24px;
    font-weight: 700;
    color: #2d2d2d;
    margin: 0 0 8px 0;
}

.category-count {
    font-size: 14px;
    color: #8b6f47;
    font-weight: 600;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* ===== ITEM LIST ===== */
.itemlist {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 30px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 5%;
}

.item {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
}

.item:hover {
    transform: translateY(-6px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.item-image {
    position: relative;
    overflow: hidden;
    height: 280px;
}

.item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
}

.item:hover .item-image img {
    transform: scale(1.1);
}

.item-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.item:hover .item-overlay {
    opacity: 1;
}

.quick-view {
    padding: 12px 28px;
    background: white;
    color: #2d2d2d;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transform: translateY(10px);
    transition: all 0.3s ease;
}

.item:hover .quick-view {
    transform: translateY(0);
}

.item-content {
    padding: 20px;
}

.item-category {
    display: inline-block;
    background: linear-gradient(135deg, #8b6f47, #b89968);
    color: white;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
}

.item-title {
    font-size: 18px;
    font-weight: 600;
    color: #2d2d2d;
    margin: 0;
}

/* ===== POPUP MODAL ===== */
.popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.popup-content {
    background: white;
    border-radius: 20px;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    animation: slideUp 0.3s ease;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

@keyframes slideUp {
    from {
        transform: translateY(30px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.close-button {
    position: absolute;
    top: 20px;
    right: 20px;
    background: white;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    z-index: 10;
}

.close-button:hover {
    background: #f5f5f5;
    transform: rotate(90deg);
}

.close-button ion-icon {
    font-size: 24px;
    color: #2d2d2d;
}

.popup-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
}

.popup-image {
    background: #f8f8f8;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    border-radius: 20px 0 0 20px;
}

.popup-image img {
    width: 100%;
    height: auto;
    max-height: 500px;
    object-fit: contain;
    border-radius: 12px;
}

.popup-details {
    padding: 40px;
    overflow-y: auto;
}

.popup-category {
    display: inline-block;
    background: linear-gradient(135deg, #8b6f47, #b89968);
    color: white;
    padding: 6px 16px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
}

.popup-title {
    font-size: 28px;
    font-weight: 700;
    color: #2d2d2d;
    margin: 0 0 16px 0;
    line-height: 1.2;
}

.popup-description {
    font-size: 16px;
    color: #666;
    line-height: 1.6;
    margin-bottom: 30px;
}

.detail-section {
    margin-bottom: 28px;
}

.detail-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 700;
    color: #2d2d2d;
    margin: 0 0 12px 0;
}

.detail-heading ion-icon {
    font-size: 20px;
    color: #8b6f47;
}

.detail-text {
    font-size: 15px;
    color: #555;
    line-height: 1.7;
    margin: 0;
    padding-left: 30px;
}

.tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-left: 30px;
}

.tag {
    background: #f5f5f5;
    color: #2d2d2d;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    border: 2px solid transparent;
}

.tag:hover {
    background: #8b6f47;
    color: white;
    transform: translateY(-2px);
}

.size-tag {
    background: #e3f2fd;
    color: #1976d2;
}

.size-tag:hover {
    background: #1976d2;
    color: white;
}

.color-tag {
    background: #fff3e0;
    color: #f57c00;
}

.color-tag:hover {
    background: #f57c00;
    color: white;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .section-header-wrapper {
        flex-direction: column;
        align-items: flex-start;
        gap: 20px;
    }
    
    .search-bar input {
        width: 200px;
    }
    
    .category-list,
    .itemlist {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    }
    
    .popup-body {
        grid-template-columns: 1fr;
    }
    
    .popup-image {
        border-radius: 20px 20px 0 0;
        padding: 30px;
    }
    
    .popup-details {
        padding: 30px;
    }
    
    .popup-title {
        font-size: 24px;
    }
}

/* Custom scrollbar for popup */
.popup-content::-webkit-scrollbar {
    width: 8px;
}

.popup-content::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
}

.popup-content::-webkit-scrollbar-thumb {
    background: #8b6f47;
    border-radius: 10px;
}

.popup-content::-webkit-scrollbar-thumb:hover {
    background: #6d5838;
}
</style>