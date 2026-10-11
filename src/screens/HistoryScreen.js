import { useState } from 'react';
import { api } from '../api';
import { money, todayIso } from '../theme';
import { Banner, Button, Card, Field, PickerField, Row, Screen, Table } from '../ui';

const modes = [
  { value: 'all', label: 'All finalized' },
  { value: 'nic', label: 'NIC' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'location', label: 'Location' },
  { value: 'date', label: 'Date' },
  { value: 'rider', label: 'Rider' },
  { value: 'agent', label: 'Agent' },
];

export function HistoryScreen({ onBack, onOpen, role }) {
  const [mode, setMode] = useState(role === 'History' ? 'nic' : 'all');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  async function search() {
    setError('');
    const params = new URLSearchParams({ mode, q, from, to });
    try {
      setRows(await api(`/api/history?${params.toString()}`));
    } catch (e) {
      setError(e.message);
    }
  }

  const choices = role === 'History' ? modes.filter((item) => item.value === 'nic') : modes;

  return (
    <Screen title="Past Records" subtitle="Finalized jobs only. Open a row to see the client file." onBack={onBack}>
      <Banner text={error} />
      <Card>
        <Row>
          <PickerField label="Search by" value={mode} options={choices} onChange={setMode} />
          {mode !== 'date' && mode !== 'all' ? <Field label="Search text" value={q} onChangeText={setQ} /> : null}
          {mode === 'date' ? <Field label="From" value={from} onChangeText={setFrom} /> : null}
          {mode === 'date' ? <Field label="To" value={to} onChangeText={setTo} /> : null}
        </Row>
        <Button title="Search" onPress={search} />
      </Card>
      <Table
        columns={[
          { key: 'doc_no', label: 'Job' },
          { key: 'name', label: 'Customer' },
          { key: 'nic', label: 'NIC' },
          { key: 'mobile_no', label: 'Mobile' },
          { key: 'location', label: 'Location' },
          { key: 'date', label: 'Date' },
          { key: 'total_amount', label: 'Amount', render: (row) => money(row.total_amount) },
        ]}
        rows={rows}
        onPressRow={(row) => onOpen(row.doc_no)}
        empty="Search to list finalized jobs."
      />
    </Screen>
  );
}
