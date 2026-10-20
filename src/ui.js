import { Children, forwardRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors, font } from './theme';

export function useLayout() {
  const { width } = useWindowDimensions();
  return {
    width,
    phone: width < 720,
    tablet: width >= 720 && width < 1100,
  };
}

export const Screen = forwardRef(function Screen({ title, subtitle, children, onBack, action }, ref) {
  const { phone } = useLayout();
  return (
    <ScrollView ref={ref} style={styles.screen} contentContainerStyle={[styles.screenContent, phone && styles.screenPhone]}>
      <View style={styles.frame}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            {onBack ? (
              <Pressable onPress={onBack} style={styles.back} accessibilityRole="button">
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            ) : null}
            <Text style={[styles.h1, phone && styles.h1Phone]}>{title}</Text>
            {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
        {children}
      </View>
    </ScrollView>
  );
});

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Heading({ children, aside }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {aside || null}
    </View>
  );
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, multiline, autoComplete, editable = true }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value == null ? '' : String(value)}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        autoComplete={autoComplete}
        editable={editable}
        style={[styles.input, multiline && styles.multiline, editable ? null : styles.locked]}
      />
    </View>
  );
}

export function RemoveLink({ title = 'Remove', onPress }) {
  return (
    <Pressable
      onPress={(event) => {
        event?.stopPropagation?.();
        onPress();
      }}
      accessibilityRole="button"
      style={pointer}
    >
      <Text style={styles.removeLink}>{title}</Text>
    </Pressable>
  );
}

