/* =====================================================
   FinanceBook Pro — Financial Accounting System
   Pure JavaScript ES6 — Double Entry Accounting
   ===================================================== */

'use strict';

/* =======================================================
   STATE MANAGEMENT
   ======================================================= */
let state = {
  accounts: [],
  transactions: [],
  nextAccountId: 100,
  nextTransactionId: 1,
  nextRefNumber: 1
};

const DEFAULT_ACCOUNTS = [
  // ASSETS
  { id: 1, code: '1001', name: 'Kas', category: 'assets', sub: 'current', desc: 'Uang tunai di tangan' },
  { id: 2, code: '1002', name: 'Bank', category: 'assets', sub: 'current', desc: 'Rekening bank perusahaan' },
  { id: 3, code: '1003', name: 'Piutang Usaha', category: 'assets', sub: 'current', desc: 'Accounts Receivable' },
  { id: 4, code: '1004', name: 'Persediaan', category: 'assets', sub: 'current', desc: 'Inventory / stok barang' },
  { id: 5, code: '1101', name: 'Peralatan', category: 'assets', sub: 'fixed', desc: 'Equipment' },
  { id: 6, code: '1102', name: 'Kendaraan', category: 'assets', sub: 'fixed', desc: 'Kendaraan operasional' },
  { id: 7, code: '1103', name: 'Gedung', category: 'assets', sub: 'fixed', desc: 'Bangunan / gedung kantor' },
  // LIABILITIES
  { id: 8, code: '2001', name: 'Hutang Usaha', category: 'liabilities', sub: 'current', desc: 'Accounts Payable' },
  { id: 9, code: '2002', name: 'Pinjaman Bank', category: 'liabilities', sub: 'longterm', desc: 'Bank Loan' },
  { id: 10, code: '2003', name: 'Hutang Pajak', category: 'liabilities', sub: 'current', desc: 'Tax Payable' },
  // EQUITY
  { id: 11, code: '3001', name: 'Modal Pemilik', category: 'equity', sub: 'capital', desc: "Owner's Capital" },
  { id: 12, code: '3002', name: 'Laba Ditahan', category: 'equity', sub: 'retained', desc: 'Retained Earnings' },
  { id: 13, code: '3003', name: 'Laba Berjalan', category: 'equity', sub: 'current', desc: 'Current Period Profit' },
  // REVENUE
  { id: 14, code: '4001', name: 'Penjualan', category: 'revenue', sub: 'sales', desc: 'Sales Revenue' },
  { id: 15, code: '4002', name: 'Pendapatan Jasa', category: 'revenue', sub: 'service', desc: 'Service Revenue' },
  { id: 16, code: '4003', name: 'Pendapatan Lain-lain', category: 'revenue', sub: 'other', desc: 'Other Income' },
  // EXPENSES
  { id: 17, code: '5001', name: 'Beban Gaji', category: 'expenses', sub: 'operational', desc: 'Salary Expense' },
  { id: 18, code: '5002', name: 'Beban Listrik', category: 'expenses', sub: 'operational', desc: 'Electricity Expense' },
  { id: 19, code: '5003', name: 'Beban Air', category: 'expenses', sub: 'operational', desc: 'Water Expense' },
  { id: 20, code: '5004', name: 'Beban Sewa', category: 'expenses', sub: 'operational', desc: 'Rent Expense' },
  { id: 21, code: '5005', name: 'Beban Kantor', category: 'expenses', sub: 'operational', desc: 'Office Expense' },
  { id: 22, code: '5006', name: 'Beban Lain-lain', category: 'expenses', sub: 'other', desc: 'Miscellaneous Expense' }
];

/* =======================================================
   LOCAL STORAGE
   ======================================================= */
function saveState() {
  try { localStorage.setItem('financebook_state', JSON.stringify(state)); } catch(e) {}
}

function loadState() {
  try {
    const saved = localStorage.getItem('financebook_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
      // Ensure all defaults exist
      if (!state.accounts || state.accounts.length === 0) state.accounts = DEFAULT_ACCOUNTS.map(a => ({...a}));
      if (!state.transactions) state.transactions = [];
    } else {
      state.accounts = DEFAULT_ACCOUNTS.map(a => ({...a}));
      state.nextAccountId = 100;
    }
  } catch(e) {
    state.accounts = DEFAULT_ACCOUNTS.map(a => ({...a}));
  }
}

/* =======================================================
   FORMATTING UTILITIES
   ======================================================= */
function formatRp(n) {
  const num = Number(n) || 0;
  return 'Rp ' + Math.abs(num).toLocaleString('id-ID');
}
function formatRpSigned(n) {
  const num = Number(n) || 0;
  if (num < 0) return '<span class="amount-negative">(' + formatRp(n) + ')</span>';
  return formatRp(n);
}
function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function monthLabel(m) {
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  return months[m] || '';
}

/* =======================================================
   ACCOUNTING ENGINE
   ======================================================= */

// Get account by id
function getAccount(id) {
  return state.accounts.find(a => a.id === Number(id));
}

// Compute ledger for a single account
function computeLedger(accountId) {
  const account = getAccount(accountId);
  if (!account) return { debit: 0, credit: 0, balance: 0, entries: [] };

  let debit = 0, credit = 0;
  const entries = [];

  state.transactions.forEach(tx => {
    if (tx.debitAccountId === accountId) {
      debit += tx.amount;
      entries.push({ date: tx.date, ref: tx.ref, desc: tx.description, debit: tx.amount, credit: 0, txId: tx.id });
    }
    if (tx.creditAccountId === accountId) {
      credit += tx.amount;
      entries.push({ date: tx.date, ref: tx.ref, desc: tx.description, debit: 0, credit: tx.amount, txId: tx.id });
    }
  });

  entries.sort((a, b) => a.date.localeCompare(b.date));

  // Running balance based on account type
  // Assets, Expenses: normal debit balance
  // Liabilities, Equity, Revenue: normal credit balance
  const normalDebit = ['assets', 'expenses'].includes(account.category);
  const balance = normalDebit ? debit - credit : credit - debit;

  return { debit, credit, balance, entries };
}

// Compute all account balances
function computeAllBalances() {
  const balances = {};
  state.accounts.forEach(a => {
    balances[a.id] = computeLedger(a.id);
  });
  return balances;
}

// Sum balances by category
function sumByCategory(balances, category) {
  return state.accounts
    .filter(a => a.category === category)
    .reduce((sum, a) => sum + (balances[a.id]?.balance || 0), 0);
}

// Financial totals
function computeFinancials() {
  const balances = computeAllBalances();

  const totalAssets = sumByCategory(balances, 'assets');
  const totalLiabilities = sumByCategory(balances, 'liabilities');
  const totalEquity = sumByCategory(balances, 'equity');
  const totalRevenue = sumByCategory(balances, 'revenue');
  const totalExpenses = sumByCategory(balances, 'expenses');
  const netProfit = totalRevenue - totalExpenses;

  // Cash accounts (Kas + Bank)
  const cashBalance = state.accounts
    .filter(a => a.category === 'assets' && (a.code.startsWith('100')))
    .reduce((sum, a) => sum + (balances[a.id]?.balance || 0), 0);

  return { totalAssets, totalLiabilities, totalEquity, totalRevenue, totalExpenses, netProfit, cashBalance, balances };
}

// Trial balance data
function computeTrialBalance() {
  const balances = computeAllBalances();
  const rows = [];
  let totalDebit = 0, totalCredit = 0;

  state.accounts.forEach(account => {
    const lb = balances[account.id];
    if (lb.debit === 0 && lb.credit === 0) return;
    rows.push({ account, debit: lb.debit, credit: lb.credit });
    totalDebit += lb.debit;
    totalCredit += lb.credit;
  });

  return { rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
}

// Cash flow
function computeCashFlow() {
  const cashAccountIds = new Set(
    state.accounts.filter(a => a.category === 'assets' && a.code.startsWith('100')).map(a => a.id)
  );
  const revenueIds = new Set(state.accounts.filter(a => a.category === 'revenue').map(a => a.id));
  const expenseIds = new Set(state.accounts.filter(a => a.category === 'expenses').map(a => a.id));
  const liabilityIds = new Set(state.accounts.filter(a => a.category === 'liabilities').map(a => a.id));
  const equityIds = new Set(state.accounts.filter(a => a.category === 'equity').map(a => a.id));
  const fixedAssetIds = new Set(state.accounts.filter(a => a.category === 'assets' && a.sub === 'fixed').map(a => a.id));

  let operating = 0, investing = 0, financing = 0;
  let cashIn = 0, cashOut = 0;

  state.transactions.forEach(tx => {
    const dIsCash = cashAccountIds.has(tx.debitAccountId);
    const cIsCash = cashAccountIds.has(tx.creditAccountId);
    const dIsRevenue = revenueIds.has(tx.debitAccountId);
    const cIsRevenue = revenueIds.has(tx.creditAccountId);
    const dIsExpense = expenseIds.has(tx.debitAccountId);
    const cIsExpense = expenseIds.has(tx.creditAccountId);
    const dIsLiability = liabilityIds.has(tx.debitAccountId);
    const cIsLiability = liabilityIds.has(tx.creditAccountId);
    const dIsEquity = equityIds.has(tx.debitAccountId);
    const cIsEquity = equityIds.has(tx.creditAccountId);
    const dIsFixed = fixedAssetIds.has(tx.debitAccountId);
    const cIsFixed = fixedAssetIds.has(tx.creditAccountId);

    if (dIsCash) {
      cashIn += tx.amount;
      if (cIsRevenue || cIsExpense) operating += tx.amount;
      else if (cIsFixed) investing += tx.amount;
      else if (cIsLiability || cIsEquity) financing += tx.amount;
      else operating += tx.amount;
    }
    if (cIsCash) {
      cashOut += tx.amount;
      if (dIsExpense || dIsRevenue) operating -= tx.amount;
      else if (dIsFixed) investing -= tx.amount;
      else if (dIsLiability || dIsEquity) financing -= tx.amount;
      else operating -= tx.amount;
    }
  });

  const fin = computeFinancials();
  const endingCash = fin.cashBalance;

  return { cashIn, cashOut, operating, investing, financing, endingCash };
}

/* =======================================================
   NAVIGATION
   ======================================================= */
const PAGE_TITLES = {
  dashboard: 'Dashboard',
  coa: 'Chart of Accounts',
  journal: 'Jurnal Umum',
  history: 'Riwayat Transaksi',
  ledger: 'Buku Besar',
  trial: 'Trial Balance',
  pl: 'Laba Rugi',
  balance: 'Neraca',
  cashflow: 'Cash Flow',
  analysis: 'Analisis Keuangan'
};

let currentPage = 'dashboard';

function navigateTo(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector('.nav-item[data-page="' + page + '"]');
  if (navEl) navEl.classList.add('active');

  // Update title
  document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || page;
  document.getElementById('breadcrumb').textContent = 'FinanceBook Pro / ' + (PAGE_TITLES[page] || page);

  currentPage = page;

  // Close sidebar on mobile
  if (window.innerWidth <= 900) closeSidebar();

  // Render page content
  renderPage(page);

  window.scrollTo(0, 0);
}

function renderPage(page) {
  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'coa': renderCOA(); break;
    case 'journal': renderJournal(); break;
    case 'history': renderHistory(); break;
    case 'ledger': renderLedger(); break;
    case 'trial': renderTrialBalance(); break;
    case 'pl': renderPL(); break;
    case 'balance': renderBalanceSheet(); break;
    case 'cashflow': renderCashFlow(); break;
    case 'analysis': renderAnalysis(); break;
  }
}

