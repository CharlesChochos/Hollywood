'use client';

import { useParams } from 'next/navigation';
import {
  BarChart3,
  Play,
  Image as ImageIcon,
  Share2,
  TrendingUp,
  Youtube,
  Instagram,
  Loader2,
  Film,
  ExternalLink,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function DistributionPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const projectQuery = trpc.project.getById.useQuery({ id: projectId });
  const assetsQuery = trpc.asset.listByProject.useQuery({ projectId });
  const agentJobsQuery = trpc.agent.getByProject.useQuery({ projectId });

  const marketingJobs = agentJobsQuery.data?.filter((j) => j.agentType === 'marketing') ?? [];
  const isMarketingDone = marketingJobs.some((j) => j.status === 'completed');
  const trailers = assetsQuery.data?.filter((a) => a.type === 'trailer') ?? [];
  const thumbnails = assetsQuery.data?.filter((a) => a.type === 'thumbnail') ?? [];

  if (projectQuery.isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 text-zinc-600 animate-spin" /></div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-cyan-400" />
          <h1 className="text-xl font-semibold text-zinc-200">Distribution Dashboard</h1>
        </div>

        {!isMarketingDone ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Film className="h-16 w-16 text-zinc-800 mb-4" />
            <h2 className="text-lg font-medium text-zinc-400">Marketing Assets Pending</h2>
            <p className="text-sm text-zinc-600 mt-2 max-w-md">
              Complete the production pipeline to generate trailers, thumbnails, and social media content.
            </p>
            {marketingJobs.length > 0 && (
              <div className="mt-4 flex items-center gap-2 text-xs text-amber-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Marketing agent {marketingJobs[0].status}...
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Play} label="Trailers" value={trailers.length} color="cyan" />
              <StatCard icon={ImageIcon} label="Thumbnails" value={thumbnails.length} color="violet" />
              <StatCard icon={Share2} label="Social Posts" value={3} color="amber" />
              <StatCard icon={TrendingUp} label="Platforms" value={3} color="green" />
            </div>

            {/* Asset Gallery */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Asset Gallery</h2>

              {/* Trailers */}
              {trailers.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-zinc-500">Trailers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {trailers.map((trailer) => (
                      <div key={trailer.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                        <div className="h-16 w-28 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                          <Play className="h-6 w-6 text-zinc-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">{trailer.fileName}</p>
                          <p className="text-xs text-zinc-500">{trailer.duration?.toFixed(1)}s &bull; {trailer.width ?? 1920}x{trailer.height ?? 1080}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Thumbnails */}
              {thumbnails.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-zinc-500">Thumbnails</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {thumbnails.map((thumb) => (
                      <div key={thumb.id} className="aspect-video bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-zinc-700" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Platform Status */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Platform Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PlatformCard platform="YouTube" icon={Youtube} status="Ready to upload" color="red" />
                <PlatformCard platform="Instagram" icon={Instagram} status="Ready to upload" color="pink" />
                <PlatformCard platform="TikTok" icon={Share2} status="Ready to upload" color="cyan" />
              </div>
            </section>

            {/* AI Suggestions */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">AI Suggestions</h2>
              <div className="space-y-3">
                <SuggestionCard
                  text="Generate 5 ad variants targeting different demographics"
                  action="Generate"
                />
                <SuggestionCard
                  text="Create a 15-second vertical cut optimized for TikTok"
                  action="Create"
                />
                <SuggestionCard
                  text="Generate A/B test thumbnails with different color schemes"
                  action="Generate"
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 text-${color}-400`} />
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-200">{value}</p>
    </div>
  );
}

function PlatformCard({ platform, icon: Icon, status, color }: { platform: string; icon: React.ElementType; status: string; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 text-${color}-400`} />
        <div>
          <p className="text-sm font-medium text-zinc-200">{platform}</p>
          <p className="text-xs text-zinc-500">{status}</p>
        </div>
      </div>
      <button className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors">
        <ExternalLink className="h-4 w-4" />
      </button>
    </div>
  );
}

function SuggestionCard({ text, action }: { text: string; action: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4">
      <p className="text-sm text-zinc-300">{text}</p>
      <button className="shrink-0 px-3 py-1.5 text-xs font-medium bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors">
        {action}
      </button>
    </div>
  );
}
