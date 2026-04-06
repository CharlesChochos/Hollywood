'use client';

import { useEffect, useCallback, useRef } from 'react';
import type { CanvasNode } from '@hollywood/types';
import { getSocket } from '@/lib/socket';

interface CanvasSyncOptions {
  projectId: string;
  onRemoteNodeUpdate: (node: CanvasNode) => void;
  onRemoteNodeCreate: (node: CanvasNode) => void;
}

/**
 * Syncs canvas node changes across tabs/users via Socket.io.
 * Only broadcasts position and data changes — layout is local.
 */
export function useCanvasSync({ projectId, onRemoteNodeUpdate, onRemoteNodeCreate }: CanvasSyncOptions) {
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();

    socket.emit('project:join', { projectId });

    socket.on('canvas:nodeUpdated', (data) => {
      if (data.senderId === socket.id) return;
      onRemoteNodeUpdate(data.node);
    });

    socket.on('canvas:nodeCreated', (data) => {
      if (data.senderId === socket.id) return;
      onRemoteNodeCreate(data.node);
    });

    return () => {
      socket.off('canvas:nodeUpdated');
      socket.off('canvas:nodeCreated');
      socket.emit('project:leave', { projectId });
    };
  }, [projectId, onRemoteNodeUpdate, onRemoteNodeCreate]);

  const broadcastNodeUpdate = useCallback(
    (node: CanvasNode) => {
      const socket = socketRef.current;
      socket.emit('canvas:nodeUpdate', {
        projectId,
        node,
        senderId: socket.id ?? '',
      });
    },
    [projectId],
  );

  const broadcastNodeCreate = useCallback(
    (node: CanvasNode) => {
      const socket = socketRef.current;
      socket.emit('canvas:nodeCreate', {
        projectId,
        node,
        senderId: socket.id ?? '',
      });
    },
    [projectId],
  );

  return { broadcastNodeUpdate, broadcastNodeCreate };
}
