import { useState } from 'react'
import { motion } from 'framer-motion'
import { Server, Key, Code, Terminal, Cpu, CheckCircle, ExternalLink, Copy, Check } from 'lucide-react'

interface CodeExample {
  id: string
  title: string
  description: string
  framework: 'iqm-client' | 'qiskit' | 'cirq'
  code: string
}

const codeExamples: CodeExample[] = [
  {
    id: 'basic-connection',
    title: 'Connect to IQM',
    description: 'Establish connection to an IQM quantum computer',
    framework: 'iqm-client',
    code: `from iqm.iqm_client import IQMClient
import os

# Set your authentication token
# Option 1: Environment variable
os.environ["IQM_TOKEN"] = "your_token_here"

# Option 2: Token file
# os.environ["IQM_TOKENS_FILE"] = "/path/to/tokens.json"

# Connect to IQM server
server_url = "https://cocos.resonance.meetiqm.com/garnet"
client = IQMClient(server_url)

# Get quantum architecture info
arch = client.get_dynamic_quantum_architecture()
print(f"Available qubits: {arch.qubits}")
print(f"Available operations: {list(arch.operations.keys())}")
print(f"Qubit connectivity: {arch.qubit_connectivity}")`
  },
  {
    id: 'submit-circuit',
    title: 'Submit a Circuit',
    description: 'Create and run a quantum circuit on IQM hardware',
    framework: 'iqm-client',
    code: `from iqm.iqm_client import IQMClient
from iqm.iqm_client import Circuit, CircuitOperation
from math import pi

client = IQMClient("https://cocos.resonance.meetiqm.com/garnet")

# Define circuit operations
instructions = [
    # Phased rotation on qubit QB1
    CircuitOperation(
        name="prx",
        locus=("QB1",),
        args={"phase_t": 0.0, "angle_t": 0.25}  # pi/2 rotation
    ),
    # CZ gate between QB1 and QB2
    CircuitOperation(
        name="cz",
        locus=("QB1", "QB2"),
        args={}
    ),
    # Measurement
    CircuitOperation(
        name="measure",
        locus=("QB1", "QB2"),
        args={"key": "result"}
    ),
]

circuit = Circuit(name="bell_state", instructions=instructions)

# Submit and run
job = client.submit_circuits([circuit], shots=1000)
print(f"Job ID: {job.job_id}")

# Wait for results
job.wait_for_completion()
result = job.result()
print(f"Results: {result.measurements}")`
  },
  {
    id: 'qiskit-backend',
    title: 'Using Qiskit with IQM',
    description: 'Run Qiskit circuits on IQM quantum computers',
    framework: 'qiskit',
    code: `from qiskit import QuantumCircuit, transpile
from iqm.qiskit_iqm import IQMProvider

# Connect to IQM via Qiskit
provider = IQMProvider("https://cocos.resonance.meetiqm.com/garnet")
backend = provider.get_backend()

# Create a Bell state circuit
qc = QuantumCircuit(2, 2)
qc.h(0)              # Hadamard on qubit 0
qc.cx(0, 1)          # CNOT: control=0, target=1
qc.measure([0, 1], [0, 1])

# Transpile for IQM hardware
transpiled = transpile(qc, backend=backend, optimization_level=2)

print("Original circuit:")
print(qc.draw())
print("\\nTranspiled for IQM:")
print(transpiled.draw())

# Run on IQM hardware
job = backend.run(transpiled, shots=1000)
result = job.result()

# Get measurement counts
counts = result.get_counts()
print(f"\\nResults: {counts}")
# Expected: {'00': ~500, '11': ~500}`
  },
  {
    id: 'cirq-sampler',
    title: 'Using Cirq with IQM',
    description: 'Run Cirq circuits on IQM quantum computers',
    framework: 'cirq',
    code: `import cirq
from iqm.cirq_iqm import IQMSampler

# Create qubits
q0, q1 = cirq.LineQubit.range(2)

# Build circuit
circuit = cirq.Circuit([
    cirq.H(q0),           # Hadamard
    cirq.CNOT(q0, q1),    # Entangle
    cirq.measure(q0, q1, key='result')
])

print("Circuit:")
print(circuit)

# Connect to IQM
sampler = IQMSampler("https://cocos.resonance.meetiqm.com/garnet")

# Run the circuit
result = sampler.run(circuit, repetitions=1000)

# Analyze results
histogram = result.histogram(key='result')
print(f"\\nResults: {histogram}")
# Expected: {0: ~500, 3: ~500} (binary 00 and 11)`
  },
  {
    id: 'transpilation',
    title: 'Circuit Transpilation',
    description: 'Optimize circuits for IQM hardware architecture',
    framework: 'iqm-client',
    code: `from iqm.iqm_client import (
    IQMClient,
    transpile_insert_moves,
    simplify_architecture,
    optimize_single_qubit_gates
)

client = IQMClient("https://cocos.resonance.meetiqm.com/garnet")

# Get the dynamic quantum architecture
dqa = client.get_dynamic_quantum_architecture()

# For Star architectures, simplify to see effective connectivity
simplified = simplify_architecture(dqa)
print(f"Simplified qubits: {simplified.qubits}")
print(f"Effective connectivity: {simplified.qubit_connectivity}")

# Create your circuit
circuit = ...  # Your circuit here

# Insert MOVE gates for Star architecture
circuit_with_moves = transpile_insert_moves(circuit, dqa)

# Optimize single-qubit gates
optimized = optimize_single_qubit_gates(circuit_with_moves)

print("Gate count before:", count_gates(circuit))
print("Gate count after:", count_gates(optimized))`
  },
  {
    id: 'error-handling',
    title: 'Job Management',
    description: 'Handle job submission, polling, and errors',
    framework: 'iqm-client',
    code: `from iqm.iqm_client import IQMClient, JobStatus
import time

client = IQMClient("https://cocos.resonance.meetiqm.com/garnet")

# Submit circuit
job = client.submit_circuits([circuit], shots=1000)
print(f"Submitted job: {job.job_id}")

# Manual status polling
while True:
    status = job.update()
    print(f"Status: {status}")

    if status == JobStatus.READY:
        print("Job completed successfully!")
        break
    elif status == JobStatus.FAILED:
        print(f"Job failed: {job.error_message}")
        break
    elif status == JobStatus.CANCELLED:
        print("Job was cancelled")
        break

    time.sleep(1)  # Poll every second

# Alternative: blocking wait
# job.wait_for_completion(timeout=300)  # 5 minute timeout

# Get results
if job.status == JobStatus.READY:
    result = job.result()
    print(f"Measurements: {result.measurements}")
    print(f"Execution time: {result.execution_time_ms} ms")

# Retrieve a previous job by ID
# old_job = client.get_job("previous-job-uuid")`
  }
]

