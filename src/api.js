import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY = 'goldstore.session';

function isLocalHost(host) {
  return host === 'localhost'
    || host === '127.0.0.1'
    || host.startsWith('10.')
    || host.startsWith('192.168.')
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}

function lanApiBase() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
  // iPhone Safari loads the page, then blocks a second cleartext port.
  // Stay on the address that already opened. The dev server forwards /api.
  if (!isLocalHost(window.location.hostname)) return '';
  return window.location.origin;
}

export function apiBase() {
  const lan = lanApiBase();
  if (lan) return lan;
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:4000';
}

export async function loadSession() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveSession(session) {
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

export async function clearSession() {
  await AsyncStorage.removeItem(KEY);
}

function cleanHeaders(headers) {
  const next = {};
  Object.entries(headers || {}).forEach(([key, value]) => {
    if (value != null && value !== '') next[key] = String(value);
  });
  return next;
}

function xhrSend(url, { method, headers, body, blob }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method || 'GET', url, true);
    if (blob) xhr.responseType = 'blob';
    Object.entries(headers || {}).forEach(([key, value]) => {
      try { xhr.setRequestHeader(key, value); } catch { /* browser-managed header */ }
    });
    xhr.onload = () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        text: async () => {
          if (!blob) return xhr.responseText;
          if (xhr.response && typeof xhr.response.text === 'function') return xhr.response.text();
          return '';
        },
        blob: async () => xhr.response,
      });
    };
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(body == null ? null : body);
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendOnce(url, init, blob) {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (Platform.OS !== 'web' || typeof XMLHttpRequest === 'undefined') throw error;
    return xhrSend(url, { ...init, blob });
  }
}

async function send(url, { method = 'GET', body, headers, blob = false } = {}) {
  const init = {
    method,
    headers: cleanHeaders(headers),
    credentials: 'omit',
    mode: 'cors',
    cache: 'no-store',
  };
  if (body != null) init.body = body;
  // iPhone Safari tries HTTP/3 first and then reports that the server is down.
  // The same call succeeds on the next attempt, which is what Android uses.
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await sendOnce(url, init, blob);
    } catch (error) {
      lastError = error;
      if (attempt < 2) await delay(400 * (attempt + 1));
    }
  }
  throw lastError;
}

export async function api(path, options = {}) {
  const session = await loadSession();
  const headers = { ...(options.headers || {}) };
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isForm && options.body && typeof options.body !== 'string') {
    headers['Content-Type'] = 'application/json';
    options = { ...options, body: JSON.stringify(options.body) };
  }
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  let response;
  try {
    response = await send(`${apiBase()}${path}`, { method: options.method, body: options.body, headers });
  } catch {
    throw new Error('Cannot reach the server. Start the API, then try again.');
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!response.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

export async function apiBlob(path) {
  const session = await loadSession();
  const headers = {};
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  let response;
  try {
    response = await send(`${apiBase()}${path}`, { headers, blob: true });
  } catch {
    throw new Error('Cannot reach the server. Start the API, then try again.');
  }
  if (!response.ok) {
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    throw new Error(data?.error || 'Could not create the PDF');
  }
  return response.blob();
}

function sessionToken() {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return '';
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw).token || '' : '';
  } catch {
    return '';
  }
}

export function fileUrl(url) {
  if (!url) return '';
  const absolute = url.startsWith('http') ? url : `${apiBase()}${url}`;
  if (!absolute.includes('/api/media')) return absolute;
  const token = sessionToken();
  if (!token || absolute.includes('token=')) return absolute;
  return `${absolute}${absolute.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
}
