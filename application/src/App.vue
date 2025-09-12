<template>
  <div id="app">
    <header class="game-header">
      <h1 class="game-title">丸亀カルタ</h1>
      <div class="score-display" v-if="isGameActive">Score: {{ Math.round(score) }}</div>
      <div class="player-info">
        <span class="player-name">👤 {{ playerName }}</span>
        <button @click="showNicknameModal = true" class="edit-button">編集</button>
      </div>
    </header>

    <main class="game-main">
      <template v-if="!isGameActive">
        <div class="top-screen">
          <h2>ようこそ、丸亀カルタへ！</h2>
          <button @click="startGame" class="action-button primary shadow-md">ゲームスタート</button>
          <button @click="showRankingModal = true" class="action-button shadow-md">ランキングを見る</button>
          <button @click="showSettingsModal = true" class="action-button shadow-md">設定</button>
        </div>
      </template>

      <template v-else-if="!gameEnded">
        <div class="current-reading shadow-md rounded-lg" v-if="currentCard">
          <p>{{ currentCard.text }}</p>
        </div>

        <div class="card-grid">
          <Card
            v-for="card in cards"
            :key="card.id"
            :card="card"
            :is-correct="card.id === correctCardId && card.isTaken"
            :is-mistake="card.id !== correctCardId && card.isTaken"
            @card-clicked="handleCardClick"
          />
        </div>

        <div class="audio-controls">
          <button @click="playAudio" :disabled="isAudioPlaying || !currentCard" class="action-button primary">▶</button>
          <button @click="stopAudio" :disabled="!isAudioPlaying" class="action-button">❚❚</button>
          <audio ref="audioPlayer" @ended="onAudioEnded" @play="onAudioPlay" @pause="onAudioPause"></audio>
        </div>
      </template>

      <template v-else>
        <div class="game-result">
          <h2>ゲーム終了！</h2>
          <p>最終スコア: <span class="result-score">{{ Math.round(score) }}</span></p>
          <p>平均反応時間: {{ averageReactionTime.toFixed(0) }} ms</p>
          <p>正解数: {{ totalCorrect }}</p>
          <p>お手つき数: {{ totalMistake }}</p>
          <p v-if="isBestScore" class="best-score-message">✨ 自己ベスト更新！</p>

          <div class="taken-cards-display">
            <h3>取った札</h3>
            <div class="taken-cards-grid">
              <div v-for="cardId in takenCardIds" :key="cardId" class="taken-card-item">
                <p>{{ allCardsData.find(c => c.id === cardId)?.text }}</p>
              </div>
            </div>
          </div>

          <div class="result-actions">
            <button @click="restartGame" class="action-button primary shadow-md">もう一度プレイ</button>
            <button @click="showRankingModal = true" class="action-button shadow-md">ランキングを見る</button>
            <button @click="goHome" class="action-button shadow-md">トップへ戻る</button>
          </div>
        </div>
      </template>
    </main>

    <footer class="game-footer">
      <button @click="showRankingModal = true" class="ranking-button shadow-md">🏆 ランキング</button>
    </footer>

    <!-- Nickname Modal -->
    <div v-if="showNicknameModal" class="modal-overlay" @click.self="showNicknameModal = false">
      <div class="modal-content shadow-md rounded-lg">
        <h2>ニックネーム設定</h2>
        <input v-model="newPlayerName" placeholder="あなたのニックネーム" />
        <button @click="saveNickname" class="action-button primary">保存</button>
        <button @click="showNicknameModal = false" class="action-button">キャンセル</button>
      </div>
    </div>

    <!-- Settings Modal (Placeholder) -->
    <div v-if="showSettingsModal" class="modal-overlay" @click.self="showSettingsModal = false">
      <div class="modal-content shadow-md rounded-lg">
        <h2>設定</h2>
        <p>ここにゲーム設定項目が入ります。</p>
        <button @click="showSettingsModal = false" class="action-button primary">閉じる</button>
      </div>
    
    </div>

    <RankingModal :show="showRankingModal" @update:show="showRankingModal = $event" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import Card from './components/Card.vue';
