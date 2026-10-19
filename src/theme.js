import { Platform } from 'react-native';

export const colors = {
  bg: '#0c1228',
  panel: '#141b38',
  card: '#1b2450',
  line: '#33406e',
  gold: '#f0b429',
  goldDeep: '#c4841d',
  text: '#f8f5ef',
  muted: '#b7c0dc',
  danger: '#ff6d7a',
  ok: '#22c58b',
  input: '#0e1633',
  ink: '#1a1408',
  amber: '#f5a524',
  teal: '#14c4c4',
  coral: '#ff7a6e',
  green: '#2fce86',
  violet: '#8b7cff',
  blue: '#4c9dff',
  rose: '#ff6b9a',
  lime: '#c6e85a',
};

export const font = {
  title: Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined,
  body: Platform.OS === 'web' ? 'system-ui, "Segoe UI", sans-serif' : undefined,
};

export function money(value) {
  const n = Number(value) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function todayIso() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
