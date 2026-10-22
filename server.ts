import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON bodies (allow up to 25MB for audio payloads)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize GoogleGenAI SDK for server-side usage
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface FallbackQuestionItem {
  questionEs: string;
  questionEn: string;
  context: string;
  hints: string[];
  sampleAnswer: string;
  sampleAnswerEn: string;
}

// Comprehensive curated fallback questions for ALL levels (beginner, intermediate, advanced) and ALL topics
const FALLBACK_QUESTIONS: Record<string, Record<string, FallbackQuestionItem[]>> = {
  beginner: {
    daily_life: [
      {
        questionEs: "¿A qué hora te levantas normalmente y qué haces por la mañana?",
        questionEn: "What time do you usually get up and what do you do in the morning?",
        context: "Hablando de tus rutinas cotidianas.",
        hints: ["Normalmente me levanto a las...", "Primero me ducho y luego...", "Desayuno un café con..."],
        sampleAnswer: "Normalmente me levanto a las siete de la mañana. Me ducho, tomo un café con leche y desayuno tostadas antes de salir.",
        sampleAnswerEn: "Normally I get up at seven in the morning. I take a shower, have coffee with milk, and eat toast for breakfast before leaving.",
      },
      {
        questionEs: "¿Qué actividades te gusta hacer para relajarte después de un día ocupado?",
        questionEn: "What activities do you like to do to relax after a busy day?",
        context: "Conversando sobre el descanso al final del día.",
        hints: ["Para relajarme me gusta...", "Suelo escuchar música o...", "A veces paseo con..."],
        sampleAnswer: "Para relajarme me gusta leer un libro en el sofá o escuchar música suave. A veces también cocino una cena tranquila.",
        sampleAnswerEn: "To relax, I like to read a book on the couch or listen to soft music. Sometimes I also cook a quiet dinner.",
      },
    ],
    travel: [
      {
        questionEs: "¿Cuál es tu lugar o ciudad favorita para ir de vacaciones y por qué?",
        questionEn: "What is your favorite place or city to go on vacation and why?",
        context: "Hablando de vacaciones y destinos preferidos.",
        hints: ["Mi lugar favorito es...", "Me gusta porque tiene...", "Prefiero la playa porque..."],
        sampleAnswer: "Mi ciudad favorita es Barcelona porque combina una playa hermosa con arquitectura histórica y comida deliciosa.",
        sampleAnswerEn: "My favorite city is Barcelona because it combines a beautiful beach with historic architecture and delicious food.",
      },
    ],
    food: [
      {
        questionEs: "¿Cuál es tu plato de comida preferido y qué ingredientes lleva?",
        questionEn: "What is your favorite food dish and what ingredients does it have?",
        context: "Hablando de gustos culinarios y recetas sencillas.",
        hints: ["Mi plato preferido es...", "Lleva ingredientes como...", "Es muy sabroso y rico."],
        sampleAnswer: "Mi plato preferido son los tacos de pollo. Llevan tortillas de maíz, pechuga de pollo marinada, cebolla, cilantro y un poco de salsa.",
        sampleAnswerEn: "My favorite dish is chicken tacos. They have corn tortillas, marinated chicken breast, onion, cilantro, and a bit of salsa.",
      },
    ],
    school: [
      {
        questionEs: "¿A qué te dedicas o qué materia te gusta más estudiar?",
        questionEn: "What do you do for work or what subject do you like studying most?",
        context: "Presentando tu profesión o estudios a un nuevo compañero.",
        hints: ["Trabajo en el área de...", "Mi materia favorita es...", "Me gusta porque aprendo sobre..."],
        sampleAnswer: "Trabajo como diseñador en una pequeña empresa. Me gusta mucho resolver problemas creativos con mi equipo.",
        sampleAnswerEn: "I work as a designer at a small company. I really enjoy solving creative problems with my team.",
      },
    ],
    hobbies: [
      {
        questionEs: "¿Qué pasatiempos tienes durante los fines de semana?",
        questionEn: "What hobbies do you have during the weekends?",
        context: "Compartiendo cómo pasas tus días libres.",
        hints: ["Los fines de semana suelo...", "Mi pasatiempo principal es...", "A veces salgo a..."],
        sampleAnswer: "Los fines de semana suelo salir a correr por el parque y practicar guitarra. También me gusta ver películas en casa.",
        sampleAnswerEn: "On weekends I usually go running in the park and practice guitar. I also like watching movies at home.",
      },
    ],
    shopping: [
      {
        questionEs: "¿Qué cosas te gusta comprar cuando vas al centro comercial o al mercado?",
        questionEn: "What things do you like to buy when you go to the mall or market?",
        context: "Hablando sobre compras y tiendas.",
        hints: ["Cuando voy de compras busco...", "Me gusta comprar ropa de...", "Prefiero las tiendas pequeñas porque..."],
        sampleAnswer: "Cuando voy de compras me gusta buscar libros usados y ropa cómoda. En el mercado siempre compro fruta fresca.",
        sampleAnswerEn: "When I go shopping I like to look for used books and comfortable clothes. At the market I always buy fresh fruit.",
      },
    ],
  },
  intermediate: {
    daily_life: [
      {
        questionEs: "¿Cómo ha cambiado tu rutina diaria en comparación con la que tenías hace cinco años?",
        questionEn: "How has your daily routine changed compared to the one you had five years ago?",
        context: "Contrastando el presente con hábitos del pasado usando pretérito e imperfecto.",
        hints: ["Antes solía levantarme más temprano...", "Ahora tengo más flexibilidad porque...", "Con el tiempo he aprendido a..."],
        sampleAnswer: "Hace cinco años tenía que viajar una hora para llegar a la oficina todos los días. Ahora trabajo desde casa la mayor parte del tiempo, así que puedo desayunar con más calma y hacer ejercicio.",
        sampleAnswerEn: "Five years ago I had to commute an hour to the office every day. Now I work from home most of the time, so I can have breakfast more calmly and exercise.",
      },
    ],
    travel: [
      {
        questionEs: "¿Qué anécdota o imprevisto curioso te ocurrió durante algún viaje en el pasado?",
        questionEn: "What interesting story or unexpected event happened to you during a trip in the past?",
        context: "Narrando una experiencia pasada con tiempos compuestos y pretérito.",
        hints: ["Una vez cuando viajaba a...", "De repente nos dimos cuenta de que...", "Al final todo salió bien porque..."],
        sampleAnswer: "El año pasado perdí el tren en Madrid porque me confundí de andén. Afortunadamente, conocí a otra persona que iba a Sevilla y compartimos un viaje en coche muy divertido.",
        sampleAnswerEn: "Last year I missed the train in Madrid because I got confused about the platform. Fortunately, I met another person going to Seville and we shared a very fun car ride.",
      },
    ],
    food: [
      {
        questionEs: "Si pudieras abrir un restaurante propio, ¿qué tipo de comida servirías y qué ambiente crearías?",
        questionEn: "If you could open your own restaurant, what kind of food would you serve and what atmosphere would you create?",
        context: "Usando el condicional simple para describir un proyecto hipotético.",
        hints: ["Si abriera un restaurante, serviría...", "Tendría un ambiente cálido con...", "Me gustaría que los clientes sintieran..."],
        sampleAnswer: "Si tuviera mi propio restaurante, serviría tapas tradicionales españolas con un toque moderno. Crearía un ambiente acogedor con música acústica en vivo y luces tenues.",
        sampleAnswerEn: "If I had my own restaurant, I would serve traditional Spanish tapas with a modern touch. I would create a cozy atmosphere with live acoustic music and dim lighting.",
      },
    ],
    school: [
      {
        questionEs: "¿Cuáles son las habilidades más importantes para tener éxito en tu campo profesional hoy en día?",
        questionEn: "What are the most important skills for succeeding in your professional field nowadays?",
        context: "Exponiendo una opinión profesional fundamentada.",
        hints: ["En mi opinión, la capacidad de...", "Hoy en día es fundamental saber...", "Más allá de lo técnico, considero que..."],
        sampleAnswer: "Considero que la adaptabilidad y la comunicación empática son esenciales. La tecnología avanza tan rápido que aprender constantemente es más valioso que dominar una sola herramienta.",
        sampleAnswerEn: "I believe that adaptability and empathetic communication are essential. Technology advances so quickly that continuous learning is more valuable than mastering a single tool.",
      },
    ],
    hobbies: [
      {
        questionEs: "¿Qué libro, película o canción ha dejado una impresión duradera en ti y por qué?",
        questionEn: "What book, film, or song has left a lasting impression on you and why?",
        context: "Analizando una obra cultural y su impacto emocional.",
        hints: ["La película que más me marcó fue...", "Me conmovió porque trata sobre...", "Lo que más valoro de esta obra es..."],
        sampleAnswer: "La película 'El laberinto del fauno' me impactó profundamente por cómo entrelaza la crudeza de la historia real con la fantasía lírica y la inocencia infantil.",
        sampleAnswerEn: "The movie 'Pan's Labyrinth' made a deep impression on me because of how it weaves the harshness of real history with lyrical fantasy and childhood innocence.",
      },
    ],
    shopping: [
      {
        questionEs: "¿Prefieres comprar productos por internet o en tiendas físicas locales? Explica tus razones.",
        questionEn: "Do you prefer buying products online or in local physical shops? Explain your reasons.",
        context: "Comparando ventajas y desventajas con argumentación clara.",
        hints: ["Por un lado, comprar en línea ofrece...", "Sin embargo, en las tiendas locales...", "En conclusión, suelo optar por..."],
        sampleAnswer: "Prefiero comprar ropa y alimentos en tiendas locales para comprobar su calidad directamente y apoyar a los comerciantes del barrio, aunque uso el comercio electrónico para libros difíciles de encontrar.",
        sampleAnswerEn: "I prefer buying clothes and food in local shops to check their quality directly and support neighborhood shopkeepers, although I use e-commerce for hard-to-find books.",
      },
    ],
  },
  advanced: {
    daily_life: [
      {
        questionEs: "¿Hasta qué punto consideras que la omnipresencia de las notificaciones digitales ha erosionado nuestra capacidad de concentración?",
        questionEn: "To what extent do you think the omnipresence of digital notifications has eroded our ability to concentrate?",
        context: "Debatiendo sobre la atención humana en la era de la hiperconectividad.",
        hints: ["Es innegable que la constante interrupción...", "Desde una perspectiva psicológica, opino que...", "Sería conveniente implementar límites como..."],
        sampleAnswer: "A mi juicio, la fragmentación de la atención contemporánea no es un mero inconveniente, sino una transformación estructural de nuestro aparato cognitivo. Al acostumbrarnos a la gratificación inmediata, nos cuesta sumergirnos en reflexiones que exigen contemplación prolongada.",
        sampleAnswerEn: "In my view, the fragmentation of contemporary attention is not merely an inconvenience, but a structural transformation of our cognitive apparatus. Accustomed to immediate gratification, we struggle to immerse ourselves in reflections that demand prolonged contemplation.",
      },
    ],
    travel: [
      {
        questionEs: "¿Cómo equilibrar el desarrollo económico impulsado por el turismo masivo con la preservación cultural y ambiental de las comunidades locales?",
        questionEn: "How can economic development driven by mass tourism be balanced with the cultural and environmental preservation of local communities?",
        context: "Analizando dilemas sociopolíticos complejos relacionados con el turismo.",
        hints: ["Resulta imperativo que las autoridades...", "Si bien el turismo genera divisas cruciales...", "Un modelo sostenible requeriría medidas como..."],
        sampleAnswer: "Resulta imprescindible transitar de un modelo extractivo de masas hacia un turismo regenerativo con cuotas de afluencia reguladas. De lo contrario, las ciudades corren el riesgo de convertirse en parques temáticos vacíos de vida comunitaria genuina.",
        sampleAnswerEn: "It is essential to transition from an extractive mass model toward regenerative tourism with regulated visitor caps. Otherwise, cities risk turning into theme parks devoid of genuine community life.",
      },
    ],
    food: [
      {
        questionEs: "¿De qué manera la gastronomía de un país actúa como embajadora de su identidad histórica y mestizaje cultural?",
        questionEn: "In what way does a country's gastronomy act as an ambassador of its historical identity and cultural blending?",
        context: "Examinando la relación entre historia, cocina y antropología cultural.",
        hints: ["Cada plato tradicional encierra siglos de...", "El intercambio culinario demuestra que...", "A través de ingredientes foráneos integrados..."],
        sampleAnswer: "La cocina es un testimonio vivo de las migraciones y confluencias históricas. En la gastronomía mexicana o peruana, por ejemplo, cada especia narra el encuentro, a menudo conflictivo pero fecundo, entre cosmovisiones indígenas e influencias transatlánticas.",
        sampleAnswerEn: "Cuisine is living testimony to migrations and historical convergences. In Mexican or Peruvian gastronomy, for instance, each spice narrates the encounter, often conflicted yet fertile, between indigenous worldviews and transatlantic influences.",
      },
    ],
    school: [
      {
        questionEs: "¿Qué reformas pedagógicas urgentes deberían implementarse para preparar a las nuevas generaciones frente a la automatización laboral?",
        questionEn: "What urgent educational reforms should be implemented to prepare new generations for workplace automation?",
        context: "Proponiendo soluciones críticas sobre el futuro del trabajo y la educación.",
        hints: ["Más que memorizar datos fácticos, urge...", "El fomento del pensamiento crítico y...", "Una reforma integral debería priorizar..."],
        sampleAnswer: "La escuela tradicional premia la reproducción mecánica, precisamente lo que las máquinas ejecutan con mayor eficiencia. Urge un giro radical hacia el pensamiento crítico, la resolución ética de dilemas y la colaboración interdisciplinaria.",
        sampleAnswerEn: "Traditional schooling rewards mechanical reproduction, precisely what machines execute with superior efficiency. A radical pivot toward critical thinking, ethical dilemma resolution, and interdisciplinary collaboration is urgent.",
      },
    ],
    hobbies: [
      {
        questionEs: "¿Crees que la proliferación de algoritmos de recomendación en la música y el cine enriquece o homogeneiza nuestras preferencias artísticas?",
        questionEn: "Do you believe the proliferation of recommendation algorithms in music and cinema enriches or homogenizes our artistic preferences?",
        context: "Debatiendo el impacto de la curaduría algorítmica en la cultura.",
        hints: ["Aunque facilitan el descubrimiento superficial...", "Paradójicamente, tienden a confinarnos en...", "La serendipia estética queda a menudo supeditada a..."],
        sampleAnswer: "Aunque proporcionan acceso instantáneo a catálogos inabarcables, los algoritmos tienden a optimizar la familiaridad para maximizar la retención. Ello amortigua el asombro y la incomodidad fecunda que suelen provocar las obras artísticas verdaderamente transgresoras.",
        sampleAnswerEn: "Although they provide instant access to fathomless catalogs, algorithms tend to optimize familiarity to maximize retention. This dampens the awe and fruitful discomfort typically provoked by truly transgressive artistic works.",
      },
    ],
    shopping: [
      {
        questionEs: "¿En qué medida el consumismo desenfrenado condiciona nuestra noción del bienestar y qué alternativas viables existen?",
        questionEn: "To what extent does rampant consumerism condition our notion of well-being, and what viable alternatives exist?",
        context: "Reflexionando sobre modelos económicos circulares y ética de consumo.",
        hints: ["La sociedad contemporánea asocia erróneamente...", "Modelos como la economía circular plantean...", "Conviene replantearse si la acumulación material..."],
        sampleAnswer: "La promesa implícita de que la adquisición constante de bienes genera felicidad perdurable se ha revelado como una trampa hedónica. Apostar por la durabilidad, el derecho a reparar y economías comunitarias compartidas es tanto una urgencia ecológica como un acto de cordura.",
        sampleAnswerEn: "The implicit promise that constant acquisition of goods yields enduring happiness has proved to be a hedonic trap. Betting on durability, the right to repair, and shared community economies is both an ecological urgency and an act of sanity.",
      },
    ],
  },
};

