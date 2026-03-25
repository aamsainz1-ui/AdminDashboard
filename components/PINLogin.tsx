import React, { useState } from 'react';
import { UserProfile, Language } from '../types';

interface PINLoginProps {
  users: UserProfile[];
  onLogin: (user: UserProfile) => void;
  lang: Language;
}

const PINLogin: React.FC<PINLoginProps> = ({ users, onLogin, lang }) => {
  const [userInput, setUserInput] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const q = userInput.trim();
    const qL = q.toLowerCase();
    const matched = users.find(u =>
      (u.id || '').toLowerCase() === qL ||
      (u.employeeId || '').toLowerCase() === qL ||
      (u.name || '').toLowerCase() === qL ||
      ((u as any).username || '').toLowerCase() === qL
    );

    if (!matched) {
      setError(lang === Language.TH ? 'ไม่พบผู้ใช้' : 'User not found');
      return;
    }

    if (String(matched.pin || '') !== String(pin)) {
      setError(lang === Language.TH ? 'รหัส PIN ไม่ถูกต้อง' : 'Incorrect PIN');
      return;
    }

    setError('');
    onLogin(matched);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-sm font-bold text-slate-500 mt-1">เข้าสู่ระบบ</p>
        </div>

      <form onSubmit={handleLogin} className="w-full bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">User</label>
          <input
            type="text"
            value={userInput}
            onChange={(e) => { setUserInput(e.target.value); setError(''); }}
            placeholder="กรอก user"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">PIN</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(''); }}
            placeholder="กรอก PIN"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-sm font-bold text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-black hover:bg-blue-700"
        >
          เข้าสู่ระบบ
        </button>
      </form>
      </div>
    </div>
  );
};

export default PINLogin;
