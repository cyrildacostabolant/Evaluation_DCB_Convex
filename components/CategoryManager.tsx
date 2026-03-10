
import React, { useState } from 'react';
import { Category } from '../types';
import { Trash2, Plus, Save, Pencil, X, AlertTriangle, Palette } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { anyApi } from 'convex/server';

interface CategoryManagerProps {
  onBack: () => void;
}

const COLORS = [
  '#64748b', '#475569', '#ef4444', '#dc2626', 
  '#f97316', '#ea580c', '#f59e0b', '#d97706', 
  '#facc15', '#eab308', '#84cc16', '#65a30d', 
  '#22c55e', '#16a34a', '#10b981', '#059669', 
  '#14b8a6', '#0d9488', '#06b6d4', '#0891b2', 
  '#0ea5e9', '#0284c7', '#3b82f6', '#2563eb', 
  '#6366f1', '#4f46e5', '#8b5cf6', '#7c3aed', 
  '#a855f7', '#9333ea', '#ec4899', '#f43f5e'
];

const CategoryManager: React.FC<CategoryManagerProps> = ({ onBack }) => {
  const categories = useQuery(anyApi.categories.get);
  const addCategory = useMutation(anyApi.categories.add);
  const updateCategory = useMutation(anyApi.categories.update);
  const removeCategory = useMutation(anyApi.categories.remove);

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async () => {
    if (!newCatName.trim()) return;
    setErrorMsg(null);

    try {
      if (editingId) {
        await updateCategory({ 
          id: editingId, 
          name: newCatName, 
          color: newCatColor 
        });
        setEditingId(null);
      } else {
        await addCategory({ name: newCatName, color: newCatColor });
      }

      setNewCatName('');
      setNewCatColor(COLORS[0]);
    } catch (error) {
      console.error("Error saving category:", error);
      setErrorMsg("Une erreur est survenue lors de la sauvegarde.");
    }
  };

  const startEdit = (cat: Category) => {
    setErrorMsg(null);
    setEditingId(cat.id);
    setNewCatName(cat.name);
    setNewCatColor(cat.color);
  };

  const cancelEdit = () => {
    setErrorMsg(null);
    setEditingId(null);
    setNewCatName('');
    setNewCatColor(COLORS[0]);
  };

  const confirmDelete = async () => {
    if (!deleteCandidateId) return;
    try {
        await removeCategory({ id: deleteCandidateId });
        if (editingId === deleteCandidateId) cancelEdit();
        setDeleteCandidateId(null);
    } catch (error: any) {
        setErrorMsg("Impossible de supprimer cette catégorie car elle contient des évaluations.");
        setDeleteCandidateId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Matières</h2>
          <p className="text-slate-500 font-medium">Configurez et personnalisez vos disciplines d'enseignement.</p>
        </div>
        <button onClick={onBack} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold transition-colors">
          Retour
        </button>
      </div>

      {errorMsg && (
        <div className="mb-8 p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-700 animate-fade-in">
            <AlertTriangle size={24} />
            <p className="font-semibold">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="ml-auto p-1.5 hover:bg-rose-100 rounded-lg transition-colors"><X size={18} /></button>
        </div>
      )}

      <div className={`p-8 rounded-[32px] border-2 transition-all mb-12 ${editingId ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-100 shadow-sm'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
          <div>
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">
              {editingId ? 'Nouveau nom' : 'Nom de la matière'}
            </label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none bg-white font-bold text-slate-800 transition-all"
              placeholder="Ex: Mathématiques"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">
              Identité visuelle
            </label>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewCatColor(c)}
                  className={`w-10 h-10 rounded-full border-4 transition-all ${newCatColor === c ? 'border-white ring-4 ring-indigo-500/20 scale-110 shadow-lg' : 'border-transparent hover:scale-110 opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={!newCatName.trim()}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${editingId ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
          >
            {editingId ? <Save size={20} /> : <Plus size={20} />}
            {editingId ? 'Mettre à jour la discipline' : 'Ajouter la discipline'}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="bg-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-black hover:bg-slate-300 transition-colors">
              Annuler
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories === undefined ? (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold">Chargement de vos ressources...</div>
        ) : categories.map(cat => (
          <div key={cat.id} className="group flex justify-between items-center p-5 bg-white border border-slate-100 rounded-[24px] hover:shadow-lg hover:shadow-slate-200/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl shadow-inner flex items-center justify-center" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                <Palette size={20} />
              </div>
              <span className="font-extrabold text-slate-800 text-lg">{cat.name}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => startEdit(cat)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                <Pencil size={18} />
              </button>
              <button onClick={() => setDeleteCandidateId(cat.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {categories !== undefined && categories.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-300 italic">Configurez votre première matière ci-dessus.</div>
        )}
      </div>

      {deleteCandidateId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-10 animate-fade-in text-center">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Confirmation</h3>
                <p className="text-slate-500 mb-10 font-medium leading-relaxed">
                    Voulez-vous supprimer cette matière ? Assurez-vous qu'aucune évaluation n'y est rattachée.
                </p>
                <div className="flex gap-4">
                    <button onClick={() => setDeleteCandidateId(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">
                        Annuler
                    </button>
                    <button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-colors">
                        Confirmer
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
