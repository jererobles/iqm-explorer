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
  entanglementPartner?: number
  showTooltips?: boolean
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

// Get state description for educational tooltips
function getStateDescription(theta: number, phi: number): { state: string; description: string; probability: string } {
  // Determine the closest named state
  const tolerance = 0.1

  if (theta < tolerance) {
    return {
      state: '|0⟩',
      description: 'Ground state - the qubit is definitely in state 0',
      probability: '100% chance of measuring 0'
    }
  }
  if (Math.abs(theta - Math.PI) < tolerance) {
    return {
      state: '|1⟩',
      description: 'Excited state - the qubit is definitely in state 1',
      probability: '100% chance of measuring 1'
    }
  }
  if (Math.abs(theta - Math.PI / 2) < tolerance) {
    if (Math.abs(phi) < tolerance || Math.abs(phi - 2 * Math.PI) < tolerance) {
      return {
        state: '|+⟩',
        description: 'Plus state - equal superposition with positive phase',
        probability: '50% chance of 0, 50% chance of 1'
      }
    }
    if (Math.abs(phi - Math.PI) < tolerance) {
      return {
        state: '|-⟩',
        description: 'Minus state - equal superposition with negative phase',
        probability: '50% chance of 0, 50% chance of 1'
      }
    }
    if (Math.abs(phi - Math.PI / 2) < tolerance) {
      return {
        state: '|i⟩',
        description: 'Plus-i state - superposition with imaginary phase',
        probability: '50% chance of 0, 50% chance of 1'
      }
    }
    if (Math.abs(phi - 3 * Math.PI / 2) < tolerance) {
      return {
        state: '|-i⟩',
        description: 'Minus-i state - superposition with negative imaginary phase',
        probability: '50% chance of 0, 50% chance of 1'
      }
    }
  }

  // General superposition
  const prob0 = Math.cos(theta / 2) ** 2
  const prob1 = Math.sin(theta / 2) ** 2
  return {
    state: 'ψ',
    description: 'Superposition state',
    probability: `${(prob0 * 100).toFixed(1)}% |0⟩, ${(prob1 * 100).toFixed(1)}% |1⟩`
  }
}

