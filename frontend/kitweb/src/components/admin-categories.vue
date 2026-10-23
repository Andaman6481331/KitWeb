<script setup>
// The category manager (add a category, list them). Moved out of the old
// AdminDashboard's "Edit Categories" toggle into a page of its own; behaviour and
// Worker routes (POST /categories, DELETE /categories/:id) are unchanged.
import { ref, onMounted } from 'vue';
import { api } from '../services/api';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const emit = defineEmits(['session-expired']);
const handleAuthError = (error) => {
  if (error?.status !== 401) return false;
  emit('session-expired');
  return true;
};

const categories = ref([]);
const newCat = ref({ name: '', name_th: '', path: '', default_usage: '', default_use_for: '' });

const loadCategories = async () => {
  try {
    categories.value = await api.getCategories();
  } catch (error) {
    if (handleAuthError(error)) return;
    console.error('Failed to load categories', error);
  }
};

const handleAddCategory = async () => {
  if (!newCat.value.name || !newCat.value.path) return;
  try {
    await api.addCategory(newCat.value);
    newCat.value = { name: '', name_th: '', path: '', default_usage: '', default_use_for: '' };
    loadCategories();
  } catch (error) {
    if (handleAuthError(error)) return;
    alert(t('admin.errorDeleteCategory'));
  }
};

const deleteCategory = async (id) => {
  if (confirm(t('admin.confirmDeleteCategory'))) {
    try {
      await api.deleteCategory(id);
      loadCategories();
    } catch (error) {
      if (handleAuthError(error)) return;
      alert(t('admin.errorDeleteCategory'));
    }
  }
};

onMounted(loadCategories);
</script>

<template>
  <section class="category-manager">
          <div class="cat-manager-content">
            <h3>{{ $t('admin.manageCategories') }}</h3>
            <div class="cat-add-row">
              <input v-model="newCat.name" :placeholder="$t('admin.categoryName')" />
              <input v-model="newCat.name_th" :placeholder="$t('admin.categoryNameTh')" />
              <input v-model="newCat.path" :placeholder="$t('admin.path')" />
            </div>
            <div class="cat-add-row">
              <input v-model="newCat.default_usage" :placeholder="$t('admin.defaultUsage')" />
              <input v-model="newCat.default_use_for" :placeholder="$t('admin.defaultUseFor')" />
              <button @click="handleAddCategory">{{ $t('admin.add') }}</button>
            </div>
            <div class="cat-list">
              <div v-for="cat in categories" :key="cat.id" class="cat-tag">
                <div class="cat-tag-info">
                  <strong>{{ cat.name }}</strong>
                  <span v-if="cat.name_th"> ({{ cat.name_th }})</span>
                  <span class="cat-path">({{ cat.path }})</span>
                  <div class="cat-defaults" v-if="cat.default_usage || cat.default_use_for">
                    <span v-if="cat.default_usage">U: {{ cat.default_usage }}</span>
                    <span v-if="cat.default_use_for">F: {{ cat.default_use_for }}</span>
                  </div>
                </div>
                <button @click="deleteCategory(cat.id)">&times;</button>
              </div>
            </div>
          </div>
  </section>
</template>

<style scoped src="../assets/admin-legacy.css"></style>
