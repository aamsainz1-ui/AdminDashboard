
import React, { useState } from 'react';
import { OrganizationMember, Language, Team, UserProfile } from '../types';
import TeamManagement from './TeamManagement';

interface OrganizationProps {
  members: OrganizationMember[];
  isAdmin?: boolean;
  lang: Language;
  onUpdateMember?: (userId: string, data: any) => void;
  onDeleteMember?: (userId: string) => void;
  availableRoles: string[];
  teams?: Team[];
  allUsers?: UserProfile[];
  onCreateTeam?: (teamData: Omit<Team, 'id' | 'createdAt'>) => void;
  onDeleteTeam?: (teamId: string) => void;
  onUpdateTeam?: (teamId: string, updates: Partial<Team>) => void;
  onAssignMemberToTeam?: (memberId: string, teamId: string | null) => void;
}

const Organization: React.FC<OrganizationProps> = ({
  members,
  isAdmin,
  lang,
  onUpdateMember,
  onDeleteMember,
  availableRoles,
  teams = [],
  allUsers = [],
  onCreateTeam,
  onDeleteTeam,
  onUpdateTeam,
  onAssignMemberToTeam
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'teams'>('members');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditClick = (member: OrganizationMember) => {
    setEditingId(member.id);
    const userRole = (member as any).role || 'EMPLOYEE';
    setEditForm({
      name: member.name,
      position: member.position,
      department: member.department,
      pin: '',
      role: userRole,
      leaveBalances: { ...(member as any).leaveBalances || { sick: 15, annual: 15, personal: 7 } }
    });
  };

  const handleSave = () => {
    if (editingId && onUpdateMember) {
      onUpdateMember(editingId, editForm);
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 sm:p-10 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                {lang === Language.TH ? 'จัดการองค์กร' : 'Organization Management'}
              </h2>
              <p className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mt-2">Operational Human Resources</p>
            </div>

            {/* Tabs */}
            {isAdmin && (
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button
                  onClick={() => setActiveTab('members')}
                  className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'members'
                    ? 'bg-white text-slate-900 shadow-lg'
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {lang === Language.TH ? 'พนักงานทั้งหมด' : 'All Members'}
                </button>
                <button
                  onClick={() => setActiveTab('teams')}
                  className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'teams'
                    ? 'bg-white text-slate-900 shadow-lg'
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {lang === Language.TH ? 'จัดการทีม' : 'Manage Teams'}
                </button>
              </div>
            )}
          </div>

          {/* Search - only show for members tab */}
          {activeTab === 'members' && (
            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder={lang === Language.TH ? 'ค้นหาตามชื่อ หรือ แผนก...' : 'Filter by name or department...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-bold outline-none focus:ring-8 focus:ring-blue-600/5 focus:border-blue-600/20 transition-all shadow-inner"
              />
              <svg className="w-5 h-5 text-slate-300 absolute left-6 top-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'teams' && isAdmin && onCreateTeam && onDeleteTeam && onUpdateTeam && onAssignMemberToTeam ? (
        <TeamManagement
          teams={teams}
          members={allUsers}
          lang={lang}
          onCreateTeam={onCreateTeam}
          onDeleteTeam={onDeleteTeam}
          onUpdateTeam={onUpdateTeam}
          onAssignMemberToTeam={onAssignMemberToTeam}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(member => (
            <div key={member.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500 group relative overflow-hidden hover:-translate-y-2">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 group-hover:bg-blue-600 transition-colors"></div>

              {isAdmin && (
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button
                    onClick={() => handleEditClick(member)}
                    className="p-2 bg-slate-900 text-white rounded-xl shadow-lg hover:scale-110 transition-transform"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              )}

              {editingId === member.id ? (
                <div className="space-y-4 pt-4">
                  <input className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Name" />
                  <input className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm" value={editForm.position} onChange={e => setEditForm({ ...editForm, position: e.target.value })} placeholder="Position" />
                  <input className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm" value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} placeholder="Department" />
                  <input className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm" type="password" value={editForm.pin} onChange={e => setEditForm({ ...editForm, pin: e.target.value })} placeholder="New PIN (optional)" />
                  <select
                    className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm"
                    value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                    title="Role"
                  >
                    {(availableRoles || []).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Sick</label>
                      <input type="number" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm" value={editForm.leaveBalances.sick} onChange={e => setEditForm({ ...editForm, leaveBalances: { ...editForm.leaveBalances, sick: parseInt(e.target.value) || 0 } })} title="Sick Leave" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Annual</label>
                      <input type="number" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm" value={editForm.leaveBalances.annual} onChange={e => setEditForm({ ...editForm, leaveBalances: { ...editForm.leaveBalances, annual: parseInt(e.target.value) || 0 } })} title="Annual Leave" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Prsnl</label>
                      <input type="number" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm" value={editForm.leaveBalances.personal} onChange={e => setEditForm({ ...editForm, leaveBalances: { ...editForm.leaveBalances, personal: parseInt(e.target.value) || 0 } })} title="Personal Leave" />
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest">{lang === Language.TH ? 'บันทึก' : 'Save'}</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-100 text-slate-400 py-3 rounded-xl font-black text-xs uppercase tracking-widest">{lang === Language.TH ? 'ยกเลิก' : 'Cancel'}</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-xl group-hover:scale-110 transition-transform duration-500">
                      <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                    </div>
                    <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-white shadow-md ${member.status === 'ACTIVE' ? 'bg-green-500' :
                      member.status === 'ON_LEAVE' ? 'bg-amber-500' : 'bg-slate-300'
                      }`}></div>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">{member.name}</h3>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-2">{member.position}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 mb-6">{member.department}</p>

                  <div className="w-full pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex flex-col items-start">
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{lang === Language.TH ? 'อีเมลทางการ' : 'Corporate Email'}</p>
                      <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{member.email}</span>
                    </div>
                    {isAdmin && onUpdateMember && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(member)}
                          className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center active:scale-90"
                          title={lang === Language.TH ? 'แก้ไข' : 'Edit'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {onDeleteMember && member.id !== 'usr_owner' && (
                          <button
                            onClick={() => onDeleteMember(member.id)}
                            className="w-10 h-10 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center active:scale-90"
                            title={lang === Language.TH ? 'ลบ' : 'Delete'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Organization;

