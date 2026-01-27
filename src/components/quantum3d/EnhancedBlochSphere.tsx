import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Line, Html, Trail, Float } from '@react-three/drei'
import { useSpring, animated } from '@react-spring/three'
import * as THREE from 'three'

export interface QubitState {
  theta: number
  phi: number
  label?: string
}

interface EnhancedBlochSphereProps {
  state: QubitState
  position?: [number, number, number]
  radius?: number
  showLabels?: boolean
  glowColor?: string
  isEntangled?: boolean
  showPedagogicGuides?: boolean
  animationSpeed?: number
  onStateClick?: () => void
}

// Convert spherical to Cartesian coordinates
function sphericalToCartesian(theta: number, phi: number, r: number = 1): [number, number, number] {
  return [
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.cos(theta),
    r * Math.sin(theta) * Math.sin(phi),
  ]
}

// Generate points for a circle in 3D
function generateCirclePoints(radius: number, segments: number, axis: 'xy' | 'xz' | 'yz'): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    let x = 0, y = 0, z = 0
    switch (axis) {
      case 'xy':
        x = radius * Math.cos(angle)
        y = radius * Math.sin(angle)
        break
      case 'xz':
        x = radius * Math.cos(angle)
        z = radius * Math.sin(angle)
        break
      case 'yz':
        y = radius * Math.cos(angle)
        z = radius * Math.sin(angle)
        break
    }
    points.push(new THREE.Vector3(x, y, z))
  }
  return points
}

// Phase to color conversion
function phaseToColor(phase: number): THREE.Color {
  const hue = ((phase / (2 * Math.PI)) * 360 + 360) % 360
  return new THREE.Color().setHSL(hue / 360, 0.85, 0.55)
}

