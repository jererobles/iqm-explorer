import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react'

// Gate operation parsed from code
export interface GateOperation {
  id: string
  gate: string
  qubits: number[]
  params?: number[]
  lineNumber: number
  code: string
}

// Quantum state at a specific point in execution
export interface QuantumState {
  // State vector probabilities per computational basis state
  probabilities: { state: string; probability: number }[]
  // Per-qubit Bloch sphere coordinates (theta, phi)
  qubitStates: { theta: number; phi: number }[]
  // Which qubits are entangled
  entanglements: [number, number][]
}

// A step in the circuit execution
export interface CircuitStep {
  operation: GateOperation | null // null for initial state
  stateAfter: QuantumState
}

interface QuantumContextType {
  // Code state
  code: string
  setCode: (code: string) => void

  // Parsed circuit
  numQubits: number
  operations: GateOperation[]
  steps: CircuitStep[]

  // Current execution position
  currentStep: number
  setCurrentStep: (step: number) => void
  currentLineNumber: number

  // Get state at a specific line
  getStateAtLine: (line: number) => QuantumState | null

  // Bidirectional sync
  updateCodeFromCircuit: (operations: GateOperation[]) => void

  // Simulation
  shots: number
  setShots: (shots: number) => void
  measurementResults: Record<string, number> | null
  isSimulating: boolean
  runSimulation: () => Promise<void>
}

const QuantumContext = createContext<QuantumContextType | null>(null)

// Gate matrices for Bloch sphere transformations
const GATE_TRANSFORMS: Record<string, (state: { theta: number; phi: number }) => { theta: number; phi: number }> = {
  H: (s) => {
    if (s.theta < 0.1) return { theta: Math.PI / 2, phi: 0 }
    if (s.theta > Math.PI - 0.1) return { theta: Math.PI / 2, phi: Math.PI }
    return { theta: Math.PI / 2 - s.theta + Math.PI / 2, phi: s.phi }
  },
  X: (s) => ({ theta: Math.PI - s.theta, phi: (s.phi + Math.PI) % (2 * Math.PI) }),
  Y: (s) => ({ theta: Math.PI - s.theta, phi: (-s.phi + 2 * Math.PI) % (2 * Math.PI) }),
  Z: (s) => ({ theta: s.theta, phi: (s.phi + Math.PI) % (2 * Math.PI) }),
  S: (s) => ({ theta: s.theta, phi: (s.phi + Math.PI / 2) % (2 * Math.PI) }),
  T: (s) => ({ theta: s.theta, phi: (s.phi + Math.PI / 4) % (2 * Math.PI) }),
}

