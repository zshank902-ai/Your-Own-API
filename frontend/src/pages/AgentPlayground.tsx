import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Trash2, 
  Plus, 
  Terminal, 
  Settings, 
  Play, 
  Check, 
  Loader2, 
  Globe, 
  Calculator, 
  FileText, 
  Brain,
  ChevronRight,
  User,
  Shield,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface Agent {
  id: number;
  name: string;
  description: string | null;
  system_prompt: string;
  tools: string; // JSON array of string tool names
  created_at: string;
}

interface AgentRunStep {
  step: number;
  type: 'thought' | 'action' | 'final_answer';
  content?: string;
  tool?: string;
  input?: string;
  observation?: string;
}

const AgentPlayground: React.FC = () => {
  const apiKey = localStorage.getItem('api_key');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [running, setRunning] = useState(false);

  // New Agent Form State
  const [showBuilder, setShowBuilder] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDesc, setNewAgentDesc] = useState('');
  const [newAgentSystemPrompt, setNewAgentSystemPrompt] = useState(
    'You are an autonomous AI Agent persona designed to execute workflows. Answer the user prompt logically.'
  );
  const [selectedTools, setSelectedTools] = useState<string[]>(['web_search', 'calculator']);

  // Runner State
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('mock-agent-reasoner');
  const [runSteps, setRunSteps] = useState<AgentRunStep[]>([]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [runSteps, running]);

  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const response = await axios.get('/v1/agents', {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      setAgents(response.data);
    } catch (err: any) {
      console.error('Failed to load agents', err);
      toast.error('Failed to load active agent profiles.');
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) {
      toast.error('Agent Name is required.');
      return;
    }
    if (!newAgentSystemPrompt.trim()) {
      toast.error('System prompt instructions are required.');
      return;
    }

    try {
      const response = await axios.post('/v1/agents', {
        name: newAgentName,
        description: newAgentDesc || null,
        system_prompt: newAgentSystemPrompt,
        tools: selectedTools
      }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      toast.success(`Agent "${response.data.name}" provisioned successfully!`);
      // Reset builder form
      setNewAgentName('');
      setNewAgentDesc('');
      setNewAgentSystemPrompt('You are an autonomous AI Agent persona designed to execute workflows. Answer the user prompt logically.');
      setSelectedTools(['web_search', 'calculator']);
      setShowBuilder(false);
      
      // Select new agent and refresh
      setSelectedAgentId(response.data.id);
      fetchAgents();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create agent profile.');
    }
  };

  const handleDeleteAgent = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to retire this agent profile?')) return;

    try {
      await axios.delete(`/v1/agents/${id}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      toast.success('Agent profile retired.');
      if (selectedAgentId === id) {
        setSelectedAgentId(null);
      }
      fetchAgents();
    } catch (err: any) {
      toast.error('Failed to delete agent profile.');
    }
  };

  const handleRunAgent = async () => {
    if (!prompt.trim()) {
      toast.error('Please specify a prompt or directive for the agent.');
      return;
    }

    setRunning(true);
    setRunSteps([]);

    // Initial dummy loading state for terminal immersion
    setRunSteps([
      {
        step: 1,
        type: 'thought',
        content: `Contacting agent core module... Resolving configurations for ${
          selectedAgentId 
            ? `Agent ID: ${selectedAgentId}` 
            : 'Default Autonomous Reasoner'
        }.`
      }
    ]);

    try {
      const response = await axios.post('/v1/agents/run', {
        agent_id: selectedAgentId || undefined,
        prompt: prompt,
        model: selectedModel
      }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      // Parse the JSON steps
      const parsedLogs = JSON.parse(response.data.logs) as AgentRunStep[];
      
      // Simulate real-time streaming output in terminal for rich aesthetics
      for (let i = 0; i < parsedLogs.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800)); // Delay between steps for futuristic loading feel
        setRunSteps(prev => {
          // Replace or append
          const stepsCopy = [...prev];
          if (i === 0) {
            stepsCopy[0] = parsedLogs[i]; // Replace loading step
          } else {
            stepsCopy.push(parsedLogs[i]);
          }
          return stepsCopy;
        });
      }

      toast.success('Autonomous task resolved!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Agent ReAct loop encountered an error.');
      setRunSteps(prev => [
        ...prev,
        {
          step: prev.length + 1,
          type: 'thought',
          content: `❌ CRITICAL ERROR: Execution loop halted. ${err.response?.data?.detail || 'Handshake failed.'}`
        }
      ]);
    } finally {
      setRunning(false);
    }
  };

  const toggleTool = (tool: string) => {
    if (selectedTools.includes(tool)) {
      setSelectedTools(selectedTools.filter(t => t !== tool));
    } else {
      setSelectedTools([...selectedTools, tool]);
    }
  };

  // Helper to render tool badge with relevant icon
  const renderToolBadge = (toolName: string) => {
    switch (toolName) {
      case 'web_search':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
            <Globe className="w-3 h-3" />
            <span>Web Search</span>
          </span>
        );
      case 'calculator':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
            <Calculator className="w-3 h-3" />
            <span>Secure Math</span>
          </span>
        );
      case 'rag_search':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
            <FileText className="w-3 h-3" />
            <span>RAG Docs</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-400/10 px-2 py-0.5 rounded border border-slate-400/20">
            <span>{toolName}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Bot className="w-8 h-8 text-primary" />
            <span>Autonomous AI Agents</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
            Deploy specialized, tool-equipped custom agent personas. Watch them think, select tools, query RAG records, evaluate mathematics, and synthesize conclusions in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs text-slate-300">
          <Activity className="w-4 h-4 text-primary animate-pulse" />
          <span>Multi-Agent Core Engine Operational</span>
        </div>
      </div>

      {/* Dual Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Agent Registry & Creator (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Agent Custom Builder */}
          <div className="glass rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <span>Agent Registry</span>
              </h3>
              
              {!showBuilder ? (
                <button
                  onClick={() => setShowBuilder(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-primary/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Build Agent</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowBuilder(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs font-bold hover:text-white transition-all"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="p-5">
              <AnimatePresence mode="wait">
                {showBuilder ? (
                  <motion.form
                    key="builder-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleCreateAgent}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Agent Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Agent Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Senior Tech Consultant"
                        value={newAgentName}
                        onChange={(e) => setNewAgentName(e.target.value)}
                        className="w-full bg-[#0A0A0F]/50 border border-white/10 focus:border-primary rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                      />
                    </div>

                    {/* Agent Description */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Role / Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Resolves systems architecture and pricing queries"
                        value={newAgentDesc}
                        onChange={(e) => setNewAgentDesc(e.target.value)}
                        className="w-full bg-[#0A0A0F]/50 border border-white/10 focus:border-primary rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                      />
                    </div>

                    {/* System Prompt */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">System Prompt (Persona Directives)</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="e.g. You are an expert system auditor. You strictly check metrics..."
                        value={newAgentSystemPrompt}
                        onChange={(e) => setNewAgentSystemPrompt(e.target.value)}
                        className="w-full bg-[#0A0A0F]/50 border border-white/10 focus:border-primary rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none transition-all font-mono"
                      />
                    </div>

                    {/* Equipment Tools */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Equip Capabilities / Tools</label>
                      <div className="grid grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleTool('web_search')}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                            selectedTools.includes('web_search')
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Globe className="w-4 h-4" />
                          <span>Web Search</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleTool('calculator')}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                            selectedTools.includes('calculator')
                              ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Calculator className="w-4 h-4" />
                          <span>Math Evaluator</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleTool('rag_search')}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                            selectedTools.includes('rag_search')
                              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>RAG Search</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-primary to-accent text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:from-primary hover:to-accent transition-all duration-200 mt-2 text-sm shadow-md"
                    >
                      <Check className="w-4 h-4" />
                      <span>Provision Agent Core</span>
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="agents-list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {/* Default Dynamic Agent Slot */}
                    <div
                      onClick={() => setSelectedAgentId(null)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group relative overflow-hidden ${
                        selectedAgentId === null
                          ? 'bg-gradient-to-r from-primary/10 to-accent/5 border-primary shadow-md shadow-primary/5'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="p-2 rounded-lg bg-primary/20 border border-primary/30 text-primary">
                          <Brain className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">Dynamic Autonomous Agent</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">Flexible on-the-fly execution loop</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </div>

                    {/* Custom Saved Agents */}
                    {loadingAgents ? (
                      <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="text-xs">Accessing Agent Databases...</span>
                      </div>
                    ) : agents.length === 0 ? (
                      <div className="p-6 text-center border border-white/5 rounded-xl text-slate-500 text-xs">
                        No custom agent profiles registered yet. Feel free to build one!
                      </div>
                    ) : (
                      agents.map((agent) => {
                        let toolsList: string[] = [];
                        try {
                          toolsList = JSON.parse(agent.tools || '[]');
                        } catch (e) {}

                        return (
                          <div
                            key={agent.id}
                            onClick={() => setSelectedAgentId(agent.id)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 group hover:border-primary/40 ${
                              selectedAgentId === agent.id
                                ? 'bg-gradient-to-r from-primary/10 to-accent/5 border-primary shadow-md shadow-primary/5'
                                : 'bg-white/5 border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-accent/20 border border-accent/30 text-accent">
                                  <User className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                                    {agent.name}
                                  </div>
                                  {agent.description && (
                                    <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                                      {agent.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={(e) => handleDeleteAgent(agent.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all"
                                title="Retire Agent Profile"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Equipped Tools list inside card */}
                            {toolsList.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1 border-t border-white/5 pt-2">
                                {toolsList.map(t => (
                                  <React.Fragment key={t}>
                                    {renderToolBadge(t)}
                                  </React.Fragment>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Column: Execution Shell / ReAct Terminal (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col justify-between glass rounded-2xl border border-white/10 min-h-[580px] overflow-hidden">
          
          {/* Header Bar */}
          <div className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
              </div>
              <span className="text-xs font-mono text-slate-400 ml-2">react-execution-shell-v1.0.sh</span>
            </div>

            {/* Config details */}
            <div className="flex gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={running}
                className="bg-[#0A0A0F]/80 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
              >
                <option value="mock-agent-reasoner">Mock Agent Reasoner (Local)</option>
                <option value="gpt-4o">GPT-4o (Premium)</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Advanced)</option>
              </select>
            </div>
          </div>

          {/* Terminal Screen Body */}
          <div className="flex-1 p-5 bg-black/55 font-mono text-xs overflow-y-auto max-h-[420px] min-h-[350px] space-y-4 custom-scrollbar">
            
            {runSteps.length === 0 && !running && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 text-slate-500">
                <Terminal className="w-12 h-12 text-slate-700" />
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-400">Terminal Standby Mode</p>
                  <p className="text-[11px] leading-relaxed max-w-sm">
                    Select a persona profile on the left registry, type a directives task in the shell prompt below, and press execute.
                  </p>
                </div>
              </div>
            )}

            <AnimatePresence>
              {runSteps.map((s, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2 border-l border-white/5 pl-3 relative"
                >
                  {/* Glowing vertical node identifier */}
                  <span className={`absolute left-0 top-1 w-1.5 h-1.5 rounded-full -translate-x-[4px] ${
                    s.type === 'thought' 
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
                      : s.type === 'action' 
                        ? 'bg-primary shadow-[0_0_8px_rgba(14,165,233,0.6)]' 
                        : 'bg-accent shadow-[0_0_8px_rgba(139,92,246,0.6)]'
                  }`} />

                  {/* Step Tag */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                      Step {s.step}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      s.type === 'thought' 
                        ? 'text-amber-400' 
                        : s.type === 'action' 
                          ? 'text-primary' 
                          : 'text-accent'
                    }`}>
                      {s.type === 'thought' 
                        ? 'Reasoning Thought' 
                        : s.type === 'action' 
                          ? `Executing Tool [${s.tool}]` 
                          : 'Final Synthesized Resolution'}
                    </span>
                  </div>

                  {/* Content block */}
                  {s.type === 'thought' && (
                    <div className="bg-amber-500/5 border border-amber-500/10 text-amber-300 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                      {s.content}
                    </div>
                  )}

                  {s.type === 'action' && (
                    <div className="space-y-2">
                      {/* Tool Inputs */}
                      <div className="bg-primary/5 border border-primary/10 text-sky-300 p-3 rounded-lg">
                        <span className="font-bold text-white block mb-1">Tool Payload:</span>
                        <code className="text-slate-400">input: "{s.input}"</code>
                      </div>
                      
                      {/* Tool Observation */}
                      <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold text-white block mb-1">Tool Observation Output:</span>
                        {s.observation}
                      </div>
                    </div>
                  )}

                  {s.type === 'final_answer' && (
                    <div className="bg-accent/10 border border-accent/20 text-white p-4 rounded-xl leading-relaxed whitespace-pre-wrap shadow-lg shadow-accent/5">
                      {s.content}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {running && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2.5 text-primary text-xs pl-3 py-1.5"
              >
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="animate-pulse">Agent reasoning loop compiling thoughts...</span>
              </motion.div>
            )}

            <div ref={terminalEndRef} />
          </div>

          {/* Prompt Form & Execution Panel */}
          <div className="p-4 border-t border-white/5 bg-white/[0.01] space-y-3">
            <div className="flex gap-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!running) handleRunAgent();
                  }
                }}
                disabled={running}
                placeholder={
                  selectedAgentId
                    ? "Command this custom agent..."
                    : "e.g. Run a secure math calculation for 42 * 12 or search web pricing details..."
                }
                rows={2}
                className="flex-1 bg-[#0A0A0F]/80 border border-white/10 focus:border-primary rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none resize-none transition-colors"
              />

              <button
                onClick={handleRunAgent}
                disabled={running || !prompt.trim()}
                className="px-5 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-bold rounded-xl flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-all shadow-md shrink-0 w-[100px]"
              >
                {running ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Execute</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Tier Sandbox Enforced (Unlimited daily runs for Enterprise)</span>
              </span>
              <span>Press Enter to Submit</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AgentPlayground;
