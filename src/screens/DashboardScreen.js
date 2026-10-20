import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { api } from '../api';
import { menuFor } from '../menu';
import { colors, font, money } from '../theme';
import { Banner, Card } from '../ui';

const GROUP_COLOR = {
  'Call Center': colors.teal,
  Cashier: colors.amber,
  Records: colors.blue,
  Accounts: colors.violet,
  Utilities: colors.coral,
  Manager: colors.green,
};

const SLICE_COLOR = {
  XR: colors.gold,
  NR: colors.blue,
  Pending: colors.amber,
  Approved: colors.green,
  'Need approval': colors.coral,
  Rejected: colors.rose,
  Other: colors.violet,
  Unknown: colors.violet,
  Unassigned: colors.muted,
};

const PALETTE = [colors.gold, colors.teal, colors.blue, colors.violet, colors.coral, colors.rose, colors.green, colors.lime];

function grams(value) {
  const n = Number(value) || 0;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function compact(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}m`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

function paint(rows, valueKey = 'amount') {
  return (rows || []).map((row, index) => ({
    ...row,
    value: Number(row[valueKey] ?? row.value) || 0,
    color: SLICE_COLOR[row.label] || PALETTE[index % PALETTE.length],
  }));
}

function ringUri(slices, size) {
  const parts = slices.filter((slice) => slice.value > 0);
  const total = parts.reduce((sum, slice) => sum + slice.value, 0);
  if (!total) return '';
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 2;
  const inner = outer * 0.62;
  if (parts.length === 1) {
    const mid = (outer + inner) / 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cy}" r="${mid}" fill="none" stroke="${parts[0].color}" stroke-width="${outer - inner}"/></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }
  let angle = -Math.PI / 2;
  const paths = parts.map((slice) => {
    const sweep = (slice.value / total) * Math.PI * 2;
    const start = angle;
    const end = angle + Math.min(sweep, Math.PI * 2 - 0.0001);
    angle += sweep;
    const point = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    const [x0, y0] = point(start, outer);
    const [x1, y1] = point(end, outer);
    const [ix1, iy1] = point(end, inner);
    const [ix0, iy0] = point(start, inner);
    const large = sweep > Math.PI ? 1 : 0;
    const n = (v) => v.toFixed(2);
    const d = `M ${n(x0)} ${n(y0)} A ${outer} ${outer} 0 ${large} 1 ${n(x1)} ${n(y1)} L ${n(ix1)} ${n(iy1)} A ${inner} ${inner} 0 ${large} 0 ${n(ix0)} ${n(iy0)} Z`;
    return `<path d="${d}" fill="${slice.color}"/>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths.join('')}</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function Donut({ title, subtitle, slices, center, empty }) {
  const parts = slices.filter((slice) => slice.value > 0);
  const total = parts.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const uri = ringUri(parts, 168);
  return (
    <Card style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      {subtitle ? <Text style={styles.hint}>{subtitle}</Text> : null}
      <View style={styles.donutRow}>
        <View style={styles.donutBox}>
          {uri ? <Image source={{ uri }} style={styles.donutImg} accessibilityLabel={title} /> : <View style={styles.donutEmpty} />}
          <View style={styles.donutHole}>
            <Text style={styles.donutCenter} numberOfLines={1}>{center}</Text>
          </View>
        </View>
        <View style={styles.legend}>
          {parts.length ? parts.map((slice) => (
            <View key={slice.label} style={styles.legendRow}>
              <View style={[styles.swatch, { backgroundColor: slice.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.legendLabel}>{slice.label}</Text>
                <Text style={styles.hint}>{Math.round((slice.value / total) * 100)}%</Text>
              </View>
              <Text style={styles.legendValue}>{slice.display || compact(slice.value)}</Text>
            </View>
          )) : <Text style={styles.hint}>{empty}</Text>}
        </View>
      </View>
    </Card>
  );
}

function WeekChart({ rows }) {
  const max = Math.max(...rows.map((row) => row.amount), 1);
  const quiet = rows.every((row) => !row.amount);
  return (
    <Card style={styles.chartCard}>
      <Text style={styles.chartTitle}>Collection, last 7 days</Text>
      <Text style={styles.hint}>{quiet ? 'No cashier payouts in this week yet.' : 'Amount paid out on each day.'}</Text>
      <View style={styles.bars}>
        {rows.map((row) => (
          <View key={row.date} style={styles.barCol}>
            <Text style={styles.barValue} numberOfLines={1}>{row.amount ? compact(row.amount) : '0'}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: Math.max(8, (row.amount / max) * 128), backgroundColor: row.date === rows[rows.length - 1].date ? colors.gold : '#8a6420' }]} />
            </View>
            <Text style={styles.barLabel}>{row.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function ShareBars({ title, subtitle, rows, empty }) {
  const max = Math.max(...rows.map((row) => row.amount), 1);
  return (
    <Card style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={styles.hint}>{subtitle}</Text>
      {!rows.length ? <Text style={styles.hint}>{empty}</Text> : null}
      {rows.map((row, index) => (
        <View key={row.label} style={styles.shareRow}>
          <View style={styles.shareHead}>
            <Text style={styles.legendLabel}>{row.label}</Text>
            <Text style={styles.legendValue}>{money(row.amount)}</Text>
          </View>
          <View style={styles.shareTrack}>
            <View style={[styles.shareFill, { width: `${Math.max(6, (row.amount / max) * 100)}%`, backgroundColor: PALETTE[index % PALETTE.length] }]} />
          </View>
          <Text style={styles.hint}>{row.jobs} {row.jobs === 1 ? 'job' : 'jobs'}</Text>
        </View>
      ))}
    </Card>
  );
}

export function DashboardScreen({ session, onOpen }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const phone = width < 720;
  const cols = width < 520 ? 1 : width < 980 ? 2 : 3;
  const chartCols = width < 860 ? 1 : 3;

  useEffect(() => {
    api('/api/dashboard').then(setStats).catch((e) => setError(e.message));
  }, []);

  const items = menuFor(session.user.group, session.permissions);
  const can = (key) => items.some((item) => item.key === key);
  const shop = stats?.scope !== 'rider';
  const today = stats?.today || {};
  const month = stats?.month || {};
  const metrics = stats ? [
    { label: shop ? "Today's collection" : 'Your collection', value: money(stats.amountToday), note: `${stats.finalizedToday} paid ${stats.finalizedToday === 1 ? 'job' : 'jobs'}`, color: colors.goldDeep, key: can('cashier') ? 'cashier' : 'home' },
    { label: 'Gold bought', value: `${grams(stats.weightToday)} g`, note: `${today.items || 0} items today`, color: colors.teal, key: can('history') ? 'history' : 'home' },
    { label: shop ? 'Pending jobs' : 'Your pending jobs', value: String(stats.pending), note: `${money(stats.pendingAmount)} waiting`, color: colors.amber, key: can('clients') ? 'clients' : 'home' },
    { label: 'Need approval', value: String(stats.unapproved), note: `${stats.approved} already approved`, color: '#d4537e', key: can('approvals') ? 'approvals' : 'home' },
    { label: 'This month', value: money(month.amount), note: `${month.jobs} jobs · ${grams(month.weight)} g`, color: '#5b4fd6', key: can('history') ? 'history' : 'home' },
    shop
      ? { label: 'Cash book today', value: money(stats.cashDebit), note: `In ${money(stats.cashCredit)} · petty ${money(today.pettyOut)}`, color: '#1f9d68', key: can('cashier') ? 'cashier' : 'home' }
      : { label: 'Rider commission', value: money(today.riderCommission), note: `Month ${money(month.riderCommission)}`, color: '#1f9d68', key: 'home' },
  ] : [];

  const payoutSlices = paint(stats?.typesToday).map((slice) => ({ ...slice, display: money(slice.amount) }));
  const openSlices = paint(stats?.openTypes).map((slice) => ({ ...slice, display: money(slice.amount) }));
  const bookSlices = paint(stats?.book, 'value').map((slice) => ({ ...slice, display: String(slice.value) }));
  const places = (stats?.places?.length ? stats.places : stats?.openPlaces) || [];
  const placeTitle = stats?.places?.length ? 'Bought this month by place' : 'Open jobs by place';

  return (
    <ScrollView contentContainerStyle={[styles.home, phone && styles.homePhone]}>
      <View style={styles.ribbon}>
        {[colors.gold, colors.teal, colors.coral, colors.violet, colors.green, colors.blue].map((color) => (
          <View key={color} style={[styles.ribbonCell, { backgroundColor: color }]} />
        ))}
      </View>
      <View style={[styles.hero, phone && styles.heroPhone]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Management desk</Text>
          <Text style={[styles.hello, phone && styles.helloPhone]}>{session.user.title || session.user.username}</Text>
          <Text style={styles.tag}>{session.company?.name || 'Gold Store'} · {session.user.group} · {stats?.date || ''}</Text>
        </View>
        {stats ? (
          <View style={[styles.monthPill, phone && { alignSelf: 'flex-start' }]}>
            <Text style={styles.monthLabel}>This month</Text>
            <Text style={styles.monthValue}>{month.jobs} {month.jobs === 1 ? 'job' : 'jobs'}</Text>
            <Text style={styles.monthMoney}>{money(month.amount)}</Text>
            <Text style={styles.monthLabel}>{grams(month.weight)} g · calls {month.calls || 0}</Text>
          </View>
        ) : null}
      </View>

      <Banner text={error} />

      {stats ? (
        <View style={styles.collect}>
          <View style={{ flex: 1 }}>
            <Text style={styles.collectKicker}>{shop ? "Today's collection" : 'Your payouts today'}</Text>
            <Text style={[styles.collectValue, phone && { fontSize: 32 }]}>{money(stats.amountToday)}</Text>
            <Text style={styles.collectNote}>
              {today.jobs || 0} jobs · {grams(today.weight)} g · {today.items || 0} items
            </Text>
          </View>
          <View style={styles.chips}>
            <Chip label="Agent commission" value={money(today.agentCommission)} />
            <Chip label="Rider commission" value={money(today.riderCommission)} />
            {shop ? <Chip label="Cash out" value={money(today.cashOut)} /> : null}
            {shop ? <Chip label="Cash in" value={money(today.cashIn)} /> : null}
            {shop ? <Chip label="Petty cash out" value={money(today.pettyOut)} /> : null}
            {shop ? <Chip label="Calls today" value={String(stats.callsToday)} /> : null}
          </View>
        </View>
      ) : null}

      <View style={styles.metricWrap}>
        {metrics.map((item) => (
          <View key={item.label} style={{ width: `${100 / cols}%`, padding: 6 }}>
            <Pressable onPress={() => onOpen(item.key)} style={[styles.metric, { backgroundColor: item.color }]}>
              <Text style={styles.metricLabel}>{item.label}</Text>
              <Text style={[styles.metricValue, phone && { fontSize: 22 }]} numberOfLines={1}>{item.value}</Text>
              <Text style={styles.metricNote}>{item.note}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      {stats ? (
        <View style={styles.grid}>
          <View style={{ width: chartCols === 1 ? '100%' : '33.33%', padding: 6 }}>
            <Donut
              title="Today's payouts"
              subtitle="Cashier collection split by job type."
              slices={payoutSlices}
              center={String(stats.finalizedToday)}
              empty="No payouts have been finalized today."
            />
          </View>
          <View style={{ width: chartCols === 1 ? '100%' : '33.33%', padding: 6 }}>
            <Donut
              title="Open jobs"
              subtitle="Pending jobs still waiting at the counter."
              slices={openSlices}
              center={String(stats.pending)}
              empty="No open jobs."
            />
          </View>
          <View style={{ width: chartCols === 1 ? '100%' : '33.33%', padding: 6 }}>
            <Donut
              title="Job book"
              subtitle="Pending, approved, waiting, and rejected."
              slices={bookSlices}
              center={String(bookSlices.reduce((sum, slice) => sum + slice.value, 0))}
              empty="No jobs on the book."
            />
          </View>
          <View style={{ width: '100%', padding: 6 }}>
            <WeekChart rows={stats.week || []} />
          </View>
          <View style={{ width: phone ? '100%' : '50%', padding: 6 }}>
            <ShareBars
              title={placeTitle}
              subtitle={stats.places?.length ? 'Finalized amount by location.' : 'Pending amount by location.'}
              rows={places}
              empty="No locations to show."
            />
          </View>
          <View style={{ width: phone ? '100%' : '50%', padding: 6 }}>
            <ShareBars
              title="Agents this month"
              subtitle="Bought amount by agent."
              rows={stats.agents || []}
              empty="No bought jobs for agents this month."
            />
          </View>
        </View>
      ) : null}

      {stats ? (
        <View style={[styles.split, phone && styles.splitPhone]}>
          <Card style={styles.panel}>
            <Text style={styles.chartTitle}>Latest bought jobs</Text>
            {!stats.recent?.length ? <Text style={styles.hint}>No finalized jobs yet.</Text> : null}
            {(stats.recent || []).map((row) => (
              <Pressable key={row.job_no} style={styles.line} onPress={() => onOpen('clients', row.doc_no)}>
                <View style={[styles.dot, { backgroundColor: row.job_type === 'NR' ? colors.blue : colors.gold }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineTitle}>{row.job_no} · {row.job_type}</Text>
                  <Text style={styles.hint}>{row.location || '—'} · {row.finalized_date}</Text>
                </View>
                <Text style={styles.lineMoney}>{money(row.amount)}</Text>
              </Pressable>
            ))}
          </Card>
          <Card style={styles.panel}>
            <Text style={styles.chartTitle}>{shop ? 'Waiting at the counter' : 'Your waiting jobs'}</Text>
            {!stats.waiting?.length ? <Text style={styles.hint}>No pending client jobs.</Text> : null}
            {(stats.waiting || []).map((row) => (
              <Pressable key={row.doc_no} style={styles.line} onPress={() => onOpen('clients', row.doc_no)}>
                <View style={[styles.dot, { backgroundColor: colors.teal }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineTitle}>{row.name || row.nic}</Text>
                  <Text style={styles.hint}>{row.job_type} · {row.location || '—'} · {row.rider_name || 'No rider'}</Text>
                </View>
                <Text style={styles.lineMoney}>{money(row.total_amount)}</Text>
              </Pressable>
            ))}
          </Card>
        </View>
      ) : null}

      <Text style={[styles.chartTitle, { marginTop: 14 }]}>Open a screen</Text>
      <View style={styles.tiles}>
        {items.map((item) => (
          <Pressable key={item.key} style={[styles.tile, phone && styles.tilePhone]} onPress={() => onOpen(item.key)}>
            <View style={[styles.tileBar, { backgroundColor: GROUP_COLOR[item.group] || colors.gold }]} />
            <Text style={styles.tileGroup}>{item.group}</Text>
            <Text style={styles.tileTitle}>{item.title}</Text>
            <Text style={[styles.hint, { marginLeft: 6 }]}>{item.hint}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function Chip({ label, value }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  home: { padding: 22, paddingBottom: 48, width: '100%', maxWidth: 1180, alignSelf: 'center' },
  homePhone: { padding: 12, paddingBottom: 36 },
  ribbon: { flexDirection: 'row', height: 6, borderRadius: 99, overflow: 'hidden', marginBottom: 16 },
  ribbonCell: { flex: 1 },
  eyebrow: { color: colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 },
  hello: { color: colors.text, fontSize: 34, fontFamily: font.title, fontWeight: '700' },
  helloPhone: { fontSize: 28 },
  tag: { color: colors.muted, marginTop: 4, lineHeight: 20 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  hero: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12, marginBottom: 12 },
  heroPhone: { flexDirection: 'column', alignItems: 'stretch' },
  monthPill: { backgroundColor: '#241c4e', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, minWidth: 168, borderWidth: 1, borderColor: colors.violet },
  monthLabel: { color: '#d9d0ff', fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  monthValue: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 4 },
  monthMoney: { color: colors.gold, fontWeight: '800', marginVertical: 2 },
  collect: {
    backgroundColor: '#1a2248',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#3d4d86',
    padding: 18,
    gap: 14,
    marginBottom: 8,
  },
  collectKicker: { color: colors.gold, fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  collectValue: { color: colors.text, fontSize: 42, fontWeight: '800', marginTop: 4 },
  collectNote: { color: colors.muted, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#121936', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, minWidth: 132, borderWidth: 1, borderColor: colors.line },
  chipLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  chipValue: { color: colors.text, fontWeight: '800', marginTop: 3, fontSize: 15 },
  metricWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginTop: 6 },
  metric: { padding: 14, borderRadius: 18, minHeight: 108, justifyContent: 'space-between' },
  metricLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '800' },
  metricValue: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 8 },
  metricNote: { color: 'rgba(255,255,255,0.84)', fontSize: 12, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginTop: 8 },
  chartCard: { minHeight: 220 },
  chartTitle: { color: colors.text, fontFamily: font.title, fontSize: 18, fontWeight: '700' },
  donutRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 10 },
  donutBox: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center' },
  donutImg: { width: 168, height: 168 },
  donutEmpty: { width: 168, height: 168, borderRadius: 84, borderWidth: 18, borderColor: colors.line },
  donutHole: { position: 'absolute', width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  donutCenter: { color: colors.text, fontWeight: '800', fontSize: 22 },
  legend: { flex: 1, gap: 8, minWidth: 0 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: colors.text, fontWeight: '700', fontSize: 13 },
  legendValue: { color: colors.gold, fontWeight: '800', fontSize: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 12, height: 180 },
  barCol: { flex: 1, alignItems: 'center', minWidth: 0 },
  barValue: { color: colors.muted, fontSize: 10, fontWeight: '700', marginBottom: 4 },
  barTrack: { height: 132, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  barFill: { width: '68%', borderRadius: 8, minHeight: 8 },
  barLabel: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 6 },
  shareRow: { marginTop: 10 },
  shareHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  shareTrack: { height: 10, borderRadius: 99, backgroundColor: '#101735', marginTop: 6, overflow: 'hidden' },
  shareFill: { height: 10, borderRadius: 99 },
  split: { flexDirection: 'row', gap: 12, marginTop: 8 },
  splitPhone: { flexDirection: 'column' },
  panel: { flex: 1, minWidth: 0 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  lineTitle: { color: colors.text, fontWeight: '700' },
  lineMoney: { color: colors.gold, fontWeight: '800' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  tile: { width: 220, backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 4, overflow: 'hidden' },
  tilePhone: { width: '100%' },
  tileBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  tileGroup: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginLeft: 6 },
  tileTitle: { color: colors.text, fontWeight: '800', fontSize: 16, marginLeft: 6 },
});
