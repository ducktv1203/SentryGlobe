'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Position } from '@/types/attack';

// --- Globe Mesh ---
function GlobeMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshPhongMaterial
        color="#0a0e27"
        emissive="#061233"
        emissiveIntensity={0.4}
        shininess={20}
        transparent
        opacity={0.95}
      />
      {/* Wireframe overlay for grid effect */}
      <mesh>
        <sphereGeometry args={[2.005, 48, 48]} />
        <meshBasicMaterial
          color="#00f0ff"
          wireframe
          transparent
          opacity={0.04}
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
      gl_FragColor = vec4(0.0, 0.94, 1.0, 1.0) * intensity * 0.6;
    }
  `;

  return (
    <mesh scale={[1.15, 1.15, 1.15]}>
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

// --- Dot Grid (latitude/longitude points) ---
function DotGrid() {
  const geometry = useMemo(() => {
    const pts: number[] = [];
    const radius = 2.01;
    for (let lat = -90; lat <= 90; lat += 3) {
      for (let lng = -180; lng <= 180; lng += 3) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        pts.push(
          -radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta)
        );
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#00f0ff"
        size={0.015}
        transparent
        opacity={0.15}
        sizeAttenuation
      />
    </points>
  );
}

// --- Lat/Lng to 3D ---
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// --- Attack Arcs (using imperative Three.js Line to avoid SVG type conflicts) ---
function AttackArcs({ arcs }: { arcs: Position[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<Map<string, { line: THREE.Line; mat: THREE.LineBasicMaterial; progress: number; opacity: number; fullPoints: THREE.Vector3[] }>>(new Map());

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Reconcile: add new arcs
    arcs.forEach((arc, i) => {
      const key = `${arc.order}-${i}`;
      if (linesRef.current.has(key)) return;

      const start = latLngToVector3(arc.startLat, arc.startLng, 2.02);
      const end = latLngToVector3(arc.endLat, arc.endLng, 2.02);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const dist = start.distanceTo(end);
      const altitude = Math.max(dist * 0.5, 0.5) * (1 + arc.arcAlt);
      mid.normalize().multiplyScalar(2 + altitude);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const fullPoints = curve.getPoints(64);

      const geo = new THREE.BufferGeometry().setFromPoints(fullPoints.slice(0, 2));
      geo.setDrawRange(0, 2);
      const mat = new THREE.LineBasicMaterial({
        color: arc.color,
        transparent: true,
        opacity: 1,
      });
      const lineObj = new THREE.Line(geo, mat);
      group.add(lineObj);

      linesRef.current.set(key, { line: lineObj, mat, progress: 0, opacity: 1, fullPoints });
    });

    // Remove old entries that are fully faded
    const toRemove: string[] = [];
    linesRef.current.forEach((entry, key) => {
      if (entry.opacity <= 0) {
        group.remove(entry.line);
        entry.line.geometry.dispose();
        entry.mat.dispose();
        toRemove.push(key);
      }
    });
    toRemove.forEach((k) => linesRef.current.delete(k));
  }, [arcs]);

  useFrame((_, delta) => {
    linesRef.current.forEach((entry) => {
      if (entry.progress < 1) {
        entry.progress = Math.min(entry.progress + delta * 1.2, 1);
        const count = Math.floor(entry.progress * entry.fullPoints.length);
        const visible = entry.fullPoints.slice(0, Math.max(count, 2));
        entry.line.geometry.setFromPoints(visible);
      } else {
        entry.opacity = Math.max(entry.opacity - delta * 0.3, 0);
        entry.mat.opacity = entry.opacity;
      }
    });
  });

  return <group ref={groupRef} />;
}

// --- Impact Rings ---
function ImpactRings({ arcs }: { arcs: Position[] }) {
  const targets = useMemo(() => {
    const recent = arcs.slice(-8);
    return recent.map((arc) => ({
      position: latLngToVector3(arc.endLat, arc.endLng, 2.03),
      color: arc.color,
      order: arc.order,
    }));
  }, [arcs]);

  return (
    <group>
      {targets.map((t, i) => (
        <ImpactRing key={`ring-${t.order}-${i}`} position={t.position} color={t.color} />
      ))}
    </group>
  );
}

function ImpactRing({ position, color }: { position: THREE.Vector3; color: string }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const scaleRef = useRef(0.01);
  const opacityRef = useRef(1);

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    scaleRef.current = Math.min(scaleRef.current + delta * 0.8, 0.3);
    opacityRef.current = Math.max(opacityRef.current - delta * 0.6, 0);
    ringRef.current.scale.setScalar(scaleRef.current);
    if (ringRef.current.material instanceof THREE.MeshBasicMaterial) {
      ringRef.current.material.opacity = opacityRef.current;
    }
  });

  const lookAt = useMemo(() => position.clone().multiplyScalar(2), [position]);

  return (
    <mesh ref={ringRef} position={position} onUpdate={(self) => self.lookAt(lookAt)}>
      <ringGeometry args={[0.8, 1, 32]} />
      <meshBasicMaterial color={color} transparent opacity={1} side={THREE.DoubleSide} />
    </mesh>
  );
}

// --- Source Point Markers ---
function SourceMarkers({ arcs }: { arcs: Position[] }) {
  const geometry = useMemo(() => {
    const recent = arcs.slice(-12);
    if (recent.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(recent.length * 3);
    const colors = new Float32Array(recent.length * 3);
    recent.forEach((arc, i) => {
      const v = latLngToVector3(arc.startLat, arc.startLng, 2.03);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      const c = new THREE.Color(arc.color);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [arcs]);

  if (!geometry) return null;

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.06}
        transparent
        opacity={0.9}
        vertexColors
        sizeAttenuation
      />
    </points>
  );
}

// --- Main Globe Component ---
export default function GlobeVisualization({ arcs }: { arcs: Position[] }) {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.15} color="#ffffff" />
        <directionalLight position={[-5, 3, 5]} intensity={0.6} color="#00f0ff" />
        <directionalLight position={[5, 5, -3]} intensity={0.3} color="#7b2dff" />
        <pointLight position={[0, 0, 5]} intensity={0.4} color="#00f0ff" />

        <GlobeMesh />
        <Atmosphere />
        <DotGrid />
        <AttackArcs arcs={arcs} />
        <ImpactRings arcs={arcs} />
        <SourceMarkers arcs={arcs} />

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3.5}
          maxDistance={10}
          rotateSpeed={0.5}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}
