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
import EnhancedBlochSphere from './quantum3d/EnhancedBlochSphere'
import EntanglementLines from './quantum3d/EntanglementLines'
import ProbabilityLandscape from './quantum3d/ProbabilityLandscape'
import EnhancedAmplitudeWave from './quantum3d/EnhancedAmplitudeWave'
import AmplitudeRing from './quantum3d/AmplitudeRing'
import {
  QuantumParticleCloud,
  FloatingOrbs,
  Sparkles,
} from './quantum3d/effects/EnhancedParticles'
import {
  CosmicNebula,
  QuantumAurora,
  HolographicGrid,
  EnergyWaveRipple,
  QuantumVortex,
} from './quantum3d/effects/QuantumEffects'
import { QuantumPostProcessing, AdaptiveQuantumEffects } from './quantum3d/effects/PostProcessing'
import {
  iqmApi,
  IQMConfig,
  saveConfig,
  loadConfig,
} from '../services/iqmApi'
import { getMeasurementCounts } from '../services/simulator'

type ViewMode = 'bloch' | 'towers' | 'wave' | 'ring'

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
  M: {
    color: '#64748b',
    name: 'Measure',
    description: 'Collapses superposition to classical state',
    matrix: 'Projection onto |0⟩⟨0| or |1⟩⟨1|',
    physicalMeaning: 'Observes the qubit, collapsing its quantum state to a definite classical value (0 or 1)',
    example: 'Final step to extract classical information from quantum computation'
  },
}

