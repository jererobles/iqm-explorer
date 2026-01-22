import { Suspense, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei'
import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Zap, Box, GitBranch, BarChart3 } from 'lucide-react'
import BlochSphere3D, { QubitState } from './BlochSphere3D'
import EntanglementLines from './EntanglementLines'
import CircuitPath3D from './CircuitPath3D'
import ProbabilityLandscape from './ProbabilityLandscape'

type ViewMode = 'bloch' | 'circuit' | 'landscape'

// Gate definitions with their transformations
const GATES = {
  H: {
    name: 'Hadamard',
    color: '#f59e0b',
    transform: (s: QubitState): QubitState => {
      if (s.theta < 0.1) return { ...s, theta: Math.PI / 2, phi: 0 }
      if (s.theta > Math.PI - 0.1) return { ...s, theta: Math.PI / 2, phi: Math.PI }
      return { ...s, theta: Math.PI / 2 - s.theta + Math.PI / 2 }
    },
  },
  X: {
    name: 'Pauli-X',
    color: '#ef4444',
    transform: (s: QubitState): QubitState => ({
      ...s,
      theta: Math.PI - s.theta,
      phi: ((s.phi + Math.PI) % (2 * Math.PI)),
    }),
  },
  Y: {
    name: 'Pauli-Y',
    color: '#22c55e',
    transform: (s: QubitState): QubitState => ({
      ...s,
      theta: Math.PI - s.theta,
      phi: ((-s.phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI),
    }),
  },
  Z: {
    name: 'Pauli-Z',
    color: '#3b82f6',
    transform: (s: QubitState): QubitState => ({
      ...s,
      phi: ((s.phi + Math.PI) % (2 * Math.PI)),
    }),
  },
  S: {
    name: 'S-Gate',
    color: '#8b5cf6',
    transform: (s: QubitState): QubitState => ({
      ...s,
      phi: ((s.phi + Math.PI / 2) % (2 * Math.PI)),
    }),
  },
  T: {
    name: 'T-Gate',
    color: '#ec4899',
    transform: (s: QubitState): QubitState => ({
      ...s,
      phi: ((s.phi + Math.PI / 4) % (2 * Math.PI)),
    }),
  },
}

// Preset states
const PRESETS: { name: string; state: QubitState }[] = [
  { name: '|0⟩', state: { theta: 0, phi: 0 } },
  { name: '|1⟩', state: { theta: Math.PI, phi: 0 } },
  { name: '|+⟩', state: { theta: Math.PI / 2, phi: 0 } },
  { name: '|-⟩', state: { theta: Math.PI / 2, phi: Math.PI } },
  { name: '|i⟩', state: { theta: Math.PI / 2, phi: Math.PI / 2 } },
  { name: '|-i⟩', state: { theta: Math.PI / 2, phi: 3 * Math.PI / 2 } },
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

// Bloch sphere scene content
function BlochSceneContent({
  qubitStates,
  entanglements,
  numQubits
}: {
  qubitStates: QubitState[]
  entanglements: [number, number][]
  numQubits: number
}) {
  const positions = useMemo(() => {
    if (numQubits <= 3) {
      const spacing = 4
      const startX = -((numQubits - 1) * spacing) / 2
      return qubitStates.map((_, i) => [startX + i * spacing, 0, 0] as [number, number, number])
    } else {
      const radius = numQubits * 0.8
      return qubitStates.map((_, i) => {
        const angle = (i / numQubits) * Math.PI * 2
        return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number]
      })
    }
  }, [numQubits, qubitStates])

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 4, 10]} fov={50} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#6366f1" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
      <spotLight position={[0, 15, 0]} angle={0.3} penumbra={1} intensity={0.5} color="#06b6d4" />
      <Stars radius={100} depth={50} count={2000} factor={4} fade speed={1} />

      {qubitStates.map((state, i) => (
        <BlochSphere3D
          key={i}
          state={{ ...state, label: `Q${i}` }}
          position={positions[i]}
          radius={1.2}
          isEntangled={entanglements.some(([a, b]) => a === i || b === i)}
        />
      ))}

      <EntanglementLines positions={positions} entanglements={entanglements} />
      <OrbitControls enablePan enableZoom enableRotate minDistance={5} maxDistance={30} />
      <gridHelper args={[20, 20, '#6366f1', '#312e81']} position={[0, -3, 0]} />
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
      <PerspectiveCamera makeDefault position={[0, 5, 12]} fov={50} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#6366f1" />
      <pointLight position={[-10, 5, -5]} intensity={0.5} color="#ec4899" />
      <Stars radius={100} depth={50} count={1500} factor={4} fade speed={0.5} />

      <CircuitPath3D
        operations={operations.map(op => ({
          gate: op.gate,
          qubit: op.qubit,
          timestamp: op.timestamp,
        }))}
        numQubits={numQubits}
        currentStep={currentStep}
        position={[0, 0, 0]}
      />

      <OrbitControls enablePan enableZoom enableRotate minDistance={5} maxDistance={40} />
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
      <PerspectiveCamera makeDefault position={[6, 6, 6]} fov={50} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#6366f1" />
      <pointLight position={[-10, 5, -5]} intensity={0.5} color="#22c55e" />
      <directionalLight position={[0, 10, 0]} intensity={0.3} />
      <Stars radius={100} depth={50} count={1500} factor={4} fade speed={0.5} />

      <ProbabilityLandscape
        probabilities={probabilities}
        position={[0, 0, 0]}
        maxHeight={4}
        barWidth={0.7}
        spacing={1.4}
      />

      <OrbitControls enablePan enableZoom enableRotate minDistance={5} maxDistance={30} />
    </>
  )
}

