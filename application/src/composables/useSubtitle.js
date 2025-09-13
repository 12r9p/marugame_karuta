import { ref, watch } from 'vue';
import { GAME_CONFIG } from '../config/gameConfig';

export function useSubtitle(audioPlayerRef, subtitleText) {
  const parsedSubtitles = ref([]);
  const currentSubtitle = ref('');
  const currentSubtitleTime = ref(0); // 新しいrefを追加
  const simulatedTime = ref(0); // シミュレートされた時間
  let simulationInterval = null; // シミュレーションのインターバルID

  const parseSubtitleText = (text) => {
    console.log('parseSubtitleText input:', text); // デバッグログ
    const regex = /<([0-9.]+)>([^<]*)/g;
    let match;
    const result = [];
    let lastTime = 0;

    while ((match = regex.exec(text)) !== null) {
      const time = parseFloat(match[1]);
      const content = match[2];

      // タグが昇順になっていない場合、ソートはしないが警告を出すか、直前のタイムスタンプを引き継ぐ
      // 今回はシンプルに、直前のタイムスタンプより小さい場合は直前のタイムスタンプを使用
      if (time < lastTime) {
        console.warn(`Subtitle tag out of order: ${time}s after ${lastTime}s. Using ${lastTime}s.`);
        // Optionally, you could sort the entire array after parsing, but for streaming display, this might be simpler.
      }
      lastTime = time;

      if (content) {
        result.push({ t: time, text: content });
      }
    }
    // 末尾にタグがない場合の残りのテキストを処理
    const lastIndex = text.lastIndexOf('>');
    if (lastIndex !== -1 && lastIndex < text.length - 1) {
      const remainingText = text.substring(lastIndex + 1);
      console.log('parseSubtitleText: lastIndex', lastIndex, 'text.length', text.length, 'remainingText', remainingText, 'remainingText.trim()', remainingText.trim()); // デバッグログ
      // 最後の要素と重複する場合を除いて追加
      if (remainingText.trim() !== '' && (result.length === 0 || result[result.length - 1].text !== remainingText.trim())) {
        result.push({ t: lastTime, text: remainingText });
      }
    }

    // 秒数でソート (念のため)
    result.sort((a, b) => a.t - b.t);
    console.log('Parsed subtitles:', result); // デバッグログ
    return result;
  };

  watch(subtitleText, (newText) => {
    parsedSubtitles.value = parseSubtitleText(newText || '');
    currentSubtitle.value = ''; // Reset current subtitle on new text
    currentSubtitleTime.value = 0; // Reset time on new text
    simulatedTime.value = 0; // Reset simulated time

    // Clear previous interval if any
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }

    // Start simulation if audio is disabled
    if (!GAME_CONFIG.ENABLE_AUDIO && newText) { // Only start if there's text
      simulationInterval = setInterval(() => {
        simulatedTime.value += 0.1; // Increment by 0.1 seconds (adjust as needed)
        updateSubtitle(simulatedTime.value); // Update subtitle with simulated time
      }, 100); // Update every 100ms
    }
  }, { immediate: true });

  const updateSubtitle = (currentTime) => { // currentTime is now always a number
    if (!audioPlayerRef.value && !GAME_CONFIG.ENABLE_AUDIO) { // 音声プレイヤーがなく、かつ音声が無効な場合
      // シミュレートされた時間で処理を続行
    } else if (!audioPlayerRef.value && GAME_CONFIG.ENABLE_AUDIO) { // 音声プレイヤーがなく、音声が有効な場合
      currentSubtitle.value = '';
      currentSubtitleTime.value = 0;
      return;
    }

    currentSubtitleTime.value = currentTime; // 時間を更新
    //console.log('updateSubtitle: currentTime', currentTime); // デバッグログ
    let displayedText = '';

    for (let i = 0; i < parsedSubtitles.value.length; i++) {
      const subtitle = parsedSubtitles.value[i];
      if (currentTime >= subtitle.t) {
        displayedText += subtitle.text;
      } else {
        break;
      }
    }
    currentSubtitle.value = displayedText;
    //console.log('Displayed subtitle:', currentSubtitle.value); // デバッグログ
  };

  // audioPlayerRef の currentTime が更新されるたびに字幕を更新
  if (GAME_CONFIG.ENABLE_AUDIO) {
    watch(audioPlayerRef, (player) => {
      if (player) {
        player.addEventListener('timeupdate', updateSubtitle);
        // Clean up previous listener if audioPlayerRef changes
        return () => {
          player.removeEventListener('timeupdate', updateSubtitle);
        };
      }
    }, { immediate: true });
  }

  return { currentSubtitle, updateSubtitle, currentSubtitleTime, simulatedTime };
}