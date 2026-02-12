import { Attack, Position, SEVERITY_COLORS } from '@/types/attack';

/**
 * Convert an Attack object into an Aceternity Globe Position (arc).
 * The arc altitude is higher for more severe attacks.
 */
export function attackToArc(attack: Attack, order: number): Position {
  const altMap: Record<Attack['severity'], number> = {
    low: 0.1,
    medium: 0.25,
    high: 0.45,
  };

  return {
    order,
    startLat: attack.source_location.lat,
    startLng: attack.source_location.lng,
    endLat: attack.target_location.lat,
    endLng: attack.target_location.lng,
    arcAlt: altMap[attack.severity],
    color: SEVERITY_COLORS[attack.severity],
  };
}
