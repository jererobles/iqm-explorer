import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Cosmic nebula background effect - simplified version without custom shaders
export function CosmicNebula({
  position = [0, 0, -20] as [number, number, number],
  size = 50,
  intensity = 1,
}: {
  position?: [number, number, number]
  size?: number
  intensity?: number
}) {
  const groupRef = useRef<THREE.Group>(null)

  // Create multiple overlapping layers for nebula effect
  const layers = useMemo(() => {
    return [
      { color: '#8b5cf6', opacity: 0.15, offset: 0, scale: 1 },
      { color: '#06b6d4', opacity: 0.1, offset: 1, scale: 0.9 },
      { color: '#ec4899', opacity: 0.08, offset: 2, scale: 0.8 },
    ]
  }, [])

  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime

    groupRef.current.rotation.z += 0.0003

    // Animate individual layers
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshBasicMaterial
        const pulse = Math.sin(time * 0.3 + i) * 0.5 + 0.5
        material.opacity = layers[i].opacity * intensity * (0.7 + pulse * 0.3)
      }
    })
  })

  return (
    <group ref={groupRef} position={position}>
      {layers.map((layer, i) => (
        <mesh key={i} position={[0, 0, i * 0.1]} scale={layer.scale}>
          <planeGeometry args={[size, size]} />
          <meshBasicMaterial
            color={layer.color}
            transparent
            opacity={layer.opacity * intensity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

// Quantum aurora effect - flowing bands of light
export function QuantumAurora({
  position = [0, 5, 0] as [number, number, number],
  width = 20,
  height = 8,
  segments = 64,
}: {
  position?: [number, number, number]
  width?: number
  height?: number
  segments?: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  const { geometry } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, segments, segments)
    const positions = geo.attributes.position.array as Float32Array
    const colors = new Float32Array(positions.length)

    // Initialize with gradient colors
    for (let i = 0; i < positions.length / 3; i++) {
      const y = positions[i * 3 + 1]
      const normalizedY = (y + height / 2) / height

      // Purple to cyan gradient
      colors[i * 3] = 0.55 - normalizedY * 0.3     // R
      colors[i * 3 + 1] = 0.3 + normalizedY * 0.5  // G
      colors[i * 3 + 2] = 0.95                      // B
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return { geometry: geo }
  }, [width, height, segments])

  useFrame((state) => {
    if (!meshRef.current) return

    const time = state.clock.elapsedTime
    const positions = geometry.attributes.position.array as Float32Array
    const colors = geometry.attributes.color.array as Float32Array

    for (let i = 0; i < positions.length / 3; i++) {
      const x = positions[i * 3]

      // Create flowing wave pattern
      const wave1 = Math.sin(x * 0.3 + time * 0.5) * 1.5
      const wave2 = Math.sin(x * 0.5 + time * 0.3) * Math.cos(time * 0.2) * 1
      const wave3 = Math.sin(x * 0.8 + time * 0.7) * 0.5

      positions[i * 3 + 2] = wave1 + wave2 + wave3

      // Animate colors
      const colorWave = (Math.sin(x * 0.2 + time * 0.4) + 1) / 2
      colors[i * 3] = 0.55 + colorWave * 0.3
      colors[i * 3 + 1] = 0.4 + colorWave * 0.4
      colors[i * 3 + 2] = 0.95 - colorWave * 0.2
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
  })

  return (
    <mesh ref={meshRef} position={position} geometry={geometry}>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

// Quantum portal/vortex effect
export function QuantumVortex({
  position = [0, 0, 0] as [number, number, number],
  innerRadius = 0.5,
  outerRadius = 3,
  depth = 2,
  intensity = 1,
}: {
  position?: [number, number, number]
  innerRadius?: number
  outerRadius?: number
  depth?: number
  intensity?: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const ringsRef = useRef<THREE.Group>(null)

  const rings = useMemo(() => {
    const ringCount = 20
    return Array.from({ length: ringCount }, (_, i) => ({
      radius: innerRadius + (outerRadius - innerRadius) * (i / ringCount),
      phase: (i / ringCount) * Math.PI * 2,
      speed: 0.5 + (1 - i / ringCount) * 2,
      zOffset: (i / ringCount) * depth,
    }))
  }, [innerRadius, outerRadius, depth])

  useFrame((state) => {
    if (!groupRef.current || !ringsRef.current) return

    const time = state.clock.elapsedTime

    // Slowly rotate the whole vortex
    groupRef.current.rotation.z = time * 0.1

    // Animate individual rings
    ringsRef.current.children.forEach((ring, i) => {
      if (ring instanceof THREE.Mesh) {
        const data = rings[i]
        ring.rotation.z = time * data.speed + data.phase
        ring.position.z = Math.sin(time * 0.5 + data.phase) * 0.3 + data.zOffset

        // Pulse opacity
        const material = ring.material as THREE.MeshBasicMaterial
        material.opacity = (0.3 + Math.sin(time * 2 + data.phase) * 0.2) * intensity
      }
    })
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Inner core glow */}
      <mesh>
        <sphereGeometry args={[innerRadius, 32, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9 * intensity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Point light at center */}
      <pointLight color="#8b5cf6" intensity={3 * intensity} distance={10} decay={2} />

      {/* Rotating rings */}
      <group ref={ringsRef}>
        {rings.map((ring, i) => {
          const hue = (i / rings.length) * 0.3 + 0.7 // Purple to cyan
          const color = new THREE.Color().setHSL(hue, 0.8, 0.6)

          return (
            <mesh key={i} position={[0, 0, ring.zOffset]}>
              <torusGeometry args={[ring.radius, 0.02 + (1 - i / rings.length) * 0.03, 8, 64]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.5}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          )
        })}
      </group>

      {/* Energy particles spiraling inward */}
      <VortexParticles
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        count={200}
        intensity={intensity}
      />
    </group>
  )
}

// Particles spiraling into vortex
function VortexParticles({
  innerRadius,
  outerRadius,
  count,
  intensity,
}: {
  innerRadius: number
  outerRadius: number
  count: number
  intensity: number
}) {
  const pointsRef = useRef<THREE.Points>(null)
  const dataRef = useRef<Float32Array | null>(null)

  // Initialize geometry with useMemo
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const particleData = new Float32Array(count * 4) // radius, angle, speed, phase

    const safeInnerRadius = Math.max(0.1, innerRadius)
    const safeOuterRadius = Math.max(safeInnerRadius + 0.1, outerRadius)

    for (let i = 0; i < count; i++) {
      const radius = safeInnerRadius + Math.random() * (safeOuterRadius - safeInnerRadius)
      const angle = Math.random() * Math.PI * 2
      const z = (Math.random() - 0.5) * 2

      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = Math.sin(angle) * radius
      positions[i * 3 + 2] = z

      // Purple-cyan gradient
      const hue = 0.7 + Math.random() * 0.3
      const color = new THREE.Color().setHSL(hue, 0.9, 0.6)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      particleData[i * 4] = radius
      particleData[i * 4 + 1] = angle
      particleData[i * 4 + 2] = 0.5 + Math.random() * 1.5
      particleData[i * 4 + 3] = Math.random() * Math.PI * 2
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    dataRef.current = particleData

    return geo
  }, [count, innerRadius, outerRadius])

  useFrame((state, delta) => {
    if (!pointsRef.current || !dataRef.current) return

    const posAttr = pointsRef.current.geometry.attributes.position
    const posArray = posAttr.array as Float32Array
    const data = dataRef.current
    const time = state.clock.elapsedTime
    const safeInnerRadius = Math.max(0.1, innerRadius)
    const safeOuterRadius = Math.max(safeInnerRadius + 0.1, outerRadius)

    for (let i = 0; i < count; i++) {
      // Update angle (spiral inward)
      data[i * 4 + 1] += data[i * 4 + 2] * delta * 2

      // Gradually decrease radius
      data[i * 4] -= delta * 0.3 * data[i * 4 + 2]

      const radius = Math.max(0, data[i * 4])
      const angle = data[i * 4 + 1]

      posArray[i * 3] = Math.cos(angle) * radius
      posArray[i * 3 + 1] = Math.sin(angle) * radius
      posArray[i * 3 + 2] = Math.sin(time + data[i * 4 + 3]) * 0.5

      // Reset particles that reach center
      if (radius < safeInnerRadius * 0.8) {
        data[i * 4] = safeOuterRadius * (0.8 + Math.random() * 0.2)
        data[i * 4 + 1] = Math.random() * Math.PI * 2
      }
    }

    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.9 * intensity}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// Energy wave ripple effect
export function EnergyWaveRipple({
  position = [0, 0, 0] as [number, number, number],
  color = '#8b5cf6',
  maxRadius = 5,
  speed = 1,
  count = 5,
}: {
  position?: [number, number, number]
  color?: string
  maxRadius?: number
  speed?: number
  count?: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const phases = useMemo(() => Array.from({ length: count }, (_, i) => i / count), [count])

  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime * speed

    groupRef.current.children.forEach((ring, i) => {
      if (ring instanceof THREE.Mesh) {
        const phase = (time + phases[i]) % 1
        const scale = 0.1 + phase * maxRadius
        ring.scale.setScalar(scale)

        const material = ring.material as THREE.MeshBasicMaterial
        material.opacity = (1 - phase) * 0.6
      }
    })
  })

  return (
    <group ref={groupRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      {phases.map((_, i) => (
        <mesh key={i}>
          <ringGeometry args={[0.9, 1, 64]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// Floating holographic grid - simplified version using gridHelper
export function HolographicGrid({
  position = [0, -2, 0] as [number, number, number],
  size = 20,
  divisions = 20,
  color1 = '#8b5cf6',
  color2 = '#06b6d4',
}: {
  position?: [number, number, number]
  size?: number
  divisions?: number
  color1?: string
  color2?: string
}) {
  const gridRef = useRef<THREE.GridHelper>(null)

  useFrame((state) => {
    if (!gridRef.current) return
    const time = state.clock.elapsedTime
    const material = gridRef.current.material as THREE.Material
    if (material && 'opacity' in material) {
      (material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(time * 0.5) * 0.1
    }
  })

  return (
    <group position={position}>
      <gridHelper
        ref={gridRef}
        args={[size, divisions, color1, color2]}
      />
      {/* Add subtle glow plane underneath */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[size * 0.8, size * 0.8]} />
        <meshBasicMaterial
          color={color1}
          transparent
          opacity={0.05}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

// Quantum state transition effect
export function StateTransitionBurst({
  position = [0, 0, 0] as [number, number, number],
  color = '#22d3ee',
  active = false,
  onComplete,
}: {
  position?: [number, number, number]
  color?: string
  active?: boolean
  onComplete?: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const progressRef = useRef(0)
  const particlesRef = useRef<THREE.Points>(null)

  const { positions, velocities } = useMemo(() => {
    const count = 100
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      pos[i * 3] = 0
      pos[i * 3 + 1] = 0
      pos[i * 3 + 2] = 0

      // Random direction explosion
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 2 + Math.random() * 3

      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed
      vel[i * 3 + 2] = Math.cos(phi) * speed
    }

    return { positions: pos, velocities: vel }
  }, [])

  useFrame((_, delta) => {
    if (!active || !groupRef.current || !particlesRef.current) {
      progressRef.current = 0
      return
    }

    progressRef.current += delta * 2

    if (progressRef.current > 1) {
      progressRef.current = 0
      onComplete?.()
      return
    }

    const progress = progressRef.current
    const posAttr = particlesRef.current.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < positions.length / 3; i++) {
      posAttr[i * 3] = velocities[i * 3] * progress
      posAttr[i * 3 + 1] = velocities[i * 3 + 1] * progress
      posAttr[i * 3 + 2] = velocities[i * 3 + 2] * progress
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true

    // Update material opacity
    const material = particlesRef.current.material as THREE.PointsMaterial
    material.opacity = 1 - progress
  })

  if (!active) return null

  return (
    <group ref={groupRef} position={position}>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={color}
          size={0.1}
          transparent
          opacity={1}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Central flash */}
      <mesh scale={1 - progressRef.current}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={1 - progressRef.current}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
