import { ref } from 'vue';
import { GAME_CONFIG } from '../config/gameConfig';

export function useScore() {
  const score = ref(0);
  const combo = ref(0);
  const totalCorrect = ref(0);
  const totalMistake = ref(0);
  const reactionTimes = ref([]);
  const takenCardIds = ref([]); // 取った札のIDを記録

  function resetScore() {
    score.value = 0;
    combo.value = 0;
    totalCorrect.value = 0;
    totalMistake.value = 0;
    reactionTimes.value = [];
    takenCardIds.value = []; // リセット時にクリア
  }

  function addCorrect(elapsedMs, cardId) {
    const baseScore = Math.max(0, GAME_CONFIG.K / Math.pow(elapsedMs, 2));
    const comboBonus = 1 + combo.value * GAME_CONFIG.COMBO_BONUS_STEP;
    const finalScore = baseScore * comboBonus;

    score.value += finalScore;
    combo.value++;
    totalCorrect.value++;
    reactionTimes.value.push(elapsedMs);
    takenCardIds.value.push(cardId); // 正解した札のIDを記録
    return finalScore;
  }

  function addMistake(elapsedMs) {
    score.value -= GAME_CONFIG.PENALTY;
    combo.value = 0; // コンボリセット
    totalMistake.value++;
    return GAME_CONFIG.PENALTY;
  }

  return {
    score,
    combo,
    totalCorrect,
    totalMistake,
    reactionTimes,
    takenCardIds, // 追加
    resetScore,
    addCorrect,
    addMistake,
  };
}