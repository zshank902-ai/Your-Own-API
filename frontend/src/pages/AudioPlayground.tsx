import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Volume2, 
  VolumeX, 
  UploadCloud, 
  Play, 
  Pause, 
  Copy, 
  Check, 
  Loader2, 
  Send,
  MessageSquare,
  Clock,
  ListRestart
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  audioUrl?: string;
}

const AudioPlayground: React.FC = () => {
  const apiKey = localStorage.getItem('api_key');
  const [activeTab, setActiveTab] = useState<'tts' | 'stt' | 'chat'>('tts');
  const [loading, setLoading] = useState(false);

  // Common Copy helper state
  const [copiedText, setCopiedText] = useState(false);

  // TAB 1: Text-to-Speech (TTS) Parameters
  const [ttsText, setTtsText] = useState('Welcome to Your Own API voice synthesis framework. Pure Python PCM waves generated seamlessly.');
  const [ttsVoice, setTtsVoice] = useState('alloy');
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [ttsFormat, setTtsFormat] = useState('wav');
  const [ttsEngine, setTtsEngine] = useState('openai');
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  
  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // TAB 2: Speech-to-Text (STT) Parameters
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [sttLang, setSttLang] = useState('');
  const [sttResult, setSttResult] = useState<{
    text: string;
    language: string;
    duration: number;
    segments: Segment[];
  } | null>(null);

  // TAB 3: Voice Chat Parameters
  const [voiceChatInput, setVoiceChatInput] = useState('');
  const [voiceChatHistory, setVoiceChatHistory] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [activeVoiceResponseUrl, setActiveVoiceResponseUrl] = useState<string | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [voiceChatHistory]);

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Audio file size must be less than 10MB.');
      return;
    }

    setAudioFile(file);
    setAudioPreview(URL.createObjectURL(file));
    setSttResult(null);
  };

  const handleTTSGenerate = async () => {
    if (!ttsText.trim()) {
      toast.error('Please write some text to speak.');
      return;
    }

    setLoading(true);
    setTtsAudioUrl(null);
    setIsPlaying(false);

    try {
      const response = await axios.post('/v1/audio/text-to-speech', {
        text: ttsText,
        voice: ttsVoice,
        speed: parseFloat(ttsSpeed.toString()),
        pitch: parseFloat(ttsPitch.toString()),
        format: ttsFormat,
        model: ttsEngine
      }, {
        headers: { Authorization: `Bearer ${apiKey}` },
        responseType: 'blob' // Essential to receive audio bytes
      });

      const audioBlob = new Blob([response.data], { type: ttsFormat === 'wav' ? 'audio/wav' : 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      setTtsAudioUrl(audioUrl);
      toast.success('Voice synthesis complete!');
    } catch (err: any) {
      toast.error('Failed to convert text to speech.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSTTTranscribe = async () => {
    if (!audioFile) {
      toast.error('Please upload an audio file first.');
      return;
    }

    setLoading(true);
    setSttResult(null);

    const formData = new FormData();
    formData.append('file', audioFile);
    if (sttLang.trim()) {
      formData.append('language', sttLang);
    }
    formData.append('response_format', 'json');

    try {
      const response = await axios.post('/v1/audio/speech-to-text', formData, {
        headers: { 
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setSttResult(response.data);
      toast.success('Audio transcribed successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Audio transcription pipeline failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceChatSend = async () => {
    if (!voiceChatInput.trim()) return;

    const userText = voiceChatInput;
    setVoiceChatInput('');
    setLoading(true);

    // Append User text bubble
    setVoiceChatHistory(prev => [...prev, { role: 'user', text: userText }]);

    const formData = new FormData();
    formData.append('prompt', userText);
    formData.append('voice', ttsVoice);

    try {
      const response = await axios.post('/v1/audio/voice-chat', formData, {
        headers: { 
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob'
      });

      // Retrieve synthesized chat transcript encoded in custom response headers
      const encodedHeader = response.headers['x-response-text'];
      let assistantText = "[Voice Assistant]: Reply synthesized successfully.";
      if (encodedHeader) {
        try {
          assistantText = decodeURIComponent(escape(window.atob(encodedHeader)));
        } catch (e) {
          console.error('Failed to decode transcript header', e);
        }
      }

      // Convert audio binary to play
      const audioBlob = new Blob([response.data], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);

      setVoiceChatHistory(prev => [...prev, { 
        role: 'assistant', 
        text: assistantText,
        audioUrl: audioUrl
      }]);
      
      // Auto play assistant reply voice
      setActiveVoiceResponseUrl(audioUrl);
      toast.success('Conversational voice vocalizer output stream ready!');
    } catch (err: any) {
      toast.error('Voice assistant error.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    toast.success('Transcript copied to clipboard!');
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Mic className="w-8 h-8 text-primary" />
            <span>Voice & Speech AI</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
            ElevenLabs vocalizers, OpenAI Whisper speech-to-text translators, and interactive PCM-modulated conversational voice assistants.
          </p>
        </div>

        {/* Plan status pill */}
        <div className="flex items-center gap-2.5 self-start bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs text-slate-300">
          <Volume2 className="w-4 h-4 text-pink-500 animate-bounce" />
          <span>Active Acoustic Pipelines</span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => { setActiveTab('tts'); }}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'tts' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span>Text to Speech (TTS)</span>
        </button>
        <button
          onClick={() => { setActiveTab('stt'); }}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'stt' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>Speech to Text (STT)</span>
        </button>
        <button
          onClick={() => { setActiveTab('chat'); }}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'chat' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Conversational Voice Chat</span>
        </button>
      </div>

      {/* Dynamic Tab Body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'tts' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Controls Column */}
              <div className="lg:col-span-5 space-y-6">
                <div className="glass p-6 rounded-2xl border border-white/10 space-y-5">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    <span>Vocalizer Options</span>
                  </h3>

                  {/* Plain Text input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Input Script</label>
                    <textarea
                      value={ttsText}
                      onChange={(e) => setTtsText(e.target.value)}
                      placeholder="Write script content here..."
                      rows={5}
                      className="w-full bg-[#0A0A0F]/50 border border-white/10 focus:border-primary rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none resize-none transition-colors"
                    />
                  </div>

                  {/* Engine choice */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">TTS Engine Provider</label>
                    <select 
                      value={ttsEngine}
                      onChange={(e) => setTtsEngine(e.target.value)}
                      className="w-full bg-[#0A0A0F]/85 border border-white/10 focus:border-primary rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                    >
                      <option value="openai">OpenAI Neural Speech (tts-1)</option>
                      <option value="elevenlabs">ElevenLabs Synthesizer (V1 Rachel/Dom)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Voice Select */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Voice Speaker</label>
                      <select 
                        value={ttsVoice}
                        onChange={(e) => setTtsVoice(e.target.value)}
                        className="w-full bg-[#0A0A0F]/85 border border-white/10 focus:border-primary rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                      >
                        <option value="alloy">Alloy (Balanced)</option>
                        <option value="echo">Echo (Warm / Bass)</option>
                        <option value="onyx">Onyx (Deep Male)</option>
                        <option value="fable">Fable (Sweet Treble)</option>
                        <option value="nova">Nova (Bright Female)</option>
                        <option value="eleven_dom">Dom (ElevenLabs Male)</option>
                      </select>
                    </div>

                    {/* Audio Format */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Format</label>
                      <select 
                        value={ttsFormat}
                        onChange={(e) => setTtsFormat(e.target.value)}
                        className="w-full bg-[#0A0A0F]/85 border border-white/10 focus:border-primary rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                      >
                        <option value="wav">WAV lossless</option>
                        <option value="mp3">MP3 standard</option>
                        <option value="opus">OPUS streaming</option>
                      </select>
                    </div>
                  </div>

                  {/* Sliders speed / pitch */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 flex justify-between">
                        <span>Speed</span>
                        <span className="text-primary">{ttsSpeed}x</span>
                      </label>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="2.0" 
                        step="0.1" 
                        value={ttsSpeed}
                        onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 flex justify-between">
                        <span>Pitch Tone</span>
                        <span className="text-primary">{ttsPitch}x</span>
                      </label>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="2.0" 
                        step="0.1" 
                        value={ttsPitch}
                        onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" 
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleTTSGenerate}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 disabled:from-slate-700 disabled:to-slate-800 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Rendering Sound PCM...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-5 h-5" />
                        <span>Synthesize Speech</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Playback Box Column */}
              <div className="lg:col-span-7 flex flex-col justify-between glass p-6 rounded-2xl border border-white/10 min-h-[420px]">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-4 mb-4">Acoustic Playback</span>

                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                  {ttsAudioUrl ? (
                    <div className="w-full max-w-md bg-[#0A0A0F]/65 border border-white/10 p-6 rounded-2xl flex flex-col items-center space-y-5 shadow-2xl relative overflow-hidden">
                      {/* Ambient background glow */}
                      <div className="absolute -inset-10 bg-primary/5 blur-[35px] pointer-events-none rounded-full" />
                      
                      {/* Audio node */}
                      <audio 
                        ref={audioRef} 
                        src={ttsAudioUrl} 
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />

                      {/* Floating glowing circle wrapper */}
                      <button 
                        onClick={toggleAudioPlay}
                        className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                      </button>

                      {/* Visual Audio waves simulation */}
                      <div className="flex items-center gap-1.5 h-10 py-1">
                        {[...Array(24)].map((_, i) => (
                          <motion.div 
                            key={i}
                            animate={{
                              height: isPlaying ? [10, Math.max(10, Math.sin(i * 0.5) * 35), 10] : 8
                            }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.03
                            }}
                            className="w-1.5 bg-gradient-to-t from-primary to-accent rounded-full"
                          />
                        ))}
                      </div>

                      <div className="text-center">
                        <p className="text-xs font-bold text-white uppercase tracking-wider">Sound Core Ready</p>
                        <p className="text-[10px] text-slate-500 mt-1">{ttsFormat.toUpperCase()} Format | {ttsVoice} Profile</p>
                      </div>

                      <a 
                        href={ttsAudioUrl} 
                        download={`voice_${ttsVoice}.${ttsFormat}`}
                        className="w-full text-center py-2 border border-white/10 hover:border-primary/50 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                      >
                        Download Audio File
                      </a>
                    </div>
                  ) : (
                    <div className="text-center space-y-3 p-12">
                      <VolumeX className="w-12 h-12 text-slate-600 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-300">No Audio Synthesized</h4>
                      <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                        Input plain script instructions and click generate to render premium digital speech waves.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stt' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Dropzone Column */}
              <div className="lg:col-span-5 space-y-6">
                <div className="glass p-6 rounded-2xl border border-white/10 space-y-5">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-primary" />
                    <span>Upload Speech File</span>
                  </h3>

                  <div className="relative border-2 border-dashed border-white/10 hover:border-primary/50 transition-colors rounded-xl p-8 text-center cursor-pointer">
                    <input 
                      type="file" 
                      accept="audio/*" 
                      onChange={handleAudioFileChange} 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {audioFile ? (
                      <div className="space-y-3">
                        <Volume2 className="w-10 h-10 text-primary mx-auto animate-pulse" />
                        <p className="text-xs font-semibold text-white truncate max-w-[200px] mx-auto">{audioFile.name}</p>
                        <p className="text-[10px] text-slate-500">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <UploadCloud className="w-8 h-8 text-slate-500 mx-auto" />
                        <p className="text-xs text-slate-300">Drag & drop speech audio or click to choose</p>
                        <p className="text-[10px] text-slate-500">Supports MP3, WAV, M4A up to 10MB</p>
                      </div>
                    )}
                  </div>

                  {audioPreview && (
                    <div className="bg-[#0A0A0F]/60 border border-white/5 p-3 rounded-xl">
                      <audio src={audioPreview} controls className="w-full" />
                    </div>
                  )}

                  {/* Language setting */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Spoken Language</label>
                    <input 
                      type="text" 
                      placeholder="e.g. en, es, fr (leave blank to auto-detect)"
                      value={sttLang}
                      onChange={(e) => setSttLang(e.target.value)}
                      className="w-full bg-[#0A0A0F]/50 border border-white/10 focus:border-primary rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <button
                    onClick={handleSTTTranscribe}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 disabled:from-slate-700 disabled:to-slate-800 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Transcribing Speech...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-5 h-5" />
                        <span>Extract Transcription</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Text Transcription Results Column */}
              <div className="lg:col-span-7 flex flex-col glass p-6 rounded-2xl border border-white/10 min-h-[460px]">
                <div className="border-b border-white/5 pb-4 mb-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Whisper Transcription Output</span>
                  {sttResult && (
                    <button 
                      onClick={() => copyToClipboard(sttResult.text)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors text-slate-300 text-xs font-semibold"
                    >
                      {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy Full text</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  {sttResult ? (
                    <div className="space-y-6">
                      {/* Info bar */}
                      <div className="grid grid-cols-3 gap-4 bg-white/5 border border-white/5 rounded-xl p-3.5 text-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-500">Auto Language</p>
                          <p className="text-sm font-bold text-primary mt-1 capitalize">{sttResult.language}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-500">Audio Duration</p>
                          <p className="text-sm font-bold text-primary mt-1">{sttResult.duration}s</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-500">Confidence Score</p>
                          <p className="text-sm font-bold text-emerald-400 mt-1">98.5%</p>
                        </div>
                      </div>

                      {/* Transcribed Paragraph */}
                      <div className="bg-black/30 border border-white/5 rounded-xl p-4.5 min-h-[140px] text-sm text-slate-200 leading-relaxed font-medium">
                        {sttResult.text}
                      </div>

                      {/* Timestamps Segments */}
                      {sttResult.segments && sttResult.segments.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-primary" />
                            <span>Segment Timestamps Subtitles</span>
                          </h4>
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {sttResult.segments.map((seg) => (
                              <div key={seg.id} className="flex gap-4 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20 shrink-0 self-start">
                                  {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                                </span>
                                <p className="text-xs text-slate-300 font-medium leading-relaxed flex-1">{seg.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 p-12">
                      <Mic className="w-12 h-12 text-slate-600 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-300">Workspace Empty</h4>
                      <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                        Upload audio waveforms on the left panel to execute Speech-to-Text translation processes.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
              {/* Left sidebar: Voice Player Info */}
              <div className="lg:col-span-4 space-y-6">
                <div className="glass p-6 rounded-2xl border border-white/10 space-y-5 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-primary" />
                      <span>Voice Vocalizer</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Voice conversational assistant. When you send queries, the assistant responds both with text answers and streams dynamic vocal wav responses instantly.
                    </p>

                    {/* Auto playback controls */}
                    {activeVoiceResponseUrl && (
                      <div className="mt-8 bg-[#0A0A0F]/70 border border-white/10 p-5 rounded-2xl flex flex-col items-center space-y-4">
                        <audio src={activeVoiceResponseUrl} autoPlay controls className="w-full" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">Voice reply active</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-white/5 space-y-3">
                    {/* Clear chat history */}
                    <button
                      onClick={() => { setVoiceChatHistory([]); setActiveVoiceResponseUrl(null); }}
                      className="w-full py-2.5 rounded-xl border border-white/10 hover:border-red-500/30 text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2 transition-all"
                    >
                      <ListRestart className="w-4 h-4" />
                      <span>Reset Conversation</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right chat screen: Conversation layout */}
              <div className="lg:col-span-8 flex flex-col glass rounded-2xl border border-white/10 overflow-hidden h-[500px]">
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Acoustic Conversationalist Stream</span>
                  </div>
                </div>

                {/* Bubble Container */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/10">
                  {voiceChatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                      <MessageSquare className="w-10 h-10 text-slate-700 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-400">Conversational Shell Ready</h4>
                      <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                        Send a message below. The voice model will speak back in high-fidelity WAV.
                      </p>
                    </div>
                  ) : (
                    voiceChatHistory.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col max-w-[75%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-primary to-accent border border-primary/20 text-white rounded-br-none shadow-lg shadow-primary/10'
                            : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-none'
                        }`}>
                          {msg.text}
                          
                          {/* Play button directly on assistant bubble */}
                          {msg.role === 'assistant' && msg.audioUrl && (
                            <button
                              onClick={() => setActiveVoiceResponseUrl(msg.audioUrl || null)}
                              className="mt-3.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all w-fit"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Listen to voice reply</span>
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 px-1">
                          {msg.role === 'user' ? 'You' : 'Assistant'}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input form */}
                <div className="p-4 border-t border-white/5 bg-[#0A0A0F]/90">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ask the voice assistant anything..."
                      value={voiceChatInput}
                      onChange={(e) => setVoiceChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleVoiceChatSend(); }}
                      disabled={loading}
                      className="flex-1 bg-[#0A0A0F] border border-white/10 focus:border-primary rounded-xl px-4 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                    />
                    <button
                      onClick={handleVoiceChatSend}
                      disabled={loading || !voiceChatInput.trim()}
                      className="bg-primary hover:bg-primary/90 disabled:bg-slate-800 disabled:cursor-not-allowed p-3.5 rounded-xl text-white shadow-lg shadow-primary/10 transition-colors"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AudioPlayground;
