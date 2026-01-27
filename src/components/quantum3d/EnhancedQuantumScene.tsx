import { Suspense, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, PerspectiveCamera, Preload } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Zap, Box, GitBranch, BarChart3, Waves, Circle, Eye, EyeOff } from 'lucide-react'
import EnhancedBlochSphere from './EnhancedBlochSphere'
import { QubitState } from './EnhancedBlochSphere'
import EntanglementLines from './EntanglementLines'
import CircuitPath3D from './CircuitPath3D'
import ProbabilityLandscape from './ProbabilityLandscape'
import EnhancedAmplitudeWave from './EnhancedAmplitudeWave'
import AmplitudeRing from './AmplitudeRing'
import {
  QuantumParticleCloud,
  FloatingOrbs,
  Sparkles as SparkleEffect,
} from './effects/EnhancedParticles'
import {
  CosmicNebula,
  QuantumAurora,
  HolographicGrid,
  EnergyWaveRipple,
  QuantumVortex,
} from './effects/QuantumEffects'
import { QuantumPostProcessing, AdaptiveQuantumEffects } from './effects/PostProcessing'

type ViewMode = 'bloch' | 'circuit' | 'landscape' | 'wave' | 'ring'

// Gate definitions with their transformations
const GATES = {
  H: {
    name: 'Hadamard',
    color: '#f59e0b',
    description: 'Creates superposition',
    transform: (s: QubitState): QubitState => {
      if (s.theta < 0.1) return { ...s, theta: Math.PI / 2, phi: 0 }
      if (s.theta > Math.PI - 0.1) return { ...s, theta: Math.PI / 2, phi: Math.PI }
      return { ...s, theta: Math.PI / 2 - s.theta + Math.PI / 2 }
    },
  },
  X: {
    name: 'Pauli-X',
    color: '#ef4444',
    description: 'Bit flip (NOT gate)',
    transform: (s: QubitState): QubitState => ({
      ...s,
      theta: Math.PI - s.theta,
      phi: ((s.phi + Math.PI) % (2 * Math.PI)),
    }),
  },
  Y: {
    name: 'Pauli-Y',
    color: '#22c55e',
    description: 'Y-axis rotation',
    transform: (s: QubitState): QubitState => ({
      ...s,
      theta: Math.PI - s.theta,
      phi: ((-s.phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI),
    }),
  },
  Z: {
    name: 'Pauli-Z',
    color: '#3b82f6',
    description: 'Phase flip',
    transform: (s: QubitState): QubitState => ({
      ...s,
      phi: ((s.phi + Math.PI) % (2 * Math.PI)),
    }),
  },
  S: {
    name: 'S-Gate',
    color: '#8b5cf6',
    description: 'π/2 phase rotation',
    transform: (s: QubitState): QubitState => ({
      ...s,
      phi: ((s.phi + Math.PI / 2) % (2 * Math.PI)),
    }),
  },
  T: {
    name: 'T-Gate',
    color: '#ec4899',
    description: 'π/4 phase rotation',
    transform: (s: QubitState): QubitState => ({
      ...s,
      phi: ((s.phi + Math.PI / 4) % (2 * Math.PI)),
    }),
  },
}

// Preset states
const PRESETS: { name: string; state: QubitState; description: string }[] = [
  { name: '|0⟩', state: { theta: 0, phi: 0 }, description: 'Ground state' },
  { name: '|1⟩', state: { theta: Math.PI, phi: 0 }, description: 'Excited state' },
  { name: '|+⟩', state: { theta: Math.PI / 2, phi: 0 }, description: 'X+ superposition' },
  { name: '|-⟩', state: { theta: Math.PI / 2, phi: Math.PI }, description: 'X- superposition' },
  { name: '|i⟩', state: { theta: Math.PI / 2, phi: Math.PI / 2 }, description: 'Y+ superposition' },
  { name: '|-i⟩', state: { theta: Math.PI / 2, phi: 3 * Math.PI / 2 }, description: 'Y- superposition' },
]

interface GateOperation {
  gate: keyof typeof GATES
  qubit: number
  timestamp: number
}

interface CircuitStep {
  states: QubitState[]
  operation?: GateOperation
  entanglements: [number, number][]
}

// Calculate multi-qubit probabilities from individual qubit states
function calculateProbabilities(states: QubitState[]): { state: string; probability: number; phase: number }[] {
  const n = states.length
  const numStates = 1 << n
  const probs: { state: string; probability: number; phase: number }[] = []

  for (let i = 0; i < numStates; i++) {
    let probability = 1
    let phase = 0
    const binaryStr = i.toString(2).padStart(n, '0')

    for (let q = 0; q < n; q++) {
      const bit = parseInt(binaryStr[q])
      const alpha = Math.cos(states[q].theta / 2)
      const beta = Math.sin(states[q].theta / 2)

      if (bit === 0) {
        probability *= alpha * alpha
      } else {
        probability *= beta * beta
        phase += states[q].phi
      }
    }

    probs.push({
      state: binaryStr,
      probability,
      phase: phase % (2 * Math.PI),
    })
  }

  return probs.sort((a, b) => b.probability - a.probability)
}

// Cosmic background with nebula effects
function CosmicBackground({ viewMode }: { viewMode: ViewMode }) {
  return (
    <>
      {/* Stars */}
      <Stars
        radius={150}
        depth={80}
        count={4000}
        factor={5}
        fade
        speed={0.5}
      />

      {/* Nebula effect */}
      <CosmicNebula position={[0, 0, -50]} size={100} intensity={0.5} />

      {/* Aurora effect for certain views */}
      {(viewMode === 'wave' || viewMode === 'ring') && (
        <QuantumAurora position={[0, 10, -15]} width={40} height={12} />
      )}

      {/* Sparkles throughout the scene */}
      <SparkleEffect
        count={150}
        radius={15}
        height={12}
        color="#ffffff"
        speed={0.5}
      />

      {/* Floating orbs */}
      <FloatingOrbs
        count={15}
        radius={12}
        height={10}
        colors={['#8b5cf6', '#06b6d4', '#ec4899', '#22c55e']}
        speed={0.3}
      />
    </>
  )
}

// Bloch sphere scene content
function BlochSceneContent({
  qubitStates,
  entanglements,
  numQubits,
  showPedagogicGuides,
}: {
  qubitStates: QubitState[]
  entanglements: [number, number][]
  numQubits: number
  showPedagogicGuides: boolean
}) {
  const positions = useMemo(() => {
    if (numQubits <= 3) {
      const spacing = 4.5
      const startX = -((numQubits - 1) * spacing) / 2
      return qubitStates.map((_, i) => [startX + i * spacing, 0, 0] as [number, number, number])
    } else {
      const radius = numQubits * 0.9
      return qubitStates.map((_, i) => {
        const angle = (i / numQubits) * Math.PI * 2
        return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number]
      })
    }
  }, [numQubits, qubitStates])

  const hasEntanglement = entanglements.length > 0
  const hasSuperposition = qubitStates.some(
    (s) => s.theta > 0.1 && s.theta < Math.PI - 0.1
  )

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 5, 12]} fov={50} />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1.2} color="#8b5cf6" />
      <pointLight position={[-10, -5, -10]} intensity={0.6} color="#06b6d4" />
      <spotLight position={[0, 15, 0]} angle={0.3} penumbra={1} intensity={0.8} color="#ec4899" />

      {/* Cosmic background */}
      <CosmicBackground viewMode="bloch" />

      {/* Holographic grid */}
      <HolographicGrid position={[0, -3, 0]} size={25} divisions={25} />

      {/* Central vortex for entangled states */}
      {hasEntanglement && (
        <QuantumVortex
          position={[0, -2.5, 0]}
          innerRadius={0.3}
          outerRadius={2}
          depth={1}
          intensity={0.6}
        />
      )}

      {/* Bloch spheres */}
      {qubitStates.map((state, i) => (
        <EnhancedBlochSphere
          key={i}
          state={{ ...state, label: `Q${i}` }}
          position={positions[i]}
          radius={1.3}
          isEntangled={entanglements.some(([a, b]) => a === i || b === i)}
          showPedagogicGuides={showPedagogicGuides && i === 0}
        />
      ))}

      {/* Entanglement connections */}
      <EntanglementLines positions={positions} entanglements={entanglements} />

      {/* Ambient particle cloud */}
      <QuantumParticleCloud
        count={400}
        radius={10}
        height={8}
        colors={['#8b5cf6', '#06b6d4', '#ec4899']}
        speed={0.4}
        turbulence={0.3}
      />

      {/* Wave ripples at base */}
      {hasSuperposition && (
        <EnergyWaveRipple
          position={[0, -2.9, 0]}
          color="#8b5cf6"
          maxRadius={8}
          speed={0.5}
          count={4}
        />
      )}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={5}
        maxDistance={35}
        autoRotate={false}
        autoRotateSpeed={0.3}
      />

      {/* Post-processing */}
      <AdaptiveQuantumEffects
        quantumIntensity={hasSuperposition ? 0.8 : 0.5}
        isEntangled={hasEntanglement}
        isSuperposition={hasSuperposition}
      />
    </>
  )
}

