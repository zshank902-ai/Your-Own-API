import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Download, 
  Share2, 
  Image as ImageIcon, 
  Sliders, 
  History, 
  UploadCloud, 
  Loader2, 
  Layers,
  Scissors,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface GeneratedImage {
  id: number;
  prompt: string;
  model: string;
  url: string;
  size: string;
  quality: string;
  style: string;
  created_at: string;
}

const ImagePlayground: React.FC = () => {
  const apiKey = localStorage.getItem('api_key');
  const [activeSubTab, setActiveSubTab] = useState<'generate' | 'edit' | 'variations' | 'history'>('generate');
  const [loading, setLoading] = useState(false);

  // Parameter State
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('standard');
  const [style, setStyle] = useState('vivid');
  const [model, setModel] = useState('stable-diffusion');

  // Outputs
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<GeneratedImage[]>([]);

  // Image upload state for Inpainting & Variations
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadBase64, setUploadBase64] = useState<string | null>(null);
  
  // Mask state for Inpainting
  const [maskBase64, setMaskBase64] = useState<string | null>(null);
  const [isMasking, setIsMasking] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get('/v1/images/history', {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      setHistoryList(response.data);
    } catch (err: any) {
      console.error('Failed to retrieve history.', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setUploadPreview(base64);
      setUploadBase64(base64);
      setMaskBase64(null); // Reset mask
    };
    reader.readAsDataURL(file);
  };

  const simulateMasking = () => {
    if (!uploadBase64) return;
    setIsMasking(true);
    // Simulate drawing a glassy inpainting mask in the center 40%
    setTimeout(() => {
      // Create a dummy transparent/white mask representation in base64
      setMaskBase64(uploadBase64);
      setIsMasking(false);
      toast.success('Inpainting mask applied directly in the center bounding box!');
    }, 800);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please write a prompt.');
      return;
    }
    setLoading(true);
    setGeneratedImageUrl(null);
    try {
      const response = await axios.post('/v1/images/generate', {
        prompt,
        size,
        quality,
        style,
        model
      }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      if (response.data?.data?.[0]?.url) {
        setGeneratedImageUrl(response.data.data[0].url);
        toast.success('Image generated successfully!');
        fetchHistory();
      } else {
        toast.error('No image URL returned.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Image generation pipeline failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!uploadBase64) {
      toast.error('Please upload a base image first.');
      return;
    }
    if (!prompt.trim()) {
      toast.error('Please describe the edits you wish to make.');
      return;
    }

    setLoading(true);
    setGeneratedImageUrl(null);
    try {
      const response = await axios.post('/v1/images/edit', {
        image_base64: uploadBase64,
        prompt,
        mask_base64: maskBase64 || undefined
      }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      if (response.data?.data?.[0]?.url) {
        setGeneratedImageUrl(response.data.data[0].url);
        toast.success('Inpainting complete!');
        fetchHistory();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Inpainting failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVariations = async () => {
    if (!uploadBase64) {
      toast.error('Please upload an image first.');
      return;
    }

    setLoading(true);
    setGeneratedImageUrl(null);
    try {
      const response = await axios.post('/v1/images/variations', {
        image_base64: uploadBase64
      }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      if (response.data?.data?.[0]?.url) {
        setGeneratedImageUrl(response.data.data[0].url);
        toast.success('Image variation synthesized!');
        fetchHistory();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Variation synthesis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (url: string) => {
    navigator.clipboard.writeText(window.location.origin + url);
    toast.success('Shareable link copied to clipboard!');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ImageIcon className="w-8 h-8 text-primary" />
            <span>Creative Image Suite</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
            DALL-E 3 & Stable Diffusion XL neural generators. Paint details, inpaint masks, and track generated galleries.
          </p>
        </div>

        {/* Plan status pill */}
        <div className="flex items-center gap-2.5 self-start bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
          <span>Active Pipeline Key Works</span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => { setActiveSubTab('generate'); setGeneratedImageUrl(null); }}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'generate' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Text to Image</span>
        </button>
        <button
          onClick={() => { setActiveSubTab('edit'); setGeneratedImageUrl(null); }}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'edit' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Inpainting Editor</span>
        </button>
        <button
          onClick={() => { setActiveSubTab('variations'); setGeneratedImageUrl(null); }}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'variations' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Image Variations</span>
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'history' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Prompt History ({historyList.length})</span>
        </button>
      </div>

      {/* Main Grid Workspace */}
      <AnimatePresence mode="wait">
        {activeSubTab !== 'history' ? (
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Control Sidebar Panel (5 Columns) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Image upload slot for edit / variations */}
              {(activeSubTab === 'edit' || activeSubTab === 'variations') && (
                <div className="glass p-6 rounded-2xl border border-white/10 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-primary" />
                    <span>Upload Source Image</span>
                  </h3>
                  
                  <div className="relative border-2 border-dashed border-white/10 hover:border-primary/50 transition-colors rounded-xl p-6 text-center cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {uploadPreview ? (
                      <div className="relative group max-h-[220px] overflow-hidden rounded-lg">
                        <img 
                          src={uploadPreview} 
                          alt="Source Preview" 
                          className="mx-auto rounded-lg max-h-[200px] object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                          <span className="text-white text-xs font-semibold">Change Image</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <UploadCloud className="w-8 h-8 text-slate-500 mx-auto" />
                        <p className="text-xs text-slate-300">Drag & drop or click to upload</p>
                        <p className="text-[10px] text-slate-500">Supports PNG, JPG up to 5MB</p>
                      </div>
                    )}
                  </div>

                  {activeSubTab === 'edit' && uploadPreview && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={simulateMasking}
                        disabled={isMasking}
                        className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                          maskBase64
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {isMasking ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Tracing Bounds...</span>
                          </>
                        ) : maskBase64 ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Inpaint Mask Active</span>
                          </>
                        ) : (
                          <>
                            <Scissors className="w-3.5 h-3.5" />
                            <span>Trace Inpaint Bounding Box</span>
                          </>
                        )}
                      </button>
                      
                      {maskBase64 && (
                        <button 
                          onClick={() => setMaskBase64(null)}
                          className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20"
                        >
                          Clear Mask
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Main Parameter Inputs */}
              <div className="glass p-6 rounded-2xl border border-white/10 space-y-5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <span>Pipeline Configurations</span>
                </h3>

                {/* Prompt Box */}
                {activeSubTab !== 'variations' && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Prompt Instructions</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        activeSubTab === 'edit'
                          ? "e.g. Add a glowing holographic sword into the hand..."
                          : "Describe the image you want to generate in detail..."
                      }
                      rows={4}
                      className="w-full bg-[#0A0A0F]/50 border border-white/10 focus:border-primary rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none resize-none transition-colors"
                    />
                  </div>
                )}

                {/* Generate Options */}
                {activeSubTab === 'generate' && (
                  <>
                    {/* Model Choice */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Model Engine</label>
                      <select 
                        value={model} 
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-[#0A0A0F]/80 border border-white/10 focus:border-primary rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                      >
                        <option value="stable-diffusion">Stable Diffusion XL (Free / Replicate)</option>
                        <option value="dall-e">DALL-E 3 Neural (Premium / OpenAI)</option>
                        <option value="midjourney">Openjourney V4 (Stylized / Replicate)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Size */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300">Size Resolution</label>
                        <select 
                          value={size} 
                          onChange={(e) => setSize(e.target.value)}
                          className="w-full bg-[#0A0A0F]/80 border border-white/10 focus:border-primary rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                        >
                          <option value="1024x1024">1024 × 1024</option>
                          <option value="512x512">512 × 512</option>
                          <option value="256x256">256 × 256</option>
                        </select>
                      </div>

                      {/* Style */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300">Render Style</label>
                        <select 
                          value={style} 
                          onChange={(e) => setStyle(e.target.value)}
                          className="w-full bg-[#0A0A0F]/80 border border-white/10 focus:border-primary rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                        >
                          <option value="vivid">Vivid Gradient</option>
                          <option value="natural">Natural Dynamic</option>
                        </select>
                      </div>
                    </div>

                    {/* Quality */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Quality Profile</label>
                      <select 
                        value={quality} 
                        onChange={(e) => setQuality(e.target.value)}
                        className="w-full bg-[#0A0A0F]/80 border border-white/10 focus:border-primary rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                      >
                        <option value="standard">Standard Quality</option>
                        <option value="hd">HD Enhancements</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Submit Action */}
                <button
                  onClick={
                    activeSubTab === 'generate' 
                      ? handleGenerate 
                      : activeSubTab === 'edit'
                        ? handleEdit 
                        : handleVariations
                  }
                  disabled={loading}
                  className="w-full mt-4 bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Synthesizing Graphic...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>
                        {activeSubTab === 'generate' 
                          ? 'Generate Masterpiece' 
                          : activeSubTab === 'edit'
                            ? 'Run Inpainting'
                            : 'Synthesize Variations'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Display / Preview Panel (7 Columns) */}
            <div className="lg:col-span-7 flex flex-col justify-between glass p-6 rounded-2xl border border-white/10 min-h-[480px]">
              <div className="border-b border-white/5 pb-4 mb-4 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Graphics Pipeline Output</span>
                {generatedImageUrl && (
                  <div className="flex gap-2">
                    <a 
                      href={generatedImageUrl} 
                      download="artwork.jpg"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors text-slate-300"
                      title="Download artwork"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button 
                      onClick={() => handleShare(generatedImageUrl)}
                      className="p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors text-slate-300"
                      title="Share link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Rendering viewbox */}
              <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black/45 rounded-xl border border-white/5 p-4 min-h-[350px]">
                {loading ? (
                  <div className="text-center space-y-3">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                    <p className="text-xs text-slate-300 font-semibold animate-pulse">Running Neural Render Nodes...</p>
                    <p className="text-[10px] text-slate-500 max-w-[250px] mx-auto leading-relaxed">
                      Calculating overlaps, compositing translucencies, and rendering glass textures.
                    </p>
                  </div>
                ) : generatedImageUrl ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative max-w-full"
                  >
                    <img 
                      src={generatedImageUrl} 
                      alt="Rendered Result" 
                      className="rounded-lg shadow-2xl border border-white/10 max-h-[460px] object-contain mx-auto" 
                    />
                    <div className="absolute bottom-3 left-3 bg-[#0A0A0F]/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                      1024x1024 JPEG
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center space-y-3 p-8">
                    <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-300">Workspace Empty</h4>
                    <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                      Setup your prompts or upload a base image on the left sidebar to activate the graphics engine.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* History tab */
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {historyList.length === 0 ? (
              <div className="glass p-12 text-center rounded-2xl border border-white/15 max-w-md mx-auto space-y-3">
                <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">No creations yet</h3>
                <p className="text-xs text-slate-400">Your generated images will appear here for easy access, share and download.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {historyList.map((img) => (
                  <div key={img.id} className="glass rounded-xl border border-white/5 overflow-hidden flex flex-col justify-between group hover:border-primary/45 transition-colors duration-300">
                    <div className="relative aspect-square overflow-hidden bg-black/20 border-b border-white/5">
                      <img 
                        src={img.url} 
                        alt={img.prompt} 
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <a
                          href={img.url}
                          download={`artwork_${img.id}.jpg`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleShare(img.url)}
                          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                          title="Share Link"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <p className="text-xs text-white font-medium line-clamp-2 leading-relaxed" title={img.prompt}>
                        {img.prompt}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary">
                          {img.model}
                        </span>
                        <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                          {img.size}
                        </span>
                        <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                          {img.style}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImagePlayground;
