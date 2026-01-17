import { useState } from 'react';
import { Leaf, RotateCcw } from 'lucide-react'; // Added RotateCcw icon
import Navbar from './components/Navbar';
import LandingView from './views/LandingView';
import ExplorerView from './views/ExplorerView';
import LandownerView from './views/LandownerView';
import EnterpriseView from './views/EnterpriseView';
import ValidationView from './views/ValidationView';
import { ViewState } from './types';
import { useWallet } from '@solana/wallet-adapter-react';

const App = () => {
  const [view, setView] = useState<ViewState>('landing');
  const { disconnect, connected } = useWallet();

  // FIX: Reset Wallet choice function
  const resetWalletChoice = () => {
    // This clears the specific key used by the Solana Wallet Provider
    localStorage.removeItem('anirvan-wallet-choice');
    // Force a disconnect to clear the internal state
    disconnect();
    // Briefly alert user
    alert("Wallet selection reset. You can now choose a different provider.");
    window.location.reload(); // Hard refresh to ensure provider re-evaluates
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar currentView={view} setView={setView} />
      
      <main className="flex-grow pt-[76px]"> 
        {view === 'landing' && <LandingView setView={setView} />}
        {view === 'explorer' && <ExplorerView />}
        {view === 'landowner' && <LandownerView />}
        {view === 'enterprise' && <EnterpriseView />}
        {view === 'validation' && <ValidationView />}
      </main>

      <footer className="bg-black/40 border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="h-6 w-6 text-anirvan-accent" />
              <span className="text-xl font-bold text-white">anirvan</span>
            </div>
            <p className="text-sm text-anirvan-muted">
              Built at IIIT Kottayam's Code Kalari Hackathon. <br />
              January 17th, 2026 • Team Decaf-test.
            </p>
            
            {/* NEW: RETRACT WALLET BUTTONS */}
<div className="flex flex-col gap-2 mt-6 w-fit"> {/* Added w-fit here to bound the children */}
    {connected && (
    <button 
        onClick={() => disconnect()}
        // Changed w-fit to w-full and added flex justify-center
        className="text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest font-bold border border-red-500/20 px-3 py-1.5 rounded bg-red-500/5 w-full flex items-center justify-center"
    >
        Disconnect Wallet
    </button>
    )}
    
    <button 
        onClick={resetWalletChoice}
        // Changed w-fit to w-full and kept flex justify-center
        className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest font-bold flex items-center justify-center gap-2 border border-blue-500/20 px-3 py-1.5 rounded bg-blue-500/5 w-full whitespace-nowrap"
    >
        <RotateCcw className="h-3 w-3" /> Reset Wallet Selection
    </button>
</div>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-anirvan-muted">
              <li>Explorer</li>
              <li>Documentation</li>
              <li>API Status</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Governance</h4>
            <ul className="space-y-2 text-sm text-anirvan-muted">
              <li>DAO</li>
              <li>Tokenomics</li>
              <li>Voting</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Connect</h4>
            <div className="flex gap-4 text-anirvan-muted">
              <div className="h-8 w-8 bg-white/5 rounded flex items-center justify-center hover:bg-white/10 cursor-pointer">X</div>
              <div className="h-8 w-8 bg-white/5 rounded flex items-center justify-center hover:bg-white/10 cursor-pointer">D</div>
              <div className="h-8 w-8 bg-white/5 rounded flex items-center justify-center hover:bg-white/10 cursor-pointer">G</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;