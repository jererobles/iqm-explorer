// IQM API Service for quantum circuit execution

export interface IQMConfig {
  serverUrl: string;
  token: string;
  useProxy?: boolean;
  proxyUrl?: string;
}

export interface Circuit {
  name: string;
  instructions: Instruction[];
}

export interface Instruction {
  name: string;
  qubits: string[];
  args?: Record<string, number | string>;
}

export interface JobSubmission {
  circuits: Circuit[];
  shots: number;
  calibration_set_id?: string;
}

export interface JobResponse {
  id: string;
  status: 'pending' | 'pending_compilation' | 'pending_execution' | 'ready' | 'failed';
  message?: string;
  timestamps?: {
    created?: string;
    started?: string;
    finished?: string;
  };
}

export interface JobResult {
  status: 'ready' | 'failed';
  measurements?: {
    [circuitName: string]: number[][];
  };
  metadata?: {
    shots_executed?: number;
  };
  message?: string;
}

export interface QuantumArchitecture {
  name: string;
  qubits: string[];
  operations: Record<string, string[][]>;
}

// IQM Native Gate Set
export const IQM_NATIVE_GATES = {
  single_qubit: ['prx', 'r', 'rz'],  // PRX is the native single-qubit gate
  two_qubit: ['cz', 'move'],  // CZ is the native two-qubit gate
};

