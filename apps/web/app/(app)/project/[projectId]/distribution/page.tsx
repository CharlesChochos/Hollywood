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
  Download,
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
                      <AssetCard key={trailer.id} asset={trailer} icon={Play} />
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
                      <AssetCard key={thumb.id} asset={thumb} icon={ImageIcon} compact />
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

function AssetCard({ asset, icon: Icon, compact }: { asset: { id: string; fileName: string; duration?: number | null; width?: number | null; height?: number | null }; icon: React.ElementType; compact?: boolean }) {
  const utils = trpc.useUtils();

  const handleDownload = async () => {
    try {
      const { url } = await utils.asset.getDownloadUrl.fetch({ assetId: asset.id });
      window.open(url, '_blank');
    } catch {
      // S3 not configured in dev — show placeholder notice
      alert('Download not available — S3 storage is not configured in this environment.');
    }
  };

  if (compact) {
    return (
      <div className="aspect-video bg-zinc-800 border border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-2 group relative">
        <Icon className="h-8 w-8 text-zinc-700" />
        <button
          onClick={handleDownload}
          className="absolute bottom-2 right-2 p-1.5 bg-zinc-900/80 rounded-md text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
      <div className="h-16 w-28 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
        <Icon className="h-6 w-6 text-zinc-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200 truncate">{asset.fileName}</p>
        <p className="text-xs text-zinc-500">
          {asset.duration ? `${asset.duration.toFixed(1)}s` : ''} {asset.width ? `${asset.width}x${asset.height}` : ''}
        </p>
      </div>
      <button
        onClick={handleDownload}
        className="p-2 text-zinc-500 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        title="Download asset"
      >
        <Download className="h-4 w-4" />
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