// POST /api/practice/question
app.post('/api/practice/question', async (req, res) => {
  const { level = 'beginner', topic = 'daily_life', previousQuestions = [] } = req.body;

  const topicDescriptions: Record<string, string> = {
    daily_life: 'Daily life, personal morning/evening routines, habits, and weekend activities (Vida cotidiana)',
    travel: 'Travel, holidays, airports, hotels, sight-seeing, and dream destinations (Viajes y turismo)',
    food: 'Food, cooking, recipes, dining at restaurants, and traditional cuisine (Comida y gastronomía)',
    school: 'School, university, career, jobs, and workplace situations (Estudios y trabajo)',
    hobbies: 'Hobbies, sports, music, films, books, and leisure activities (Pasatiempos y aficiones)',
    shopping: 'Shopping, clothes, buying souvenirs, supermarkets, and fashion (Compras y tiendas)',
  };

  const topicLabel = topicDescriptions[topic] || topic;

  // Function to safely obtain a matching fallback question for this specific level & topic
  const getMatchingFallback = () => {
    const list = FALLBACK_QUESTIONS[level]?.[topic];
    if (list && list.length > 0) {
      // Pick one that hasn't appeared recently if possible
      const unvisited = list.filter((item) => !previousQuestions.includes(item.questionEs));
      const pick = unvisited.length > 0 ? unvisited[0] : list[0];
      return {
        id: 'fallback-' + level + '-' + topic + '-' + Date.now(),
        level,
        topic,
        questionEs: pick.questionEs,
        questionEn: pick.questionEn,
        context: pick.context,
        hints: pick.hints,
        sampleAnswer: pick.sampleAnswer,
        sampleAnswerEn: pick.sampleAnswerEn, // Genuine translation of the sample answer
      };
    }
    return null;
  };

  if (!apiKey) {
    const fallback = getMatchingFallback();
    if (fallback) return res.json(fallback);
    return res.status(503).json({
      error: `No se pudo generar una pregunta para nivel '${level}' y tema '${topic}'.`,
    });
  }

  const prompt = `You are an expert Spanish conversation coach.
Generate a realistic, engaging oral speaking prompt for a student practicing oral Spanish.

Level: ${level} (beginner = A1/A2 simple vocab and present/simple past; intermediate = B1/B2 past tenses, opinions, subjunctive; advanced = C1/C2 complex nuances, hypothetical, debates, idioms).
Topic: ${topicLabel}
Avoid repeating any of these recent questions: ${JSON.stringify(previousQuestions.slice(-5))}

Requirements:
- questionEs: A direct, warm, conversational question in Spanish tailored to the proficiency level.
- questionEn: Clear, accurate English translation of questionEs.
- context: A brief 1-sentence scenario setting (in English) explaining the situation.
- hints: 3 helpful starter phrases or keywords in Spanish that give the student scaffolding to answer.
- sampleAnswer: A natural, 2-3 sentence model answer in Spanish at the target level.
- sampleAnswerEn: Clear, accurate English translation of sampleAnswer (DO NOT repeat questionEn!).

Respond ONLY with valid JSON following this schema:
{
  "questionEs": "...",
  "questionEn": "...",
  "context": "...",
  "hints": ["...", "...", "..."],
  "sampleAnswer": "...",
  "sampleAnswerEn": "..."
}`;

  try {
    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      responseText = response.text || '';
    } catch (primaryErr: any) {
      console.warn('Question generation primary model failed, trying gemini-3.1-flash-lite:', primaryErr?.message);
      const fallbackModelRes = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      responseText = fallbackModelRes.text || '';
    }

    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);
    if (!parsed.questionEs || !parsed.questionEn) {
      throw new Error('AI returned incomplete question schema.');
    }

    return res.json({
      id: 'q-' + Date.now(),
      level,
      topic,
      questionEs: parsed.questionEs,
      questionEn: parsed.questionEn,
      context: parsed.context || 'Conversational practice',
      hints: parsed.hints || [],
      sampleAnswer: parsed.sampleAnswer || '',
      sampleAnswerEn: parsed.sampleAnswerEn || '',
    });
  } catch (err: any) {
    console.warn('AI question generation failed, using curated fallback for this level and topic:', err?.message || err);
    const fallback = getMatchingFallback();
    if (fallback) {
      return res.json(fallback);
    }
    return res.status(503).json({
      error: `Error al generar la pregunta para nivel '${level}' y tema '${topic}'. Por favor reintenta.`,
    });
  }
});

