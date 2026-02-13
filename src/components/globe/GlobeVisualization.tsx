'use client';

import { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Position } from '@/types/attack';

// --- Helper: Lat/Lng to 3D ---
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// --- Globe Mesh ---
function GlobeMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshBasicMaterial
        color="#040714"
        transparent={false}
        opacity={1}
      />
    </mesh>
  );
}

// --- Atmosphere Glow ---
function Atmosphere({ color }: { color: string }) {
  const glowColor = useMemo(() => new THREE.Color(color), [color]);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const vertexShader = `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vNormal;
    uniform vec3 uColor;
    void main() {
      float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
      gl_FragColor = vec4(uColor, 1.0) * intensity * 0.4;
    }
  `;

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uColor.value.set(color);
    materialRef.current.uniforms.uColor.needsUpdate = true;
  }, [glowColor]);

  return (
    <mesh scale={[1.15, 1.15, 1.15]}>
      <sphereGeometry args={[2, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uColor: { value: glowColor } }}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        transparent
      />
    </mesh>
  );
}

// --- World Map Outlines (Vector Lines) ---
function WorldMap({ color }: { color: string }) {
  const data = useLoader(THREE.FileLoader, '/globe.json');
  
  const lineGroups = useMemo(() => {
    if (!data) return [];
    const groups: THREE.Vector3[][] = [];
    const radius = 2.02;

    try {
      const parsed = JSON.parse(data as string);
      
      const processCoords = (coords: [number, number][]) => {
        const points: THREE.Vector3[] = [];
        coords.forEach((coord: [number, number]) => {
          points.push(latLngToVector3(coord[1], coord[0], radius));
        });
        groups.push(points);
      };

      // If it's standard GeoJSON (FeatureCollection)
      if (parsed.features) {
        parsed.features.forEach((feature: { geometry: { type: string; coordinates: [number, number][][] | [number, number][][][] } }) => {
          const type = feature.geometry.type;
          const coords = feature.geometry.coordinates;

          if (type === 'Polygon') {
            (coords as [number, number][][]).forEach((ring) => processCoords(ring));
          } else if (type === 'MultiPolygon') {
            (coords as [number, number][][][]).forEach((polygon) => {
              polygon.forEach((ring) => processCoords(ring));
            });
          }
        });
      }
    } catch (e) {
      console.error("Failed to parse globe.json for outlines", e);
    }
    return groups;
  }, [data]);

  return (
    <group>
      {lineGroups.map((points, i) => (
        <lineLoop key={`country-${i}`}>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial attach="material" color={color} transparent opacity={0.3} linewidth={1} />
        </lineLoop>
      ))}
    </group>
  );
}

// --- Attack Arcs ---
function AttackArcs({ arcs }: { arcs: Position[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<
    Map<string, { line: THREE.Line; mat: THREE.LineBasicMaterial; age: number; fullPoints: THREE.Vector3[] }>
  >(new Map());
  const processedOrders = useRef<Set<number>>(new Set());
  const ARC_TOTAL_DURATION = 2.0;
  const ARC_DRAW_DURATION = 0.7;

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Add new arcs
    arcs.forEach((arc) => {
      // ONLY add if we haven't seen this order ID before in this mount session
      if (processedOrders.current.has(arc.order)) return;
      processedOrders.current.add(arc.order);

      const start = latLngToVector3(arc.startLat, arc.startLng, 2.03);
      const end = latLngToVector3(arc.endLat, arc.endLng, 2.03);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const dist = start.distanceTo(end);
      const altitude = Math.max(dist * 0.55, 0.75) * (1 + arc.arcAlt);
      mid.normalize().multiplyScalar(2 + altitude);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const fullPoints = curve.getPoints(64);

      const geo = new THREE.BufferGeometry().setFromPoints([start, start.clone()]);
      const mat = new THREE.LineBasicMaterial({ color: arc.color, transparent: true, opacity: 1, linewidth: 2 });
      const lineObj = new THREE.Line(geo, mat);
      group.add(lineObj);

      linesRef.current.set(`${arc.order}`, { line: lineObj, mat, age: 0, fullPoints });
    });
  }, [arcs]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Update existing arcs
    linesRef.current.forEach((entry, key) => {
      entry.age += delta;
      const drawProgress = Math.min(entry.age / ARC_DRAW_DURATION, 1);
      const count = Math.ceil(drawProgress * entry.fullPoints.length);
      const visibleSlice = entry.fullPoints.slice(0, Math.max(count, 5));
      entry.line.geometry.setFromPoints(visibleSlice);

      if (entry.age > ARC_DRAW_DURATION) {
        const fadeProgress = Math.min(
          (entry.age - ARC_DRAW_DURATION) / (ARC_TOTAL_DURATION - ARC_DRAW_DURATION),
          1
        );
        entry.mat.opacity = Math.max(1 - fadeProgress, 0);
      }

      if (entry.age >= ARC_TOTAL_DURATION) {
        group.remove(entry.line);
        entry.line.geometry.dispose();
        entry.mat.dispose();
        linesRef.current.delete(key);
      }
    });
  });

  return <group ref={groupRef} />;
}

