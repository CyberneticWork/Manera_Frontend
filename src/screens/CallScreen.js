import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { api } from '../api';
import { colors } from '../theme';
import { Banner, Button, Card, Field, PickerField, Row, Screen, Table } from '../ui';

export function CallScreen({ onBack, username }) {
  const [lookups, setLookups] = useState({ mobile: [], agent: [] });
  const [mine, setMine] = useState([]);
  const [form, setForm] = useState({ callerId: '', agentNo: '', contactNo: '', reason: '', agent: username });
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/lookups').then(setLookups).catch((e) => setError(e.message));
    api('/api/assignments/mine').then(setMine).catch(() => {});
  }, []);

  async function loadHistory(contact = form.contactNo) {
    if (!contact) return;
    const rows = await api(`/api/calls?contact=${encodeURIComponent(contact)}`);
    setHistory(rows);
  }

  async function matchCaller(id) {
    setForm((f) => ({ ...f, callerId: id }));
    const hit = (lookups.mobile || []).find((row) => String(row.id) === String(id) || row.description === id);
    if (hit) setForm((f) => ({ ...f, callerId: id, agentNo: hit.description }));
  }

  async function save() {
    setError('');
    setMessage('');
    try {
      await api('/api/calls', {
        method: 'POST',
        body: { contactNo: form.contactNo, reason: form.reason, agent: form.agent, agentNo: form.agentNo },
      });
      setMessage('Call saved');
      setForm((f) => ({ ...f, reason: '' }));
      await loadHistory(form.contactNo);
    } catch (e) {
      setError(e.message);
    }
  }

  const numbers = mine.length ? mine.map((row) => ({ value: row.mobile_no, label: row.mobile_no })) : (lookups.mobile || []).map((row) => ({ value: row.description, label: row.description }));

  return (
    <Screen title="Call Log" subtitle="Record the contact, the agent line, and what was said." onBack={onBack}>
      <Banner text={error} />
      <Banner text={message} kind="ok" />
      <Card>
        <Row>
          <Field label="Caller id" value={form.callerId} onChangeText={matchCaller} placeholder="Mobile list id" />
          <PickerField label="Agent mobile" value={form.agentNo} options={numbers} onChange={(agentNo) => setForm({ ...form, agentNo })} />
        </Row>
        <Row>
          <Field label="Contact number" value={form.contactNo} onChangeText={(contactNo) => setForm({ ...form, contactNo })} keyboardType="phone-pad" />
          <PickerField label="Agent" value={form.agent} options={(lookups.agent || []).map((row) => ({ value: row.description, label: row.description }))} onChange={(agent) => setForm({ ...form, agent })} />
        </Row>
        <Field label="Comments" value={form.reason} onChangeText={(reason) => setForm({ ...form, reason })} multiline />
        <Row>
          <Button title="Save call" onPress={save} />
          <Button title="Load history" kind="ghost" onPress={() => loadHistory().catch((e) => setError(e.message))} />
        </Row>
        <Text style={{ color: colors.muted }}>Assigned lines for this login are listed first.</Text>
      </Card>
      <Table
        columns={[
          { key: 'date', label: 'Date' },
          { key: 'agent', label: 'Agent' },
          { key: 'agent_no', label: 'Line' },
          { key: 'reason', label: 'Comments', flex: 2 },
        ]}
        rows={history}
        empty="No earlier calls for this contact."
      />
    </Screen>
  );
}

export function AssignScreen({ onBack }) {
  const [rows, setRows] = useState([]);
  const [lookups, setLookups] = useState({ agent: [], mobile: [] });
  const [userName, setUserName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [toUser, setToUser] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function reload() {
    const [list, lookup] = await Promise.all([api('/api/assignments'), api('/api/lookups')]);
    setRows(list);
    setLookups(lookup);
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, []);

  const agents = (lookups.agent || []).map((row) => ({ value: row.description, label: row.description }));
  const mobiles = (lookups.mobile || []).map((row) => ({ value: row.description, label: row.description }));

  return (
    <Screen title="Assign Numbers" subtitle="Give each agent the outbound numbers they can use on the call log." onBack={onBack}>
      <Banner text={error} />
      <Banner text={message} kind="ok" />
      <Card>
        <Row>
          <PickerField label="Agent" value={userName} options={agents} onChange={setUserName} />
          <PickerField label="Mobile" value={mobileNo} options={mobiles} onChange={setMobileNo} />
        </Row>
        <Row>
          <Button title="Add" onPress={async () => {
            try {
              await api('/api/assignments', { method: 'POST', body: { userName, mobileNo } });
              setMessage('Number assigned');
              await reload();
            } catch (e) { setError(e.message); }
          }} />
          <Button title="Transfer all" kind="ghost" onPress={async () => {
            try {
              await api('/api/assignments/transfer', { method: 'POST', body: { fromUser: userName, toUser } });
              setMessage(`Moved ${userName} lines to ${toUser}`);
              await reload();
            } catch (e) { setError(e.message); }
          }} />
        </Row>
        <PickerField label="Transfer to" value={toUser} options={agents} onChange={setToUser} />
      </Card>
      <Table columns={[{ key: 'user_name', label: 'Agent' }, { key: 'mobile_no', label: 'Mobile' }, { key: 'date', label: 'Date' }]} rows={rows} />
    </Screen>
  );
}
