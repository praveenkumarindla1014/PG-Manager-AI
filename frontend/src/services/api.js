// All requests go through the Vite proxy (/api → backend) unless VITE_API_URL is set.
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const TOKEN_KEY = 'pg_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const isForm = options.body instanceof FormData;
  const headers = {
    ...(!isForm && options.body && { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch {
    throw new ApiError("Can't reach the server. Is the backend running?", 0);
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    if (response.status === 401 && token && !endpoint.startsWith('/auth/login')) {
      window.dispatchEvent(new Event('pg:unauthorized'));
    }
    throw new ApiError(data.message || `Request failed (${response.status})`, response.status, data);
  }
  return data;
}

export const api = {
  get: (url) => apiFetch(url),
  post: (url, body) => apiFetch(url, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: (url, body) => apiFetch(url, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: (url) => apiFetch(url, { method: 'DELETE' })
};

/**
 * Download a file (e.g. PDF report) with auth.
 */
export async function downloadFile(endpoint, fallbackName = 'download') {
  const res = await fetch(`${API_BASE}${endpoint}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new ApiError('Download failed', res.status);
  const blob = await res.blob();
  const name = res.headers.get('content-disposition')?.match(/filename="?([^"]+)"?/)?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Read an image file as base64, downscaled so uploads stay small.
 */
export function fileToBase64(file, maxSize = 1600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      if (!file.type.startsWith('image/')) return resolve(reader.result);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
