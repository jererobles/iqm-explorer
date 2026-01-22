import { useState, useCallback, useMemo, useRef, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import Editor from '@monaco-editor/react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei'
import {
  Play,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Server,
  Loader2,
  RotateCcw,
  Info,
  Zap,
} from 'lucide-react'
import { useQuantum, GateOperation } from '../context/QuantumContext'
import BlochSphere3D from './quantum3d/BlochSphere3D'
import EntanglementLines from './quantum3d/EntanglementLines'
import {
  iqmApi,
  IQMConfig,
  saveConfig,
  loadConfig,
} from '../services/iqmApi'
import { getMeasurementCounts } from '../services/simulator'

// Gate colors and info for tooltips - ENHANCED with pedagogic content
const GATE_INFO: Record<string, {
  color: string
  name: string
  description: string
  matrix?: string
  physicalMeaning?: string
  example?: string
}> = {
  H: {
    color: '#f59e0b',
    name: 'Hadamard',
    description: 'Creates superposition: |0⟩ → (|0⟩+|1⟩)/√2',
    matrix: '1/√2 × [[1,1],[1,-1]]',
    physicalMeaning: 'Like a quantum coin flip - puts a qubit into an equal superposition of both states simultaneously',
    example: 'Starting point for most quantum algorithms'
  },
  X: {
    color: '#ef4444',
    name: 'Pauli-X (NOT)',
    description: 'Bit flip: |0⟩ ↔ |1⟩',
    matrix: '[[0,1],[1,0]]',
    physicalMeaning: 'Flips the qubit state like a classical NOT gate - rotates 180° around X-axis',
    example: 'Used to flip qubit values'
  },
  Y: {
    color: '#22c55e',
    name: 'Pauli-Y',
    description: 'Rotation around Y-axis by π',
    matrix: '[[0,-i],[i,0]]',
    physicalMeaning: 'Combines bit flip with phase flip - rotates 180° around Y-axis',
    example: 'Less common, used in specific algorithms'
  },
  Z: {
    color: '#3b82f6',
    name: 'Pauli-Z',
    description: 'Phase flip: |1⟩ → -|1⟩',
    matrix: '[[1,0],[0,-1]]',
    physicalMeaning: 'Adds a phase of π to the |1⟩ state - rotates 180° around Z-axis',
    example: 'Key for phase kickback in algorithms'
  },
  S: {
    color: '#8b5cf6',
    name: 'S Gate',
    description: 'π/2 phase gate (√Z)',
    matrix: '[[1,0],[0,i]]',
    physicalMeaning: 'Adds 90° phase to |1⟩ state - quarter turn around Z-axis',
    example: 'Building block for T gate'
  },
  T: {
    color: '#ec4899',
    name: 'T Gate',
    description: 'π/4 phase gate',
    matrix: '[[1,0],[0,e^(iπ/4)]]',
    physicalMeaning: 'Adds 45° phase - essential for universal quantum computation',
    example: 'Combined with Clifford gates for universality'
  },
  CX: {
    color: '#06b6d4',
    name: 'CNOT',
    description: 'Controlled-NOT: flips target if control is |1⟩',
    matrix: '[[1,0,0,0],[0,1,0,0],[0,0,0,1],[0,0,1,0]]',
    physicalMeaning: 'Creates entanglement! Flips target qubit only when control is |1⟩',
    example: 'Essential for creating Bell states'
  },
  CZ: {
    color: '#6366f1',
    name: 'CZ Gate',
    description: 'Controlled-Z: applies Z to target if control is |1⟩',
    matrix: '[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,-1]]',
    physicalMeaning: 'Native to IQM hardware! Adds phase when both qubits are |1⟩',
    example: 'IQM\'s native 2-qubit gate'
  },
  RX: {
    color: '#f97316',
    name: 'Rx(θ)',
    description: 'Rotation around X-axis',
    matrix: '[[cos(θ/2),-i·sin(θ/2)],[-i·sin(θ/2),cos(θ/2)]]',
    physicalMeaning: 'Rotates the Bloch sphere state around the X-axis by angle θ',
    example: 'Continuous rotation for variational algorithms'
  },
  RY: {
    color: '#84cc16',
    name: 'Ry(θ)',
    description: 'Rotation around Y-axis',
    matrix: '[[cos(θ/2),-sin(θ/2)],[sin(θ/2),cos(θ/2)]]',
    physicalMeaning: 'Rotates around Y-axis - can reach any point on Bloch sphere from |0⟩',
    example: 'State preparation in variational circuits'
  },
  RZ: {
    color: '#a855f7',
    name: 'Rz(θ)',
    description: 'Rotation around Z-axis',
    matrix: '[[e^(-iθ/2),0],[0,e^(iθ/2)]]',
    physicalMeaning: 'Adjusts phase without changing measurement probabilities',
    example: 'Phase control in quantum Fourier transform'
  },
}

// Step explanation generator for pedagogic content
function getStepExplanation(gate: string, qubits: number[], stepIndex: number, totalSteps: number): {
  title: string
  explanation: string
  blochEffect: string
  quantumConcept: string
} {
  const gateInfo = GATE_INFO[gate]
  const qubitStr = qubits.length > 1 ? `Q${qubits[0]}→Q${qubits[1]}` : `Q${qubits[0]}`

  const explanations: Record<string, { blochEffect: string; quantumConcept: string }> = {
    H: {
      blochEffect: 'Rotates the state vector to the equator of the Bloch sphere, creating equal probability of |0⟩ and |1⟩',
      quantumConcept: 'SUPERPOSITION: The qubit now exists in both states at once until measured!'
    },
    X: {
      blochEffect: 'Flips the state vector 180° around the X-axis',
      quantumConcept: 'BIT FLIP: Like a classical NOT gate, but works on superposition states too'
    },
    Y: {
      blochEffect: 'Rotates 180° around the Y-axis, combining bit and phase flip',
      quantumConcept: 'COMBINED ROTATION: Useful for creating specific quantum states'
    },
    Z: {
      blochEffect: 'Rotates 180° around the Z-axis (no visible change for |0⟩ or |1⟩, but affects superpositions!)',
      quantumConcept: 'PHASE FLIP: Changes the relative phase between |0⟩ and |1⟩ components'
    },
    S: {
      blochEffect: 'Rotates 90° around the Z-axis',
      quantumConcept: 'PHASE GATE: Adds a quarter-turn of phase to the |1⟩ component'
    },
    T: {
      blochEffect: 'Rotates 45° around the Z-axis',
      quantumConcept: 'MAGIC GATE: Essential for universal quantum computation'
    },
    CX: {
      blochEffect: 'Correlates the two qubits - if control is in superposition, creates entanglement!',
      quantumConcept: 'ENTANGLEMENT: The qubits become correlated in a way impossible classically'
    },
    CZ: {
      blochEffect: 'Adds a phase when both qubits are |1⟩',
      quantumConcept: 'NATIVE GATE: IQM hardware implements this directly!'
    },
    RX: {
      blochEffect: 'Smoothly rotates around the X-axis by the specified angle',
      quantumConcept: 'PARAMETERIZED GATE: Used in variational quantum algorithms'
    },
    RY: {
      blochEffect: 'Smoothly rotates around the Y-axis',
      quantumConcept: 'STATE PREPARATION: Can prepare any state on the Bloch sphere from |0⟩'
    },
    RZ: {
      blochEffect: 'Adjusts phase angle around the Z-axis',
      quantumConcept: 'PHASE CONTROL: Key for interference effects'
    },
  }

  const specific = explanations[gate] || { blochEffect: 'Transforms the quantum state', quantumConcept: 'Quantum operation' }

  return {
    title: `Step ${stepIndex + 1}/${totalSteps}: ${gateInfo?.name || gate} on ${qubitStr}`,
    explanation: gateInfo?.physicalMeaning || 'Applies a quantum transformation',
    blochEffect: specific.blochEffect,
    quantumConcept: specific.quantumConcept,
  }
}

// Example circuits
const EXAMPLES = [
  {
    name: 'Bell State',
    code: `# Bell State - Quantum Entanglement
from qiskit import QuantumCircuit

qc = QuantumCircuit(2)

# Hadamard creates superposition
qc.h(0)

# CNOT creates entanglement
qc.cx(0, 1)

qc.measure_all()
shots = 1024
`,
  },
  {
    name: 'GHZ State',
    code: `# GHZ State - 3-qubit entanglement
from qiskit import QuantumCircuit

qc = QuantumCircuit(3)

qc.h(0)
qc.cx(0, 1)
qc.cx(1, 2)

qc.measure_all()
shots = 1024
`,
  },
  {
    name: 'Superposition',
    code: `# Single qubit superposition
from qiskit import QuantumCircuit

qc = QuantumCircuit(1)

# Hadamard creates |+> state
qc.h(0)

qc.measure_all()
shots = 1024
`,
  },
  {
    name: 'Interference',
    code: `# Quantum Interference: H-Z-H = X
from qiskit import QuantumCircuit

qc = QuantumCircuit(1)

qc.h(0)
qc.z(0)
qc.h(0)

qc.measure_all()
shots = 1024
`,
  },
]

// 3D Scene content for visualization
function VisualizationScene({
  qubitStates,
  entanglements,
  numQubits,
}: {
  qubitStates: { theta: number; phi: number }[]
  entanglements: [number, number][]
  numQubits: number
}) {
  const positions = useMemo(() => {
    if (numQubits === 1) {
      return [[0, 0, 0] as [number, number, number]]
    }
    if (numQubits <= 3) {
      const spacing = 3.5
      const startX = -((numQubits - 1) * spacing) / 2
      return qubitStates.map((_, i) => [startX + i * spacing, 0, 0] as [number, number, number])
    }
    const radius = numQubits * 0.7
    return qubitStates.map((_, i) => {
      const angle = (i / numQubits) * Math.PI * 2
      return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number]
    })
  }, [numQubits, qubitStates])

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 3, numQubits > 2 ? 10 : 8]} fov={50} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#6366f1" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
      <Stars radius={100} depth={50} count={1000} factor={4} fade speed={1} />

      {qubitStates.map((state, i) => (
        <BlochSphere3D
          key={i}
          state={{ ...state, label: `Q${i}` }}
          position={positions[i]}
          radius={1}
          isEntangled={entanglements.some(([a, b]) => a === i || b === i)}
        />
      ))}

      <EntanglementLines positions={positions} entanglements={entanglements} />
      <OrbitControls enablePan enableZoom enableRotate minDistance={4} maxDistance={20} />
    </>
  )
}

