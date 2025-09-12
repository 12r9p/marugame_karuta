<template>
  <div v-if="show" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content shadow-md rounded-lg">
      <h2>ランキング</h2>
      <button class="close-button" @click="closeModal">×</button>
      <div v-if="loading" class="loading-message">読み込み中...</div>
      <div v-else-if="error" class="error-message">ランキングの読み込みに失敗しました: {{ error }}</div>
      <table v-else class="ranking-table">
        <thead>
          <tr>
            <th>順位</th>
            <th>ニックネーム</th>
            <th>スコア</th>
            <th>日時</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(entry, index) in ranking" :key="index">
            <td>{{ index + 1 }}</td>
            <td>{{ entry.player }}</td>
            <td>{{ Math.round(entry.score) }}</td>
            <td>{{ formatDate(entry.date) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  show: Boolean,
});

const emit = defineEmits(['update:show']);

const ranking = ref([]);
const loading = ref(false);
const error = ref(null);

const fetchRanking = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch('/api/ranking');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    ranking.value = data.results;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

const closeModal = () => {
  emit('update:show', false);
};

const formatDate = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString();
};

watch(() => props.show, (newVal) => {
  if (newVal) {
    fetchRanking();
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

.modal-content {
  background: var(--color-white);
  padding: 30px;
  border-radius: 10px;
  width: 90%;
  max-width: 600px;
  position: relative;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease-out;
}

.modal-content h2 {
  color: var(--color-primary-dark);
  margin-bottom: 20px;
  font-size: 2em;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: var(--color-text-light);
  transition: color 0.3s ease;
}

.close-button:hover {
  color: var(--color-text);
}

.loading-message,
.error-message {
  padding: 20px;
  font-size: 1.1em;
  color: var(--color-text-light);
}

.error-message {
  color: var(--color-error);
}

.ranking-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.ranking-table th,
.ranking-table td {
  border: 1px solid #eee;
  padding: 12px 8px;
  text-align: left;
}

.ranking-table th {
  background-color: var(--color-background);
  color: var(--color-primary-dark);
  font-weight: 700;
}

.ranking-table tbody tr:nth-child(odd) {
  background-color: #f9f9f9;
}

.ranking-table tbody tr:hover {
  background-color: #f0f0f0;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>