import React from 'react';
import { Sparkles, Mic, History, Volume2, Award, BookOpen } from 'lucide-react';
import { DifficultyLevel, TopicId } from '../types';
import { LEVELS } from '../data/practiceData';

interface HeaderProps {
  currentLevel: DifficultyLevel;
  currentTopic: TopicId;
  totalPracticed: number;
  averageScore: number;
  streakCount: number;
  micPermission: 'granted' | 'denied' | 'prompt';
  onRequestMic: () => void;
  onOpenHistory: () => void;
  onOpenSelector: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLevel,
  currentTopic,
  totalPracticed,
  averageScore,
  streakCount,
  micPermission,
  onRequestMic,
  onOpenHistory,
  onOpenSelector,
}) => {
  const currentLevelObj = LEVELS.find((l) => l.id === currentLevel);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* App Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs font-bold text-lg tracking-tight">
            ¡H!
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-stone-900 flex items-center gap-1.5">
                <span>HablaYa</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Español Oral
                </span>
              </h1>
            </div>
            <p className="text-xs text-stone-500 hidden sm:block">
              Práctica de conversación oral con retroalimentación instantánea
            </p>
          </div>
        </div>

        {/* Action Controls & Session Stats */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Practice stats pill */}
          {totalPracticed > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-50/70 border border-amber-200/80 rounded-full text-xs text-amber-900">
              <span className="flex items-center gap-1 font-semibold text-amber-700">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                {averageScore}% prom.
              </span>
              <span className="text-amber-300">|</span>
              <span className="text-stone-600">{totalPracticed} {totalPracticed === 1 ? 'respuesta' : 'respuestas'}</span>
            </div>
          )}

          {/* Microphone status badge */}
          {micPermission === 'denied' ? (
            <button
              onClick={onRequestMic}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
              title="Permiso de micrófono bloqueado. Clic para activar."
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Micrófono bloqueado</span>
            </button>
          ) : micPermission === 'granted' ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80"
              title="Micrófono listo para hablar"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <Mic className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Micrófono activo</span>
            </div>
          ) : (
            <button
              onClick={onRequestMic}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 border border-stone-200 transition"
              title="Permitir acceso al micrófono"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Activar micrófono</span>
            </button>
          )}

          {/* History button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-medium rounded-lg bg-stone-100 hover:bg-stone-200/70 text-stone-700 border border-stone-200 transition"
            title="Ver historial de respuestas"
          >
            <History className="w-4 h-4 text-stone-500" />
            <span className="hidden sm:inline">Historial</span>
            {totalPracticed > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {totalPracticed}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
