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

            {/* Tab Content */}
            {activeTab === 'lab' && <QuantumLab />}
          </section>
        </main>

        <Footer />
      </div>
    </QuantumProvider>
  )
}

export default App
