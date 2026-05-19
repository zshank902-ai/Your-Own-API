import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Mic, FileText, Image as ImageIcon, MessageSquare, Terminal } from 'lucide-react';

const PlaceholderPlayground: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  const getPlaceholderConfig = () => {
    if (path.endsWith('/chat')) {
      return {
        title: 'Unified Completion Gateway',
        desc: 'Advanced multi-model completions with built-in rolling short-term and long-term memory context. Stream Claude, Gemini, LLaMA, and Mistral through a single endpoint.',
        icon: MessageSquare,
        color: 'text-primary',
        glow: 'bg-primary/10',
        feature: 'Feature 1 — Unified Chat completions'
      };
    }
    if (path.endsWith('/rag')) {
      return {
        title: 'Cognitive RAG Documents',
        desc: 'Chat with your databases, PDFs, and document structures. ChromaDB-powered real-time vector embeddings, semantic lookups, and citation-based answers.',
        icon: FileText,
        color: 'text-emerald-400',
        glow: 'bg-emerald-500/10',
        feature: 'Feature 2 — Retrieval-Augmented Generation (RAG)'
      };
    }
    if (path.endsWith('/images')) {
      return {
        title: 'Creative Image Suite',
        desc: 'Generate, edit, and create variations of high-fidelity images using Stable Diffusion XL and DALL-E 3. Full support for inpainting, outpainting, and history logs.',
        icon: ImageIcon,
        color: 'text-amber-500',
        glow: 'bg-amber-500/10',
        feature: 'Feature 3 — Image Generation (DALL-E / Stable Diffusion)'
      };
    }
    if (path.endsWith('/audio')) {
      return {
        title: 'Voice & Speech Audio System',
        desc: 'Acoustic conversions, text-to-speech with natural intonation, rapid speech-to-text transcriptions, and interactive voice-agent chat.',
        icon: Mic,
        color: 'text-pink-500',
        glow: 'bg-pink-500/10',
        feature: 'Feature 4 — Voice & Speech (TTS / STT)'
      };
    }
    return {
      title: 'Autonomous AI Agents',
      desc: 'Deploy custom pipelines of multi-agent groups. Choose from predefined tools, let agents execute code, resolve custom API actions, and collaborate together.',
      icon: Bot,
      color: 'text-accent',
      glow: 'bg-accent/10',
      feature: 'Feature 5 — AI Agents & Function Calling'
    };
  };

  const config = getPlaceholderConfig();

  return (
    <div className="min-h-[500px] flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-xl text-center glass rounded-2xl border border-white/5 p-12 relative overflow-hidden flex flex-col items-center"
      >
        {/* Glow behind */}
        <div className={`absolute -inset-10 ${config.glow} blur-[50px] rounded-full pointer-events-none z-0`} />

        <div className={`p-4.5 rounded-2xl bg-white/5 border border-white/10 ${config.color} mb-6 relative z-10 hover:scale-105 transition-transform duration-300`}>
          <config.icon className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-extrabold text-white tracking-tight relative z-10 mb-2">
          {config.title}
        </h2>
        
        <span className="text-[10px] uppercase font-bold tracking-widest text-primary px-2.5 py-0.5 rounded bg-primary/10 border border-primary/20 relative z-10 mb-4 inline-block">
          Pipeline Provisioning
        </span>

        <p className="text-sm text-slate-400 relative z-10 mb-8 max-w-md leading-relaxed">
          {config.desc}
        </p>

        {/* Feature timeline pill */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 relative z-10">
          <Terminal className="w-4 h-4 text-primary shrink-0" />
          <span>Active Roadmap: {config.feature}</span>
        </div>
      </motion.div>
    </div>
  );
};

export default PlaceholderPlayground;
