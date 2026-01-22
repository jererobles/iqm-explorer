# IQM Quantum Explorer

A beautiful, interactive web interface for learning quantum computing using IQM machines as backends.

![Quantum Explorer](https://img.shields.io/badge/Quantum-Explorer-6366f1?style=for-the-badge&logo=atom&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss)

## Features

### Interactive Learning Modules
- Step-by-step tutorials from qubits to quantum algorithms
- Covers fundamentals: qubits, superposition, measurement
- Quantum gates: single-qubit and multi-qubit operations
- Famous algorithms: Deutsch-Jozsa, Grover's search
- IQM hardware specifics: architectures, transpilation

### Visual Circuit Builder
- Drag-and-drop quantum gate interface
- Real-time circuit visualization
- Support for IQM native gates (PRX, CZ)
- Automatic Qiskit code generation
- Built-in circuit simulation

### IQM Integration Guide
- Complete code examples for iqm-client, Qiskit, and Cirq
- Authentication setup instructions
- Job submission and management patterns
- Transpilation best practices

### Bloch Sphere Visualizer
- Interactive 3D qubit state representation
- Apply gates and watch state evolution
- Probability amplitude visualization
- Multi-qubit entanglement examples (Bell states, GHZ)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## IQM Quantum Computers

This platform supports learning about IQM's quantum systems:

| System | Qubits | Topology | Status |
|--------|--------|----------|--------|
| Garnet | 20 | Square Lattice | Available |
| Emerald | 54 | Heavy Hex | Available |
| Deneb | 6 | Star | Research |

## Using with IQM Hardware

```python
from iqm.qiskit_iqm import IQMProvider
from qiskit import QuantumCircuit

# Connect to IQM
provider = IQMProvider("https://cocos.resonance.meetiqm.com/garnet")
backend = provider.get_backend()

# Create and run circuit
qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure([0, 1], [0, 1])

job = backend.run(qc, shots=1000)
result = job.result()
print(result.get_counts())
```

## Tech Stack

- **React 18** - UI framework with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Lucide Icons** - Beautiful icons

## Resources

- [IQM Documentation](https://docs.meetiqm.com/iqm-client/)
- [IQM Resonance](https://www.meetiqm.com/iqm-resonance) - Cloud quantum access
- [IQM GitHub](https://github.com/iqm-finland)
- [Qiskit](https://qiskit.org/)
- [Cirq](https://quantumai.google/cirq)

## License

Educational project for learning quantum computing with IQM systems.
