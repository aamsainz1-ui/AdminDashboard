
import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceType, AttendanceRecord, Language, WorkMode } from '../types';

interface DashboardProps {
  isClockedIn: boolean;
  onAction: (type: AttendanceType, note?: string, workMode?: WorkMode) => void;
  lastRecord?: AttendanceRecord;
  allRecords: AttendanceRecord[];
  lang: Language;
}

const Dashboard: React.FC<DashboardProps> = ({ isClockedIn, onAction, lastRecord, allRecords, lang }) => {
  const [time, setTime] = useState(new Date());
  const [shiftDuration, setShiftDuration] = useState<string>("00:00:00");
  const [note, setNote] = useState("");
  const [selectedMode, setSelectedMode] = useState<WorkMode>(WorkMode.OFFICE);

  const t = {
    working: lang === Language.TH ? 'ปฏิบัติหน้าที่' : 'ON DUTY',
    ready: lang === Language.TH ? 'พร้อมลงเวลา' : 'READY',
    totalHours: lang === Language.TH ? 'ชั่วโมงสะสม' : 'ACCUMULATED HOURS',
    weekSummary: lang === Language.TH ? 'ประสิทธิภาพรายสัปดาห์' : 'WEEKLY PERFORMANCE',
    checkIn: lang === Language.TH ? 'เริ่มงาน' : 'CLOCK IN',
    checkOut: lang === Language.TH ? 'เลิกงาน' : 'CLOCK OUT',
    notePlaceholder: lang === Language.TH ? 'ระบุโปรเจกต์ที่กำลังทำ...' : 'Active Project / Task...',
    shiftStart: lang === Language.TH ? 'เริ่มเข้ากะ' : 'SHIFT START',
    shiftEnd: lang === Language.TH ? 'เลิกกะ' : 'SHIFT END',
    todayDuration: lang === Language.TH ? 'เวลาปฏิบัติงานวันนี้' : 'SESSION DURATION',
    balanceScore: lang === Language.TH ? 'คะแนนสมดุลชีวิต' : 'WORK-LIFE BALANCE'
  };

  const weeklyStats = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const startOfWeek = monday.getTime();

    const daysData = Array(7).fill(0).map((_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return {
        timestamp: d.getTime(),
        label: d.toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', { weekday: 'short' }),
        hours: 0
      };
    });

    const sorted = [...allRecords].sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].type === AttendanceType.CHECK_IN && sorted[i + 1].type === AttendanceType.CHECK_OUT) {
        const start = sorted[i].timestamp;
        const duration = sorted[i + 1].timestamp - start;
        const shiftDay = new Date(start);
        shiftDay.setHours(0, 0, 0, 0);
        const dayIdx = daysData.findIndex(d => d.timestamp === shiftDay.getTime());
        if (dayIdx !== -1) daysData[dayIdx].hours += duration / 3600000;
      }
    }

    const totalHours = daysData.reduce((acc, d) => acc + d.hours, 0);
    let score = totalHours > 0 ? Math.min(100, (totalHours / 40) * 100) : 0;
    if (totalHours > 45) score = Math.max(50, 100 - (totalHours - 45) * 5);

    return { days: daysData, total: totalHours.toFixed(1), score: Math.round(score) };
  }, [allRecords, lang]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      if (isClockedIn && lastRecord?.type === AttendanceType.CHECK_IN) {
        const diff = Date.now() - lastRecord.timestamp;
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setShiftDuration(`${h}:${m}:${s}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isClockedIn, lastRecord]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-10 lg:p-16 shadow-[0_32px_80px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500"></div>
        
        <div className="mb-10 flex flex-col items-center">
          <div className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-700 mb-4 ${
            isClockedIn ? 'bg-green-600 text-white shadow-xl shadow-green-600/20' : 'bg-slate-100 text-slate-500'
          }`}>
            {isClockedIn ? t.working : t.ready}
          </div>
          <h2 className="text-5xl sm:text-7xl lg:text-9xl font-black text-slate-900 tabular-nums tracking-tighter leading-none group-hover:scale-105 transition-transform duration-700">
            {time.toLocaleTimeString(lang === Language.TH ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            <span className="text-2xl sm:text-3xl lg:text-4xl text-slate-200 ml-2">{time.toLocaleTimeString(lang === Language.TH ? 'th-TH' : 'en-US', { second: '2-digit', hour12: false })}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-6 font-black uppercase tracking-[0.4em]">
            {time.toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {isClockedIn && (
          <div className="mb-8 sm:mb-12 bg-slate-900 px-8 sm:px-14 py-6 sm:py-8 rounded-[2rem] sm:rounded-[3rem] shadow-2xl shadow-slate-900/30 animate-in zoom-in-95 duration-500">
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.4em] mb-3">{t.todayDuration}</p>
            <p className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black text-white tracking-[0.2em]">{shiftDuration}</p>
          </div>
        )}

        <div className="w-full max-w-lg space-y-8">
          {!isClockedIn && (
            <div className="bg-slate-50/50 p-2 rounded-[2rem] border border-slate-100 flex items-center">
              <button 
                onClick={() => setSelectedMode(WorkMode.OFFICE)}
                className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${selectedMode === WorkMode.OFFICE ? 'bg-white shadow-xl text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Corporate Office
              </button>
              <button 
                onClick={() => setSelectedMode(WorkMode.REMOTE)}
                className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${selectedMode === WorkMode.REMOTE ? 'bg-white shadow-xl text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Remote Access
              </button>
            </div>
          )}

          <div className="relative group">
            <input 
              type="text" 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePlaceholder}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-10 py-6 text-sm focus:outline-none focus:border-blue-600 focus:ring-0 transition-all font-bold placeholder:text-slate-300 text-center"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button
              onClick={() => onAction(AttendanceType.CHECK_IN, note, selectedMode)}
              disabled={isClockedIn}
              className={`group relative py-8 rounded-[2.5rem] font-black transition-all duration-500 flex flex-col items-center space-y-1 ${
                isClockedIn ? 'bg-slate-50 text-slate-200 opacity-50' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xl shadow-blue-600/30 active:scale-95'
              }`}
            >
              <span className="text-xl tracking-widest">{t.checkIn}</span>
              <span className="text-[9px] font-black opacity-60 uppercase tracking-[0.3em]">{t.shiftStart}</span>
            </button>
            <button
              onClick={() => onAction(AttendanceType.CHECK_OUT, note)}
              disabled={!isClockedIn}
              className={`group relative py-8 rounded-[2.5rem] font-black transition-all duration-500 flex flex-col items-center space-y-1 ${
                !isClockedIn ? 'bg-slate-50 text-slate-200 opacity-50' : 'bg-slate-900 text-white hover:bg-black shadow-2xl shadow-slate-900/30 active:scale-95'
              }`}
            >
              <span className="text-xl tracking-widest">{t.checkOut}</span>
              <span className="text-[9px] font-black opacity-60 uppercase tracking-[0.3em]">{t.shiftEnd}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-6 sm:mb-12">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.weekSummary}</h3>
              <div className="flex items-center space-x-2 mt-2">
                 <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Operational Analytics</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl sm:text-6xl font-black text-blue-600 tracking-tighter">{weeklyStats.total}</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{t.totalHours}</p>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 sm:gap-5 h-32 sm:h-48 items-end px-1 sm:px-4">
            {weeklyStats.days.map((day, i) => {
              const height = Math.min(100, (day.hours / 10) * 100);
              return (
                <div key={i} className="flex flex-col items-center group h-full justify-end">
                  <div className="relative w-full flex justify-center h-full items-end group">
                    <div 
                      className={`w-full max-w-[40px] rounded-2xl transition-all duration-1000 ease-out relative ${
                        day.hours >= 8 ? 'bg-blue-600 shadow-xl shadow-blue-600/20' : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}
                      style={{ height: `${Math.max(8, height)}%` }}
                    >
                      {day.hours > 0 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                          {day.hours.toFixed(1)}h
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[9px] font-black text-slate-400 mt-5 group-hover:text-blue-600 transition-colors uppercase tracking-widest">{day.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 text-white flex flex-col justify-between shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
          <div className="relative z-10">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400/80 mb-2">{t.balanceScore}</h4>
            <div className="flex items-end space-x-2 mb-8">
              <span className="text-7xl font-black tracking-tighter">{weeklyStats.score}</span>
              <span className="text-2xl font-bold mb-3 text-blue-500">%</span>
            </div>
            
            <div className="space-y-6">
              <div className="w-full bg-white/5 h-4 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-400 h-full transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.4)]" 
                  style={{ width: `${weeklyStats.score}%` }}
                ></div>
              </div>
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                <p className="text-xs font-bold text-slate-300 leading-relaxed italic">
                  {weeklyStats.score > 80 ? (lang === Language.TH ? '"คุณเป็นยอดบุคลากรที่มีวินัยดีเยี่ยม"' : '"Elite work-life balance detected."') : 
                   weeklyStats.score > 50 ? (lang === Language.TH ? '"สมดุลชีวิตของคุณอยู่ในระดับมาตรฐาน"' : '"You are maintaining good operational pace."') : 
                   (lang === Language.TH ? '"ควรหาเวลาพักผ่อนเพื่อรักษาประสิทธิภาพ"' : '"Strategic rest recommended for optimal output."')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

