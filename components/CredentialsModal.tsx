import React, { useEffect, useMemo, useState } from 'react';
import { OrganizationMember, Language } from '../types';

interface CredentialsModalProps {
  member: OrganizationMember;
  lang: Language;
  onClose: () => void;
}

interface CredData {
  username: string;
  password: string;
  updatedAt: number;
}

const STORAGE_KEY = 'admin_dashboard_credentials_v1';

const sanitize = (name: string) => {
  // normalize Thai/EN — fallback to user
  const ascii = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
  return ascii ? ascii.slice(0, 10) : 'user';
};

const randomPassword = () => {
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const all = lower + upper + digits + symbols;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  let pwd = pick(lower) + pick(upper) + pick(digits) + pick(symbols);
  for (let i = 0; i < 6; i++) pwd += pick(all);
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
};

const readStore = (): Record<string, CredData> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch (_) {
    return {};
  }
};

const writeStore = (store: Record<string, CredData>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (_) {}
};

const ensureCred = (member: OrganizationMember): CredData => {
  const store = readStore();
  if (store[member.id]) return store[member.id];
  const cred: CredData = {
    username: `staff_${sanitize(member.name)}${member.id.slice(-3)}`,
    password: randomPassword(),
    updatedAt: Date.now(),
  };
  store[member.id] = cred;
  writeStore(store);
  return cred;
};

const CredentialsModal: React.FC<CredentialsModalProps> = ({ member, lang, onClose }) => {
  const [cred, setCred] = useState<CredData>(() => ensureCred(member));
  const [showPw, setShowPw] = useState(false);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  useEffect(() => {
    setCred(ensureCred(member));
  }, [member.id]);

  const tlabel = useMemo(() => ({
    title: lang === Language.TH ? '🔑 ข้อมูลเข้าระบบ' : '🔑 Credentials',
    username: lang === Language.TH ? 'ชื่อผู้ใช้' : 'Username',
    password: lang === Language.TH ? 'รหัสผ่าน' : 'Password',
    regenerate: lang === Language.TH ? 'สุ่มรหัสใหม่' : 'Regenerate',
    copy: lang === Language.TH ? 'คัดลอก' : 'Copy',
    copied: lang === Language.TH ? 'คัดลอกแล้ว ✓' : 'Copied ✓',
    show: lang === Language.TH ? 'แสดง' : 'Show',
    hide: lang === Language.TH ? 'ซ่อน' : 'Hide',
    updated: lang === Language.TH ? 'อัพเดต' : 'Updated',
    close: lang === Language.TH ? 'ปิด' : 'Close',
    warn: lang === Language.TH ? 'เก็บข้อมูลนี้ไว้เป็นความลับเสมอ' : 'Keep these credentials confidential.',
  }), [lang]);

  const handleRegenerate = () => {
    const next: CredData = { ...cred, password: randomPassword(), updatedAt: Date.now() };
    const store = readStore();
    store[member.id] = next;
    writeStore(store);
    setCred(next);
    setShowPw(true);
  };

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyHint(label);
      setTimeout(() => setCopyHint(null), 1500);
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{tlabel.title}</h3>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mt-2">{member.name}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{tlabel.username}</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl font-mono text-sm font-bold text-slate-900 break-all">{cred.username}</code>
              <button onClick={() => handleCopy('username', cred.username)} className="px-3 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition">
                {copyHint === 'username' ? tlabel.copied : tlabel.copy}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{tlabel.password}</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl font-mono text-sm font-bold text-slate-900 break-all">
                {showPw ? cred.password : '•'.repeat(Math.min(cred.password.length, 12))}
              </code>
              <button onClick={() => setShowPw(s => !s)} className="px-3 py-3 bg-slate-100 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition">
                {showPw ? tlabel.hide : tlabel.show}
              </button>
              <button onClick={() => handleCopy('password', cred.password)} className="px-3 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition">
                {copyHint === 'password' ? tlabel.copied : tlabel.copy}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
            <p className="text-[10px] font-bold text-slate-400">{tlabel.updated}: {new Date(cred.updatedAt).toLocaleString(lang === Language.TH ? 'th-TH' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            <button onClick={handleRegenerate} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition shadow-lg shadow-blue-600/20">
              ♻ {tlabel.regenerate}
            </button>
          </div>

          <div className="mt-4 px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl">
            <p className="text-[11px] font-bold text-amber-700">⚠ {tlabel.warn}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CredentialsModal;
