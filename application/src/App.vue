<template>
  <div id="app">
    <div class="transition-overlay" :class="{ 'is-active': isTransitioningToNextRound }"></div>
    <div class="mistake-feedback-overlay" :class="{ 'is-active': showMistakeFeedback }"></div>
    <header class="game-header">
      <img :src="currentLogoSrc" alt="丸亀カルタロゴ" class="game-logo">
      <div class="score-display" v-if="isGameActive">Score: {{ Math.round(score) }}</div>
      <transition name="fade-up">
        <div v-if="showFloatingScore" class="floating-score">+{{ floatingScore }}</div>
      </transition>
      <div class="player-info">
        <span class="player-name">👤 {{ playerName }}</span>
        <button @click="showNicknameModal = true" class="edit-button">編集</button>
      </div>
      <button v-if="isGameActive && !gameEnded" @click="goHome" class="header-action-button">トップへ戻る</button>
    </header>

    <main class="game-main">
      <template v-if="!isGameActive">
        <div class="top-screen">
          <h2>ようこそ、丸亀カルタへ！</h2>
          <button @click="startGame" class="action-button primary shadow-md">ゲームスタート</button>
          <button @click="showRankingModal = true" class="action-button shadow-md">ランキングを見る</button>
          <button @click="showSettingsModal = true" class="action-button shadow-md">設定</button>

          <!-- Unsent Scores Display -->
          <div v-if="unsentScoresList.length > 0" class="unsent-scores-section shadow-md rounded-lg">
            <h3>未送信スコア ({{ unsentScoresList.length }})</h3>
            <ul>
              <li v-for="(scoreEntry, index) in unsentScoresList" :key="index">
                {{ scoreEntry.nickname }}: {{ Math.round(scoreEntry.score) }} ({{ new Date(scoreEntry.date).toLocaleString() }})
              </li>
            </ul>
            <button @click="submitScoresToRanking" class="action-button primary">未送信スコアを送信</button>
            <button @click="clearUnsentScores" class="action-button danger">未送信スコアを全て削除</button>
          </div>
        </div>
      </template>

      <template v-else-if="!gameEnded">
        <div class="current-reading shadow-md rounded-lg" v-if="currentCard">
          <p>{{ currentSubtitle }}</p>
        </div>

        <div class="card-grid">
          <Card
            v-for="card in cards"
            :key="card.id"
            :card="card"
            :anim-state="card.animState"
            @card-clicked="handleCardClick"
          />
        </div>

        <div class="audio-controls" v-if="isAudioEnabled">
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

          <div class="result-actions">
            <button @click="restartGame" class="action-button primary shadow-md">もう一度プレイ</button>
            <button @click="showRankingModal = true" class="action-button shadow-md">ランキングを見る</button>
            <button @click="goHome" class="action-button shadow-md">トップへ戻る</button>
          </div>
        </div>
      </template>
    </main>

    <!-- Nickname Modal -->
    <div v-if="showNicknameModal" class="modal-overlay" @click.self="showNicknameModal = false">
      <div class="modal-content shadow-md rounded-lg">
        <h2>ニックネーム設定</h2>
        <input v-model="newPlayerName" placeholder="あなたのニックネーム" />
        <button @click="saveNickname" class="action-button primary">保存</button>
        <button @click="showNicknameModal = false" class="action-button">キャンセル</button>
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettingsModal" class="modal-overlay" @click.self="saveSettingsAndCloseModal">
      <div class="modal-content shadow-md rounded-lg">
        <h2>設定</h2>
        <div class="setting-item">
          <label for="debugModeToggle">デバッグモード</label>
          <input type="checkbox" id="debugModeToggle" v-model="isDebugMode" />
        </div>
        <div class="setting-item">
          <label for="skipOnMistakeToggle">不正解時に次へスキップ</label>
          <input type="checkbox" id="skipOnMistakeToggle" v-model="skipOnMistake" />
        </div>
        <div class="setting-item">
          <label for="audioEnabledToggle">音声の有効/無効</label>
          <input type="checkbox" id="audioEnabledToggle" v-model="isAudioEnabled" />
        </div>
        <div class="setting-item">
          <label for="audioVolumeSlider">音量: {{ Math.round(audioVolume * 100) }}%</label>
          <input type="range" id="audioVolumeSlider" min="0" max="1" step="0.01" v-model="audioVolume" />
        </div>
        <div class="setting-item">
          <label for="saveNicknameToggle">ニックネームを保存する</label>
          <input type="checkbox" id="saveNicknameToggle" v-model="saveNicknameSetting" />
        </div>
        <button @click="saveSettingsAndCloseModal" class="action-button primary">閉じる</button>
      </div>
    </div>

    <RankingModal :show="showRankingModal" @update:show="showRankingModal = $event" />

    <!-- Notification Overlay -->
    <transition name="fade">
      <div v-if="showNotification" class="notification-overlay">
        <p>{{ notificationMessage }}</p>
      </div>
    </transition>

    <!-- Debug Info Overlay -->
    <div v-if="isDebugMode" class="debug-overlay">
      <h3>Debug Info</h3>
      <p>Subtitle Time: {{ (GAME_CONFIG.ENABLE_AUDIO ? currentSubtitleTime : simulatedTime).toFixed(2) }}s</p>
      <p>Score: {{ Math.round(score) }}</p>
      <p>Combo: {{ combo }}</p>
      <p>Reaction Time: {{ currentReactionTime.toFixed(0) }}ms</p>
      <p>Current Card ID: {{ currentCard ? currentCard.id : 'N/A' }}</p>
      <p>Correct Card ID: {{ correctCardId ? correctCardId : 'N/A' }}</p>
      <p>Audio Playing: {{ isAudioPlaying }}</p>
      <p>Transitioning: {{ isTransitioningToNextRound }}</p>
      <p>Total Correct: {{ totalCorrect }}</p>
      <p>Total Mistake: {{ totalMistake }}</p>
      <p>Reaction Times Recorded: {{ reactionTimes.length }}</p>
      <h4>Score Formula:</h4>
      <p>Base Score = max(0, K / (elapsedMs^2))</p>
      <p>Combo Bonus = 1 + Combo * COMBO_BONUS_STEP</p>
      <p>Final Score = Base Score * Combo Bonus</p>
      <p>K: {{ GAME_CONFIG.K }}</p>
      <p>COMBO_BONUS_STEP: {{ GAME_CONFIG.COMBO_BONUS_STEP }}</p>
      <p>PENALTY: {{ GAME_CONFIG.PENALTY }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import Card from './components/Card.vue';
import RankingModal from './components/RankingModal.vue';
import { useScore } from './composables/useScore';
import { getCookie, setCookie } from './composables/useCookie';
import { GAME_CONFIG } from './config/gameConfig';
import { karutaData } from './data/karutaData.js'; // karutaDataをインポート
import { useSubtitle } from './composables/useSubtitle.js'; // useSubtitle をインポート

// --- State --- 
const cards = ref([]); // 現在表示されている札データ（ゲーム中に減っていく）
const allCardsData = ref([]); // 全ての札データ（リザルト表示用）
const currentCard = ref(null); 
const correctCardId = ref(null); 
const isAudioPlaying = ref(false);
const audioPlayer = ref(null);
const reactionStartTime = ref(0);
const currentReactionTime = ref(0); // リアルタイム反応時間
const reactionTimeAnimationId = ref(null); // requestAnimationFrame ID
const gameStarted = ref(false);
const gameEnded = ref(false); 
const isGameActive = ref(false); 
const nextCardTimeout = ref(null);
const isBestScore = ref(false); 
const isTransitioningToNextRound = ref(false);
const showMistakeFeedback = ref(false); 
const floatingScore = ref(0);
const showFloatingScore = ref(false); 

const showNotification = ref(false);
const notificationMessage = ref('');
let notificationTimeoutId = null;

const unsentScoresList = ref([]); // 未送信スコアを保持するリスト

const showRankingModal = ref(false);
const showNicknameModal = ref(false);
const showSettingsModal = ref(false); 
const playerName = ref('名無し');
const newPlayerName = ref('');
const isDebugMode = ref(false);
const skipOnMistake = ref(false); // 新しい設定: 不正解時に次へスキップ
const audioVolume = ref(1.0); // 音量 (0.0 - 1.0)
const isAudioEnabled = ref(true); // 音声の有効/無効
const saveNicknameSetting = ref(true); // 新しい設定: ニックネームを保存するかどうか

const currentLogoSrc = computed(() => {
  // ヘッダーの背景色を取得
  const headerBgColor = getComputedStyle(document.documentElement).getPropertyValue('--color-header-footer').trim();
  console.log('Header background color:', headerBgColor); // ログを追加
  // 背景色が白系（例: #ffffff, #f9f9f9 など）であれば黒ロゴ、そうでなければ白ロゴ
  // ここでは簡易的に、背景色が明るい色かどうかで判断
  const isLightBackground = headerBgColor === '#ffffff' || headerBgColor === '#f9f9f9' || headerBgColor === 'var(--color-white)' || headerBgColor === '#F0EAD6'; // 例

  if (isLightBackground) {
    return '/丸亀カルタロゴ黒.png';
  } else {
    return '/丸亀カルタロゴ.png';
  }
});

const { score, combo, totalCorrect, totalMistake, reactionTimes, takenCardIds, resetScore, addCorrect, addMistake } = useScore();

// useSubtitle の初期化
const currentCardFullText = computed(() => {
  if (!currentCard.value) return '';
  const karuta = karutaData.find(item => item.id === currentCard.value.id);
  return karuta ? karuta.full : ''; // ここで全文を渡す
});

const { currentSubtitle, updateSubtitle, currentSubtitleTime, simulatedTime } = useSubtitle(audioPlayer, currentCardFullText);

// --- Computed --- 
const averageReactionTime = computed(() => {
  if (reactionTimes.value.length === 0) return 0;
  const sum = reactionTimes.value.reduce((acc, time) => acc + time, 0);
  return sum / reactionTimes.value.length;
});

// currentReadingText は不要になるので削除または変更
// const currentReadingText = computed(() => {
//   if (!currentCard.value) return '';
//   const karuta = karutaData.find(item => item.id === currentCard.value.id);
//   return karuta ? karuta.full : '';
// });

// --- Methods --- 
const loadCards = async () => {
  // karutaData.js からデータを読み込む
  const initialCards = karutaData.map(item => ({
    id: item.id,
    audio: isAudioEnabled.value ? `/audio/audio${parseInt(item.id, 10)}.mp3` : null, // IDからオーディオパスを生成 (音声無効時はnull)
  }));

  allCardsData.value = initialCards; 
  cards.value = initialCards.map(card => ({ 
    ...card, 
    isTaken: false,
    animState: 'default', // default | correct_flying | mistake_flying | returning
  })); 
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
  if (!isAudioEnabled.value) { // Use new setting
    return;
  }
  if (currentCard.value && audioPlayer.value) {
    audioPlayer.value.src = currentCard.value.audio;
    audioPlayer.value.volume = audioVolume.value; // Set volume

    // 音声がロードされるまで待機
    audioPlayer.value.oncanplaythrough = () => {
      audioPlayer.value.play();
      audioPlayer.value.oncanplaythrough = null; // イベントリスナーを一度だけ実行
    };
    audioPlayer.value.load(); // ロードを開始
  }
};

const stopAudio = () => {
  if (!isAudioEnabled.value) return; // Use new setting
  if (audioPlayer.value) {
    audioPlayer.value.pause();
    audioPlayer.value.currentTime = 0;
  }
};

const onAudioPlay = () => {
  isAudioPlaying.value = true;
  reactionStartTime.value = performance.now();
  startReactionTimeTracking(); // トラッキング開始
  if (nextCardTimeout.value) {
    clearTimeout(nextCardTimeout.value);
    nextCardTimeout.value = null;
  }
  updateSubtitle(0); // ここを修正: 0を渡す
  console.log('onAudioPlay: updateSubtitle(0) called.');
  console.log('onAudioPlay: audioPlayer.value.src', audioPlayer.value.src);
  console.log('onAudioPlay: audioPlayer.value.readyState', audioPlayer.value.readyState);
};

const onAudioPause = () => {
  isAudioPlaying.value = false;
  stopReactionTimeTracking(); // トラッキング停止
};

const onAudioEnded = () => {
  isAudioPlaying.value = false;
  stopReactionTimeTracking(); // トラッキング停止
  nextCardTimeout.value = setTimeout(() => {
    moveToNextCard();
  }, GAME_CONFIG.NEXT_DELAY_MS);
};

const handleCardClick = (cardId) => {
  // Ignore all clicks if transitioning between rounds
  if (isTransitioningToNextRound.value) {
    return;
  }

  const clickedCard = cards.value.find(c => c.id === cardId);
  if (!clickedCard || clickedCard.isTaken || clickedCard.animState !== 'default') {
    return;
  }

  const elapsed = performance.now() - reactionStartTime.value;

  if (cardId === correctCardId.value) {
    // --- CORRECT ---
    stopReactionTimeTracking(); // トラッキング停止
    isTransitioningToNextRound.value = true; // Lock the board
    const finalScore = addCorrect(elapsed, cardId);
    console.log('returnedScore from addCorrect:', finalScore); // ログ出力
    floatingScore.value = Math.round(finalScore);
    console.log('floatingScore.value after Math.round:', floatingScore.value); // ログ出力
    showFloatingScore.value = true;
    setTimeout(() => {
      showFloatingScore.value = false;
    }, GAME_CONFIG.FLOATING_SCORE_DURATION);
    clickedCard.animState = 'correct_flying';
    clickedCard.isTaken = true;

    // Tell incorrect cards to return
    cards.value.forEach(c => {
      if (c.animState === 'mistake_flying') {
        c.animState = 'returning';
      }
    });

    if (GAME_CONFIG.ENABLE_AUDIO) {
      stopAudio();
    }
    // Wait for all animations (fly away + return) to safely finish
    const safeDelay = GAME_CONFIG.ANIMATION_DURATION_MS + 1000; 
    setTimeout(() => {
      moveToNextCard();
    }, safeDelay);

  } else {
    // --- INCORRECT ---
    addMistake(elapsed);
    clickedCard.animState = 'mistake_flying';

    // Trigger visual feedback
    showMistakeFeedback.value = true;
    setTimeout(() => {
      showMistakeFeedback.value = false;
    }, 700); // Duration of the flash effect
  }
};

const startReactionTimeTracking = () => {
  const update = () => {
    currentReactionTime.value = performance.now() - reactionStartTime.value;
    reactionTimeAnimationId.value = requestAnimationFrame(update);
  };
  reactionTimeAnimationId.value = requestAnimationFrame(update);
};

const stopReactionTimeTracking = () => {
  if (reactionTimeAnimationId.value) {
    cancelAnimationFrame(reactionTimeAnimationId.value);
    reactionTimeAnimationId.value = null;
  }
};

const moveToNextCard = () => {
  // Reset animation states for the new round
  cards.value.forEach(c => {
    c.animState = 'default';
  });

  if (nextCardTimeout.value) {
    clearTimeout(nextCardTimeout.value);
    nextCardTimeout.value = null;
  }
  shuffleCards();

  reactionStartTime.value = performance.now(); // 新しい札の読み上げ開始時間を記録
  startReactionTimeTracking(); // 新しい札の反応時間計測を開始

  // Unlock the board for the new round
  isTransitioningToNextRound.value = false;

  if (isAudioEnabled.value && currentCard.value) {
    console.log('moveToNextCard: Attempting to play audio. currentCard.value:', currentCard.value);
    playAudio(); // 新しいカードの音声を再生
  }
  console.log('moveToNextCard: currentCard.value after shuffleCards:', currentCard.value);
};

const startGame = () => {
  console.log('startGame: Game started.');
  isGameActive.value = true;
  gameEnded.value = false;
  resetScore();
  reactionStartTime.value = 0;
  loadCards();
  gameStarted.value = true;
  console.log('startGame: currentCard.value after loadCards and shuffleCards:', currentCard.value);
  if (isAudioEnabled.value) { // Use new setting
    nextTick(() => {
      playAudio();
    });
  } else {
    // 音声が無効な場合でもタイマーを開始するためにonAudioPlayのロジックを直接実行
    onAudioPlay();
  }
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

  // ゲーム終了時のクリーンアップ
  if (isAudioEnabled.value) {
    stopAudio();
  }
  if (nextCardTimeout.value) {
    clearTimeout(nextCardTimeout.value);
    nextCardTimeout.value = null;
  }
};

const restartGame = () => {
  // ゲーム終了時のクリーンアップ処理
  if (isAudioEnabled.value) {
    stopAudio();
  }
  if (nextCardTimeout.value) {
    clearTimeout(nextCardTimeout.value);
    nextCardTimeout.value = null;
  }
  // startGame と同じ処理を実行
  startGame();
};

const goHome = () => {
  isGameActive.value = false;
  gameEnded.value = false;
  gameStarted.value = false;
  if (isAudioEnabled.value) { // Use new setting
    stopAudio();
  }
  resetScore();
  cards.value = []; 
  allCardsData.value = []; 
  loadUnsentScores(); // ホームに戻った時に未送信スコアを再読み込み

  // ゲーム状態の完全なリセット
  currentCard.value = null;
  correctCardId.value = null;
  isAudioPlaying.value = false;
  stopReactionTimeTracking();
  if (nextCardTimeout.value) {
    clearTimeout(nextCardTimeout.value);
    nextCardTimeout.value = null;
  }
  isTransitioningToNextRound.value = false;
  showMistakeFeedback.value = false;
  floatingScore.value = 0;
  showFloatingScore.value = false;
};

const API_BASE_URL = 'http://localhost:3000'; // APIのベースURL

const showNotificationMessage = (message) => {
  notificationMessage.value = message;
  showNotification.value = true;
  if (notificationTimeoutId) {
    clearTimeout(notificationTimeoutId);
  }
  notificationTimeoutId = setTimeout(() => {
    showNotification.value = false;
    notificationTimeoutId = null;
  }, 5000); // 5秒後に通知を非表示
};

const loadUnsentScores = () => {
  const storedScores = JSON.parse(getCookie('unsentScores') || '[]');
  unsentScoresList.value = storedScores;
};

const clearUnsentScores = () => {
  setCookie('unsentScores', '[]');
  unsentScoresList.value = [];
  showNotificationMessage('未送信スコアを全て削除しました。');
};

const submitScoresToRanking = async () => {
  console.log('Attempting to submit scores to ranking...');
  let unsentScores = JSON.parse(getCookie('unsentScores') || '[]');
  if (unsentScores.length === 0) {
    console.log('No unsent scores found.');
    return;
  }

  const newUnsentScores = []; // 送信に失敗したスコアを保持する新しい配列

  for (const entry of unsentScores) {
    try {
      console.log('Submitting score entry:', entry);
      const response = await fetch(`${API_BASE_URL}/api/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: entry.nickname, score: entry.score, timestamp: entry.date }),
      });
      if (!response.ok) {
        const errorBody = await response.json();
        console.error(`Failed to submit score for ${entry.nickname}: ${response.status}`, errorBody);
        newUnsentScores.push(entry); // 送信失敗したスコアは新しい配列に残す
        showNotificationMessage(`スコアの送信に失敗しました: ${entry.nickname} (${Math.round(entry.score)}). 未送信スコアとして保存されました。`);
        continue; 
      }
      console.log('Score submitted successfully:', entry);
    } catch (error) {
      console.error('Error submitting score:', error);
      newUnsentScores.push(entry); // ネットワークエラーなどの場合も新しい配列に残す
      showNotificationMessage(`スコアの送信に失敗しました: ${entry.nickname} (${Math.round(entry.score)}). 未送信スコアとして保存されました。`);
      continue; 
    }
  }

  if (newUnsentScores.length < unsentScores.length) {
    console.log(`Successfully sent ${unsentScores.length - newUnsentScores.length} scores.`);
  }

  if (newUnsentScores.length > 0) {
    console.warn(`${newUnsentScores.length} scores failed to send and remain in the queue.`);
    setCookie('unsentScores', JSON.stringify(newUnsentScores)); // 未送信スコアをCookieに保存
  } else {
    console.log('All scores submitted successfully. Clearing unsent scores cookie.');
    setCookie('unsentScores', '[]'); // 全て送信成功したのでCookieをクリア
  }
  loadUnsentScores(); // 未送信スコア表示を更新
};

const saveNickname = () => {
  playerName.value = newPlayerName.value;
  if (saveNicknameSetting.value) {
    setCookie('playerName', playerName.value);
  } else {
    // 保存しない場合はCookieから削除
    setCookie('playerName', '', -1); // 有効期限を過去に設定して削除
  }
  showNicknameModal.value = false;
};

const saveSettingsAndCloseModal = () => {
  setCookie('isDebugMode', isDebugMode.value);
  setCookie('skipOnMistake', skipOnMistake.value); // 新しい設定を保存
  setCookie('audioVolume', audioVolume.value); // 音量を保存
  setCookie('isAudioEnabled', isAudioEnabled.value); // 音声有効/無効を保存
  setCookie('saveNicknameSetting', saveNicknameSetting.value); // ニックネーム保存設定を保存
  showSettingsModal.value = false;
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

  const savedDebugMode = getCookie('isDebugMode');
  if (savedDebugMode !== null) {
    isDebugMode.value = savedDebugMode === 'true';
  }

  const savedAudioVolume = getCookie('audioVolume');
  if (savedAudioVolume !== null) {
    audioVolume.value = parseFloat(savedAudioVolume);
  }

  const savedIsAudioEnabled = getCookie('isAudioEnabled');
  if (savedIsAudioEnabled !== null) {
    isAudioEnabled.value = savedIsAudioEnabled === 'true';
  }

  const savedSaveNicknameSetting = getCookie('saveNicknameSetting');
  if (savedSaveNicknameSetting !== null) {
    saveNicknameSetting.value = savedSaveNicknameSetting === 'true';
  }

  loadUnsentScores(); // 未送信スコアをロード

  submitScoresToRanking();
});

</script>

<style>
/* Global Styles */
#app {
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
  background-color: var(--color-header-footer);
  color: var(--color-text);
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative; /* Add this line */
}

.game-title {
  margin: 0;
  font-size: 1.8em;
  font-weight: 700;
}

.game-logo {
  height: auto; 
  max-height: 50px; /* Adjust as needed */
  object-fit: contain;
  margin: 0;
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
  color: var(--color-text);
  border: 2px solid var(--color-primary);
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.3s ease;
}

.edit-button:hover {
  background-color: #F5F2E9;
  color: var(--color-primary);
}

.header-action-button {
  background-color: var(--color-white);
  color: var(--color-text);
  border: 2px solid var(--color-primary);
  padding: 5px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  font-weight: bold;
  transition: all 0.3s ease;
  margin-left: 20px; /* Adjust as needed */
}

.header-action-button:hover {
  background-color: #F5F2E9;
  color: var(--color-primary);
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
  padding: 20px 30px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 1.5em;
  min-height: auto;
  width: 80%;
  max-width: 800px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  line-height: 1.5;
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
  background-color: var(--color-white);
  color: var(--color-text);
  border: 2px solid var(--color-primary);
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 1.1em;
  cursor: pointer;
  transition: all 0.3s ease;
}

.audio-controls button:hover:not(:disabled) {
  background-color: #F5F2E9;
  color: var(--color-primary);
}

.audio-controls button:disabled {
  background-color: #999;
  cursor: not-allowed;
  color: var(--color-white);
}

.game-footer {
  padding: 15px 20px;
  background-color: var(--color-header-footer);
  color: var(--color-text);
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
}

.ranking-button {
  background-color: var(--color-white);
  color: var(--color-text);
  border: 2px solid var(--color-primary);
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 1.1em;
  cursor: pointer;
  transition: all 0.3s ease;
}

.ranking-button:hover {
  background-color: #F5F2E9;
  color: var(--color-primary);
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
  color: var(--color-primary);
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
  background-color: var(--color-white);
  color: var(--color-text);
  border: 2px solid var(--color-primary);
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  margin: 0 5px;
  transition: all 0.3s ease;
}

.modal-content button:hover {
  background-color: #F5F2E9;
  color: var(--color-primary);
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
  color: var(--color-text);
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
  background: var(--color-white);
  padding: 50px;
  border-radius: 15px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 600px;
  width: 100%;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  animation: fadeInScale 0.5s ease-out;
}

.game-result h2 {
  color: var(--color-primary);
  margin-bottom: 30px;
  font-size: 3em;
  font-weight: 700;
  letter-spacing: 1px;
}

.game-result p {
  font-size: 1.3em;
  margin-bottom: 15px;
  color: var(--color-text);
}

.result-score {
  font-size: 3.5em;
  font-weight: bold;
  color: var(--color-primary);
  display: inline-block;
  margin: 20px 0;
  animation: scorePop 0.8s ease-out;
}

.best-score-message {
  color: var(--color-primary);
  font-weight: bold;
  font-size: 1.6em;
  margin-top: 25px;
  animation: pulse 1.5s infinite alternate;
}

.taken-cards-display {
  margin-top: 40px;
  border-top: 1px solid var(--color-border);
  padding-top: 30px;
}

.taken-cards-display h3 {
  color: var(--color-primary);
  margin-bottom: 20px;
  font-size: 1.8em;
}

.taken-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 15px;
  justify-content: center;
}

.taken-card-item {
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Zen Old Mincho', 'Shippori Mincho', serif;
  font-weight: 700;
  font-size: 0.9em;
  line-height: 1.3;
  white-space: normal;
  word-break: normal;
  writing-mode: vertical-rl;
  text-orientation: upright;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.result-actions {
  margin-top: 40px;
  display: flex;
  justify-content: center;
  gap: 20px;
}

.action-button {
  background-color: var(--color-white);
  color: var(--color-text);
  border: 2px solid var(--color-primary);
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 1.2em;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  font-family: 'Zen Old Mincho', 'Shippori Mincho', serif; /* Added Mincho font */
}

.action-button.primary {
}

.action-button:hover {
  background-color: #F5F2E9;
  color: var(--color-primary);
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

/* New Animations for Game Result */
@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes scorePop {
  0% { transform: scale(0.5); opacity: 0; }
  70% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* Mistake Feedback Overlay */
.mistake-feedback-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Allows clicks to go through */
  background: radial-gradient(circle, rgba(220, 20, 60, 0) 0%, rgba(220, 20, 60, 0.3) 80%, rgba(220, 20, 60, 0.5) 100%);
  opacity: 0;
  z-index: 2000; /* On top of everything */
  transition: opacity 0.5s ease-out;
}

.mistake-feedback-overlay.is-active {
  opacity: 1;
  transition: opacity 0.1s ease-in;
}

/* Transition Overlay */
.transition-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.2);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease-out;
  z-index: 1500; /* Above cards, below modals */
}

.transition-overlay.is-active {
  opacity: 1;
  pointer-events: auto; /* Block clicks when active */
}

.floating-score {
  position: absolute;
  top: 50%; /* Adjust as needed */
  left: 50%; /* Adjust as needed */
  transform: translate(-50%, -50%);
  font-size: 2em;
  font-weight: bold;
  color: var(--color-primary);
  pointer-events: none; /* Allow clicks to pass through */
  z-index: 100;
}

/* Transition styles */
.fade-up-enter-active, .fade-up-leave-active {
  transition: all 0.8s ease-out;
}

.fade-up-enter-from, .fade-up-leave-to {
  opacity: 0;
  transform: translate(-50%, -100%); /* Move up */
}

.debug-overlay {
  position: fixed;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 5px;
  font-size: 0.8em;
  text-align: left;
  z-index: 2000;
}

.debug-overlay h3 {
  margin-top: 0;
  margin-bottom: 5px;
  color: #4CAF50;
}

.debug-overlay p {
  margin: 2px 0;
}

.debug-overlay h4 {
  margin-top: 10px;
  margin-bottom: 5px;
  color: #FFC107;
}

/* Notification Overlay */
.notification-overlay {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 15px 25px;
  border-radius: 8px;
  z-index: 3000;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  font-size: 1.1em;
  transition: opacity 0.5s ease-out;
}

.notification-overlay.fade-enter-active, .notification-overlay.fade-leave-active {
  transition: opacity 0.5s;
}
.notification-overlay.fade-enter, .notification-overlay.fade-leave-to /* .fade-leave-active in <2.1.8 */ {
  opacity: 0;
}

/* Unsent Scores Section */
.unsent-scores-section {
  background-color: var(--color-white);
  padding: 20px;
  margin-top: 30px;
  width: 100%;
  max-width: 400px;
  text-align: left;
  border: 1px solid var(--color-border);
}

.unsent-scores-section h3 {
  color: var(--color-primary);
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.5em;
}

.unsent-scores-section ul {
  list-style: none;
  padding: 0;
  margin-bottom: 20px;
  max-height: 200px; /* スクロール可能にする */
  overflow-y: auto;
  border: 1px solid #eee;
  padding: 10px;
  border-radius: 5px;
}

.unsent-scores-section li {
  background-color: #f9f9f9;
  padding: 8px 10px;
  margin-bottom: 5px;
  border-radius: 3px;
  font-size: 0.95em;
  color: var(--color-text);
}

.unsent-scores-section .action-button.danger {
  background-color: #dc3545;
  color: white;
  border-color: #dc3545;
}

.unsent-scores-section .action-button.danger:hover {
  background-color: #c82333;
  border-color: #bd2130;
  color: white;
}
</style>