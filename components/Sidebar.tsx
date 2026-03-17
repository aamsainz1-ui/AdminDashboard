
import React from 'react';
import { UserProfile, UserRole, Language, RolePermissions } from '../types';
import { filterMenuByPermissions } from '../utils/permissions';

interface SidebarProps {
  activeTab: 'dashboard' | 'history' | 'leave' | 'profile' | 'organization' | 'announcements' | 'admin' | 'calendar' | 'mkt' | 'payroll' | 'permissions' | 'teams';
  setActiveTab: (tab: 'dashboard' | 'history' | 'leave' | 'profile' | 'organization' | 'announcements' | 'admin' | 'calendar' | 'mkt' | 'payroll' | 'permissions' | 'teams') => void;
  user: UserProfile;
  lang: Language;
  rolePermissions?: RolePermissions;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, lang, rolePermissions }) => {
  const isAdmin = user.role === UserRole.ADMIN;

  const menuItems = [
    {
      id: 'dashboard', label: lang === Language.TH ? 'แดชบอร์ด' : 'Dashboard', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'organization', label: lang === Language.TH ? 'รายชื่อทีม' : 'Directory', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'leave', label: lang === Language.TH ? 'ลางาน' : 'Leave', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'history', label: lang === Language.TH ? 'ประวัติ' : 'History', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'announcements', label: lang === Language.TH ? 'ข่าวสาร' : 'News', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      )
    },
    {
      id: 'calendar', label: lang === Language.TH ? 'ปฏิทินการตลาด' : 'Marketing', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      id: 'mkt', label: lang === Language.TH ? 'MKT Dashboard' : 'MKT Dashboard', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'payroll', label: lang === Language.TH ? 'ระบบเงินเดือน' : 'Payroll', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.407 2.67 1a2.4 2.4 0 01.33 0M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.407-2.67-1a2.4 2.4 0 01-.33 0" />
        </svg>
      )
    },
    ...(isAdmin ? [{
      id: 'permissions', label: lang === Language.TH ? 'จัดการสิทธิ์' : 'Permissions', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    }] : []),
  ];

  return (
    <>
      <aside className="hidden lg:flex flex-col w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 h-screen sticky top-0 overflow-hidden">
        <div className="p-10">
          <div className="flex items-center space-x-4 mb-14">
            <div className="bg-blue-600 p-2.5 rounded-2xl shadow-xl shadow-blue-600/20 rotate-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter">GlobalWork</h1>
              <p className="text-[8px] font-black text-blue-600 uppercase tracking-[0.4em]">Pro Edition</p>
            </div>
          </div>

          <div className="mb-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-4">Navigation</p>
            <nav className="space-y-2">
              {filterMenuByPermissions(menuItems, user.role, rolePermissions).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center space-x-4 px-5 py-4 rounded-[1.5rem] font-black transition-all duration-300 group ${activeTab === item.id
                    ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20 scale-105'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <span className={`${activeTab === item.id ? 'text-blue-400' : 'text-slate-300 group-hover:text-slate-900'}`}>
                    {item.icon}
                  </span>
                  <span className="text-xs uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 px-4">Operations</p>
              <button
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center space-x-4 px-5 py-4 rounded-[1.5rem] font-black transition-all duration-300 group ${activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 scale-105'
                  : 'text-indigo-400 hover:bg-indigo-50'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xs uppercase tracking-widest">Admin Hub</span>
              </button>

              <button
                onClick={() => setActiveTab('payroll')}
                className={`w-full flex items-center space-x-4 px-5 py-4 rounded-[1.5rem] font-black transition-all duration-300 group ${activeTab === 'payroll'
                  ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-600/20 scale-105'
                  : 'text-emerald-400 hover:bg-emerald-50'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.407 2.67 1a2.4 2.4 0 01.33 0M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.407-2.67-1a2.4 2.4 0 01-.33 0" />
                </svg>
                <span className="text-xs uppercase tracking-widest">{lang === Language.TH ? 'ระบบเงินเดือน' : 'Payroll Hub'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-auto p-8 border-t border-slate-50">
          <div
            className="flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-all active:scale-95"
            onClick={() => setActiveTab('profile')}
          >
            <div className="relative">
              <img src={user.avatar} alt="" className="w-10 h-10 rounded-xl object-cover border-2 border-slate-50" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-slate-900 truncate">{user.name}</p>
              <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest truncate">{isAdmin ? 'SYSTEM ADMIN' : user.position}</p>
            </div>
          </div>
        </div>
      </aside>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-effect border-t border-white/40 px-2 py-3 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[2.5rem] overflow-x-auto">
        <div className="flex justify-start items-center space-x-1 min-w-max px-2">
          {(isAdmin
            ? [
              menuItems[0], // Dashboard
              menuItems[3], // History
              menuItems[1], // Organization
              menuItems[2], // Leave
              menuItems[5], // Calendar/Marketing
              menuItems[4], // Announcements
              {
                id: 'admin', label: 'Admin Hub', icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )
              },
              menuItems[6], // Payroll
              {
                id: 'permissions', label: 'Permissions', icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )
              }
            ]
            : [
              menuItems[0], // Dashboard
              menuItems[3], // History
              menuItems[2], // Leave
              menuItems[5], // Marketing
              menuItems[4], // News
            ]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center px-3 py-2 transition-all duration-300 ${activeTab === item.id ? 'text-blue-600 scale-110 -translate-y-1' : 'text-slate-400'
                }`}
              title={item.label}
            >
              <div className={`p-2 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-600/10 shadow-inner' : ''}`}>
                {item.icon}
              </div>
            </button>
          ))}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex justify-center px-3 py-2 transition-all ${activeTab === 'profile' ? 'scale-125 -translate-y-2' : 'hover:scale-110'}`}
            title="Profile"
          >
            <img src={user.avatar} className={`w-9 h-9 rounded-xl border-2 shadow-lg ${activeTab === 'profile' ? 'border-blue-600 ring-4 ring-blue-50' : 'border-white'}`} alt="" />
          </button>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;