// Parse Qiskit-style code into operations
function parseCode(code: string): { numQubits: number; operations: GateOperation[]; shots: number } {
  const lines = code.split('\n')
  const operations: GateOperation[] = []
  let numQubits = 2
  let shots = 1024

  // Detect number of qubits
  const qcMatch = code.match(/QuantumCircuit\s*\(\s*(\d+)/i)
  if (qcMatch) {
    numQubits = parseInt(qcMatch[1], 10)
  }

  // Detect shots
  const shotsMatch = code.match(/shots\s*=\s*(\d+)/)
  if (shotsMatch) {
    shots = parseInt(shotsMatch[1], 10)
  }

  // Parse gate operations
  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim()
    const lineNumber = lineIndex + 1

    // Hadamard
    const hMatch = trimmed.match(/\.h\s*\(\s*(\d+)\s*\)/i)
    if (hMatch) {
      operations.push({
        id: `h-${lineNumber}`,
        gate: 'H',
        qubits: [parseInt(hMatch[1], 10)],
        lineNumber,
        code: trimmed,
      })
      return
    }

    // X gate
    const xMatch = trimmed.match(/\.x\s*\(\s*(\d+)\s*\)/i)
    if (xMatch) {
      operations.push({
        id: `x-${lineNumber}`,
        gate: 'X',
        qubits: [parseInt(xMatch[1], 10)],
        lineNumber,
        code: trimmed,
      })
      return
    }

    // Y gate
    const yMatch = trimmed.match(/\.y\s*\(\s*(\d+)\s*\)/i)
    if (yMatch) {
      operations.push({
        id: `y-${lineNumber}`,
        gate: 'Y',
        qubits: [parseInt(yMatch[1], 10)],
        lineNumber,
        code: trimmed,
      })
      return
    }

    // Z gate
    const zMatch = trimmed.match(/\.z\s*\(\s*(\d+)\s*\)/i)
    if (zMatch) {
      operations.push({
        id: `z-${lineNumber}`,
        gate: 'Z',
        qubits: [parseInt(zMatch[1], 10)],
        lineNumber,
        code: trimmed,
      })
      return
    }

    // S gate
    const sMatch = trimmed.match(/\.s\s*\(\s*(\d+)\s*\)/i)
    if (sMatch) {
      operations.push({
        id: `s-${lineNumber}`,
        gate: 'S',
        qubits: [parseInt(sMatch[1], 10)],
        lineNumber,
        code: trimmed,
      })
      return
    }

    // T gate
    const tMatch = trimmed.match(/\.t\s*\(\s*(\d+)\s*\)/i)
    if (tMatch) {
      operations.push({
        id: `t-${lineNumber}`,
        gate: 'T',
        qubits: [parseInt(tMatch[1], 10)],
        lineNumber,
        code: trimmed,
      })
      return
    }

    // CNOT / CX
    const cxMatch = trimmed.match(/\.(?:cx|cnot)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i)
    if (cxMatch) {
      operations.push({
        id: `cx-${lineNumber}`,
        gate: 'CX',
        qubits: [parseInt(cxMatch[1], 10), parseInt(cxMatch[2], 10)],
        lineNumber,
        code: trimmed,
      })
      return
    }

    // CZ
    const czMatch = trimmed.match(/\.cz\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i)
    if (czMatch) {
      operations.push({
        id: `cz-${lineNumber}`,
        gate: 'CZ',
        qubits: [parseInt(czMatch[1], 10), parseInt(czMatch[2], 10)],
        lineNumber,
        code: trimmed,
      })
      return
    }

    // Rotation gates
    const rxMatch = trimmed.match(/\.rx\s*\(\s*([^,]+)\s*,\s*(\d+)\s*\)/i)
    if (rxMatch) {
      operations.push({
        id: `rx-${lineNumber}`,
        gate: 'RX',
        qubits: [parseInt(rxMatch[2], 10)],
        params: [parseAngle(rxMatch[1])],
        lineNumber,
        code: trimmed,
      })
      return
    }

    const ryMatch = trimmed.match(/\.ry\s*\(\s*([^,]+)\s*,\s*(\d+)\s*\)/i)
    if (ryMatch) {
      operations.push({
        id: `ry-${lineNumber}`,
        gate: 'RY',
        qubits: [parseInt(ryMatch[2], 10)],
        params: [parseAngle(ryMatch[1])],
        lineNumber,
        code: trimmed,
      })
      return
    }

    const rzMatch = trimmed.match(/\.rz\s*\(\s*([^,]+)\s*,\s*(\d+)\s*\)/i)
    if (rzMatch) {
      operations.push({
        id: `rz-${lineNumber}`,
        gate: 'RZ',
        qubits: [parseInt(rzMatch[2], 10)],
        params: [parseAngle(rzMatch[1])],
        lineNumber,
        code: trimmed,
      })
      return
    }

    // Measurement - single qubit
    const mMatch = trimmed.match(/\.measure\s*\(\s*(\d+)/i)
    if (mMatch) {
      operations.push({
        id: `m-${lineNumber}`,
        gate: 'M',
        qubits: [parseInt(mMatch[1], 10)],
        lineNumber,
        code: trimmed,
      })
      return
    }

    // Measurement - measure_all() measures all qubits at once
    const measureAllMatch = trimmed.match(/\.measure_all\s*\(\s*\)/i)
    if (measureAllMatch) {
      // Create a single measurement operation that includes all qubits
      const allQubits = Array.from({ length: numQubits }, (_, i) => i)
      operations.push({
        id: `mall-${lineNumber}`,
        gate: 'M',
        qubits: allQubits,
        lineNumber,
        code: trimmed,
      })
      return
    }
  })

  return { numQubits, operations, shots }
}

function parseAngle(angleStr: string): number {
  let expr = angleStr
    .toLowerCase()
    .replace(/pi/g, String(Math.PI))
    .replace(/\s+/g, '')

  try {
    return new Function(`return ${expr}`)() as number
  } catch {
    return parseFloat(angleStr) || 0
  }
}