import RankingModal from './components/RankingModal.vue';
import { useScore } from './composables/useScore';
import { getCookie, setCookie } from './composables/useCookie';
import { GAME_CONFIG } from './config/gameConfig';

// --- State --- 
const cards = ref([]); // 現在表示されている札データ（ゲーム中に減っていく）
const allCardsData = ref([]); // 全ての札データ（リザルト表示用）
const currentCard = ref(null); 
const correctCardId = ref(null); 
const isAudioPlaying = ref(false);
const audioPlayer = ref(null);
const reactionStartTime = ref(0);
const gameStarted = ref(false);
const gameEnded = ref(false); 
const isGameActive = ref(false); 
const nextCardTimeout = ref(null);
const isBestScore = ref(false); 

const showRankingModal = ref(false);
const showNicknameModal = ref(false);
const showSettingsModal = ref(false); 
const playerName = ref('名無し');
const newPlayerName = ref('');

const { score, combo, totalCorrect, totalMistake, reactionTimes, takenCardIds, resetScore, addCorrect, addMistake } = useScore();

// --- Computed --- 
const averageReactionTime = computed(() => {
  if (reactionTimes.value.length === 0) return 0;
  const sum = reactionTimes.value.reduce((acc, time) => acc + time, 0);
  return sum / reactionTimes.value.length;
});

// --- Methods --- 
const loadCards = async () => {
  const initialCards = [
    { id: '1', text: '秋の田の かりほの庵の 苫をあらみ わが衣手は 露にぬれつつ', audio: '/audio/audio1.mp3' },
    { id: '2', text: '春過ぎて 夏来にけらし 白妙の 衣ほすてふ 天の香具山', audio: '/audio/audio2.mp3' },
    { id: '3', text: 'あしびきの 山鳥の尾の しだり尾の ながながし夜を ひとりかも寝む', audio: '/audio/audio3.mp3' },
    { id: '4', text: '田子の浦に うち出でてみれば 白妙の 富士の高嶺に 雪は降りつつ', audio: '/audio/audio4.mp3' },
    { id: '5', text: '奥山に 紅葉踏み分け 鳴く鹿の 声聞く時ぞ 秋は悲しき', audio: '/audio/audio5.mp3' },
    { id: '6', text: 'かささぎの 渡せる橋に おく霜の 白きを見れば 夜ぞ更けにける', audio: '/audio/audio6.mp3' },
    { id: '7', text: '天の原 ふりさけ見れば 春日なる 三笠の山に 出でし月かも', audio: '/audio/audio7.mp3' },
    { id: '8', text: 'わが庵は 都のたつみ しかぞ住む 世をうぢ山と 人はいふなり', audio: '/audio/audio8.mp3' },
    { id: '9', text: '花の色は 移りにけりな いたづらに わが身世にふる ながめせしまに', audio: '/audio/audio9.mp3' },
    { id: '10', text: 'これやこの 行くも帰るも 別れては 知るも知らぬも 逢坂の関', audio: '/audio/audio10.mp3' },
  ];
  allCardsData.value = initialCards; 
  cards.value = initialCards.map(card => ({ ...card, isTaken: false })); 
  shuffleCards();
};

const shuffleCards = () => {
  const availableCards = cards.value.filter(card => !card.isTaken);
  if (availableCards.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableCards.length);
    currentCard.value = availableCards[randomIndex];
    correctCardId.value = currentCard.value.id;
  } else {
    currentCard.value = null;
    correctCardId.value = null;
    endGame();
  }
};

const playAudio = () => {
  if (currentCard.value && audioPlayer.value) {
    audioPlayer.value.src = currentCard.value.audio;
    audioPlayer.value.play();
  }
};

