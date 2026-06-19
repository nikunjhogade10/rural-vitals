const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('rcl_token');
}

async function request(path: string, options: RequestInit = {}, skipAuthCheck = false) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Only treat 401 as session expiry for authenticated routes, never for login itself
  if (res.status === 401 && !skipAuthCheck) {
    localStorage.removeItem('rcl_token');
    localStorage.removeItem('rcl_user');
    window.dispatchEvent(new Event('rcl:logout'));
    throw new Error('Session expired. Please login again.');
  }

  const data = await res.json();
  if (!res.ok) {
    // Return the server error message directly (e.g. "Invalid credentials")
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

const api = {
  get:    (path: string) => request(path, { method: 'GET' }),
  post:   (path: string, body: unknown) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  postPublic: (path: string, body: unknown) =>
    // Used for login — 401 means wrong creds, not session expiry
    request(path, { method: 'POST', body: JSON.stringify(body) }, true),
  patch:  (path: string, body: unknown) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};

export default api;
