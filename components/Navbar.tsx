import React, { useState, useEffect } from 'react';
import { Leaf, Search, Menu, X } from 'lucide-react';
import { ViewState } from '../types';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface NavbarProps {
  currentView: ViewState;
  setView: (v: ViewState) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, setView }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Effect to detect scroll for a "shrinking island" effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

 // File: components/Navbar.tsx

// 1. Inside the NavItem function, change text-xs to text-sm
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
      {/* THE ISLAND CONTAINER */}
     
<nav className={`
  relative transition-all duration-500 ease-in-out
  bg-anirvan-dark/40 backdrop-blur-xl border border-white/10 shadow-2xl
  ${isMenuOpen ? 'rounded-3xl w-full max-w-lg' : 'rounded-full w-full max-w-6xl'}
  ${scrolled ? 'py-2 px-4 scale-[0.98]' : 'py-3 px-6'}
`}>
        <div className="flex items-center justify-between">
          
          {/* LOGO */}
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('landing')}>
            <div className="bg-gradient-to-br from-lime-400 to-green-700 p-1.5 rounded-full group-hover:rotate-12 transition-transform">
              <Leaf className="h-4 w-4 text-white" />
            </div>
          <span className="text-xl font-black tracking-tighter text-white hidden sm:block">anirvan</span>

          </div>
          
          {/* DESKTOP LINKS (Centered Island Content) */}
          <div className="hidden lg:flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/5 mx-4">
            <NavItem view="landing" label="Overview" />
            <NavItem view="explorer" label="Explorer" />
            <NavItem view="landowner" label="Landowners" />
            <NavItem view="enterprise" label="Enterprise" />
            <NavItem view="validation" label="Validation" />
          </div>

          {/* SEARCH & WALLET */}
          <div className="hidden md:flex items-center gap-3">
            <div className="relative transition-all duration-300 w-48 focus-within:w-64 group">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-anirvan-muted group-focus-within:text-anirvan-accent z-10" />
                <input 
    type="text" 
    placeholder="Search blocks, accounts..." 
    className="bg-black/40 border border-white/5 rounded-full pl-9 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-anirvan-accent/50 w-full transition-all"
/>
            </div>

            <div className="flex items-center scale-90 origin-right">
                <WalletMultiButton></WalletMultiButton>
            </div>
          </div>

          {/* MOBILE TOGGLE */}
          <div className="lg:hidden flex items-center gap-3">
             <div className="scale-75 origin-right">
                <WalletMultiButton></WalletMultiButton>
             </div>
             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-anirvan-muted hover:text-white">
               {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
             </button>
          </div>
        </div>

        {/* MOBILE MENU (Expanding Island) */}
        {isMenuOpen && (
          <div className="lg:hidden mt-4 pt-4 border-t border-white/10 flex flex-col gap-2 pb-4 animate-fade-in">
             <NavItem view="landing" label="Overview" />
             <NavItem view="explorer" label="Explorer" />
             <NavItem view="landowner" label="Landowners" />
             <NavItem view="enterprise" label="Marketplace" />
             <NavItem view="validation" label="Verification Portal" />
             
             <div className="relative mt-2">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-anirvan-muted" />
                <input 
                    type="text" 
                    placeholder="Search blocks, accounts..." 
                    className="bg-black/40 border border-white/5 rounded-full pl-9 pr-4 py-2 text-xs text-gray-300 w-full"
                />
             </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;