import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import Chat from './Chat';

interface ChatWidgetProps {
  currentUser: { id: string; name: string; avatar: string; role: string };
  members: Array<{ id: string; name: string; avatar: string; role?: string }>;
  isAdmin: boolean;
  canDmAll?: boolean;
}

const READ_KEY = (userId: string) => `admin_chat_read_${userId}`;

const getReadTimestamps = (userId: string): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY(userId)) || '{}');
  } catch {
    return {};
  }
};

const setReadTimestamp = (userId: string, channel: string, ts: number) => {
  const map = getReadTimestamps(userId);
  map[channel] = ts;
  localStorage.setItem(READ_KEY(userId), JSON.stringify(map));
};

const ChatWidget: React.FC<ChatWidgetProps> = ({ currentUser, members, isAdmin, canDmAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const unreadMapRef = useRef<Record<string, number>>({});

  // Compute unread count from localStorage
  const computeUnread = useCallback(async () => {
    try {
      const readMap = getReadTimestamps(currentUser.id);
      // Fetch recent messages (last 24h) to count unread
      const since = new Date(Date.now() - 86400000).toISOString();
      
      // Build filter for all channels this user can see
      const { data } = await supabase
        .from('chat_messages')
        .select('id, sender_id, receiver_id, channel, created_at')
        .gt('created_at', since)
        .neq('sender_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (!data) return;

      let count = 0;
      const newUnreadMap: Record<string, number> = {};

      data.forEach((msg: any) => {
        // Determine channel key
        let chanKey: string;
        if (msg.channel === 'admin_general') {
          chanKey = 'group';
        } else if (msg.receiver_id) {
          // DM - must involve current user
          const isForMe = msg.receiver_id === currentUser.id || msg.sender_id === currentUser.id;
          if (!isForMe) return;
          chanKey = `dm_${[msg.sender_id, msg.receiver_id].sort().join('_')}`;
        } else {
          return;
        }

        const lastRead = readMap[chanKey] || 0;
        const msgTime = new Date(msg.created_at).getTime();
        if (msgTime > lastRead) {
          newUnreadMap[chanKey] = (newUnreadMap[chanKey] || 0) + 1;
          count++;
        }
      });

      unreadMapRef.current = newUnreadMap;
      setTotalUnread(count);
    } catch (e) {
      console.error('Unread compute error:', e);
    }
  }, [currentUser.id]);

  // Subscribe to new messages for realtime unread count
  const subscribeUnread = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const ch = supabase
      .channel(`widget_unread_${currentUser.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload: any) => {
          const msg = payload.new;
          if (msg.sender_id === currentUser.id) return; // own message

          let chanKey: string;
          if (msg.channel === 'admin_general') {
            chanKey = 'group';
          } else if (msg.receiver_id === currentUser.id) {
            chanKey = `dm_${[msg.sender_id, msg.receiver_id].sort().join('_')}`;
          } else {
            return;
          }

          // If widget is open and showing this channel, mark as read immediately
          // Otherwise increment unread
          if (!isOpen) {
            setTotalUnread(prev => prev + 1);
            unreadMapRef.current[chanKey] = (unreadMapRef.current[chanKey] || 0) + 1;
          } else {
            // Widget is open - user is in chat, mark as read
            const now = Date.now();
            setReadTimestamp(currentUser.id, chanKey, now);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = ch;
  }, [currentUser.id, isOpen]);

  useEffect(() => {
    computeUnread();
    subscribeUnread();
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [computeUnread, subscribeUnread]);

  // When widget opens, mark all as read and reset unread count
  const handleOpen = () => {
    setIsOpen(true);
    // Mark all channels as read at current timestamp
    const now = Date.now();
    Object.keys(unreadMapRef.current).forEach(chanKey => {
      setReadTimestamp(currentUser.id, chanKey, now);
    });
    // Also mark group as read
    setReadTimestamp(currentUser.id, 'group', now);
    setTotalUnread(0);
    unreadMapRef.current = {};
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className={`fixed bottom-20 right-4 z-[90] ${isOpen ? 'hidden sm:block' : ''}`}>
        <button
          onClick={isOpen ? handleClose : handleOpen}
          className="relative w-14 h-14 rounded-full bg-blue-600 shadow-2xl text-white flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all duration-200 hover:shadow-blue-600/40"
          aria-label="เปิด/ปิดแชท"
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}

          {/* Unread Badge */}
          {!isOpen && totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white animate-bounce">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
      </div>

      {/* Chat Popup */}
      {isOpen && (
        <div
          className={`
            fixed z-[200]
            inset-0 sm:inset-auto
            sm:bottom-36 sm:right-4
            w-full sm:w-[600px]
            h-[100dvh] sm:h-[700px]
            max-h-none sm:max-h-[80vh]
            rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 bg-white overflow-hidden
            sm:animate-in sm:zoom-in-95 sm:slide-in-from-bottom-4 sm:duration-200
          `}
        >
          {/* Popup Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white flex-shrink-0">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="font-black text-sm">แชท</span>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              aria-label="ปิด"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat Content */}
          <div className="flex-1 overflow-hidden flex flex-col" style={{ height: 'calc(100% - 52px)' }}>
            <ChatInWidget
              currentUser={currentUser}
              members={members}
              isAdmin={isAdmin}
              canDmAll={canDmAll}
            />
          </div>
        </div>
      )}
    </>
  );
};

// Inner chat component with compact styling for the widget
const ChatInWidget: React.FC<ChatWidgetProps> = ({ currentUser, members, isAdmin, canDmAll }) => {
  return (
    <div className="h-full flex flex-col">
      <Chat
        currentUser={currentUser}
        members={members}
        isAdmin={isAdmin}
        canDmAll={canDmAll}
      />
    </div>
  );
};

export default ChatWidget;
