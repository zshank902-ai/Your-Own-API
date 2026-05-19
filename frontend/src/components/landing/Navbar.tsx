import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, Menu, X } from 'lucide-react';

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'glass py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Your Own API</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          <Link to="/docs" className="hover:text-primary transition-colors">Documentation</Link>
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link to="/register" className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.5)] transition-all hover:scale-105 active:scale-95">
            Start Building
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-slate-300 hover:text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden glass border-t border-cardBorder mt-3 px-4 py-4 flex flex-col gap-4"
        >
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-white font-medium">Features</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-white font-medium">Pricing</a>
          <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-white font-medium">Sign In</Link>
          <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="bg-primary text-white text-center font-semibold py-2 rounded-lg">Start Building</Link>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
