import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  Search, 
  Copy, 
  Check, 
  Cpu, 
  AlertCircle, 
  ArrowRight,
  Bot
} from 'lucide-react';

const MODEL_ID = "gemini-3.1-flash-lite";
const MODEL_DISPLAY_NAME = "Gemini 3.1 Flash Lite";

interface AiSearchProps {
  onCreateEvaluation?: (content: string) => void;
}

const AiSearch: React.FC<AiSearchProps> = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationTimeMs, setGenerationTimeMs] = useState<number | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setResponse(null);
    setErrorMessage(null);
    setGenerationTimeMs(null);

    const startTime = performance.now();

    try {
      const fetchResponse = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_ID,
          prompt: query.trim(),
        }),
      });

      const data = await fetchResponse.json().catch(() => ({}));

      if (!fetchResponse.ok) {
        throw new Error(data?.error?.message || `Erreur serveur HTTP ${fetchResponse.status}`);
      }

      const elapsedMs = Math.round(performance.now() - startTime);
      setGenerationTimeMs(elapsedMs);
      setLoading(false);
      setResponse(data.content || "Aucune réponse générée.");
    } catch (err: any) {
      setLoading(false);
      console.error("Échec de la génération Gemini:", err);
      const errMsg = err?.message || "Erreur de communication avec l'API Google Gemini.";
      setErrorMessage(errMsg);
    }
  };

  const copyToClipboard = () => {
    if (response) {
      navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const suggestions = [
    "Crée un exercice de mathématiques avec 4 équations du second degré et leurs corrigés détaillés en LaTeX.",
    "Propose 5 questions de compréhension de texte pour des élèves de 5ème sur Les Misérables de Victor Hugo.",
    "Rédige un sujet d'évaluation en SVT sur la photosynthèse avec un barème sur 20 points.",
    "Génère un QCM de 4 questions sur la Révolution Française avec explications de la bonne réponse.",
    "Crée un texte à trous en anglais sur le Present Perfect avec 8 éléments à compléter."
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <header className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          {/* Badge Gemini */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl flex items-center gap-2 bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs">
              <Bot size={18} className="text-indigo-600 animate-pulse" />
              <span className="text-xs font-black tracking-wider uppercase">Google Gemini I.A.</span>
              <span className="px-1.5 py-0.5 bg-indigo-200/70 text-indigo-900 rounded-md text-[10px] font-bold">API Cloud</span>
            </div>
          </div>

          {/* Badge Modèle Unique */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-xs">
            <Cpu size={14} className="text-indigo-600" />
            <span>Modèle : <strong className="text-indigo-900 font-bold">{MODEL_DISPLAY_NAME}</strong></span>
          </div>
        </div>

        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          Recherche & Assistant I.A. Gemini
        </h1>
        <p className="text-slate-500 mt-1">
          Générez instantanément des évaluations complètes, devoirs, corrigés détaillés et formules mathématiques LaTeX propulsés par {MODEL_DISPLAY_NAME}.
        </p>
      </header>

      {/* Barre de recherche */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all focus-within:shadow-md focus-within:border-indigo-300">
        <form onSubmit={handleSearch} className="p-3 sm:p-4 flex gap-3 items-center">
          <div className="relative flex-grow">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Rédige une évaluation de 4 exercices sur les fractions et le théorème de Pythagore avec barème..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500/30 outline-none transition-all font-medium text-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 text-white p-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center min-w-[56px] disabled:shadow-none active:scale-95 cursor-pointer"
            title="Générer avec Google Gemini"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
          </button>
        </form>
      </div>

      {/* Message d'erreur */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-700 animate-fade-in text-sm">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5 text-rose-500" />
          <div className="flex-grow">
            <p className="font-bold">Erreur de génération</p>
            <p className="mt-0.5 text-rose-600">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Loader */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <Sparkles className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={24} />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-800 animate-pulse text-base">
              Génération en cours avec {MODEL_DISPLAY_NAME}...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Traitement rapide et mise en page LaTeX
            </p>
          </div>
        </div>
      )}

      {/* Réponse générée */}
      {response && !loading && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-6 sm:p-8 relative group">
            {/* Header de la réponse */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Check size={13} className="mr-1 text-emerald-600" /> Réponse générée
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                  {MODEL_DISPLAY_NAME}
                </span>
                {generationTimeMs !== null && (
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Sparkles size={12} className="text-indigo-500" /> {generationTimeMs} ms
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all border border-slate-200 hover:border-indigo-200 shadow-xs"
                  title="Copier le texte"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-500" />
                      <span className="text-emerald-600 font-bold">Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Corps Markdown avec KaTeX */}
            <div className="markdown-body prose prose-slate max-w-none text-slate-800 leading-relaxed text-base">
              <Markdown 
                remarkPlugins={[remarkGfm, remarkMath]} 
                rehypePlugins={[rehypeKatex]}
              >
                {response}
              </Markdown>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions rapides */}
      {!response && !loading && (
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Sparkles size={14} />
            Exemples de requêtes rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => setQuery(suggestion)}
                className="p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-sm text-slate-600 font-medium shadow-xs group flex items-start justify-between gap-3"
              >
                <span>"{suggestion}"</span>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiSearch;
