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
  entanglementPartner?: number
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
}: BlochSphere3DProps) {
  const sphereRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const arrowRef = useRef<THREE.Group>(null)

  // Animated state vector position
  const targetPosition = useMemo(() => sphericalToCartesian(state.theta, state.phi, radius * 0.95), [state.theta, state.phi, radius])

  const { stateVec } = useSpring({
    stateVec: targetPosition,
    config: { mass: 1, tension: 120, friction: 14 },
  })

  // Pulse animation for entangled qubits
  useFrame((_, delta) => {
    if (glowRef.current && isEntangled) {
      glowRef.current.scale.x = 1 + Math.sin(Date.now() * 0.003) * 0.05
      glowRef.current.scale.y = 1 + Math.sin(Date.now() * 0.003) * 0.05
      glowRef.current.scale.z = 1 + Math.sin(Date.now() * 0.003) * 0.05
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

      {/* Axis labels */}
      {showLabels && (
        <>
          <Html position={[0, axisLength + 0.3, 0]} center>
            <div className="text-green-400 font-mono text-sm font-bold bg-slate-900/80 px-2 py-1 rounded">
              |0⟩
            </div>
          </Html>
          <Html position={[0, -axisLength - 0.3, 0]} center>
            <div className="text-green-400 font-mono text-sm font-bold bg-slate-900/80 px-2 py-1 rounded">
              |1⟩
            </div>
          </Html>
          <Html position={[axisLength + 0.3, 0, 0]} center>
            <div className="text-red-400 font-mono text-sm font-bold bg-slate-900/80 px-2 py-1 rounded">
              |+⟩
            </div>
          </Html>
          <Html position={[-axisLength - 0.3, 0, 0]} center>
            <div className="text-red-400 font-mono text-sm font-bold bg-slate-900/80 px-2 py-1 rounded">
              |-⟩
            </div>
          </Html>
          <Html position={[0, 0, axisLength + 0.3]} center>
            <div className="text-blue-400 font-mono text-sm font-bold bg-slate-900/80 px-2 py-1 rounded">
              |i⟩
            </div>
          </Html>
          <Html position={[0, 0, -axisLength - 0.3]} center>
            <div className="text-blue-400 font-mono text-sm font-bold bg-slate-900/80 px-2 py-1 rounded">
              |-i⟩
            </div>
          </Html>

          {/* Qubit label */}
          {state.label && (
            <Html position={[0, axisLength + 0.8, 0]} center>
              <div className="text-white font-bold text-lg bg-indigo-600/90 px-3 py-1 rounded-lg">
                {state.label}
              </div>
            </Html>
          )}
        </>
      )}
    </group>
  )
}
