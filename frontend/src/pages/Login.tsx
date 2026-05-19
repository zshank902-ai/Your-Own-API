import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Key, ArrowRight, Zap, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error('Please enter an API key.');
      return;
    }

    setLoading(true);
    try {
      // Validate the key by calling the /v1/usage endpoint
      await axios.get('/v1/usage', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` }
      });
      
      // If it returns 200, key is active and valid!
      localStorage.setItem('api_key', apiKey.trim());
      toast.success('Access authorized! Welcome to Your Own API dashboard.');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('API key verification error:', err);
      const detail = err.response?.data?.detail || 'Invalid or inactive API Key. Please verify your credentials.';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070B] text-slate-200 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glow meshes */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-accent/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Main Form container */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-xl shadow-2xl relative z-10"
      >
        {/* Branding header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group justify-center">
            <div className="bg-primary/10 p-2.5 rounded-xl group-hover:bg-primary/20 transition-all">
              <Zap className="w-7 h-7 text-primary animate-pulse" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Your Own API
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white mb-2">Access Portal</h2>
          <p className="text-sm text-slate-400">
            Provide your live API key to authenticate into the gateway dashboard playground.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="apiKey" className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-primary" />
              API Key (sk-xxxx)
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-••••••••••••••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Authenticating Gateway...' : 'Enter Workspace'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Warning Alert */}
        <div className="mt-6 flex items-start gap-2.5 p-3 rounded-lg bg-primary/10 border border-primary/20 text-slate-300 text-xs leading-relaxed">
          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            API Keys are stored strictly on your local browser memory via secure localStorage. We do not keep logs of your session tokens.
          </span>
        </div>

        {/* Footnote Link */}
        <div className="text-center mt-8 pt-6 border-t border-white/5 text-sm text-slate-400">
          Don't have an API key yet?{' '}
          <Link to="/register" className="text-primary hover:text-primary/80 font-bold underline underline-offset-4 decoration-primary/30 transition-colors">
            Register and create one
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
