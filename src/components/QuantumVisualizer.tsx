import { useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Info } from 'lucide-react'

interface QubitState {
  theta: number // Polar angle (0 to PI)
  phi: number   // Azimuthal angle (0 to 2*PI)
}

const predefinedStates: { name: string; state: QubitState; description: string }[] = [
  { name: '|0⟩', state: { theta: 0, phi: 0 }, description: 'Computational basis state zero (north pole)' },
  { name: '|1⟩', state: { theta: Math.PI, phi: 0 }, description: 'Computational basis state one (south pole)' },
  { name: '|+⟩', state: { theta: Math.PI / 2, phi: 0 }, description: 'Equal superposition with positive phase' },
  { name: '|-⟩', state: { theta: Math.PI / 2, phi: Math.PI }, description: 'Equal superposition with negative phase' },
  { name: '|i⟩', state: { theta: Math.PI / 2, phi: Math.PI / 2 }, description: 'Y-basis positive eigenstate' },
  { name: '|-i⟩', state: { theta: Math.PI / 2, phi: 3 * Math.PI / 2 }, description: 'Y-basis negative eigenstate' },
]

const gates: { name: string; transform: (s: QubitState) => QubitState; description: string }[] = [
  {
    name: 'X',
    transform: (s) => ({ theta: Math.PI - s.theta, phi: s.phi + Math.PI }),
    description: 'Rotation by π around X-axis (NOT gate)'
  },
  {
    name: 'Y',
    transform: (s) => ({ theta: Math.PI - s.theta, phi: -s.phi }),
    description: 'Rotation by π around Y-axis'
  },
  {
    name: 'Z',
    transform: (s) => ({ theta: s.theta, phi: s.phi + Math.PI }),
    description: 'Rotation by π around Z-axis (phase flip)'
  },
  {
    name: 'H',
    transform: (s) => {
      // Hadamard transforms |0⟩ to |+⟩ and |1⟩ to |-⟩
      if (s.theta < 0.1) return { theta: Math.PI / 2, phi: 0 }
      if (s.theta > Math.PI - 0.1) return { theta: Math.PI / 2, phi: Math.PI }
      return { theta: Math.PI / 2 - s.theta + Math.PI / 2, phi: s.phi }
    },
    description: 'Hadamard gate - creates superposition'
  },
  {
    name: 'S',
    transform: (s) => ({ theta: s.theta, phi: s.phi + Math.PI / 2 }),
    description: 'S gate - π/2 phase rotation'
  },
  {
    name: 'T',
    transform: (s) => ({ theta: s.theta, phi: s.phi + Math.PI / 4 }),
    description: 'T gate - π/4 phase rotation'
  },
]

