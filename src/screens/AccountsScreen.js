import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { api } from '../api';
import { useAccess } from '../access';
import { colors, money, todayIso } from '../theme';
import { Banner, Button, Card, Field, PickerField, RemoveLink, Row, Screen, Table, Tabs } from '../ui';

const roles = ['CashBook', 'Bank', 'Purchase', 'SalesIncome', 'Income', 'Inventory', 'VAT', 'NBT', 'BankCharges', 'RecivedCheque'];

export function AccountsScreen({ onBack }) {
  const [tab, setTab] = useState('chart');
  const [data, setData] = useState({ groups: [], subtypes: [], accounts: [] });
  const [form, setForm] = useState({ name: '', groupCode: '350000', subtypeCode: '351', opening: '0', payableAcc: '' });
  const [mapRole, setMapRole] = useState('CashBook');
  const [mapCode, setMapCode] = useState('');
  const [journal, setJournal] = useState({ date: todayIso(), remarks: '', lines: [] });
  const [line, setLine] = useState({ code: '', debit: '', credit: '', remarks: '' });
  const [note, setNote] = useState({ kind: 'debit', date: todayIso(), supplierAcc: '', expenseAcc: '', amount: '', taxType: '', setoffInv: '', remarks: '' });
  const [notes, setNotes] = useState({ debit: [], credit: [] });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { can } = useAccess();

  async function reload() {
    const [accounts, noteRows] = await Promise.all([api('/api/accounts'), api('/api/notes')]);
    setData(accounts);
    setNotes(noteRows);
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, []);

  const accountOptions = data.accounts.map((row) => ({ value: row.code, label: `${row.code} ${row.name}` }));
  const selected = data.accounts.find((row) => row.code === line.code);

  return (
    <Screen title="Accounts" subtitle="Chart of accounts, journals, and debit or credit notes." onBack={onBack}>
      <Banner text={error} />
      <Banner text={message} kind="ok" />
      <Tabs
        tabs={[{ key: 'chart', label: 'Chart' }, { key: 'journal', label: 'Journal' }, { key: 'notes', label: 'Notes' }]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'chart' ? (
        <Card>
          <Row>
            <Field label="Account name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
            <PickerField label="Type" value={form.groupCode} options={data.groups.map((row) => ({ value: row.code, label: row.description }))} onChange={(groupCode) => setForm({ ...form, groupCode })} />
            <PickerField label="Detail" value={form.subtypeCode} options={data.subtypes.filter((row) => row.group_code === form.groupCode).map((row) => ({ value: row.code, label: row.description }))} onChange={(subtypeCode) => setForm({ ...form, subtypeCode })} />
            <Field label="Opening" value={form.opening} onChangeText={(opening) => setForm({ ...form, opening })} keyboardType="decimal-pad" />
          </Row>
          {can('accounts', 'create') ? <Button title="Create account" onPress={async () => {
            try {
              const created = await api('/api/accounts', { method: 'POST', body: form });
              setMessage(`Account ${created.code} created`);
              setForm({ ...form, name: '' });
              await reload();
            } catch (e) { setError(e.message); }
          }} /> : null}
          <Row>
            <PickerField label="System role" value={mapRole} options={roles.map((value) => ({ value, label: value }))} onChange={setMapRole} />
            <PickerField label="Account" value={mapCode} options={accountOptions} onChange={setMapCode} />
          </Row>
          {can('accounts', 'update') ? <Button title="Save account link" kind="ghost" onPress={async () => {
            try {
              await api('/api/accounts/settings/map', { method: 'PUT', body: { settings: mapRole, code: mapCode } });
              setMessage('Link saved');
              await reload();
            } catch (e) { setError(e.message); }
          }} /> : null}
          <Table
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name', flex: 2 },
              { key: 'group_name', label: 'Type' },
              { key: 'normal_balance', label: 'Side' },
              { key: 'settings', label: 'Link' },
              ...(can('accounts', 'delete') ? [{
                key: 'remove',
                label: '',
                render: (row) => <RemoveLink onPress={async () => {
                  try {
                    await api(`/api/accounts/${row.code}`, { method: 'DELETE' });
                    setMessage('Account removed');
                    await reload();
                  } catch (e) { setError(e.message); }
                }} />,
              }] : []),
            ]}
            rows={data.accounts}
          />
        </Card>
      ) : null}
      {tab === 'journal' ? (
        <Card>
          <Row>
            <Field label="Date" value={journal.date} onChangeText={(date) => setJournal({ ...journal, date })} />
            <Field label="Remarks" value={journal.remarks} onChangeText={(remarks) => setJournal({ ...journal, remarks })} />
          </Row>
          <Row>
            <PickerField label="Account" value={line.code} options={accountOptions} onChange={(code) => setLine({ ...line, code })} />
            <Field label="Debit" value={line.debit} onChangeText={(debit) => setLine({ ...line, debit })} keyboardType="decimal-pad" />
            <Field label="Credit" value={line.credit} onChangeText={(credit) => setLine({ ...line, credit })} keyboardType="decimal-pad" />
          </Row>
          <Button title="Add line" kind="ghost" onPress={() => {
            if (!line.code) return;
            setJournal({
              ...journal,
              lines: [...journal.lines, { ...line, name: selected?.name || '', accNo: line.code, id: journal.lines.length + 1 }],
            });
            setLine({ code: '', debit: '', credit: '', remarks: '' });
          }} />
          <Table
            columns={[
              { key: 'accNo', label: 'Account' },
              { key: 'name', label: 'Name' },
              { key: 'debit', label: 'Debit', render: (row) => money(row.debit) },
              { key: 'credit', label: 'Credit', render: (row) => money(row.credit) },
              {
                key: 'remove',
                label: '',
                render: (row) => <RemoveLink onPress={() => setJournal({ ...journal, lines: journal.lines.filter((item) => item.id !== row.id) })} />,
              },
            ]}
            rows={journal.lines}
          />
          <Text style={{ color: colors.muted }}>
            Debit {money(journal.lines.reduce((s, row) => s + Number(row.debit || 0), 0))} · Credit {money(journal.lines.reduce((s, row) => s + Number(row.credit || 0), 0))}
          </Text>
          {can('accounts', 'create') ? <Button title="Post journal" onPress={async () => {
            try {
              const saved = await api('/api/journal', { method: 'POST', body: journal });
              setMessage(`Posted ${saved.glNo}`);
              setJournal({ date: journal.date, remarks: '', lines: [] });
            } catch (e) { setError(e.message); }
          }} /> : null}
        </Card>
      ) : null}
      {tab === 'notes' ? (
        <Card>
          <Tabs
            tabs={[{ key: 'debit', label: 'Debit note' }, { key: 'credit', label: 'Credit note' }]}
            value={note.kind}
            onChange={(kind) => setNote({ ...note, kind })}
          />
          <Row>
            <Field label="Date" value={note.date} onChangeText={(date) => setNote({ ...note, date })} />
            <PickerField label="Supplier / bank" value={note.supplierAcc} options={accountOptions} onChange={(supplierAcc) => setNote({ ...note, supplierAcc })} />
            <PickerField label="Expense" value={note.expenseAcc} options={accountOptions} onChange={(expenseAcc) => setNote({ ...note, expenseAcc })} />
          </Row>
          <Row>
            <Field label="Amount" value={note.amount} onChangeText={(amount) => setNote({ ...note, amount })} keyboardType="decimal-pad" />
            <Field label="Set-off invoice" value={note.setoffInv} onChangeText={(setoffInv) => setNote({ ...note, setoffInv })} />
            {note.kind === 'debit' ? (
              <PickerField label="Tax" value={note.taxType} options={[{ value: '', label: 'None' }, { value: 'VAT', label: 'VAT 8%' }]} onChange={(taxType) => setNote({ ...note, taxType })} />
            ) : null}
          </Row>
          <Field label="Remarks" value={note.remarks} onChangeText={(remarks) => setNote({ ...note, remarks })} />
          {can('accounts', 'create') ? <Button title="Post note" onPress={async () => {
            try {
              const path = note.kind === 'debit' ? '/api/notes/debit' : '/api/notes/credit';
              const saved = await api(path, { method: 'POST', body: note });
              setMessage(`Posted ${saved.noteNo}`);
              await reload();
            } catch (e) { setError(e.message); }
          }} /> : null}
          <Table
            columns={[
              { key: 'note_no', label: 'No' },
              { key: 'date', label: 'Date' },
              { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
              { key: 'remarks', label: 'Remarks' },
              ...(can('accounts', 'delete') ? [{
                key: 'remove',
                label: '',
                render: (row) => <RemoveLink onPress={async () => {
                  try {
                    await api(`/api/notes/${note.kind}/${row.id}`, { method: 'DELETE' });
                    setMessage('Note removed');
                    await reload();
                  } catch (e) { setError(e.message); }
                }} />,
              }] : []),
            ]}
            rows={note.kind === 'debit' ? notes.debit : notes.credit}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const cashAccounts = [
  { value: '15001', label: '15001 Manager' },
  { value: '15002', label: '15002 Main Cash' },
  { value: '15003', label: '15003 Petty Cash' },
];

export function TransferScreen({ onBack }) {
  const { can } = useAccess();
  const [form, setForm] = useState({ from: '15001', to: '15002', date: todayIso(), amount: '', description: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  return (
    <Screen title="Cash Transfer" subtitle="Move money between manager, main cash, and petty cash." onBack={onBack}>
      <Banner text={error} />
      <Banner text={message} kind="ok" />
      <Card>
        <Row>
          <PickerField label="From" value={form.from} options={cashAccounts} onChange={(from) => setForm({ ...form, from })} />
          <PickerField label="To" value={form.to} options={cashAccounts} onChange={(to) => setForm({ ...form, to })} />
          <Field label="Date" value={form.date} onChangeText={(date) => setForm({ ...form, date })} />
          <Field label="Amount" value={form.amount} onChangeText={(amount) => setForm({ ...form, amount })} keyboardType="decimal-pad" />
        </Row>
        <Field label="Description" value={form.description} onChangeText={(description) => setForm({ ...form, description })} />
        {can('transfer', 'create') ? <Button title="Transfer" onPress={async () => {
          try {
            await api('/api/cash/transfer', { method: 'POST', body: form });
            setMessage('Transfer posted');
            setForm({ ...form, amount: '', description: '' });
          } catch (e) { setError(e.message); }
        }} /> : null}
      </Card>
    </Screen>
  );
}

export function ExpensesScreen({ onBack }) {
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState([]);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { can } = useAccess();

  async function load(next = date) {
    const data = await api(`/api/cash/petty?date=${next}`);
    setRows(data.filter((row) => row.description === 'Expenses'));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  return (
    <Screen title="Expenses" subtitle="Saving replaces today's petty-cash expense lines." onBack={onBack}>
      <Banner text={error} />
      <Banner text={message} kind="ok" />
      <Card>
        <Field label="Date" value={date} onChangeText={setDate} />
        <Button title="Load" kind="ghost" onPress={() => load().catch((e) => setError(e.message))} />
        <Row>
          <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Field label="Remarks" value={remarks} onChangeText={setRemarks} />
        </Row>
        <Button title="Add line" kind="ghost" onPress={() => {
          setRows([...rows, { id: `new-${rows.length}`, amount, remarks, description: 'Expenses' }]);
          setAmount('');
          setRemarks('');
        }} />
        <Table
          columns={[
            { key: 'remarks', label: 'Remarks', flex: 2 },
            { key: 'amount', label: 'Amount', render: (row) => money(row.amount || row.debit) },
            ...(can('expenses', 'delete') ? [{
              key: 'remove',
              label: '',
              render: (row) => <RemoveLink onPress={() => setRows((list) => list.filter((item) => item !== row && item.id !== row.id))} />,
            }] : []),
          ]}
          rows={rows.map((row) => ({ ...row, amount: row.amount || row.debit }))}
        />
        {can('expenses', 'create') ? <Button title="Save expenses" onPress={async () => {
          try {
            await api('/api/cash/petty', {
              method: 'POST',
              body: { date, lines: rows.map((row) => ({ amount: row.amount || row.debit, remarks: row.remarks })) },
            });
            setMessage('Expenses saved');
            await load();
          } catch (e) { setError(e.message); }
        }} /> : null}
      </Card>
    </Screen>
  );
}
