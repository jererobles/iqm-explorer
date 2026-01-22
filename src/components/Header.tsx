import { motion } from 'framer-motion'
import { Atom, Menu, X } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  setActiveTab: (tab: 'lab' | 'hardware') => void
}

export default function Header({ setActiveTab }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <motion.header
      className="sticky top-0 z-50 glass"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setActiveTab('lab')}
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative">
              <Atom className="w-10 h-10 text-indigo-400" />
              <div className="absolute inset-0 w-10 h-10 bg-indigo-500/30 blur-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Quantum Explorer
              </h1>
              <p className="text-xs text-gray-400">Learn. Build. Explore.</p>
            </div>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="https://qiskit.org/learn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors text-sm"
            >
              Qiskit
            </a>
            <a
              href="https://github.com/iqm-finland/iqm-client"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors text-sm"
            >
              GitHub
            </a>
            <motion.button
              className="btn-quantum text-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started
            </motion.button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-300 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.nav
            className="md:hidden mt-4 pt-4 border-t border-gray-700"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex flex-col gap-4">
              <a
                href="https://qiskit.org/learn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Qiskit Tutorials
              </a>
              <a
                href="https://github.com/iqm-finland/iqm-client"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors"
              >
                GitHub
              </a>
              <button className="btn-quantum w-full">
                Get Started
              </button>
            </div>
          </motion.nav>
        )}
      </div>
    </motion.header>
  )
}
