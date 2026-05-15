import React, { useEffect, useState } from 'react';
import { syncAccountPaymentItems, syncAccountRegistryItems } from '../services/syncService';

interface AccountReg {
  id: string;
  type: string;
  name: string;
  owner: string;
  status: 'ACTIVE' | 'INACTIVE';
  rights: string;
}

interface PaymentMap {
  id: string;
  card: string;
  service: string;
  date: string;
  category: string;
  categoryColor: 'blue' | 'amber';
  handler: string;
}

const MOCK_REGISTRY: AccountReg[] = [
  { id: '1', type: 'LINE OA', name: 'หน้าร้านหลัก', owner: 'คุณ', status: 'ACTIVE', rights: '3 คน' },
  { id: '2', type: 'Gmail', name: 'marketing@', owner: 'มาร์เก็ต', status: 'ACTIVE', rights: '2 คน' },
  { id: '3', type: 'Google Sheet', name: 'ฐานข้อมูลฝาก-ถอน', owner: 'คุณ', status: 'ACTIVE', rights: '5 คน' },
];

const MOCK_PAYMENTS: PaymentMap[] = [
  { id: '1', card: 'Visa ****1234', service: 'Notion', date: '20 ทุกเดือน', category: 'ระบบ', categoryColor: 'blue', handler: 'คุณ' },
  { id: '2', card: 'Visa ****1234', service: 'Facebook Ads', date: 'วันที่ใช้', category: 'การตลาด', categoryColor: 'amber', handler: 'มาร์เก็ต' },
  { id: '3', card: 'True Wallet', service: 'Google Workspace', date: '5 ทุกเดือน', category: 'ระบบ', categoryColor: 'blue', handler: 'คุณ' },
];

const pillColor = (color: string) => {
  const map: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  };
  return map[color] || 'bg-slate-100 text-slate-600';
};

const AccountsManager: React.FC = () => {
  const [registry, setRegistry] = useState(MOCK_REGISTRY);
  const [payments, setPayments] = useState(MOCK_PAYMENTS);
  const [showAdd, setShowAdd] = useState(false);
  const [newAccount, setNewAccount] = useState({ type: 'LINE OA', name: '', owner: '', rights: '' });
  const [showPayments, setShowPayments] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [nextRegistry, nextPayments] = await Promise.all([
        syncAccountRegistryItems(MOCK_REGISTRY),
        syncAccountPaymentItems(MOCK_PAYMENTS),
      ]);
      if (!alive) return;
      setRegistry(nextRegistry);
      setPayments(nextPayments);
    })();
    return () => { alive = false; };
  }, []);

  const handleAddAccount = async () => {
    if (!newAccount.name.trim()) return;
    const nextItem: AccountReg = {
      id: crypto.randomUUID(),
      type: newAccount.type,
      name: newAccount.name,
      owner: newAccount.owner || 'คุณ',
      status: 'ACTIVE',
      rights: newAccount.rights || '1 คน',
    };
    const nextLocal = [...registry, nextItem];
    setRegistry(nextLocal);
    setRegistry(await syncAccountRegistryItems(nextLocal));
    setNewAccount({ type: 'LINE OA', name: '', owner: '', rights: '' });
    setShowAdd(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">🔐 Accounts</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Gmail · LINE · Sheet · บัตร · Wallet</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">ทั้งหมด</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">28</p>
          <p className="text-xs font-bold text-slate-400 mt-1">บัญชีเครื่องมือ</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">ใช้งาน</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">24</p>
          <p className="text-xs font-bold text-slate-400 mt-1">Active</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Subscription</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">7</p>
          <p className="text-xs font-bold text-slate-400 mt-1">ตัดเดือนนี้</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">ยอดรวม/เดือน</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">8.2k</p>
          <p className="text-xs font-bold text-slate-400 mt-1">บาท</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-base font-black text-slate-900">📒 Accounts Registry</h3>
          <button onClick={() => setShowAdd(v => !v)} className="text-xs font-black text-blue-600 hover:text-blue-700">+ เพิ่ม</button>
        </div>
        {showAdd && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 items-end">
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newAccount.type} onChange={e => setNewAccount(p => ({...p, type: e.target.value}))}>
              <option>LINE OA</option><option>Gmail</option><option>Google Sheet</option><option>Wallet</option><option>Subscription</option>
            </select>
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]" placeholder="ชื่อบัญชี/เครื่องมือ" value={newAccount.name} onChange={e => setNewAccount(p => ({...p, name: e.target.value}))} />
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28" placeholder="Owner" value={newAccount.owner} onChange={e => setNewAccount(p => ({...p, owner: e.target.value}))} />
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-24" placeholder="สิทธิ์" value={newAccount.rights} onChange={e => setNewAccount(p => ({...p, rights: e.target.value}))} />
            <button onClick={handleAddAccount} className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-lg hover:bg-blue-700">✓ บันทึก</button>
            <button onClick={() => setShowAdd(false)} className="bg-slate-200 text-slate-700 text-xs font-black px-4 py-2 rounded-lg">ยกเลิก</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-3">ประเภท</th>
                <th className="px-6 py-3">ชื่อ</th>
                <th className="px-6 py-3">Owner</th>
                <th className="px-6 py-3">สถานะ</th>
                <th className="px-6 py-3">สิทธิ์</th>
              </tr>
            </thead>
            <tbody>
              {registry.map(r => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">{r.type}</td>
                  <td className="px-6 py-4 text-slate-700">{r.name}</td>
                  <td className="px-6 py-4 text-slate-600">{r.owner}</td>
                  <td className="px-6 py-4"><span className={`text-[10px] font-black px-3 py-1 rounded-full ${pillColor('green')}`}>ใช้งาน</span></td>
                  <td className="px-6 py-4 text-slate-600">{r.rights}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-base font-black text-slate-900">💳 Payments Mapping</h3>
          <button onClick={() => setShowPayments(v => !v)} className="text-xs font-black text-blue-600 hover:text-blue-700">{showPayments ? 'ซ่อน' : 'ดูทั้งหมด'} →</button>
        </div>
        {showPayments && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="px-6 py-3">บัตร/Wallet</th>
                  <th className="px-6 py-3">ตัด</th>
                  <th className="px-6 py-3">วันที่</th>
                  <th className="px-6 py-3">หมวด</th>
                  <th className="px-6 py-3">คนดูแล</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-900">{p.card}</td>
                    <td className="px-6 py-4 text-slate-700">{p.service}</td>
                    <td className="px-6 py-4 text-slate-600">{p.date}</td>
                    <td className="px-6 py-4"><span className={`text-[10px] font-black px-3 py-1 rounded-full ${pillColor(p.categoryColor)}`}>{p.category}</span></td>
                    <td className="px-6 py-4 text-slate-600">{p.handler}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountsManager;
