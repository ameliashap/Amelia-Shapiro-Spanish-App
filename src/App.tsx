import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { LevelTopicSelector } from './components/LevelTopicSelector';
import { QuestionCard } from './components/QuestionCard';
import { VoiceRecorder } from './components/VoiceRecorder';
import { FeedbackCard } from './components/FeedbackCard';
import { HistoryModal } from './components/HistoryModal';
import { DifficultyLevel, TopicId, PracticeQuestion, EvaluationResult, PracticeHistoryItem } from './types';
import { AudioRecorder } from './utils/audioRecorder';
import { stopAllAudio } from './utils/speechSynthesis';
import { Sparkles, AlertCircle, RotateCcw } from 'lucide-react';

export default function App() {
  const [currentLevel, setCurrentLevel] = useState<DifficultyLevel>('beginner');
  const [currentTopic, setCurrentTopic] = useState<TopicId>('daily_life');
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationStage, setEvaluationStage] = useState<'idle' | 'transcribing' | 'evaluating'>('idle');
  const [transcriptionPreview, setTranscriptionPreview] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [currentUserAudioUrl, setCurrentUserAudioUrl] = useState<string | undefined>(undefined);

  const [history, setHistory] = useState<PracticeHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Track the active question ID to discard any stale in-flight evaluations (Fixes Issue 6)
  const activeQuestionIdRef = useRef<string | null>(null);
  // Store the last failed payload so user can retry without losing their recording (Fixes Issue 1)
  const lastFailedSubmissionRef = useRef<{
    audioBase64?: string;
    mimeType?: string;
    userText?: string;
    audioBlob?: Blob;
    duration?: number;
    isPracticallySilent?: boolean;
  } | null>(null);

  // Check microphone permissions on mount
  useEffect(() => {
    const checkMic = async () => {
      const recorder = new AudioRecorder();
      const status = await recorder.checkPermission();
      setMicPermission(status);
    };
    checkMic();
  }, []);

  const requestMicPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission('granted');
      return true;
    } catch (err) {
      console.warn('Microphone permission denied or failed:', err);
      setMicPermission('denied');
      return false;
    }
  };

  // Fetch question from server
  const loadQuestion = useCallback(
    async (level: DifficultyLevel, topic: TopicId, prevList: string[] = previousQuestions) => {
      stopAllAudio();
      setIsLoadingQuestion(true);
      setQuestionError(null);
      setEvaluation(null);
      setEvaluationError(null);
      setCurrentUserAudioUrl(undefined);
      setEvaluationStage('idle');
      setTranscriptionPreview(null);
      lastFailedSubmissionRef.current = null;

      try {
        const response = await fetch('/api/practice/question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level,
            topic,
            previousQuestions: prevList,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'No se pudo cargar la pregunta del servidor.');
        }

        const data: PracticeQuestion = await response.json();
        setQuestion(data);
        activeQuestionIdRef.current = data.id;
        setPreviousQuestions((prev) => [...prev, data.questionEs]);
      } catch (err: any) {
        console.error('Error fetching question:', err);
        setQuestionError(
          err.message || 'Error al conectar con el tutor de IA para cargar la pregunta.'
        );
      } finally {
        setIsLoadingQuestion(false);
      }
    },
    [previousQuestions]
  );

  // Load initial question on mount
  useEffect(() => {
    loadQuestion('beginner', 'daily_life', []);
  }, []);

  // Prevent changing level or topic during active evaluation to avoid mixing up questions (Fixes Issue 6)
  const handleSelectLevel = (newLevel: DifficultyLevel) => {
    if (isEvaluating || isLoadingQuestion) return;
    if (newLevel === currentLevel && question) return;
    setCurrentLevel(newLevel);
    loadQuestion(newLevel, currentTopic);
  };

  const handleSelectTopic = (newTopic: TopicId) => {
    if (isEvaluating || isLoadingQuestion) return;
    if (newTopic === currentTopic && question) return;
    setCurrentTopic(newTopic);
    loadQuestion(currentLevel, newTopic);
  };

  const handleRefreshQuestion = () => {
    if (isEvaluating || isLoadingQuestion) return;
    loadQuestion(currentLevel, currentTopic);
  };

  const handleSubmitEvaluation = async (payload: {
    audioBase64?: string;
    mimeType?: string;
    userText?: string;
    audioBlob?: Blob;
    duration?: number;
    isPracticallySilent?: boolean;
  }) => {
    if (!question) return;

    const targetQuestionId = question.id;
    lastFailedSubmissionRef.current = payload;

    stopAllAudio();
    setIsEvaluating(true);
    setEvaluationError(null);
    setTranscriptionPreview(null);

    let audioUrl: string | undefined = undefined;
    if (payload.audioBlob) {
      audioUrl = URL.createObjectURL(payload.audioBlob);
      setCurrentUserAudioUrl(audioUrl);
    }

    try {
      let evalResult: EvaluationResult;

      if (payload.audioBase64) {
        // STEP 1: Dedicated Audio Transcription
        setEvaluationStage('transcribing');

        const transResponse = await fetch('/api/practice/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio: payload.audioBase64,
            mimeType: payload.mimeType || 'audio/webm',
          }),
        });

        // If user changed question while in flight, discard response
        if (activeQuestionIdRef.current !== targetQuestionId) {
          console.warn('Transcription response received for discarded question, ignoring.');
          return;
        }

        if (!transResponse.ok) {
          const transErr = await transResponse.json().catch(() => ({}));
          throw new Error(
            transErr.error || 'Error al transcribir la grabación de voz. Por favor intenta de nuevo.'
          );
        }

        const transData = await transResponse.json();

        // If audio was empty/silent or no human speech detected:
        if (transData.noSpeechDetected || !transData.transcription) {
          // Send explicit noSpeechDetected to evaluate endpoint to get honest 0-score assessment
          const evalResponse = await fetch('/api/practice/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio: payload.audioBase64,
              mimeType: payload.mimeType || 'audio/webm',
              noSpeechDetected: true,
              questionEs: question.questionEs,
              questionEn: question.questionEn,
              level: question.level,
              topic: question.topic,
            }),
          });

          if (activeQuestionIdRef.current !== targetQuestionId) return;

          if (!evalResponse.ok) {
            const errJson = await evalResponse.json().catch(() => ({}));
            throw new Error(errJson.error || 'No se pudo generar la retroalimentación.');
          }

          const resData = await evalResponse.json();
          evalResult = resData.data;
        } else {
          // STEP 2: Genuine speech was transcribed! Now evaluate ONLY what was actually spoken.
          const cleanTranscript = transData.transcription.trim();
          setTranscriptionPreview(cleanTranscript);
          setEvaluationStage('evaluating');

          const evalResponse = await fetch('/api/practice/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcribedText: cleanTranscript,
              audio: payload.audioBase64,
              mimeType: payload.mimeType || 'audio/webm',
              questionEs: question.questionEs,
              questionEn: question.questionEn,
              level: question.level,
              topic: question.topic,
            }),
          });

          if (activeQuestionIdRef.current !== targetQuestionId) return;

          if (!evalResponse.ok) {
            const errJson = await evalResponse.json().catch(() => ({}));
            throw new Error(
              errJson.error || 'El evaluador de IA no pudo evaluar tu respuesta. Por favor intenta de nuevo.'
            );
          }

          const resData = await evalResponse.json();
          evalResult = resData.data;
        }
      } else {
        // Text mode submission
        setEvaluationStage('evaluating');
        const evalResponse = await fetch('/api/practice/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userText: payload.userText,
            questionEs: question.questionEs,
            questionEn: question.questionEn,
            level: question.level,
            topic: question.topic,
          }),
        });

        if (activeQuestionIdRef.current !== targetQuestionId) return;

        if (!evalResponse.ok) {
          const errJson = await evalResponse.json().catch(() => ({}));
          throw new Error(
            errJson.error || 'El evaluador de IA no pudo evaluar tu texto. Por favor intenta de nuevo.'
          );
        }

        const resData = await evalResponse.json();
        evalResult = resData.data;
      }

      setEvaluation(evalResult);
      lastFailedSubmissionRef.current = null;

      // Record in session history
      const historyItem: PracticeHistoryItem = {
        id: 'hist-' + Date.now(),
        timestamp: Date.now(),
        question,
        evaluation: evalResult,
        userAudioUrl: audioUrl,
        userText: payload.userText,
      };

      setHistory((prev) => [historyItem, ...prev]);

      window.scrollTo({
        top: 350,
        behavior: 'smooth',
      });
    } catch (err: any) {
      console.error('Evaluation error:', err);
      // Show honest error message and keep retry available (Fixes Issue 1)
      setEvaluationError(
        err.message || 'Error al comunicarse con el evaluador de IA. Por favor intenta de nuevo.'
      );
    } finally {
      setIsEvaluating(false);
      setEvaluationStage('idle');
    }
  };

  const handleRetryFailedEvaluation = () => {
    if (lastFailedSubmissionRef.current) {
      handleSubmitEvaluation(lastFailedSubmissionRef.current);
    }
  };

  const handleNextQuestion = () => {
    loadQuestion(currentLevel, currentTopic);
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleTryAgain = () => {
    stopAllAudio();
    setEvaluation(null);
    setCurrentUserAudioUrl(undefined);
    setEvaluationError(null);
    lastFailedSubmissionRef.current = null;
  };

  const handleSelectHistoryItem = (item: PracticeHistoryItem) => {
    if (isEvaluating) return;
    setQuestion(item.question);
    if (item.question.level) {
      setCurrentLevel(item.question.level as DifficultyLevel);
    }
    if (item.question.topic) {
      setCurrentTopic(item.question.topic as TopicId);
    }
    activeQuestionIdRef.current = item.question.id;
    setEvaluation(item.evaluation);
    setCurrentUserAudioUrl(item.userAudioUrl);
    setEvaluationError(null);
  };

  // Stats calculation
  const totalPracticed = history.length;
  const averageScore =
    totalPracticed > 0
      ? Math.round(
          history.reduce((acc, curr) => acc + (curr.evaluation.overallScore || 0), 0) /
            totalPracticed
        )
      : 0;

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 flex flex-col font-sans transition-colors selection:bg-amber-100 selection:text-amber-900">
      {/* App Header */}
      <Header
        currentLevel={currentLevel}
        currentTopic={currentTopic}
        totalPracticed={totalPracticed}
        averageScore={averageScore}
        streakCount={totalPracticed}
        micPermission={micPermission}
        onRequestMic={requestMicPermission}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSelector={() => {}}
      />

      {/* Main Learning Workspace */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7">
        {/* Welcome / Level & Topic Selection Section */}
        <section aria-label="Selección de Nivel y Tema">
          <LevelTopicSelector
            currentLevel={currentLevel}
            currentTopic={currentTopic}
            onSelectLevel={handleSelectLevel}
            onSelectTopic={handleSelectTopic}
            isLoading={isLoadingQuestion || isEvaluating}
          />
        </section>

        {/* Evaluation Error Banner with Honest Retry Button (Fixes Issue 1) */}
        {evaluationError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block sm:inline">No se pudo completar la evaluación: </span>
                <span className="text-xs sm:text-sm">{evaluationError}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {lastFailedSubmissionRef.current && (
                <button
                  type="button"
                  onClick={handleRetryFailedEvaluation}
                  disabled={isEvaluating}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shadow-2xs disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
                  <span>{isEvaluating ? 'Reintentando...' : 'Reintentar evaluación'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setEvaluationError(null)}
                className="text-stone-400 hover:text-stone-600 px-1 font-bold text-sm"
                title="Cerrar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Question Prompt Card with error handling and retry (Fixes Issue 7 & Issue 6) */}
        <QuestionCard
          question={question}
          isLoading={isLoadingQuestion}
          isEvaluating={isEvaluating}
          questionError={questionError}
          onRefreshQuestion={handleRefreshQuestion}
          onRetry={() => loadQuestion(currentLevel, currentTopic)}
        />

        {/* Voice Recorder with Question ID reset (Fixes Issue 5 & 6) */}
        {!evaluation && question && (
          <VoiceRecorder
            questionId={question.id}
            isEvaluating={isEvaluating}
            evaluationStage={evaluationStage}
            transcriptionPreview={transcriptionPreview}
            onSubmit={handleSubmitEvaluation}
            onRequestMicPermission={requestMicPermission}
            micPermission={micPermission}
          />
        )}

        {/* Feedback Section (Transcribed speech, mistakes, improvements, next question) */}
        {evaluation && question && (
          <FeedbackCard
            evaluation={evaluation}
            question={question}
            onNextQuestion={handleNextQuestion}
            onTryAgain={handleTryAgain}
            userAudioUrl={currentUserAudioUrl}
          />
        )}

        {/* Motivational Learning Footer Tips */}
        <div className="mt-8 p-4 rounded-2xl bg-white/80 border border-stone-200/80 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Consejo de aprendizaje:</strong> Hablar en voz alta y corregir tus propios errores es la forma más rápida de alcanzar fluidez en español.
            </span>
          </div>
          <span className="text-stone-400 shrink-0">HablaYa • Oral Spanish Practice</span>
        </div>
      </main>

      {/* History Drawer Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectQuestion={handleSelectHistoryItem}
      />
    </div>
  );
}
