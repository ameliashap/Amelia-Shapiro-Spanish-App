import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Layers,
  Sparkles,
  Check,
  Sun,
  Plane,
  UtensilsCrossed,
  Briefcase,
  Music,
  ShoppingBag,
} from 'lucide-react';
import { DifficultyLevel, TopicId } from '../types';
import { LEVELS, TOPICS } from '../data/practiceData';

interface LevelTopicSelectorProps {
  currentLevel: DifficultyLevel;
  currentTopic: TopicId;
  onSelectLevel: (level: DifficultyLevel) => void;
  onSelectTopic: (topic: TopicId) => void;
  isLoading: boolean;
}

const TOPIC_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Sun,
  Plane,
  UtensilsCrossed,
  Briefcase,
  Music,
  ShoppingBag,
};

export const LevelTopicSelector: React.FC<LevelTopicSelectorProps> = ({
  currentLevel,
  currentTopic,
  onSelectLevel,
  onSelectTopic,
  isLoading,
}) => {
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);

  const levelRef = useRef<HTMLDivElement>(null);
  const topicRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (levelRef.current && !levelRef.current.contains(event.target as Node)) {
        setLevelDropdownOpen(false);
      }
      if (topicRef.current && !topicRef.current.contains(event.target as Node)) {
        setTopicDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLevel = LEVELS.find((l) => l.id === currentLevel) || LEVELS[0];
  const activeTopic = TOPICS.find((t) => t.id === currentTopic) || TOPICS[0];
  const ActiveTopicIcon = TOPIC_ICONS[activeTopic.icon] || Sparkles;

  return (
    <div className="bg-white/95 rounded-2xl border border-stone-200/80 p-3.5 sm:p-4 shadow-xs mb-6 transition-all">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* 1. Level Dropdown */}
        <div className="flex-1 relative" ref={levelRef}>
          <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1 px-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Nivel (Level)</span>
          </label>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setLevelDropdownOpen(!levelDropdownOpen);
              setTopicDropdownOpen(false);
            }}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100/80 border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              levelDropdownOpen
                ? 'border-amber-400 ring-2 ring-amber-400/20 bg-white'
                : 'border-stone-200/90 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/60">
                {activeLevel.badge}
              </span>
              <div className="truncate">
                <span className="font-semibold text-sm text-stone-900 block truncate">
                  {activeLevel.nameEs}
                </span>
                <span className="text-[11px] text-stone-500 block truncate">
                  {activeLevel.nameEn}
                </span>
              </div>
            </div>

            <ChevronDown
              className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${
                levelDropdownOpen ? 'rotate-180 text-amber-600' : ''
              }`}
            />
          </button>

          {/* Level Dropdown Menu */}
          {levelDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white rounded-2xl border border-stone-200 shadow-lg shadow-stone-200/50 p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
              {LEVELS.map((level) => {
                const isSelected = level.id === currentLevel;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => {
                      onSelectLevel(level.id);
                      setLevelDropdownOpen(false);
                    }}
                    className={`w-full flex items-start justify-between gap-3 p-2.5 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-amber-50 text-stone-900 font-semibold'
                        : 'hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-stone-900">
                          {level.nameEs}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                          {level.badge}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 leading-tight">
                        {level.description}
                      </p>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Topic Dropdown */}
        <div className="flex-1 relative" ref={topicRef}>
          <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1 px-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Tema (Topic)</span>
          </label>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setTopicDropdownOpen(!topicDropdownOpen);
              setLevelDropdownOpen(false);
            }}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100/80 border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              topicDropdownOpen
                ? 'border-orange-400 ring-2 ring-orange-400/20 bg-white'
                : 'border-stone-200/90 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                <ActiveTopicIcon className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="font-semibold text-sm text-stone-900 block truncate">
                  {activeTopic.labelEs}
                </span>
                <span className="text-[11px] text-stone-500 block truncate">
                  {activeTopic.labelEn}
                </span>
              </div>
            </div>

            <ChevronDown
              className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${
                topicDropdownOpen ? 'rotate-180 text-orange-600' : ''
              }`}
            />
          </button>

          {/* Topic Dropdown Menu */}
          {topicDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white rounded-2xl border border-stone-200 shadow-lg shadow-stone-200/50 p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150 max-h-80 overflow-y-auto">
              {TOPICS.map((topic) => {
                const isSelected = topic.id === currentTopic;
                const IconComponent = TOPIC_ICONS[topic.icon] || Sparkles;

                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => {
                      onSelectTopic(topic.id);
                      setTopicDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-orange-50 text-stone-900 font-semibold'
                        : 'hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-orange-500 text-white'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-stone-900 block truncate">
                          {topic.labelEs}
                        </span>
                        <span className="text-xs text-stone-500 block truncate">
                          {topic.labelEn}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-orange-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