/* =======================================================
   DASHBOARD
   ======================================================= */
let incomeChart = null, cashflowChart = null;

function renderDashboard() {
  const fin = computeFinancials();

  // KPI Cards
  document.getElementById('kpiAssets').textContent = formatRp(fin.totalAssets);
  document.getElementById('kpiLiabilities').textContent = formatRp(fin.totalLiabilities);
  document.getElementById('kpiEquity').textContent = formatRp(fin.totalEquity);
  document.getElementById('kpiCash').textContent = formatRp(fin.cashBalance);
  document.getElementById('kpiRevenue').textContent = formatRp(fin.totalRevenue);
  document.getElementById('kpiExpenses').textContent = formatRp(fin.totalExpenses);
  document.getElementById('kpiNetProfit').textContent = formatRp(fin.netProfit);
  document.getElementById('kpiTransactions').textContent = state.transactions.length;

  // Net profit color
  const npEl = document.getElementById('kpiNetProfit');
  npEl.classList.toggle('text-success', fin.netProfit >= 0);
  npEl.classList.toggle('text-danger', fin.netProfit < 0);

  // Accounting Equation Banner
  // In-period: Assets = Liabilities + Equity + NetProfit (before closing entries)
  const eq = fin.totalAssets;
  const le = fin.totalLiabilities + fin.totalEquity + fin.netProfit;
  const diff = Math.abs(eq - le);
  const banner = document.getElementById('equationBanner');
  const eqText = document.getElementById('equationText');

  if (diff < 1 || state.transactions.length === 0) {
    banner.classList.remove('danger');
    banner.innerHTML = `<div class="eq-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div class="eq-text"><strong>Persamaan Akuntansi Seimbang</strong><span>Aset (${formatRp(eq)}) = Kewajiban + Ekuitas (${formatRp(le)})</span></div>`;
  } else {
    banner.classList.add('danger');
    banner.innerHTML = `<div class="eq-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
      <div class="eq-text"><strong>Persamaan Akuntansi TIDAK Seimbang!</strong><span>Aset (${formatRp(eq)}) ≠ Kewajiban + Ekuitas (${formatRp(le)}) — Selisih: ${formatRp(diff)}</span></div>`;
  }

  // Recent Transactions
  const tbody = document.getElementById('recentTransBody');
  const recent = [...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  tbody.innerHTML = recent.length ? recent.map(tx => {
    const da = getAccount(tx.debitAccountId);
    const ca = getAccount(tx.creditAccountId);
    return `<tr>
      <td>${formatDate(tx.date)}</td>
      <td>${tx.description}</td>
      <td class="text-right amount amount-debit">${formatRp(tx.amount)}</td>
      <td class="text-right amount amount-credit">${formatRp(tx.amount)}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="4" class="text-center" style="padding:24px;color:var(--text-muted)">Belum ada transaksi</td></tr>`;

  // Financial Summary
  const profitMargin = fin.totalRevenue > 0 ? (fin.netProfit / fin.totalRevenue * 100) : 0;
  const debtRatio = fin.totalAssets > 0 ? (fin.totalLiabilities / fin.totalAssets * 100) : 0;
  const equityRatio = fin.totalAssets > 0 ? (fin.totalEquity / fin.totalAssets * 100) : 0;

  document.getElementById('financialSummary').innerHTML = `
    <div class="fs-item">
      <span class="fs-label">Profit Margin</span>
      <span class="fs-value ${profitMargin >= 0 ? 'text-success' : 'text-danger'}">${profitMargin.toFixed(1)}%</span>
    </div>
    <div class="fs-item">
      <span class="fs-label">Rasio Hutang (D/A)</span>
      <span class="fs-value ${debtRatio < 50 ? 'text-success' : 'text-danger'}">${debtRatio.toFixed(1)}%</span>
    </div>
    <div class="fs-item">
      <span class="fs-label">Rasio Ekuitas</span>
      <span class="fs-value text-primary">${equityRatio.toFixed(1)}%</span>
    </div>
    <div class="fs-item">
      <span class="fs-label">Pendapatan Bersih</span>
      <span class="fs-value ${fin.netProfit >= 0 ? 'text-success' : 'text-danger'}">${formatRp(fin.netProfit)}</span>
    </div>
    <div class="fs-item">
      <span class="fs-label">Arus Kas</span>
      <span class="fs-value ${fin.cashBalance >= 0 ? 'text-success' : 'text-danger'}">${formatRp(fin.cashBalance)}</span>
    </div>
    <div style="margin-top:16px">
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:6px">Distribusi Aset</div>
      <div class="fs-bar">
        <div class="fs-bar-fill" style="width:${Math.min(equityRatio,100)}%;background:var(--primary)"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-muted);margin-top:4px">
        <span>Ekuitas ${equityRatio.toFixed(0)}%</span><span>Hutang ${debtRatio.toFixed(0)}%</span>
      </div>
    </div>
  `;

  renderCharts(fin);
}

function renderCharts(fin) {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: monthLabel(d.getMonth()) + " '" + String(d.getFullYear()).slice(2) });
  }

  const revenueByMonth = months.map(m => {
    return state.accounts
      .filter(a => a.category === 'revenue')
      .reduce((sum, acc) => {
        return sum + state.transactions
          .filter(tx => tx.creditAccountId === acc.id && new Date(tx.date).getFullYear() === m.year && new Date(tx.date).getMonth() === m.month)
          .reduce((s, tx) => s + tx.amount, 0);
      }, 0);
  });

  const expenseByMonth = months.map(m => {
    return state.accounts
      .filter(a => a.category === 'expenses')
      .reduce((sum, acc) => {
        return sum + state.transactions
          .filter(tx => tx.debitAccountId === acc.id && new Date(tx.date).getFullYear() === m.year && new Date(tx.date).getMonth() === m.month)
          .reduce((s, tx) => s + tx.amount, 0);
      }, 0);
  });

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const chartDefaults = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: textColor, font: { size: 12, family: "'Segoe UI', sans-serif" }, boxWidth: 12 } } },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, callback: v => 'Rp ' + (v/1e6).toFixed(0) + 'jt' } }
    }
  };

  // Income vs Expense Chart
  const ctx1 = document.getElementById('incomeExpenseChart').getContext('2d');
  if (incomeChart) incomeChart.destroy();
  incomeChart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        { label: 'Pendapatan', data: revenueByMonth, backgroundColor: 'rgba(37,99,235,0.75)', borderRadius: 4 },
        { label: 'Beban', data: expenseByMonth, backgroundColor: 'rgba(220,38,38,0.65)', borderRadius: 4 }
      ]
    },
    options: { ...chartDefaults, interaction: { mode: 'index', intersect: false } }
  });

  // Cash Flow Chart
  const cashByMonth = months.map(m => {
    const cashAccIds = new Set(state.accounts.filter(a => a.category === 'assets' && a.code.startsWith('100')).map(a => a.id));
    let net = 0;
    state.transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d.getFullYear() !== m.year || d.getMonth() !== m.month) return;
      if (cashAccIds.has(tx.debitAccountId)) net += tx.amount;
      if (cashAccIds.has(tx.creditAccountId)) net -= tx.amount;
    });
    return net;
  });

  const ctx2 = document.getElementById('cashFlowChart').getContext('2d');
  if (cashflowChart) cashflowChart.destroy();
  cashflowChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: [{
        label: 'Net Cash Flow',
        data: cashByMonth,
        borderColor: 'rgba(5,150,105,0.9)',
        backgroundColor: 'rgba(5,150,105,0.12)',
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(5,150,105,0.9)',
        pointRadius: 4
      }]
    },
    options: { ...chartDefaults }
  });
}

/* =======================================================
   CHART OF ACCOUNTS
   ======================================================= */
