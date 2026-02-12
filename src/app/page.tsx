'use client';

import dynamic from 'next/dynamic';
import { useRealtimeAttacks } from '@/hooks/useRealtimeAttacks';
import Leaderboard from '@/components/dashboard/Leaderboard';
import StatsBar from '@/components/dashboard/StatsBar';
import AttackFeed from '@/components/dashboard/AttackFeed';

// Dynamic import for the 3D globe — no SSR
const GlobeVisualization = dynamic(
  () => import('@/components/globe/GlobeVisualization'),
  { ssr: false }
);

export default function Home() {
  const { attacks, arcs, countryCounts, stats } = useRealtimeAttacks();

  return (
    <main className="relative w-screen h-screen bg-[#030712] overflow-hidden bg-grid-pattern">
      {/* Scan line effect */}
      <div className="scan-line" />

      {/* 3D Globe - full viewport background */}
      <GlobeVisualization arcs={arcs} />

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
        {/* Top bar */}
        <div className="flex items-start justify-between">
          {/* Title */}
          <div className="pointer-events-auto">
            <h1 className="text-2xl font-black tracking-tight text-shimmer">
              SENTRYGLOBE
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 mt-1">
              Real-Time Threat Intelligence
            </p>
          </div>

          {/* Stats */}
          <StatsBar stats={stats} />
        </div>

        {/* Bottom panels */}
        <div className="flex items-end justify-between gap-4">
          {/* Leaderboard - left */}
          <Leaderboard countryCounts={countryCounts} />

          {/* Attack feed - right */}
          <AttackFeed attacks={attacks} />
        </div>
      </div>

      {/* Corner decorations */}
      <CornerDecorations />
    </main>
  );
}

function CornerDecorations() {
  return (
    <>
      {/* Top-left corner bracket */}
      <div className="absolute top-3 left-3 w-6 h-6 border-t border-l border-cyan-500/30 pointer-events-none z-20" />
      {/* Top-right corner bracket */}
      <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-cyan-500/30 pointer-events-none z-20" />
      {/* Bottom-left corner bracket */}
      <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-cyan-500/30 pointer-events-none z-20" />
      {/* Bottom-right corner bracket */}
      <div className="absolute bottom-3 right-3 w-6 h-6 border-b border-r border-cyan-500/30 pointer-events-none z-20" />
    </>
  );
}
