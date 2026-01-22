import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, BookOpen, CheckCircle, Play, Code } from 'lucide-react'

interface Module {
  id: string
  title: string
  description: string
  lessons: Lesson[]
  icon: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

interface Lesson {
  id: string
  title: string
  duration: string
  completed: boolean
  content: string
  codeExample?: string
}

const modules: Module[] = [
  {
    id: 'fundamentals',
    title: 'Quantum Fundamentals',
    description: 'Understanding qubits, superposition, and measurement',
    icon: '⚛️',
    difficulty: 'beginner',
    lessons: [
      {
        id: 'qubits',
        title: 'What is a Qubit?',
        duration: '10 min',
        completed: false,
        content: `
# The Quantum Bit (Qubit)

Unlike classical bits that can only be 0 or 1, a **qubit** can exist in a superposition of both states simultaneously.

## Mathematical Representation

A qubit state is written as:
|ψ⟩ = α|0⟩ + β|1⟩

Where:
- |0⟩ and |1⟩ are the computational basis states
- α and β are complex probability amplitudes
- |α|² + |β|² = 1 (normalization condition)

## The Bloch Sphere

Qubits can be visualized as points on a sphere called the **Bloch sphere**. The poles represent |0⟩ and |1⟩, while points on the equator represent equal superpositions.

## Key Concepts

1. **Superposition**: A qubit can be in multiple states at once
2. **Measurement**: Observing a qubit collapses it to |0⟩ or |1⟩
3. **Probability**: |α|² gives probability of measuring 0, |β|² for measuring 1
        `,
        codeExample: `from iqm.qiskit_iqm import IQMProvider
from qiskit import QuantumCircuit

# Create a single qubit circuit
qc = QuantumCircuit(1, 1)

# Put qubit in superposition with Hadamard gate
qc.h(0)

# Measure the qubit
qc.measure(0, 0)

print(qc.draw())`
      },
      {
        id: 'superposition',
        title: 'Superposition Explained',
        duration: '15 min',
        completed: false,
        content: `
# Superposition: The Quantum Advantage

**Superposition** is the fundamental property that gives quantum computers their power.

## Classical vs Quantum

| Classical Bit | Quantum Bit |
|---------------|-------------|
| Either 0 or 1 | Both 0 AND 1 |
| Deterministic | Probabilistic |
| Single state  | Superposition |

## Creating Superposition

The **Hadamard gate (H)** transforms a qubit into superposition:

H|0⟩ = (|0⟩ + |1⟩) / √2
H|1⟩ = (|0⟩ - |1⟩) / √2

## Why It Matters

With n qubits in superposition, we can represent 2ⁿ states simultaneously:
- 2 qubits → 4 states
- 10 qubits → 1,024 states
- 50 qubits → ~10¹⁵ states!

This exponential scaling enables quantum parallelism.
        `,
        codeExample: `from qiskit import QuantumCircuit
from qiskit.visualization import plot_histogram

# Create 3-qubit superposition
qc = QuantumCircuit(3, 3)

# Apply Hadamard to all qubits
qc.h([0, 1, 2])

# Now we have 2³ = 8 states in superposition!
qc.measure([0, 1, 2], [0, 1, 2])

# Running this gives roughly equal probabilities
# for all 8 possible outcomes: 000, 001, ..., 111`
      },
      {
        id: 'measurement',
        title: 'Quantum Measurement',
        duration: '12 min',
        completed: false,
        content: `
# Measurement: Collapsing the Wave Function

When we measure a qubit, the superposition **collapses** to a definite state.

## The Measurement Problem

Before measurement: |ψ⟩ = α|0⟩ + β|1⟩
After measurement: Either |0⟩ or |1⟩

## Probabilities

- P(0) = |α|² (probability of measuring 0)
- P(1) = |β|² (probability of measuring 1)

## Multiple Measurements

Since measurement is probabilistic, we run quantum circuits many times ("shots") to estimate probabilities:

\`\`\`
1000 shots of |ψ⟩ = (|0⟩ + |1⟩)/√2
Expected: ~500 zeros, ~500 ones
\`\`\`

## IQM Quantum Computers

On IQM hardware, measurement is performed using resonators coupled to transmon qubits, achieving high-fidelity readout.
        `
      }
    ]
  },
  {
    id: 'gates',
    title: 'Quantum Gates',
    description: 'Master the building blocks of quantum circuits',
    icon: '🚪',
    difficulty: 'beginner',
    lessons: [
      {
        id: 'single-qubit',
        title: 'Single-Qubit Gates',
        duration: '20 min',
        completed: false,
        content: `
# Single-Qubit Gates

Quantum gates are the operations we apply to qubits. They're represented as unitary matrices.

## Essential Gates

### Pauli Gates
- **X Gate** (NOT): Flips |0⟩ ↔ |1⟩
- **Y Gate**: Rotation around Y-axis
- **Z Gate**: Phase flip (|1⟩ → -|1⟩)

### Rotation Gates
- **Rx(θ)**: Rotation around X-axis by angle θ
- **Ry(θ)**: Rotation around Y-axis by angle θ
- **Rz(θ)**: Rotation around Z-axis by angle θ

### Other Important Gates
- **H (Hadamard)**: Creates superposition
- **S Gate**: π/2 phase gate
- **T Gate**: π/4 phase gate

## IQM Native Gates

IQM quantum computers natively support:
- **PRX (Phased RX)**: Rotation with phase
- **CZ (Controlled-Z)**: Two-qubit entangling gate
        `,
        codeExample: `from qiskit import QuantumCircuit
import numpy as np

qc = QuantumCircuit(1)

# Pauli X (NOT gate)
qc.x(0)

# Hadamard
qc.h(0)

# Rotation gates
qc.rx(np.pi/4, 0)  # Rotate around X
qc.ry(np.pi/2, 0)  # Rotate around Y
qc.rz(np.pi, 0)    # Rotate around Z

print(qc.draw())`
      },
      {
        id: 'two-qubit',
        title: 'Two-Qubit Gates',
        duration: '25 min',
        completed: false,
        content: `
# Two-Qubit Gates: Creating Entanglement

Two-qubit gates are essential for creating **entanglement** - the quantum correlation between qubits.

## CNOT (Controlled-NOT)

The CNOT gate flips the target qubit if the control qubit is |1⟩:

| Control | Target | Result |
|---------|--------|--------|
| 0 | 0 | 0 0 |
| 0 | 1 | 0 1 |
| 1 | 0 | 1 1 |
| 1 | 1 | 1 0 |

## CZ (Controlled-Z)

The CZ gate applies a Z gate to the target if control is |1⟩.
This is the **native two-qubit gate on IQM hardware**.

## Creating Bell States

Bell states are maximally entangled two-qubit states:

|Φ⁺⟩ = (|00⟩ + |11⟩) / √2

Created with: H on qubit 0, then CNOT(0→1)
        `,
        codeExample: `from qiskit import QuantumCircuit

# Create Bell state (maximally entangled)
qc = QuantumCircuit(2, 2)

# Hadamard on first qubit
qc.h(0)

# CNOT with qubit 0 as control
qc.cx(0, 1)

# Measure both qubits
qc.measure([0, 1], [0, 1])

# Results will be 00 or 11 with 50% each
# NEVER 01 or 10 - that's entanglement!
print(qc.draw())`
      }
    ]
  },
  {
    id: 'algorithms',
    title: 'Quantum Algorithms',
    description: 'Learn famous quantum algorithms and their applications',
    icon: '🧮',
    difficulty: 'intermediate',
    lessons: [
      {
        id: 'deutsch',
        title: 'Deutsch-Jozsa Algorithm',
        duration: '30 min',
        completed: false,
        content: `
# Deutsch-Jozsa Algorithm

The first algorithm to demonstrate quantum speedup!

## The Problem

Given a function f(x) that is either:
- **Constant**: f(x) = 0 for all x, OR f(x) = 1 for all x
- **Balanced**: f(x) = 0 for half of inputs, f(x) = 1 for other half

Determine if f is constant or balanced.

## Classical vs Quantum

- **Classical**: Need up to 2^(n-1) + 1 queries (worst case)
- **Quantum**: Only 1 query needed!

## How It Works

1. Initialize qubits in superposition
2. Apply the oracle (black box implementing f)
3. Apply Hadamard gates
4. Measure: all zeros = constant, otherwise = balanced
        `,
        codeExample: `from qiskit import QuantumCircuit

def deutsch_jozsa(oracle_type='constant'):
    n = 3  # number of input qubits
    qc = QuantumCircuit(n + 1, n)

    # Initialize auxiliary qubit to |1⟩
    qc.x(n)

    # Apply Hadamard to all qubits
    qc.h(range(n + 1))

    # Apply oracle (example: balanced)
    if oracle_type == 'balanced':
        for i in range(n):
            qc.cx(i, n)
    # constant oracle does nothing

    # Apply Hadamard to input qubits
    qc.h(range(n))

    # Measure
    qc.measure(range(n), range(n))

    return qc

circuit = deutsch_jozsa('balanced')
print(circuit.draw())`
      },
      {
        id: 'grover',
        title: "Grover's Search Algorithm",
        duration: '45 min',
        completed: false,
        content: `
# Grover's Search Algorithm

Quadratic speedup for unstructured search!

## The Problem

Find a specific item in an unsorted database of N items.

## Speedup

- **Classical**: O(N) queries on average
- **Quantum**: O(√N) queries

For N = 1,000,000:
- Classical: ~500,000 queries
- Quantum: ~1,000 queries

## Algorithm Steps

1. **Initialize**: Put all qubits in equal superposition
2. **Oracle**: Mark the target state with negative phase
3. **Diffusion**: Amplify the marked state's amplitude
4. **Repeat**: Steps 2-3 about √N times
5. **Measure**: High probability of finding target

## Applications

- Database search
- Optimization problems
- Cryptographic attacks (AES key search)
        `
      }
    ]
  },
  {
    id: 'iqm-hardware',
    title: 'IQM Hardware',
    description: 'Deep dive into IQM quantum processors',
    icon: '🖥️',
    difficulty: 'advanced',
    lessons: [
      {
        id: 'architecture',
        title: 'IQM Quantum Architectures',
        duration: '25 min',
        completed: false,
        content: `
# IQM Quantum Computer Architectures

IQM builds superconducting quantum computers with various architectures.

## Available Systems

### Garnet (20 qubits)
- Square lattice topology
- High connectivity
- Production-ready

### Emerald (54 qubits)
- Larger scale computations
- Advanced error mitigation

### Deneb
- Research-focused system
- Novel qubit arrangements

## Superconducting Technology

IQM uses **transmon qubits**:
- Superconducting circuits cooled to ~15 millikelvin
- Operated with microwave pulses
- Native gates: PRX and CZ

## Star Architecture

Some IQM systems use a star topology with:
- Computational qubits around a central resonator
- Move gates for qubit shuttling
- Enhanced connectivity
        `,
        codeExample: `from iqm.iqm_client import IQMClient

# Connect to IQM quantum computer
client = IQMClient("https://your-iqm-server.com")

# Get quantum architecture information
architecture = client.get_dynamic_quantum_architecture()

print(f"Qubits: {architecture.qubits}")
print(f"Available operations: {architecture.operations}")
print(f"Qubit connectivity: {architecture.qubit_connectivity}")`
      },
      {
        id: 'transpilation',
        title: 'Circuit Transpilation for IQM',
        duration: '30 min',
        completed: false,
        content: `
# Transpiling Circuits for IQM Hardware

Real quantum hardware has constraints. Transpilation adapts circuits to hardware.

## Why Transpile?

1. **Native Gates**: Convert to PRX and CZ
2. **Connectivity**: Route qubits for 2-qubit gates
3. **Optimization**: Reduce gate count and depth

## IQM Transpilation Features

### Move Gates
For star architectures, move gates shuttle qubit states:

\`\`\`python
from iqm.iqm_client import transpile_insert_moves
circuit_with_moves = transpile_insert_moves(circuit, architecture)
\`\`\`

### Optimization Passes
- Single-qubit gate fusion
- RZ gate optimization
- Redundant gate cancellation

## Best Practices

1. Design for native gate set when possible
2. Minimize circuit depth
3. Consider qubit connectivity in circuit design
4. Use IQM's built-in transpilation
        `,
        codeExample: `from iqm.qiskit_iqm import IQMProvider
from qiskit import transpile

# Connect to IQM
provider = IQMProvider("https://your-iqm-server.com")
backend = provider.get_backend()

# Create your circuit
from qiskit import QuantumCircuit
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)

# Transpile for IQM hardware
transpiled = transpile(qc, backend=backend, optimization_level=2)

print("Original depth:", qc.depth())
print("Transpiled depth:", transpiled.depth())
print(transpiled.draw())`
      }
    ]
  }
]

const difficultyColors = {
  beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30'
}

export default function LearningModules() {
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  return (
    <div className="space-y-8">
      {/* Module Selection */}
      {!selectedModule && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {modules.map((module, index) => (
            <motion.div
              key={module.id}
              className="glass-card rounded-2xl p-6 cursor-pointer group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedModule(module)}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl">{module.icon}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${difficultyColors[module.difficulty]}`}>
                  {module.difficulty}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                {module.title}
              </h3>
              <p className="text-gray-400 text-sm mb-4">{module.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {module.lessons.length} lessons
                </span>
                <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Lesson List */}
      {selectedModule && !selectedLesson && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <button
            onClick={() => setSelectedModule(null)}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-6 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Modules
          </button>

          <div className="glass-card rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-5xl">{selectedModule.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedModule.title}</h2>
                <p className="text-gray-400">{selectedModule.description}</p>
              </div>
            </div>

            <div className="space-y-3">
              {selectedModule.lessons.map((lesson, index) => (
                <motion.div
                  key={lesson.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 cursor-pointer group transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedLesson(lesson)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      lesson.completed ? 'bg-green-500/20' : 'bg-indigo-500/20'
                    }`}>
                      {lesson.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Play className="w-5 h-5 text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-white group-hover:text-indigo-300 transition-colors">
                        {lesson.title}
                      </h4>
                      <p className="text-sm text-gray-500">{lesson.duration}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Lesson Content */}
      {selectedLesson && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <button
            onClick={() => setSelectedLesson(null)}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-6 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Lessons
          </button>

          <div className="glass-card rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="w-6 h-6 text-indigo-400" />
              <h2 className="text-2xl font-bold text-white">{selectedLesson.title}</h2>
            </div>

            {/* Render markdown-like content */}
            <div className="prose prose-invert max-w-none">
              {selectedLesson.content.split('\n').map((line, i) => {
                if (line.startsWith('# ')) {
                  return <h1 key={i} className="text-2xl font-bold text-white mt-6 mb-4">{line.slice(2)}</h1>
                }
                if (line.startsWith('## ')) {
                  return <h2 key={i} className="text-xl font-semibold text-indigo-300 mt-5 mb-3">{line.slice(3)}</h2>
                }
                if (line.startsWith('### ')) {
                  return <h3 key={i} className="text-lg font-semibold text-purple-300 mt-4 mb-2">{line.slice(4)}</h3>
                }
                if (line.startsWith('- **')) {
                  const match = line.match(/- \*\*(.+?)\*\*:?\s*(.*)/)
                  if (match) {
                    return (
                      <p key={i} className="text-gray-300 ml-4 my-1">
                        <span className="text-cyan-400 font-semibold">{match[1]}</span>
                        {match[2] && `: ${match[2]}`}
                      </p>
                    )
                  }
                }
                if (line.startsWith('|')) {
                  return null // Skip table formatting for now
                }
                if (line.trim() === '') {
                  return <br key={i} />
                }
                // Handle inline bold
                const parts = line.split(/\*\*(.+?)\*\*/g)
                return (
                  <p key={i} className="text-gray-300 my-2 leading-relaxed">
                    {parts.map((part, j) =>
                      j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part
                    )}
                  </p>
                )
              })}
            </div>

            {/* Code Example */}
            {selectedLesson.codeExample && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <Code className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-semibold text-white">Try it yourself</h3>
                </div>
                <div className="code-block">
                  <div className="code-header">
                    <span className="text-sm text-gray-400">Python</span>
                    <button className="text-xs text-indigo-400 hover:text-indigo-300">
                      Copy code
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto">
                    <code className="text-sm text-gray-300 font-mono">
                      {selectedLesson.codeExample}
                    </code>
                  </pre>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
              <button className="px-4 py-2 rounded-lg bg-slate-700 text-gray-300 hover:bg-slate-600 transition-colors">
                Previous Lesson
              </button>
              <button className="btn-quantum">
                Mark Complete & Continue
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
