import React, { useEffect, useState } from 'react';
import { syncCashEntries, syncCashFixedCosts, syncCashPaymentMaps, syncCompanyLoans } from '../services/syncService';

interface CashEntry {
  id: string;
  datetime: string;
  category: string;
  categoryColor: 'green' | 'red' | 'amber' | 'blue' | 'gray';
  description: string;
  type: 'IN' | 'OUT';
  amount: string;
  recordedBy: string;
}

interface CategorySummary {
  id: string;
  label: string;
  count: number;
  total: string;
  percent: string;
  trend: 'UP' | 'DOWN' | 'FLAT';
  trendValue?: string;
}

interface FixedCost {
  id: string;
  name: string;
  category: string;
  categoryColor: 'red' | 'blue' | 'amber';
  amount: string;
  dueDate: string;
  status: 'PAID' | 'PENDING' | 'AWAIT_BILL';
}

interface CompanyLoan {
  id: string;
  borrower: string;
  amount: string;
  purpose: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REPAID';
}

interface PaymentMap {
  id: string;
  card: string;
  purpose: string;
  account: string;
  handler: string;
}

const MOCK_ENTRIES: CashEntry[] = [
  { id: '1', datetime: '14 พ.ค. 13:20', category: 'ค่าข้าว', categoryColor: 'amber', description: 'ข้าวกล่องทีมงาน 8 คน', type: 'OUT', amount: '480', recordedBy: 'คุณ' },
  { id: '2', datetime: '14 พ.ค. 11:00', category: 'ค่า จนท', categoryColor: 'blue', description: 'ค่าจ้าง จนท. พิเศษ', type: 'OUT', amount: '1,500', recordedBy: 'HR' },
  { id: '3', datetime: '14 พ.ค. 10:15', category: 'เบ็ดเตล็ด', categoryColor: 'gray', description: 'ซื้อกระดาษ A4 + หมึกพิมพ์', type: 'OUT', amount: '890', recordedBy: 'ออฟฟิศ' },
  { id: '4', datetime: '14 พ.ค. 09:30', category: 'รายรับ', categoryColor: 'green', description: 'ยอดรับ ฝาก-ถอน ช่วงเช้า', type: 'IN', amount: '+128,000', recordedBy: 'ระบบ' },
  { id: '5', datetime: '13 พ.ค. 18:45', category: 'ค่าเช่า', categoryColor: 'red', description: 'ค่าเช่าออฟฟิศ พ.ค.', type: 'OUT', amount: '25,000', recordedBy: 'คุณ' },
];

const MOCK_CATEGORIES: CategorySummary[] = [
  { id: '1', label: '🏠 ค่าเช่าที่อยู่/ออฟฟิศ', count: 2, total: '45,000', percent: '27.8%', trend: 'FLAT' },
  { id: '2', label: '👥 ค่าใช้จ่ายพนักงาน', count: 14, total: '38,200', percent: '23.6%', trend: 'UP', trendValue: '+ 8%' },
  { id: '3', label: '🍱 ค่าข้าว / อาหาร', count: 22, total: '18,400', percent: '11.4%', trend: 'UP', trendValue: '+ 12%' },
  { id: '4', label: '👤 ค่า จนท / Outsource', count: 8, total: '22,500', percent: '13.9%', trend: 'FLAT' },
  { id: '5', label: '⚡ ค่าน้ำ ค่าไฟ อินเทอร์เน็ต', count: 3, total: '8,900', percent: '5.5%', trend: 'DOWN', trendValue: '- 3%' },
  { id: '6', label: '🚗 ค่าเดินทาง', count: 11, total: '6,200', percent: '3.8%', trend: 'FLAT' },
  { id: '7', label: '📦 อุปกรณ์ / เบ็ดเตล็ด', count: 9, total: '14,800', percent: '9.1%', trend: 'UP', trendValue: '+ 5%' },
  { id: '8', label: '📌 อื่นๆ', count: 5, total: '8,000', percent: '4.9%', trend: 'FLAT' },
];