export default function BlochSphere3D({
  state,
  position = [0, 0, 0],
  radius = 1.5,
  showLabels = true,
  glowColor = '#6366f1',
  isEntangled = false,
  showTooltips = true,
}: BlochSphere3DProps) {
  const sphereRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const arrowRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  // Animated state vector position
  const targetPosition = useMemo(() => sphericalToCartesian(state.theta, state.phi, radius * 0.95), [state.theta, state.phi, radius])

  const { stateVec } = useSpring({
    stateVec: targetPosition,
    config: { mass: 1, tension: 120, friction: 14 },
  })

  // State info for tooltips
  const stateInfo = useMemo(() => getStateDescription(state.theta, state.phi), [state.theta, state.phi])

  // Dynamic animations
  useFrame((clock, delta) => {
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

    if (arrowRef.current) {
      // Subtle rotation for the state indicator
      arrowRef.current.rotation.z += delta * 0.1
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
      <Sphere ref={glowRef} args={[radius * 1.1, 32, 32]}>
        <meshBasicMaterial
          color={isEntangled ? '#ec4899' : glowColor}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Main sphere - translucent */}
      <Sphere ref={sphereRef} args={[radius, 64, 64]}>
        <meshPhysicalMaterial
          color="#1e1b4b"
          transparent
          opacity={0.3}
          roughness={0.2}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          side={THREE.DoubleSide}
        />
      </Sphere>

      {/* Wireframe overlay */}
      <Sphere args={[radius * 1.001, 16, 16]}>
        <meshBasicMaterial
          color={glowColor}
          wireframe
          transparent
          opacity={0.15}
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

      {/* X-axis (|+⟩ to |-⟩) */}
      <Line
        points={[
          new THREE.Vector3(-axisLength, 0, 0),
          new THREE.Vector3(axisLength, 0, 0),
        ]}
        color="#ef4444"
        lineWidth={2}
      />

      {/* Y-axis */}
      <Line
        points={[
          new THREE.Vector3(0, 0, -axisLength),
          new THREE.Vector3(0, 0, axisLength),
        ]}
        color="#3b82f6"
        lineWidth={2}
      />

      {/* State vector line */}
      <animated.group>
        <Line
          points={[
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(...targetPosition),
          ]}
          color="#06b6d4"
          lineWidth={4}
        />
      </animated.group>

      {/* State point (glowing orb) */}
      <animated.mesh position={stateVec as unknown as THREE.Vector3}>
        <sphereGeometry args={[0.12, 32, 32]} />
        <meshBasicMaterial color="#06b6d4" />
      </animated.mesh>

      {/* State point glow */}
      <animated.mesh position={stateVec as unknown as THREE.Vector3}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.4} />
      </animated.mesh>

      {/* Axis labels with hover tooltips */}
      {showLabels && (
        <>
          <Html position={[0, axisLength + 0.3, 0]} center>
            <div
              className={`font-mono text-sm font-bold px-2 py-1 rounded cursor-pointer transition-all ${
                hovered === '0' ? 'bg-green-500/90 text-white scale-110' : 'bg-slate-900/80 text-green-400'
              }`}
              onMouseEnter={() => setHovered('0')}
              onMouseLeave={() => setHovered(null)}
            >
              |0⟩
            </div>
            {showTooltips && hovered === '0' && (
              <div className="absolute top-full mt-2 bg-slate-800 border border-green-500/30 rounded-lg p-2 w-48 text-xs z-50">
                <p className="text-green-400 font-bold">Ground State |0⟩</p>
                <p className="text-gray-300 mt-1">The qubit's "off" state. 100% probability of measuring 0.</p>
              </div>
            )}
          </Html>
          <Html position={[0, -axisLength - 0.3, 0]} center>
            <div
              className={`font-mono text-sm font-bold px-2 py-1 rounded cursor-pointer transition-all ${
                hovered === '1' ? 'bg-green-500/90 text-white scale-110' : 'bg-slate-900/80 text-green-400'
              }`}
              onMouseEnter={() => setHovered('1')}
              onMouseLeave={() => setHovered(null)}
            >
              |1⟩
            </div>
            {showTooltips && hovered === '1' && (
              <div className="absolute bottom-full mb-2 bg-slate-800 border border-green-500/30 rounded-lg p-2 w-48 text-xs z-50">
                <p className="text-green-400 font-bold">Excited State |1⟩</p>
                <p className="text-gray-300 mt-1">The qubit's "on" state. 100% probability of measuring 1.</p>
              </div>
            )}
          </Html>
          <Html position={[axisLength + 0.3, 0, 0]} center>
            <div
              className={`font-mono text-sm font-bold px-2 py-1 rounded cursor-pointer transition-all ${
                hovered === '+' ? 'bg-red-500/90 text-white scale-110' : 'bg-slate-900/80 text-red-400'
              }`}
              onMouseEnter={() => setHovered('+')}
              onMouseLeave={() => setHovered(null)}
            >
              |+⟩
            </div>
            {showTooltips && hovered === '+' && (
              <div className="absolute left-full ml-2 bg-slate-800 border border-red-500/30 rounded-lg p-2 w-48 text-xs z-50">
                <p className="text-red-400 font-bold">Plus State |+⟩</p>
                <p className="text-gray-300 mt-1">Equal superposition (|0⟩+|1⟩)/√2. Created by H gate on |0⟩.</p>
              </div>
            )}
          </Html>
          <Html position={[-axisLength - 0.3, 0, 0]} center>
            <div
              className={`font-mono text-sm font-bold px-2 py-1 rounded cursor-pointer transition-all ${
                hovered === '-' ? 'bg-red-500/90 text-white scale-110' : 'bg-slate-900/80 text-red-400'
              }`}
              onMouseEnter={() => setHovered('-')}
              onMouseLeave={() => setHovered(null)}
            >
              |-⟩
            </div>
            {showTooltips && hovered === '-' && (
              <div className="absolute right-full mr-2 bg-slate-800 border border-red-500/30 rounded-lg p-2 w-48 text-xs z-50">
                <p className="text-red-400 font-bold">Minus State |-⟩</p>
                <p className="text-gray-300 mt-1">Superposition (|0⟩-|1⟩)/√2. H gate on |1⟩ gives this state.</p>
              </div>
            )}
          </Html>
          <Html position={[0, 0, axisLength + 0.3]} center>
            <div
              className={`font-mono text-sm font-bold px-2 py-1 rounded cursor-pointer transition-all ${
                hovered === 'i' ? 'bg-blue-500/90 text-white scale-110' : 'bg-slate-900/80 text-blue-400'
              }`}
              onMouseEnter={() => setHovered('i')}
              onMouseLeave={() => setHovered(null)}
            >
              |i⟩
            </div>
            {showTooltips && hovered === 'i' && (
              <div className="absolute left-full ml-2 bg-slate-800 border border-blue-500/30 rounded-lg p-2 w-48 text-xs z-50">
                <p className="text-blue-400 font-bold">Plus-i State</p>
                <p className="text-gray-300 mt-1">Superposition with imaginary phase. H then S gate creates this.</p>
              </div>
            )}
          </Html>
          <Html position={[0, 0, -axisLength - 0.3]} center>
            <div
              className={`font-mono text-sm font-bold px-2 py-1 rounded cursor-pointer transition-all ${
                hovered === '-i' ? 'bg-blue-500/90 text-white scale-110' : 'bg-slate-900/80 text-blue-400'
              }`}
              onMouseEnter={() => setHovered('-i')}
              onMouseLeave={() => setHovered(null)}
            >
              |-i⟩
            </div>
            {showTooltips && hovered === '-i' && (
              <div className="absolute right-full mr-2 bg-slate-800 border border-blue-500/30 rounded-lg p-2 w-48 text-xs z-50">
                <p className="text-blue-400 font-bold">Minus-i State</p>
                <p className="text-gray-300 mt-1">Superposition with negative imaginary phase.</p>
              </div>
            )}
          </Html>

          {/* Qubit label */}
          {state.label && (
            <Html position={[0, axisLength + 0.9, 0]} center>
              <div
                className={`font-bold text-lg px-3 py-1 rounded-lg cursor-pointer transition-all ${
                  isEntangled ? 'bg-pink-500/90 animate-pulse' : 'bg-indigo-600/90'
                } text-white`}
                onMouseEnter={() => setHovered('label')}
                onMouseLeave={() => setHovered(null)}
              >
                {state.label}
                {isEntangled && <span className="ml-1">⚡</span>}
              </div>
              {showTooltips && hovered === 'label' && (
                <div className="absolute top-full mt-2 bg-slate-800 border border-indigo-500/30 rounded-lg p-3 w-56 text-xs z-50">
                  <p className="text-cyan-400 font-bold mb-1">Current State: {stateInfo.state}</p>
                  <p className="text-gray-300">{stateInfo.description}</p>
                  <p className="text-indigo-400 mt-1 font-medium">{stateInfo.probability}</p>
                  {isEntangled && (
                    <p className="text-pink-400 mt-2 font-bold">⚡ ENTANGLED - Correlated with partner qubit!</p>
                  )}
                </div>
              )}
            </Html>
          )}
        </>
      )}

      {/* State vector endpoint with tooltip */}
      <Html position={targetPosition} center>
        <div
          className="w-4 h-4 cursor-pointer"
          onMouseEnter={() => setHovered('state')}
          onMouseLeave={() => setHovered(null)}
        />
        {showTooltips && hovered === 'state' && (
          <div className="absolute left-full ml-4 bg-slate-800 border border-cyan-500/30 rounded-lg p-3 w-56 text-xs z-50 pointer-events-none">
            <p className="text-cyan-400 font-bold mb-1">State Vector: {stateInfo.state}</p>
            <p className="text-gray-300">{stateInfo.description}</p>
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-gray-400">θ = {(state.theta * 180 / Math.PI).toFixed(1)}°</p>
              <p className="text-gray-400">φ = {(state.phi * 180 / Math.PI).toFixed(1)}°</p>
            </div>
            <p className="text-indigo-400 mt-2 font-medium">{stateInfo.probability}</p>
          </div>
        )}
      </Html>
    </group>
  )
}
