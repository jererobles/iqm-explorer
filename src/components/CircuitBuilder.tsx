import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Download, RotateCcw, Cpu } from 'lucide-react'

interface Gate {
  id: string
  type: string
  qubit: number
  targetQubit?: number
  params?: { [key: string]: number }
}

interface GateDefinition {
  name: string
  symbol: string
  description: string
  color: string
  isMultiQubit?: boolean
  params?: string[]
  iqmNative?: boolean
}

const gateLibrary: { [key: string]: GateDefinition } = {
  h: {
    name: 'Hadamard',
    symbol: 'H',
    description: 'Creates superposition: |0⟩ → (|0⟩+|1⟩)/√2',
    color: 'from-blue-500 to-blue-600'
  },
  x: {
    name: 'Pauli-X',
    symbol: 'X',
    description: 'NOT gate: flips |0⟩ ↔ |1⟩',
    color: 'from-red-500 to-red-600'
  },
  y: {
    name: 'Pauli-Y',
    symbol: 'Y',
    description: 'Rotation around Y-axis by π',
    color: 'from-green-500 to-green-600'
  },
  z: {
    name: 'Pauli-Z',
    symbol: 'Z',
    description: 'Phase flip: |1⟩ → -|1⟩',
    color: 'from-purple-500 to-purple-600'
  },
  s: {
    name: 'S Gate',
    symbol: 'S',
    description: 'π/2 phase gate (√Z)',
    color: 'from-cyan-500 to-cyan-600'
  },
  t: {
    name: 'T Gate',
    symbol: 'T',
    description: 'π/4 phase gate',
    color: 'from-teal-500 to-teal-600'
  },
  rx: {
    name: 'Rx',
    symbol: 'Rx',
    description: 'Rotation around X-axis',
    color: 'from-orange-500 to-orange-600',
    params: ['θ']
  },
  ry: {
    name: 'Ry',
    symbol: 'Ry',
    description: 'Rotation around Y-axis',
    color: 'from-lime-500 to-lime-600',
    params: ['θ']
  },
  rz: {
    name: 'Rz',
    symbol: 'Rz',
    description: 'Rotation around Z-axis',
    color: 'from-violet-500 to-violet-600',
    params: ['θ']
  },
  prx: {
    name: 'PRX',
    symbol: 'PRX',
    description: 'IQM native phased rotation',
    color: 'from-indigo-500 to-purple-600',
    params: ['θ', 'φ'],
    iqmNative: true
  },
  cx: {
    name: 'CNOT',
    symbol: 'CX',
    description: 'Controlled-NOT gate',
    color: 'from-pink-500 to-pink-600',
    isMultiQubit: true
  },
  cz: {
    name: 'CZ',
    symbol: 'CZ',
    description: 'Controlled-Z gate (IQM native)',
    color: 'from-indigo-500 to-indigo-600',
    isMultiQubit: true,
    iqmNative: true
  },
  swap: {
    name: 'SWAP',
    symbol: 'SW',
    description: 'Swaps two qubit states',
    color: 'from-amber-500 to-amber-600',
    isMultiQubit: true
  },
  measure: {
    name: 'Measure',
    symbol: 'M',
    description: 'Measurement in computational basis',
    color: 'from-gray-500 to-gray-600'
  }
}

