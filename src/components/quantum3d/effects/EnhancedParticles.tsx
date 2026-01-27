import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// GPU-optimized particle system with trails
export function QuantumParticleCloud({
  count = 1000,
  radius = 10,
  height = 8,
  colors = ['#8b5cf6', '#06b6d4', '#ec4899', '#22c55e'],
  speed = 1,
  turbulence = 0.5,
  attractors = [] as { position: [number, number, number]; strength: number; color?: string }[],
}: {
  count?: number
  radius?: number
  height?: number
  colors?: string[]
  speed?: number
  turbulence?: number
  attractors?: { position: [number, number, number]; strength: number; color?: string }[]
}) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, velocities, colorArray, lifetimes, originalColors, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const origCol = new Float32Array(count * 3)
    const life = new Float32Array(count)
    const siz = new Float32Array(count)

    const colorObjects = colors.map(c => new THREE.Color(c))

    for (let i = 0; i < count; i++) {
      // Spawn in a sphere/cylinder hybrid
      const theta = Math.random() * Math.PI * 2
      const r = Math.pow(Math.random(), 0.5) * radius
      const y = (Math.random() - 0.5) * height

      pos[i * 3] = Math.cos(theta) * r
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = Math.sin(theta) * r

      // Spiral upward velocity with turbulence
      const tangent = Math.atan2(pos[i * 3 + 2], pos[i * 3])
      vel[i * 3] = Math.cos(tangent + Math.PI / 2) * 0.3 + (Math.random() - 0.5) * turbulence
      vel[i * 3 + 1] = 0.3 + Math.random() * 0.2
      vel[i * 3 + 2] = Math.sin(tangent + Math.PI / 2) * 0.3 + (Math.random() - 0.5) * turbulence

      // Random color from palette
      const baseColor = colorObjects[Math.floor(Math.random() * colorObjects.length)]
      const hueShift = (Math.random() - 0.5) * 0.1
      const particleColor = baseColor.clone()
      particleColor.offsetHSL(hueShift, 0, (Math.random() - 0.5) * 0.2)

      col[i * 3] = particleColor.r
      col[i * 3 + 1] = particleColor.g
      col[i * 3 + 2] = particleColor.b
      origCol[i * 3] = particleColor.r
      origCol[i * 3 + 1] = particleColor.g
      origCol[i * 3 + 2] = particleColor.b

      life[i] = Math.random()
      siz[i] = 0.03 + Math.random() * 0.04
    }

    return {
      positions: pos,
      velocities: vel,
      colorArray: col,
      originalColors: origCol,
      lifetimes: life,
      sizes: siz,
    }
  }, [count, radius, height, colors, turbulence])

  useFrame((state, delta) => {
    if (!pointsRef.current) return

    const time = state.clock.elapsedTime * speed
    const posAttr = pointsRef.current.geometry.attributes.position.array as Float32Array
    const colAttr = pointsRef.current.geometry.attributes.color.array as Float32Array
    const sizeAttr = pointsRef.current.geometry.attributes.size.array as Float32Array

    for (let i = 0; i < count; i++) {
      // Swirling motion
      const x = posAttr[i * 3]
      const y = posAttr[i * 3 + 1]
      const z = posAttr[i * 3 + 2]

      const distFromCenter = Math.sqrt(x * x + z * z)
      const angle = Math.atan2(z, x)

      // Curl noise approximation
      const curlX = Math.sin(y * 0.5 + time) * 0.5
      const curlZ = Math.cos(y * 0.5 + time * 0.7) * 0.5

      // Apply velocity with curl
      posAttr[i * 3] += (velocities[i * 3] + curlX * turbulence) * delta * speed
      posAttr[i * 3 + 1] += velocities[i * 3 + 1] * delta * speed
      posAttr[i * 3 + 2] += (velocities[i * 3 + 2] + curlZ * turbulence) * delta * speed

      // Gentle spiral motion
      const spiralForce = 0.3 / (distFromCenter + 1)
      posAttr[i * 3] += Math.cos(angle + Math.PI / 2) * spiralForce * delta
      posAttr[i * 3 + 2] += Math.sin(angle + Math.PI / 2) * spiralForce * delta

      // Apply attractor forces
      for (const attractor of attractors) {
        const dx = attractor.position[0] - posAttr[i * 3]
        const dy = attractor.position[1] - posAttr[i * 3 + 1]
        const dz = attractor.position[2] - posAttr[i * 3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < 4 && dist > 0.1) {
          const force = attractor.strength / (dist * dist) * delta
          posAttr[i * 3] += dx * force
          posAttr[i * 3 + 1] += dy * force
          posAttr[i * 3 + 2] += dz * force

          // Blend color towards attractor
          if (attractor.color) {
            const attractorColor = new THREE.Color(attractor.color)
            const blend = Math.min(0.3, force * 2)
            colAttr[i * 3] = THREE.MathUtils.lerp(colAttr[i * 3], attractorColor.r, blend)
            colAttr[i * 3 + 1] = THREE.MathUtils.lerp(colAttr[i * 3 + 1], attractorColor.g, blend)
            colAttr[i * 3 + 2] = THREE.MathUtils.lerp(colAttr[i * 3 + 2], attractorColor.b, blend)
          }
        }
      }

      // Update lifetime and size pulsing
      lifetimes[i] += delta * 0.15
      const lifePulse = Math.sin(lifetimes[i] * 4 + i) * 0.5 + 0.5
      sizeAttr[i] = sizes[i] * (0.7 + lifePulse * 0.6)

      // Respawn particles that go out of bounds
      const currentY = posAttr[i * 3 + 1]
      const currentDist = Math.sqrt(posAttr[i * 3] ** 2 + posAttr[i * 3 + 2] ** 2)

      if (currentY > height / 2 + 2 || currentY < -height / 2 - 2 ||
          currentDist > radius * 1.5 || lifetimes[i] > 2) {
        // Respawn
        const theta = Math.random() * Math.PI * 2
        const r = Math.pow(Math.random(), 0.5) * radius * 0.8
        posAttr[i * 3] = Math.cos(theta) * r
        posAttr[i * 3 + 1] = -height / 2 + Math.random() * height * 0.2
        posAttr[i * 3 + 2] = Math.sin(theta) * r
        lifetimes[i] = 0

        // Reset to original color
        colAttr[i * 3] = originalColors[i * 3]
        colAttr[i * 3 + 1] = originalColors[i * 3 + 1]
        colAttr[i * 3 + 2] = originalColors[i * 3 + 2]
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
        <bufferAttribute attach="attributes-color" args={[colors.length > 0 ? colorArray : new Float32Array(count * 3), 3]} />
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

// Glowing orbs that float and pulse
export function FloatingOrbs({
  count = 20,
  radius = 8,
  height = 6,
  colors = ['#8b5cf6', '#06b6d4', '#ec4899'],
  speed = 1,
}: {
  count?: number
  radius?: number
  height?: number
  colors?: string[]
  speed?: number
}) {
  const groupRef = useRef<THREE.Group>(null)

  const orbs = useMemo(() => {
    const colorObjects = colors.map(c => new THREE.Color(c))

    return Array.from({ length: count }, () => {
      const theta = Math.random() * Math.PI * 2
      const r = Math.random() * radius
      const y = (Math.random() - 0.5) * height

      return {
        position: [Math.cos(theta) * r, y, Math.sin(theta) * r] as [number, number, number],
        color: colorObjects[Math.floor(Math.random() * colorObjects.length)],
        size: 0.1 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
        orbitSpeed: (Math.random() - 0.5) * 0.5,
        bobSpeed: 0.5 + Math.random() * 0.5,
        orbitRadius: r,
        orbitAngle: theta,
      }
    })
  }, [count, radius, height, colors])

  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime * speed

    groupRef.current.children.forEach((orbGroup, i) => {
      if (orbGroup instanceof THREE.Group) {
        const orb = orbs[i]

        // Orbit around center
        const newAngle = orb.orbitAngle + time * orb.orbitSpeed
        const x = Math.cos(newAngle) * orb.orbitRadius
        const z = Math.sin(newAngle) * orb.orbitRadius
        const y = orb.position[1] + Math.sin(time * orb.bobSpeed + orb.phase) * 0.3

        orbGroup.position.set(x, y, z)

        // Pulse the orb
        const pulse = 1 + Math.sin(time * 2 + orb.phase) * 0.2
        orbGroup.scale.setScalar(pulse)
      }
    })
  })

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <group key={i} position={orb.position}>
          {/* Core */}
          <mesh>
            <sphereGeometry args={[orb.size * 0.4, 16, 16]} />
            <meshBasicMaterial
              color={orb.color}
              transparent
              opacity={0.95}
            />
          </mesh>

          {/* Inner glow */}
          <mesh>
            <sphereGeometry args={[orb.size * 0.7, 16, 16]} />
            <meshBasicMaterial
              color={orb.color}
              transparent
              opacity={0.4}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Outer glow */}
          <mesh>
            <sphereGeometry args={[orb.size, 16, 16]} />
            <meshBasicMaterial
              color={orb.color}
              transparent
              opacity={0.15}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Point light */}
          <pointLight
            color={orb.color}
            intensity={0.5}
            distance={3}
            decay={2}
          />
        </group>
      ))}
    </group>
  )
}

