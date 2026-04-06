'use client';

import { useParams } from 'next/navigation';
import { useState, useCallback, useMemo } from 'react';
import {
  Clock,
  Clapperboard,
  Image,
  Mic,
  Film,
  Scissors,
  Megaphone,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  RotateCcw,
  Ban,
  Filter,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

const AGENT_META: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  script_writer:       { label: 'Script Writer',       icon: FileText,    color: 'text-blue-400' },
  storyboard_creator:  { label: 'Storyboard Creator',  icon: Image,       color: 'text-purple-400' },
  character_generator: { label: 'Character Generator',  icon: Clapperboard, color: 'text-emerald-400' },
  voice_actor:         { label: 'Voice Actor',          icon: Mic,         color: 'text-rose-400' },
  video_generator:     { label: 'Video Generator',      icon: Film,        color: 'text-cyan-400' },
  editing:             { label: 'Editing',              icon: Scissors,    color: 'text-orange-400' },
  marketing:           { label: 'Marketing',            icon: Megaphone,   color: 'text-yellow-400' },
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-400" />;
    case 'active':
      return <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />;
    default:
      return <Circle className="h-4 w-4 text-zinc-600" />;
  }
}

function formatDuration(start: string | Date, end?: string | Date | null): string {
  if (!end) return 'running...';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Simple toast notification
function Toast({ message, type, onDismiss }: { message: string; type: 'success' | 'error'; onDismiss: () => void }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-bottom-4 ${
        type === 'success'
          ? 'bg-green-900/90 border-green-700 text-green-200'
          : 'bg-red-900/90 border-red-700 text-red-200'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0" />
      )}
      <span className="text-sm">{message}</span>
      <button onClick={onDismiss} className="text-xs opacity-60 hover:opacity-100 ml-2">
        dismiss
      </button>
    </div>
  );
}

