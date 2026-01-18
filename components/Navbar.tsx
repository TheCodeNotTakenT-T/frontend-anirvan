import React, { useState, useEffect } from 'react';
import { Leaf, Search, Menu, X } from 'lucide-react';
import { ViewState } from '../types';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface NavbarProps {
  currentView: ViewState;
  setView: (v: ViewState) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, setView }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const NavItem = ({ view, label }: { view: ViewState, label: string }) => (
    <button
      onClick={() => { setView(view); setIsMenuOpen(false); }}
      className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
        currentView === view 
          ? 'bg-anirvan-accent text-anirvan-dark shadow-lg shadow-anirvan-accent/20' 
          : 'text-anirvan-muted hover:text-white hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  );

  return (
    <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 flex justify-center px-4 ${scrolled ? 'pt-2' : 'pt-6'}`}>
      <nav className={`
        relative transition-all duration-500 ease-in-out
        bg-anirvan-dark/40 backdrop-blur-xl border border-white/10 shadow-2xl
        ${isMenuOpen ? 'rounded-3xl w-full max-w-lg' : 'rounded-full w-full max-w-6xl'}
        ${scrolled ? 'py-2 px-4 scale-[0.98]' : 'py-3 px-6'}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('landing')}>
            <div className="bg-gradient-to-br from-lime-400 to-green-700 p-1.5 rounded-full group-hover:rotate-12 transition-transform">
              <Leaf className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white hidden sm:block">anirvan</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/5 mx-4">
            <NavItem view="landing" label="Overview" />
            <NavItem view="landowner" label="Landowners" />
            <NavItem view="enterprise" label="Marketplace" />
            <NavItem view="validation" label="Validation" />
          </div>

           <div className="hidden md:flex items-center gap-3">
            <div className="relative transition-all duration-300 w-64 focus-within:w-108 group">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-anirvan-muted group-focus-within:text-anirvan-accent z-10" />
                <input 
    type="text" 
    placeholder="Search blocks, accounts..." 
    className="bg-black/40 border border-white/5 rounded-full pl-9 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-anirvan-accent/50 w-full transition-all"
/>
            </div>

          <div className="hidden md:flex items-center gap-3">
             {/* RainbowKit Connect Button */}
             <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />
          </div>

          <div className="lg:hidden flex items-center gap-3">
             <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="none" />
             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-anirvan-muted hover:text-white">
               {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
             </button>
          </div>
        </div>
        {/* Close flex items-center justify-between */}
        </div>
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="hidden lg:flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/5 mx-4">
            <NavItem view="landing" label="Overview" />
            <NavItem view="landowner" label="Landowners" />
            <NavItem view="enterprise" label="Marketplace" />
            <NavItem view="validation" label="Validation" />
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;