// POST /api/practice/tts
app.post('/api/practice/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    if (!apiKey) {
      return res.json({ audio: null, message: 'Gemini API key not configured, use browser TTS' });
    }

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style: 'Clear, articulate, natural Spanish language tutor speaking at a comfortable learning pace',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({
        audio: base64Audio,
        mimeType: 'audio/wav',
      });
    }

    return res.json({ audio: null, message: 'No audio returned' });
  } catch (err: any) {
    console.warn('TTS error (will fallback to browser speech synthesis):', err?.message || err);
    return res.json({ audio: null, error: err?.message || 'TTS generation failed' });
  }
});

// Helper function for strict, verbatim audio transcription
async function transcribeAudio(
  audioBase64: string,
  rawMimeType: string
): Promise<{ text: string; noSpeechDetected: boolean }> {
  const cleanBase64 = audioBase64.includes('base64,') ? audioBase64.split('base64,')[1] : audioBase64;
  const cleanMimeType = rawMimeType.split(';')[0].trim() || 'audio/webm';

  const audioPart = {
    inlineData: {
      mimeType: cleanMimeType,
      data: cleanBase64,
    },
  };

  const transcriptionPrompt = `You are a strict, verbatim Spanish audio transcriber.
The speaker is a Spanish LEARNER and the transcript is used to grade their mistakes.
You must preserve every error exactly as spoken:
- Wrong conjugations
- Wrong gender/number agreement
- Missing articles
- English words
- False starts and repetitions

Explicit rule: Never correct the speaker. If they say 'yo es', write 'yo es'.
Mark unclear words as [inaudible] instead of guessing.

RULES:
1. If the audio is silent, background static, breathing, unintelligible noise, or contains NO intelligible words, respond with EXACTLY:
NO_SPEECH_DETECTED
2. If human words are spoken, output ONLY the exact words spoken verbatim. Do NOT correct grammatical errors, do NOT translate, do NOT add commentary, and do NOT put quotes around the text.
3. NEVER fabricate or imagine words. If unsure or if nothing was said, output: NO_SPEECH_DETECTED`;

  let transcribedRaw = '';

  // Attempt using gemini-3.5-transcribe first (recommended for audio transcription tasks)
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [audioPart, { text: transcriptionPrompt }],
      },
      config: {
        temperature: 0.0,
      },
    });
    transcribedRaw = (res.text || '').trim();
  } catch (err: any) {
    const errStr = `${err?.message || ''}`.toLowerCase();
    if (
      errStr.includes('mime') ||
      errStr.includes('format') ||
      errStr.includes('unsupported')
    ) {
      throw err;
    }
    console.warn('gemini-3.5-transcribe failed, trying gemini-3.8-flash for transcription:', err?.message || err);
    const res2 = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [audioPart, { text: transcriptionPrompt }],
      },
      config: {
        temperature: 0.0,
      },
    });
    transcribedRaw = (res2.text || '').trim();
  }

  // Clean up any outer quotes or whitespace
  let cleanText = transcribedRaw.replace(/^["'`]|["'`]$/g, '').trim();

  const isNoSpeech =
    !cleanText ||
    cleanText === 'NO_SPEECH_DETECTED' ||
    cleanText === 'NO_SPEECH' ||
    cleanText.toUpperCase().includes('NO_SPEECH_DETECTED') ||
    cleanText.toLowerCase().includes('no se detect') ||
    cleanText.toLowerCase().includes('no human speech') ||
    cleanText.toLowerCase().includes('no speech detected') ||
    cleanText.toLowerCase().includes('silence') ||
    cleanText.length < 2;

  if (isNoSpeech) {
    return { text: '', noSpeechDetected: true };
  }

  return { text: cleanText, noSpeechDetected: false };
}

function getSilentAudioResponse(questionEs: string, level: string, topic: string) {
  const sample =
    FALLBACK_QUESTIONS[level]?.[topic]?.[0] || FALLBACK_QUESTIONS.beginner.daily_life[0];
  return {
    transcription: '[No se detectó voz en la grabación]',
    transcriptionEn: '[No audible speech detected in recording]',
    noSpeechDetected: true,
    isAccurateAnswer: false,
    overallScore: 0,
    fluencyScore: 0,
    grammarScore: 0,
    vocabularyScore: 0,
    praise: 'No se detectó voz en la grabación.',
    summary:
      'La grabación no contiene palabras audibles en español o estuvo en silencio. El evaluador de IA no puede juzgar tu pronunciación o gramática sin escuchar tu voz. Por favor verifica que tu micrófono funcione, habla con claridad y vuelve a grabar tu respuesta.',
    corrections: [],
    betterWay: {
      nativeSpanish: sample.sampleAnswer,
      englishTranslation: sample.sampleAnswerEn,
      whyBetter: 'Esta es una respuesta modelo para responder adecuadamente a esta pregunta.',
    },
    pronunciationTips: [
      'Asegúrate de hablar a un volumen normal y audible cerca de tu micrófono.',
      'Articula con calma cada sílaba en español.',
    ],
    tutorReply: {
      replyEs: 'No pude escucharte esta vez. ¿Podrías volver a intentarlo hablando en voz alta hacia el micrófono?',
      replyEn: "I couldn't hear you this time. Could you try again speaking out loud into the microphone?",
    },
    isAudio: true,
  };
}

// POST /api/practice/transcribe
// Dedicated audio transcription endpoint to allow step-by-step UI and genuine transcription verification
app.post('/api/practice/transcribe', async (req, res) => {
  try {
    const { audio, mimeType = 'audio/webm' } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'Audio is required for transcription' });
    }

    if (!apiKey || !apiKey.trim()) {
      return res.status(503).json({
        error: 'El servicio de IA no está configurado (falta la clave API de Gemini).',
      });
    }

    const result = await transcribeAudio(audio, mimeType);
    return res.json({
      success: true,
      transcription: result.text,
      noSpeechDetected: result.noSpeechDetected,
    });
  } catch (err: any) {
    console.error('Transcription error:', err);
    const fullErrorStr = `${err?.message || ''} ${JSON.stringify(err?.error || '')}`.toLowerCase();
    if (
      fullErrorStr.includes('mime') ||
      fullErrorStr.includes('unsupported') ||
      fullErrorStr.includes('audio')
    ) {
      return res.status(400).json({
        error: 'El formato de grabación no es compatible. Te sugerimos escribir tu respuesta con el teclado.',
      });
    }
    return res.status(500).json({
      error: 'Error al transcribir la grabación de audio. Por favor intenta de nuevo.',
    });
  }
});

