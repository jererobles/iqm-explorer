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
import ProbabilityLandscape from './quantum3d/ProbabilityLandscape'
import AmplitudeWave3D from './quantum3d/AmplitudeWave3D'
import AmplitudeRing from './quantum3d/AmplitudeRing'
import QuantumParticleField from './quantum3d/QuantumParticleField'
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

// Categorized example circuits with real-world applications
const EXAMPLE_CATEGORIES = [
  {
    name: 'Fundamentals',
    description: 'Core quantum concepts',
    examples: [
      {
        name: 'Bell State',
        description: 'Quantum entanglement basics',
        code: `# ═══════════════════════════════════════════════════════════
# BELL STATE - The Foundation of Quantum Entanglement
# ═══════════════════════════════════════════════════════════
#
# WHAT YOU'LL LEARN:
# • How entanglement correlates qubits instantly
# • The building block for quantum teleportation & cryptography
#
# REAL-WORLD USE: Quantum key distribution (QKD) for unhackable
# encryption - used by banks and governments today!
# ═══════════════════════════════════════════════════════════

from qiskit import QuantumCircuit

qc = QuantumCircuit(2)

# Step 1: Create superposition on qubit 0
# This puts qubit 0 in state |+⟩ = (|0⟩ + |1⟩)/√2
qc.h(0)

# Step 2: Entangle qubits with CNOT
# Now measuring one qubit instantly determines the other!
# Result: |Φ+⟩ = (|00⟩ + |11⟩)/√2 - the Bell state
qc.cx(0, 1)

qc.measure_all()
shots = 1024

# TRY THIS: Run multiple times - you'll always get 00 or 11,
# never 01 or 10. That's entanglement in action!
`,
      },
      {
        name: 'Superposition',
        description: 'Quantum parallelism',
        code: `# ═══════════════════════════════════════════════════════════
# SUPERPOSITION - Quantum's Secret Weapon
# ═══════════════════════════════════════════════════════════
#
# WHAT YOU'LL LEARN:
# • A qubit can be 0 AND 1 simultaneously
# • This enables quantum parallelism
#
# WHY IT MATTERS: N qubits in superposition = 2^N states at once
# 50 qubits = more states than atoms in Earth!
# ═══════════════════════════════════════════════════════════

from qiskit import QuantumCircuit

qc = QuantumCircuit(1)

# The Hadamard gate: |0⟩ → |+⟩ = (|0⟩ + |1⟩)/√2
# 50% chance of 0, 50% chance of 1
qc.h(0)

qc.measure_all()
shots = 1024

# TRY THIS: Run 1024 shots - you'll get roughly 512 zeros
# and 512 ones. True quantum randomness!
`,
      },
      {
        name: 'Interference',
        description: 'Wave-like quantum behavior',
        code: `# ═══════════════════════════════════════════════════════════
# QUANTUM INTERFERENCE - Waves That Compute
# ═══════════════════════════════════════════════════════════
#
# WHAT YOU'LL LEARN:
# • Quantum states interfere like waves
# • H-Z-H sequence = X gate (bit flip!)
#
# WHY IT MATTERS: Interference lets us amplify right answers
# and cancel wrong ones - the heart of quantum speedup
# ═══════════════════════════════════════════════════════════

from qiskit import QuantumCircuit

qc = QuantumCircuit(1)

# Watch the interference: H → Z → H = X
qc.h(0)  # |0⟩ → |+⟩ = (|0⟩ + |1⟩)/√2
qc.z(0)  # |+⟩ → |−⟩ = (|0⟩ - |1⟩)/√2  (phase flip)
qc.h(0)  # |−⟩ → |1⟩ (interference!)

qc.measure_all()
shots = 1024

# RESULT: Always 1! The phases interfere constructively
# for |1⟩ and destructively for |0⟩
`,
      },
      {
        name: 'GHZ State',
        description: '3-qubit entanglement',
        code: `# ═══════════════════════════════════════════════════════════
# GHZ STATE - Multi-Party Quantum Correlations
# ═══════════════════════════════════════════════════════════
#
# Named after Greenberger, Horne, and Zeilinger (1989)
#
# WHAT YOU'LL LEARN:
# • Extend entanglement beyond 2 qubits
# • Create maximally entangled states
#
# REAL-WORLD USE: Quantum secret sharing - a secret is split
# so that ALL parties must cooperate to recover it
# ═══════════════════════════════════════════════════════════

from qiskit import QuantumCircuit

qc = QuantumCircuit(3)

# Create 3-qubit entanglement chain
qc.h(0)      # Superposition on first qubit
qc.cx(0, 1)  # Entangle qubit 0 → 1
qc.cx(1, 2)  # Extend entanglement to qubit 2

# Result: |GHZ⟩ = (|000⟩ + |111⟩)/√2
qc.measure_all()
shots = 1024

# TRY THIS: You'll only see 000 or 111 - all three qubits
# are perfectly correlated!
`,
      },
    ],
  },
  {
    name: 'Real-World Algorithms',
    description: 'Industry applications',
    examples: [
      {
        name: 'VQE (Chemistry)',
        description: 'Drug discovery & materials',
        code: `# ═══════════════════════════════════════════════════════════
# VQE - VARIATIONAL QUANTUM EIGENSOLVER
# ═══════════════════════════════════════════════════════════
#
# THE PROBLEM: Simulating molecules is exponentially hard
# for classical computers. VQE makes it quantum-tractable!
#
# REAL-WORLD IMPACT:
# • Roche & Biogen: Drug discovery simulations
# • IBM: Simulated lithium hydride (LiH) molecule
# • Could revolutionize battery & catalyst design
#
# HOW IT WORKS: Hybrid quantum-classical optimization
# 1. Quantum computer prepares trial wave function
# 2. Measure energy
# 3. Classical optimizer adjusts parameters
# 4. Repeat until minimum energy found
# ═══════════════════════════════════════════════════════════

from qiskit import QuantumCircuit

qc = QuantumCircuit(2)

# Hardware-efficient ansatz for H2 molecule simulation
# These parameters would be optimized classically

# Layer 1: Create initial superposition
qc.ry(0.5, 0)  # Parameterized rotation (θ₁ = 0.5)
qc.ry(0.8, 1)  # Parameterized rotation (θ₂ = 0.8)

# Entangling layer - captures electron correlation
qc.cx(0, 1)

# Layer 2: More variational freedom
qc.ry(1.2, 0)  # θ₃ = 1.2
qc.ry(0.3, 1)  # θ₄ = 0.3

qc.measure_all()
shots = 1024

# In real VQE, you'd measure the molecular Hamiltonian
# and optimize θ values to find ground state energy
`,
      },
      {
        name: 'QAOA (Optimization)',
        description: 'Logistics & scheduling',
        code: `# ═══════════════════════════════════════════════════════════
# QAOA - QUANTUM APPROXIMATE OPTIMIZATION
# ═══════════════════════════════════════════════════════════
#
# THE PROBLEM: Combinatorial optimization is NP-hard
# (traveling salesman, job scheduling, portfolio optimization)
#
# REAL-WORLD IMPACT:
# • BMW: Vehicle sensor placement optimization
# • JPMorgan: Portfolio optimization research
# • Airbus: Aircraft loading optimization
#
# THIS EXAMPLE: MaxCut problem
# Goal: Partition graph nodes to maximize edges between groups
# Applications: Network design, circuit layout, clustering
# ═══════════════════════════════════════════════════════════

from qiskit import QuantumCircuit

qc = QuantumCircuit(4)

# QAOA Layer 1: Problem encoding + mixing
# γ (gamma) encodes the problem, β (beta) explores solutions

# Initial superposition - all possible cuts equally weighted
qc.h(0)
qc.h(1)
qc.h(2)
qc.h(3)

# Cost layer: encode graph edges (γ = 0.8)
# Edge 0-1
qc.cx(0, 1)
qc.rz(0.8, 1)
qc.cx(0, 1)
# Edge 1-2
qc.cx(1, 2)
qc.rz(0.8, 2)
qc.cx(1, 2)
# Edge 2-3
qc.cx(2, 3)
qc.rz(0.8, 3)
qc.cx(2, 3)

# Mixer layer: explore solution space (β = 0.4)
qc.rx(0.8, 0)
qc.rx(0.8, 1)
qc.rx(0.8, 2)
qc.rx(0.8, 3)

qc.measure_all()
shots = 1024

# Best cuts have nodes split: e.g., {0,2} vs {1,3}
`,
      },
      {
        name: "Grover's Search",
        description: 'Database search speedup',
        code: `# ═══════════════════════════════════════════════════════════
# GROVER'S ALGORITHM - Quadratic Speedup for Search
# ═══════════════════════════════════════════════════════════
#
# THE PROBLEM: Finding a needle in a haystack
# Classical: O(N) checks needed
# Quantum: O(√N) - quadratic speedup!
#
# REAL-WORLD IMPACT:
# • Database search acceleration
# • Cryptographic key search
# • Optimization problem solving
#
# THIS EXAMPLE: Search for |11⟩ among 4 states
# Classical needs ~2 guesses, Grover finds it in 1 iteration!
# ═══════════════════════════════════════════════════════════

from qiskit import QuantumCircuit

qc = QuantumCircuit(2)

# Step 1: Create uniform superposition (all states equal)
qc.h(0)
qc.h(1)

# Step 2: Oracle - marks the solution |11⟩ with negative phase
# This is a controlled-Z: flips phase only when both qubits are |1⟩
qc.cz(0, 1)

# Step 3: Diffusion operator (amplitude amplification)
# Reflects amplitudes about the mean
qc.h(0)
qc.h(1)
qc.z(0)
qc.z(1)
qc.cz(0, 1)
qc.h(0)
qc.h(1)

qc.measure_all()
shots = 1024

# RESULT: |11⟩ now has ~100% probability!
# The marked state got amplified, others cancelled out
`,
      },
      {
        name: 'Quantum Teleportation',
        description: 'State transfer protocol',
        code: `# ═══════════════════════════════════════════════════════════
# QUANTUM TELEPORTATION - Transfer States Instantly
# ═══════════════════════════════════════════════════════════
#
# NOT sci-fi teleportation! This transfers quantum STATE
# (not matter) using entanglement + classical communication
#
# REAL-WORLD IMPACT:
# • Quantum internet backbone protocol
# • Demonstrated over 1,400 km via satellite (China, 2017)
# • Essential for distributed quantum computing
#
# SETUP:
# • Qubit 0: State to teleport (prepared in |+⟩)
# • Qubit 1 & 2: Pre-shared entangled pair (Bell state)
# • Goal: Transfer qubit 0's state to qubit 2
# ═══════════════════════════════════════════════════════════

from qiskit import QuantumCircuit

qc = QuantumCircuit(3)

# Prepare the state to teleport: |+⟩ on qubit 0
qc.h(0)

# Create entangled pair between qubits 1 and 2
# (These would be pre-shared between Alice and Bob)
qc.h(1)
qc.cx(1, 2)

# TELEPORTATION PROTOCOL (Alice's operations)
# Bell measurement on qubits 0 and 1
qc.cx(0, 1)
qc.h(0)

# Bob's corrections (based on Alice's measurement)
# In real protocol, these are classically controlled
qc.cx(1, 2)
qc.cz(0, 2)

qc.measure_all()
shots = 1024

# Qubit 2 now has the original state of qubit 0!
`,
      },
    ],
  },
  {
    name: 'Finance & ML',
    description: 'Quantum advantage areas',
    examples: [
      {
        name: 'Portfolio Optimization',
        description: 'Risk-return balancing',
        code: `# ═══════════════════════════════════════════════════════════
# QUANTUM PORTFOLIO OPTIMIZATION
# ═══════════════════════════════════════════════════════════
#
# THE PROBLEM: Select assets to maximize return while
# minimizing risk - exponentially many combinations!
#
# REAL-WORLD IMPACT:
# • Goldman Sachs: Derivatives pricing research
# • JPMorgan: Portfolio optimization experiments
# • BBVA: Dynamic asset allocation
#
# THIS EXAMPLE: 4-asset portfolio selection
# Each qubit = include (1) or exclude (0) an asset
# Encode risk/return tradeoff in the circuit
# ═══════════════════════════════════════════════════════════

from qiskit import QuantumCircuit

qc = QuantumCircuit(4)

# Assets: Tech, Healthcare, Energy, Bonds
# Initial superposition - consider all 16 portfolios
qc.h(0)  # Tech
qc.h(1)  # Healthcare
qc.h(2)  # Energy
qc.h(3)  # Bonds

# Encode correlations (negative = diversification benefit)
# Tech-Healthcare correlation
qc.cx(0, 1)
qc.rz(0.3, 1)  # Mild positive correlation
qc.cx(0, 1)

# Energy-Bonds anti-correlation (diversification!)
qc.cx(2, 3)
qc.rz(-0.5, 3)  # Negative = good for diversification
qc.cx(2, 3)

# Risk-adjusted mixer
qc.rx(0.6, 0)
qc.rx(0.6, 1)
qc.rx(0.4, 2)  # Less weight on volatile energy
qc.rx(0.8, 3)  # More weight on stable bonds

qc.measure_all()
shots = 1024

# Higher probability states = better risk-adjusted portfolios
`,
      },
      {
        name: 'Quantum Classifier',
        description: 'Machine learning kernel',
        code: `# ═══════════════════════════════════════════════════════════
# VARIATIONAL QUANTUM CLASSIFIER
# ═══════════════════════════════════════════════════════════
#
# THE PROBLEM: Classification with quantum feature spaces
# may find patterns invisible to classical ML
#
# REAL-WORLD RESEARCH:
# • IBM + CERN: Particle collision classification
# • Google Health: Medical image analysis
# • Financial fraud detection
#
# THIS EXAMPLE: Binary classifier for 2D data
# Encodes data point → quantum state → measure class
# ═══════════════════════════════════════════════════════════

from qiskit import QuantumCircuit

qc = QuantumCircuit(2)

# DATA ENCODING: Map classical features to quantum states
# Assume input data point: (x1=0.7, x2=1.2)
x1 = 0.7
x2 = 1.2

# Angle encoding - data becomes rotation angles
qc.ry(x1, 0)
qc.ry(x2, 1)

# VARIATIONAL LAYER 1 (trained parameters)
qc.cx(0, 1)  # Entangle for feature interaction
qc.ry(0.8, 0)  # θ₁ (learned)
qc.ry(1.1, 1)  # θ₂ (learned)

# VARIATIONAL LAYER 2
qc.cx(1, 0)
qc.ry(0.5, 0)  # θ₃ (learned)
qc.ry(0.9, 1)  # θ₄ (learned)

qc.measure_all()
shots = 1024

# Measurement of qubit 0: |0⟩ = class A, |1⟩ = class B
# Train by adjusting θ values to minimize classification error
`,
      },
      {
        name: 'Monte Carlo Sampling',
        description: 'Risk analysis speedup',
        code: `# ═══════════════════════════════════════════════════════════
# QUANTUM MONTE CARLO - Quadratic Speedup
# ═══════════════════════════════════════════════════════════
#
# THE PROBLEM: Monte Carlo simulations for risk analysis
# require millions of samples. Quantum can do it faster!
#
# REAL-WORLD IMPACT:
# • Goldman Sachs: Targeting 1000x speedup
# • Option pricing and Greeks calculation
# • Value at Risk (VaR) estimation
#
# KEY TECHNIQUE: Quantum Amplitude Estimation
# Classical: O(1/ε²) samples for ε precision
# Quantum: O(1/ε) - quadratic speedup!
# ═══════════════════════════════════════════════════════════

from qiskit import QuantumCircuit

qc = QuantumCircuit(3)

# PREPARE PROBABILITY DISTRIBUTION
# Encode probability distribution of asset returns
# Qubit 0-1: Represents 4 possible market scenarios
qc.ry(1.2, 0)  # Scenario probabilities
qc.ry(0.8, 1)
qc.cx(0, 1)   # Correlate scenarios

# PAYOFF FUNCTION
# Qubit 2: Encodes option payoff (in-the-money or not)
# Controlled rotation: payoff depends on market state
qc.cx(0, 2)
qc.ry(0.5, 2)
qc.cx(1, 2)
qc.ry(0.3, 2)

qc.measure_all()
shots = 1024

# Amplitude of |1⟩ on qubit 2 ∝ expected payoff
# Quantum amplitude estimation extracts this efficiently
`,
      },
    ],
  },
  {
    name: 'Physics Simulation',
    description: 'Quantum simulating quantum',
    examples: [
      {
        name: 'Ising Model',
        description: 'Magnetic materials',
        code: `# ═══════════════════════════════════════════════════════════
# ISING MODEL - Simulating Magnetic Materials
# ═══════════════════════════════════════════════════════════
#
# THE PHYSICS: Spins on a lattice interact magnetically
# Understanding this → superconductors, phase transitions
#
# REAL-WORLD IMPACT:
# • High-temperature superconductor design
# • Magnetic memory materials
# • Understanding phase transitions
#
# WHY QUANTUM: Classical simulation scales as 2^N
# N=50 spins would need more memory than Earth has atoms!
# ═══════════════════════════════════════════════════════════

from qiskit import QuantumCircuit

qc = QuantumCircuit(4)

# Time evolution of 4-spin Ising chain
# H = -J Σ ZᵢZᵢ₊₁ - h Σ Xᵢ

# Initial state: all spins up |0000⟩
# (This is already the default)

# TROTTER STEP 1 (dt = 0.3, J = 1.0)
# ZZ interactions between neighbors
qc.cx(0, 1)
qc.rz(0.6, 1)  # 2*J*dt
qc.cx(0, 1)

qc.cx(1, 2)
qc.rz(0.6, 2)
qc.cx(1, 2)

qc.cx(2, 3)
qc.rz(0.6, 3)
qc.cx(2, 3)

# Transverse field (h = 0.5)
qc.rx(0.3, 0)  # 2*h*dt
qc.rx(0.3, 1)
qc.rx(0.3, 2)
qc.rx(0.3, 3)

qc.measure_all()
shots = 1024

# Shows how the magnetic system evolves in time!
`,
      },
      {
        name: 'Quantum Walk',
        description: 'Quantum search primitive',
        code: `# ═══════════════════════════════════════════════════════════
# QUANTUM WALK - The Quantum Random Walk
# ═══════════════════════════════════════════════════════════
#
# Classical random walk: Particle hops randomly
# Quantum walk: Particle spreads as a WAVE, much faster!
#
# REAL-WORLD IMPACT:
# • Faster graph algorithms (database search)
# • Quantum PageRank for web ranking
# • Quantum simulation of transport phenomena
#
# SPEEDUP: Quantum walk spreads as O(t) vs classical O(√t)
# ═══════════════════════════════════════════════════════════

from qiskit import QuantumCircuit

qc = QuantumCircuit(3)

# 1D quantum walk on 4 positions (2 qubits)
# Qubit 0: Coin (direction)
# Qubits 1-2: Position (4 sites: 00, 01, 10, 11)

# Initial: Coin in superposition, position at center
qc.h(0)  # Coin toss

# WALK STEP 1
# Conditional shift based on coin
qc.cx(0, 1)  # Move right if coin=1
# Flip coin for next step
qc.h(0)

# WALK STEP 2
qc.cx(0, 1)
qc.cx(0, 2)  # Larger shift
qc.h(0)

# WALK STEP 3
qc.cx(0, 1)
qc.h(0)

qc.measure_all()
shots = 1024

# The walker spreads out quantumly - much faster than
# classical diffusion!
`,
      },
    ],
  },
]

