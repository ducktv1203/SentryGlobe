'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { SEVERITY_COLORS, SeverityColors } from '@/types/attack';

interface LeaderboardProps {
  countryCounts: Record<string, number>;
  title?: string;
  subtitle?: string;
  severityColors?: SeverityColors;
}

export default function Leaderboard({ countryCounts, title, subtitle, severityColors }: LeaderboardProps) {
  const palette = severityColors || SEVERITY_COLORS;
  const sorted = Object.entries(countryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;
  const heading = title || 'Top Attacking Countries';

  return (
    <div
      className="pointer-events-auto w-72 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-5 shadow-2xl"
      style={{ boxShadow: '0 18px 40px -24px var(--accent-shadow)' }}
    >
      <div className="mb-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-accent flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
          {heading}
        </h2>
        {subtitle && (
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {sorted.length === 0 && (
        <p className="text-gray-500 text-xs italic">Waiting for data…</p>
      )}

      <AnimatePresence mode="popLayout">
        {sorted.map(([country, count], index) => {
          const pct = (count / maxCount) * 100;
          const severity =
            count > 20 ? 'high' : count > 8 ? 'medium' : 'low';

          return (
            <motion.div
              key={country}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              className="flex items-center gap-3 mb-2.5"
            >
              <span className="text-[10px] font-mono text-gray-500 w-4 text-right">
                {index + 1}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-200 truncate">
                    {country}
                  </span>
                  <span
                    className="text-[11px] font-mono font-bold ml-2"
                    style={{ color: palette[severity] }}
                  >
                    {count.toLocaleString()}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: palette[severity],
                      boxShadow: `0 0 8px ${palette[severity]}40`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