// Loading fallback
function Loader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-indigo-400">Loading Quantum Reality...</p>
      </div>
    </div>
  )
}

export default function QuantumScene3D() {
  const [viewMode, setViewMode] = useState<ViewMode>('bloch')
  const [numQubits, setNumQubits] = useState(2)
  const [qubitStates, setQubitStates] = useState<QubitState[]>([
    { theta: 0, phi: 0 },
    { theta: 0, phi: 0 },
  ])
  const [entanglements, setEntanglements] = useState<[number, number][]>([])
  const [history, setHistory] = useState<CircuitStep[]>([{
    states: [{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }],
    entanglements: [],
  }])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedQubit, setSelectedQubit] = useState(0)
  const [operations, setOperations] = useState<GateOperation[]>([])
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Calculate probabilities for landscape view
  const probabilities = useMemo(() => calculateProbabilities(qubitStates), [qubitStates])

  // Update qubit count
  const handleQubitCountChange = useCallback((count: number) => {
    setNumQubits(count)
    const newStates = Array(count).fill(null).map(() => ({ theta: 0, phi: 0 }))
    setQubitStates(newStates)
    setEntanglements([])
    setHistory([{ states: newStates, entanglements: [] }])
    setHistoryIndex(0)
    setOperations([])
  }, [])

  // Apply a gate to selected qubit
  const applyGate = useCallback((gateName: keyof typeof GATES) => {
    const gate = GATES[gateName]
    const newStates = [...qubitStates]
    newStates[selectedQubit] = gate.transform(qubitStates[selectedQubit])

    newStates[selectedQubit].theta = Math.max(0, Math.min(Math.PI, newStates[selectedQubit].theta))
    newStates[selectedQubit].phi = ((newStates[selectedQubit].phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

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
  }, [qubitStates, selectedQubit, entanglements, history, historyIndex, operations])

  // Apply CNOT (creates entanglement)
  const applyCNOT = useCallback((control: number, target: number) => {
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
  }, [qubitStates, entanglements, history, historyIndex])

  // Set preset state
  const setPreset = useCallback((preset: QubitState) => {
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
  }, [qubitStates, selectedQubit, entanglements, history, historyIndex])

  // Reset all
  const reset = useCallback(() => {
    const newStates = Array(numQubits).fill(null).map(() => ({ theta: 0, phi: 0 }))
    setQubitStates(newStates)
    setEntanglements([])
    setHistory([{ states: newStates, entanglements: [] }])
    setHistoryIndex(0)
    setIsPlaying(false)
    setOperations([])
  }, [numQubits])

  // Timeline navigation
  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < history.length) {
      setHistoryIndex(index)
      setQubitStates(history[index].states)
      setEntanglements(history[index].entanglements)
    }
  }, [history])

  // Play/pause timeline
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
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="relative h-[500px] bg-slate-900">
          <Suspense fallback={<Loader />}>
            <Canvas>
              {viewMode === 'bloch' && (
                <BlochSceneContent
                  qubitStates={qubitStates}
                  entanglements={entanglements}
                  numQubits={numQubits}
                />
              )}
              {viewMode === 'circuit' && (
                <CircuitSceneContent
                  operations={operations}
                  numQubits={numQubits}
                  currentStep={historyIndex - 1}
                />
              )}
              {viewMode === 'landscape' && (
                <LandscapeSceneContent probabilities={probabilities} />
              )}
            </Canvas>
          </Suspense>

          {/* View mode selector */}
          <div className="absolute top-4 left-4 flex gap-2">
            <motion.button
              onClick={() => setViewMode('bloch')}
              className={`p-2 rounded-lg backdrop-blur-sm flex items-center gap-2 ${
                viewMode === 'bloch'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-800/80 text-gray-400 hover:text-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Box className="w-4 h-4" />
              <span className="text-sm">Bloch</span>
            </motion.button>
            <motion.button
              onClick={() => setViewMode('circuit')}
              className={`p-2 rounded-lg backdrop-blur-sm flex items-center gap-2 ${
                viewMode === 'circuit'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-800/80 text-gray-400 hover:text-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <GitBranch className="w-4 h-4" />
              <span className="text-sm">Circuit</span>
            </motion.button>
            <motion.button
              onClick={() => setViewMode('landscape')}
              className={`p-2 rounded-lg backdrop-blur-sm flex items-center gap-2 ${
                viewMode === 'landscape'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-800/80 text-gray-400 hover:text-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Probabilities</span>
            </motion.button>

            <select
              value={numQubits}
              onChange={(e) => handleQubitCountChange(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg bg-slate-800/80 text-white border border-indigo-500/30 backdrop-blur-sm ml-2"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n} Qubit{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          {/* Selected qubit indicator */}
          <div className="absolute top-4 right-4 flex gap-2">
            {Array.from({ length: numQubits }, (_, i) => (
              <button
                key={i}
                onClick={() => setSelectedQubit(i)}
                className={`w-10 h-10 rounded-lg font-bold transition-all ${
                  selectedQubit === i
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/50'
                    : 'bg-slate-800/80 text-gray-400 hover:text-white'
                }`}
              >
                Q{i}
              </button>
            ))}
          </div>

          {/* View mode description */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-gray-400">
              {viewMode === 'bloch' && 'Bloch Sphere View: Each sphere represents a qubit state. Entangled qubits are connected by quantum threads.'}
              {viewMode === 'circuit' && 'Circuit View: Watch your quantum operations as gates the state flows through. Time moves left to right.'}
              {viewMode === 'landscape' && 'Probability Landscape: Heights show measurement probability for each computational basis state. Colors indicate phase.'}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Scrubber */}
      {history.length > 1 && (
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <motion.button
                onClick={() => goToStep(0)}
                className="p-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <SkipBack className="w-4 h-4" />
              </motion.button>
              <motion.button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-lg text-white ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </motion.button>
              <motion.button
                onClick={() => goToStep(history.length - 1)}
                className="p-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <SkipForward className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Timeline bar with draggable scrubber */}
            <div className="flex-1 relative">
              <input
                type="range"
                min={0}
                max={history.length - 1}
                value={historyIndex}
                onChange={(e) => goToStep(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
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

            <span className="text-gray-400 text-sm whitespace-nowrap">
              Step {historyIndex + 1} / {history.length}
            </span>
          </div>
        </div>
      )}

      {/* Controls Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Gate Controls */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Gates</h3>
            <button
              onClick={reset}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-4">Apply to Q{selectedQubit}</p>

          <div className="grid grid-cols-3 gap-2">
            {Object.entries(GATES).map(([name, gate]) => (
              <motion.button
                key={name}
                onClick={() => applyGate(name as keyof typeof GATES)}
                className="p-3 rounded-xl font-bold text-white text-lg"
                style={{ backgroundColor: gate.color }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                {name}
              </motion.button>
            ))}
          </div>

          {numQubits > 1 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-sm text-gray-400 mb-2">Entangling Gates</p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: numQubits }, (_, i) => i).map((target) =>
                  target !== selectedQubit ? (
                    <motion.button
                      key={target}
                      onClick={() => applyCNOT(selectedQubit, target)}
                      className="px-3 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Zap className="w-3 h-3 inline mr-1" />
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
          <p className="text-sm text-gray-400 mb-4">Set Q{selectedQubit} to a known state</p>

          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((preset) => (
              <motion.button
                key={preset.name}
                onClick={() => setPreset(preset.state)}
                className="p-3 rounded-xl bg-slate-700 text-white font-mono hover:bg-slate-600 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {preset.name}
              </motion.button>
            ))}
          </div>
        </div>

        {/* State Information */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Q{selectedQubit} State</h3>

          <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
            <p className="text-gray-400 text-sm mb-2">State Vector</p>
            <p className="text-xl font-mono text-white">
              |ψ⟩ = <span className="text-cyan-400">{alpha.toFixed(3)}</span>|0⟩ +{' '}
              <span className="text-purple-400">{beta.toFixed(3)}</span>|1⟩
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">P(|0⟩)</span>
                <span className="text-cyan-400 font-mono">{(prob0 * 100).toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  animate={{ width: `${prob0 * 100}%` }}
                  transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">P(|1⟩)</span>
                <span className="text-purple-400 font-mono">{(prob1 * 100).toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  animate={{ width: `${prob1 * 100}%` }}
                  transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">θ (polar)</p>
              <p className="text-white font-mono">{(currentState.theta * 180 / Math.PI).toFixed(1)}°</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">φ (azimuthal)</p>
              <p className="text-white font-mono">{(currentState.phi * 180 / Math.PI).toFixed(1)}°</p>
            </div>
          </div>

          {entanglements.some(([a, b]) => a === selectedQubit || b === selectedQubit) && (
            <div className="mt-4 p-3 rounded-lg bg-pink-500/20 border border-pink-500/30">
              <p className="text-pink-400 text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Entangled with Q
                {entanglements
                  .filter(([a, b]) => a === selectedQubit || b === selectedQubit)
                  .map(([a, b]) => (a === selectedQubit ? b : a))
                  .join(', Q')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
