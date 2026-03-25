
import React, { useMemo } from 'react';
import { UserProfile, AttendanceRecord, LeaveRecord, AttendanceType, Language } from '../types';

interface ProfileProps {
  user: UserProfile;
  records: AttendanceRecord[];
  leaves: LeaveRecord[];
  lang: Language;
  onResetFaceID: () => void;
  onUpdateDisplayName?: (name: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, records, leaves, lang, onResetFaceID, onUpdateDisplayName }) => {
  const [displayName, setDisplayName] = React.useState(user.name || '');
  const [nameSaved, setNameSaved] = React.useState(false);
  const stats = useMemo(() => {
    const now = new Date();
    
    // คำนวณวันเริ่มต้นของสัปดาห์นี้ (วันจันทร์)
    const getMonday = (d: Date) => {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return monday.getTime();
    };
    const startOfWeek = getMonday(new Date(now));

    // จัดกลุ่มประวัติเป็นกะการทำงาน (Check-in คู่กับ Check-out)
    const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
    const shifts: { start: number, end: number }[] = [];
    
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].type === AttendanceType.CHECK_IN && sorted[i + 1].type === AttendanceType.CHECK_OUT) {
        shifts.push({ start: sorted[i].timestamp, end: sorted[i + 1].timestamp });
      }
    }

    // คำนวณชั่วโมงรายสัปดาห์
    const weeklyMs = shifts
      .filter(s => s.start >= startOfWeek)
      .reduce((acc, s) => acc + (s.end - s.start), 0);

    // คำนวณชั่วโมงรายเดือน
    const monthlyMs = shifts
      .filter(s => {
        const d = new Date(s.start);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, s) => acc + (s.end - s.start), 0);

    const workedDays = new Set(records
      .filter(r => {
        const d = new Date(r.timestamp);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .map(r => new Date(r.timestamp).toDateString())
    ).size;

    return {
      weeklyHours: (weeklyMs / 3600000).toFixed(1),
      monthlyHours: (monthlyMs / 3600000).toFixed(1),
      workedDays,
      approvedLeaves: leaves.filter(l => l.status === 'APPROVED').length
    };
  }, [records, leaves]);

  const handleResetFaceID = () => {
    const confirmMsg = lang === Language.TH 
      ? "คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ต Face ID? คุณจะต้องลงทะเบียนใบหน้าใหม่ในการเข้างานครั้งถัดไป" 
      : "Are you sure you want to reset your Face ID? You will need to re-register your face on your next clock-in.";
    
    if (window.confirm(confirmMsg)) {
      onResetFaceID();
    }
  };

  const t = {
    officialBadge: lang === Language.TH ? 'พนักงานระดับทางการ' : 'Official Employee',
    empId: lang === Language.TH ? 'รหัสพนักงาน' : 'Employee ID',
    joinDate: lang === Language.TH ? 'วันที่เริ่มงาน' : 'Join Date',
    weeklyHours: lang === Language.TH ? 'ชั่วโมงงานสัปดาห์นี้' : 'Hours This Week',
    monthlyHours: lang === Language.TH ? 'ชั่วโมงงานเดือนนี้' : 'Hours This Month',
    workedDays: lang === Language.TH ? 'วันที่มาทำงาน' : 'Worked Days',
    leaveCount: lang === Language.TH ? 'จำนวนวันลา' : 'Leave Count',
    leaveQuota: lang === Language.TH ? 'โควตาวันลาประจำปี' : 'Annual Leave Quota',
    securitySettings: lang === Language.TH ? 'ความปลอดภัยและการตั้งค่า' : 'Security & Settings',
    resetFaceID: lang === Language.TH ? 'รีเซ็ตข้อมูลใบหน้า (Face ID)' : 'Reset Face ID Registration',
    faceRegistered: lang === Language.TH ? 'ลงทะเบียนแล้ว' : 'Biometric Registered',
    faceNotRegistered: lang === Language.TH ? 'ยังไม่ได้ลงทะเบียน' : 'Not Registered'
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 sm:p-8 hidden sm:block">
           <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-blue-100">
             {t.officialBadge}
           </span>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-8">
          <div className="relative">
            <img src={user.avatar} alt={user.name} className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl border-4 border-slate-50 shadow-lg object-cover" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 bg-green-500 border-4 border-white rounded-full"></div>
          </div>
          
          <div className="flex-1 text-center sm:text-left space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{displayName || user.name}</h2>
            <p className="text-blue-600 font-bold tracking-wide uppercase text-[10px] sm:text-xs">{user.position} • {user.department}</p>
            {onUpdateDisplayName && (
              <div className="flex items-center gap-2 mt-2">
                <input type="text" value={displayName} onChange={e => { setDisplayName(e.target.value); setNameSaved(false); }} placeholder="ชื่อที่แสดง" className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 w-40" />
                <button onClick={() => { onUpdateDisplayName(displayName); setNameSaved(true); setTimeout(() => setNameSaved(false), 2000); }} className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-black hover:bg-blue-700 transition-all">{nameSaved ? '✓ บันทึกแล้ว' : 'บันทึก'}</button>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mt-6 sm:mt-8 pt-6 border-t border-slate-100">
              <div>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.empId}</p>
                <p className="font-mono text-xs sm:text-sm font-bold text-slate-700">{user.employeeId}</p>
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.joinDate}</p>
                <p className="font-mono text-xs sm:text-sm font-bold text-slate-700">{user.joinDate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard label={t.weeklyHours} value={`${stats.weeklyHours} ชม.`} sub={lang === Language.TH ? "ผลสรุปรายสัปดาห์" : "Weekly summary"} color="text-indigo-600" />
        <StatCard label={t.monthlyHours} value={`${stats.monthlyHours} ชม.`} sub={lang === Language.TH ? "เวลารวมปฏิบัติงาน" : "Total worked"} color="text-blue-600" />
        <StatCard label={t.workedDays} value={`${stats.workedDays} วัน`} sub={lang === Language.TH ? "การเข้างานเดือนนี้" : "Worked this month"} color="text-slate-800" />
        <StatCard label={t.leaveCount} value={`${stats.approvedLeaves} ครั้ง`} sub={lang === Language.TH ? "อนุมัติเรียบร้อย" : "Approved leaves"} color="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-6 sm:mb-8 flex items-center">
             {t.leaveQuota}
          </h3>
          <div className="space-y-6">
            <LeaveQuota label={lang === Language.TH ? "ลาป่วย" : "Sick Leave"} used={15 - user.leaveBalances.sick} total={15} color="bg-red-500" lang={lang} />
            <LeaveQuota label={lang === Language.TH ? "ลาพักร้อน" : "Annual Leave"} used={10 - user.leaveBalances.annual} total={10} color="bg-blue-500" lang={lang} />
            <LeaveQuota label={lang === Language.TH ? "ลากิจ" : "Personal Leave"} used={5 - user.leaveBalances.personal} total={5} color="bg-emerald-500" lang={lang} />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-6 sm:mb-8">
            {t.securitySettings}
          </h3>
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{lang === Language.TH ? 'เปลี่ยน PIN' : 'Change PIN'}</p>
                  <p className="text-[10px] font-bold text-slate-400">{lang === Language.TH ? 'รหัสสำหรับล็อกอินเข้าระบบ' : 'Login PIN code'}</p>
                </div>
              </div>
              
              <div className="space-y-3" id="change-pin-form">
                <input
                  type="password"
                  placeholder={lang === Language.TH ? 'PIN ปัจจุบัน' : 'Current PIN'}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  id="current-pin"
                />
                <input
                  type="password"
                  placeholder={lang === Language.TH ? 'PIN ใหม่' : 'New PIN'}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  id="new-pin"
                />
                <input
                  type="password"
                  placeholder={lang === Language.TH ? 'ยืนยัน PIN ใหม่' : 'Confirm New PIN'}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  id="confirm-pin"
                />
                <button
                  onClick={() => {
                    const current = (document.getElementById('current-pin') as HTMLInputElement)?.value;
                    const newPin = (document.getElementById('new-pin') as HTMLInputElement)?.value;
                    const confirm = (document.getElementById('confirm-pin') as HTMLInputElement)?.value;
                    if (!current || !newPin || !confirm) { alert(lang === Language.TH ? 'กรุณากรอกให้ครบ' : 'Please fill all fields'); return; }
                    if (current !== user.pin) { alert(lang === Language.TH ? 'PIN ปัจจุบันไม่ถูกต้อง' : 'Current PIN is incorrect'); return; }
                    if (newPin !== confirm) { alert(lang === Language.TH ? 'PIN ใหม่ไม่ตรงกัน' : 'New PINs do not match'); return; }
                    if (newPin.length < 4) { alert(lang === Language.TH ? 'PIN ต้องมีอย่างน้อย 4 หลัก' : 'PIN must be at least 4 digits'); return; }
                    // Update PIN via parent
                    const updatedUser = { ...user, pin: newPin };
                    localStorage.setItem('admin_dashboard_v1_data', JSON.stringify({
                      ...JSON.parse(localStorage.getItem('admin_dashboard_v1_data') || '{}'),
                      users: JSON.parse(localStorage.getItem('admin_dashboard_v1_data') || '{}').users?.map((u: any) => u.id === user.id ? { ...u, pin: newPin } : u)
                    }));
                    alert(lang === Language.TH ? 'เปลี่ยน PIN สำเร็จ! กรุณาล็อกอินใหม่' : 'PIN changed! Please re-login');
                    window.location.reload();
                  }}
                  className="w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
                >
                  {lang === Language.TH ? 'เปลี่ยน PIN' : 'Change PIN'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string | number, sub: string, color: string }> = ({ label, value, sub, color }) => (
  <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 group hover:border-blue-200 transition-colors">
    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-2xl sm:text-3xl font-black ${color}`}>{value}</p>
    <p className="text-[10px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2 font-medium">{sub}</p>
  </div>
);

const LeaveQuota: React.FC<{ label: string, used: number, total: number, color: string, lang: Language }> = ({ label, used, total, color, lang }) => {
  const percentage = Math.min(100, (used / total) * 100);
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex justify-between items-end">
        <p className="text-xs sm:text-sm font-bold text-slate-700">{label}</p>
        <p className="text-[10px] sm:text-xs font-bold text-slate-400">{lang === Language.TH ? `ใช้ไป ${used} / ${total} วัน` : `Used ${used} / ${total} Days`}</p>
      </div>
      <div className="w-full bg-slate-100 h-2.5 sm:h-3 rounded-full overflow-hidden">
        <div className={`${color} h-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
      </div>
      <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">{lang === Language.TH ? 'รีเซ็ตทุก 12 เดือน' : 'Resets every 12 months'}</p>
    </div>
  );
};

export default Profile;

