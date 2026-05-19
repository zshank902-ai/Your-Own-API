import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Globe, 
  Bot, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Shield, 
  Save, 
  Database,
  Cpu
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface UsageState {
  total_requests: number;
  limit: number;
  remaining_requests: number;
  reset_time_utc: string;
}

interface UsageDetailedItem {
  model_used: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
}

interface UsageDetailedResponse {
  month: string;
  usage_by_model: UsageDetailedItem[];
  total_estimated_cost_usd: number;
}

interface OutletContextType {
  usage: UsageState | null;
  refreshUsage: () => void;
}

const DashboardHome: React.FC = () => {
  const { usage, refreshUsage } = useOutletContext<OutletContextType>();
  const [detailedUsage, setDetailedUsage] = useState<UsageDetailedResponse | null>(null);

  // Form states
  const [systemPrompt, setSystemPrompt] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);

  const apiKey = localStorage.getItem('api_key');

  useEffect(() => {
    if (apiKey) {
      fetchDetailedUsage(apiKey);
    }
  }, [apiKey]);

  const fetchDetailedUsage = async (key: string) => {
    try {
      const response = await axios.get('/v1/usage/detailed', {
        headers: { Authorization: `Bearer ${key}` }
      });
      setDetailedUsage(response.data);
    } catch (err) {
      console.error('Failed to load detailed usage:', err);
    }
  };

  const handleUpdatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) return;
    setSavingPrompt(true);
    try {
      await axios.post('/v1/system-prompt', { system_prompt: systemPrompt }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      toast.success('Global System Prompt updated successfully!');
      refreshUsage();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update system prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleRegisterWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) return;
    if (!webhookUrl.trim().startsWith('http://') && !webhookUrl.trim().startsWith('https://')) {
      toast.error('Please enter a valid HTTP/HTTPS URL.');
      return;
    }
    setSavingWebhook(true);
    try {
      await axios.post('/v1/webhooks/register', { webhook_url: webhookUrl.trim() }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      toast.success('Webhook URL registered successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to register webhook');
    } finally {
      setSavingWebhook(false);
    }
  };

  // Recharts color palette
  const COLORS = ['#0EA5E9', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981'];

  const chartData = detailedUsage?.usage_by_model.map(item => ({
    name: item.model_used.replace('-20240307', '').replace('-20241022', ''),
    tokens: item.total_tokens,
    cost: item.estimated_cost_usd
  })) || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Requests Stat Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass rounded-2xl p-6 flex items-center justify-between border border-white/5 relative overflow-hidden group hover:border-primary/20 transition-all duration-300"
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Requests</span>
            <span className="text-2xl font-black text-white mt-1">
              {usage ? usage.total_requests : '0'}
            </span>
            <span className="text-[10px] text-slate-500 mt-2">
              Last 24h rolling count
            </span>
          </div>
          <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 text-primary group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Plan Tier Stat Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="glass rounded-2xl p-6 flex items-center justify-between border border-white/5 relative overflow-hidden group hover:border-accent/20 transition-all duration-300"
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Plan Tier</span>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mt-1 capitalize">
              {usage ? (usage.limit > 500 ? 'Pro Tier' : 'Sandbox Free') : 'Sandbox Free'}
            </span>
            <span className="text-[10px] text-slate-500 mt-2">
              {usage ? `${usage.limit} reqs/day quota` : ''}
            </span>
          </div>
          <div className="bg-accent/10 p-3 rounded-xl border border-accent/20 text-accent group-hover:scale-110 transition-transform">
            <Shield className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Estimated Cost Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass rounded-2xl p-6 flex items-center justify-between border border-white/5 relative overflow-hidden group hover:border-amber-500/20 transition-all duration-300"
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cost (This Month)</span>
            <span className="text-2xl font-black text-white mt-1">
              ${detailedUsage ? detailedUsage.total_estimated_cost_usd.toFixed(4) : '0.0000'}
            </span>
            <span className="text-[10px] text-slate-500 mt-2">
              Calculated from model tokens
            </span>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-amber-500 group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Quota Remaining Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="glass rounded-2xl p-6 flex items-center justify-between border border-white/5 relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300"
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Remaining Quota</span>
            <span className="text-2xl font-black text-white mt-1">
              {usage ? usage.remaining_requests : '0'}
            </span>
            <span className="text-[10px] text-slate-500 mt-2">
              Requests before rate limit
            </span>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-500 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* Main Stats Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Usage by Model (Bar Chart) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-2xl border border-white/5 p-6 lg:col-span-2 flex flex-col justify-between"
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white tracking-tight">Token Consumption</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Current Month</span>
          </div>

          <div className="h-[280px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F0F16', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    labelStyle={{ fontWeight: 'bold', color: '#0EA5E9' }}
                  />
                  <Bar dataKey="tokens" name="Total Tokens" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No active token logs detected for this month.
              </div>
            )}
          </div>
        </motion.div>

        {/* Model Market Share (Pie Chart) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="glass rounded-2xl border border-white/5 p-6 flex flex-col justify-between"
        >
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-bold text-white tracking-tight">API Cost Share</h2>
            </div>
          </div>

          <div className="h-[220px] w-full flex justify-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="cost"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`$${Number(value).toFixed(4)}`, 'Cost']}
                    contentStyle={{ backgroundColor: '#0F0F16', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No cost metrics loaded.
              </div>
            )}
          </div>

          {/* Custom Legends */}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs">
            {chartData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-slate-400 font-mono capitalize">{entry.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Control Panels: System Prompt and Webhooks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global System Prompt configuration */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass rounded-2xl border border-white/5 p-6 flex flex-col justify-between"
        >
          <form onSubmit={handleUpdatePrompt} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white tracking-tight">Global Assistant Persona</h2>
            </div>
            <p className="text-xs text-slate-400">
              Configure a global persona, behavioral rule, or system instruction that is automatically prepended to every single Chat Completion endpoint call for this API Key.
            </p>
            <textarea
              rows={4}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="E.g. You are a senior solutions architect. Provide extremely detailed code snippets in TypeScript. Be concise and keep your explanations dry."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono"
            />
            <button
              type="submit"
              disabled={savingPrompt}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(14,165,233,0.2)] active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingPrompt ? 'Updating Persona...' : 'Save System Persona'}
            </button>
          </form>
        </motion.div>

        {/* Webhooks configuration */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass rounded-2xl border border-white/5 p-6 flex flex-col justify-between"
        >
          <form onSubmit={handleRegisterWebhook} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-bold text-white tracking-tight">Rate Limit Webhooks</h2>
            </div>
            <p className="text-xs text-slate-400">
              Receive automated, lightning-fast POST payloads immediately to your backend server whenever this API key hits 100% usage thresholds or daily quotas.
            </p>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://api.yourcompany.com/v1/webhooks"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all font-mono"
            />
            <button
              type="submit"
              disabled={savingWebhook}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/95 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)] active:scale-95 disabled:opacity-50"
            >
              <Globe className="w-4 h-4" />
              {savingWebhook ? 'Registering Endpoint...' : 'Register Webhook'}
            </button>
          </form>
        </motion.div>
      </div>

      {/* Model Costs Grid Table */}
      <motion.div 
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass rounded-2xl border border-white/5 p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white tracking-tight">Active Model Pipeline Summary</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Model ID</th>
                <th className="py-3 px-4 text-center">Prompt Tokens</th>
                <th className="py-3 px-4 text-center">Completion Tokens</th>
                <th className="py-3 px-4 text-center">Total Tokens</th>
                <th className="py-3 px-4 text-right">Cost (USD)</th>
              </tr>
            </thead>
            <tbody>
              {detailedUsage && detailedUsage.usage_by_model.length > 0 ? (
                detailedUsage.usage_by_model.map((item, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors font-mono">
                    <td className="py-4 px-4 text-white font-sans font-semibold capitalize">
                      {item.model_used.replace('-20240307', '').replace('-20241022', '')}
                    </td>
                    <td className="py-4 px-4 text-center text-slate-300">
                      {item.prompt_tokens.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-center text-slate-300">
                      {item.completion_tokens.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-center text-slate-300">
                      {item.total_tokens.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right text-emerald-400 font-bold">
                      ${item.estimated_cost_usd.toFixed(4)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    No active model requests logged. Run chat or vision playground pipelines to see data!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardHome;
