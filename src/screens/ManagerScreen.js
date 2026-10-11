import { createElement, useEffect, useState } from 'react';
import { Platform, Text } from 'react-native';
import { api, apiBlob } from '../api';
import { colors, money, todayIso } from '../theme';
import { Banner, Button, Card, Field, Row, Screen, Table } from '../ui';

export function ApprovalsScreen({ onBack, role }) {
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState([]);
  const [dash, setDash] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setError('');
    try {
      const [list, board] = await Promise.all([
        api(`/api/approvals?date=${date}`),
        api(`/api/approvals/dashboard/day?date=${date}`),
      ]);
      setRows(list);
      setDash(board);
    } catch (e) {
      setRows([]);
      setDash(null);
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Screen title="Job Approvals" subtitle="Review the day's finalized jobs and mark them approved." onBack={onBack}>
      <Banner text={error} />
      <Banner text={message} kind="ok" />
      <Card>
        <Row>
          <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <Button title="Load day" onPress={load} />
          {role === 'SAdmin' ? (
            <Button title="Grant overdue permission" kind="ghost" onPress={async () => {
              try {
                await api('/api/approvals/grant-permission', { method: 'POST', body: {} });
                setMessage('Permission granted for overdue jobs');
                await load();
              } catch (e) { setError(e.message); }
            }} />
          ) : null}
        </Row>
      </Card>
      {dash ? (
        <Card>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{dash.count} jobs</Text>
          <Text style={{ color: colors.text }}>Business commission {money(dash.businessCommission)} ({money(dash.rate)} each)</Text>
          <Text style={{ color: colors.text }}>Agent XR {money(dash.xr)} · NR {money(dash.nr)} · Total {money(dash.agentCommission)}</Text>
          <Text style={{ color: colors.text }}>Rider {money(dash.riderCommission)}</Text>
          <Text style={{ color: colors.gold, fontWeight: '800' }}>Balance {money(dash.balance)}</Text>
        </Card>
      ) : null}
      <Table
        columns={[
          { key: 'job_no', label: 'Job no' },
          { key: 'nic', label: 'NIC' },
          { key: 'agent_name', label: 'Agent' },
          { key: 'job_type', label: 'Type' },
          { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
          { key: 'approved', label: 'Status', render: (row) => (row.approved ? 'Approved' : 'Pending') },
        ]}
        rows={rows}
        onPressRow={async (row) => {
          try { setDetail(await api(`/api/approvals/${row.job_no}`)); }
          catch (e) { setError(e.message); }
        }}
      />
      {detail ? (
        <Card>
          <Text style={{ color: colors.gold, fontWeight: '800' }}>{detail.finalized.job_no}</Text>
          <Text style={{ color: colors.text }}>
            {detail.header?.name} · {detail.finalized.location} · {money(detail.finalized.amount)}
          </Text>
          <Text style={{ color: colors.muted }}>
            Weight {detail.finalized.total_weight} g · Items {detail.finalized.item_count}
          </Text>
          <Table
            columns={[
              { key: 'item_name', label: 'Item' },
              { key: 'weight', label: 'Weight' },
              { key: 'condition', label: 'Condition' },
            ]}
            rows={detail.items || []}
          />
          <Button title="Print approval PDF" kind="ghost" onPress={async () => {
            try {
              const blob = await apiBlob(`/api/reports/approve/pdf?jobNo=${encodeURIComponent(detail.finalized.job_no)}`);
              const url = URL.createObjectURL(blob);
              if (Platform.OS === 'web') window.open(url, '_blank');
              setMessage(`Approval PDF opened for ${detail.finalized.job_no}`);
            } catch (e) { setError(e.message); }
          }} />
          {!detail.finalized.approved ? (
            <Button title="Approve" kind="ok" onPress={async () => {
              try {
                await api(`/api/approvals/${detail.finalized.job_no}/approve`, { method: 'POST', body: {} });
                setMessage(`${detail.finalized.job_no} approved`);
                setDetail(null);
                await load();
              } catch (e) { setError(e.message); }
            }} />
          ) : <Text style={{ color: colors.ok }}>Approved</Text>}
        </Card>
      ) : null}
    </Screen>
  );
}

export function CommissionScreen({ onBack }) {
  const [businessCommission, setBusiness] = useState('');
  const [riderCommission, setRider] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api('/api/commission').then((data) => {
      setBusiness(String(data.businessCommission));
      setRider(String(data.riderCommission));
    }).catch((e) => setError(e.message));
  }, []);

  return (
    <Screen title="Commission" subtitle="Per-job business rate and the rider rate used on the approval dashboard." onBack={onBack}>
      <Banner text={error} />
      <Banner text={message} kind="ok" />
      <Card>
        <Field label="Business commission per job" value={businessCommission} onChangeText={setBusiness} keyboardType="decimal-pad" />
        <Field label="Rider commission per job" value={riderCommission} onChangeText={setRider} keyboardType="decimal-pad" />
        <Button title="Save" onPress={async () => {
          try {
            await api('/api/commission', { method: 'PUT', body: { businessCommission, riderCommission } });
            setMessage('Commission rates saved');
          } catch (e) { setError(e.message); }
        }} />
      </Card>
    </Screen>
  );
}

export function AccessScreen({ onBack }) {
  const [date, setDate] = useState(todayIso());
  const [code, setCode] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function reload() {
    setRows(await api('/api/access-codes'));
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, []);

  return (
    <Screen title="Access Code" subtitle="One code per day. Reports will not open without it." onBack={onBack}>
      <Banner text={error} />
      <Banner text={message} kind="ok" />
      <Card>
        <Row>
          <Field label="Date" value={date} onChangeText={setDate} />
          <Field label="Code" value={code} onChangeText={setCode} placeholder="ABC123" />
        </Row>
        <Button title="Save code" onPress={async () => {
          try {
            const saved = await api('/api/access-codes', { method: 'POST', body: { date, code } });
            setMessage(`Saved ${saved.code} for ${saved.date}`);
            setCode('');
            await reload();
          } catch (e) { setError(e.message); }
        }} />
      </Card>
      <Table columns={[{ key: 'date', label: 'Date' }, { key: 'code', label: 'Code' }, { key: 'created_by', label: 'By' }]} rows={rows} />
    </Screen>
  );
}
