import React, { useEffect, useMemo, useState } from 'react';
import { OrganizationMember, Language } from '../types';

interface ShiftCalendarProps {
  members: OrganizationMember[];
  lang: Language;
}

type ShiftType = 'day' | 'night' | 'leave';

interface DayShifts {
  day: string[];
  night: string[];
  leave: string[];
}

type ShiftStore = Record<string, DayShifts>; // key: YYYY-MM-DD

const STORAGE_KEY = 'admin_dashboard_shifts_v1';

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7'];

const colorFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

const initialFor = (name: string) => {
  const n = (name || '?').trim();
  if (!n) return '?';
  // first non-space char (works for Thai/EN)
  return n[0].toUpperCase();
};

const ymd = (year: number, monthIdx: number, day: number) =>
  `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const readStore = (): ShiftStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch (_) {
    return {};
  }
};

const writeStore = (store: ShiftStore) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (_) {}
};

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TH_DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const EN_DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SHIFT_META: Record<ShiftType, { icon: string; thLabel: string; enLabel: string; ring: string; bg: string }> = {
  day: { icon: '☀️', thLabel: 'กะเช้า', enLabel: 'Day Shift', ring: 'ring-amber-200', bg: 'bg-amber-50' },
  night: { icon: '🌙', thLabel: 'กะดึก', enLabel: 'Night Shift', ring: 'ring-violet-200', bg: 'bg-violet-50' },
  leave: { icon: '🌴', thLabel: 'ลา', enLabel: 'Leave', ring: 'ring-red-200', bg: 'bg-red-50' },
};

const ShiftCalendar: React.FC<ShiftCalendarProps> = ({ members, lang }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());
  const [store, setStore] = useState<ShiftStore>(() => readStore());
  const [modal, setModal] = useState<{ dateKey: string; type: ShiftType; day: number } | null>(null);

  useEffect(() => {
    writeStore(store);
  }, [store]);

  const monthName = lang === Language.TH ? TH_MONTHS[monthIdx] : EN_MONTHS[monthIdx];
  const dowLabels = lang === Language.TH ? TH_DOW : EN_DOW;

  const firstDow = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const todayKey = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  const getDay = (dateKey: string): DayShifts => store[dateKey] || { day: [], night: [], leave: [] };

  const memberById = useMemo(() => {
    const map: Record<string, OrganizationMember> = {};
    members.forEach(m => { map[m.id] = m; });
    return map;
  }, [members]);

  const handleToggle = (dateKey: string, type: ShiftType, memberId: string) => {
    setStore(prev => {
      const next = { ...prev };
      const cur: DayShifts = next[dateKey] ? { ...next[dateKey], day: [...next[dateKey].day], night: [...next[dateKey].night], leave: [...next[dateKey].leave] } : { day: [], night: [], leave: [] };
      // remove from all 3 shift buckets for that date (one shift per day)
      cur.day = cur.day.filter(id => id !== memberId);
      cur.night = cur.night.filter(id => id !== memberId);
      cur.leave = cur.leave.filter(id => id !== memberId);
      // if member wasn't in this type before, add. if it was → effectively removes (uncheck)
      const wasInThisType = (prev[dateKey]?.[type] || []).includes(memberId);
      if (!wasInThisType) cur[type] = [...cur[type], memberId];
      next[dateKey] = cur;
      return next;
    });
  };

  const goPrev = () => {
    if (monthIdx === 0) { setMonthIdx(11); setYear(y => y - 1); }
    else setMonthIdx(m => m - 1);
  };
  const goNext = () => {
    if (monthIdx === 11) { setMonthIdx(0); setYear(y => y + 1); }
    else setMonthIdx(m => m + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonthIdx(today.getMonth()); };

  const renderShiftRow = (dateKey: string, day: number, type: ShiftType) => {
    const ids = getDay(dateKey)[type];
    const meta = SHIFT_META[type];
    return (
      <button
        type="button"
        onClick={() => setModal({ dateKey, type, day })}
        className={`w-full flex items-center gap-1 px-1.5 py-1 rounded-lg ${meta.bg} hover:brightness-95 transition`}
        title={lang === Language.TH ? meta.thLabel : meta.enLabel}
      >
        <span className="text-[10px] leading-none">{meta.icon}</span>
        <span className="flex items-center gap-0.5 flex-1 flex-wrap min-w-0">
          {ids.length === 0 ? (
            <span className="text-[10px] font-black text-slate-400">+</span>
          ) : (
            <>
              {ids.slice(0, 4).map(id => {
                const m = memberById[id];
                if (!m) return null;
                return (
                  <span
                    key={id}
                    className="w-4 h-4 rounded-md flex items-center justify-center text-[8px] font-black text-white"
                    style={{ background: colorFor(id) }}
                    title={m.name}
                  >
                    {initialFor(m.name)}
                  </span>
                );
              })}
              {ids.length > 4 && (
                <span className="text-[8px] font-black text-slate-500">+{ids.length - 4}</span>
              )}
            </>
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {lang === Language.TH ? 'ปฏิทินกะการทำงาน' : 'Shift Calendar'}
            </h3>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mt-2">
              {lang === Language.TH ? 'คลิกช่องกะเพื่อกำหนดพนักงาน' : 'Click a shift to assign staff'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 transition text-slate-700 font-black">‹</button>
            <button onClick={goToday} className="px-4 h-10 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition">
              {monthName} {year + (lang === Language.TH ? 543 : 0)}
            </button>
            <button onClick={goNext} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 transition text-slate-700 font-black">›</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4 text-[10px] font-bold text-slate-500">
          <span className="flex items-center gap-1">☀️ {lang === Language.TH ? 'กะเช้า' : 'Day'}</span>
          <span className="flex items-center gap-1">🌙 {lang === Language.TH ? 'กะดึก' : 'Night'}</span>
          <span className="flex items-center gap-1">🌴 {lang === Language.TH ? 'ลา' : 'Leave'}</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
          {dowLabels.map((d, i) => (
            <div key={i} className={i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : ''}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-[3/4] rounded-2xl bg-slate-50/40" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1;
            const dow = (firstDow + idx) % 7;
            const dateKey = ymd(year, monthIdx, day);
            const isToday = dateKey === todayKey;
            const isWeekend = dow === 0 || dow === 6;
            return (
              <div
                key={day}
                className={`min-h-[120px] rounded-2xl border p-1.5 flex flex-col gap-1 ${isToday ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/40' : isWeekend ? 'border-slate-100 bg-slate-50/60' : 'border-slate-100 bg-white'}`}
              >
                <div className={`text-[11px] font-black tabular-nums px-1 ${isToday ? 'text-blue-600' : dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-slate-600'}`}>{day}</div>
                <div className="flex flex-col gap-1">
                  {renderShiftRow(dateKey, day, 'day')}
                  {renderShiftRow(dateKey, day, 'night')}
                  {getDay(dateKey).leave.length > 0 && renderShiftRow(dateKey, day, 'leave')}
                </div>
                {getDay(dateKey).leave.length === 0 && (
                  <button
                    onClick={() => setModal({ dateKey, type: 'leave', day })}
                    className="text-[9px] font-black text-slate-300 hover:text-red-400 transition text-left px-1.5"
                  >
                    + {lang === Language.TH ? 'ลา' : 'leave'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {modal && (() => {
        const meta = SHIFT_META[modal.type];
        const current = getDay(modal.dateKey)[modal.type];
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={() => setModal(null)}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-7 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {meta.icon} {lang === Language.TH ? meta.thLabel : meta.enLabel}
                  </h3>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mt-2">
                    {lang === Language.TH ? `วันที่ ${modal.day} ${monthName}` : `${monthName} ${modal.day}, ${year}`}
                  </p>
                </div>
                <button onClick={() => setModal(null)} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {members.length === 0 ? (
                <p className="text-sm font-bold text-slate-400 text-center py-12">
                  {lang === Language.TH ? 'ยังไม่มีพนักงาน' : 'No staff yet'}
                </p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {members.map(m => {
                    const checked = current.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleToggle(modal.dateKey, modal.type, m.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition text-left ${checked ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'}`}
                      >
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white"
                          style={{ background: colorFor(m.id) }}
                        >
                          {initialFor(m.name)}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-black text-slate-900 truncate">{m.name}</span>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{m.position}</span>
                        </span>
                        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                          {checked && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>{lang === Language.TH ? 'เลือกแล้ว' : 'Selected'}: {current.length}</span>
                <button onClick={() => setModal(null)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 active:scale-95 transition">
                  {lang === Language.TH ? 'เสร็จ' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ShiftCalendar;
