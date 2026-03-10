
import React, { useState } from 'react';
import Groq from "groq-sdk";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Sparkles, Send, Loader2, Search, Copy, Check, BrainCircuit } from 'lucide-react';

const AiSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      setResponse("Erreur : La clé API Groq n'est pas configurée. Veuillez l'ajouter dans les variables d'environnement (VITE_GROQ_API_KEY).");
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const groq = new Groq({ 
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Required for client-side usage
      });

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Tu es un assistant pédagogique expert. Aide les enseignants à créer des contenus d'évaluation de haute qualité. Réponds de manière structurée en utilisant le format Markdown. Pour les formules mathématiques et scientifiques, utilise TOUJOURS le format LaTeX avec les délimiteurs '$' pour les formules en ligne et '$$' pour les formules en bloc. Assure-toi que les formules complexes sont bien lisibles."
          },
          {
            role: "user",
            content: query,
          },
        ],
        model: "llama-3.3-70b-versatile",
      });

      setResponse(chatCompletion.choices[0]?.message?.content || "Aucune réponse générée.");
    } catch (error) {
      console.error("Groq Search Error:", error);
      setResponse("Une erreur est survenue lors de la recherche. Veuillez vérifier votre clé API ou réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (response) {
      navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
          <BrainCircuit size={18} />
          <span className="uppercase tracking-wider text-[10px]">Intelligence Artificielle (Groq)</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Recherche I.A.</h1>
        <p className="text-slate-500 mt-1">Générez des idées, des questions et des contenus pour vos évaluations en quelques secondes.</p>
      </header>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden mb-8">
        <form onSubmit={handleSearch} className="p-4 flex gap-3 items-center">
          <div className="relative flex-grow">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Propose 5 exercices sur les fractions pour des CM1..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500/30 outline-none transition-all font-medium text-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white p-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center min-w-[56px]"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
          </button>
        </form>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <Sparkles className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={24} />
          </div>
          <p className="font-bold animate-pulse">L'I.A. réfléchit...</p>
        </div>
      )}

      {response && !loading && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8 relative group">
            <button
              onClick={copyToClipboard}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              title="Copier la réponse"
            >
              {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
            </button>
            
            <div className="markdown-body prose prose-slate max-w-none">
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

      {!response && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {[
            "Crée un texte à trous sur le cycle de l'eau.",
            "Donne-moi 10 mots de vocabulaire sur le thème de l'espace.",
            "Explique la règle du participe passé avec l'auxiliaire avoir."
          ].map((suggestion, i) => (
            <button
              key={i}
              onClick={() => setQuery(suggestion)}
              className="p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-sm text-slate-600 font-medium"
            >
              "{suggestion}"
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiSearch;
