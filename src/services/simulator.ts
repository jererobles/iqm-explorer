// Local quantum circuit simulator for testing without IQM access

import { JobResult } from './iqmApi';

interface Complex {
  re: number;
  im: number;
}

function complex(re: number, im: number = 0): Complex {
  return { re, im };
}

function multiply(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

function scale(a: Complex, s: number): Complex {
  return { re: a.re * s, im: a.im * s };
}

function magnitude(a: Complex): number {
  return Math.sqrt(a.re * a.re + a.im * a.im);
}

// Quantum gates as 2x2 matrices
const GATES: Record<string, Complex[][]> = {
  I: [
    [complex(1), complex(0)],
    [complex(0), complex(1)],
  ],
  H: [
    [complex(1 / Math.SQRT2), complex(1 / Math.SQRT2)],
    [complex(1 / Math.SQRT2), complex(-1 / Math.SQRT2)],
  ],
  X: [
    [complex(0), complex(1)],
    [complex(1), complex(0)],
  ],
  Y: [
    [complex(0, -1), complex(0)],
    [complex(0), complex(0, 1)],
  ],
  Z: [
    [complex(1), complex(0)],
    [complex(0), complex(-1)],
  ],
  S: [
    [complex(1), complex(0)],
    [complex(0), complex(0, 1)],
  ],
  T: [
    [complex(1), complex(0)],
    [complex(0), complex(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4))],
  ],
};

function rotationGate(axis: 'x' | 'y' | 'z', angle: number): Complex[][] {
  const cos = Math.cos(angle / 2);
  const sin = Math.sin(angle / 2);

  switch (axis) {
    case 'x':
      return [
        [complex(cos), complex(0, -sin)],
        [complex(0, -sin), complex(cos)],
      ];
    case 'y':
      return [
        [complex(cos), complex(-sin)],
        [complex(sin), complex(cos)],
      ];
    case 'z':
      return [
        [complex(Math.cos(angle / 2), -Math.sin(angle / 2)), complex(0)],
        [complex(0), complex(Math.cos(angle / 2), Math.sin(angle / 2))],
      ];
    default:
      // This should never happen due to TypeScript's type checking,
      // but provides a runtime safety net
      throw new Error(`Unknown rotation axis: ${axis}`);
  }
}

// IQM native PRx gate: rotation around axis in X-Y plane
// PRx(θ, φ) = exp(-i * θ/2 * (cos(φ)X + sin(φ)Y))
// Matrix form:
// | cos(θ/2)            -i·e^(-iφ)·sin(θ/2) |
// | -i·e^(iφ)·sin(θ/2)   cos(θ/2)           |
function prxGate(theta: number, phi: number): Complex[][] {
  const cosTheta = Math.cos(theta / 2);
  const sinTheta = Math.sin(theta / 2);
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  // -i·e^(-iφ) = -sin(φ) - i·cos(φ)
  // -i·e^(iφ) = sin(φ) - i·cos(φ)
  return [
    [
      complex(cosTheta),
      complex(-sinPhi * sinTheta, -cosPhi * sinTheta),
    ],
    [
      complex(sinPhi * sinTheta, -cosPhi * sinTheta),
      complex(cosTheta),
    ],
  ];
}

class QuantumSimulator {
  private numQubits: number;
  private state: Complex[];

  constructor(numQubits: number) {
    this.numQubits = numQubits;
    this.state = new Array(1 << numQubits).fill(null).map(() => complex(0));
    this.state[0] = complex(1); // |00...0> state
  }

  // Apply a single-qubit gate to a specific qubit
  applySingleQubitGate(gate: Complex[][], qubit: number) {
    const n = 1 << this.numQubits;

    for (let i = 0; i < n; i++) {
      const bit = (i >> qubit) & 1;
      if (bit === 0) {
        const j = i | (1 << qubit);
        const a = this.state[i];
        const b = this.state[j];

        this.state[i] = add(multiply(gate[0][0], a), multiply(gate[0][1], b));
        this.state[j] = add(multiply(gate[1][0], a), multiply(gate[1][1], b));
      }
    }
  }

  // Apply CZ gate between two qubits
  applyCZ(control: number, target: number) {
    const n = 1 << this.numQubits;

    for (let i = 0; i < n; i++) {
      const controlBit = (i >> control) & 1;
      const targetBit = (i >> target) & 1;

      if (controlBit === 1 && targetBit === 1) {
        this.state[i] = scale(this.state[i], -1);
      }
    }
  }

