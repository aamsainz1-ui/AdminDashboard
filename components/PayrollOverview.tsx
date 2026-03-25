import React, { useState, useMemo } from 'react';
import { PayrollRecord, Language, UserProfile } from '../types';

interface PenaltyRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  amount: number;
  reason: string;
  date: string;
}

interface Props {
  payroll: PayrollRecord[];
  penalties: PenaltyRecord[];
  members?: UserProfile[];
  onUpdatePayrollStatus?: (id: string, status: string) => void;
  lang: Language;
}

const MONTH_NAMES: Record<string, string> = {
  '01':'ม.ค.','02':'ก.พ.','03':'มี.ค.','04':'เม.ย.','05':'พ.ค.','06':'มิ.ย.',
  '07':'ก.ค.','08':'ส.ค.','09':'ก.ย.','10':'ต.ค.','11':'พ.ย.','12':'ธ.ค.'
};

const formatMonth = (m: string) => {
  const [y, mo] = (m || '').split('-');
  return MONTH_NAMES[mo] ? `${MONTH_NAMES[mo]} ${y}` : m || '-';
};

const PayrollOverview: React.FC<Props> = ({ payroll, penalties, members = [], onUpdatePayrollStatus, lang }) => {
  const resolveName = (p: PayrollRecord) => {
    const matched = members.find(m => m.id === p.employeeId || m.employeeId === p.employeeId);
    return p.employeeName || matched?.name || p.employeeId;
  };
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'PAID'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  const allMonths = useMemo(() => {
    const months = new Set<string>();
    payroll.forEach(p => { if (p.month) months.add(p.month); });
    return Array.from(months).sort().reverse();
  }, [payroll]);

  const filtered = useMemo(() => {
    let list = [...payroll].sort((a, b) => (b.month || '').localeCompare(a.month || ''));
    if (filter !== 'all') list = list.filter(p => p.status === filter);
    if (monthFilter !== 'all') list = list.filter(p => p.month === monthFilter);
    return list;
  }, [payroll, filter, monthFilter]);

  const pendingCount = payroll.filter(p => p.status === 'PENDING').length;
  const paidCount = payroll.filter(p => p.status === 'PAID').length;
  const totalPending = payroll.filter(p => p.status === 'PENDING').reduce((s, p) => s + (p.netPayable || 0), 0);
  const totalPaid = payroll.filter(p => p.status === 'PAID').reduce((s, p) => s + (p.netPayable || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">ประวัติเงินเดือน</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">รายการทั้งหมดที่บันทึก</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {allMonths.length > 0 && (
            <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="all">ทุกเดือน</option>
              {allMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
            </select>
          )}
          <button onClick={() => {
            const rows = [['ชื่อ','เดือน','เงินเดือน','ค่าคอม','OT','ค่าข้าว','โบนัส','หัก','สุทธิ','สถานะ']];
            filtered.forEach(p => rows.push([resolveName(p), formatMonth(p.month), String(p.baseSalary||0), String(p.commission||0), String(p.overtime||0), String(p.mealAllowance||0), String(p.bonus||0), String(p.deductions||0), String(p.netPayable||0), p.status==='PAID'?'จ่ายแล้ว':'รอจ่าย']));
            const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `payroll_${monthFilter}.csv`; a.click();
          }} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setFilter(filter === 'PENDING' ? 'all' : 'PENDING')}
          className={`p-5 rounded-[1.5rem] border-2 transition-all text-left ${filter === 'PENDING' ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-white'}`}>
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">⏳ รอจ่าย</p>
          <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
          <p className="text-xs text-slate-400 mt-1">฿{totalPending.toLocaleString()}</p>
        </button>
        <button onClick={() => setFilter(filter === 'PAID' ? 'all' : 'PAID')}
          className={`p-5 rounded-[1.5rem] border-2 transition-all text-left ${filter === 'PAID' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">✅ จ่ายแล้ว</p>
          <p className="text-2xl font-black text-emerald-600">{paidCount}</p>
          <p className="text-xs text-slate-400 mt-1">฿{totalPaid.toLocaleString()}</p>
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 font-bold">ไม่มีรายการ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const income = (p.baseSalary || 0) + (p.mealAllowance || 0) + (p.commission || 0) + (p.bonus || 0) + (p.overtime || 0);
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-sm">
                      {(p.employeeName || '?')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{resolveName(p)}</p>
                      <p className="text-xs text-slate-400">{formatMonth(p.month)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${p.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {p.status === 'PAID' ? '✅ จ่ายแล้ว' : '⏳ รอจ่าย'}
                    </span>
                    {p.status === 'PENDING' && onUpdatePayrollStatus && (
                      <button onClick={() => onUpdatePayrollStatus(p.id, 'PAID')}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 active:scale-95 transition-all">
                        อนุมัติจ่าย
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-400">เงินเดือน</span>
                    <p className="font-bold text-slate-700">฿{(p.baseSalary || 0).toLocaleString()}</p>
                  </div>
                  {(p.commission || 0) > 0 && (
                    <div className="bg-emerald-50 rounded-lg p-2">
                      <span className="text-emerald-500">ค่าคอม</span>
                      <p className="font-bold text-emerald-700">฿{p.commission!.toLocaleString()}</p>
                    </div>
                  )}
                  {(p.overtime || 0) > 0 && (
                    <div className="bg-blue-50 rounded-lg p-2">
                      <span className="text-blue-500">OT</span>
                      <p className="font-bold text-blue-700">฿{p.overtime!.toLocaleString()}</p>
                    </div>
                  )}
                  {(p.mealAllowance || 0) > 0 && (
                    <div className="bg-violet-50 rounded-lg p-2">
                      <span className="text-violet-500">ค่าข้าว</span>
                      <p className="font-bold text-violet-700">฿{p.mealAllowance!.toLocaleString()}</p>
                    </div>
                  )}
                  {(p.deductions || 0) > 0 && (
                    <div className="bg-red-50 rounded-lg p-2">
                      <span className="text-red-500">หัก</span>
                      <p className="font-bold text-red-600">-฿{p.deductions!.toLocaleString()}</p>
                    </div>
                  )}
                  <div className="bg-blue-100 rounded-lg p-2">
                    <span className="text-blue-600">รายรับรวม</span>
                    <p className="font-bold text-blue-700">฿{income.toLocaleString()}</p>
                  </div>
                  <div className="bg-indigo-100 rounded-lg p-2">
                    <span className="text-indigo-600">สุทธิ</span>
                    <p className="font-black text-indigo-700">฿{(p.netPayable || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PayrollOverview;
