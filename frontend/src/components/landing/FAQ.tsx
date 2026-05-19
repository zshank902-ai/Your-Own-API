import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: "How does the pricing work?",
    a: "You only pay for the tokens you consume. There is no base fee. Pricing maps exactly to the underlying provider costs (e.g., Anthropic or Google) with a small 2% infrastructure markup."
  },
  {
    q: "Can I use my own API keys from OpenAI or Anthropic?",
    a: "Yes! If you are on the Enterprise plan, you can supply your own Provider API keys and entirely bypass our markup, paying only a flat monthly SaaS fee."
  },
  {
    q: "How does the conversation memory work?",
    a: "Instead of sending the entire conversation history in every request, you pass a 'session_id'. Our backend retrieves the history from PostgreSQL, appends your new message, and sends the full context to the LLM automatically."
  },
  {
    q: "Is streaming supported on all models?",
    a: "Yes. Our unified endpoint uses Server-Sent Events (SSE) to stream chunks from Claude, Gemini, and LLaMA seamlessly to your application."
  }
];

const FAQ: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Frequently Asked Questions</h2>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="glass rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="w-full px-6 py-4 flex justify-between items-center text-left focus:outline-none"
            >
              <span className="font-semibold text-white">{faq.q}</span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openIdx === idx ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openIdx === idx && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 pb-4 text-slate-400"
                >
                  <p>{faq.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FAQ;
