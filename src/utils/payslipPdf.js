import { jsPDF } from 'jspdf';

const COMPANY_NAME = 'WISECART MERCHANTS CORP.';
const COMPANY_ADDRESS = 'Unit D, 8/F, Tower One Plaza Magellan, The Mactan Newtown, Mactan, Lapu-Lapu City, Cebu, Philippines';
const LOGO_URL = '/WISECART%20Logo%20(2).png';
const DISCLAIMER = 'This payslip is generated for payroll record purposes. Please review the details above and report any discrepancy to the Finance Officer.';
const RED = [192, 0, 0];
const BLACK = [17, 17, 17];
const GRAY = [68, 68, 68];
const MIN_ROWS = 8;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

const toDate = (d) => new Date(`${String(d).slice(0, 10)}T00:00:00`);

const fmtRange = (start, end) => {
    if (!start || !end) return '';
    const s = toDate(start);
    const e = toDate(end);
    if (isNaN(s) || isNaN(e)) return '';
    const sameMonth = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth();
    if (sameMonth) return `${MONTHS[s.getMonth()]} ${s.getDate()} to ${e.getDate()}, ${e.getFullYear()}`;
    return `${MONTHS[s.getMonth()]} ${s.getDate()}, ${s.getFullYear()} to ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
};

const amt = (n) => {
    const v = Number(n || 0);
    if (!v) return '-';
    const s = Math.abs(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v < 0 ? `(${s})` : s;
};

const peso = (n) => {
    const v = Number(n || 0);
    const s = Math.abs(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v < 0 ? `-${s}` : s;
};

const classify = (type = '') => {
    const t = type.toLowerCase();
    if (t === 'cash advance' || t === 'loan - cash advance') return 'cashAdvance';
    if (t.includes('hmo')) return 'hmo';
    if (t.includes(' - ')) {
        const hdmf = t.includes('hdmf') || t.includes('pag-ibig') || t.includes('pagibig');
        if (t.includes('sss')) return 'sssLoan';
        if (hdmf && t.includes('mp2')) return 'mp2';
        if (hdmf) return 'pagibigLoan';
        return null;
    }
    const isHdmf = t.includes('hdmf') || t.includes('pag-ibig') || t.includes('pagibig');
    if (isHdmf) return 'pagibig';
    if (t.includes('sss')) return 'sss';
    if (t.includes('philhealth') || t.includes('phic')) return 'phic';
    if (t.includes('withholding')) return 'tax';
    return null;
};

// Same row logic as the on-screen payslip
const buildRows = (slip) => {
    const has = (e, needle) => (e.payTypeName || '').toLowerCase().includes(needle);
    const sum = (list) => list.reduce((s, x) => s + Number(x.amount || 0), 0);
    const earn = slip.earnings || [];
    const ded = slip.deductions || [];

    const negByName = (needle) => {
        const total = sum(ded.filter(d => (d.deductionType || '').toLowerCase().includes(needle)));
        return total > 0 ? -total : total;
    };
    const isAllowance = (e) => e.category === 'ALLOWANCE' || has(e, 'allowance');
    const thirteen = earn.find(e => has(e, '13th'));

    const earnings = [
        { label: 'BASIC SALARY', amount: slip.basicPay },
        { label: 'ALLOWANCE', amount: sum(earn.filter(isAllowance)) },
        { label: '13TH MONTH PAY', amount: thirteen ? thirteen.amount : 0 },
        { label: 'OVERTIME', amount: sum(earn.filter(e => has(e, 'overtime'))) },
        { label: 'UNDERTIME', amount: negByName('undertime') },
        { label: 'LATES', amount: negByName('lates') },
        { label: 'ABSENCES', amount: negByName('absence') },
        { label: 'REIMBURSEMENT', amount: sum(earn.filter(e => has(e, 'reimburse'))) },
        ...earn
            .filter(e => !(has(e, '13th') || has(e, 'overtime') || has(e, 'reimburse') || isAllowance(e)))
            .map(e => ({ label: (e.payTypeName || '').toUpperCase(), amount: e.amount })),
    ];

    const buckets = {};
    const loanLines = { sssLoan: [], pagibigLoan: [], mp2: [] };
    const extras = [];
    ded.forEach(d => {
        const t = (d.deductionType || '').toLowerCase();
        if (t.includes('undertime') || t.includes('lates') || t.includes('absence')) return;
        const k = classify(d.deductionType);
        if (k && loanLines[k]) loanLines[k].push({ label: d.deductionType, amount: Number(d.amount || 0) });
        else if (k) buckets[k] = (buckets[k] || 0) + Number(d.amount || 0);
        else extras.push({ label: (d.deductionType || '').replace(/^Loan - /i, ''), amount: Number(d.amount || 0) });
    });
    const slot = (key, fallback) => (loanLines[key].length ? loanLines[key] : [{ label: fallback, amount: 0 }]);
    const deductions = [
        { label: 'SSS Premium', amount: buckets.sss || 0 },
        { label: 'PHIC Premium', amount: buckets.phic || 0 },
        { label: 'HDMF Premium', amount: buckets.pagibig || 0 },
        { label: 'HMO Premium', amount: buckets.hmo || 0 },
        ...slot('sssLoan', 'SSS Loan'),
        ...slot('pagibigLoan', 'HDMF Loan'),
        ...slot('mp2', 'HDMF MP2'),
        { label: 'Cash Advance', amount: buckets.cashAdvance || 0 },
        ...(extras.length ? extras : [{ label: 'Other Deductions', amount: 0 }]),
        { label: 'Withholding Tax', amount: buckets.tax || 0 },
    ];

    const advances = [
        { label: 'Cash Advance', text: amt(slip.cashAdvanceAmount) },
        { label: 'Payments Made', text: amt(slip.cashAdvancePaid) },
        { label: 'Balance', text: amt(slip.cashAdvanceBalance) },
        { header: 'LEAVE BALANCE' },
        { label: 'Vacation Leave', text: slip.vacationLeaveBalance != null ? String(slip.vacationLeaveBalance) : '0' },
        { label: 'Sick Leave', text: slip.sickLeaveBalance != null ? String(slip.sickLeaveBalance) : '0' },
    ];
    return { earnings, deductions, advances };
};

// Load the logo once, as a data URL
export const loadLogo = async () => {
    try {
        const blob = await (await fetch(LOGO_URL)).blob();
        const dataUrl = await new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result);
            fr.onerror = rej;
            fr.readAsDataURL(blob);
        });
        const dims = await new Promise((res, rej) => {
            const im = new Image();
            im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
            im.onerror = rej;
            im.src = dataUrl;
        });
        return { dataUrl, format: blob.type.includes('jpeg') ? 'JPEG' : 'PNG', ...dims };
    } catch {
        return null;
    }
};

// Shrinks the font until the text fits the width
const fit = (doc, text, maxW, size, min = 6.5) => {
    let s = size;
    doc.setFontSize(s);
    while (doc.getTextWidth(text) > maxW && s > min) {
        s -= 0.25;
        doc.setFontSize(s);
    }
};

// Returns a jsPDF document (Letter, landscape)
export const buildPayslipPdf = (slip, logo) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
    const PW = doc.internal.pageSize.getWidth();   // 792
    const PH = doc.internal.pageSize.getHeight();  // 612
    const M = 30;
    const X0 = M;
    const W = PW - 2 * M;
    const X1 = X0 + W;
    const Y0 = M;

    const { earnings, deductions, advances } = buildRows(slip);
    const rowCount = Math.max(earnings.length, deductions.length, advances.length, MIN_ROWS);

    // geometry
    const HEAD_H = 138;
    const TH1 = 24;
    const TH2 = 20;
    const TOTAL_H = 30;
    const FOOT_H = 40;
    const avail = PH - M - Y0 - HEAD_H - TH1 - TH2 - TOTAL_H - FOOT_H;
    const rowH = Math.min(22, avail / rowCount);
    const bodyFont = Math.min(10.5, rowH * 0.5);

    const tableTop = Y0 + HEAD_H;
    const bodyTop = tableTop + TH1 + TH2;
    const bodyBottom = bodyTop + rowH * rowCount;
    const tableBottom = bodyBottom + TOTAL_H;
    const sheetBottom = tableBottom + FOOT_H;

    const groupW = W / 3;
    const descW = groupW * 0.69;
    const gx = [X0, X0 + groupW, X0 + 2 * groupW];

    const setText = (c) => doc.setTextColor(c[0], c[1], c[2]);
    const line = (x1, y1, x2, y2, w = 0.6) => { doc.setLineWidth(w); doc.line(x1, y1, x2, y2); };

    doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
    setText(BLACK);

    // outer border
    doc.setLineWidth(1.2);
    doc.rect(X0, Y0, W, sheetBottom - Y0);

    // ---------- header ----------
    let textX = X0 + 18;
    if (logo) {
        const lh = 46;
        const lw = (logo.w / logo.h) * lh;
        doc.addImage(logo.dataUrl, logo.format, X0 + 16, Y0 + 18, lw, lh);
        textX = X0 + 16 + lw + 10;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text(COMPANY_NAME, textX, Y0 + 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(COMPANY_ADDRESS, 300), textX, Y0 + 50);

    // right block
    const rx = gx[2] + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    doc.text('PAYSLIP', rx, Y0 + 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const period = fmtRange(slip.periodStart, slip.periodEnd);
    const meta = [`CUT-OFF PERIOD ${period}`];
    if (slip.employeeNumber) meta.push(`ID NO.: ${slip.employeeNumber}`);
    if (slip.department) meta.push(`DEPARTMENT: ${String(slip.department).toUpperCase()}`);
    const metaTop = tableTop - 12 - (meta.length - 1) * 14;
    meta.forEach((m, i) => doc.text(m, rx, metaTop + i * 14));

    // employee block
    const designation = String(slip.designation || slip.department || '').toUpperCase();
    doc.text(`NAME OF EMPLOYEE: ${slip.employeeName || ''}`, X0 + 18, tableTop - 26);
    doc.text(`POSITION: ${designation}`, X0 + 18, tableTop - 12);

    // ---------- table ----------
    line(X0, tableTop, X1, tableTop, 0.8);

    // group titles
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    ['EARNINGS', 'DEDUCTION', 'OUTSTANDING ADVANCES'].forEach((t, i) => {
        doc.text(t, gx[i] + groupW / 2, tableTop + TH1 / 2 + 4, { align: 'center' });
    });
    line(X0, tableTop + TH1, X1, tableTop + TH1, 0.6);

    // sub headers
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    gx.forEach((x) => {
        doc.text('Description', x + descW / 2, tableTop + TH1 + TH2 / 2 + 3.3, { align: 'center' });
        doc.text('Amount', x + descW + (groupW - descW) / 2, tableTop + TH1 + TH2 / 2 + 3.3, { align: 'center' });
    });
    line(X0, bodyTop, X1, bodyTop, 0.8);

    // body rows
    const cell = (colIndex, item, list, i, y) => {
        const x = gx[colIndex];
        const base = y + rowH / 2 + bodyFont * 0.35;
        if (!item) {
            if (i === list.length) {
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(bodyFont - 0.5);
                setText(GRAY);
                doc.text('*** NOTHING FOLLOWS ***', x + descW / 2, base, { align: 'center' });
                setText(BLACK);
                doc.setFont('helvetica', 'normal');
            }
            return;
        }
        if (item.header) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(bodyFont);
            doc.text(item.header, x + groupW / 2, base, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            return;
        }
        doc.setFont('helvetica', 'normal');
        fit(doc, item.label, descW - 10, bodyFont);
        doc.text(item.label, x + 6, base);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(bodyFont);
        const val = item.text !== undefined ? item.text : amt(item.amount);
        doc.text(val, x + groupW - 6, base, { align: 'right' });
        doc.setFont('helvetica', 'normal');
    };

    for (let i = 0; i < rowCount; i++) {
        const y = bodyTop + i * rowH;
        cell(0, earnings[i], earnings, i, y);
        cell(1, deductions[i], deductions, i, y);
        cell(2, advances[i], advances, i, y);
    }

    // total row
    line(X0, bodyBottom, X1, bodyBottom, 0.8);
    const ty = bodyBottom + TOTAL_H / 2 + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text('Total Compensation', gx[0] + 6, ty);
    doc.text('Deduction', gx[1] + 6, ty);
    doc.text('Net Pay', gx[2] + 6, ty);
    setText(RED);
    doc.text(peso(slip.grossPay), gx[0] + groupW - 6, ty, { align: 'right' });
    doc.text(peso(slip.netPay), gx[2] + groupW - 6, ty, { align: 'right' });
    setText(BLACK);
    doc.text(peso(slip.totalDeductions), gx[1] + groupW - 6, ty, { align: 'right' });

    // vertical dividers
    line(gx[1], tableTop, gx[1], tableBottom, 0.6);
    line(gx[2], tableTop, gx[2], tableBottom, 0.6);
    line(X0, tableBottom, X1, tableBottom, 0.8);

    // ---------- footer ----------
    const bx = X0 + 12;
    const bw = W - 24;
    const by = tableBottom + 10;
    doc.setLineWidth(0.6);
    doc.rect(bx, by, bw, 22);
    doc.setFont('helvetica', 'normal');
    fit(doc, DISCLAIMER, bw - 12, 9);
    doc.text(DISCLAIMER, bx + bw / 2, by + 14, { align: 'center' });

    return doc;
};