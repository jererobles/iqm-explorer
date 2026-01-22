import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

interface ProbabilityLandscapeProps {
  probabilities: { state: string; probability: number; phase?: number }[]
  position?: [number, number, number]
  maxHeight?: number
  barWidth?: number
  spacing?: number
}

// Color based on phase angle (0 to 2π)
function phaseToColor(phase: number): string {
  const hue = (phase / (2 * Math.PI)) * 360
  return `hsl(${hue}, 80%, 60%)`
}

// Single probability bar
function ProbabilityBar({
  state,
  probability,
  phase = 0,
  position,
  maxHeight,
  barWidth,
  index,
}: {
  state: string
  probability: number
  phase?: number
  position: [number, number, number]
  maxHeight: number
  barWidth: number
  index: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const targetHeight = useRef(probability * maxHeight)
  const currentHeight = useRef(0.01)

  // Animate height change
  useFrame((_, delta) => {
    if (meshRef.current) {
      targetHeight.current = probability * maxHeight
      currentHeight.current = THREE.MathUtils.lerp(
        currentHeight.current,
        Math.max(targetHeight.current, 0.01),
        delta * 5
      )

      meshRef.current.scale.y = currentHeight.current
      meshRef.current.position.y = currentHeight.current / 2

      // Subtle pulse for non-zero probabilities
      if (probability > 0.01) {
        const pulse = 1 + Math.sin(Date.now() * 0.003 + index) * 0.02
        meshRef.current.scale.x = barWidth * pulse
        meshRef.current.scale.z = barWidth * pulse
      }
    }
  })

  const color = phaseToColor(phase)
  const emissiveIntensity = probability > 0.01 ? 0.3 : 0

  return (
    <group position={position}>
      {/* Base platform */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[barWidth * 1.2, 0.1, barWidth * 1.2]} />
        <meshStandardMaterial
          color="#1e1b4b"
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      {/* Probability bar */}
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          metalness={0.3}
          roughness={0.4}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Glow effect for high probability states */}
      {probability > 0.1 && (
        <pointLight
          position={[0, currentHeight.current, 0]}
          color={color}
          intensity={probability * 2}
          distance={3}
        />
      )}

      {/* State label */}
      <Html position={[0, -0.4, 0]} center>
        <div className="text-center">
          <div className="font-mono text-xs text-white bg-slate-900/80 px-2 py-0.5 rounded whitespace-nowrap">
            |{state}⟩
          </div>
        </div>
      </Html>

      {/* Probability label (only show if > 0) */}
      {probability > 0.01 && (
        <Html position={[0, Math.max(probability * maxHeight, 0.3) + 0.3, 0]} center>
          <div className="font-mono text-xs text-cyan-400 bg-slate-900/80 px-1.5 py-0.5 rounded">
            {(probability * 100).toFixed(1)}%
          </div>
        </Html>
      )}
    </group>
  )
}

// Phase wheel legend
function PhaseLegend({ position }: { position: [number, number, number] }) {
  const segments = 12
  const radius = 0.5

  return (
    <group position={position}>
      {Array.from({ length: segments }, (_, i) => {
        const angle = (i / segments) * Math.PI * 2
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        const color = phaseToColor(angle)

        return (
          <mesh key={i} position={[x, 0, z]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
        )
      })}

      <Html position={[0, 0.4, 0]} center>
        <div className="text-xs text-gray-400 bg-slate-900/80 px-2 py-1 rounded">
          Phase
        </div>
      </Html>
    </group>
  )
}

export default function ProbabilityLandscape({
  probabilities,
  position = [0, 0, 0],
  maxHeight = 3,
  barWidth = 0.6,
  spacing = 1.2,
}: ProbabilityLandscapeProps) {
  // Calculate grid layout
  const layout = useMemo(() => {
    const n = probabilities.length
    const cols = Math.ceil(Math.sqrt(n))
    const rows = Math.ceil(n / cols)

    const positions: [number, number, number][] = []
    const totalWidth = (cols - 1) * spacing
    const totalDepth = (rows - 1) * spacing

    probabilities.forEach((_, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = col * spacing - totalWidth / 2
      const z = row * spacing - totalDepth / 2
      positions.push([x, 0, z])
    })

    return { positions, cols, rows, totalWidth, totalDepth }
  }, [probabilities.length, spacing])

  return (
    <group position={position}>
      {/* Ground grid */}
      <gridHelper
        args={[
          Math.max(layout.totalWidth, layout.totalDepth) + spacing * 2,
          Math.max(layout.cols, layout.rows) + 2,
          '#6366f1',
          '#312e81',
        ]}
        position={[0, -0.1, 0]}
      />

      {/* Probability bars */}
      {probabilities.map((prob, i) => (
        <ProbabilityBar
          key={prob.state}
          state={prob.state}
          probability={prob.probability}
          phase={prob.phase}
          position={layout.positions[i]}
          maxHeight={maxHeight}
          barWidth={barWidth}
          index={i}
        />
      ))}

      {/* Phase legend */}
      <PhaseLegend
        position={[
          layout.totalWidth / 2 + spacing * 1.5,
          0,
          layout.totalDepth / 2 + spacing,
        ]}
      />

      {/* Title */}
      <Html position={[0, maxHeight + 1, 0]} center>
        <div className="text-white font-bold text-lg bg-slate-900/80 px-4 py-2 rounded-lg">
          Probability Landscape
        </div>
      </Html>
    </group>
  )
}
