import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'

interface AmplitudeRingProps {
  probabilities: { state: string; probability: number; phase?: number }[]
  position?: [number, number, number]
  radius?: number
  height?: number
}

// Phase to color conversion
function phaseToColor(phase: number): THREE.Color {
  const hue = (phase / (2 * Math.PI))
  return new THREE.Color().setHSL(hue, 0.85, 0.55)
}

// Circular wave ring visualization
function WaveRing({
  probabilities,
  radius,
}: {
  probabilities: { state: string; probability: number; phase?: number }[]
  radius: number
}) {
  const segments = 128
  const pointsRef = useRef<[number, number, number][]>([])

  // Initialize points
  const initialPoints = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      pts.push([Math.cos(angle) * radius, 0, Math.sin(angle) * radius])
    }
    pointsRef.current = pts
    return pts
  }, [radius, segments])

  const [points, setPoints] = useState(initialPoints)

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const n = probabilities.length
    const newPoints: [number, number, number][] = []

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2

      // Calculate wave height based on probability amplitudes
      let waveHeight = 0

      for (let p = 0; p < n; p++) {
        const prob = probabilities[p]
        const probAngle = (p / n) * Math.PI * 2
        const angularDist = Math.abs(angle - probAngle)
        const normalizedDist = Math.min(angularDist, Math.PI * 2 - angularDist)

        const falloff = Math.exp(-normalizedDist * normalizedDist * 2)
        const phase = prob.phase || 0

        waveHeight += prob.probability * falloff * (1 + Math.sin(angle * 4 - time * 2 + phase) * 0.3)
      }

      const r = radius + waveHeight * 0.5
      newPoints.push([Math.cos(angle) * r, waveHeight * 1.5, Math.sin(angle) * r])
    }

    setPoints(newPoints)
  })

  return (
    <Line
      points={points}
      color="#06b6d4"
      lineWidth={2}
      transparent
      opacity={0.8}
    />
  )
}

// Amplitude pillars arranged in a circle
function AmplitudePillars({
  probabilities,
  radius,
  maxHeight,
}: {
  probabilities: { state: string; probability: number; phase?: number }[]
  radius: number
  maxHeight: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const n = probabilities.length

  useFrame((state) => {
    if (!groupRef.current) return

    const time = state.clock.elapsedTime

    groupRef.current.children.forEach((pillar, i) => {
      if (pillar instanceof THREE.Group) {
        const prob = probabilities[i]?.probability || 0

        // Animate pillar height
        const targetHeight = prob * maxHeight
        const mesh = pillar.children[0] as THREE.Mesh
        if (mesh) {
          mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, Math.max(targetHeight, 0.1), 0.1)
          mesh.position.y = mesh.scale.y / 2
        }

        // Animate glow
        const glow = pillar.children[1] as THREE.Mesh
        if (glow && prob > 0.05) {
          const pulse = 1 + Math.sin(time * 3 + i) * 0.2
          glow.scale.set(pulse * 0.5, mesh.scale.y, pulse * 0.5)
          glow.position.y = mesh.scale.y / 2
        }
      }
    })
  })

  return (
    <group ref={groupRef}>
      {probabilities.map((prob, i) => {
        const angle = (i / n) * Math.PI * 2
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        const color = phaseToColor(prob.phase || 0)

        return (
          <group key={i} position={[x, 0, z]} rotation={[0, -angle, 0]}>
            {/* Main pillar */}
            <mesh>
              <boxGeometry args={[0.3, 1, 0.15]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={prob.probability > 0.05 ? 0.6 : 0}
                metalness={0.4}
                roughness={0.3}
                transparent
                opacity={0.9}
              />
            </mesh>

            {/* Glow effect */}
            {prob.probability > 0.05 && (
              <mesh>
                <boxGeometry args={[0.5, 1, 0.3]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.2}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            )}

            {/* State label */}
            <Html position={[0, -0.3, 0.3]} center>
              <div className="text-center pointer-events-none">
                <div className="font-mono text-[10px] text-white bg-slate-900/80 px-1 py-0.5 rounded whitespace-nowrap">
                  |{prob.state}⟩
                </div>
              </div>
            </Html>

            {/* Probability label */}
            {prob.probability > 0.02 && (
              <Html position={[0, prob.probability * maxHeight + 0.3, 0]} center>
                <div
                  className="font-mono text-xs font-bold px-1 py-0.5 rounded pointer-events-none"
                  style={{
                    color: `hsl(${(prob.phase || 0) / (2 * Math.PI) * 360}, 85%, 60%)`,
                    background: 'rgba(15,23,42,0.85)',
                  }}
                >
                  {(prob.probability * 100).toFixed(0)}%
                </div>
              </Html>
            )}

            {/* Point light for high probability */}
            {prob.probability > 0.15 && (
              <pointLight
                color={color}
                intensity={prob.probability * 3}
                distance={3}
                decay={2}
                position={[0, prob.probability * maxHeight / 2, 0]}
              />
            )}
          </group>
        )
      })}
    </group>
  )
}

// Central interference pattern
function InterferenceDisk({
  probabilities,
  radius,
}: {
  probabilities: { state: string; probability: number; phase?: number }[]
  radius: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const resolution = 64

  const geometry = useMemo(() => {
    return new THREE.CircleGeometry(radius, resolution)
  }, [radius])

  useFrame((state) => {
    if (!meshRef.current) return

    const time = state.clock.elapsedTime
    const positions = geometry.attributes.position.array as Float32Array
    const n = probabilities.length

    // Skip center vertex (index 0)
    for (let i = 1; i < positions.length / 3; i++) {
      const x = positions[i * 3]
      const y = positions[i * 3 + 1]

      let waveSum = 0

      for (let p = 0; p < n; p++) {
        const prob = probabilities[p]
        if (prob.probability < 0.01) continue

        // Position of this probability on the ring
        const probAngle = (p / n) * Math.PI * 2
        const px = Math.cos(probAngle) * radius * 0.9
        const py = Math.sin(probAngle) * radius * 0.9

        const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
        const phase = prob.phase || 0

        // Concentric wave from each probability source
        waveSum += Math.sin(dist * 5 - time * 3 + phase) * prob.probability * Math.exp(-dist * 0.5)
      }

      positions[i * 3 + 2] = waveSum * 0.15
    }

    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()
  })

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <meshStandardMaterial
        color="#1e1b4b"
        metalness={0.7}
        roughness={0.3}
        emissive="#4338ca"
        emissiveIntensity={0.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Orbiting energy particles
function OrbitalParticles({
  radius,
  count = 50,
  color = '#8b5cf6'
}: {
  radius: number
  count?: number
  color?: string
}) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, velocities, radii } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count)
    const rad = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = radius * (0.5 + Math.random() * 0.6)
      rad[i] = r

      pos[i * 3] = Math.cos(angle) * r
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2
      pos[i * 3 + 2] = Math.sin(angle) * r

      vel[i] = (0.3 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1)
    }

    return { positions: pos, velocities: vel, radii: rad }
  }, [count, radius])

  useFrame((state, delta) => {
    if (!pointsRef.current) return

    const posAttr = pointsRef.current.geometry.attributes.position.array as Float32Array
    const time = state.clock.elapsedTime

    for (let i = 0; i < count; i++) {
      const currentAngle = Math.atan2(posAttr[i * 3 + 2], posAttr[i * 3])
      const newAngle = currentAngle + velocities[i] * delta

      posAttr[i * 3] = Math.cos(newAngle) * radii[i]
      posAttr[i * 3 + 1] += Math.sin(time * 2 + i) * 0.01
      posAttr[i * 3 + 2] = Math.sin(newAngle) * radii[i]

      // Keep vertical position bounded
      if (Math.abs(posAttr[i * 3 + 1]) > 2) {
        posAttr[i * 3 + 1] = Math.sign(posAttr[i * 3 + 1]) * -1.5
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.08}
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// Energy rings that pulse outward - using mesh rings for better animation control
function PulseRings({
  radius,
  count = 3,
  color = '#6366f1'
}: {
  radius: number
  count?: number
  color?: string
}) {
  const ringsRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!ringsRef.current) return

    const time = state.clock.elapsedTime

    ringsRef.current.children.forEach((ring, i) => {
      if (ring instanceof THREE.Mesh) {
        const phase = (time * 0.5 + i / count) % 1
        const scale = 0.3 + phase * 0.7
        ring.scale.setScalar(scale)

        const material = ring.material as THREE.MeshBasicMaterial
        material.opacity = (1 - phase) * 0.5
      }
    })
  })

  return (
    <group ref={ringsRef}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius - 0.05, radius + 0.05, 64]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}

