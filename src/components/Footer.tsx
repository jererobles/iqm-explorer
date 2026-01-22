import { motion } from 'framer-motion'
import { Github, ExternalLink, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative z-10 mt-20 border-t border-indigo-500/20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              IQM Quantum Explorer
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              An interactive platform for learning quantum computing concepts
              and exploring IQM's quantum hardware. Built for students, researchers,
              and quantum enthusiasts.
            </p>
            <div className="flex items-center gap-4">
              <motion.a
                href="https://github.com/iqm-finland"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
              >
                <Github className="w-5 h-5" />
              </motion.a>
              <motion.a
                href="https://www.meetiqm.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
              >
                <ExternalLink className="w-5 h-5" />
              </motion.a>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2">
              {[
                { label: 'IQM Documentation', url: 'https://docs.meetiqm.com' },
                { label: 'Qiskit Tutorials', url: 'https://qiskit.org/learn' },
                { label: 'Cirq Documentation', url: 'https://quantumai.google/cirq' },
                { label: 'Quantum Computing Basics', url: 'https://quantum-computing.ibm.com/composer/docs/iqx/guide/' },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-indigo-400 text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* IQM */}
          <div>
            <h4 className="font-semibold text-white mb-4">IQM Finland</h4>
            <ul className="space-y-2">
              {[
                { label: 'About IQM', url: 'https://www.meetiqm.com/about' },
                { label: 'IQM Resonance', url: 'https://www.meetiqm.com/iqm-resonance' },
                { label: 'IQM Academy', url: 'https://www.meetiqm.com/iqm-academy' },
                { label: 'Careers', url: 'https://www.meetiqm.com/careers' },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-indigo-400 text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              Educational project for learning quantum computing with IQM systems.
            </p>
            <p className="text-gray-500 text-sm flex items-center gap-1">
              Made with <Heart className="w-4 h-4 text-red-500" /> for quantum learners
            </p>
          </div>
        </div>

        {/* Quantum decoration */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-2 opacity-30">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-indigo-400"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
