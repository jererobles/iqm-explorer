import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Html } from '@react-three/drei'
import * as THREE from 'three'

interface EnhancedAmplitudeWaveProps {
  probabilities: { state: string; probability: number; phase?: number }[]
  position?: [number, number, number]
  size?: number
  resolution?: number
  showLabels?: boolean
}

// Phase to color conversion
function phaseToRGB(phase: number): [number, number, number] {
  const hue = ((phase / (2 * Math.PI)) * 360 + 360) % 360
  const s = 0.9
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

// Fluid-like wave surface
function FluidWaveSurface({
  probabilities,
  size,
  resolution,
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

    for (let i = 0; i < positions.length / 3; i++) {
      colorArray[i * 3] = 0.1
      colorArray[i * 3 + 1] = 0.3
      colorArray[i * 3 + 2] = 0.6
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3))
    geo.rotateX(-Math.PI / 2)

    return { geometry: geo }
  }, [size, resolution])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    timeRef.current += delta * 0.8
    const time = timeRef.current

    const positions = geometry.attributes.position.array as Float32Array
    const colorAttr = geometry.attributes.color.array as Float32Array

    const n = probabilities.length
    const gridSize = Math.ceil(Math.sqrt(n))
    const cellSize = size / gridSize

    for (let i = 0; i < positions.length / 3; i++) {
      const x = positions[i * 3]
      const z = positions[i * 3 + 2]

      let height = 0
      let totalPhase = 0
      let totalWeight = 0

      for (let p = 0; p < n; p++) {
        const prob = probabilities[p]
        const px = ((p % gridSize) - gridSize / 2 + 0.5) * cellSize
        const pz = (Math.floor(p / gridSize) - gridSize / 2 + 0.5) * cellSize

        const dx = x - px
        const dz = z - pz
        const dist = Math.sqrt(dx * dx + dz * dz)

        // Multi-frequency wave interference
        const amplitude = prob.probability * 2.5
        const waveFreq1 = 2.5
        const waveFreq2 = 4
        const waveSpeed = 2.5
        const decay = Math.exp(-dist * 0.4)

        // Multiple wave layers for complex interference pattern
        const ripple1 = Math.sin(dist * waveFreq1 - time * waveSpeed) * decay * amplitude * 0.4
        const ripple2 = Math.sin(dist * waveFreq2 - time * waveSpeed * 1.3 + Math.PI / 4) * decay * amplitude * 0.2
        const baseHeight = decay * amplitude

        height += baseHeight + ripple1 + ripple2

        const phase = prob.phase || 0
        totalPhase += phase * decay * prob.probability
        totalWeight += decay * prob.probability
      }

      // Global ambient wave motion
      const ambient1 = Math.sin(x * 0.4 + time * 0.8) * Math.cos(z * 0.4 + time * 0.6) * 0.15
      const ambient2 = Math.sin(x * 0.2 - z * 0.3 + time * 0.5) * 0.1

      positions[i * 3 + 1] = Math.max(-0.1, height + ambient1 + ambient2)

      // Dynamic color based on height and phase
      const avgPhase = totalWeight > 0.001 ? totalPhase / totalWeight : 0
      const heightFactor = Math.min(Math.max(height, 0) / 2.5, 1)
      const [r, g, b] = phaseToRGB(avgPhase)

      // Enhanced color blending
      const baseR = 0.05, baseG = 0.1, baseB = 0.3
      colorAttr[i * 3] = THREE.MathUtils.lerp(baseR, r, heightFactor * 0.9)
      colorAttr[i * 3 + 1] = THREE.MathUtils.lerp(baseG, g, heightFactor * 0.9)
      colorAttr[i * 3 + 2] = THREE.MathUtils.lerp(baseB, b, heightFactor * 0.7)
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
    geometry.computeVertexNormals()
  })

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial
        vertexColors
        metalness={0.4}
        roughness={0.3}
        emissive="#1e3a8a"
        emissiveIntensity={0.15}
        side={THREE.DoubleSide}
        envMapIntensity={0.8}
      />
    </mesh>
  )
}

