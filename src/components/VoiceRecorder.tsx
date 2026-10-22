import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Send,
  AlertCircle,
  Keyboard,
  AudioWaveform as WaveformIcon,
  CheckCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { AudioRecorder } from '../utils/audioRecorder';

interface VoiceRecorderProps {
  questionId?: string;
  isEvaluating: boolean;
  onSubmit: (payload: {
    audioBase64?: string;
    mimeType?: string;
    userText?: string;
    audioBlob?: Blob;
    duration?: number;
  }) => void;
  onRequestMicPermission: () => Promise<boolean>;
  micPermission: 'granted' | 'denied' | 'prompt';
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  questionId,
  isEvaluating,
  onSubmit,
  onRequestMicPermission,
  micPermission,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<{
    blob: Blob;
    base64: string;
    mimeType: string;
    duration: number;
    url: string;
  } | null>(null);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [manualText, setManualText] = useState('');
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Helper to completely stop and release the current audio playback element
  const resetAudioPlayer = () => {
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
        audioPlayerRef.current.src = '';
      } catch {}
      audioPlayerRef.current = null;
    }
    setIsPlayingRecorded(false);
  };

  // Reset recorder and playback state whenever the question changes
  useEffect(() => {
    resetAudioPlayer();
    if (recordedAudio?.url) {
      URL.revokeObjectURL(recordedAudio.url);
    }
    setRecordedAudio(null);
    setManualText('');
    setMicErrorMessage(null);
    if (recorderRef.current) {
      recorderRef.current.cancel();
    }
    setIsRecording(false);
    setRecordingDuration(0);
  }, [questionId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      resetAudioPlayer();
      if (recorderRef.current) {
        recorderRef.current.cancel();
      }
    };
  }, []);

  const startRecording = async () => {
    resetAudioPlayer();
    if (recordedAudio?.url) {
      URL.revokeObjectURL(recordedAudio.url);
    }

    setMicErrorMessage(null);
    setRecordedAudio(null);
    setRecordingDuration(0);

    // Ensure microphone permission
    if (micPermission !== 'granted') {
      const granted = await onRequestMicPermission();
      if (!granted) {
        setMicErrorMessage('Por favor concede acceso al micrófono para grabar tu voz.');
        return;
      }
    }

    try {
      const recorder = new AudioRecorder(
        (vol) => setVolumeLevel(vol),
        (sec) => setRecordingDuration(sec)
      );
      recorderRef.current = recorder;
      await recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setMicErrorMessage(
        err.message || 'No se pudo acceder al micrófono. Verifica los permisos de tu navegador.'
      );
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current) return;

    try {
      const result = await recorderRef.current.stop();
      setIsRecording(false);
      setVolumeLevel(0);

      // Clean up previous playback instance before setting new audio
      resetAudioPlayer();
      if (recordedAudio?.url) {
        URL.revokeObjectURL(recordedAudio.url);
      }

      const url = URL.createObjectURL(result.blob);
      setRecordedAudio({
        blob: result.blob,
        base64: result.base64,
        mimeType: result.mimeType,
        duration: result.duration,
        url,
      });
    } catch (err: any) {
      console.error('Failed to stop recording:', err);
      setIsRecording(false);
      setMicErrorMessage('Error al procesar la grabación de audio.');
    }
  };

  const cancelRecording = () => {
    resetAudioPlayer();
    if (recorderRef.current) {
      recorderRef.current.cancel();
    }
    if (recordedAudio?.url) {
      URL.revokeObjectURL(recordedAudio.url);
    }
    setIsRecording(false);
    setRecordingDuration(0);
    setVolumeLevel(0);
    setRecordedAudio(null);
  };

  const togglePlayRecordedAudio = () => {
    if (!recordedAudio) return;

    // If currently playing, pause it
    if (isPlayingRecorded && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlayingRecorded(false);
      return;
    }

    // Always create a fresh Audio instance pointing to the CURRENT recording's URL
    resetAudioPlayer();
    const player = new Audio(recordedAudio.url);
    audioPlayerRef.current = player;

    player.onended = () => {
      setIsPlayingRecorded(false);
    };
    player.onerror = () => {
      setIsPlayingRecorded(false);
    };

    player
      .play()
      .then(() => {
        setIsPlayingRecorded(true);
      })
      .catch((err) => {
        console.warn('Playback error:', err);
        setIsPlayingRecorded(false);
      });
  };

  const handleSendAudio = () => {
    if (!recordedAudio) return;
    // Send ONLY the clean audio recording for the AI to listen to and evaluate genuine speech
    onSubmit({
      audioBase64: recordedAudio.base64,
      mimeType: recordedAudio.mimeType,
      audioBlob: recordedAudio.blob,
      duration: recordedAudio.duration,
    });
  };

  const handleSendText = () => {
    if (!manualText.trim()) return;
    onSubmit({
      userText: manualText.trim(),
    });
  };

  // Format seconds MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs mb-6 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Tu Turno: Responde en Español en Voz Alta
            </h3>
            <p className="text-xs text-stone-500">
              Habla con naturalidad. La IA escuchará tu audio con atención para evaluar tu respuesta real.
            </p>
          </div>
        </div>

        {/* Toggle between Audio & Text fallback */}
        <button
          type="button"
          onClick={() => setTextMode(!textMode)}
          disabled={isRecording || isEvaluating}
          className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 transition disabled:opacity-40"
        >
          <Keyboard className="w-3.5 h-3.5 text-stone-500" />
          <span>{textMode ? 'Usar micrófono' : 'Escribir texto'}</span>
        </button>
      </div>

      {/* Error message banner if mic issue */}
      {micErrorMessage && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Atención: </span>
            {micErrorMessage}
          </div>
          <button
            onClick={() => setMicErrorMessage(null)}
            className="text-rose-600 hover:underline font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* TEXT MODE (Fallback) */}
      {textMode ? (
        <div className="space-y-3">
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Escribe tu respuesta en español aquí si no puedes usar el micrófono..."
            disabled={isEvaluating}
            rows={4}
            className="w-full p-4 rounded-2xl border border-stone-200 bg-stone-50/60 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-xs text-stone-400">
              Consejo: Para mejorar tu fluidez oral, se recomienda practicar con el micrófono.
            </span>
            <button
              type="button"
              onClick={handleSendText}
              disabled={isEvaluating || !manualText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-sm transition shadow-xs shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>{isEvaluating ? 'Evaluando...' : 'Evaluar mi texto'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* AUDIO RECORDING MODE */
        <div className="flex flex-col items-center justify-center py-4">
          {/* Active processing state when AI is listening and analyzing the audio */}
          {isEvaluating && (
            <div className="w-full max-w-md p-6 rounded-2xl bg-amber-50/80 border border-amber-200 text-center animate-in fade-in duration-200 shadow-2xs mb-2">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Procesando tu voz con IA
                </span>
              </div>
              <h4 className="text-sm font-bold text-stone-900 mb-1.5">
                Escuchando y analizando tu respuesta...
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                El tutor está escuchando con atención lo que dijiste al micrófono para transcribir con precisión tus palabras y evaluar tu gramática y pronunciación real.
              </p>
            </div>
          )}

          {/* IDLE: Not recording and no recorded audio yet */}
          {!isRecording && !recordedAudio && !isEvaluating && (
            <div className="flex flex-col items-center text-center">
              <button
                type="button"
                onClick={startRecording}
                disabled={isEvaluating}
                className="group relative w-22 h-22 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/20 flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Mic className="w-8 h-8 stroke-[2.2] group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Grabar</span>
              </button>

              <p className="mt-4 text-sm font-semibold text-stone-800">
                Presiona para responder en voz alta
              </p>
              <p className="text-xs text-stone-400 mt-1 max-w-sm">
                Habla con calma y claridad en español. Cuando termines, presiona el botón para detener.
              </p>
            </div>
          )}

          {/* ACTIVE RECORDING STATE */}
          {isRecording && (
            <div className="w-full flex flex-col items-center text-center">
              {/* Pulsing visualizer ring */}
              <div className="relative mb-4 flex items-center justify-center">
                <div
                  className="absolute rounded-full bg-rose-500/15 animate-ping"
                  style={{
                    width: `${Math.max(76, 76 + volumeLevel * 70)}px`,
                    height: `${Math.max(76, 76 + volumeLevel * 70)}px`,
                  }}
                ></div>
                <div className="w-22 h-22 rounded-full bg-rose-500 text-white shadow-md shadow-rose-500/30 flex flex-col items-center justify-center relative z-10">
                  <WaveformIcon className="w-8 h-8 animate-pulse" />
                  <span className="text-xs font-mono font-bold mt-1">
                    {formatTime(recordingDuration)}
                  </span>
                </div>
              </div>

              {/* Volume equalizer wave bars */}
              <div className="flex items-center justify-center gap-1 h-8 mb-4 w-48">
                {[0.2, 0.5, 0.8, 1.0, 0.8, 0.5, 0.3, 0.7, 0.9, 0.4, 0.6].map((mult, idx) => {
                  const barHeight = Math.max(4, Math.min(30, volumeLevel * mult * 36));
                  return (
                    <div
                      key={idx}
                      className="w-1.5 bg-rose-400 rounded-full transition-all duration-75"
                      style={{ height: `${barHeight}px` }}
                    ></div>
                  );
                })}
              </div>

              <p className="text-xs font-medium text-stone-500 mb-4">
                Grabando tu voz... Habla a tu propio ritmo en español.
              </p>

              {/* Stop & Cancel buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-xs transition"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Terminar grabación</span>
                </button>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200 text-xs font-semibold transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              </div>
            </div>
          )}

          {/* RECORDED AUDIO READY STATE */}
          {!isRecording && recordedAudio && !isEvaluating && (
            <div className="w-full flex flex-col items-center text-center">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>¡Audio grabado con éxito! ({formatTime(recordedAudio.duration)})</span>
              </div>

              {/* Audio Listen-back bar */}
              <div className="w-full max-w-md bg-stone-50 border border-stone-200/90 p-3 rounded-2xl flex items-center justify-between gap-3 mb-4">
                <button
                  type="button"
                  onClick={togglePlayRecordedAudio}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-800 text-xs font-semibold shadow-2xs hover:bg-stone-50"
                >
                  {isPlayingRecorded ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      <span>Pausar mi audio</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                      <span>Escuchar mi grabación</span>
                    </>
                  )}
                </button>

                <span className="text-xs font-mono text-stone-500">
                  {formatTime(recordedAudio.duration)}
                </span>
              </div>

              {/* Action Buttons: Submit / Re-record */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleSendAudio}
                  disabled={isEvaluating}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-xs transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar y Recibir Feedback ➔</span>
                </button>

                <button
                  type="button"
                  onClick={cancelRecording}
                  disabled={isEvaluating}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs border border-stone-200 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Grabar de nuevo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
