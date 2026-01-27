import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Line, Html } from '@react-three/drei'
import { useSpring, animated } from '@react-spring/three'
import * as THREE from 'three'

export interface QubitState {
  theta: number // Polar angle (0 to PI)
  phi: number   // Azimuthal angle (0 to 2*PI)
  label?: string
}

interface BlochSphere3DProps {
  state: QubitState
  position?: [number, number, number]
  radius?: number
  showLabels?: boolean
  glowColor?: string
  isEntangled?: boolean
  onElementHover?: (element: string | null) => void
}

// Convert spherical to Cartesian coordinates
function sphericalToCartesian(theta: number, phi: number, r: number = 1): [number, number, number] {
  return [
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.cos(theta), // Y is up in Three.js
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

export default function BlochSphere3D({
  state,
  position = [0, 0, 0],
  radius = 1.5,
  showLabels = true,
  glowColor = '#6366f1',
  isEntangled = false,
  onElementHover,
}: BlochSphere3DProps) {
  const sphereRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  // Animated state vector position
  const targetPosition = useMemo(() => sphericalToCartesian(state.theta, state.phi, radius * 0.95), [state.theta, state.phi, radius])

  const { stateVec } = useSpring({
    stateVec: targetPosition,
    config: { mass: 1, tension: 120, friction: 14 },
  })

  // Dynamic animations
  useFrame((clock) => {
    // Pulse animation for entangled qubits
    if (glowRef.current && isEntangled) {
      const pulse = 1 + Math.sin(clock.clock.elapsedTime * 3) * 0.08
      glowRef.current.scale.setScalar(pulse)
    }

    // Gentle breathing animation for the main sphere
    if (sphereRef.current) {
      const breathe = 1 + Math.sin(clock.clock.elapsedTime * 0.5) * 0.01
      sphereRef.current.scale.setScalar(breathe)
    }
  })

  // Circle geometries for equator and meridians
  const equatorPoints = useMemo(() => generateCirclePoints(radius, 64, 'xz'), [radius])
  const meridian1Points = useMemo(() => generateCirclePoints(radius, 64, 'xy'), [radius])
  const meridian2Points = useMemo(() => generateCirclePoints(radius, 64, 'yz'), [radius])

  // Axis endpoints
  const axisLength = radius * 1.3

  return (
    <group position={position}>
      {/* Outer glow sphere */}
      <Sphere ref={glowRef} args={[radius * 1.15, 32, 32]}>
        <meshBasicMaterial
          color={isEntangled ? '#ec4899' : glowColor}
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Main sphere - higher contrast */}
      <Sphere
        ref={sphereRef}
        args={[radius, 64, 64]}
        onPointerEnter={() => onElementHover?.('sphere')}
        onPointerLeave={() => onElementHover?.(null)}
      >
        <meshPhysicalMaterial
          color="#0f0a2e"
          transparent
          opacity={0.4}
          roughness={0.1}
          metalness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.05}
          side={THREE.DoubleSide}
        />
      </Sphere>

      {/* Wireframe overlay - more visible */}
      <Sphere args={[radius * 1.002, 16, 16]}>
        <meshBasicMaterial
          color={glowColor}
          wireframe
          transparent
          opacity={0.25}
        />
      </Sphere>

      {/* Equator circle */}
      <Line
        points={equatorPoints}
        color="#6366f1"
        lineWidth={1.5}
        transparent
        opacity={0.6}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />
      {/* Equator hitbox */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        onPointerEnter={() => onElementHover?.('equator')}
        onPointerLeave={() => onElementHover?.(null)}
      >
        <torusGeometry args={[radius, 0.06, 8, 32]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Meridian circles */}
      <Line
        points={meridian1Points}
        color="#8b5cf6"
        lineWidth={1}
        transparent
        opacity={0.4}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />
      <Line
        points={meridian2Points}
        color="#8b5cf6"
        lineWidth={1}
        transparent
        opacity={0.4}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />

      {/* Z-axis (vertical - |0⟩ to |1⟩) */}
      <Line
        points={[
          new THREE.Vector3(0, -axisLength, 0),
          new THREE.Vector3(0, axisLength, 0),
        ]}
        color="#22c55e"
        lineWidth={2}
      />
      {/* Z-axis hitbox */}
      <mesh
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        onPointerEnter={() => onElementHover?.('z-axis')}
        onPointerLeave={() => onElementHover?.(null)}
      >
        <cylinderGeometry args={[0.08, 0.08, axisLength * 2, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* X-axis (|+⟩ to |-⟩) */}
      <Line
        points={[
          new THREE.Vector3(-axisLength, 0, 0),
          new THREE.Vector3(axisLength, 0, 0),
        ]}
        color="#ef4444"
        lineWidth={2}
      />
      {/* X-axis hitbox */}
      <mesh
        position={[0, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        onPointerEnter={() => onElementHover?.('x-axis')}
        onPointerLeave={() => onElementHover?.(null)}
      >
        <cylinderGeometry args={[0.08, 0.08, axisLength * 2, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Y-axis */}
      <Line
        points={[
          new THREE.Vector3(0, 0, -axisLength),
          new THREE.Vector3(0, 0, axisLength),
        ]}
        color="#3b82f6"
        lineWidth={2}
      />
      {/* Y-axis hitbox */}
      <mesh
        position={[0, 0, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        onPointerEnter={() => onElementHover?.('y-axis')}
        onPointerLeave={() => onElementHover?.(null)}
      >
        <cylinderGeometry args={[0.08, 0.08, axisLength * 2, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* State vector line */}
      <animated.group>
        <Line
          points={[
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(...targetPosition),
          ]}
          color="#22d3ee"
          lineWidth={5}
        />
      </animated.group>

      {/* State point (glowing orb) - brighter */}
      <animated.mesh
        position={stateVec as unknown as THREE.Vector3}
        onPointerEnter={() => onElementHover?.('state-vector')}
        onPointerLeave={() => onElementHover?.(null)}
      >
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} />
      </animated.mesh>

      {/* State point glow - larger hitbox */}
      <animated.mesh
        position={stateVec as unknown as THREE.Vector3}
        onPointerEnter={() => onElementHover?.('state-vector')}
        onPointerLeave={() => onElementHover?.(null)}
      >
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.3} />
      </animated.mesh>

      {/* Point light at state position */}
      <animated.pointLight
        position={stateVec as unknown as THREE.Vector3}
        color="#22d3ee"
        intensity={2}
        distance={3}
        decay={2}
      />

      {/* Minimal axis labels - just |0⟩ and |1⟩ */}
      {showLabels && (
        <>
          <Html position={[0, axisLength + 0.25, 0]} center style={{ zIndex: 100 }}>
            <div className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-slate-900/90 text-green-400 border border-green-500/30">
              |0⟩
            </div>
          </Html>
          <Html position={[0, -axisLength - 0.25, 0]} center style={{ zIndex: 100 }}>
            <div className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-slate-900/90 text-green-400 border border-green-500/30">
              |1⟩
            </div>
          </Html>

          {/* Qubit label */}
          {state.label && (
            <Html position={[0, axisLength + 0.7, 0]} center style={{ zIndex: 101 }}>
              <div
                className={`font-bold text-base px-2.5 py-0.5 rounded-lg ${
                  isEntangled ? 'bg-pink-500 animate-pulse' : 'bg-indigo-600'
                } text-white shadow-lg`}
              >
                {state.label}
                {isEntangled && <span className="ml-1">⚡</span>}
              </div>
            </Html>
          )}
        </>
      )}
    </group>
  )
}