// POST /api/practice/evaluate
// Evaluates oral audio response or typed text response
app.post('/api/practice/evaluate', async (req, res) => {
  try {
    const {
      audio, // base64 string (optional if transcribedText provided)
      mimeType = 'audio/webm',
      transcribedText, // optional pre-transcribed text from step 1
      noSpeechDetected: explicitNoSpeech,
      questionEs,
      questionEn,
      level = 'beginner',
      topic = 'daily_life',
      userText = '',
    } = req.body;

    const isAudio = Boolean(audio) || typeof transcribedText === 'string';

    if (!isAudio && (!userText || !userText.trim())) {
      return res.status(400).json({
        error: 'Se requiere una grabación de voz o un texto para evaluar.',
      });
    }

    // 1. If API key is missing upfront
    if (!apiKey || !apiKey.trim()) {
      return res.status(503).json({
        success: false,
        error: 'El servicio de IA no está configurado (falta la clave API de Gemini).',
      });
    }

    // STEP 1: Handle Audio & Silence Detection with 100% honesty
    let actualStudentText = '';

    if (isAudio) {
      // If the client already flagged explicit no speech, return honest 0-score immediately
      if (explicitNoSpeech === true) {
        return res.json({
          success: true,
          data: getSilentAudioResponse(questionEs, level, topic),
        });
      }

      // If transcribedText is supplied from pre-transcription step
      if (typeof transcribedText === 'string') {
        const trimmed = transcribedText.trim();
        if (!trimmed || trimmed === 'NO_SPEECH_DETECTED') {
          return res.json({
            success: true,
            data: getSilentAudioResponse(questionEs, level, topic),
          });
        }
        actualStudentText = trimmed;
      } else if (audio) {
        // Run dedicated transcription first
        const transResult = await transcribeAudio(audio, mimeType);
        if (transResult.noSpeechDetected || !transResult.text) {
          return res.json({
            success: true,
            data: getSilentAudioResponse(questionEs, level, topic),
          });
        }
        actualStudentText = transResult.text;
      } else {
        return res.status(400).json({ error: 'No se recibió audio ni texto para evaluar.' });
      }
    } else {
      actualStudentText = userText.trim();
    }

    const evaluationSchema = {
      type: Type.OBJECT,
      properties: {
        transcription: {
          type: Type.STRING,
          description:
            'Must match EXACTLY what the student said or typed. Never invent words or modify their answer.',
        },
        transcriptionEn: {
          type: Type.STRING,
          description: 'Faithful English translation of what the student said or typed.',
        },
        noSpeechDetected: {
          type: Type.BOOLEAN,
          description: 'True only if no speech was present (false in this case).',
        },
        isAccurateAnswer: {
          type: Type.BOOLEAN,
          description:
            'True if what the student said actually answers the prompt question accurately and relevantly.',
        },
        overallScore: {
          type: Type.INTEGER,
          description:
            'Score from 0 to 100 based strictly on bands: 90-100 (fully answers, no errors, level-appropriate), 70-89 (answers with minor errors), 50-69 (partly answers or errors affect meaning), 25-49 (barely answers/very short), 0-24 (off-topic or unintelligible).',
        },
        fluencyScore: {
          type: Type.INTEGER,
          description: 'Flow, pacing, and natural sentence construction (0 to 100).',
        },
        grammarScore: {
          type: Type.INTEGER,
          description:
            'Grammatical correctness: conjugations, gender/number agreement, ser/estar, por/para (0 to 100).',
        },
        vocabularyScore: {
          type: Type.INTEGER,
          description: 'Appropriate, natural word choice for the level (0 to 100).',
        },
        praise: {
          type: Type.STRING,
          description:
            'Honest praise mentioning something specific the student actually said. If nothing deserves praise, state so honestly.',
        },
        summary: {
          type: Type.STRING,
          description:
            'Objective assessment of the student answer: accuracy in answering the question, grammatical points, and clarity.',
        },
        corrections: {
          type: Type.ARRAY,
          description:
            'List of actual errors present in what the student said. Empty array [] if no mistakes were made. NEVER invent errors.',
          items: {
            type: Type.OBJECT,
            properties: {
              original: {
                type: Type.STRING,
                description: 'The exact flawed phrase the student used.',
              },
              correction: {
                type: Type.STRING,
                description: 'The corrected phrasing in Spanish.',
              },
              explanation: {
                type: Type.STRING,
                description: 'Clear, concise English explanation of the rule and why it should be changed.',
              },
              category: {
                type: Type.STRING,
                description: 'Category: grammar, vocabulary, agreement, or syntax.',
              },
            },
            required: ['original', 'correction', 'explanation', 'category'],
          },
        },
        betterWay: {
          type: Type.OBJECT,
          description:
            'How a native Spanish speaker would naturally express the student\'s intended message.',
          properties: {
            nativeSpanish: {
              type: Type.STRING,
              description: 'Authentic native Spanish phrasing.',
            },
            englishTranslation: {
              type: Type.STRING,
              description: 'English translation of the native phrasing.',
            },
            whyBetter: {
              type: Type.STRING,
              description: 'English explanation of why this phrasing sounds natural and native.',
            },
          },
          required: ['nativeSpanish', 'englishTranslation', 'whyBetter'],
        },
        pronunciationTips: {
          type: Type.ARRAY,
          description:
            '0 to 3 pronunciation tips. Each tip must name a specific word from the transcript and the specific sound the student got wrong. If pronunciation was fine or if typed text, return an empty array []. Never give generic tips.',
          items: { type: Type.STRING },
        },
        tutorReply: {
          type: Type.OBJECT,
          description:
            'A natural conversational reaction in Spanish continuing the conversation based on the student\'s actual message.',
          properties: {
            replyEs: {
              type: Type.STRING,
              description: 'Conversational reaction in Spanish.',
            },
            replyEn: {
              type: Type.STRING,
              description: 'English translation of tutor reaction.',
            },
          },
          required: ['replyEs', 'replyEn'],
        },
      },
      required: [
        'transcription',
        'transcriptionEn',
        'noSpeechDetected',
        'isAccurateAnswer',
        'overallScore',
        'fluencyScore',
        'grammarScore',
        'vocabularyScore',
        'praise',
        'summary',
        'corrections',
        'betterWay',
        'pronunciationTips',
        'tutorReply',
      ],
    };

    const evaluationPrompt = isAudio
      ? `You are an expert native Spanish language oral examiner assessing a student's spoken response.
The student was asked the following question:
- Question in Spanish: "${questionEs}"
- Question in English: "${questionEn}"
- Target Level: ${level}
- Topic: ${topic}

The student recorded their voice into the microphone.
The VERBATIM audio transcription of what the student ACTUALLY said is:
"${actualStudentText}"

CRITICAL MANDATES:
1. STRICT TRANSCRIPTION ACCURACY:
   - "transcription" MUST BE EXACTLY: "${actualStudentText}".
   - "transcriptionEn" must be a faithful English translation of "${actualStudentText}".
   - "noSpeechDetected" must be false.
   - DO NOT fabricate, assume, or invent words that the student did not say.
2. SCORING RUBRIC (overallScore):
   Score overallScore strictly using the following bands:
   - 90–100: Fully answers the question, no errors, level-appropriate.
   - 70–89: Answers the question with minor errors.
   - 50–69: Partly answers or has several errors that affect meaning.
   - 25–49: Barely answers or is very short.
   - 0–24: Off-topic or unintelligible.
   Align fluencyScore, grammarScore, and vocabularyScore (0–100) consistently with these overallScore bands.
   Set "isAccurateAnswer" to true if their answer is relevant and addresses the prompt question; set to false if off-topic or unintelligible.
3. PRAISE:
   - The praise must mention something specific the student actually said.
   - If nothing deserves praise, say so honestly.
4. CORRECTIONS:
   - Identify real errors in grammar, verb conjugations, gender/number agreement, ser/estar, por/para, or syntax present in "${actualStudentText}".
   - If what they said contains NO grammatical errors, return an empty array []! NEVER invent false errors!
5. PRONUNCIATION TIPS (0 to 3 tips):
   - Listen to the audio recording carefully when judging pronunciation and fluency.
   - Provide 0 to 3 tips. Each tip MUST name a specific word from the transcript and the specific sound the student got wrong.
   - If pronunciation was fine, return an empty array [].
   - Never give generic tips.
6. BETTER WAY:
   - Show how an authentic native Spanish speaker would naturally express the student's intended answer to "${questionEs}".
7. TUTOR REPLY:
   - Friendly 1-2 sentence conversational Spanish reaction responding directly to the specific meaning of "${actualStudentText}".`
      : `You are an expert native Spanish language tutor assessing a student's written response submitted via keyboard.
- The student typed: "${actualStudentText}"
- Transcribe EXACTLY what the student typed: "${actualStudentText}".
- ACCURACY: Check if what the student typed accurately answers "${questionEs}". Set "isAccurateAnswer" accordingly.
- SCORING RUBRIC (overallScore):
  - 90–100: Fully answers the question, no errors, level-appropriate.
  - 70–89: Answers the question with minor errors.
  - 50–69: Partly answers or has several errors that affect meaning.
  - 25–49: Barely answers or is very short.
  - 0–24: Off-topic or unintelligible.
- PRAISE: Must mention something specific the student actually typed. If nothing deserves praise, say so honestly.
- CORRECTIONS: Identify specific grammar or spelling errors in their typed text. If none, return [].
- PRONUNCIATION: The student typed their response. Set "pronunciationTips" to [] (EMPTY ARRAY). Do not invent pronunciation comments.
- NATIVE REFORMULATION: Provide natural native Spanish phrasing.
- TUTOR REPLY: Friendly Spanish follow-up reacting to what they wrote.

Context:
- Target Question (Spanish): "${questionEs}"
- Target Question (English): "${questionEn}"
- Target Student Level: ${level}
- Topic: ${topic}`;

    // Prepare audio part if audio is available so the evaluator actually hears the recording
    let audioPart: { inlineData: { mimeType: string; data: string } } | null = null;
    if (audio && typeof audio === 'string' && audio.trim()) {
      const cleanBase64 = audio.includes('base64,') ? audio.split('base64,')[1] : audio;
      const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';
      audioPart = {
        inlineData: {
          mimeType: cleanMimeType,
          data: cleanBase64,
        },
      };
    }

    const evaluationContents = audioPart
      ? { parts: [audioPart, { text: evaluationPrompt }] }
      : evaluationPrompt;

    // Call Gemini with thinkingLevel MEDIUM and fallback to gemini-3.1-flash-lite if primary is temporarily busy
    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: evaluationContents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: evaluationSchema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      });
      responseText = response.text || '';
    } catch (primaryErr: any) {
      console.warn('Primary evaluation model error, attempting gemini-3.1-flash-lite fallback:', primaryErr?.message || primaryErr);
      const fallbackRes = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: evaluationContents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: evaluationSchema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      });
      responseText = fallbackRes.text || '';
    }

    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.overallScore !== 'number') {
      throw new Error('Formato de evaluación devuelto por la IA no es válido.');
    }

    // GROUNDING CHECKS IN CODE:
    // 1. Overwrite parsed.transcription with the actual transcript string (don't trust the model to copy it).
    parsed.transcription = actualStudentText;

    // 2. Remove any item in parsed.corrections whose "original" text does not appear in the transcript (case-insensitive).
    if (Array.isArray(parsed.corrections)) {
      const lowerTranscript = actualStudentText.toLowerCase();
      parsed.corrections = parsed.corrections.filter((item: any) => {
        if (!item || typeof item.original !== 'string') return false;
        const orig = item.original.trim().toLowerCase();
        return orig.length > 0 && lowerTranscript.includes(orig);
      });
    } else {
      parsed.corrections = [];
    }

    if (!Array.isArray(parsed.pronunciationTips)) {
      parsed.pronunciationTips = [];
    }

    // Attach isAudio flag explicitly to response
    parsed.isAudio = isAudio;

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (err: any) {
    console.error('Error in /api/practice/evaluate:', err);

    const errorMessage = String(err?.message || err?.error?.message || err || '').toLowerCase();
    const errorStatus = err?.status || err?.statusCode || err?.code;
    const errorDetails = JSON.stringify(err?.error || err?.details || '').toLowerCase();
    const fullErrorStr = `${errorMessage} ${errorDetails}`;

    // 1. If the API key is missing or invalid, return a message saying the AI isn't configured
    if (
      !apiKey ||
      !apiKey.trim() ||
      fullErrorStr.includes('api_key') ||
      fullErrorStr.includes('api key') ||
      fullErrorStr.includes('unauthenticated') ||
      fullErrorStr.includes('permission_denied') ||
      errorStatus === 401
    ) {
      return res.status(503).json({
        success: false,
        error: 'El servicio de IA no está configurado.',
      });
    }

    // 2. If Gemini rejects the audio format, say the recording format isn't supported and suggest typing instead
    const isAudioFormatRejected =
      fullErrorStr.includes('unsupported mime type') ||
      fullErrorStr.includes('unsupported media type') ||
      fullErrorStr.includes('unsupported audio format') ||
      fullErrorStr.includes('audio format') ||
      fullErrorStr.includes('mime_type') ||
      fullErrorStr.includes('mimetype') ||
      fullErrorStr.includes('invalid audio') ||
      fullErrorStr.includes('decode audio') ||
      fullErrorStr.includes('audio encoding') ||
      fullErrorStr.includes('unsupported format') ||
      (fullErrorStr.includes('invalid_argument') &&
        (fullErrorStr.includes('inline_data') || fullErrorStr.includes('audio')));

    if (isAudioFormatRejected) {
      return res.status(400).json({
        success: false,
        error:
          'El formato de la grabación no es compatible con el evaluador. Te sugerimos escribir tu respuesta con el teclado.',
      });
    }

    // 3. Only use the "temporary overload, please retry" message for actual rate-limit or server-busy errors
    const isRateLimitOrBusy =
      errorStatus === 429 ||
      errorStatus === 503 ||
      errorStatus === 504 ||
      fullErrorStr.includes('resource_exhausted') ||
      fullErrorStr.includes('rate limit') ||
      fullErrorStr.includes('quota') ||
      fullErrorStr.includes('unavailable') ||
      fullErrorStr.includes('overloaded') ||
      fullErrorStr.includes('high demand') ||
      fullErrorStr.includes('server is busy') ||
      fullErrorStr.includes('service unavailable') ||
      fullErrorStr.includes('timed out') ||
      fullErrorStr.includes('timeout');

    if (isRateLimitOrBusy) {
      return res.status(503).json({
        success: false,
        error:
          'El evaluador de IA no pudo procesar tu respuesta en este momento debido a una sobrecarga temporal. Por favor presiona "Reintentar evaluación".',
      });
    }

    // 4. Other general errors (e.g. invalid response JSON from AI, unexpected error)
    return res.status(500).json({
      success: false,
      error: err?.message
        ? `Error al evaluar la respuesta: ${err.message}`
        : 'Ocurrió un error inesperado al procesar tu respuesta. Por favor intenta de nuevo.',
    });
  }
});

// Start server and configure Vite middleware in development
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`HablaYa Spanish Practice Server running on port ${PORT}`);
  });
}

startServer();
