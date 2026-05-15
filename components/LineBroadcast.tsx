import React, { useEffect, useState } from 'react';
import { syncLineBroadcastItems } from '../services/syncService';

interface BroadcastItem {
  id: string;
  datetime: string;
  topic: string;
  caption: string;
  imageUrl: string;
  audience: string;
  hasImage: boolean;
  status: 'SCHEDULED' | 'REVIEW' | 'DRAFT' | 'SENT';
}

const MOCK_BROADCASTS: BroadcastItem[] = [
  { id: '1', datetime: '14 พ.ค. 18:00', topic: 'โปรฝาก 100 รับ 50', caption: 'โปรแรง! ฝากขั้นต่ำ 100 รับโบนัส 50 ทันที!', imageUrl: '', audience: 'VIP', hasImage: true, status: 'SCHEDULED' },
  { id: '2', datetime: '15 พ.ค. 10:00', topic: 'กิจกรรมประจำวัน', caption: 'ร่วมสนุกกับของรางวัลรายวัน', imageUrl: '', audience: 'All', hasImage: true, status: 'REVIEW' },
  { id: '3', datetime: '16 พ.ค. 12:00', topic: 'เปลี่ยนเวลาฝากถอน', caption: '', imageUrl: '', audience: 'All', hasImage: false, status: 'DRAFT' },
];

const statusBadge = (status: BroadcastItem['status']) => {
  const map: Record<BroadcastItem['status'], { label: string; cls: string }> = {
    SCHEDULED: { label: 'Scheduled', cls: 'bg-emerald-50 text-emerald-600' },
    REVIEW: { label: 'Review', cls: 'bg-blue-50 text-blue-600' },
    DRAFT: { label: 'Draft', cls: 'bg-amber-50 text-amber-600' },
    SENT: { label: 'Sent', cls: 'bg-slate-100 text-slate-600' },
  };
  return map[status];
};

