import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

interface EntanglementLinesProps {
  positions: [number, number, number][]
  entanglements: [number, number][]
}

// Particle that travels along the entanglement line
function EntanglementParticle({
  start,
  end,
  speed = 1,
  delay = 0,
}: {
  start: THREE.Vector3
  end: THREE.Vector3
  speed?: number
  delay?: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const progress = useRef(delay)

  useFrame((_, delta) => {
    if (!meshRef.current) return

    progress.current += delta * speed
    const t = (Math.sin(progress.current) + 1) / 2 // Oscillate between 0 and 1

    // Lerp position
    meshRef.current.position.lerpVectors(start, end, t)

    // Pulse scale
    const scale = 0.08 + Math.sin(progress.current * 3) * 0.03
    meshRef.current.scale.setScalar(scale)
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color="#ec4899" transparent opacity={0.8} />
    </mesh>
  )
}

// Single entanglement connection between two qubits
function EntanglementConnection({
  start,
  end,
  index,
}: {
  start: [number, number, number]
  end: [number, number, number]
  index: number
}) {
  const glowOpacity = useRef(0.3)

  // Calculate midpoint for curved line (arc upward)
  const startVec = useMemo(() => new THREE.Vector3(...start), [start])
  const endVec = useMemo(() => new THREE.Vector3(...end), [end])

  // Generate curve points
  const curvePoints = useMemo(() => {
    const midpoint = startVec.clone().add(endVec).multiplyScalar(0.5)
    midpoint.y += 1.5 // Arc upward
    const curve = new THREE.QuadraticBezierCurve3(startVec, midpoint, endVec)
    return curve.getPoints(50)
  }, [startVec, endVec])

  // Animate glow
  useFrame((state) => {
    glowOpacity.current = 0.3 + Math.sin(state.clock.elapsedTime * 2 + index) * 0.2
  })

  return (
    <group>
      {/* Main entanglement line */}
      <Line
        points={curvePoints}
        color="#ec4899"
        lineWidth={2}
        transparent
        opacity={0.8}
        dashed
        dashSize={0.2}
        gapSize={0.1}
      />

      {/* Glow line */}
      <Line
        points={curvePoints}
        color="#f472b6"
        lineWidth={6}
        transparent
        opacity={0.3}
      />

      {/* Traveling particles */}
      <EntanglementParticle start={startVec} end={endVec} speed={1.5} delay={0} />
      <EntanglementParticle start={endVec} end={startVec} speed={1.5} delay={Math.PI} />
      <EntanglementParticle start={startVec} end={endVec} speed={2} delay={Math.PI / 2} />
    </group>
  )
}

export default function EntanglementLines({ positions, entanglements }: EntanglementLinesProps) {
  return (
    <group>
      {entanglements.map(([a, b], index) => (
        <EntanglementConnection
          key={`${a}-${b}`}
          start={positions[a]}
          end={positions[b]}
          index={index}
        />
      ))}
    </group>
  )
}
