import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const Comparison: React.FC = () => {
  return (
    <section className="py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-bold text-white mb-4"
        >
          Why choose Your Own API?
        </motion.h2>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="glass rounded-3xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-cardBorder">
                <th className="p-6 text-slate-400 font-medium">Feature</th>
                <th className="p-6 text-primary font-bold text-lg text-center bg-primary/5">Your Own API</th>
                <th className="p-6 text-slate-400 font-medium text-center">OpenAI API</th>
                <th className="p-6 text-slate-400 font-medium text-center">Gemini API</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cardBorder">
              {[
                { feature: "Multi-model Routing", ag: true, oa: false, gem: false },
                { feature: "Built-in Memory Management", ag: true, oa: false, gem: false },
                { feature: "Automated Retry Logic", ag: true, oa: false, gem: false },
                { feature: "Streaming Support", ag: true, oa: true, gem: true },
                { feature: "Local Open Source Models", ag: true, oa: false, gem: false },
                { feature: "Usage Analytics Dashboard", ag: true, oa: true, gem: false },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="p-6 text-slate-200 font-medium">{row.feature}</td>
                  <td className="p-6 text-center bg-primary/5">
                    {row.ag ? <Check className="w-5 h-5 text-primary mx-auto" /> : <X className="w-5 h-5 text-slate-600 mx-auto" />}
                  </td>
                  <td className="p-6 text-center">
                    {row.oa ? <Check className="w-5 h-5 text-slate-400 mx-auto" /> : <X className="w-5 h-5 text-slate-600 mx-auto" />}
                  </td>
                  <td className="p-6 text-center">
                    {row.gem ? <Check className="w-5 h-5 text-slate-400 mx-auto" /> : <X className="w-5 h-5 text-slate-600 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </section>
  );
};

export default Comparison;
