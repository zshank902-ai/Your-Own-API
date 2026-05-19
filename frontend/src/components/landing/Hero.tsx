import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';

const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}<span className="animate-pulse">|</span></span>;
};

// codeSnippet removed

const Hero: React.FC = () => {
  return (
    <section className="relative pt-20 pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12">
      {/* Left Text */}
      <div className="flex-1 text-center lg:text-left z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6"
        >
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
          Your Own API SDK v1.0 is now live
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight"
        >
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            <TypewriterText text="The AI API built" />
          </span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            for developers.
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto lg:mx-0"
        >
          Access Claude, Gemini, and LLaMA through a single, lightning-fast unified endpoint. 
          Built-in memory, token usage tracking, and streaming out of the box.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
        >
          <Link to="/register" className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-8 rounded-lg shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all hover:scale-105 active:scale-95">
            Start Building Free
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link to="/docs" className="flex items-center justify-center gap-2 glass hover:bg-cardBorder text-slate-200 font-semibold py-3 px-8 rounded-lg transition-all">
            <Terminal className="w-4 h-4" />
            Read Documentation
          </Link>
        </motion.div>
      </div>

      {/* Right Code Snippet */}
      <motion.div 
        initial={{ opacity: 0, x: 50, rotateX: 10 }}
        animate={{ opacity: 1, x: 0, rotateX: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="flex-1 w-full max-w-xl z-10"
        style={{ perspective: '1000px' }}
      >
        <div className="glass rounded-xl overflow-hidden shadow-2xl border border-cardBorder/50 transform rotate-2 hover:rotate-0 transition-transform duration-500">
          <div className="flex items-center px-4 py-3 bg-black/40 border-b border-cardBorder gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <span className="text-xs text-slate-400 ml-2 font-mono">app.ts</span>
          </div>
          <div className="p-6 bg-[#0d1117] overflow-x-auto">
            <pre className="text-sm font-mono leading-relaxed">
              <code className="text-slate-300">
                <span className="text-accent">import</span> YourOwnAPI <span className="text-accent">from</span> <span className="text-green-400">'your-own-api-sdk'</span>;<br/><br/>
                <span className="text-accent">const</span> client = <span className="text-accent">new</span> <span className="text-primary">YourOwnAPI</span>({'{'}<br/>
                {'  '}apiKey: <span className="text-green-400">'sk-live-xxxxxxxxx'</span><br/>
                {'}'});<br/><br/>
                <span className="text-accent">const</span> response = <span className="text-accent">await</span> client.chat.<span className="text-primary">create</span>({'{'}<br/>
                {'  '}model: <span className="text-green-400">'claude-3-haiku'</span>,<br/>
                {'  '}messages: [{'{'} role: <span className="text-green-400">'user'</span>, content: <span className="text-green-400">'Hello!'</span> {'}'}]<br/>
                {'}'});<br/><br/>
                console.<span className="text-primary">log</span>(response.content);
              </code>
            </pre>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
