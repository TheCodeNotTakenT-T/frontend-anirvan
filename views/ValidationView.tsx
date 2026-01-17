import { useState, useEffect } from 'react';
import { CheckCircle2, FileText, MapPin, RefreshCcw, Inbox, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import SentinelValidator from '../components/SentinelValidator';
import { LandApplication } from '../types';
import { supabase } from '../supabaseClient';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../src/wagmi'; // Ensure this file exists from previous step

const ValidationView = () => {
  const [applications, setApplications] = useState<LandApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<LandApplication | null>(null);
  
  // --- SUPABASE STATE ---
  const [loading, setLoading] = useState(false);

  // --- WAGMI / EVM STATE ---
  const { isConnected, address } = useAccount();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  
  // Local state to track the transaction hash for UI display
  const [txnHash, setTxnHash] = useState<string | null>(null);

  // --- FETCH DATA FROM SUPABASE ---
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

        const pendingQueue = mappedApps.filter(app => app.status === 'PENDING');
        setApplications(pendingQueue);
        
        if (selectedApp) {
           const exists = pendingQueue.find(a => a.id === selectedApp.id);
           if (!exists) setSelectedApp(null);
        }
      }
    } catch (err: any) {
      console.error('Error loading applications:', err);
      alert('Failed to load validation queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // --- SYNC WITH BLOCKCHAIN ---
  useEffect(() => {
    if (hash) setTxnHash(hash);
  }, [hash]);

  // When Blockchain Transaction is CONFIRMED, Update Supabase
  useEffect(() => {
    if (isConfirmed && selectedApp) {
        const finalizeApproval = async () => {
            try {
                const { error } = await supabase
                    .from('land_applications')
                    .update({ status: 'APPROVED' })
                    .eq('survey_number', selectedApp.id);

                if (error) throw error;

                alert("Success! Parcel Minted on Polygon & Database Updated.");
                setTxnHash(null);
                loadApplications(); // Refresh queue
                setSelectedApp(null);
            } catch (err) {
                console.error("Database sync error:", err);
                alert("Minted on chain, but DB update failed. Please check logs.");
            }
        };
        finalizeApproval();
    }
  }, [isConfirmed]);

  // --- HANDLE REJECT (Database Only) ---
  const handleReject = async () => {
    if(!selectedApp) return;
    try {
        const { error } = await supabase
            .from('land_applications')
            .update({ status: 'REJECTED' })
            .eq('survey_number', selectedApp.id);

        if (error) throw error;
        alert("Application Rejected.");
        loadApplications();
        setSelectedApp(null);
    } catch (err) {
        alert("Error rejecting application");
    }
  };

  // --- HANDLE APPROVE (Blockchain First) ---
  const handleApprove = async () => {
    if (!selectedApp) return;
    if (!isConnected) {
        alert("Please connect your Wallet to mint the NFT.");
        return;
    }

    // 1. Logic to determine Region Multiplier (1=Rural, 2=Urban, 3=Metro)
    // For prototype, we estimate based on Area size or random
    let regionType = 1; 
    if (selectedApp.area < 2) regionType = 3; 
    else if (selectedApp.area < 10) regionType = 2;

    // 2. Logic to get Vegetation Percent (Ideally comes from SentinelValidator)
    // We hardcode a passing score for the prototype action
    const vegPercent = 85; 

    try {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'registerLandAndMint',
            args: [
                selectedApp.id,           // parcelId
                address!,                 // landowner (using validator addr for demo)
                BigInt(Math.floor(selectedApp.area)), // acres
                BigInt(vegPercent),       // vegPercent
                regionType,               // regionType
                selectedApp.pdfName       // tokenURI
            ]
        });
    } catch (e) {
        console.error("Contract Error:", e);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 h-[calc(100vh-80px)]">
      <div className="grid grid-cols-12 gap-6 h-full">
        
        {/* LEFT: COMPACT QUEUE */}
        <div className="col-span-3 bg-anirvan-card border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-xl">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                <div className="flex flex-col">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-anirvan-muted">Review Queue</h3>
                    <span className="text-[10px] text-anirvan-accent font-mono">
                        {loading ? 'Loading...' : `${applications.length} Pending`}
                    </span>
                </div>
                <button 
                    onClick={loadApplications} 
                    disabled={loading}
                    className={`p-1.5 hover:bg-white/5 rounded-full transition-all duration-500 ${loading ? 'animate-spin' : 'hover:rotate-180'}`}
                >
                    <RefreshCcw className="h-4 w-4 text-anirvan-accent" />
                </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-2 bg-anirvan-dark/30">
                {applications.length > 0 ? (
                    applications.map(app => (
                        <div 
                            key={app.id} 
                            onClick={() => setSelectedApp(app)} 
                            className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedApp?.id === app.id ? 'bg-anirvan-primary/10 border-anirvan-accent shadow-inner' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                        >
                            <div className="flex justify-between mb-1">
                                <span className="font-bold text-white text-sm truncate">{app.ownerName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-anirvan-muted font-mono">{app.id}</span>
                                <span className="text-[10px] text-anirvan-accent">{app.area} Ac</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-anirvan-muted opacity-40">
                        <Inbox className="h-8 w-8 mb-2" />
                        <span className="text-xs">{loading ? 'Fetching...' : 'Queue Clear'}</span>
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT: DETAILED ANALYSIS VIEW */}
        <div className="col-span-9 flex flex-col gap-4 overflow-hidden">
            {selectedApp ? (
                <>
                    {/* Header Strip with PDF Link */}
                    <div className="bg-anirvan-card border border-white/10 rounded-xl p-4 flex justify-between items-center shadow-lg shrink-0">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-white tracking-tight">{selectedApp.ownerName}</h2>
                                <span className="bg-black/40 text-anirvan-muted px-2 py-0.5 rounded text-[10px] font-mono border border-white/10">{selectedApp.id}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1.5 text-anirvan-accent font-medium"><MapPin className="h-3.5 w-3.5" /> {selectedApp.area} Acres</span>
                                <span className="text-anirvan-muted">Species: <span className="text-white italic">{selectedApp.species}</span></span>
                            </div>
                        </div>

                        {/* Actions Area */}
                        <div className="flex items-center gap-4">
                            
                            {txnHash && (
                                <a href={`https://amoy.polygonscan.com/tx/${txnHash}`} target="_blank" className="text-xs text-blue-400 underline flex items-center gap-1 bg-blue-900/20 px-2 py-1 rounded border border-blue-500/30">
                                    View Tx <ExternalLink className="h-3 w-3"/>
                                </a>
                            )}

                            {/* PDF Link */}
                            <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                                <a 
                                    href={selectedApp.pdfName} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="group flex items-center gap-2 text-xs font-bold text-anirvan-muted hover:text-white transition-colors"
                                >
                                    <div className="p-1.5 bg-white/5 rounded-md group-hover:bg-anirvan-accent group-hover:text-black transition-colors">
                                        <FileText className="h-3.5 w-3.5" />
                                    </div>
                                    <span>Proof</span>
                                    <ExternalLink className="h-3 w-3 opacity-50 ml-1" />
                                </a>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={handleReject} 
                                    disabled={isPending || isConfirming}
                                    className="bg-red-950/20 border border-red-500/30 hover:bg-red-600 hover:text-white text-red-400 px-4 py-2 rounded-lg font-bold text-xs transition-all uppercase tracking-wider disabled:opacity-50"
                                >
                                    Reject
                                </button>
                                
                                <button 
                                    onClick={handleApprove} 
                                    disabled={isPending || isConfirming}
                                    className="bg-anirvan-primary hover:bg-anirvan-accent text-anirvan-dark px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg transition-all uppercase tracking-wider disabled:opacity-50"
                                >
                                    {(isPending || isConfirming) ? <Loader2 className="animate-spin h-3.5 w-3.5"/> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                    {isPending ? 'Wallet...' : isConfirming ? 'Minting...' : 'Approve & Mint'}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {writeError && (
                        <div className="flex items-center gap-2 bg-red-900/50 text-red-200 p-3 text-xs rounded border border-red-500/20">
                            <AlertTriangle className="h-4 w-4" />
                            {writeError.message.includes("User rejected") ? "Transaction rejected by wallet." : "Contract Error. Check console."}
                        </div>
                    )}

                    {/* Main Content Area - Full Width */}
                    <div className="flex-1 bg-black/20 rounded-xl border border-white/10 overflow-hidden relative">
                         {selectedApp.coordinates && (
                            <SentinelValidator 
                                initialLat={selectedApp.coordinates.lat} 
                                initialLon={selectedApp.coordinates.lon} 
                                polygonPath={selectedApp.polygonPath} 
                                onValidationComplete={() => { /* Optional auto-approve logic */ }}
                            />
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-anirvan-muted border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                    <div className="p-4 bg-white/5 rounded-full mb-4">
                        <Inbox className="h-10 w-10 opacity-20" />
                    </div>
                    <p className="text-sm font-medium">Select an application from the queue to start analysis</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ValidationView;