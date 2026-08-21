import { createPDFHeader } from '../common/header.js';
import { formatDocCurrency, sanitizeDocText, getSchoolBranding, formatDocDate } from '../common/formatters.js';

/**
 * Hostel Report Data Builder for All 7 Report Types
 */
export const buildHostelReportData = (rawData = {}) => {
  const school = getSchoolBranding(rawData.schoolHeader || rawData.school);
  const reportType = (rawData.reportType || rawData.type || 'residents').toLowerCase();
  const rawRows = rawData.reportData || rawData.data || rawData.items || [];
  const hostelName = sanitizeDocText(rawData.hostelName || rawData.filtersApplied?.hostelName, 'All Hostels');

  // Handle Fees report (which has { summary, charges })
  if (reportType === 'fees' || (rawRows && typeof rawRows === 'object' && !Array.isArray(rawRows) && rawRows.charges)) {
    const feeSummary = rawRows.summary || rawData.summary || {};
    const charges = Array.isArray(rawRows.charges) ? rawRows.charges : Array.isArray(rawRows) ? rawRows : [];

    const items = charges.map((c) => ({
      studentName: sanitizeDocText(c.studentName || c.student?.name, 'Student'),
      admissionNo: sanitizeDocText(c.admissionNo || c.student?.admissionNo, '—'),
      classSection: sanitizeDocText(
        [c.className, c.sectionName].filter(Boolean).join(' - ') || c.classSection || '—',
        '—'
      ),
      feeTitle: sanitizeDocText(c.title || c.feeTypeName, 'Hostel Fee'),
      month: sanitizeDocText(c.month, '—'),
      amount: Number(c.amount || 0),
      paidAmount: Number(c.paidAmount || 0),
      dueAmount: Number(c.dueAmount || Math.max(0, Number(c.amount || 0) - Number(c.paidAmount || 0))),
      status: sanitizeDocText(c.status, 'UNPAID'),
    }));

    return {
      school,
      reportType: 'fees',
      reportTitle: sanitizeDocText(rawData.reportMeta?.title, 'HOSTEL FEES & DUES LEDGER'),
      hostelName,
      totalCharges: feeSummary.totalCharges || items.length,
      totalBilled: Number(feeSummary.totalAmount || items.reduce((acc, i) => acc + i.amount, 0)),
      totalCollected: Number(feeSummary.totalPaid || items.reduce((acc, i) => acc + i.paidAmount, 0)),
      totalDues: Number(feeSummary.totalUnpaid || items.reduce((acc, i) => acc + i.dueAmount, 0)),
      items,
    };
  }

  // Handle Occupancy report
  if (reportType === 'occupancy') {
    const list = Array.isArray(rawRows) ? rawRows : [];
    let totalBeds = 0;
    let occupiedBeds = 0;
    let availableBeds = 0;

    const items = list.map((h) => {
      const tb = Number(h.totalBeds || 0);
      const ob = Number(h.occupiedBeds || 0);
      const ab = Number(h.availableBeds || 0);
      totalBeds += tb;
      occupiedBeds += ob;
      availableBeds += ab;
      return {
        hostelName: sanitizeDocText(h.hostelName || h.name, '—'),
        type: sanitizeDocText(h.type, 'COMBINED'),
        totalRooms: Number(h.totalRooms || 0),
        totalBeds: tb,
        occupiedBeds: ob,
        availableBeds: ab,
        occupancyRate: h.occupancyRate !== undefined ? Number(h.occupancyRate) : tb > 0 ? Math.round((ob / tb) * 100) : 0,
      };
    });

    return {
      school,
      reportType: 'occupancy',
      reportTitle: sanitizeDocText(rawData.reportMeta?.title, 'HOSTEL OCCUPANCY SUMMARY REPORT'),
      hostelName,
      totalHostels: items.length,
      totalBeds,
      occupiedBeds,
      availableBeds,
      overallOccupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      items,
    };
  }

  // Handle Bed Availability report
  if (reportType === 'availability') {
    const list = Array.isArray(rawRows) ? rawRows : [];
    let totalVacantBeds = 0;

    const items = list.map((r) => {
      const freeCount = Number(r.availableBedsCount || 0);
      totalVacantBeds += freeCount;
      return {
        hostelName: sanitizeDocText(r.hostelName, '—'),
        roomNumber: sanitizeDocText(r.roomNumber, '—'),
        floor: sanitizeDocText(r.floor, 'G'),
        capacity: Number(r.capacity || 0),
        availableBedsCount: freeCount,
        occupiedBedsCount: Number(r.occupiedBedsCount || 0),
        availableBedNumbers: Array.isArray(r.availableBedNumbers) && r.availableBedNumbers.length > 0
          ? r.availableBedNumbers.join(', ')
          : 'None',
      };
    });

    return {
      school,
      reportType: 'availability',
      reportTitle: sanitizeDocText(rawData.reportMeta?.title, 'HOSTEL ROOM & BED AVAILABILITY REPORT'),
      hostelName,
      totalRooms: items.length,
      totalVacantBeds,
      items,
    };
  }

  // Handle Admissions report
  if (reportType === 'admissions') {
    const list = Array.isArray(rawRows) ? rawRows : [];
    const items = list.map((a) => ({
      date: formatDocDate(a.startDate),
      studentName: sanitizeDocText(a.studentName || a.student?.name, 'Student'),
      admissionNo: sanitizeDocText(a.admissionNo || a.student?.admissionNo, '—'),
      classSection: sanitizeDocText([a.className, a.sectionName].filter(Boolean).join(' - '), '—'),
      guardianName: sanitizeDocText(a.guardianName || a.student?.guardianName, '—'),
      phone: sanitizeDocText(a.phone || a.student?.phone, '—'),
      hostelName: sanitizeDocText(a.hostelName || a.hostel?.name, '—'),
      roomBed: `Room ${sanitizeDocText(a.roomNumber || a.room?.roomNumber, '—')} (${sanitizeDocText(a.bedNumber || a.bed?.bedNumber, '—')})`,
    }));

    return {
      school,
      reportType: 'admissions',
      reportTitle: sanitizeDocText(rawData.reportMeta?.title, 'HOSTEL ADMISSIONS LOG REPORT'),
      hostelName,
      totalAdmissions: items.length,
      items,
    };
  }

  // Handle Transfers report
  if (reportType === 'transfers') {
    const list = Array.isArray(rawRows) ? rawRows : [];
    const items = list.map((t) => ({
      date: formatDocDate(t.transferDate),
      studentName: sanitizeDocText(t.studentName || t.student?.name || t.enrollment?.student?.name, 'Student'),
      admissionNo: sanitizeDocText(t.admissionNo || t.student?.admissionNo || t.enrollment?.student?.admissionNo, '—'),
      classSection: sanitizeDocText([t.className, t.sectionName].filter(Boolean).join(' - '), '—'),
      fromDetails: `${sanitizeDocText(t.fromHostelName || t.fromHostel?.name, '—')} (R-${sanitizeDocText(t.fromRoomNumber || t.fromRoom?.roomNumber, '—')})`,
      toDetails: `${sanitizeDocText(t.toHostelName || t.toHostel?.name, '—')} (R-${sanitizeDocText(t.toRoomNumber || t.toRoom?.roomNumber, '—')})`,
      reason: sanitizeDocText(t.reason, '—'),
    }));

    return {
      school,
      reportType: 'transfers',
      reportTitle: sanitizeDocText(rawData.reportMeta?.title, 'HOSTEL TRANSFERS LOG REPORT'),
      hostelName,
      totalTransfers: items.length,
      items,
    };
  }

  // Handle Exits report
  if (reportType === 'exits') {
    const list = Array.isArray(rawRows) ? rawRows : [];
    const items = list.map((x) => ({
      date: formatDocDate(x.endDate),
      studentName: sanitizeDocText(x.studentName || x.student?.name, 'Student'),
      admissionNo: sanitizeDocText(x.admissionNo || x.student?.admissionNo, '—'),
      classSection: sanitizeDocText([x.className, x.sectionName].filter(Boolean).join(' - '), '—'),
      hostelRoom: `${sanitizeDocText(x.hostelName || x.hostel?.name, '—')} (R-${sanitizeDocText(x.roomNumber || x.room?.roomNumber, '—')}, Bed ${sanitizeDocText(x.bedNumber || x.bed?.bedNumber, '—')})`,
      reason: sanitizeDocText(x.exitReason, 'Hostel Exit'),
    }));

    return {
      school,
      reportType: 'exits',
      reportTitle: sanitizeDocText(rawData.reportMeta?.title, 'HOSTEL EXITS LOG REPORT'),
      hostelName,
      totalExits: items.length,
      items,
    };
  }

  // Default: Current Residents report
  const list = Array.isArray(rawRows) ? rawRows : [];
  const items = list.map((r) => ({
    studentName: sanitizeDocText(r.studentName || r.student?.name || r.name, 'Student'),
    admissionNo: sanitizeDocText(r.admissionNo || r.student?.admissionNo, '—'),
    classSection: sanitizeDocText([r.className, r.sectionName].filter(Boolean).join(' - ') || r.classSection, '—'),
    guardianName: sanitizeDocText(r.guardianName || r.student?.guardianName, '—'),
    phone: sanitizeDocText(r.phone || r.student?.phone, '—'),
    hostelName: sanitizeDocText(r.hostelName || r.hostel?.name, '—'),
    roomBed: `Room ${sanitizeDocText(r.roomNumber || r.room?.roomNumber, '—')} (${sanitizeDocText(r.bedNumber || r.bed?.bedNumber, '—')})`,
    startDate: formatDocDate(r.startDate),
    status: sanitizeDocText(r.status, 'ACTIVE'),
  }));

  return {
    school,
    reportType: 'residents',
    reportTitle: sanitizeDocText(rawData.reportMeta?.title, 'CURRENT ACTIVE HOSTEL RESIDENTS REPORT'),
    hostelName,
    totalResidents: items.length,
    items,
  };
};

