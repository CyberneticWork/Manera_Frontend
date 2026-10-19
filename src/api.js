import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY = 'goldstore.session';

export function apiBase() {
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
    response = await fetch(`${apiBase()}${path}`, { ...options, headers });
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
    response = await fetch(`${apiBase()}${path}`, { headers });
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