const stopAudio = () => {
  if (audioPlayer.value) {
    audioPlayer.value.pause();
    audioPlayer.value.currentTime = 0;
  }
};

const onAudioPlay = () => {
  isAudioPlaying.value = true;
  reactionStartTime.value = performance.now();
  if (nextCardTimeout.value) {
    clearTimeout(nextCardTimeout.value);
    nextCardTimeout.value = null;
  }
};

const onAudioPause = () => {
  isAudioPlaying.value = false;
};

const onAudioEnded = () => {
  isAudioPlaying.value = false;
  nextCardTimeout.value = setTimeout(() => {
    moveToNextCard();
  }, GAME_CONFIG.NEXT_DELAY_MS);
};

const handleCardClick = (cardId) => {
  if (!gameStarted.value || !currentCard.value) return;

  const elapsed = performance.now() - reactionStartTime.value;
  const clickedCard = cards.value.find(card => card.id === cardId);

  if (cardId === correctCardId.value) {
    const addedScore = addCorrect(elapsed, cardId); 
    clickedCard.isTaken = true;
    stopAudio();
    moveToNextCard();
  } else {
    const deductedScore = addMistake(elapsed);
    clickedCard.isMistake = true;
    setTimeout(() => {
      clickedCard.isMistake = false;
      clickedCard.isTaken = true;
      moveToNextCard();
    }, GAME_CONFIG.ANIMATION_DURATION_MS);
    stopAudio();
  }
};

const moveToNextCard = () => {
  if (nextCardTimeout.value) {
    clearTimeout(nextCardTimeout.value);
    nextCardTimeout.value = null;
  }
  shuffleCards();
};

const startGame = () => {
  isGameActive.value = true;
  gameEnded.value = false;
  resetScore();
  loadCards();
  gameStarted.value = true;
};

const endGame = () => {
  gameStarted.value = false;
  gameEnded.value = true; 

  const best = parseFloat(getCookie('bestScore')) || 0;
  if (score.value > best) {
    setCookie('bestScore', score.value);
    isBestScore.value = true; 
  } else {
    isBestScore.value = false;
  }

  let unsentScores = JSON.parse(getCookie('unsentScores') || '[]');
  unsentScores.push({ nickname: playerName.value, score: score.value, date: new Date().toISOString() });
  setCookie('unsentScores', JSON.stringify(unsentScores));

  submitScoresToRanking();
};

const restartGame = () => {
  gameEnded.value = false;
  resetScore();
  loadCards(); 
  gameStarted.value = true;
};

const goHome = () => {
  isGameActive.value = false;
  gameEnded.value = false;
  gameStarted.value = false;
  stopAudio();
  resetScore();
  cards.value = []; 
  allCardsData.value = []; 
};

const submitScoresToRanking = async () => {
  let unsentScores = JSON.parse(getCookie('unsentScores') || '[]');
  if (unsentScores.length === 0) return;

  for (const entry of unsentScores) {
    try {
      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: entry.nickname, score: entry.score, timestamp: entry.date }),
      });
      if (!response.ok) {
        throw new Error(`Failed to submit score: ${response.status}`);
      }
      console.log('Score submitted successfully:', entry);
    } catch (error) {
      console.error('Error submitting score:', error);
      return; 
    }
  }
  setCookie('unsentScores', '[]');
};

const saveNickname = () => {
  playerName.value = newPlayerName.value;
  setCookie('playerName', playerName.value);
  showNicknameModal.value = false;
};

// --- Lifecycle Hooks --- 
onMounted(() => {
  const savedPlayerName = getCookie('playerName');
  if (savedPlayerName) {
    playerName.value = savedPlayerName;
  } else {
    showNicknameModal.value = true;
  }
  newPlayerName.value = playerName.value;

  submitScoresToRanking();
});
</script>

<style>
/* Global Styles */
#app {
  font-family: 'Noto Sans JP', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-background);
}

