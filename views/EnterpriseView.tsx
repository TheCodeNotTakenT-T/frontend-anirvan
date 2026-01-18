import { useState, useEffect } from 'react';
import { DollarSign, ShieldCheck, Loader2, MapPin, Clock } from 'lucide-react';
// UPDATED: Imported useReadContracts (plural)
import { useWriteContract, useReadContracts, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../src/wagmi';
import { supabase } from '../supabaseClient';
import { LandApplication } from '../types';

// Helper interface for the Live Ticker data
interface ProjectMarketData {
  lastClaimTime: bigint;
  pendingTokens: number;
  costInPol: number;
}

const EnterpriseView = () => {
  const [projects, setProjects] = useState<LandApplication[]>([]);
  const [marketData, setMarketData] = useState<Record<number, ProjectMarketData>>({});
  const [buyingIndex, setBuyingIndex] = useState<number | null>(null);

  // Wagmi
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // 1. Fetch Projects from Supabase
  useEffect(() => {
    const fetchApproved = async () => {
      const { data } = await supabase
        .from('land_applications')
        .select('*')
        .eq('status', 'APPROVED')
        .order('submitted_at', { ascending: true });
      
      if (data) {
        const mapped = data.map((row: any) => ({
            id: row.survey_number,
            ownerName: row.full_name,
            species: row.tree_species,
            area: row.area_acres,
            pdfName: row.document_url,
            coordinates: row.coordinates,
            polygonPath: row.polygon_path,
            status: row.status,
            submittedAt: row.submitted_at,
            images: row.images || [], 
            videoName: row.video_url
        }));
        setProjects(mapped);
      }
    };
    fetchApproved();
  }, []);

  // 2. Fetch Blockchain Data (Start Times) - DYNAMIC VERSION
  // This hook automatically creates a contract call for every project in the 'projects' array.
  // It assumes the index in the Supabase array matches the Project ID in the Smart Contract.
  const { data: contractData } = useReadContracts({
    contracts: projects.map((_, index) => ({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'projects',
      args: [BigInt(index)], 
    })),
  });

  // 3. The Live Ticker Logic
  useEffect(() => {
    // Wait for contract data to load
    if (!contractData) return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const newMarketData: Record<number, ProjectMarketData> = {};

      // Iterate through ALL contract results dynamically
      contractData.forEach((result, index) => {
        // Wagmi v2 returns data in a 'result' property (or 'status'/'error')
        // result.result is the actual return value from the smart contract function
        const pData = result.result as any; 

        if (!pData) return;

        // Smart Contract returns: [landowner, lastClaimTime, surveyNumber, isRegistered]
        const lastClaim = Number(pData[1]); 
        const elapsed = now - lastClaim;
        
        // DEMO SPEED: 1 Token every 60 seconds
        const pending = Math.floor(elapsed / 60); 
        
        // Cost: 20 POL per Token
        const cost = pending * 20;

        newMarketData[index] = {
          lastClaimTime: BigInt(lastClaim),
          pendingTokens: pending,
          costInPol: cost
        };
      });

      setMarketData(newMarketData);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [contractData]); // Re-run whenever new blockchain data arrives


  const handleBuy = (index: number) => {
    const data = marketData[index];
    if (!data || data.pendingTokens <= 0) return;

    setBuyingIndex(index);
    try {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'buyPendingCredits',
            args: [BigInt(index)],
            value: BigInt(data.costInPol) * BigInt(1e18) // Convert to Wei
        });
    } catch (e) {
        console.error(e);
        setBuyingIndex(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-4">Live Carbon Stream</h2>
        <p className="text-anirvan-muted max-w-2xl mx-auto">
          Carbon credits accumulate in real-time. Buy the pending batch to mint the NFT.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {projects.map((project, index) => {
          const mData = marketData[index];
          const pending = mData ? mData.pendingTokens : 0;
          const cost = mData ? mData.costInPol : 0;

          return (
            <div key={project.id} className="bg-anirvan-card border border-white/10 rounded-xl overflow-hidden hover:border-anirvan-accent/50 transition-all group">
               <div className="h-48 overflow-hidden relative bg-gray-900">
                    {project.images.length > 0 ? (
                        <img src={project.images[0]} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white/20 font-bold">NO IMAGE</div>
                    )}
                    
                    {/* LIVE TICKER BADGE */}
                    <div className="absolute top-3 right-3 bg-black/80 backdrop-blur border border-lime-500/50 px-3 py-1.5 rounded-full flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
                        </span>
                        <span className="text-xs font-mono font-bold text-lime-400">
                           {pending} ARTHA Available
                        </span>
                    </div>
               </div>

               <div className="p-6">
                 <h3 className="font-bold text-lg text-white mb-1">{project.ownerName}</h3>
                 <div className="flex items-center gap-2 text-xs text-anirvan-muted mb-4">
                    <Clock className="h-3 w-3" /> Accumulating since registration
                 </div>

                 <div className="bg-black/30 rounded-lg p-3 border border-white/5 mb-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Batch Value (USD)</span>
                        <span className="text-white font-bold">${pending * 10}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Cost (POL)</span>
                        <span className="text-anirvan-accent font-mono">{cost} POL</span>
                    </div>
                 </div>

                 <button 
                    onClick={() => handleBuy(index)}
                    disabled={pending === 0 || isPending || isConfirming}
                    className={`w-full py-3 rounded-lg font-bold text-sm flex justify-center items-center gap-2 transition-all
                        ${pending > 0 
                            ? 'bg-anirvan-primary text-black hover:bg-white' 
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                 >
                    {(isPending || isConfirming) && buyingIndex === index ? <Loader2 className="animate-spin h-4 w-4"/> : <DollarSign className="h-4 w-4" />}
                    {pending > 0 ? 'Buy & Mint Batch' : 'Wait for Accumulation...'}
                 </button>
               </div>
            </div>
          );
        })}
      </div>
      
      {isSuccess && (
        <div className="fixed bottom-8 right-8 bg-green-900 text-green-100 p-4 rounded-xl border border-green-500/50 shadow-2xl animate-bounce-in z-50">
            <div className="font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5"/> Batch Purchased!</div>
            <div className="text-xs mt-1">NFT Minted. Counter reset.</div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseView;