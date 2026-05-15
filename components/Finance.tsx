import React, { useEffect, useState } from 'react';
import { deleteFinancePendingItem, syncFinanceAccounts, syncFinancePendingItems, syncFinanceTransactions } from '../services/syncService';

interface BankAccount {
  id: string;
  name: string;
  bank: string;
  status: 'ACTIVE' | 'HOLD' | 'CLOSED';
  limit: string;
  owner: string;
}

interface PendingItem {
  id: string;
  type: string;
  amount: string;
  account: string;
  age: string;
  status: 'URGENT' | 'CHECK' | 'WAIT';
}

interface Transaction {
  id: string;
  datetime: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: string;
  account: string;
  note: string;
  by: string;
}

const MOCK_ACCOUNTS: BankAccount[] = [
  { id: '1', name: 'บัญชี A — หลัก', bank: 'SCB', status: 'ACTIVE', limit: '500,000', owner: 'คุณ' },
  { id: '2', name: 'บัญชี B — สำรอง', bank: 'KBank', status: 'ACTIVE', limit: '300,000', owner: 'คุณ' },
  { id: '3', name: 'บัญชี C — โฆษณา', bank: 'BBL', status: 'HOLD', limit: '200,000', owner: 'มาร์เก็ต' },
  { id: '4', name: 'บัญชี D — เก่า', bank: 'KTB', status: 'CLOSED', limit: '-', owner: '-' },
];

const MOCK_PENDING: PendingItem[] = [
  { id: '1', type: 'ถอนค้าง', amount: '45,000', account: 'บัญชี A', age: '2 ชม.', status: 'URGENT' },
  { id: '2', type: 'ปรับยอด', amount: '2,300', account: 'บัญชี B', age: '1 วัน', status: 'CHECK' },
  { id: '3', type: 'ฝากค้าง', amount: '15,000', account: 'บัญชี A', age: '4 ชม.', status: 'WAIT' },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', datetime: '14 พ.ค. 13:45', type: 'DEPOSIT', amount: '15,000', account: 'บัญชี A — หลัก', note: 'ฝากลูกค้า VIP', by: 'แอดมิน 1' },
  { id: 't2', datetime: '14 พ.ค. 12:30', type: 'WITHDRAW', amount: '8,500', account: 'บัญชี B — สำรอง', note: 'ถอนปกติ', by: 'แอดมิน 2' },
  { id: 't3', datetime: '14 พ.ค. 11:15', type: 'DEPOSIT', amount: '22,000', account: 'บัญชี A — หลัก', note: 'ฝากผ่าน QR', by: 'แอดมิน 1' },
  { id: 't4', datetime: '14 พ.ค. 10:00', type: 'WITHDRAW', amount: '12,000', account: 'บัญชี A — หลัก', note: 'ถอนยอดใหญ่ — ผ่านอนุมัติ', by: 'หัวหน้า' },
  { id: 't5', datetime: '14 พ.ค. 09:20', type: 'DEPOSIT', amount: '5,500', account: 'บัญชี B — สำรอง', note: '', by: 'แอดมิน 2' },
];

const StatusPill: React.FC<{ status: BankAccount['status'] }> = ({ status }) => {
  const colors = {
    ACTIVE: 'bg-emerald-50 text-emerald-600',
    HOLD: 'bg-amber-50 text-amber-600',
    CLOSED: 'bg-red-50 text-red-600',
  };
  const labels = { ACTIVE: 'Active', HOLD: 'Hold', CLOSED: 'Closed' };
  return (
    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${colors[status]}`}>
      {labels[status]}
    </span>
  );
};

const PendingPill: React.FC<{ status: PendingItem['status'] }> = ({ status }) => {
  const colors = {
    URGENT: 'bg-red-50 text-red-600',
    CHECK: 'bg-amber-50 text-amber-600',
    WAIT: 'bg-amber-50 text-amber-600',
  };
  const labels = { URGENT: 'เร่งด่วน', CHECK: 'ตรวจสอบ', WAIT: 'รอยืนยัน' };
  return (
    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${colors[status]}`}>
      {labels[status]}
    </span>
  );
};

const BANKS = ['SCB','KBank','BBL','KTB','GSB','BAAC','TMB','KRUNGTHAI','UOB','CIMB'];

const Finance: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>(MOCK_ACCOUNTS);
  const [pending, setPending] = useState<PendingItem[]>(MOCK_PENDING);
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: '', bank: 'SCB', limit: '', owner: '' });
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [txFilter, setTxFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAW'>('ALL');
  const [showAddTx, setShowAddTx] = useState(false);
  const [newTx, setNewTx] = useState<{ type: 'DEPOSIT' | 'WITHDRAW'; amount: string; account: string; note: string }>({ type: 'DEPOSIT', amount: '', account: '', note: '' });
  const [accStatusFilter, setAccStatusFilter] = useState<'ALL' | BankAccount['status']>('ALL');

  const filteredTransactions = transactions.filter(tx => txFilter === 'ALL' || tx.type === txFilter);
  const filteredAccounts = accounts.filter(a => accStatusFilter === 'ALL' || a.status === accStatusFilter);
  const accCounts = {
    ACTIVE: accounts.filter(a => a.status === 'ACTIVE').length,
    HOLD: accounts.filter(a => a.status === 'HOLD').length,
    CLOSED: accounts.filter(a => a.status === 'CLOSED').length,
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const [nextAccounts, nextPending, nextTransactions] = await Promise.all([
        syncFinanceAccounts(MOCK_ACCOUNTS),
        syncFinancePendingItems(MOCK_PENDING),
        syncFinanceTransactions(MOCK_TRANSACTIONS),
      ]);
      if (!alive) return;
      setAccounts(nextAccounts);
      setPending(nextPending);
      setTransactions(nextTransactions);
    })();
    return () => { alive = false; };
  }, []);

  const handleAddTransaction = async () => {
    if (!newTx.amount.trim() || !newTx.account.trim()) return;
    const now = new Date();
    const nextItem: Transaction = {
      id: crypto.randomUUID(),
      datetime: `${now.getDate()} พ.ค. ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
      type: newTx.type,
      amount: newTx.amount,
      account: newTx.account,
      note: newTx.note,
      by: 'คุณ',
    };
    const nextLocal = [nextItem, ...transactions];
    setTransactions(nextLocal);
    setTransactions(await syncFinanceTransactions(nextLocal));
    setNewTx({ type: 'DEPOSIT', amount: '', account: '', note: '' });
    setShowAddTx(false);
  };

  const handleAddAccount = async () => {
    if (!newAcc.name.trim()) return;
    const nextItem: BankAccount = {
      id: crypto.randomUUID(),
      name: newAcc.name,
      bank: newAcc.bank,
      status: 'ACTIVE',
      limit: newAcc.limit || '-',
      owner: newAcc.owner || 'คุณ',
    };
    const nextLocal = [...accounts, nextItem];
    setAccounts(nextLocal);
    setAccounts(await syncFinanceAccounts(nextLocal));
    setNewAcc({ name: '', bank: 'SCB', limit: '', owner: '' });
    setShowAddAcc(false);
  };

  const handleMarkDone = async (id: string) => {
    const nextLocal = pending.filter(p => p.id !== id);
    setPending(nextLocal);
    await deleteFinancePendingItem(id);
    setPending(await syncFinancePendingItems(nextLocal));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">💰 การเงิน</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">ฝาก-ถอน · บัญชี · เงินคงค้าง · Cashflow</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">เงินคงค้าง</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">3</p>
          <p className="text-xs font-bold text-slate-400 mt-1">45,000 บาท</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">ฝากวันนี้</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">128k</p>
          <p className="text-xs font-bold text-slate-400 mt-1">12 รายการ</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">ถอนวันนี้</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">94k</p>
          <p className="text-xs font-bold text-slate-400 mt-1">8 รายการ</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">บัญชี Active</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">12</p>
          <p className="text-xs font-bold text-slate-400 mt-1">จากทั้งหมด 18</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 flex-wrap gap-3">
          <h3 className="text-base font-black text-slate-900">🏦 บัญชีธนาคาร</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setAccStatusFilter('ALL')} className={`text-[10px] font-black px-3 py-1.5 rounded-full ${accStatusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>ทั้งหมด {accounts.length}</button>
            <button onClick={() => setAccStatusFilter('ACTIVE')} className={`text-[10px] font-black px-3 py-1.5 rounded-full ${accStatusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>Active {accCounts.ACTIVE}</button>
            <button onClick={() => setAccStatusFilter('HOLD')} className={`text-[10px] font-black px-3 py-1.5 rounded-full ${accStatusFilter === 'HOLD' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'}`}>Hold {accCounts.HOLD}</button>
            <button onClick={() => setAccStatusFilter('CLOSED')} className={`text-[10px] font-black px-3 py-1.5 rounded-full ${accStatusFilter === 'CLOSED' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}>Closed {accCounts.CLOSED}</button>
            <button onClick={() => setShowAddAcc(v => !v)} className="text-xs font-black text-blue-600 hover:text-blue-700 ml-2">+ เพิ่มบัญชี</button>
          </div>
        </div>
        {showAddAcc && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 items-end">
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px]" placeholder="ชื่อบัญชี" value={newAcc.name} onChange={e => setNewAcc(p => ({...p, name: e.target.value}))} />
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newAcc.bank} onChange={e => setNewAcc(p => ({...p, bank: e.target.value}))}>
              {BANKS.map(b => <option key={b}>{b}</option>)}
            </select>
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-32" placeholder="ลิมิต/วัน" value={newAcc.limit} onChange={e => setNewAcc(p => ({...p, limit: e.target.value}))} />
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28" placeholder="Owner" value={newAcc.owner} onChange={e => setNewAcc(p => ({...p, owner: e.target.value}))} />
            <button onClick={handleAddAccount} className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-lg hover:bg-blue-700">✓ บันทึก</button>
            <button onClick={() => setShowAddAcc(false)} className="bg-slate-200 text-slate-700 text-xs font-black px-4 py-2 rounded-lg">ยกเลิก</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-3">ชื่อบัญชี</th>
                <th className="px-6 py-3">ธนาคาร</th>
                <th className="px-6 py-3">สถานะ</th>
                <th className="px-6 py-3">ลิมิต/วัน</th>
                <th className="px-6 py-3">Owner</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map(acc => (
                <tr key={acc.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">{acc.name}</td>
                  <td className="px-6 py-4 text-slate-600">{acc.bank}</td>
                  <td className="px-6 py-4"><StatusPill status={acc.status} /></td>
                  <td className="px-6 py-4 font-bold text-slate-700 tabular-nums">{acc.limit}</td>
                  <td className="px-6 py-4 text-slate-600">{acc.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-black text-slate-900">💸 รายการธุรกรรม (ฝาก-ถอน)</h3>
            <div className="flex bg-slate-100 rounded-full p-1">
              <button onClick={() => setTxFilter('ALL')} className={`text-[10px] font-black px-3 py-1 rounded-full ${txFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>ทั้งหมด</button>
              <button onClick={() => setTxFilter('DEPOSIT')} className={`text-[10px] font-black px-3 py-1 rounded-full ${txFilter === 'DEPOSIT' ? 'bg-emerald-600 text-white' : 'text-emerald-600'}`}>ฝาก</button>
              <button onClick={() => setTxFilter('WITHDRAW')} className={`text-[10px] font-black px-3 py-1 rounded-full ${txFilter === 'WITHDRAW' ? 'bg-red-600 text-white' : 'text-red-500'}`}>ถอน</button>
            </div>
          </div>
          <button onClick={() => setShowAddTx(v => !v)} className="text-xs font-black text-blue-600 hover:text-blue-700">+ เพิ่มรายการ</button>
        </div>
        {showAddTx && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 items-end">
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newTx.type} onChange={e => setNewTx(p => ({...p, type: e.target.value as 'DEPOSIT' | 'WITHDRAW'}))}>
              <option value="DEPOSIT">ฝาก</option>
              <option value="WITHDRAW">ถอน</option>
            </select>
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-32" placeholder="จำนวน" value={newTx.amount} onChange={e => setNewTx(p => ({...p, amount: e.target.value}))} />
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px]" value={newTx.account} onChange={e => setNewTx(p => ({...p, account: e.target.value}))}>
              <option value="">เลือกบัญชี…</option>
              {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px]" placeholder="โน้ต" value={newTx.note} onChange={e => setNewTx(p => ({...p, note: e.target.value}))} />
            <button onClick={handleAddTransaction} className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-lg hover:bg-blue-700">✓ บันทึก</button>
            <button onClick={() => setShowAddTx(false)} className="bg-slate-200 text-slate-700 text-xs font-black px-4 py-2 rounded-lg">ยกเลิก</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-3">วัน/เวลา</th>
                <th className="px-6 py-3">ประเภท</th>
                <th className="px-6 py-3 text-right">จำนวน</th>
                <th className="px-6 py-3">บัญชี</th>
                <th className="px-6 py-3">โน้ต</th>
                <th className="px-6 py-3">ผู้บันทึก</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(tx => (
                <tr key={tx.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{tx.datetime}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${tx.type === 'DEPOSIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{tx.type === 'DEPOSIT' ? 'ฝาก' : 'ถอน'}</span>
                  </td>
                  <td className={`px-6 py-4 font-black tabular-nums text-right ${tx.type === 'DEPOSIT' ? 'text-emerald-600' : 'text-red-600'}`}>{tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount}</td>
                  <td className="px-6 py-4 text-slate-600">{tx.account}</td>
                  <td className="px-6 py-4 text-slate-500">{tx.note || '-'}</td>
                  <td className="px-6 py-4 text-slate-600">{tx.by}</td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">ไม่มีรายการ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-base font-black text-slate-900">⚠️ รายการคงค้าง</h3>
          <span className="text-xs font-black text-slate-400">{pending.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-3">ประเภท</th>
                <th className="px-6 py-3">จำนวน</th>
                <th className="px-6 py-3">บัญชี</th>
                <th className="px-6 py-3">อายุ</th>
                <th className="px-6 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(item => (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">{item.type}</td>
                  <td className="px-6 py-4 font-bold text-slate-700 tabular-nums">{item.amount}</td>
                  <td className="px-6 py-4 text-slate-600">{item.account}</td>
                  <td className="px-6 py-4 text-slate-500">{item.age}</td>
                  <td className="px-6 py-4"><PendingPill status={item.status} /></td>
                  <td className="px-6 py-4"><button onClick={() => handleMarkDone(item.id)} className="text-[10px] font-black text-slate-400 hover:text-emerald-600">✓ เคลียร</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Finance;
