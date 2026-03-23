const STORAGE_KEY = 'hyrox_github';

export function getConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveConfig(token, owner, repo) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, owner, repo }));
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isAuthenticated() {
  const cfg = getConfig();
  return !!(cfg && cfg.token && cfg.owner && cfg.repo);
}

async function apiRequest(path, options = {}) {
  const cfg = getConfig();
  if (!cfg) throw new Error('Not authenticated');

  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${cfg.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `GitHub API error: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function verifyAuth() {
  const cfg = getConfig();
  const res = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${cfg.token}`,
      'Accept': 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error('Invalid token');
  return res.json();
}

export async function listWorkouts() {
  return apiRequest('/issues?labels=workout&state=all&sort=created&direction=desc&per_page=50');
}

export async function getWorkout(issueNumber) {
  return apiRequest(`/issues/${issueNumber}`);
}

export async function createWorkout(title, body) {
  return apiRequest('/issues', {
    method: 'POST',
    body: JSON.stringify({ title, body, labels: ['workout'] }),
  });
}

export async function updateWorkout(issueNumber, body) {
  return apiRequest(`/issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  });
}

export async function getTemplate() {
  try {
    const res = await apiRequest('/contents/.github/ISSUE_TEMPLATE/workout.md');
    return atob(res.content);
  } catch {
    return null;
  }
}