export default function QuantumVisualizer() {
  const [qubitState, setQubitState] = useState<QubitState>({ theta: 0, phi: 0 })
  const [history, setHistory] = useState<QubitState[]>([{ theta: 0, phi: 0 }])
  const [showInfo, setShowInfo] = useState<string | null>(null)

  // Calculate Cartesian coordinates from spherical
  const getCartesian = (state: QubitState) => ({
    x: Math.sin(state.theta) * Math.cos(state.phi),
    y: Math.sin(state.theta) * Math.sin(state.phi),
    z: Math.cos(state.theta)
  })

  // Calculate probability amplitudes
  const getAmplitudes = (state: QubitState) => {
    return {
      alpha: Math.cos(state.theta / 2),
      beta: Math.sin(state.theta / 2),
      prob0: Math.pow(Math.cos(state.theta / 2), 2),
      prob1: Math.pow(Math.sin(state.theta / 2), 2)
    }
  }

  const applyGate = (gate: typeof gates[0]) => {
    const newState = gate.transform(qubitState)
    // Normalize angles
    newState.theta = Math.max(0, Math.min(Math.PI, newState.theta))
    newState.phi = ((newState.phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    setQubitState(newState)
    setHistory([...history, newState])
  }

  const setPresetState = (state: QubitState) => {
    setQubitState(state)
    setHistory([...history, state])
  }

  const reset = () => {
    setQubitState({ theta: 0, phi: 0 })
    setHistory([{ theta: 0, phi: 0 }])
  }

  const coords = getCartesian(qubitState)
  const amplitudes = getAmplitudes(qubitState)

  // SVG projection (simple orthographic)
  const projectTo2D = (x: number, y: number, z: number) => ({
    x: 150 + x * 100 + y * 30,
    y: 150 - z * 100 - y * 20
  })

  const statePoint = projectTo2D(coords.x, coords.y, coords.z)

  return (
    <div className="space-y-8">
      {/* Bloch Sphere Visualization */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Bloch Sphere</h3>
          <p className="text-sm text-gray-400 mb-4">
            The Bloch sphere represents all possible states of a single qubit.
            The poles are |0⟩ (north) and |1⟩ (south).
          </p>

          {/* SVG Bloch Sphere */}
          <div className="flex justify-center">
            <svg width="300" height="300" className="overflow-visible">
              {/* Background glow */}
              <defs>
                <radialGradient id="sphereGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(99, 102, 241, 0.2)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <linearGradient id="axisGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>

              {/* Sphere outline */}
              <circle cx="150" cy="150" r="100" fill="url(#sphereGlow)" stroke="#6366f1" strokeWidth="1" opacity="0.5" />

              {/* Equator ellipse */}
              <ellipse cx="150" cy="150" rx="100" ry="30" fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.3" strokeDasharray="5,5" />

              {/* Prime meridian */}
              <ellipse cx="150" cy="150" rx="30" ry="100" fill="none" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" strokeDasharray="5,5" />

              {/* Axes */}
              {/* Z-axis (vertical) */}
              <line x1="150" y1="250" x2="150" y2="50" stroke="#22c55e" strokeWidth="2" />
              <text x="155" y="45" className="fill-green-400 text-xs font-mono">|0⟩</text>
              <text x="155" y="260" className="fill-green-400 text-xs font-mono">|1⟩</text>

              {/* X-axis */}
              <line x1="50" y1="150" x2="250" y2="150" stroke="#ef4444" strokeWidth="2" />
              <text x="255" y="155" className="fill-red-400 text-xs font-mono">|+⟩</text>
              <text x="30" y="155" className="fill-red-400 text-xs font-mono">|-⟩</text>

              {/* Y-axis (into screen, projected) */}
              <line x1="120" y1="170" x2="180" y2="130" stroke="#3b82f6" strokeWidth="2" />
              <text x="185" y="125" className="fill-blue-400 text-xs font-mono">Y</text>

              {/* State vector */}
              <motion.line
                x1="150"
                y1="150"
                x2={statePoint.x}
                y2={statePoint.y}
                stroke="url(#axisGradient)"
                strokeWidth="3"
                initial={false}
                animate={{ x2: statePoint.x, y2: statePoint.y }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
              />

              {/* State point */}
              <motion.circle
                cx={statePoint.x}
                cy={statePoint.y}
                r="8"
                className="fill-cyan-400"
                initial={false}
                animate={{ cx: statePoint.x, cy: statePoint.y }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
              />
              <motion.circle
                cx={statePoint.x}
                cy={statePoint.y}
                r="12"
                className="fill-cyan-400/30"
                initial={false}
                animate={{ cx: statePoint.x, cy: statePoint.y }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
              />

              {/* History trail */}
              {history.slice(-10).map((state, i) => {
                const c = getCartesian(state)
                const p = projectTo2D(c.x, c.y, c.z)
                return (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={2}
                    className="fill-indigo-400"
                    opacity={0.3 + (i / 10) * 0.5}
                  />
                )
              })}
            </svg>
          </div>

          {/* Coordinates display */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-800/50 rounded-lg p-2">
              <span className="text-red-400 font-mono text-sm">x</span>
              <p className="text-white font-mono">{coords.x.toFixed(3)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2">
              <span className="text-blue-400 font-mono text-sm">y</span>
              <p className="text-white font-mono">{coords.y.toFixed(3)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2">
              <span className="text-green-400 font-mono text-sm">z</span>
              <p className="text-white font-mono">{coords.z.toFixed(3)}</p>
            </div>
          </div>
        </div>

        {/* State Information */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Quantum State</h3>

          {/* State vector notation */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <p className="text-gray-400 text-sm mb-2">State Vector</p>
            <p className="text-2xl font-mono text-white">
              |ψ⟩ = <span className="text-cyan-400">{amplitudes.alpha.toFixed(3)}</span>|0⟩ +{' '}
              <span className="text-purple-400">{amplitudes.beta.toFixed(3)}</span>|1⟩
            </p>
          </div>

          {/* Probabilities */}
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">P(|0⟩)</span>
                <span className="text-cyan-400 font-mono">{(amplitudes.prob0 * 100).toFixed(1)}%</span>
              </div>
              <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  initial={false}
                  animate={{ width: `${amplitudes.prob0 * 100}%` }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">P(|1⟩)</span>
                <span className="text-purple-400 font-mono">{(amplitudes.prob1 * 100).toFixed(1)}%</span>
              </div>
              <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={false}
                  animate={{ width: `${amplitudes.prob1 * 100}%` }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                />
              </div>
            </div>
          </div>

          {/* Angles */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Polar angle (θ)</p>
              <p className="text-white font-mono text-lg">
                {(qubitState.theta * 180 / Math.PI).toFixed(1)}°
              </p>
              <p className="text-xs text-gray-500">{qubitState.theta.toFixed(3)} rad</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Azimuthal angle (φ)</p>
              <p className="text-white font-mono text-lg">
                {(qubitState.phi * 180 / Math.PI).toFixed(1)}°
              </p>
              <p className="text-xs text-gray-500">{qubitState.phi.toFixed(3)} rad</p>
            </div>
          </div>

          {/* Preset States */}
          <div>
            <p className="text-gray-400 text-sm mb-2">Preset States</p>
            <div className="flex flex-wrap gap-2">
              {predefinedStates.map((preset) => (
                <motion.button
                  key={preset.name}
                  onClick={() => setPresetState(preset.state)}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 text-white font-mono text-sm hover:bg-slate-600 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseEnter={() => setShowInfo(preset.description)}
                  onMouseLeave={() => setShowInfo(null)}
                >
                  {preset.name}
                </motion.button>
              ))}
            </div>
          </div>

          {showInfo && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-sm text-gray-400 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
            >
              <Info className="w-4 h-4 inline mr-2 text-indigo-400" />
              {showInfo}
            </motion.p>
          )}
        </div>
      </div>

      {/* Gate Controls */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Apply Gates</h3>
          <button
            onClick={reset}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {gates.map((gate) => (
            <motion.button
              key={gate.name}
              onClick={() => applyGate(gate)}
              className="p-4 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold text-xl hover:from-indigo-500 hover:to-purple-500 transition-all"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onMouseEnter={() => setShowInfo(gate.description)}
              onMouseLeave={() => setShowInfo(null)}
            >
              {gate.name}
            </motion.button>
          ))}
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Click gates to apply them to the current state and watch the Bloch sphere update!
        </p>
      </div>

      {/* Multi-Qubit Visualization */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Multi-Qubit States</h3>
        <p className="text-gray-400 mb-6">
          Visualize measurement probability distributions for multi-qubit systems.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Bell State */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h4 className="font-semibold text-white mb-2">Bell State |Φ⁺⟩</h4>
            <p className="text-sm text-gray-400 mb-4">(|00⟩ + |11⟩) / √2</p>
            <div className="space-y-2">
              {['00', '01', '10', '11'].map((state) => {
                const prob = state === '00' || state === '11' ? 50 : 0
                return (
                  <div key={state} className="flex items-center gap-3">
                    <span className="font-mono text-indigo-400 w-12">|{state}⟩</span>
                    <div className="flex-1 h-6 bg-slate-700 rounded overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${prob}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="text-gray-400 w-12 text-right">{prob}%</span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-cyan-400 mt-3">
              Maximally entangled - measuring one qubit instantly determines the other!
            </p>
          </div>

          {/* GHZ State */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h4 className="font-semibold text-white mb-2">GHZ State (3 qubits)</h4>
            <p className="text-sm text-gray-400 mb-4">(|000⟩ + |111⟩) / √2</p>
            <div className="space-y-2">
              {['000', '001', '010', '011', '100', '101', '110', '111'].map((state) => {
                const prob = state === '000' || state === '111' ? 50 : 0
                return (
                  <div key={state} className="flex items-center gap-3">
                    <span className="font-mono text-indigo-400 w-12 text-sm">|{state}⟩</span>
                    <div className="flex-1 h-4 bg-slate-700 rounded overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${prob}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                      />
                    </div>
                    <span className="text-gray-400 w-12 text-right text-sm">{prob}%</span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-purple-400 mt-3">
              3-qubit entanglement - all or nothing correlation!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
