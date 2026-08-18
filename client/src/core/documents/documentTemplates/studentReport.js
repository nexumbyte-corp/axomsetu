import { createPDFHeader } from '../common/header.js';
import { sanitizeDocText, getSchoolBranding } from '../common/formatters.js';

/**
 * Student Report Data Builder
 */
export const buildStudentReportData = (rawData = {}) => {
  const school = getSchoolBranding(rawData.schoolHeader || rawData.school);
  const rows = rawData.data || rawData.items || rawData.students || rawData.reportData || [];
  const summary = rawData.summary || {};

  let activeCount = summary.activeStudents || summary.activeCount || 0;
  let totalStudents = summary.totalStudents || rows.length;

  const items = rows.map((s) => {
    const activeEnrollment = s.enrollments?.find((e) => e.status === 'ACTIVE') || s.enrollments?.[0] || s.enrollment;

    const className = activeEnrollment?.class?.name || s.className || 'N/A';
    const sectionName = activeEnrollment?.section?.name || s.sectionName || '';
    const mediumName = activeEnrollment?.medium?.name || s.mediumName || '';
    const rollNo = activeEnrollment?.rollNo || s.rollNo || '—';

    return {
      admissionNo: sanitizeDocText(s.admissionNo, 'N/A'),
      name: sanitizeDocText(s.name, 'Student Name'),
      rollNo: sanitizeDocText(rollNo, '—'),
      classSection: `${className} ${sectionName ? `(${sectionName})` : ''}`.trim(),
      medium: sanitizeDocText(mediumName, '—'),
      guardianName: sanitizeDocText(s.guardianName || s.fatherName || s.guardian?.name, 'N/A'),
      phone: sanitizeDocText(s.phone || s.guardianPhone || s.mobile, '—'),
      gender: sanitizeDocText(s.gender, '—'),
      status: sanitizeDocText(s.status, 'ACTIVE'),
    };
  });

  return {
    school,
    reportTitle: sanitizeDocText(rawData.reportMeta?.title, 'STUDENT DIRECTORY REPORT'),
    filters: rawData.filtersApplied || {},
    totalStudents,
    activeCount: activeCount || items.filter((i) => i.status === 'ACTIVE').length,
    items,
  };
};

/**
 * pdfMake Template Builder for Student Report
 */
export const buildStudentReportTemplate = (data = {}, _settings = {}) => {
  const headerContent = createPDFHeader({
    school: data.school,
    documentTitle: data.reportTitle,
  });

  const content = [...headerContent];

  // Metrics Box
  content.push({
    table: {
      widths: ['50%', '50%'],
      body: [
        [
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [6, 4, 6, 4],
            stack: [
              { text: 'TOTAL ENROLLED STUDENTS', fontSize: 7.5, bold: true, color: '#475569' },
              { text: String(data.totalStudents), fontSize: 11, bold: true, color: '#0f172a' },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [6, 4, 6, 4],
            stack: [
              { text: 'ACTIVE STUDENTS', fontSize: 7.5, bold: true, color: '#475569' },
              { text: String(data.activeCount), fontSize: 11, bold: true, color: '#15803d' },
            ],
          },
        ],
      ],
    },
    margin: [0, 0, 0, 10],
  });

  // Table Body
  const tableRows = [
    [
      { text: 'Adm No', fontSize: 7.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Student Name', fontSize: 7.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Roll', fontSize: 7.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Class & Sec', fontSize: 7.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Medium', fontSize: 7.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Guardian Name', fontSize: 7.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Phone', fontSize: 7.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Status', fontSize: 7.5, bold: true, alignment: 'center', fillColor: '#f1f5f9', color: '#0f172a' },
    ],
  ];

  if (data.items.length === 0) {
    tableRows.push([
      { text: 'No student records found for the applied report parameters.', colSpan: 8, alignment: 'center', fontSize: 8, color: '#64748b' },
      {}, {}, {}, {}, {}, {}, {},
    ]);
  } else {
    data.items.forEach((item) => {
      tableRows.push([
        { text: item.admissionNo, fontSize: 7.5, bold: true, color: '#0f172a' },
        { text: item.name, fontSize: 7.5, bold: true, color: '#0f172a' },
        { text: item.rollNo, fontSize: 7.5, color: '#475569' },
        { text: item.classSection, fontSize: 7.5, color: '#334155' },
        { text: item.medium, fontSize: 7.5, color: '#475569' },
        { text: item.guardianName, fontSize: 7.5, color: '#334155' },
        { text: item.phone, fontSize: 7.5, color: '#475569' },
        { text: item.status, fontSize: 7, alignment: 'center', bold: true, color: item.status === 'ACTIVE' ? '#15803d' : '#b45309' },
      ]);
    });
  }

  content.push({
    table: {
      headerRows: 1,
      widths: ['12%', '22%', '8%', '16%', '10%', '17%', '10%', '5%'],
      body: tableRows,
    },
    margin: [0, 0, 0, 15],
  });

  return { content };
};

export default {
  buildStudentReportData,
  buildStudentReportTemplate,
};