// Bloch sphere element descriptions for hover tooltips
const BLOCH_ELEMENT_INFO: Record<string, {
  color: string
  name: string
  description: string
  physicalMeaning: string
}> = {
  'sphere': {
    color: '#6366f1',
    name: 'Bloch Sphere',
    description: 'Geometric representation of a qubit\'s quantum state',
    physicalMeaning: 'Every point on or inside the sphere represents a valid qubit state. Pure states lie on the surface, mixed states are inside.'
  },
  'state-vector': {
    color: '#22d3ee',
    name: 'State Vector',
    description: 'Current quantum state of the qubit',
    physicalMeaning: 'The arrow points to where your qubit currently "is" - its position encodes both the measurement probabilities and quantum phase.'
  },
  'z-axis': {
    color: '#22c55e',
    name: 'Z-Axis (Computational Basis)',
    description: '|0⟩ at top, |1⟩ at bottom',
    physicalMeaning: 'The vertical axis represents the computational basis states. When you measure, you project onto this axis.'
  },
  'x-axis': {
    color: '#ef4444',
    name: 'X-Axis (Superposition Basis)',
    description: '|+⟩ at +X, |-⟩ at -X',
    physicalMeaning: 'The |+⟩ and |-⟩ states are equal superpositions with different phases. Hadamard gate rotates between Z and X bases.'
  },
  'y-axis': {
    color: '#3b82f6',
    name: 'Y-Axis (Circular Basis)',
    description: '|i⟩ at +Y, |-i⟩ at -Y',
    physicalMeaning: 'States on this axis have imaginary phase components. The Y-axis completes the 3D representation of all possible qubit states.'
  },
  'equator': {
    color: '#6366f1',
    name: 'Equator',
    description: 'Equal superposition states with varying phase',
    physicalMeaning: 'All points on the equator have 50/50 measurement probability for |0⟩ and |1⟩. They differ only in quantum phase.'
  },
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

// 3D Scene content for visualization with multiple view modes
function VisualizationScene({
  qubitStates,
  entanglements,
  numQubits,
  viewMode,
  probabilities,
  onElementHover: _onElementHover,
}: {
  qubitStates: { theta: number; phi: number }[]
  entanglements: [number, number][]
  numQubits: number
  viewMode: ViewMode
  probabilities: { state: string; probability: number; phase?: number }[]
  onElementHover?: (element: string | null) => void
}) {
  const positions = useMemo(() => {
    if (numQubits === 1) {
      return [[0, 0, 0] as [number, number, number]]
    }
    if (numQubits <= 3) {
      const spacing = 4
      const startX = -((numQubits - 1) * spacing) / 2
      return qubitStates.map((_, i) => [startX + i * spacing, 0, 0] as [number, number, number])
    }
    const radius = numQubits * 0.85
    return qubitStates.map((_, i) => {
      const angle = (i / numQubits) * Math.PI * 2
      return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number]
    })
  }, [numQubits, qubitStates])

  // Calculate attractors for particle field from probabilities
  const attractors = useMemo(() => {
    const n = probabilities.length
    if (n === 0) return []
    const gridSize = Math.ceil(Math.sqrt(n))
    const cellSize = 7 / gridSize

    return probabilities
      .filter(p => p.probability > 0.1)
      .map((prob) => {
        const idx = probabilities.indexOf(prob)
        return {
          position: [
            ((idx % gridSize) - gridSize / 2 + 0.5) * cellSize,
            prob.probability * 2.5 + 0.5,
            (Math.floor(idx / gridSize) - gridSize / 2 + 0.5) * cellSize
          ] as [number, number, number],
          strength: prob.probability * 2.5,
          color: `hsl(${((prob.phase || 0) / (2 * Math.PI)) * 360}, 85%, 55%)`
        }
      })
  }, [probabilities])

  const hasEntanglement = entanglements.length > 0
  const hasSuperposition = qubitStates.some(s => s.theta > 0.1 && s.theta < Math.PI - 0.1)

  // Enhanced lighting for gorgeous visuals
  const EnhancedLighting = ({ viewMode: mode }: { viewMode: ViewMode }) => (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[12, 12, 12]} intensity={1.4} color="#8b5cf6" />
      <pointLight position={[-12, -8, -12]} intensity={0.7} color="#06b6d4" />
      <spotLight
        position={[0, 18, 0]}
        angle={0.4}
        penumbra={1}
        intensity={0.9}
        color={mode === 'wave' ? '#ec4899' : '#8b5cf6'}
        castShadow
      />
    </>
  )

  // Cosmic background with nebula and particles
  const CosmicBackgroundEffects = ({ mode }: { mode: ViewMode }) => (
    <>
      <Stars radius={150} depth={80} count={3500} factor={5} fade speed={0.5} />
      <CosmicNebula position={[0, 0, -45]} size={90} intensity={0.4} />
      {(mode === 'wave' || mode === 'ring') && (
        <QuantumAurora position={[0, 12, -12]} width={35} height={10} />
      )}
      <Sparkles count={120} radius={14} height={10} color="#ffffff" speed={0.4} />
      <FloatingOrbs
        count={12}
        radius={11}
        height={9}
        colors={['#8b5cf6', '#06b6d4', '#ec4899', '#22c55e']}
        speed={0.25}
      />
    </>
  )

  if (viewMode === 'bloch') {
    return (
      <>
        <PerspectiveCamera makeDefault position={[0, 4, numQubits > 2 ? 12 : 10]} fov={50} />
        <EnhancedLighting viewMode={viewMode} />
        <CosmicBackgroundEffects mode={viewMode} />

        {/* Holographic grid floor */}
        <HolographicGrid position={[0, -2.5, 0]} size={22} divisions={22} />

        {/* Central vortex for entangled states */}
        {hasEntanglement && (
          <QuantumVortex
            position={[0, -2.2, 0]}
            innerRadius={0.25}
            outerRadius={1.8}
            depth={0.8}
            intensity={0.5}
          />
        )}

        {/* Enhanced Bloch spheres with particle fields */}
        {qubitStates.map((state, i) => (
          <EnhancedBlochSphere
            key={i}
            state={{ ...state, label: `Q${i}` }}
            position={positions[i]}
            radius={1.15}
            isEntangled={entanglements.some(([a, b]) => a === i || b === i)}
            showPedagogicGuides={i === 0 && numQubits === 1}
          />
        ))}

        <EntanglementLines positions={positions} entanglements={entanglements} />

        {/* Ambient particle cloud */}
        <QuantumParticleCloud
          count={350}
          radius={9}
          height={7}
          colors={['#8b5cf6', '#06b6d4', '#ec4899']}
          speed={0.35}
          turbulence={0.25}
        />

        {/* Wave ripples at base for superposition states */}
        {hasSuperposition && (
          <EnergyWaveRipple
            position={[0, -2.4, 0]}
            color="#8b5cf6"
            maxRadius={7}
            speed={0.4}
            count={4}
          />
        )}

        <OrbitControls enablePan enableZoom enableRotate minDistance={5} maxDistance={25} />
        <AdaptiveQuantumEffects
          quantumIntensity={hasSuperposition ? 0.75 : 0.5}
          isEntangled={hasEntanglement}
          isSuperposition={hasSuperposition}
        />
      </>
    )
  }

  if (viewMode === 'towers') {
    return (
      <>
        <PerspectiveCamera makeDefault position={[7, 7, 7]} fov={50} />
        <EnhancedLighting viewMode={viewMode} />
        <CosmicBackgroundEffects mode={viewMode} />
        <HolographicGrid position={[0, -0.1, 0]} size={18} divisions={18} />

        <ProbabilityLandscape
          probabilities={probabilities}
          position={[0, 0, 0]}
          maxHeight={4}
          barWidth={0.65}
          spacing={1.4}
          enhanced={true}
        />

        <QuantumParticleCloud
          count={280}
          radius={7}
          height={6}
          colors={['#8b5cf6', '#06b6d4', '#22c55e']}
          speed={0.5}
        />

        <OrbitControls enablePan enableZoom enableRotate minDistance={4} maxDistance={22} />
        <QuantumPostProcessing bloomIntensity={1.5} bloomThreshold={0.35} />
      </>
    )
  }

  if (viewMode === 'wave') {
    return (
      <>
        <PerspectiveCamera makeDefault position={[9, 9, 9]} fov={50} />
        <EnhancedLighting viewMode={viewMode} />
        <CosmicBackgroundEffects mode={viewMode} />

        <EnhancedAmplitudeWave
          probabilities={probabilities}
          position={[0, 0, 0]}
          size={8}
          resolution={72}
        />

        <QuantumParticleCloud
          count={400}
          radius={6}
          height={5}
          colors={['#06b6d4', '#8b5cf6', '#ec4899']}
          speed={0.65}
          turbulence={0.35}
          attractors={attractors}
        />

        <OrbitControls enablePan enableZoom enableRotate minDistance={6} maxDistance={22} />
        <QuantumPostProcessing
          bloomIntensity={1.8}
          bloomThreshold={0.3}
          chromaticAberration={0.003}
        />
      </>
    )
  }

  if (viewMode === 'ring') {
    return (
      <>
        <PerspectiveCamera makeDefault position={[0, 7, 9]} fov={50} />
        <EnhancedLighting viewMode={viewMode} />
        <CosmicBackgroundEffects mode={viewMode} />

        {/* Central vortex */}
        <QuantumVortex
          position={[0, -0.8, 0]}
          innerRadius={0.25}
          outerRadius={1.3}
          depth={0.6}
          intensity={0.7}
        />

        <AmplitudeRing
          probabilities={probabilities}
          position={[0, 0, 0]}
          radius={3.5}
          height={3}
        />

        <QuantumParticleCloud
          count={280}
          radius={5}
          height={4}
          colors={['#8b5cf6', '#ec4899', '#f59e0b']}
          speed={0.45}
          turbulence={0.4}
        />

        <OrbitControls enablePan enableZoom enableRotate minDistance={5} maxDistance={18} />
        <QuantumPostProcessing
          bloomIntensity={1.6}
          bloomThreshold={0.35}
          chromaticAberration={0.002}
        />
      </>
    )
  }

  return null
}