// Circuit diagram component
function CircuitDiagram({
  operations,
  numQubits,
  currentStep,
  onStepClick,
  onAddGate,
  onRemoveGate,
}: {
  operations: GateOperation[]
  numQubits: number
  currentStep: number
  onStepClick: (step: number) => void
  onAddGate: (gate: string, qubit: number, targetQubit?: number) => void
  onRemoveGate: (operationId: string) => void
}) {
  const [selectedGate, setSelectedGate] = useState<string | null>(null)
  const [hoveredGate, setHoveredGate] = useState<string | null>(null)

  const gateWidth = 50
  const gateSpacing = 60
  const rowHeight = 50
  const leftPadding = 70
  const canvasWidth = Math.max(400, operations.length * gateSpacing + leftPadding + 100)
  const canvasHeight = numQubits * rowHeight + 40

  // Group operations by position for drawing
  const gatePositions = useMemo(() => {
    return operations.map((op, i) => ({
      ...op,
      x: leftPadding + i * gateSpacing,
      index: i,
    }))
  }, [operations])

  const handleQubitClick = (qubit: number) => {
    if (!selectedGate) return

    if (selectedGate === 'CX' || selectedGate === 'CZ') {
      // For 2-qubit gates, need to select control and target
      const targetQubit = (qubit + 1) % numQubits
      onAddGate(selectedGate, qubit, targetQubit)
    } else {
      onAddGate(selectedGate, qubit)
    }
    setSelectedGate(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Gate palette */}
      <div className="p-3 border-b border-gray-700/50 bg-gray-800/30">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(GATE_INFO).map(([gate, info]) => (
            <motion.button
              key={gate}
              onClick={() => setSelectedGate(selectedGate === gate ? null : gate)}
              className={`px-2.5 py-1.5 rounded text-xs font-bold text-white transition-all ${
                selectedGate === gate ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : ''
              }`}
              style={{ backgroundColor: info.color }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={`${info.name}: ${info.description}`}
            >
              {gate}
            </motion.button>
          ))}
        </div>
        {selectedGate && (
          <p className="text-xs text-gray-400 mt-2">Click on a qubit wire to add {GATE_INFO[selectedGate].name}</p>
        )}
      </div>

      {/* Circuit canvas */}
      <div className="flex-1 overflow-auto p-2 bg-gray-900/50">
        <svg width={canvasWidth} height={canvasHeight} className="min-w-full">
          {/* Qubit wires */}
          {Array.from({ length: numQubits }).map((_, i) => (
            <g key={i}>
              {/* Label */}
              <text
                x={15}
                y={20 + i * rowHeight}
                className="fill-indigo-400 text-xs font-mono"
                dominantBaseline="middle"
              >
                q{i}
              </text>
              {/* Initial state */}
              <text
                x={40}
                y={20 + i * rowHeight}
                className="fill-gray-500 text-xs font-mono"
                dominantBaseline="middle"
              >
                {'|0⟩'}
              </text>
              {/* Wire */}
              <line
                x1={leftPadding - 10}
                y1={20 + i * rowHeight}
                x2={canvasWidth - 20}
                y2={20 + i * rowHeight}
                className="stroke-indigo-500/40"
                strokeWidth={2}
              />
              {/* Clickable area */}
              <rect
                x={leftPadding - 10}
                y={i * rowHeight}
                width={canvasWidth - leftPadding}
                height={rowHeight}
                fill="transparent"
                className={`cursor-pointer ${selectedGate ? 'hover:fill-indigo-500/10' : ''}`}
                onClick={() => handleQubitClick(i)}
              />
            </g>
          ))}

          {/* Step indicator line */}
          {currentStep > 0 && currentStep <= operations.length && (
            <line
              x1={leftPadding + (currentStep - 1) * gateSpacing + gateWidth / 2}
              y1={0}
              x2={leftPadding + (currentStep - 1) * gateSpacing + gateWidth / 2}
              y2={canvasHeight}
              className="stroke-cyan-400"
              strokeWidth={2}
              strokeDasharray="4 4"
              opacity={0.7}
            />
          )}

          {/* Gates */}
          {gatePositions.map((gate) => {
            const info = GATE_INFO[gate.gate]
            const y = 20 + gate.qubits[0] * rowHeight
            const isActive = gate.index + 1 <= currentStep
            const isCurrent = gate.index + 1 === currentStep

            return (
              <g
                key={gate.id}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onStepClick(gate.index + 1)
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  onRemoveGate(gate.id)
                }}
                onMouseEnter={() => setHoveredGate(gate.id)}
                onMouseLeave={() => setHoveredGate(null)}
              >
                {/* Multi-qubit gate connector */}
                {gate.qubits.length > 1 && (
                  <line
                    x1={gate.x}
                    y1={y}
                    x2={gate.x}
                    y2={20 + gate.qubits[1] * rowHeight}
                    stroke={info.color}
                    strokeWidth={2}
                    opacity={isActive ? 1 : 0.5}
                  />
                )}

                {/* Gate box */}
                <rect
                  x={gate.x - 18}
                  y={y - 18}
                  width={36}
                  height={36}
                  rx={6}
                  fill={info.color}
                  opacity={isActive ? 1 : 0.4}
                  stroke={isCurrent ? '#fff' : 'transparent'}
                  strokeWidth={2}
                />
                <text
                  x={gate.x}
                  y={y}
                  className="fill-white text-xs font-bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {gate.gate}
                </text>

                {/* Target qubit marker for 2-qubit gates */}
                {gate.qubits.length > 1 && (
                  <circle
                    cx={gate.x}
                    cy={20 + gate.qubits[1] * rowHeight}
                    r={12}
                    fill={info.color}
                    opacity={isActive ? 1 : 0.4}
                  />
                )}

                {/* Enhanced pedagogic hover tooltip */}
                {hoveredGate === gate.id && (
                  <foreignObject
                    x={gate.x - 140}
                    y={y - 120}
                    width={280}
                    height={110}
                  >
                    <div className="bg-slate-800/95 backdrop-blur-sm border border-indigo-500/30 rounded-lg p-3 shadow-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-sm">{info.name}</span>
                        <span className="text-xs text-gray-400">double-click to remove</span>
                      </div>
                      <p className="text-cyan-300 text-xs mb-1">{info.description}</p>
                      <p className="text-gray-400 text-xs">{info.physicalMeaning}</p>
                      {info.matrix && (
                        <p className="text-purple-400 text-xs mt-1 font-mono">Matrix: {info.matrix}</p>
                      )}
                    </div>
                  </foreignObject>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// Results histogram
function ResultsHistogram({
  results,
  shots,
  mode,
}: {
  results: Record<string, number>
  shots: number
  mode: 'simulation' | 'iqm'
}) {
  const data = useMemo(() => {
    return Object.entries(results)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([state, count]) => ({
        state: `|${state}>`,
        count,
        probability: count / shots,
      }))
  }, [results, shots])

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-300">
        Results ({shots.toLocaleString()} shots)
      </h4>
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-14 text-right font-mono text-cyan-400 text-sm">{d.state}</span>
          <div className="flex-1 h-6 bg-gray-800/50 rounded overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.count / maxCount) * 100}%` }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className={`h-full ${
                mode === 'simulation'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white font-medium">
              {d.count} ({(d.probability * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// Loading fallback
function Loader3D() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-indigo-400 text-sm">Loading 3D...</p>
      </div>
    </div>
  )
}

export default function QuantumLab() {
  const {
    code,
    setCode,
    numQubits,
    operations,
    steps,
    currentStep,
    setCurrentStep,
    currentLineNumber,
    updateCodeFromCircuit,
    shots,
    measurementResults,
    isSimulating,
    runSimulation,
  } = useQuantum()

  const [mode, setMode] = useState<'simulation' | 'iqm'>('simulation')
  const [showExamples, setShowExamples] = useState(false)
  const [iqmResults, setIqmResults] = useState<Record<string, number> | null>(null)
  const [iqmStatus, setIqmStatus] = useState('')
  const [isRunningIqm, setIsRunningIqm] = useState(false)
  const [config, setConfig] = useState<IQMConfig>(() => loadConfig() || {
    serverUrl: 'https://cocos.resonance.meetiqm.com/garnet',
    token: '',
    useProxy: false,
    proxyUrl: '',
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null)

  // Current quantum state for visualization
  const currentState = useMemo(() => {
    if (currentStep < steps.length) {
      return steps[currentStep].stateAfter
    }
    return steps[steps.length - 1]?.stateAfter || {
      probabilities: [],
      qubitStates: Array(numQubits).fill({ theta: 0, phi: 0 }),
      entanglements: [],
    }
  }, [currentStep, steps, numQubits])

  // Handle editor mount
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditorMount = (editor: any) => {
    editorRef.current = editor

    // Listen for cursor position changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.onDidChangeCursorPosition((e: any) => {
      const line = e.position.lineNumber
      // Find the step for this line
      let stepForLine = 0
      for (let i = 0; i < operations.length; i++) {
        if (operations[i].lineNumber <= line) {
          stepForLine = i + 1
        }
      }
      if (stepForLine !== currentStep) {
        setCurrentStep(stepForLine)
      }
    })
  }

  // Highlight current line in editor
  useEffect(() => {
    if (editorRef.current && currentLineNumber > 0) {
      editorRef.current.revealLineInCenter(currentLineNumber)
      // Add line decoration
      editorRef.current.deltaDecorations(
        [],
        [
          {
            range: {
              startLineNumber: currentLineNumber,
              startColumn: 1,
              endLineNumber: currentLineNumber,
              endColumn: 1,
            },
            options: {
              isWholeLine: true,
              className: 'current-line-highlight',
              glyphMarginClassName: 'current-line-glyph',
            },
          },
        ]
      )
    }
  }, [currentLineNumber])

  // Add gate from circuit builder
  const handleAddGate = useCallback(
    (gate: string, qubit: number, targetQubit?: number) => {
      const newOp: GateOperation = {
        id: `${gate}-${Date.now()}`,
        gate,
        qubits: targetQubit !== undefined ? [qubit, targetQubit] : [qubit],
        lineNumber: 0,
        code: '',
      }
      updateCodeFromCircuit([...operations, newOp])
    },
    [operations, updateCodeFromCircuit]
  )

  // Remove gate
  const handleRemoveGate = useCallback(
    (operationId: string) => {
      const newOps = operations.filter((op) => op.id !== operationId)
      updateCodeFromCircuit(newOps)
    },
    [operations, updateCodeFromCircuit]
  )

  // Run on IQM hardware
  const runOnIqm = useCallback(async () => {
    if (!iqmApi.isConfigured()) {
      setIqmStatus('Please configure IQM credentials first')
      return
    }

    setIsRunningIqm(true)
    setIqmResults(null)
    setIqmStatus('Submitting to IQM...')

    try {
      const { result, jobId } = await iqmApi.executeCircuit(code, (status) => {
        setIqmStatus(status)
      })

      if (result.status === 'ready') {
        const measurements = Object.values(result.measurements || {})[0] || []
        const counts = getMeasurementCounts(measurements)
        setIqmResults(counts)
        setIqmStatus(`Completed! Job: ${jobId}`)
      } else {
        setIqmStatus(`Failed: ${result.message || 'Unknown error'}`)
      }
    } catch (error) {
      setIqmStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunningIqm(false)
    }
  }, [code])

  // Save IQM config
  const handleSaveConfig = useCallback(() => {
    saveConfig(config)
    setIqmStatus('Configuration saved!')
    setTimeout(() => setIqmStatus(''), 2000)
  }, [config])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-cyan-400" />
            Quantum Lab
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Write code, build circuits, and visualize quantum states
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-3">
          <div className="glass-card p-1 flex gap-1">
            <button
              onClick={() => setMode('simulation')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                mode === 'simulation'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Cpu className="w-4 h-4" />
              Simulate
            </button>
            <button
              onClick={() => setMode('iqm')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                mode === 'iqm'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Server className="w-4 h-4" />
              IQM
            </button>
          </div>

          <button
            onClick={() => setShowExamples(!showExamples)}
            className="px-3 py-1.5 glass-card text-gray-300 hover:text-white rounded-lg text-sm flex items-center gap-1"
          >
            Examples
            {showExamples ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Examples dropdown */}
      {showExamples && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-card p-4"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.name}
                onClick={() => {
                  setCode(ex.code)
                  setShowExamples(false)
                }}
                className="p-3 text-left bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <div className="font-medium text-white text-sm">{ex.name}</div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Top row: Code Editor + 3D Visualization side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ height: '380px' }}>
        {/* Left: Code Editor */}
        <div className="glass-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-sm text-gray-400">circuit.py</span>
            </div>
            <button
              onClick={() => setCode(EXAMPLES[0].code)}
              className="p-1.5 text-gray-400 hover:text-white rounded"
              title="Reset to Bell State example"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 relative">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12 },
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
            {/* Current line explanation overlay */}
            {currentStep > 0 && currentStep <= operations.length && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent p-3">
                <div className="text-xs">
                  <span className="text-cyan-400 font-bold">
                    {GATE_INFO[operations[currentStep - 1]?.gate]?.name || operations[currentStep - 1]?.gate}
                  </span>
                  <span className="text-gray-400 ml-2">
                    {GATE_INFO[operations[currentStep - 1]?.gate]?.physicalMeaning}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: 3D Visualization with step explanation */}
        <div className="glass-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">Quantum State</span>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                {numQubits} qubit{numQubits > 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-xs text-gray-500">Step {currentStep}/{steps.length - 1}</span>
          </div>
          <div className="flex-1 relative bg-gray-900">
            <Suspense fallback={<Loader3D />}>
              <Canvas>
                <VisualizationScene
                  qubitStates={currentState.qubitStates}
                  entanglements={currentState.entanglements}
                  numQubits={numQubits}
                />
              </Canvas>
            </Suspense>
            {/* Step explanation overlay */}
            {currentStep > 0 && currentStep <= operations.length && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={currentStep}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent p-4"
              >
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono">
                      {getStepExplanation(
                        operations[currentStep - 1]?.gate,
                        operations[currentStep - 1]?.qubits,
                        currentStep - 1,
                        operations.length
                      ).quantumConcept}
                    </span>
                  </div>
                  <p className="text-gray-300">
                    {getStepExplanation(
                      operations[currentStep - 1]?.gate,
                      operations[currentStep - 1]?.qubits,
                      currentStep - 1,
                      operations.length
                    ).blochEffect}
                  </p>
                </div>
              </motion.div>
            )}
            {/* Initial state explanation */}
            {currentStep === 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent p-4">
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded font-mono">
                      INITIAL STATE
                    </span>
                  </div>
                  <p className="text-gray-300">
                    All qubits start in the |0⟩ state (pointing up on the Bloch sphere). This is the "ground state" - like a bit set to 0.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Circuit Diagram - Full width below */}
      <div className="glass-card overflow-hidden flex flex-col" style={{ height: '200px' }}>
        <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">Circuit Builder</span>
            <span className="text-xs text-gray-500">Click a gate above, then click a qubit wire to add it</span>
          </div>
          <span className="text-xs text-gray-500">{operations.length} gate{operations.length !== 1 ? 's' : ''}</span>
        </div>
        <CircuitDiagram
          operations={operations}
          numQubits={numQubits}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
          onAddGate={handleAddGate}
          onRemoveGate={handleRemoveGate}
        />
      </div>

      {/* Enhanced Timeline Scrubber with step explanations */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex gap-1">
            <motion.button
              onClick={() => setCurrentStep(0)}
              className="p-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Go to initial state"
            >
              <SkipBack className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              className="p-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Previous step"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              className="p-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Next step"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={() => setCurrentStep(steps.length - 1)}
              className="p-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Go to final state"
            >
              <SkipForward className="w-4 h-4" />
            </motion.button>
          </div>

          <div className="flex-1">
            {/* Step indicators */}
            <div className="flex items-center gap-1 mb-2">
              <motion.button
                onClick={() => setCurrentStep(0)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  currentStep === 0
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
                whileHover={{ scale: 1.05 }}
              >
                |0⟩
              </motion.button>
              {operations.map((op, i) => (
                <motion.button
                  key={i}
                  onClick={() => setCurrentStep(i + 1)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                    currentStep === i + 1
                      ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900 text-white'
                      : currentStep > i + 1
                      ? 'text-white opacity-80'
                      : 'text-white opacity-40'
                  }`}
                  style={{ backgroundColor: GATE_INFO[op.gate]?.color || '#6366f1' }}
                  whileHover={{ scale: 1.1 }}
                  title={`${GATE_INFO[op.gate]?.name}: ${GATE_INFO[op.gate]?.description}`}
                >
                  {op.gate}
                </motion.button>
              ))}
            </div>
            {/* Slider */}
            <input
              type="range"
              min={0}
              max={steps.length - 1}
              value={currentStep}
              onChange={(e) => setCurrentStep(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-indigo-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={mode === 'simulation' ? runSimulation : runOnIqm}
              disabled={isSimulating || isRunningIqm}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                isSimulating || isRunningIqm
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : mode === 'simulation'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
              }`}
              whileHover={{ scale: isSimulating || isRunningIqm ? 1 : 1.02 }}
              whileTap={{ scale: isSimulating || isRunningIqm ? 1 : 0.98 }}
            >
              {isSimulating || isRunningIqm ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Current step explanation bar */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
        >
          {currentStep === 0 ? (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-green-400 text-xs font-bold">|0⟩</span>
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Initial State</h4>
                <p className="text-gray-400 text-xs mt-0.5">
                  All {numQubits} qubit{numQubits > 1 ? 's are' : ' is'} initialized to |0⟩. On the Bloch sphere, this is the north pole.
                  In quantum computing, we always start from a known state before applying gates.
                </p>
              </div>
            </div>
          ) : currentStep <= operations.length ? (
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs"
                style={{ backgroundColor: GATE_INFO[operations[currentStep - 1]?.gate]?.color }}
              >
                {operations[currentStep - 1]?.gate}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-medium text-sm">
                    {getStepExplanation(
                      operations[currentStep - 1]?.gate,
                      operations[currentStep - 1]?.qubits,
                      currentStep - 1,
                      operations.length
                    ).title}
                  </h4>
                </div>
                <p className="text-gray-400 text-xs mt-0.5">
                  {getStepExplanation(
                    operations[currentStep - 1]?.gate,
                    operations[currentStep - 1]?.qubits,
                    currentStep - 1,
                    operations.length
                  ).explanation}
                </p>
                <p className="text-cyan-400 text-xs mt-1 font-medium">
                  ↳ {getStepExplanation(
                    operations[currentStep - 1]?.gate,
                    operations[currentStep - 1]?.qubits,
                    currentStep - 1,
                    operations.length
                  ).blochEffect}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Final State</h4>
                <p className="text-gray-400 text-xs mt-0.5">
                  Circuit complete! Click "Run" to simulate measurements and see the probability distribution.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Results / IQM Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Results */}
        <div className="glass-card p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Results</h3>
          {mode === 'simulation' && measurementResults ? (
            <ResultsHistogram results={measurementResults} shots={shots} mode="simulation" />
          ) : mode === 'iqm' && iqmResults ? (
            <ResultsHistogram
              results={iqmResults}
              shots={Object.values(iqmResults).reduce((a, b) => a + b, 0)}
              mode="iqm"
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Run the circuit to see measurement results</p>
            </div>
          )}
          {iqmStatus && mode === 'iqm' && (
            <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-300 text-sm">
              {iqmStatus}
            </div>
          )}
        </div>

        {/* State Info / IQM Config */}
        <div className="glass-card p-4">
          {mode === 'simulation' ? (
            <>
              <h3 className="text-lg font-semibold text-white mb-4">Current State</h3>
              <div className="space-y-3">
                {currentState.probabilities.slice(0, 8).map((p) => (
                  <div key={p.state} className="flex items-center gap-3">
                    <span className="w-16 font-mono text-cyan-400 text-sm">|{p.state}⟩</span>
                    <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${p.probability * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="text-gray-400 text-sm w-16 text-right">
                      {(p.probability * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
              {currentState.entanglements.length > 0 && (
                <div className="mt-4 p-3 bg-pink-500/10 border border-pink-500/30 rounded-lg">
                  <p className="text-pink-400 text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Entangled: {currentState.entanglements.map(([a, b]) => `Q${a}-Q${b}`).join(', ')}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-400" />
                IQM Configuration
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Server URL</label>
                  <input
                    type="text"
                    value={config.serverUrl}
                    onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm focus:border-indigo-500 outline-none"
                    placeholder="https://cocos.resonance.meetiqm.com/garnet"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">API Token</label>
                  <input
                    type="password"
                    value={config.token}
                    onChange={(e) => setConfig({ ...config, token: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm focus:border-indigo-500 outline-none"
                    placeholder="Your IQM API token"
                  />
                </div>
                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Save Configuration
                </button>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                  <Info className="w-3 h-3" />
                  Get credentials at resonance.meetiqm.com
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
