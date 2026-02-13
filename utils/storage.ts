
import { ProjectState, Category, DEFAULT_QUICK_NOTES } from '../types';

const PROJECTS_KEY = 'framecheck_projects_list';
const ACTIVE_ID_KEY = 'framecheck_active_project_id';

export const saveAllProjects = (projects: ProjectState[]) => {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
};

export const loadAllProjects = (): ProjectState[] => {
  const data = localStorage.getItem(PROJECTS_KEY);
  if (!data) return [];
  
  try {
    const projects: ProjectState[] = JSON.parse(data);
    
    // Migration: Ensure all projects have levels, levelData, and levelCategories
    return projects.map(p => {
      const migrated = { ...p };
      
      if (!migrated.levels) {
        migrated.levels = ['Basement', 'Main Floor', 'Second Floor'];
      }
      
      if (!migrated.levelData) {
        migrated.levelData = migrated.levels.reduce((acc, lvl) => ({ ...acc, [lvl]: {} }), {});
      }

      // If missing levelCategories, populate them from old global categories or defaults
      if (!migrated.levelCategories) {
        const baseCategories: Category[] = migrated.categories || [
          { id: '1', name: 'Framing', itemNames: ['Wall Studs', 'Top Plate', 'Headers'] },
          { id: '2', name: 'Electrical', itemNames: ['Rough-in', 'Panel Box', 'Outlets'] }
        ];
        
        migrated.levelCategories = migrated.levels.reduce((acc, lvl) => ({
          ...acc,
          [lvl]: JSON.parse(JSON.stringify(baseCategories)) // Deep clone for each level
        }), {});
      }

      if (!migrated.quickNotes) {
        migrated.quickNotes = [...DEFAULT_QUICK_NOTES];
      }
      
      return migrated;
    });
  } catch (e) {
    console.error("Failed to parse projects", e);
    return [];
  }
};

export const saveActiveProjectId = (id: string | null) => {
  if (id) {
    localStorage.setItem(ACTIVE_ID_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_ID_KEY);
  }
};

export const loadActiveProjectId = (): string | null => {
  return localStorage.getItem(ACTIVE_ID_KEY);
};

export const createNewProject = (name: string): ProjectState => {
  const defaultLevels = ['Basement', 'Main Floor', 'Second Floor'];
  const defaultCategories: Category[] = [
    { id: '1', name: 'Framing', itemNames: ['Wall Studs', 'Top Plate', 'Headers'] },
    { id: '2', name: 'Electrical', itemNames: ['Rough-in', 'Panel Box', 'Outlets'] }
  ];

  return {
    id: Math.random().toString(36).substr(2, 9),
    name,
    levels: defaultLevels,
    levelCategories: defaultLevels.reduce((acc, lvl) => ({
      ...acc,
      [lvl]: JSON.parse(JSON.stringify(defaultCategories))
    }), {}),
    levelData: defaultLevels.reduce((acc, lvl) => ({ ...acc, [lvl]: {} }), {}),
    quickNotes: [...DEFAULT_QUICK_NOTES]
  };
};