// Flatten for backward compatibility
const EXAMPLES = EXAMPLE_CATEGORIES.flatMap(cat => cat.examples)

// 3D Scene content for visualization with multiple view modes
function VisualizationScene({
  qubitStates,
  entanglements,
  numQubits,
  viewMode,
  probabilities,
  onElementHover,
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

  // Calculate attractors for particle field from probabilities
  const attractors = useMemo(() => {
    const n = probabilities.length
    if (n === 0) return []
    const gridSize = Math.ceil(Math.sqrt(n))
    const cellSize = 6 / gridSize

    return probabilities
      .filter(p => p.probability > 0.1)
      .map((prob) => {
        const idx = probabilities.indexOf(prob)
        return {
          position: [
            ((idx % gridSize) - gridSize / 2 + 0.5) * cellSize,
            prob.probability * 2 + 0.5,
            (Math.floor(idx / gridSize) - gridSize / 2 + 0.5) * cellSize
          ] as [number, number, number],
          strength: prob.probability * 2,
          color: `hsl(${((prob.phase || 0) / (2 * Math.PI)) * 360}, 85%, 55%)`
        }
      })
  }, [probabilities])

  // Common lighting setup
  const Lighting = () => (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#6366f1" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
    </>
  )

  if (viewMode === 'bloch') {
    return (
      <>
        <PerspectiveCamera makeDefault position={[0, 3, numQubits > 2 ? 10 : 8]} fov={50} />
        <Lighting />
        <Stars radius={100} depth={50} count={1000} factor={4} fade speed={1} />

        {qubitStates.map((state, i) => (
          <BlochSphere3D
            key={i}
            state={{ ...state, label: `Q${i}` }}
            position={positions[i]}
            radius={1}
            isEntangled={entanglements.some(([a, b]) => a === i || b === i)}
            onElementHover={onElementHover}
          />
        ))}

        <EntanglementLines positions={positions} entanglements={entanglements} />
        <OrbitControls enablePan enableZoom enableRotate minDistance={4} maxDistance={20} />
      </>
    )
  }

  if (viewMode === 'towers') {
    return (
      <>
        <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />
        <Lighting />
        <Stars radius={100} depth={50} count={1500} factor={4} fade speed={0.5} />

        <ProbabilityLandscape
          probabilities={probabilities}
          position={[0, 0, 0]}
          maxHeight={3}
          barWidth={0.5}
          spacing={1.2}
          enhanced={true}
        />

        <OrbitControls enablePan enableZoom enableRotate minDistance={4} maxDistance={20} />
      </>
    )
  }

  if (viewMode === 'wave') {
    return (
      <>
        <PerspectiveCamera makeDefault position={[6, 6, 6]} fov={50} />
        <Lighting />
        <pointLight position={[0, 15, 0]} intensity={1} color="#06b6d4" />
        <Stars radius={100} depth={50} count={2000} factor={5} fade speed={0.8} />

        <AmplitudeWave3D
          probabilities={probabilities}
          position={[0, 0, 0]}
          size={6}
          resolution={48}
        />

        <QuantumParticleField
          count={200}
          radius={5}
          height={4}
          color="#06b6d4"
          speed={0.8}
          spiralIntensity={0.2}
          probabilityAttractors={attractors}
        />

        <OrbitControls enablePan enableZoom enableRotate minDistance={5} maxDistance={20} />
      </>
    )
  }

  if (viewMode === 'ring') {
    return (
      <>
        <PerspectiveCamera makeDefault position={[0, 5, 7]} fov={50} />
        <Lighting />
        <pointLight position={[0, 12, 0]} intensity={0.8} color="#8b5cf6" />
        <Stars radius={100} depth={50} count={1800} factor={4} fade speed={0.6} />

        <AmplitudeRing
          probabilities={probabilities}
          position={[0, 0, 0]}
          radius={3}
          height={2.5}
        />

        <QuantumParticleField
          count={150}
          radius={4}
          height={3}
          color="#8b5cf6"
          speed={0.6}
          spiralIntensity={0.3}
        />

        <OrbitControls enablePan enableZoom enableRotate minDistance={4} maxDistance={18} />
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
          className="glass-card p-5 max-h-96 overflow-y-auto"
        >
          <div className="space-y-5">
            {EXAMPLE_CATEGORIES.map((category) => (
              <div key={category.name}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-indigo-400">{category.name}</h4>
                  <span className="text-xs text-gray-500">— {category.description}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {category.examples.map((ex) => (
                    <button
                      key={ex.name}
                      onClick={() => {
                        setCode(ex.code)
                        setShowExamples(false)
                      }}
                      className="p-3 text-left bg-gray-800/50 hover:bg-indigo-900/30 hover:border-indigo-500/50 border border-transparent rounded-lg transition-all group"
                    >
                      <div className="font-medium text-white text-sm group-hover:text-indigo-300 transition-colors">{ex.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{ex.description}</div>
                    </button>
                  ))}
                </div>
              </div>
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
                <Canvas>
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