const iqmSystems = [
  {
    name: 'Garnet',
    qubits: 20,
    topology: 'Square Lattice',
    status: 'Available',
    features: ['High fidelity gates', 'Fast reset', 'Mid-circuit measurement']
  },
  {
    name: 'Emerald',
    qubits: 54,
    topology: 'Heavy Hex',
    status: 'Available',
    features: ['Large scale', 'Error mitigation', 'Parallel execution']
  },
  {
    name: 'Deneb',
    qubits: 6,
    topology: 'Star',
    status: 'Research',
    features: ['Move gates', 'Resonator coupling', 'Novel protocols']
  }
]

export default function IQMIntegration() {
  const [selectedExample, setSelectedExample] = useState(codeExamples[0])
  const [copiedCode, setCopiedCode] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(selectedExample.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className="space-y-8">
      {/* IQM Systems Overview */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Server className="w-6 h-6 text-indigo-400" />
          Available Hardware (IQM)
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {iqmSystems.map((system) => (
            <motion.div
              key={system.name}
              className="bg-slate-800/50 rounded-xl p-5 border border-indigo-500/20"
              whileHover={{ scale: 1.02, borderColor: 'rgba(99, 102, 241, 0.5)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-bold text-white">{system.name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  system.status === 'Available'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {system.status}
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span className="text-gray-400">Qubits:</span>
                  <span className="text-white font-semibold">{system.qubits}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Topology:</span>
                  <span className="text-cyan-400">{system.topology}</span>
                </div>
              </div>
              <div className="space-y-1">
                {system.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-xs text-gray-400">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    {feature}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Key className="w-6 h-6 text-indigo-400" />
          Getting Started
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-white mb-3">1. Install IQM Client</h4>
            <div className="code-block">
              <pre className="p-4">
                <code className="text-sm text-gray-300 font-mono">
{`# Install base client
pip install iqm-client

# With Qiskit support
pip install iqm-client[qiskit]

# With Cirq support
pip install iqm-client[cirq]

# With both
pip install iqm-client[qiskit,cirq]`}
                </code>
              </pre>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">2. Authentication</h4>
            <div className="code-block">
              <pre className="p-4">
                <code className="text-sm text-gray-300 font-mono">
{`# Set token via environment variable
export IQM_TOKEN="your_api_token"

# Or use token file
export IQM_TOKENS_FILE="/path/to/tokens.json"

# Token file format:
{
  "access_token": "your_token",
  "refresh_token": "refresh_token"
}`}
                </code>
              </pre>
            </div>
          </div>
        </div>
        <div className="mt-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <p className="text-sm text-gray-300">
            <span className="text-gray-400 font-semibold">Need hardware access?</span> Sign up at{' '}
            <a
              href="https://www.meetiqm.com/iqm-resonance"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline inline-flex items-center gap-1"
            >
              IQM Resonance <ExternalLink className="w-3 h-3" />
            </a>
            {' '}to get API credentials.
          </p>
        </div>
      </div>

      {/* Code Examples */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Code className="w-6 h-6 text-indigo-400" />
          Code Examples
        </h3>

        {/* Example Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {codeExamples.map((example) => (
            <motion.button
              key={example.id}
              onClick={() => setSelectedExample(example)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedExample.id === example.id
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {example.title}
            </motion.button>
          ))}
        </div>

        {/* Selected Example */}
        <motion.div
          key={selectedExample.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-white">{selectedExample.title}</h4>
              <p className="text-sm text-gray-400">{selectedExample.description}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              selectedExample.framework === 'qiskit'
                ? 'bg-blue-500/20 text-blue-400'
                : selectedExample.framework === 'cirq'
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-purple-500/20 text-purple-400'
            }`}>
              {selectedExample.framework}
            </span>
          </div>
          <div className="code-block">
            <div className="code-header">
              <span className="text-sm text-gray-400">Python</span>
              <button
                onClick={copyCode}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto max-h-96">
              <code className="text-sm text-gray-300 font-mono whitespace-pre">
                {selectedExample.code}
              </code>
            </pre>
          </div>
        </motion.div>
      </div>

      {/* Resources */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Terminal className="w-6 h-6 text-indigo-400" />
          Resources
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'IQM Client Docs',
              url: 'https://docs.meetiqm.com/iqm-client/',
              description: 'Official documentation'
            },
            {
              title: 'GitHub',
              url: 'https://github.com/iqm-finland/iqm-client',
              description: 'Source code & issues'
            },
            {
              title: 'PyPI Package',
              url: 'https://pypi.org/project/iqm-client/',
              description: 'Python package'
            },
            {
              title: 'IQM Academy',
              url: 'https://www.meetiqm.com/iqm-academy/',
              description: 'Learning resources'
            }
          ].map((resource) => (
            <motion.a
              key={resource.title}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-xl bg-slate-800/50 border border-indigo-500/20 hover:border-indigo-500/50 transition-all"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <h4 className="font-semibold text-white flex items-center gap-2">
                {resource.title}
                <ExternalLink className="w-4 h-4 text-indigo-400" />
              </h4>
              <p className="text-sm text-gray-400 mt-1">{resource.description}</p>
            </motion.a>
          ))}
        </div>
      </div>
    </div>
  )
}
