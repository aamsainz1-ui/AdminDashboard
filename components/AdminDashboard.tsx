import React, { useMemo } from 'react';
import { UserProfile, UserRole, PayrollRecord, CompensationSettings } from '../types';

interface PenaltyRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  amount: number;
  reason: string;
  date: string;
}

interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Props {
  currentUser: UserProfile;
  members: UserProfile[];
  payrollRecords: PayrollRecord[];
  penaltyRecords: PenaltyRecord[];
  compensationSettings: CompensationSettings[];
  leaves?: LeaveRecord[];
}

const AdminDashboard: React.FC<Props> = ({ currentUser, members, payrollRecords, penaltyRecords, compensationSettings, leaves = [] }) => {
  const isAdmin = currentUser.role === UserRole.ADMIN;

  // Current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const stats = useMemo(() => {
    const thisMonthPayroll = payrollRecords.filter(p => p.month === currentMonth);
    const totalSalary = thisMonthPayroll.reduce((s, p) => s + (p.netPayable || 0), 0);
    const totalDeductions = thisMonthPayroll.reduce((s, p) => s + (p.deductions || 0), 0);
    const totalPaid = thisMonthPayroll.filter(p => p.status === 'PAID').reduce((s, p) => s + (p.netPayable || 0), 0);
    const totalPending = totalSalary - totalPaid;
    const totalPenalties = penaltyRecords
      .filter(p => p.date?.startsWith(currentMonth))
      .reduce((s, p) => s + p.amount, 0);
    const employeeCount = members.filter(m => m.role !== UserRole.ADMIN).length;
    
    // Leave stats this month
    const thisMonthLeaves = leaves.filter(l => l.startDate?.startsWith(currentMonth) && l.status === 'APPROVED');
    const onLeaveCount = thisMonthLeaves.length;
    const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length;
    
    return { totalSalary, totalDeductions, totalPaid, totalPending, totalPenalties, employeeCount, thisMonthPayroll, onLeaveCount, pendingLeaves, thisMonthLeaves };
  }, [payrollRecords, penaltyRecords, members, currentMonth]);

  // Employee view: simple summary
  if (!isAdmin) {
    const myPayroll = payrollRecords.filter(p => 
      (p.employeeId === currentUser.employeeId || p.employeeId === currentUser.id) && p.month === currentMonth
    );
    const myPenalties = penaltyRecords.filter(p => 
      (p.employeeId === currentUser.employeeId || p.employeeId === currentUser.id) && p.date?.startsWith(currentMonth)
    );
    const latestPayroll = myPayroll[0];
    const baseSalary = latestPayroll ? (latestPayroll.baseSalary || 0) : 0;
    const commission = latestPayroll ? (latestPayroll.commission || 0) : 0;
    const bonus = latestPayroll ? (latestPayroll.bonus || 0) : 0;
    const overtime = latestPayroll ? (latestPayroll.overtime || 0) : 0;
    const mealAllowance = latestPayroll ? (latestPayroll.mealAllowance || 0) : 0;
    const totalIncome = baseSalary + commission + bonus + overtime + mealAllowance;
    const deductions = latestPayroll ? (latestPayroll.deductions || 0) : 0;
    const damageCost = latestPayroll ? (latestPayroll.damageCost || 0) : 0;
    const mistakePenalty = latestPayroll ? (latestPayroll.mistakePenalty || 0) : 0;
    const debtRepayment = latestPayroll ? (latestPayroll.debtRepayment || 0) : 0;
    const netPayable = latestPayroll ? (latestPayroll.netPayable || 0) : 0;
    const penalties = myPenalties.reduce((s, p) => s + p.amount, 0);
    const status = latestPayroll?.status;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">สรุปเงินเดือน</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">เดือนนี้</p>
        </div>

        {/* Net Pay - Hero Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">เงินเดือนสุทธิ</p>
          <p className="text-5xl font-black tracking-tighter">฿{netPayable.toLocaleString()}</p>
          <p className="text-xs mt-3 opacity-60">
            {!latestPayroll ? 'ยังไม่มีข้อมูล' : status === 'PAID' ? '✅ จ่ายแล้ว' : '⏳ รอจ่าย'}
          </p>
        </div>

        {/* Income Breakdown */}
        {latestPayroll && (
          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">💰 รายรับ</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">เงินเดือน</p>
                <p className="text-lg font-black text-slate-900">฿{baseSalary.toLocaleString()}</p>
              </div>
              {commission > 0 && (
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">ค่าคอม</p>
                  <p className="text-lg font-black text-emerald-700">฿{commission.toLocaleString()}</p>
                </div>
              )}
              {overtime > 0 && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">OT</p>
                  <p className="text-lg font-black text-blue-700">฿{overtime.toLocaleString()}</p>
                </div>
              )}
              {bonus > 0 && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">โบนัส</p>
                  <p className="text-lg font-black text-amber-700">฿{bonus.toLocaleString()}</p>
                </div>
              )}
              {mealAllowance > 0 && (
                <div className="bg-violet-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">ค่าข้าว</p>
                  <p className="text-lg font-black text-violet-700">฿{mealAllowance.toLocaleString()}</p>
                </div>
              )}
              <div className="col-span-2 bg-emerald-100 rounded-xl p-4 flex justify-between items-center">
                <p className="text-xs font-bold text-emerald-600">รายรับรวม</p>
                <p className="text-xl font-black text-emerald-700">฿{totalIncome.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Deductions */}
        {(deductions > 0 || penalties > 0) && (
          <div className="bg-white rounded-[2rem] border border-red-200 p-6 shadow-sm">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">⚠️ รายหัก</p>
            <div className="grid grid-cols-2 gap-3">
              {damageCost > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">ยอดเสียหาย</p>
                  <p className="text-lg font-black text-red-600">-฿{damageCost.toLocaleString()}</p>
                </div>
              )}
              {mistakePenalty > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">ทำงานผิดพลาด</p>
                  <p className="text-lg font-black text-red-600">-฿{mistakePenalty.toLocaleString()}</p>
                </div>
              )}
              {debtRepayment > 0 && (
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">หักหนี้</p>
                  <p className="text-lg font-black text-orange-600">-฿{debtRepayment.toLocaleString()}</p>
                </div>
              )}
              {penalties > 0 && (
                <div className="bg-rose-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">ค่าปรับเดือนนี้</p>
                  <p className="text-lg font-black text-rose-600">-฿{penalties.toLocaleString()}</p>
                  <p className="text-[10px] text-rose-400 mt-1">{myPenalties.length} รายการ</p>
                </div>
              )}
              <div className="col-span-2 bg-red-100 rounded-xl p-4 flex justify-between items-center">
                <p className="text-xs font-bold text-red-600">หักรวม</p>
                <p className="text-xl font-black text-red-700">-฿{(deductions + penalties).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Owner/Admin view: summary of all employees
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">แดชบอร์ดรวม</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">สรุปค่าใช้จ่ายเดือนนี้</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] text-white shadow-xl">
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-2">เงินเดือนทั้งหมด</p>
          <p className="text-3xl font-black tracking-tighter">฿{stats.totalSalary.toLocaleString()}</p>
          <p className="text-xs mt-2 opacity-60">{stats.employeeCount} พนักงาน</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-6 rounded-[2rem] text-white shadow-xl">
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-2">จ่ายแล้ว</p>
          <p className="text-3xl font-black tracking-tighter">฿{stats.totalPaid.toLocaleString()}</p>
          <p className="text-xs mt-2 opacity-60">✅ เรียบร้อย</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-[2rem] text-white shadow-xl">
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-2">รอจ่าย</p>
          <p className="text-3xl font-black tracking-tighter">฿{stats.totalPending.toLocaleString()}</p>
          <p className="text-xs mt-2 opacity-60">⏳ ค้างอยู่</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-[2rem] text-white shadow-xl">
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-2">ยอดหักได้คืน</p>
          <p className="text-3xl font-black tracking-tighter">฿{(stats.totalDeductions + stats.totalPenalties).toLocaleString()}</p>
          <p className="text-xs mt-2 opacity-60">หัก ฿{stats.totalDeductions.toLocaleString()} + ปรับ ฿{stats.totalPenalties.toLocaleString()}</p>
        </div>
      </div>

      {/* Leave summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">🏖️ พนักงานลาเดือนนี้</p>
          <p className="text-3xl font-black text-violet-600">{stats.onLeaveCount}</p>
          <p className="text-xs text-slate-400 mt-1">คน (อนุมัติแล้ว)</p>
        </div>
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">⏳ รออนุมัติ</p>
          <p className="text-3xl font-black text-amber-600">{stats.pendingLeaves}</p>
          <p className="text-xs text-slate-400 mt-1">คำขอ</p>
        </div>
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">👥 พนักงานทั้งหมด</p>
          <p className="text-3xl font-black text-blue-600">{stats.employeeCount}</p>
          <p className="text-xs text-slate-400 mt-1">คน</p>
        </div>
      </div>

      {/* Who is on leave this month */}
      {stats.thisMonthLeaves.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">รายชื่อพนักงานที่ลาเดือนนี้</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.thisMonthLeaves.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{l.employeeName || l.employeeId}</p>
                  <p className="text-xs text-slate-400">{l.type} · {l.startDate} → {l.endDate}</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">อนุมัติแล้ว</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per employee breakdown */}
      {stats.thisMonthPayroll.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">รายละเอียดรายคน</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.thisMonthPayroll.map(p => (
              <div key={p.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-sm">
                    {(p.employeeName || members.find(m => m.id === p.employeeId || m.employeeId === p.employeeId)?.name || '?')[0]}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{p.employeeName || members.find(m => m.id === p.employeeId || m.employeeId === p.employeeId)?.name || p.employeeId}</p>
                    <p className="text-xs text-slate-400">{p.month}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">฿{(p.netPayable || 0).toLocaleString()}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {p.status === 'PAID' ? 'จ่ายแล้ว' : 'รอจ่าย'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.thisMonthPayroll.length === 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-12 text-center">
          <p className="text-slate-400 font-bold">ยังไม่มีข้อมูลเงินเดือนเดือนนี้</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
