import { Platform } from 'react-native';

export const colors = {
  bg: '#0e1218',
  panel: '#121820',
  card: '#171e28',
  line: '#2c3848',
  gold: '#d4b483',
  goldDeep: '#8d6b34',
  text: '#f4efe6',
  muted: '#8e9aab',
  danger: '#d16b6b',
  ok: '#2f9d6d',
  input: '#0c1117',
  ink: '#1c1408',
  amber: '#e39b12',
  teal: '#1aa6a6',
  coral: '#e36b5a',
  green: '#2f9d6d',
  violet: '#7b6cf6',
  blue: '#3d8bfd',
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
