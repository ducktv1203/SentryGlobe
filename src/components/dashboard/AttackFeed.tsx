'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Attack, SEVERITY_COLORS, ATTACK_TYPE_LABELS } from '@/types/attack';

interface AttackFeedProps {
  attacks: Attack[];
}

export default function AttackFeed({ attacks }: AttackFeedProps) {
  const recent = attacks.slice(0, 8);

  return (
    <div className="pointer-events-auto w-80 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-5 shadow-2xl shadow-cyan-500/5 max-h-[340px] overflow-hidden">
      <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400 mb-4 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        Live Global Threat Feed
      </h2>

      <AnimatePresence mode="popLayout" initial={false}>
        {recent.map((attack) => (
          <motion.div
            key={attack.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="mb-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: SEVERITY_COLORS[attack.severity],
                    boxShadow: `0 0 6px ${SEVERITY_COLORS[attack.severity]}`,
                  }}
                />
                <span className="text-[11px] font-mono text-gray-300">
                  {attack.source_ip}
                </span>
              </div>
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  color: SEVERITY_COLORS[attack.severity],
                  backgroundColor: `${SEVERITY_COLORS[attack.severity]}15`,
                }}
              >
                {ATTACK_TYPE_LABELS[attack.type]}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-medium">
                  {attack.source_location.country}
                </span>
                <span className="text-[10px] text-cyan-500/80 font-bold tracking-tighter">
                  VERIFIED
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">
                  Target: {attack.target_location.city}, {attack.target_location.country}
                </span>
                <span className="text-[9px] text-gray-600 font-mono">
                  {new Date(attack.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