  // Apply CNOT gate (decomposed into H-CZ-H for IQM)
  applyCNOT(control: number, target: number) {
    this.applySingleQubitGate(GATES.H, target);
    this.applyCZ(control, target);
    this.applySingleQubitGate(GATES.H, target);
  }

  // Measure all qubits multiple times
  measure(shots: number): number[][] {
    const results: number[][] = [];
    const probabilities = this.state.map((amp) => magnitude(amp) ** 2);

    for (let shot = 0; shot < shots; shot++) {
      const r = Math.random();
      let cumulative = 0;
      let outcome = 0;

      for (let i = 0; i < probabilities.length; i++) {
        cumulative += probabilities[i];
        if (r < cumulative) {
          outcome = i;
          break;
        }
      }

      // Convert outcome to array of bits
      const bits: number[] = [];
      for (let q = 0; q < this.numQubits; q++) {
        bits.push((outcome >> q) & 1);
      }
      results.push(bits);
    }

    return results;
  }

  getStateProbabilities(): { state: string; probability: number }[] {
    const probabilities = this.state.map((amp) => magnitude(amp) ** 2);
    const results: { state: string; probability: number }[] = [];

    for (let i = 0; i < probabilities.length; i++) {
      if (probabilities[i] > 1e-10) {
        const stateStr = i.toString(2).padStart(this.numQubits, '0');
        results.push({ state: stateStr, probability: probabilities[i] });
      }
    }

    return results.sort((a, b) => b.probability - a.probability);
  }
}

