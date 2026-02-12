'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Attack, Position } from '@/types/attack';
import { attackToArc } from '@/lib/attackToArc';
import { generateMockAttack } from '@/lib/mockAttacks';

const MAX_ARCS = 30; // keep the globe readable

/**
 * Subscribe to Supabase Realtime broadcast for live attacks.
 * Falls back to local mock generation if no Supabase credentials are configured.
 */
export function useRealtimeAttacks() {
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [arcs, setArcs] = useState<Position[]>([]);
  const [countryCounts, setCountryCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ total: 0, low: 0, medium: 0, high: 0 });
  const orderRef = useRef(0);

  const processAttack = useCallback((attack: Attack) => {
    console.log('Processing attack:', attack.source_ip, attack.severity);
    orderRef.current += 1;
    const arc = attackToArc(attack, orderRef.current);

    setAttacks((prev) => [attack, ...prev].slice(0, 50));
    setArcs((prev) => [...prev, arc].slice(-MAX_ARCS));
    setCountryCounts((prev) => ({
      ...prev,
      [attack.source_location.country || 'Unknown']:
        (prev[attack.source_location.country || 'Unknown'] || 0) + 1,
    }));
    setStats((prev) => ({
      total: prev.total + 1,
      low: prev.low + (attack.severity === 'low' ? 1 : 0),
      medium: prev.medium + (attack.severity === 'medium' ? 1 : 0),
      high: prev.high + (attack.severity === 'high' ? 1 : 0),
    }));
  }, []);

  useEffect(() => {
    const client = getSupabase();
    if (client) {
      console.log('📡 Connecting to Supabase Realtime (Database mode)...');
      
      const channel = client
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'attacks',
          },
          (payload) => {
            console.log('🔥 New attack from DB:', payload.new);
            processAttack(payload.new as Attack);
          }
        )
        .subscribe((status) => {
          console.log('Realtime status:', status);
        });

      return () => {
        client.removeChannel(channel);
      };
    }

    // Fallback: generate mock attacks locally
    const interval = setInterval(() => {
      const mock = generateMockAttack();
      processAttack(mock);
    }, 2500);

    return () => clearInterval(interval);
  }, [processAttack]);

  return { attacks, arcs, countryCounts, stats };
}
