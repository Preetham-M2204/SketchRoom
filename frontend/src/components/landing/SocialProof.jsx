import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

/**
 * SocialProof Component
 * Displays user testimonials and usage stats
 *
 * Sections:
 * - User count stat
 * - Featured testimonial
 * - Trust indicators
 */

const SocialProof = () => {
  return (
    <section className="py-80 px-24 max-w-7xl mx-auto">
      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-64"
      >
        <div className="inline-flex items-baseline gap-12 mb-16">
          <span className="text-80 font-light text-text-primary">2.4k+</span>
          <span className="text-20 text-text-secondary">active teams</span>
        </div>
        <p className="text-16 text-text-tertiary">
          Building better products together
        </p>
      </motion.div>

      {/* Featured Testimonial */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="
          bg-surface-bright p-48 rounded-card
          border border-border-light
          max-w-4xl mx-auto
        "
      >
        {/* Stars */}
        <div className="flex gap-4 mb-20">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={18}
              className="fill-vermillion text-vermillion"
            />
          ))}
        </div>

        {/* Quote */}
        <blockquote className="text-24 font-light text-text-primary leading-relaxed mb-32">
          "Sketchroom replaced three different tools we were using. The decision board alone saved us hours in planning meetings. It's the first tool that actually feels built for how teams think."
        </blockquote>

        {/* Author */}
        <div className="flex items-center gap-16">
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-vermillion to-slate-teal flex items-center justify-center text-white font-semibold text-18">
            ER
          </div>
          <div>
            <div className="text-16 font-semibold text-text-primary">
              Elena Rodriguez
            </div>
            <div className="text-14 text-text-secondary">
              Product Lead at Velo
            </div>
          </div>
        </div>
      </motion.div>

      {/* Trust Indicators */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap items-center justify-center gap-48 mt-64"
      >
        <div className="text-center">
          <div className="text-32 font-semibold text-text-primary">99.9%</div>
          <div className="text-14 text-text-secondary">Uptime</div>
        </div>
        <div className="text-center">
          <div className="text-32 font-semibold text-text-primary">{'<'} 50ms</div>
          <div className="text-14 text-text-secondary">Avg Latency</div>
        </div>
        <div className="text-center">
          <div className="text-32 font-semibold text-text-primary">256-bit</div>
          <div className="text-14 text-text-secondary">Encryption</div>
        </div>
        <div className="text-center">
          <div className="text-32 font-semibold text-text-primary">GDPR</div>
          <div className="text-14 text-text-secondary">Compliant</div>
        </div>
      </motion.div>
    </section>
  )
}

export default SocialProof
