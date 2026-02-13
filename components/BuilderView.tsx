
import React, { useState } from 'react';
import { Category, ProjectState } from '../types';
import { Icons } from '../constants';

interface BuilderViewProps {
  project: ProjectState;
  onUpdate: (updated: ProjectState) => void;
  currentLevel: string;
}

const BuilderView: React.FC<BuilderViewProps> = ({ project, onUpdate, currentLevel }) => {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newLevelName, setNewLevelName] = useState('');
  const [itemsText, setItemsText] = useState('');
  const [newQuickNote, setNewQuickNote] = useState('');
  
  const [confirmDeleteLvl, setConfirmDeleteLvl] = useState<string | null>(null);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);

  // Safely get categories for current level
  const activeLevelCategories = project.levelCategories[currentLevel] || [];

  // Category Logic
  const addCategory = () => {
    const trimmedName = newCatName.trim();
    if (!trimmedName) return;
    
    const newCat: Category = {
      id: Math.random().toString(36).substr(2, 9),
      name: trimmedName,
      itemNames: []
    };

    onUpdate({
      ...project,
      levelCategories: {
        ...project.levelCategories,
        [currentLevel]: [...activeLevelCategories, newCat]
      }
    });
    setNewCatName('');
  };

  const executeDeleteCategory = (id: string) => {
    onUpdate({
      ...project,
      levelCategories: {
        ...project.levelCategories,
        [currentLevel]: activeLevelCategories.filter(c => c.id !== id)
      }
    });
    setConfirmDeleteCat(null);
  };

  const startEdit = (cat: Category) => {
    setEditingCategory(cat);
    setItemsText(cat.itemNames.join('\n'));
  };

  const saveItems = () => {
    if (!editingCategory) return;
    const updatedCategories = activeLevelCategories.map(c => 
      c.id === editingCategory.id 
        ? { ...c, itemNames: itemsText.split('\n').filter(line => line.trim() !== '') }
        : c
    );

    onUpdate({
      ...project,
      levelCategories: {
        ...project.levelCategories,
        [currentLevel]: updatedCategories
      }
    });
    setEditingCategory(null);
  };

  // Level Logic
  const addLevel = () => {
    const trimmed = newLevelName.trim();
    if (!trimmed) return;
    if (project.levels.includes(trimmed)) {
      alert("This selection name already exists.");
      return;
    }
    
    onUpdate({
      ...project,
      levels: [...project.levels, trimmed],
      levelCategories: {
        ...project.levelCategories,
        [trimmed]: [] // Start with no buttons for a new level
      },
      levelData: {
        ...project.levelData,
        [trimmed]: {}
      }
    });
    setNewLevelName('');
  };

  const executeDeleteLevel = (lvl: string) => {
    if (project.levels.length <= 1) {
      alert("At least one selection is required.");
      setConfirmDeleteLvl(null);
      return;
    }

    const { [lvl]: _, ...remainingData } = project.levelData;
    const { [lvl]: __, ...remainingCats } = project.levelCategories;
    
    onUpdate({
      ...project,
      levels: project.levels.filter(l => l !== lvl),
      levelCategories: remainingCats,
      levelData: remainingData
    });
    
    setConfirmDeleteLvl(null);
  };

  // Quick Notes Logic
  const addQuickNote = () => {
    const trimmed = newQuickNote.trim();
    if (!trimmed) return;
    if (project.quickNotes.includes(trimmed)) return;

    onUpdate({
      ...project,
      quickNotes: [...project.quickNotes, trimmed]
    });
    setNewQuickNote('');
  };

  const deleteQuickNote = (note: string) => {
    onUpdate({
      ...project,
      quickNotes: project.quickNotes.filter(n => n !== note)
    });
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-32 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Dropdown Manager */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
             <Icons.Builder className="w-5 h-5" />
          </div>
          Dropdown Manager
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-md ml-2">Levels</span>
        </h2>
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex gap-3">
            <input 
              type="text" 
              placeholder="e.g. Roof, Unit 1, Parking..."
              className="flex-1 p-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-bold transition-all"
              value={newLevelName}
              onChange={(e) => setNewLevelName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addLevel()}
            />
            <button 
              onClick={addLevel}
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
            >
              Add
            </button>
          </div>
          
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {project.levels.map(lvl => (
              <div key={lvl} className={`flex items-center justify-between border-2 px-5 py-4 rounded-2xl transition-all ${confirmDeleteLvl === lvl ? 'bg-red-50 border-red-200' : 'bg-white border-slate-50 hover:border-slate-100'}`}>
                <span className={`font-black text-sm tracking-tight transition-colors ${confirmDeleteLvl === lvl ? 'text-red-700' : 'text-slate-700'}`}>
                  {lvl}
                </span>
                
                <div className="flex items-center gap-2">
                  {confirmDeleteLvl === lvl ? (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setConfirmDeleteLvl(null)}
                        className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => executeDeleteLevel(lvl)}
                        className="px-4 py-2 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setConfirmDeleteLvl(lvl);
                        setConfirmDeleteCat(null);
                      }}
                      className="w-10 h-10 flex items-center justify-center text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Icons.Delete className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Button Manager */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
               <Icons.Inspector className="w-5 h-5" />
            </div>
            Button Manager
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-md ml-2">Categories</span>
          </h2>
          <div className="bg-brand-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase shadow-lg shadow-brand-200">
            For: {currentLevel}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex gap-3">
            <input 
              type="text" 
              placeholder={`Add button for ${currentLevel}...`}
              className="flex-1 p-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-sm font-bold transition-all"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
            <button 
              onClick={addCategory}
              className="bg-brand-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-200 hover:bg-brand-700 active:scale-95 transition-all"
            >
              Create
            </button>
          </div>

          <div className="divide-y divide-slate-50">
            {activeLevelCategories.map(cat => (
              <div key={cat.id} className={`p-6 flex items-center justify-between transition-all ${confirmDeleteCat === cat.id ? 'bg-red-50' : 'hover:bg-slate-50/30'}`}>
                <div className="flex-1">
                  <h3 className={`font-black text-base tracking-tight ${confirmDeleteCat === cat.id ? 'text-red-700' : 'text-slate-800'}`}>{cat.name}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{cat.itemNames.length} Checklist Items</p>
                </div>
                
                <div className="flex gap-3">
                  {confirmDeleteCat === cat.id ? (
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setConfirmDeleteCat(null)}
                        className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => executeDeleteCategory(cat.id)}
                        className="px-6 py-3 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-red-200 active:scale-95 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => startEdit(cat)}
                        className="px-5 py-3 bg-white border border-slate-100 text-brand-600 hover:bg-brand-50 rounded-2xl transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95"
                      >
                        <Icons.Builder className="w-4 h-4" />
                        List
                      </button>
                      <button 
                        onClick={() => {
                          setConfirmDeleteCat(cat.id);
                          setConfirmDeleteLvl(null);
                        }}
                        className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
                      >
                        <Icons.Delete className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {activeLevelCategories.length === 0 && (
              <div className="p-12 text-center text-slate-300 font-medium italic text-sm">
                No buttons configured for "{currentLevel}".
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Notes Manager */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
             <Icons.InProgress className="w-5 h-5" />
          </div>
          Quick Notes
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-md ml-2">Presets</span>
        </h2>
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex gap-3">
            <input 
              type="text" 
              placeholder="e.g. Missing Screws, Cracked Joist..."
              className="flex-1 p-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 text-sm font-bold transition-all"
              value={newQuickNote}
              onChange={(e) => setNewQuickNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addQuickNote()}
            />
            <button 
              onClick={addQuickNote}
              className="bg-amber-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-200 hover:bg-amber-700 active:scale-95 transition-all"
            >
              Add
            </button>
          </div>
          
          <div className="p-8 flex flex-wrap gap-3">
            {project.quickNotes.map(note => (
              <div 
                key={note} 
                className="group flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all shadow-sm"
              >
                <span className="text-[11px] font-extrabold text-slate-600 group-hover:text-amber-700">{note}</span>
                <button 
                  onClick={() => deleteQuickNote(note)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Icons.Add className="w-3.5 h-3.5 rotate-45" />
                </button>
              </div>
            ))}
            {project.quickNotes.length === 0 && (
              <p className="w-full text-center py-6 text-slate-300 italic text-sm">No quick notes saved.</p>
            )}
          </div>
        </div>
      </section>

      {/* Edit Items Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="space-y-1">
                <h3 className="font-black text-xl tracking-tight text-slate-900 leading-none">Edit Checklist</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-600">{editingCategory.name}</p>
              </div>
              <button onClick={() => setEditingCategory(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all">
                <Icons.Add className="w-6 h-6 rotate-45 text-slate-400" />
              </button>
            </div>
            <div className="p-8">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Items List (One per line)</label>
              <textarea 
                className="w-full h-72 p-6 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-sans text-sm font-bold leading-relaxed resize-none"
                value={itemsText}
                onChange={(e) => setItemsText(e.target.value)}
                placeholder="Studs&#10;Headers&#10;Blocking..."
              />
              <p className="mt-3 text-[10px] font-medium text-slate-400 italic text-center px-4">These items will appear inside the button during the inspection walk.</p>
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={() => setEditingCategory(null)}
                className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveItems}
                className="flex-1 py-4 bg-brand-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-brand-200 hover:bg-brand-700 active:scale-95 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuilderView;
