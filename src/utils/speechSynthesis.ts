/**
 * Speech synthesis utility supporting both server Gemini TTS and browser SpeechSynthesis fallback
 * Includes caching and safe event listener management to prevent race conditions when changing rates.
 */

let activeAudioElement: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;

// Cache TTS audio data by text to make speed switching and replaying instantaneous
const ttsAudioCache = new Map<string, { audio: string; mimeType: string }>();

export function stopAllAudio(): void {
  if (activeAudioElement) {
    try {
      activeAudioElement.onended = null;
      activeAudioElement.onerror = null;
      activeAudioElement.onplay = null;
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {}
    activeAudioElement = null;
  }

  if (activeUtterance) {
    activeUtterance.onend = null;
    activeUtterance.onerror = null;
    activeUtterance.onstart = null;
    activeUtterance = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export async function playSpanishAudio(
  text: string,
  options: {
    rate?: number; // e.g. 1.0 or 0.8
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  } = {}
): Promise<void> {
  const { rate = 1.0, onStart, onEnd, onError } = options;

  // Cleanly stop any existing playback without firing stale onEnd/onError callbacks
  stopAllAudio();

  // 1. Check in-memory cache for previously generated TTS audio
  const cached = ttsAudioCache.get(text);
  if (cached) {
    playBase64Audio(cached.audio, cached.mimeType, rate, text, onStart, onEnd, onError);
    return;
  }

  // 2. Try server Gemini TTS
  try {
    const response = await fetch('/api/practice/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: 'Kore' }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.audio) {
        ttsAudioCache.set(text, {
          audio: data.audio,
          mimeType: data.mimeType || 'audio/wav',
        });
        playBase64Audio(data.audio, data.mimeType || 'audio/wav', rate, text, onStart, onEnd, onError);
        return;
      }
    }
  } catch (err) {
    console.warn('Server TTS fetch failed, trying browser synthesis:', err);
  }

  // 3. Fallback to browser SpeechSynthesis
  fallbackToBrowserSpeech(text, rate, onStart, onEnd, onError);
}

function playBase64Audio(
  base64Audio: string,
  mimeType: string,
  rate: number,
  fallbackText: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): void {
  try {
    const audioSrc = `data:${mimeType || 'audio/wav'};base64,${base64Audio}`;
    const audio = new Audio(audioSrc);
    audio.playbackRate = rate;
    activeAudioElement = audio;

    audio.onplay = () => {
      if (onStart) onStart();
    };

    audio.onended = () => {
      activeAudioElement = null;
      if (onEnd) onEnd();
    };

    audio.onerror = (e) => {
      console.warn('Audio playback error, falling back to Web Speech API:', e);
      fallbackToBrowserSpeech(fallbackText, rate, onStart, onEnd, onError);
    };

    audio.play().catch((playErr) => {
      console.warn('Audio play() failed, falling back to browser speech:', playErr);
      fallbackToBrowserSpeech(fallbackText, rate, onStart, onEnd, onError);
    });
  } catch (e) {
    console.warn('Failed to initialize Audio object, using fallback:', e);
    fallbackToBrowserSpeech(fallbackText, rate, onStart, onEnd, onError);
  }
}

function fallbackToBrowserSpeech(
  text: string,
  rate: number = 1.0,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onError) onError(new Error('Speech synthesis not supported in this browser.'));
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES'; // Spanish
  utterance.rate = rate; // 1.0 or 0.8
  activeUtterance = utterance;

  // Try to pick a natural Spanish voice
  const voices = window.speechSynthesis.getVoices();
  const spanishVoice =
    voices.find(
      (v) =>
        v.lang.startsWith('es') &&
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium'))
    ) || voices.find((v) => v.lang.startsWith('es'));

  if (spanishVoice) {
    utterance.voice = spanishVoice;
  }

  utterance.onstart = () => {
    if (onStart) onStart();
  };

  utterance.onend = () => {
    activeUtterance = null;
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    // If canceled deliberately by stopAllAudio or rate change, don't report as an error or trigger onEnd
    if (e.error === 'canceled' || e.error === 'interrupted') {
      return;
    }
    console.warn('SpeechSynthesis error:', e);
    activeUtterance = null;
    if (onEnd) onEnd();
    if (onError) onError(e);
  };

  window.speechSynthesis.speak(utterance);
}
