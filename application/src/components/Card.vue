<template>
  <div
    ref="cardElement"
    class="card shadow-md rounded-lg"
    :class="{ 'is-visually-taken': isVisuallyTaken }"
    @click="onClick"
  >
    <div class="card-content">
      <p class="lower-text">{{ karutaInfo.shimonoku }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { GAME_CONFIG } from '../config/gameConfig';
import { karutaData } from '../data/karutaData.js'; // 新しいデータをインポート

const props = defineProps({
  card: Object,
  animState: String, // default | correct_flying | mistake_flying | returning
});

const emit = defineEmits(['card-clicked']);

const cardElement = ref(null);
const isVisuallyTaken = ref(false);
const currentAnimation = ref(null);

// card.id に基づいて karutaData から対応する歌を見つける
const karutaInfo = computed(() => {
  return karutaData.find(item => item.id === props.card.id) || { full: '', shimonoku: '' };
});

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
  console.log(`Card ${props.card.id}: animState changed to ${newState}`);
  switch (newState) {
    case 'default': {
      isVisuallyTaken.value = false; // カードをデフォルト状態に戻す
      if (cardElement.value) {
        cardElement.value.style.visibility = 'visible'; // 強制的に表示
      }
      cardElement.value.classList.remove('is-animating');
      currentAnimation.value = null;
      break;
    }
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
      const anim = playAnimation(getFlyAwayKeyframes(false), {
        duration: GAME_CONFIG.ANIMATION_DURATION_MS,
        easing: 'ease-out',
        fill: 'forwards'
      });
      anim.onfinish = () => {
        isVisuallyTaken.value = true; // アニメーション完了後に非表示にする
        cardElement.value.classList.remove('is-animating');
      };
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
  console.log('Card clicked:', props.card);
  console.log('Card ID:', props.card.id);
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
  border: 2px solid var(--color-primary);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  display: flex; /* テキスト中央寄せ用 */
  align-items: center;
  justify-content: center;
  padding: 10px; /* テキストの余白 */
  transition: transform GAME_CONFIG.ANIMATION_DURATION_MS + 'ms ease-out, opacity ' + GAME_CONFIG.ANIMATION_DURATION_MS + 'ms ease-out, border-color 0.3s ease';
  will-change: transform, opacity;
  /* 縦書き設定は下の句にのみ適用 */
}

.card:hover {
  background-color: #F5F2E9;
  border-color: #A50F29;
  transform: translateY(-5px);
}

.card-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  width: 100%;
  padding: 5px;
  box-sizing: border-box;
}

.lower-text {
  font-family: 'Zen Old Mincho', 'Shippori Mincho', serif; /* 明朝体 */
  font-size: clamp(1em, 4vw, 1.5em); /* 自動調整 */
  line-height: 1.4; /* 行間 */
  white-space: normal; /* 自動改行 */
  word-break: normal; /* 日本語の単語で改行 */
  margin: 0;
  color: var(--color-text);
  font-weight: 700; /* 太字 */
  writing-mode: vertical-rl; /* 下の句は縦書き */
  text-orientation: upright;
  text-align: center;
  flex-grow: 2; /* 下部に配置、全文より大きく */
  display: flex;
  align-items: center;
  justify-content: center;
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