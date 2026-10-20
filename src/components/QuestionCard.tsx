import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Languages,
  Lightbulb,
  Sparkles,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { PracticeQuestion } from '../types';
import { playSpanishAudio, stopAllAudio } from '../utils/speechSynthesis';

interface QuestionCardProps {
  question: PracticeQuestion | null;
  isLoading: boolean;
  isEvaluating?: boolean;
  questionError?: string | null;
  onRefreshQuestion: () => void;
  onRetry?: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  isLoading,
  isEvaluating = false,
  questionError = null,
  onRefreshQuestion,
  onRetry,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [showEnglishTranslation, setShowEnglishTranslation] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showSampleAnswer, setShowSampleAnswer] = useState(false);

  // Stop audio and reset playing state when question changes or unmounts
  useEffect(() => {
    stopAllAudio();
    setIsPlayingAudio(false);
    return () => {
      stopAllAudio();
      setIsPlayingAudio(false);
    };
  }, [question?.id]);

  const startAudioPlayback = async (rate: number) => {
    if (!question) return;
    stopAllAudio();
    setIsPlayingAudio(true);
    await playSpanishAudio(question.questionEs, {
      rate,
      onStart: () => setIsPlayingAudio(true),
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
  };

  const handleToggleAudio = async () => {
    if (!question) return;

    if (isPlayingAudio) {
      stopAllAudio();
      setIsPlayingAudio(false);
      return;
    }

    await startAudioPlayback(playbackRate);
  };

  const handleRateChange = (newRate: number) => {
    setPlaybackRate(newRate);
    if (isPlayingAudio) {
      // Restart playback at the new speed instead of stopping it
      startAudioPlayback(newRate);
    }
  };

  // 1. Error state: Never leave a permanent gray placeholder (Fixes Issue 7)
  if (questionError || (!question && !isLoading)) {
    return (
      <div className="bg-white rounded-3xl border border-rose-200 p-6 sm:p-8 shadow-xs text-center mb-6">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-stone-900 mb-1">
          No se pudo cargar la pregunta
        </h3>
        <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
          {questionError || 'Hubo un problema al conectar con el tutor de IA para generar la pregunta.'}
        </p>
        <button
          type="button"
          onClick={onRetry || onRefreshQuestion}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reintentar cargar pregunta</span>
        </button>
      </div>
    );
  }

  // 2. Loading state while question is actively loading
  if (isLoading || !question) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200/80 p-8 shadow-xs text-center animate-pulse mb-6">
        <div className="h-4 bg-stone-200 rounded-full w-28 mx-auto mb-4"></div>
        <div className="h-8 bg-stone-200 rounded-xl w-3/4 mx-auto mb-3"></div>
        <div className="h-4 bg-stone-100 rounded-full w-1/2 mx-auto mb-6"></div>
        <div className="flex justify-center gap-3">
          <div className="h-10 w-28 bg-stone-200 rounded-full"></div>
          <div className="h-10 w-36 bg-stone-200 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs mb-6 overflow-hidden">
      {/* Decorative accent top line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400"></div>

      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Pregunta del Tutor AI
          </span>
          {question.context && (
            <span className="text-xs text-stone-500 italic hidden sm:inline">
              • {question.context}
            </span>
          )}
        </div>

        {/* Otra pregunta button: Disabled during active evaluation to avoid mixing questions (Fixes Issue 6) */}
        <button
          type="button"
          onClick={onRefreshQuestion}
          disabled={isLoading || isEvaluating}
          className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 rounded-lg hover:bg-stone-100 transition"
          title={isEvaluating ? 'Espera a que termine la evaluación' : 'Generar otra pregunta diferente'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Otra pregunta</span>
        </button>
      </div>

      {/* The Spanish Question Text */}
      <div className="my-3">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight leading-snug">
          {question.questionEs}
        </h2>
      </div>

      {/* Audio Controls and Translation Trigger */}
      <div className="flex flex-wrap items-center gap-2.5 pt-3 pb-1 border-t border-stone-100">
        {/* Listen Button */}
        <button
          type="button"
          onClick={() => handleToggleAudio()}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs ${
            isPlayingAudio
              ? 'bg-rose-500 text-white hover:bg-rose-600 ring-2 ring-rose-400/20'
              : 'bg-amber-500 hover:bg-amber-600 text-white'
          }`}
        >
          {isPlayingAudio ? (
            <>
              <VolumeX className="w-4 h-4 animate-pulse" />
              <span>Detener audio</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              <span>Escuchar en español</span>
            </>
          )}
        </button>

        {/* Speed Selector (1.0x / 0.8x) */}
        <div className="inline-flex rounded-xl bg-stone-100 p-0.5 border border-stone-200/80 text-xs">
          <button
            type="button"
            onClick={() => handleRateChange(1.0)}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              playbackRate === 1.0
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            1.0x Normal
          </button>
          <button
            type="button"
            onClick={() => handleRateChange(0.8)}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              playbackRate === 0.8
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            0.8x Lento
          </button>
        </div>

        {/* Option to show English translation if there is any issue */}
        <button
          type="button"
          onClick={() => setShowEnglishTranslation(!showEnglishTranslation)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
            showEnglishTranslation
              ? 'bg-sky-50 border-sky-300 text-sky-800'
              : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Languages className="w-3.5 h-3.5 text-sky-600" />
          <span>
            {showEnglishTranslation ? 'Ocultar traducción' : 'Mostrar traducción en inglés'}
          </span>
        </button>

        {/* Hints / Starter Phrases Toggle */}
        {question.hints && question.hints.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHints(!showHints)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/60 transition"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
            <span>¿Cómo empezar? ({question.hints.length} ideas)</span>
            {showHints ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* English Translation Panel (conditionally revealed) */}
      {showEnglishTranslation && (
        <div className="mt-4 p-4 rounded-2xl bg-sky-50/70 border border-sky-200/90 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-sky-800 mb-1 flex items-center gap-1">
                <Languages className="w-3.5 h-3.5" />
                <span>English Translation:</span>
              </div>
              <p className="text-base font-medium text-stone-800">
                "{question.questionEn}"
              </p>
            </div>
            <button
              onClick={() => setShowEnglishTranslation(false)}
              className="text-xs text-sky-600 hover:text-sky-800 font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Hints / Starter Phrases Collapsible */}
      {showHints && question.hints && question.hints.length > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
            <span>Frases para ayudarte a responder (Starter phrases):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {question.hints.map((hint, idx) => (
              <div
                key={idx}
                className="bg-white p-2.5 rounded-xl border border-amber-200/70 text-xs font-medium text-stone-800 flex items-center gap-2 shadow-2xs"
              >
                <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-bold">
                  {idx + 1}
                </span>
                <span>{hint}</span>
              </div>
            ))}
          </div>

          {/* Model Answer button */}
          {question.sampleAnswer && (
            <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowSampleAnswer(!showSampleAnswer)}
                className="text-xs font-semibold text-amber-800 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>{showSampleAnswer ? 'Ocultar respuesta modelo' : 'Ver respuesta modelo de ejemplo'}</span>
              </button>
            </div>
          )}

          {showSampleAnswer && question.sampleAnswer && (
            <div className="mt-2 p-3 bg-white rounded-xl border border-amber-200/80 text-xs shadow-2xs">
              <p className="font-semibold text-stone-900 mb-1">
                "{question.sampleAnswer}"
              </p>
              {question.sampleAnswerEn && (
                <p className="text-stone-500 italic">
                  "{question.sampleAnswerEn}"
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
