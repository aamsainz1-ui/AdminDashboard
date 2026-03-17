import React, { useState, useEffect, useCallback, useRef } from 'react';

const SUPABASE_URL = 'https://kmloseczqatswwczqajs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbG9zZWN6cWF0c3d3Y3pxYWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjQyMzAsImV4cCI6MjA3NzM0MDIzMH0.tc3oZrRBDhbQXfwerLPjTbsNMDwSP0gHhhmd96bPd9I';

const SUPA_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates',
};

const STAFF = ['เก่ง', 'แบงค์', 'ลัน', 'เม่า'];
const TABS = ['TG', 'Huay', 'อื่นๆ'] as const;
type TabKey = typeof TABS[number];

const COLUMNS = [
  { key: 'fb', label: 'FB', editable: true },
  { key: 'google', label: 'Google', editable: true },
  { key: 'tiktok', label: 'TikTok', editable: true },
  { key: 'totalAds', label: 'รวม ADS', editable: false },
  { key: 'register', label: 'สมัคร', editable: true },
  { key: 'memberDeposit', label: 'สมาชิกฝาก', editable: true },
  { key: 'depositPct', label: '%ฝาก', editable: false },
  { key: 'firstDeposit', label: 'ฝากแรก', editable: true },
  { key: 'dailyDeposit', label: 'ฝากทั้งวัน', editable: true },
  { key: 'monthlyDeposit', label: 'ฝากทั้งเดือน', editable: true },
  { key: 'avgPerUser', label: 'เฉลี่ย/ยูส', editable: false },
  { key: 'costPerRegister', label: 'ค่าหัว/สมัคร', editable: false },
  { key: 'costPerDeposit', label: 'ค่าหัว/ฝาก', editable: false },
];

interface RowData {
  fb: number;
  google: number;
  tiktok: number;
  totalAds: number;
  register: number;
  memberDeposit: number;
  depositPct: number;
  firstDeposit: number;
  dailyDeposit: number;
  monthlyDeposit: number;
  avgPerUser: number;
  costPerRegister: number;
  costPerDeposit: number;
}

type MktData = Record<TabKey, Record<string, RowData>>;

interface MonthlySummaryRow {
  name: string;
  fb: number;
  google: number;
  tiktok: number;
  totalAds: number;
  register: number;
  deposit_member: number;
  first_deposit: number;
  daily_deposit: number;
  month_deposit: number;
  depositPct: number;
}

const emptyRow = (): RowData => ({
  fb: 0, google: 0, tiktok: 0, totalAds: 0,
  register: 0, memberDeposit: 0, depositPct: 0,
  firstDeposit: 0, dailyDeposit: 0, monthlyDeposit: 0,
  avgPerUser: 0, costPerRegister: 0, costPerDeposit: 0,
});

const initData = (): MktData => {
  const data: any = {};
  TABS.forEach(tab => {
    data[tab] = {};
    STAFF.forEach(s => { data[tab][s] = emptyRow(); });
  });
  return data as MktData;
};

const recalc = (row: RowData): RowData => {
  const totalAds = row.fb + row.google + row.tiktok;
  const depositPct = row.register > 0 ? Math.round((row.memberDeposit / row.register) * 10000) / 100 : 0;
  const avgPerUser = row.memberDeposit > 0 ? Math.round(row.dailyDeposit / row.memberDeposit) : 0;
  const costPerRegister = row.register > 0 ? Math.round(totalAds / row.register) : 0;
  const costPerDeposit = row.memberDeposit > 0 ? Math.round(totalAds / row.memberDeposit) : 0;
  return { ...row, totalAds, depositPct, avgPerUser, costPerRegister, costPerDeposit };
};

// วันที่ format DD/MM/YYYY
const toThaiDate = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

const getMonthPrefix = (isoDate: string): string => {
  // returns "MM/YYYY" for LIKE filter
  const [y, m] = isoDate.split('-');
  return `${m}/${y}`;
};

const fmt = (n: number) => n.toLocaleString('th-TH');
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

interface WithdrawItem {
  name: string;
  withdraw: number;
  transferred: number;
  pending: number;
}

interface WithdrawData {
  date: string;
  data: WithdrawItem[];
}

// ============================================================
// Supabase helpers
// ============================================================

const supaFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { ...SUPA_HEADERS, ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const loadTodayData = async (thaiDate: string): Promise<MktData> => {
  const data = initData();
  try {
    const rows = await supaFetch(
      `/rest/v1/mkt_data?date=eq.${encodeURIComponent(thaiDate)}&select=*`
    );
    if (Array.isArray(rows)) {
      rows.forEach((row: any) => {
        const tab = row.tab as TabKey;
        if (!TABS.includes(tab)) return;
        const r: RowData = {
          fb: Number(row.fb) || 0,
          google: Number(row.google) || 0,
          tiktok: Number(row.tiktok) || 0,
          totalAds: 0,
          register: Number(row.register) || 0,
          memberDeposit: Number(row.deposit_member) || 0,
          depositPct: 0,
          firstDeposit: Number(row.first_deposit) || 0,
          dailyDeposit: Number(row.daily_deposit) || 0,
          monthlyDeposit: Number(row.month_deposit) || 0,
          avgPerUser: 0,
          costPerRegister: 0,
          costPerDeposit: 0,
        };
        data[tab][row.name] = recalc(r);
      });
    }
  } catch (e) {
    console.error('loadTodayData error:', e);
  }
  return data;
};

const upsertRow = async (thaiDate: string, tab: string, name: string, row: RowData) => {
  await supaFetch('/rest/v1/mkt_data', {
    method: 'POST',
    body: JSON.stringify({
      date: thaiDate,
      tab,
      name,
      fb: row.fb,
      google: row.google,
      tiktok: row.tiktok,
      register: row.register,
      deposit_member: row.memberDeposit,
      first_deposit: row.firstDeposit,
      daily_deposit: row.dailyDeposit,
      month_deposit: row.monthlyDeposit,
      updated_at: new Date().toISOString(),
    }),
    headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
  });
};

const loadMonthlySummary = async (monthPrefix: string): Promise<MonthlySummaryRow[]> => {
  // date format: DD/MM/YYYY — month prefix is MM/YYYY, use LIKE %MM/YYYY
  const rows = await supaFetch(
    `/rest/v1/mkt_data?date=like.*${encodeURIComponent(monthPrefix)}&select=name,fb,google,tiktok,register,deposit_member,first_deposit,daily_deposit,month_deposit`
  );
  if (!Array.isArray(rows)) return [];

  const map: Record<string, MonthlySummaryRow> = {};
  rows.forEach((row: any) => {
    const n = row.name;
    if (!map[n]) {
      map[n] = {
        name: n,
        fb: 0, google: 0, tiktok: 0, totalAds: 0,
        register: 0, deposit_member: 0, first_deposit: 0,
        daily_deposit: 0, month_deposit: 0, depositPct: 0,
      };
    }
    map[n].fb += Number(row.fb) || 0;
    map[n].google += Number(row.google) || 0;
    map[n].tiktok += Number(row.tiktok) || 0;
    map[n].register += Number(row.register) || 0;
    map[n].deposit_member += Number(row.deposit_member) || 0;
    map[n].first_deposit += Number(row.first_deposit) || 0;
    map[n].daily_deposit += Number(row.daily_deposit) || 0;
    // month_deposit — take max per day to avoid double-counting
    // but for simplicity we sum (user can adjust logic)
    map[n].month_deposit += Number(row.month_deposit) || 0;
  });

  return Object.values(map).map(r => ({
    ...r,
    totalAds: r.fb + r.google + r.tiktok,
    depositPct: r.register > 0 ? Math.round((r.deposit_member / r.register) * 10000) / 100 : 0,
  }));
};

// ============================================================

const MktDashboard: React.FC = () => {
  const [data, setData] = useState<MktData>(initData);
  const [activeTab, setActiveTab] = useState<TabKey>('TG');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [withdrawData, setWithdrawData] = useState<WithdrawData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryRow[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load today's data from Supabase on mount / date change
  useEffect(() => {
    const thaiDate = toThaiDate(selectedDate);
    setLoading(true);
    loadTodayData(thaiDate).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [selectedDate]);

  // Load monthly summary
  useEffect(() => {
    const monthPrefix = getMonthPrefix(selectedDate);
    setLoadingMonthly(true);
    loadMonthlySummary(monthPrefix).then(rows => {
      setMonthlySummary(rows);
      setLoadingMonthly(false);
    });
  }, [selectedDate]);

  // Fetch withdraw data from Supabase
  useEffect(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const todayStr = `${dd}/${mm}/${yyyy}`;
    fetch(`${SUPABASE_URL}/rest/v1/withdraw_log?date=eq.${todayStr}&select=name,amount,transferred,pending`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    })
      .then(r => r.json())
      .then((rows: any[]) => {
        if (Array.isArray(rows) && rows.length > 0) {
          setWithdrawData({ date: todayStr, data: rows.map(r => ({ name: r.name, withdraw: r.amount, transferred: r.transferred || 0, pending: r.pending || r.amount })) });
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  const handleChange = useCallback((staff: string, key: string, value: string) => {
    const num = parseFloat(value) || 0;
    setData(prev => {
      const updated = { ...prev };
      const tabData = { ...updated[activeTab] };
      const row = { ...tabData[staff], [key]: num };
      tabData[staff] = recalc(row);
      updated[activeTab] = tabData;

      // Debounced upsert
      const timerKey = `${activeTab}:${staff}`;
      if (saveTimers.current[timerKey]) clearTimeout(saveTimers.current[timerKey]);
      saveTimers.current[timerKey] = setTimeout(async () => {
        setSaving(timerKey);
        try {
          const thaiDate = toThaiDate(selectedDate);
          await upsertRow(thaiDate, activeTab, staff, tabData[staff]);
        } catch (e) {
          console.error('upsert error:', e);
        } finally {
          setSaving(null);
        }
      }, 800);

      return updated;
    });
  }, [activeTab, selectedDate]);

  const displayStaff = staffFilter === 'all' ? STAFF : STAFF.filter(s => s === staffFilter);

  const totals = displayStaff.reduce((acc, staff) => {
    const row = data[activeTab][staff];
    if (!row) return acc;
    COLUMNS.forEach(col => {
      if (col.key === 'depositPct' || col.key === 'avgPerUser' || col.key === 'costPerRegister' || col.key === 'costPerDeposit') return;
      (acc as any)[col.key] = ((acc as any)[col.key] || 0) + (row as any)[col.key];
    });
    return acc;
  }, emptyRow());

  const totalRecalced = recalc(totals);

  const displayMonthlySummary = staffFilter === 'all' ? monthlySummary : monthlySummary.filter(r => r.name === staffFilter);

  // Monthly summary totals
  const monthTotals = displayMonthlySummary.reduce((acc, r) => ({
    fb: acc.fb + r.fb,
    google: acc.google + r.google,
    tiktok: acc.tiktok + r.tiktok,
    totalAds: acc.totalAds + r.totalAds,
    register: acc.register + r.register,
    deposit_member: acc.deposit_member + r.deposit_member,
    first_deposit: acc.first_deposit + r.first_deposit,
    daily_deposit: acc.daily_deposit + r.daily_deposit,
    month_deposit: acc.month_deposit + r.month_deposit,
    depositPct: 0,
    name: 'รวม',
  }), { name: 'รวม', fb: 0, google: 0, tiktok: 0, totalAds: 0, register: 0, deposit_member: 0, first_deposit: 0, daily_deposit: 0, month_deposit: 0, depositPct: 0 });
  monthTotals.depositPct = monthTotals.register > 0 ? Math.round((monthTotals.deposit_member / monthTotals.register) * 10000) / 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">MKT Dashboard</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ติดตามผลการตลาดรายวัน</p>
        </div>
        <div className="flex items-center gap-3">
          {saving && (
            <span className="text-xs font-bold text-emerald-500 animate-pulse">💾 กำลังบันทึก...</span>
          )}
          {loading && (
            <span className="text-xs font-bold text-blue-500 animate-pulse">⏳ กำลังโหลด...</span>
          )}
          <select
            value={staffFilter}
            onChange={e => setStaffFilter(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">👥 ทั้งหมด</option>
            {STAFF.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={staffFilter}
            onChange={e => setStaffFilter(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">👥 ทั้งหมด</option>
            {STAFF.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Withdraw Section */}
      {withdrawData && withdrawData.data.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">💸 ยอดเบิก/โอนวันนี้</h3>
            <span className="text-[10px] font-bold text-slate-400">{withdrawData.date}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {withdrawData.data.map(item => (
              <div key={item.name} className="rounded-2xl border border-slate-100 bg-white/60 backdrop-blur-sm p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-500/20">
                    {item.name[0]}
                  </div>
                  <span className="font-black text-slate-800 text-sm">{item.name}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">เบิก</span>
                    <span className="font-black text-slate-700">{fmt(item.withdraw)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">โอนแล้ว</span>
                    <span className="font-black text-emerald-600">{fmt(item.transferred)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">สถานะ</span>
                    {item.pending <= 0 ? (
                      <span className="font-black text-emerald-600 text-xs">✅ ครบ</span>
                    ) : (
                      <span className="font-black text-amber-500 text-xs">⏳ ค้าง {fmt(item.pending)} บาท</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              activeTab === tab
                ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20 scale-105'
                : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700 border border-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-white/90 backdrop-blur-sm z-10 min-w-[80px]">
                  Staff
                </th>
                {COLUMNS.map(col => (
                  <th key={col.key} className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right min-w-[90px]">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayStaff.map((staff, idx) => {
                const row = data[activeTab][staff] || emptyRow();
                const isSaving = saving === `${activeTab}:${staff}`;
                return (
                  <tr key={staff} className={`border-b border-slate-50 transition-colors hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-slate-50/30' : ''} ${isSaving ? 'opacity-70' : ''}`}>
                    <td className="px-4 py-3 font-black text-slate-800 sticky left-0 bg-inherit z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-500/20">
                          {staff[0]}
                        </div>
                        {staff}
                        {isSaving && <span className="text-[9px] text-emerald-500 font-bold">💾</span>}
                      </div>
                    </td>
                    {COLUMNS.map(col => (
                      <td key={col.key} className="px-3 py-3 text-right">
                        {col.editable ? (
                          <input
                            type="number"
                            value={(row as any)[col.key] || ''}
                            onChange={e => handleChange(staff, col.key, e.target.value)}
                            className="w-full text-right px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all hover:border-slate-300"
                            placeholder="0"
                          />
                        ) : (
                          <span className={`font-black text-sm ${
                            col.key === 'totalAds' ? 'text-amber-600' :
                            col.key === 'depositPct' ? 'text-emerald-600' :
                            col.key === 'avgPerUser' ? 'text-blue-600' :
                            col.key === 'costPerRegister' ? 'text-purple-600' :
                            col.key === 'costPerDeposit' ? 'text-rose-600' :
                            'text-slate-700'
                          }`}>
                            {col.key === 'depositPct' ? fmtPct((row as any)[col.key]) : fmt((row as any)[col.key])}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* Total Row */}
              <tr className="bg-slate-900/5 border-t-2 border-slate-200">
                <td className="px-4 py-4 font-black text-slate-900 sticky left-0 bg-slate-100/80 backdrop-blur-sm z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-black shadow-lg">
                      Σ
                    </div>
                    รวม
                  </div>
                </td>
                {COLUMNS.map(col => (
                  <td key={col.key} className="px-3 py-4 text-right">
                    <span className={`font-black text-sm ${
                      col.key === 'totalAds' ? 'text-amber-700' :
                      col.key === 'depositPct' ? 'text-emerald-700' :
                      'text-slate-900'
                    }`}>
                      {col.key === 'depositPct' ? fmtPct(totalRecalced.depositPct) : fmt((totalRecalced as any)[col.key])}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] border border-slate-100 p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ค่าใช้จ่ายรวม</p>
          <p className="text-2xl font-black text-amber-600">{fmt(totalRecalced.totalAds)}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] border border-slate-100 p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">สมัครทั้งหมด</p>
          <p className="text-2xl font-black text-blue-600">{fmt(totalRecalced.register)}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] border border-slate-100 p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">%ฝากรวม</p>
          <p className="text-2xl font-black text-emerald-600">{fmtPct(totalRecalced.depositPct)}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] border border-slate-100 p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ฝากทั้งวัน</p>
          <p className="text-2xl font-black text-purple-600">{fmt(totalRecalced.dailyDeposit)}</p>
        </div>
      </div>

      {/* ===== Monthly Summary ===== */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">📊 สรุปเดือนนี้</h3>
          {loadingMonthly && <span className="text-xs text-blue-400 font-bold animate-pulse">⏳ กำลังโหลด...</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-white/90 z-10 min-w-[80px]">Staff</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">FB</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Google</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">TikTok</th>
                <th className="px-3 py-3 text-[10px] font-black text-amber-500 uppercase tracking-widest text-right">รวม ADS</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">สมัคร</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">สมาชิกฝาก</th>
                <th className="px-3 py-3 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-right">%ฝาก</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">ฝากแรก</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">ฝากทั้งวัน</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">ฝากทั้งเดือน</th>
              </tr>
            </thead>
            <tbody>
              {displayMonthlySummary.length === 0 && !loadingMonthly ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-slate-400 text-sm font-bold">ไม่มีข้อมูลในเดือนนี้</td>
                </tr>
              ) : (
                <>
                  {displayMonthlySummary.map((r, idx) => (
                    <tr key={r.name} className={`border-b border-slate-50 hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-4 py-3 font-black text-slate-800 sticky left-0 bg-inherit z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-black">
                            {r.name[0]}
                          </div>
                          {r.name}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.fb)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.google)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.tiktok)}</td>
                      <td className="px-3 py-3 text-right font-black text-amber-600">{fmt(r.totalAds)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.register)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.deposit_member)}</td>
                      <td className="px-3 py-3 text-right font-black text-emerald-600">{fmtPct(r.depositPct)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.first_deposit)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.daily_deposit)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.month_deposit)}</td>
                    </tr>
                  ))}
                  {/* Monthly total row */}
                  {displayMonthlySummary.length > 0 && (
                    <tr className="bg-slate-900/5 border-t-2 border-slate-200">
                      <td className="px-4 py-4 font-black text-slate-900 sticky left-0 bg-slate-100/80 z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-black">Σ</div>
                          รวม
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.fb)}</td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.google)}</td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.tiktok)}</td>
                      <td className="px-3 py-4 text-right font-black text-amber-700">{fmt(monthTotals.totalAds)}</td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.register)}</td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.deposit_member)}</td>
                      <td className="px-3 py-4 text-right font-black text-emerald-700">{fmtPct(monthTotals.depositPct)}</td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.first_deposit)}</td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.daily_deposit)}</td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.month_deposit)}</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MktDashboard;
