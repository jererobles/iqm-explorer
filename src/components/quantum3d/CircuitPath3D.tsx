import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

interface GateOperation {
  gate: string
  qubit: number
  targetQubit?: number // For 2-qubit gates
  timestamp: number
}

interface CircuitPath3DProps {
  operations: GateOperation[]
  numQubits: number
  currentStep: number
  position?: [number, number, number]
}

// Gate visual representations
const GATE_VISUALS: Record<string, {
  color: string
  geometry: 'box' | 'sphere' | 'torus' | 'cylinder'
  label: string
}> = {
  H: { color: '#f59e0b', geometry: 'box', label: 'H' },
  X: { color: '#ef4444', geometry: 'sphere', label: 'X' },
  Y: { color: '#22c55e', geometry: 'sphere', label: 'Y' },
  Z: { color: '#3b82f6', geometry: 'sphere', label: 'Z' },
  S: { color: '#8b5cf6', geometry: 'torus', label: 'S' },
  T: { color: '#ec4899', geometry: 'torus', label: 'T' },
  CX: { color: '#f472b6', geometry: 'cylinder', label: 'CX' },
  CNOT: { color: '#f472b6', geometry: 'cylinder', label: 'CNOT' },
}

// Single gate 3D representation
function Gate3D({
  gate,
  position,
  isActive,
  isPast,
}: {
  gate: string
  position: [number, number, number]
  isActive: boolean
  isPast: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const visual = GATE_VISUALS[gate] || GATE_VISUALS.H

  // Animate active gate
  useFrame((state) => {
    if (meshRef.current && isActive) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 2
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.1)
    }
  })

  const opacity = isPast ? 0.3 : isActive ? 1 : 0.7
  const emissiveIntensity = isActive ? 0.5 : 0

  return (
    <group position={position}>
      {/* Gate geometry */}
      {visual.geometry === 'box' && (
        <RoundedBox ref={meshRef} args={[0.6, 0.6, 0.6]} radius={0.1}>
          <meshStandardMaterial
            color={visual.color}
            transparent
            opacity={opacity}
            emissive={visual.color}
            emissiveIntensity={emissiveIntensity}
          />
        </RoundedBox>
      )}

      {visual.geometry === 'sphere' && (
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial
            color={visual.color}
            transparent
            opacity={opacity}
            emissive={visual.color}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      )}

      {visual.geometry === 'torus' && (
        <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.12, 16, 32]} />
          <meshStandardMaterial
            color={visual.color}
            transparent
            opacity={opacity}
            emissive={visual.color}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      )}

      {visual.geometry === 'cylinder' && (
        <mesh ref={meshRef}>
          <cylinderGeometry args={[0.25, 0.25, 0.6, 32]} />
          <meshStandardMaterial
            color={visual.color}
            transparent
            opacity={opacity}
            emissive={visual.color}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      )}

      {/* Gate label */}
      <Html position={[0, 0.6, 0]} center>
        <div
          className={`font-mono text-xs font-bold px-2 py-1 rounded transition-all ${
            isActive
              ? 'bg-white text-slate-900 shadow-lg'
              : 'bg-slate-800/80 text-white'
          }`}
        >
          {visual.label}
        </div>
      </Html>

      {/* Active indicator ring */}
      {isActive && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.55, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
}

// Quantum state particle that travels through the circuit
function QuantumParticle({
  path,
  progress,
}: {
  path: THREE.Vector3[]
  progress: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Calculate position along path
  const position = useMemo(() => {
    if (path.length < 2) return new THREE.Vector3()
    const totalLength = path.length - 1
    const currentIndex = Math.min(Math.floor(progress * totalLength), totalLength - 1)
    const localProgress = (progress * totalLength) % 1

    const start = path[currentIndex]
    const end = path[Math.min(currentIndex + 1, path.length - 1)]

    return new THREE.Vector3().lerpVectors(start, end, localProgress)
  }, [path, progress])

  // Animate particle glow
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(0.15 + Math.sin(state.clock.elapsedTime * 6) * 0.03)
    }
  })

  return (
    <group position={position}>
      {/* Main particle */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>

      {/* Glow */}
      <mesh>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.3} />
      </mesh>

      {/* Point light */}
      <pointLight color="#06b6d4" intensity={2} distance={3} />
    </group>
  )
}

