import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Languages,
  Volume2,
  VolumeX,
  MessageSquare,
  BookOpen,
} from 'lucide-react';
import { EvaluationResult, PracticeQuestion } from '../types';
import { playSpanishAudio, stopAllAudio } from '../utils/speechSynthesis';

interface FeedbackCardProps {
  evaluation: EvaluationResult;
  question: PracticeQuestion;
  onNextQuestion: () => void;
  onTryAgain: () => void;
  userAudioUrl?: string;
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({
  evaluation,
  question,
  onNextQuestion,
  onTryAgain,
  userAudioUrl,
}) => {
  const [showUserTranslation, setShowUserTranslation] = useState(false);
  const [showTutorTranslation, setShowTutorTranslation] = useState(false);
  const [isPlayingNativeAudio, setIsPlayingNativeAudio] = useState(false);
  const [isPlayingTutorAudio, setIsPlayingTutorAudio] = useState(false);
  const [activeTab, setActiveTab] = useState<'corrections' | 'native' | 'pronunciation'>('corrections');

  const handlePlayNativeAudio = async () => {
    if (isPlayingNativeAudio) {
      stopAllAudio();
      setIsPlayingNativeAudio(false);
      return;
    }
    stopAllAudio();
    setIsPlayingNativeAudio(true);
    await playSpanishAudio(evaluation.betterWay.nativeSpanish, {
      rate: 0.9,
      onStart: () => setIsPlayingNativeAudio(true),
      onEnd: () => setIsPlayingNativeAudio(false),
      onError: () => setIsPlayingNativeAudio(false),
    });
  };

  const handlePlayTutorAudio = async () => {
    if (isPlayingTutorAudio) {
      stopAllAudio();
      setIsPlayingTutorAudio(false);
      return;
    }
    stopAllAudio();
    setIsPlayingTutorAudio(true);
    await playSpanishAudio(evaluation.tutorReply.replyEs, {
      rate: 0.95,
      onStart: () => setIsPlayingTutorAudio(true),
      onEnd: () => setIsPlayingTutorAudio(false),
      onError: () => setIsPlayingTutorAudio(false),
    });
  };

  // Color rating helper
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const isSilent = Boolean(
    evaluation.noSpeechDetected ||
      (evaluation.overallScore === 0 && evaluation.isAudio && evaluation.transcription.includes('No se detectó'))
  );
  const hasMistakes = evaluation.corrections && evaluation.corrections.length > 0;

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-6 sm:p-8 mb-8 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Warning banner if silent recording */}
      {isSilent && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold block mb-0.5">No se detectó voz clara en el micrófono</span>
            La IA no pudo escuchar palabras claras en tu grabación. Asegúrate de que el micrófono esté encendido, habla en voz alta y vuelve a presionar "Intentar de nuevo esta pregunta".
          </div>
        </div>
      )}

      {/* Notice if the response was off-topic */}
      {!isSilent && evaluation.isAccurateAnswer === false && (
        <div className="mb-6 p-4 rounded-2xl bg-orange-50 border border-orange-200 text-orange-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold block mb-0.5">Nota sobre la precisión de tu respuesta</span>
            La IA detectó que tu respuesta no contestó directamente a lo que se preguntaba en "{question.questionEs}". Intenta responder acorde a la pregunta para practicar la conversación de forma auténtica.
          </div>
        </div>
      )}

      {/* 1. Header & Scores Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-200/70">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isSilent
                  ? 'bg-stone-100 text-stone-600 border-stone-300'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {isSilent ? 'Sin voz detectada' : 'Retroalimentación Real de la IA'}
            </span>
            <span className="text-xs text-stone-400">
              {isSilent
                ? 'Grabación vacía o inaudible'
                : hasMistakes
                ? `${evaluation.corrections.length} ${evaluation.corrections.length === 1 ? 'sugerencia' : 'sugerencias'}`
                : '¡Sin errores gramaticales!'}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-stone-900">
            {isSilent
              ? 'Intenta grabar tu respuesta nuevamente'
              : evaluation.praise || 'Evaluación de tu respuesta'}
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            {evaluation.summary}
          </p>
        </div>

        {/* Score Ring / Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`px-4 py-2 rounded-2xl border flex flex-col items-center justify-center font-bold shadow-2xs ${getScoreColor(
              evaluation.overallScore
            )}`}
          >
            <span className="text-2xl sm:text-3xl leading-none">{evaluation.overallScore}</span>
            <span className="text-[10px] uppercase tracking-wider mt-0.5">Puntuación</span>
          </div>

          <div className="grid grid-cols-1 gap-1 text-xs">
            <div className="flex items-center justify-between gap-3 text-stone-500">
              <span>Fluidez:</span>
              <span className="font-semibold text-stone-800">{evaluation.fluencyScore}%</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-stone-500">
              <span>Gramática:</span>
              <span className="font-semibold text-stone-800">{evaluation.grammarScore}%</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-stone-500">
              <span>Vocabulario:</span>
              <span className="font-semibold text-stone-800">{evaluation.vocabularyScore}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Transcription of what was submitted */}
      <div className="my-5 p-4 sm:p-5 rounded-2xl bg-stone-50/70 border border-stone-200/80">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {evaluation.isAudio
                ? 'Lo que dijiste (Transcripción de voz):'
                : 'Lo que escribiste (Texto enviado):'}
            </span>
          </div>

          {/* User audio listen-back if available */}
          {evaluation.isAudio && userAudioUrl && (
            <audio src={userAudioUrl} controls className="h-7 max-w-[200px]" />
          )}
        </div>

        <p className="text-base sm:text-lg font-medium text-stone-900 italic mb-2">
          "{evaluation.transcription}"
        </p>

        {/* Translation toggle button */}
        <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowUserTranslation(!showUserTranslation)}
            className="text-xs font-semibold text-sky-700 hover:text-sky-900 hover:underline flex items-center gap-1.5"
          >
            <Languages className="w-3.5 h-3.5 text-sky-600" />
            <span>
              {showUserTranslation
                ? 'Ocultar traducción al inglés'
                : evaluation.isAudio
                ? 'Ver traducción en inglés de lo que dijiste'
                : 'Ver traducción en inglés de tu texto'}
            </span>
          </button>
        </div>

        {showUserTranslation && (
          <div className="mt-2 p-3 rounded-xl bg-sky-50/70 border border-sky-200 text-xs sm:text-sm text-stone-800">
            <span className="font-bold text-sky-800 block text-[11px] uppercase mb-0.5">
              English Translation:
            </span>
            "{evaluation.transcriptionEn}"
          </div>
        )}
      </div>

      {/* 3. Feedback Tabs: Errores & Mejoras / Cómo Sonar Natural / Pronunciación (only if audio) */}
      <div className="mb-6">
        <div className="flex border-b border-stone-200 gap-2 mb-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('corrections')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'corrections'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Errores y Correcciones ({evaluation.corrections?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('native')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'native'
                ? 'border-orange-500 text-orange-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>Cómo Sonar más Natural</span>
          </button>

          {/* Only render Pronunciation tab when audio was submitted (Fixes Issue 4) */}
          {evaluation.isAudio && evaluation.pronunciationTips && evaluation.pronunciationTips.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('pronunciation')}
              className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'pronunciation'
                  ? 'border-purple-500 text-purple-700'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <BookOpen className="w-4 h-4 text-purple-500" />
              <span>Pronunciación y Fonética</span>
            </button>
          )}
        </div>

        {/* Tab 1: Corrections */}
        {activeTab === 'corrections' && (
          <div>
            {hasMistakes ? (
              <div className="space-y-3">
                {evaluation.corrections.map((corr, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {corr.category || 'gramática'}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                      <div className="text-sm">
                        <span className="text-xs text-rose-500 font-semibold block uppercase">
                          {evaluation.isAudio ? 'Dijiste (Said):' : 'Escribiste (Typed):'}
                        </span>
                        <span className="line-through text-rose-700 font-semibold">
                          {corr.original}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-stone-400 hidden sm:block" />
                      <div className="text-sm">
                        <span className="text-xs text-emerald-700 font-semibold block uppercase">
                          Corrección sugerida:
                        </span>
                        <span className="text-emerald-800 font-bold">
                          {corr.correction}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 bg-white/90 p-2.5 rounded-xl border border-amber-200/60 shadow-2xs">
                      💡 <span className="font-semibold">Regla: </span>
                      {corr.explanation}
                    </p>
                  </div>
                ))}
              </div>
            ) : isSilent ? (
              <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <h4 className="font-bold text-stone-900 text-base">
                  No se detectó audio con voz
                </h4>
                <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto">
                  No se pudieron analizar errores gramaticales porque el micrófono no captó palabras audibles. Por favor intenta responder de nuevo hablando más cerca del micrófono.
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-stone-900 text-base">
                  {evaluation.isAudio
                    ? '¡Excelente respuesta oral!'
                    : '¡Excelente gramática y redacción!'}
                </h4>
                <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto">
                  {evaluation.isAudio
                    ? 'No se detectaron errores gramaticales en lo que dijiste. Tu respuesta fue correcta y comprensible.'
                    : 'No se detectaron errores notables en tu texto. Tu redacción fue gramaticalmente sólida.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Better Way (Reformulation) */}
        {activeTab === 'native' && evaluation.betterWay && (
          <div className="p-5 rounded-2xl bg-orange-50/40 border border-orange-200/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span>Versión Nativa Recomendada:</span>
              </span>

              {/* Native audio playback button */}
              <button
                type="button"
                onClick={handlePlayNativeAudio}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-2xs transition"
              >
                {isPlayingNativeAudio ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                    <span>Detener</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Escuchar como nativo</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-base sm:text-lg font-bold text-stone-900 mb-1.5">
              "{evaluation.betterWay.nativeSpanish}"
            </p>

            <p className="text-xs sm:text-sm text-stone-500 italic mb-3">
              "{evaluation.betterWay.englishTranslation}"
            </p>

            {evaluation.betterWay.whyBetter && (
              <div className="p-3 bg-white rounded-xl border border-orange-200/60 text-xs text-stone-700 shadow-2xs">
                <span className="font-bold text-orange-800">¿Por qué suena mejor? </span>
                {evaluation.betterWay.whyBetter}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Pronunciation Tips (Only shown if audio was provided) */}
        {activeTab === 'pronunciation' && evaluation.isAudio && (
          <div className="space-y-2.5">
            {evaluation.pronunciationTips && evaluation.pronunciationTips.length > 0 ? (
              evaluation.pronunciationTips.map((tip, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-purple-50/40 border border-purple-200/70 text-xs text-stone-800 flex items-start gap-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed">{tip}</p>
                </div>
              ))
            ) : null}
          </div>
        )}
      </div>

      {/* 4. Tutor's Conversational Follow-up */}
      {evaluation.tutorReply && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200/70 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
              <span>Respuesta del Tutor (Conversación):</span>
            </span>

            <button
              type="button"
              onClick={handlePlayTutorAudio}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-2xs transition"
            >
              {isPlayingTutorAudio ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Detener</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Escuchar respuesta</span>
                </>
              )}
            </button>
          </div>

          <p className="text-sm sm:text-base font-semibold text-stone-900 mb-1">
            "{evaluation.tutorReply.replyEs}"
          </p>

          <button
            type="button"
            onClick={() => setShowTutorTranslation(!showTutorTranslation)}
            className="text-[11px] font-semibold text-amber-700 hover:underline flex items-center gap-1 mt-1"
          >
            <Languages className="w-3 h-3" />
            <span>{showTutorTranslation ? 'Ocultar traducción' : 'Traducir al inglés'}</span>
          </button>

          {showTutorTranslation && (
            <p className="text-xs text-stone-500 italic mt-1.5">
              "{evaluation.tutorReply.replyEn}"
            </p>
          )}
        </div>
      )}

      {/* 5. Action Buttons: Next Question / Try Again */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-200/80">
        <button
          type="button"
          onClick={onTryAgain}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs sm:text-sm border border-stone-200 transition"
        >
          <RotateCcw className="w-4 h-4 text-stone-500" />
          <span>Intentar de nuevo esta pregunta</span>
        </button>

        <button
          type="button"
          onClick={onNextQuestion}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition"
        >
          <span>Siguiente Pregunta (Next Question)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
