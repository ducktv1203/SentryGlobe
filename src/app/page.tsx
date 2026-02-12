'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRealtimeAttacks } from '@/hooks/useRealtimeAttacks';
import Leaderboard from '@/components/dashboard/Leaderboard';
import StatsBar from '@/components/dashboard/StatsBar';
import AttackFeed from '@/components/dashboard/AttackFeed';
import { Position } from '@/types/attack';

// Dynamic import for the 3D globe — no SSR
const GlobeVisualization = dynamic(
  () => import('@/components/globe/GlobeVisualization'),
  { ssr: false }
);

export default function Home() {
  const { attacks, arcs, countryCounts, stats } = useRealtimeAttacks();
  const [viewMode, setViewMode] = useState<'global' | 'local'>('global');

  // Filter arcs based on view mode (local = Australia only targets)
  const filteredArcs = useMemo(() => {
    if (viewMode === 'global') return arcs;
    return arcs.filter((arc: Position) => arc.targetCountry === 'Australia');
  }, [arcs, viewMode]);

  return (
    <main className="relative w-screen h-screen bg-[#030712] overflow-hidden bg-grid-pattern">
      {/* Scan line effect */}
      <div className="scan-line" />

      {/* View Mode Toggle */}
      <div className="absolute top-24 left-6 z-30 pointer-events-auto">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-cyan-500/60 font-bold">
            Display Mode
          </span>
          <div className="flex items-center bg-[#0a101f]/80 border border-cyan-500/20 rounded-full p-1 backdrop-blur-md shadow-lg shadow-cyan-500/5">
            <button
               onClick={() => setViewMode('global')}
               className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300 ${
                 viewMode === 'global' 
                   ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                   : 'text-gray-400 hover:text-cyan-300'
               }`}
            >
              GLOBAL
            </button>
            <button
               onClick={() => setViewMode('local')}
               className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300 ${
                 viewMode === 'local' 
                   ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                   : 'text-gray-400 hover:text-cyan-300'
               }`}
            >
              AUSTRALIA
            </button>
          </div>
        </div>
      </div>

      {/* 3D Globe - full viewport background */}
      <GlobeVisualization arcs={filteredArcs} />

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
