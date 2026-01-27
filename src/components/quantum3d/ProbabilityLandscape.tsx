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
  enhanced?: boolean
}

// Phase to color conversion - higher saturation for better contrast
function phaseToColor(phase: number): THREE.Color {
  const hue = (phase / (2 * Math.PI))
  return new THREE.Color().setHSL(hue, 0.9, 0.6)
}

// Enhanced probability tower with glow effects
function ProbabilityTower({
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
  const groupRef = useRef<THREE.Group>(null)
  const towerRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const ringsRef = useRef<THREE.Group>(null)
  const targetHeight = useRef(probability * maxHeight)
  const currentHeight = useRef(0.01)

  const color = useMemo(() => phaseToColor(phase), [phase])

  // Animate tower
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime

    // Smooth height transition
    targetHeight.current = probability * maxHeight
    currentHeight.current = THREE.MathUtils.lerp(
      currentHeight.current,
      Math.max(targetHeight.current, 0.01),
      delta * 4
    )

    if (towerRef.current) {
      towerRef.current.scale.y = currentHeight.current
      towerRef.current.position.y = currentHeight.current / 2

      // Breathing effect for towers
      if (probability > 0.01) {
        const breathe = 1 + Math.sin(time * 2 + index * 0.5) * 0.05
        towerRef.current.scale.x = barWidth * breathe
        towerRef.current.scale.z = barWidth * breathe
      }
    }

    // Animate outer glow
    if (glowRef.current && probability > 0.05) {
      const glowPulse = 1 + Math.sin(time * 3 + index) * 0.15
      glowRef.current.scale.set(
        barWidth * 1.5 * glowPulse,
        currentHeight.current,
        barWidth * 1.5 * glowPulse
      )
      glowRef.current.position.y = currentHeight.current / 2
    }

    // Animate energy rings
    if (ringsRef.current && probability > 0.1) {
      ringsRef.current.children.forEach((ring, i) => {
        if (ring instanceof THREE.Mesh) {
          const ringTime = (time * 0.5 + i * 0.33) % 1
          const scale = ringTime * 2
          ring.scale.setScalar(scale)
          ring.position.y = ringTime * currentHeight.current
          const material = ring.material as THREE.MeshBasicMaterial
          material.opacity = (1 - ringTime) * 0.5 * probability
        }
      })
    }
  })

  const emissiveIntensity = probability > 0.01 ? 0.5 + probability * 0.5 : 0

  return (
    <group position={position} ref={groupRef}>
      {/* Base platform with glow */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[barWidth * 0.7, barWidth * 0.8, 0.1, 32]} />
        <meshStandardMaterial
          color="#1e1b4b"
          metalness={0.7}
          roughness={0.3}
          emissive={color}
          emissiveIntensity={probability > 0.05 ? 0.2 : 0}
        />
      </mesh>

      {/* Base ring glow */}
      {probability > 0.05 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[barWidth * 0.6, barWidth * 1, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={probability * 0.4}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Main probability tower (cylindrical) */}
      <mesh ref={towerRef}>
        <cylinderGeometry args={[barWidth * 0.4, barWidth * 0.5, 1, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          metalness={0.4}
          roughness={0.3}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Outer glow cylinder */}
      {probability > 0.05 && (
        <mesh ref={glowRef}>
          <cylinderGeometry args={[1, 1, 1, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.15}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Energy rings that travel up the tower */}
      {probability > 0.1 && (
        <group ref={ringsRef}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[barWidth * 0.3, barWidth * 0.6, 32]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.3}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Top glow sphere */}
      {probability > 0.05 && (
        <TopGlowOrb
          probability={probability}
          color={color}
          height={currentHeight.current}
          index={index}
        />
      )}

      {/* Point light for scene illumination */}
      {probability > 0.1 && (
        <pointLight
          position={[0, Math.max(currentHeight.current, 0.5), 0]}
          color={color}
          intensity={probability * 6}
          distance={6}
          decay={2}
        />
      )}

      {/* Minimal state label */}
      <Html position={[0, -0.3, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="font-mono text-[10px] text-gray-300 bg-slate-900/80 px-1.5 py-0.5 rounded whitespace-nowrap">
          |{state}⟩
        </div>
      </Html>
    </group>
  )
}

// Glowing orb at the top of towers
function TopGlowOrb({
  probability,
  color,
  height,
  index
}: {
  probability: number
  color: THREE.Color
  height: number
  index: number
}) {
  const orbRef = useRef<THREE.Mesh>(null)
  const outerRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const time = state.clock.elapsedTime

    if (orbRef.current) {
      const pulse = 1 + Math.sin(time * 4 + index) * 0.2
      orbRef.current.scale.setScalar(pulse)
      orbRef.current.position.y = height + 0.2
    }

    if (outerRef.current) {
      const outerPulse = 1 + Math.sin(time * 3 + index + Math.PI) * 0.3
      outerRef.current.scale.setScalar(outerPulse)
      outerRef.current.position.y = height + 0.2
    }
  })

  const size = 0.1 + probability * 0.15

  return (
    <group>
      {/* Core orb */}
      <mesh ref={orbRef} position={[0, height + 0.2, 0]}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Outer glow */}
      <mesh ref={outerRef} position={[0, height + 0.2, 0]}>
        <sphereGeometry args={[size * 2, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

// Ground interference pattern
function InterferenceGround({
  size,
  probabilities
}: {
  size: number
  probabilities: { state: string; probability: number; phase?: number }[]
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const resolution = 64

  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(size, size, resolution, resolution)
  }, [size])

  useFrame((state) => {
    if (!meshRef.current) return

    const time = state.clock.elapsedTime
    const positions = geometry.attributes.position.array as Float32Array

    // Create interference pattern based on probability positions
    const n = probabilities.length
    const gridSize = Math.ceil(Math.sqrt(n))

    for (let i = 0; i < positions.length / 3; i++) {
      const x = positions[i * 3]
      const z = positions[i * 3 + 1] // Note: Y and Z swapped for plane

      let waveSum = 0

      for (let p = 0; p < n; p++) {
        const prob = probabilities[p]
        if (prob.probability < 0.05) continue

        const spacing = size / (gridSize + 1)
        const px = ((p % gridSize) - gridSize / 2 + 0.5) * spacing * 1.4
        const pz = (Math.floor(p / gridSize) - gridSize / 2 + 0.5) * spacing * 1.4

        const dist = Math.sqrt((x - px) ** 2 + (z - pz) ** 2)
        const phase = prob.phase || 0

        // Wave emanating from each probability center
        waveSum += Math.sin(dist * 3 - time * 2 + phase) * prob.probability * Math.exp(-dist * 0.3)
      }

      positions[i * 3 + 2] = waveSum * 0.15
    }

    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()
  })

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
      <meshStandardMaterial
        color="#1e1b4b"
        metalness={0.8}
        roughness={0.2}
        emissive="#4338ca"
        emissiveIntensity={0.15}
        wireframe={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Ambient particles rising from the ground
function RisingParticles({
  probabilities,
  size,
  count = 100
}: {
  probabilities: { state: string; probability: number; phase?: number }[]
  size: number
  count?: number
}) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, colors, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const vel = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * size
      pos[i * 3 + 1] = Math.random() * 4
      pos[i * 3 + 2] = (Math.random() - 0.5) * size

      col[i * 3] = 0.4 + Math.random() * 0.2
      col[i * 3 + 1] = 0.3 + Math.random() * 0.4
      col[i * 3 + 2] = 0.9 + Math.random() * 0.1

      vel[i] = 0.3 + Math.random() * 0.5
    }

    return { positions: pos, colors: col, velocities: vel }
  }, [count, size])

  useFrame((state, delta) => {
    if (!pointsRef.current) return

    const posAttr = pointsRef.current.geometry.attributes.position.array as Float32Array
    const colAttr = pointsRef.current.geometry.attributes.color.array as Float32Array
    const time = state.clock.elapsedTime

    const n = probabilities.length
    const gridSize = Math.ceil(Math.sqrt(n))
    const spacing = size / (gridSize + 1)

    for (let i = 0; i < count; i++) {
      // Move particles up
      posAttr[i * 3 + 1] += velocities[i] * delta

      // Slight horizontal wave motion
      posAttr[i * 3] += Math.sin(time + i * 0.1) * 0.005
      posAttr[i * 3 + 2] += Math.cos(time + i * 0.1) * 0.005

      // Attract to high probability regions
      for (let p = 0; p < n; p++) {
        const prob = probabilities[p]
        if (prob.probability < 0.1) continue

        const px = ((p % gridSize) - gridSize / 2 + 0.5) * spacing * 1.4
        const pz = (Math.floor(p / gridSize) - gridSize / 2 + 0.5) * spacing * 1.4

        const dx = px - posAttr[i * 3]
        const dz = pz - posAttr[i * 3 + 2]
        const dist = Math.sqrt(dx * dx + dz * dz)

        if (dist < 2) {
          const force = prob.probability * 0.3 / (dist + 0.5)
          posAttr[i * 3] += dx * force * delta
          posAttr[i * 3 + 2] += dz * force * delta

          // Color based on phase
          const hue = ((prob.phase || 0) / (2 * Math.PI))
          const targetColor = new THREE.Color().setHSL(hue, 0.8, 0.6)
          colAttr[i * 3] = THREE.MathUtils.lerp(colAttr[i * 3], targetColor.r, 0.1)
          colAttr[i * 3 + 1] = THREE.MathUtils.lerp(colAttr[i * 3 + 1], targetColor.g, 0.1)
          colAttr[i * 3 + 2] = THREE.MathUtils.lerp(colAttr[i * 3 + 2], targetColor.b, 0.1)
        }
      }

      // Reset particles that go too high
      if (posAttr[i * 3 + 1] > 5) {
        posAttr[i * 3] = (Math.random() - 0.5) * size
        posAttr[i * 3 + 1] = 0
        posAttr[i * 3 + 2] = (Math.random() - 0.5) * size

        // Reset color
        colAttr[i * 3] = 0.4 + Math.random() * 0.2
        colAttr[i * 3 + 1] = 0.3 + Math.random() * 0.4
        colAttr[i * 3 + 2] = 0.9
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
        size={0.06}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

export default function ProbabilityLandscape({
  probabilities,
  position = [0, 0, 0],
  maxHeight = 3,
  barWidth = 0.6,
  spacing = 1.2,
  enhanced = true,
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

  const gridSize = Math.max(layout.totalWidth, layout.totalDepth) + spacing * 3

  return (
    <group position={position}>
      {/* Interference pattern ground */}
      {enhanced && (
        <InterferenceGround size={gridSize} probabilities={probabilities} />
      )}

      {/* Base grid */}
      <gridHelper
        args={[gridSize, Math.max(layout.cols, layout.rows) + 4, '#6366f1', '#312e81']}
        position={[0, -0.12, 0]}
      />

      {/* Rising ambient particles */}
      {enhanced && (
        <RisingParticles
          probabilities={probabilities}
          size={gridSize}
          count={80}
        />
      )}

      {/* Probability towers */}
      {probabilities.map((prob, i) => (
        <ProbabilityTower
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
    </group>
  )
}
