
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import {
  SystemSettings,
  Language,
  LeaveRecord,
  LeaveStatus,
  AttendanceRecord,
  AttendanceType,
  OrganizationMember,
  UserRole,
  Announcement
} from '../types';
import MapPicker from './MapPicker.tsx';

interface AdminConsoleProps {
  leaves: LeaveRecord[];
  onApprove: (id: string, status: LeaveStatus) => void;
  members: OrganizationMember[];
  lang: Language;
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
  onCreateMember: (member: Partial<OrganizationMember> & { pin: string, role: string }) => void;
  onUpdateMember: (id: string, data: any) => void;
  allRecordsMap: Record<string, AttendanceRecord[]>;
  announcements: Announcement[];
  onAddAnnouncement: (data: Omit<Announcement, 'id'>) => void;
  onDeleteAnnouncement: (id: string) => void;
}

const AdminConsole: React.FC<AdminConsoleProps> = ({
  leaves,
  onApprove,
  members,
  lang,
  settings,
  onUpdateSettings,
  onCreateMember,
  onUpdateMember,
  allRecordsMap,
  announcements,
  onAddAnnouncement,
  onDeleteAnnouncement
}) => {
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newLoc, setNewLoc] = useState({ name: '', lat: 13.7563, lng: 100.5018, radius: 150 });
  const [newMember, setNewMember] = useState({ name: '', position: '', department: '', email: '', pin: '', role: 'EMPLOYEE' });
  const [newRoleName, setNewRoleName] = useState('');
  const [exportUser, setExportUser] = useState<'ALL' | string>('ALL');
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [newA, setNewA] = useState({ title: '', content: '', author: 'Admin', category: 'GENERAL', date: new Date().toISOString().split('T')[0] });
  const [showAddShift, setShowAddShift] = useState(false);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [showLoginLogs, setShowLoginLogs] = useState(false);

  useEffect(() => {
    if (showLoginLogs && supabase) {
      supabase.from('login_logs').select('*').order('logged_in_at', { ascending: false }).limit(100)
        .then(({ data }) => { if (data) setLoginLogs(data); });
    }
  }, [showLoginLogs]);
  const [newShift, setNewShift] = useState({ name: '', startTime: '09:00', endTime: '18:00' });

  const stats = {
    pendingRequests: leaves.filter(l => l.status === LeaveStatus.PENDING).length,
    activeCount: members.filter(m => {
      const recs = allRecordsMap[m.id] || [];
      const last = recs[recs.length - 1];
      return last?.type === AttendanceType.CHECK_IN;
    }).length,
    leaveCount: members.filter(m => m.status === 'ON_LEAVE').length
  };

  const leaveLabels = {
    [LeaveStatus.PENDING]: lang === Language.TH ? 'รออนุมัติ' : 'Pending',
    [LeaveStatus.APPROVED]: lang === Language.TH ? 'อนุมัติแล้ว' : 'Approved',
    [LeaveStatus.REJECTED]: lang === Language.TH ? 'ปฏิเสธ' : 'Rejected'
  };

  const t = {
    title: lang === Language.TH ? 'ระบบควมคุมกลาง' : 'Admin Operations',
    subTitle: lang === Language.TH ? 'แผงควบคุมการบริหารจัดการองค์กร' : 'Strategic Infrastructure Command',
    pendingLabel: lang === Language.TH ? 'คำขอที่รออยู่' : 'Pending Requests',
    activeLabel: lang === Language.TH ? 'พนักงานประจำการ' : 'Active Duty',
    onLeaveLabel: lang === Language.TH ? 'กำลังลางาน' : 'Currently on Leave',
    settingsTitle: lang === Language.TH ? 'ตั้งค่าระบบหลัก' : 'Core Configuration',
    locationTitle: lang === Language.TH ? 'พื้นที่ปักหมุดอาคาร' : 'Office Deployment Hub',
    workStartTimes: lang === Language.TH ? 'เวลาเริ่มงาน (กะการทำงาน)' : 'Standard Operating Shifts',
    lateThreshold: lang === Language.TH ? 'เกณฑ์การมาสาย (นาที)' : 'Late Threshold (Minutes)',
    pendingTitle: lang === Language.TH ? 'รายการลางานที่รออนุมัติ' : 'Pending Leave Authorization',
    staffCol: lang === Language.TH ? 'พนักงาน' : 'Staff Member',
    typeCol: lang === Language.TH ? 'รูปแบบ' : 'Category',
    manageCol: lang === Language.TH ? 'ดำเนินการ' : 'Authorize',
    noRequests: lang === Language.TH ? 'ไม่มีรายการที่รอการอนุมัติ' : 'No operational requests pending',
    addLocation: lang === Language.TH ? 'เพิ่มสถานที่' : 'Add Location',
    addMember: lang === Language.TH ? 'เพิ่มพนักงานใหม่' : 'Add New Employee',
    rolesTitle: lang === Language.TH ? 'จัดการบทบาท (Roles)' : 'Role Management',
    addRole: lang === Language.TH ? 'เพิ่มบทบาท' : 'Add Role',
    roleLabel: lang === Language.TH ? 'บทบาท' : 'Role',
    leaveQuotaTitle: lang === Language.TH ? 'จัดการโควตาวันลา' : 'Leave Quota Management',
    quotaSick: lang === Language.TH ? 'ป่วย' : 'Sick',
    quotaAnnual: lang === Language.TH ? 'พักร้อน' : 'Annual',
    quotaPersonal: lang === Language.TH ? 'กิจ' : 'Prsnl',
    announcementTitle: lang === Language.TH ? 'จัดการประกาศ' : 'Announcement Management',
    addAnnouncement: lang === Language.TH ? 'สร้างประกาศใหม่' : 'Create Announcement'
  };

  const handleAddLocation = () => {
    if (!newLoc.name) return;
    const loc = {
      id: Date.now().toString(),
      name: newLoc.name,
      latitude: newLoc.lat,
      longitude: newLoc.lng,
      radius: newLoc.radius
    };
    onUpdateSettings({
      ...settings,
      officeLocations: [...(settings.officeLocations || []), loc]
    });
    setNewLoc({ name: '', lat: 13.7563, lng: 100.5018, radius: 150 });
    setShowAddLocation(false);
  };

  const handleAddMember = () => {
    if (!newMember.name || !newMember.pin) return;
    onCreateMember(newMember);
    setNewMember({ name: '', position: '', department: '', email: '', pin: '', role: 'EMPLOYEE' });
    setShowAddMember(false);
  };

  const handleAddRole = () => {
    const roleName = newRoleName.trim().toUpperCase();
    if (!roleName || settings.availableRoles.includes(roleName)) return;
    onUpdateSettings({
      ...settings,
      availableRoles: [...settings.availableRoles, roleName]
    });
    setNewRoleName('');
  };

  const handleRemoveRole = (role: string) => {
    if (role === UserRole.ADMIN || role === UserRole.EMPLOYEE) return;
    onUpdateSettings({
      ...settings,
      availableRoles: settings.availableRoles.filter(r => r !== role)
    });
  };

  const calculateDuration = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleAddShift = () => {
    if (!newShift.name || !newShift.startTime || !newShift.endTime) return;
    onUpdateSettings({
      ...settings,
      workStartTimes: [...(settings.workStartTimes || []), { ...newShift }]
    });
    setShowAddShift(false);
    setNewShift({ name: '', startTime: '09:00', endTime: '18:00' });
  };

  const [showMapPicker, setShowMapPicker] = useState(false);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setNewLoc({ ...newLoc, lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, (err) => {
        alert(lang === Language.TH ? "ไม่สามารถดึงตำแหน่งได้" : "Could not get current location");
      });
    }
  };

  const handleExport = () => {
    const headers = [
      lang === Language.TH ? "ชื่อพนักงาน" : "Employee Name",
      lang === Language.TH ? "ประเภท" : "Type",
      lang === Language.TH ? "สถานะมาสาย" : "Late Status",
      lang === Language.TH ? "วันที่" : "Date",
      lang === Language.TH ? "เวลา" : "Time",
      lang === Language.TH ? "สถานที่" : "Location",
      lang === Language.TH ? "หมายเหตุ" : "Notes",
      lang === Language.TH ? "พิกัด" : "Coords",
      lang === Language.TH ? "เขตเวลา" : "Timezone"
    ];

    let queryMembers = exportUser === 'ALL' ? members : members.filter(m => m.id === exportUser);

    const rows: string[][] = [];
    queryMembers.forEach(m => {
      const records = allRecordsMap[m.id] || [];
      records.forEach(r => {
        rows.push([
          m.name, // Employee Name
          r.type === AttendanceType.CHECK_IN ? (lang === Language.TH ? "เข้างาน" : "Check-in") : (lang === Language.TH ? "ออกงาน" : "Check-out"),
          "N/A", // Late status needs more logic usually or just showing record info
          new Date(r.timestamp).toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US'),
          new Date(r.timestamp).toLocaleTimeString(lang === Language.TH ? 'th-TH' : 'en-US'),
          r.location?.address || "N/A",
          r.notes || "",
          `${r.location?.latitude || ''}, ${r.location?.longitude || ''}`,
          r.timezone
        ]);
      });
    });

    const csvContent = "\ufeff" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GW_Admin_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleCreateAnnouncement = () => {
    if (!newA.title || !newA.content) return;
    onAddAnnouncement(newA as any);
    setShowAddAnnouncement(false);
    setNewA({ title: '', content: '', author: 'Admin', category: 'GENERAL', date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{t.title}</h2>
          <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em] mt-2">{t.subTitle}</p>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
          title={t.addMember}
        >
          {t.addMember}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden group">
          <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">{t.pendingLabel}</p>
          <p className="text-5xl font-black tracking-tighter">{stats.pendingRequests}</p>
          <div className="mt-6 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all duration-1000 shadow-[0_0_10px_white]" style={{ width: `${Math.min(100, (stats.pendingRequests / 10) * 100)}%` }}></div>
          </div>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.activeLabel}</p>
            <p className="text-5xl font-black text-slate-900 tracking-tighter">{stats.activeCount}</p>
          </div>
          <div className="mt-6 flex items-center text-[10px] text-emerald-500 font-black uppercase tracking-widest">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
            {lang === Language.TH ? 'กำลังปฏิบัติงาน' : 'Live Operations'}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.onLeaveLabel}</p>
            <p className="text-5xl font-black text-slate-900 tracking-tighter">{stats.leaveCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-black text-slate-900">{lang === Language.TH ? 'ส่งออกข้อมูลรายงาน' : 'Export Reports'}</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{lang === Language.TH ? 'ระบบประมวลผลข้อมูลพนักงานทั้งหมด' : 'Comprehensive Data Export Hub'}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <select
            value={exportUser}
            onChange={(e) => setExportUser(e.target.value)}
            className="w-full sm:w-64 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none"
            title="Select Member to Export"
          >
            <option value="ALL">{lang === Language.TH ? 'พนักงานทุกคน' : 'All Employees'}</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/10 active:scale-95 flex items-center justify-center space-x-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{lang === Language.TH ? 'ส่งออกไฟล์ EXCEL' : 'Export EXCEL'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-10 space-y-8">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.settingsTitle}</h3>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t.lateThreshold}</label>
              <input
                type="number"
                value={settings.lateThresholdMinute}
                onChange={e => onUpdateSettings({ ...settings, lateThresholdMinute: parseInt(e.target.value) || 0 })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:outline-none"
                title={t.lateThreshold}
              />
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-black text-slate-900">{lang === Language.TH ? 'เวลาเข้างานแต่ละกะ' : 'Work Start Times'}</h4>
                <button
                  onClick={() => setShowAddShift(true)}
                  className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700"
                >
                  + {lang === Language.TH ? 'เพิ่มกะ' : 'Add Shift'}
                </button>
              </div>
              <div className="space-y-3">
                {(settings.workStartTimes || []).map((shift, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {typeof shift === 'string' ? `${lang === Language.TH ? 'กะที่' : 'Shift'} ${idx + 1}` : shift.name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">
                        {typeof shift === 'string'
                          ? `${lang === Language.TH ? 'เวลาเข้างาน:' : 'Start:'} ${shift}`
                          : `${lang === Language.TH ? 'เวลาเข้างาน:' : 'Start:'} ${shift.startTime} | ${lang === Language.TH ? 'เลิกงาน:' : 'End:'} ${shift.endTime}`
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ ...settings, workStartTimes: settings.workStartTimes.filter((_, i) => i !== idx) })}
                      className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove Shift"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Location section removed for admin dashboard */}

            <div className="space-y-4 pt-6 border-t border-slate-50">
              <h4 className="text-lg font-black text-slate-900">{t.rolesTitle}</h4>
              <div className="flex gap-2">
                <input
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder={t.addRole}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-sm focus:outline-none"
                  title={t.addRole}
                />
                <button onClick={handleAddRole} className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                  {t.addRole}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(settings.availableRoles || []).map(role => (
                  <div key={role} className="flex items-center bg-white border border-slate-200 px-3 py-1.5 rounded-xl group shadow-sm">
                    <span className="text-[10px] font-black text-slate-600 mr-2">{role}</span>
                    {role !== UserRole.ADMIN && role !== UserRole.EMPLOYEE && (
                      <button onClick={() => handleRemoveRole(role)} className="text-slate-300 hover:text-red-500 transition-colors" title="Remove Role">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-50">
              <h4 className="text-lg font-black text-slate-900">{t.leaveQuotaTitle}</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {members.map(member => (
                  <div key={member.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-900">{member.name}</span>
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{member.position}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t.quotaSick}</label>
                        <input
                          type="number"
                          value={(member as any).leaveBalances?.sick || 0}
                          onChange={e => onUpdateMember(member.id, { leaveBalances: { ...((member as any).leaveBalances || {}), sick: parseInt(e.target.value) || 0 } })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                          title={t.quotaSick}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t.quotaAnnual}</label>
                        <input
                          type="number"
                          value={(member as any).leaveBalances?.annual || 0}
                          onChange={e => onUpdateMember(member.id, { leaveBalances: { ...((member as any).leaveBalances || {}), annual: parseInt(e.target.value) || 0 } })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                          title={t.quotaAnnual}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t.quotaPersonal}</label>
                        <input
                          type="number"
                          value={(member as any).leaveBalances?.personal || 0}
                          onChange={e => onUpdateMember(member.id, { leaveBalances: { ...((member as any).leaveBalances || {}), personal: parseInt(e.target.value) || 0 } })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                          title={t.quotaPersonal}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-black text-slate-900">{t.announcementTitle}</h4>
                <button
                  onClick={() => setShowAddAnnouncement(true)}
                  className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700"
                >
                  + {t.addAnnouncement}
                </button>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                {announcements.map(a => (
                  <div key={a.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-black text-slate-900 truncate">{a.title}</p>
                      <p className="text-[10px] font-bold text-slate-400">{a.date} • {a.category}</p>
                    </div>
                    <button
                      onClick={() => onDeleteAnnouncement(a.id)}
                      className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete Announcement"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <p className="text-center py-4 text-xs font-bold text-slate-400 italic">No announcements posted</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-10 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.pendingTitle}</h3>
            {stats.pendingRequests > 0 && (
              <span className="bg-red-50 text-red-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-red-100">
                {stats.pendingRequests} Urgent
              </span>
            )}
          </div>
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="px-10 py-5">{t.staffCol}</th>
                  <th className="px-10 py-5">{t.typeCol}</th>
                  <th className="px-10 py-5 text-center">{t.manageCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leaves.filter(l => l.status === LeaveStatus.PENDING).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-10 py-24 text-center text-slate-400 font-bold italic text-sm">{t.noRequests}</td>
                  </tr>
                ) : leaves.filter(l => l.status === LeaveStatus.PENDING).map((leave) => {
                  const duration = calculateDuration(leave.startDate, leave.endDate);
                  const leaveLabelsInternal = {
                    'SICK': lang === Language.TH ? 'ป่วย' : 'Sick',
                    'ANNUAL': lang === Language.TH ? 'พักร้อน' : 'Annual',
                    'PERSONAL': lang === Language.TH ? 'กิจ' : 'Personal',
                    'OTHER': lang === Language.TH ? 'อื่นๆ' : 'Other'
                  };
                  return (
                    <tr key={leave.id} className="hover:bg-slate-50/30 transition-all duration-300 group">
                      <td className="px-10 py-8">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">
                            {leave.employeeName?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{leave.employeeName || 'Identity'}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{leave.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-md bg-slate-900 text-white uppercase tracking-widest mb-1 inline-block">
                          {leaveLabelsInternal[leave.type as keyof typeof leaveLabelsInternal] || leave.type}
                        </span>
                        <p className="text-xs text-slate-500 font-medium italic">{duration} days</p>
                      </td>
                      <td className="px-10 py-8 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button onClick={() => onApprove(leave.id, LeaveStatus.APPROVED)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" title="Approve"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></button>
                          <button onClick={() => onApprove(leave.id, LeaveStatus.REJECTED)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Reject"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MKT section removed for admin dashboard */}

      {showAddLocation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8">{t.addLocation}</h3>
            <div className="space-y-6">
              <input value={newLoc.name} onChange={e => setNewLoc({ ...newLoc, name: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" placeholder="Name" title="Name" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Latitude</label>
                  <input type="number" step="any" value={newLoc.lat} onChange={e => setNewLoc({ ...newLoc, lat: parseFloat(e.target.value) })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm" title="Lat" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Longitude</label>
                  <input type="number" step="any" value={newLoc.lng} onChange={e => setNewLoc({ ...newLoc, lng: parseFloat(e.target.value) })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm" title="Lng" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleGetCurrentLocation}
                  className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span>{lang === Language.TH ? 'ตำแหน่งปัจจุบัน' : 'Current GPS'}</span>
                </button>
                <button
                  onClick={() => setShowMapPicker(true)}
                  className="flex-1 py-4 bg-indigo-50 text-indigo-600 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.723A2 2 0 013 15.483V4.517a2 2 0 011.553-1.943L9 2l6 3 5.447-2.723A2 2 0 0123 4.517v10.966a2 2 0 01-1.553 1.943L15 20l-6-3z" /></svg>
                  <span>{lang === Language.TH ? 'เลือกจากแผนที่' : 'Pick on Map'}</span>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Radius (meters)</label>
                <input type="number" value={newLoc.radius} onChange={e => setNewLoc({ ...newLoc, radius: parseInt(e.target.value) })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm" placeholder="Radius (m)" title="Radius" />
              </div>
              <div className="flex space-x-4 pt-4">
                <button onClick={() => setShowAddLocation(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                <button onClick={handleAddLocation} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">Add Office</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddMember && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8">{t.addMember}</h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <input value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} className="col-span-2 w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" placeholder="Name" title="Name" />
              <input value={newMember.position} onChange={e => setNewMember({ ...newMember, position: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" placeholder="Position" title="Position" />
              <input value={newMember.department} onChange={e => setNewMember({ ...newMember, department: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" placeholder="Department" title="Department" />
              <input value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" placeholder="Email" title="Email" />
              <input type="password" value={newMember.pin} onChange={e => setNewMember({ ...newMember, pin: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" placeholder="PIN" title="PIN" />
              <select value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" title="Role">
                {settings.availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex space-x-4">
              <button onClick={() => setShowAddMember(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
              <button onClick={handleAddMember} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">Create</button>
            </div>
          </div>
        </div>
      )}

      {showAddAnnouncement && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8">{t.addAnnouncement}</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Title</label>
                <input value={newA.title} onChange={e => setNewA({ ...newA, title: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" placeholder="Announcement Title" title="Title" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Content</label>
                <textarea value={newA.content} onChange={e => setNewA({ ...newA, content: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold min-h-[120px]" placeholder="Content..." title="Content" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Category</label>
                  <select value={newA.category} onChange={e => setNewA({ ...newA, category: e.target.value as any })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" title="Category">
                    <option value="GENERAL">GENERAL</option>
                    <option value="POLICY">POLICY</option>
                    <option value="EVENT">EVENT</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Author</label>
                  <input value={newA.author} onChange={e => setNewA({ ...newA, author: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" placeholder="Author" title="Author" />
                </div>
              </div>
              <div className="flex space-x-4 pt-4">
                <button onClick={() => setShowAddAnnouncement(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                <button onClick={handleCreateAnnouncement} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">Post</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMapPicker && (
        <MapPicker
          initialLat={newLoc.lat}
          initialLng={newLoc.lng}
          onLocationSelect={(lat, lng) => {
            setNewLoc({ ...newLoc, lat, lng });
          }}
          onClose={() => setShowMapPicker(false)}
          lang={lang}
        />
      )}

      {/* Add Shift Popup */}
      {showAddShift && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-10 relative">
            <button
              onClick={() => {
                setShowAddShift(false);
                setNewShift({ name: '', startTime: '09:00', endTime: '18:00' });
              }}
              className="absolute top-6 right-6 text-slate-300 hover:text-slate-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-2xl font-black text-slate-900 mb-6">{lang === Language.TH ? 'เพิ่มกะทำงาน' : 'Add Work Shift'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  {lang === Language.TH ? 'ชื่อกะ' : 'Shift Name'}
                </label>
                <input
                  type="text"
                  value={newShift.name}
                  onChange={e => setNewShift({ ...newShift, name: e.target.value })}
                  placeholder={lang === Language.TH ? 'เช่น กะเช้า, กะเย็น' : 'e.g. Morning, Evening'}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  title={lang === Language.TH ? 'ชื่อกะ' : 'Shift Name'}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  {lang === Language.TH ? 'เวลาเข้างาน' : 'Start Time'}
                </label>
                <input
                  type="time"
                  value={newShift.startTime}
                  onChange={e => setNewShift({ ...newShift, startTime: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  title={lang === Language.TH ? 'เวลาเข้างาน' : 'Start Time'}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  {lang === Language.TH ? 'เวลาเลิกงาน' : 'End Time'}
                </label>
                <input
                  type="time"
                  value={newShift.endTime}
                  onChange={e => setNewShift({ ...newShift, endTime: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  title={lang === Language.TH ? 'เวลาเลิกงาน' : 'End Time'}
                />
              </div>
              <button
                onClick={handleAddShift}
                className="w-full bg-indigo-600 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl active:scale-95"
              >
                {lang === Language.TH ? 'เพิ่มกะ' : 'Add Shift'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Login History */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <button
          onClick={() => setShowLoginLogs(!showLoginLogs)}
          className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-lg font-black">🔐</div>
            <div className="text-left">
              <h3 className="text-sm font-black text-slate-800">{lang === Language.TH ? 'ประวัติการเข้าสู่ระบบ' : 'Login History'}</h3>
              <p className="text-[10px] font-bold text-slate-400">{lang === Language.TH ? 'ตรวจสอบการ Login ของพนักงาน' : 'Monitor employee login activity'}</p>
            </div>
          </div>
          <span className="text-slate-400 text-xl">{showLoginLogs ? '▲' : '▼'}</span>
        </button>
        {showLoginLogs && (
          <div className="px-6 pb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal">ชื่อ</th>
                    <th className="text-left px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal">Role</th>
                    <th className="text-left px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal">เวลา</th>
                    <th className="text-left px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal">IP</th>
                    <th className="text-left px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal">อุปกรณ์</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLogs.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-6 text-slate-400 text-sm">ไม่มีข้อมูล</td></tr>
                  ) : loginLogs.map((log, idx) => {
                    const d = new Date(log.logged_in_at);
                    const timeStr = d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                    const device = (log.device || '').includes('Mobile') ? '📱 Mobile' : '💻 Desktop';
                    return (
                      <tr key={log.id || idx} className={`border-b border-slate-50 ${idx % 2 === 0 ? 'bg-slate-50/30' : ''}`}>
                        <td className="px-3 py-3 font-bold text-slate-800">{log.user_name}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${log.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {log.role}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600 text-xs font-bold">{timeStr}</td>
                        <td className="px-3 py-3 text-slate-500 text-xs font-mono">{log.ip_address || '-'}</td>
                        <td className="px-3 py-3 text-slate-500 text-xs">{device}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminConsole;
