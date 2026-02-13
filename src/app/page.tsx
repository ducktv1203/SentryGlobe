'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRealtimeAttacks } from '@/hooks/useRealtimeAttacks';
import Leaderboard from '@/components/dashboard/Leaderboard';
import StatsBar from '@/components/dashboard/StatsBar';
import AttackFeed from '@/components/dashboard/AttackFeed';
import { Position, SEVERITY_COLORS, SeverityColors } from '@/types/attack';

// Dynamic import for the 3D globe — no SSR
const GlobeVisualization = dynamic(
  () => import('@/components/globe/GlobeVisualization'),
  { ssr: false }
);

export default function Home() {
  const { attacks, arcs } = useRealtimeAttacks();
  const [viewMode, setViewMode] = useState<'global' | 'country'>('global');
  const [selectedCountry, setSelectedCountry] = useState<string>('Australia');

  const availableCountries = useMemo(() => {
    const countries = new Set<string>();
    attacks.forEach((attack) => {
      const country = attack.target_location.country;
      if (country && country.trim().length > 0) {
        countries.add(country);
      }
    });
    return Array.from(countries).sort((a, b) => a.localeCompare(b));
  }, [attacks]);

  useEffect(() => {
    if (viewMode !== 'country') return;
    if (availableCountries.length === 0) return;
    if (!availableCountries.includes(selectedCountry)) {
      setSelectedCountry(availableCountries[0]);
    }
  }, [viewMode, availableCountries, selectedCountry]);

  const filteredAttacks = useMemo(() => {
    if (viewMode === 'global') return attacks;
    return attacks.filter(
      (attack) => attack.target_location.country === selectedCountry
    );
  }, [attacks, viewMode, selectedCountry]);

  const filteredArcs = useMemo(() => {
    if (viewMode === 'global') return arcs;
    return arcs.filter((arc: Position) => arc.targetCountry === selectedCountry);
  }, [arcs, viewMode, selectedCountry]);

  const severityPalette: SeverityColors = useMemo(() => {
    if (viewMode === 'global') return SEVERITY_COLORS;
    return {
      low: '#8b5cf6',
      medium: '#d946ef',
      high: '#f43f5e',
    };
  }, [viewMode]);

  const themedArcs = useMemo(() => {
    return filteredArcs.map((arc) => ({
      ...arc,
      color: severityPalette[arc.severity],
    }));
  }, [filteredArcs, severityPalette]);

  const filteredStats = useMemo(() => {
    return filteredAttacks.reduce(
      (acc, attack) => {
        acc.total += 1;
        if (attack.severity === 'low') acc.low += 1;
        if (attack.severity === 'medium') acc.medium += 1;
        if (attack.severity === 'high') acc.high += 1;
        return acc;
      },
      { total: 0, low: 0, medium: 0, high: 0 }
    );
  }, [filteredAttacks]);

  const filteredCountryCounts = useMemo(() => {
    return filteredAttacks.reduce<Record<string, number>>((acc, attack) => {
      const country = attack.source_location.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});
  }, [filteredAttacks]);

  const themeClass = viewMode === 'global' ? 'theme-global' : 'theme-country';
  const countryLabel = selectedCountry || 'Selected Country';
  const accentColor = viewMode === 'global' ? '#00f0ff' : '#d946ef';
  const feedTitle =
    viewMode === 'global'
      ? 'Live Global Threat Feed'
      : `Live ${countryLabel} Threat Feed`;
  const leaderboardTitle =
    viewMode === 'global'
      ? 'Top Attacking Countries'
      : `Top Attackers Targeting ${countryLabel}`;

  return (
    <main
      className={`relative w-screen h-screen bg-[#030712] overflow-hidden bg-grid-pattern ${themeClass}`}
    >
      <div />

      {/* View Mode Toggle */}
      <div className="absolute top-24 left-6 z-30 pointer-events-auto">
        <div className="flex flex-col gap-2">
          <span
            className="text-[10px] uppercase tracking-widest font-bold"
            style={{ color: 'var(--accent-primary)', opacity: 0.6 }}
          >
            Display Mode
          </span>
          <div
            className="flex items-center bg-[#0a101f]/80 border rounded-full p-1 backdrop-blur-md shadow-lg"
            style={{ borderColor: 'var(--accent-border)', boxShadow: '0 12px 30px -20px var(--accent-shadow)' }}
          >
            <button
              onClick={() => setViewMode('global')}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300 ${
                viewMode === 'global'
                  ? 'text-white'
                  : 'text-gray-400 text-accent-hover'
              }`}
              style={
                viewMode === 'global'
                  ? {
                      backgroundColor: 'var(--accent-primary)',
                      boxShadow: '0 0 16px var(--accent-shadow)',
                    }
                  : undefined
              }
            >
              GLOBAL
            </button>
            <button
              onClick={() => setViewMode('country')}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300 ${
                viewMode === 'country'
                  ? 'text-white'
                  : 'text-gray-400 text-accent-hover'
              }`}
              style={
                viewMode === 'country'
                  ? {
                      backgroundColor: 'var(--accent-primary)',
                      boxShadow: '0 0 16px var(--accent-shadow)',
                    }
                  : undefined
              }
            >
              COUNTRY
            </button>
          </div>
          {viewMode === 'country' && (
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-[0.25em] text-gray-500">
                Target Country
              </span>
              <select
                value={selectedCountry}
                onChange={(event) => setSelectedCountry(event.target.value)}
                className="w-56 rounded-md border bg-[#0a101f]/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-200 outline-none"
                style={{ borderColor: 'var(--accent-border)' }}
                disabled={availableCountries.length === 0}
              >
                {availableCountries.length === 0 && (
                  <option value="">Loading...</option>
                )}
                {availableCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3D Globe - full viewport background */}
      <GlobeVisualization arcs={themedArcs} accentColor={accentColor} />

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
          <StatsBar stats={filteredStats} severityColors={severityPalette} />
        </div>

        {/* Bottom panels */}
        <div className="flex items-end justify-between gap-4">
          {/* Leaderboard - left */}
          <Leaderboard
            countryCounts={filteredCountryCounts}
            title={leaderboardTitle}
            subtitle={viewMode === 'country' ? `Target: ${countryLabel}` : undefined}
            severityColors={severityPalette}
          />

          {/* Attack feed - right */}
          <AttackFeed
            attacks={filteredAttacks}
            title={feedTitle}
            severityColors={severityPalette}
          />
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
