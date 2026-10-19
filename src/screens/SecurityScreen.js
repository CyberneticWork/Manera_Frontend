import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { colors } from '../theme';
import { Banner, Button, Card, Field, Heading, Row, Screen } from '../ui';

const ROLE_COLOR = {
  CallCenter: colors.teal,
  Cashier: colors.amber,
  History: colors.blue,
  Account: colors.violet,
  Admin: colors.green,
};

export function AclScreen({ onBack }) {
  const [catalog, setCatalog] = useState([]);
  const [roles, setRoles] = useState({});
  const [role, setRole] = useState('CallCenter');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api('/api/acl').then((data) => {
      setCatalog(data.permissions || []);
      setRoles(data.roles || {});
    }).catch((e) => setError(e.message));
  }, []);

  function toggle(key) {
    const current = new Set(roles[role] || []);
    if (current.has(key)) current.delete(key);
    else current.add(key);
    setRoles({ ...roles, [role]: [...current] });
    setMessage('');
  }

  const groups = [...new Set(catalog.map((item) => item.group))];

  return (
    <Screen title="Access Control" subtitle="JWT login still proves who the person is. This list decides which screens that role may open." onBack={onBack}>
      <Banner text={error} />
      <Banner text={message} kind="ok" />
      <Card>
        <Heading>Role</Heading>
        <View style={styles.roles}>
          {Object.keys(roles).map((name) => (
            <Pressable key={name} onPress={() => setRole(name)} style={[styles.role, role === name && { backgroundColor: ROLE_COLOR[name] || colors.gold }]}>
              <Text style={[styles.roleText, role === name && styles.roleTextOn]}>{name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.note}>Super Admin always keeps every screen, so this desk cannot be locked.</Text>
      </Card>
      {groups.map((group) => (
        <Card key={group}>
          <Heading>{group}</Heading>
          {catalog.filter((item) => item.group === group).map((item) => {
            const on = (roles[role] || []).includes(item.key);
            return (
              <Pressable key={item.key} onPress={() => toggle(item.key)} style={styles.checkRow}>
                <View style={[styles.box, on && { backgroundColor: ROLE_COLOR[role] || colors.gold, borderColor: ROLE_COLOR[role] || colors.gold }]}>
                  <Text style={styles.tick}>{on ? '✓' : ''}</Text>
                </View>
                <Text style={styles.checkLabel}>{item.label}</Text>
              </Pressable>
            );
          })}
        </Card>
      ))}
      <Button title="Save access list" onPress={async () => {
        try {
          const data = await api('/api/acl', { method: 'PUT', body: { roles } });
          setRoles(data.roles || roles);
          setMessage('Access list saved. Users see it on their next sign-in.');
          setError('');
        } catch (e) {
          setError(e.message);
        }
      }} />
    </Screen>
  );
}

export function FirebaseScreen({ onBack }) {
  const [form, setForm] = useState({ bucket: '', projectId: '', clientEmail: '', privateKey: '' });
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api('/api/firebase').then((data) => {
      setStatus(data);
      setForm({
        bucket: data.bucket || '',
        projectId: data.projectId || '',
        clientEmail: data.clientEmail || '',
        privateKey: '',
      });
    }).catch((e) => setError(e.message));
  }, []);

  return (
    <Screen title="Firebase" subtitle="Photos and documents are stored in Firebase Storage. The private key stays on the server." onBack={onBack}>
      <Banner text={error} />
      <Banner text={message} kind="ok" />
      <Card>
        <Heading aside={(
          <View style={[styles.pill, { backgroundColor: status?.configured ? colors.green : colors.coral }]}>
            <Text style={styles.pillText}>{status?.configured ? 'Connected' : 'Not set'}</Text>
          </View>
        )}>
          Storage account
        </Heading>
        <Row>
          <Field label="Storage bucket" value={form.bucket} onChangeText={(bucket) => setForm({ ...form, bucket })} placeholder="your-project.appspot.com" />
          <Field label="Project ID" value={form.projectId} onChangeText={(projectId) => setForm({ ...form, projectId })} />
        </Row>
        <Field label="Client email" value={form.clientEmail} onChangeText={(clientEmail) => setForm({ ...form, clientEmail })} placeholder="firebase-adminsdk@project.iam.gserviceaccount.com" />
        <Field
          label="Private key"
          value={form.privateKey}
          onChangeText={(privateKey) => setForm({ ...form, privateKey })}
          placeholder={status?.hasPrivateKey ? 'A key is saved. Paste a new one only to replace it.' : 'Paste the service account private key'}
          multiline
        />
        <Button title="Save Firebase" onPress={async () => {
          try {
            const data = await api('/api/firebase', { method: 'PUT', body: form });
            setStatus(data);
            setForm({ ...form, privateKey: '' });
            setMessage(data.configured ? 'Firebase is ready for photos and documents.' : 'Saved. Add the bucket, email, and private key to finish.');
            setError('');
          } catch (e) {
            setError(e.message);
          }
        }} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  role: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.line },
  roleText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  roleTextOn: { color: colors.ink },
  note: { color: colors.muted, marginTop: 8, lineHeight: 18 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  tick: { color: colors.ink, fontWeight: '900' },
  checkLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
