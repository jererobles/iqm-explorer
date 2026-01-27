import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface QuantumParticleFieldProps {
  count?: number
  radius?: number
  height?: number
  color?: string
  speed?: number
  spiralIntensity?: number
  probabilityAttractors?: { position: [number, number, number]; strength: number; color?: string }[]
}

export default function QuantumParticleField({
  count = 500,
  radius = 8,
  height = 6,
  color = '#06b6d4',
  speed = 1,
  spiralIntensity = 0.3,
  probabilityAttractors = []
}: QuantumParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.PointsMaterial>(null)

  const { positions, colors, velocities, phases, lifetimes } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    const pha = new Float32Array(count)
    const life = new Float32Array(count)

    const baseColor = new THREE.Color(color)

    for (let i = 0; i < count; i++) {
      // Distribute particles in a cylinder with some clustering
      const angle = Math.random() * Math.PI * 2
      const r = Math.pow(Math.random(), 0.5) * radius // Square root for uniform distribution
      const y = (Math.random() - 0.3) * height

      pos[i * 3] = Math.cos(angle) * r
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = Math.sin(angle) * r

      // Color with slight variation
      const hueShift = (Math.random() - 0.5) * 0.2
      const particleColor = baseColor.clone()
      particleColor.offsetHSL(hueShift, 0, (Math.random() - 0.5) * 0.2)

      col[i * 3] = particleColor.r
      col[i * 3 + 1] = particleColor.g
      col[i * 3 + 2] = particleColor.b

      // Initial velocity (gentle upward spiral)
      vel[i * 3] = (Math.random() - 0.5) * 0.3
      vel[i * 3 + 1] = Math.random() * 0.5 + 0.1
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.3

      // Phase for wave-like motion
      pha[i] = Math.random() * Math.PI * 2

      // Lifetime for fading
      life[i] = Math.random()
    }

    return { positions: pos, colors: col, velocities: vel, phases: pha, lifetimes: life }
  }, [count, radius, height, color])

  useFrame((state, delta) => {
    if (!pointsRef.current || !materialRef.current) return

    const time = state.clock.elapsedTime * speed
    const posAttr = pointsRef.current.geometry.attributes.position.array as Float32Array
    const colAttr = pointsRef.current.geometry.attributes.color.array as Float32Array

    for (let i = 0; i < count; i++) {
      const x = posAttr[i * 3]
      const z = posAttr[i * 3 + 2]

      // Spiral motion
      const angle = Math.atan2(z, x)
      const dist = Math.sqrt(x * x + z * z)
      const spiralSpeed = spiralIntensity / (dist + 1)

      // Update position with spiral and upward motion
      const newAngle = angle + spiralSpeed * delta
      posAttr[i * 3] = Math.cos(newAngle) * dist + velocities[i * 3] * delta
      posAttr[i * 3 + 1] += velocities[i * 3 + 1] * delta + Math.sin(time + phases[i]) * 0.01
      posAttr[i * 3 + 2] = Math.sin(newAngle) * dist + velocities[i * 3 + 2] * delta

      // Apply attractor forces
      for (const attractor of probabilityAttractors) {
        const dx = attractor.position[0] - posAttr[i * 3]
        const dy = attractor.position[1] - posAttr[i * 3 + 1]
        const dz = attractor.position[2] - posAttr[i * 3 + 2]
        const distToAttractor = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (distToAttractor < 3 && distToAttractor > 0.1) {
          const force = attractor.strength * 0.5 / (distToAttractor * distToAttractor)
          posAttr[i * 3] += dx * force * delta
          posAttr[i * 3 + 1] += dy * force * delta
          posAttr[i * 3 + 2] += dz * force * delta

          // Blend color towards attractor color
          if (attractor.color) {
            const attractorColor = new THREE.Color(attractor.color)
            const blend = Math.min(0.3, force * 0.5)
            colAttr[i * 3] = THREE.MathUtils.lerp(colAttr[i * 3], attractorColor.r, blend)
            colAttr[i * 3 + 1] = THREE.MathUtils.lerp(colAttr[i * 3 + 1], attractorColor.g, blend)
            colAttr[i * 3 + 2] = THREE.MathUtils.lerp(colAttr[i * 3 + 2], attractorColor.b, blend)
          }
        }
      }

      // Update lifetime
      lifetimes[i] += delta * 0.1

      // Reset particles that go out of bounds or complete their lifetime
      const currentDist = Math.sqrt(posAttr[i * 3] * posAttr[i * 3] + posAttr[i * 3 + 2] * posAttr[i * 3 + 2])
      if (posAttr[i * 3 + 1] > height ||
          posAttr[i * 3 + 1] < -1 ||
          currentDist > radius * 1.5 ||
          lifetimes[i] > 1) {
        // Respawn at bottom
        const respawnAngle = Math.random() * Math.PI * 2
        const respawnR = Math.pow(Math.random(), 0.5) * radius * 0.8
        posAttr[i * 3] = Math.cos(respawnAngle) * respawnR
        posAttr[i * 3 + 1] = -0.5 + Math.random() * 0.5
        posAttr[i * 3 + 2] = Math.sin(respawnAngle) * respawnR
        lifetimes[i] = 0

        // Reset to base color
        const baseCol = new THREE.Color(color)
        baseCol.offsetHSL((Math.random() - 0.5) * 0.2, 0, 0)
        colAttr[i * 3] = baseCol.r
        colAttr[i * 3 + 1] = baseCol.g
        colAttr[i * 3 + 2] = baseCol.b
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.geometry.attributes.color.needsUpdate = true

    // Pulse the overall brightness
    const pulse = 0.7 + Math.sin(time * 2) * 0.3
    materialRef.current.opacity = pulse
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
        ref={materialRef}
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// Energy ring that pulses outward
export function EnergyRing({
  position = [0, 0, 0] as [number, number, number],
  color = '#8b5cf6',
  maxRadius = 3,
  speed = 1,
  count = 3
}: {
  position?: [number, number, number]
  color?: string
  maxRadius?: number
  speed?: number
  count?: number
}) {
  const ringsRef = useRef<THREE.Group>(null)
  const phases = useMemo(() => Array.from({ length: count }, (_, i) => i / count), [count])

  useFrame((state) => {
    if (!ringsRef.current) return
    const time = state.clock.elapsedTime * speed

    ringsRef.current.children.forEach((ring, i) => {
      if (ring instanceof THREE.Mesh) {
        const phase = (time + phases[i]) % 1
        const scale = phase * maxRadius
        ring.scale.setScalar(scale || 0.01)

        // Fade out as it expands
        const material = ring.material as THREE.MeshBasicMaterial
        material.opacity = (1 - phase) * 0.6
      }
    })
  })

  return (
    <group ref={ringsRef} position={position}>
      {phases.map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.95, 1, 64]} />
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

// Orbiting particles around a center point
export function OrbitingParticles({
  position = [0, 0, 0] as [number, number, number],
  color = '#06b6d4',
  count = 8,
  radius = 1,
  speed = 2
}: {
  position?: [number, number, number]
  color?: string
  count?: number
  radius?: number
  speed?: number
}) {
  const groupRef = useRef<THREE.Group>(null)

  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2,
      yOffset: (Math.random() - 0.5) * 0.5,
      size: 0.05 + Math.random() * 0.05
    })),
    [count]
  )

  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime * speed

    groupRef.current.children.forEach((particle, i) => {
      if (particle instanceof THREE.Mesh) {
        const data = particles[i]
        const angle = data.angle + time
        particle.position.x = Math.cos(angle) * radius
        particle.position.y = data.yOffset + Math.sin(time * 2 + i) * 0.1
        particle.position.z = Math.sin(angle) * radius

        // Pulse size
        const scale = data.size * (1 + Math.sin(time * 3 + i) * 0.3)
        particle.scale.setScalar(scale / data.size)
      }
    })
  })

  return (
    <group ref={groupRef} position={position}>
      {particles.map((p, i) => (
        <mesh key={i}>
          <sphereGeometry args={[p.size, 8, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}

// Vertical beam of light
export function LightBeam({
  position = [0, 0, 0] as [number, number, number],
  color = '#8b5cf6',
  height = 5,
  radius = 0.3,
  intensity = 1
}: {
  position?: [number, number, number]
  color?: string
  height?: number
  radius?: number
  intensity?: number
}) {
  const beamRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!beamRef.current) return
    const time = state.clock.elapsedTime

    // Rotate the beam
    beamRef.current.rotation.y = time * 0.5

    // Pulse inner beam
    const inner = beamRef.current.children[0] as THREE.Mesh
    if (inner) {
      const scale = 1 + Math.sin(time * 4) * 0.1 * intensity
      inner.scale.x = scale
      inner.scale.z = scale
    }
  })

  return (
    <group ref={beamRef} position={position}>
      {/* Inner bright core */}
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius * 0.3, radius * 0.5, height, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9 * intensity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer glow */}
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius, radius * 1.5, height, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2 * intensity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Base glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[radius * 2, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4 * intensity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Point light */}
      <pointLight
        color={color}
        intensity={intensity * 2}
        distance={5}
        decay={2}
        position={[0, height / 2, 0]}
      />
    </group>
  )
}