// Wire connecting qubit positions through time
function QubitWire({
  numSteps,
  startX,
  spacing,
  yPosition,
}: {
  numSteps: number
  startX: number
  spacing: number
  yPosition: number
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= numSteps + 1; i++) {
      pts.push(new THREE.Vector3(startX + i * spacing, yPosition, 0))
    }
    return pts
  }, [numSteps, startX, spacing, yPosition])

  return (
    <Line
      points={points}
      color="#6366f1"
      lineWidth={2}
      transparent
      opacity={0.4}
      dashed
      dashSize={0.2}
      gapSize={0.1}
    />
  )
}

export default function CircuitPath3D({
  operations,
  numQubits,
  currentStep,
  position = [0, 0, 0],
}: CircuitPath3DProps) {
  const spacing = 2 // Space between gates
  const qubitSpacing = 1.5 // Vertical space between qubit wires
  const startX = -((operations.length - 1) * spacing) / 2

  // Calculate qubit Y positions
  const qubitYPositions = useMemo(() => {
    return Array.from({ length: numQubits }, (_, i) => {
      return ((numQubits - 1) / 2 - i) * qubitSpacing
    })
  }, [numQubits, qubitSpacing])

  // Build path for quantum particle
  const particlePath = useMemo(() => {
    const path: THREE.Vector3[] = []

    // Start position
    path.push(new THREE.Vector3(startX - spacing, 0, 0))

    // Path through each operation
    operations.forEach((op, i) => {
      const x = startX + i * spacing
      const y = qubitYPositions[op.qubit]
      path.push(new THREE.Vector3(x, y, 0))
    })

    // End position
    if (operations.length > 0) {
      const lastOp = operations[operations.length - 1]
      path.push(new THREE.Vector3(
        startX + operations.length * spacing,
        qubitYPositions[lastOp.qubit],
        0
      ))
    }

    return path
  }, [operations, startX, spacing, qubitYPositions])

  // Calculate progress (0 to 1)
  const progress = operations.length > 0
    ? Math.min((currentStep + 1) / (operations.length + 1), 1)
    : 0

  return (
    <group position={position}>
      {/* Qubit wires */}
      {Array.from({ length: numQubits }, (_, i) => (
        <QubitWire
          key={i}
          numSteps={operations.length}
          startX={startX - spacing}
          spacing={spacing}
          yPosition={qubitYPositions[i]}
        />
      ))}

      {/* Qubit labels */}
      {Array.from({ length: numQubits }, (_, i) => (
        <Html
          key={`label-${i}`}
          position={[startX - spacing - 0.8, qubitYPositions[i], 0]}
          center
        >
          <div className="text-indigo-400 font-mono text-sm font-bold bg-slate-900/80 px-2 py-1 rounded">
            Q{i}
          </div>
        </Html>
      ))}

      {/* Gate objects */}
      {operations.map((op, i) => (
        <Gate3D
          key={`${op.gate}-${i}`}
          gate={op.gate}
          position={[startX + i * spacing, qubitYPositions[op.qubit], 0]}
          isActive={i === currentStep}
          isPast={i < currentStep}
        />
      ))}

      {/* Quantum state particle */}
      {operations.length > 0 && (
        <QuantumParticle path={particlePath} progress={progress} />
      )}

      {/* Time axis indicator */}
      <Html position={[startX + operations.length * spacing / 2, -numQubits * qubitSpacing / 2 - 1, 0]} center>
        <div className="text-gray-500 text-xs">
          Time →
        </div>
      </Html>
    </group>
  )
}
