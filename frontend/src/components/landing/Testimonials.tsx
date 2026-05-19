import React from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    quote: "Switching to Your Own API cut our inference costs by 40% and completely removed the need to maintain our own memory states.",
    author: "Sarah Jenkins",
    role: "CTO at StartupX"
  },
  {
    quote: "The multi-model routing is a game changer. We fallback to LLaMA when Claude is rate-limited, and our users never notice a thing.",
    author: "David Chen",
    role: "Lead Engineer"
  },
  {
    quote: "Fastest integration I've ever done. The SDK is beautifully typed and the streaming just works out of the box.",
    author: "Alex Rivera",
    role: "Indie Hacker"
  }
];

const Testimonials: React.FC = () => {
  return (
    <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-cardBorder bg-black/10">
      <div className="text-center mb-16">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-bold text-white mb-4"
        >
          Loved by developers
        </motion.h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {testimonials.map((t, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="glass p-8 rounded-2xl relative"
          >
            <Quote className="w-10 h-10 text-primary/20 absolute top-6 right-6" />
            <p className="text-slate-300 italic mb-6 relative z-10">"{t.quote}"</p>
            <div>
              <p className="font-semibold text-white">{t.author}</p>
              <p className="text-sm text-slate-400">{t.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
