
import React from 'react';
import { UserProfile, UserRole, Language } from '../types';

interface HeaderProps {
  user: UserProfile;
  onToggleRole?: () => void;
  lang: Language;
  onToggleLang: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onToggleRole, lang, onToggleLang }) => {
  const isAdmin = user.role === UserRole.ADMIN;

  return (
    <header className="glass-effect border-b border-white/20 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="lg:hidden flex items-center space-x-2">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">GlobalWork</h1>
        </div>

        <div className="hidden lg:flex items-center space-x-6">
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.25em]">{lang === Language.TH ? 'แอดมิน แดชบอร์ด' : 'Admin Dashboard'}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Administration Console</p>
          </div>
          {isAdmin && (
            <span className="bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
              ADMINISTRATOR
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 sm:space-x-6">
          <button
            onClick={onToggleLang}
            className="flex items-center space-x-2 px-4 py-2 bg-white/50 border border-slate-200 rounded-2xl hover:bg-white transition-all shadow-sm group"
          >
            <span className={`text-[10px] font-black transition-colors ${lang === Language.TH ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>TH</span>
            <div className="w-px h-3 bg-slate-200"></div>
            <span className={`text-[10px] font-black transition-colors ${lang === Language.EN ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>EN</span>
          </button>

          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

          <button
            onClick={onToggleRole}
            className="flex items-center space-x-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-900 text-white rounded-xl sm:rounded-2xl transition-all shadow-lg shadow-slate-900/10 active:scale-95 text-[9px] sm:text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
          >
            {lang === Language.TH ? 'ออกจากระบบ' : 'Logout'}
          </button>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 leading-none">{user.name}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{user.department}</p>
            </div>
            <div className="relative group cursor-pointer">
              <img
                src={user.avatar}
                alt={user.name}
                className={`w-12 h-12 rounded-2xl border-2 shadow-xl object-cover transition-transform group-hover:scale-105 ${isAdmin ? 'border-indigo-500' : 'border-white'}`}
              />
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${isAdmin ? 'bg-indigo-600' : 'bg-green-500'} shadow-sm`}></div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

