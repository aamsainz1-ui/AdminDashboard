import React, { useState } from 'react';
import { UserProfile, UserRole, Language, RolePermissions } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile;
  lang: Language;
  rolePermissions?: RolePermissions;
  notifications?: Record<string, number>; // e.g. { leave: 2, payroll: 1 }
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, lang, rolePermissions, notifications = {} }) => {
  const isAdmin = user.role === UserRole.ADMIN;

  const hasPermission = (key: string) => {
    if (isAdmin) return true;
    if (!rolePermissions) return true;
    const perms = rolePermissions[user.role];
    if (!perms) return true;
    return perms.includes(key);
  };
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const menuItems = [
    {
      id: 'dashboard', label: lang === Language.TH ? 'แดชบอร์ด' : 'Dashboard', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'payroll', label: lang === Language.TH ? 'เงินเดือน' : 'Payroll', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.407 2.67 1a2.4 2.4 0 01.33 0M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.407-2.67-1a2.4 2.4 0 01-.33 0" />
        </svg>
      )
    },
    {
      id: 'announcements', label: lang === Language.TH ? 'ประกาศ' : 'Announcements', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      )
    },
    {
      id: 'organization', label: lang === Language.TH ? 'จัดการพนักงาน' : 'Employees', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'permissions', label: lang === Language.TH ? 'ตั้งค่าสิทธิ์' : 'Permissions', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
      id: 'profile', label: lang === Language.TH ? 'โปรไฟล์' : 'Profile', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'admin', label: lang === Language.TH ? 'ตั้งค่าระบบ' : 'Settings', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
  ];

  const filteredItems = menuItems.filter(item => hasPermission(item.id));

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 h-screen sticky top-0 overflow-hidden">
        <div className="p-10">
          <div className="flex items-center space-x-4 mb-14">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-xl shadow-indigo-600/20 rotate-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Admin</h1>
              <p className="text-[8px] font-black text-indigo-600 uppercase tracking-[0.4em]">Dashboard</p>
            </div>
          </div>

          <div className="mb-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-4">เมนู</p>
            <nav className="space-y-2">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-4 px-5 py-4 rounded-[1.5rem] font-black transition-all duration-300 group ${
                    activeTab === item.id
                      ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20 scale-105'
                      : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className={`${activeTab === item.id ? 'text-indigo-400' : 'text-slate-300 group-hover:text-slate-900'}`}>
                    {item.icon}
                  </span>
                  <span className="text-xs uppercase tracking-widest">{item.label}</span>
                  {(notifications[item.id] || 0) > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{notifications[item.id]}</span>
                  )}
                  {(notifications[item.id] || 0) < 0 && (
                    <span className="ml-auto bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">✓</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-auto p-8 border-t border-slate-50">
          <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="relative">
              <img src={user.avatar} alt="" className="w-10 h-10 rounded-xl object-cover border-2 border-slate-50" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-indigo-500 border-2 border-white rounded-full" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-slate-900 truncate">{user.name}</p>
              <p className="text-[8px] text-indigo-600 font-black uppercase tracking-widest truncate">ADMINISTRATOR</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-1 py-1 z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center">
          {filteredItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center px-1 py-1.5 min-w-[48px] min-h-[48px] transition-all duration-200 ${
                activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <div className={`p-1 rounded-lg transition-all ${activeTab === item.id ? 'bg-indigo-50' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[9px] mt-0.5 font-medium">{item.label}</span>
              {(notifications[item.id] || 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">{notifications[item.id]}</span>
              )}
              {(notifications[item.id] || 0) < 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">✓</span>
              )}
            </button>
          ))}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center px-1 py-1.5 min-w-[48px] min-h-[48px] transition-all ${showMoreMenu ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <div className={`p-1 rounded-lg ${showMoreMenu ? 'bg-indigo-50' : ''}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-[9px] mt-0.5 font-medium">เพิ่มเติม</span>
          </button>
        </div>
      </nav>

      {/* More menu popup */}
      {showMoreMenu && (
        <div className="lg:hidden fixed inset-0 z-[150]" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-16 left-2 right-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3" onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-3 gap-2">
              {filteredItems.slice(4).map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setShowMoreMenu(false); }}
                  className={`flex flex-col items-center p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {item.icon}
                  <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