/**
 * pdfMake Template Builder for Hostel Reports
 */
export const buildHostelReportTemplate = (data = {}, _settings = {}) => {
  const headerContent = createPDFHeader({
    school: data.school,
    documentTitle: data.reportTitle,
    academicYear: `Hostel Filter: ${data.hostelName}`,
  });

  const content = [...headerContent];

  // 1. OCCUPANCY TEMPLATE
  if (data.reportType === 'occupancy') {
    content.push({
      table: {
        widths: ['25%', '25%', '25%', '25%'],
        body: [
          [
            {
              fillColor: '#f8fafc',
              borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
              margin: [6, 4, 6, 4],
              stack: [
                { text: 'TOTAL HOSTELS', fontSize: 8, bold: true, color: '#475569' },
                { text: String(data.totalHostels || 0), fontSize: 13, bold: true, color: '#0f172a' },
              ],
            },
            {
              fillColor: '#f8fafc',
              borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
              margin: [6, 4, 6, 4],
              stack: [
                { text: 'TOTAL BEDS CAPACITY', fontSize: 8, bold: true, color: '#475569' },
                { text: String(data.totalBeds || 0), fontSize: 13, bold: true, color: '#0f172a' },
              ],
            },
            {
              fillColor: '#f8fafc',
              borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
              margin: [6, 4, 6, 4],
              stack: [
                { text: 'OCCUPIED BEDS', fontSize: 8, bold: true, color: '#475569' },
                { text: String(data.occupiedBeds || 0), fontSize: 13, bold: true, color: '#4338ca' },
              ],
            },
            {
              fillColor: '#f8fafc',
              borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
              margin: [6, 4, 6, 4],
              stack: [
                { text: 'AVAILABLE BEDS', fontSize: 8, bold: true, color: '#475569' },
                { text: `${data.availableBeds || 0} (${data.overallOccupancyRate || 0}% Occupied)`, fontSize: 11, bold: true, color: '#15803d' },
              ],
            },
          ],
        ],
      },
      margin: [0, 0, 0, 10],
    });

    const tableRows = [
      [
        { text: 'Hostel Name', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Gender Type', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Total Rooms', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f1f5f9' },
        { text: 'Total Beds', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f1f5f9' },
        { text: 'Occupied', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f1f5f9' },
        { text: 'Available', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f1f5f9' },
        { text: 'Occupancy Rate', fontSize: 9, bold: true, alignment: 'right', fillColor: '#f1f5f9' },
      ],
    ];

    if (!data.items || data.items.length === 0) {
      tableRows.push([
        { text: 'No hostel occupancy records found.', colSpan: 7, alignment: 'center', fontSize: 8.5, color: '#64748b' },
        {}, {}, {}, {}, {}, {},
      ]);
    } else {
      data.items.forEach((item) => {
        tableRows.push([
          { text: item.hostelName, fontSize: 9, bold: true },
          { text: item.type, fontSize: 8.5, color: '#475569' },
          { text: String(item.totalRooms), fontSize: 9, alignment: 'center' },
          { text: String(item.totalBeds), fontSize: 9, alignment: 'center', bold: true },
          { text: String(item.occupiedBeds), fontSize: 9, alignment: 'center', color: '#4338ca' },
          { text: String(item.availableBeds), fontSize: 9, alignment: 'center', color: '#15803d', bold: true },
          { text: `${item.occupancyRate}%`, fontSize: 9, alignment: 'right', bold: true, color: item.occupancyRate >= 90 ? '#b91c1c' : '#0f172a' },
        ]);
      });
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ['24%', '16%', '12%', '12%', '12%', '12%', '12%'],
        body: tableRows,
      },
      margin: [0, 0, 0, 15],
    });

    return { content };
  }

  // 2. AVAILABILITY TEMPLATE
  if (data.reportType === 'availability') {
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
                { text: 'TOTAL ROOMS MONITORED', fontSize: 8, bold: true, color: '#475569' },
                { text: String(data.totalRooms || 0), fontSize: 13, bold: true, color: '#0f172a' },
              ],
            },
            {
              fillColor: '#f8fafc',
              borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
              margin: [6, 4, 6, 4],
              stack: [
                { text: 'TOTAL VACANT / FREE BEDS', fontSize: 8, bold: true, color: '#475569' },
                { text: String(data.totalVacantBeds || 0), fontSize: 13, bold: true, color: '#15803d' },
              ],
            },
          ],
        ],
      },
      margin: [0, 0, 0, 10],
    });

    const tableRows = [
      [
        { text: 'Hostel', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Room No', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Floor', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f1f5f9' },
        { text: 'Capacity', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f1f5f9' },
        { text: 'Vacant Beds', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f1f5f9' },
        { text: 'Available Bed Labels', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
      ],
    ];

    if (!data.items || data.items.length === 0) {
      tableRows.push([
        { text: 'No room availability records found.', colSpan: 6, alignment: 'center', fontSize: 8.5, color: '#64748b' },
        {}, {}, {}, {}, {},
      ]);
    } else {
      data.items.forEach((item) => {
        tableRows.push([
          { text: item.hostelName, fontSize: 9, bold: true },
          { text: `Room ${item.roomNumber}`, fontSize: 9, color: '#4338ca', bold: true },
          { text: item.floor, fontSize: 9, alignment: 'center', color: '#64748b' },
          { text: String(item.capacity), fontSize: 9, alignment: 'center' },
          { text: `${item.availableBedsCount} free`, fontSize: 9, alignment: 'center', color: item.availableBedsCount > 0 ? '#15803d' : '#94a3b8', bold: true },
          { text: item.availableBedNumbers, fontSize: 8.5, color: '#334155' },
        ]);
      });
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ['22%', '14%', '10%', '12%', '16%', '26%'],
        body: tableRows,
      },
      margin: [0, 0, 0, 15],
    });

    return { content };
  }

  // 3. ADMISSIONS LOG TEMPLATE
  if (data.reportType === 'admissions') {
    const tableRows = [
      [
        { text: 'Adm Date', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Student Name', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Adm No', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Class', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Hostel', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Room & Bed', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Guardian / Phone', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
      ],
    ];

    if (!data.items || data.items.length === 0) {
      tableRows.push([
        { text: 'No hostel admissions recorded.', colSpan: 7, alignment: 'center', fontSize: 8.5, color: '#64748b' },
        {}, {}, {}, {}, {}, {},
      ]);
    } else {
      data.items.forEach((item) => {
        tableRows.push([
          { text: item.date, fontSize: 8.5, color: '#475569' },
          { text: item.studentName, fontSize: 9, bold: true },
          { text: item.admissionNo, fontSize: 8.5, color: '#475569' },
          { text: item.classSection, fontSize: 8.5 },
          { text: item.hostelName, fontSize: 8.5, bold: true },
          { text: item.roomBed, fontSize: 8.5, color: '#4338ca', bold: true },
          { text: `${item.guardianName} (${item.phone})`, fontSize: 8, color: '#64748b' },
        ]);
      });
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ['12%', '20%', '10%', '13%', '15%', '15%', '15%'],
        body: tableRows,
      },
      margin: [0, 0, 0, 15],
    });

    return { content };
  }

  // 4. TRANSFERS LOG TEMPLATE
  if (data.reportType === 'transfers') {
    const tableRows = [
      [
        { text: 'Transfer Date', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Student Name', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Adm No', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Class', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'From Hostel/Room', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'To Hostel/Room', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Transfer Reason', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
      ],
    ];

    if (!data.items || data.items.length === 0) {
      tableRows.push([
        { text: 'No hostel transfers recorded.', colSpan: 7, alignment: 'center', fontSize: 8.5, color: '#64748b' },
        {}, {}, {}, {}, {}, {},
      ]);
    } else {
      data.items.forEach((item) => {
        tableRows.push([
          { text: item.date, fontSize: 8.5, color: '#475569' },
          { text: item.studentName, fontSize: 9, bold: true },
          { text: item.admissionNo, fontSize: 8.5, color: '#475569' },
          { text: item.classSection, fontSize: 8.5 },
          { text: item.fromDetails, fontSize: 8.5, color: '#64748b' },
          { text: item.toDetails, fontSize: 8.5, color: '#4338ca', bold: true },
          { text: item.reason, fontSize: 8, italic: true, color: '#475569' },
        ]);
      });
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ['12%', '18%', '10%', '12%', '18%', '18%', '12%'],
        body: tableRows,
      },
      margin: [0, 0, 0, 15],
    });

    return { content };
  }

  // 5. EXITS LOG TEMPLATE
  if (data.reportType === 'exits') {
    const tableRows = [
      [
        { text: 'Exit Date', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Student Name', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Adm No', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Class', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Hostel & Room', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Exit Reason', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
      ],
    ];

    if (!data.items || data.items.length === 0) {
      tableRows.push([
        { text: 'No hostel exits recorded.', colSpan: 6, alignment: 'center', fontSize: 8.5, color: '#64748b' },
        {}, {}, {}, {}, {},
      ]);
    } else {
      data.items.forEach((item) => {
        tableRows.push([
          { text: item.date, fontSize: 8.5, color: '#475569' },
          { text: item.studentName, fontSize: 9, bold: true },
          { text: item.admissionNo, fontSize: 8.5, color: '#475569' },
          { text: item.classSection, fontSize: 8.5 },
          { text: item.hostelRoom, fontSize: 8.5, bold: true },
          { text: item.reason, fontSize: 8.5, color: '#64748b' },
        ]);
      });
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ['13%', '22%', '12%', '15%', '20%', '18%'],
        body: tableRows,
      },
      margin: [0, 0, 0, 15],
    });

    return { content };
  }

  // 6. FEES LEDGER TEMPLATE
  if (data.reportType === 'fees') {
    content.push({
      table: {
        widths: ['33%', '33%', '34%'],
        body: [
          [
            {
              fillColor: '#f8fafc',
              borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
              margin: [6, 4, 6, 4],
              stack: [
                { text: 'TOTAL BILLED', fontSize: 8, bold: true, color: '#475569' },
                { text: formatDocCurrency(data.totalBilled || 0), fontSize: 13, bold: true, color: '#0f172a' },
              ],
            },
            {
              fillColor: '#f8fafc',
              borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
              margin: [6, 4, 6, 4],
              stack: [
                { text: 'TOTAL COLLECTED', fontSize: 8, bold: true, color: '#475569' },
                { text: formatDocCurrency(data.totalCollected || 0), fontSize: 13, bold: true, color: '#15803d' },
              ],
            },
            {
              fillColor: '#f8fafc',
              borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
              margin: [6, 4, 6, 4],
              stack: [
                { text: 'OUTSTANDING DUES', fontSize: 8, bold: true, color: '#475569' },
                { text: formatDocCurrency(data.totalDues || 0), fontSize: 13, bold: true, color: (data.totalDues || 0) > 0 ? '#b91c1c' : '#15803d' },
              ],
            },
          ],
        ],
      },
      margin: [0, 0, 0, 10],
    });

    const tableRows = [
      [
        { text: 'Student Name', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Adm No', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Class', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Fee Title', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Month', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
        { text: 'Amount (₹)', fontSize: 9, bold: true, alignment: 'right', fillColor: '#f1f5f9' },
        { text: 'Paid (₹)', fontSize: 9, bold: true, alignment: 'right', fillColor: '#f1f5f9' },
        { text: 'Due (₹)', fontSize: 9, bold: true, alignment: 'right', fillColor: '#f1f5f9' },
        { text: 'Status', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f1f5f9' },
      ],
    ];

    if (!data.items || data.items.length === 0) {
      tableRows.push([
        { text: 'No fee charges found matching criteria.', colSpan: 9, alignment: 'center', fontSize: 8.5, color: '#64748b' },
        {}, {}, {}, {}, {}, {}, {}, {},
      ]);
    } else {
      data.items.forEach((item) => {
        tableRows.push([
          { text: item.studentName, fontSize: 9, bold: true },
          { text: item.admissionNo, fontSize: 8.5, color: '#475569' },
          { text: item.classSection, fontSize: 8.5 },
          { text: item.feeTitle, fontSize: 8.5 },
          { text: item.month, fontSize: 8.5, color: '#64748b' },
          { text: formatDocCurrency(item.amount), fontSize: 9, alignment: 'right', bold: true },
          { text: formatDocCurrency(item.paidAmount), fontSize: 9, alignment: 'right', color: '#15803d' },
          { text: formatDocCurrency(item.dueAmount), fontSize: 9, alignment: 'right', color: item.dueAmount > 0 ? '#b91c1c' : '#475569', bold: item.dueAmount > 0 },
          { text: item.status, fontSize: 8, alignment: 'center', bold: true, color: item.status === 'PAID' ? '#15803d' : item.status === 'PARTIAL' ? '#b45309' : '#b91c1c' },
        ]);
      });
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ['18%', '10%', '11%', '15%', '10%', '10%', '9%', '9%', '8%'],
        body: tableRows,
      },
      margin: [0, 0, 0, 15],
    });

    return { content };
  }

  // 7. CURRENT RESIDENTS (DEFAULT) TEMPLATE
  content.push({
    table: {
      widths: ['100%'],
      body: [
        [
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [6, 4, 6, 4],
            stack: [
              { text: 'TOTAL ACTIVE RESIDENTS', fontSize: 8, bold: true, color: '#475569' },
              { text: String(data.totalResidents || 0), fontSize: 13, bold: true, color: '#4338ca' },
            ],
          },
        ],
      ],
    },
    margin: [0, 0, 0, 10],
  });

  const tableRows = [
    [
      { text: 'Student Name', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
      { text: 'Adm No', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
      { text: 'Class & Section', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
      { text: 'Hostel Name', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
      { text: 'Room & Bed', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
      { text: 'Guardian / Phone', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
      { text: 'Start Date', fontSize: 9, bold: true, fillColor: '#f1f5f9' },
    ],
  ];

  if (!data.items || data.items.length === 0) {
    tableRows.push([
      { text: 'No active hostel residents found.', colSpan: 7, alignment: 'center', fontSize: 8.5, color: '#64748b' },
      {}, {}, {}, {}, {}, {},
    ]);
  } else {
    data.items.forEach((item) => {
      tableRows.push([
        { text: item.studentName, fontSize: 9, bold: true },
        { text: item.admissionNo, fontSize: 8.5, color: '#475569' },
        { text: item.classSection, fontSize: 8.5 },
        { text: item.hostelName, fontSize: 8.5, bold: true },
        { text: item.roomBed, fontSize: 8.5, color: '#4338ca', bold: true },
        { text: `${item.guardianName} (${item.phone})`, fontSize: 8, color: '#64748b' },
        { text: item.startDate, fontSize: 8.5, color: '#475569' },
      ]);
    });
  }

  content.push({
    table: {
      headerRows: 1,
      widths: ['20%', '10%', '14%', '16%', '15%', '15%', '10%'],
      body: tableRows,
    },
    margin: [0, 0, 0, 15],
  });

  return { content };
};

export default {
  buildHostelReportData,
  buildHostelReportTemplate,
};