// Circuit path scene content
function CircuitSceneContent({
  operations,
  numQubits,
  currentStep,
}: {
  operations: GateOperation[]
  numQubits: number
  currentStep: number
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 6, 14]} fov={50} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#6366f1" />
      <pointLight position={[-10, 5, -5]} intensity={0.6} color="#ec4899" />

      <CosmicBackground viewMode="circuit" />
      <HolographicGrid position={[0, -2, 0]} size={30} divisions={30} />

      <CircuitPath3D
        operations={operations.map((op) => ({
          gate: op.gate,
          qubit: op.qubit,
          timestamp: op.timestamp,
        }))}
        numQubits={numQubits}
        currentStep={currentStep}
        position={[0, 0, 0]}
      />

      <QuantumParticleCloud
        count={200}
        radius={8}
        height={6}
        colors={['#6366f1', '#a855f7']}
        speed={0.5}
      />

      <OrbitControls enablePan enableZoom enableRotate minDistance={5} maxDistance={40} />
      <QuantumPostProcessing bloomIntensity={1.2} chromaticAberration={0.001} />
    </>
  )
}

// Probability landscape scene content
function LandscapeSceneContent({
  probabilities,
}: {
  probabilities: { state: string; probability: number; phase: number }[]
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[8, 8, 8]} fov={50} />
      <ambientLight intensity={0.35} />
      <pointLight position={[10, 10, 10]} intensity={1.2} color="#6366f1" />
      <pointLight position={[-10, 5, -5]} intensity={0.7} color="#22c55e" />
      <directionalLight position={[0, 15, 0]} intensity={0.4} />

      <CosmicBackground viewMode="landscape" />
      <HolographicGrid position={[0, -0.1, 0]} size={20} divisions={20} />

      <ProbabilityLandscape
        probabilities={probabilities}
        position={[0, 0, 0]}
        maxHeight={5}
        barWidth={0.8}
        spacing={1.5}
        enhanced={true}
      />

      <QuantumParticleCloud
        count={300}
        radius={8}
        height={7}
        colors={['#8b5cf6', '#06b6d4', '#22c55e']}
        speed={0.6}
      />

      <OrbitControls enablePan enableZoom enableRotate minDistance={5} maxDistance={30} />
      <QuantumPostProcessing bloomIntensity={1.4} bloomThreshold={0.35} />
    </>
  )
}

