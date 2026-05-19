import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, 
  Eye, 
  FileText, 
  MessageSquare, 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw, 
  Image as ImageIcon,
  Columns,
  Cpu,
  Send,
  Loader2,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const VisionPlayground: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'ocr' | 'chat' | 'compare' | 'scan'>('analyze');
  const apiKey = localStorage.getItem('api_key');

  // Single Image State (Analyze, OCR, Chat, Scan)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Twin Images State (Compare Tab)
  const [, setCompareFile1] = useState<File | null>(null);
  const [, setCompareFile2] = useState<File | null>(null);
  const [comparePreview1, setComparePreview1] = useState<string | null>(null);
  const [comparePreview2, setComparePreview2] = useState<string | null>(null);
  const [compareBase64_1, setCompareBase64_1] = useState<string | null>(null);
  const [compareBase64_2, setCompareBase64_2] = useState<string | null>(null);

  // Common UI states
  const [loading, setLoading] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // TAB 1: Analyze Response
  const [analyzeResult, setAnalyzeResult] = useState<{
    description: string;
    objects: string[];
    mood: string;
    text_detected: string | null;
    confidence: number;
  } | null>(null);

  // TAB 2: OCR Response
  const [ocrResult, setOcrResult] = useState<{
    text: string;
    confidence: number;
    detected_words: { word: string; box: number[] }[];
  } | null>(null);

  // TAB 3: Visual Chat states
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // TAB 4: Compare Response
  const [compareResult, setCompareResult] = useState<{
    similarity_score: number;
    differences: string[];
  } | null>(null);

  // TAB 5: Scan Response
  const [scanResult, setScanResult] = useState<{
    structured_data: any;
    confidence: number;
  } | null>(null);

  // File Upload Helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'main' | 'compare1' | 'compare2') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image size must be smaller than 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (side === 'main') {
        setImageFile(file);
        setImagePreview(base64);
        setImageBase64(base64);
        // Clear old results
        setAnalyzeResult(null);
        setOcrResult(null);
        setMessages([]);
        setScanResult(null);
      } else if (side === 'compare1') {
        setCompareFile1(file);
        setComparePreview1(base64);
        setCompareBase64_1(base64);
        setCompareResult(null);
      } else if (side === 'compare2') {
        setCompareFile2(file);
        setComparePreview2(base64);
        setCompareBase64_2(base64);
        setCompareResult(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Run Analyze Endpoint
  const handleAnalyze = async () => {
    if (!imageBase64) {
      toast.error('Please upload an image first.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('/v1/vision/analyze', {
        image_base64: imageBase64
      }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      setAnalyzeResult(response.data);
      toast.success('Visual analysis complete!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Analysis pipeline failed.');
    } finally {
      setLoading(false);
    }
  };

  // Run OCR Endpoint
  const handleOCR = async () => {
    if (!imageBase64) {
      toast.error('Please upload an image first.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('/v1/vision/ocr', {
        image_base64: imageBase64
      }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      setOcrResult(response.data);
      toast.success('Text extraction complete!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'OCR extraction failed.');
    } finally {
      setLoading(false);
    }
  };

  // Run Visual Chat Message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (!imageBase64) {
      toast.error('Please upload an image context to start talking.');
      return;
    }

    const newUserMsg: Message = { role: 'user', content: chatInput.trim() };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setChatInput('');
    setLoading(true);

    try {
      const response = await axios.post('/v1/vision/chat', {
        image_base64: imageBase64,
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
      }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      setMessages([...updatedMessages, { role: 'assistant', content: response.data.response }]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Visual chat failed.');
    } finally {
      setLoading(false);
    }
  };

  // Scroll chat bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Run Compare Endpoint
  const handleCompare = async () => {
    if (!compareBase64_1 || !compareBase64_2) {
      toast.error('Please upload both images to compare.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('/v1/vision/compare', {
        image1_base64: compareBase64_1,
        image2_base64: compareBase64_2
      }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      setCompareResult(response.data);
      toast.success('Visual difference analysis complete!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Image comparison failed.');
    } finally {
      setLoading(false);
    }
  };

  // Run Document Scan Endpoint
  const handleScan = async () => {
    if (!imageBase64) {
      toast.error('Please upload an image first.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('/v1/vision/document-scan', {
        image_base64: imageBase64
      }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      setScanResult(response.data);
      toast.success('Document scan parsed successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Document scan extraction failed.');
    } finally {
      setLoading(false);
    }
  };

  // Reset Playground States
  const handleReset = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageBase64(null);
    setCompareFile1(null);
    setCompareFile2(null);
    setComparePreview1(null);
    setComparePreview2(null);
    setCompareBase64_1(null);
    setCompareBase64_2(null);
    setAnalyzeResult(null);
    setOcrResult(null);
    setMessages([]);
    setCompareResult(null);
    setScanResult(null);
  };

  const handleCopyOCRText = () => {
    if (ocrResult) {
      navigator.clipboard.writeText(ocrResult.text);
      setCopiedText(true);
      toast.success('OCR Text copied!');
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Upper Mode Switcher Tabs */}
      <div className="flex flex-wrap border-b border-white/5 gap-2 p-1 bg-black/40 rounded-xl max-w-lg">
        {[
          { id: 'analyze', name: 'Analysis', icon: Eye },
          { id: 'ocr', name: 'OCR Text', icon: Columns },
          { id: 'chat', name: 'Visual Chat', icon: MessageSquare },
          { id: 'compare', name: 'Comparison', icon: Layers },
          { id: 'scan', name: 'Doc Scan', icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id !== 'compare' && comparePreview1) {
                // Keep things sync
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Main split dashboard pane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* LEFT COLUMN: Upload Dropzones and triggers */}
        <div className="glass rounded-2xl border border-white/5 p-6 flex flex-col justify-between min-h-[500px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" />
                Image Context Input
              </h2>
              {(imagePreview || comparePreview1 || comparePreview2) && (
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-white/5 border border-white/10 rounded"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            {activeTab !== 'compare' ? (
              // Standard single image dropzone
              <div className="space-y-4">
                {!imagePreview ? (
                  <label className="border-2 border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer group hover:border-primary/30 transition-colors h-[320px]">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, 'main')} 
                    />
                    <div className="bg-primary/5 p-4 rounded-full border border-primary/10 group-hover:scale-105 transition-transform mb-4">
                      <ImageIcon className="w-8 h-8 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-white">Drag & drop image</span>
                    <span className="text-xs text-slate-500 mt-1">Supports PNG, JPEG, WEBP (Max 8MB)</span>
                  </label>
                ) : (
                  <div className="relative rounded-2xl border border-white/10 overflow-hidden bg-black/40 h-[320px] flex items-center justify-center">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="max-w-full max-h-full object-contain"
                    />
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-primary rounded border border-primary/20 font-mono uppercase tracking-wide">
                      {imageFile?.name || 'Image Ready'}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Double image dropzone (Comparison Mode)
              <div className="grid grid-cols-2 gap-4 h-[320px]">
                {/* Image A Dropzone */}
                {!comparePreview1 ? (
                  <label className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer group hover:border-primary/30 transition-colors h-full">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, 'compare1')} 
                    />
                    <UploadCloud className="w-6 h-6 text-slate-500 mb-2 group-hover:scale-105 transition-transform" />
                    <span className="text-xs font-semibold text-white">Upload Image A</span>
                  </label>
                ) : (
                  <div className="relative rounded-xl border border-white/10 overflow-hidden bg-black/40 h-full flex items-center justify-center">
                    <img src={comparePreview1} alt="Preview A" className="max-w-full max-h-full object-contain" />
                    <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 text-[9px] font-bold text-primary rounded">A</div>
                  </div>
                )}

                {/* Image B Dropzone */}
                {!comparePreview2 ? (
                  <label className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer group hover:border-accent/30 transition-colors h-full">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, 'compare2')} 
                    />
                    <UploadCloud className="w-6 h-6 text-slate-500 mb-2 group-hover:scale-105 transition-transform" />
                    <span className="text-xs font-semibold text-white">Upload Image B</span>
                  </label>
                ) : (
                  <div className="relative rounded-xl border border-white/10 overflow-hidden bg-black/40 h-full flex items-center justify-center">
                    <img src={comparePreview2} alt="Preview B" className="max-w-full max-h-full object-contain" />
                    <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 text-[9px] font-bold text-accent rounded">B</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action trigger buttons */}
          <div className="mt-6">
            {activeTab === 'analyze' && (
              <button
                onClick={handleAnalyze}
                disabled={loading || !imagePreview}
                className="w-full bg-gradient-to-r from-primary to-accent text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] active:scale-98 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Eye className="w-4.5 h-4.5" />}
                Analyze Image Semantics
              </button>
            )}

            {activeTab === 'ocr' && (
              <button
                onClick={handleOCR}
                disabled={loading || !imagePreview}
                className="w-full bg-gradient-to-r from-primary to-accent text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] active:scale-98 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <FileText className="w-4.5 h-4.5" />}
                Extract Image Characters (OCR)
              </button>
            )}

            {activeTab === 'chat' && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs text-slate-300">
                <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                <span>Upload image context on top, then start chatting in the right window naturally!</span>
              </div>
            )}

            {activeTab === 'compare' && (
              <button
                onClick={handleCompare}
                disabled={loading || !comparePreview1 || !comparePreview2}
                className="w-full bg-gradient-to-r from-primary to-accent text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] active:scale-98 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Layers className="w-4.5 h-4.5" />}
                Compute Visual Variations
              </button>
            )}

            {activeTab === 'scan' && (
              <button
                onClick={handleScan}
                disabled={loading || !imagePreview}
                className="w-full bg-gradient-to-r from-primary to-accent text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] active:scale-98 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Sparkles className="w-4.5 h-4.5" />}
                Parse Tabular Document Schema
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Playground Response Viewer */}
        <div className="glass rounded-2xl border border-white/5 p-6 flex flex-col justify-between min-h-[500px]">
          
          <AnimatePresence mode="wait">
            {/* T1: Analyze Response Tab */}
            {activeTab === 'analyze' && (
              <motion.div 
                key="analyze-result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col"
              >
                <div className="border-b border-white/5 pb-4 mb-4">
                  <h3 className="text-md font-bold text-white">Semantic Output</h3>
                </div>

                {analyzeResult ? (
                  <div className="space-y-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Description Block */}
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                        <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Image Description</span>
                        <p className="text-sm text-slate-200 mt-2.5 leading-relaxed">{analyzeResult.description}</p>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                          <span className="text-[10px] uppercase tracking-widest text-accent font-bold">Inferred Mood</span>
                          <span className="block text-md font-extrabold text-white mt-1.5">{analyzeResult.mood}</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                          <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">AI Confidence</span>
                          <span className="block text-md font-extrabold text-white mt-1.5">{(analyzeResult.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>

                      {/* Tag Clouds */}
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Detected Objects</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {analyzeResult.objects.map((obj, i) => (
                            <span 
                              key={i} 
                              className="px-2.5 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-slate-300 font-mono capitalize"
                            >
                              {obj.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-400">
                      <Cpu className="w-4 h-4 text-primary shrink-0" />
                      <span>Pipeline run successful. Models deployed: Claude 3.5 Sonnet / Mock-Vision Engine.</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-2">
                    <ImageIcon className="w-12 h-12 text-white/5" />
                    <span>Upload image and trigger "Analyze" pipeline to view details.</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* T2: OCR Response Tab */}
            {activeTab === 'ocr' && (
              <motion.div 
                key="ocr-result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col"
              >
                <div className="border-b border-white/5 pb-4 mb-4 flex justify-between items-center">
                  <h3 className="text-md font-bold text-white">Extracted Characters</h3>
                  {ocrResult && (
                    <button
                      onClick={handleCopyOCRText}
                      className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs"
                    >
                      {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy plain text
                    </button>
                  )}
                </div>

                {ocrResult ? (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Text displayer block */}
                      <div className="bg-black/60 border border-white/10 rounded-xl p-4 h-[220px] overflow-y-auto font-mono text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                        {ocrResult.text}
                      </div>

                      {/* Structured Bounding Boxes Table */}
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Identified Words & Bounding Coordinates</span>
                        <div className="max-h-[140px] overflow-y-auto mt-2 border border-white/5 rounded-xl">
                          <table className="w-full text-left text-xs font-mono border-collapse">
                            <thead>
                              <tr className="bg-white/5 border-b border-white/5 text-slate-400 font-bold uppercase">
                                <th className="py-2 px-3">Word</th>
                                <th className="py-2 px-3 text-right">Coordinates [ymin, xmin, ymax, xmax]</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ocrResult.detected_words.map((item, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                  <td className="py-2.5 px-3 text-primary font-bold">{item.word}</td>
                                  <td className="py-2.5 px-3 text-right text-slate-400">
                                    {JSON.stringify(item.box)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-500 mt-2 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span>Total confidence: {(ocrResult.confidence * 100).toFixed(0)}%</span>
                      <span>Total nodes parsed: {ocrResult.detected_words.length}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-2">
                    <FileText className="w-12 h-12 text-white/5" />
                    <span>Upload image and trigger "OCR Extraction" to fetch printed/handwritten characters.</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* T3: Visual Chat Tab */}
            {activeTab === 'chat' && (
              <motion.div 
                key="chat-result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col justify-between h-[450px]"
              >
                <div className="border-b border-white/5 pb-4 mb-2 flex justify-between items-center shrink-0">
                  <h3 className="text-md font-bold text-white">Visual Context Chat</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-bold uppercase tracking-wide">Multi-turn session</span>
                </div>

                {/* Message display area */}
                <div className="flex-1 overflow-y-auto px-1 space-y-3.5 pr-2 mb-4 scrollbar-thin">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-2">
                      <MessageSquare className="w-10 h-10 text-white/5" />
                      <span>Start speaking with the visual prompt. Ask questions such as: "What is this image about?" or "Is there any text on this image?"</span>
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex flex-col max-w-[85%] ${
                        msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-primary text-white rounded-br-none shadow-[0_0_15px_rgba(14,165,233,0.15)]'
                          : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-none'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 font-mono tracking-wider">
                        {msg.role === 'user' ? 'Developer' : 'API Gateway'}
                      </span>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex flex-col items-start max-w-[85%] mr-auto">
                      <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2 rounded-bl-none">
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                        <span className="text-xs text-slate-400 font-mono">Gateway is processing visual bounds...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Form Input bar */}
                <form onSubmit={handleSendChatMessage} className="flex gap-2 shrink-0 border-t border-white/5 pt-4">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={imageBase64 ? "Ask about this visual workspace..." : "Upload image context to start talking..."}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-all"
                    disabled={loading || !imageBase64}
                  />
                  <button
                    type="submit"
                    disabled={loading || !chatInput.trim() || !imageBase64}
                    className="bg-primary hover:bg-primary/90 text-white rounded-xl px-4.5 flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </form>
              </motion.div>
            )}

            {/* T4: Compare Response Tab */}
            {activeTab === 'compare' && (
              <motion.div 
                key="compare-result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col"
              >
                <div className="border-b border-white/5 pb-4 mb-4">
                  <h3 className="text-md font-bold text-white">Variation Metrics</h3>
                </div>

                {compareResult ? (
                  <div className="space-y-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-5">
                      {/* Similarity radial metrics container */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">Computed Similarity Score</span>
                        <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-white/5">
                          {/* Inner radial value */}
                          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                            {(compareResult.similarity_score * 100).toFixed(0)}%
                          </span>
                          
                          {/* Glow overlay */}
                          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse" />
                        </div>
                      </div>

                      {/* Differences lists */}
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Identified Structural Differences</span>
                        <div className="space-y-2 mt-2">
                          {compareResult.differences.map((diff, i) => (
                            <div key={i} className="flex gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 text-xs leading-relaxed text-slate-300">
                              <span className="w-1.5 h-1.5 bg-accent rounded-full shrink-0 mt-1.5 animate-pulse" />
                              <span>{diff}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-400">
                      <Cpu className="w-4 h-4 text-primary shrink-0" />
                      <span>Comparison computed successfully using high-fidelity spatial delta algorithms.</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-2">
                    <Layers className="w-12 h-12 text-white/5" />
                    <span>Upload two images on the left and trigger "Compute Variations" to verify.</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* T5: Document Scan Tab */}
            {activeTab === 'scan' && (
              <motion.div 
                key="scan-result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col"
              >
                <div className="border-b border-white/5 pb-4 mb-4">
                  <h3 className="text-md font-bold text-white">Structured Document Grid</h3>
                </div>

                {scanResult ? (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Document Overview Metadata */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Merchant / Vendor</span>
                          <span className="block text-sm font-bold text-white mt-1 capitalize">
                            {scanResult.structured_data.vendor || 'Unknown'}
                          </span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Invoice Number</span>
                          <span className="block text-sm font-mono font-bold text-primary mt-1">
                            {scanResult.structured_data.invoice_number || 'Unknown'}
                          </span>
                        </div>
                      </div>

                      {/* Tabular items list */}
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Parsed Line Items</span>
                        <div className="max-h-[140px] overflow-y-auto mt-2 border border-white/5 rounded-xl">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-white/5 border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider">
                                <th className="py-2.5 px-3">Description</th>
                                <th className="py-2.5 px-3 text-center">Qty</th>
                                <th className="py-2.5 px-3 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scanResult.structured_data.items?.map((item: any, idx: number) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 font-mono text-[11px]">
                                  <td className="py-2.5 px-3 text-slate-200 font-sans font-medium">{item.description}</td>
                                  <td className="py-2.5 px-3 text-center text-slate-400">{item.quantity}</td>
                                  <td className="py-2.5 px-3 text-right text-slate-200 font-bold">${item.amount?.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Totals Box */}
                      <div className="bg-[#0A0A0F]/60 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Computed Total Due</span>
                        <span className="text-lg font-black text-emerald-400 font-mono">
                          ${scanResult.structured_data.total?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-500 mt-2 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span>OCR Parsing Confidence: {(scanResult.confidence * 100).toFixed(0)}%</span>
                      <span>Line item matches: {scanResult.structured_data.items?.length || 0}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-2">
                    <FileText className="w-12 h-12 text-white/5" />
                    <span>Upload an invoice, receipt, or document and trigger "Parse Document Schema" to extract tables.</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
};

export default VisionPlayground;
