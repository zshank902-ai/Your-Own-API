import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  ArrowRight, 
  Zap, 
  Copy, 
  Check, 
  Mail, 
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Registration success states
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Email and password are required.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/register', {
        email: email.trim(),
        password: password.trim()
      });

      const generatedKey = response.data.api_key;
      setNewKey(generatedKey);
      toast.success('Account successfully registered!');
    } catch (err: any) {
      console.error('Registration failed:', err);
      const detail = err.response?.data?.detail || 'Registration failed. Email might already be taken.';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      toast.success('API key copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleProceedToDashboard = () => {
    if (!newKey) return;
    if (!checkboxChecked) {
      toast.error('Please confirm you have saved your API key.');
      return;
    }
    
    // Set API Key and log in!
    localStorage.setItem('api_key', newKey);
    toast.success('Provisioning workspace... Welcome!');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#07070B] text-slate-200 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glow meshes */}
      <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-accent/10 blur-[150px] rounded-full pointer-events-none" />

      <AnimatePresence mode="wait">
        {!newKey ? (
          // STEP 1: Registration Form
          <motion.div 
            key="register-form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-xl shadow-2xl relative z-10"
          >
            {/* Logo header */}
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-4 group justify-center">
                <div className="bg-primary/10 p-2.5 rounded-xl group-hover:bg-primary/20 transition-all">
                  <Zap className="w-7 h-7 text-primary animate-pulse" />
                </div>
                <span className="text-2xl font-black text-white tracking-tight bg-clip-text bg-gradient-to-r from-white to-slate-400">
                  Your Own API
                </span>
              </Link>
              <h2 className="text-xl font-bold text-white mb-2">Create Developer Account</h2>
              <p className="text-sm text-slate-400">
                Register to instantly receive a secure personal API key.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  disabled={loading}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all pr-12"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-6"
              >
                {loading ? 'Registering Sandbox...' : 'Create Account & Key'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center mt-8 pt-6 border-t border-white/5 text-sm text-slate-400">
              Already registered?{' '}
              <Link to="/login" className="text-primary hover:text-primary/80 font-bold underline underline-offset-4 decoration-primary/30 transition-colors">
                Sign In with Key
              </Link>
            </div>
          </motion.div>
        ) : (
          // STEP 2: Crucial API Key Disclosure Screen
          <motion.div 
            key="key-disclosure"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-xl bg-white/5 border border-red-500/20 p-8 rounded-2xl backdrop-blur-xl shadow-2xl relative z-10"
          >
            {/* Warning Icon Banner */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="bg-red-500/10 p-3 rounded-full border border-red-500/30 mb-4 animate-bounce">
                <ShieldAlert className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Save Your API Key</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-md">
                This API key will only be shown <span className="text-red-400 font-bold underline">ONCE</span> in plaintext. For your security, the gateway database hashes this key and cannot recover it later.
              </p>
            </div>

            {/* API Key Presenter Block */}
            <div className="bg-black/60 border border-white/10 rounded-xl p-4.5 mb-6 flex items-center justify-between gap-4">
              <span className="font-mono text-sm text-primary select-all break-all tracking-wider">
                {newKey}
              </span>
              <button
                onClick={handleCopyKey}
                className="shrink-0 p-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors active:scale-95 flex items-center gap-1.5 font-semibold text-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Key
                  </>
                )}
              </button>
            </div>

            {/* Checkbox enforce agreement */}
            <label className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer group hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={checkboxChecked}
                onChange={(e) => setCheckboxChecked(e.target.checked)}
                className="mt-1 accent-primary w-4.5 h-4.5 rounded cursor-pointer"
              />
              <span className="text-xs text-slate-300 select-none leading-normal">
                I have copied my new API Key and saved it in a password manager or secure vault. I understand that if I lose it, I will have to regenerate a new key, causing my integrated applications to stop functioning.
              </span>
            </label>

            {/* Enter dashboard trigger button */}
            <button
              onClick={handleProceedToDashboard}
              className={`w-full flex items-center justify-center gap-2 mt-6 font-extrabold py-3.5 rounded-xl transition-all ${
                checkboxChecked
                  ? 'bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 text-white shadow-[0_0_20px_rgba(14,165,233,0.4)] hover:scale-[1.01]'
                  : 'bg-white/5 border border-white/5 text-slate-500 cursor-not-allowed'
              }`}
            >
              Enter Gateway Workspace
              <ArrowRight className="w-4.5 h-4.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Register;
