'use client';

import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  add: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

let idCounter = 0;

export const useNotifications = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,

  add: (notification) =>
    set((state) => {
      const newNotif: Notification = {
        ...notification,
        id: `notif-${++idCounter}`,
        timestamp: Date.now(),
        read: false,
      };
      // Keep last 50 notifications max
      const notifications = [newNotif, ...state.notifications].slice(0, 50);
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  dismiss: (id) =>
    set((state) => {
      const notifications = state.notifications.filter((n) => n.id !== id);
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    }),

  clear: () => set({ notifications: [], unreadCount: 0 }),
}));