// Calculate quantum state evolution through operations
function calculateSteps(numQubits: number, operations: GateOperation[]): CircuitStep[] {
  const steps: CircuitStep[] = []

  // Initial state: all qubits in |0>
  const initialQubitStates = Array(numQubits).fill(null).map(() => ({ theta: 0, phi: 0 }))
  const initialState: QuantumState = {
    probabilities: calculateProbabilities(initialQubitStates),
    qubitStates: initialQubitStates,
    entanglements: [],
  }

  steps.push({ operation: null, stateAfter: initialState })

  let currentQubitStates = [...initialQubitStates]
  let currentEntanglements: [number, number][] = []

  for (const op of operations) {
    const newQubitStates = [...currentQubitStates]
    const newEntanglements = [...currentEntanglements]

    if (op.gate === 'M') {
      // Measurement: collapse qubit(s) to |0⟩ or |1⟩ based on probability
      // Supports both single qubit measurement and measure_all (multiple qubits)
      for (const qubit of op.qubits) {
        if (qubit < numQubits) {
          const state = currentQubitStates[qubit]
          // Probability of measuring |1⟩
          const prob1 = Math.sin(state.theta / 2) ** 2
          // For visualization, collapse based on probability threshold
          // Use deterministic collapse: if prob > 0.5, collapse to |1⟩
          // In real simulation, this would be random
          if (prob1 > 0.5) {
            newQubitStates[qubit] = { theta: Math.PI, phi: 0 } // |1⟩ state
          } else {
            newQubitStates[qubit] = { theta: 0, phi: 0 } // |0⟩ state
          }
          // Measurement breaks entanglement
          const qubitIdx = qubit
          const filteredEntanglements = newEntanglements.filter(
            ([a, b]) => a !== qubitIdx && b !== qubitIdx
          )
          newEntanglements.length = 0
          newEntanglements.push(...filteredEntanglements)
        }
      }
    } else if (op.gate in GATE_TRANSFORMS && op.qubits.length === 1) {
      const qubit = op.qubits[0]
      if (qubit < numQubits) {
        newQubitStates[qubit] = GATE_TRANSFORMS[op.gate](currentQubitStates[qubit])
      }
    } else if (op.gate === 'CX' || op.gate === 'CZ') {
      const [control, target] = op.qubits
      if (control < numQubits && target < numQubits) {
        // Simplified entanglement model
        const controlState = currentQubitStates[control]

        // If control is in superposition, create entanglement
        if (Math.abs(controlState.theta - Math.PI / 2) < 0.1) {
          if (!newEntanglements.some(([a, b]) =>
            (a === control && b === target) || (a === target && b === control)
          )) {
            newEntanglements.push([control, target])
          }
          newQubitStates[target] = { theta: Math.PI / 2, phi: 0 }
        } else if (controlState.theta > Math.PI / 2 && op.gate === 'CX') {
          // Control is |1>, apply X to target
          newQubitStates[target] = GATE_TRANSFORMS.X(currentQubitStates[target])
        }
      }
    }

    const newState: QuantumState = {
      probabilities: calculateProbabilities(newQubitStates),
      qubitStates: newQubitStates.map(s => ({ ...s })),
      entanglements: newEntanglements,
    }

    steps.push({ operation: op, stateAfter: newState })
    currentQubitStates = newQubitStates
    currentEntanglements = newEntanglements
  }

  return steps
}

// Calculate measurement probabilities from qubit states
function calculateProbabilities(qubitStates: { theta: number; phi: number }[]): { state: string; probability: number }[] {
  const n = qubitStates.length
  const numStates = 1 << n
  const probs: { state: string; probability: number }[] = []

  for (let i = 0; i < numStates; i++) {
    let probability = 1
    const binaryStr = i.toString(2).padStart(n, '0')

    for (let q = 0; q < n; q++) {
      const bit = parseInt(binaryStr[q])
      const alpha = Math.cos(qubitStates[q].theta / 2)
      const beta = Math.sin(qubitStates[q].theta / 2)

      if (bit === 0) {
        probability *= alpha * alpha
      } else {
        probability *= beta * beta
      }
    }

    if (probability > 1e-10) {
      probs.push({ state: binaryStr, probability })
    }
  }

  return probs.sort((a, b) => b.probability - a.probability)
}

// Generate code from operations
function generateCodeFromOperations(numQubits: number, operations: GateOperation[], shots: number): string {
  let code = `# Quantum Circuit
from qiskit import QuantumCircuit

# Create a ${numQubits}-qubit circuit
qc = QuantumCircuit(${numQubits})

`

  for (const op of operations) {
    const qubit = op.qubits[0]
    switch (op.gate) {
      case 'H':
        code += `qc.h(${qubit})\n`
        break
      case 'X':
        code += `qc.x(${qubit})\n`
        break
      case 'Y':
        code += `qc.y(${qubit})\n`
        break
      case 'Z':
        code += `qc.z(${qubit})\n`
        break
      case 'S':
        code += `qc.s(${qubit})\n`
        break
      case 'T':
        code += `qc.t(${qubit})\n`
        break
      case 'CX':
        code += `qc.cx(${op.qubits[0]}, ${op.qubits[1]})\n`
        break
      case 'CZ':
        code += `qc.cz(${op.qubits[0]}, ${op.qubits[1]})\n`
        break
      case 'RX':
        code += `qc.rx(${op.params?.[0] || Math.PI / 2}, ${qubit})\n`
        break
      case 'RY':
        code += `qc.ry(${op.params?.[0] || Math.PI / 2}, ${qubit})\n`
        break
      case 'RZ':
        code += `qc.rz(${op.params?.[0] || Math.PI / 2}, ${qubit})\n`
        break
      case 'M':
        code += `qc.measure(${qubit}, ${qubit})  # Measure qubit ${qubit}\n`
        break
    }
  }

  code += `
# Measure all qubits
qc.measure_all()

# Number of shots
shots = ${shots}
`

  return code
}

