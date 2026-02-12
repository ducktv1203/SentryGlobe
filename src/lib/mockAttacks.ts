import { Attack } from '@/types/attack';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const ATTACK_TYPES: Attack['type'][] = [
  'UDP Flood',
  'SYN Flood',
  'HTTP Request',
  'DNS Amplification',
];

interface SourcePool {
  country: string;
  lat: number;
  lng: number;
}

const SOURCE_POOL: SourcePool[] = [
  { country: 'China', lat: 39.9, lng: 116.4 },
  { country: 'Russia', lat: 55.75, lng: 37.62 },
  { country: 'United States', lat: 38.9, lng: -77.04 },
  { country: 'Brazil', lat: -15.79, lng: -47.88 },
  { country: 'India', lat: 28.61, lng: 77.23 },
  { country: 'Iran', lat: 35.69, lng: 51.39 },
  { country: 'North Korea', lat: 39.03, lng: 125.75 },
  { country: 'Vietnam', lat: 21.03, lng: 105.85 },
  { country: 'Indonesia', lat: -6.21, lng: 106.85 },
  { country: 'Turkey', lat: 39.93, lng: 32.85 },
  { country: 'Ukraine', lat: 50.45, lng: 30.52 },
  { country: 'Nigeria', lat: 9.06, lng: 7.49 },
  { country: 'Germany', lat: 52.52, lng: 13.41 },
  { country: 'Netherlands', lat: 52.37, lng: 4.9 },
  { country: 'South Korea', lat: 37.57, lng: 126.98 },
];

interface TargetPool {
  city: string;
  lat: number;
  lng: number;
}

const TARGET_POOL: TargetPool[] = [
  { city: 'Adelaide', lat: -34.92, lng: 138.6 },
  { city: 'Brisbane', lat: -27.47, lng: 153.03 },
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomIP(): string {
  return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

/**
 * Generate a random mock Attack object for development/demo.
 */
export function generateMockAttack(): Attack {
  const source = randomItem(SOURCE_POOL);
  const target = randomItem(TARGET_POOL);

  // Weighted severity: 50% low, 30% medium, 20% high
  const roll = Math.random();
  let severity: Attack['severity'];
  if (roll < 0.5) severity = 'low';
  else if (roll < 0.8) severity = 'medium';
  else severity = 'high';

  return {
    id: generateId(),
    source_ip: randomIP(),
    source_location: {
      country: source.country,
      lat: source.lat + (Math.random() - 0.5) * 4, // slight jitter
      lng: source.lng + (Math.random() - 0.5) * 4,
    },
    target_location: {
      city: target.city,
      lat: target.lat,
      lng: target.lng,
    },
    severity,
    type: randomItem(ATTACK_TYPES),
    timestamp: new Date().toISOString(),
  };
}
