import { DifficultyLevel, TopicInfo } from '../types';

export interface LevelInfo {
  id: DifficultyLevel;
  nameEs: string;
  nameEn: string;
  badge: string;
  description: string;
  color: string;
  accentBg: string;
}

export const LEVELS: LevelInfo[] = [
  {
    id: 'beginner',
    nameEs: 'Principiante',
    nameEn: 'Beginner (A1 - A2)',
    badge: 'A1-A2',
    description: 'Simple sentences, daily routines, present tense, and foundational vocabulary.',
    color: 'emerald',
    accentBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
  {
    id: 'intermediate',
    nameEs: 'Intermedio',
    nameEn: 'Intermediate (B1 - B2)',
    badge: 'B1-B2',
    description: 'Past tenses (pretérito/imperfecto), expressing opinions, subjunctive, and story-telling.',
    color: 'amber',
    accentBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  },
  {
    id: 'advanced',
    nameEs: 'Avanzado',
    nameEn: 'Advanced (C1 - C2)',
    badge: 'C1-C2',
    description: 'Complex debates, idioms, hypothetical scenarios, cultural nuance, and native flow.',
    color: 'rose',
    accentBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  },
];

export const TOPICS: TopicInfo[] = [
  {
    id: 'daily_life',
    labelEs: 'Vida Cotidiana',
    labelEn: 'Daily Life & Routines',
    icon: 'Sun',
    description: 'Hablar de rutinas matutinas, hábitos, horarios y vida en el hogar.',
    badgeColor: 'amber',
  },
  {
    id: 'travel',
    labelEs: 'Viajes y Aventuras',
    labelEn: 'Travel & Vacations',
    icon: 'Plane',
    description: 'Aeropuertos, reservar hoteles, pedir direcciones y destinos soñados.',
    badgeColor: 'sky',
  },
  {
    id: 'food',
    labelEs: 'Comida y Gastronomía',
    labelEn: 'Food & Dining',
    icon: 'UtensilsCrossed',
    description: 'Pedir en un restaurante, recetas tradicionales, tapas y tus platos favoritos.',
    badgeColor: 'orange',
  },
  {
    id: 'school',
    labelEs: 'Estudios y Trabajo',
    labelEn: 'School & Career',
    icon: 'Briefcase',
    description: 'Profesiones, entrevistas, vida estudiantil, proyectos y metas laborales.',
    badgeColor: 'indigo',
  },
  {
    id: 'hobbies',
    labelEs: 'Pasatiempos y Cultura',
    labelEn: 'Hobbies & Culture',
    icon: 'Music',
    description: 'Música latina, películas, deportes, lectura, arte y tiempo libre.',
    badgeColor: 'purple',
  },
  {
    id: 'shopping',
    labelEs: 'Compras y Tiendas',
    labelEn: 'Shopping & Errands',
    icon: 'ShoppingBag',
    description: 'Mercados callejeros, ropa, regateo, supermercados y devoluciones.',
    badgeColor: 'emerald',
  },
];
