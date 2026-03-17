import React, { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'mkt_dashboard_data';

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

const emptyRow = (): RowData => ({
  fb: 0, google: 0, tiktok: 0, totalAds: 0,
  register: 0, memberDeposit: 0, depositPct: 0,
  firstDeposit: 0, dailyDeposit: 0, monthlyDeposit: 0,
  avgPerUser: 0, costPerRegister: 0, costPerDeposit: 0,
});

const initData = (): MktData => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
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

const MktDashboard: React.FC = () => {
  const [data, setData] = useState<MktData>(initData);
  const [activeTab, setActiveTab] = useState<TabKey>('TG');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [withdrawData, setWithdrawData] = useState<WithdrawData | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('http://76.13.190.65/work/api/withdraw', { signal: ctrl.signal })
      .then(r => r.json())
      .then(json => {
        if (json.ok && json.data) setWithdrawData({ date: json.date, data: json.data });
      })
      .catch(() => { /* hide on error */ });
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const handleChange = useCallback((staff: string, key: string, value: string) => {
    const num = parseFloat(value) || 0;
    setData(prev => {
      const updated = { ...prev };
      const tabData = { ...updated[activeTab] };
      const row = { ...tabData[staff], [key]: num };
      tabData[staff] = recalc(row);
      updated[activeTab] = tabData;
      return updated;
    });
  }, [activeTab]);

  const totals = STAFF.reduce((acc, staff) => {
    const row = data[activeTab][staff];
    if (!row) return acc;
    COLUMNS.forEach(col => {
      if (col.key === 'depositPct' || col.key === 'avgPerUser' || col.key === 'costPerRegister' || col.key === 'costPerDeposit') return;
      (acc as any)[col.key] = ((acc as any)[col.key] || 0) + (row as any)[col.key];
    });
    return acc;
  }, emptyRow());

  const totalRecalced = recalc(totals);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">MKT Dashboard</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ติดตามผลการตลาดรายวัน</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
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
              {STAFF.map((staff, idx) => {
                const row = data[activeTab][staff] || emptyRow();
                return (
                  <tr key={staff} className={`border-b border-slate-50 transition-colors hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-slate-50/30' : ''}`}>
                    <td className="px-4 py-3 font-black text-slate-800 sticky left-0 bg-inherit z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-500/20">
                          {staff[0]}
                        </div>
                        {staff}
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
    </div>
  );
};

export default MktDashboard;
