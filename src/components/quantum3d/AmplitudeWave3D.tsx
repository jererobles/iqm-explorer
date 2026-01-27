import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

interface AmplitudeWave3DProps {
  probabilities: { state: string; probability: number; phase?: number }[]
  position?: [number, number, number]
  size?: number
  resolution?: number
}

// Phase to RGB color conversion for shader
function phaseToRGB(phase: number): [number, number, number] {
  const hue = (phase / (2 * Math.PI)) * 360
  const s = 0.85
  const l = 0.55

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0, g = 0, b = 0
  if (hue < 60) { r = c; g = x; b = 0 }
  else if (hue < 120) { r = x; g = c; b = 0 }
  else if (hue < 180) { r = 0; g = c; b = x }
  else if (hue < 240) { r = 0; g = x; b = c }
  else if (hue < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  return [r + m, g + m, b + m]
}

// Animated wave surface mesh
function WaveSurface({
  probabilities,
  size,
  resolution
}: {
  probabilities: { state: string; probability: number; phase?: number }[]
  size: number
  resolution: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)

  const { geometry } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, resolution, resolution)
    const positions = geo.attributes.position.array as Float32Array
    const colorArray = new Float32Array(positions.length)

    // Initialize colors
    for (let i = 0; i < positions.length / 3; i++) {
      colorArray[i * 3] = 0.2
      colorArray[i * 3 + 1] = 0.5
      colorArray[i * 3 + 2] = 0.8
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3))
    geo.rotateX(-Math.PI / 2)

    return { geometry: geo }
  }, [size, resolution])

  // Animate the wave surface
  useFrame((_, delta) => {
    if (!meshRef.current) return

    timeRef.current += delta
    const time = timeRef.current

    const positions = geometry.attributes.position.array as Float32Array
    const colorAttr = geometry.attributes.color.array as Float32Array

    const n = probabilities.length
    const gridSize = Math.ceil(Math.sqrt(n))
    const cellSize = size / gridSize

    // Update each vertex
    for (let i = 0; i < positions.length / 3; i++) {
      const x = positions[i * 3]
      const z = positions[i * 3 + 2]

      // Calculate height based on probability amplitudes
      let height = 0
      let totalPhase = 0
      let totalWeight = 0

      for (let p = 0; p < n; p++) {
        const prob = probabilities[p]
        const px = ((p % gridSize) - gridSize / 2 + 0.5) * cellSize
        const pz = (Math.floor(p / gridSize) - gridSize / 2 + 0.5) * cellSize

        // Distance from this probability center
        const dx = x - px
        const dz = z - pz
        const dist = Math.sqrt(dx * dx + dz * dz)

        // Gaussian influence with wave propagation
        const amplitude = prob.probability * 2
        const waveFreq = 3
        const waveSpeed = 2
        const decay = Math.exp(-dist * 0.5)

        // Ripple wave effect
        const ripple = Math.sin(dist * waveFreq - time * waveSpeed) * decay * amplitude * 0.3
        const baseHeight = decay * amplitude

        height += baseHeight + ripple

        // Accumulate phase for color
        const phase = prob.phase || 0
        totalPhase += phase * decay * prob.probability
        totalWeight += decay * prob.probability
      }

      // Add ambient wave motion
      const ambientWave = Math.sin(x * 0.5 + time) * Math.cos(z * 0.5 + time * 0.7) * 0.1
      positions[i * 3 + 1] = Math.max(0, height + ambientWave)

      // Set color based on accumulated phase
      const avgPhase = totalWeight > 0.001 ? totalPhase / totalWeight : 0
      const heightFactor = Math.min(height / 2, 1)
      const [r, g, b] = phaseToRGB(avgPhase)

      // Blend between base blue and phase color based on height
      colorAttr[i * 3] = THREE.MathUtils.lerp(0.1, r, heightFactor)
      colorAttr[i * 3 + 1] = THREE.MathUtils.lerp(0.2, g, heightFactor)
      colorAttr[i * 3 + 2] = THREE.MathUtils.lerp(0.4, b, heightFactor)
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
    geometry.computeVertexNormals()
  })

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        metalness={0.3}
        roughness={0.4}
        emissive="#1e3a8a"
        emissiveIntensity={0.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Glowing amplitude peaks
function AmplitudePeaks({
  probabilities,
  size
}: {
  probabilities: { state: string; probability: number; phase?: number }[]
  size: number
}) {
  const groupRef = useRef<THREE.Group>(null)

  const peakPositions = useMemo(() => {
    const n = probabilities.length
    const gridSize = Math.ceil(Math.sqrt(n))
    const cellSize = size / gridSize

    return probabilities.map((prob, i) => ({
      position: [
        ((i % gridSize) - gridSize / 2 + 0.5) * cellSize,
        prob.probability * 2 + 0.5,
        (Math.floor(i / gridSize) - gridSize / 2 + 0.5) * cellSize
      ] as [number, number, number],
      probability: prob.probability,
      phase: prob.phase || 0,
      state: prob.state
    }))
  }, [probabilities, size])

  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime

    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const prob = probabilities[i]?.probability || 0
        const scale = 1 + Math.sin(time * 3 + i) * 0.15 * prob
        child.scale.setScalar(scale)
      }
    })
  })

  return (
    <group ref={groupRef}>
      {peakPositions.map((peak, i) => {
        if (peak.probability < 0.02) return null

        const [r, g, b] = phaseToRGB(peak.phase)
        const color = new THREE.Color(r, g, b)

        return (
          <group key={i} position={peak.position}>
            {/* Core glow sphere */}
            <mesh>
              <sphereGeometry args={[0.15 + peak.probability * 0.2, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={1.5}
                transparent
                opacity={0.9}
              />
            </mesh>

            {/* Outer glow */}
            <mesh>
              <sphereGeometry args={[0.3 + peak.probability * 0.4, 16, 16]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.3}
              />
            </mesh>

            {/* Point light for dramatic effect */}
            <pointLight
              color={color}
              intensity={peak.probability * 3}
              distance={4}
              decay={2}
            />

            {/* Label */}
            {peak.probability > 0.05 && (
              <Html position={[0, 0.6, 0]} center>
                <div className="text-center pointer-events-none">
                  <div className="font-mono text-xs text-white bg-slate-900/80 px-2 py-1 rounded-lg border border-white/20 backdrop-blur-sm">
                    |{peak.state}⟩
                    <br />
                    <span className="text-cyan-400">{(peak.probability * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </Html>
            )}
          </group>
        )
      })}
    </group>
  )
}

// Energy beam columns
function EnergyBeams({
  probabilities,
  size
}: {
  probabilities: { state: string; probability: number; phase?: number }[]
  size: number
}) {
  const beamsRef = useRef<THREE.Group>(null)

  const beamData = useMemo(() => {
    const n = probabilities.length
    const gridSize = Math.ceil(Math.sqrt(n))
    const cellSize = size / gridSize

    return probabilities
      .filter(p => p.probability > 0.05)
      .map((prob) => {
        const idx = probabilities.indexOf(prob)
        return {
          position: [
            ((idx % gridSize) - gridSize / 2 + 0.5) * cellSize,
            0,
            (Math.floor(idx / gridSize) - gridSize / 2 + 0.5) * cellSize
          ] as [number, number, number],
          height: prob.probability * 4,
          phase: prob.phase || 0,
          probability: prob.probability
        }
      })
  }, [probabilities, size])

  useFrame((state) => {
    if (!beamsRef.current) return
    const time = state.clock.elapsedTime

    beamsRef.current.children.forEach((beam, i) => {
      if (beam instanceof THREE.Group) {
        // Rotate beam cores
        const core = beam.children[0]
        if (core) {
          core.rotation.y = time * 2
        }
        // Pulse outer glow
        const outer = beam.children[1]
        if (outer instanceof THREE.Mesh) {
          const scale = 1 + Math.sin(time * 4 + i * 0.5) * 0.1
          outer.scale.x = scale
          outer.scale.z = scale
        }
      }
    })
  })

  return (
    <group ref={beamsRef}>
      {beamData.map((beam, i) => {
        const [r, g, b] = phaseToRGB(beam.phase)
        const color = new THREE.Color(r, g, b)

        return (
          <group key={i} position={beam.position}>
            {/* Inner beam core */}
            <mesh position={[0, beam.height / 2, 0]}>
              <cylinderGeometry args={[0.05, 0.1, beam.height, 8]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={2}
                transparent
                opacity={0.9}
              />
            </mesh>

            {/* Outer glow cylinder */}
            <mesh position={[0, beam.height / 2, 0]}>
              <cylinderGeometry args={[0.15, 0.25, beam.height, 16]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.2}
              />
            </mesh>

            {/* Base ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <ringGeometry args={[0.2, 0.4, 32]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.5}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// Floating quantum particles
function QuantumDust({
  probabilities,
  size,
  count = 200
}: {
  probabilities: { state: string; probability: number; phase?: number }[]
  size: number
  count?: number
}) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, colors, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      // Random position within the volume
      pos[i * 3] = (Math.random() - 0.5) * size
      pos[i * 3 + 1] = Math.random() * 3
      pos[i * 3 + 2] = (Math.random() - 0.5) * size

      // Initial color (cyan-ish)
      col[i * 3] = 0.3 + Math.random() * 0.3
      col[i * 3 + 1] = 0.7 + Math.random() * 0.3
      col[i * 3 + 2] = 0.9 + Math.random() * 0.1

      // Random velocity
      vel[i * 3] = (Math.random() - 0.5) * 0.5
      vel[i * 3 + 1] = Math.random() * 0.5 + 0.2
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5
    }

    return { positions: pos, colors: col, velocities: vel }
  }, [count, size])

  useFrame((_, delta) => {
    if (!pointsRef.current) return

    const posAttr = pointsRef.current.geometry.attributes.position.array as Float32Array
    const colAttr = pointsRef.current.geometry.attributes.color.array as Float32Array

    const n = probabilities.length
    const gridSize = Math.ceil(Math.sqrt(n))
    const cellSize = size / gridSize

    for (let i = 0; i < count; i++) {
      // Update position
      posAttr[i * 3] += velocities[i * 3] * delta
      posAttr[i * 3 + 1] += velocities[i * 3 + 1] * delta
      posAttr[i * 3 + 2] += velocities[i * 3 + 2] * delta

      // Attract towards high probability regions
      for (let p = 0; p < n; p++) {
        const prob = probabilities[p]
        if (prob.probability < 0.1) continue

        const px = ((p % gridSize) - gridSize / 2 + 0.5) * cellSize
        const pz = (Math.floor(p / gridSize) - gridSize / 2 + 0.5) * cellSize

        const dx = px - posAttr[i * 3]
        const dz = pz - posAttr[i * 3 + 2]
        const dist = Math.sqrt(dx * dx + dz * dz)

        if (dist < 2) {
          const force = prob.probability * 0.3 / (dist + 0.5)
          posAttr[i * 3] += dx * force * delta
          posAttr[i * 3 + 2] += dz * force * delta

          // Color particles near high probability
          const [r, g, b] = phaseToRGB(prob.phase || 0)
          const blend = Math.min(0.5, force)
          colAttr[i * 3] = THREE.MathUtils.lerp(colAttr[i * 3], r, blend)
          colAttr[i * 3 + 1] = THREE.MathUtils.lerp(colAttr[i * 3 + 1], g, blend)
          colAttr[i * 3 + 2] = THREE.MathUtils.lerp(colAttr[i * 3 + 2], b, blend)
        }
      }

      // Reset particles that go too high or out of bounds
      if (posAttr[i * 3 + 1] > 4 ||
          Math.abs(posAttr[i * 3]) > size / 2 ||
          Math.abs(posAttr[i * 3 + 2]) > size / 2) {
        posAttr[i * 3] = (Math.random() - 0.5) * size
        posAttr[i * 3 + 1] = 0
        posAttr[i * 3 + 2] = (Math.random() - 0.5) * size
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.geometry.attributes.color.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// Phase color legend
function PhaseLegend3D({ position }: { position: [number, number, number] }) {
  const ringRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = state.clock.elapsedTime * 0.2
    }
  })

  const segments = 24

  return (
    <group position={position} ref={ringRef}>
      {Array.from({ length: segments }, (_, idx) => {
        const angle = (idx / segments) * Math.PI * 2
        const radius = 0.8

        const [r, g, b] = phaseToRGB(angle)
        const color = new THREE.Color(r, g, b)

        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius

        return (
          <group key={idx}>
            <mesh position={[x, 0, z]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.5}
              />
            </mesh>
          </group>
        )
      })}

      {/* Center label */}
      <Html position={[0, 0.5, 0]} center>
        <div className="text-xs text-gray-300 bg-slate-900/80 px-2 py-1 rounded whitespace-nowrap">
          Phase Color Wheel
        </div>
      </Html>
    </group>
  )
}

export default function AmplitudeWave3D({
  probabilities,
  position = [0, 0, 0],
  size = 8,
  resolution = 64,
}: AmplitudeWave3DProps) {
  return (
    <group position={position}>
      {/* Main wave surface */}
      <WaveSurface
        probabilities={probabilities}
        size={size}
        resolution={resolution}
      />

      {/* Glowing amplitude peaks */}
      <AmplitudePeaks probabilities={probabilities} size={size} />

      {/* Energy beam columns */}
      <EnergyBeams probabilities={probabilities} size={size} />

      {/* Floating particles */}
      <QuantumDust probabilities={probabilities} size={size} count={150} />

      {/* Phase legend */}
      <PhaseLegend3D position={[size / 2 + 1.5, 0.5, size / 2 - 1]} />

      {/* Title */}
      <Html position={[0, 4, 0]} center>
        <div className="text-white font-bold text-xl bg-gradient-to-r from-purple-900/80 to-indigo-900/80 px-6 py-3 rounded-xl border border-purple-500/30 backdrop-blur-sm">
          Quantum Amplitude Landscape
        </div>
      </Html>

      {/* Description */}
      <Html position={[0, -0.5, size / 2 + 1]} center>
        <div className="text-gray-300 text-sm bg-slate-900/80 px-4 py-2 rounded-lg max-w-md text-center">
          Wave height = probability amplitude | Colors = quantum phase | Particles flow toward high-probability states
        </div>
      </Html>
    </group>
  )
}
