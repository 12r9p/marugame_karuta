<template>
  <div
    ref="cardElement"
    class="card shadow-md rounded-lg"
    :class="{ 'is-visually-taken': isVisuallyTaken }"
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
  animState: String, // default | correct_flying | mistake_flying | returning
});

const emit = defineEmits(['card-clicked']);

const cardElement = ref(null);
const isVisuallyTaken = ref(false);
const currentAnimation = ref(null);

// --- Animation Logic ---

const playAnimation = (keyframes, options) => {
  if (currentAnimation.value) {
    currentAnimation.value.cancel();
  }
  currentAnimation.value = cardElement.value.animate(keyframes, options);
  return currentAnimation.value;
};

const getFlyAwayKeyframes = (isCorrect) => {
  const cardIdNum = parseInt(props.card.id, 10);
  let directionX, rotation;

  if (isCorrect) {
    directionX = cardIdNum % 2 === 0 ? '150vw' : '-150vw';
    rotation = cardIdNum % 2 === 0 ? '30deg' : '-30deg';
  } else {
    directionX = cardIdNum % 2 === 0 ? '90vw' : '-90vw';
    rotation = cardIdNum % 2 === 0 ? '5deg' : '-5deg';
  }

  return [
    { transform: 'translate(0, 0) scale(1)', opacity: 1, visibility: 'visible' },
    { transform: `translate(${directionX}, -150px) scale(0.4) rotate(${rotation})`, opacity: 0, visibility: 'visible' }
  ];
};

// --- State Machine Watcher ---

watch(() => props.animState, (newState) => {
  switch (newState) {
    case 'correct_flying': {
      cardElement.value.classList.add('is-animating');
      const anim = playAnimation(getFlyAwayKeyframes(true), {
        duration: GAME_CONFIG.ANIMATION_DURATION_MS,
        easing: 'ease-in',
        fill: 'forwards'
      });
      anim.onfinish = () => {
        isVisuallyTaken.value = true;
      };
      break;
    }
    case 'mistake_flying': {
      cardElement.value.classList.add('is-animating');
      playAnimation(getFlyAwayKeyframes(false), {
        duration: GAME_CONFIG.ANIMATION_DURATION_MS,
        easing: 'ease-out',
        fill: 'forwards'
      });
      break;
    }
    case 'returning': {
      const returnAnim = playAnimation(
        [...getFlyAwayKeyframes(false)].reverse(),
        {
          duration: GAME_CONFIG.ANIMATION_DURATION_MS,
          easing: 'ease-out',
          fill: 'forwards'
        }
      );
      returnAnim.onfinish = () => {
        cardElement.value.classList.remove('is-animating');
        currentAnimation.value = null;
      };
      break;
    }
  }
});

const onClick = () => {
  // The parent now controls clickability via the animState.
  // This component just needs to emit its ID.
  emit('card-clicked', props.card.id);
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

.card.is-animating {
  z-index: 100;
}

.card.is-visually-taken {
  visibility: hidden;
}

@keyframes shake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
}
</style>