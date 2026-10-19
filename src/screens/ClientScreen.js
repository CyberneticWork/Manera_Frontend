import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { api, fileUrl } from '../api';
import { colors, money, todayIso } from '../theme';
import { Banner, Button, Card, Field, Heading, PickerField, Row, Screen, Table, useLayout } from '../ui';

const empty = () => ({
  docNo: '',
  nic: '',
  name: '',
  address: '',
  mobileNo: '',
  location: '',
  agentName: '',
  agentCommission: '0',
  riderName: '',
  riderCommission: '0',
  jobType: 'XR',
  jobNoteNo: '',
  date: todayIso(),
  note: '',
  buddy: '',
  answered: '',
  totalAmount: '',
});

const emptyItem = () => ({ category: '', itemName: '', condition: '', weight: '', rate: '', description: '' });

export function ClientScreen({ onBack, docNo, readOnly }) {
  const [form, setForm] = useState(empty());
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(emptyItem());
  const [images, setImages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [imageType, setImageType] = useState('Item');
  const [pending, setPending] = useState([]);
  const [lookups, setLookups] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState('');
  const [storageReady, setStorageReady] = useState(true);
  const screenRef = useRef(null);
  const { phone } = useLayout();

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function loadPending() {
    setPending(await api('/api/clients?status=0'));
  }

  async function openJob(id) {
    const job = await api(`/api/clients/${id}`);
    setForm({
      docNo: job.doc_no,
      nic: job.nic || '',
      name: job.name || '',
      address: job.address || '',
      mobileNo: job.mobile_no || '',
      location: job.location || '',
      agentName: job.agent_name || '',
      agentCommission: String(job.agent_commission ?? 0),
      riderName: job.rider_name || '',
      riderCommission: String(job.rider_commission ?? 0),
      jobType: job.job_type || '',
      jobNoteNo: job.job_note_no || '',
      date: job.date || todayIso(),
      note: job.note || '',
      buddy: job.buddy || '',
      answered: job.answered || '',
      totalAmount: String(job.total_amount ?? ''),
    });
    setItems(job.items.map((item) => ({
      category: item.category,
      itemName: item.item_name,
      condition: item.condition,
      weight: String(item.weight),
      rate: item.rate || '',
      description: item.description || '',
    })));
    setImages(job.images || []);
    setDocuments(job.documents || []);
    screenRef.current?.scrollTo({ y: 0, animated: true });
  }

  useEffect(() => {
    api('/api/lookups').then(setLookups).catch((e) => setError(e.message));
    api('/api/firebase/status').then((row) => setStorageReady(Boolean(row.configured))).catch(() => setStorageReady(false));
    loadPending().catch((e) => setError(e.message));
    if (docNo) openJob(docNo).catch((e) => setError(e.message));
  }, [docNo]);

  const opts = (type) => (lookups[type] || []).map((row) => ({ value: row.description, label: row.description }));
  const itemsForCategory = (lookups.item || [])
    .filter((row) => !draft.category || row.category === draft.category)
    .map((row) => ({ value: row.description, label: row.description }));

  async function save(withItems) {
    setError('');
    setMessage('');
    const body = {
      ...form,
      mobileNo: form.mobileNo,
      items: withItems ? items : undefined,
    };
    try {
      if (!form.docNo) {
        const created = await api('/api/clients', { method: 'POST', body: { ...body, items } });
        set('docNo', created.docNo);
        setMessage(`Job ${created.docNo} saved`);
      } else {
        await api(`/api/clients/${form.docNo}`, { method: 'PUT', body: { ...body, items } });
        setMessage(`Job ${form.docNo} updated`);
      }
      await loadPending();
    } catch (e) {
      setError(e.message);
    }
  }

  async function reject() {
    if (!form.docNo) return;
    try {
      await api(`/api/clients/${form.docNo}/reject`, { method: 'POST', body: {} });
      setMessage('Job rejected');
      setForm(empty());
      setItems([]);
      setImages([]);
      setDocuments([]);
      await loadPending();
    } catch (e) {
      setError(e.message);
    }
  }

  function noteError(text) {
    setMessage('');
    setError(text);
    screenRef.current?.scrollTo?.({ y: 0, animated: true });
  }

  function chooseWebFile(accept) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.style.position = 'fixed';
      input.style.left = '-1000px';
      document.body.appendChild(input);
      const finish = (file) => {
        input.remove();
        resolve(file || null);
      };
      input.addEventListener('change', () => finish(input.files && input.files[0]));
      input.addEventListener('cancel', () => finish(null));
      input.click();
    });
  }

  async function addPhoto() {
    if (!form.docNo) {
      noteError('Save the job before adding photos');
      return;
    }
    try {
      const data = new FormData();
      data.append('type', imageType);
      if (Platform.OS === 'web') {
        const file = await chooseWebFile('image/*');
        if (!file) return;
        data.append('image', file, file.name || 'photo.jpg');
      } else {
        const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
        if (picked.canceled) return;
        const asset = picked.assets[0];
        data.append('image', { uri: asset.uri, name: asset.fileName || 'photo.jpg', type: asset.mimeType || 'image/jpeg' });
      }
      setUploading('photo');
      setError('');
      await api(`/api/clients/${form.docNo}/images`, { method: 'POST', body: data });
      await openJob(form.docNo);
      setMessage('Photo saved in Firebase');
    } catch (e) {
      noteError(e.message);
    } finally {
      setUploading('');
    }
  }

  async function addDocument() {
    if (!form.docNo) {
      noteError('Save the job before adding documents');
      return;
    }
    try {
      const data = new FormData();
      data.append('type', 'Document');
      if (Platform.OS === 'web') {
        const file = await chooseWebFile('.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*');
        if (!file) return;
        data.append('document', file, file.name || 'document');
      } else {
        const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' });
        if (picked.canceled) return;
        const asset = picked.assets[0];
        data.append('document', {
          uri: asset.uri,
          name: asset.name || 'document',
          type: asset.mimeType || 'application/octet-stream',
        });
      }
      setUploading('document');
      setError('');
      await api(`/api/clients/${form.docNo}/documents`, { method: 'POST', body: data });
      await openJob(form.docNo);
      setMessage('Document saved in Firebase');
    } catch (e) {
      noteError(e.message);
    } finally {
      setUploading('');
    }
  }

  return (
    <Screen ref={screenRef} title="Client Details" subtitle="Open a buying job, record the gold, and keep the pending list close at hand." onBack={onBack}>
      <Banner text={error} />
      <Banner text={message} kind="ok" />
      <Card>
        <Heading aside={<View style={styles.badge}><Text style={styles.badgeText}>{form.jobType || 'Draft'}</Text></View>}>
          {form.docNo ? `Job ${form.docNo}` : 'New job'}
        </Heading>
        <Row>
          <Field label="NIC" value={form.nic} onChangeText={(v) => set('nic', v)} />
          <Field label="Customer name" value={form.name} onChangeText={(v) => set('name', v)} />
          <Field label="Mobile" value={form.mobileNo} onChangeText={(v) => set('mobileNo', v)} keyboardType="phone-pad" />
        </Row>
        <Field label="Address" value={form.address} onChangeText={(v) => set('address', v)} />
        <Row>
          <Field label="Location" value={form.location} onChangeText={(v) => set('location', v)} />
          <PickerField label="Job type" value={form.jobType} options={opts('jobType')} onChange={(v) => set('jobType', v)} />
          <Field label="Job note" value={form.jobNoteNo} onChangeText={(v) => set('jobNoteNo', v)} />
          <Field label="Date" value={form.date} onChangeText={(v) => set('date', v)} placeholder="YYYY-MM-DD" />
        </Row>
        <Row>
          <PickerField label="Agent" value={form.agentName} options={opts('agent')} onChange={(v) => set('agentName', v)} />
          <Field label="Agent commission" value={form.agentCommission} onChangeText={(v) => set('agentCommission', v)} keyboardType="decimal-pad" />
          <PickerField label="Rider" value={form.riderName} options={opts('rider')} onChange={(v) => set('riderName', v)} />
          <Field label="Rider commission" value={form.riderCommission} onChangeText={(v) => set('riderCommission', v)} keyboardType="decimal-pad" />
        </Row>
        <Row>
          <Field label="Buddy" value={form.buddy} onChangeText={(v) => set('buddy', v)} />
          <Field label="Answered" value={form.answered} onChangeText={(v) => set('answered', v)} />
          <Field label="Total amount" value={form.totalAmount} onChangeText={(v) => set('totalAmount', v)} keyboardType="decimal-pad" />
        </Row>
        <Field label="Note" value={form.note} onChangeText={(v) => set('note', v)} multiline />
        {readOnly ? null : (
          <Row>
            <Button title={form.docNo ? 'Update job' : 'Save job'} onPress={() => save(true)} />
            <Button title="Clear" kind="ghost" onPress={() => { setForm(empty()); setItems([]); setImages([]); setDocuments([]); }} />
            <Button title="Reject" kind="danger" onPress={reject} />
          </Row>
        )}
      </Card>

      <Card>
        <Heading>Items</Heading>
        <Row>
          <PickerField label="Category" value={draft.category} options={opts('category')} onChange={(category) => setDraft({ ...draft, category, itemName: '' })} />
          <PickerField label="Item" value={draft.itemName} options={itemsForCategory} onChange={(itemName) => setDraft({ ...draft, itemName })} />
          <PickerField label="Condition" value={draft.condition} options={opts('condition')} onChange={(condition) => setDraft({ ...draft, condition })} />
        </Row>
        <Row>
          <Field label="Weight (g)" value={draft.weight} onChangeText={(weight) => setDraft({ ...draft, weight })} keyboardType="decimal-pad" />
          <Field label="Rate" value={draft.rate} onChangeText={(rate) => setDraft({ ...draft, rate })} />
          <Field label="Description" value={draft.description} onChangeText={(description) => setDraft({ ...draft, description })} />
        </Row>
        {readOnly ? null : <Button title="Add item row" kind="ghost" onPress={() => {
          if (!draft.itemName || !draft.weight) {
            setError('Choose an item and enter the weight');
            return;
          }
          setItems([...items, draft]);
          setDraft(emptyItem());
          setError('');
        }} />}
        <Table
          columns={[
            { key: 'category', label: 'Category' },
            { key: 'itemName', label: 'Item' },
            { key: 'condition', label: 'Condition' },
            { key: 'weight', label: 'Weight' },
            { key: 'rate', label: 'Rate' },
          ]}
          rows={items.map((item, index) => ({ ...item, id: index }))}
          empty="No items yet."
        />
      </Card>

      <Card>
        <Heading>Photos</Heading>
        {!storageReady ? <Text style={styles.photoEmpty}>Firebase is not connected yet. A super admin must open Firebase and save the storage account before photos can be kept.</Text> : null}
        <Row>
          <PickerField label="Image type" value={imageType} options={opts('imageType')} onChange={setImageType} />
          {readOnly ? null : <Button title={uploading === 'photo' ? 'Uploading…' : 'Upload photo'} onPress={addPhoto} disabled={Boolean(uploading)} />}
        </Row>
        <View style={styles.photos}>
          {images.map((image) => (
            <View key={image.id} style={[styles.photoWrap, phone && styles.photoWrapPhone]}>
              <StoredImage image={image} />
            </View>
          ))}
          {!images.length ? <Text style={styles.photoEmpty}>No photos attached.</Text> : null}
        </View>
      </Card>

      <Card>
        <Heading>Documents</Heading>
        {readOnly ? null : <Button title={uploading === 'document' ? 'Uploading…' : 'Upload document'} onPress={addDocument} disabled={Boolean(uploading)} />}
        {documents.map((document) => (
          <Pressable key={document.id} onPress={() => Linking.openURL(fileUrl(document.url || `/api/media/documents/${document.id}`))}>
            <Text style={styles.docLink}>{document.file_name || document.type || 'Document'}</Text>
          </Pressable>
        ))}
        {!documents.length ? <Text style={styles.photoEmpty}>No documents attached.</Text> : null}
      </Card>

      <Card>
        <Heading>Pending jobs</Heading>
      <Table
        columns={[
          { key: 'name', label: 'Customer' },
          { key: 'doc_no', label: 'Job' },
          { key: 'mobile_no', label: 'Mobile' },
          { key: 'agent_name', label: 'Agent' },
          { key: 'total_amount', label: 'Amount', render: (row) => money(row.total_amount) },
        ]}
        rows={pending}
        onPressRow={(row) => openJob(row.doc_no).catch((e) => setError(e.message))}
        empty="No pending jobs."
      />
      </Card>
    </Screen>
  );
}

function StoredImage({ image }) {
  const firebase = fileUrl(image.url);
  const copy = fileUrl(`/api/media/images/${image.id}`);
  const [uri, setUri] = useState(firebase || copy);
  return (
    <Image
      source={{ uri }}
      style={styles.photo}
      resizeMode="contain"
      onError={() => {
        if (uri !== copy) setUri(copy);
      }}
    />
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  photoWrap: { width: 148, padding: 5 },
  photoWrapPhone: { width: '50%' },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: colors.input },
  photoEmpty: { color: colors.muted, padding: 8 },
  docLink: { color: colors.teal, fontWeight: '700', marginTop: 8 },
});
