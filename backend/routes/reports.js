import express from 'express';
import PDFDocument from 'pdfkit';
import Payment from '../models/Payment.js';
import Complaint from '../models/Complaint.js';
import { protect, isOwner } from '../middleware/auth.js';
import { generateDailySummary, generateInsights, generateSmartTodo } from '../services/ai/insightsGenerator.js';
import { predictOccupancy } from '../services/ai/predictionEngine.js';
import { getRevenueOptimizationSuggestions } from '../services/ai/revenueOptimizer.js';
import { getDashboardStats, getMonthFinance, getOccupancy, getTrend, MONTH_NAMES } from '../services/stats.js';
import { ah } from '../utils/http.js';

const router = express.Router();

// Live numbers for the dashboard (fast, no AI)
router.get('/dashboard', protect, isOwner, ah(async (req, res) => {
  res.json({ success: true, data: await getDashboardStats() });
}));

// Daily brief with AI insights + to-do (AI text cached for a few hours; ?refresh=true to regenerate)
router.get('/daily-summary', protect, isOwner, ah(async (req, res) => {
  res.json({ success: true, data: await generateDailySummary(req.query.date, { refresh: req.query.refresh === 'true' }) });
}));

router.get('/insights', protect, isOwner, ah(async (req, res) => {
  res.json({ success: true, data: await generateInsights() });
}));

router.get('/trend', protect, isOwner, ah(async (req, res) => {
  res.json({ success: true, data: await getTrend(Math.min(12, Number(req.query.months) || 6)) });
}));

router.get('/occupancy-prediction', protect, isOwner, ah(async (req, res) => {
  res.json({ success: true, data: await predictOccupancy(req.query.period) });
}));

router.get('/revenue-optimization', protect, isOwner, ah(async (req, res) => {
  res.json({ success: true, data: await getRevenueOptimizationSuggestions() });
}));

router.get('/todo', protect, isOwner, ah(async (req, res) => {
  res.json({ success: true, data: await generateSmartTodo() });
}));

// GET /api/reports/monthly-pdf?month=&year= (Feature #17)
router.get('/monthly-pdf', protect, isOwner, ah(async (req, res) => {
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();

  const [finance, occupancy, payments, complaints, trend] = await Promise.all([
    getMonthFinance(month, year),
    getOccupancy(),
    Payment.find({ month, year }).populate('tenant', 'name').populate('room', 'roomNumber').lean(),
    Complaint.find({ createdAt: { $gte: new Date(year, month - 1, 1), $lt: new Date(year, month, 1) } }).lean(),
    getTrend(6)
  ]);

  const pgName = process.env.PG_NAME || 'SmartPG';
  const rs = (n) => `Rs. ${Math.round(n || 0).toLocaleString('en-IN')}`;
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${pgName.replace(/\s+/g, '-')}-report-${year}-${String(month).padStart(2, '0')}.pdf"`);
  doc.pipe(res);

  const brand = '#c2185b';
  const ink = '#1f2937';
  const muted = '#6b7280';
  const W = doc.page.width - 96;

  // Header band
  doc.rect(0, 0, doc.page.width, 92).fill(brand);
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(pgName, 48, 28);
  doc.fontSize(11).font('Helvetica').text(`Monthly Business Report · ${MONTH_NAMES[month - 1]} ${year}`, 48, 58);
  doc.fillColor(ink).moveDown(3);

  // KPI tiles
  const kpis = [
    ['Rent collected', rs(finance.collected)],
    ['Pending', rs(finance.pending)],
    ['Expenses', rs(finance.expenses)],
    ['Net profit', rs(finance.profit)]
  ];
  const tileW = (W - 24) / 4;
  let y = 116;
  kpis.forEach(([label, value], i) => {
    const x = 48 + i * (tileW + 8);
    doc.roundedRect(x, y, tileW, 58, 6).fill('#fdf2f6');
    doc.fillColor(muted).fontSize(9).font('Helvetica').text(label, x + 10, y + 10, { width: tileW - 20 });
    doc.fillColor(i === 3 && finance.profit < 0 ? '#b91c1c' : ink).fontSize(14).font('Helvetica-Bold').text(value, x + 10, y + 28, { width: tileW - 20 });
  });
  y += 80;

  const section = (title) => {
    doc.fillColor(brand).fontSize(13).font('Helvetica-Bold').text(title, 48, y);
    y = doc.y + 6;
    doc.moveTo(48, y).lineTo(48 + W, y).strokeColor('#f3d1df').lineWidth(1).stroke();
    y += 10;
    doc.fillColor(ink).font('Helvetica').fontSize(10);
  };
  const line = (label, value) => {
    doc.fillColor(muted).text(label, 48, y, { width: W / 2 });
    doc.fillColor(ink).text(value, 48 + W / 2, y, { width: W / 2, align: 'right' });
    y += 16;
  };
  const ensureSpace = (needed) => {
    if (y + needed > doc.page.height - 60) { doc.addPage(); y = 56; }
  };

  section('Overview');
  line('Occupancy (beds)', `${occupancy.occupiedBeds}/${occupancy.totalBeds} (${occupancy.occupancyRate}%)`);
  line('Collection rate', `${finance.collectionRate}%`);
  line('Payments received', `${finance.paidCount}`);
  line('Payments pending / overdue', `${finance.pendingCount} / ${finance.overdueCount}`);
  line('Complaints raised', `${complaints.length} (${complaints.filter(c => ['resolved', 'closed'].includes(c.status)).length} resolved)`);
  y += 8;

  ensureSpace(160);
  section('Expenses by category');
  const cats = Object.entries(finance.expenseByCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = cats[0]?.[1] || 1;
  for (const [cat, amt] of cats) {
    ensureSpace(18);
    doc.fillColor(ink).fontSize(10).text(cat[0].toUpperCase() + cat.slice(1), 48, y, { width: 110 });
    doc.rect(160, y + 2, ((W - 230) * amt) / maxCat, 9).fill(brand);
    doc.fillColor(ink).text(rs(amt), 48 + W - 70, y, { width: 70, align: 'right' });
    y += 17;
  }
  if (!cats.length) line('No expenses recorded', '');
  y += 8;

  ensureSpace(150);
  section('Six-month trend');
  doc.fontSize(9).fillColor(muted);
  ['Month', 'Income', 'Expenses', 'Profit'].forEach((h, i) => doc.text(h, 48 + i * (W / 4), y, { width: W / 4, align: i ? 'right' : 'left' }));
  y += 15;
  doc.fillColor(ink).fontSize(10);
  for (const t of trend) {
    [t.label, rs(t.income), rs(t.expenses), rs(t.profit)].forEach((v, i) => doc.text(v, 48 + i * (W / 4), y, { width: W / 4, align: i ? 'right' : 'left' }));
    y += 15;
  }
  y += 10;

  const unpaid = payments.filter(p => p.status !== 'paid');
  if (unpaid.length) {
    ensureSpace(60);
    section(`Outstanding rent (${unpaid.length})`);
    for (const p of unpaid) {
      ensureSpace(16);
      line(`${p.tenant?.name || 'Tenant'} · Room ${p.room?.roomNumber || '-'}`, `${rs(p.amount)} · ${p.status}`);
    }
  }

  doc.fontSize(8).fillColor(muted).text(`Generated by PG Manager AI on ${new Date().toLocaleString('en-IN')}`, 48, doc.page.height - 40, { width: W, align: 'center' });
  doc.end();
}));

export default router;
