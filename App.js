import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { api, clearSession, loadSession, saveSession } from './src/api';
import { menuFor } from './src/menu';
import { colors, font, money } from './src/theme';
import { Banner, Button, Card, Field } from './src/ui';
import { AssignScreen, CallScreen } from './src/screens/CallScreen';
import { ClientScreen } from './src/screens/ClientScreen';
import { CashierScreen } from './src/screens/CashierScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { AccessScreen, ApprovalsScreen, CommissionScreen } from './src/screens/ManagerScreen';
import { AclScreen, FirebaseScreen } from './src/screens/SecurityScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { MastersScreen, UsersScreen } from './src/screens/MastersScreen';
import { AccountsScreen, ExpensesScreen, TransferScreen } from './src/screens/AccountsScreen';

export default function App() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [screen, setScreen] = useState('home');
  const [docNo, setDocNo] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 980;

  useEffect(() => {
    loadSession().then(async (saved) => {
      if (saved?.token) {
        try {
          const me = await api('/api/auth/me');
          const next = { ...saved, user: me.user, company: me.company, permissions: me.permissions };
          await saveSession(next);
          setSession(next);
        } catch (error) {
          if (/session|login|expired|not found/i.test(error.message || '')) {
            await clearSession();
            setSession(null);
          } else {
            setSession(saved);
          }
        }
      }
      setReady(true);
    });
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const owned = new Set(session ? menuFor(session.user.group, session.permissions).map((item) => item.key) : []);
  const linked = { clients: ['history', 'cashier', 'approvals'] };
  const page = !session || screen === 'home' || owned.has(screen) || (linked[screen] || []).some((key) => owned.has(key))
    ? screen
    : 'home';

  async function logout() {
    await clearSession();
    setSession(null);
    setScreen('home');
  }

  function open(key, extraDoc) {
    setDocNo(extraDoc || '');
    setScreen(key);
    setMenuOpen(false);
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.app}>
        {!session ? (
          <Login onSuccess={(next) => { setMenuOpen(false); setSession(next); }} />
        ) : (
          <View style={[styles.shell, wide && styles.shellWide]}>
            {(wide || menuOpen) ? (
              <Sidebar
                session={session}
                current={page}
                overlay={!wide}
                onOpen={open}
                onLogout={logout}
              />
            ) : null}
            {menuOpen && !wide ? <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} /> : null}
            <View style={styles.main}>
              {!wide ? (
                <View>
                  <View style={styles.ribbonBar}>
                    {[colors.amber, colors.teal, colors.coral, colors.violet, colors.green, colors.rose].map((color) => (
                      <View key={color} style={[styles.ribbonCell, { backgroundColor: color }]} />
                    ))}
                  </View>
                  <View style={styles.topBar}>
                    <Pressable style={styles.menuBtn} onPress={() => setMenuOpen((value) => !value)}>
                      <Text style={styles.menuBtnText}>{menuOpen ? 'Close' : 'Menu'}</Text>
                    </Pressable>
                    <Text style={styles.topTitle}>Gold Store</Text>
                    <Text style={styles.topUser} numberOfLines={1}>{session.user.username}</Text>
                  </View>
                </View>
              ) : null}
              {page === 'home' ? <Home session={session} onOpen={open} /> : null}
              {page === 'calls' ? <CallScreen username={session.user.username} onBack={() => open('home')} /> : null}
              {page === 'assign' ? <AssignScreen onBack={() => open('home')} /> : null}
              {page === 'clients' ? <ClientScreen docNo={docNo} readOnly={session.user.group === 'History'} onBack={() => open('home')} /> : null}
              {page === 'cashier' ? <CashierScreen onBack={() => open('home')} onOpenClient={(id) => open('clients', id)} /> : null}
              {page === 'history' ? <HistoryScreen role={session.user.group} onBack={() => open('home')} onOpen={(id) => open('clients', id)} /> : null}
              {page === 'masters' ? <MastersScreen onBack={() => open('home')} /> : null}
              {page === 'reports' ? <ReportsScreen onBack={() => open('home')} /> : null}
              {page === 'accounts' ? <AccountsScreen onBack={() => open('home')} /> : null}
              {page === 'transfer' ? <TransferScreen onBack={() => open('home')} /> : null}
              {page === 'expenses' ? <ExpensesScreen onBack={() => open('home')} /> : null}
              {page === 'users' ? <UsersScreen onBack={() => open('home')} /> : null}
              {page === 'acl' ? <AclScreen onBack={() => open('home')} /> : null}
              {page === 'firebase' ? <FirebaseScreen onBack={() => open('home')} /> : null}
              {page === 'approvals' ? <ApprovalsScreen role={session.user.group} onBack={() => open('home')} /> : null}
              {page === 'commission' ? <CommissionScreen onBack={() => open('home')} /> : null}
              {page === 'access' ? <AccessScreen onBack={() => open('home')} /> : null}
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Login({ onSuccess }) {
  const [username, setUsername] = useState('sadmin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { username, password } });
      const session = { token: data.token, user: data.user, company: data.company, permissions: data.permissions };
      await saveSession(session);
      onSuccess(session);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.loginWrap}>
      <View style={styles.loginCard}>
        <View style={styles.ribbon}>
          {[colors.amber, colors.teal, colors.coral, colors.violet, colors.green, colors.rose].map((color) => (
            <View key={color} style={[styles.ribbonCell, { backgroundColor: color }]} />
          ))}
        </View>
        <Text style={styles.eyebrow}>Precious metals</Text>
        <Text style={styles.brand}>Gold Store</Text>
        <Text style={styles.tag}>Calls, client jobs, cashier payouts, and accounts. Sign in with your desk login.</Text>
        <Banner text={error} />
        <Field label="Username" value={username} onChangeText={setUsername} />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={submit} disabled={busy} />
        <Text style={styles.hint}>Demo: sadmin / admin123 · cashier / cashier123 · call / call123</Text>
      </View>
    </View>
  );
}

function Sidebar({ session, current, onOpen, onLogout, overlay }) {
  const items = menuFor(session.user.group);
  const groups = [...new Set(items.map((item) => item.group))];
  return (
    <View style={[styles.side, overlay && styles.sideOverlay]}>
      <ScrollView contentContainerStyle={styles.sideContent}>
        <Pressable onPress={() => onOpen('home')}>
          <Text style={styles.eyebrow}>Desk</Text>
          <Text style={styles.brandSmall}>Gold Store</Text>
          <Text style={styles.sideUser}>{session.user.title || session.user.username}</Text>
          <Text style={styles.sideRole}>{session.user.group}</Text>
        </Pressable>
        {groups.map((group) => (
          <View key={group} style={{ marginTop: 18 }}>
            <Text style={[styles.group, { color: GROUP_COLOR[group] || colors.gold }]}>{group}</Text>
            {items.filter((item) => item.group === group).map((item) => (
              <Pressable key={item.key} onPress={() => onOpen(item.key)} style={[styles.navItem, current === item.key && { backgroundColor: GROUP_COLOR[group] || colors.amber }]}>
                <View style={[styles.navDot, { backgroundColor: current === item.key ? colors.ink : (GROUP_COLOR[group] || colors.gold) }]} />
                <Text style={[styles.navText, current === item.key && styles.navTextOn]}>{item.title}</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <Pressable onPress={onLogout} style={styles.logout}>
          <Text style={styles.navText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const GROUP_COLOR = {
  'Call Center': colors.teal,
  Cashier: colors.amber,
  Records: colors.blue,
  Accounts: colors.violet,
  Utilities: colors.coral,
  Manager: colors.green,
};

function Home({ session, onOpen }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const phone = width < 720;
  const cols = width < 520 ? 1 : width < 980 ? 2 : 4;
  useEffect(() => {
    api('/api/dashboard').then(setStats).catch((e) => setError(e.message));
  }, []);
  const items = menuFor(session.user.group);
  const can = (key) => items.some((item) => item.key === key);
  const metrics = stats ? [
    { label: 'Pending jobs', value: String(stats.pending), note: 'Waiting for the cashier', color: colors.amber, key: can('clients') ? 'clients' : 'home' },
    { label: 'Finalized today', value: String(stats.finalizedToday), note: `${money(stats.weightToday)} g bought`, color: colors.teal, key: can('history') ? 'history' : 'home' },
    { label: 'Need approval', value: String(stats.unapproved), note: 'Manager review', color: colors.coral, key: can('approvals') ? 'approvals' : 'history' },
    { label: 'Cash paid today', value: money(stats.cashDebit), note: `In ${money(stats.cashCredit)}`, color: colors.green, key: can('cashier') ? 'cashier' : 'home' },
  ] : [];
  return (
    <ScrollView contentContainerStyle={[styles.home, phone && styles.homePhone]}>
      <View style={[styles.hero, phone && styles.heroPhone]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Management desk</Text>
          <Text style={[styles.hello, phone && styles.helloPhone]}>{session.user.title || session.user.username}</Text>
          <Text style={styles.tag}>{session.company?.name || 'Gold Store'} · {session.user.group} · {stats?.date || ''}</Text>
        </View>
        {stats ? (
          <View style={[styles.monthPill, phone && { alignSelf: 'flex-start' }]}>
            <Text style={styles.monthLabel}>This month</Text>
            <Text style={styles.monthValue}>{stats.monthJobs} {stats.monthJobs === 1 ? 'job' : 'jobs'}</Text>
            <Text style={styles.monthMoney}>{money(stats.monthAmount)}</Text>
          </View>
        ) : null}
      </View>
      <Banner text={error} />
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
        <View style={[styles.split, phone && styles.splitPhone]}>
          <Card style={styles.panel}>
            <Text style={styles.panelTitle}>Latest bought jobs</Text>
            {!stats.recent?.length ? <Text style={styles.hint}>No finalized jobs yet.</Text> : null}
            {(stats.recent || []).map((row) => (
              <Pressable key={row.job_no} style={styles.line} onPress={() => onOpen('clients', row.doc_no)}>
                <View style={[styles.dot, { backgroundColor: row.job_type === 'NR' ? colors.blue : colors.amber }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineTitle}>{row.job_no} · {row.job_type}</Text>
                  <Text style={styles.hint}>{row.location || '—'} · {row.finalized_date}</Text>
                </View>
                <Text style={styles.lineMoney}>{money(row.amount)}</Text>
              </Pressable>
            ))}
          </Card>
          <Card style={styles.panel}>
            <Text style={styles.panelTitle}>Waiting at the counter</Text>
            {!stats.waiting?.length ? <Text style={styles.hint}>No pending client jobs.</Text> : null}
            {(stats.waiting || []).map((row) => (
              <Pressable key={row.doc_no} style={styles.line} onPress={() => onOpen('clients', row.doc_no)}>
                <View style={[styles.dot, { backgroundColor: colors.teal }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineTitle}>{row.name || row.nic}</Text>
                  <Text style={styles.hint}>{row.job_type} · {row.location || '—'} · Doc {row.doc_no}</Text>
                </View>
                <Text style={styles.lineMoney}>{money(row.total_amount)}</Text>
              </Pressable>
            ))}
          </Card>
        </View>
      ) : null}
      <Text style={[styles.panelTitle, { marginTop: 8 }]}>Open a screen</Text>
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

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  shell: { flex: 1, minHeight: 0 },
  shellWide: { flexDirection: 'row' },
  side: {
    width: 248,
    height: '100%',
    backgroundColor: colors.panel,
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  sideContent: { padding: 18, paddingBottom: 32 },
  main: { flex: 1, minHeight: 0 },
  eyebrow: { color: colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 },
  brand: { color: colors.text, fontSize: 36, fontFamily: font.title, fontWeight: '700' },
  brandSmall: { color: colors.text, fontSize: 26, fontFamily: font.title, fontWeight: '700' },
  tag: { color: colors.muted, marginBottom: 8, lineHeight: 20 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  loginWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loginCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 22,
    paddingTop: 0,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  ribbon: { flexDirection: 'row', height: 8, marginHorizontal: -22, marginBottom: 8 },
  ribbonBar: { flexDirection: 'row', height: 6 },
  ribbonCell: { flex: 1 },
  sideUser: { color: colors.text, marginTop: 16, fontWeight: '700' },
  sideRole: { color: colors.gold, fontSize: 12 },
  group: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  navItem: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  navDot: { width: 8, height: 8, borderRadius: 4 },
  navText: { color: colors.text, fontSize: 15 },
  navTextOn: { color: colors.ink, fontWeight: '800' },
  logout: { marginTop: 24, padding: 8 },
  topBar: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.panel,
  },
  topTitle: { flex: 1, color: colors.text, fontFamily: font.title, fontSize: 18, fontWeight: '700' },
  topUser: { color: colors.gold, fontSize: 12, fontWeight: '700', maxWidth: 110 },
  menuBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.amber },
  menuBtnText: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(6,8,12,0.55)', zIndex: 4 },
  home: { padding: 28, paddingBottom: 48, gap: 8, width: '100%', maxWidth: 1080, alignSelf: 'center' },
  homePhone: { padding: 14, paddingBottom: 36 },
  hello: { color: colors.text, fontSize: 34, fontFamily: font.title, fontWeight: '700' },
  helloPhone: { fontSize: 28 },
  hero: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12, marginBottom: 6 },
  heroPhone: { flexDirection: 'column', alignItems: 'stretch' },
  monthPill: { backgroundColor: '#2a2158', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, minWidth: 150, borderWidth: 1, borderColor: colors.violet },
  monthLabel: { color: '#d9d0ff', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  monthValue: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 4 },
  monthMoney: { color: colors.gold, fontWeight: '700', marginTop: 2 },
  metricWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  metric: { padding: 14, borderRadius: 16, minHeight: 112, justifyContent: 'space-between' },
  metricLabel: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '800' },
  metricValue: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 8 },
  metricNote: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 4 },
  split: { flexDirection: 'row', gap: 12, marginTop: 8 },
  splitPhone: { flexDirection: 'column' },
  panel: { flex: 1, minWidth: 0 },
  panelTitle: { color: colors.text, fontFamily: font.title, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  lineTitle: { color: colors.text, fontWeight: '700' },
  lineMoney: { color: colors.gold, fontWeight: '800' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  tile: {
    width: 220,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
    overflow: 'hidden',
  },
  tilePhone: { width: '100%' },
  tileBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  tileGroup: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginLeft: 6 },
  tileTitle: { color: colors.text, fontWeight: '800', fontSize: 16, marginLeft: 6 },
  sideOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 6,
    width: '86%',
    maxWidth: 320,
  },
});
