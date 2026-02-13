
import { ProjectState } from '../types';

const GIST_FILENAME = 'framecheck-backup.json';
const GIST_DESCRIPTION = 'FrameCheck Canvas Inspector Backup';

export interface SyncStatus {
  lastSync: string | null;
  gistId: string | null;
}

export const getStoredToken = () => localStorage.getItem('fc_github_token');
export const saveToken = (token: string) => localStorage.setItem('fc_github_token', token);
export const clearToken = () => {
  localStorage.removeItem('fc_github_token');
  localStorage.removeItem('fc_gist_id');
};

export const getStoredGistId = () => localStorage.getItem('fc_gist_id');

/**
 * Pushes local projects to a GitHub Gist
 */
export const pushToGithub = async (projects: ProjectState[]): Promise<string> => {
  const token = getStoredToken();
  if (!token) throw new Error("GitHub Token missing");

  const gistId = getStoredGistId();
  const content = JSON.stringify(projects, null, 2);

  const payload = {
    description: GIST_DESCRIPTION,
    public: false,
    files: {
      [GIST_FILENAME]: {
        content: content
      }
    }
  };

  const url = gistId 
    ? `https://api.github.com/gists/${gistId}` 
    : `https://api.github.com/gists`;
  
  const method = gistId ? 'PATCH' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to push to GitHub");
  }

  const result = await response.json();
  localStorage.setItem('fc_gist_id', result.id);
  localStorage.setItem('fc_last_sync', new Date().toISOString());
  
  return result.id;
};

/**
 * Pulls projects from the GitHub Gist
 */
export const pullFromGithub = async (): Promise<ProjectState[]> => {
  const token = getStoredToken();
  const gistId = getStoredGistId();

  if (!token || !gistId) throw new Error("Sync not configured or Gist ID missing");

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error("Failed to pull from GitHub. Check your token and Gist ID.");
  }

  const result = await response.json();
  const file = result.files[GIST_FILENAME];
  
  if (!file || !file.content) {
    throw new Error("Backup file not found in Gist");
  }

  const projects = JSON.parse(file.content);
  localStorage.setItem('fc_last_sync', new Date().toISOString());
  
  return projects;
};

export const getLastSyncTime = () => localStorage.getItem('fc_last_sync');