// Central glowing core
function CentralCore() {
  const coreRef = useRef<THREE.Mesh>(null)
  const outerRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const time = state.clock.elapsedTime

    if (coreRef.current) {
      const pulse = 1 + Math.sin(time * 2) * 0.15
      coreRef.current.scale.setScalar(pulse)
      coreRef.current.rotation.y = time * 0.5
    }

    if (outerRef.current) {
      const outerPulse = 1 + Math.sin(time * 1.5 + Math.PI / 2) * 0.2
      outerRef.current.scale.setScalar(outerPulse)
      outerRef.current.rotation.y = -time * 0.3
    }
  })

  return (
    <group>
      {/* Inner core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.4, 1]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={1.5}
          metalness={0.5}
          roughness={0.2}
          wireframe
        />
      </mesh>

      {/* Outer sphere */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Core light */}
      <pointLight
        color="#8b5cf6"
        intensity={3}
        distance={6}
        decay={2}
      />
    </group>
  )
}

export default function AmplitudeRing({
  probabilities,
  position = [0, 0, 0],
  radius = 3,
  height = 3,
}: AmplitudeRingProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Slowly rotate the entire visualization
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })

  return (
    <group position={position} ref={groupRef}>
      {/* Base interference disk */}
      <InterferenceDisk probabilities={probabilities} radius={radius * 0.9} />

      {/* Circular wave visualization */}
      <WaveRing probabilities={probabilities} radius={radius} />

      {/* Amplitude pillars in circle */}
      <AmplitudePillars
        probabilities={probabilities}
        radius={radius}
        maxHeight={height}
      />

      {/* Central glowing core */}
      <CentralCore />

      {/* Pulse rings */}
      <PulseRings radius={radius} count={4} />

      {/* Orbital particles */}
      <OrbitalParticles radius={radius} count={60} color="#06b6d4" />

      {/* Base ring glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[radius - 0.1, radius + 0.1, 64]} />
        <meshBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Title */}
      <Html position={[0, height + 1, 0]} center>
        <div className="text-white font-bold text-xl bg-gradient-to-r from-purple-900/90 to-cyan-900/90 px-6 py-3 rounded-xl border border-cyan-500/40 backdrop-blur-sm shadow-lg shadow-purple-500/20">
          Amplitude Ring
        </div>
      </Html>

      {/* Description */}
      <Html position={[0, -0.8, radius + 1]} center>
        <div className="text-gray-300 text-sm bg-slate-900/90 px-4 py-2 rounded-lg border border-slate-700/50 max-w-sm text-center">
          Circular arrangement showing quantum state amplitudes | Height = probability | Color = phase
        </div>
      </Html>
    </group>
  )
}