// Quantum field visualization around the sphere
function QuantumField({
  radius,
  isEntangled,
  theta,
  phi,
}: {
  radius: number
  isEntangled: boolean
  theta: number
  phi: number
}) {
  const fieldRef = useRef<THREE.Points>(null)
  const particleCount = 300

  const { positions, colors, phases, radii } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    const col = new Float32Array(particleCount * 3)
    const pha = new Float32Array(particleCount)
    const rad = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      // Distribute on sphere surface with some variation
      const u = Math.random()
      const v = Math.random()
      const t = 2 * Math.PI * u
      const p = Math.acos(2 * v - 1)
      const r = radius * (1 + (Math.random() - 0.5) * 0.3)

      pos[i * 3] = r * Math.sin(p) * Math.cos(t)
      pos[i * 3 + 1] = r * Math.cos(p)
      pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t)

      const baseColor = isEntangled
        ? new THREE.Color('#ec4899')
        : new THREE.Color('#8b5cf6')
      baseColor.offsetHSL(Math.random() * 0.2 - 0.1, 0, Math.random() * 0.2 - 0.1)

      col[i * 3] = baseColor.r
      col[i * 3 + 1] = baseColor.g
      col[i * 3 + 2] = baseColor.b

      pha[i] = Math.random() * Math.PI * 2
      rad[i] = r
    }

    return { positions: pos, colors: col, phases: pha, radii: rad }
  }, [radius, isEntangled, particleCount])

  useFrame((state) => {
    if (!fieldRef.current) return
    const time = state.clock.elapsedTime

    const posAttr = fieldRef.current.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < particleCount; i++) {
      // Orbital motion with wave pattern
      const currentAngle = Math.atan2(posAttr[i * 3 + 2], posAttr[i * 3])
      const newAngle = currentAngle + (0.2 + Math.sin(phases[i]) * 0.1) * 0.01

      // Distance from state vector influences motion
      const statePos = sphericalToCartesian(theta, phi, radius)
      const dx = posAttr[i * 3] - statePos[0]
      const dy = posAttr[i * 3 + 1] - statePos[1]
      const dz = posAttr[i * 3 + 2] - statePos[2]
      const distToState = Math.sqrt(dx * dx + dy * dy + dz * dz)

      // Particles are attracted to state vector
      const attractionStrength = 0.02 / (distToState + 0.5)
      const r = radii[i] + Math.sin(time * 2 + phases[i]) * 0.05

      // Calculate new position on sphere with orbital motion
      const y = posAttr[i * 3 + 1]
      const horizontalRadius = Math.sqrt(r * r - y * y * 0.95)

      posAttr[i * 3] = Math.cos(newAngle) * horizontalRadius - dx * attractionStrength
      posAttr[i * 3 + 2] = Math.sin(newAngle) * horizontalRadius - dz * attractionStrength
      posAttr[i * 3 + 1] += Math.sin(time + phases[i]) * 0.01 - dy * attractionStrength * 0.5

      // Keep particles near sphere surface
      const currentDist = Math.sqrt(
        posAttr[i * 3] ** 2 + posAttr[i * 3 + 1] ** 2 + posAttr[i * 3 + 2] ** 2
      )
      if (currentDist > radius * 1.3 || currentDist < radius * 0.8) {
        const normalize = radius / currentDist
        posAttr[i * 3] *= normalize
        posAttr[i * 3 + 1] *= normalize
        posAttr[i * 3 + 2] *= normalize
      }
    }

    fieldRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={fieldRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
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

// State vector with trail effect
function StateVectorWithTrail({
  state,
  radius,
  isEntangled,
}: {
  state: QubitState
  radius: number
  isEntangled: boolean
}) {
  const orbRef = useRef<THREE.Mesh>(null)
  const targetPosition = useMemo(
    () => sphericalToCartesian(state.theta, state.phi, radius * 0.95),
    [state.theta, state.phi, radius]
  )

  const { position } = useSpring({
    position: targetPosition,
    config: { mass: 1, tension: 80, friction: 12 },
  })

  const phaseColor = useMemo(() => phaseToColor(state.phi), [state.phi])

  useFrame((s) => {
    if (orbRef.current) {
      // Pulse effect
      const pulse = 1 + Math.sin(s.clock.elapsedTime * 4) * 0.1
      orbRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <>
      {/* State vector line with glow */}
      <Line
        points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(...targetPosition)]}
        color={isEntangled ? '#ec4899' : '#22d3ee'}
        lineWidth={4}
      />
      <Line
        points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(...targetPosition)]}
        color={isEntangled ? '#ec4899' : '#22d3ee'}
        lineWidth={12}
        transparent
        opacity={0.3}
      />

      {/* State orb with trail */}
      <Trail
        width={0.5}
        length={8}
        color={isEntangled ? '#ec4899' : '#22d3ee'}
        attenuation={(t) => t * t}
      >
        <animated.mesh ref={orbRef} position={position as any}>
          {/* Core */}
          <sphereGeometry args={[0.12, 32, 32]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={isEntangled ? '#ec4899' : '#22d3ee'}
            emissiveIntensity={2}
          />
        </animated.mesh>
      </Trail>

      {/* Outer glow layers */}
      <animated.mesh position={position as any}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial
          color={isEntangled ? '#ec4899' : '#22d3ee'}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </animated.mesh>

      <animated.mesh position={position as any}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial
          color={isEntangled ? '#ec4899' : '#22d3ee'}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </animated.mesh>

      {/* Phase color indicator ring */}
      <animated.mesh position={position as any} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.02, 8, 32]} />
        <meshBasicMaterial
          color={phaseColor}
          transparent
          opacity={0.8}
        />
      </animated.mesh>

      {/* Point light for illumination */}
      <animated.pointLight
        position={position as any}
        color={isEntangled ? '#ec4899' : '#22d3ee'}
        intensity={3}
        distance={4}
        decay={2}
      />
    </>
  )
}

