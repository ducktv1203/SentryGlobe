export interface AttackLocation {
  city?: string;
  country?: string;
  lat: number;
  lng: number;
}

export interface Attack {
  id: string;
  source_ip: string;
  target_location: AttackLocation;
  source_location: AttackLocation;
  severity: "low" | "medium" | "high";
  type: "UDP Flood" | "SYN Flood" | "HTTP Request" | "DNS Amplification" | "Port Scan" | "Brute Force";
  timestamp: string;
}

export interface Position {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
  severity: Attack["severity"];
  targetCountry?: string;
}

export type SeverityColors = Record<Attack["severity"], string>;

export const SEVERITY_COLORS: SeverityColors = {
  low: "#00b4ff", // neon blue
  medium: "#ffcc00", // neon yellow
  high: "#ff003c", // neon red
};

export const ATTACK_TYPE_LABELS: Record<Attack["type"], string> = {
  "UDP Flood": "UDP",
  "SYN Flood": "SYN",
  "HTTP Request": "HTTP",
  "DNS Amplification": "DNS",
  "Port Scan": "SCAN",
  "Brute Force": "BRUTE",
};
