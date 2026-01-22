import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import Hero from './components/Hero'
import QuantumLab from './components/QuantumLab'
import IQMIntegration from './components/IQMIntegration'
import Footer from './components/Footer'
import { QuantumProvider } from './context/QuantumContext'

type Tab = 'lab' | 'hardware'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('lab')

  return (
    <QuantumProvider>
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
            <div className="flex gap-2 justify-center mb-8">
              {[
                { id: 'lab', label: 'Quantum Lab', icon: '🔬', description: 'Code, Build & Visualize' },
                { id: 'hardware', label: 'Hardware', icon: '🔌', description: 'Run on IQM' },
              ].map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`px-8 py-4 rounded-xl font-medium transition-all duration-300 flex flex-col items-center gap-1 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                      : 'glass-card text-gray-300 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2 text-lg">
                    <span>{tab.icon}</span>
                    {tab.label}
                  </div>
                  <span className={`text-xs ${activeTab === tab.id ? 'text-white/70' : 'text-gray-500'}`}>
                    {tab.description}
                  </span>
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
                {activeTab === 'lab' && <QuantumLab />}
                {activeTab === 'hardware' && <IQMIntegration />}
              </motion.div>
            </AnimatePresence>
          </section>
        </main>

        <Footer />
      </div>
    </QuantumProvider>
  )
}

export default App
