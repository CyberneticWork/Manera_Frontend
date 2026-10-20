import { createElement, useEffect, useState } from 'react';
import { Image, Platform, Text, View } from 'react-native';
import { api, apiBlob, fileUrl } from '../api';
import { colors, todayIso } from '../theme';
import { Banner, Button, Card, Field, Heading, Row, Screen, Table, Tabs, useLayout } from '../ui';

const types = [
  { key: 'bought', label: 'Bought products' },
  { key: 'bought-url', label: 'Bought products + photos' },
  { key: 'summary', label: 'Product summary' },
  { key: 'main-cash', label: 'Main cash daily' },
  { key: 'petty-cash', label: 'Bank book' },
  { key: 'journal', label: 'Journal entries' },
  { key: 'chart', label: 'Chart of accounts' },
  { key: 'expenses-daily', label: 'Expenses daily' },
  { key: 'expenses-month', label: 'Expenses month wise' },
];

export function ReportsScreen({ onBack }) {
  const [type, setType] = useState('bought');
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [jobNo, setJobNo] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [fileName, setFileName] = useState('report.pdf');
  const [busy, setBusy] = useState(false);
  const { phone } = useLayout();

  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  async function printPdf() {
    setError('');
    setReport(null);
    setBusy(true);
    const params = new URLSearchParams({
      from,
      to,
      code: code.trim(),
      jobNo: jobNo.trim(),
    });
    const query = params.toString();
    try {
      const [data, blob] = await Promise.all([
        api(`/api/reports/${type}/data?${query}`),
        apiBlob(`/api/reports/${type}/pdf?${query}`),
      ]);
      const url = URL.createObjectURL(blob);
      setPdfUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
      setReport(data);
      const label = types.find((item) => item.key === type)?.label || 'report';
      setFileName(`${label.replace(/\s+/g, '-')}.pdf`);
      if (Platform.OS === 'web') {
        setTimeout(() => document.getElementById('gold-report')?.scrollIntoView({ block: 'start' }), 80);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const needsJob = type === 'bought' || type === 'bought-url';

  return (
    <Screen
      title="Reports"
      subtitle="The access code must match the From date. The # is optional."
      onBack={onBack}
    >
      <Banner text={error} />
      <Card>
        <Tabs tabs={types} value={type} onChange={(next) => { setType(next); setReport(null); }} />
        <Row>
          <Field label="From" value={from} onChangeText={setFrom} />
          <Field label="To" value={to} onChangeText={setTo} />
          <Field label="Access code" value={code} onChangeText={setCode} placeholder="ABC123" />
          {needsJob ? (
            <Field label="Job no" value={jobNo} onChangeText={setJobNo} placeholder="Payout no, doc no, or job note. Blank prints every paid job" />
          ) : null}
        </Row>
        <Button title={busy ? 'Preparing report…' : 'Print PDF'} onPress={printPdf} disabled={busy} />
      </Card>
      {report ? (
        <Card>
          <View nativeID="gold-report">
            <Heading aside={pdfUrl && Platform.OS === 'web' ? createElement('a', {
              href: pdfUrl,
              download: fileName,
              style: { color: '#d4b483', fontWeight: '700', textDecoration: 'none' },
            }, 'Download PDF') : null}>
              {report.title}
            </Heading>
            <Text style={{ color: colors.muted, marginBottom: 10 }}>{report.subtitle}</Text>
            {report.empty ? (
              <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>{report.empty}</Text>
            ) : null}
            {(report.sections || []).map((section) => (
              <View key={section.heading} style={{ marginTop: 12 }}>
                <Text style={{ color: colors.gold, fontWeight: '800', marginBottom: 6 }}>{section.heading}</Text>
                {section.lines?.length ? (
                  <View style={{ marginBottom: 8 }}>
                    {section.lines.map(([label, value]) => (
                      <Text key={label} style={{ color: colors.text, marginBottom: 2 }}>
                        {label}: {value || '—'}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <Table columns={section.columns || []} rows={section.rows || []} empty="No lines" />
                {section.footer ? (
                  <Text style={{ color: colors.muted, marginTop: 6 }}>{section.footer}</Text>
                ) : null}
                {section.images?.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
                    {section.images.map((image, index) => (
                      <View key={image.url} style={{ width: phone ? '50%' : '25%', padding: 4 }}>
                        <Image
                          source={{ uri: fileUrl(image.url) }}
                          resizeMode="contain"
                          style={{ width: '100%', height: phone ? 220 : 280, backgroundColor: '#fff', borderRadius: 4 }}
                        />
                        <Text style={{ color: colors.text, marginTop: 4 }}>{index + 1}. {image.type || 'Photo'}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
