'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Attack, Position } from '@/types/attack';
import { attackToArc } from '@/lib/attackToArc';

const MAX_ARCS = 80; // keep the globe readable
const MAX_ATTACKS = 200;

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
  const seenIds = useRef<Set<string>>(new Set());
  const lastSeenTimestamp = useRef<string>(new Date().toISOString());

  const normalizeAttack = useCallback((attack: Attack): Attack => {
    const normalized = { ...attack } as Attack & {
      source_location: Attack['source_location'] | string;
      target_location: Attack['target_location'] | string;
    };

    if (typeof normalized.source_location === 'string') {
      try {
        normalized.source_location = JSON.parse(normalized.source_location);
      } catch {
        normalized.source_location = { lat: 0, lng: 0, country: 'Unknown' };
      }
    }

    if (typeof normalized.target_location === 'string') {
      try {
        normalized.target_location = JSON.parse(normalized.target_location);
      } catch {
        normalized.target_location = { lat: 0, lng: 0, city: 'Unknown', country: 'Unknown' };
      }
    }

    return normalized as Attack;
  }, []);

  const processAttack = useCallback((attack: Attack) => {
    const normalized = normalizeAttack(attack);
    if (seenIds.current.has(attack.id)) return;
    seenIds.current.add(attack.id);
    console.log('Processing attack:', normalized.source_ip, normalized.severity);
    orderRef.current += 1;
    const arc = attackToArc(normalized, orderRef.current);
    if (normalized.timestamp && normalized.timestamp > lastSeenTimestamp.current) {
      lastSeenTimestamp.current = normalized.timestamp;
    }

    setAttacks((prev) => [normalized, ...prev].slice(0, MAX_ATTACKS));
    setArcs((prev) => [...prev, arc].slice(-MAX_ARCS));
    setCountryCounts((prev) => ({
      ...prev,
      [normalized.source_location.country || 'Unknown']:
        (prev[normalized.source_location.country || 'Unknown'] || 0) + 1,
    }));
    setStats((prev) => ({
      total: prev.total + 1,
      low: prev.low + (normalized.severity === 'low' ? 1 : 0),
      medium: prev.medium + (normalized.severity === 'medium' ? 1 : 0),
      high: prev.high + (normalized.severity === 'high' ? 1 : 0),
    }));
  }, [normalizeAttack]);

  useEffect(() => {
    const client = getSupabase();
    if (client) {
      console.log('📡 Connecting to Supabase Realtime (Database mode)...');

      let active = true;
      const pollLatest = async () => {
        const query = client
          .from('attacks')
          .select('*')
          .gt('timestamp', lastSeenTimestamp.current)
          .order('timestamp', { ascending: true })
          .limit(50);

        const { data, error } = await query;
        if (!active || error || !data) return;
        data.forEach((attack) => processAttack(attack as Attack));
      };
      
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

      const interval = setInterval(pollLatest, 3000);

      return () => {
        active = false;
        clearInterval(interval);
        client.removeChannel(channel);
      };
    }

    return undefined;
  }, [processAttack]);

  return { attacks, arcs, countryCounts, stats };
}
