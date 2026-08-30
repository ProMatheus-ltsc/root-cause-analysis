/**
 * PDF 报告组件：把一次根因分析的内容排版为 A4 PDF 文档。
 * 结构：头部（模板名、问题信息、创建/更新时间、完成状态徽章）→ 按模板 section 顺序
 * 逐节输出字段值（可重复段逐条编号输出）→ 页脚为报告生成时间。
 * 核心概念：这是一个"虚拟组件"，不会在页面渲染，而是被 @react-pdf/renderer 编译成 PDF；
 * 样式使用 StyleSheet.create 声明的 PDF 专用样式（flex 布局、单位为 pt）。
 */
import { Font, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { registerPdfChineseFont } from '@shared/core/utils/pdfFont';
import type { FormRecord, FormTemplate, Problem } from '../../types';

// 中文字体本地化：fonts.gstatic.com 在部分网络不可达，远程 fetch 会导致 toBlob() 抛 Failed to fetch；
// 字体文件随 public/fonts/ 分发，注册逻辑沉淀在 @shared/core/utils/pdfFont
registerPdfChineseFont(Font, import.meta.env.BASE_URL);

/** PDF 专用样式表：类似 CSS，但由 react-pdf 解析（flexDirection、marginTop 等命名与 Web 略有差异） */
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

/**
 * PDF 报告文档组件。
 * @param problem 关联问题（可选），有则展示问题标题与陈述
 * @param record 分析记录（标题、状态、时间戳来自这里）
 * @param template 模板（决定章节结构与字段标签）
 * @param values 当前表单值（导出内容的数据源）
 */
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
          // 可重复段的值是"条目数组"，普通段的值直接挂在表单根节点上
          const sectionData = section.repeatable ? values[section.id] : null;

          return (
            <View key={section.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.repeatable && Array.isArray(sectionData) ? (
                // 可重复段：逐条输出，每条前加 #序号
                sectionData.map((entry, entryIdx) => (
                  <View key={entryIdx} style={{ marginBottom: 8, paddingLeft: 8 }}>
                    <Text style={{ fontSize: 9, color: '#6366f1', marginBottom: 4 }}>#{entryIdx + 1}</Text>
                    {section.fields.map((field) => {
                      const val = (entry as Record<string, unknown>)?.[field.id];
                      // 跳过空值（但要保留数字 0，避免漏掉"得分为 0"这类有意义的数据）
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
                // 普通段：直接按字段输出；数组值（如多选、表格）转成逗号分隔的文本
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
