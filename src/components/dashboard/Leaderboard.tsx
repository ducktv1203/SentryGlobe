'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { SEVERITY_COLORS } from '@/types/attack';

interface LeaderboardProps {
  countryCounts: Record<string, number>;
}

export default function Leaderboard({ countryCounts }: LeaderboardProps) {
  const sorted = Object.entries(countryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

  return (
    <div className="pointer-events-auto w-72 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-5 shadow-2xl shadow-cyan-500/5">
      <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400 mb-4 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        Top Attacking Countries
      </h2>

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
                    style={{ color: SEVERITY_COLORS[severity] }}
                  >
                    {count.toLocaleString()}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: SEVERITY_COLORS[severity],
                      boxShadow: `0 0 8px ${SEVERITY_COLORS[severity]}40`,
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