// Parse Python-like circuit code to IQM circuit format
export function parseCircuitCode(code: string): { circuits: Circuit[]; shots: number } | null {
  try {
    const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));

    const instructions: Instruction[] = [];
    let shots = 1000;
    let circuitName = 'circuit';
    const measureQubits: string[] = [];

    // Extract shots if specified
    const shotsMatch = code.match(/shots\s*=\s*(\d+)/);
    if (shotsMatch) {
      shots = parseInt(shotsMatch[1], 10);
    }

    // Look for circuit definition patterns
    for (const line of lines) {
      const trimmed = line.trim();

      // Parse gate operations - support various formats
      // Format: gate(qubit) or gate(q1, q2) or circuit.gate(qubit)

      // Hadamard gate -> PRX(pi/2, 0)
      const hMatch = trimmed.match(/\.?h\s*\(\s*(\d+)\s*\)/i);
      if (hMatch) {
        instructions.push({
          name: 'prx',
          qubits: [`QB${parseInt(hMatch[1]) + 1}`],
          args: { angle_t: Math.PI / 2, phase_t: 0 }
        });
        continue;
      }

      // X gate -> PRX(pi, 0)
      const xMatch = trimmed.match(/\.?x\s*\(\s*(\d+)\s*\)/i);
      if (xMatch) {
        instructions.push({
          name: 'prx',
          qubits: [`QB${parseInt(xMatch[1]) + 1}`],
          args: { angle_t: Math.PI, phase_t: 0 }
        });
        continue;
      }

      // Y gate -> PRX(pi, pi/2)
      const yMatch = trimmed.match(/\.?y\s*\(\s*(\d+)\s*\)/i);
      if (yMatch) {
        instructions.push({
          name: 'prx',
          qubits: [`QB${parseInt(yMatch[1]) + 1}`],
          args: { angle_t: Math.PI, phase_t: Math.PI / 2 }
        });
        continue;
      }

      // Z gate -> PRX with appropriate decomposition
      const zMatch = trimmed.match(/\.?z\s*\(\s*(\d+)\s*\)/i);
      if (zMatch) {
        // Z = RZ(pi), which in PRX terms requires decomposition
        instructions.push({
          name: 'rz',
          qubits: [`QB${parseInt(zMatch[1]) + 1}`],
          args: { angle: Math.PI }
        });
        continue;
      }

      // RX, RY, RZ gates with angle
      const rxMatch = trimmed.match(/\.?rx\s*\(\s*([\d.pi/*-]+)\s*,?\s*(\d+)?\s*\)/i);
      if (rxMatch) {
        const angle = parseAngle(rxMatch[1]);
        const qubit = rxMatch[2] ? parseInt(rxMatch[2]) : 0;
        instructions.push({
          name: 'prx',
          qubits: [`QB${qubit + 1}`],
          args: { angle_t: angle, phase_t: 0 }
        });
        continue;
      }

      const ryMatch = trimmed.match(/\.?ry\s*\(\s*([\d.pi/*-]+)\s*,?\s*(\d+)?\s*\)/i);
      if (ryMatch) {
        const angle = parseAngle(ryMatch[1]);
        const qubit = ryMatch[2] ? parseInt(ryMatch[2]) : 0;
        instructions.push({
          name: 'prx',
          qubits: [`QB${qubit + 1}`],
          args: { angle_t: angle, phase_t: Math.PI / 2 }
        });
        continue;
      }

      const rzMatch = trimmed.match(/\.?rz\s*\(\s*([\d.pi/*-]+)\s*,?\s*(\d+)?\s*\)/i);
      if (rzMatch) {
        const angle = parseAngle(rzMatch[1]);
        const qubit = rzMatch[2] ? parseInt(rzMatch[2]) : 0;
        instructions.push({
          name: 'rz',
          qubits: [`QB${qubit + 1}`],
          args: { angle }
        });
        continue;
      }

      // CNOT / CX gate -> CZ with Hadamard decomposition
      const cxMatch = trimmed.match(/\.?(?:cx|cnot)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i);
      if (cxMatch) {
        const control = parseInt(cxMatch[1]);
        const target = parseInt(cxMatch[2]);
        // CNOT = H(target) CZ H(target)
        instructions.push({
          name: 'prx',
          qubits: [`QB${target + 1}`],
          args: { angle_t: Math.PI / 2, phase_t: 0 }
        });
        instructions.push({
          name: 'cz',
          qubits: [`QB${control + 1}`, `QB${target + 1}`]
        });
        instructions.push({
          name: 'prx',
          qubits: [`QB${target + 1}`],
          args: { angle_t: Math.PI / 2, phase_t: 0 }
        });
        continue;
      }

      // CZ gate (native)
      const czMatch = trimmed.match(/\.?cz\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i);
      if (czMatch) {
        instructions.push({
          name: 'cz',
          qubits: [`QB${parseInt(czMatch[1]) + 1}`, `QB${parseInt(czMatch[2]) + 1}`]
        });
        continue;
      }

      // Measurement
      const measureMatch = trimmed.match(/\.?measure(?:_all)?\s*\(\s*(?:\[([^\]]*)\])?\s*\)/i);
      if (measureMatch) {
        // If specific qubits listed
        if (measureMatch[1]) {
          const qubits = measureMatch[1].split(',').map(q => parseInt(q.trim()));
          qubits.forEach(q => measureQubits.push(`QB${q + 1}`));
        }
        continue;
      }

      // QuantumCircuit definition
      const qcMatch = trimmed.match(/QuantumCircuit\s*\(\s*(\d+)/i);
      if (qcMatch) {
        const numQubits = parseInt(qcMatch[1]);
        for (let i = 1; i <= numQubits; i++) {
          if (!measureQubits.includes(`QB${i}`)) {
            measureQubits.push(`QB${i}`);
          }
        }
        continue;
      }
    }

    // Add measurement instruction if we have any qubits
    if (instructions.length > 0) {
      const usedQubits = new Set<string>();
      instructions.forEach(inst => inst.qubits.forEach(q => usedQubits.add(q)));

      // Measure all used qubits
      const qubitsToMeasure = measureQubits.length > 0
        ? measureQubits
        : Array.from(usedQubits).sort();

      if (qubitsToMeasure.length > 0) {
        instructions.push({
          name: 'measure',
          qubits: qubitsToMeasure,
          args: { key: 'm' }
        });
      }
    }

    return {
      circuits: [{
        name: circuitName,
        instructions
      }],
      shots
    };
  } catch (error) {
    console.error('Failed to parse circuit code:', error);
    return null;
  }
}

function parseAngle(angleStr: string): number {
  // Parse angle expressions like "pi/2", "3.14", "2*pi"
  let expr = angleStr.toLowerCase()
    .replace(/pi/g, String(Math.PI))
    .replace(/\s+/g, '');

  try {
    // Use Function constructor for safe math evaluation
    return new Function(`return ${expr}`)() as number;
  } catch {
    return parseFloat(angleStr) || 0;
  }
}

class IQMApiService {
  private config: IQMConfig | null = null;
  private basePollingInterval: number = 5000; // 5 seconds base
  private maxPollingInterval: number = 30000; // 30 seconds max
  private currentPollingInterval: number = 5000;

  setConfig(config: IQMConfig) {
    this.config = config;
  }

  getConfig(): IQMConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return this.config !== null && !!this.config.token && !!this.config.serverUrl;
  }

  private getBaseUrl(): string {
    if (!this.config) throw new Error('IQM API not configured');

    const baseUrl = this.config.serverUrl.replace(/\/$/, '');

    // If using a CORS proxy, prefix the URL
    if (this.config.useProxy && this.config.proxyUrl) {
      return `${this.config.proxyUrl}/${baseUrl}`;
    }

    return baseUrl;
  }

  private getHeaders(): HeadersInit {
    if (!this.config) throw new Error('IQM API not configured');

    return {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
    };
  }

  async getQuantumArchitecture(): Promise<QuantumArchitecture> {
    const response = await fetch(`${this.getBaseUrl()}/quantum-architecture`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get architecture: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async submitJob(submission: JobSubmission): Promise<JobResponse> {
    const response = await fetch(`${this.getBaseUrl()}/jobs`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to submit job: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async getJobStatus(jobId: string, retryCount: number = 0): Promise<JobResponse> {
    const response = await fetch(`${this.getBaseUrl()}/jobs/${jobId}/status`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    // Handle rate limiting with exponential backoff
    if (response.status === 429) {
      if (retryCount >= 3) {
        throw new Error('Rate limited by IQM API. Please wait a moment and try again.');
      }

      // Exponential backoff: 5s, 10s, 20s
      const backoffTime = this.basePollingInterval * Math.pow(2, retryCount);
      this.currentPollingInterval = Math.min(backoffTime, this.maxPollingInterval);

      await new Promise(resolve => setTimeout(resolve, backoffTime));
      return this.getJobStatus(jobId, retryCount + 1);
    }

    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.status} ${response.statusText}`);
    }

    // Reset polling interval on success
    this.currentPollingInterval = this.basePollingInterval;
    return response.json();
  }

  async getJobResult(jobId: string): Promise<JobResult> {
    const response = await fetch(`${this.getBaseUrl()}/jobs/${jobId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get job result: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async waitForJob(
    jobId: string,
    onStatusUpdate?: (status: JobResponse) => void,
    maxWaitTime: number = 300000 // 5 minutes
  ): Promise<JobResult> {
    const startTime = Date.now();
    let pollCount = 0;

    // Reset polling interval at start
    this.currentPollingInterval = this.basePollingInterval;

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.getJobStatus(jobId);

        if (onStatusUpdate) {
          onStatusUpdate(status);
        }

        if (status.status === 'ready' || status.status === 'failed') {
          return this.getJobResult(jobId);
        }

        // Gradually increase polling interval to be gentle on the API
        pollCount++;
        if (pollCount > 5) {
          this.currentPollingInterval = Math.min(
            this.currentPollingInterval * 1.2,
            this.maxPollingInterval
          );
        }

        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, this.currentPollingInterval));
      } catch (error) {
        // If we get a rate limit error, the getJobStatus already handled backoff
        // Just continue the loop
        if (error instanceof Error && error.message.includes('Rate limited')) {
          throw error;
        }
        // For other errors, wait and retry
        await new Promise(resolve => setTimeout(resolve, this.currentPollingInterval));
      }
    }

    throw new Error('Job timed out waiting for completion');
  }

  async executeCircuit(
    code: string,
    onStatusUpdate?: (status: string) => void
  ): Promise<{ result: JobResult; jobId: string }> {
    const parsed = parseCircuitCode(code);

    if (!parsed || parsed.circuits.length === 0 || parsed.circuits[0].instructions.length === 0) {
      throw new Error('Could not parse circuit code. Please check the syntax.');
    }

    onStatusUpdate?.('Submitting job to IQM...');

    const jobResponse = await this.submitJob({
      circuits: parsed.circuits,
      shots: parsed.shots,
    });

    onStatusUpdate?.(`Job submitted: ${jobResponse.id}`);

    const result = await this.waitForJob(jobResponse.id, (status) => {
      onStatusUpdate?.(`Job status: ${status.status}`);
    });

    return { result, jobId: jobResponse.id };
  }
}

// Singleton instance
export const iqmApi = new IQMApiService();

// Local storage keys
const STORAGE_KEY_CONFIG = 'iqm_config';

export function saveConfig(config: IQMConfig) {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  iqmApi.setConfig(config);
}

export function loadConfig(): IQMConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (stored) {
      const config = JSON.parse(stored);
      iqmApi.setConfig(config);
      return config;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY_CONFIG);
  iqmApi.setConfig(null as unknown as IQMConfig);
}