const DEFAULT_CODE = `# Bell State Circuit
from qiskit import QuantumCircuit

# Create a 2-qubit circuit
qc = QuantumCircuit(2)

# Apply Hadamard to qubit 0 (creates superposition)
qc.h(0)

# Apply CNOT with control=0, target=1 (creates entanglement)
qc.cx(0, 1)

# Measure all qubits
qc.measure_all()

# Number of shots
shots = 1024
`

export function QuantumProvider({ children }: { children: ReactNode }) {
  const [code, setCodeState] = useState(DEFAULT_CODE)
  const [currentStep, setCurrentStep] = useState(0)
  const [shots, setShots] = useState(1024)
  const [measurementResults, setMeasurementResults] = useState<Record<string, number> | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)

  // Parse code into operations
  const { numQubits, operations, shots: parsedShots } = useMemo(
    () => parseCode(code),
    [code]
  )

  // Calculate state at each step
  const steps = useMemo(
    () => calculateSteps(numQubits, operations),
    [numQubits, operations]
  )

  // Update shots from parsed code
  useMemo(() => {
    if (parsedShots !== shots) {
      setShots(parsedShots)
    }
  }, [parsedShots])

  // Current line number based on step
  const currentLineNumber = useMemo(() => {
    if (currentStep === 0 || currentStep > operations.length) return 0
    return operations[currentStep - 1]?.lineNumber || 0
  }, [currentStep, operations])

  // Get quantum state at a specific line number
  const getStateAtLine = useCallback((line: number): QuantumState | null => {
    // Find the latest operation at or before this line
    let stepIndex = 0
    for (let i = 0; i < operations.length; i++) {
      if (operations[i].lineNumber <= line) {
        stepIndex = i + 1
      }
    }
    return steps[stepIndex]?.stateAfter || null
  }, [operations, steps])

  // Set code with reset
  const setCode = useCallback((newCode: string) => {
    setCodeState(newCode)
    setCurrentStep(0)
    setMeasurementResults(null)
  }, [])

  // Update code from circuit builder
  const updateCodeFromCircuit = useCallback((newOperations: GateOperation[]) => {
    const newCode = generateCodeFromOperations(numQubits, newOperations, shots)
    setCodeState(newCode)
    setMeasurementResults(null)
  }, [numQubits, shots])

  // Run simulation
  const runSimulation = useCallback(async () => {
    setIsSimulating(true)

    // Import simulator dynamically to avoid circular deps
    const { simulateCircuit, getMeasurementCounts } = await import('../services/simulator')

    try {
      await new Promise(resolve => setTimeout(resolve, 300)) // Small delay for UX
      const result = simulateCircuit(code)
      const counts = getMeasurementCounts(result.result.measurements?.circuit || [])
      setMeasurementResults(counts)
      // Jump to final step after simulation
      setCurrentStep(steps.length - 1)
    } catch (error) {
      console.error('Simulation error:', error)
    } finally {
      setIsSimulating(false)
    }
  }, [code, steps.length])

  // Auto-run simulation when circuit changes
  useEffect(() => {
    if (operations.length > 0) {
      // Debounce simulation
      const timer = setTimeout(async () => {
        setIsSimulating(true)
        try {
          const { simulateCircuit, getMeasurementCounts } = await import('../services/simulator')
          const result = simulateCircuit(code)
          const counts = getMeasurementCounts(result.result.measurements?.circuit || [])
          setMeasurementResults(counts)
        } catch (error) {
          console.error('Auto-simulation error:', error)
        } finally {
          setIsSimulating(false)
        }
      }, 500) // 500ms debounce

      return () => clearTimeout(timer)
    }
  }, [code, operations.length])

  const value: QuantumContextType = {
    code,
    setCode,
    numQubits,
    operations,
    steps,
    currentStep,
    setCurrentStep,
    currentLineNumber,
    getStateAtLine,
    updateCodeFromCircuit,
    shots,
    setShots,
    measurementResults,
    isSimulating,
    runSimulation,
  }

  return (
    <QuantumContext.Provider value={value}>
      {children}
    </QuantumContext.Provider>
  )
}

export function useQuantum() {
  const context = useContext(QuantumContext)
  if (!context) {
    throw new Error('useQuantum must be used within a QuantumProvider')
  }
  return context
}
