import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

interface EntanglementLinesProps {
  positions: [number, number, number][]
  entanglements: [number, number][]
}

// Energy particle flowing along the connection
function EnergyParticle({
  curve,
  speed,
  offset,
  color,
  size = 0.08,
}: {
  curve: THREE.CatmullRomCurve3
  speed: number
  offset: number
  color: string
  size?: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const progress = useRef(offset)

  useFrame((_, delta) => {
    if (!meshRef.current) return

    progress.current = (progress.current + delta * speed) % 1

    // Get position along curve
    const point = curve.getPoint(progress.current)
    meshRef.current.position.copy(point)
    if (glowRef.current) glowRef.current.position.copy(point)

    // Pulse scale
    const pulse = 1 + Math.sin(progress.current * Math.PI * 4) * 0.3
    meshRef.current.scale.setScalar(size * pulse)
    if (glowRef.current) glowRef.current.scale.setScalar(size * 2.5 * pulse)
  })

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
    </>
  )
}

// Helix strand wrapping around the connection
function HelixStrand({
  curve,
  turns,
  radius,
  offset,
  color,
  opacity = 0.6,
}: {
  curve: THREE.CatmullRomCurve3
  turns: number
  radius: number
  offset: number
  color: string
  opacity?: number
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const segments = 100

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const point = curve.getPoint(t)

      // Get curve tangent and create perpendicular vectors
      const tangent = curve.getTangent(t)
      const up = new THREE.Vector3(0, 1, 0)
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize()
      const perpUp = new THREE.Vector3().crossVectors(right, tangent).normalize()

      // Spiral around the curve
      const angle = t * Math.PI * 2 * turns + offset
      const helixOffset = right.clone().multiplyScalar(Math.cos(angle) * radius)
        .add(perpUp.clone().multiplyScalar(Math.sin(angle) * radius))

      pts.push(point.clone().add(helixOffset))
    }
    return pts
  }, [curve, turns, radius, offset])

  return (
    <Line
      points={points}
      color={color}
      transparent
      opacity={opacity}
      lineWidth={1.5}
    />
  )
}

// Glowing tube connecting the qubits
function EnergyTube({
  curve,
  radius,
  color,
}: {
  curve: THREE.CatmullRomCurve3
  radius: number
  color: string
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const pulseRef = useRef(0)

  useFrame((state) => {
    pulseRef.current = state.clock.elapsedTime
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.3 + Math.sin(pulseRef.current * 3) * 0.15
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.15 + Math.sin(pulseRef.current * 3) * 0.1
    }
  })

  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, radius, 8, false)
  }, [curve, radius])

  const glowGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, radius * 2.5, 8, false)
  }, [curve, radius])

  return (
    <>
      {/* Inner core */}
      <mesh ref={meshRef} geometry={tubeGeometry}>
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Outer glow */}
      <mesh ref={glowRef} geometry={glowGeometry}>
        <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

// Pulsing ring at connection points
function ConnectionRing({
  position,
  color,
}: {
  position: THREE.Vector3
  color: string
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const pulseRef = useRef(0)

  useFrame((state) => {
    if (!ringRef.current) return
    pulseRef.current = state.clock.elapsedTime

    // Pulsing scale
    const scale = 1 + Math.sin(pulseRef.current * 4) * 0.2
    ringRef.current.scale.setScalar(scale)

    // Rotate slowly
    ringRef.current.rotation.x = pulseRef.current * 0.5
    ringRef.current.rotation.y = pulseRef.current * 0.3
  })

  return (
    <mesh ref={ringRef} position={position}>
      <torusGeometry args={[0.3, 0.05, 8, 24]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
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
  const startVec = useMemo(() => new THREE.Vector3(...start), [start])
  const endVec = useMemo(() => new THREE.Vector3(...end), [end])

  // Create a smooth curve between the two points
  const curve = useMemo(() => {
    const distance = startVec.distanceTo(endVec)
    const midpoint = startVec.clone().add(endVec).multiplyScalar(0.5)

    // Calculate control points for a nice curved path
    const direction = endVec.clone().sub(startVec).normalize()
    const perpendicular = new THREE.Vector3(-direction.z, 0.5, direction.x).normalize()

    // Create gentle S-curve
    const ctrl1 = startVec.clone().lerp(midpoint, 0.3).add(perpendicular.clone().multiplyScalar(distance * 0.15))
    const ctrl2 = midpoint.clone().add(new THREE.Vector3(0, distance * 0.1, 0))
    const ctrl3 = endVec.clone().lerp(midpoint, 0.3).add(perpendicular.clone().multiplyScalar(-distance * 0.15))

    return new THREE.CatmullRomCurve3([startVec, ctrl1, ctrl2, ctrl3, endVec])
  }, [startVec, endVec])

  const particleColors = ['#f472b6', '#ec4899', '#db2777', '#be185d']

  return (
    <group>
      {/* Main energy tube */}
      <EnergyTube curve={curve} radius={0.04} color="#ec4899" />

      {/* Double helix strands */}
      <HelixStrand curve={curve} turns={4} radius={0.15} offset={0} color="#f472b6" opacity={0.5} />
      <HelixStrand curve={curve} turns={4} radius={0.15} offset={Math.PI} color="#a855f7" opacity={0.5} />

      {/* Flowing energy particles - multiple at different speeds and offsets */}
      {[0, 0.2, 0.4, 0.6, 0.8].map((offset, i) => (
        <EnergyParticle
          key={`forward-${i}`}
          curve={curve}
          speed={0.4 + i * 0.1}
          offset={offset}
          color={particleColors[i % particleColors.length]}
          size={0.06 + (i % 2) * 0.02}
        />
      ))}

      {/* Connection rings at endpoints */}
      <ConnectionRing position={startVec} color="#ec4899" />
      <ConnectionRing position={endVec} color="#a855f7" />

      {/* Central glow pulse */}
      <CentralPulse curve={curve} color="#f472b6" index={index} />
    </group>
  )
}

// Pulsing glow at the center of the connection
function CentralPulse({
  curve,
  color,
  index,
}: {
  curve: THREE.CatmullRomCurve3
  color: string
  index: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const center = useMemo(() => curve.getPoint(0.5), [curve])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime + index * Math.PI

    // Pulsing scale
    const scale = 0.1 + Math.sin(t * 2) * 0.05
    meshRef.current.scale.setScalar(scale)

    // Pulsing opacity
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.3 + Math.sin(t * 3) * 0.2
  })

  return (
    <mesh ref={meshRef} position={center}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} />
    </mesh>
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
