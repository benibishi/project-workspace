
export enum InspectionStatus {
  PASS = 'PASS',
  IN_PROGRESS = 'IN_PROGRESS',
  FAIL = 'FAIL'
}

// Level is now just a string, we manage the list dynamically in the project
export type Level = string;

export interface Photo {
  id: string;
  url: string; // base64
  label: string;
}

export interface ItemResult {
  id: string;
  name: string;
  status: InspectionStatus;
  round: number;
  notes: string;
  photos: Photo[];
}

export interface Category {
  id: string;
  name: string;
  itemNames: string[]; // Template items
}

export interface LevelData {
  [categoryId: string]: ItemResult[];
}

export interface ProjectState {
  id: string;
  name: string;
  categories?: Category[]; // Deprecated global categories
  levels: string[]; // The dynamic list of levels/selections for the dropdown
  levelCategories: {
    [levelName: string]: Category[];
  };
  levelData: {
    [levelName: string]: LevelData;
  };
  quickNotes: string[];
}

export const DEFAULT_QUICK_NOTES = [
  "Missing Hardware",
  "Check Plan",
  "Incomplete",
  "Damaged",
  "Wrong Material",
  "Safety Violation",
  "Needs Cleaning"
];
