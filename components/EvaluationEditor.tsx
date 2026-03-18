
import React, { useState, useEffect, useRef } from 'react';
import { Category, Evaluation, Question } from '../types';
import RichTextEditor from './RichTextEditor';
import { Plus, Trash2, ArrowLeft, GripVertical, FileText, CheckCircle, AlertCircle, X, Sparkles, Layout, Layers, Calculator, Save, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, ListChecks, Check, Square } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { anyApi } from 'convex/server';

interface EvaluationEditorProps {
  evaluationId?: string | null;
  onClose: () => void;
  onPreview: (evaluation: Evaluation) => void;
}

const EvaluationEditor: React.FC<EvaluationEditorProps> = ({ evaluationId, onClose, onPreview }) => {
  const categories = useQuery(anyApi.categories.get);
  const allEvals = useQuery(anyApi.evaluations.get);
  const saveEvaluationMutation = useMutation(anyApi.evaluations.save);

  const [evaluation, setEvaluation] = useState<Evaluation>({
    id: evaluationId || '',
    title: '',
    category_id: '',
    is_archived: false,
    questions: []
  });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Refs pour les textareas auto-extensibles
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  useEffect(() => {
    if (categories === undefined || allEvals === undefined) return;
    if (initialized) return;

    if (evaluationId) {
      const found = allEvals.find((e: any) => e.id === evaluationId);
      if (found) {
        // Assurer la rétrocompatibilité si 'points' n'existe pas
        const safeEval = JSON.parse(JSON.stringify(found));
        safeEval.questions = safeEval.questions.map((q: any) => ({
           ...q,
           points: q.points ?? 2,
           is_mcq: q.is_mcq ?? false,
           mcq_options: q.mcq_options ?? []
        }));
        safeEval.is_archived = safeEval.is_archived ?? false;
        setEvaluation(safeEval);
        // Par défaut, on étend toutes les questions au chargement
        setExpandedIds(new Set(safeEval.questions.map((q: any) => q.id)));
      }
    } else if (categories.length > 0) {
      setEvaluation(prev => ({ ...prev, category_id: categories[0].id }));
    }
    setLoading(false);
    setInitialized(true);
  }, [categories, allEvals, evaluationId, initialized]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fonction pour ajuster la hauteur des textareas
  const adjustTextareaHeight = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const addQuestion = () => {
    // Récupérer la section de la dernière question pour l'héritage
    const lastQuestion = evaluation.questions[evaluation.questions.length - 1];
    const inheritedSection = lastQuestion ? lastQuestion.section_name : 'Exercice 1';
    const newId = crypto.randomUUID();

    const newQ: Question = {
      id: newId,
      section_name: inheritedSection,
      question_text: '',
      teacher_answer: '',
      student_prompt: null,
      order_index: evaluation.questions.length,
      points: 2, // Défaut 2 points
      is_mcq: false,
      mcq_options: []
    };
    setEvaluation(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
    // Étendre automatiquement la nouvelle question
    setExpandedIds(prev => new Set(prev).add(newId));
    
    // Scroll fluide vers le bas après ajout (petit délai pour laisser le rendu se faire)
    setTimeout(() => {
       window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...evaluation.questions];
    updated[index] = { ...updated[index], [field]: value };
    setEvaluation(prev => ({ ...prev, questions: updated }));
  };

  const removeQuestion = (index: number) => {
    const updated = evaluation.questions.filter((_, i) => i !== index);
    setEvaluation(prev => ({ ...prev, questions: updated }));
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (expand: boolean) => {
    if (expand) {
      setExpandedIds(new Set(evaluation.questions.map(q => q.id)));
    } else {
      setExpandedIds(new Set());
    }
  };

  const generateUploadUrl = useMutation(anyApi.evaluations.generateUploadUrl);
  const getStorageUrl = useMutation(anyApi.evaluations.getUrl);

  const processBase64Images = async (html: string) => {
    if (!html) return html;
    
    // Regex to find base64 images
    const base64Regex = /<img[^>]+src="data:image\/([^;]+);base64,([^">]+)"[^>]*>/g;
    let match;
    let newHtml = html;
    const matches = [];
    
    // Find all matches first
    while ((match = base64Regex.exec(html)) !== null) {
      matches.push({
        fullTag: match[0],
        mimeType: `image/${match[1]}`,
        base64Data: match[2]
      });
    }
    
    if (matches.length === 0) return html;
    
    setNotification({ type: 'success', message: `Optimisation des images (${matches.length})...` });
    
    for (const m of matches) {
      try {
        // Convert base64 to Blob
        const byteCharacters = atob(m.base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: m.mimeType });
        
        // Upload to Convex
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": m.mimeType },
          body: blob,
        });
        
        if (!result.ok) throw new Error("Upload failed");
        
        const { storageId } = await result.json();
        const url = await getStorageUrl({ storageId });
        
        if (url) {
          // Replace the base64 src with the new URL in the tag
          const newTag = m.fullTag.replace(/src="data:image\/[^;]+;base64,[^">]+" /g, `src="${url}" `);
          // Fallback if the regex above is too strict
          const finalTag = newTag.includes(url) ? newTag : m.fullTag.replace(/src="data:image\/[^;]+;base64,[^">]+"/g, `src="${url}"`);
          
          newHtml = newHtml.replace(m.fullTag, finalTag);
        }
      } catch (err) {
        console.error("Failed to convert base64 image", err);
      }
    }
    
    return newHtml;
  };

  const addMcqOption = (questionIndex: number) => {
    const updated = [...evaluation.questions];
    const question = updated[questionIndex];
    const options = question.mcq_options || [];
    updated[questionIndex] = { 
      ...question, 
      mcq_options: [...options, { text: '', is_correct: false }] 
    };
    setEvaluation(prev => ({ ...prev, questions: updated }));
  };

  const updateMcqOption = (questionIndex: number, optionIndex: number, field: 'text' | 'is_correct', value: any) => {
    const updated = [...evaluation.questions];
    const question = updated[questionIndex];
    const options = [...(question.mcq_options || [])];
    options[optionIndex] = { ...options[optionIndex], [field]: value };
    updated[questionIndex] = { ...question, mcq_options: options };
    setEvaluation(prev => ({ ...prev, questions: updated }));
  };

  const removeMcqOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...evaluation.questions];
    const question = updated[questionIndex];
    const options = (question.mcq_options || []).filter((_, i) => i !== optionIndex);
    updated[questionIndex] = { ...question, mcq_options: options };
    setEvaluation(prev => ({ ...prev, questions: updated }));
  };

  const handleSave = async () => {
    if (!evaluation.title || !evaluation.category_id) {
      setNotification({ type: 'error', message: "Veuillez remplir le titre et choisir une matière." });
      return;
    }
    
    try {
      setLoading(true);
      
      // Process all questions to replace base64 images with storage URLs
      const processedQuestions = await Promise.all(evaluation.questions.map(async (q) => {
        const cleanQuestionText = await processBase64Images(q.question_text || '');
        const cleanTeacherAnswer = await processBase64Images(q.teacher_answer || '');
        const cleanStudentPrompt = q.student_prompt ? await processBase64Images(q.student_prompt) : null;
        
        return {
          ...q,
          question_text: cleanQuestionText,
          teacher_answer: cleanTeacherAnswer,
          student_prompt: cleanStudentPrompt,
          is_mcq: q.is_mcq || false,
          mcq_options: q.mcq_options || []
        };
      }));

      // Strip extra fields from questions to match Convex schema
      const cleanQuestions = processedQuestions.map(q => ({
        id: q.id,
        section_name: q.section_name || '',
        question_text: q.question_text || '',
        teacher_answer: q.teacher_answer || '',
        student_prompt: q.student_prompt,
        order_index: (q.order_index === null || isNaN(q.order_index)) ? 0 : q.order_index,
        points: (q.points === null || isNaN(q.points)) ? 0 : q.points,
        is_mcq: q.is_mcq,
        mcq_options: q.mcq_options
      }));
      
      const evalToSave = {
        id: evaluation.id || undefined,
        title: evaluation.title,
        category_id: evaluation.category_id,
        is_archived: evaluation.is_archived,
        questions: cleanQuestions
      };
      
      const newId = await saveEvaluationMutation(evalToSave);
      if (newId && typeof newId === 'string') {
        setEvaluation(prev => ({ ...prev, id: newId }));
      }
      setNotification({ type: 'success', message: "Sauvegardé avec succès !" });
    } catch (e) {
      console.error("Save error:", e);
      setNotification({ type: 'error', message: "Erreur lors de la sauvegarde." });
    } finally {
      setLoading(false);
    }
  };

  if (loading || categories === undefined) return <div className="p-20 text-center font-bold text-slate-400">Ouverture de l'éditeur...</div>;

  const currentCategory = categories.find(c => c.id === evaluation.category_id);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 pb-32 animate-fade-in">
      
      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 text-white font-bold transition-all animate-fade-in ${notification.type === 'success' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
          {notification.type === 'success' ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80"><X size={18}/></button>
        </div>
      )}

      {/* Interface Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 sticky top-0 z-30 bg-[#fcfdff]/90 backdrop-blur-sm py-2">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-all text-slate-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-none">
              {evaluationId ? 'Modifier' : 'Nouveau'}
            </h2>
            <p className="text-xs text-slate-400 font-bold mt-1">Éditeur d'évaluation</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSave}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-all shadow-sm text-xs uppercase tracking-wider"
          >
            <Save size={16} className="text-indigo-500" /> Sauvegarder
          </button>
          <button 
            onClick={() => onPreview(evaluation)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition-all group text-xs uppercase tracking-wider"
          >
            <FileText size={16} className="group-hover:translate-x-0.5 transition-transform" /> PDF
          </button>
        </div>
      </div>

      {/* Main Form Sections - Condensed */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 ml-1">Titre du document</label>
          <input
            type="text"
            className="w-full text-lg font-bold p-2 bg-slate-50 border border-slate-200 focus:border-indigo-500/30 focus:bg-white rounded-lg outline-none transition-all text-slate-800"
            placeholder="Ex: Évaluation de Mathématiques - T1"
            value={evaluation.title}
            onChange={(e) => setEvaluation({ ...evaluation, title: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 ml-1">Discipline</label>
          <div className="relative">
            <select
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500/30 focus:bg-white outline-none font-bold text-slate-700 appearance-none transition-all text-sm"
              value={evaluation.category_id}
              onChange={(e) => setEvaluation({ ...evaluation, category_id: e.target.value })}
            >
              <option value="" disabled>Sélectionner...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Layout size={14} />
            </div>
          </div>
          {currentCategory && (
            <div className="mt-1 flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentCategory.color }}></span>
              Code couleur actif
            </div>
          )}
        </div>
      </div>

      {/* Questions Stack Toolbar */}
      <div className="flex justify-between items-end mb-2 px-1">
         <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Questions ({evaluation.questions.length})</h3>
         <div className="flex gap-2">
            <button 
              onClick={() => toggleAll(true)}
              className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 px-2 py-1 rounded flex items-center gap-1 transition-colors"
            >
               <ChevronsDown size={12} /> Développer
            </button>
            <button 
              onClick={() => toggleAll(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 px-2 py-1 rounded flex items-center gap-1 transition-colors"
            >
               <ChevronsUp size={12} /> Réduire
            </button>
         </div>
      </div>

      {/* Questions Stack - Condensed */}
      <div className="space-y-3">
        {evaluation.questions.map((q, idx) => {
          const isExpanded = expandedIds.has(q.id);

          return (
            <div 
              key={q.id} 
              className={`bg-white rounded-2xl shadow-sm border transition-all animate-fade-in ${isExpanded ? 'border-indigo-100 ring-4 ring-indigo-50/50' : 'border-slate-200 hover:border-indigo-200 overflow-hidden'}`}
              style={{ position: 'relative', zIndex: 100 - idx }}
            >
              {/* Question Header - Compact */}
              <div 
                className={`px-4 py-2 flex justify-between items-center gap-2 cursor-pointer ${isExpanded ? 'bg-slate-50/80 border-b border-indigo-50' : 'bg-white hover:bg-slate-50'}`}
                onClick={() => toggleExpand(q.id)}
              >
                <div className="flex items-center gap-3 flex-grow overflow-hidden">
                  <div className="text-slate-300 hover:text-indigo-400 transition-colors p-1 cursor-grab" onClick={(e) => e.stopPropagation()}>
                    <GripVertical size={16} />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleExpand(q.id); }}
                      className={`p-1 rounded-md text-slate-400 transition-all ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-200'}`}
                    >
                       {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <span className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm flex-shrink-0">
                      {idx + 1}
                    </span>
                  </div>

                  {/* Condensed Section/Points in Header */}
                  <div className="flex items-center gap-2 flex-grow overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border border-slate-200 focus-within:border-indigo-300 transition-colors">
                      <Layers size={12} className="text-slate-400" />
                      <input
                        type="text"
                        value={q.section_name}
                        onChange={(e) => updateQuestion(idx, 'section_name', e.target.value)}
                        className="bg-transparent font-bold text-slate-600 outline-none text-xs w-32 placeholder:text-slate-300"
                        placeholder="Section"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border border-slate-200 focus-within:border-amber-300 transition-colors">
                      <Calculator size={12} className="text-slate-400" />
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={q.points || 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateQuestion(idx, 'points', isNaN(val) ? 0 : val);
                        }}
                        className="bg-transparent font-bold text-slate-600 outline-none text-xs w-8 text-center"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">pts</span>
                    </div>

                    {!isExpanded && (
                        <div className="ml-2 text-xs text-slate-400 truncate max-w-[300px] border-l border-slate-100 pl-3 italic">
                           {q.question_text || "Question vide..."}
                        </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); removeQuestion(idx); }} 
                  className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0"
                  title="Supprimer la question"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              {/* Expandable Body */}
              {isExpanded && (
                <div className="p-4 space-y-4 bg-white">
                  {/* Question Input */}
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 ml-1">Énoncé</label>
                      <button
                        onClick={() => updateQuestion(idx, 'is_mcq', !q.is_mcq)}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${q.is_mcq ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                      >
                        <ListChecks size={12} />
                        {q.is_mcq ? 'Mode QCM Actif' : 'Passer en QCM'}
                      </button>
                    </div>
                    <textarea
                      ref={(el) => { textareaRefs.current[idx] = el; }}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 focus:bg-white outline-none overflow-hidden min-h-[60px] font-medium text-slate-700 transition-all leading-relaxed resize-none text-sm"
                      placeholder="Tapez ici l'énoncé complet..."
                      value={q.question_text}
                      rows={1}
                      onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                      onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                      style={{ height: 'auto' }} 
                    />
                  </div>

                  {/* MCQ Options */}
                  {q.is_mcq && (
                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 space-y-3">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                          <ListChecks size={14} /> Options du QCM
                        </h4>
                        <button 
                          onClick={() => addMcqOption(idx)}
                          className="text-[10px] font-bold text-amber-700 hover:bg-amber-100 px-2 py-1 rounded transition-colors flex items-center gap-1"
                        >
                          <Plus size={12} /> Ajouter une option
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {(q.mcq_options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2 animate-fade-in">
                            <button
                              onClick={() => updateMcqOption(idx, optIdx, 'is_correct', !opt.is_correct)}
                              className={`w-6 h-6 rounded flex items-center justify-center transition-all ${opt.is_correct ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-300 hover:border-emerald-300'}`}
                              title={opt.is_correct ? "Réponse correcte" : "Marquer comme correcte"}
                            >
                              {opt.is_correct ? <Check size={14} /> : <Square size={14} />}
                            </button>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => updateMcqOption(idx, optIdx, 'text', e.target.value)}
                              placeholder={`Option ${optIdx + 1}`}
                              className="flex-grow bg-white border border-slate-200 rounded px-3 py-1.5 text-sm font-medium text-slate-700 focus:border-amber-300 outline-none transition-all"
                            />
                            <button
                              onClick={() => removeMcqOption(idx, optIdx)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        
                        {(q.mcq_options || []).length === 0 && (
                          <div className="text-center py-4 text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                            Aucune option définie
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid lg:grid-cols-2 gap-4">
                    {/* Corrigé */}
                    <div>
                      <div className="flex items-center gap-2 mb-1 ml-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <label className="block text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">Réponse Prof</label>
                      </div>
                      <RichTextEditor
                        value={q.teacher_answer}
                        onChange={(val) => updateQuestion(idx, 'teacher_answer', val)}
                        className="rounded-xl border border-slate-200 hover:border-emerald-200 focus-within:border-emerald-300 transition-all shadow-sm"
                        placeholder="Réponse type..."
                      />
                    </div>

                    {/* Espace Élève */}
                    <div>
                      <div className="flex justify-between items-center mb-1 ml-1">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em]">Espace Élève</label>
                        </div>
                        <button
                          onClick={() => updateQuestion(idx, 'student_prompt', q.student_prompt === null ? '' : null)}
                          className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
                        >
                          {q.student_prompt === null ? <Plus size={12} /> : <X size={12} />}
                          {q.student_prompt === null ? 'Zone Spéciale' : 'Lignes'}
                        </button>
                      </div>
                      
                      {q.student_prompt === null ? (
                        <div className="h-[100px] w-full border border-dashed border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 text-[9px] font-black flex-col relative overflow-hidden group/zone">
                          <div className="w-full h-full dotted-lines opacity-20 group-hover/zone:opacity-30 transition-opacity"></div>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <Sparkles size={16} className="mb-1 opacity-30" />
                            <span className="uppercase tracking-widest">Lignes automatiques</span>
                          </div>
                        </div>
                      ) : (
                        <RichTextEditor
                          value={q.student_prompt || ''}
                          onChange={(val) => updateQuestion(idx, 'student_prompt', val)}
                          className="rounded-xl border border-slate-200 hover:border-indigo-200 focus-within:border-indigo-300 transition-all shadow-sm"
                          placeholder="Contenu pré-rempli..."
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={addQuestion}
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 group mt-4"
        >
          <div className="p-1.5 bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 rounded-lg transition-all">
            <Plus size={20} />
          </div>
          <span className="text-xs font-black uppercase tracking-[0.2em]">Ajouter une question</span>
        </button>

        {/* Bottom Save Bar */}
        <div className="sticky bottom-4 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-xl flex justify-between items-center animate-fade-in z-40 mt-6">
           <div className="text-[10px] font-bold text-slate-400 pl-2">
             {evaluation.questions.length} question{evaluation.questions.length > 1 ? 's' : ''} • {evaluation.questions.reduce((acc, q) => acc + (q.points || 0), 0)} points total
           </div>
           <div className="flex gap-2">
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold transition-all shadow-md text-xs uppercase tracking-wider"
              >
                <Save size={16} /> Enregistrer
              </button>
              <button 
                onClick={() => onPreview(evaluation)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition-all text-xs uppercase tracking-wider"
              >
                <FileText size={16} /> Aperçu
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationEditor;
        