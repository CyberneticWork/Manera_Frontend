import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { api, fileUrl } from '../api';
import { useAccess } from '../access';
import { colors, money, todayIso } from '../theme';
import { Banner, Button, Card, Field, Row, Screen, Table } from '../ui';

export function CashierScreen({ onBack, onOpenClient }) {
  const { can } = useAccess();
  const [date, setDate] = useState(todayIso());
  const [nic, setNic] = useState('');
  const [mobile, setMobile] = useState('');
  const [docNo, setDocNo] = useState('');
  const [found, setFound] = useState(null);
  const [amount, setAmount] = useState('');
  const [agentCommission, setAgentCommission] = useState('');
  const [riderCommission, setRiderCommission] = useState('');
  const [cancelJobNo, setCancelJobNo] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function search() {
    setError('');
    setMessage('');
    const params = new URLSearchParams({ date });
    if (nic) params.set('nic', nic);
    else if (mobile) params.set('mobile', mobile);
    else if (docNo) params.set('docNo', docNo);
    try {
      const data = await api(`/api/cashier/lookup?${params.toString()}`);
      setFound(data);
      setAmount('');
      setAgentCommission(String(data.agentCommission));
      setRiderCommission(String(data.job.rider_commission || 0));
    } catch (e) {
      setFound(null);
      setError(e.message);
    }
  }

  async function finalize() {
    if (!found) return;
    if (!String(amount).trim() || Number(amount) <= 0) {
      setError('Last value should be entered and confirmed before finalize');
      return;
    }
    try {
      const result = await api('/api/cashier/finalize', {
        method: 'POST',
        body: {
          docNo: found.job.doc_no,
          date,
          amount,
          agentCommission,
          riderCommission,
        },
      });
      setMessage(`Finalized as ${result.jobNo}. Main cash was debited ${money(amount)}.`);
      setFound(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function cancel() {
    if (!cancelJobNo) {
      setError('Enter the finalized job number to cancel');
      return;
    }
    try {
      await api('/api/cashier/cancel', { method: 'POST', body: { jobNo: cancelJobNo } });
      setMessage('Finalize cancelled. The job is pending again.');
      setCancelJobNo('');
      setFound(null);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Screen title="Cashier" subtitle="Find an open job, check the weight commission, then pay it out." onBack={onBack}>
      <Banner text={error} />
      <Banner text={message} kind="ok" />
      <Card>
        <Row>
          <Field label="Finalize date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <Field label="NIC" value={nic} onChangeText={setNic} />
          <Field label="Mobile" value={mobile} onChangeText={setMobile} />
          <Field label="Client job no" value={docNo} onChangeText={setDocNo} />
        </Row>
        <Button title="Search" onPress={search} />
        <Text style={{ color: colors.muted }}>Search uses NIC first, then mobile, then job number. The date must be within the last 7 days.</Text>
      </Card>
      {found ? (
        <Card>
          <Text style={{ color: colors.gold, fontWeight: '800' }}>
            Job {found.job.doc_no} · {found.job.name}
          </Text>
          <Text style={{ color: colors.text }}>{found.job.nic} · {found.job.mobile_no} · {found.job.location}</Text>
          <Text style={{ color: colors.text }}>
            {found.job.job_type} · Agent {found.job.agent_name} · Rider {found.job.rider_name}
          </Text>
          <Text style={{ color: colors.text }}>
            Items {found.totals.itemCount} · Weight {found.totals.totalWeight} g
          </Text>
          <Text style={{ color: colors.muted }}>Next payout number {found.suggestedJobNo.jobNo}</Text>
          <Table
            columns={[
              { key: 'item_name', label: 'Item' },
              { key: 'condition', label: 'Condition' },
              { key: 'weight', label: 'Weight' },
              { key: 'rate', label: 'Rate' },
            ]}
            rows={found.items}
          />
          <Row>
            {found.images.map((image) => (
              <View key={image.id} style={{ width: 96 }}>
                <Image source={{ uri: fileUrl(image.url) }} style={{ width: 96, height: 96, borderRadius: 10, backgroundColor: colors.input }} />
                <Text style={{ color: colors.ink, backgroundColor: colors.amber, fontWeight: '800', fontSize: 11, textAlign: 'center', marginTop: 4, borderRadius: 999, overflow: 'hidden', paddingVertical: 2 }} numberOfLines={1}>{image.type || 'Photo'}</Text>
              </View>
            ))}
          </Row>
          <Row>
            <Field label="First value" value={money(found.job.total_amount)} editable={false} />
            <Field label="Last value" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Amount paid" />
            <Field label="Agent commission" value={agentCommission} onChangeText={setAgentCommission} keyboardType="decimal-pad" />
            <Field label="Rider commission" value={riderCommission} onChangeText={setRiderCommission} keyboardType="decimal-pad" />
          </Row>
          <Row>
            {can('cashier', 'create') ? <Button title="Finalize" kind="ok" onPress={finalize} /> : null}
            <Button title="Open client" kind="ghost" onPress={() => onOpenClient(found.job.doc_no)} />
            <Field label="Cancel job no" value={cancelJobNo} onChangeText={setCancelJobNo} />
            {can('cashier', 'delete') ? <Button title="Cancel finalize" kind="danger" onPress={cancel} /> : null}
          </Row>
          {found.alreadyFinalized ? <Text style={{ color: colors.danger }}>This client job is already finalized.</Text> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