const COA_CATEGORIES = {
  assets: { label: 'Aset', badge: 'badge-blue', icon: '🏦' },
  liabilities: { label: 'Kewajiban', badge: 'badge-red', icon: '💳' },
  equity: { label: 'Ekuitas', badge: 'badge-green', icon: '📊' },
  revenue: { label: 'Pendapatan', badge: 'badge-teal', icon: '💹' },
  expenses: { label: 'Beban', badge: 'badge-orange', icon: '💸' }
};

const SUB_CATEGORIES = {
  assets: ['current', 'fixed', 'other'],
  liabilities: ['current', 'longterm'],
  equity: ['capital', 'retained', 'current'],
  revenue: ['sales', 'service', 'other'],
  expenses: ['operational', 'other']
};

const SUB_LABELS = {
  current: 'Lancar', fixed: 'Tetap', other: 'Lainnya', longterm: 'Jangka Panjang',
  capital: 'Modal', retained: 'Laba Ditahan', sales: 'Penjualan', service: 'Jasa',
  operational: 'Operasional'
};

function renderCOA() {
  const q = (document.getElementById('coaSearch')?.value || '').toLowerCase();
  const filter = document.getElementById('coaFilter')?.value || '';
  const balances = computeAllBalances();

  const container = document.getElementById('coaGroups');
  const cats = filter ? [filter] : Object.keys(COA_CATEGORIES);

  container.innerHTML = cats.map(cat => {
    const catInfo = COA_CATEGORIES[cat];
    let accounts = state.accounts.filter(a => a.category === cat);
    if (q) accounts = accounts.filter(a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q));
    if (!accounts.length) return '';

    const catTotal = accounts.reduce((s, a) => s + (balances[a.id]?.balance || 0), 0);

    return `<div class="coa-group">
      <div class="coa-group-header" onclick="toggleGroup('coa-${cat}')">
        <div class="coa-group-title">
          <span class="badge ${catInfo.badge}">${catInfo.label}</span>
          <span>${catInfo.icon}</span>
          <span class="coa-group-count">${accounts.length} akun</span>
        </div>
        <div style="display:flex;align-items:center;gap:16px">
          <span style="font-size:0.85rem;font-weight:700">${formatRp(catTotal)}</span>
          <div class="coa-toggle" id="coa-toggle-${cat}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
      </div>
      <div class="coa-group-body" id="coa-${cat}">
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>Kode</th><th>Nama Akun</th><th>Sub-Kategori</th><th>Keterangan</th>
              <th class="text-right">Debit</th><th class="text-right">Kredit</th>
              <th class="text-right">Saldo</th><th>Aksi</th>
            </tr></thead>
            <tbody>
              ${accounts.sort((a,b)=>a.code.localeCompare(b.code)).map(a => {
                const lb = balances[a.id];
                const isDefault = DEFAULT_ACCOUNTS.find(d => d.id === a.id);
                return `<tr>
                  <td><code style="font-family:monospace;font-size:0.8rem;color:var(--text-secondary)">${a.code}</code></td>
                  <td style="font-weight:600">${a.name}</td>
                  <td><span class="badge ${catInfo.badge}" style="font-size:0.65rem">${SUB_LABELS[a.sub] || a.sub || '-'}</span></td>
                  <td style="color:var(--text-muted);font-size:0.82rem">${a.desc || '-'}</td>
                  <td class="text-right amount">${lb.debit > 0 ? formatRp(lb.debit) : '-'}</td>
                  <td class="text-right amount">${lb.credit > 0 ? formatRp(lb.credit) : '-'}</td>
                  <td class="text-right amount" style="font-weight:700">${formatRp(lb.balance)}</td>
                  <td>
                    <div style="display:flex;gap:4px">
                      <button class="action-btn action-edit" onclick="openAccountModal(${a.id})" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button class="action-btn action-delete" onclick="confirmDeleteAccount(${a.id})" title="Hapus">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleGroup(id) {
  const body = document.getElementById(id);
  const cat = id.replace('coa-','');
  const toggle = document.getElementById('coa-toggle-' + cat);
  if (body) {
    body.classList.toggle('collapsed');
    if (toggle) toggle.classList.toggle('open');
  }
}

/* =======================================================
   ACCOUNT MODAL
   ======================================================= */
function openAccountModal(accountId) {
  const modal = document.getElementById('accountModal');
  document.getElementById('accountEditId').value = '';
  document.getElementById('aCode').value = '';
  document.getElementById('aName').value = '';
  document.getElementById('aCategory').value = '';
  document.getElementById('aSubCategory').value = '';
  document.getElementById('aDesc').value = '';

  if (accountId) {
    const acc = getAccount(accountId);
    if (acc) {
      document.getElementById('accountModalTitle').textContent = 'Edit Akun';
      document.getElementById('accountEditId').value = acc.id;
      document.getElementById('aCode').value = acc.code;
      document.getElementById('aName').value = acc.name;
      document.getElementById('aCategory').value = acc.category;
      document.getElementById('aDesc').value = acc.desc || '';
      updateSubCategories();
      document.getElementById('aSubCategory').value = acc.sub || '';
    }
  } else {
    document.getElementById('accountModalTitle').textContent = 'Tambah Akun Baru';
  }
  openModal('accountModal');
}

function updateSubCategories() {
  const cat = document.getElementById('aCategory').value;
  const subSel = document.getElementById('aSubCategory');
  const subs = SUB_CATEGORIES[cat] || [];
  subSel.innerHTML = '<option value="">-- Pilih Sub-Kategori --</option>' +
    subs.map(s => `<option value="${s}">${SUB_LABELS[s] || s}</option>`).join('');
}

document.getElementById('aCategory').addEventListener('change', updateSubCategories);

function saveAccount() {
  const code = document.getElementById('aCode').value.trim();
  const name = document.getElementById('aName').value.trim();
  const category = document.getElementById('aCategory').value;
  const sub = document.getElementById('aSubCategory').value;
  const desc = document.getElementById('aDesc').value.trim();
  const editId = Number(document.getElementById('accountEditId').value);

  if (!code || !name || !category) { showToast('Kode, nama, dan kategori wajib diisi.', 'error'); return; }

  // Check duplicate code
  const existing = state.accounts.find(a => a.code === code && a.id !== editId);
  if (existing) { showToast('Kode akun sudah digunakan!', 'error'); return; }

  if (editId) {
    const acc = state.accounts.find(a => a.id === editId);
    if (acc) { acc.code = code; acc.name = name; acc.category = category; acc.sub = sub; acc.desc = desc; }
    showToast('Akun berhasil diperbarui!', 'success');
  } else {
    state.accounts.push({ id: state.nextAccountId++, code, name, category, sub, desc });
    showToast('Akun berhasil ditambahkan!', 'success');
  }

  saveState(); closeModal('accountModal'); renderCOA();
}

function confirmDeleteAccount(id) {
  const acc = getAccount(id);
  if (!acc) return;

  // Check if account has transactions
  const hasTransactions = state.transactions.some(tx => tx.debitAccountId === id || tx.creditAccountId === id);
  if (hasTransactions) {
    showToast('Akun tidak dapat dihapus karena memiliki transaksi!', 'error');
    return;
  }

  openConfirm(`Hapus akun "${acc.name}"? Tindakan ini tidak dapat dibatalkan.`, () => {
    state.accounts = state.accounts.filter(a => a.id !== id);
    saveState(); renderCOA();
    showToast('Akun berhasil dihapus.', 'success');
  });
}

/* =======================================================
   JOURNAL MODAL
   ======================================================= */
function openJournalModal(txId) {
  const modal = document.getElementById('journalModal');

  // Populate account dropdowns
  populateAccountDropdowns();

  // Reset
  document.getElementById('journalEditId').value = '';
  document.getElementById('jDate').value = today();
  document.getElementById('jRef').value = 'JU-' + String(state.nextRefNumber).padStart(3, '0');
  document.getElementById('jDesc').value = '';
  document.getElementById('jDebitAccount').value = '';
  document.getElementById('jCreditAccount').value = '';
  document.getElementById('jAmount').value = '';
  document.getElementById('jDebitHint').textContent = '';
  document.getElementById('jCreditHint').textContent = '';

  if (txId) {
    const tx = state.transactions.find(t => t.id === txId);
    if (tx) {
      document.getElementById('journalModalTitle').textContent = 'Edit Jurnal';
      document.getElementById('journalEditId').value = tx.id;
      document.getElementById('jDate').value = tx.date;
      document.getElementById('jRef').value = tx.ref || '';
      document.getElementById('jDesc').value = tx.description;
      document.getElementById('jDebitAccount').value = tx.debitAccountId;
      document.getElementById('jCreditAccount').value = tx.creditAccountId;
      document.getElementById('jAmount').value = tx.amount;
      updateAccountHint('debit');
      updateAccountHint('credit');
    }
  } else {
    document.getElementById('journalModalTitle').textContent = 'Entri Jurnal Baru';
  }

  updateBalanceCheck();
  openModal('journalModal');
}

function populateAccountDropdowns() {
  const sorted = [...state.accounts].sort((a,b) => a.code.localeCompare(b.code));
  const opts = '<option value="">-- Pilih Akun --</option>' +
    Object.keys(COA_CATEGORIES).map(cat => {
      const group = sorted.filter(a => a.category === cat);
      if (!group.length) return '';
      return `<optgroup label="${COA_CATEGORIES[cat].label}">${group.map(a => `<option value="${a.id}">${a.code} - ${a.name}</option>`).join('')}</optgroup>`;
    }).join('');
  document.getElementById('jDebitAccount').innerHTML = opts;
  document.getElementById('jCreditAccount').innerHTML = opts;
}

function updateAccountHint(side) {
  const sel = document.getElementById('j' + (side === 'debit' ? 'Debit' : 'Credit') + 'Account');
  const hint = document.getElementById('j' + (side === 'debit' ? 'Debit' : 'Credit') + 'Hint');
  const acc = getAccount(Number(sel.value));
  if (acc) {
    const normalBalance = ['assets', 'expenses'].includes(acc.category) ? 'Normal Debit' : 'Normal Kredit';
    const effect = side === 'debit'
      ? (['assets', 'expenses'].includes(acc.category) ? '↑ Bertambah' : '↓ Berkurang')
      : (['liabilities', 'equity', 'revenue'].includes(acc.category) ? '↑ Bertambah' : '↓ Berkurang');
    hint.innerHTML = `<span style="color:var(--primary)">${acc.category.toUpperCase()}</span> · ${normalBalance} · ${effect}`;
  } else {
    hint.textContent = '';
  }
  updateBalanceCheck();
}

function updateBalanceCheck() {
  const amount = parseFloat(document.getElementById('jAmount').value) || 0;
  document.getElementById('checkDebit').textContent = formatRp(amount);
  document.getElementById('checkCredit').textContent = formatRp(amount);

  const da = Number(document.getElementById('jDebitAccount').value);
  const ca = Number(document.getElementById('jCreditAccount').value);

  let status = '';
  if (da && ca && da === ca) {
    status = '<span class="balance-err">⚠ Akun debit dan kredit tidak boleh sama!</span>';
  } else if (amount > 0) {
    status = '<span class="balance-ok">✓ Debit = Kredit — Jurnal seimbang</span>';
  }
  document.getElementById('balanceStatus').innerHTML = status;
}

function saveJournal() {
  const editId = Number(document.getElementById('journalEditId').value);
  const date = document.getElementById('jDate').value;
  const ref = document.getElementById('jRef').value.trim();
  const desc = document.getElementById('jDesc').value.trim();
  const debitId = Number(document.getElementById('jDebitAccount').value);
  const creditId = Number(document.getElementById('jCreditAccount').value);
  const amount = parseFloat(document.getElementById('jAmount').value);

  // Validation
  if (!date) { showToast('Tanggal wajib diisi!', 'error'); return; }
  if (!desc) { showToast('Deskripsi wajib diisi!', 'error'); return; }
  if (!debitId) { showToast('Pilih akun debit!', 'error'); return; }
  if (!creditId) { showToast('Pilih akun kredit!', 'error'); return; }
  if (debitId === creditId) { showToast('Akun debit dan kredit tidak boleh sama!', 'error'); return; }
  if (!amount || amount <= 0) { showToast('Nominal harus lebih dari 0!', 'error'); return; }

  if (editId) {
    const tx = state.transactions.find(t => t.id === editId);
    if (tx) {
      tx.date = date; tx.ref = ref; tx.description = desc;
      tx.debitAccountId = debitId; tx.creditAccountId = creditId; tx.amount = amount;
    }
    showToast('Jurnal berhasil diperbarui!', 'success');
  } else {
    state.transactions.push({
      id: state.nextTransactionId++, date, ref, description: desc,
      debitAccountId: debitId, creditAccountId: creditId, amount
    });
    state.nextRefNumber++;
    showToast('Jurnal berhasil disimpan!', 'success');
  }

  saveState();
  closeModal('journalModal');
  renderPage(currentPage);
  if (currentPage !== 'journal') renderPage('dashboard');
}

/* =======================================================
   JOURNAL PAGE
   ======================================================= */
function renderJournal() {
  const q = (document.getElementById('journalSearch')?.value || '').toLowerCase();
  const dateFrom = document.getElementById('journalDateFrom')?.value || '';
  const dateTo = document.getElementById('journalDateTo')?.value || '';

  let txs = [...state.transactions].sort((a,b)=>b.date.localeCompare(a.date));
  if (q) txs = txs.filter(tx => tx.description.toLowerCase().includes(q) || (tx.ref||'').toLowerCase().includes(q));
  if (dateFrom) txs = txs.filter(tx => tx.date >= dateFrom);
  if (dateTo) txs = txs.filter(tx => tx.date <= dateTo);

  const tbody = document.getElementById('journalBody');
  const empty = document.getElementById('journalEmpty');

  if (!txs.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = txs.map(tx => {
    const da = getAccount(tx.debitAccountId);
    const ca = getAccount(tx.creditAccountId);
    return `<tr>
      <td>${formatDate(tx.date)}</td>
      <td><code style="font-size:0.8rem;color:var(--text-secondary)">${tx.ref || '-'}</code></td>
      <td>${tx.description}</td>
      <td>${da ? `<span class="badge badge-blue" style="font-size:0.68rem">${da.name}</span>` : '-'}</td>
      <td>${ca ? `<span class="badge badge-green" style="font-size:0.68rem">${ca.name}</span>` : '-'}</td>
      <td class="text-right amount" style="font-weight:700">${formatRp(tx.amount)}</td>
    </tr>`;
  }).join('');
}

/* =======================================================
   HISTORY PAGE
   ======================================================= */
function renderHistory() {
  const q = (document.getElementById('historySearch')?.value || '').toLowerCase();
  const dateFrom = document.getElementById('historyDateFrom')?.value || '';
  const dateTo = document.getElementById('historyDateTo')?.value || '';

  let txs = [...state.transactions].sort((a,b)=>b.date.localeCompare(a.date));
  if (q) txs = txs.filter(tx =>
    tx.description.toLowerCase().includes(q) ||
    (tx.ref||'').toLowerCase().includes(q) ||
    (getAccount(tx.debitAccountId)?.name||'').toLowerCase().includes(q) ||
    (getAccount(tx.creditAccountId)?.name||'').toLowerCase().includes(q)
  );
  if (dateFrom) txs = txs.filter(tx => tx.date >= dateFrom);
  if (dateTo) txs = txs.filter(tx => tx.date <= dateTo);

  const tbody = document.getElementById('historyBody');
  const empty = document.getElementById('historyEmpty');

  if (!txs.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = txs.map(tx => {
    const da = getAccount(tx.debitAccountId);
    const ca = getAccount(tx.creditAccountId);
    return `<tr>
      <td>${formatDate(tx.date)}</td>
      <td><code style="font-size:0.8rem;color:var(--text-secondary)">${tx.ref || '-'}</code></td>
      <td>${tx.description}</td>
      <td>${da ? `<span style="font-size:0.82rem">${da.name}</span>` : '-'}</td>
      <td>${ca ? `<span style="font-size:0.82rem">${ca.name}</span>` : '-'}</td>
      <td class="text-right amount amount-debit">${formatRp(tx.amount)}</td>
      <td class="text-right amount amount-credit">${formatRp(tx.amount)}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="action-btn action-edit" onclick="openJournalModal(${tx.id})" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn action-delete" onclick="confirmDeleteTransaction(${tx.id})" title="Hapus">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function confirmDeleteTransaction(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  openConfirm(`Hapus transaksi "${tx.description}"? Semua laporan akan dihitung ulang.`, () => {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState(); renderHistory();
    showToast('Transaksi berhasil dihapus.', 'success');
  });
}

/* =======================================================
   GENERAL LEDGER
   ======================================================= */
function renderLedger() {
  const q = (document.getElementById('ledgerSearch')?.value || '').toLowerCase();
  const filter = document.getElementById('ledgerFilter')?.value || '';

  let accounts = [...state.accounts];
  if (q) accounts = accounts.filter(a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q));
  if (filter) accounts = accounts.filter(a => a.category === filter);
  accounts.sort((a,b) => a.code.localeCompare(b.code));

  const container = document.getElementById('ledgerContent');
  container.innerHTML = accounts.map(acc => {
    const lb = computeLedger(acc.id);
    if (!lb.entries.length) return '';
    const catInfo = COA_CATEGORIES[acc.category];

    // Compute running balance
    let runBal = 0;
    const normalDebit = ['assets', 'expenses'].includes(acc.category);
    const rows = lb.entries.map(e => {
      if (normalDebit) runBal += e.debit - e.credit;
      else runBal += e.credit - e.debit;
      return { ...e, runBal };
    });

    return `<div class="ledger-account">
      <div class="ledger-account-header" onclick="toggleLedger('ledger-${acc.id}')">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="badge ${catInfo?.badge||'badge-gray'}" style="font-size:0.68rem">${acc.code}</span>
          <span class="ledger-account-name">${acc.name}</span>
          <span style="font-size:0.75rem;color:var(--text-muted)">${catInfo?.label || acc.category}</span>
        </div>
        <div class="ledger-account-meta">
          <div class="ledger-stat">
            <div class="ledger-stat-label">Total Debit</div>
            <div class="ledger-stat-value amount-debit">${formatRp(lb.debit)}</div>
          </div>
          <div class="ledger-stat">
            <div class="ledger-stat-label">Total Kredit</div>
            <div class="ledger-stat-value amount-credit">${formatRp(lb.credit)}</div>
          </div>
          <div class="ledger-stat">
            <div class="ledger-stat-label">Saldo Akhir</div>
            <div class="ledger-stat-value" style="color:${lb.balance >= 0 ? 'var(--primary)' : 'var(--danger)'}">${formatRp(lb.balance)}</div>
          </div>
        </div>
      </div>
      <div class="ledger-body" id="ledger-${acc.id}">
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Tanggal</th><th>Ref</th><th>Deskripsi</th><th class="text-right">Debit</th><th class="text-right">Kredit</th><th class="text-right">Saldo</th></tr></thead>
            <tbody>
              ${rows.map(e => `<tr>
                <td>${formatDate(e.date)}</td>
                <td><code style="font-size:0.78rem;color:var(--text-muted)">${e.ref||'-'}</code></td>
                <td>${e.desc}</td>
                <td class="text-right amount">${e.debit > 0 ? formatRp(e.debit) : '-'}</td>
                <td class="text-right amount">${e.credit > 0 ? formatRp(e.credit) : '-'}</td>
                <td class="text-right amount" style="font-weight:700;color:${e.runBal >= 0 ? 'var(--primary)' : 'var(--danger)'}">${formatRp(e.runBal)}</td>
              </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="font-weight:700">TOTAL</td>
                <td class="text-right amount" style="font-weight:700;color:var(--primary)">${formatRp(lb.debit)}</td>
                <td class="text-right amount" style="font-weight:700;color:var(--success)">${formatRp(lb.credit)}</td>
                <td class="text-right amount" style="font-weight:700">${formatRp(lb.balance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>`;
  }).join('') || '<div class="card" style="padding:48px;text-align:center;color:var(--text-muted)">Tidak ada data buku besar.</div>';
}

function toggleLedger(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('collapsed');
}

/* =======================================================
   TRIAL BALANCE
   ======================================================= */
function renderTrialBalance() {
  const tb = computeTrialBalance();
  const container = document.getElementById('trialContent');

  const warningHTML = !tb.balanced && state.transactions.length > 0
    ? `<div class="equation-banner danger" style="margin-bottom:16px">
        <div class="eq-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
        <div class="eq-text"><strong>Trial Balance TIDAK Seimbang!</strong><span>Total Debit (${formatRp(tb.totalDebit)}) ≠ Total Kredit (${formatRp(tb.totalCredit)}) — Selisih: ${formatRp(Math.abs(tb.totalDebit - tb.totalCredit))}</span></div>
      </div>` : '';

  const groupedRows = {};
  tb.rows.forEach(r => {
    if (!groupedRows[r.account.category]) groupedRows[r.account.category] = [];
    groupedRows[r.account.category].push(r);
  });

  container.innerHTML = warningHTML + `
    <div class="card">
      <div class="table-wrap">
        <table class="table trial-balance-table">
          <thead><tr><th>Kode</th><th>Nama Akun</th><th>Kategori</th><th class="text-right">Debit</th><th class="text-right">Kredit</th></tr></thead>
          <tbody>
            ${Object.keys(COA_CATEGORIES).map(cat => {
              const rows = groupedRows[cat] || [];
              if (!rows.length) return '';
              return `
                <tr style="background:var(--bg-table-head)">
                  <td colspan="5" style="font-weight:700;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-secondary);padding:8px 16px">${COA_CATEGORIES[cat].label}</td>
                </tr>
                ${rows.map(r => `<tr>
                  <td><code style="font-family:monospace;font-size:0.8rem;color:var(--text-secondary)">${r.account.code}</code></td>
                  <td>${r.account.name}</td>
                  <td><span class="badge ${COA_CATEGORIES[cat].badge}" style="font-size:0.65rem">${COA_CATEGORIES[cat].label}</span></td>
                  <td class="text-right amount">${r.debit > 0 ? formatRp(r.debit) : '-'}</td>
                  <td class="text-right amount">${r.credit > 0 ? formatRp(r.credit) : '-'}</td>
                </tr>`).join('')}`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="font-weight:800;font-size:0.95rem">TOTAL</td>
              <td class="text-right" style="font-weight:800;font-size:0.95rem;color:${tb.balanced ? 'var(--success)' : 'var(--danger)'}">${formatRp(tb.totalDebit)}</td>
              <td class="text-right" style="font-weight:800;font-size:0.95rem;color:${tb.balanced ? 'var(--success)' : 'var(--danger)'}">${formatRp(tb.totalCredit)}</td>
            </tr>
            ${tb.balanced ? `<tr><td colspan="5" style="text-align:center;color:var(--success);font-weight:700;padding:12px">✓ Trial Balance Seimbang</td></tr>` : ''}
          </tfoot>
        </table>
      </div>
    </div>`;
}

/* =======================================================
   PROFIT & LOSS
   ======================================================= */
function renderPL() {
  const fin = computeFinancials();
  const balances = fin.balances;

  const revenueAccounts = state.accounts.filter(a => a.category === 'revenue');
  const expenseAccounts = state.accounts.filter(a => a.category === 'expenses');

  const totalRevenue = revenueAccounts.reduce((s,a) => s + (balances[a.id]?.balance||0), 0);
  const totalExpenses = expenseAccounts.reduce((s,a) => s + (balances[a.id]?.balance||0), 0);
  const netProfit = totalRevenue - totalExpenses;

  document.getElementById('plContent').innerHTML = `
    <div class="report-card">
      <div style="padding:20px 24px;border-bottom:1px solid var(--border);text-align:center">
        <div style="font-size:1.1rem;font-weight:800">LAPORAN LABA RUGI</div>
        <div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px">PT Contoh Sejahtera · Periode ${new Date().getFullYear()}</div>
      </div>

      <div class="report-section">
        <div class="report-section-title">
          <span class="badge badge-teal">I</span> PENDAPATAN
        </div>
        ${revenueAccounts.map(a => {
          const bal = balances[a.id]?.balance || 0;
          if (!bal) return '';
          return `<div class="report-row"><span class="report-row-label">${a.name}</span><span class="report-row-value">${formatRp(bal)}</span></div>`;
        }).join('')}
        <div class="report-subtotal"><span>Total Pendapatan</span><span style="color:var(--teal)">${formatRp(totalRevenue)}</span></div>
      </div>

      <div class="report-section">
        <div class="report-section-title">
          <span class="badge badge-orange">II</span> BEBAN
        </div>
        ${expenseAccounts.map(a => {
          const bal = balances[a.id]?.balance || 0;
          if (!bal) return '';
          return `<div class="report-row"><span class="report-row-label">${a.name}</span><span class="report-row-value">${formatRp(bal)}</span></div>`;
        }).join('')}
        <div class="report-subtotal"><span>Total Beban</span><span style="color:var(--orange)">${formatRp(totalExpenses)}</span></div>
      </div>

      <div class="report-total ${netProfit >= 0 ? 'success' : 'danger'}">
        <span style="font-size:1rem">${netProfit >= 0 ? '✓ LABA BERSIH' : '⚠ RUGI BERSIH'}</span>
        <span style="font-size:1.1rem">${formatRp(Math.abs(netProfit))}</span>
      </div>
    </div>`;
}

/* =======================================================
   BALANCE SHEET
   ======================================================= */
function renderBalanceSheet() {
  const fin = computeFinancials();
  const balances = fin.balances;

  const currentAssets = state.accounts.filter(a => a.category === 'assets' && a.sub === 'current');
  const fixedAssets = state.accounts.filter(a => a.category === 'assets' && a.sub === 'fixed');
  const currentLiab = state.accounts.filter(a => a.category === 'liabilities' && a.sub === 'current');
  const ltLiab = state.accounts.filter(a => a.category === 'liabilities' && a.sub === 'longterm');
  const equityAccounts = state.accounts.filter(a => a.category === 'equity');

  const totalCurrentAssets = currentAssets.reduce((s,a) => s + (balances[a.id]?.balance||0), 0);
  const totalFixedAssets = fixedAssets.reduce((s,a) => s + (balances[a.id]?.balance||0), 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const totalCurrentLiab = currentLiab.reduce((s,a) => s + (balances[a.id]?.balance||0), 0);
  const totalLtLiab = ltLiab.reduce((s,a) => s + (balances[a.id]?.balance||0), 0);
  const totalLiabilities = totalCurrentLiab + totalLtLiab;

  // Include net profit in equity
  const netProfit = fin.totalRevenue - fin.totalExpenses;
  const totalEquity = equityAccounts.reduce((s,a) => s + (balances[a.id]?.balance||0), 0) + netProfit;

  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1;

  function accountRows(accounts) {
    return accounts.map(a => {
      const bal = balances[a.id]?.balance || 0;
      if (!bal) return '';
      return `<div class="report-row"><span class="report-row-label">${a.name}</span><span class="report-row-value">${formatRp(bal)}</span></div>`;
    }).join('');
  }

  document.getElementById('balanceContent').innerHTML = `
    ${!isBalanced && state.transactions.length > 0 ? `<div class="equation-banner danger" style="margin-bottom:16px">
      <div class="eq-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
      <div class="eq-text"><strong>Neraca TIDAK Seimbang! Laporan Tidak Valid.</strong><span>Aset (${formatRp(totalAssets)}) ≠ Kewajiban + Ekuitas (${formatRp(totalLiabilities + totalEquity)})</span></div>
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <!-- ASSETS -->
      <div class="report-card">
        <div style="padding:16px 24px;border-bottom:1px solid var(--border);font-weight:800;text-align:center">ASET</div>
        <div class="report-section">
          <div class="report-section-title"><span class="badge badge-blue">1</span> Aset Lancar</div>
          ${accountRows(currentAssets)}
          <div class="report-subtotal"><span>Total Aset Lancar</span><span>${formatRp(totalCurrentAssets)}</span></div>
        </div>
        <div class="report-section">
          <div class="report-section-title"><span class="badge badge-blue">2</span> Aset Tetap</div>
          ${accountRows(fixedAssets)}
          <div class="report-subtotal"><span>Total Aset Tetap</span><span>${formatRp(totalFixedAssets)}</span></div>
        </div>
        <div class="report-total"><span>TOTAL ASET</span><span>${formatRp(totalAssets)}</span></div>
      </div>

      <!-- LIABILITIES + EQUITY -->
      <div>
        <div class="report-card" style="margin-bottom:16px">
          <div style="padding:16px 24px;border-bottom:1px solid var(--border);font-weight:800;text-align:center">KEWAJIBAN</div>
          <div class="report-section">
            <div class="report-section-title"><span class="badge badge-red">1</span> Kewajiban Lancar</div>
            ${accountRows(currentLiab)}
            <div class="report-subtotal"><span>Total Kewajiban Lancar</span><span>${formatRp(totalCurrentLiab)}</span></div>
          </div>
          <div class="report-section">
            <div class="report-section-title"><span class="badge badge-red">2</span> Kewajiban Jangka Panjang</div>
            ${accountRows(ltLiab)}
            <div class="report-subtotal"><span>Total Kewajiban Jangka Panjang</span><span>${formatRp(totalLtLiab)}</span></div>
          </div>
          <div class="report-total"><span>TOTAL KEWAJIBAN</span><span>${formatRp(totalLiabilities)}</span></div>
        </div>

        <div class="report-card">
          <div style="padding:16px 24px;border-bottom:1px solid var(--border);font-weight:800;text-align:center">EKUITAS</div>
          <div class="report-section">
            ${equityAccounts.map(a => {
              const bal = balances[a.id]?.balance || 0;
              if (!bal && a.code !== '3003') return '';
              return `<div class="report-row"><span class="report-row-label">${a.name}</span><span class="report-row-value">${formatRp(bal)}</span></div>`;
            }).join('')}
            <div class="report-row"><span class="report-row-label">Laba Berjalan</span><span class="report-row-value ${netProfit >= 0 ? 'text-success' : 'text-danger'}">${formatRp(netProfit)}</span></div>
          </div>
          <div class="report-total"><span>TOTAL EKUITAS</span><span>${formatRp(totalEquity)}</span></div>
        </div>

        <div style="margin-top:12px;padding:14px 20px;background:${isBalanced ? 'var(--success-light)' : 'var(--danger-light)'};border:1px solid ${isBalanced ? '#6ee7b7' : '#fca5a5'};border-radius:var(--radius);color:${isBalanced ? 'var(--success)' : 'var(--danger)'};font-weight:700;text-align:center;font-size:0.9rem">
          ${isBalanced ? `✓ Neraca Seimbang — Aset = Kewajiban + Ekuitas = ${formatRp(totalAssets)}` : `⚠ Neraca Tidak Seimbang!`}
        </div>
      </div>
    </div>`;
}

/* =======================================================
   CASH FLOW
   ======================================================= */
function renderCashFlow() {
  const cf = computeCashFlow();
  const container = document.getElementById('cashflowContent');

  // Group cash transactions by type
  const cashAccountIds = new Set(state.accounts.filter(a => a.category === 'assets' && a.code.startsWith('100')).map(a => a.id));

  const operatingIn = [], operatingOut = [], investingIn = [], investingOut = [], financingIn = [], financingOut = [];

  state.transactions.forEach(tx => {
    const dIsCash = cashAccountIds.has(tx.debitAccountId);
    const cIsCash = cashAccountIds.has(tx.creditAccountId);
    const da = getAccount(tx.debitAccountId);
    const ca = getAccount(tx.creditAccountId);

    if (dIsCash) {
      const otherAcc = ca;
      const cat = otherAcc?.category || '';
      const entry = { desc: tx.description, amount: tx.amount };
      if (['revenue', 'expenses'].includes(cat)) operatingIn.push(entry);
      else if (cat === 'assets' && otherAcc?.sub === 'fixed') investingIn.push(entry);
      else if (['liabilities', 'equity'].includes(cat)) financingIn.push(entry);
      else operatingIn.push(entry);
    }
    if (cIsCash) {
      const otherAcc = da;
      const cat = otherAcc?.category || '';
      const entry = { desc: tx.description, amount: tx.amount };
      if (['expenses', 'revenue'].includes(cat)) operatingOut.push(entry);
      else if (cat === 'assets' && otherAcc?.sub === 'fixed') investingOut.push(entry);
      else if (['liabilities', 'equity'].includes(cat)) financingOut.push(entry);
      else operatingOut.push(entry);
    }
  });

  function cfSection(title, color, inItems, outItems, total) {
    return `<div class="cf-section">
      <div class="cf-section-header">
        <span>${title}</span>
        <span style="color:${total >= 0 ? 'var(--success)' : 'var(--danger)'}">${total >= 0 ? '+' : '-'}${formatRp(Math.abs(total))}</span>
      </div>
      ${inItems.map(e => `<div class="cf-row"><span class="cf-label">↑ ${e.desc}</span><span style="color:var(--success)">${formatRp(e.amount)}</span></div>`).join('')}
      ${outItems.map(e => `<div class="cf-row"><span class="cf-label">↓ ${e.desc}</span><span style="color:var(--danger)">(${formatRp(e.amount)})</span></div>`).join('')}
      ${(!inItems.length && !outItems.length) ? `<div style="padding:12px 20px;color:var(--text-muted);font-size:0.85rem">Tidak ada aktivitas</div>` : ''}
    </div>`;
  }

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 300px;gap:16px">
      <div>
        ${cfSection('Aktivitas Operasi', 'teal', operatingIn, operatingOut, cf.operating)}
        ${cfSection('Aktivitas Investasi', 'blue', investingIn, investingOut, cf.investing)}
        ${cfSection('Aktivitas Pendanaan', 'purple', financingIn, financingOut, cf.financing)}

        <div class="cf-section">
          <div class="cf-total">
            <span>Kas Masuk Total</span><span style="color:var(--success)">${formatRp(cf.cashIn)}</span>
          </div>
          <div class="cf-total">
            <span>Kas Keluar Total</span><span style="color:var(--danger)">${formatRp(cf.cashOut)}</span>
          </div>
          <div class="cf-total" style="background:var(--primary-50);font-size:1rem">
            <span>Saldo Akhir Kas</span><span style="color:var(--primary)">${formatRp(cf.endingCash)}</span>
          </div>
        </div>
      </div>

      <div>
        <div class="chart-card">
          <div class="chart-header"><div class="chart-title">Arus Kas</div></div>
          <div style="height:220px"><canvas id="cfDonutChart"></canvas></div>
        </div>
        <div class="card" style="margin-top:16px">
          <div class="card-header"><div class="card-title">Ringkasan</div></div>
          <div style="padding:16px 20px">
            <div class="fs-item"><span class="fs-label">Operasi</span><span class="fs-value ${cf.operating>=0?'text-success':'text-danger'}">${formatRp(cf.operating)}</span></div>
            <div class="fs-item"><span class="fs-label">Investasi</span><span class="fs-value ${cf.investing>=0?'text-success':'text-danger'}">${formatRp(cf.investing)}</span></div>
            <div class="fs-item"><span class="fs-label">Pendanaan</span><span class="fs-value ${cf.financing>=0?'text-success':'text-danger'}">${formatRp(cf.financing)}</span></div>
          </div>
        </div>
      </div>
    </div>`;

  // Render donut chart
  requestAnimationFrame(() => {
    const ctx = document.getElementById('cfDonutChart');
    if (!ctx) return;
    new Chart(ctx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Operasi', 'Investasi', 'Pendanaan'],
        datasets: [{
          data: [Math.abs(cf.operating), Math.abs(cf.investing), Math.abs(cf.financing)],
          backgroundColor: ['rgba(13,148,136,0.8)', 'rgba(37,99,235,0.8)', 'rgba(124,58,237,0.8)'],
          borderWidth: 0, hoverOffset: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: document.documentElement.getAttribute('data-theme')==='dark'?'#94a3b8':'#64748b', font: { size: 11 }, boxWidth: 10 } }
        },
        cutout: '65%'
      }
    });
  });
}

/* =======================================================
   FINANCIAL ANALYSIS
   ======================================================= */
function renderAnalysis() {
  const fin = computeFinancials();

  const currentAssets = state.accounts.filter(a => a.category === 'assets' && a.sub === 'current')
    .reduce((s,a) => s + (fin.balances[a.id]?.balance||0), 0);
  const currentLiab = state.accounts.filter(a => a.category === 'liabilities' && a.sub === 'current')
    .reduce((s,a) => s + (fin.balances[a.id]?.balance||0), 0);

  const currentRatio = currentLiab > 0 ? (currentAssets / currentLiab) : 0;
  const debtRatio = fin.totalAssets > 0 ? (fin.totalLiabilities / fin.totalAssets * 100) : 0;
  const equityRatio = fin.totalAssets > 0 ? (fin.totalEquity / fin.totalAssets * 100) : 0;
  const profitMargin = fin.totalRevenue > 0 ? (fin.netProfit / fin.totalRevenue * 100) : 0;
  const roa = fin.totalAssets > 0 ? (fin.netProfit / fin.totalAssets * 100) : 0;
  const roe = fin.totalEquity > 0 ? (fin.netProfit / fin.totalEquity * 100) : 0;

  function ratioCard(title, value, label, desc, colorClass, progress) {
    return `<div class="analysis-card">
      <div class="analysis-card-title">${title}</div>
      <div class="analysis-ratio ${colorClass}">${value}</div>
      <div class="analysis-desc">${desc}</div>
      ${progress !== null ? `<div class="analysis-progress"><div class="progress-bar"><div class="progress-fill ${progress.cls}" style="width:${Math.min(progress.pct,100)}%"></div></div></div>` : ''}
    </div>`;
  }

  document.getElementById('analysisContent').innerHTML = `
    <div class="analysis-grid">
      ${ratioCard('Current Ratio', currentRatio.toFixed(2), '', currentRatio>=2?'Sangat likuid':currentRatio>=1?'Cukup likuid':'Kurang likuid', currentRatio>=2?'ratio-good':currentRatio>=1?'ratio-warn':'ratio-bad', {pct: Math.min(currentRatio/3*100,100), cls: currentRatio>=2?'fill-green':currentRatio>=1?'fill-orange':'fill-red'})}
      ${ratioCard('Debt Ratio', debtRatio.toFixed(1)+'%', '', debtRatio<40?'Risiko rendah':debtRatio<70?'Risiko menengah':'Risiko tinggi', debtRatio<40?'ratio-good':debtRatio<70?'ratio-warn':'ratio-bad', {pct: debtRatio, cls: debtRatio<40?'fill-green':debtRatio<70?'fill-orange':'fill-red'})}
      ${ratioCard('Equity Ratio', equityRatio.toFixed(1)+'%', '', equityRatio>60?'Sangat sehat':equityRatio>30?'Cukup sehat':'Butuh perhatian', equityRatio>60?'ratio-good':equityRatio>30?'ratio-warn':'ratio-bad', {pct: equityRatio, cls: equityRatio>60?'fill-green':equityRatio>30?'fill-orange':'fill-red'})}
      ${ratioCard('Profit Margin', profitMargin.toFixed(1)+'%', '', profitMargin>20?'Margin sangat baik':profitMargin>10?'Margin baik':profitMargin>0?'Margin tipis':'Merugi', profitMargin>20?'ratio-good':profitMargin>10?'ratio-warn':'ratio-bad', {pct: Math.min(profitMargin,100), cls: profitMargin>20?'fill-green':profitMargin>0?'fill-orange':'fill-red'})}
      ${ratioCard('ROA', roa.toFixed(1)+'%', 'Return on Assets', roa>10?'Efisiensi tinggi':roa>5?'Cukup efisien':'Perlu ditingkatkan', roa>10?'ratio-good':roa>5?'ratio-warn':'ratio-bad', {pct: Math.min(roa/20*100,100), cls: roa>10?'fill-green':roa>5?'fill-orange':'fill-red'})}
      ${ratioCard('ROE', roe.toFixed(1)+'%', 'Return on Equity', roe>15?'Excellent':roe>8?'Baik':'Perlu ditingkatkan', roe>15?'ratio-good':roe>8?'ratio-warn':'ratio-bad', {pct: Math.min(roe/30*100,100), cls: roe>15?'fill-green':roe>8?'fill-orange':'fill-red'})}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="chart-card">
        <div class="chart-header"><div class="chart-title">Distribusi Keuangan</div></div>
        <div class="chart-wrap"><canvas id="distributionChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header"><div class="chart-title">Perkembangan Akumulatif</div></div>
        <div class="chart-wrap"><canvas id="growthChart"></canvas></div>
      </div>
    </div>`;

  requestAnimationFrame(() => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tc = isDark ? '#94a3b8' : '#64748b';

    // Distribution Pie
    const ctx1 = document.getElementById('distributionChart');
    if (ctx1) {
      new Chart(ctx1.getContext('2d'), {
        type: 'pie',
        data: {
          labels: ['Aset', 'Kewajiban', 'Ekuitas', 'Pendapatan', 'Beban'],
          datasets: [{
            data: [fin.totalAssets, fin.totalLiabilities, fin.totalEquity, fin.totalRevenue, fin.totalExpenses],
            backgroundColor: ['rgba(37,99,235,0.8)','rgba(220,38,38,0.8)','rgba(5,150,105,0.8)','rgba(13,148,136,0.8)','rgba(234,88,12,0.8)'],
            borderWidth: 0, hoverOffset: 8
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: tc, font: { size: 11 }, boxWidth: 12 } } } }
      });
    }

    // Growth Chart (cumulative)
    const ctx2 = document.getElementById('growthChart');
    if (ctx2) {
      const months = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth(), label: monthLabel(d.getMonth()) });
      }
      const cumAssets = months.map(m => {
        return state.transactions.filter(tx => {
          const d = new Date(tx.date);
          return d.getFullYear() < m.year || (d.getFullYear() === m.year && d.getMonth() <= m.month);
        }).reduce((sum, tx) => {
          const da = getAccount(tx.debitAccountId);
          if (da && da.category === 'assets') return sum + tx.amount;
          return sum;
        }, 0);
      });
      new Chart(ctx2.getContext('2d'), {
        type: 'line',
        data: {
          labels: months.map(m => m.label),
          datasets: [{ label: 'Akumulasi Aset', data: cumAssets, borderColor: 'rgba(37,99,235,0.9)', backgroundColor: 'rgba(37,99,235,0.1)', borderWidth: 2.5, tension: 0.4, fill: true, pointRadius: 4 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: tc, font: { size: 11 }, boxWidth: 12 } } },
          scales: {
            x: { grid: { color: isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.05)' }, ticks: { color: tc, font: { size: 11 } } },
            y: { grid: { color: isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.05)' }, ticks: { color: tc, font: { size: 11 }, callback: v => 'Rp'+(v/1e6).toFixed(0)+'jt' } }
          }
        }
      });
    }
  });
}

