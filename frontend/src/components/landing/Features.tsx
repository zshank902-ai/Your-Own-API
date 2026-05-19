import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Activity, Lock, Zap, Bot, Database } from 'lucide-react';

const features = [
  {
    icon: <Bot className="w-6 h-6 text-primary" />,
    title: "Multi-Model Support",
    description: "Switch between Claude, Gemini, and LLaMA instantly without changing a single line of your application code."
  },
  {
    icon: <Activity className="w-6 h-6 text-accent" />,
    title: "Real-time Streaming",
    description: "Deliver a ChatGPT-like typing experience with built-in Server-Sent Events (SSE) streaming."
  },
  {
    icon: <Database className="w-6 h-6 text-green-400" />,
    title: "Conversation Memory",
    description: "We automatically store and manage conversation history. Just pass a session ID and we handle the rest."
  },
  {
    icon: <Zap className="w-6 h-6 text-yellow-400" />,
    title: "Ultra-Low Latency",
    description: "Deployed at the edge with Redis caching, guaranteeing sub-50ms overhead to all LLM requests."
  },
  {
    icon: <Layers className="w-6 h-6 text-blue-400" />,
    title: "Detailed Analytics",
    description: "Track tokens, costs, and model usage in real-time through our developer dashboard."
  },
  {
    icon: <Lock className="w-6 h-6 text-rose-400" />,
    title: "Enterprise Security",
    description: "End-to-end encryption, automatic key rotation, and strict rate limiting to protect your budget."
  }
];

const Features: React.FC = () => {
  return (
    <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-bold text-white mb-4"
        >
          Everything you need to scale
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-slate-400 text-lg max-w-2xl mx-auto"
        >
          We abstracted away the complex parts of building AI applications so you can focus on your product.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="glass p-8 rounded-2xl hover:-translate-y-1 transition-transform duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6">
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
            <p className="text-slate-400 leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Features;