export default function CircuitBuilder() {
  const [numQubits, setNumQubits] = useState(3)
  const [gates, setGates] = useState<Gate[]>([])
  const [selectedGate, setSelectedGate] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const [simulationResult, setSimulationResult] = useState<{ [key: string]: number } | null>(null)

  const addGate = useCallback((qubit: number) => {
    if (!selectedGate) return

    const gateInfo = gateLibrary[selectedGate]
    const newGate: Gate = {
      id: `${selectedGate}-${Date.now()}`,
      type: selectedGate,
      qubit,
      ...(gateInfo?.isMultiQubit && { targetQubit: (qubit + 1) % numQubits }),
      ...(gateInfo?.params && { params: { θ: Math.PI / 2, φ: 0 } })
    }
    setGates([...gates, newGate])
  }, [selectedGate, gates, numQubits])

  const removeGate = (gateId: string) => {
    setGates(gates.filter(g => g.id !== gateId))
  }

  const clearCircuit = () => {
    setGates([])
    setSimulationResult(null)
  }

  const generateQiskitCode = () => {
    let code = `from qiskit import QuantumCircuit
from iqm.qiskit_iqm import IQMProvider

# Create circuit with ${numQubits} qubits
qc = QuantumCircuit(${numQubits}, ${numQubits})

`
    gates.forEach(gate => {
      const g = gateLibrary[gate.type]
      if (g.isMultiQubit) {
        code += `qc.${gate.type}(${gate.qubit}, ${gate.targetQubit})\n`
      } else if (gate.type === 'measure') {
        code += `qc.measure(${gate.qubit}, ${gate.qubit})\n`
      } else if (g.params) {
        const params = Object.values(gate.params || {}).join(', ')
        code += `qc.${gate.type}(${params}, ${gate.qubit})\n`
      } else {
        code += `qc.${gate.type}(${gate.qubit})\n`
      }
    })

    code += `
# Run on IQM quantum computer
# provider = IQMProvider("https://your-iqm-server.com")
# backend = provider.get_backend()
# job = backend.run(qc, shots=1000)
# result = job.result()

print(qc.draw())`
    return code
  }

  const simulateCircuit = () => {
    // Simple simulation for demonstration
    const shots = 1000
    const results: { [key: string]: number } = {}

    // Count measurements in circuit
    const measurements = gates.filter(g => g.type === 'measure')
    if (measurements.length === 0) {
      // Add all qubits to results
      for (let i = 0; i < Math.pow(2, numQubits); i++) {
        const bitstring = i.toString(2).padStart(numQubits, '0')
        results[bitstring] = Math.floor(shots / Math.pow(2, numQubits))
      }
    } else {
      // Simplified simulation based on gates
      const hasHadamard = gates.some(g => g.type === 'h')
      const hasEntanglement = gates.some(g => gateLibrary[g.type]?.isMultiQubit)

      if (hasEntanglement && hasHadamard) {
        // Bell-like state
        const base = '0'.repeat(numQubits)
        const flipped = '1'.repeat(numQubits)
        results[base] = Math.floor(shots / 2) + Math.floor(Math.random() * 50)
        results[flipped] = shots - results[base]
      } else if (hasHadamard) {
        // Superposition
        for (let i = 0; i < Math.pow(2, numQubits); i++) {
          const bitstring = i.toString(2).padStart(numQubits, '0')
          results[bitstring] = Math.floor(shots / Math.pow(2, numQubits)) + Math.floor(Math.random() * 20 - 10)
        }
      } else {
        // Classical-like result
        let state = 0
        gates.forEach(g => {
          if (g.type === 'x') state ^= (1 << (numQubits - 1 - g.qubit))
        })
        results[state.toString(2).padStart(numQubits, '0')] = shots
      }
    }

    setSimulationResult(results)
  }

  return (
    <div className="space-y-6">
      {/* Gate Palette */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          Gate Palette
          <span className="text-xs text-gray-400 font-normal ml-2">
            (Click a gate, then click on a qubit wire)
          </span>
        </h3>

        {/* Single Qubit Gates */}
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">Single-Qubit Gates</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(gateLibrary)
              .filter(([_, g]) => !g.isMultiQubit && !['measure'].includes(_))
              .map(([key, gate]) => (
                <motion.button
                  key={key}
                  className={`relative px-4 py-2 rounded-lg font-mono font-bold text-white transition-all ${
                    selectedGate === key
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                      : ''
                  } bg-gradient-to-br ${gate.color}`}
                  onClick={() => setSelectedGate(selectedGate === key ? null : key)}
                  onMouseEnter={() => setShowTooltip(key)}
                  onMouseLeave={() => setShowTooltip(null)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {gate.symbol}
                  {gate.iqmNative && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full" title="IQM Native" />
                  )}
                </motion.button>
              ))}
          </div>
        </div>

        {/* Multi-Qubit Gates */}
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">Multi-Qubit Gates</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(gateLibrary)
              .filter(([_, g]) => g.isMultiQubit)
              .map(([key, gate]) => (
                <motion.button
                  key={key}
                  className={`relative px-4 py-2 rounded-lg font-mono font-bold text-white transition-all ${
                    selectedGate === key
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                      : ''
                  } bg-gradient-to-br ${gate.color}`}
                  onClick={() => setSelectedGate(selectedGate === key ? null : key)}
                  onMouseEnter={() => setShowTooltip(key)}
                  onMouseLeave={() => setShowTooltip(null)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {gate.symbol}
                  {gate.iqmNative && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full" title="IQM Native" />
                  )}
                </motion.button>
              ))}
          </div>
        </div>

        {/* Measurement */}
        <div>
          <p className="text-sm text-gray-400 mb-2">Measurement</p>
          <motion.button
            className={`px-4 py-2 rounded-lg font-mono font-bold text-white transition-all ${
              selectedGate === 'measure'
                ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                : ''
            } bg-gradient-to-br ${gateLibrary.measure.color}`}
            onClick={() => setSelectedGate(selectedGate === 'measure' ? null : 'measure')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            M
          </motion.button>
        </div>

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 p-3 rounded-lg bg-slate-800 border border-indigo-500/30"
            >
              <p className="font-semibold text-white">{gateLibrary[showTooltip].name}</p>
              <p className="text-sm text-gray-400">{gateLibrary[showTooltip].description}</p>
              {gateLibrary[showTooltip].iqmNative && (
                <p className="text-xs text-cyan-400 mt-1">IQM Native Gate</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Circuit Canvas */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Quantum Circuit</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Qubits:</label>
              <select
                value={numQubits}
                onChange={(e) => {
                  setNumQubits(Number(e.target.value))
                  setGates([])
                }}
                className="bg-slate-700 text-white rounded-lg px-3 py-1 text-sm"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button
              onClick={clearCircuit}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>

        {/* Circuit Visualization */}
        <div className="bg-slate-900/50 rounded-xl p-6 overflow-x-auto">
          <svg width={Math.max(600, gates.length * 60 + 200)} height={numQubits * 60 + 40}>
            {/* Qubit labels and wires */}
            {Array.from({ length: numQubits }).map((_, i) => (
              <g key={i}>
                {/* Qubit label */}
                <text
                  x={30}
                  y={40 + i * 60}
                  className="fill-indigo-400 font-mono text-sm"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  q{i}
                </text>
                {/* Initial state */}
                <text
                  x={60}
                  y={40 + i * 60}
                  className="fill-gray-400 font-mono text-sm"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  |0⟩
                </text>
                {/* Wire */}
                <line
                  x1={80}
                  y1={40 + i * 60}
                  x2={Math.max(550, gates.length * 60 + 150)}
                  y2={40 + i * 60}
                  className="stroke-indigo-500/50"
                  strokeWidth={2}
                />
                {/* Clickable area */}
                <rect
                  x={80}
                  y={20 + i * 60}
                  width={Math.max(470, gates.length * 60 + 70)}
                  height={40}
                  fill="transparent"
                  className="cursor-pointer hover:fill-indigo-500/10"
                  onClick={() => addGate(i)}
                />
              </g>
            ))}

            {/* Gates */}
            {gates.map((gate, index) => {
              const gateInfo = gateLibrary[gate.type]
              const x = 120 + index * 60
              const y = 40 + gate.qubit * 60
              const isMultiQubit = gateInfo?.isMultiQubit

              return (
                <g key={gate.id} className="cursor-pointer" onClick={() => removeGate(gate.id)}>
                  {/* Multi-qubit gate connector */}
                  {isMultiQubit && gate.targetQubit !== undefined && (
                    <line
                      x1={x}
                      y1={y}
                      x2={x}
                      y2={40 + gate.targetQubit * 60}
                      className="stroke-white"
                      strokeWidth={2}
                    />
                  )}

                  {/* Gate box */}
                  <motion.rect
                    x={x - 20}
                    y={y - 20}
                    width={40}
                    height={40}
                    rx={8}
                    className={`fill-indigo-600 stroke-indigo-400`}
                    strokeWidth={2}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                  />
                  <text
                    x={x}
                    y={y}
                    className="fill-white font-mono font-bold text-sm"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {gateInfo.symbol}
                  </text>

                  {/* Target qubit marker for multi-qubit gates */}
                  {isMultiQubit && gate.targetQubit !== undefined && (
                    <>
                      <circle
                        cx={x}
                        cy={40 + gate.targetQubit * 60}
                        r={15}
                        className="fill-indigo-600 stroke-indigo-400"
                        strokeWidth={2}
                      />
                      {gate.type === 'cx' && (
                        <>
                          <line
                            x1={x - 10}
                            y1={40 + gate.targetQubit * 60}
                            x2={x + 10}
                            y2={40 + gate.targetQubit * 60}
                            className="stroke-white"
                            strokeWidth={2}
                          />
                          <line
                            x1={x}
                            y1={40 + gate.targetQubit * 60 - 10}
                            x2={x}
                            y2={40 + gate.targetQubit * 60 + 10}
                            className="stroke-white"
                            strokeWidth={2}
                          />
                        </>
                      )}
                    </>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Click on a wire to add the selected gate. Click on a gate to remove it.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <motion.button
          onClick={simulateCircuit}
          className="btn-quantum flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Play className="w-5 h-5" />
          Simulate
        </motion.button>
        <motion.button
          onClick={() => {
            const code = generateQiskitCode()
            navigator.clipboard.writeText(code)
          }}
          className="px-6 py-3 rounded-xl font-semibold glass-card text-gray-200 flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Download className="w-5 h-5" />
          Export Qiskit Code
        </motion.button>
      </div>

      {/* Simulation Results */}
      <AnimatePresence>
        {simulationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Simulation Results (1000 shots)</h3>
            <div className="space-y-3">
              {Object.entries(simulationResult)
                .sort(([, a], [, b]) => b - a)
                .map(([state, count]) => (
                  <div key={state} className="flex items-center gap-4">
                    <span className="font-mono text-indigo-400 w-24">|{state}⟩</span>
                    <div className="flex-1 h-8 bg-slate-700 rounded-lg overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / 1000) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="text-gray-400 w-20 text-right">
                      {((count / 1000) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Code */}
      {gates.length > 0 && (
        <div className="code-block">
          <div className="code-header">
            <span className="text-sm text-gray-400">Generated Qiskit Code</span>
          </div>
          <pre className="p-4 overflow-x-auto">
            <code className="text-sm text-gray-300 font-mono">{generateQiskitCode()}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
