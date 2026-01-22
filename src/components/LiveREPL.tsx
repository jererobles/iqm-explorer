import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import {
  Play,
  Settings,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Cpu,
  Zap,
  History,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Server,
} from 'lucide-react';
import {
  iqmApi,
  IQMConfig,
  saveConfig,
  loadConfig,
  clearConfig,
  JobResult,
} from '../services/iqmApi';
import { simulateCircuit, getMeasurementCounts } from '../services/simulator';

// Default circuit code example
const DEFAULT_CODE = `# Create a Bell State
# This creates an entangled pair: (|00⟩ + |11⟩) / √2

from qiskit import QuantumCircuit

# Create a 2-qubit circuit
qc = QuantumCircuit(2)

# Apply Hadamard to qubit 0
qc.h(0)

# Apply CNOT with control=0, target=1
qc.cx(0, 1)

# Measure all qubits
qc.measure_all()

# Number of shots
shots = 1024
`;

// Example circuits for quick access
const EXAMPLE_CIRCUITS = [
  {
    name: 'Bell State',
    description: 'Create an entangled pair',
    code: DEFAULT_CODE,
  },
  {
    name: 'GHZ State (3 qubits)',
    description: 'Three-qubit entanglement',
    code: `# GHZ State: (|000⟩ + |111⟩) / √2
from qiskit import QuantumCircuit

qc = QuantumCircuit(3)

# Apply Hadamard to first qubit
qc.h(0)

# Entangle all qubits
qc.cx(0, 1)
qc.cx(1, 2)

qc.measure_all()

shots = 1024
`,
  },
  {
    name: 'Superposition',
    description: 'Single qubit in superposition',
    code: `# Single qubit superposition
from qiskit import QuantumCircuit

qc = QuantumCircuit(1)

# Apply Hadamard for |+⟩ state
qc.h(0)

qc.measure_all()

shots = 1024
`,
  },
  {
    name: 'Quantum Interference',
    description: 'H-Z-H sequence',
    code: `# Quantum Interference
# H-Z-H should give |1⟩
from qiskit import QuantumCircuit

qc = QuantumCircuit(1)

qc.h(0)
qc.z(0)
qc.h(0)

qc.measure_all()

shots = 1024
`,
  },
  {
    name: 'Hardware Native Gates',
    description: 'Using CZ (native gate)',
    code: `# Using native CZ gate
from qiskit import QuantumCircuit

qc = QuantumCircuit(2)

# Create |+⟩ state on both qubits
qc.h(0)
qc.h(1)

# Apply native CZ gate
qc.cz(0, 1)

# Convert back to measure
qc.h(0)
qc.h(1)

qc.measure_all()

shots = 1024
`,
  },
];

interface JobHistoryEntry {
  id: string;
  timestamp: string; // ISO string for serialization
  code: string;
  mode: 'simulation' | 'iqm';
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: JobResult;
  error?: string;
  counts?: Record<string, number>;
  iqmJobId?: string; // For resuming IQM job polling
}

// Local storage key for history
const HISTORY_STORAGE_KEY = 'iqm_repl_history';

function saveHistory(history: JobHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore storage errors
  }
}

function loadHistory(): JobHistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