export function Button({ title, onPress, kind = 'primary', disabled }) {
  return (
    <Pressable
      onPress={(event) => {
        event?.stopPropagation?.();
        if (!disabled && onPress) onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      style={[styles.button, styles[`btn_${kind}`], disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, kind === 'ghost' && styles.ghostText, kind === 'danger' && styles.dangerText]}>{title}</Text>
    </Pressable>
  );
}

export function Banner({ text, kind = 'error' }) {
  if (!text) return null;
  return (
    <View style={[styles.banner, kind === 'ok' ? styles.bannerOk : styles.bannerErr]}>
      <Text style={styles.bannerText}>{text}</Text>
    </View>
  );
}

export function Loading() {
  return <ActivityIndicator color={colors.gold} style={{ marginVertical: 24 }} />;
}

export function PickerField({ label, value, options, onChange, placeholder = 'Select' }) {
  const [open, setOpen] = useState(false);
  const current = options.find((item) => item.value === value);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={{ color: current ? colors.text : colors.muted, fontFamily: font.body }} numberOfLines={1}>
          {current ? current.label : placeholder}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.sectionTitle}>{label}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {options.map((item) => (
                <Pressable
                  key={String(item.value)}
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                </Pressable>
              ))}
              {!options.length ? <Text style={styles.sub}>Nothing to choose yet.</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function Row({ children }) {
  const { width } = useLayout();
  const items = Children.toArray(children).filter(Boolean);
  let cols = items.length || 1;
  if (width < 640) cols = 1;
  else if (width < 980) cols = Math.min(2, cols);
  const cell = cols === 1 ? '100%' : `${100 / cols}%`;
  return (
    <View style={styles.row}>
      {items.map((child, index) => (
        <View key={index} style={[styles.cell, { width: cell }]}>
          {child}
        </View>
      ))}
    </View>
  );
}

function cellValue(col, row) {
  return col.render ? col.render(row) : row[col.key];
}

function isElement(value) {
  return value != null && typeof value === 'object';
}

export function Table({ columns, rows, onPressRow, empty = 'No records' }) {
  const { phone } = useLayout();
  if (phone) {
    return (
      <View style={{ gap: 8 }}>
        {!rows.length ? <Text style={[styles.sub, styles.emptyCard]}>{empty}</Text> : null}
        {rows.map((row, index) => (
          <Pressable
            key={String(row.id ?? row.doc_no ?? row.job_no ?? index)}
            onPress={() => onPressRow && onPressRow(row)}
            style={styles.record}
          >
            <Text style={styles.recordTitle}>{isElement(cellValue(columns[0], row)) ? cellValue(columns[0], row) : (cellValue(columns[0], row) == null || cellValue(columns[0], row) === '' ? '—' : String(cellValue(columns[0], row)))}</Text>
            {columns.slice(1).map((col) => {
              const value = cellValue(col, row);
              return (
                <View key={col.key} style={styles.recordLine}>
                  {col.label ? <Text style={styles.recordLabel}>{col.label}</Text> : null}
                  {isElement(value) ? value : <Text style={styles.recordValue}>{value == null || value === '' ? '—' : String(value)}</Text>}
                </View>
              );
            })}
          </Pressable>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.table}>
      <View style={[styles.tr, styles.th]}>
        {columns.map((col) => (
          <Text key={col.key} style={[styles.td, styles.thText, { flex: col.flex || 1 }]}>{col.label}</Text>
        ))}
      </View>
      {!rows.length ? <Text style={[styles.sub, { padding: 12 }]}>{empty}</Text> : null}
      {rows.map((row, index) => (
        <Pressable key={String(row.id ?? row.doc_no ?? row.job_no ?? index)} onPress={() => onPressRow && onPressRow(row)} style={styles.tr}>
          {columns.map((col) => {
            const value = cellValue(col, row);
            if (isElement(value)) return <View key={col.key} style={[styles.td, { flex: col.flex || 1 }]}>{value}</View>;
            return (
              <Text key={col.key} style={[styles.td, { flex: col.flex || 1 }]} numberOfLines={2}>
                {value == null || value === '' ? '—' : String(value)}
              </Text>
            );
          })}
        </Pressable>
      ))}
    </View>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => (
        <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={[styles.tab, value === tab.key && styles.tabOn]}>
          <Text style={[styles.tabText, value === tab.key && styles.tabTextOn]}>{tab.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const pointer = Platform.OS === 'web' ? { cursor: 'pointer' } : null;

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, backgroundColor: colors.bg },
  screenContent: { padding: 28, paddingBottom: 56 },
  screenPhone: { padding: 14, paddingBottom: 40 },
  frame: { width: '100%', maxWidth: 1080, alignSelf: 'center', gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 4 },
  h1: { color: colors.text, fontSize: 32, fontFamily: font.title, fontWeight: '700' },
  h1Phone: { fontSize: 26 },
  sectionTitle: { color: colors.text, fontSize: 18, fontFamily: font.title, fontWeight: '700' },
  sub: { color: colors.muted, marginTop: 4, lineHeight: 20, fontFamily: font.body },
  back: { alignSelf: 'flex-start', marginBottom: 8, ...pointer },
  backText: { color: colors.teal, fontWeight: '800', fontFamily: font.body },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    borderTopWidth: 4,
    borderTopColor: colors.teal,
    padding: 16,
    gap: 4,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 8,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  field: { width: '100%', gap: 6, minWidth: 0 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: font.body },
  input: {
    backgroundColor: colors.input,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    fontFamily: font.body,
    fontSize: 16,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  locked: { color: colors.text, borderColor: colors.amber },
  button: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', ...pointer },
  btn_primary: { backgroundColor: colors.amber },
  btn_danger: { backgroundColor: colors.coral },
  btn_ok: { backgroundColor: colors.green },
  btn_ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.teal },
  buttonText: { color: colors.ink, fontWeight: '800', fontFamily: font.body },
  ghostText: { color: colors.teal },
  dangerText: { color: '#fff' },
  disabled: { opacity: 0.5 },
  banner: { borderRadius: 12, padding: 12 },
  bannerErr: { backgroundColor: '#4a2438', borderWidth: 1, borderColor: colors.rose },
  bannerOk: { backgroundColor: '#123d3a', borderWidth: 1, borderColor: colors.teal },
  bannerText: { color: colors.text, fontFamily: font.body },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { paddingHorizontal: 6, paddingBottom: 10, minWidth: 0 },
  table: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, overflow: 'hidden' },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
  th: { backgroundColor: '#241a4a', borderTopWidth: 0 },
  thText: { color: '#d9d0ff', fontWeight: '800', fontSize: 11, letterSpacing: 0.4, fontFamily: font.body },
  td: { color: colors.text, padding: 12, fontSize: 13, fontFamily: font.body },
  emptyCard: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16 },
  record: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
    padding: 14,
    gap: 6,
    ...pointer,
  },
  recordTitle: { color: colors.text, fontSize: 16, fontWeight: '700', fontFamily: font.title },
  recordLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  recordLabel: { color: colors.muted, fontSize: 13, fontFamily: font.body },
  recordValue: { color: colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right', fontFamily: font.body },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.line, ...pointer },
  tabOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  tabText: { color: colors.muted, fontWeight: '700', fontFamily: font.body },
  tabTextOn: { color: colors.ink },
  modalBg: { flex: 1, backgroundColor: 'rgba(6,8,12,0.72)', justifyContent: 'flex-end', padding: 12 },
  modalCard: {
    backgroundColor: colors.panel,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  optionText: { color: colors.text, fontSize: 16, fontFamily: font.body },
  removeLink: { color: colors.coral, fontWeight: '800', fontFamily: font.body },
});
