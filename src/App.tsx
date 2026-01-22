import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import Hero from './components/Hero'
import LiveREPL from './components/LiveREPL'
import LearningModules from './components/LearningModules'
import CircuitBuilder from './components/CircuitBuilder'
import IQMIntegration from './components/IQMIntegration'
import QuantumVisualizer from './components/QuantumVisualizer'
import Footer from './components/Footer'

type Tab = 'repl' | 'learn' | 'build' | 'integrate' | 'visualize'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('repl')

  return (
    <div className="min-h-screen quantum-grid">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <Header setActiveTab={setActiveTab} />

      <main className="relative z-10">
        <Hero />

        {/* Navigation Tabs */}
        <section className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {[
              { id: 'repl', label: 'Live REPL', icon: '⚡' },
              { id: 'learn', label: 'Learn Quantum', icon: '📚' },
              { id: 'build', label: 'Circuit Builder', icon: '🔧' },
              { id: 'integrate', label: 'IQM Integration', icon: '🔌' },
              { id: 'visualize', label: 'Visualizer', icon: '✨' },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                    : 'glass-card text-gray-300 hover:text-white'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </motion.button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'repl' && <LiveREPL />}
              {activeTab === 'learn' && <LearningModules />}
              {activeTab === 'build' && <CircuitBuilder />}
              {activeTab === 'integrate' && <IQMIntegration />}
              {activeTab === 'visualize' && <QuantumVisualizer />}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default App
