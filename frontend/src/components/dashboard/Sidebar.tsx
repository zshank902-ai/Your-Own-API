import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Eye, 
  FileText, 
  Image as ImageIcon, 
  Mic, 
  Bot, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Unified Chat', icon: MessageSquare, path: '/dashboard/chat' },
    { name: 'Vision AI', icon: Eye, path: '/dashboard/vision', highlight: true },
    { name: 'RAG Documents', icon: FileText, path: '/dashboard/rag' },
    { name: 'Image Generator', icon: ImageIcon, path: '/dashboard/images' },
    { name: 'Voice & Audio', icon: Mic, path: '/dashboard/audio' },
    { name: 'AI Agents', icon: Bot, path: '/dashboard/agents' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('api_key');
    navigate('/');
  };

  return (
    <motion.div 
      animate={{ width: isCollapsed ? '72px' : '260px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen bg-[#0A0A0F]/80 backdrop-blur-xl border-r border-white/5 flex flex-col justify-between z-30 overflow-hidden"
    >
      <div>
        {/* Header Branding */}
        <div className="p-6 flex items-center justify-between border-b border-white/5 h-[80px]">
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent select-none"
            >
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Your Own API</span>
            </motion.div>
          )}
          {isCollapsed && (
            <Sparkles className="w-6 h-6 text-primary mx-auto animate-pulse" />
          )}

          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3.5 rounded-lg text-sm font-medium transition-all group relative
                ${isActive 
                  ? 'bg-gradient-to-r from-primary/20 to-accent/10 border border-primary/20 text-white shadow-[0_0_15px_rgba(14,165,233,0.15)]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}
              `}
            >
              <item.icon className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" />
              {!isCollapsed && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between w-full"
                >
                  <span>{item.name}</span>
                  {item.highlight && (
                    <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                      New
                    </span>
                  )}
                </motion.span>
              )}

              {/* Tooltip for Collapsed Sidebar */}
              {isCollapsed && (
                <div className="absolute left-[80px] top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-md bg-black/90 border border-white/10 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-40 shadow-xl">
                  {item.name}
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer Profile / Logout */}
      <div className="p-4 border-t border-white/5">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-all group relative"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              Sign Out
            </motion.span>
          )}

          {isCollapsed && (
            <div className="absolute left-[80px] top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-md bg-black/90 border border-white/10 text-red-400 text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-40 shadow-xl">
              Sign Out
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;