const MOCK_FIXED: FixedCost[] = [
  { id: '1', name: 'ค่าเช่าออฟฟิศ', category: 'ค่าเช่า', categoryColor: 'red', amount: '25,000', dueDate: '1 ทุกเดือน', status: 'PAID' },
  { id: '2', name: 'ค่าเช่าที่พักพนักงาน', category: 'ค่าเช่า', categoryColor: 'red', amount: '20,000', dueDate: '5 ทุกเดือน', status: 'PAID' },
  { id: '3', name: 'ค่าอินเทอร์เน็ต Fiber', category: 'ค่าน้ำ-ไฟ-เน็ต', categoryColor: 'blue', amount: '1,200', dueDate: '10 ทุกเดือน', status: 'PENDING' },
  { id: '4', name: 'ค่าไฟ', category: 'ค่าน้ำ-ไฟ-เน็ต', categoryColor: 'blue', amount: '~6,500', dueDate: '15 ทุกเดือน', status: 'AWAIT_BILL' },
  { id: '5', name: 'ค่าข้าวกลาง (เหมา)', category: 'ค่าข้าว', categoryColor: 'amber', amount: '12,000', dueDate: 'เหมาเดือน', status: 'PAID' },
];

const pillColor = (color: string) => {
  const map: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    gray: 'bg-slate-100 text-slate-600',
  };
  return map[color] || map.gray;
};

const fixedStatusLabel = (status: FixedCost['status']) => {
  const map = { PAID: { label: 'จ่ายแล้ว', color: 'green' as const }, PENDING: { label: 'รอตัด', color: 'amber' as const }, AWAIT_BILL: { label: 'รอบิล', color: 'amber' as const } };
  return map[status];
};

const trendBadge = (cat: CategorySummary) => {
  if (cat.trend === 'UP') return <span className={`text-[10px] font-black px-3 py-1 rounded-full ${pillColor('amber')}`}>{cat.trendValue || '+'}</span>;
  if (cat.trend === 'DOWN') return <span className={`text-[10px] font-black px-3 py-1 rounded-full ${pillColor('green')}`}>{cat.trendValue || '-'}</span>;
  return <span className={`text-[10px] font-black px-3 py-1 rounded-full ${pillColor('gray')}`}>คงที่</span>;
};

const MOCK_LOANS: CompanyLoan[] = [
  { id: 'l1', borrower: 'คุณเก่ง (Marketing)', amount: '15,000', purpose: 'ซื้ออุปกรณ์ถ่ายรูป', date: '12 พ.ค. 2569', status: 'APPROVED' },
  { id: 'l2', borrower: 'คุณลัน', amount: '8,000', purpose: 'สำรองส่วนตัวปีใหม่', date: '5 พ.ค. 2569', status: 'REPAID' },
  { id: 'l3', borrower: 'คุณแบงค์', amount: '25,000', purpose: 'ยืมส่วนตัวชั่วคราว', date: '14 พ.ค. 2569', status: 'PENDING' },
];

const MOCK_PAYMENT_MAP: PaymentMap[] = [
  { id: 'pm1', card: 'บัตรเครดิต SCB Platinum', purpose: 'ค่าโฆษณา / Ads', account: 'บัญชี A', handler: 'มาร์เก็ต' },
  { id: 'pm2', card: 'บัตรเครดิต KBank Visa', purpose: 'ค่าระบบ / Software', account: 'บัญชี B', handler: 'IT' },
  { id: 'pm3', card: 'Wallet TrueMoney', purpose: 'ค่าข้าว—เบ็ดเตล็ด', account: '-', handler: 'ออฟฟิศ' },
];

const loanStatusBadge = (status: CompanyLoan['status']) => {
  const map = {
    PENDING: { label: 'รออนุมัติ', color: 'amber' as const },
    APPROVED: { label: 'อนุมัติแล้ว', color: 'blue' as const },
    REPAID: { label: 'จ่ายคืนแล้ว', color: 'green' as const },
  };
  return map[status];
};

