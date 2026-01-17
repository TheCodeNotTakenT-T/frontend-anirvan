import { useState, useEffect } from 'react';
import { CheckCircle2, FileText, MapPin, RefreshCcw, Inbox, ExternalLink, Loader2, AlertTriangle, Play } from 'lucide-react';
import SentinelValidator from '../components/SentinelValidator';
import { LandApplication } from '../types';
import { supabase } from '../supabaseClient';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';

// FIX: Correct Import Path (Assuming wagmi.ts is in src/)
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../src/wagmi';

const ValidationView = () => {
  const [applications, setApplications] = useState<LandApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<LandApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const [txnHash, setTxnHash] = useState<string | null>(null);

  // WAGMI
  const { isConnected, address } = useAccount();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // 1. Fetch Applications
  const loadApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('land_applications')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedApps: LandApplication[] = data.map((row: any) => ({
          id: row.survey_number,
          ownerName: row.full_name,
          species: row.tree_species,
          area: row.area_acres,
          pdfName: row.document_url, 
          coordinates: row.coordinates,
          polygonPath: row.polygon_path,
          status: row.status,
          submittedAt: row.submitted_at,
          images: [],
          videoName: ''
        }));
        setApplications(mappedApps.filter(app => app.status === 'PENDING'));
        if (selectedApp) {
           if (!mappedApps.find(a => a.id === selectedApp.id)) setSelectedApp(null);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadApplications(); }, []);
  useEffect(() => { if (hash) setTxnHash(hash); }, [hash]);

  // 2. Sync DB when Blockchain Confirms
  useEffect(() => {
    if (isConfirmed && selectedApp) {
        const finalize = async () => {
            // Update status to APPROVED in Supabase
            await supabase.from('land_applications').update({ status: 'APPROVED' }).eq('survey_number', selectedApp.id);
            alert("Success! Land Registered. Token accumulation started.");
            setTxnHash(null);
            loadApplications();
            setSelectedApp(null);
        };
        finalize();
    }
  }, [isConfirmed]);

  // 3. Reject Logic
  const handleReject = async () => {
    if(!selectedApp) return;
    await supabase.from('land_applications').update({ status: 'REJECTED' }).eq('survey_number', selectedApp.id);
    alert("Application Rejected.");
    loadApplications();
    setSelectedApp(null);
  };

  // 4. APPROVE LOGIC (Calls registerLand)
  const handleApprove = async () => {
    if (!selectedApp) return;
    if (!isConnected) {
        alert("Please connect wallet first.");
        return;
    }

    try {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'registerLand',
            // Pass the LANDOWNER address. 
            // For testing/hackathon, we use 'address!' (the connected validator) so you can test buying your own credits easily.
            // In prod, this would be: args: [selectedApp.ownerWalletAddress]
            args: [address!] 
        });
    } catch (e) {
        console.error("Contract Error:", e);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 h-[calc(100vh-80px)]">
      <div className="grid grid-cols-12 gap-6 h-full">
        {/* LEFT SIDEBAR */}
        <div className="col-span-3 bg-anirvan-card border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-xl">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                <span className="text-xs font-bold uppercase tracking-widest text-anirvan-muted">Queue ({applications.length})</span>
                <button onClick={loadApplications} className="p-1.5 hover:bg-white/5 rounded-full"><RefreshCcw className="h-4 w-4 text-anirvan-accent" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2 bg-anirvan-dark/30">
                {applications.map(app => (
                    <div key={app.id} onClick={() => setSelectedApp(app)} className={`p-3 rounded-lg cursor-pointer border ${selectedApp?.id === app.id ? 'bg-anirvan-primary/10 border-anirvan-accent' : 'bg-black/20 border-white/5'}`}>
                        <div className="font-bold text-white text-sm truncate">{app.ownerName}</div>
                        <div className="text-[10px] text-anirvan-muted">{app.id}</div>
                    </div>
                ))}
            </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="col-span-9 flex flex-col gap-4 overflow-hidden">
            {selectedApp ? (
                <>
                    <div className="bg-anirvan-card border border-white/10 rounded-xl p-4 flex justify-between items-center shadow-lg shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-white">{selectedApp.ownerName}</h2>
                            <div className="flex gap-4 text-xs mt-1">
                                <span className="flex items-center gap-1 text-anirvan-accent"><MapPin className="h-3 w-3" /> {selectedApp.area} Acres</span>
                                <span className="text-anirvan-muted">{selectedApp.species}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {txnHash && (
                                <a href={`https://amoy.polygonscan.com/tx/${txnHash}`} target="_blank" className="text-xs text-blue-400 underline bg-blue-900/20 px-2 py-1 rounded border border-blue-500/30">View Tx <ExternalLink className="h-3 w-3 inline"/></a>
                            )}
                            
                            <div className="flex gap-2">
                                <button onClick={handleReject} disabled={isPending} className="px-4 py-2 rounded-lg font-bold text-xs bg-red-950/20 text-red-400 border border-red-500/30 hover:bg-red-900/50">Reject</button>
                                <button 
                                    onClick={handleApprove} 
                                    disabled={isPending || isConfirming}
                                    className="bg-anirvan-primary hover:bg-anirvan-accent text-anirvan-dark px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
                                >
                                    {(isPending || isConfirming) ? <Loader2 className="animate-spin h-3.5 w-3.5"/> : <Play className="h-3.5 w-3.5" />}
                                    {isPending ? 'Check Wallet...' : isConfirming ? 'Registering...' : 'Approve & Start Clock'}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {writeError && (
                        <div className="text-xs text-red-200 p-3 border border-red-500/20 bg-red-900/50 rounded flex gap-2 items-center">
                            <AlertTriangle className="h-4 w-4 text-red-400"/> 
                            <span>{writeError.message.includes("User rejected") ? "Transaction rejected." : "Contract Error. Ensure address in wagmi.ts matches deployed contract."}</span>
                        </div>
                    )}

                    <div className="flex-1 bg-black/20 rounded-xl border border-white/10 overflow-hidden relative">
                         {selectedApp.coordinates && (
                            <SentinelValidator initialLat={selectedApp.coordinates.lat} initialLon={selectedApp.coordinates.lon} polygonPath={selectedApp.polygonPath} />
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-anirvan-muted border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                    <Inbox className="h-10 w-10 mb-4 opacity-50" />
                    <p>Select application to validate</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ValidationView;