// Enhanced amplitude wave scene
function WaveSceneContent({
  probabilities,
}: {
  probabilities: { state: string; probability: number; phase: number }[]
}) {
  const attractors = useMemo(() => {
    const n = probabilities.length
    const gridSize = Math.ceil(Math.sqrt(n))
    const cellSize = 8 / gridSize

    return probabilities
      .filter((p) => p.probability > 0.1)
      .map((prob) => {
        const idx = probabilities.indexOf(prob)
        return {
          position: [
            ((idx % gridSize) - gridSize / 2 + 0.5) * cellSize,
            prob.probability * 2 + 0.5,
            (Math.floor(idx / gridSize) - gridSize / 2 + 0.5) * cellSize,
          ] as [number, number, number],
          strength: prob.probability * 2,
          color: `hsl(${(prob.phase / (2 * Math.PI)) * 360}, 85%, 55%)`,
        }
      })
  }, [probabilities])

  return (
    <>
      <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={50} />
      <ambientLight intensity={0.25} />
      <pointLight position={[10, 12, 10]} intensity={1.8} color="#8b5cf6" />
      <pointLight position={[-10, 6, -8]} intensity={1} color="#06b6d4" />
      <spotLight
        position={[0, 18, 0]}
        angle={0.4}
        penumbra={1}
        intensity={1.2}
        color="#ec4899"
        castShadow
      />

      <CosmicBackground viewMode="wave" />

      <EnhancedAmplitudeWave
        probabilities={probabilities}
        position={[0, 0, 0]}
        size={9}
        resolution={80}
      />

      <QuantumParticleCloud
        count={400}
        radius={7}
        height={6}
        colors={['#06b6d4', '#8b5cf6', '#ec4899']}
        speed={0.7}
        turbulence={0.4}
        attractors={attractors}
      />

      <OrbitControls enablePan enableZoom enableRotate minDistance={6} maxDistance={25} />
      <QuantumPostProcessing
        bloomIntensity={1.8}
        bloomThreshold={0.3}
        chromaticAberration={0.003}
      />
    </>
  )
}

// Amplitude ring scene
function RingSceneContent({
  probabilities,
}: {
  probabilities: { state: string; probability: number; phase: number }[]
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 8, 10]} fov={50} />
      <ambientLight intensity={0.25} />
      <pointLight position={[6, 10, 6]} intensity={1.4} color="#8b5cf6" />
      <pointLight position={[-6, 6, -6]} intensity={0.9} color="#ec4899" />
      <spotLight
        position={[0, 14, 0]}
        angle={0.5}
        penumbra={1}
        intensity={1}
        color="#06b6d4"
      />

      <CosmicBackground viewMode="ring" />

      {/* Central vortex */}
      <QuantumVortex
        position={[0, -1, 0]}
        innerRadius={0.3}
        outerRadius={1.5}
        depth={0.8}
        intensity={0.8}
      />

      <AmplitudeRing
        probabilities={probabilities}
        position={[0, 0, 0]}
        radius={4}
        height={3.5}
      />

      <QuantumParticleCloud
        count={300}
        radius={6}
        height={5}
        colors={['#8b5cf6', '#ec4899', '#f59e0b']}
        speed={0.5}
        turbulence={0.5}
      />

      <OrbitControls enablePan enableZoom enableRotate minDistance={5} maxDistance={20} />
      <QuantumPostProcessing
        bloomIntensity={1.6}
        bloomThreshold={0.35}
        chromaticAberration={0.002}
      />
    </>
  )
}

// Loading fallback with animation
function Loader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" />
          <div className="absolute inset-2 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        </div>
        <p className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 font-medium">
          Loading Quantum Reality...
        </p>
      </div>
    </div>
  )
}

