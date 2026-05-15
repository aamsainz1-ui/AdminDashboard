import React, { useState, useMemo } from 'react';
import { PayrollRecord, PenaltyRecord, CompensationSettings, OrganizationMember, Language, LeaveRecord, LeaveStatus } from '../types';

interface PayrollManagerProps {
    members: OrganizationMember[];
    payroll: PayrollRecord[];
    compensation: CompensationSettings[];
    penalties: PenaltyRecord[];
    leaves?: LeaveRecord[];
    onUpdateCompensation: (data: CompensationSettings) => void;
    onProcessPayroll: (data: Omit<PayrollRecord, 'id'>) => void;
    onUpdatePayrollStatus?: (id: string, status: PayrollRecord['status']) => void;
    onAddPenalty: (data: Omit<PenaltyRecord, 'id'>) => void;
    onDeletePenalty: (id: string) => void;
    lang: Language;
}

const PayrollManager: React.FC<PayrollManagerProps> = ({ members, payroll, compensation, penalties, leaves = [], onUpdateCompensation, onProcessPayroll, onUpdatePayrollStatus, onAddPenalty, onDeletePenalty, lang }) => {
    const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id || '');
    const [activeTab, setActiveTab] = useState<'MANAGEMENT' | 'HISTORY' | 'PENALTIES'>('MANAGEMENT');
    const [historyMonthFilter, setHistoryMonthFilter] = useState<string>('all');
    const emptyRows = () => Array.from({length: 5}, () => ({ date: new Date().toISOString().split('T')[0], amount: 0, reason: '' }));
    const [pendingPenalties, setPendingPenalties] = useState<Array<{ date: string; amount: number; reason: string }>>(emptyRows());

    const selectedMember = useMemo(() => members.find(m => m.id === selectedMemberId), [members, selectedMemberId]);
    const memberCompensation = useMemo(() =>
        compensation.find(c => c.employeeId === selectedMemberId) || { id: '', employeeId: selectedMemberId, baseSalary: 0, commissionRate: 0, allowances: 0 }
        , [compensation, selectedMemberId]);

    const memberHistory = useMemo(() =>
        payroll.filter(p => p.employeeId === selectedMemberId && (historyMonthFilter === 'all' || p.month === historyMonthFilter)).sort((a, b) => b.month.localeCompare(a.month))
        , [payroll, selectedMemberId, historyMonthFilter]);
    
    const allMonths = useMemo(() => Array.from(new Set(payroll.filter(p => p.employeeId === selectedMemberId).map(p => p.month))).sort().reverse(), [payroll, selectedMemberId]);

    const ownerApprovalLists = useMemo(() => {
        const getName = (employeeId: string, fallback?: string) => {
            const m = members.find(m => m.id === employeeId || m.employeeId === employeeId || m.id === employeeId);
            return m?.name || fallback || employeeId;
        };
        const pending = payroll.filter(p => p.status === 'PENDING_APPROVAL').map(p => ({ id: p.id, name: getName(p.employeeId, p.employeeName), month: p.month }));
        const approved = payroll.filter(p => p.status === 'APPROVED' || p.status === 'PAID').map(p => ({ id: p.id, name: getName(p.employeeId, p.employeeName), month: p.month, status: p.status }));
        return { pending, approved };
    }, [payroll, members]);

    const [editComp, setEditComp] = useState<CompensationSettings>(memberCompensation);

    React.useEffect(() => {
        setEditComp(memberCompensation);
    }, [memberCompensation]);

    React.useEffect(() => {
        setProcessData({
            month: new Date().toISOString().slice(0, 7),
            baseSalary: memberCompensation.baseSalary || 0,
            mealAllowance: 0,
            commission: 0,
            bonus: 0,
            overtime: 0,
            damageCost: 0,
            mistakePenalty: 0,
            debtRepayment: 0,
            remainingDebt: 0,
            notes: ''
        });
    }, [memberCompensation, selectedMemberId]);

    const handleSaveComp = () => {
        onUpdateCompensation(editComp);
    };

    const [processData, setProcessData] = useState({
        month: new Date().toISOString().slice(0, 7),
        baseSalary: memberCompensation.baseSalary || 0,
        mealAllowance: 0,
        commission: 0,
        bonus: 0,
        overtime: 0,
        damageCost: 0,
        mistakePenalty: 0,
        debtRepayment: 0,
        remainingDebt: 0,
        notes: ''
    });

    // คำนวณวันลา APPROVED ของพนักงานที่เลือก ในเดือนประมวลผล (processData.month: YYYY-MM)
    const leaveDaysThisMonth = useMemo(() => {
        if (!selectedMember || !leaves || leaves.length === 0) return 0;
        const empKey = selectedMember.id;
        const empKey2 = (selectedMember as any).employeeId;
        const monthPrefix = processData.month; // 'YYYY-MM'
        const matched = leaves.filter(l => {
            if (l.status !== LeaveStatus.APPROVED) return false;
            const matchEmp = l.employeeId === empKey || l.employeeId === empKey2 || (l.employeeName && l.employeeName === selectedMember.name);
            if (!matchEmp) return false;
            return (l.startDate || '').startsWith(monthPrefix) || (l.endDate || '').startsWith(monthPrefix);
        });
        let totalDays = 0;
        matched.forEach(l => {
            const s = new Date(l.startDate);
            const e = new Date(l.endDate);
            if (isNaN(s.getTime()) || isNaN(e.getTime())) return;
            const diff = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
            totalDays += diff > 0 ? diff : 1;
        });
        return totalDays;
    }, [leaves, selectedMember, processData.month]);

    const leaveDeduction = useMemo(() => {
        const daily = (processData.baseSalary || 0) / 30;
        return Math.round(leaveDaysThisMonth * daily);
    }, [leaveDaysThisMonth, processData.baseSalary]);

    const totalIncome = useMemo(() =>
        processData.baseSalary + processData.mealAllowance + processData.commission + processData.bonus + processData.overtime,
        [processData]);

    const totalDeductions = useMemo(() =>
        processData.damageCost + processData.mistakePenalty + processData.debtRepayment + leaveDeduction,
        [processData, leaveDeduction]);

    const netPayable = useMemo(() => totalIncome - totalDeductions, [totalIncome, totalDeductions]);

    const handleProcess = () => {
        onProcessPayroll({
            employeeId: selectedMemberId,
            month: processData.month,
            baseSalary: processData.baseSalary,
            mealAllowance: processData.mealAllowance,
            commission: processData.commission,
            bonus: processData.bonus,
            overtime: processData.overtime,
            damageCost: processData.damageCost,
            mistakePenalty: processData.mistakePenalty,
            debtRepayment: processData.debtRepayment,
            remainingDebt: processData.remainingDebt,
            deductions: totalDeductions,
            netPayable: netPayable,
            status: 'PENDING_APPROVAL',
            notes: processData.notes
        });
        setActiveTab('HISTORY');
    };

    const numInput = (label: string, key: keyof typeof processData, color: 'green' | 'red' | 'default' = 'default') => {
        const borderColor = color === 'green' ? 'border-emerald-200 focus:ring-emerald-400' : color === 'red' ? 'border-red-200 focus:ring-red-400' : 'border-slate-200 focus:ring-slate-400';
        const labelColor = color === 'green' ? 'text-emerald-600' : color === 'red' ? 'text-red-500' : 'text-slate-500';
        const bgColor = color === 'green' ? 'bg-emerald-50' : color === 'red' ? 'bg-red-50' : 'bg-slate-50';
        return (
            <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest block ${labelColor}`}>{label}</label>
                <input
                    type="number"
                    value={(processData as any)[key]}
                    onChange={e => setProcessData(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                    className={`w-full px-4 py-3 ${bgColor} border ${borderColor} rounded-2xl font-black text-slate-900 focus:outline-none focus:ring-1 text-sm`}
                />
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                        {lang === Language.TH ? 'ระบบบริหารเงินเดือนและค่าตอบแทน' : 'Payroll & Compensation'}
                    </h2>
                    <p className="text-xs font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">
                        Enterprise Grade Financial Operations
                    </p>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('MANAGEMENT')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MANAGEMENT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                    >
                        {lang === Language.TH ? 'จัดการเงินเดือน' : 'Management'}
                    </button>
                    <button
                        onClick={() => setActiveTab('HISTORY')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'HISTORY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                    >
                        {lang === Language.TH ? 'ประวัติการเงิน' : 'History'}
                    </button>
                    <button
                        onClick={() => setActiveTab('PENALTIES')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'PENALTIES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                    >
                        รายงานความผิดพลาด
                    </button>
                </div>
            </div>

            {/* Employee Dropdown */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="w-full sm:w-64">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">เลือกพนักงาน</label>
                    <select
                        value={selectedMemberId}
                        onChange={e => setSelectedMemberId(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        {members.map(member => (
                            <option key={member.id} value={member.id}>{member.name} — {member.position}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <div className="flex flex-col space-y-8">
                    {activeTab === 'MANAGEMENT' ? (
                        <>
                            {/* Monthly Processing Form */}
                            <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                        ประมวลผลเงินเดือน — <span className="text-slate-400">{selectedMember?.name}</span>
                                    </h3>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">เดือนที่ประมวลผล</label>
                                        <input
                                            type="month"
                                            value={processData.month}
                                            onChange={e => setProcessData(prev => ({ ...prev, month: e.target.value }))}
                                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-black text-slate-900 text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Income Section */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">รายรับ</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {numInput('เงินเดือน (฿)', 'baseSalary', 'green')}
                                        {numInput('ค่าข้าว (฿)', 'mealAllowance', 'green')}
                                        {numInput('ค่าคอม (฿)', 'commission', 'green')}
                                        {numInput('โบนัส (฿)', 'bonus', 'green')}
                                        {numInput('OT (฿)', 'overtime', 'green')}
                                        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex flex-col justify-center">
                                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">รายรับรวม</p>
                                            <p className="text-2xl font-black text-emerald-700">฿{totalIncome.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Leave summary */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-2 h-6 bg-amber-500 rounded-full"></div>
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">วันหยุดเดือนนี้</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">🏖️ วันลาเดือนนี้ (อนุมัติแล้ว)</p>
                                            <p className="text-2xl font-black text-amber-700">{leaveDaysThisMonth} วัน</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <label className="text-[10px] font-black uppercase tracking-widest block text-slate-500">หักวันลา (฿)</label>
                                            <input type="number" readOnly value={leaveDeduction} className="w-full mt-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl font-black text-slate-900 text-sm cursor-not-allowed" />
                                            <p className="text-[9px] text-slate-400 mt-1">วันลา × ({(processData.baseSalary || 0).toLocaleString()} / 30)</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Deduction Section */}
                                <div className="mb-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-2 h-6 bg-red-500 rounded-full"></div>
                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">รายหัก</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {numInput('ยอดเสียหาย (฿)', 'damageCost', 'red')}
                                        {numInput('ทำงานผิดพลาด (฿)', 'mistakePenalty', 'red')}
                                        {numInput('หักหนี้ (฿)', 'debtRepayment', 'red')}
                                        {numInput('หนี้คงเหลือ (฿)', 'remainingDebt', 'red')}
                                        <div className="bg-red-50 rounded-2xl p-4 border border-red-100 flex flex-col justify-center">
                                            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">หักรวม (รวมหักวันลา)</p>
                                            <p className="text-2xl font-black text-red-600">฿{totalDeductions.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Summary + Save */}
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">สุทธิที่ต้องจ่าย</p>
                                        <p className={`text-5xl font-black tracking-tighter ${netPayable >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            ฿{netPayable.toLocaleString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleProcess}
                                        className="w-full md:w-auto px-12 py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center justify-center space-x-3"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>บันทึก</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : activeTab === 'HISTORY' ? (
                        /* History Tab */
                        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1">
                            <div className="p-10 border-b border-slate-50">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">ประวัติการจ่ายเงิน</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedMember?.name}</p>
                                  </div>
                                  {allMonths.length > 0 && (
                                    <select value={historyMonthFilter} onChange={e => setHistoryMonthFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500">
                                      <option value="all">ทุกเดือน</option>
                                      {allMonths.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                  )}
                                </div>
                            </div>
                            <div className="px-10 py-6 border-b border-slate-50 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">รออนุมัติ ({ownerApprovalLists.pending.length})</p>
                                    <div className="space-y-1 max-h-28 overflow-auto">
                                        {ownerApprovalLists.pending.length === 0 ? (
                                            <p className="text-xs text-amber-500">ไม่มีรายการ</p>
                                        ) : ownerApprovalLists.pending.map(item => (
                                            <p key={item.id} className="text-xs font-bold text-amber-700">• {item.name} · {item.month}</p>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">อนุมัติแล้ว/จ่ายแล้ว ({ownerApprovalLists.approved.length})</p>
                                    <div className="space-y-1 max-h-28 overflow-auto">
                                        {ownerApprovalLists.approved.length === 0 ? (
                                            <p className="text-xs text-emerald-500">ไม่มีรายการ</p>
                                        ) : ownerApprovalLists.approved.map(item => (
                                            <p key={item.id} className="text-xs font-bold text-emerald-700">• {item.name} · {item.month} · {item.status === 'PAID' ? 'จ่ายแล้ว' : 'อนุมัติแล้ว'}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50">
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="px-6 py-5">เดือน</th>
                                            <th className="px-6 py-5">รายรับรวม</th>
                                            <th className="px-6 py-5">หักรวม</th>
                                            <th className="px-6 py-5">สุทธิ</th>
                                            <th className="px-6 py-5">สถานะ</th>
                                            <th className="px-6 py-5">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {memberHistory.map(rec => {
                                            const income = (rec.baseSalary || 0) + (rec.mealAllowance || 0) + (rec.commission || 0) + (rec.bonus || 0) + (rec.overtime || 0);
                                            return (
                                                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-6 font-black text-slate-900 text-sm italic">{rec.month}</td>
                                                    <td className="px-6 py-6 font-black text-emerald-600 text-sm">฿{income.toLocaleString()}</td>
                                                    <td className="px-6 py-6 font-black text-red-500 text-sm">-฿{(rec.deductions || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-6 font-black text-slate-900 text-sm">฿{rec.netPayable.toLocaleString()}</td>
                                                    <td className="px-6 py-6">
                                                        <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                                                            rec.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 
                                                            rec.status === 'APPROVED' ? 'bg-blue-50 text-blue-600' :
                                                            rec.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-600' :
                                                            'bg-slate-50 text-slate-400'
                                                        }`}>
                                                            {rec.status === 'PAID' ? 'จ่ายแล้ว' : rec.status === 'APPROVED' ? 'อนุมัติแล้ว' : rec.status === 'PENDING_APPROVAL' ? 'รออนุมัติ' : 'แบบร่าง'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <div className="flex gap-2">
                                                            {rec.status === 'PENDING_APPROVAL' && onUpdatePayrollStatus && (
                                                                <>
                                                                    <button onClick={() => onUpdatePayrollStatus(rec.id, 'APPROVED')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black hover:bg-blue-700 transition-all">อนุมัติ</button>
                                                                    <button onClick={() => onUpdatePayrollStatus(rec.id, 'DRAFT')} className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-[9px] font-black hover:bg-slate-300 transition-all">ปฏิเสธ</button>
                                                                </>
                                                            )}
                                                            {rec.status === 'APPROVED' && onUpdatePayrollStatus && (
                                                                <button onClick={() => onUpdatePayrollStatus(rec.id, 'PAID')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black hover:bg-emerald-700 transition-all">จ่ายแล้ว</button>
                                                            )}
                                                            {rec.status === 'PAID' && <span className="text-[9px] text-slate-400">✓</span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {memberHistory.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-10 py-20 text-center text-slate-300 italic font-bold">ยังไม่มีข้อมูลการจ่ายเงิน</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : activeTab === 'PENALTIES' ? (
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-50">
                                <h3 className="text-xl font-black text-slate-900">รายงานความผิดพลาด — {selectedMember?.name}</h3>
                            </div>
                            
                            {/* Add multiple penalties form */}
                            <div className="p-6 bg-red-50/50 border-b border-slate-100 space-y-3">
                                {pendingPenalties.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                        <div className="sm:col-span-3">
                                            {idx === 0 && <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">วันที่</label>}
                                            <input type="date" value={row.date} onChange={e => setPendingPenalties(prev => prev.map((r, i) => i === idx ? {...r, date: e.target.value} : r))}
                                                className="w-full px-3 py-2.5 bg-white border border-red-200 rounded-xl text-sm font-bold focus:outline-none" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            {idx === 0 && <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">ยอดหัก (฿)</label>}
                                            <input type="number" value={row.amount || ''} onChange={e => setPendingPenalties(prev => prev.map((r, i) => i === idx ? {...r, amount: parseFloat(e.target.value) || 0} : r))}
                                                className="w-full px-3 py-2.5 bg-white border border-red-200 rounded-xl text-sm font-bold focus:outline-none" placeholder="0" />
                                        </div>
                                        <div className="sm:col-span-5">
                                            {idx === 0 && <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">สาเหตุที่หัก</label>}
                                            <input type="text" value={row.reason} onChange={e => setPendingPenalties(prev => prev.map((r, i) => i === idx ? {...r, reason: e.target.value} : r))}
                                                className="w-full px-3 py-2.5 bg-white border border-red-200 rounded-xl text-sm font-bold focus:outline-none" placeholder="ระบุสาเหตุ..." />
                                        </div>
                                        <div className="sm:col-span-2 flex gap-1">
                                            {pendingPenalties.length > 1 && (
                                                <button onClick={() => setPendingPenalties(prev => prev.filter((_, i) => i !== idx))}
                                                    className="px-3 py-2.5 bg-slate-200 text-slate-500 rounded-xl text-xs font-black hover:bg-slate-300">✕</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => setPendingPenalties(prev => [...prev, { date: new Date().toISOString().split('T')[0], amount: 0, reason: '' }])}
                                        className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-200 transition-all">
                                        + เพิ่มแถว
                                    </button>
                                    <button onClick={() => {
                                        const valid = pendingPenalties.filter(r => r.amount > 0 && r.reason);
                                        valid.forEach(r => onAddPenalty({ employeeId: selectedMemberId, ...r }));
                                        if (valid.length > 0) setPendingPenalties(emptyRows());
                                    }} className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all">
                                        บันทึกทั้งหมด ({pendingPenalties.filter(r => r.amount > 0 && r.reason).length} รายการ)
                                    </button>
                                </div>
                            </div>

                            {/* Penalty list */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50/50">
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="px-6 py-4 text-left">วันที่</th>
                                            <th className="px-6 py-4 text-right">ยอดหัก</th>
                                            <th className="px-6 py-4 text-left">สาเหตุ</th>
                                            <th className="px-6 py-4">ลบ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {penalties.filter(p => p.employeeId === selectedMemberId).sort((a, b) => a.date.localeCompare(b.date)).map(p => (
                                            <tr key={p.id} className="hover:bg-red-50/30">
                                                <td className="px-6 py-4 font-bold text-slate-700">{p.date}</td>
                                                <td className="px-6 py-4 font-black text-red-600 text-right">-฿{p.amount.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-slate-600">{p.reason}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => onDeletePenalty(p.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {penalties.filter(p => p.employeeId === selectedMemberId).length === 0 && (
                                            <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-300 italic">ยังไม่มีรายการ</td></tr>
                                        )}
                                    </tbody>
                                    {penalties.filter(p => p.employeeId === selectedMemberId).length > 0 && (
                                        <tfoot className="bg-red-50">
                                            <tr>
                                                <td className="px-6 py-4 font-black text-slate-700">รวม</td>
                                                <td className="px-6 py-4 font-black text-red-600 text-right">
                                                    -฿{penalties.filter(p => p.employeeId === selectedMemberId).reduce((s, p) => s + p.amount, 0).toLocaleString()}
                                                </td>
                                                <td colSpan={2} className="px-6 py-4 text-[10px] text-slate-400">
                                                    {penalties.filter(p => p.employeeId === selectedMemberId).length} รายการ
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default PayrollManager;