/* =======================================================
   EXPORT FUNCTIONS
   ======================================================= */
function exportData(type, format) {
  if (format === 'pdf') exportPDF(type);
  else if (format === 'excel') exportExcel(type);
}

function exportPDF(type) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const titles = { journal: 'Jurnal Umum', ledger: 'Buku Besar', balance: 'Neraca', pl: 'Laporan Laba Rugi', trial: 'Trial Balance', history: 'Riwayat Transaksi', cashflow: 'Cash Flow' };
  const title = titles[type] || type;

  // Header
  doc.setFontSize(16); doc.setFont(undefined, 'bold');
  doc.text('FinanceBook Pro', 14, 20);
  doc.setFontSize(12); doc.setFont(undefined, 'normal');
  doc.text(title, 14, 28);
  doc.setFontSize(10); doc.setTextColor(100);
  doc.text('PT Contoh Sejahtera · ' + new Date().toLocaleDateString('id-ID'), 14, 35);
  doc.setTextColor(0);

  const fin = computeFinancials();
  const balances = fin.balances;

  if (type === 'journal' || type === 'history') {
    const rows = state.transactions.sort((a,b)=>b.date.localeCompare(a.date)).map(tx => [
      formatDate(tx.date), tx.ref||'-', tx.description,
      getAccount(tx.debitAccountId)?.name||'-',
      getAccount(tx.creditAccountId)?.name||'-',
      formatRp(tx.amount)
    ]);
    doc.autoTable({ startY: 42, head: [['Tanggal','Ref','Deskripsi','Akun Debit','Akun Kredit','Nominal']], body: rows, theme: 'striped', headStyles: { fillColor: [37,99,235] } });

  } else if (type === 'trial') {
    const tb = computeTrialBalance();
    const rows = tb.rows.map(r => [r.account.code, r.account.name, COA_CATEGORIES[r.account.category]?.label||'', formatRp(r.debit), formatRp(r.credit)]);
    rows.push(['','','TOTAL', formatRp(tb.totalDebit), formatRp(tb.totalCredit)]);
    doc.autoTable({ startY: 42, head: [['Kode','Nama Akun','Kategori','Debit','Kredit']], body: rows, theme: 'striped', headStyles: { fillColor: [37,99,235] } });

  } else if (type === 'pl') {
    const revenueRows = state.accounts.filter(a=>a.category==='revenue').map(a => [a.name, formatRp(balances[a.id]?.balance||0)]);
    const expenseRows = state.accounts.filter(a=>a.category==='expenses').map(a => [a.name, formatRp(balances[a.id]?.balance||0)]);
    const body = [
      ['PENDAPATAN',''], ...revenueRows, ['Total Pendapatan', formatRp(fin.totalRevenue)],
      ['',''], ['BEBAN',''], ...expenseRows, ['Total Beban', formatRp(fin.totalExpenses)],
      ['',''], ['LABA BERSIH', formatRp(fin.netProfit)]
    ];
    doc.autoTable({ startY: 42, head: [['Keterangan','Jumlah']], body, theme: 'striped', headStyles: { fillColor: [37,99,235] } });

  } else if (type === 'balance') {
    const body = [
      ['ASET',''], ...state.accounts.filter(a=>a.category==='assets').map(a=>[a.name, formatRp(balances[a.id]?.balance||0)]),
      ['Total Aset', formatRp(fin.totalAssets)], ['',''],
      ['KEWAJIBAN',''], ...state.accounts.filter(a=>a.category==='liabilities').map(a=>[a.name, formatRp(balances[a.id]?.balance||0)]),
      ['Total Kewajiban', formatRp(fin.totalLiabilities)], ['',''],
      ['EKUITAS',''], ...state.accounts.filter(a=>a.category==='equity').map(a=>[a.name, formatRp(balances[a.id]?.balance||0)]),
      ['Total Ekuitas', formatRp(fin.totalEquity)]
    ];
    doc.autoTable({ startY: 42, head: [['Keterangan','Jumlah']], body, theme: 'striped', headStyles: { fillColor: [37,99,235] } });
  }

  doc.save('FinanceBook_' + type + '_' + new Date().toISOString().slice(0,10) + '.pdf');
  showToast('PDF berhasil diunduh!', 'success');
}

