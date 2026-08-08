import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API client on the server side with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to call Gemini models with fallback if primary model reaches rate limits or errors
async function callGeminiWithFallback(params: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
}) {
  const models = ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError = null;

  for (const model of models) {
    try {
      const config: any = {};
      if (params.systemInstruction) config.systemInstruction = params.systemInstruction;
      if (params.responseMimeType) config.responseMimeType = params.responseMimeType;
      if (params.responseSchema) config.responseSchema = params.responseSchema;

      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config,
      });
      return response;
    } catch (err: any) {
      console.warn(`Gemini call failed for model ${model}:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError;
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Endpoint: Evaluate user response & provide instant AI German coaching feedback
app.post('/api/chat/evaluate', async (req, res) => {
  const { targetWord, userAnswer, questionType } = req.body || {};

  if (!targetWord || !userAnswer) {
    return res.status(400).json({ error: 'Missing targetWord or userAnswer' });
  }

  try {
    const systemInstruction = `
أنت معلم لغة ألمانية خبير وودود اسمه "DeutschMeister".
مهمتك الرئيسية هي التقييم والتصحيح الفوري لإجابات المتعلمين العرب في مستوى A1 بالألمانية.

تحليل إجابة المستخدم بناءً على الكلمة المستهدفة (${targetWord.word}):
- نوع الكلمة: ${targetWord.type}
- الجنس القواعدي المتوقع: ${targetWord.gender || 'لا يوجد'}
- صيغة الجمع المتوقعة: ${targetWord.plural || 'لا يوجد'}
- الترجمة العربية: ${targetWord.translationAr}
- الأفعال الشاذة (المضارع/الماضي/التام): ${targetWord.present3rd || ''} / ${targetWord.praeteritum || ''} / ${targetWord.perfekt || ''}
- عكس الصفة: ${targetWord.antonym || ''}
- حالة حرف الجر: ${targetWord.case || ''}

المطلوب منك إرجاع التقييم بدقة عالية بصيغة JSON تحتوي على:
1. isCorrect: boolean (هل الإجابة صحيحة أو مقبولة تماماً)
2. overallScore: number (من 0 إلى 100)
3. feedbackAr: شرح وتغذية راجعة فورية ولطيفة باللغة العربية تشرح سبب صحة أو خطأ الإجابة.
4. feedbackDe: توضيح قصير جداً باللغة الألمانية
5. grammarTipAr: قاعدة قواعدية مفيدة تشرح هذه الحالة (مثلاً: قواعد نهاية الأسماء وحروف الجر)
6. mnemonicTipAr: حيلة ذكية أو خدعة بصرية لتذكر هذه الكلمة بسهولة.
7. masteryDelta: عدد (+20 للإجابة الصحيحة تماماً، +10 للإجابة الجزئية، -10 للخطأ).
8. nextQuestionText: سؤال جديد مشجع يختبر كلمة جديدة أو نفس الكلمة إذا أخطأ المستخدم.
`;

    const prompt = `
الكلمة المستهدفة: "${targetWord.word}" (${targetWord.type})
نوع السؤال المطلوب: ${questionType || 'comprehensive'}
إجابة المستخدم: "${userAnswer}"

قم بتمحيص إجابة المستخدم وتقييمها.
    `;

    const response = await callGeminiWithFallback({
      contents: prompt,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isCorrect: { type: Type.BOOLEAN },
          overallScore: { type: Type.NUMBER },
          feedbackAr: { type: Type.STRING },
          feedbackDe: { type: Type.STRING },
          grammarTipAr: { type: Type.STRING },
          mnemonicTipAr: { type: Type.STRING },
          masteryDelta: { type: Type.NUMBER },
          nextQuestionText: { type: Type.STRING },
        },
        required: ['isCorrect', 'overallScore', 'feedbackAr', 'grammarTipAr', 'masteryDelta'],
      },
    });

    const parsedJson = JSON.parse(response.text || '{}');
    return res.json(parsedJson);
  } catch (error: any) {
    console.warn('Gemini Chat Evaluate fallback used:', error?.message);
    const cleanAnswer = String(userAnswer || '').trim().toLowerCase();
    const cleanWord = String(targetWord.word || '').trim().toLowerCase();
    const isMatch = cleanAnswer.includes(cleanWord);

    return res.json({
      isCorrect: isMatch,
      overallScore: isMatch ? 88 : 40,
      feedbackAr: isMatch
        ? `أحسنت! إجابتك تشتمل على الكلمة المستهدفة "${targetWord.word}".`
        : `حاول استخدام الكلمة المطلوبة "${targetWord.word}" (${targetWord.translationAr}) في إجابتك.`,
      feedbackDe: isMatch ? 'Gut gemacht!' : 'Versuche es noch einmal!',
      grammarTipAr: `الكلمة "${targetWord.word}" نوعها (${targetWord.type})${targetWord.gender ? ` وأداتها ${targetWord.gender}` : ''}.`,
      mnemonicTipAr: `ربط الكلمة بالمعنى العربي: ${targetWord.translationAr}`,
      masteryDelta: isMatch ? 15 : -5,
      nextQuestionText: `ممتاز! استمر في الممارسة والتمرن على مفردات جديدة.`,
    });
  }
});

// Endpoint: Generate a sentence translation task in English & Arabic targeting a low-mastery German word
app.post('/api/sentences/generate', async (req, res) => {
  const { targetWord } = req.body || {};

  if (!targetWord || !targetWord.word) {
    return res.status(400).json({ error: 'Missing targetWord' });
  }

  try {
    const systemInstruction = `
أنت معلم لغة ألمانية متخصص في بناء الجمل وتطوير إتقان المفردات لمستوى A1.
قم بإنشاء جملة بسيطة جداً باللغة الإنجليزية واللغة العربية تتطلب استخدام الكلمة الألمانية المستهدفة ("${targetWord.word}") عند ترجمتها إلى الألمانية.

الكلمة المستهدفة:
- الكلمة: ${targetWord.gender ? targetWord.gender + ' ' : ''}${targetWord.word}
- نوع الكلمة: ${targetWord.type}
- الترجمة العربية: ${targetWord.translationAr}
- الجملة النموذجية: ${targetWord.exampleDe || ''}

أرجع نتيجة JSON تحتوي على:
1. sentenceEn: جملة إنجليزية بسيطة لمستوى A1 تشتمل على معنى الكلمة.
2. sentenceAr: الترجمة العربية للجملة لتسهيل الفهم.
3. suggestedKeywordsDe: قائمة بـ 2 إلى 3 كلمات ألمانية مساعدة لاستخدامها في الجملة.
4. grammarHintAr: تلميح قواعدي قصير بالعربية فقط (مثل: "تذكر أداة التعريف" أو "الفعل في المرتبة الثانية").
`;

    const response = await callGeminiWithFallback({
      contents: `ولّد جملة لممارسة الكلمة الألمانية: "${targetWord.word}"`,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentenceEn: { type: Type.STRING },
          sentenceAr: { type: Type.STRING },
          suggestedKeywordsDe: { type: Type.ARRAY, items: { type: Type.STRING } },
          grammarHintAr: { type: Type.STRING },
        },
        required: ['sentenceEn', 'sentenceAr', 'grammarHintAr'],
      },
    });

    const taskData = JSON.parse(response.text || '{}');
    return res.json(taskData);
  } catch (error: any) {
    console.warn('Generate Sentence Task fallback used:', error?.message);
    const exampleAr = targetWord.exampleAr || `أنا أستخدم ${targetWord.translationAr}.`;

    return res.json({
      sentenceEn: targetWord.translationEn
        ? `Please translate: "${targetWord.translationEn}"`
        : `Translate a sentence using "${targetWord.word}"`,
      sentenceAr: `ترجم المعنى إلى الألمانية: "${exampleAr}"`,
      suggestedKeywordsDe: [targetWord.word],
      grammarHintAr: `تأكد من موقع الفعل في المرتبة الثانية ومراعاة أدوات التعريف.`,
    });
  }
});

// Endpoint: Evaluate user's translated German sentence with detailed Arabic feedback
app.post('/api/sentences/evaluate', async (req, res) => {
  const { targetWord, sentenceEn, userGerman } = req.body || {};

  if (!targetWord || !userGerman) {
    return res.status(400).json({ error: 'Missing targetWord or userGerman' });
  }

  try {
    const systemInstruction = `
أنت معلم لغة ألمانية تدقق وترجع ملاحظات فورية بالعربية فقط لمستخدم عربي يتعلم اللغة الألمانية (مستوى A1).
الجملة المطلوبة للترجمة من الإنجليزية: "${sentenceEn || ''}"
الكلمة الألمانية المستهدفة التي يجب توظيفها: "${targetWord.gender ? targetWord.gender + ' ' : ''}${targetWord.word}" (${targetWord.type})
ترجمة الكلمة المستهدفة: ${targetWord.translationAr}

إجابة المتعلم الألمانية: "${userGerman}"

المطلوب إرجاع كائن JSON دقيق يحتوي على:
1. isCorrect: boolean (هل الجملة صحيحة قواعدياً ومفهومة تماماً وتستخدم الكلمة بالشكل الصحيح)
2. accuracyScore: number (نسبة الدقة من 0 إلى 100)
3. correctedGerman: الجملة الألمانية الصحيحة المثالية بالكامل مع مراعاة الحروف الكبيرة في البداية والأسماء (Capitalization).
4. feedbackAr: شرح وتغذية راجعة فورية بالعربية فقط تشرح صحة الجملة أو الأخطاء في ترتيب الكلمات أو تصريف الأفعال أو أدوات التعريف.
5. grammarNotesAr: ملاحظات وقواعد إضافية بالعربية فقط (مثلاً: موقع الفعل، حالة Akkusativ/Dativ، الجمع).
6. masteryDelta: عدد (+20 للجملة الصحيحة الممتازة، +10 للخطأ الإملائي البسيط، -10 عند عدم استخدام الكلمة أو خطأ قواعدي كبير).
`;

    const response = await callGeminiWithFallback({
      contents: `قيم ترجمة الجملة الألمانية: "${userGerman}"`,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isCorrect: { type: Type.BOOLEAN },
          accuracyScore: { type: Type.NUMBER },
          correctedGerman: { type: Type.STRING },
          feedbackAr: { type: Type.STRING },
          grammarNotesAr: { type: Type.STRING },
          masteryDelta: { type: Type.NUMBER },
        },
        required: ['isCorrect', 'accuracyScore', 'correctedGerman', 'feedbackAr', 'grammarNotesAr', 'masteryDelta'],
      },
    });

    const evalData = JSON.parse(response.text || '{}');
    return res.json(evalData);
  } catch (error: any) {
    console.warn('Evaluate Sentence fallback used:', error?.message);
    const cleanUser = String(userGerman || '').trim();
    const cleanWord = String(targetWord.word || '').trim();
    const containsWord = cleanUser.toLowerCase().includes(cleanWord.toLowerCase());
    const startsWithCapital = /^[A-ZÄÖÜ]/.test(cleanUser);

    const score = containsWord ? (startsWithCapital ? 90 : 75) : 40;
    const isCorrect = score >= 70;

    return res.json({
      isCorrect,
      accuracyScore: score,
      correctedGerman: targetWord.exampleDe || `${cleanUser}`,
      feedbackAr: containsWord
        ? 'ممتاز! تم توظيف الكلمة المستهدفة في الجملة. احرص على البدء بحرف كبير وتصريف الفعل بالشكل الصحيح.'
        : `الجملة تحتاج لتضمين الكلمة المستهدفة "${targetWord.word}" بشكل دقيق.`,
      grammarNotesAr: 'في اللغة الألمانية، تبدأ الجمل بحرف كبير، وتكتب الأسماء بحروف كبيرة دائماً (Capitalization)، ويقع الفعل في المرتبة الثانية.',
      masteryDelta: isCorrect ? 15 : -5,
    });
  }
});


// Endpoint: Ask AI to generate structured A1 vocabulary items for a given topic
app.post('/api/vocab/generate', async (req, res) => {
  const { topic, count = 6 } = req.body || {};

  try {
    const systemInstruction = `
أنت خبير في المناهج التعليمية للغة الألمانية لمستوى A1.
قم بإنشاء مفردات ألمانية لمستوى A1 حول الموضوع المحدد (${topic || 'الحياة اليومية'}).
ملاحظة هامة جداً: يسمح فقط بالأسماء والأفعال. لا تقبل أو تولد أي نوع آخر.
يرجى إرجاع مصفوفة JSON تحتوي على كائنات مفردات دقيقة بالمعلومات التالية:
- word: الكلمة الألمانية بدون أداة
- type: أحد الخيارين فقط بالضبط ('noun' | 'verb')
- gender: 'der' | 'die' | 'das' (فقط للأسماء)
- plural: صيغة الجمع مع die (مثلاً "die Tische")
- translationAr: الترجمة العربية الدقيقة
- translationEn: الترجمة الإنكليزية
- category: اسم الموضوع بالعربية
- isIrregular: boolean (للأفعال الشاذة)
- present3rd: التصريف مع er/sie/es
- praeteritum: تصريف الماضي
- perfekt: تصريف التام (مثلاً "hat gesehen")
- exampleDe: جملة ألمانية عالية الجودة وتطبيقية تمثل الكلمة في سياق طبيعي ومفيد (بدون ترجمة عربية للجملة).
`;

    const response = await callGeminiWithFallback({
      contents: `قم بتوليد ${count} مفردات ألمانية جديدة ومهمة لمستوى A1 لموضوع: ${topic}`,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            type: { type: Type.STRING },
            gender: { type: Type.STRING },
            plural: { type: Type.STRING },
            translationAr: { type: Type.STRING },
            translationEn: { type: Type.STRING },
            category: { type: Type.STRING },
            isIrregular: { type: Type.BOOLEAN },
            present3rd: { type: Type.STRING },
            praeteritum: { type: Type.STRING },
            perfekt: { type: Type.STRING },
            antonym: { type: Type.STRING },
            case: { type: Type.STRING },
            exampleDe: { type: Type.STRING },
            exampleAr: { type: Type.STRING },
          },
          required: ['word', 'type', 'translationAr', 'category'],
        },
      },
    });

    const generatedVocab = JSON.parse(response.text || '[]');
    return res.json({ items: generatedVocab });
  } catch (error: any) {
    console.warn('Gemini Generate Vocab fallback used:', error?.message);
    return res.json({
      items: [
        {
          word: 'lernen',
          type: 'verb',
          translationAr: 'يتعلم',
          translationEn: 'to learn',
          category: topic || 'الحياة اليومية',
          isIrregular: false,
          present3rd: 'lernt',
          perfekt: 'hat gelernt',
          exampleDe: 'Ich lerne Deutsch.',
          exampleAr: 'أنا أتعلم الألمانية.'
        },
        {
          word: 'Tisch',
          type: 'noun',
          gender: 'der',
          plural: 'die Tische',
          translationAr: 'طاولة / مكتب',
          translationEn: 'table',
          category: topic || 'الحياة اليومية',
          exampleDe: 'Der Tisch ist groß.',
          exampleAr: 'الطاولة كبيرة.'
        }
      ]
    });
  }
});

const COMMON_GERMAN_IRREGULAR_VERBS: Record<string, { present3rd: string; praeteritum: string; perfekt: string; exampleDe: string; exampleAr: string; translationAr: string; translationEn: string }> = {
  'verbieten': { present3rd: 'verbietet', praeteritum: 'verbot', perfekt: 'hat verboten', exampleDe: 'Der Arzt verbietet das Rauchen.', exampleAr: 'الطبيب يمنع التدخين.', translationAr: 'يمنع / يحظر', translationEn: 'to forbid / prohibit' },
  'bieten': { present3rd: 'bietet', praeteritum: 'bot', perfekt: 'hat geboten', exampleDe: 'Das Hotel bietet guten Service.', exampleAr: 'يقدم الفندق خدمة جيدة.', translationAr: 'يقدم / يعرض', translationEn: 'to offer' },
  'anbieten': { present3rd: 'bietet an', praeteritum: 'bot an', perfekt: 'hat angeboten', exampleDe: 'Er bietet mir seine Hilfe an.', exampleAr: 'يعرض عليّ مساعدة.', translationAr: 'يعرض / يقدم', translationEn: 'to offer' },
  'schwimmen': { present3rd: 'schwimmt', praeteritum: 'schwamm', perfekt: 'ist geschwommen', exampleDe: 'Er schwimmt im See.', exampleAr: 'هو يسبح في البحيرة.', translationAr: 'يسبح', translationEn: 'to swim' },
  'geben': { present3rd: 'gibt', praeteritum: 'gab', perfekt: 'hat gegeben', exampleDe: 'Er gibt mir ein Buch.', exampleAr: 'هو يعطيني كتاباً.', translationAr: 'يعطي', translationEn: 'to give' },
  'gehen': { present3rd: 'geht', praeteritum: 'ging', perfekt: 'ist gegangen', exampleDe: 'Ich gehe nach Hause.', exampleAr: 'أنا أذهب إلى البيت.', translationAr: 'يذهب', translationEn: 'to go' },
  'kommen': { present3rd: 'kommt', praeteritum: 'kam', perfekt: 'ist gekommen', exampleDe: 'Er kommt aus Deutschland.', exampleAr: 'هو يأتي من ألمانيا.', translationAr: 'يأتي', translationEn: 'to come' },
  'sprechen': { present3rd: 'spricht', praeteritum: 'sprach', perfekt: 'hat gesprochen', exampleDe: 'Sie spricht Deutsch und Arabisch.', exampleAr: 'هي تتحدث الألمانية والعربية.', translationAr: 'يتحدث', translationEn: 'to speak' },
  'fahren': { present3rd: 'fährt', praeteritum: 'fuhr', perfekt: 'ist gefahren', exampleDe: 'Wir fahren nach Berlin.', exampleAr: 'نحن نسافر إلى برلين.', translationAr: 'يسافر / يقود', translationEn: 'to drive / travel' },
  'sehen': { present3rd: 'sieht', praeteritum: 'sah', perfekt: 'hat gesehen', exampleDe: 'Ich sehe den Film.', exampleAr: 'أنا أشاهد الفيلم.', translationAr: 'يرى / يشاهد', translationEn: 'to see' },
  'lesen': { present3rd: 'liest', praeteritum: 'las', perfekt: 'hat gelesen', exampleDe: 'Er liest ein interessantes Buch.', exampleAr: 'هو يقرأ كتاباً ممتعاً.', translationAr: 'يقرأ', translationEn: 'to read' },
  'nehmen': { present3rd: 'nimmt', praeteritum: 'nahm', perfekt: 'hat genommen', exampleDe: 'Sie nimmt einen Kaffee.', exampleAr: 'هي تأخذ قهوة.', translationAr: 'يأخذ', translationEn: 'to take' },
  'essen': { present3rd: 'isst', praeteritum: 'aß', perfekt: 'hat gegessen', exampleDe: 'Wir essen Pizza zum Abendessen.', exampleAr: 'نحن نأكل البيتزا في العشاء.', translationAr: 'يأكل', translationEn: 'to eat' },
  'trinken': { present3rd: 'trinkt', praeteritum: 'trank', perfekt: 'hat getrunken', exampleDe: 'Er trinkt ein Glas Wasser.', exampleAr: 'هو يشرب كأس ماء.', translationAr: 'يشرب', translationEn: 'to drink' },
  'schlafen': { present3rd: 'schläft', praeteritum: 'schlief', perfekt: 'hat geschlafen', exampleDe: 'Das Kind schläft gut.', exampleAr: 'الطفل ينام جيداً.', translationAr: 'ينام', translationEn: 'to sleep' },
  'schreiben': { present3rd: 'schreibt', praeteritum: 'schrieb', perfekt: 'hat geschrieben', exampleDe: 'Ich schreibe einen Brief.', exampleAr: 'أنا أكتب رسالة.', translationAr: 'يكتب', translationEn: 'to write' },
  'treffen': { present3rd: 'trifft', praeteritum: 'traf', perfekt: 'hat getroffen', exampleDe: 'Ich treffe meine Freunde heute.', exampleAr: 'أنا ألتقي بأصدقائي اليوم.', translationAr: 'يلتقي', translationEn: 'to meet' },
  'laufen': { present3rd: 'läuft', praeteritum: 'lief', perfekt: 'ist gelaufen', exampleDe: 'Er läuft jeden Morgen im Park.', exampleAr: 'هو يرُكض كل صباح في الحديقة.', translationAr: 'يجري / يرُكض', translationEn: 'to run' },
  'fliegen': { present3rd: 'fliegt', praeteritum: 'flog', perfekt: 'ist geflogen', exampleDe: 'Wir fliegen nach Kairo.', exampleAr: 'نحن نطير إلى القاهرة.', translationAr: 'يطير / يسافر براً', translationEn: 'to fly' },
  'bleiben': { present3rd: 'bleibt', praeteritum: 'blieb', perfekt: 'ist geblieben', exampleDe: 'Ich bleibe heute zu Hause.', exampleAr: 'أنا أبقى في البيت اليوم.', translationAr: 'يبقى / يمكث', translationEn: 'to stay' },
  'finden': { present3rd: 'findet', praeteritum: 'fand', perfekt: 'hat gefunden', exampleDe: 'Er findet den Schlüssel nicht.', exampleAr: 'هو لا يجد المفتاح.', translationAr: 'يجد', translationEn: 'to find' },
  'helfen': { present3rd: 'hilft', praeteritum: 'half', perfekt: 'hat geholfen', exampleDe: 'Sie hilft der alten Frau.', exampleAr: 'هي تساعد المرأة المسنة.', translationAr: 'يساعد', translationEn: 'to help' },
  'wissen': { present3rd: 'weiß', praeteritum: 'wusste', perfekt: 'hat gewusst', exampleDe: 'Ich weiß die Antwort.', exampleAr: 'أنا أعرف الإجابة.', translationAr: 'يعرف (معلومة)', translationEn: 'to know' },
  'kennen': { present3rd: 'kennt', praeteritum: 'kannte', perfekt: 'hat gekannt', exampleDe: 'Ich kenne diese Stadt sehr gut.', exampleAr: 'أنا أعرف هذه المدينة جيداً.', translationAr: 'يعرف (شخص/مكان)', translationEn: 'to know / be familiar' },
  'bringen': { present3rd: 'bringt', praeteritum: 'brachte', perfekt: 'hat gebracht', exampleDe: 'Er bringt das Essen.', exampleAr: 'هو يجلب الطعام.', translationAr: 'يجلب / يحضر', translationEn: 'to bring' },
  'denken': { present3rd: 'denkt', praeteritum: 'dachte', perfekt: 'hat gedacht', exampleDe: 'Ich denke an dich.', exampleAr: 'أنا أفكر فيك.', translationAr: 'يفكر', translationEn: 'to think' },
  'stehen': { present3rd: 'steht', praeteritum: 'stand', perfekt: 'hat gestanden', exampleDe: 'Das Auto steht vor dem Haus.', exampleAr: 'السيارة تقف أمام البيت.', translationAr: 'يقف / يتواجد', translationEn: 'to stand' },
  'verstehen': { present3rd: 'versteht', praeteritum: 'verstand', perfekt: 'hat verstanden', exampleDe: 'Verstehst du Deutsch?', exampleAr: 'هل تفهم الألمانية؟', translationAr: 'يفهم', translationEn: 'to understand' },
  'sein': { present3rd: 'ist', praeteritum: 'war', perfekt: 'ist gewesen', exampleDe: 'Ich bin glücklich.', exampleAr: 'أنا سعيد.', translationAr: 'يكون', translationEn: 'to be' },
  'haben': { present3rd: 'hat', praeteritum: 'hatte', perfekt: 'hat gehabt', exampleDe: 'Ich habe eine Frage.', exampleAr: 'لدي سؤال.', translationAr: 'يملك / لديه', translationEn: 'to have' },
  'werden': { present3rd: 'wird', praeteritum: 'wurde', perfekt: 'ist geworden', exampleDe: 'Er wird Arzt.', exampleAr: 'هو يصبح طبيباً.', translationAr: 'يصبح', translationEn: 'to become' },
  'wollen': { present3rd: 'will', praeteritum: 'wollte', perfekt: 'hat gewollt', exampleDe: 'Ich will Deutsch lernen.', exampleAr: 'أريد أن أتعلم الألمانية.', translationAr: 'يريد', translationEn: 'to want' },
  'müssen': { present3rd: 'muss', praeteritum: 'musste', perfekt: 'hat gemusst', exampleDe: 'Ich muss heute arbeiten.', exampleAr: 'يجب علي العمل اليوم.', translationAr: 'يجب / يضطر', translationEn: 'to must / have to' },
  'können': { present3rd: 'kann', praeteritum: 'konnte', perfekt: 'hat gekonnt', exampleDe: 'Ich kann gut schwimmen.', exampleAr: 'أستطيع السباحة جيداً.', translationAr: 'يستطيع / يقدر', translationEn: 'to can / be able to' },
  'sollen': { present3rd: 'soll', praeteritum: 'sollte', perfekt: 'hat gesollt', exampleDe: 'Du sollst zum Arzt gehen.', exampleAr: 'ينبغي عليك الذهاب إلى الطبيب.', translationAr: 'ينبغي', translationEn: 'should' },
  'dürfen': { present3rd: 'darf', praeteritum: 'durfte', perfekt: 'hat gedurft', exampleDe: 'Hier darf man nicht rauchen.', exampleAr: 'غير مسموح بالتذخين هنا.', translationAr: 'يُسمح له', translationEn: 'to be allowed' },
  'mögen': { present3rd: 'mag', praeteritum: 'mochte', perfekt: 'hat gemocht', exampleDe: 'Ich mag Kaffee.', exampleAr: 'أنا أحب القهوة.', translationAr: 'يحب / يرغب', translationEn: 'to like' },
};

// Endpoint: Smart AI Auto-Format & Parse a single German word/phrase
app.post('/api/vocab/parse-smart', async (req, res) => {
  const { wordInput } = req.body || {};

  if (!wordInput || typeof wordInput !== 'string' || !wordInput.trim()) {
    return res.status(400).json({ error: 'Missing word input' });
  }

  const trimmedInput = wordInput.trim();

  // Reject Arabic text input immediately - German input only
  if (/[\u0600-\u06FF]/.test(trimmedInput)) {
    return res.json({ error: 'الرجاء إدخال المفردات باللغة الألمانية حصراً (مثال: der Tisch, schwimmen, schön).' });
  }

  try {
    const systemInstruction = `
أنت خبير لغوي وقواعدي مرجعي متخصص في اللغة الألمانية ومناهج CEFR المعترف بها (Duden / DWDS).
وظيفتك هي التحليل والتنسيق التلقائي الدقيق جداً لأي كلمة أو تعبير ألماني يدخله المستخدم.
يجب الاستناد الحصري والكامل القواعدي إلى المصادر المعتمدة الرسمية في قواعد اللغة الألمانية. يمنع منعا باتا أي تخمين خاطئ.

قاعدة هامة جداً: الإدخال يجب أن يكون باللغة الألمانية حصراً.
تنبيه قواعدي حاسم جداً لأفعال الحركة والسباحة (مثل schwimmen, gehen, fahren, kommen, laufen, fliegen, reisen, bleiben):
يجب استخدام الفعل المساعد "ist" في صيغة Perfekt وليس "hat" (مثلاً: "ist geschwommen" لـ schwimmen، "ist gegangen" لـ gehen، "ist gefahren" لـ fahren، "ist gelaufen" لـ laufen).

أنواع المفردات المسموحة: أسماء، أفعال، صفات، حروف جر ('noun' | 'verb' | 'adjective' | 'preposition').

المطلوب إرجاع كائن JSON دقيق جداً للمفردة يحتوي على:
- word: الكلمة الألمانية المصححة بدون أداة التعريف (مثال: "Tisch" أو "groß" أو "schwimmen").
- type: أحد الخيارات ('noun' | 'verb' | 'adjective' | 'preposition')
- level: المستوى اللغوي حسب إطار CEFR ('A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2')
- gender: 'der' | 'die' | 'das' (فقط للأسماء)
- plural: صيغة الجمع الصحيحة مع die للأسماء (مثال: "die Tische", "die Bücher", "die Frauen")
- antonym: عكس الصفة للـ 'adjective' (مثال: "klein" لـ "groß")
- preposition: حرف الجر المحدد المرتبط بالفعل أو التعبير إذا وجد (مثال: "um", "auf", "mit", "an", "bei", "für", "von", "zu")
- prepositionCase: الحالة الإعرابية المرتبطة بحرف الجر إن وجد ('Akkusativ' | 'Dativ' | 'Genitiv' | 'Wechsel')
- translationAr: الترجمة باللغة العربية الدقيقة والمباشرة للكلمة.
- translationEn: الترجمة باللغة الإنجليزية الدقيقة والمباشرة للكلمة.
- isIrregular: boolean (هل الفعل شاذ/قوي)
- present3rd: التصريف المباشر والدقيق مع er/sie/es للمضارع إذا كان فعلاً (مثلاً: "schwimmt", "gibt", "spricht", "fährt", "liest", "sieht", "läuft", "ist", "hat")
- praeteritum: تصريف الماضي البسيط Präteritum المعترف به رسمياً إذا كان فعلاً (مثلاً: "schwamm", "gab", "sprach", "fuhr", "las", "sah", "lief", "war", "hatte")
- perfekt: تصريف الماضي التام Perfekt مع الفعل المساعد (hat/ist) إذا كان فعلاً (مثلاً: "ist geschwommen", "hat gegeben", "ist gegangen", "hat gesprochen", "ist gefahren", "hat gelesen", "ist gelaufen", "ist gewesen")
- exampleDe: جملة ألمانية كاملة وسليمة قواعدياً 100% توضح معنى الكلمة واستخدامها اليومي. (إجباري وغير فارغ)
- exampleAr: الترجمة العربية الدقيقة والواضحة للجملة المثال exampleDe. (إجباري وغير فارغ)
`;

    const response = await callGeminiWithFallback({
      contents: `قم بتنسيق وتحليل الكلمة الألمانية التالية تلقائياً مع كافة تصاريفها وقواعدها الرسمية وجملة نموذجية مع ترجمتها بالعربية والإنجليزية: "${wordInput.trim()}"`,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          type: { type: Type.STRING },
          gender: { type: Type.STRING },
          plural: { type: Type.STRING },
          translationAr: { type: Type.STRING },
          translationEn: { type: Type.STRING },
          category: { type: Type.STRING },
          isIrregular: { type: Type.BOOLEAN },
          present3rd: { type: Type.STRING },
          praeteritum: { type: Type.STRING },
          perfekt: { type: Type.STRING },
          antonym: { type: Type.STRING },
          case: { type: Type.STRING },
          preposition: { type: Type.STRING },
          prepositionCase: { type: Type.STRING },
          exampleDe: { type: Type.STRING },
          exampleAr: { type: Type.STRING },
        },
        required: ['word', 'type', 'translationAr', 'translationEn', 'exampleDe', 'exampleAr'],
      },
    });

    let rawText = response.text || '{}';
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    let data: any = {};
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error('Failed to parse Gemini response as JSON:', rawText);
    }

    let rawWord = data.word || wordInput.trim();
    let cleanWord = String(rawWord)
      .replace(/```[\s\S]*?```/gi, '')
      .replace(/^[\"\'\s]+|[\"\'\s]+$/g, '')
      .replace(/[\{\}\[\]]/g, '')
      .split('\n')[0]
      .trim();

    let cleanGender = data.gender ? String(data.gender).toLowerCase().trim() : undefined;
    
    const articleMatch = cleanWord.match(/^(der|die|das)\s+(.+)$/i);
    if (articleMatch) {
      cleanGender = articleMatch[1].toLowerCase();
      cleanWord = articleMatch[2].trim();
    }

    if (cleanGender && !['der', 'die', 'das'].includes(cleanGender)) {
      cleanGender = undefined;
    }

    cleanWord = cleanWord.substring(0, 45);
    const cleanTranslationAr = String(data.translationAr || data.translationEn || wordInput.trim()).split('\n')[0].substring(0, 60).trim();
    const cleanTranslationEn = String(data.translationEn || data.translationAr || wordInput.trim()).split('\n')[0].substring(0, 60).trim();
    
    const cleanPlural = data.plural ? String(data.plural).split('\n')[0].substring(0, 40).trim() : undefined;
    let cleanPresent3rd = data.present3rd ? String(data.present3rd).split('\n')[0].substring(0, 35).trim() : undefined;
    let cleanPraeteritum = data.praeteritum ? String(data.praeteritum).split('\n')[0].substring(0, 35).trim() : undefined;
    let cleanPerfekt = data.perfekt ? String(data.perfekt).split('\n')[0].substring(0, 35).trim() : undefined;
    const cleanAntonym = data.antonym ? String(data.antonym).split('\n')[0].substring(0, 35).trim() : undefined;
    const cleanCase = data.case ? String(data.case).split('\n')[0].substring(0, 25).trim() : undefined;
    let cleanExampleDe = data.exampleDe ? String(data.exampleDe).split('\n')[0].substring(0, 140).trim() : undefined;
    let cleanExampleAr = data.exampleAr ? String(data.exampleAr).split('\n')[0].substring(0, 140).trim() : undefined;
    const cleanCategory = data.category ? String(data.category).split('\n')[0].substring(0, 35).trim() : 'Vocabulary';

    let cleanType = (data.type || 'noun').toLowerCase().trim();
    if (cleanType.includes('nomen') || cleanType.includes('noun') || cleanType.includes('اسم')) cleanType = 'noun';
    else if (cleanType.includes('verb') || cleanType.includes('فعل')) cleanType = 'verb';
    else if (cleanType.includes('adj') || cleanType.includes('صفة')) cleanType = 'adjective';
    else if (cleanType.includes('adv') || cleanType.includes('ظرف')) cleanType = 'adverb';
    else if (cleanType.includes('prep') || cleanType.includes('حرف')) cleanType = 'preposition';
    else if (!['noun', 'verb', 'adjective', 'adverb', 'preposition', 'expression'].includes(cleanType)) {
      cleanType = 'noun';
    }

    let isIrregular = Boolean(data.isIrregular);

    // Verify against authoritative dictionary of common German irregular verbs
    const lowerWord = cleanWord.toLowerCase().trim();
    const verifiedVerb = COMMON_GERMAN_IRREGULAR_VERBS[lowerWord];
    if (verifiedVerb) {
      cleanType = 'verb';
      isIrregular = true;
      cleanPresent3rd = verifiedVerb.present3rd;
      cleanPraeteritum = verifiedVerb.praeteritum;
      cleanPerfekt = verifiedVerb.perfekt;
      if (!cleanExampleDe) cleanExampleDe = verifiedVerb.exampleDe;
      if (!cleanExampleAr) cleanExampleAr = verifiedVerb.exampleAr;
    }

    const cleanResult = {
      word: cleanWord,
      type: cleanType,
      gender: cleanGender,
      plural: cleanPlural,
      translationAr: cleanTranslationAr,
      translationEn: cleanTranslationEn,
      category: cleanCategory,
      isIrregular,
      present3rd: cleanPresent3rd,
      praeteritum: cleanPraeteritum,
      perfekt: cleanPerfekt,
      antonym: cleanAntonym,
      case: cleanCase,
      exampleDe: cleanExampleDe,
      exampleAr: cleanExampleAr,
    };

    return res.json(cleanResult);
  } catch (error: any) {
    console.warn('Smart Vocab Parse fallback used:', error?.message);
    const rawInput = String(wordInput || '').trim();
    const articleMatch = rawInput.match(/^(der|die|das)\s+(.+)$/i);
    let gender = articleMatch ? articleMatch[1].toLowerCase() : undefined;
    let word = articleMatch ? articleMatch[2].trim() : rawInput;
    const lowerWord = word.toLowerCase().trim();
    const verifiedVerb = COMMON_GERMAN_IRREGULAR_VERBS[lowerWord];

    if (verifiedVerb) {
      return res.json({
        word: word.substring(0, 45),
        type: 'verb',
        translationAr: verifiedVerb.translationAr,
        translationEn: verifiedVerb.translationEn,
        category: 'Personal Entry',
        isIrregular: true,
        present3rd: verifiedVerb.present3rd,
        praeteritum: verifiedVerb.praeteritum,
        perfekt: verifiedVerb.perfekt,
        exampleDe: verifiedVerb.exampleDe,
        exampleAr: verifiedVerb.exampleAr,
      });
    }

    return res.json({
      word: word.substring(0, 45),
      type: gender ? 'noun' : 'verb',
      gender,
      plural: gender ? `die ${word}s` : undefined,
      translationAr: rawInput,
      translationEn: rawInput,
      category: 'Added Vocabulary',
      isIrregular: false,
      exampleDe: gender ? `Das ist ${gender} ${word}.` : `Ich möchte ${word}.`,
      exampleAr: gender ? `هذا هو ${word}.` : `أنا أريد ${word}.`
    });
  }
});

// Endpoint: AI Smart Bulk Text Parser for German Vocabulary Import
app.post('/api/vocab/parse-bulk', async (req, res) => {
  const { textInput } = req.body || {};

  if (!textInput || typeof textInput !== 'string' || !textInput.trim()) {
    return res.status(400).json({ error: 'Missing textInput' });
  }

  try {
    const systemInstruction = `
أنت خبير قواعد وترجمة لغة ألمانية متقدم لمستوى A1.
تتلقى قائمة أو كتل نصوص تحوي كلمات أو عبارات ألمانية (أو ألمانية ومعها معاني بالعربية أو الإنجليزية).
قم باستخراج وتحليل جميع المفردات الألمانية الموجودة في النص، وتحديد كافة خصائصها القواعدية تلقائياً:
1. word: الكلمة الألمانية فقط بدون أداة التعريف في بداية الاسم (مثال: "Tisch" وليس "der Tisch"، أو "lernen").
2. type: "noun" | "verb" | "adjective" | "preposition" | "expression".
3. gender: إذا كانت اسماً حدد أداتها الألمانية الصحيحة بدقة: "der" | "die" | "das".
4. plural: صيغة الجمع كاملة بالألمانية إن وجدت أو خمنها (مثال: "die Tische").
5. translationEn: الترجمة باللغة الإنجليزية الدقيقة الواضحة (Must be in English).
6. translationAr: الترجمة بالإنجليزية.
7. category: التصنيف المناسب (مثل: "House", "Work", "Education", "General").
8. isIrregular: boolean (هل الفعل شاذ).
9. present3rd: تصريف الغائب (er/sie/es) للأفعال.
10. praeteritum: الماضي البسيط للأفعال.
11. perfekt: الماضي التام للأفعال (مثال: "hat gelernt").
12. exampleDe: جملة ألمانية عالية الجودة وتطبيقية تظهر الكلمة في سياق طبيعي ومفيد.
`;

    const response = await callGeminiWithFallback({
      contents: `حلل النص التالي واستخرج كافة المفردات الألمانية مع كافة خصائصها القواعدية الترجمة بالإنجليزية:\n\n${textInput.trim()}`,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            type: { type: Type.STRING },
            gender: { type: Type.STRING },
            plural: { type: Type.STRING },
            translationEn: { type: Type.STRING },
            translationAr: { type: Type.STRING },
            category: { type: Type.STRING },
            isIrregular: { type: Type.BOOLEAN },
            present3rd: { type: Type.STRING },
            praeteritum: { type: Type.STRING },
            perfekt: { type: Type.STRING },
            antonym: { type: Type.STRING },
            case: { type: Type.STRING },
            exampleDe: { type: Type.STRING },
            exampleAr: { type: Type.STRING },
          },
          required: ['word', 'type', 'translationEn', 'category'],
        },
      },
    });

    const parsedArray = JSON.parse(response.text || '[]');
    return res.json({ items: parsedArray });
  } catch (error: any) {
    console.warn('Smart Bulk Parse fallback used:', error?.message);
    
    // Smart heuristic fallback parsing line by line
    const lines = textInput.split(/\r?\n/).filter(l => l.trim().length > 0);
    const fallbackItems: any[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(/[:=\-\t|\/,]+/).map(s => s.trim()).filter(Boolean);
      if (parts.length === 0) return;

      let rawWord = parts[0];
      let translationAr = parts[1] || parts[0];
      let plural = parts[2] || undefined;

      let gender: string | undefined = undefined;
      const articleMatch = rawWord.match(/^(der|die|das)\s+(.+)$/i);
      if (articleMatch) {
        gender = articleMatch[1].toLowerCase();
        rawWord = articleMatch[2].trim();
      }

      const isCapitalized = /^[A-ZÄÖÜ]/.test(rawWord);
      let type = 'noun';
      if (!gender && !isCapitalized && (rawWord.endsWith('en') || rawWord.endsWith('n'))) {
        type = 'verb';
      } else if (!gender && !isCapitalized) {
        type = 'adjective';
      }

      fallbackItems.push({
        word: rawWord,
        type,
        gender,
        plural: plural ? (plural.startsWith('die ') ? plural : `die ${plural}`) : undefined,
        translationAr,
        category: 'مستورد ذكياً',
        exampleDe: type === 'verb' ? `Ich ${rawWord}e gerne.` : `${gender ? gender + ' ' : ''}${rawWord} ist hier.`,
        exampleAr: translationAr,
      });
    });

    return res.json({ items: fallbackItems });
  }
});

// Endpoint: General conversational advice / AI German explanation
app.post('/api/chat/ask', async (req, res) => {
  const { prompt } = req.body || {};

  try {
    const systemInstruction = `
أنت "DeutschMeister"، مساعد ذكاء اصطناعي تفاعلي متكافئ ومخصص لتعليم اللغة الألمانية باللغة العربية.
تتميز بإجاباتك المنظمة، الواضحة، المليئة بالأمثلة والجداول والقواعد الألمانية المفسرة ببساطة لمستوى A1.
اشرح الجنس القواعدي (der, die, das)، الجمع، تصريف الأفعال الشاذة، الصفات وعكسها، وأحرف الجر مع حالاتها الإعرابية (Akkusativ/Dativ).
استخدم نسق Markdown الجميل مع أيقونات تعبيرية.
`;

    const response = await callGeminiWithFallback({
      contents: prompt,
      systemInstruction,
    });

    return res.json({ text: response.text });
  } catch (error: any) {
    console.warn('Gemini Ask fallback used:', error?.message);
    return res.json({
      text: `مرحباً بك! أعتذر، واجه الخادم ضغطاً مؤقتاً في طلبات الذكاء الاصطناعي. إليك نصائح هامة ومفيدة لمستوى A1:
    
- **الأسماء والأدوات**: احفظ الاسم دائماً مع أداته (der للمذكر، die للمؤنث، das للمحايد).
- **موقع الفعل**: في الجملة الخبرية الأساسية، يقع الفعل المصرف دائماً في **المرتبة الثانية**.
- **الأفعال الشاذة**: احفظ تصريف الفعل في المضارع والماضي والتام معاً (مثال: bleiben - blieb - ist geblieben).`
    });
  }
});

// Integrate Vite middleware in development or serve built files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`German AI Vocab Coach Server running on http://localhost:${PORT}`);
  });
}

startServer();
