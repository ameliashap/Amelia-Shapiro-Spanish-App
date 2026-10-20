import React from 'react';
import { X, Award, CheckCircle2, AlertTriangle, Calendar, MessageSquare } from 'lucide-react';
import { PracticeHistoryItem } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: PracticeHistoryItem[];
  onSelectQuestion: (item: PracticeHistoryItem) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectQuestion,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-stone-200/90 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-200/70 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Historial de Respuestas de la Sesión</span>
            </h3>
            <p className="text-xs text-stone-500">
              {history.length} {history.length === 1 ? 'pregunta practicada' : 'preguntas practicadas'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
          {history.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40 text-amber-500" />
              <p className="font-semibold text-sm text-stone-700">
                Aún no has completado ninguna pregunta en esta sesión.
              </p>
              <p className="text-xs mt-1">
                Presiona el botón de micrófono y responde a la pregunta para recibir feedback.
              </p>
            </div>
          ) : (
            history.map((item, index) => {
              const hasMistakes = item.evaluation.corrections?.length > 0;
              return (
                <div
                  key={item.id || index}
                  className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 hover:border-amber-400/60 transition-all cursor-pointer shadow-2xs"
                  onClick={() => {
                    onSelectQuestion(item);
                    onClose();
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Pregunta #{index + 1} • {item.question.level}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {item.evaluation.overallScore}/100 pts
                    </span>
                  </div>

                  <p className="text-sm font-bold text-stone-900 mb-1.5">
                    "{item.question.questionEs}"
                  </p>

                  <div className="p-2.5 rounded-xl bg-white text-xs text-stone-700 mb-2 border border-stone-200/70">
                    <span className="font-semibold text-stone-400 block text-[10px] uppercase">
                      Tu respuesta:
                    </span>
                    "{item.evaluation.transcription}"
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>
                      {hasMistakes
                        ? `${item.evaluation.corrections.length} correcciones`
                        : '¡Sin errores!'}
                    </span>
                    <span className="text-amber-700 font-semibold hover:underline">
                      Ver retroalimentación completa ➔
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