// Crystal-like amplitude orbs
function CrystalAmplitudeOrbs({
  probabilities,
  size,
}: {
  probabilities: { state: string; probability: number; phase?: number }[]
  size: number
}) {
  const groupRef = useRef<THREE.Group>(null)

  const orbData = useMemo(() => {
    const n = probabilities.length
    const gridSize = Math.ceil(Math.sqrt(n))
    const cellSize = size / gridSize

    return probabilities.map((prob, i) => ({
      position: [
        ((i % gridSize) - gridSize / 2 + 0.5) * cellSize,
        prob.probability * 3 + 0.3,
        (Math.floor(i / gridSize) - gridSize / 2 + 0.5) * cellSize,
      ] as [number, number, number],
      probability: prob.probability,
      phase: prob.phase || 0,
      state: prob.state,
    }))
  }, [probabilities, size])

  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime

    groupRef.current.children.forEach((group, i) => {
      if (group instanceof THREE.Group) {
        const prob = probabilities[i]?.probability || 0

        // Levitation bob
        group.position.y = orbData[i].position[1] + Math.sin(time * 1.5 + i) * 0.15 * prob

        // Gentle rotation
        group.rotation.y = time * 0.3 + i * 0.5

        // Scale pulse
        const scale = 1 + Math.sin(time * 2.5 + i * 0.7) * 0.1 * prob
        group.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            child.scale.setScalar(scale)
          }
        })
      }
    })
  })

  return (
    <group ref={groupRef}>
      {orbData.map((orb, i) => {
        if (orb.probability < 0.02) return null

        const [r, g, b] = phaseToRGB(orb.phase)
        const color = new THREE.Color(r, g, b)
        const size = 0.15 + orb.probability * 0.35

        return (
          <Float
            key={i}
            speed={2}
            rotationIntensity={0.5}
            floatIntensity={0.3}
            floatingRange={[-0.1, 0.1]}
          >
            <group position={orb.position}>
              {/* Crystal core - octahedron */}
              <mesh>
                <octahedronGeometry args={[size, 0]} />
                <meshPhysicalMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={1.5}
                  metalness={0.2}
                  roughness={0.1}
                  clearcoat={1}
                  clearcoatRoughness={0.1}
                  transparent
                  opacity={0.9}
                  transmission={0.3}
                  ior={1.5}
                />
              </mesh>

              {/* Inner glow sphere */}
              <mesh>
                <sphereGeometry args={[size * 0.6, 16, 16]} />
                <meshBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.6}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>

              {/* Outer glow */}
              <mesh>
                <sphereGeometry args={[size * 1.5, 16, 16]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.2}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>

              {/* Orbiting ring */}
              <mesh rotation={[Math.PI / 4, 0, 0]}>
                <torusGeometry args={[size * 1.2, 0.015, 8, 32]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.7}
                />
              </mesh>

              {/* Point light */}
              <pointLight
                color={color}
                intensity={orb.probability * 4}
                distance={5}
                decay={2}
              />
            </group>
          </Float>
        )
      })}
    </group>
  )
}

