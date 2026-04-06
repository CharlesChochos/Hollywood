'use client';

import { useParams } from 'next/navigation';
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

export default function TimelinePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const jobsQuery = trpc.agent.getByProject.useQuery({ projectId, limit: 100 });
  const jobs = jobsQuery.data ?? [];

  // Sort by creation time
  const sortedJobs = [...jobs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Group by pipeline phase
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
            {sortedJobs.length} job{sortedJobs.length !== 1 ? 's' : ''} ·{' '}
            {sortedJobs.filter((j) => j.status === 'completed').length} completed ·{' '}
            {sortedJobs.filter((j) => j.status === 'active').length} active ·{' '}
            {sortedJobs.filter((j) => j.status === 'failed').length} failed
          </p>
        </div>

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

                  return (
                    <div
                      key={job.id}
                      className="relative bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
                    >
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-4 w-4 h-4 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center">
                        <StatusIcon status={job.status} />
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <Icon className={`h-5 w-5 mt-0.5 ${meta.color}`} />
                          <div>
                            <p className="text-sm font-medium text-zinc-200">{meta.label}</p>
                            {job.targetEntityId && (
                              <p className="text-xs text-zinc-500 mt-0.5">
                                Target: {job.targetEntityType} {job.targetEntityId.slice(0, 8)}...
                              </p>
                            )}
                            {job.error && (
                              <p className="text-xs text-red-400 mt-1">{job.error}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right text-xs text-zinc-500 shrink-0">
                          <p>{formatTime(job.createdAt)}</p>
                          {job.startedAt && (
                            <p className="text-zinc-600">
                              Duration: {formatDuration(job.startedAt, job.completedAt)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Progress bar for active jobs */}
                      {job.status === 'active' && (
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
    </div>
  );
}