const LineBroadcast: React.FC = () => {
  const [items, setItems] = useState<BroadcastItem[]>(MOCK_BROADCASTS);
  const [showAdd, setShowAdd] = useState(false);
  const [view, setView] = useState<'TABLE' | 'CALENDAR'>('TABLE');
  const [newBC, setNewBC] = useState<{ datetime: string; topic: string; caption: string; imageUrl: string; audience: string; status: BroadcastItem['status'] }>({ datetime: '', topic: '', caption: '', imageUrl: '', audience: 'All', status: 'DRAFT' });

  useEffect(() => {
    let alive = true;
    (async () => {
      const nextItems = await syncLineBroadcastItems(MOCK_BROADCASTS);
      if (alive) setItems(nextItems);
    })();
    return () => { alive = false; };
  }, []);

  const handleAdd = async () => {
    if (!newBC.topic.trim()) return;
    const now = new Date();
    const nextItem: BroadcastItem = {
      id: crypto.randomUUID(),
      datetime: newBC.datetime || `${now.getDate()} พ.ค. ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
      topic: newBC.topic,
      caption: newBC.caption,
      imageUrl: newBC.imageUrl,
      audience: newBC.audience,
      hasImage: !!newBC.imageUrl,
      status: newBC.status,
    };
    const nextLocal = [nextItem, ...items];
    setItems(nextLocal);
    setItems(await syncLineBroadcastItems(nextLocal));
    setNewBC({ datetime: '', topic: '', caption: '', imageUrl: '', audience: 'All', status: 'DRAFT' });
    setShowAdd(false);
  };

  const parseDay = (datetime: string): number | null => {
    const m = datetime.match(/^(\d{1,2})\s+/);
    return m ? parseInt(m[1], 10) : null;
  };

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayWeekday = new Date(year, month, 1).getDay();
  const calendarCells: Array<{ day: number | null; items: BroadcastItem[] }> = [];
  for (let i = 0; i < firstDayWeekday; i++) calendarCells.push({ day: null, items: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const dayItems = items.filter(it => parseDay(it.datetime) === d);
    calendarCells.push({ day: d, items: dayItems });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">📢 LINE บอร์ดแคส</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Content Calendar · Asset Library · Quick Replies</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">วันนี้</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">2</p>
          <p className="text-xs font-bold text-slate-400 mt-1">บอร์ดแคส</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Scheduled</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">5</p>
          <p className="text-xs font-bold text-slate-400 mt-1">รอยิงสัปดาห์นี้</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Reach รวม</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">12.4k</p>
          <p className="text-xs font-bold text-slate-400 mt-1">7 วันล่าสุด</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Draft</p>
          <p className="text-3xl font-black text-slate-900 tabular-nums">3</p>
          <p className="text-xs font-bold text-slate-400 mt-1">ยังไม่อนุมัติ</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 flex-wrap gap-3">
          <h3 className="text-base font-black text-slate-900">📅 ปฏิทินคอนเทนต์</h3>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-full p-1">
              <button onClick={() => setView('TABLE')} className={`text-[10px] font-black px-3 py-1 rounded-full ${view === 'TABLE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>ตาราง</button>
              <button onClick={() => setView('CALENDAR')} className={`text-[10px] font-black px-3 py-1 rounded-full ${view === 'CALENDAR' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>ปฏิทิน</button>
            </div>
            <button onClick={() => setShowAdd(v => !v)} className="text-xs font-black text-blue-600 hover:text-blue-700">+ บอร์ดแคสใหม่</button>
          </div>
        </div>
        {showAdd && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 items-end">
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-36" placeholder="วัน/เวลา" value={newBC.datetime} onChange={e => setNewBC(p => ({...p, datetime: e.target.value}))} />
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[220px]" placeholder="หัวข้อบอร์ดแคส" value={newBC.topic} onChange={e => setNewBC(p => ({...p, topic: e.target.value}))} />
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[240px]" placeholder="คำแคปชั่น (caption)" value={newBC.caption} onChange={e => setNewBC(p => ({...p, caption: e.target.value}))} />
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-48" placeholder="URL รูปภาพ" value={newBC.imageUrl} onChange={e => setNewBC(p => ({...p, imageUrl: e.target.value}))} />
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newBC.audience} onChange={e => setNewBC(p => ({...p, audience: e.target.value}))}>
              <option>All</option><option>VIP</option><option>New Users</option><option>Inactive</option>
            </select>
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newBC.status} onChange={e => setNewBC(p => ({...p, status: e.target.value as BroadcastItem['status']}))}>
              <option value="DRAFT">Draft</option><option value="REVIEW">Review</option><option value="SCHEDULED">Scheduled</option>
            </select>
            <button onClick={handleAdd} className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-lg hover:bg-blue-700">✓ บันทึก</button>
            <button onClick={() => setShowAdd(false)} className="bg-slate-200 text-slate-700 text-xs font-black px-4 py-2 rounded-lg">ยกเลิก</button>
          </div>
        )}
        {view === 'TABLE' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="px-6 py-3">วัน/เวลา</th>
                  <th className="px-6 py-3">เรื่อง</th>
                  <th className="px-6 py-3">คำแคปชั่น</th>
                  <th className="px-6 py-3">กลุ่ม</th>
                  <th className="px-6 py-3 text-center">รูป</th>
                  <th className="px-6 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => {
                  const st = statusBadge(it.status);
                  return (
                    <tr key={it.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{it.datetime}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{it.topic}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={it.caption}>{it.caption || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{it.audience}</td>
                      <td className="px-6 py-4 text-center text-slate-700">{it.hasImage ? '✓' : '✗'}</td>
                      <td className="px-6 py-4"><span className={`text-[10px] font-black px-3 py-1 rounded-full ${st.cls}`}>{st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">ปฏิทินเดือน {month + 1}/{year}</p>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['อา','จ','อ','พ','พฤ','ศ','ส'].map(d => (
                <div key={d} className="text-[10px] font-black text-slate-400 uppercase py-2">{d}</div>
              ))}
              {calendarCells.map((cell, i) => (
                <div key={i} className={`min-h-[72px] rounded-lg border p-1.5 text-left ${cell.day ? 'border-slate-100 bg-white hover:bg-slate-50' : 'border-transparent bg-transparent'}`}>
                  {cell.day && (
                    <>
                      <p className={`text-[10px] font-black ${cell.day === today.getDate() ? 'text-blue-600' : 'text-slate-500'}`}>{cell.day}</p>
                      <div className="mt-1 space-y-0.5">
                        {cell.items.slice(0, 2).map(it => {
                          const st = statusBadge(it.status);
                          return (
                            <div key={it.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate ${st.cls}`} title={it.topic}>{it.topic}</div>
                          );
                        })}
                        {cell.items.length > 2 && (
                          <div className="text-[9px] font-black text-slate-400">+{cell.items.length - 2} …</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LineBroadcast;
