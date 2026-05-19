import React from 'react';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black/40 border-t border-cardBorder py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        <div className="col-span-1 md:col-span-2">
          <Link to="/" className="flex items-center gap-2 mb-4 group">
            <Zap className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold tracking-tight text-white">Your Own API</span>
          </Link>
          <p className="text-slate-400 max-w-sm mb-6">
            The unified API for developers to build production-grade LLM applications without the hassle of managing multiple SDKs and memory states.
          </p>
          <div className="flex gap-4">
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">Product</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
            <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
            <li><Link to="/docs" className="hover:text-primary transition-colors">Documentation</Link></li>
            <li><Link to="/playground" className="hover:text-primary transition-colors">Playground</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">Legal</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Cookie Policy</a></li>
          </ul>
        </div>

      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-cardBorder text-sm text-slate-500 flex flex-col md:flex-row justify-between items-center">
        <p>&copy; {new Date().getFullYear()} Your Own API. All rights reserved.</p>
        <p className="mt-2 md:mt-0">Built with React & FastAPI</p>
      </div>
    </footer>
  );
};

export default Footer;