function exportExcel(type) {
  const wb = XLSX.utils.book_new();
  const fin = computeFinancials();
  const balances = fin.balances;
  let data = [];

  if (type === 'journal' || type === 'history') {
    data = [['Tanggal','Ref','Deskripsi','Akun Debit','Akun Kredit','Nominal'],
      ...state.transactions.sort((a,b)=>b.date.localeCompare(a.date)).map(tx => [
        tx.date, tx.ref||'', tx.description,
        getAccount(tx.debitAccountId)?.name||'',
        getAccount(tx.creditAccountId)?.name||'',
        tx.amount
      ])
    ];
  } else if (type === 'trial') {
    const tb = computeTrialBalance();
    data = [['Kode','Nama Akun','Kategori','Debit','Kredit'],
      ...tb.rows.map(r => [r.account.code, r.account.name, COA_CATEGORIES[r.account.category]?.label||'', r.debit, r.credit]),
      ['','','TOTAL', tb.totalDebit, tb.totalCredit]
    ];
  } else if (type === 'pl') {
    data = [['Keterangan','Jumlah'],
      ['PENDAPATAN',''],
      ...state.accounts.filter(a=>a.category==='revenue').map(a=>[a.name, balances[a.id]?.balance||0]),
      ['Total Pendapatan', fin.totalRevenue], ['',''],
      ['BEBAN',''],
      ...state.accounts.filter(a=>a.category==='expenses').map(a=>[a.name, balances[a.id]?.balance||0]),
      ['Total Beban', fin.totalExpenses], ['',''],
      ['LABA BERSIH', fin.netProfit]
    ];
  } else if (type === 'balance') {
    data = [['Keterangan','Jumlah'],
      ['ASET',''], ...state.accounts.filter(a=>a.category==='assets').map(a=>[a.name, balances[a.id]?.balance||0]), ['Total Aset', fin.totalAssets],
      ['',''],
      ['KEWAJIBAN',''], ...state.accounts.filter(a=>a.category==='liabilities').map(a=>[a.name, balances[a.id]?.balance||0]), ['Total Kewajiban', fin.totalLiabilities],
      ['',''],
      ['EKUITAS',''], ...state.accounts.filter(a=>a.category==='equity').map(a=>[a.name, balances[a.id]?.balance||0]), ['Total Ekuitas', fin.totalEquity]
    ];
  } else if (type === 'ledger') {
    data = [['Kode','Nama Akun','Kategori','Total Debit','Total Kredit','Saldo']];
    state.accounts.forEach(a => {
      const lb = computeLedger(a.id);
      if (lb.debit > 0 || lb.credit > 0) data.push([a.code, a.name, a.category, lb.debit, lb.credit, lb.balance]);
    });
  } else if (type === 'cashflow') {
    const cf = computeCashFlow();
    data = [['Keterangan','Jumlah'],['Aktivitas Operasi', cf.operating],['Aktivitas Investasi', cf.investing],['Aktivitas Pendanaan', cf.financing],['',''],['Kas Masuk', cf.cashIn],['Kas Keluar', cf.cashOut],['Saldo Akhir Kas', cf.endingCash]];
  }

  if (data.length) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, type);
    XLSX.writeFile(wb, 'FinanceBook_' + type + '_' + new Date().toISOString().slice(0,10) + '.xlsx');
    showToast('Excel berhasil diunduh!', 'success');
  }
}

