import { useRef, useMemo, useState } from 'react'
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

// Hover highlight colors
const HIGHLIGHT_COLORS: Record<string, string> = {
  'sphere': '#a5b4fc',
  'state-vector': '#67e8f9',
  'z-axis': '#4ade80',
  'x-axis': '#f87171',
  'y-axis': '#60a5fa',
  'equator': '#a78bfa',
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
  const [hoveredElement, setHoveredElement] = useState<string | null>(null)

  // Handle hover with both internal state and callback
  const handleHover = (element: string | null) => {
    setHoveredElement(element)
    onElementHover?.(element)
  }

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
  const hitboxRadius = 0.12 // Larger hitbox for easier interaction

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

      {/* Main sphere - with hover highlight */}
      <Sphere
        ref={sphereRef}
        args={[radius, 64, 64]}
        onPointerEnter={() => handleHover('sphere')}
        onPointerLeave={() => handleHover(null)}
      >
        <meshPhysicalMaterial
          color={hoveredElement === 'sphere' ? '#1e1b4b' : '#0f0a2e'}
          transparent
          opacity={hoveredElement === 'sphere' ? 0.5 : 0.4}
          roughness={0.1}
          metalness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.05}
          side={THREE.DoubleSide}
        />
      </Sphere>

      {/* Hover highlight glow for sphere */}
      {hoveredElement === 'sphere' && (
        <Sphere args={[radius * 1.02, 32, 32]}>
          <meshBasicMaterial
            color={HIGHLIGHT_COLORS['sphere']}
            transparent
            opacity={0.15}
          />
        </Sphere>
      )}

      {/* Wireframe overlay */}
      <Sphere args={[radius * 1.002, 16, 16]}>
        <meshBasicMaterial
          color={glowColor}
          wireframe
          transparent
          opacity={0.25}
        />
      </Sphere>

      {/* Equator circle - with hover highlight */}
      <Line
        points={equatorPoints}
        color={hoveredElement === 'equator' ? HIGHLIGHT_COLORS['equator'] : '#6366f1'}
        lineWidth={hoveredElement === 'equator' ? 3 : 1.5}
        transparent
        opacity={hoveredElement === 'equator' ? 1 : 0.6}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />
      {/* Equator highlight glow */}
      {hoveredElement === 'equator' && (
        <Line
          points={equatorPoints}
          color={HIGHLIGHT_COLORS['equator']}
          lineWidth={8}
          transparent
          opacity={0.3}
        />
      )}
      {/* Equator hitbox - torus in XZ plane */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        onPointerEnter={() => handleHover('equator')}
        onPointerLeave={() => handleHover(null)}
      >
        <torusGeometry args={[radius, hitboxRadius, 8, 48]} />
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

      {/* Z-axis (vertical - |0⟩ to |1⟩) - with hover highlight */}
      <Line
        points={[
          new THREE.Vector3(0, -axisLength, 0),
          new THREE.Vector3(0, axisLength, 0),
        ]}
        color={hoveredElement === 'z-axis' ? HIGHLIGHT_COLORS['z-axis'] : '#22c55e'}
        lineWidth={hoveredElement === 'z-axis' ? 4 : 2}
      />
      {/* Z-axis highlight glow */}
      {hoveredElement === 'z-axis' && (
        <Line
          points={[
            new THREE.Vector3(0, -axisLength, 0),
            new THREE.Vector3(0, axisLength, 0),
          ]}
          color={HIGHLIGHT_COLORS['z-axis']}
          lineWidth={10}
          transparent
          opacity={0.3}
        />
      )}
      {/* Z-axis hitbox - cylinder along Y (default orientation) */}
      <mesh
        onPointerEnter={() => handleHover('z-axis')}
        onPointerLeave={() => handleHover(null)}
      >
        <cylinderGeometry args={[hitboxRadius, hitboxRadius, axisLength * 2, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* X-axis (|+⟩ to |-⟩) - with hover highlight */}
      <Line
        points={[
          new THREE.Vector3(-axisLength, 0, 0),
          new THREE.Vector3(axisLength, 0, 0),
        ]}
        color={hoveredElement === 'x-axis' ? HIGHLIGHT_COLORS['x-axis'] : '#ef4444'}
        lineWidth={hoveredElement === 'x-axis' ? 4 : 2}
      />
      {/* X-axis highlight glow */}
      {hoveredElement === 'x-axis' && (
        <Line
          points={[
            new THREE.Vector3(-axisLength, 0, 0),
            new THREE.Vector3(axisLength, 0, 0),
          ]}
          color={HIGHLIGHT_COLORS['x-axis']}
          lineWidth={10}
          transparent
          opacity={0.3}
        />
      )}
      {/* X-axis hitbox - cylinder rotated to lie along X */}
      <mesh
        rotation={[0, 0, Math.PI / 2]}
        onPointerEnter={() => handleHover('x-axis')}
        onPointerLeave={() => handleHover(null)}
      >
        <cylinderGeometry args={[hitboxRadius, hitboxRadius, axisLength * 2, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Y-axis (depth) - with hover highlight */}
      <Line
        points={[
          new THREE.Vector3(0, 0, -axisLength),
          new THREE.Vector3(0, 0, axisLength),
        ]}
        color={hoveredElement === 'y-axis' ? HIGHLIGHT_COLORS['y-axis'] : '#3b82f6'}
        lineWidth={hoveredElement === 'y-axis' ? 4 : 2}
      />
      {/* Y-axis highlight glow */}
      {hoveredElement === 'y-axis' && (
        <Line
          points={[
            new THREE.Vector3(0, 0, -axisLength),
            new THREE.Vector3(0, 0, axisLength),
          ]}
          color={HIGHLIGHT_COLORS['y-axis']}
          lineWidth={10}
          transparent
          opacity={0.3}
        />
      )}
      {/* Y-axis hitbox - cylinder rotated to lie along Z */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        onPointerEnter={() => handleHover('y-axis')}
        onPointerLeave={() => handleHover(null)}
      >
        <cylinderGeometry args={[hitboxRadius, hitboxRadius, axisLength * 2, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* State vector line */}
      <animated.group>
        <Line
          points={[
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(...targetPosition),
          ]}
          color={hoveredElement === 'state-vector' ? HIGHLIGHT_COLORS['state-vector'] : '#22d3ee'}
          lineWidth={hoveredElement === 'state-vector' ? 7 : 5}
        />
        {/* State vector glow when hovered */}
        {hoveredElement === 'state-vector' && (
          <Line
            points={[
              new THREE.Vector3(0, 0, 0),
              new THREE.Vector3(...targetPosition),
            ]}
            color={HIGHLIGHT_COLORS['state-vector']}
            lineWidth={14}
            transparent
            opacity={0.3}
          />
        )}
      </animated.group>

      {/* State point (glowing orb) - with hover highlight */}
      <animated.mesh
        position={stateVec as unknown as THREE.Vector3}
        onPointerEnter={() => handleHover('state-vector')}
        onPointerLeave={() => handleHover(null)}
      >
        <sphereGeometry args={[hoveredElement === 'state-vector' ? 0.2 : 0.15, 32, 32]} />
        <meshStandardMaterial
          color={hoveredElement === 'state-vector' ? HIGHLIGHT_COLORS['state-vector'] : '#22d3ee'}
          emissive={hoveredElement === 'state-vector' ? HIGHLIGHT_COLORS['state-vector'] : '#22d3ee'}
          emissiveIntensity={hoveredElement === 'state-vector' ? 3 : 2}
        />
      </animated.mesh>

      {/* State point outer glow */}
      <animated.mesh
        position={stateVec as unknown as THREE.Vector3}
        onPointerEnter={() => handleHover('state-vector')}
        onPointerLeave={() => handleHover(null)}
      >
        <sphereGeometry args={[hoveredElement === 'state-vector' ? 0.4 : 0.3, 32, 32]} />
        <meshBasicMaterial
          color={hoveredElement === 'state-vector' ? HIGHLIGHT_COLORS['state-vector'] : '#22d3ee'}
          transparent
          opacity={hoveredElement === 'state-vector' ? 0.5 : 0.3}
        />
      </animated.mesh>

      {/* Point light at state position */}
      <animated.pointLight
        position={stateVec as unknown as THREE.Vector3}
        color={hoveredElement === 'state-vector' ? HIGHLIGHT_COLORS['state-vector'] : '#22d3ee'}
        intensity={hoveredElement === 'state-vector' ? 4 : 2}
        distance={3}
        decay={2}
      />

      {/* Minimal axis labels - just |0⟩ and |1⟩ */}
      {showLabels && (
        <>
          <Html position={[0, axisLength + 0.25, 0]} center style={{ zIndex: 100, pointerEvents: 'none' }}>
            <div className={`font-mono text-sm font-bold px-2 py-0.5 rounded bg-slate-900/90 border transition-all ${
              hoveredElement === 'z-axis' ? 'text-green-300 border-green-400/50 scale-110' : 'text-green-400 border-green-500/30'
            }`}>
              |0⟩
            </div>
          </Html>
          <Html position={[0, -axisLength - 0.25, 0]} center style={{ zIndex: 100, pointerEvents: 'none' }}>
            <div className={`font-mono text-sm font-bold px-2 py-0.5 rounded bg-slate-900/90 border transition-all ${
              hoveredElement === 'z-axis' ? 'text-green-300 border-green-400/50 scale-110' : 'text-green-400 border-green-500/30'
            }`}>
              |1⟩
            </div>
          </Html>

          {/* Qubit label */}
          {state.label && (
            <Html position={[0, axisLength + 0.7, 0]} center style={{ zIndex: 101, pointerEvents: 'none' }}>
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
