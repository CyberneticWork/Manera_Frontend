import { useEffect, useState } from 'react';
import { api } from '../api';
import { Banner, Button, Card, Field, PickerField, Row, Screen, Table, Tabs } from '../ui';

const tabs = [
  { key: 'category', label: 'Category' },
  { key: 'item', label: 'Item' },
  { key: 'condition', label: 'Condition' },
  { key: 'jobType', label: 'Job type' },
  { key: 'imageType', label: 'Image type' },
  { key: 'agent', label: 'Agent' },
  { key: 'rider', label: 'Rider' },
  { key: 'mobile', label: 'Mobile' },
];

export function MastersScreen({ onBack }) {
  const [type, setType] = useState('category');
  const [lookups, setLookups] = useState({});
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function reload() {
    setLookups(await api('/api/lookups'));
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, []);

  const rows = lookups[type] || [];

  return (
    <Screen title="Create Menu" subtitle="These lists fill the dropdowns on client jobs and the call log." onBack={onBack}>
      <Banner text={error} />
      <Banner text={message} kind="ok" />
      <Tabs tabs={tabs} value={type} onChange={setType} />
      <Card>
        <Row>
          <Field label="Description" value={description} onChangeText={setDescription} />
          {type === 'item' ? (
            <PickerField
              label="Category"
              value={category}
              options={(lookups.category || []).map((row) => ({ value: row.description, label: row.description }))}
              onChange={setCategory}
            />
          ) : null}
        </Row>
        <Button title="Add" onPress={async () => {
          try {
            await api('/api/lookups', { method: 'POST', body: { type, description, category: type === 'item' ? category : null } });
            setDescription('');
            setMessage('Saved');
            await reload();
          } catch (e) { setError(e.message); }
        }} />
      </Card>
      <Table
        columns={[
          { key: 'description', label: 'Description', flex: 2 },
          { key: 'category', label: 'Category' },
        ]}
        rows={rows}
      />
    </Screen>
  );
}

export function UsersScreen({ onBack }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', title: '', group: 'Cashier' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function reload() {
    setRows(await api('/api/users'));
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, []);

  return (
    <Screen title="Users" subtitle="Each person gets one role. Access Control decides which screens that role can open after JWT login." onBack={onBack}>
      <Banner text={error} />
      <Banner text={message} kind="ok" />
      <Card>
        <Row>
          <Field label="Username" value={form.username} onChangeText={(username) => setForm({ ...form, username })} />
          <Field label="Password" value={form.password} onChangeText={(password) => setForm({ ...form, password })} secureTextEntry />
          <Field label="Title" value={form.title} onChangeText={(title) => setForm({ ...form, title })} />
          <PickerField
            label="Category"
            value={form.group}
            options={['SAdmin', 'Admin', 'Cashier', 'CallCenter', 'History', 'Account'].map((value) => ({ value, label: value }))}
            onChange={(group) => setForm({ ...form, group })}
          />
        </Row>
        <Button title="Create user" onPress={async () => {
          try {
            await api('/api/users', { method: 'POST', body: form });
            setMessage('User created');
            setForm({ username: '', password: '', title: '', group: 'Cashier' });
            await reload();
          } catch (e) { setError(e.message); }
        }} />
      </Card>
      <Table
        columns={[
          { key: 'username', label: 'User' },
          { key: 'title', label: 'Title' },
          { key: 'group_code', label: 'Role' },
          { key: 'active', label: 'Active', render: (row) => (row.active ? 'Yes' : 'No') },
        ]}
        rows={rows}
      />
    </Screen>
  );
}