/* =======================================================
   GLOBAL SEARCH
   ======================================================= */
document.getElementById('globalSearch').addEventListener('input', function() {
  const q = this.value.toLowerCase().trim();
  if (!q) return;

  // Search accounts
  const matchAccount = state.accounts.find(a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q));
  if (matchAccount) { navigateTo('coa'); return; }

  // Search transactions
  const matchTx = state.transactions.find(tx =>
    tx.description.toLowerCase().includes(q) || (tx.ref||'').toLowerCase().includes(q)
  );
  if (matchTx) { navigateTo('history'); return; }
});

/* =======================================================
   MODAL HELPERS
   ======================================================= */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

function openConfirm(text, onConfirm) {
  document.getElementById('confirmText').textContent = text;
  const btn = document.getElementById('confirmBtn');
  btn.onclick = () => { onConfirm(); closeModal('confirmModal'); };
  openModal('confirmModal');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('open');
  });
});

// Escape to close modal
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

/* =======================================================
   TOAST NOTIFICATIONS
   ======================================================= */
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = {
    success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
  };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'}`;
  toast.innerHTML = (icons[type] || icons.info) + '<span>' + msg + '</span>';
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-leave');
    setTimeout(() => toast.remove(), 220);
  }, 3500);
}

/* =======================================================
   SIDEBAR TOGGLE
   ======================================================= */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}
