import { useState, useEffect } from 'react';
import { CheckCircle2, MapPin, RefreshCcw, Inbox, ExternalLink, Loader2, AlertTriangle, Play, ShieldCheck } from 'lucide-react';
import SentinelValidator from '../components/SentinelValidator';
import { LandApplication } from '../types';
import { supabase } from '../supabaseClient';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// --- IMPORT CONSTANTS ---
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './constants'; 

const ValidationView = () => {
  const { isConnected } = useAccount();
  const [applications, setApplications] = useState<LandApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<LandApplication | null>(null);
  const [txnHash, setTxnHash] = useState<string | null>(null);

  // WAGMI Hooks
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Load Queue
  const loadApplications = async () => {
    const { data } = await supabase.from('land_applications').select('*').order('submitted_at', { ascending: false });
    if (data) {
        const apps = data.map((row: any) => ({
            id: row.survey_number,
            ownerName: row.full_name,
            species: row.tree_species,
            area: row.area_acres,
            coordinates: row.coordinates,
            polygonPath: row.polygon_path,
            status: row.status,
            walletAddress: row.wallet_address,
            pdfName: row.pdf_name,
            images: row.images,
            submittedAt: row.submitted_at
        }));
        setApplications(apps.filter((a: any) => a.status === 'PENDING'));
    }
  };

  useEffect(() => { if(isConnected) loadApplications(); }, [isConnected]);
  useEffect(() => { if (hash) setTxnHash(hash); }, [hash]);
  
  useEffect(() => {
    if (isConfirmed && selectedApp) {
        // Update DB only after blockchain confirmation
        supabase.from('land_applications').update({ status: 'APPROVED' }).eq('survey_number', selectedApp.id).then(() => {
            alert("Land Registered On-Chain!");
            setTxnHash(null);
            setSelectedApp(null);
            loadApplications();
        });
    }
  }, [isConfirmed]);

  const handleApprove = () => {
      if (!selectedApp?.walletAddress) return alert("No wallet linked to this application");
      
      console.log("Approving:", selectedApp.walletAddress, selectedApp.id);

      writeContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'registerLand',
          // Explicitly cast arguments to ensure they match ABI types
          args: [selectedApp.walletAddress as `0x${string}`, selectedApp.id]
      });
  };

  // --- LOGIN GATE ---
  if (!isConnected) {
      return (
          <div className="h-screen flex items-center justify-center bg-anirvan-dark">
              <div className="text-center bg-anirvan-card p-12 rounded-xl border border-white/10 shadow-2xl">
                  <ShieldCheck className="h-16 w-16 text-anirvan-accent mx-auto mb-6"/>
                  <h1 className="text-3xl font-bold text-white mb-2">Validator Portal</h1>
                  <p className="text-anirvan-muted mb-8">Connect authorized wallet to process land registry queue.</p>
                  <div className="flex justify-center"><ConnectButton /></div>
              </div>
          </div>
      );
  }

  // --- MAIN UI ---
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 h-[calc(100vh-80px)]">
      <div className="grid grid-cols-12 gap-6 h-full">
        {/* Left: Queue */}
        <div className="col-span-3 bg-anirvan-card border border-white/10 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                <span className="font-bold text-anirvan-muted uppercase text-xs tracking-widest">Pending ({applications.length})</span>
                <button onClick={loadApplications}><RefreshCcw className="h-4 w-4 text-white hover:text-anirvan-accent"/></button>
            </div>
            <div className="overflow-y-auto p-2 space-y-2">
                {applications.map(app => (
                    <div key={app.id} onClick={() => setSelectedApp(app)} className={`p-3 rounded-lg cursor-pointer border ${selectedApp?.id === app.id ? 'bg-anirvan-primary/10 border-anirvan-accent' : 'bg-black/20 border-white/5'}`}>
                        <div className="font-bold text-white text-sm">{app.ownerName}</div>
                        <div className="text-[10px] text-anirvan-muted font-mono">{app.id}</div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right: Action Area */}
        <div className="col-span-9 flex flex-col gap-4">
            {selectedApp ? (
                <>
                    <div className="bg-anirvan-card border border-white/10 rounded-xl p-4 flex justify-between items-center shadow-lg">
                        <div>
                            <h2 className="text-xl font-bold text-white">{selectedApp.ownerName}</h2>
                            <div className="text-xs text-anirvan-muted flex gap-4 mt-1"><span className="flex items-center gap-1"><MapPin className="h-3 w-3"/> {selectedApp.area} Acres</span> <span>{selectedApp.species}</span> <span className="font-mono text-white/50">{selectedApp.walletAddress}</span></div>
                        </div>
                        <div className="flex gap-2 items-center">
                            {txnHash && <a href={`https://amoy.polygonscan.com/tx/${txnHash}`} target="_blank" className="text-blue-400 text-xs underline mr-2">View TX</a>}
                            <button onClick={handleApprove} disabled={isPending || isConfirming} className="bg-anirvan-primary text-anirvan-dark px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-anirvan-accent transition-colors">
                                {(isPending || isConfirming) ? <Loader2 className="animate-spin h-3.5 w-3.5"/> : <Play className="h-3.5 w-3.5"/>}
                                {isPending ? 'Check Wallet' : isConfirming ? 'Minting...' : 'Approve Registry'}
                            </button>
                        </div>
                    </div>
                    {writeError && <div className="text-red-400 text-xs p-3 bg-red-900/20 border border-red-500/20 rounded flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> {writeError.message}</div>}
                    <div className="flex-1 bg-black/20 rounded-xl border border-white/10 relative overflow-hidden">
                        {selectedApp.coordinates && <SentinelValidator initialLat={selectedApp.coordinates.lat} initialLon={selectedApp.coordinates.lon} polygonPath={selectedApp.polygonPath} />}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl text-anirvan-muted opacity-50"><Inbox className="h-12 w-12 mb-2"/><p>Select an application</p></div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ValidationView;