// Particle trails that follow a path
export function ParticleTrail({
  points,
  color = '#8b5cf6',
  width = 0.1,
  particleCount = 100,
  speed = 1,
}: {
  points: THREE.Vector3[]
  color?: string
  width?: number
  particleCount?: number
  speed?: number
}) {
  const trailRef = useRef<THREE.Points>(null)

  const { positions, progresses, sizes } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    const prog = new Float32Array(particleCount)
    const siz = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      prog[i] = i / particleCount
      siz[i] = width * (0.5 + Math.random() * 0.5)
    }

    return { positions: pos, progresses: prog, sizes: siz }
  }, [particleCount, width])

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points])

  useFrame((state, delta) => {
    if (!trailRef.current || points.length < 2) return

    const posAttr = trailRef.current.geometry.attributes.position.array as Float32Array
    const time = state.clock.elapsedTime * speed

    for (let i = 0; i < particleCount; i++) {
      // Move along curve
      progresses[i] = (progresses[i] + delta * 0.5 * speed) % 1

      const t = (progresses[i] + time * 0.1) % 1
      const point = curve.getPoint(t)

      // Add some waviness
      const wave = Math.sin(t * Math.PI * 4 + time * 2) * 0.1

      posAttr[i * 3] = point.x + wave
      posAttr[i * 3 + 1] = point.y + Math.sin(time + i * 0.1) * 0.05
      posAttr[i * 3 + 2] = point.z + Math.cos(t * Math.PI * 4 + time * 2) * 0.1
    }

    trailRef.current.geometry.attributes.position.needsUpdate = true
  })

  if (points.length < 2) return null

  return (
    <points ref={trailRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// Energy beam connecting two points with particle flow
export function EnergyBeam({
  start,
  end,
  color = '#8b5cf6',
  intensity = 1,
  particleCount = 50,
}: {
  start: [number, number, number]
  end: [number, number, number]
  color?: string
  intensity?: number
  particleCount?: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Points>(null)

  const { positions, progresses, curve } = useMemo(() => {
    const startVec = new THREE.Vector3(...start)
    const endVec = new THREE.Vector3(...end)
    const mid = new THREE.Vector3().lerpVectors(startVec, endVec, 0.5)
    mid.y += startVec.distanceTo(endVec) * 0.2 // Arc upward

    const curveObj = new THREE.QuadraticBezierCurve3(startVec, mid, endVec)

    const pos = new Float32Array(particleCount * 3)
    const prog = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      prog[i] = Math.random()
      const point = curveObj.getPoint(prog[i])
      pos[i * 3] = point.x
      pos[i * 3 + 1] = point.y
      pos[i * 3 + 2] = point.z
    }

    return { positions: pos, progresses: prog, curve: curveObj }
  }, [start, end, particleCount])

  useFrame((state, delta) => {
    if (!particlesRef.current) return

    const posAttr = particlesRef.current.geometry.attributes.position.array as Float32Array
    const time = state.clock.elapsedTime

    for (let i = 0; i < particleCount; i++) {
      progresses[i] = (progresses[i] + delta * 0.8) % 1
      const point = curve.getPoint(progresses[i])

      // Add some perpendicular oscillation
      const tangent = curve.getTangent(progresses[i])
      const perpendicular = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize()
      const wave = Math.sin(progresses[i] * Math.PI * 6 + time * 4) * 0.1 * intensity

      posAttr[i * 3] = point.x + perpendicular.x * wave
      posAttr[i * 3 + 1] = point.y + perpendicular.y * wave
      posAttr[i * 3 + 2] = point.z
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <group ref={groupRef}>
      {/* Main beam line */}
      <mesh>
        <tubeGeometry args={[curve, 32, 0.02 * intensity, 8, false]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6 * intensity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <tubeGeometry args={[curve, 32, 0.08 * intensity, 8, false]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2 * intensity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Flowing particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={color}
          size={0.06 * intensity}
          transparent
          opacity={0.9}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* End point glows */}
      <mesh position={start}>
        <sphereGeometry args={[0.1 * intensity, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.7 * intensity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={end}>
        <sphereGeometry args={[0.1 * intensity, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.7 * intensity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

// Sparkle/twinkle effect
export function Sparkles({
  count = 100,
  radius = 10,
  height = 8,
  color = '#ffffff',
  speed = 1,
}: {
  count?: number
  radius?: number
  height?: number
  color?: string
  speed?: number
}) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, phases, sizes, baseOpacities } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const pha = new Float32Array(count)
    const siz = new Float32Array(count)
    const ops = new Float32Array(count)

    // Ensure safe radius to avoid division by zero
    const safeRadius = Math.max(0.1, radius)
    const heightScale = height / safeRadius

    for (let i = 0; i < count; i++) {
      // Random position in sphere
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.pow(Math.random(), 0.5) * safeRadius

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = (r * Math.cos(phi)) * heightScale
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)

      pha[i] = Math.random() * Math.PI * 2
      siz[i] = 0.02 + Math.random() * 0.03
      ops[i] = 0.3 + Math.random() * 0.7
    }

    return { positions: pos, phases: pha, sizes: siz, baseOpacities: ops }
  }, [count, radius, height])

  useFrame((state) => {
    if (!pointsRef.current) return
    const time = state.clock.elapsedTime * speed

    const sizeAttr = pointsRef.current.geometry.attributes.size.array as Float32Array

    for (let i = 0; i < count; i++) {
      // Twinkle effect
      const twinkle = Math.sin(time * 3 + phases[i]) * 0.5 + 0.5
      sizeAttr[i] = sizes[i] * (0.3 + twinkle * 0.7) * baseOpacities[i]
    }

    pointsRef.current.geometry.attributes.size.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
