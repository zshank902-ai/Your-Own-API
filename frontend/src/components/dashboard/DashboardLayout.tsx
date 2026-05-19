import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import { 
  Key, 
  Copy, 
  Check, 
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';


interface UsageState {
  total_requests: number;
  limit: number;
  remaining_requests: number;
  reset_time_utc: string;
}

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState<UsageState | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('api_key');
    if (!storedKey) {
      toast.error('Session expired or unauthorized. Please log in.');
      navigate('/login');
    } else {
      setApiKey(storedKey);
      fetchUsage(storedKey);
    }
  }, [navigate]);

  const fetchUsage = async (key: string) => {
    setLoadingUsage(true);
    try {
      // Axios configuration with API key
      const response = await axios.get('/v1/usage', {
        headers: { Authorization: `Bearer ${key}` }
      });
      setUsage(response.data);
    } catch (err: any) {
      console.error('Failed to load usage data:', err);
      // If unauthorized, redirect to login
      if (err.response?.status === 401) {
        localStorage.removeItem('api_key');
        toast.error('Invalid API Key. Please log in again.');
        navigate('/login');
      }
    } finally {
      setLoadingUsage(false);
    }
  };

  const handleCopyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success('API Key copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateKey = async () => {
    if (!apiKey) return;
    if (!window.confirm('WARNING: Regenerating your API key will immediately revoke your current key and all integrated applications will stop working. Do you want to proceed?')) {
      return;
    }

    try {
      const response = await axios.post('/v1/regenerate-key', {}, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const newKey = response.data.new_api_key;
      localStorage.setItem('api_key', newKey);
      setApiKey(newKey);
      toast.success('API key successfully regenerated!');
      fetchUsage(newKey);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to regenerate API key');
    }
  };

  // Human readable title from path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.endsWith('/chat')) return 'Unified Chat Playground';
    if (path.endsWith('/vision')) return 'Vision AI Playground';
    if (path.endsWith('/rag')) return 'RAG Document Library';
    if (path.endsWith('/images')) return 'Creative Image Suite';
    if (path.endsWith('/audio')) return 'Acoustic Voice System';
    if (path.endsWith('/agents')) return 'Autonomous AI Agents';
    return 'Gateway Command Center';
  };

  const maskApiKey = (key: string | null) => {
    if (!key) return '';
    return `${key.slice(0, 7)}••••••••••••••••${key.slice(-4)}`;
  };

  const usagePercentage = usage ? (usage.total_requests / usage.limit) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#07070B] text-slate-200 flex">
      {/* Background glow meshes */}
      <div className="fixed top-0 right-0 w-[45%] h-[45%] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[45%] h-[45%] bg-accent/5 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Sidebar Component */}
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />

      {/* Main Panel Content Container */}
      <div 
        className="flex-1 min-h-screen flex flex-col transition-all duration-300 relative z-10"
        style={{ marginLeft: isSidebarCollapsed ? '72px' : '260px' }}
      >
        {/* Upper Dashboard Header Bar */}
        <header className="h-[80px] bg-[#0A0A0F]/60 backdrop-blur-xl border-b border-white/5 px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-widest text-primary/80">Command Suite</span>
            <h1 className="text-xl font-bold text-white tracking-tight">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Usage Display */}
            {usage && (
              <div className="hidden lg:flex flex-col w-[200px] gap-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Daily Requests</span>
                  <span className="text-slate-200">{usage.total_requests} / {usage.limit}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, usagePercentage)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      usagePercentage > 90 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                      usagePercentage > 75 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' :
                      'bg-gradient-to-r from-primary to-accent shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* API Key Controller Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 max-w-[340px]">
              <Key className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-mono text-slate-300 select-none overflow-hidden text-ellipsis whitespace-nowrap">
                {maskApiKey(apiKey)}
              </span>
              <div className="flex items-center border-l border-white/10 pl-2 ml-1 gap-1">
                <button 
                  onClick={handleCopyKey}
                  className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-all active:scale-90"
                  title="Copy API Key"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button 
                  onClick={handleRegenerateKey}
                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded transition-all active:scale-90"
                  title="Regenerate API Key"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Refresh Usage Button */}
            <button 
              onClick={() => apiKey && fetchUsage(apiKey)}
              disabled={loadingUsage}
              className={`p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors active:scale-95 shrink-0 ${
                loadingUsage ? 'animate-spin' : ''
              }`}
              title="Refresh Quota"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Nested Child Route Content Render Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet context={{ usage, refreshUsage: () => apiKey && fetchUsage(apiKey) }} />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
