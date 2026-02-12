'use client';

import { useRef, useMemo, useEffect, Suspense } from 'react';
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
        color="#080c1d"
        transparent
        opacity={0.9}
      />
      {/* Wireframe overlay */}
      <mesh>
        <sphereGeometry args={[2.005, 48, 48]} />
        <meshBasicMaterial
          color="#00f0ff"
          wireframe
          transparent
          opacity={0.1}
        />
      </mesh>
    </mesh>
  );
}

// --- Atmosphere Glow ---
function Atmosphere() {
  const vertexShader = `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
      gl_FragColor = vec4(0.0, 0.94, 1.0, 1.0) * intensity * 0.5;
    }
  `;

  return (
    <mesh scale={[1.12, 1.12, 1.12]}>
      <sphereGeometry args={[2, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        transparent
      />
    </mesh>
  );
}

// --- World Continent Dots (GeoJSON Support) ---
function WorldDots() {
  const data = useLoader(THREE.FileLoader, '/globe.json');
  
  const geometry = useMemo(() => {
    if (!data) return new THREE.BufferGeometry();
    let points: [number, number][] = [];
    
    try {
      const parsed = JSON.parse(data as string);
      
      // If it has a specific points array (Aceternity format)
      if (parsed.points) {
        points = parsed.points;
      } 
      // If it's standard GeoJSON (FeatureCollection)
      else if (parsed.features) {
        parsed.features.forEach((feature: any) => {
          const coords = feature.geometry.coordinates;
          if (feature.geometry.type === 'Polygon') {
            coords[0].forEach((c: any) => points.push([c[1], c[0]]));
          } else if (feature.geometry.type === 'MultiPolygon') {
            coords.forEach((poly: any) => poly[0].forEach((c: any) => points.push([c[1], c[0]])));
          }
        });
      }
    } catch (e) {
      console.error("Failed to parse globe.json", e);
    }

    const positions: number[] = [];
    const radius = 2.015;
    
    points.forEach(([lat, lng]) => {
      const v = latLngToVector3(lat, lng, radius);
      positions.push(v.x, v.y, v.z);
    });
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [data]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#00f0ff"
        size={0.015}
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

// --- Attack Arcs ---
function AttackArcs({ arcs }: { arcs: Position[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<Map<string, { line: THREE.Line; mat: THREE.LineBasicMaterial; progress: number; opacity: number; fullPoints: THREE.Vector3[] }>>(new Map());

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    arcs.forEach((arc, i) => {
      const key = `${arc.order}-${i}`;
      if (linesRef.current.has(key)) return;

      const start = latLngToVector3(arc.startLat, arc.startLng, 2.02);
      const end = latLngToVector3(arc.endLat, arc.endLng, 2.02);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const dist = start.distanceTo(end);
      const altitude = Math.max(dist * 0.4, 0.4) * (1 + arc.arcAlt);
      mid.normalize().multiplyScalar(2 + altitude);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const fullPoints = curve.getPoints(50);

      const geo = new THREE.BufferGeometry().setFromPoints([start, start.clone().add(new THREE.Vector3(0.01,0,0))]);
      const mat = new THREE.LineBasicMaterial({ color: arc.color, transparent: true, opacity: 1 });
      const lineObj = new THREE.Line(geo, mat);
      group.add(lineObj);

      linesRef.current.set(key, { line: lineObj, mat, progress: 0, opacity: 1, fullPoints });
    });

    // Cleanup
    const toRemove: string[] = [];
    linesRef.current.forEach((entry, key) => {
      if (entry.opacity <= 0) {
        group.remove(entry.line);
        entry.line.geometry.dispose();
        entry.mat.dispose();
        toRemove.push(key);
      }
    });
    toRemove.forEach(k => linesRef.current.delete(k));
  }, [arcs]);

  useFrame((_, delta) => {
    linesRef.current.forEach((entry) => {
      if (entry.progress < 1) {
        entry.progress = Math.min(entry.progress + delta * 1.5, 1);
        const count = Math.ceil(entry.progress * entry.fullPoints.length);
        const visible = entry.fullPoints.slice(0, Math.max(count, 5)); // Min 5 points for "length"
        entry.line.geometry.setFromPoints(visible);
      } else {
        entry.opacity = Math.max(entry.opacity - delta * 1.2, 0);
        entry.mat.opacity = entry.opacity;
      }
    });
  });

  return <group ref={groupRef} />;
}

// --- Impact Rings ---
function ImpactRings({ arcs }: { arcs: Position[] }) {
  const targets = useMemo(() => {
    return arcs.slice(-5).map((arc, i) => ({
      position: latLngToVector3(arc.endLat, arc.endLng, 2.03),
      color: arc.color,
      key: `ring-${arc.order}-${i}`
    }));
  }, [arcs]);

  return (
    <group>
      {targets.map(t => <ImpactRing key={t.key} position={t.position} color={t.color} />)}
    </group>
  );
}

function ImpactRing({ position, color }: { position: THREE.Vector3; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const scale = useRef(0.01);
  const opacity = useRef(1);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    scale.current = Math.min(scale.current + delta * 0.5, 0.2);
    opacity.current = Math.max(opacity.current - delta * 0.5, 0);
    meshRef.current.scale.setScalar(scale.current);
    if (meshRef.current.material instanceof THREE.MeshBasicMaterial) {
      meshRef.current.material.opacity = opacity.current;
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
export default function GlobeVisualization({ arcs }: { arcs: Position[] }) {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        
        <Suspense fallback={null}>
          <GlobeMesh />
          <Atmosphere />
          <WorldDots />
          <AttackArcs arcs={arcs} />
          <ImpactRings arcs={arcs} />
          
          <OrbitControls 
            enableZoom={true} 
            enablePan={false}
            autoRotate={true}
            autoRotateSpeed={0.2}
            enableDamping={true}
            dampingFactor={0.06}
            minDistance={3.5}
            maxDistance={12}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
