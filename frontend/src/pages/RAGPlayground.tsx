import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  UploadCloud, 
  Trash2, 
  MessageSquare, 
  Send, 
  Loader2, 
  BookOpen, 
  Check,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Bot
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface DocumentRecord {
  id: number;
  filename: string;
  file_size: number;
  mime_type: string;
  status: string;
  chunk_count: number;
  created_at: string;
}

interface Citation {
  document_id: number;
  filename: string;
  chunk_index: number;
  content: string;
  score: number;
}

interface RAGMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

const RAGPlayground: React.FC = () => {
  const apiKey = localStorage.getItem('api_key');
  const userPlan = localStorage.getItem('user_plan') || 'free';

  // State Management
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [messages, setMessages] = useState<RAGMessage[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [expandedCitationIdx, setExpandedCitationIdx] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Get tier details
  const getTierLimit = () => {
    const tier = userPlan.toLowerCase();
    if (tier === 'free') return 2;
    if (tier === 'pro') return 50;
    return Infinity;
  };

  const limit = getTierLimit();

  // Load documents list
  const fetchDocuments = async () => {
    if (!apiKey) return;
    setLoadingDocs(true);
    try {
      const response = await axios.get('/v1/rag/documents', {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      setDocuments(response.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load document index.');
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [apiKey]);

  // Scroll chat bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, querying]);

  // Handle Document Upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client side valid checks
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['txt', 'md', 'pdf'].includes(ext || '')) {
      toast.error('Unsupported file format. Please upload .txt, .md, or .pdf files.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds maximum size of 10MB.');
      return;
    }

    if (documents.length >= limit) {
      toast.error(`Tier limit reached! Free accounts support up to 2 documents. Please upgrade to Pro.`);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    const toastId = toast.loading(`Indexing ${file.name}...`);
    try {
      await axios.post('/v1/rag/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${apiKey}`
        }
      });
      toast.success('Document parsed and vector index synced!', { id: toastId });
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Parsing pipeline failed.', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  // Handle Document Deletion
  const handleDeleteDocument = async (id: number, filename: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete and de-index "${filename}"?`)) return;
    
    try {
      await axios.delete(`/v1/rag/documents/${id}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      toast.success('Document index cleared.');
      
      // Remove deleted document from selected list if present
      setSelectedDocIds(prev => prev.filter(dId => dId !== id));
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'De-indexing failed.');
    }
  };

  // Handle RAG Search & Synthesis Query
  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;

    if (documents.length === 0) {
      toast.error('Please upload at least one document before querying.');
      return;
    }

    const activeIndexedDocs = documents.filter(d => d.status === 'indexed');
    if (activeIndexedDocs.length === 0) {
      toast.error('All uploaded documents are currently processing or failed. Wait for indexing.');
      return;
    }

    const userMsg: RAGMessage = {
      role: 'user',
      content: queryInput.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    setQueryInput('');
    setQuerying(true);

    try {
      const scopeIds = selectedDocIds.length > 0 ? selectedDocIds : undefined;
      const response = await axios.post('/v1/rag/query', {
        query: userMsg.content,
        document_ids: scopeIds
      }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      const assistantMsg: RAGMessage = {
        role: 'assistant',
        content: response.data.answer,
        citations: response.data.citations
      };
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Semantic retrieval failed.');
    } finally {
      setQuerying(false);
    }
  };

  // Select / Unselect document scope filtering
  const toggleDocSelection = (id: number) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(dId => dId !== id) : [...prev, id]
    );
  };

  // Helper formatting for file size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6.5 h-6.5 text-emerald-400" />
            Chat with Documents (RAG)
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Perform zero-dependency, local TF-IDF semantic matching and multi-turn citation-based synthesis.
          </p>
        </div>

        {/* Tier Meter Status Pill */}
        <div className="glass rounded-xl px-4 py-2 border border-white/5 flex items-center gap-3">
          <div className="text-left shrink-0">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Workspace Limit</div>
            <div className="text-xs text-white font-extrabold mt-0.5">
              {documents.length} / {limit === Infinity ? 'Unlimited' : limit} Files
            </div>
          </div>
          <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden shrink-0 border border-white/5">
            <div 
              className={`h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500`}
              style={{ width: `${Math.min(100, (documents.length / (limit === Infinity ? 1 : limit)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN: Sidebar Document Library (lg:col-span-5) */}
        <div className="lg:col-span-5 glass rounded-2xl border border-white/5 p-6 flex flex-col justify-between min-h-[500px]">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h2 className="text-sm font-black text-white tracking-wider uppercase flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Index Library
              </h2>
              {loadingDocs && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
            </div>

            {/* Drag Drop Area */}
            <div className="mb-5">
              <label className={`border-2 border-dashed border-white/10 hover:border-emerald-500/30 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer group transition-all bg-black/20 ${uploading ? 'pointer-events-none opacity-40' : ''}`}>
                <input 
                  type="file" 
                  accept=".txt,.md,.pdf" 
                  className="hidden" 
                  onChange={handleUpload}
                  disabled={uploading || documents.length >= limit}
                />
                {uploading ? (
                  <>
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
                    <span className="text-xs font-mono text-slate-400">Running parsing vectors...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 text-slate-500 group-hover:text-emerald-400 group-hover:scale-105 transition-all mb-2" />
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400">Upload document corpus</span>
                    <span className="text-[10px] text-slate-500 mt-1">Accepts PDF, MD, TXT (Max 10MB)</span>
                  </>
                )}
              </label>
            </div>

            {/* Document Index Cards list */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1.5 scrollbar-thin">
              {documents.length === 0 && !loadingDocs && (
                <div className="text-center p-8 border border-white/5 rounded-xl bg-black/20 text-slate-500 text-xs">
                  No documents in vector space. Upload a file above to begin index matching.
                </div>
              )}

              {documents.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <div 
                    key={doc.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[inset_0_0_12px_rgba(16,185,129,0.05)]' 
                        : 'bg-black/20 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      onClick={() => doc.status === 'indexed' && toggleDocSelection(doc.id)}
                    >
                      {/* Checkbox or File Icon */}
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-white/20'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-white truncate">{doc.filename}</span>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500">
                          <span>{formatBytes(doc.file_size)}</span>
                          <span>•</span>
                          <span>{doc.chunk_count} chunks</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                      {/* Status Chip */}
                      <span className={`px-2 py-0.5 text-[9px] uppercase font-mono tracking-wider font-extrabold rounded-md ${
                        doc.status === 'indexed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : doc.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                      }`}>
                        {doc.status}
                      </span>

                      {/* Delete Trigger */}
                      <button 
                        onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filtering Alert Scope info */}
          <div className="mt-5 p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2.5 text-xs text-slate-400">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-300">Custom Filtering: </span>
              {selectedDocIds.length > 0 
                ? `Querying ONLY across ${selectedDocIds.length} checked document(s).` 
                : 'Checked no files: Automatically matching globally across all indexed documents.'}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Citation Synthesis Box Chat (lg:col-span-7) */}
        <div className="lg:col-span-7 glass rounded-2xl border border-white/5 p-6 flex flex-col justify-between min-h-[500px]">
          <div className="flex flex-col justify-between flex-1 h-[450px]">
            {/* Box Header */}
            <div className="border-b border-white/5 pb-4 mb-4 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-black text-white tracking-wider uppercase flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Citation Chat
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono uppercase tracking-widest font-extrabold">
                Cosine Matcher
              </span>
            </div>

            {/* Bubble Messages list */}
            <div className="flex-1 overflow-y-auto px-1 space-y-4 pr-1.5 scrollbar-thin">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-3">
                  <Bot className="w-12 h-12 text-white/5" />
                  <span className="text-xs leading-relaxed max-w-sm">
                    Upload documents on the left library to build your local vector space. Ask questions and verify citations instantly.
                  </span>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`flex flex-col max-w-[92%] ${
                    msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none shadow-[0_0_15px_rgba(16,185,129,0.15)] font-medium'
                      : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-none'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    
                    {/* Render Citations if assistant message */}
                    {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          Source Citations
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {msg.citations.map((cite, cIdx) => {
                            const uniqueId = `${idx}-${cIdx}`;
                            const isExpanded = expandedCitationIdx === uniqueId;
                            return (
                              <div key={cIdx} className="w-full flex flex-col">
                                <button
                                  onClick={() => setExpandedCitationIdx(isExpanded ? null : uniqueId)}
                                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/5 text-[10px] text-slate-300 hover:text-white transition-all text-left font-mono font-semibold"
                                >
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase">
                                      #{cite.chunk_index}
                                    </span>
                                    <span className="truncate max-w-[150px]">{cite.filename}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] text-slate-500 font-extrabold">
                                      Match: {(cite.score * 100).toFixed(0)}%
                                    </span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                                  </div>
                                </button>
                                
                                {/* Expanded Content box */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden mt-1.5"
                                    >
                                      <div className="p-3 rounded-lg bg-emerald-950/10 border border-emerald-500/10 font-mono text-[10px] text-slate-300 leading-normal whitespace-pre-wrap">
                                        {cite.content}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 font-mono tracking-wider">
                    {msg.role === 'user' ? 'Developer' : 'API Gateway'}
                  </span>
                </div>
              ))}

              {querying && (
                <div className="flex flex-col items-start max-w-[90%] mr-auto">
                  <div className="px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5 rounded-bl-none">
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span className="text-xs text-slate-400 font-mono">Gateway is processing semantic vectors...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Form panel */}
            <form onSubmit={handleQuery} className="flex gap-2 shrink-0 border-t border-white/5 pt-4">
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Ask a question about your files..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                disabled={querying}
              />
              <button
                type="submit"
                disabled={querying || !queryInput.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4.5 flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)] font-semibold"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RAGPlayground;