// Energy pillars rising from probability peaks
function EnergyPillars({
  probabilities,
  size,
}: {
  probabilities: { state: string; probability: number; phase?: number }[]
  size: number
}) {
  const pillarsRef = useRef<THREE.Group>(null)

  const pillarData = useMemo(() => {
    const n = probabilities.length
    const gridSize = Math.ceil(Math.sqrt(n))
    const cellSize = size / gridSize

    return probabilities
      .filter((p) => p.probability > 0.05)
      .map((prob) => {
        const idx = probabilities.indexOf(prob)
        return {
          position: [
            ((idx % gridSize) - gridSize / 2 + 0.5) * cellSize,
            0,
            (Math.floor(idx / gridSize) - gridSize / 2 + 0.5) * cellSize,
          ] as [number, number, number],
          height: prob.probability * 5,
          phase: prob.phase || 0,
          probability: prob.probability,
          state: prob.state,
        }
      })
  }, [probabilities, size])

  useFrame((state) => {
    if (!pillarsRef.current) return
    const time = state.clock.elapsedTime

    pillarsRef.current.children.forEach((pillar) => {
      if (pillar instanceof THREE.Group) {
        // Rotate inner elements
        pillar.children.forEach((child, j) => {
          if (child instanceof THREE.Mesh && j === 0) {
            child.rotation.y = time * 2
          }
        })
      }
    })
  })

  return (
    <group ref={pillarsRef}>
      {pillarData.map((pillar, i) => {
        const [r, g, b] = phaseToRGB(pillar.phase)
        const color = new THREE.Color(r, g, b)

        return (
          <group key={i} position={pillar.position}>
            {/* Central beam */}
            <mesh position={[0, pillar.height / 2, 0]}>
              <cylinderGeometry args={[0.03, 0.08, pillar.height, 8]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={2}
                transparent
                opacity={0.95}
              />
            </mesh>

            {/* Outer glow cylinder */}
            <mesh position={[0, pillar.height / 2, 0]}>
              <cylinderGeometry args={[0.15, 0.25, pillar.height, 16]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.15}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            {/* Energy rings traveling up */}
            {[0, 0.33, 0.66].map((offset, j) => (
              <EnergyRing
                key={j}
                position={[0, 0, 0]}
                color={color}
                maxHeight={pillar.height}
                phase={offset}
                speed={1.5}
              />
            ))}

            {/* Top cap glow */}
            <mesh position={[0, pillar.height + 0.1, 0]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            {/* Base ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <ringGeometry args={[0.25, 0.4, 32]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.5}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// Rising energy ring component
function EnergyRing({
  position,
  color,
  maxHeight,
  phase,
  speed,
}: {
  position: [number, number, number]
  color: THREE.Color
  maxHeight: number
  phase: number
  speed: number
}) {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ringRef.current) return
    const time = state.clock.elapsedTime * speed

    const progress = ((time + phase) % 1)
    ringRef.current.position.y = progress * maxHeight

    const material = ringRef.current.material as THREE.MeshBasicMaterial
    material.opacity = Math.sin(progress * Math.PI) * 0.6

    const scale = 0.8 + progress * 0.4
    ringRef.current.scale.setScalar(scale)
  })

  return (
    <mesh ref={ringRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.12, 0.15, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// Quantum dust particles with improved behavior
function QuantumDustEnhanced({
  probabilities,
  size,
  count = 300,
}: {
  probabilities: { state: string; probability: number; phase?: number }[]
  size: number
  count?: number
}) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, colors, velocities, lifetimes, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    const life = new Float32Array(count)
    const siz = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * size
      pos[i * 3 + 1] = Math.random() * 4
      pos[i * 3 + 2] = (Math.random() - 0.5) * size

      col[i * 3] = 0.3
      col[i * 3 + 1] = 0.7
      col[i * 3 + 2] = 0.95

      vel[i * 3] = (Math.random() - 0.5) * 0.3
      vel[i * 3 + 1] = 0.2 + Math.random() * 0.3
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.3

      life[i] = Math.random()
      siz[i] = 0.03 + Math.random() * 0.04
    }

    return { positions: pos, colors: col, velocities: vel, lifetimes: life, sizes: siz }
  }, [count, size])

  useFrame((state, delta) => {
    if (!pointsRef.current) return

    const time = state.clock.elapsedTime
    const posAttr = pointsRef.current.geometry.attributes.position.array as Float32Array
    const colAttr = pointsRef.current.geometry.attributes.color.array as Float32Array
    const sizeAttr = pointsRef.current.geometry.attributes.size.array as Float32Array

    const n = probabilities.length
    const gridSize = Math.ceil(Math.sqrt(n))
    const cellSize = size / gridSize

    for (let i = 0; i < count; i++) {
      // Curl noise-like motion
      const curlX = Math.sin(posAttr[i * 3 + 1] * 0.5 + time) * 0.3
      const curlZ = Math.cos(posAttr[i * 3 + 1] * 0.5 + time * 0.7) * 0.3

      posAttr[i * 3] += (velocities[i * 3] + curlX) * delta
      posAttr[i * 3 + 1] += velocities[i * 3 + 1] * delta
      posAttr[i * 3 + 2] += (velocities[i * 3 + 2] + curlZ) * delta

      // Attraction to probability peaks
      for (let p = 0; p < n; p++) {
        const prob = probabilities[p]
        if (prob.probability < 0.1) continue

        const px = ((p % gridSize) - gridSize / 2 + 0.5) * cellSize
        const py = prob.probability * 3 + 0.5
        const pz = (Math.floor(p / gridSize) - gridSize / 2 + 0.5) * cellSize

        const dx = px - posAttr[i * 3]
        const dy = py - posAttr[i * 3 + 1]
        const dz = pz - posAttr[i * 3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < 3 && dist > 0.3) {
          const force = prob.probability * 0.4 / (dist * dist)
          posAttr[i * 3] += dx * force * delta
          posAttr[i * 3 + 1] += dy * force * delta
          posAttr[i * 3 + 2] += dz * force * delta

          // Blend color
          const [r, g, b] = phaseToRGB(prob.phase || 0)
          const blend = Math.min(0.4, force)
          colAttr[i * 3] = THREE.MathUtils.lerp(colAttr[i * 3], r, blend)
          colAttr[i * 3 + 1] = THREE.MathUtils.lerp(colAttr[i * 3 + 1], g, blend)
          colAttr[i * 3 + 2] = THREE.MathUtils.lerp(colAttr[i * 3 + 2], b, blend)
        }
      }

      // Size pulsing
      const pulse = Math.sin(time * 3 + lifetimes[i] * 10) * 0.5 + 0.5
      sizeAttr[i] = sizes[i] * (0.6 + pulse * 0.6)

      // Update lifetime
      lifetimes[i] += delta * 0.2

      // Reset out of bounds particles
      if (
        posAttr[i * 3 + 1] > 5 ||
        posAttr[i * 3 + 1] < -0.5 ||
        Math.abs(posAttr[i * 3]) > size / 2 + 1 ||
        Math.abs(posAttr[i * 3 + 2]) > size / 2 + 1 ||
        lifetimes[i] > 1.5
      ) {
        posAttr[i * 3] = (Math.random() - 0.5) * size
        posAttr[i * 3 + 1] = -0.3 + Math.random() * 0.5
        posAttr[i * 3 + 2] = (Math.random() - 0.5) * size
        lifetimes[i] = 0

        colAttr[i * 3] = 0.3
        colAttr[i * 3 + 1] = 0.7
        colAttr[i * 3 + 2] = 0.95
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.geometry.attributes.color.needsUpdate = true
    pointsRef.current.geometry.attributes.size.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// Probability labels for states
function ProbabilityLabels({
  probabilities,
  size,
  showLabels,
}: {
  probabilities: { state: string; probability: number; phase?: number }[]
  size: number
  showLabels: boolean
}) {
  if (!showLabels) return null

  const n = probabilities.length
  const gridSize = Math.ceil(Math.sqrt(n))
  const cellSize = size / gridSize

  return (
    <group>
      {probabilities.slice(0, 8).map((prob, i) => {
        if (prob.probability < 0.02) return null

        const x = ((i % gridSize) - gridSize / 2 + 0.5) * cellSize
        const z = (Math.floor(i / gridSize) - gridSize / 2 + 0.5) * cellSize
        const y = prob.probability * 3 + 1

        const [r, g, b] = phaseToRGB(prob.phase || 0)
        const color = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`

        return (
          <Html key={i} position={[x, y, z]} center>
            <div
              className="text-xs font-mono px-2 py-1 rounded-lg bg-slate-900/90 border whitespace-nowrap"
              style={{ borderColor: color + '50', color }}
            >
              |{prob.state}⟩: {(prob.probability * 100).toFixed(1)}%
            </div>
          </Html>
        )
      })}
    </group>
  )
}

export default function EnhancedAmplitudeWave({
  probabilities,
  position = [0, 0, 0],
  size = 8,
  resolution = 80,
  showLabels = true,
}: EnhancedAmplitudeWaveProps) {
  return (
    <group position={position}>
      {/* Fluid wave surface */}
      <FluidWaveSurface
        probabilities={probabilities}
        size={size}
        resolution={resolution}
      />

      {/* Crystal amplitude orbs */}
      <CrystalAmplitudeOrbs probabilities={probabilities} size={size} />

      {/* Energy pillars */}
      <EnergyPillars probabilities={probabilities} size={size} />

      {/* Quantum dust */}
      <QuantumDustEnhanced probabilities={probabilities} size={size} count={250} />

      {/* Probability labels */}
      <ProbabilityLabels
        probabilities={probabilities}
        size={size}
        showLabels={showLabels}
      />
    </group>
  )
}