const Cashbook: React.FC = () => {
  const [entries, setEntries] = useState(MOCK_ENTRIES);
  const [categories] = useState(MOCK_CATEGORIES);
  const [fixed, setFixed] = useState(MOCK_FIXED);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({ date: '', cat: 'ค่าเช่า', desc: '', type: 'จ่าย', amount: '', by: '' });
  const [showAddFixed, setShowAddFixed] = useState(false);
  const [newFixed, setNewFixed] = useState({ name: '', cat: '', amount: '', day: '', status: 'รอตัด' });
  const [loans, setLoans] = useState<CompanyLoan[]>(MOCK_LOANS);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [newLoan, setNewLoan] = useState<{ borrower: string; amount: string; purpose: string; date: string; status: CompanyLoan['status'] }>({ borrower: '', amount: '', purpose: '', date: '', status: 'PENDING' });
  const [paymentMaps, setPaymentMaps] = useState<PaymentMap[]>(MOCK_PAYMENT_MAP);
  const [showAddPM, setShowAddPM] = useState(false);
  const [newPM, setNewPM] = useState({ card: '', purpose: '', account: '', handler: '' });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [nextEntries, nextFixed, nextLoans, nextPayments] = await Promise.all([
        syncCashEntries(MOCK_ENTRIES),
        syncCashFixedCosts(MOCK_FIXED),
        syncCompanyLoans(MOCK_LOANS),
        syncCashPaymentMaps(MOCK_PAYMENT_MAP),
      ]);
      if (!alive) return;
      setEntries(nextEntries);
      setFixed(nextFixed);
      setLoans(nextLoans);
      setPaymentMaps(nextPayments);
    })();
    return () => { alive = false; };
  }, []);

  const handleAddLoan = async () => {
    if (!newLoan.borrower.trim() || !newLoan.amount.trim()) return;
    const nextItem: CompanyLoan = { id: crypto.randomUUID(), borrower: newLoan.borrower, amount: newLoan.amount, purpose: newLoan.purpose, date: newLoan.date || new Date().toLocaleDateString('th-TH'), status: newLoan.status };
    const nextLocal = [...loans, nextItem];
    setLoans(nextLocal);
    setLoans(await syncCompanyLoans(nextLocal));
    setNewLoan({ borrower: '', amount: '', purpose: '', date: '', status: 'PENDING' });
    setShowAddLoan(false);
  };

  const handleAddPM = async () => {
    if (!newPM.card.trim()) return;
    const nextItem: PaymentMap = { id: crypto.randomUUID(), card: newPM.card, purpose: newPM.purpose, account: newPM.account, handler: newPM.handler };
    const nextLocal = [...paymentMaps, nextItem];
    setPaymentMaps(nextLocal);
    setPaymentMaps(await syncCashPaymentMaps(nextLocal));
    setNewPM({ card: '', purpose: '', account: '', handler: '' });
    setShowAddPM(false);
  };

  const handleAddEntry = async () => {
    if (!newEntry.desc.trim() || !newEntry.amount.trim()) return;
    const now = new Date();
    const nextItem: CashEntry = { id: crypto.randomUUID(), datetime: newEntry.date || `${now.getDate()} พ.ค. ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`, category: newEntry.cat, categoryColor: newEntry.type === 'รับ' ? 'green' : 'red', description: newEntry.desc, type: newEntry.type === 'รับ' ? 'IN' : 'OUT', amount: newEntry.type === 'รับ' ? `+${newEntry.amount}` : newEntry.amount, recordedBy: newEntry.by || 'คุณ' };
    const nextLocal = [nextItem, ...entries];
    setEntries(nextLocal);
    setEntries(await syncCashEntries(nextLocal));
    setNewEntry({ date: '', cat: 'ค่าเช่า', desc: '', type: 'จ่าย', amount: '', by: '' });
    setShowAddEntry(false);
  };

  const handleAddFixed = async () => {
    if (!newFixed.name.trim()) return;
    const nextItem: FixedCost = { id: crypto.randomUUID(), name: newFixed.name, category: newFixed.cat || 'เบ็ดเตล็ด', categoryColor: 'amber', amount: newFixed.amount || '-', dueDate: newFixed.day || '-', status: 'PENDING' };
    const nextLocal = [...fixed, nextItem];
    setFixed(nextLocal);
    setFixed(await syncCashFixedCosts(nextLocal));
    setNewFixed({ name: '', cat: '', amount: '', day: '', status: 'รอตัด' });
    setShowAddFixed(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">📒 รายรับรายจ่าย</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">บันทึกประจำวัน · ค่าใช้จ่ายคงที่ · สรุปตามหมวด</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">รายรับเดือนนี้</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">285k</p>
          <p className="text-xs font-bold text-slate-400 mt-1">+ 18% MoM</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">รายจ่ายเดือนนี้</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">162k</p>
          <p className="text-xs font-bold text-slate-400 mt-1">- 5% MoM</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">คงเหลือ</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">123k</p>
          <p className="text-xs font-bold text-slate-400 mt-1">บาท สุทธิ</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">รายการวันนี้</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">6</p>
          <p className="text-xs font-bold text-slate-400 mt-1">3 จ่าย · 3 รับ</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-base font-black text-slate-900">📝 รายการล่าสุด</h3>
          <button onClick={() => setShowAddEntry(v => !v)} className="text-xs font-black text-blue-600 hover:text-blue-700">+ บันทึกรายการ</button>
        </div>
        {showAddEntry && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 items-end">
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]" placeholder="รายละเอียดรายการ" value={newEntry.desc} onChange={e => setNewEntry(p => ({...p, desc: e.target.value}))} />
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28" placeholder="หมวด" value={newEntry.cat} onChange={e => setNewEntry(p => ({...p, cat: e.target.value}))} />
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newEntry.type} onChange={e => setNewEntry(p => ({...p, type: e.target.value}))}>
              <option>จ่าย</option><option>รับ</option>
            </select>
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28" placeholder="จำนวน" value={newEntry.amount} onChange={e => setNewEntry(p => ({...p, amount: e.target.value}))} />
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28" placeholder="ผู้บันทึก" value={newEntry.by} onChange={e => setNewEntry(p => ({...p, by: e.target.value}))} />
            <button onClick={handleAddEntry} className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-lg hover:bg-blue-700">✓ บันทึก</button>
            <button onClick={() => setShowAddEntry(false)} className="bg-slate-200 text-slate-700 text-xs font-black px-4 py-2 rounded-lg">ยกเลิก</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-3">วัน/เวลา</th>
                <th className="px-6 py-3">หมวด</th>
                <th className="px-6 py-3">รายการ</th>
                <th className="px-6 py-3">ประเภท</th>
                <th className="px-6 py-3 text-right">จำนวน</th>
                <th className="px-6 py-3">ผู้บันทึก</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{e.datetime}</td>
                  <td className="px-6 py-4"><span className={`text-[10px] font-black px-3 py-1 rounded-full ${pillColor(e.categoryColor)}`}>{e.category}</span></td>
                  <td className="px-6 py-4 font-bold text-slate-900">{e.description}</td>
                  <td className="px-6 py-4"><span className={`text-[10px] font-black px-3 py-1 rounded-full ${e.type === 'IN' ? pillColor('green') : pillColor('red')}`}>{e.type === 'IN' ? 'รับ' : 'จ่าย'}</span></td>
                  <td className={`px-6 py-4 font-black tabular-nums text-right ${e.type === 'IN' ? 'text-emerald-600' : 'text-slate-900'}`}>{e.amount}</td>
                  <td className="px-6 py-4 text-slate-600">{e.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-base font-black text-slate-900">📊 สรุปตามหมวด (เดือนนี้)</h3>
          <span className="text-xs font-black text-slate-400">{categories.length} หมวด</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-3">หมวด</th>
                <th className="px-6 py-3 text-right">รายการ</th>
                <th className="px-6 py-3 text-right">ยอดรวม</th>
                <th className="px-6 py-3 text-right">% รายจ่าย</th>
                <th className="px-6 py-3">แนวโน้ม</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">{cat.label}</td>
                  <td className="px-6 py-4 text-slate-700 tabular-nums text-right">{cat.count}</td>
                  <td className="px-6 py-4 font-bold text-slate-900 tabular-nums text-right">{cat.total}</td>
                  <td className="px-6 py-4 text-slate-600 tabular-nums text-right">{cat.percent}</td>
                  <td className="px-6 py-4">{trendBadge(cat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden" id="fixed-costs-section">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-base font-black text-slate-900">🔁 รายจ่ายประจำ (Fixed Costs)</h3>
          <button onClick={() => setShowAddFixed(v => !v)} className="text-xs font-black text-blue-600 hover:text-blue-700">+ เพิ่ม</button>
        </div>
        {showAddFixed && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 items-end">
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]" placeholder="ชื่อรายการ" value={newFixed.name} onChange={e => setNewFixed(p => ({...p, name: e.target.value}))} />
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28" placeholder="หมวด" value={newFixed.cat} onChange={e => setNewFixed(p => ({...p, cat: e.target.value}))} />
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28" placeholder="จำนวน/เดือน" value={newFixed.amount} onChange={e => setNewFixed(p => ({...p, amount: e.target.value}))} />
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28" placeholder="วันที่ตัด" value={newFixed.day} onChange={e => setNewFixed(p => ({...p, day: e.target.value}))} />
            <button onClick={handleAddFixed} className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-lg hover:bg-blue-700">✓ บันทึก</button>
            <button onClick={() => setShowAddFixed(false)} className="bg-slate-200 text-slate-700 text-xs font-black px-4 py-2 rounded-lg">ยกเลิก</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-3">รายการ</th>
                <th className="px-6 py-3">หมวด</th>
                <th className="px-6 py-3 text-right">จำนวน/เดือน</th>
                <th className="px-6 py-3">วันที่ตัด</th>
                <th className="px-6 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {fixed.map(f => {
                const st = fixedStatusLabel(f.status);
                return (
                  <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-900">{f.name}</td>
                    <td className="px-6 py-4"><span className={`text-[10px] font-black px-3 py-1 rounded-full ${pillColor(f.categoryColor)}`}>{f.category}</span></td>
                    <td className="px-6 py-4 font-bold text-slate-700 tabular-nums text-right">{f.amount}</td>
                    <td className="px-6 py-4 text-slate-600">{f.dueDate}</td>
                    <td className="px-6 py-4"><span className={`text-[10px] font-black px-3 py-1 rounded-full ${pillColor(st.color)}`}>{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ระบบเงินบริษัท */}
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">🏢 ระบบเงินบริษัท</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">ยืมเงิน · กระแสเงินสด · บัตร—Wallet Mapping</p>
        </div>

        {/* กระแสเงินสด summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">เงินเข้า</p>
            <p className="text-3xl font-black text-emerald-600 tabular-nums">+ 312k</p>
            <p className="text-xs font-bold text-slate-400 mt-1">เดือนนี้</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">เงินออก</p>
            <p className="text-3xl font-black text-red-600 tabular-nums">- 189k</p>
            <p className="text-xs font-bold text-slate-400 mt-1">เดือนนี้</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">คงเหลือสุทธิ</p>
            <p className="text-3xl font-black text-blue-600 tabular-nums">123k</p>
            <p className="text-xs font-bold text-slate-400 mt-1">บาท สุทธิ</p>
          </div>
        </div>

        {/* Loan */}
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900">💵 การยืมเงิน (Loan)</h3>
            <button onClick={() => setShowAddLoan(v => !v)} className="text-xs font-black text-blue-600 hover:text-blue-700">+ บันทึกการยืม</button>
          </div>
          {showAddLoan && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 items-end">
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-40" placeholder="ผู้ยืม" value={newLoan.borrower} onChange={e => setNewLoan(p => ({...p, borrower: e.target.value}))} />
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28" placeholder="จำนวน" value={newLoan.amount} onChange={e => setNewLoan(p => ({...p, amount: e.target.value}))} />
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]" placeholder="วัตถุประสงค์" value={newLoan.purpose} onChange={e => setNewLoan(p => ({...p, purpose: e.target.value}))} />
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-32" placeholder="วันที่" value={newLoan.date} onChange={e => setNewLoan(p => ({...p, date: e.target.value}))} />
              <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newLoan.status} onChange={e => setNewLoan(p => ({...p, status: e.target.value as CompanyLoan['status']}))}>
                <option value="PENDING">รออนุมัติ</option>
                <option value="APPROVED">อนุมัติแล้ว</option>
                <option value="REPAID">จ่ายคืนแล้ว</option>
              </select>
              <button onClick={handleAddLoan} className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-lg hover:bg-blue-700">✓ บันทึก</button>
              <button onClick={() => setShowAddLoan(false)} className="bg-slate-200 text-slate-700 text-xs font-black px-4 py-2 rounded-lg">ยกเลิก</button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="px-6 py-3">ผู้ยืม</th>
                  <th className="px-6 py-3 text-right">จำนวน</th>
                  <th className="px-6 py-3">วัตถุประสงค์</th>
                  <th className="px-6 py-3">วันที่</th>
                  <th className="px-6 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {loans.map(loan => {
                  const st = loanStatusBadge(loan.status);
                  return (
                    <tr key={loan.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4 font-bold text-slate-900">{loan.borrower}</td>
                      <td className="px-6 py-4 font-black text-slate-700 tabular-nums text-right">{loan.amount}</td>
                      <td className="px-6 py-4 text-slate-600">{loan.purpose}</td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{loan.date}</td>
                      <td className="px-6 py-4"><span className={`text-[10px] font-black px-3 py-1 rounded-full ${pillColor(st.color)}`}>{st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Mapping */}
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900">💳 บัตรใช้ตัดอะไร (Payment Mapping)</h3>
            <button onClick={() => setShowAddPM(v => !v)} className="text-xs font-black text-blue-600 hover:text-blue-700">+ เพิ่ม</button>
          </div>
          {showAddPM && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 items-end">
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-48" placeholder="ชื่อบัตร / Wallet" value={newPM.card} onChange={e => setNewPM(p => ({...p, card: e.target.value}))} />
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]" placeholder="ใช้ตัดอะไร" value={newPM.purpose} onChange={e => setNewPM(p => ({...p, purpose: e.target.value}))} />
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-32" placeholder="บัญชี/แหล่งตัด" value={newPM.account} onChange={e => setNewPM(p => ({...p, account: e.target.value}))} />
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-32" placeholder="ผู้ดูแล" value={newPM.handler} onChange={e => setNewPM(p => ({...p, handler: e.target.value}))} />
              <button onClick={handleAddPM} className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-lg hover:bg-blue-700">✓ บันทึก</button>
              <button onClick={() => setShowAddPM(false)} className="bg-slate-200 text-slate-700 text-xs font-black px-4 py-2 rounded-lg">ยกเลิก</button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="px-6 py-3">บัตร / Wallet</th>
                  <th className="px-6 py-3">ใช้ตัดอะไร</th>
                  <th className="px-6 py-3">บัญชีตัด</th>
                  <th className="px-6 py-3">ผู้ดูแล</th>
                </tr>
              </thead>
              <tbody>
                {paymentMaps.map(pm => (
                  <tr key={pm.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-900">{pm.card}</td>
                    <td className="px-6 py-4 text-slate-600">{pm.purpose}</td>
                    <td className="px-6 py-4 text-slate-600">{pm.account}</td>
                    <td className="px-6 py-4 text-slate-600">{pm.handler}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cashbook;