// View mode button component
function ViewModeButton({
  mode,
  currentMode,
  onClick,
  icon: Icon,
  label,
  gradient,
}: {
  mode: ViewMode
  currentMode: ViewMode
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  gradient?: string
}) {
  const isActive = mode === currentMode

  return (
    <motion.button
      onClick={onClick}
      className={`p-2.5 rounded-xl backdrop-blur-md flex items-center gap-2 transition-all border ${
        isActive
          ? gradient
            ? `bg-gradient-to-r ${gradient} text-white border-white/20 shadow-lg`
            : 'bg-indigo-500 text-white border-indigo-400/30 shadow-lg shadow-indigo-500/30'
          : 'bg-slate-800/70 text-gray-400 hover:text-white border-slate-700/50 hover:border-slate-600/50'
      }`}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  )
}

export default function EnhancedQuantumScene() {
  const [viewMode, setViewMode] = useState<ViewMode>('bloch')
  const [numQubits, setNumQubits] = useState(2)
  const [qubitStates, setQubitStates] = useState<QubitState[]>([
    { theta: 0, phi: 0 },
    { theta: 0, phi: 0 },
  ])
  const [entanglements, setEntanglements] = useState<[number, number][]>([])
  const [history, setHistory] = useState<CircuitStep[]>([
    { states: [{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }], entanglements: [] },
  ])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedQubit, setSelectedQubit] = useState(0)
  const [operations, setOperations] = useState<GateOperation[]>([])
  const [showPedagogicGuides, setShowPedagogicGuides] = useState(false)
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const probabilities = useMemo(() => calculateProbabilities(qubitStates), [qubitStates])

  const handleQubitCountChange = useCallback((count: number) => {
    setNumQubits(count)
    const newStates = Array(count)
      .fill(null)
      .map(() => ({ theta: 0, phi: 0 }))
    setQubitStates(newStates)
    setEntanglements([])
    setHistory([{ states: newStates, entanglements: [] }])
    setHistoryIndex(0)
    setOperations([])
    setSelectedQubit(0)
  }, [])

  const applyGate = useCallback(
    (gateName: keyof typeof GATES) => {
      const gate = GATES[gateName]
      const newStates = [...qubitStates]
      newStates[selectedQubit] = gate.transform(qubitStates[selectedQubit])

      newStates[selectedQubit].theta = Math.max(0, Math.min(Math.PI, newStates[selectedQubit].theta))
      newStates[selectedQubit].phi =
        ((newStates[selectedQubit].phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

      setQubitStates(newStates)

      const newOperation: GateOperation = { gate: gateName, qubit: selectedQubit, timestamp: Date.now() }
      setOperations([...operations, newOperation])

      const newStep: CircuitStep = {
        states: newStates,
        operation: newOperation,
        entanglements: [...entanglements],
      }
      const newHistory = [...history.slice(0, historyIndex + 1), newStep]
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    },
    [qubitStates, selectedQubit, entanglements, history, historyIndex, operations]
  )

  const applyCNOT = useCallback(
    (control: number, target: number) => {
      const newStates = [...qubitStates]
      const controlState = qubitStates[control]

      if (Math.abs(controlState.theta - Math.PI / 2) < 0.1) {
        newStates[target] = { theta: Math.PI / 2, phi: 0 }
        const newEntanglements: [number, number][] = [...entanglements]
        if (!entanglements.some(([a, b]) => (a === control && b === target) || (a === target && b === control))) {
          newEntanglements.push([control, target])
        }
        setEntanglements(newEntanglements)
        setQubitStates(newStates)

        const newStep: CircuitStep = {
          states: newStates,
          operation: { gate: 'X', qubit: target, timestamp: Date.now() },
          entanglements: newEntanglements,
        }
        const newHistory = [...history.slice(0, historyIndex + 1), newStep]
        setHistory(newHistory)
        setHistoryIndex(newHistory.length - 1)
      } else if (controlState.theta > Math.PI / 2) {
        newStates[target] = GATES.X.transform(qubitStates[target])
        setQubitStates(newStates)

        const newStep: CircuitStep = {
          states: newStates,
          operation: { gate: 'X', qubit: target, timestamp: Date.now() },
          entanglements: [...entanglements],
        }
        const newHistory = [...history.slice(0, historyIndex + 1), newStep]
        setHistory(newHistory)
        setHistoryIndex(newHistory.length - 1)
      }
    },
    [qubitStates, entanglements, history, historyIndex]
  )

  const setPreset = useCallback(
    (preset: QubitState) => {
      const newStates = [...qubitStates]
      newStates[selectedQubit] = { ...preset }
      setQubitStates(newStates)

      const newStep: CircuitStep = {
        states: newStates,
        entanglements: [...entanglements],
      }
      const newHistory = [...history.slice(0, historyIndex + 1), newStep]
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    },
    [qubitStates, selectedQubit, entanglements, history, historyIndex]
  )

  const reset = useCallback(() => {
    const newStates = Array(numQubits)
      .fill(null)
      .map(() => ({ theta: 0, phi: 0 }))
    setQubitStates(newStates)
    setEntanglements([])
    setHistory([{ states: newStates, entanglements: [] }])
    setHistoryIndex(0)
    setIsPlaying(false)
    setOperations([])
  }, [numQubits])

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < history.length) {
        setHistoryIndex(index)
        setQubitStates(history[index].states)
        setEntanglements(history[index].entanglements)
      }
    },
    [history]
  )

  useEffect(() => {
    if (isPlaying && historyIndex < history.length - 1) {
      playIntervalRef.current = setInterval(() => {
        setHistoryIndex((prev) => {
          const next = prev + 1
          if (next >= history.length) {
            setIsPlaying(false)
            return prev
          }
          setQubitStates(history[next].states)
          setEntanglements(history[next].entanglements)
          return next
        })
      }, 800)
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [isPlaying, history, historyIndex])

  const currentState = qubitStates[selectedQubit]
  const alpha = Math.cos(currentState.theta / 2)
  const beta = Math.sin(currentState.theta / 2)
  const prob0 = alpha * alpha
  const prob1 = beta * beta

  return (
    <div className="space-y-6">
      {/* 3D Canvas */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/10">
        <div className="relative h-[550px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
          <Suspense fallback={<Loader />}>
            <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
              <color attach="background" args={['#030712']} />

              <AnimatePresence mode="wait">
                {viewMode === 'bloch' && (
                  <BlochSceneContent
                    qubitStates={qubitStates}
                    entanglements={entanglements}
                    numQubits={numQubits}
                    showPedagogicGuides={showPedagogicGuides}
                  />
                )}
                {viewMode === 'circuit' && (
                  <CircuitSceneContent
                    operations={operations}
                    numQubits={numQubits}
                    currentStep={historyIndex - 1}
                  />
                )}
                {viewMode === 'landscape' && <LandscapeSceneContent probabilities={probabilities} />}
                {viewMode === 'wave' && <WaveSceneContent probabilities={probabilities} />}
                {viewMode === 'ring' && <RingSceneContent probabilities={probabilities} />}
              </AnimatePresence>

              <Preload all />
            </Canvas>
          </Suspense>

          {/* View mode selector */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <ViewModeButton
              mode="bloch"
              currentMode={viewMode}
              onClick={() => setViewMode('bloch')}
              icon={Box}
              label="Bloch"
            />
            <ViewModeButton
              mode="circuit"
              currentMode={viewMode}
              onClick={() => setViewMode('circuit')}
              icon={GitBranch}
              label="Circuit"
            />
            <ViewModeButton
              mode="landscape"
              currentMode={viewMode}
              onClick={() => setViewMode('landscape')}
              icon={BarChart3}
              label="Towers"
            />
            <ViewModeButton
              mode="wave"
              currentMode={viewMode}
              onClick={() => setViewMode('wave')}
              icon={Waves}
              label="Wave"
              gradient="from-purple-500 to-cyan-500"
            />
            <ViewModeButton
              mode="ring"
              currentMode={viewMode}
              onClick={() => setViewMode('ring')}
              icon={Circle}
              label="Ring"
              gradient="from-pink-500 to-purple-500"
            />

            <select
              value={numQubits}
              onChange={(e) => handleQubitCountChange(parseInt(e.target.value))}
              className="px-3 py-2.5 rounded-xl bg-slate-800/70 text-white border border-slate-700/50 backdrop-blur-md ml-2 text-sm font-medium"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} Qubit{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>

            {/* Pedagogic guide toggle */}
            <motion.button
              onClick={() => setShowPedagogicGuides(!showPedagogicGuides)}
              className={`p-2.5 rounded-xl backdrop-blur-md border transition-all ${
                showPedagogicGuides
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-slate-800/70 text-gray-400 border-slate-700/50'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Toggle pedagogic guides"
            >
              {showPedagogicGuides ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </motion.button>
          </div>

          {/* Selected qubit indicator */}
          <div className="absolute top-4 right-4 flex gap-2">
            {Array.from({ length: numQubits }, (_, i) => (
              <motion.button
                key={i}
                onClick={() => setSelectedQubit(i)}
                className={`w-11 h-11 rounded-xl font-bold transition-all border ${
                  selectedQubit === i
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-400/50 shadow-lg shadow-indigo-500/30'
                    : 'bg-slate-800/70 text-gray-400 hover:text-white border-slate-700/50'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Q{i}
              </motion.button>
            ))}
          </div>

          {/* View mode description */}
          <div className="absolute bottom-4 left-4 right-4">
            <motion.div
              className="bg-slate-900/80 backdrop-blur-md rounded-xl px-4 py-3 text-sm text-gray-300 border border-slate-800/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={viewMode}
            >
              {viewMode === 'bloch' &&
                'Bloch Sphere: Each sphere represents a qubit state in 3D. The arrow points to the current quantum state. Entangled qubits pulse with energy connections.'}
              {viewMode === 'circuit' &&
                'Circuit View: Watch your quantum operations flow through the circuit. Gates transform qubits as they pass through.'}
              {viewMode === 'landscape' &&
                'Probability Towers: Glowing towers show measurement probabilities. Height = probability, color = quantum phase.'}
              {viewMode === 'wave' &&
                'Amplitude Wave: A dynamic fluid surface where height represents probability amplitude. Ripples show quantum interference, color encodes phase.'}
              {viewMode === 'ring' &&
                'Amplitude Ring: Circular visualization with pillars arranged radially. Watch interference patterns and energy particles orbit the quantum states.'}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Timeline Scrubber */}
      {history.length > 1 && (
        <motion.div
          className="glass-card rounded-2xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <motion.button
                onClick={() => goToStep(0)}
                className="p-2.5 rounded-xl bg-slate-700/50 text-white hover:bg-slate-600/50 border border-slate-600/30"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <SkipBack className="w-4 h-4" />
              </motion.button>
              <motion.button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2.5 rounded-xl text-white ${
                  isPlaying
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </motion.button>
              <motion.button
                onClick={() => goToStep(history.length - 1)}
                className="p-2.5 rounded-xl bg-slate-700/50 text-white hover:bg-slate-600/50 border border-slate-600/30"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <SkipForward className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="flex-1 relative">
              <input
                type="range"
                min={0}
                max={history.length - 1}
                value={historyIndex}
                onChange={(e) => goToStep(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-indigo-500 [&::-webkit-slider-thumb]:to-purple-500
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-indigo-500/50"
              />
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                {history.map((step, i) => (
                  <span key={i} className={i === historyIndex ? 'text-indigo-400 font-bold' : ''}>
                    {step.operation ? step.operation.gate : 'Init'}
                  </span>
                ))}
              </div>
            </div>

            <span className="text-gray-400 text-sm whitespace-nowrap font-mono">
              Step {historyIndex + 1} / {history.length}
            </span>
          </div>
        </motion.div>
      )}

      {/* Controls Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Gate Controls */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Quantum Gates</h3>
            <motion.button
              onClick={reset}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-700/50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </motion.button>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Apply to <span className="text-indigo-400 font-semibold">Q{selectedQubit}</span>
          </p>

          <div className="grid grid-cols-3 gap-2">
            {Object.entries(GATES).map(([name, gate]) => (
              <motion.button
                key={name}
                onClick={() => applyGate(name as keyof typeof GATES)}
                className="p-3.5 rounded-xl font-bold text-white text-lg shadow-lg transition-shadow hover:shadow-xl"
                style={{
                  backgroundColor: gate.color,
                  boxShadow: `0 4px 20px ${gate.color}40`,
                }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                title={gate.description}
              >
                {name}
              </motion.button>
            ))}
          </div>

          {numQubits > 1 && (
            <div className="mt-5 pt-5 border-t border-slate-700/50">
              <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-pink-400" />
                Entangling Gates
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: numQubits }, (_, i) => i).map((target) =>
                  target !== selectedQubit ? (
                    <motion.button
                      key={target}
                      onClick={() => applyCNOT(selectedQubit, target)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-semibold shadow-lg shadow-pink-500/20"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Zap className="w-3 h-3 inline mr-1.5" />
                      CNOT → Q{target}
                    </motion.button>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preset States */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Preset States</h3>
          <p className="text-sm text-gray-400 mb-4">
            Set <span className="text-indigo-400 font-semibold">Q{selectedQubit}</span> to a known state
          </p>

          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((preset) => (
              <motion.button
                key={preset.name}
                onClick={() => setPreset(preset.state)}
                className="p-3.5 rounded-xl bg-slate-700/50 text-white font-mono font-bold hover:bg-slate-600/50 transition-colors border border-slate-600/30"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={preset.description}
              >
                {preset.name}
              </motion.button>
            ))}
          </div>
        </div>

        {/* State Information */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Q{selectedQubit} State</h3>

          <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/30">
            <p className="text-gray-400 text-sm mb-2">State Vector</p>
            <p className="text-xl font-mono text-white">
              |ψ⟩ = <span className="text-cyan-400">{alpha.toFixed(3)}</span>|0⟩ +{' '}
              <span className="text-purple-400">{beta.toFixed(3)}</span>|1⟩
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-400">P(|0⟩)</span>
                <span className="text-cyan-400 font-mono font-bold">{(prob0 * 100).toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  animate={{ width: `${prob0 * 100}%` }}
                  transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-400">P(|1⟩)</span>
                <span className="text-purple-400 font-mono font-bold">{(prob1 * 100).toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  animate={{ width: `${prob1 * 100}%` }}
                  transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
              <p className="text-gray-400 text-xs mb-1">θ (polar)</p>
              <p className="text-white font-mono font-bold">{((currentState.theta * 180) / Math.PI).toFixed(1)}°</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
              <p className="text-gray-400 text-xs mb-1">φ (azimuthal)</p>
              <p className="text-white font-mono font-bold">{((currentState.phi * 180) / Math.PI).toFixed(1)}°</p>
            </div>
          </div>

          {entanglements.some(([a, b]) => a === selectedQubit || b === selectedQubit) && (
            <motion.div
              className="mt-4 p-3 rounded-xl bg-pink-500/10 border border-pink-500/30"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p className="text-pink-400 text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 animate-pulse" />
                Entangled with Q
                {entanglements
                  .filter(([a, b]) => a === selectedQubit || b === selectedQubit)
                  .map(([a, b]) => (a === selectedQubit ? b : a))
                  .join(', Q')}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
