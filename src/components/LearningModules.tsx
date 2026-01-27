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

## Real Quantum Hardware

On superconducting hardware, measurement is performed using resonators coupled to transmon qubits, achieving high-fidelity readout.
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

## Native Gates

Superconducting quantum computers typically support:
- **PRX (Phased RX)**: Rotation with phase control
- **CZ (Controlled-Z)**: Two-qubit entangling gate

Other gates are decomposed into these native operations by the transpiler.
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
This is the **native two-qubit gate on many superconducting systems**.

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
    id: 'real-world-applications',
    title: 'Real-World Quantum Applications',
    description: 'Practical quantum algorithms solving real problems today',
    icon: '🌍',
    difficulty: 'intermediate',
    lessons: [
      {
        id: 'vqe',
        title: 'VQE: Drug Discovery & Chemistry',
        duration: '40 min',
        completed: false,
        content: `
# Variational Quantum Eigensolver (VQE)

VQE is one of the most promising near-term quantum algorithms with **real industrial applications today**.

## The Problem It Solves

Finding the ground state energy of molecules is crucial for:
- **Drug discovery**: Understanding protein folding and molecular interactions
- **Materials science**: Designing new batteries and superconductors
- **Catalyst design**: Creating more efficient chemical processes

Classical computers struggle because molecular simulation scales exponentially with system size.

## How VQE Works

VQE is a **hybrid quantum-classical algorithm**:

1. **Quantum Part**: Prepare a trial wave function on the quantum computer
2. **Measurement**: Measure the energy of that state
3. **Classical Part**: Optimizer adjusts parameters to minimize energy
4. **Iterate**: Repeat until convergence

## Why It's Practical Today

- Works on **noisy intermediate-scale quantum (NISQ)** devices
- Shallow circuits that fit within coherence times
- Error mitigation techniques can improve results
- Already demonstrated on molecules like H₂, LiH, and BeH₂

## Real-World Impact

**Pharmaceutical companies** like Roche and Biogen are exploring VQE for:
- Simulating enzyme-drug binding
- Predicting molecular properties
- Accelerating drug candidate screening

**Energy sector** applications:
- Better battery materials (lithium-air, solid-state)
- More efficient solar cells
- Nitrogen fixation for fertilizers
        `,
        codeExample: `from qiskit import QuantumCircuit
from qiskit.circuit import Parameter
import numpy as np

# Simple VQE ansatz for H2 molecule
def create_vqe_ansatz(theta):
    """Hardware-efficient ansatz for molecular simulation"""
    qc = QuantumCircuit(2)

    # Initial state preparation
    qc.h(0)
    qc.h(1)

    # Variational layer with entanglement
    qc.cx(0, 1)
    qc.ry(theta, 0)
    qc.ry(theta, 1)
    qc.cx(0, 1)

    return qc

# Create parameterized circuit
theta = Parameter('θ')
ansatz = create_vqe_ansatz(theta)

# In practice, you'd measure the Hamiltonian expectation value
# and use a classical optimizer to find optimal theta
print(ansatz.draw())

# Example: Iterate to find ground state
# optimal_theta = classical_optimizer.minimize(
#     lambda t: measure_energy(ansatz.bind_parameters({theta: t}))
# )`
      },
      {
        id: 'qaoa',
        title: 'QAOA: Optimization & Logistics',
        duration: '35 min',
        completed: false,
        content: `
# Quantum Approximate Optimization Algorithm (QAOA)

QAOA tackles **combinatorial optimization problems** that plague industries worldwide.

## Real-World Problems

### Logistics & Supply Chain
- **Vehicle routing**: Optimize delivery truck routes (FedEx, Amazon)
- **Warehouse placement**: Where to build distribution centers
- **Inventory allocation**: Stock the right products at right locations

### Finance
- **Portfolio optimization**: Balance risk vs. return across assets
- **Trading strategies**: Optimize order execution
- **Risk management**: Model complex financial instruments

### Manufacturing
- **Job shop scheduling**: Minimize production time
- **Resource allocation**: Assign machines to tasks
- **Quality control**: Optimize inspection processes

## How QAOA Works

1. **Encode problem** as a cost function (Hamiltonian)
2. **Prepare initial state** in equal superposition
3. **Apply alternating operators**:
   - Cost operator: Encodes the problem
   - Mixer operator: Explores solution space
4. **Measure and optimize** parameters classically

## The Quantum Advantage

For certain problems:
- Classical best: O(2ⁿ) or approximation algorithms
- QAOA: Potential polynomial speedup for specific instances

## Current Applications

**BMW** uses QAOA research for optimizing vehicle sensor placement.
**JPMorgan** explores quantum optimization for portfolio management.
**Airbus** investigates flight gate assignment optimization.
        `,
        codeExample: `from qiskit import QuantumCircuit
from qiskit.circuit import Parameter
import numpy as np

def create_qaoa_circuit(n_qubits, p_layers):
    """QAOA circuit for MaxCut problem"""
    qc = QuantumCircuit(n_qubits)

    # Parameters for optimization
    gamma = [Parameter(f'γ_{i}') for i in range(p_layers)]
    beta = [Parameter(f'β_{i}') for i in range(p_layers)]

    # Initial superposition
    for i in range(n_qubits):
        qc.h(i)

    # QAOA layers
    for layer in range(p_layers):
        # Cost layer (problem-specific)
        # Example: MaxCut on a simple graph
        for i in range(n_qubits - 1):
            qc.cx(i, i + 1)
            qc.rz(gamma[layer], i + 1)
            qc.cx(i, i + 1)

        # Mixer layer
        for i in range(n_qubits):
            qc.rx(2 * beta[layer], i)

    qc.measure_all()
    return qc

# Create QAOA circuit for 4-node graph
qaoa_circuit = create_qaoa_circuit(n_qubits=4, p_layers=2)
print(qaoa_circuit.draw())

# Real application: Find maximum cut in a graph
# (partition nodes to maximize edges between groups)`
      },
      {
        id: 'quantum-ml',
        title: 'Quantum Machine Learning',
        duration: '45 min',
        completed: false,
        content: `
# Quantum Machine Learning (QML)

QML combines quantum computing with AI for potential advantages in data processing.

## Promising Applications

### Classification Problems
- **Medical diagnosis**: Classify tumors from imaging data
- **Fraud detection**: Identify suspicious transactions
- **Image recognition**: Quantum-enhanced feature extraction

### Pattern Recognition
- **Genomics**: Identify genetic markers for diseases
- **Particle physics**: Classify collision events at CERN
- **Financial forecasting**: Detect market patterns

## Key QML Algorithms

### Quantum Support Vector Machines (QSVM)
- Map data to high-dimensional quantum feature space
- Find optimal separating hyperplane
- Potential exponential speedup for certain kernels

### Variational Quantum Classifiers (VQC)
- Parameterized quantum circuits as neural networks
- Train using classical optimization
- Natural fit for NISQ devices

### Quantum Neural Networks
- Layers of parameterized quantum gates
- Encode classical data into quantum states
- Hybrid quantum-classical training

## Real Research Examples

**IBM & CERN** collaboration: Classifying particle collision events using quantum classifiers.

**Google Health**: Exploring quantum-enhanced medical image analysis.

**Goldman Sachs**: Researching QML for derivative pricing and risk assessment.

## Current Limitations

- **Data loading**: Encoding classical data into qubits is costly
- **Barren plateaus**: Training can get stuck in flat regions
- **Noise sensitivity**: NISQ devices introduce errors

## The Path Forward

Near-term focus on:
- Problems where quantum feature maps provide advantage
- Hybrid models that leverage both classical and quantum
- Specific domains like chemistry where quantum data is natural
        `,
        codeExample: `from qiskit import QuantumCircuit
from qiskit.circuit import Parameter
import numpy as np

def variational_classifier(n_features, n_layers):
    """Variational Quantum Classifier for binary classification"""
    qc = QuantumCircuit(n_features)

    # Data encoding layer (angle encoding)
    data_params = [Parameter(f'x_{i}') for i in range(n_features)]
    for i, param in enumerate(data_params):
        qc.ry(param, i)

    qc.barrier()

    # Trainable variational layers
    for layer in range(n_layers):
        # Rotation layer
        for i in range(n_features):
            theta = Parameter(f'θ_{layer}_{i}')
            qc.ry(theta, i)

        # Entanglement layer
        for i in range(n_features - 1):
            qc.cx(i, i + 1)
        qc.cx(n_features - 1, 0)  # Circular entanglement

    qc.measure_all()
    return qc

# Create classifier for 4-dimensional data
classifier = variational_classifier(n_features=4, n_layers=2)
print(classifier.draw())

# Training involves:
# 1. Encode training data into x_i parameters
# 2. Measure output, compare to labels
# 3. Update θ parameters to minimize loss`
      },
      {
        id: 'quantum-simulation',
        title: 'Quantum Simulation: Materials & Physics',
        duration: '35 min',
        completed: false,
        content: `
# Quantum Simulation

Quantum computers are **natural simulators** for quantum systems—this was Feynman's original vision!

## Why Quantum Simulation Matters

Simulating quantum systems classically is exponentially hard:
- **40 spin system**: Requires 2⁴⁰ ≈ 10¹² complex numbers
- **100 spin system**: More parameters than atoms in the universe!

Quantum computers encode these states naturally with qubits.

## Real-World Applications

### High-Temperature Superconductors
- **Problem**: We don't fully understand how they work
- **Impact**: Room-temperature superconductors could revolutionize:
  - Lossless power transmission
  - Maglev transportation
  - Medical MRI machines

### Battery Technology
- **Simulate lithium-ion dynamics** at atomic level
- **Design solid-state electrolytes** for safer batteries
- **Optimize electrode materials** for higher capacity

### Nitrogen Fixation
- **The Haber process** consumes 2% of world energy
- Understand how enzymes fix nitrogen naturally
- Design better catalysts for fertilizer production

### Pharmaceutical Development
- Model protein folding mechanisms
- Simulate drug-receptor interactions
- Predict side effects before clinical trials

## Types of Quantum Simulation

### Digital Quantum Simulation
- Decompose time evolution into quantum gates
- Trotter-Suzuki decomposition
- Flexible but requires many gates

### Analog Quantum Simulation
- Directly engineer the Hamiltonian in hardware
- Fewer errors, limited to specific problems
- Cold atom and ion trap systems excel here

## Current Progress

**Google (2020)**: Simulated chemical dynamics of diazene isomerization.
**IBM (2022)**: Demonstrated error-mitigated simulation of spin chains.
**IonQ**: Simulating frustrated magnets for materials discovery.
        `,
        codeExample: `from qiskit import QuantumCircuit
import numpy as np

def trotter_step(qc, n_qubits, dt, J=1.0, h=0.5):
    """One Trotter step for transverse-field Ising model

    H = -J Σ ZᵢZᵢ₊₁ - h Σ Xᵢ

    This models magnetic materials and phase transitions.
    """
    # ZZ interactions (Ising coupling)
    for i in range(n_qubits - 1):
        qc.cx(i, i + 1)
        qc.rz(2 * J * dt, i + 1)
        qc.cx(i, i + 1)

    # Transverse field terms
    for i in range(n_qubits):
        qc.rx(2 * h * dt, i)

    return qc

# Simulate 4-spin Ising chain
n_qubits = 4
n_steps = 5
dt = 0.1

qc = QuantumCircuit(n_qubits)

# Initial state: all spins up
# (already |0...0⟩ by default)

# Time evolution via Trotter decomposition
for _ in range(n_steps):
    trotter_step(qc, n_qubits, dt)

qc.measure_all()
print(qc.draw())

# This simulates how a magnetic material evolves over time
# Real applications: understanding phase transitions,
# magnetic properties, and quantum critical phenomena`
      },
      {
        id: 'shor-algorithm',
        title: "Shor's Algorithm: Cryptography Impact",
        duration: '50 min',
        completed: false,
        content: `
# Shor's Algorithm: The Cryptography Game-Changer

Shor's algorithm provides **exponential speedup** for integer factorization—with massive implications.

## The Problem

Given a large number N = p × q (product of two primes), find p and q.

### Why It's Hard Classically
- Best classical algorithm: O(exp(n^(1/3))) for n-bit numbers
- RSA-2048 would take billions of years on classical supercomputers

### Why It Matters
- **RSA encryption** relies on factoring being hard
- Secures: Banking, e-commerce, government communications
- A quantum computer could break RSA in polynomial time!

## Shor's Algorithm Explained

1. **Classical preprocessing**: Choose random a < N
2. **Quantum period finding**: Find period r of f(x) = aˣ mod N
3. **Classical post-processing**: Extract factors from period

The quantum speedup comes from **Quantum Fourier Transform (QFT)**:
- Finds periodicity in exponentially many values simultaneously
- Runs in O(n³) quantum operations

## Current State

### What's Possible Today
- **2001**: IBM factored 15 = 3 × 5 using 7 qubits
- **2012**: Factored 21 = 3 × 7
- **2019**: Factored 35 = 5 × 7

### What's Needed
- RSA-2048 requires ~4,000+ logical qubits
- With error correction: millions of physical qubits
- Estimated: 10-20+ years away

## The Quantum Threat Timeline

**NIST Post-Quantum Cryptography Project**:
- New encryption standards resistant to quantum attacks
- Lattice-based, hash-based, and code-based cryptography
- Migration already underway at major organizations

**"Harvest Now, Decrypt Later"**:
Adversaries may store encrypted data today, decrypt with future quantum computers.

## Real-World Preparations

**Banking**: JPMorgan, HSBC testing quantum-safe protocols
**Government**: NSA mandating post-quantum crypto migration
**Tech**: Google, Apple implementing hybrid classical-quantum encryption
        `,
        codeExample: `from qiskit import QuantumCircuit
import numpy as np

def quantum_fourier_transform(qc, n_qubits):
    """Quantum Fourier Transform - core of Shor's algorithm

    QFT transforms computational basis to Fourier basis,
    enabling efficient period finding.
    """
    for i in range(n_qubits):
        # Hadamard on qubit i
        qc.h(i)

        # Controlled rotations
        for j in range(i + 1, n_qubits):
            angle = np.pi / (2 ** (j - i))
            qc.cp(angle, j, i)

    # Swap qubits to reverse order
    for i in range(n_qubits // 2):
        qc.swap(i, n_qubits - i - 1)

    return qc

# Create QFT circuit for 4 qubits
qc = QuantumCircuit(4)

# Example: Start with a state encoding periodic function
qc.h(0)
qc.cx(0, 1)
qc.barrier()

# Apply QFT to find the period
quantum_fourier_transform(qc, 4)
qc.measure_all()

print(qc.draw())

# In Shor's algorithm, QFT reveals the period of a^x mod N
# This period is then used to find factors of N`
      },
      {
        id: 'quantum-finance',
        title: 'Quantum Finance: Risk & Pricing',
        duration: '40 min',
        completed: false,
        content: `
# Quantum Computing in Finance

The financial industry is investing heavily in quantum computing for competitive advantage.

## Key Applications

### Monte Carlo Simulation (Quantum Amplitude Estimation)
**Classical**: Run millions of random simulations
**Quantum**: Quadratic speedup with amplitude estimation

Used for:
- **Option pricing**: Value complex derivatives
- **Risk assessment**: Calculate Value at Risk (VaR)
- **Credit risk**: Model default probabilities

### Portfolio Optimization
Find the optimal asset allocation balancing risk and return.

**The challenge**: N assets create 2^N possible portfolios
**Quantum approach**: QAOA and variational algorithms

Real constraint handling:
- Minimum/maximum position sizes
- Sector exposure limits
- Transaction costs

### Fraud Detection
Quantum machine learning for anomaly detection:
- Credit card fraud patterns
- Money laundering networks
- Market manipulation signals

## Industry Adoption

### Goldman Sachs
- Quantum algorithms for derivatives pricing
- Partnership with QC Ware
- Targeting 1000x speedup for Monte Carlo

### JPMorgan Chase
- Quantum research lab since 2020
- Portfolio optimization experiments
- Quantum-resistant cryptography

### BBVA
- Quantum computing for credit risk
- Dynamic portfolio optimization
- Collaboration with Zapata Computing

## Timeline Expectations

**Near-term (2024-2027)**:
- Proof-of-concept demonstrations
- Hybrid classical-quantum systems
- Specialized financial problems

**Medium-term (2027-2032)**:
- Production-ready quantum advantage
- Monte Carlo sampling applications
- Risk calculations at scale

**Long-term (2032+)**:
- Full portfolio optimization
- Real-time risk management
- Quantum machine learning at scale
        `,
        codeExample: `from qiskit import QuantumCircuit
from qiskit.circuit import Parameter
import numpy as np

def amplitude_estimation_circuit(n_qubits, n_estimation):
    """Simplified amplitude estimation for Monte Carlo

    This technique can provide quadratic speedup over
    classical Monte Carlo sampling for option pricing.
    """
    total_qubits = n_qubits + n_estimation
    qc = QuantumCircuit(total_qubits)

    # Prepare state encoding the probability distribution
    # (simplified example - real applications use more complex encodings)
    for i in range(n_qubits):
        qc.h(i)

    # Oracle marking "good" states (e.g., profitable outcomes)
    theta = Parameter('θ')
    qc.ry(theta, 0)

    qc.barrier()

    # Amplitude estimation qubits
    for i in range(n_estimation):
        qc.h(n_qubits + i)

    # Controlled Grover iterations
    # (simplified - full implementation uses phase estimation)
    for i in range(n_estimation):
        iterations = 2 ** i
        for _ in range(iterations):
            # Controlled Grover iteration
            qc.cx(n_qubits + i, 0)

    # Inverse QFT on estimation qubits
    qc.barrier()
    qc.measure_all()

    return qc

# Create circuit for option pricing estimation
qc = amplitude_estimation_circuit(n_qubits=2, n_estimation=3)
print(qc.draw())

# Real application: Estimate expected payoff of European call option
# by encoding stock price distribution and using amplitude estimation`
      }
    ]
  },
  {
    id: 'quantum-hardware',
    title: 'Quantum Hardware',
    description: 'How superconducting quantum processors work',
    icon: '🖥️',
    difficulty: 'advanced',
    lessons: [
      {
        id: 'architecture',
        title: 'Superconducting Quantum Computers',
        duration: '25 min',
        completed: false,
        content: `
# Superconducting Quantum Computers

Most quantum computers today use superconducting circuits—tiny loops of metal cooled to near absolute zero where electricity flows without resistance.

## How They Work

### Transmon Qubits
The most common qubit type:
- Superconducting circuits cooled to ~15 millikelvin
- Controlled with precisely timed microwave pulses
- Typical coherence times: 50-200 microseconds

### Native Gate Sets
Different hardware supports different native operations:
- **PRX/CZ**: Common on many superconducting systems
- **SX/CNOT**: Used by some IBM systems
- Compilers translate your circuits to native gates

## Qubit Topologies

### Square Lattice
- Grid-like connectivity
- Each qubit connects to 2-4 neighbors
- Good for many algorithms

### Heavy Hex
- Alternating connectivity pattern
- Reduces crosstalk between qubits
- Used for error correction

### Star Topology
- Central resonator with qubits around it
- Enables flexible qubit routing
- Useful for certain algorithms
        `,
        codeExample: `from iqm.iqm_client import IQMClient

# Connect to a quantum computer
client = IQMClient("https://your-server-url.com")

# Query the hardware architecture
architecture = client.get_dynamic_quantum_architecture()

print(f"Qubits: {architecture.qubits}")
print(f"Available operations: {architecture.operations}")
print(f"Qubit connectivity: {architecture.qubit_connectivity}")`
      },
      {
        id: 'transpilation',
        title: 'Circuit Transpilation',
        duration: '30 min',
        completed: false,
        content: `
# Circuit Transpilation

Real quantum hardware has constraints. Transpilation adapts your abstract circuits to run on actual processors.

## Why Transpile?

1. **Native Gates**: Convert to hardware-supported operations
2. **Connectivity**: Route qubits so 2-qubit gates work on connected pairs
3. **Optimization**: Reduce gate count and circuit depth

## The Transpilation Process

### Gate Decomposition
Your H and CNOT gates become sequences of native gates:
- H → rotations around X and Z axes
- CNOT → CZ with surrounding rotations

### Qubit Routing
If your circuit needs gates between non-adjacent qubits, the transpiler inserts SWAP gates to move qubit states around.

### Optimization Passes
- Adjacent gates that cancel get removed
- Single-qubit gate sequences get merged
- Redundant operations eliminated

## Best Practices

1. Design with connectivity in mind when possible
2. Minimize circuit depth—qubits decohere over time
3. Use higher optimization levels for production runs
4. Check transpiled circuits to understand overhead
        `,
        codeExample: `from qiskit import QuantumCircuit, transpile
from iqm.qiskit_iqm import IQMProvider

# Your abstract circuit
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)  # May not be native!

# Connect to hardware
provider = IQMProvider("https://your-server-url.com")
backend = provider.get_backend()

# Transpile for the specific hardware
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
