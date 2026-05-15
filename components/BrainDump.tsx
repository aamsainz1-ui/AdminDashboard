import React, { useEffect, useState } from 'react';
import { deleteBrainDumpItem, syncBrainDumpItems } from '../services/syncService';

interface BrainItem {
  id: string;
  text: string;
  createdAt: number;
}

const DEFAULT_ITEMS: BrainItem[] = [
  { id: '1', text: 'อยากเพิ่มระบบเช็คอินพนักงานผ่าน LINE', createdAt: Date.now() - 4 * 86400000 },
  { id: '2', text: 'บัญชี ads ต้องแยกตามแคมเปญ', createdAt: Date.now() - 3 * 86400000 },
  { id: '3', text: 'ให้ลูกค้า rate การบริการหลังถอน', createdAt: Date.now() - 2 * 86400000 },
  { id: '4', text: 'SOP ฝาก-ถอน ภาคกลางคืน', createdAt: Date.now() - 86400000 },
];

const BrainDump: React.FC = () => {
  const [items, setItems] = useState<BrainItem[]>(DEFAULT_ITEMS);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const nextItems = await syncBrainDumpItems(DEFAULT_ITEMS);
      if (alive) setItems(nextItems);
    })();
    return () => { alive = false; };
  }, []);

  const handleAdd = async () => {
    const text = draft.trim();
    if (!text) return;
    const next: BrainItem = { id: crypto.randomUUID(), text, createdAt: Date.now() };
    const nextLocal = [next, ...items];
    setItems(nextLocal);
    setItems(await syncBrainDumpItems(nextLocal));
    setDraft('');
  };

  const handleDelete = async (id: string) => {
    const nextLocal = items.filter(it => it.id !== id);
    setItems(nextLocal);
    await deleteBrainDumpItem(id);
    setItems(await syncBrainDumpItems(nextLocal));
  };

  const formatRelative = (ts: number) => {
    const diff = Date.now() - ts;
    const day = Math.floor(diff / 86400000);
    if (day < 1) return 'วันนี้';
    if (day === 1) return 'เมื่อวาน';
    return `${day} วันที่แล้ว`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">🧠 Brain Dump</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">ที่ทิ้งความคิดก่อนจัดระบบ</p>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 space-y-4">
        <h3 className="text-base font-black text-slate-900">💭 ไอเดีย / Inbox</h3>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="พิมพ์ไอเดียที่ค้างในหัว..."
            className="flex-1 px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
          >
            + เพิ่ม
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold italic">ยังไม่มีไอเดีย พิมพ์ใส่เลยค่ะ</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map(it => (
              <li key={it.id} className="group flex items-start gap-3 px-4 py-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all">
                <span className="text-blue-500 font-black mt-0.5">•</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 break-words">{it.text}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{formatRelative(it.createdAt)}</p>
                </div>
                <button
                  onClick={() => handleDelete(it.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition"
                  title="ลบ"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default BrainDump;
