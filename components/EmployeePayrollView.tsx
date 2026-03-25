import React, { useState, useMemo } from 'react';
import { UserProfile, PayrollRecord, CompensationSettings } from '../types';

interface PenaltyRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  amount: number;
  reason: string;
  date: string;
}

interface Props {
  currentUser: UserProfile;
  payrollRecords: PayrollRecord[];
  penaltyRecords: PenaltyRecord[];
  compensationSettings: CompensationSettings[];
}

const MONTH_NAMES: Record<string, string> = {
  '01':'ม.ค.','02':'ก.พ.','03':'มี.ค.','04':'เม.ย.','05':'พ.ค.','06':'มิ.ย.',
  '07':'ก.ค.','08':'ส.ค.','09':'ก.ย.','10':'ต.ค.','11':'พ.ย.','12':'ธ.ค.'
};

const EmployeePayrollView: React.FC<Props> = ({ currentUser, payrollRecords, penaltyRecords, compensationSettings }) => {
  const myPayroll = useMemo(() => 
    payrollRecords.filter(p => p.employeeId === currentUser.employeeId || p.employeeId === currentUser.id),
    [payrollRecords, currentUser]
  );

  const myPenalties = useMemo(() =>
    penaltyRecords.filter(p => p.employeeId === currentUser.employeeId || p.employeeId === currentUser.id),
    [penaltyRecords, currentUser]
  );

  // Get all available months
  const allMonths = useMemo(() => {
    const months = new Set<string>();
    myPayroll.forEach(p => { if (p.month) months.add(p.month); });
    myPenalties.forEach(p => { if (p.date) months.add(p.date.slice(0, 7)); });
    return Array.from(months).sort().reverse();
  }, [myPayroll, myPenalties]);

  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const formatMonth = (m: string) => {
    const [y, mo] = m.split('-');
    return MONTH_NAMES[mo] ? `${MONTH_NAMES[mo]} ${y}` : m;
  };

  const filteredPayroll = selectedMonth === 'all' ? myPayroll : myPayroll.filter(p => p.month === selectedMonth);
  const filteredPenalties = selectedMonth === 'all' ? myPenalties : myPenalties.filter(p => p.date?.startsWith(selectedMonth));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900">💰 เงินเดือนของฉัน</h2>
        {allMonths.length > 0 && (
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-4 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">ทุกเดือน</option>
            {allMonths.map(m => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        )}
      </div>

      {filteredPayroll.length > 0 ? (
        <div className="space-y-4">
          {filteredPayroll.map(p => {
            const income = (p.baseSalary || 0) + (p.mealAllowance || 0) + (p.commission || 0) + (p.bonus || 0) + (p.overtime || 0);
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-500">{p.month ? formatMonth(p.month) : 'ไม่ระบุ'}</h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {p.status === 'PAID' ? 'จ่ายแล้ว' : 'รอจ่าย'}
                  </span>
                </div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">รายรับ</p>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div><span className="text-slate-400">เงินเดือน:</span> <span className="font-bold text-emerald-700">฿{(p.baseSalary || 0).toLocaleString()}</span></div>
                  {(p.mealAllowance || 0) > 0 && <div><span className="text-slate-400">ค่าข้าว:</span> <span className="font-bold text-emerald-700">฿{(p.mealAllowance || 0).toLocaleString()}</span></div>}
                  {(p.commission || 0) > 0 && <div><span className="text-slate-400">ค่าคอม:</span> <span className="font-bold text-emerald-700">฿{(p.commission || 0).toLocaleString()}</span></div>}
                  {(p.bonus || 0) > 0 && <div><span className="text-slate-400">โบนัส:</span> <span className="font-bold text-emerald-700">฿{(p.bonus || 0).toLocaleString()}</span></div>}
                  {(p.overtime || 0) > 0 && <div><span className="text-slate-400">OT:</span> <span className="font-bold text-emerald-700">฿{(p.overtime || 0).toLocaleString()}</span></div>}
                  <div className="col-span-2 pt-1 border-t border-emerald-100"><span className="text-slate-400">รายรับรวม:</span> <span className="font-black text-emerald-600">฿{income.toLocaleString()}</span></div>
                </div>
                {(p.deductions || 0) > 0 && (
                  <>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">รายหัก</p>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      {(p.damageCost || 0) > 0 && <div><span className="text-slate-400">ยอดเสียหาย:</span> <span className="font-bold text-red-500">-฿{(p.damageCost || 0).toLocaleString()}</span></div>}
                      {(p.mistakePenalty || 0) > 0 && <div><span className="text-slate-400">ทำงานผิดพลาด:</span> <span className="font-bold text-red-500">-฿{(p.mistakePenalty || 0).toLocaleString()}</span></div>}
                      {(p.debtRepayment || 0) > 0 && <div><span className="text-slate-400">หักหนี้:</span> <span className="font-bold text-red-500">-฿{(p.debtRepayment || 0).toLocaleString()}</span></div>}
                      {(p.remainingDebt || 0) > 0 && <div><span className="text-slate-400">หนี้คงเหลือ:</span> <span className="font-bold text-orange-500">฿{(p.remainingDebt || 0).toLocaleString()}</span></div>}
                      <div className="col-span-2 pt-1 border-t border-red-100"><span className="text-slate-400">หักรวม:</span> <span className="font-black text-red-500">-฿{(p.deductions || 0).toLocaleString()}</span></div>
                    </div>
                  </>
                )}
                <div className="mt-1 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-500">สุทธิที่ได้รับ</span>
                  <span className="text-xl font-black text-blue-600">฿{p.netPayable.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-slate-400 text-center py-8">ยังไม่มีข้อมูลเงินเดือน{selectedMonth !== 'all' ? ` เดือน ${formatMonth(selectedMonth)}` : ''}</p>
      )}

      {/* รายงานข้อผิดพลาด */}
      {filteredPenalties.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-200 p-5 mt-4">
          <h3 className="text-sm font-bold text-red-500 mb-4">⚠️ รายงานความผิดพลาด</h3>
          {(() => {
            const months: Record<string, typeof filteredPenalties> = {};
            filteredPenalties.forEach(p => {
              const m = p.date ? p.date.slice(0, 7) : 'ไม่ระบุ';
              if (!months[m]) months[m] = [];
              months[m].push(p);
            });
            return Object.keys(months).sort().reverse().map(month => {
              const items = months[month];
              const total = items.reduce((s, p) => s + p.amount, 0);
              return (
                <div key={month} className="mb-4 last:mb-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black text-slate-500 uppercase">{formatMonth(month)}</span>
                    <span className="text-xs font-black text-red-500">รวม -฿{total.toLocaleString()}</span>
                  </div>
                  {items.map(p => (
                    <div key={p.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 pl-3">
                      <div>
                        <span className="text-xs text-slate-400">{p.date}</span>
                        <span className="text-sm text-slate-700 ml-2">{p.reason}</span>
                      </div>
                      <span className="font-bold text-red-500 text-sm">-฿{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              );
            });
          })()}
          <div className="mt-3 pt-3 border-t-2 border-red-200 flex justify-between">
            <span className="font-black text-sm text-slate-700">รวมทั้งหมด</span>
            <span className="font-black text-lg text-red-600">-฿{filteredPenalties.reduce((s, p) => s + p.amount, 0).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePayrollView;