document.getElementById('menuToggle').addEventListener('click', () => {
  if (document.getElementById('sidebar').classList.contains('open')) closeSidebar();
  else openSidebar();
});
document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

/* =======================================================
   DARK MODE TOGGLE
   ======================================================= */
document.getElementById('themeToggle').addEventListener('click', function() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('financebook_theme', isDark ? 'light' : 'dark');

  // Rebuild charts on theme change
  if (currentPage === 'dashboard') renderDashboard();
  else if (currentPage === 'cashflow') renderCashFlow();
  else if (currentPage === 'analysis') renderAnalysis();
});

/* =======================================================
   NAVIGATION EVENT LISTENERS
   ======================================================= */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    const page = this.getAttribute('data-page');
    if (page) navigateTo(page);
  });
});

/* =======================================================
   JOURNAL FORM LISTENERS
   ======================================================= */
document.getElementById('jDebitAccount').addEventListener('change', () => updateAccountHint('debit'));
document.getElementById('jCreditAccount').addEventListener('change', () => updateAccountHint('credit'));
document.getElementById('jAmount').addEventListener('input', updateBalanceCheck);

/* =======================================================
   SEED DEMO DATA
   ======================================================= */
function seedDemoData() {
  const kasId = state.accounts.find(a=>a.code==='1001')?.id;
  const bankId = state.accounts.find(a=>a.code==='1002')?.id;
  const modalId = state.accounts.find(a=>a.code==='3001')?.id;
  const piutangId = state.accounts.find(a=>a.code==='1003')?.id;
  const penjualanId = state.accounts.find(a=>a.code==='4001')?.id;
  const jasaId = state.accounts.find(a=>a.code==='4002')?.id;
  const gajiId = state.accounts.find(a=>a.code==='5001')?.id;
  const sewaId = state.accounts.find(a=>a.code==='5004')?.id;
  const listrikId = state.accounts.find(a=>a.code==='5002')?.id;
  const hutangId = state.accounts.find(a=>a.code==='2001')?.id;
  const persediaanId = state.accounts.find(a=>a.code==='1004')?.id;
  const pinjBankId = state.accounts.find(a=>a.code==='2002')?.id;
  const gedungId = state.accounts.find(a=>a.code==='1103')?.id;

  const demos = [
    { date:'2025-01-05', ref:'JU-001', desc:'Modal awal pemilik', debit: bankId, credit: modalId, amount: 150000000 },
    { date:'2025-01-08', ref:'JU-002', desc:'Pembelian persediaan barang', debit: persediaanId, credit: bankId, amount: 25000000 },
    { date:'2025-01-12', ref:'JU-003', desc:'Penerimaan pinjaman bank', debit: bankId, credit: pinjBankId, amount: 50000000 },
    { date:'2025-01-15', ref:'JU-004', desc:'Penjualan produk tunai', debit: kasId, credit: penjualanId, amount: 18500000 },
    { date:'2025-01-20', ref:'JU-005', desc:'Pembayaran gaji karyawan Jan', debit: gajiId, credit: kasId, amount: 12000000 },
    { date:'2025-01-25', ref:'JU-006', desc:'Pendapatan jasa konsultasi', debit: kasId, credit: jasaId, amount: 8500000 },
    { date:'2025-01-28', ref:'JU-007', desc:'Pembayaran sewa kantor Jan', debit: sewaId, credit: kasId, amount: 5000000 },
    { date:'2025-02-03', ref:'JU-008', desc:'Penjualan kredit ke pelanggan', debit: piutangId, credit: penjualanId, amount: 22000000 },
    { date:'2025-02-10', ref:'JU-009', desc:'Penerimaan piutang dari pelanggan', debit: kasId, credit: piutangId, amount: 22000000 },
    { date:'2025-02-14', ref:'JU-010', desc:'Pembayaran gaji Feb', debit: gajiId, credit: kasId, amount: 12000000 },
    { date:'2025-02-18', ref:'JU-011', desc:'Tagihan listrik kantor', debit: listrikId, credit: kasId, amount: 1800000 },
    { date:'2025-02-22', ref:'JU-012', desc:'Penjualan produk tunai', debit: kasId, credit: penjualanId, amount: 15000000 },
    { date:'2025-03-05', ref:'JU-013', desc:'Pendapatan jasa konsultasi', debit: bankId, credit: jasaId, amount: 12000000 },
    { date:'2025-03-10', ref:'JU-014', desc:'Pembayaran sewa kantor Mar', debit: sewaId, credit: kasId, amount: 5000000 },
    { date:'2025-03-15', ref:'JU-015', desc:'Pembayaran gaji Mar', debit: gajiId, credit: bankId, amount: 12000000 },
    { date:'2025-03-20', ref:'JU-016', desc:'Pembelian gedung kantor', debit: gedungId, credit: bankId, amount: 80000000 },
    { date:'2025-04-05', ref:'JU-017', desc:'Penjualan produk tunai', debit: kasId, credit: penjualanId, amount: 20000000 },
    { date:'2025-04-12', ref:'JU-018', desc:'Pembayaran hutang usaha', debit: hutangId, credit: bankId, amount: 8000000 },
    { date:'2025-04-18', ref:'JU-019', desc:'Beban listrik bulan April', debit: listrikId, credit: kasId, amount: 2100000 },
    { date:'2025-04-25', ref:'JU-020', desc:'Pendapatan jasa desain', debit: bankId, credit: jasaId, amount: 9500000 }
  ];

  demos.forEach((d, i) => {
    if (d.debit && d.credit) {
      state.transactions.push({ id: state.nextTransactionId++, date: d.date, ref: d.ref, description: d.desc, debitAccountId: d.debit, creditAccountId: d.credit, amount: d.amount });
    }
  });
  state.nextRefNumber = demos.length + 1;
}

/* =======================================================
   INITIALIZATION
   ======================================================= */
function init() {
  // Load saved state
  loadState();

  // Load theme
  const savedTheme = localStorage.getItem('financebook_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Set current year
  document.getElementById('currentYear').textContent = new Date().getFullYear();

  // Seed demo data if empty
  if (state.transactions.length === 0) {
    seedDemoData();
    saveState();
  }

  // Render default page
  navigateTo('dashboard');
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
