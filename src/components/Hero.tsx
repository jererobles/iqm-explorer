import { motion } from 'framer-motion'
import { Sparkles, Cpu, Zap } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative py-20 px-6 overflow-hidden">
      {/* Animated quantum particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-indigo-400/30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-gray-300">Harness the power of quantum phenomena</span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          className="text-5xl md:text-7xl font-extrabold mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="bg-gradient-to-r from-white via-indigo-200 to-white bg-clip-text text-transparent">
            Explore the
          </span>
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent quantum-glow-text">
            Quantum World
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Superposition. Entanglement. Interference. Learn the quantum phenomena
          that make computation fundamentally different, then run circuits on real hardware.
        </motion.p>

      </div>
    </section>
  )
}
