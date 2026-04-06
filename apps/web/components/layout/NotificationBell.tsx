'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, XCircle, Info, Check, Trash2 } from 'lucide-react';
import { useNotifications, type Notification } from '@/stores/use-notifications';

const ICON_MAP = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const COLOR_MAP = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-blue-400',
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotificationItem({ notification }: { notification: Notification }) {
  const Icon = ICON_MAP[notification.type];
  const dismiss = useNotifications((s) => s.dismiss);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors ${
        !notification.read ? 'bg-zinc-800/30' : ''
      }`}
    >
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${COLOR_MAP[notification.type]}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-200 font-medium">{notification.title}</p>
        {notification.message && (
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{notification.message}</p>
        )}
        <p className="text-xs text-zinc-600 mt-1">{timeAgo(notification.timestamp)}</p>
      </div>
      <button
        onClick={() => dismiss(notification.id)}
        className="text-zinc-600 hover:text-zinc-400 p-0.5 shrink-0"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notifications = useNotifications((s) => s.notifications);
  const unreadCount = useNotifications((s) => s.unreadCount);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const clear = useNotifications((s) => s.clear);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open && unreadCount > 0) {
      markAllRead();
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h4 className="text-sm font-semibold text-zinc-200">Notifications</h4>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllRead}
                    className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                    title="Mark all read"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={clear}
                    className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                    title="Clear all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/50">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => <NotificationItem key={n.id} notification={n} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