// Probability amplitude wave on sphere surface
function ProbabilityWave({
  radius,
  theta,
}: {
  radius: number
  theta: number
}) {
  const waveRef = useRef<THREE.Mesh>(null)
  const prob0 = Math.cos(theta / 2) ** 2

  useFrame((state) => {
    if (!waveRef.current) return
    const time = state.clock.elapsedTime

    // Wave pulse animation
    const pulse = Math.sin(time * 2) * 0.02
    waveRef.current.scale.setScalar(1 + pulse)
  })

  return (
    <group>
      {/* |0⟩ probability hemisphere glow */}
      <mesh ref={waveRef} position={[0, radius * 0.5, 0]}>
        <sphereGeometry args={[radius * 0.3 * prob0 + 0.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.2 * prob0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* |1⟩ probability hemisphere glow */}
      <mesh position={[0, -radius * 0.5, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[radius * 0.3 * (1 - prob0) + 0.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial
          color="#ef4444"
          transparent
          opacity={0.2 * (1 - prob0)}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

// Entanglement pulse effect
function EntanglementPulse({
  radius,
  active,
}: {
  radius: number
  active: boolean
}) {
  const ringsRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!ringsRef.current || !active) return
    const time = state.clock.elapsedTime

    ringsRef.current.children.forEach((ring, i) => {
      if (ring instanceof THREE.Mesh) {
        const phase = (time * 1.5 + i * 0.3) % 1
        const scale = radius * (0.9 + phase * 0.5)
        ring.scale.setScalar(scale)

        const material = ring.material as THREE.MeshBasicMaterial
        material.opacity = (1 - phase) * 0.4
      }
    })
  })

  if (!active) return null

  return (
    <group ref={ringsRef}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1, 0.02, 8, 64]} />
          <meshBasicMaterial
            color="#ec4899"
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// Pedagogic guides showing measurement axes
function PedagogicGuides({
  radius,
  theta,
  showGuides,
}: {
  radius: number
  theta: number
  showGuides: boolean
}) {
  if (!showGuides) return null

  const axisLength = radius * 1.4
  const prob0 = Math.cos(theta / 2) ** 2
  const prob1 = 1 - prob0

  return (
    <group>
      {/* Probability bar on Z-axis */}
      <group position={[axisLength + 0.5, 0, 0]}>
        {/* |0⟩ bar */}
        <mesh position={[0, axisLength * prob0 / 2, 0]}>
          <boxGeometry args={[0.15, axisLength * prob0, 0.15]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
        </mesh>

        {/* |1⟩ bar */}
        <mesh position={[0, -axisLength * prob1 / 2, 0]}>
          <boxGeometry args={[0.15, axisLength * prob1, 0.15]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
        </mesh>

        {/* Labels */}
        <Html position={[0.3, axisLength * prob0, 0]} center>
          <div className="text-xs font-mono text-green-400 bg-slate-900/80 px-1 rounded whitespace-nowrap">
            P(|0⟩)={(prob0 * 100).toFixed(0)}%
          </div>
        </Html>
        <Html position={[0.3, -axisLength * prob1, 0]} center>
          <div className="text-xs font-mono text-red-400 bg-slate-900/80 px-1 rounded whitespace-nowrap">
            P(|1⟩)={(prob1 * 100).toFixed(0)}%
          </div>
        </Html>
      </group>

      {/* Theta angle arc */}
      <Line
        points={Array.from({ length: 20 }, (_, i) => {
          const t = (i / 19) * theta
          return new THREE.Vector3(
            radius * 0.5 * Math.sin(t),
            radius * 0.5 * Math.cos(t),
            0
          )
        })}
        color="#f59e0b"
        lineWidth={2}
      />
      <Html position={sphericalToCartesian(theta / 2, 0, radius * 0.6)} center>
        <div className="text-xs font-mono text-amber-400 bg-slate-900/80 px-1 rounded">
          θ={((theta * 180) / Math.PI).toFixed(0)}°
        </div>
      </Html>
    </group>
  )
}

export default function EnhancedBlochSphere({
  state,
  position = [0, 0, 0],
  radius = 1.5,
  showLabels = true,
  glowColor = '#6366f1',
  isEntangled = false,
  showPedagogicGuides = false,
  animationSpeed = 1,
  onStateClick,
}: EnhancedBlochSphereProps) {
  const sphereRef = useRef<THREE.Mesh>(null)
  const outerGlowRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // Circle geometries
  const equatorPoints = useMemo(() => generateCirclePoints(radius, 64, 'xz'), [radius])
  const meridian1Points = useMemo(() => generateCirclePoints(radius, 64, 'xy'), [radius])
  const meridian2Points = useMemo(() => generateCirclePoints(radius, 64, 'yz'), [radius])

  const axisLength = radius * 1.35

  // Animations
  useFrame((clock) => {
    const time = clock.clock.elapsedTime * animationSpeed

    // Breathing animation
    if (sphereRef.current) {
      const breathe = 1 + Math.sin(time * 0.5) * 0.008
      sphereRef.current.scale.setScalar(breathe)
    }

    // Outer glow pulse for entangled qubits
    if (outerGlowRef.current && isEntangled) {
      const pulse = 1 + Math.sin(time * 3) * 0.1
      outerGlowRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <Float
      speed={0.5}
      rotationIntensity={0.1}
      floatIntensity={0.3}
      floatingRange={[-0.05, 0.05]}
    >
      <group position={position}>
        {/* Quantum field particles */}
        <QuantumField
          radius={radius * 1.2}
          isEntangled={isEntangled}
          theta={state.theta}
          phi={state.phi}
        />

        {/* Entanglement pulse rings */}
        <EntanglementPulse radius={radius} active={isEntangled} />

        {/* Outer atmospheric glow */}
        <Sphere ref={outerGlowRef} args={[radius * 1.25, 32, 32]}>
          <meshBasicMaterial
            color={isEntangled ? '#ec4899' : glowColor}
            transparent
            opacity={0.08}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </Sphere>

        {/* Secondary glow layer */}
        <Sphere args={[radius * 1.12, 32, 32]}>
          <meshBasicMaterial
            color={isEntangled ? '#ec4899' : glowColor}
            transparent
            opacity={0.12}
            side={THREE.BackSide}
          />
        </Sphere>

        {/* Main sphere */}
        <Sphere
          ref={sphereRef}
          args={[radius, 64, 64]}
          onClick={onStateClick}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <meshPhysicalMaterial
            color={hovered ? '#1e1b4b' : '#0f0a2e'}
            transparent
            opacity={hovered ? 0.5 : 0.35}
            roughness={0.1}
            metalness={0.3}
            clearcoat={1}
            clearcoatRoughness={0.05}
            side={THREE.DoubleSide}
            envMapIntensity={0.5}
          />
        </Sphere>

        {/* Inner wireframe structure */}
        <Sphere args={[radius * 0.98, 24, 24]}>
          <meshBasicMaterial
            color={glowColor}
            wireframe
            transparent
            opacity={0.15}
          />
        </Sphere>

        {/* Probability wave visualization */}
        <ProbabilityWave radius={radius} theta={state.theta} />

        {/* Equator with glow */}
        <Line
          points={equatorPoints}
          color="#8b5cf6"
          lineWidth={2}
          transparent
          opacity={0.7}
          dashed
          dashSize={0.15}
          gapSize={0.08}
        />

        {/* Meridians */}
        <Line points={meridian1Points} color="#6366f1" lineWidth={1} transparent opacity={0.3} />
        <Line points={meridian2Points} color="#6366f1" lineWidth={1} transparent opacity={0.3} />

        {/* Z-axis (|0⟩ to |1⟩) */}
        <Line
          points={[new THREE.Vector3(0, -axisLength, 0), new THREE.Vector3(0, axisLength, 0)]}
          color="#22c55e"
          lineWidth={3}
        />
        <Line
          points={[new THREE.Vector3(0, -axisLength, 0), new THREE.Vector3(0, axisLength, 0)]}
          color="#22c55e"
          lineWidth={10}
          transparent
          opacity={0.2}
        />

        {/* X-axis */}
        <Line
          points={[new THREE.Vector3(-axisLength, 0, 0), new THREE.Vector3(axisLength, 0, 0)]}
          color="#ef4444"
          lineWidth={2}
        />

        {/* Y-axis */}
        <Line
          points={[new THREE.Vector3(0, 0, -axisLength), new THREE.Vector3(0, 0, axisLength)]}
          color="#3b82f6"
          lineWidth={2}
        />

        {/* State vector with trail */}
        <StateVectorWithTrail state={state} radius={radius} isEntangled={isEntangled} />

        {/* Pedagogic guides */}
        <PedagogicGuides radius={radius} theta={state.theta} showGuides={showPedagogicGuides} />

        {/* Labels */}
        {showLabels && (
          <>
            <Html position={[0, axisLength + 0.3, 0]} center>
              <div className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-slate-900/90 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/20">
                |0⟩
              </div>
            </Html>
            <Html position={[0, -axisLength - 0.3, 0]} center>
              <div className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-slate-900/90 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/20">
                |1⟩
              </div>
            </Html>
            <Html position={[axisLength + 0.3, 0, 0]} center>
              <div className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-900/80 text-red-400 border border-red-500/20">
                |+⟩
              </div>
            </Html>
            <Html position={[-axisLength - 0.3, 0, 0]} center>
              <div className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-900/80 text-red-400 border border-red-500/20">
                |-⟩
              </div>
            </Html>

            {state.label && (
              <Html position={[0, axisLength + 0.8, 0]} center>
                <div
                  className={`font-bold text-base px-3 py-1 rounded-lg ${
                    isEntangled
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                  } text-white shadow-lg`}
                >
                  {state.label}
                  {isEntangled && <span className="ml-1.5 animate-pulse">⚡</span>}
                </div>
              </Html>
            )}
          </>
        )}
      </group>
    </Float>
  )
}