export default function LiveREPL() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [mode, setMode] = useState<'simulation' | 'iqm'>('simulation');
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  // IQM Configuration
  const [config, setConfig] = useState<IQMConfig>({
    serverUrl: 'https://cocos.resonance.meetiqm.com/garnet',
    token: '',
    useProxy: false,
    proxyUrl: 'https://cors-anywhere.herokuapp.com',
  });

  // Results
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<{
    counts: Record<string, number>;
    probabilities?: { state: string; probability: number }[];
    shots: number;
    jobId?: string;
  } | null>(null);
  const [error, setError] = useState<string>('');

  // Job history
  const [history, setHistory] = useState<JobHistoryEntry[]>([]);

  // Load config and history on mount
  useEffect(() => {
    const savedConfig = loadConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }

    const savedHistory = loadHistory();
    if (savedHistory.length > 0) {
      setHistory(savedHistory);
    }
  }, []);

  // Save history whenever it changes
  useEffect(() => {
    if (history.length > 0) {
      saveHistory(history);
    }
  }, [history]);

  // Resume polling for pending IQM jobs on mount
  useEffect(() => {
    const resumePendingJobs = async () => {
      const pendingJobs = history.filter(
        (h) => h.mode === 'iqm' && h.status === 'running' && h.iqmJobId
      );

      if (pendingJobs.length === 0 || !iqmApi.isConfigured()) return;

      for (const job of pendingJobs) {
        if (!job.iqmJobId) continue;

        setStatus(`Resuming job ${job.iqmJobId}...`);

        try {
          const result = await iqmApi.waitForJob(job.iqmJobId, (statusUpdate) => {
            setStatus(`Job ${job.iqmJobId}: ${statusUpdate.status}`);
          });

          if (result.status === 'ready') {
            const measurements = Object.values(result.measurements || {})[0] || [];
            const counts = getMeasurementCounts(measurements);

            setHistory((prev) =>
              prev.map((h) =>
                h.id === job.id
                  ? { ...h, status: 'completed', result, counts }
                  : h
              )
            );

            setStatus(`Job ${job.iqmJobId} completed!`);
          } else {
            setHistory((prev) =>
              prev.map((h) =>
                h.id === job.id
                  ? { ...h, status: 'failed', error: result.message || 'Job failed' }
                  : h
              )
            );
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to resume job';
          setHistory((prev) =>
            prev.map((h) =>
              h.id === job.id ? { ...h, status: 'failed', error: errorMessage } : h
            )
          );
        }
      }

      setStatus('');
    };

    // Small delay to ensure config is loaded first
    const timer = setTimeout(resumePendingJobs, 1000);
    return () => clearTimeout(timer);
  }, []); // Only run once on mount

  const handleSaveConfig = useCallback(() => {
    saveConfig(config);
    setShowSettings(false);
    setStatus('Configuration saved!');
    setTimeout(() => setStatus(''), 2000);
  }, [config]);

  const handleClearConfig = useCallback(() => {
    clearConfig();
    setConfig({
      serverUrl: 'https://cocos.resonance.meetiqm.com/garnet',
      token: '',
      useProxy: false,
      proxyUrl: 'https://cors-anywhere.herokuapp.com',
    });
    setStatus('Configuration cleared');
    setTimeout(() => setStatus(''), 2000);
  }, []);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setError('');
    setResult(null);

    const historyEntry: JobHistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      code,
      mode,
      status: 'running',
    };

    setHistory((prev) => [historyEntry, ...prev.slice(0, 19)]);

    try {
      if (mode === 'simulation') {
        setStatus('Running local simulation...');
        await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay for UX

        const simResult = simulateCircuit(code);
        const counts = getMeasurementCounts(simResult.result.measurements?.circuit || []);

        setResult({
          counts,
          probabilities: simResult.probabilities,
          shots: simResult.shots,
        });

        // Update history
        setHistory((prev) =>
          prev.map((h) =>
            h.id === historyEntry.id
              ? { ...h, status: 'completed', result: simResult.result, counts }
              : h
          )
        );

        setStatus('Simulation completed!');
      } else {
        // IQM Mode
        if (!iqmApi.isConfigured()) {
          throw new Error(
            'IQM not configured. Please set your IQM server URL and token in Settings.'
          );
        }

        // Submit the job first
        setStatus('Submitting job to IQM...');

        const { result: iqmResult, jobId } = await iqmApi.executeCircuit(code, (statusMsg) => {
          setStatus(statusMsg);

          // Store the job ID as soon as we have it so we can resume if page refreshes
          if (statusMsg.includes('Job submitted:')) {
            const submittedJobId = statusMsg.replace('Job submitted: ', '').trim();
            setHistory((prev) =>
              prev.map((h) =>
                h.id === historyEntry.id ? { ...h, iqmJobId: submittedJobId } : h
              )
            );
          }
        });

        if (iqmResult.status === 'failed') {
          throw new Error(iqmResult.message || 'Job failed');
        }

        const measurements = Object.values(iqmResult.measurements || {})[0] || [];
        const counts = getMeasurementCounts(measurements);

        setResult({
          counts,
          shots: iqmResult.metadata?.shots_executed || Object.values(counts).reduce((a, b) => a + b, 0),
          jobId,
        });

        // Update history
        setHistory((prev) =>
          prev.map((h) =>
            h.id === historyEntry.id
              ? { ...h, status: 'completed', result: iqmResult, counts, iqmJobId: jobId }
              : h
          )
        );

        setStatus(`Job completed: ${jobId}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setStatus('');

      // Update history
      setHistory((prev) =>
        prev.map((h) =>
          h.id === historyEntry.id ? { ...h, status: 'failed', error: errorMessage } : h
        )
      );
    } finally {
      setIsRunning(false);
    }
  }, [code, mode]);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const loadExample = useCallback((exampleCode: string) => {
    setCode(exampleCode);
    setShowExamples(false);
    setResult(null);
    setError('');
  }, []);

  const loadFromHistory = useCallback((entry: JobHistoryEntry) => {
    setCode(entry.code);
    setMode(entry.mode);
    if (entry.counts) {
      setResult({
        counts: entry.counts,
        shots: Object.values(entry.counts).reduce((a, b) => a + b, 0),
      });
    }
    setShowHistory(false);
  }, []);

  // Calculate bar chart data
  const chartData = result
    ? Object.entries(result.counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([state, count]) => ({
          state: `|${state}⟩`,
          count,
          probability: count / result.shots,
        }))
    : [];

  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-cyan-400" />
            Live Quantum REPL
          </h2>
          <p className="text-gray-400 mt-1">
            Write quantum circuits and run them on simulators or real hardware
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-4">
          <div className="glass-card p-1 flex gap-1">
            <button
              onClick={() => setMode('simulation')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                mode === 'simulation'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Cpu className="w-4 h-4" />
              Simulation
            </button>
            <button
              onClick={() => setMode('iqm')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                mode === 'iqm'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Server className="w-4 h-4" />
              IQM Hardware
            </button>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-all ${
              showSettings ? 'bg-indigo-500/30 text-indigo-400' : 'glass-card text-gray-400 hover:text-white'
            }`}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                IQM Configuration
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    IQM Server URL
                  </label>
                  <input
                    type="text"
                    value={config.serverUrl}
                    onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="https://cocos.resonance.meetiqm.com/garnet"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available systems: Garnet, Emerald, Deneb
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Token
                  </label>
                  <input
                    type="password"
                    value={config.token}
                    onChange={(e) => setConfig({ ...config, token: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="Your IQM API token"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get your token from{' '}
                    <a
                      href="https://resonance.meetiqm.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      IQM Resonance
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.useProxy}
                    onChange={(e) => setConfig({ ...config, useProxy: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-300">Use CORS Proxy</span>
                </label>

                {config.useProxy && (
                  <input
                    type="text"
                    value={config.proxyUrl}
                    onChange={(e) => setConfig({ ...config, proxyUrl: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-gray-800/50 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                    placeholder="Proxy URL"
                  />
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Save Configuration
                </button>
                <button
                  onClick={handleClearConfig}
                  className="px-4 py-2 glass-card text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Clear
                </button>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-200">
                  <strong>Note:</strong> Your token is stored locally in your browser. For production use,
                  consider running a backend proxy. Browser CORS restrictions may prevent direct API calls.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Editor and Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Editor Panel */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-sm text-gray-400">quantum_circuit.py</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="px-3 py-1.5 text-sm glass-card text-gray-300 hover:text-white rounded-lg flex items-center gap-1"
              >
                Examples
                {showExamples ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={handleCopyCode}
                className="p-2 glass-card text-gray-400 hover:text-white rounded-lg"
                title="Copy code"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  setCode(DEFAULT_CODE);
                  setResult(null);
                  setError('');
                }}
                className="p-2 glass-card text-gray-400 hover:text-white rounded-lg"
                title="Reset"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Examples Dropdown */}
          <AnimatePresence>
            {showExamples && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-gray-700/50 overflow-hidden"
              >
                <div className="p-4 space-y-2 bg-gray-800/30">
                  {EXAMPLE_CIRCUITS.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => loadExample(example.code)}
                      className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="font-medium text-white">{example.name}</div>
                      <div className="text-sm text-gray-400">{example.description}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Monaco Editor */}
          <div className="h-96">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16 },
                tabSize: 2,
              }}
            />
          </div>

          {/* Run Button */}
          <div className="p-4 border-t border-gray-700/50">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                isRunning
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : mode === 'simulation'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
              }`}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {mode === 'simulation' ? 'Simulating...' : 'Running on IQM...'}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Run {mode === 'simulation' ? 'Simulation' : 'on IQM'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
            <h3 className="font-semibold text-white">Results</h3>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 transition-all ${
                showHistory
                  ? 'bg-indigo-500/30 text-indigo-400'
                  : 'glass-card text-gray-300 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              History
            </button>
          </div>

          {/* History Panel */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-gray-700/50 overflow-hidden"
              >
                <div className="p-4 space-y-2 bg-gray-800/30 max-h-60 overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No history yet</p>
                  ) : (
                    <>
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={() => {
                            setHistory([]);
                            localStorage.removeItem(HISTORY_STORAGE_KEY);
                          }}
                          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                        >
                          Clear History
                        </button>
                      </div>
                      {history.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => loadFromHistory(entry)}
                          className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              entry.mode === 'simulation'
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-purple-500/20 text-purple-400'
                            }`}
                          >
                            {entry.mode}
                          </span>
                          <span
                            className={`text-xs ${
                              entry.status === 'completed'
                                ? 'text-green-400'
                                : entry.status === 'failed'
                                ? 'text-red-400'
                                : 'text-yellow-400'
                            }`}
                          >
                            {entry.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                          <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                          {entry.iqmJobId && (
                            <span className="text-xs font-mono text-gray-500">
                              {entry.iqmJobId.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </button>
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Content */}
          <div className="p-4 min-h-[400px] flex flex-col">
            {/* Status */}
            {status && (
              <div className="mb-4 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-300 text-sm">
                {status}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">Error</p>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Results */}
            {result ? (
              <div className="space-y-6 flex-1">
                {/* Measurement Histogram */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">
                    Measurement Results ({result.shots.toLocaleString()} shots)
                  </h4>

                  <div className="space-y-2">
                    {chartData.map((d, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-16 text-right font-mono text-cyan-400 text-sm">
                          {d.state}
                        </span>
                        <div className="flex-1 h-8 bg-gray-800/50 rounded-lg overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(d.count / maxCount) * 100}%` }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
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
                </div>

                {/* Theoretical Probabilities (simulation only) */}
                {result.probabilities && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">
                      Theoretical Probabilities
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {result.probabilities.map((p, i) => (
                        <div
                          key={i}
                          className="px-3 py-2 bg-gray-800/50 rounded-lg flex justify-between"
                        >
                          <span className="font-mono text-cyan-400">|{p.state}⟩</span>
                          <span className="text-gray-300">
                            {(p.probability * 100).toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Job ID (IQM only) */}
                {result.jobId && (
                  <div className="text-sm text-gray-400">
                    Job ID: <span className="font-mono text-gray-300">{result.jobId}</span>
                  </div>
                )}
              </div>
            ) : !error && !isRunning ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400">Run your circuit to see results</p>
                <p className="text-gray-500 text-sm mt-1">
                  Use simulation mode for quick testing, or connect to IQM for real quantum execution
                </p>
              </div>
            ) : isRunning ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
                <p className="text-gray-300">
                  {mode === 'simulation' ? 'Running simulation...' : 'Executing on IQM hardware...'}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">About the Live REPL</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Simulation Mode
            </h4>
            <p className="text-gray-400 text-sm">
              Run circuits locally using our built-in quantum simulator. Perfect for testing and
              learning before using real hardware. Supports up to 10 qubits with common gates.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
              <Server className="w-4 h-4" />
              Hardware Mode (IQM)
            </h4>
            <p className="text-gray-400 text-sm">
              Execute circuits on real superconducting quantum processors via IQM Resonance.
              Requires an account and API token. Circuits are transpiled to hardware-native gates.
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-800/30 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">Supported Syntax</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="text-gray-400">
              <span className="text-indigo-400">Single-qubit:</span> h, x, y, z, s, t, rx, ry, rz
            </div>
            <div className="text-gray-400">
              <span className="text-indigo-400">Two-qubit:</span> cx, cz
            </div>
            <div className="text-gray-400">
              <span className="text-indigo-400">Hardware native:</span> cz, prx
            </div>
            <div className="text-gray-400">
              <span className="text-indigo-400">Measurement:</span> measure_all()
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-4">
          <a
            href="https://iqm-finland.github.io/iqm-client/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            IQM Client Docs <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://resonance.meetiqm.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Get Hardware Access <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
