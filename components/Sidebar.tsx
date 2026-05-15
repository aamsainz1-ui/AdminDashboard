import React, { useState } from 'react';
import { UserProfile, UserRole, Language, RolePermissions } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile;
  lang: Language;
  rolePermissions?: RolePermissions;
  notifications?: Record<string, number>;
}

const Icon: React.FC<{ path: string }> = ({ path }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, lang, rolePermissions, notifications = {} }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const isAdmin = user.role === UserRole.ADMIN;

  const hasPermission = (key: string) => {
    if (isAdmin) return true;
    if (!rolePermissions) return true;
    const permissions = rolePermissions[user.role];
    if (!permissions) return true;
    return permissions.includes(key as any);
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: lang === Language.TH ? 'แดชบอร์ด' : 'Dashboard',
      icon: <Icon path="M3 13.125C3 12.504 3.504 12 4.125 12h3.75c.621 0 1.125.504 1.125 1.125v6.75C9 20.496 8.496 21 7.875 21h-3.75A1.125 1.125 0 013 19.875v-6.75zM9.75 4.125C9.75 3.504 10.254 3 10.875 3h3.75c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-3.75a1.125 1.125 0 01-1.125-1.125V4.125zM16.5 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z" />
    },
    {
      id: 'payroll',
      label: lang === Language.TH ? 'เงินเดือน' : 'Payroll',
      icon: <Icon path="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.407 2.67 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.407-2.67-1" />
    },
    {
      id: 'organization',
      label: lang === Language.TH ? 'พนักงาน' : 'Employees',
      icon: <Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    },
    {
      id: 'teams',
      label: lang === Language.TH ? 'ทีม' : 'Teams',
      icon: <Icon path="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.75v-.032m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 9.094 9.094 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0z" />
    },
    {
      id: 'permissions',
      label: lang === Language.TH ? 'สิทธิ์' : 'Permissions',
      icon: <Icon path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    },
    {
      id: 'announcements',
      label: lang === Language.TH ? 'ประกาศ' : 'Announcements',
      icon: <Icon path="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    },
    {
      id: 'tasks',
      label: lang === Language.TH ? 'งาน' : 'Tasks',
      icon: <Icon path="M9 5h6M9 3h6a2 2 0 012 2v1h1.5A1.5 1.5 0 0120 7.5v12A1.5 1.5 0 0118.5 21h-13A1.5 1.5 0 014 19.5v-12A1.5 1.5 0 015.5 6H7V5a2 2 0 012-2zm-2 9l2 2 4-4m-6 5h8" />
    },
    {
      id: 'finance',
      label: lang === Language.TH ? 'การเงิน' : 'Finance',
      icon: <Icon path="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.407 2.67 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.407-2.67-1M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
    },
    {
      id: 'cashbook',
      label: lang === Language.TH ? 'รายรับรายจ่าย' : 'Cashbook',
      icon: <Icon path="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    },
    {
      id: 'linebc',
      label: lang === Language.TH ? 'LINE บอร์ดแคส' : 'LINE Broadcast',
      icon: <Icon path="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    },
    {
      id: 'accounts',
      label: lang === Language.TH ? 'Accounts' : 'Accounts',
      icon: <Icon path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    },
    {
      id: 'brain',
      label: lang === Language.TH ? 'Brain Dump' : 'Brain Dump',
      icon: <Icon path="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    },
    {
      id: 'admin',
      label: lang === Language.TH ? 'คอนโซล' : 'Console',
      icon: <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    },
  ];

  const filteredItems = menuItems.filter(item => hasPermission(item.id));

  const renderMenuButton = (item: typeof menuItems[number], compact = false) => (
    <button
      key={item.id}
      onClick={() => {
        setActiveTab(item.id);
        setShowMoreMenu(false);
      }}
      className={compact
        ? `flex flex-col items-center p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`
        : `w-full flex items-center space-x-4 px-5 py-4 rounded-[1.5rem] font-black transition-all duration-300 group ${activeTab === item.id ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20 scale-105' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`
      }
    >
      <span className={compact ? '' : `${activeTab === item.id ? 'text-indigo-400' : 'text-slate-300 group-hover:text-slate-900'}`}>
        {item.icon}
      </span>
      <span className={compact ? 'text-[10px] mt-1 font-medium' : 'text-xs uppercase tracking-widest'}>{item.label}</span>
      {!compact && (notifications[item.id] || 0) > 0 && (
        <span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {notifications[item.id]}
        </span>
      )}
    </button>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 h-screen sticky top-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-10">
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
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-4">เมนูแอดมิน</p>
            <nav className="space-y-2">
              {filteredItems.map(item => renderMenuButton(item))}
            </nav>
          </div>
        </div>

        <div className="flex-shrink-0 p-8 border-t border-slate-50">
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

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-1 py-1 z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center">
          {filteredItems.slice(0, 4).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center px-1 py-1.5 min-w-[48px] min-h-[48px] transition-all duration-200 ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'}`}
            >
              <div className={`p-1 rounded-lg transition-all ${activeTab === item.id ? 'bg-indigo-50' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[9px] mt-0.5 font-medium">{item.label}</span>
              {(notifications[item.id] || 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {notifications[item.id]}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center px-1 py-1.5 min-w-[48px] min-h-[48px] transition-all ${showMoreMenu ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <div className={`p-1 rounded-lg ${showMoreMenu ? 'bg-indigo-50' : ''}`}>
              <Icon path="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </div>
            <span className="text-[9px] mt-0.5 font-medium">เพิ่มเติม</span>
          </button>
        </div>
      </nav>

      {showMoreMenu && (
        <div className="lg:hidden fixed inset-0 z-[150]" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-16 left-2 right-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3" onClick={event => event.stopPropagation()}>
            <div className="grid grid-cols-3 gap-2">
              {filteredItems.slice(4).map(item => renderMenuButton(item, true))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
