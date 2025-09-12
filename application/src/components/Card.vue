<template>
  <div
    ref="cardElement"
    class="card shadow-md rounded-lg"
    :class="{ 'is-taken': isTaken }"
    @click="onClick"
  >
    <p class="card-text">{{ card.text }}</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { GAME_CONFIG } from '../config/gameConfig';

const props = defineProps({
  card: Object,
  isCorrect: Boolean,
  isMistake: Boolean,
});

const emit = defineEmits(['card-clicked']);

const cardElement = ref(null); // テンプレート参照
const isTaken = ref(false);

const ANIMATION_END_DELAY = GAME_CONFIG.ANIMATION_DURATION_MS + 50; // アニメーション終了後少し待つ

watch(() => props.isCorrect, (newVal) => {
  if (newVal && cardElement.value) {
    const animation = cardElement.value.animate([
      { transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
      { transform: 'translate(120vw, 0px) scale(1.1) rotate(0deg)' } 
    ], {
      duration: GAME_CONFIG.ANIMATION_DURATION_MS,
      easing: 'ease-out',
      fill: 'forwards'
    });
    animation.onfinish = () => {
      isTaken.value = true;
    };
  }
});

watch(() => props.isMistake, (newVal) => {
  if (newVal && cardElement.value) {
    const animation = cardElement.value.animate([
      { transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
      { transform: 'translate(-120vw, 0px) scale(1.1) rotate(0deg)' } 
    ], {
      duration: GAME_CONFIG.ANIMATION_DURATION_MS,
      easing: 'ease-out',
      fill: 'forwards'
    });
    animation.onfinish = () => {
      isTaken.value = true;
    };
  }
});

const onClick = () => {
  if (!isTaken.value) {
    emit('card-clicked', props.card.id);
  }
};
</script>

<style scoped>
.card {
  position: relative;
  width: 150px; /* 仮のサイズ */
  height: 200px; /* 仮のサイズ */
  background-color: var(--color-white);
  border: 2px solid var(--color-primary-dark);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  display: flex; /* テキスト中央寄せ用 */
  align-items: center;
  justify-content: center;
  padding: 10px; /* テキストの余白 */
  transition: transform GAME_CONFIG.ANIMATION_DURATION_MS + 'ms ease-out, opacity ' + GAME_CONFIG.ANIMATION_DURATION_MS + 'ms ease-out, border-color 0.3s ease';
  will-change: transform, opacity;
  /* 縦書き設定 */
  writing-mode: vertical-rl;
  text-orientation: upright;
}

.card:hover {
  border-color: var(--color-accent);
  transform: translateY(-5px);
}

.card-text {
  font-family: 'Zen Old Mincho', 'Shippori Mincho', serif; /* 明朝体 */
  font-size: clamp(1em, 4vw, 1.5em); /* 自動調整 */
  line-height: 1.4; /* 行間 */
  white-space: normal; /* 自動改行 */
  word-break: normal; /* 日本語の単語で改行 */
  margin: 0;
  color: var(--color-text);
  font-weight: 700; /* 太字 */
}

.card.is-taken {
  opacity: 0;
  pointer-events: none;
}

@keyframes shake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
}
</style>