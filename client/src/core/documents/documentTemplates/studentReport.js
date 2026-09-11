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
    const streamName = activeEnrollment?.stream?.name || s.streamName || '';
    const rollNo = activeEnrollment?.rollNo || s.rollNo || '—';

    let fullClass = className;
    if (sectionName && sectionName !== '-') fullClass += ` - ${sectionName}`;
    const extras = [mediumName, streamName].filter((x) => x && x !== '-').join(' / ');
    if (extras) fullClass += ` (${extras})`;

    return {
      admissionNo: sanitizeDocText(s.admissionNo, 'N/A'),
      name: sanitizeDocText(s.studentName || s.name, 'Student Name'),
      rollNo: sanitizeDocText(rollNo, '—'),
      classSection: sanitizeDocText(fullClass, 'N/A'),
      medium: sanitizeDocText(mediumName, '—'),
      guardianName: sanitizeDocText(s.guardianName || s.fatherName || s.guardian?.name, 'N/A'),
      phone: sanitizeDocText(s.phone || s.guardianPhone || s.mobile, '—'),
      status: sanitizeDocText(s.status, 'ACTIVE'),
    };
  });

  return {
    school,
    reportTitle: sanitizeDocText(rawData.reportMeta?.title, 'STUDENT DIRECTORY LIST REPORT'),
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

  // Summary Metrics Card
  content.push({
    table: {
      widths: ['50%', '50%'],
      body: [
        [
          {
            fillColor: '#f8fafc',
            borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'],
            margin: [8, 6, 8, 6],
            stack: [
              { text: 'TOTAL ENROLLED STUDENTS', fontSize: 8, bold: true, color: '#475569' },
              { text: String(data.totalStudents), fontSize: 14, bold: true, color: '#0f172a', margin: [0, 2, 0, 0] },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'],
            margin: [8, 6, 8, 6],
            stack: [
              { text: 'ACTIVE STUDENTS', fontSize: 8, bold: true, color: '#475569' },
              { text: String(data.activeCount), fontSize: 14, bold: true, color: '#15803d', margin: [0, 2, 0, 0] },
            ],
          },
        ],
      ],
    },
    margin: [0, 0, 0, 12],
  });

  // Table Body Headers & Rows
  const tableRows = [
    [
      { text: 'Adm No', fontSize: 9, bold: true, fillColor: '#f1f5f9', color: '#0f172a', margin: [3, 4, 3, 4] },
      { text: 'Student Name', fontSize: 9, bold: true, fillColor: '#f1f5f9', color: '#0f172a', margin: [3, 4, 3, 4] },
      { text: 'Guardian Name', fontSize: 9, bold: true, fillColor: '#f1f5f9', color: '#0f172a', margin: [3, 4, 3, 4] },
      { text: 'Class & Sec (Medium)', fontSize: 9, bold: true, fillColor: '#f1f5f9', color: '#0f172a', margin: [3, 4, 3, 4] },
      { text: 'Phone', fontSize: 9, bold: true, fillColor: '#f1f5f9', color: '#0f172a', margin: [3, 4, 3, 4] },
      { text: 'Status', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f1f5f9', color: '#0f172a', margin: [3, 4, 3, 4] },
    ],
  ];

  if (!data.items || data.items.length === 0) {
    tableRows.push([
      { text: 'No student records found for the applied report parameters.', colSpan: 6, alignment: 'center', fontSize: 8.5, color: '#64748b', margin: [4, 8, 4, 8] },
      {}, {}, {}, {}, {},
    ]);
  } else {
    data.items.forEach((item) => {
      tableRows.push([
        { text: item.admissionNo, fontSize: 8.5, bold: true, color: '#0f172a', margin: [3, 3, 3, 3] },
        { text: item.name, fontSize: 8.5, bold: true, color: '#0f172a', margin: [3, 3, 3, 3] },
        { text: item.guardianName, fontSize: 8.5, color: '#334155', margin: [3, 3, 3, 3] },
        { text: item.classSection, fontSize: 8.5, color: '#334155', margin: [3, 3, 3, 3] },
        { text: item.phone, fontSize: 8.5, color: '#475569', margin: [3, 3, 3, 3] },
        {
          text: item.status,
          fontSize: 8,
          alignment: 'center',
          bold: true,
          color: item.status === 'ACTIVE' ? '#15803d' : '#b45309',
          margin: [3, 3, 3, 3],
        },
      ]);
    });
  }

  content.push({
    table: {
      headerRows: 1,
      widths: ['14%', '24%', '20%', '24%', '10%', '8%'],
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
