const BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:4000/api`;

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

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`${BASE_URL}${cleanPath}`, { ...options, headers });

  if (res.status === 401 && !skipAuthCheck) {
    localStorage.removeItem('rcl_token');
    localStorage.removeItem('rcl_user');
    window.dispatchEvent(new Event('rcl:logout'));
    throw new Error('Session expired. Please login again.');
  }

  let data: any;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    data = text ? { message: text } : {};
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }
  return data;
}

const api = {
  get:    (path: string) => request(path, { method: 'GET' }),
  post:   (path: string, body?: unknown) => request(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  postPublic: (path: string, body?: unknown) =>
    request(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }, true),
  patch:  (path: string, body?: unknown) => request(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};

export default api;
