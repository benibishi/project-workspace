
import React, { useState } from 'react';
import { ProjectState, Level, Category, ItemResult, InspectionStatus, Photo } from '../types';
import { Icons, COLORS } from '../constants';
import { format } from 'date-fns';

interface InspectorViewProps {
  project: ProjectState;
  onUpdate: (updated: ProjectState) => void;
  currentLevel: Level;
}

const InspectorView: React.FC<InspectorViewProps> = ({ project, onUpdate, currentLevel }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  if (!currentLevel || !project.levelData[currentLevel]) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center gap-6 animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-white/50 border border-slate-100 shadow-xl rounded-4xl flex items-center justify-center text-slate-300">
          <Icons.Alert className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Level not found</h3>
          <p className="text-slate-500 font-medium">Please select a valid level to start the inspection.</p>
        </div>
      </div>
    );
  }

  const activeLevelCategories = project.levelCategories[currentLevel] || [];

  const toggleItemStatus = (catId: string, itemName: string, newStatus: InspectionStatus) => {
    const updatedLevelData = { ...project.levelData };
    if (!updatedLevelData[currentLevel]) updatedLevelData[currentLevel] = {};
    
    const levelItems = updatedLevelData[currentLevel][catId] || [];
    const itemIndex = levelItems.findIndex(i => i.name === itemName);

    const updatedItem: ItemResult = itemIndex > -1 
      ? { ...levelItems[itemIndex], status: newStatus }
      : { 
          id: Math.random().toString(36).substr(2, 9),
          name: itemName,
          status: newStatus,
          round: newStatus === InspectionStatus.FAIL ? 1 : 0,
          notes: '',
          photos: []
        };

    if (itemIndex > -1 && newStatus === InspectionStatus.FAIL && levelItems[itemIndex].status === InspectionStatus.FAIL) {
       updatedItem.round = levelItems[itemIndex].round + 1;
    }

    if (itemIndex > -1) {
      levelItems[itemIndex] = updatedItem;
    } else {
      levelItems.push(updatedItem);
    }

    updatedLevelData[currentLevel][catId] = levelItems;
    onUpdate({ ...project, levelData: updatedLevelData });
  };

  const updateItemDetails = (catId: string, itemId: string, fields: Partial<ItemResult>) => {
    const updatedLevelData = { ...project.levelData };
    if (!updatedLevelData[currentLevel] || !updatedLevelData[currentLevel][catId]) return;

    const levelItems = updatedLevelData[currentLevel][catId].map(item => 
      item.id === itemId ? { ...item, ...fields } : item
    );
    updatedLevelData[currentLevel][catId] = levelItems;
    onUpdate({ ...project, levelData: updatedLevelData });
  };

  const handlePhotoUpload = async (catId: string, itemId: string, categoryName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const label = `${currentLevel} - ${categoryName} - ${format(new Date(), 'MMM dd, yyyy')}`;
      
      const newPhoto: Photo = {
        id: Math.random().toString(36).substr(2, 9),
        url: base64,
        label
      };

      const levelItems = project.levelData[currentLevel][catId] || [];
      const item = levelItems.find(i => i.id === itemId);
      if (item) {
        updateItemDetails(catId, itemId, { photos: [...item.photos, newPhoto] });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {activeLevelCategories.length === 0 ? (
        <div className="glass-card rounded-5xl p-24 text-center shadow-2xl border-white border-2">
           <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-4xl flex items-center justify-center mx-auto mb-8">
              <Icons.Add className="w-10 h-10 text-slate-300" />
           </div>
           <h3 className="text-2xl font-black text-slate-800 mb-2">No Category Buttons</h3>
           <p className="text-slate-500 font-medium mb-10 max-w-sm mx-auto">Switch to "EDIT" mode to add inspection categories for this selection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {activeLevelCategories.map(cat => {
            const currentLevelMap = project.levelData[currentLevel] || {};
            const catResults = currentLevelMap[cat.id] || [];
            const failCount = catResults.filter(r => r.status === InspectionStatus.FAIL).length;
            
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className="btn-modern group relative flex flex-col items-center justify-center gap-5 p-8 glass-card rounded-4xl transition-all duration-300 hover:border-brand-300 hover:shadow-brand-100/20 hover:shadow-2xl active:scale-95"
              >
                {/* Background Glow on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-4xl" />
                
                <div className={`relative w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-300 shadow-sm ${failCount > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400 group-hover:bg-brand-500 group-hover:text-white group-hover:rotate-6 group-hover:scale-110'}`}>
                  <Icons.Inspector className="w-10 h-10" />
                </div>
                
                <span className="relative font-black text-slate-800 text-center leading-tight tracking-tight text-lg">{cat.name}</span>
                
                {failCount > 0 && (
                  <div className="absolute top-6 right-6 flex h-8 px-3 items-center justify-center rounded-2xl bg-red-500 text-white text-[11px] font-black shadow-lg shadow-red-300 ring-4 ring-white animate-in zoom-in">
                    {failCount} FAIL
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedCategory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex flex-col items-end animate-in fade-in duration-300">
          <div className="w-full h-full max-w-3xl bg-white/95 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out border-l border-white/40">
            <div className="p-10 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <div className="space-y-1">
                <h3 className="text-4xl font-black tracking-tight text-slate-900 leading-none">{selectedCategory.name}</h3>
                <div className="flex items-center gap-3">
                  <span className="bg-brand-50 text-brand-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{currentLevel}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedCategory.itemNames.length} Checklist Items</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCategory(null)}
                className="p-5 bg-slate-50 hover:bg-slate-100 rounded-3xl transition-all hover:rotate-90 active:scale-90"
              >
                <Icons.Add className="w-8 h-8 rotate-45 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
              {selectedCategory.itemNames.length === 0 && (
                <div className="text-center py-20 text-slate-400 font-medium italic">No checklist items configured for this category.</div>
              )}
              {selectedCategory.itemNames.map((name, idx) => {
                const levelItems = project.levelData[currentLevel][selectedCategory.id] || [];
                const result = levelItems.find(r => r.name === name);
                const status = result?.status || null;
                const round = result?.round || 0;
                const isEscalated = round >= 3;

                return (
                  <div 
                    key={idx} 
                    className={`bg-white rounded-4xl border-2 transition-all p-8 shadow-xl shadow-slate-200/20 ${isEscalated ? 'border-purple-300 bg-purple-50/20' : 'border-slate-50 hover:border-brand-200/50'}`}
                  >
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex-1 pr-8 space-y-3">
                        <h4 className="font-black text-slate-900 text-2xl flex flex-wrap items-center gap-3 leading-tight tracking-tight">
                          {name}
                          {isEscalated && (
                            <span className="flex items-center gap-2 bg-purple-600 text-white text-[10px] px-4 py-1.5 rounded-full animate-pulse font-black uppercase tracking-widest">
                              <Icons.Alert className="w-4 h-4" />
                              Critical
                            </span>
                          )}
                        </h4>
                        {round > 0 && (
                          <div className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${round >= 2 ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' : 'bg-slate-50 text-slate-500'}`}>
                            Inspection Round {round}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3 p-2 bg-slate-100/80 rounded-3xl shadow-inner border border-slate-200/50">
                        <StatusButton 
                          label="PASS" 
                          active={status === InspectionStatus.PASS} 
                          color="bg-green-500" 
                          onClick={() => toggleItemStatus(selectedCategory.id, name, InspectionStatus.PASS)} 
                        />
                        <StatusButton 
                          label="FAIL" 
                          active={status === InspectionStatus.FAIL} 
                          color="bg-red-500" 
                          onClick={() => toggleItemStatus(selectedCategory.id, name, InspectionStatus.FAIL)} 
                        />
                      </div>
                    </div>

                    {status === InspectionStatus.FAIL && result && (
                      <div className="space-y-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="space-y-4">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Quick Tags</label>
                          <div className="flex flex-wrap gap-2.5">
                            {project.quickNotes.map(note => (
                              <button 
                                key={note}
                                onClick={() => updateItemDetails(selectedCategory.id, result.id, { notes: result.notes ? `${result.notes}\n${note}` : note })}
                                className="px-5 py-3 bg-white border border-slate-200 shadow-sm rounded-2xl text-[12px] font-bold text-slate-600 hover:bg-brand-500 hover:border-brand-500 hover:text-white transition-all duration-300 active:scale-95"
                              >
                                {note}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Deficiency Description</label>
                          <textarea 
                            rows={3}
                            value={result.notes}
                            onChange={(e) => updateItemDetails(selectedCategory.id, result.id, { notes: e.target.value })}
                            placeholder="Detail the failure requirements..."
                            className="w-full p-6 bg-slate-50/50 border border-slate-200 rounded-4xl text-base outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all resize-none font-bold leading-relaxed shadow-inner"
                          />
                        </div>

                        <div className="space-y-4">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Visual Evidence</label>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                            <label className="aspect-square bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-brand-50 hover:border-brand-500 transition-all group active:scale-95 shadow-sm">
                              <div className="bg-white p-3 rounded-2xl group-hover:bg-brand-500 group-hover:text-white transition-all shadow-md">
                                <Icons.Camera className="w-8 h-8 text-slate-400 group-hover:text-white" />
                              </div>
                              <span className="text-[10px] font-black text-slate-400 group-hover:text-brand-600 uppercase tracking-widest">Snap</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment" 
                                className="hidden" 
                                onChange={(e) => handlePhotoUpload(selectedCategory.id, result.id, selectedCategory.name, e)}
                              />
                            </label>
                            {result.photos.map(p => (
                              <div key={p.id} className="aspect-square relative group">
                                <img src={p.url} className="w-full h-full object-cover rounded-3xl shadow-xl ring-2 ring-white" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-3xl flex items-center justify-center p-4 backdrop-blur-sm">
                                   <p className="text-white text-[9px] font-black text-center leading-snug uppercase tracking-tight">{p.label}</p>
                                </div>
                                <button 
                                  onClick={() => updateItemDetails(selectedCategory.id, result.id, { photos: result.photos.filter(ph => ph.id !== p.id) })}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-2xl p-2 shadow-xl shadow-red-200 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90 z-10"
                                >
                                  <Icons.Delete className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="p-10 bg-white border-t border-slate-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
               <button 
                  onClick={() => setSelectedCategory(null)}
                  className="btn-modern w-full py-6 bg-slate-900 text-white font-black uppercase tracking-[0.25em] text-[13px] rounded-4xl shadow-2xl hover:bg-black transition-all active:scale-[0.98]"
                >
                  Verify Section
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusButton: React.FC<{ label: string, active: boolean, color: string, onClick: () => void }> = ({ label, active, color, onClick }) => (
  <button 
    onClick={onClick}
    className={`btn-modern px-6 py-4 rounded-2xl flex items-center justify-center font-black text-xs tracking-[0.1em] transition-all duration-500 shadow-sm ${
      active ? `${color} text-white shadow-xl shadow-${color.split('-')[1]}-200/50 ring-4 ring-white` : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-200/50'
    }`}
  >
    {label}
  </button>
);

export default InspectorView;
