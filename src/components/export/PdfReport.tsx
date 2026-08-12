import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { FormRecord, FormTemplate, Problem } from '../../types';

Font.register({
  family: 'Noto Sans SC',
  src: 'https://fonts.gstatic.com/s/notosanssc/v36/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_EnYxNbPzS5HE.ttf',
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Noto Sans SC', fontSize: 10, color: '#1e293b' },
  header: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#4f46e5', marginBottom: 6 },
  subtitle: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  section: { marginTop: 14, marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #e2e8f0' },
  field: { marginBottom: 6 },
  fieldLabel: { fontSize: 9, fontWeight: 'bold', color: '#64748b', marginBottom: 2 },
  fieldValue: { fontSize: 10, color: '#1e293b', lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
  badge: { fontSize: 9, color: '#059669', backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  metaText: { fontSize: 8, color: '#94a3b8' },
});

interface PdfReportProps {
  problem?: Problem;
  record: FormRecord;
  template: FormTemplate;
  values: Record<string, unknown>;
}

export function PdfReport({ problem, record, template, values }: PdfReportProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{template.icon} {template.name}</Text>
          {problem && <Text style={styles.subtitle}>问题：{problem.title}</Text>}
          {problem?.problemStatement && <Text style={styles.subtitle}>陈述：{problem.problemStatement}</Text>}
          <View style={styles.meta}>
            <Text style={styles.metaText}>创建：{record.createdAt?.slice(0, 10)}</Text>
            <Text style={styles.metaText}>更新：{record.updatedAt?.slice(0, 10)}</Text>
            <View style={styles.badge}>
              <Text>{record.status === 'completed' ? '已完成' : '草稿'}</Text>
            </View>
          </View>
        </View>

        {template.sections.map((section) => {
          const sectionData = section.repeatable ? values[section.id] : null;

          return (
            <View key={section.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.repeatable && Array.isArray(sectionData) ? (
                sectionData.map((entry, entryIdx) => (
                  <View key={entryIdx} style={{ marginBottom: 8, paddingLeft: 8 }}>
                    <Text style={{ fontSize: 9, color: '#6366f1', marginBottom: 4 }}>#{entryIdx + 1}</Text>
                    {section.fields.map((field) => {
                      const val = (entry as Record<string, unknown>)?.[field.id];
                      if (!val && val !== 0) return null;
                      return (
                        <View key={field.id} style={styles.field}>
                          <Text style={styles.fieldLabel}>{field.label}</Text>
                          <Text style={styles.fieldValue}>{String(val)}</Text>
                        </View>
                      );
                    })}
                  </View>
                ))
              ) : (
                section.fields.map((field) => {
                  const val = values[field.id];
                  if (!val && val !== 0) return null;
                  const displayValue = Array.isArray(val)
                    ? val.map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item))).join(', ')
                    : String(val);
                  return (
                    <View key={field.id} style={styles.field}>
                      <Text style={styles.fieldLabel}>{field.label}</Text>
                      <Text style={styles.fieldValue}>{displayValue}</Text>
                    </View>
                  );
                })
              )}
            </View>
          );
        })}

        <Text style={styles.footer}>
          根因分析报告 · {template.name} · 生成于 {new Date().toLocaleDateString('zh-CN')}
        </Text>
      </Page>
    </Document>
  );
}
