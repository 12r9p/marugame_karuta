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
  console.log('Fetching ranking data...');
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch('/api/ranking');
    if (!response.ok) {
      console.error(`API call failed with status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Ranking data fetched successfully:', data);
    ranking.value = data.results;
  } catch (e) {
    console.error('Error fetching ranking:', e.message);
    error.value = e.message;
  } finally {
    loading.value = false;
    console.log('Finished fetching ranking data.');
  }
};

const closeModal = () => {
  console.log('Closing ranking modal.');
  emit('update:show', false);
};

const formatDate = (isoString) => {
  if (!isoString) {
    console.warn('formatDate received null or undefined isoString');
    return 'N/A';
  }
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    console.error('Invalid Date received for formatting:', isoString);
    return 'Invalid Date';
  }
  return date.toLocaleString();
};

watch(() => props.show, (newVal) => {
  console.log('props.show changed:', newVal);
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
  padding: 40px;
  border-radius: 15px;
  width: 90%;
  max-width: 700px;
  position: relative;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.modal-content h2 {
  color: var(--color-primary);
  margin-bottom: 30px;
  font-size: 2.8em;
  font-weight: 700;
  letter-spacing: 1px;
}

.close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 32px;
  cursor: pointer;
  color: var(--color-text);
  transition: color 0.3s ease, transform 0.3s ease;
}

.close-button:hover {
  color: var(--color-primary);
  transform: rotate(90deg);
}

.loading-message,
.error-message {
  padding: 20px;
  font-size: 1.2em;
  color: var(--color-text);
}

.error-message {
  color: #F44336;
}

.ranking-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: 30px;
  border-radius: 10px;
  overflow: hidden;
}

.ranking-table th,
.ranking-table td {
  border: none;
  padding: 15px 10px;
  text-align: left;
  color: var(--color-text);
}

.ranking-table th {
  background-color: var(--color-white);
  color: var(--color-primary);
  font-weight: 700;
  font-size: 1.1em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ranking-table tbody tr {
  background-color: var(--color-white);
  transition: background-color 0.3s ease;
}

.ranking-table tbody tr:nth-child(odd) {
  background-color: #f7f7f7;
}

.ranking-table tbody tr:hover {
  background-color: #efefef;
  cursor: pointer;
  color: var(--color-primary);
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-80px) scale(0.9); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
</style>