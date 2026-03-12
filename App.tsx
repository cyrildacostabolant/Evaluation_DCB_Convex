
import React, { useState, useEffect } from 'react';
import { Tab, Evaluation, Category } from './types';
import { LayoutGrid, FilePlus, BookOpen, Clock, Tags, FileText, GraduationCap, X, Trash2, AlertTriangle, ChevronRight, Sparkles, Archive, ArchiveRestore, BrainCircuit } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { anyApi } from 'convex/server';

import CategoryManager from './components/CategoryManager';
import EvaluationEditor from './components/EvaluationEditor';
import PdfPreview from './components/PdfPreview';
import AiSearch from './components/AiSearch';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  const categories = useQuery(anyApi.categories.get) || [];
  const evaluations = useQuery(anyApi.evaluations.get) || [];
  
  const removeEvaluation = useMutation(anyApi.evaluations.remove);
  const toggleArchive = useMutation(anyApi.evaluations.toggleArchive);
  const pingResult = useQuery(anyApi.evaluations.ping);

  useEffect(() => {
    if (pingResult) {
      console.log("Backend Ping Result:", pingResult);
    }
  }, [pingResult]);

  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ eval: Evaluation, mode: 'student' | 'teacher' } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState<Evaluation | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<Evaluation | null>(null);

  const handleEditEvaluation = (id: string | null) => {
    setSelectedEvalId(id);
    setActiveTab('editor');
  };

  const requestPreview = (evaluation: Evaluation) => {
    setPreviewModalOpen(evaluation);
  };

  const confirmPreview = (mode: 'student' | 'teacher') => {
    if (previewModalOpen) {
      setPreviewData({ eval: previewModalOpen, mode });
      setPreviewModalOpen(null);
    }
  };

  const handleDeleteEvaluation = async () => {
    if (!deleteModalOpen) return;
    try {
      await removeEvaluation({ id: deleteModalOpen.id });
      setDeleteModalOpen(null);
    } catch (error) {
      console.error("Error deleting evaluation:", error);
    }
  };

  const handleToggleArchive = async (id: string, currentStatus: boolean) => {
    try {
      await toggleArchive({ id, is_archived: !currentStatus });
    } catch (error) {
      console.error("Error toggling archive status:", error);
    }
  };

  const renderDashboard = () => (
    <div className="max-w-[1600px] mx-auto p-6 md:p-8 animate-fade-in">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
            <Sparkles size={16} />
            <span className="uppercase tracking-wider text-[10px]">Espace Famille DCB</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tableau de bord</h1>
        </div>
        <button 
          onClick={() => handleEditEvaluation(null)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 flex items-center gap-2 group text-sm"
        >
          <FilePlus size={18} className="group-hover:rotate-12 transition-transform" />
          Nouveau questionnaire
        </button>
      </header>

      {categories.length === 0 ? (
         <div className="text-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 mt-8">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-500">
              <Tags size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Aucune matière configurée</h2>
            <p className="mb-6 text-slate-500 max-w-sm mx-auto text-sm">Commencez par organiser votre espace en créant vos matières d'enseignement.</p>
            <button 
              onClick={() => setActiveTab('categories')} 
              className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all text-sm"
            >
              Gérer les matières
            </button>
         </div>
      ) : (
        <div className="space-y-8">
          {categories.map(cat => {
            const catEvals = evaluations.filter(e => e.category_id === cat.id && !e.is_archived);
            if (catEvals.length === 0) return null;

            return (
              <div key={cat.id} className="animate-fade-in">
                <div className="flex items-center justify-between mb-3 group cursor-default">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: cat.color }}></div>
                    <h2 className="text-xl font-extrabold text-slate-800">{cat.name}</h2>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-bold uppercase tracking-widest">
                      {catEvals.length}
                    </span>
                  </div>
                  <div className="h-px flex-grow mx-4 bg-slate-100"></div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {catEvals.map(ev => (
                    <div 
                      key={ev.id} 
                      className="group relative bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col h-full"
                      style={{ borderLeft: `4px solid ${cat.color}` }}
                      onClick={() => handleEditEvaluation(ev.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400 group-hover:text-indigo-500 transition-colors">
                          <FileText size={16} />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleArchive(ev.id, ev.is_archived || false);
                            }}
                            className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Archiver"
                          >
                            <Archive size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModalOpen(ev);
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-bold text-base text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2">
                        {ev.title}
                      </h3>
                      
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{new Date(ev.created_at || '').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <span>•</span>
                          <span>{ev.questions.length} quest.</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderArchives = () => (
    <div className="max-w-[1600px] mx-auto p-6 md:p-8 animate-fade-in">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-amber-600 font-bold mb-1">
          <Archive size={16} />
          <span className="uppercase tracking-wider text-[10px]">Espace Famille DCB</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Archives</h1>
        <p className="text-slate-500 mt-1">Retrouvez ici vos anciens questionnaires archivés.</p>
      </header>

      {evaluations.filter(e => e.is_archived).length === 0 ? (
        <div className="text-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 mt-8">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Archive size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Aucune archive</h2>
          <p className="text-slate-500 max-w-sm mx-auto text-sm">Vos questionnaires archivés apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map(cat => {
            const catEvals = evaluations.filter(e => e.category_id === cat.id && e.is_archived);
            if (catEvals.length === 0) return null;

            return (
              <div key={cat.id} className="animate-fade-in">
                <div className="flex items-center justify-between mb-3 group cursor-default">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: cat.color }}></div>
                    <h2 className="text-xl font-extrabold text-slate-800">{cat.name}</h2>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-bold uppercase tracking-widest">
                      {catEvals.length}
                    </span>
                  </div>
                  <div className="h-px flex-grow mx-4 bg-slate-100"></div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {catEvals.map(ev => (
                    <div 
                      key={ev.id} 
                      className="group relative bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer flex flex-col h-full opacity-75 hover:opacity-100"
                      style={{ borderLeft: `4px solid ${cat.color}` }}
                      onClick={() => handleEditEvaluation(ev.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400 group-hover:text-amber-500 transition-colors">
                          <Archive size={16} />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleArchive(ev.id, ev.is_archived || false);
                            }}
                            className="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Restaurer"
                          >
                            <ArchiveRestore size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModalOpen(ev);
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-bold text-base text-slate-800 mb-2 group-hover:text-amber-600 transition-colors leading-tight line-clamp-2">
                        {ev.title}
                      </h3>
                      
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{new Date(ev.created_at || '').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <span>•</span>
                          <span>{ev.questions.length} quest.</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfdff] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-700">
      {!previewData && (activeTab as string) !== 'editor' && (
        <nav className="fixed left-0 top-0 h-full w-20 bg-white border-r border-slate-100 flex flex-col items-center py-6 z-20 shadow-sm print:hidden">
          <div className="mb-8 p-2.5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
            <BookOpen size={24} />
          </div>
          
          <div className="flex flex-col gap-4 w-full px-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 group ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              title="Tableau de bord"
            >
              <LayoutGrid size={20} className={`${activeTab === 'dashboard' ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Accueil</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 group ${activeTab === 'categories' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              title="Matières"
            >
              <Tags size={20} className={`${activeTab === 'categories' ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Matières</span>
            </button>
            <button
              onClick={() => setActiveTab('archives')}
              className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 group ${activeTab === 'archives' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              title="Archives"
            >
              <Archive size={20} className={`${activeTab === 'archives' ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Archives</span>
            </button>
            <button
              onClick={() => setActiveTab('ai_search')}
              className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 group ${activeTab === 'ai_search' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              title="Recherche I.A."
            >
              <BrainCircuit size={20} className={`${activeTab === 'ai_search' ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              <span className="text-[9px] font-bold uppercase tracking-wider">I.A.</span>
            </button>
          </div>
          
          <div className="mt-auto mb-4 text-slate-300 font-black text-[10px] vertical-text tracking-[0.2em] opacity-50">
            DCB
          </div>
        </nav>
      )}

      <main className={`${!previewData && (activeTab as string) !== 'editor' ? 'pl-20' : ''} min-h-screen print:pl-0 print:min-h-0 print:h-auto`}>
        {/* Wrapper pour masquer le contenu d'arrière-plan à l'impression */}
        <div className="print:hidden">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'archives' && renderArchives()}
          {activeTab === 'ai_search' && <AiSearch />}
          
          {activeTab === 'categories' && (
            <div className="p-8">
              <CategoryManager onBack={() => setActiveTab('dashboard')} />
            </div>
          )}
          
          {activeTab === 'editor' && (
            <EvaluationEditor 
              evaluationId={selectedEvalId} 
              onClose={() => setActiveTab('dashboard')}
              onPreview={requestPreview}
            />
          )}
        </div>

        {previewData && (
          <PdfPreview 
            evaluation={previewData.eval}
            category={categories.find(c => c.id === previewData.eval.category_id)}
            mode={previewData.mode}
            onClose={() => setPreviewData(null)}
          />
        )}
      </main>

      {/* Modal Backdrop Styling - Hidden on print */}
      {previewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full p-10 animate-fade-in relative">
            <button onClick={() => setPreviewModalOpen(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-3xl font-black text-slate-900 mb-3">Mode d'aperçu</h3>
            <p className="text-slate-500 mb-10 text-lg">
              Préparez le document pour <strong>{previewModalOpen.title}</strong>.
            </p>
            <div className="grid grid-cols-1 gap-5">
              <button 
                onClick={() => confirmPreview('student')}
                className="flex items-center gap-5 p-6 border-2 border-slate-50 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group text-left"
              >
                <div className="bg-indigo-100 text-indigo-600 p-4 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <GraduationCap size={28} />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-lg">Version Élève</div>
                  <div className="text-slate-500">Prêt pour le contrôle, espaces vides.</div>
                </div>
              </button>
              <button 
                onClick={() => confirmPreview('teacher')}
                className="flex items-center gap-5 p-6 border-2 border-slate-50 rounded-3xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-left"
              >
                <div className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <FileText size={28} />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-lg">Version Professeur</div>
                  <div className="text-slate-500">Corrigé complet inclus.</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-10 animate-fade-in text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">Supprimer ?</h3>
            <p className="text-slate-500 mb-10">
              Voulez-vous vraiment supprimer <strong>"{deleteModalOpen.title}"</strong> ? Cette action est irréversible.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteModalOpen(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">
                Annuler
              </button>
              <button onClick={handleDeleteEvaluation} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