export default function TimelinePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const jobsQuery = trpc.agent.getByProject.useQuery(
    { projectId, limit: 100 },
    { refetchInterval: 5000 }, // Poll every 5s for live updates
  );

  const retryMutation = trpc.agent.retry.useMutation({
    onSuccess: () => {
      showToast('Job re-queued successfully', 'success');
      jobsQuery.refetch();
    },
    onError: (err) => showToast(`Retry failed: ${err.message}`, 'error'),
  });

  const cancelMutation = trpc.agent.cancel.useMutation({
    onSuccess: () => {
      showToast('Job cancelled', 'success');
      jobsQuery.refetch();
    },
    onError: (err) => showToast(`Cancel failed: ${err.message}`, 'error'),
  });

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<string | null>(null);

  const jobs = jobsQuery.data ?? [];

  const filteredJobs = useMemo(() => {
    let list = jobs;
    if (statusFilter) list = list.filter((j) => j.status === statusFilter);
    if (agentFilter) list = list.filter((j) => j.agentType === agentFilter);
    return list;
  }, [jobs, statusFilter, agentFilter]);

  const sortedJobs = [...filteredJobs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const phases = [
    { key: 'script_writer', jobs: sortedJobs.filter((j) => j.agentType === 'script_writer') },
    { key: 'parallel', jobs: sortedJobs.filter((j) =>
      ['storyboard_creator', 'character_generator', 'voice_actor'].includes(j.agentType)),
    },
    { key: 'video_generator', jobs: sortedJobs.filter((j) => j.agentType === 'video_generator') },
    { key: 'editing', jobs: sortedJobs.filter((j) => j.agentType === 'editing') },
    { key: 'marketing', jobs: sortedJobs.filter((j) => j.agentType === 'marketing') },
  ];

  const phaseLabels: Record<string, string> = {
    script_writer: 'Phase 1: Script Writing',
    parallel: 'Phase 2: Storyboard + Characters + Voice (Parallel)',
    video_generator: 'Phase 3: Video Generation',
    editing: 'Phase 4: Final Cut Assembly',
    marketing: 'Phase 5: Marketing & Distribution',
  };

  if (jobsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading timeline...
      </div>
    );
  }

  if (sortedJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-4">
        <Clock className="h-12 w-12 text-zinc-600" />
        <div className="text-center">
          <p className="text-lg font-medium text-zinc-300">No pipeline activity yet</p>
          <p className="text-sm mt-1">
            Create an idea on the Director&apos;s Map to start the pipeline
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            Pipeline Timeline
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} ·{' '}
            {jobs.filter((j) => j.status === 'completed').length} completed ·{' '}
            {jobs.filter((j) => j.status === 'active').length} active ·{' '}
            {jobs.filter((j) => j.status === 'failed').length} failed
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />

          {/* Status filters */}
          {[null, 'completed', 'active', 'failed', 'queued'].map((status) => (
            <button
              key={status ?? 'all'}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-amber-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {status ?? 'All statuses'}
            </button>
          ))}

          <span className="text-zinc-700">|</span>

          {/* Agent type filters */}
          {[null, ...Object.keys(AGENT_META)].map((agent) => (
            <button
              key={agent ?? 'all-agents'}
              onClick={() => setAgentFilter(agent)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                agentFilter === agent
                  ? 'bg-amber-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {agent ? (AGENT_META[agent]?.label ?? agent) : 'All agents'}
            </button>
          ))}
        </div>

        {sortedJobs.length === 0 && (statusFilter || agentFilter) && (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-sm text-zinc-400">No jobs match the current filters</p>
            <button
              onClick={() => { setStatusFilter(null); setAgentFilter(null); }}
              className="mt-2 text-xs text-amber-500 hover:text-amber-400"
            >
              Clear filters
            </button>
          </div>
        )}

        {phases.map((phase) => {
          if (phase.jobs.length === 0) return null;

          return (
            <div key={phase.key} className="relative">
              {/* Phase header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {phaseLabels[phase.key]}
                </span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              {/* Job cards */}
              <div className="space-y-2 ml-4 border-l-2 border-zinc-800 pl-6">
                {phase.jobs.map((job) => {
                  const meta = AGENT_META[job.agentType] ?? {
                    label: job.agentType,
                    icon: Circle,
                    color: 'text-zinc-400',
                  };
                  const Icon = meta.icon;
                  const isFailed = job.status === 'failed';
                  const isActive = job.status === 'active';
                  const isQueued = job.status === 'queued';

                  return (
                    <div
                      key={job.id}
                      className={`relative bg-zinc-900/50 border rounded-lg p-4 transition-colors ${
                        isFailed
                          ? 'border-red-900/50 hover:border-red-800'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-4 w-4 h-4 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center">
                        <StatusIcon status={job.status} />
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${meta.color}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-200">{meta.label}</p>
                            {job.targetEntityId && (
                              <p className="text-xs text-zinc-500 mt-0.5">
                                Target: {job.targetEntityType} {job.targetEntityId.slice(0, 8)}...
                              </p>
                            )}
                            {job.error && (
                              <p className="text-xs text-red-400 mt-1 break-words">
                                {job.error}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Action buttons */}
                          {isFailed && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                retryMutation.mutate({ jobId: job.id });
                              }}
                              disabled={retryMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-400 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-800/50 rounded-md transition-colors disabled:opacity-50"
                              title="Retry this job"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Retry
                            </button>
                          )}
                          {(isActive || isQueued) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelMutation.mutate({ jobId: job.id });
                              }}
                              disabled={cancelMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-400 bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 rounded-md transition-colors disabled:opacity-50"
                              title="Cancel this job"
                            >
                              <Ban className="h-3 w-3" />
                              Cancel
                            </button>
                          )}

                          {/* Timestamp */}
                          <div className="text-right text-xs text-zinc-500">
                            <p>{formatTime(job.createdAt)}</p>
                            {job.startedAt && (
                              <p className="text-zinc-600">
                                {formatDuration(job.startedAt, job.completedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar for active jobs */}
                      {isActive && (
                        <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${job.progress ?? 0}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