.game-header {
  background-color: var(--color-primary);
  color: var(--color-white);
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.game-title {
  margin: 0;
  font-size: 1.8em;
  font-weight: 700;
}

.score-display {
  font-size: 1.5em;
  font-weight: bold;
}

.player-info {
  display: flex;
  align-items: center;
}

.player-name {
  margin-right: 10px;
  font-size: 1.1em;
}

.edit-button {
  background-color: var(--color-white);
  color: var(--color-primary);
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s ease;
}

.edit-button:hover {
  background-color: #f0f0f0;
}

.game-main {
  flex-grow: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* 中央寄せ */
}

.current-reading {
  background-color: var(--color-white);
  padding: 15px 25px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 1.2em;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  writing-mode: vertical-rl; /* 縦書き */
  text-orientation: upright; /* 文字の向き */
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  max-width: 900px; 
  width: 100%;
  margin-top: 20px;
  padding-bottom: 20px; 
}

.audio-controls {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

.audio-controls button {
  background-color: var(--color-primary);
  color: var(--color-white);
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 1.1em;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.audio-controls button:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.audio-controls button:disabled {
  background-color: var(--color-text-light);
  cursor: not-allowed;
}

.game-footer {
  padding: 15px 20px;
  background-color: var(--color-primary-dark);
  color: var(--color-white);
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
}

.ranking-button {
  background-color: var(--color-accent);
  color: var(--color-text);
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 1.1em;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.ranking-button:hover {
  background-color: #FFB300;
}

/* Modal Styles */
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
}

.modal-content {
  background: var(--color-white);
  padding: 30px;
  border-radius: 10px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.modal-content h2 {
  color: var(--color-primary-dark);
  margin-bottom: 20px;
}

.modal-content input {
  width: calc(100% - 20px);
  padding: 10px;
  margin: 15px 0;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.modal-content button {
  background-color: var(--color-primary);
  color: var(--color-white);
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  margin: 0 5px;
  transition: background-color 0.3s ease;
}

.modal-content button:hover {
  background-color: var(--color-primary-dark);
}

/* Top Screen Styles */
.top-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
}

.top-screen h2 {
  color: var(--color-primary-dark);
  font-size: 2.5em;
  margin-bottom: 40px;
}

.top-screen .action-button {
  margin: 10px 0;
  width: 250px;
  font-size: 1.2em;
  padding: 15px 0;
}

/* Game Result Styles */
.game-result {
  background-color: var(--color-white);
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.game-result h2 {
  color: var(--color-primary-dark);
  margin-bottom: 20px;
}

.game-result p {
  font-size: 1.2em;
  margin-bottom: 10px;
}

.result-score {
  font-size: 1.8em;
  font-weight: bold;
  color: var(--color-accent);
}

.best-score-message {
  color: var(--color-accent);
  font-weight: bold;
  font-size: 1.3em;
  margin-top: 15px;
}

.taken-cards-display {
  margin-top: 30px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.taken-cards-display h3 {
  color: var(--color-primary-dark);
  margin-bottom: 15px;
}

.taken-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
  justify-content: center;
}

.taken-card-item {
  background-color: var(--color-background);
  border: 1px solid var(--color-primary-dark);
  border-radius: 5px;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Zen Old Mincho', 'Shippori Mincho', serif; /* フォント変更 */
  font-weight: 700; /* 太字 */
  font-size: 0.8em;
  line-height: 1.2;
  white-space: normal;
  word-break: normal;
  writing-mode: vertical-rl; /* 縦書き */
  text-orientation: upright; /* 文字の向き */
}

.result-actions {
  margin-top: 30px;
}

.action-button {
  background-color: var(--color-primary);
  color: var(--color-white);
  border: none;
  padding: 12px 25px;
  border-radius: 5px;
  font-size: 1.1em;
  cursor: pointer;
  margin: 0 10px;
  transition: background-color 0.3s ease;
}

.action-button.primary {
  background-color: var(--color-info);
}

.action-button:hover {
  opacity: 0.9;
}
</style>