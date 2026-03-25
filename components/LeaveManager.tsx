
import React, { useState } from 'react';
import { LeaveRecord, LeaveType, UserProfile, LeaveStatus, Language } from '../types';

interface LeaveManagerProps {
  leaves: LeaveRecord[];
  onRequest: (leave: Omit<LeaveRecord, 'id' | 'status' | 'requestedAt'>) => void;
  user: UserProfile;
  // Added lang prop to fix TS error in App.tsx
  lang: Language;
}

const LeaveManager: React.FC<LeaveManagerProps> = ({ leaves, onRequest, user, lang }) => {
  const [formData, setFormData] = useState({
    type: LeaveType.ANNUAL,
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if(!formData.startDate || !formData.endDate || !formData.reason) {
      setError(lang === Language.TH ? "กรุณากรอกข้อมูลให้ครบทุกช่อง" : "Please fill in all fields");
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (end < start) {
      setError(lang === Language.TH ? "วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่มต้น" : "End date cannot be before start date");
      return;
    }

    onRequest(formData);
    setFormData({ type: LeaveType.ANNUAL, startDate: '', endDate: '', reason: '' });
  };

  const leaveLabels = {
    [LeaveType.SICK]: lang === Language.TH ? 'ลาป่วย' : 'Sick Leave',
    [LeaveType.ANNUAL]: lang === Language.TH ? 'ลาพักร้อน' : 'Annual Leave',
    [LeaveType.PERSONAL]: lang === Language.TH ? 'ลากิจ' : 'Personal Leave',
    [LeaveType.OTHER]: lang === Language.TH ? 'อื่นๆ' : 'Other'
  };

  const statusLabels = {
    [LeaveStatus.PENDING]: lang === Language.TH ? 'รออนุมัติ' : 'Pending',
    [LeaveStatus.APPROVED]: lang === Language.TH ? 'อนุมัติแล้ว' : 'Approved',
    [LeaveStatus.REJECTED]: lang === Language.TH ? 'ปฏิเสธ' : 'Rejected'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Leave Form Section */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <h2 className="text-xl font-black text-slate-900 mb-6 tracking-tight flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {lang === Language.TH ? 'สร้างคำขอลาหยุด' : 'Create Leave Request'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold animate-shake">
                {error}
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">
                {lang === Language.TH ? 'ประเภทการลา' : 'Leave Type'}
              </label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as LeaveType})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
              >
                {Object.values(LeaveType).map(t => <option key={t} value={t}>{leaveLabels[t]}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">
                  {lang === Language.TH ? 'ตั้งแต่วันที่' : 'From Date'}
                </label>
                <input 
                  type="date" 
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">
                  {lang === Language.TH ? 'ถึงวันที่' : 'To Date'}
                </label>
                <input 
                  type="date" 
                  value={formData.endDate}
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10" 
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">
                {lang === Language.TH ? 'เหตุผลประกอบการลา' : 'Reason'}
              </label>
              <textarea 
                rows={3}
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
                placeholder={lang === Language.TH ? "ระบุรายละเอียด..." : "Details..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/10 resize-none"
              ></textarea>
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all">
              {lang === Language.TH ? 'ยื่นคำขออนุมัติ' : 'Submit Request'}
            </button>
          </form>
        </div>

        <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              {lang === Language.TH ? 'สิทธิการลาคงเหลือ' : 'Remaining Leave Quota'}
            </p>
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <span className="text-xs font-bold">{lang === Language.TH ? 'ลาป่วย' : 'Sick'}</span>
                 <span className="text-sm font-black text-blue-400">{user.leaveBalances.sick} {lang === Language.TH ? 'วัน' : 'Days'}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-xs font-bold">{lang === Language.TH ? 'ลาพักร้อน' : 'Annual'}</span>
                 <span className="text-sm font-black text-emerald-400">{user.leaveBalances.annual} {lang === Language.TH ? 'วัน' : 'Days'}</span>
               </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-blue-600/10 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Leave History Section */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden h-full">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {lang === Language.TH ? 'ประวัติและสถานะการลา' : 'Leave Status & History'}
            </h2>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-200">{leaves.length}</span>
          </div>
          
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[500px]">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-5">{lang === Language.TH ? 'ประเภท' : 'Type'}</th>
                  <th className="px-6 py-5">{lang === Language.TH ? 'ช่วงวันที่' : 'Period'}</th>
                  <th className="px-6 py-5">{lang === Language.TH ? 'สถานะ' : 'Status'}</th>
                  <th className="px-6 py-5">{lang === Language.TH ? 'วันที่ยื่น' : 'Requested'}</th>
                  <th className="px-6 py-5 text-right">{lang === Language.TH ? 'วันที่อนุมัติ' : 'Approved'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                      {lang === Language.TH ? 'ไม่พบข้อมูลการลาในระบบ' : 'No leave records found'}
                    </td>
                  </tr>
                ) : leaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center">
                        <div className={`w-1.5 h-6 rounded-full mr-3 ${getTypeColor(leave.type)}`}></div>
                        <span className="text-xs font-black tracking-widest text-slate-800 uppercase">{leaveLabels[leave.type]}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-slate-900">{formatShortDate(leave.startDate, lang)} - {formatShortDate(leave.endDate, lang)}</p>
                      <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[150px] font-medium">{leave.reason}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border shadow-sm inline-block ${getStatusStyle(leave.status)}`}>
                        {statusLabels[leave.status]}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {(leave as any).createdAt 
                          ? new Date((leave as any).createdAt).toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', { day: '2-digit', month: 'short' }) + ' ' + new Date((leave as any).createdAt).toLocaleTimeString(lang === Language.TH ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                          : '-'
                        }
                      </span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <span className={`text-[10px] font-mono font-bold ${(leave as any).approvedAt ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {(leave as any).approvedAt 
                          ? new Date((leave as any).approvedAt).toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', { day: '2-digit', month: 'short' }) + ' ' + new Date((leave as any).approvedAt).toLocaleTimeString(lang === Language.TH ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                          : leave.status === LeaveStatus.PENDING ? (lang === Language.TH ? 'รอดำเนินการ' : 'Pending') : '-'
                        }
                      </span>
                    </td>
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

const formatShortDate = (dateStr: string, lang: Language) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', { day: '2-digit', month: 'short' });
};

const getTypeColor = (type: LeaveType) => {
  switch(type) {
    case LeaveType.SICK: return 'bg-red-500';
    case LeaveType.ANNUAL: return 'bg-emerald-500';
    case LeaveType.PERSONAL: return 'bg-blue-500';
    default: return 'bg-slate-400';
  }
};

const getStatusStyle = (status: LeaveStatus) => {
  switch(status) {
    case LeaveStatus.APPROVED: return 'bg-green-50 text-green-700 border-green-100';
    case LeaveStatus.REJECTED: return 'bg-red-50 text-red-700 border-red-100';
    default: return 'bg-amber-50 text-amber-600 border-amber-100';
  }
};

export default LeaveManager;

