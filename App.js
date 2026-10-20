import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { api, clearSession, loadSession, saveSession } from './src/api';
import { menuFor } from './src/menu';
import { AccessProvider } from './src/access';
import { colors, font } from './src/theme';
import { Banner, Button, Field } from './src/ui';
import { DashboardScreen } from './src/screens/DashboardScreen';
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
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      let meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'viewport');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
      const apple = {
        'apple-mobile-web-app-capable': 'yes',
        'mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'black-translucent',
        'apple-mobile-web-app-title': 'Gold Store',
      };
      Object.entries(apple).forEach(([name, content]) => {
        let tag = document.querySelector(`meta[name="${name}"]`);
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('name', name);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
      });
    }
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
            <AccessProvider role={session.user.group} permissions={session.permissions} title={session.user.title} username={session.user.username}>
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
              {page === 'home' ? <DashboardScreen session={session} onOpen={open} /> : null}
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
            </AccessProvider>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Login({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
        <Field label="Username" value={username} onChangeText={setUsername} autoComplete="off" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="off" />
        <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={submit} disabled={busy} />
      </View>
    </View>
  );
}

function Sidebar({ session, current, onOpen, onLogout, overlay }) {
  const items = menuFor(session.user.group, session.permissions);
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
