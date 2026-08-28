import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Lazy initializer for Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("La variable d'environnement GEMINI_API_KEY n'est pas configurée dans les Secrets.");
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Endpoint Gemini I.A.
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt, model = 'gemini-3.1-flash-lite', systemInstruction } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        error: { message: 'Veuillez fournir un texte ou une consigne pour la recherche I.A.' },
      });
    }

    const ai = getGeminiClient();

    const defaultSystemInstruction =
      "Tu es un assistant pédagogique d'élite pour enseignants et formateurs. " +
      "Ton rôle est d'aider à concevoir des évaluations, exercices, barèmes, textes à trous, QCM et corrigés d'excellence. " +
      "Règles impératives de formatage :\n" +
      "1. Réponds de manière structurée et claire en Markdown.\n" +
      "2. Pour toutes les formules mathématiques et notations scientifiques, utilise impérativement la syntaxe LaTeX :\n" +
      "   - Formules en ligne avec de simples dollars : `$f(x) = \\frac{a}{b}$`\n" +
      "   - Formules en bloc avec de doubles dollars : `$$\\int_0^1 x^2 dx = \\frac{1}{3}$$`\n" +
      "3. Adapte le niveau de vocabulaire et la rigueur au contexte demandé (primaire, collège, lycée, supérieur).\n" +
      "4. Fournis systématiquement si demandé le corrigé détaillé avec les critères et points de notation.";

    const targetModel = model || 'gemini-3.1-flash-lite';

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: prompt.trim(),
      config: {
        systemInstruction: systemInstruction || defaultSystemInstruction,
        temperature: 0.7,
      },
    });

    const content = response.text || 'Aucune réponse générée.';

    return res.json({
      content,
      model: targetModel,
    });
  } catch (error: any) {
    console.error('Erreur Gemini API:', error);
    return res.status(500).json({
      error: {
        message: error?.message || "Une erreur est survenue lors de la communication avec l'API Gemini.",
      },
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

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
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