// --- Impact Rings ---
function ImpactRings({ arcs }: { arcs: Position[] }) {
  const [rings, setRings] = useState<{ position: THREE.Vector3; color: string; key: string }[]>([]);
  const processedOrders = useRef<Set<number>>(new Set());

  useEffect(() => {
    const newRings: { position: THREE.Vector3; color: string; key: string }[] = [];
    let changed = false;

    arcs.forEach((arc) => {
      if (!processedOrders.current.has(arc.order)) {
        processedOrders.current.add(arc.order);
        newRings.push({
          position: latLngToVector3(arc.endLat, arc.endLng, 2.04),
          color: arc.color,
          key: `ring-${arc.order}`
        });
        changed = true;
      }
    });

    if (changed) {
      setRings((prev: { position: THREE.Vector3; color: string; key: string }[]) => [...prev, ...newRings].slice(-15));
    }
  }, [arcs]);

  return (
    <group>
      {rings.map((t: { position: THREE.Vector3; color: string; key: string }) => (
        <ImpactRing key={t.key} position={t.position} color={t.color} />
      ))}
    </group>
  );
}

function ImpactRing({ position, color }: { position: THREE.Vector3; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const age = useRef(0);
  const DURATION = 2.0;
  const MIN_SCALE = 0.05;
  const MAX_SCALE = 0.26;

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    age.current = Math.min(age.current + delta, DURATION);
    const t = Math.min(age.current / DURATION, 1);
    const scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * t;
    const opacity = Math.max(1 - t, 0);
    meshRef.current.scale.setScalar(scale);
    meshRef.current.visible = opacity > 0;
    if (meshRef.current.material instanceof THREE.MeshBasicMaterial) {
      meshRef.current.material.opacity = opacity;
    }
  });

  return (
    <mesh ref={meshRef} position={position} onUpdate={(self) => self.lookAt(position.clone().multiplyScalar(2))}>
      <ringGeometry args={[0.8, 1, 32]} />
      <meshBasicMaterial color={color} transparent opacity={1} side={THREE.DoubleSide} />
    </mesh>
  );
}
// --- Main Globe Dashboard ---
export default function GlobeVisualization({ arcs, accentColor }: { arcs: Position[]; accentColor?: string }) {
  const glowColor = accentColor || '#00f0ff';
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const backRef = useRef<THREE.PointLight>(null);
  const underRef = useRef<THREE.PointLight>(null);

  useEffect(() => {
    if (ambientRef.current) {
      ambientRef.current.color.set(glowColor);
    }
    if (backRef.current) {
      backRef.current.color.set(glowColor);
    }
    if (underRef.current) {
      underRef.current.color.set(glowColor);
    }
  }, [glowColor]);
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight ref={ambientRef} intensity={0.2} color={glowColor} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <pointLight ref={backRef} position={[0, 0, -6]} intensity={0.55} color={glowColor} />
        <pointLight ref={underRef} position={[0, -5, 2]} intensity={0.35} color={glowColor} />
        
        <Suspense fallback={null}>
          <WorldMap color={glowColor} />
        </Suspense>

        <GlobeMesh />
        <Atmosphere color={glowColor} />
        <AttackArcs arcs={arcs} />
        <ImpactRings arcs={arcs} />
        
        <OrbitControls 
          enableZoom={true} 
          enablePan={false}
          autoRotate={true}
          autoRotateSpeed={0.25}
          enableDamping={true}
          dampingFactor={0.07}
          minDistance={3.5}
          maxDistance={12}
        />
      </Canvas>
    </div>
  );
}
