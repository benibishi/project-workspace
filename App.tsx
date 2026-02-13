
import React, { useState, useEffect, useMemo } from 'react';
import { ProjectState, InspectionStatus } from './types';
import { Icons } from './constants';
import { 
  saveAllProjects, 
  loadAllProjects, 
  saveActiveProjectId, 
  loadActiveProjectId,
  createNewProject 
} from './utils/storage';
import BuilderView from './components/BuilderView';
import InspectorView from './components/InspectorView';
import { generatePDFReport } from './utils/pdfGenerator';

const App: React.FC = () => {
  const [projects, setProjects] = useState<ProjectState[]>(() => loadAllProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => loadActiveProjectId());
  const [mode, setMode] = useState<'builder' | 'inspector'>('inspector');
  const [currentLevel, setCurrentLevel] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    saveAllProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveActiveProjectId(activeProjectId);
  }, [activeProjectId]);

  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId) || null,
  [projects, activeProjectId]);

  useEffect(() => {
    if (activeProject) {
      if (!currentLevel || !activeProject.levels.includes(currentLevel)) {
        setCurrentLevel(activeProject.levels[0] || '');
      }
    }
  }, [activeProject, activeProject?.levels]);

  const handleUpdateActiveProject = (updated: ProjectState) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const project = createNewProject(newProjectName.trim());
    setProjects(prev => [...prev, project]);
    setActiveProjectId(project.id);
    setNewProjectName('');
    setShowNewProjectModal(false);
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this project? All data will be permanently removed.')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProjectId === id) setActiveProjectId(null);
    }
  };

  const syncReport = () => {
    if (!activeProject) return;
    setIsSyncing(true);
    setTimeout(() => {
      generatePDFReport(activeProject);
      setIsSyncing(false);
    }, 1200);
  };

  if (!activeProject) {
    return (
      <div className="min-h-screen p-8 md:p-16 lg:p-24">
        <div className="max-w-6xl mx-auto">
          <header className="mb-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center shadow-xl shadow-brand-500/20">
                  <Icons.Inspector className="w-6 h-6 text-white" />
                </div>
                <span className="text-[13px] font-black uppercase tracking-[0.3em] text-brand-600">Canvas v1.4</span>
              </div>
              <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">Project Workspace</h1>
              <p className="text-slate-500 font-medium text-xl max-w-xl leading-relaxed">Precision inspection tracking for professional site walks.</p>
            </div>
            <button 
              onClick={() => setShowNewProjectModal(true)}
              className="btn-modern group relative bg-slate-900 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-[0.15em] text-xs shadow-3xl hover:shadow-brand-300 transition-all active:scale-95 overflow-hidden flex items-center gap-4"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Icons.Add className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Start New Inspection</span>
            </button>
          </header>

          {projects.length === 0 ? (
            <div className="glass-card rounded-5xl p-24 text-center shadow-2xl border-white border-2">
              <div className="w-32 h-32 bg-white shadow-2xl rounded-5xl flex items-center justify-center mx-auto mb-10 border border-slate-100 group transition-all duration-500 hover:rotate-12">
                <Icons.Inspector className="w-12 h-12 text-slate-200 group-hover:text-brand-600 transition-colors" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Empty Workspace</h2>
              <p className="text-slate-500 mb-12 max-w-md mx-auto font-medium text-lg leading-relaxed">No projects indexed. Your walk-through data will populate here as you create inspections.</p>
              <button 
                onClick={() => setShowNewProjectModal(true)}
                className="btn-modern inline-flex items-center gap-3 text-brand-600 font-black text-sm uppercase tracking-widest hover:gap-5 transition-all"
              >
                Create First Entry <Icons.Next className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map(p => {
                let totalFails = 0;
                Object.values(p.levelData).forEach(level => {
                  Object.values(level).forEach(items => {
                    totalFails += items.filter(i => i.status === InspectionStatus.FAIL).length;
                  });
                });

                return (
                  <div 
                    key={p.id}
                    onClick={() => setActiveProjectId(p.id)}
                    className="glass-card rounded-4xl p-8 shadow-2xl border-white hover:border-brand-500/50 cursor-pointer transition-all duration-300 group flex flex-col justify-between h-72 hover:-translate-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="bg-slate-100 group-hover:bg-brand-600 w-fit px-4 py-1.5 rounded-xl transition-all duration-300">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">ID: {p.id.toUpperCase()}</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-brand-600 transition-colors leading-tight line-clamp-2">{p.name}</h3>
                      </div>
                      <button 
                        onClick={(e) => deleteProject(p.id, e)}
                        className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                      >
                        <Icons.Delete className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                      <div className="flex items-center gap-6">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deficiencies</span>
                            <span className={`text-2xl font-black tracking-tight ${totalFails > 0 ? 'text-red-500' : 'text-green-500'}`}>{totalFails}</span>
                         </div>
                         <div className="w-px h-10 bg-slate-100" />
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Levels</span>
                            <span className="text-2xl font-black tracking-tight text-slate-800">{p.levels.length}</span>
                         </div>
                      </div>
                      <div className="w-14 h-14 rounded-3xl bg-slate-50 group-hover:bg-brand-600 flex items-center justify-center transition-all duration-500 shadow-inner group-hover:shadow-brand-300 group-hover:rotate-12">
                        <Icons.Next className="w-8 h-8 text-slate-300 group-hover:text-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showNewProjectModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-50 flex items-center justify-center p-8">
            <div className="bg-white rounded-5xl w-full max-w-xl shadow-2xl p-12 animate-in zoom-in duration-500 border border-white">
              <div className="mb-10 text-center">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Project Registry</h2>
                <p className="text-slate-500 font-medium text-lg leading-relaxed">Enter a detailed identifier for the property or site phase.</p>
              </div>
              <input 
                autoFocus
                type="text"
                placeholder="Site Reference / Address"
                className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-4xl outline-none focus:ring-8 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-black text-2xl mb-12 shadow-inner text-center tracking-tight"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
              <div className="flex gap-6">
                <button 
                  onClick={() => setShowNewProjectModal(false)}
                  className="flex-1 py-6 font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-3xl transition-all uppercase tracking-[0.2em] text-[11px]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateProject}
                  className="btn-modern flex-1 py-6 bg-slate-900 text-white font-black rounded-3xl shadow-2xl hover:bg-black transition-all uppercase tracking-[0.2em] text-[11px]"
                >
                  Initialize
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="sticky top-0 z-40 glass-card border-b border-white/50 px-6 py-6 sm:px-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveProjectId(null)}
              className="p-4 bg-white hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-brand-600 transition-all shadow-sm border border-slate-100"
            >
              <Icons.Back className="w-6 h-6" />
            </button>
            <div className="hidden sm:block h-12 w-px bg-slate-200/50 mx-2"></div>
            <div className="truncate max-w-[240px] md:max-w-lg">
              <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none truncate mb-1">{activeProject.name}</h1>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.25em]">Site Live</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Phase</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden md:flex bg-slate-100/50 p-2 rounded-2xl gap-1 border border-slate-200/50 backdrop-blur-md">
              <button 
                onClick={() => setMode('inspector')}
                className={`px-8 py-3.5 rounded-xl text-xs font-black tracking-[0.15em] transition-all duration-300 ${mode === 'inspector' ? 'bg-white text-brand-600 shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                WALK
              </button>
              <button 
                onClick={() => setMode('builder')}
                className={`px-8 py-3.5 rounded-xl text-xs font-black tracking-[0.15em] transition-all duration-300 ${mode === 'builder' ? 'bg-white text-brand-600 shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                EDIT
              </button>
            </div>

            <button 
              onClick={syncReport}
              disabled={isSyncing}
              className={`btn-modern bg-slate-900 text-white px-8 py-4 rounded-3xl flex items-center gap-3 shadow-2xl hover:bg-black disabled:opacity-50 group`}
            >
              <Icons.Download className={`w-6 h-6 ${isSyncing ? 'animate-bounce' : 'group-hover:-translate-y-1 transition-transform'}`} />
              <span className="hidden lg:block font-black text-[11px] uppercase tracking-[0.2em]">Generate Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Level Selector */}
      <div className="px-6 py-10 sticky top-[100px] z-30 pointer-events-none">
        <div className="max-w-7xl mx-auto flex justify-center pointer-events-auto">
          <div className="glass-card px-4 py-3 rounded-[3rem] shadow-3xl shadow-brand-900/5 flex items-center gap-4 border border-white/80 ring-1 ring-black/5">
            <div className="bg-brand-600 text-white p-3.5 rounded-2xl shadow-lg shadow-brand-500/40">
              <Icons.Inspector className="w-6 h-6" />
            </div>
            <select 
              value={currentLevel}
              onChange={(e) => setCurrentLevel(e.target.value)}
              className="bg-transparent border-none rounded-2xl pr-12 pl-3 py-3 text-lg font-black text-slate-900 outline-none focus:ring-0 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:24px_24px] bg-[right_12px_center] bg-no-repeat tracking-tight"
            >
              {activeProject.levels.map(lvl => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
            
            <div className="md:hidden w-px h-10 bg-slate-200/50 mx-2" />
            
            <div className="md:hidden flex bg-slate-100/50 p-1.5 rounded-2xl w-32 border border-slate-200/30">
               <button 
                  onClick={() => setMode('inspector')}
                  className={`flex-1 py-3 rounded-xl text-[9px] font-black tracking-widest transition-all ${mode === 'inspector' ? 'bg-white text-brand-600 shadow-md' : 'text-slate-400'}`}
                >
                  WALK
                </button>
                <button 
                  onClick={() => setMode('builder')}
                  className={`flex-1 py-3 rounded-xl text-[9px] font-black tracking-widest transition-all ${mode === 'builder' ? 'bg-white text-brand-600 shadow-md' : 'text-slate-400'}`}
                >
                  EDIT
                </button>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 pb-40">
        {mode === 'builder' ? (
          <BuilderView 
            project={activeProject} 
            onUpdate={handleUpdateActiveProject} 
            currentLevel={currentLevel}
          />
        ) : (
          <InspectorView 
            project={activeProject} 
            onUpdate={handleUpdateActiveProject} 
            currentLevel={currentLevel} 
          />
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 glass-card border-t border-white/50 px-10 py-6 flex justify-between items-center z-40 shadow-[0_-15px_40px_-20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping absolute"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 relative shadow-sm shadow-green-200 border border-white"></div>
            </div>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Canvas Vault Storage</span>
          </div>
        </div>
        <button 
          onClick={() => setActiveProjectId(null)}
          className="btn-modern text-[11px] font-black text-brand-600 hover:text-brand-800 uppercase tracking-[0.2em] transition-colors flex items-center gap-3 group"
        >
          Exit Workspace <Icons.Next className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </footer>
    </div>
  );
};

export default App;
