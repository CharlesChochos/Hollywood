'use client';

import { useEffect, useCallback } from 'react';
import { create } from 'zustand';
import { getSocket } from '../lib/socket';
import type { AgentType, AgentOutput } from '@hollywood/types';

interface AgentJobProgress {
  jobId: string;
  agentType: AgentType;
  progress: number;
  message: string;
  status: 'active' | 'completed' | 'failed';
  error?: string;
}

interface AgentProgressStore {
  jobs: Map<string, AgentJobProgress>;
  setJob: (jobId: string, data: AgentJobProgress) => void;
  removeJob: (jobId: string) => void;
  clear: () => void;
}

export const useAgentProgressStore = create<AgentProgressStore>((set) => ({
  jobs: new Map(),
  setJob: (jobId, data) =>
    set((state) => {
      const jobs = new Map(state.jobs);
      jobs.set(jobId, data);
      return { jobs };
    }),
  removeJob: (jobId) =>
    set((state) => {
      const jobs = new Map(state.jobs);
      jobs.delete(jobId);
      return { jobs };
    }),
  clear: () => set({ jobs: new Map() }),
}));

/**
 * Hook that connects to the realtime server and tracks agent progress
 * for a given project. Automatically joins/leaves the project room.
 */
export function useAgentProgress(projectId: string | undefined) {
  const { setJob } = useAgentProgressStore();

  useEffect(() => {
    if (!projectId) return;

    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('project:join', { projectId });

    socket.on('agent:progress', (data) => {
      setJob(data.jobId, { ...data, status: 'active' });
    });

    socket.on('agent:completed', (data) => {
      setJob(data.jobId, {
        jobId: data.jobId,
        agentType: data.agentType,
        progress: 100,
        message: 'Completed',
        status: 'completed',
      });
    });

    socket.on('agent:failed', (data) => {
      setJob(data.jobId, {
        jobId: data.jobId,
        agentType: data.agentType,
        progress: 0,
        message: data.error,
        status: 'failed',
        error: data.error,
      });
    });

    return () => {
      socket.emit('project:leave', { projectId });
      socket.off('agent:progress');
      socket.off('agent:completed');
      socket.off('agent:failed');
    };
  }, [projectId, setJob]);

  return useAgentProgressStore((state) => state.jobs);
}