// Parse and simulate circuit code locally
export function simulateCircuit(code: string): { result: JobResult; shots: number; probabilities: { state: string; probability: number }[] } {
  const lines = code.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));

  let numQubits = 2;
  let shots = 1000;

  // Detect number of qubits
  const qcMatch = code.match(/QuantumCircuit\s*\(\s*(\d+)/i);
  if (qcMatch) {
    numQubits = parseInt(qcMatch[1], 10);
  }

  // Detect shots
  const shotsMatch = code.match(/shots\s*=\s*(\d+)/);
  if (shotsMatch) {
    shots = parseInt(shotsMatch[1], 10);
  }

  const sim = new QuantumSimulator(numQubits);
  const operations: { gate: string; qubits: number[]; angle?: number; phi?: number }[] = [];

  // Parse operations
  // Note: All patterns require a dot prefix (e.g., ".h(0)") to avoid false matches
  // like "t(1)" in "QuantumCircuit(1)" being parsed as a T gate
  for (const line of lines) {
    const trimmed = line.trim();

    // Hadamard
    const hMatch = trimmed.match(/\.h\s*\(\s*(\d+)\s*\)/i);
    if (hMatch) {
      operations.push({ gate: 'H', qubits: [parseInt(hMatch[1], 10)] });
      continue;
    }

    // X gate
    const xMatch = trimmed.match(/\.x\s*\(\s*(\d+)\s*\)/i);
    if (xMatch) {
      operations.push({ gate: 'X', qubits: [parseInt(xMatch[1], 10)] });
      continue;
    }

    // Y gate
    const yMatch = trimmed.match(/\.y\s*\(\s*(\d+)\s*\)/i);
    if (yMatch) {
      operations.push({ gate: 'Y', qubits: [parseInt(yMatch[1], 10)] });
      continue;
    }

    // Z gate
    const zMatch = trimmed.match(/\.z\s*\(\s*(\d+)\s*\)/i);
    if (zMatch) {
      operations.push({ gate: 'Z', qubits: [parseInt(zMatch[1], 10)] });
      continue;
    }

    // S gate
    const sMatch = trimmed.match(/\.s\s*\(\s*(\d+)\s*\)/i);
    if (sMatch) {
      operations.push({ gate: 'S', qubits: [parseInt(sMatch[1], 10)] });
      continue;
    }

    // T gate
    const tMatch = trimmed.match(/\.t\s*\(\s*(\d+)\s*\)/i);
    if (tMatch) {
      operations.push({ gate: 'T', qubits: [parseInt(tMatch[1], 10)] });
      continue;
    }

    // RX gate
    const rxMatch = trimmed.match(/\.rx\s*\(\s*([\d.pi/*-]+)\s*,?\s*(\d+)?\s*\)/i);
    if (rxMatch) {
      const angle = parseAngle(rxMatch[1]);
      const qubit = rxMatch[2] ? parseInt(rxMatch[2], 10) : 0;
      operations.push({ gate: 'RX', qubits: [qubit], angle });
      continue;
    }

    // RY gate
    const ryMatch = trimmed.match(/\.ry\s*\(\s*([\d.pi/*-]+)\s*,?\s*(\d+)?\s*\)/i);
    if (ryMatch) {
      const angle = parseAngle(ryMatch[1]);
      const qubit = ryMatch[2] ? parseInt(ryMatch[2], 10) : 0;
      operations.push({ gate: 'RY', qubits: [qubit], angle });
      continue;
    }

    // RZ gate
    const rzMatch = trimmed.match(/\.rz\s*\(\s*([\d.pi/*-]+)\s*,?\s*(\d+)?\s*\)/i);
    if (rzMatch) {
      const angle = parseAngle(rzMatch[1]);
      const qubit = rzMatch[2] ? parseInt(rzMatch[2], 10) : 0;
      operations.push({ gate: 'RZ', qubits: [qubit], angle });
      continue;
    }

    // CNOT / CX
    const cxMatch = trimmed.match(/\.(?:cx|cnot)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (cxMatch) {
      operations.push({
        gate: 'CX',
        qubits: [parseInt(cxMatch[1], 10), parseInt(cxMatch[2], 10)],
      });
      continue;
    }

    // CZ
    const czMatch = trimmed.match(/\.cz\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (czMatch) {
      operations.push({
        gate: 'CZ',
        qubits: [parseInt(czMatch[1], 10), parseInt(czMatch[2], 10)],
      });
      continue;
    }

    // PRx gate (IQM native) - .prx(theta, phi, qubit) or .phased_rx(theta, phi, qubit)
    const prxMatch = trimmed.match(/\.(?:prx|phased_rx)\s*\(\s*([\d.pi/*-]+)\s*,\s*([\d.pi/*-]+)\s*,\s*(\d+)\s*\)/i);
    if (prxMatch) {
      const theta = parseAngle(prxMatch[1]);
      const phi = parseAngle(prxMatch[2]);
      const qubit = parseInt(prxMatch[3], 10);
      operations.push({ gate: 'PRX', qubits: [qubit], angle: theta, phi });
      continue;
    }
  }

  // Apply operations
  for (const op of operations) {
    switch (op.gate) {
      case 'H':
        sim.applySingleQubitGate(GATES.H, op.qubits[0]);
        break;
      case 'X':
        sim.applySingleQubitGate(GATES.X, op.qubits[0]);
        break;
      case 'Y':
        sim.applySingleQubitGate(GATES.Y, op.qubits[0]);
        break;
      case 'Z':
        sim.applySingleQubitGate(GATES.Z, op.qubits[0]);
        break;
      case 'S':
        sim.applySingleQubitGate(GATES.S, op.qubits[0]);
        break;
      case 'T':
        sim.applySingleQubitGate(GATES.T, op.qubits[0]);
        break;
      case 'RX':
        sim.applySingleQubitGate(rotationGate('x', op.angle!), op.qubits[0]);
        break;
      case 'RY':
        sim.applySingleQubitGate(rotationGate('y', op.angle!), op.qubits[0]);
        break;
      case 'RZ':
        sim.applySingleQubitGate(rotationGate('z', op.angle!), op.qubits[0]);
        break;
      case 'CX':
        sim.applyCNOT(op.qubits[0], op.qubits[1]);
        break;
      case 'CZ':
        sim.applyCZ(op.qubits[0], op.qubits[1]);
        break;
      case 'PRX':
        sim.applySingleQubitGate(prxGate(op.angle!, op.phi!), op.qubits[0]);
        break;
    }
  }

  // Get probabilities for display
  const probabilities = sim.getStateProbabilities();

  // Measure
  const measurements = sim.measure(shots);

  return {
    result: {
      status: 'ready',
      measurements: {
        circuit: measurements,
      },
      metadata: {
        shots_executed: shots,
      },
    },
    shots,
    probabilities,
  };
}

function parseAngle(angleStr: string): number {
  let expr = angleStr
    .toLowerCase()
    .replace(/pi/g, String(Math.PI))
    .replace(/\s+/g, '');

  try {
    return new Function(`return ${expr}`)() as number;
  } catch {
    return parseFloat(angleStr) || 0;
  }
}

// Analyze measurements to get counts
export function getMeasurementCounts(measurements: number[][]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const measurement of measurements) {
    const key = measurement.join('');
    counts[key] = (counts[key] || 0) + 1;
  }

  return counts;
}

// IQM native gate operations
export type NativeOperation =
  | { gate: 'PRX'; qubit: number; theta: number; phi: number }
  | { gate: 'CZ'; qubit1: number; qubit2: number }
  | { gate: 'MEASURE'; qubits: number[] };

// Transpile standard gates to IQM native gate set (PRx + CZ)
// Decompositions:
//   X = PRx(π, 0)
//   Y = PRx(π, π/2)
//   Z = PRx(π, 0) · PRx(0, π) · PRx(π, 0)  [or virtual Z]
//   H = PRx(π, 0) · PRx(π/2, π/2)
//   RX(θ) = PRx(θ, 0)
//   RY(θ) = PRx(θ, π/2)
//   RZ(θ) = PRx(π, 0) · PRx(θ, π/2) · PRx(π, 0)  [or virtual Z]
//   S = RZ(π/2)
//   T = RZ(π/4)
//   CNOT(c,t) = H(t) · CZ(c,t) · H(t)
export function transpileToNative(
  operations: { gate: string; qubits: number[]; angle?: number; phi?: number }[]
): NativeOperation[] {
  const native: NativeOperation[] = [];

  for (const op of operations) {
    switch (op.gate) {
      case 'X':
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: Math.PI, phi: 0 });
        break;

      case 'Y':
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: Math.PI, phi: Math.PI / 2 });
        break;

      case 'Z':
        // Z = X · RY(π) · X = PRx(π,0) · PRx(π, π/2) · PRx(π,0)
        // Simplified: virtual Z often used, but here we decompose
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: Math.PI, phi: 0 });
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: 0, phi: Math.PI });
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: Math.PI, phi: 0 });
        break;

      case 'H':
        // H = PRx(π, 0) · PRx(π/2, π/2)  (X then sqrt-Y)
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: Math.PI, phi: 0 });
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: Math.PI / 2, phi: Math.PI / 2 });
        break;

      case 'S':
        // S = RZ(π/2) - decompose like Z but with π/2
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: Math.PI, phi: 0 });
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: Math.PI / 2, phi: Math.PI / 2 });
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: Math.PI, phi: 0 });
        break;

      case 'T':
        // T = RZ(π/4) - similar decomposition
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: Math.PI, phi: 0 });
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: Math.PI / 4, phi: Math.PI / 2 });
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: Math.PI, phi: 0 });
        break;

      case 'RX':
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: op.angle!, phi: 0 });
        break;

      case 'RY':
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: op.angle!, phi: Math.PI / 2 });
        break;

      case 'RZ':
        // RZ(θ) = X · RY(θ) · X
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: Math.PI, phi: 0 });
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: op.angle!, phi: Math.PI / 2 });
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: Math.PI, phi: 0 });
        break;

      case 'CX':
        // CNOT(c,t) = H(t) · CZ(c,t) · H(t)
        // H = PRx(π, 0) · PRx(π/2, π/2)
        native.push({ gate: 'PRX', qubit: op.qubits[1], theta: Math.PI, phi: 0 });
        native.push({ gate: 'PRX', qubit: op.qubits[1], theta: Math.PI / 2, phi: Math.PI / 2 });
        native.push({ gate: 'CZ', qubit1: op.qubits[0], qubit2: op.qubits[1] });
        native.push({ gate: 'PRX', qubit: op.qubits[1], theta: Math.PI, phi: 0 });
        native.push({ gate: 'PRX', qubit: op.qubits[1], theta: Math.PI / 2, phi: Math.PI / 2 });
        break;

      case 'CZ':
        native.push({ gate: 'CZ', qubit1: op.qubits[0], qubit2: op.qubits[1] });
        break;

      case 'PRX':
        native.push({ gate: 'PRX', qubit: op.qubits[0], theta: op.angle!, phi: op.phi! });
        break;

      default:
        console.warn(`Unknown gate ${op.gate}, skipping transpilation`);
    }
  }

  return native;
}

// Format native operations as readable string
export function formatNativeCircuit(ops: NativeOperation[]): string {
  return ops
    .map((op) => {
      if (op.gate === 'PRX') {
        const theta = (op.theta / Math.PI).toFixed(4).replace(/\.?0+$/, '');
        const phi = (op.phi / Math.PI).toFixed(4).replace(/\.?0+$/, '');
        return `PRx(${theta}π, ${phi}π) q${op.qubit}`;
      } else if (op.gate === 'CZ') {
        return `CZ q${op.qubit1}, q${op.qubit2}`;
      } else {
        return `MEASURE`;
      }
    })
    .join('\n');
}