// Circuit diagram component
function CircuitDiagram({
  operations,
  numQubits,
  currentStep,
  onStepClick,
  onAddGate,
  onRemoveGate,
  onGateHover,
}: {
  operations: GateOperation[]
  numQubits: number
  currentStep: number
  onStepClick: (step: number) => void
  onAddGate: (gate: string, qubit: number, targetQubit?: number) => void
  onRemoveGate: (operationId: string) => void
  onGateHover?: (gate: string | null) => void
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
              onMouseEnter={() => onGateHover?.(gate)}
              onMouseLeave={() => onGateHover?.(null)}
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
  } = useQuantum()

  const [mode, setMode] = useState<'simulation' | 'iqm'>('simulation')
  const [viewMode, setViewMode] = useState<ViewMode>('bloch')
  const [showExamples, setShowExamples] = useState(false)
  const [hoveredGate, setHoveredGate] = useState<string | null>(null)
  const [hoveredBlochElement, setHoveredBlochElement] = useState<string | null>(null)
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

  // Probabilities with phase info for amplitude visualizations
  const probabilitiesWithPhase = useMemo(() => {
    if (!currentState.probabilities || currentState.probabilities.length === 0) {
      // Generate default probabilities based on qubit states
      const n = numQubits
      const numStates = Math.pow(2, n)
      const probs: { state: string; probability: number; phase: number }[] = []

      for (let i = 0; i < numStates; i++) {
        const binaryStr = i.toString(2).padStart(n, '0')
        let probability = 1

        for (let q = 0; q < n; q++) {
          const bit = parseInt(binaryStr[q])
          const state = currentState.qubitStates[q] || { theta: 0, phi: 0 }
          const alpha = Math.cos(state.theta / 2)
          const beta = Math.sin(state.theta / 2)

          probability *= (bit === 0) ? alpha * alpha : beta * beta
        }

        // Calculate phase from first qubit's phi for now
        const phase = currentState.qubitStates[0]?.phi || 0

        probs.push({ state: binaryStr, probability, phase })
      }

      return probs
    }

    return currentState.probabilities.map((p, i) => ({
      ...p,
      phase: (currentState.qubitStates[0]?.phi || 0) + (i * Math.PI / 4) // Add variety to phases
    }))
  }, [currentState, numQubits])

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

      {/* Main layout: Left column (editor + circuit) 40% | Right column (viz + scrubber) 60% */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column - 40% width (2/5) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Code Editor */}
          <div className="glass-card overflow-hidden flex flex-col" style={{ height: '280px' }}>
            <div className="flex items-center justify-between p-2 border-b border-gray-700/50">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="ml-2 text-xs text-gray-400">circuit.py</span>
              </div>
              <button
                onClick={() => setCode(EXAMPLES[0].code)}
                className="p-1 text-gray-400 hover:text-white rounded"
                title="Reset to Bell State example"
              >
                <RotateCcw className="w-3.5 h-3.5" />
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
                  fontSize: 12,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 8 },
                  tabSize: 2,
                  wordWrap: 'on',
                }}
              />
            </div>
          </div>

          {/* Circuit Builder - under editor */}
          <div className="glass-card overflow-hidden flex flex-col" style={{ height: '220px' }}>
            <div className="flex items-center justify-between p-2 border-b border-gray-700/50">
              <span className="text-xs font-medium text-white">Circuit Builder</span>
              <span className="text-xs text-gray-500">{operations.length} gate{operations.length !== 1 ? 's' : ''}</span>
            </div>
            <CircuitDiagram
              operations={operations}
              numQubits={numQubits}
              currentStep={currentStep}
              onStepClick={setCurrentStep}
              onAddGate={handleAddGate}
              onRemoveGate={handleRemoveGate}
              onGateHover={setHoveredGate}
            />
          </div>
        </div>

        {/* Right Column - 60% width (3/5) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* 3D Visualization */}
          <div className="glass-card overflow-hidden flex flex-col" style={{ height: '380px' }}>
            {/* Header with view mode selector */}
            <div className="flex items-center justify-between p-2 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                {/* View mode buttons */}
                <div className="flex items-center gap-0.5 bg-gray-800/50 rounded-lg p-0.5">
                  <motion.button
                    onClick={() => setViewMode('bloch')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${viewMode === 'bloch' ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Bloch
                  </motion.button>
                  <motion.button
                    onClick={() => setViewMode('towers')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${viewMode === 'towers' ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Towers
                  </motion.button>
                  <motion.button
                    onClick={() => setViewMode('wave')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${viewMode === 'wave' ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Wave
                  </motion.button>
                  <motion.button
                    onClick={() => setViewMode('ring')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${viewMode === 'ring' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Ring
                  </motion.button>
                </div>
                <span className="text-xs text-gray-500">
                  {numQubits}Q · Step {currentStep}/{steps.length - 1}
                </span>
              </div>
            </div>
            {/* 3D Canvas */}
            <div className="flex-1 relative bg-gray-900">
              <Suspense fallback={<Loader3D />}>
                <Canvas
                  gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
                  onCreated={({ gl }) => {
                    gl.setClearColor('#111827')
                  }}
                  fallback={<Loader3D />}
                >
                  <VisualizationScene
                    qubitStates={currentState.qubitStates}
                    entanglements={currentState.entanglements}
                    numQubits={numQubits}
                    viewMode={viewMode}
                    probabilities={probabilitiesWithPhase}
                    onElementHover={setHoveredBlochElement}
                  />
                </Canvas>
              </Suspense>
            </div>
            {/* Tooltip bar at bottom of viz - shows hovered element, gate, or current step */}
            <div className="p-2 border-t border-gray-700/50 bg-gray-800/50 min-h-[36px]">
              {hoveredBlochElement && BLOCH_ELEMENT_INFO[hoveredBlochElement] ? (
                <div className="flex items-center gap-3">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: BLOCH_ELEMENT_INFO[hoveredBlochElement]?.color }}
                  >
                    {BLOCH_ELEMENT_INFO[hoveredBlochElement]?.name.split(' ')[0]}
                  </span>
                  <span className="text-xs text-cyan-400 font-medium">
                    {BLOCH_ELEMENT_INFO[hoveredBlochElement]?.name}
                  </span>
                  <span className="text-xs text-gray-400 flex-1">
                    {BLOCH_ELEMENT_INFO[hoveredBlochElement]?.description}
                  </span>
                  <span className="text-xs text-gray-500 italic max-w-[40%] truncate">
                    {BLOCH_ELEMENT_INFO[hoveredBlochElement]?.physicalMeaning}
                  </span>
                </div>
              ) : hoveredGate && GATE_INFO[hoveredGate] ? (
                <div className="flex items-center gap-3">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: GATE_INFO[hoveredGate]?.color }}
                  >
                    {hoveredGate}
                  </span>
                  <span className="text-xs text-cyan-400 font-medium">
                    {GATE_INFO[hoveredGate]?.name}
                  </span>
                  <span className="text-xs text-gray-400 flex-1">
                    {GATE_INFO[hoveredGate]?.description}
                  </span>
                  <span className="text-xs text-gray-500 italic">
                    {GATE_INFO[hoveredGate]?.physicalMeaning}
                  </span>
                </div>
              ) : currentStep > 0 && currentStep <= operations.length ? (
                <div className="flex items-center gap-3">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: GATE_INFO[operations[currentStep - 1]?.gate]?.color }}
                  >
                    {operations[currentStep - 1]?.gate}
                  </span>
                  <span className="text-xs text-cyan-400 font-medium">
                    {GATE_INFO[operations[currentStep - 1]?.gate]?.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {GATE_INFO[operations[currentStep - 1]?.gate]?.description}
                  </span>
                </div>
              ) : currentStep === 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded font-medium">|0⟩</span>
                  <span className="text-xs text-gray-400">Initial state - all qubits start at ground state</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded font-medium">Final</span>
                  <span className="text-xs text-gray-400">Circuit complete - view measurement probabilities below</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Scrubber - under viz */}
          <div className="glass-card p-3" style={{ height: '120px' }}>
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <motion.button
                  onClick={() => setCurrentStep(0)}
                  className="p-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Go to initial state"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  className="p-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Previous step"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                  className="p-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Next step"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  onClick={() => setCurrentStep(steps.length - 1)}
                  className="p-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Go to final state"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </motion.button>
              </div>

              <div className="flex-1">
                {/* Step indicators */}
                <div className="flex items-center gap-1 mb-2 flex-wrap">
                  <motion.button
                    onClick={() => setCurrentStep(0)}
                    className={`px-1.5 py-0.5 rounded text-xs font-medium transition-all ${
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
                      className={`px-1.5 py-0.5 rounded text-xs font-bold transition-all ${
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
                  className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-indigo-500/50"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Auto-simulation indicator for simulation mode */}
                {mode === 'simulation' && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {isSimulating ? (
                      <span className="flex items-center gap-1 text-cyan-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Simulating
                      </span>
                    ) : measurementResults ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <Zap className="w-3 h-3" />
                        Ready
                      </span>
                    ) : null}
                  </div>
                )}
                {/* Only show Run button for IQM mode */}
                {mode === 'iqm' && (
                  <motion.button
                    onClick={runOnIqm}
                    disabled={isRunningIqm}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                      isRunningIqm
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                    }`}
                    whileHover={{ scale: isRunningIqm ? 1 : 1.02 }}
                    whileTap={{ scale: isRunningIqm ? 1 : 0.98 }}
                  >
                    {isRunningIqm ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        Run on IQM
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>
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
              <p>{mode === 'simulation'
                ? isSimulating ? 'Calculating results...' : 'Add gates to see measurement results'
                : 'Configure IQM and run to see hardware results'}</p>
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
