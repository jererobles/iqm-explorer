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
              Quantum Explorer
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              An interactive platform for learning quantum computing concepts
              and running circuits on real hardware. Built for students, researchers,
              and anyone curious about quantum phenomena.
            </p>
            <div className="flex items-center gap-4">
              <motion.a
                href="https://github.com/iqm-finland/iqm-client"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
              >
                <Github className="w-5 h-5" />
              </motion.a>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-white mb-4">Learn More</h4>
            <ul className="space-y-2">
              {[
                { label: 'Qiskit Textbook', url: 'https://qiskit.org/learn' },
                { label: 'Cirq Documentation', url: 'https://quantumai.google/cirq' },
                { label: 'Quantum Country', url: 'https://quantum.country/' },
                { label: 'IQM Client Docs', url: 'https://docs.meetiqm.com' },
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

          {/* Hardware */}
          <div>
            <h4 className="font-semibold text-white mb-4">Run on Hardware</h4>
            <ul className="space-y-2">
              {[
                { label: 'IQM Resonance', url: 'https://www.meetiqm.com/iqm-resonance' },
                { label: 'IBM Quantum', url: 'https://quantum.ibm.com/' },
                { label: 'Amazon Braket', url: 'https://aws.amazon.com/braket/' },
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
              An open educational project for learning quantum computing.
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
