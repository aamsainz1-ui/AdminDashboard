import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string | null;
  channel: string | null;
  message: string;
  created_at: string;
}

interface ChatProps {
  currentUser: { id: string; name: string; avatar: string; role: string };
  members: Array<{ id: string; name: string; avatar: string; role?: string }>;
  isAdmin: boolean;
  canDmAll?: boolean;
}

type ChatTarget = { type: 'group' } | { type: 'dm'; memberId: string; memberName: string; memberAvatar: string };

const Chat: React.FC<ChatProps> = ({ currentUser, members, isAdmin, canDmAll }) => {
  const dmMembers = isAdmin
    ? members.filter(m => m.id !== currentUser.id)
    : canDmAll
      ? members.filter(m => m.id !== currentUser.id)
      : members.filter(m => m.id !== currentUser.id && m.role === 'ADMIN');

  const [target, setTarget] = useState<ChatTarget>({ type: 'group' });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatRetention, setChatRetention] = useState<number>(() => parseInt(localStorage.getItem('admin_chat_retention') || '0'));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const getChannelKey = (t: ChatTarget) =>
    t.type === 'group' ? 'group' : `dm_${[currentUser.id, t.memberId].sort().join('_')}`;

  // Fetch initial unread counts from Supabase
  useEffect(() => {
    const fetchUnread = async () => {
      if (!supabase) return;
      const readMapStr = localStorage.getItem('admin_chat_read_ts') || '{}';
      const readMap: Record<string, number> = JSON.parse(readMapStr);
      
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase
        .from('chat_messages')
        .select('id, sender_id, receiver_id, channel, created_at')
        .gt('created_at', since)
        .neq('sender_id', currentUser.id)
        .order('created_at', { ascending: false });
      
      if (!data) return;
      const counts: Record<string, number> = {};
      data.forEach((msg: any) => {
        let key: string;
        if (msg.channel === 'admin_general') key = 'group';
        else if (msg.receiver_id === currentUser.id) key = `dm_${[msg.sender_id, msg.receiver_id].sort().join('_')}`;
        else return;
        
        const lastRead = readMap[key] || 0;
        if (new Date(msg.created_at).getTime() > lastRead) {
          counts[key] = (counts[key] || 0) + 1;
        }
      });
      setUnreadMap(counts);
    };
    fetchUnread();
  }, [currentUser.id]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMessages = useCallback(async (t: ChatTarget) => {
    setLoading(true);
    let query = supabase.from('chat_messages').select('*').order('created_at', { ascending: true });

    if (t.type === 'group') {
      query = query.eq('channel', 'admin_general');
    } else {
      query = query.or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${t.memberId}),and(sender_id.eq.${t.memberId},receiver_id.eq.${currentUser.id})`
      );
    }

    const { data, error } = await query;
    if (!error && data) {
      const retention = parseInt(localStorage.getItem('admin_chat_retention') || '0');
      if (retention > 0) {
        const cutoff = new Date(Date.now() - retention * 86400000).toISOString();
        supabase.from('chat_messages').delete().lt('created_at', cutoff).then(() => {});
        setMessages((data as ChatMessage[]).filter(m => m.created_at >= cutoff));
      } else {
        setMessages(data as ChatMessage[]);
      }
    }
    setLoading(false);
  }, [currentUser.id]);

  const subscribe = useCallback((t: ChatTarget) => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channelName = `chat_${getChannelKey(t)}_${Date.now()}`;
    const ch = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload: any) => {
        const msg = payload.new as ChatMessage;
        if (t.type === 'group') {
          if (msg.channel === 'admin_general') setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev.filter(m => !m.id.startsWith('temp_') || m.sender_id !== msg.sender_id || m.message !== msg.message), msg]);
        } else {
          const isDM =
            (msg.sender_id === currentUser.id && msg.receiver_id === t.memberId) ||
            (msg.sender_id === t.memberId && msg.receiver_id === currentUser.id);
          if (isDM) setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev.filter(m => !m.id.startsWith('temp_') || m.sender_id !== msg.sender_id || m.message !== msg.message), msg]);
        }

        const msgKey = msg.channel === 'admin_general' ? 'group' : `dm_${[msg.sender_id, msg.receiver_id].sort().join('_')}`;
        const currentKey = getChannelKey(t);
        if (msgKey !== currentKey && msg.sender_id !== currentUser.id) {
          setUnreadMap(prev => ({ ...prev, [msgKey]: (prev[msgKey] || 0) + 1 }));
        }
      })
      .subscribe();

    subscriptionRef.current = ch;
  }, [currentUser.id]);

  useEffect(() => {
    fetchMessages(target);
    subscribe(target);
    const key = getChannelKey(target);
    setUnreadMap(prev => ({ ...prev, [key]: 0 }));
    // Save read timestamp
    const readMapStr = localStorage.getItem('admin_chat_read_ts') || '{}';
    const readMap = JSON.parse(readMapStr);
    readMap[key] = Date.now();
    localStorage.setItem('admin_chat_read_ts', JSON.stringify(readMap));

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [target, fetchMessages, subscribe]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    const payload: Omit<ChatMessage, 'id' | 'created_at'> = {
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      receiver_id: target.type === 'dm' ? target.memberId : null,
      channel: target.type === 'group' ? 'admin_general' : null,
      message: text,
    };

    setInput('');
    // Optimistic: show message immediately
    const optimisticMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    const { data, error } = await supabase.from('chat_messages').insert(payload).select().single();
    if (error) { console.error('Send error:', error); }
    else if (data) {
      // Replace optimistic with real
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const groupedMessages = messages.reduce<{ date: string; msgs: ChatMessage[] }[]>((acc, msg) => {
    const date = formatDate(msg.created_at);
    const last = acc[acc.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else acc.push({ date, msgs: [msg] });
    return acc;
  }, []);

  const chatTitle = target.type === 'group' ? 'กลุ่มสนทนา' : target.memberName;
  const groupUnread = unreadMap['group'] || 0;

  return (
    <div className="flex h-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="hidden sm:flex flex-col w-64 border-r border-slate-100 bg-slate-50">
        <div className="p-3 border-b border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">แชนแนล</p>
          <button
            onClick={() => setTarget({ type: 'group' })}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${
              target.type === 'group' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-white hover:shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <span className="text-base">#</span>
              <span>กลุ่ม</span>
            </div>
            {groupUnread > 0 && (
              <span className={`text-xs font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${target.type === 'group' ? 'bg-white text-blue-600' : 'bg-red-500 text-white'}`}>
                {groupUnread}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">ข้อความส่วนตัว</p>
          <div className="space-y-1">
            {dmMembers.map(member => {
              const dmKey = `dm_${[currentUser.id, member.id].sort().join('_')}`;
              const unread = unreadMap[dmKey] || 0;
              const isActive = target.type === 'dm' && target.memberId === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => setTarget({ type: 'dm', memberId: member.id, memberName: member.name, memberAvatar: member.avatar })}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-sm ${
                    isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <div className="relative flex-shrink-0">
                      <img src={member.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
                    </div>
                    <span className={`font-bold text-xs truncate ${isActive ? 'text-white' : ''}`}>{member.name}</span>
                  </div>
                  {unread > 0 && (
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0 ${isActive ? 'bg-white text-blue-600' : 'bg-red-500 text-white'}`}>
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex sm:hidden flex-col w-full min-h-0">
        <div className="flex overflow-x-auto gap-1 p-2 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <button
            onClick={() => setTarget({ type: 'group' })}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              target.type === 'group' ? 'bg-blue-600 text-white' : 'text-slate-500 bg-white border border-slate-200'
            }`}
          >
            <span>#</span>
            <span>กลุ่ม</span>
            {groupUnread > 0 && (
              <span className={`text-xs font-black px-1 py-0.5 rounded-full min-w-[16px] text-center ${target.type === 'group' ? 'bg-white text-blue-600' : 'bg-red-500 text-white'}`}>
                {groupUnread}
              </span>
            )}
          </button>
          {dmMembers.map(member => {
            const dmKey = `dm_${[currentUser.id, member.id].sort().join('_')}`;
            const unread = unreadMap[dmKey] || 0;
            const isActive = target.type === 'dm' && target.memberId === member.id;
            return (
              <button
                key={member.id}
                onClick={() => setTarget({ type: 'dm', memberId: member.id, memberName: member.name, memberAvatar: member.avatar })}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-500 bg-white border border-slate-200'
                }`}
              >
                <img src={member.avatar} className="w-4 h-4 rounded-full" alt="" />
                <span>{member.name}</span>
                {unread > 0 && (
                  <span className={`text-xs font-black px-1 py-0.5 rounded-full min-w-[16px] text-center ${isActive ? 'bg-white text-blue-600' : 'bg-red-500 text-white'}`}>
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center space-x-2 bg-white flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center overflow-hidden">
              {target.type === 'group' ? (
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              ) : (
                <img src={target.memberAvatar} className="w-8 h-8 rounded-xl object-cover" alt="" />
              )}
            </div>
            <h2 className="font-black text-slate-900 text-sm">{chatTitle}</h2>
            {isAdmin && (
              <div className="flex items-center gap-2 ml-auto">
                <select
                  value={chatRetention}
                  onChange={async (e) => {
                    const days = parseInt(e.target.value);
                    setChatRetention(days);
                    localStorage.setItem('admin_chat_retention', String(days));
                    if (days > 0 && supabase) {
                      const cutoff = new Date(Date.now() - days * 86400000).toISOString();
                      await supabase.from('chat_messages').delete().lt('created_at', cutoff);
                      setMessages(prev => prev.filter(m => m.created_at >= cutoff));
                    }
                  }}
                  className="text-[10px] bg-slate-100 border-0 rounded-lg px-2 py-1 font-bold text-slate-500 focus:outline-none cursor-pointer"
                >
                  <option value="0">🗑️ ไม่ลบอัตโนมัติ</option>
                  <option value="1">ลบอัตโนมัติ: 1 วัน</option>
                  <option value="7">ลบอัตโนมัติ: 7 วัน</option>
                  <option value="15">ลบอัตโนมัติ: ครึ่งเดือน</option>
                  <option value="30">ลบอัตโนมัติ: 1 เดือน</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
            {loading && <div className="text-center text-xs text-slate-400 py-4">กำลังโหลด...</div>}
            {!loading && messages.length === 0 && (
              <div className="text-center text-xs text-slate-400 py-8">ยังไม่มีข้อความ เริ่มสนทนากันเลย!</div>
            )}
            {groupedMessages.map(({ date, msgs }) => (
              <div key={date}>
                <div className="flex items-center my-3">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="mx-3 text-[10px] font-bold text-slate-400">{date}</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                {msgs.map((msg, idx) => {
                  const isOwn = msg.sender_id === currentUser.id;
                  const prevMsg = idx > 0 ? msgs[idx - 1] : null;
                  const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-6 h-6 flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                        {!isOwn && (
                          <img src={members.find(m => m.id === msg.sender_id)?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender_id}`} className="w-6 h-6 rounded-full object-cover" alt="" />
                        )}
                        {isOwn && (
                          <img src={currentUser.avatar} className="w-6 h-6 rounded-full object-cover" alt="" />
                        )}
                      </div>
                      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
                        {showAvatar && (
                          <span className={`text-[9px] font-bold text-slate-400 mb-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                            {isOwn ? 'คุณ' : msg.sender_name} · {formatTime(msg.created_at)}
                          </span>
                        )}
                        <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed break-words max-w-full ${
                          isOwn ? 'bg-blue-600 text-white rounded-br-md' : 'bg-slate-100 text-slate-800 rounded-bl-md'
                        }`}>
                          {msg.message}
                        </div>
                        {!showAvatar && (
                          <span className="text-[9px] text-slate-300 mt-0.5 px-1">{formatTime(msg.created_at)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-slate-100 bg-white flex-shrink-0">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ส่งข้อความ..."
                className="flex-1 bg-slate-100 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-2xl text-xs font-black disabled:opacity-40 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
              >
                ส่ง
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden sm:flex flex-col flex-1 min-w-0">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center space-x-3 bg-white flex-shrink-0">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center overflow-hidden">
            {target.type === 'group' ? (
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            ) : (
              <img src={target.memberAvatar} className="w-9 h-9 object-cover" alt="" />
            )}
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-sm">{chatTitle}</h2>
            <p className="text-[10px] text-slate-400 font-medium">
              {target.type === 'group' ? `${members.length} สมาชิก` : 'ข้อความส่วนตัว'}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-1">
          {loading && <div className="text-center text-sm text-slate-400 py-8">กำลังโหลดข้อความ...</div>}
          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-slate-400">ยังไม่มีข้อความ</p>
              <p className="text-xs text-slate-300 mt-1">เริ่มสนทนากันเลย!</p>
            </div>
          )}
          {groupedMessages.map(({ date, msgs }) => (
            <div key={date}>
              <div className="flex items-center my-4">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="mx-3 text-[10px] font-bold text-slate-400">{date}</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              {msgs.map((msg, idx) => {
                const isOwn = msg.sender_id === currentUser.id;
                const prevMsg = idx > 0 ? msgs[idx - 1] : null;
                const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                return (
                  <div key={msg.id} className={`flex items-end gap-2.5 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                      <img
                        src={isOwn ? currentUser.avatar : (members.find(m => m.id === msg.sender_id)?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender_id}`)}
                        className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                        alt=""
                      />
                    </div>
                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[65%]`}>
                      {showAvatar && (
                        <span className={`text-[10px] font-bold text-slate-400 mb-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                          {isOwn ? 'คุณ' : msg.sender_name} · {formatTime(msg.created_at)}
                        </span>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words max-w-full ${
                        isOwn ? 'bg-blue-600 text-white rounded-br-md shadow-lg shadow-blue-600/10' : 'bg-slate-100 text-slate-800 rounded-bl-md'
                      }`}>
                        {msg.message}
                      </div>
                      {!showAvatar && (
                        <span className="text-[9px] text-slate-300 mt-0.5 px-1">{formatTime(msg.created_at)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center space-x-3">
            <img src={currentUser.avatar} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ส่งข้อความ..."
              className="flex-1 bg-slate-100 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="bg-blue-600 text-white px-5 py-3 rounded-2xl text-sm font-black disabled:opacity-40 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20 flex items-center space-x-2"
            >
              <span>ส่ง</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
