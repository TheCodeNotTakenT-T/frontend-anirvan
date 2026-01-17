import { useState, useEffect } from 'react';
import { DollarSign, ShieldCheck, Loader2, MapPin, TreePine } from 'lucide-react';
import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem'; 
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../src/wagmi';
import { supabase } from '../supabaseClient'; // Import Supabase
import { LandApplication } from '../types';

const EnterpriseView = () => {
  const [projects, setProjects] = useState<LandApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingIndex, setBuyingIndex] = useState<number | null>(null);

  // --- WAGMI HOOKS ---
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // --- FETCH REAL DATA ---
  useEffect(() => {
    const fetchApprovedProjects = async () => {
      try {
        // Fetch only APPROVED projects
        const { data, error } = await supabase
          .from('land_applications')
          .select('*')
          .eq('status', 'APPROVED')
          .order('submitted_at', { ascending: true }); // Important: Match minting order

        if (error) throw error;

        if (data) {
          const mapped: LandApplication[] = data.map((row: any) => ({
            id: row.survey_number,
            ownerName: row.full_name,
            species: row.tree_species,
            area: row.area_acres,
            pdfName: row.document_url,
            coordinates: row.coordinates,
            polygonPath: row.polygon_path,
            status: row.status,
            submittedAt: row.submitted_at,
            // Use uploaded image or fallback
            images: row.images && row.images.length > 0 ? row.images : [], 
            videoName: row.video_url
          }));
          setProjects(mapped);
        }
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedProjects();
  }, [isSuccess]); // Re-fetch if a purchase happens (optional)

  // --- READ PRICE FROM CONTRACT ---
  // We check the MATIC cost for $10 USD (Standard Price)
  const { data: maticCost } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getMaticPrice',
    args: [BigInt(10)], 
  });

  const handleBuy = (index: number) => {
    if (!maticCost) {
        alert("Price feed loading...");
        return;
    }
    setBuyingIndex(index);
    
    try {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'buyCredit',
            args: [BigInt(index)], // We use the Array Index as the Token ID
            value: maticCost as bigint 
        });
    } catch (e) {
        console.error(e);
        setBuyingIndex(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-4">Carbon Credit Marketplace</h2>
        <p className="text-anirvan-muted max-w-2xl mx-auto">
          Fund verified reforestation projects directly. Real-time data from Polygon Amoy Testnet.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-8 w-8 text-anirvan-accent"/>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center text-anirvan-muted border border-dashed border-white/10 rounded-xl p-12">
            No verified projects listed yet. Go to the Validation View to approve land.
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
            {projects.map((project, index) => (
            <div key={project.id} className="bg-anirvan-card border border-white/10 rounded-xl overflow-hidden hover:border-anirvan-accent/50 transition-all group">
                <div className="h-48 overflow-hidden relative bg-gray-900">
                {/* Image Logic: Use uploaded image or a nice gradient fallback */}
                {project.images.length > 0 ? (
                    <img src={project.images[0]} alt="Forest" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-900 to-black flex items-center justify-center">
                        <TreePine className="h-12 w-12 text-white/20" />
                    </div>
                )}
                
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs text-lime-400 font-mono border border-lime-500/30">
                    Token ID #{index}
                </div>
                </div>
                
                <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-white truncate pr-2">{project.ownerName}</h3>
                    <span className="text-xs text-anirvan-muted bg-white/5 px-2 py-1 rounded whitespace-nowrap">Verified</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                    <MapPin className="h-3 w-3" /> 
                    {project.coordinates ? `${project.coordinates.lat.toFixed(2)}, ${project.coordinates.lon.toFixed(2)}` : 'Location Hidden'}
                </div>
                <p className="text-sm text-anirvan-muted mb-4 italic">
                    {project.species} • {project.area} Acres
                </p>
                
                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                    <div>
                    <div className="text-xs text-anirvan-muted mb-1">Price</div>
                    <div className="text-xl font-bold text-white flex items-center gap-1">
                        <DollarSign className="h-4 w-4" /> 10.00
                    </div>
                    {maticCost ? (
                        <div className="text-[10px] text-anirvan-accent font-mono mt-1">
                            ≈ {parseFloat(formatEther(maticCost as bigint)).toFixed(3)} MATIC
                        </div>
                    ) : null}
                    </div>
                    
                    <button 
                        onClick={() => handleBuy(index)}
                        disabled={isPending || isConfirming}
                        className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg"
                    >
                    {(isPending || isConfirming) && buyingIndex === index ? <Loader2 className="animate-spin h-4 w-4"/> : null}
                    Buy NFT
                    </button>
                </div>
                </div>
            </div>
            ))}
        </div>
      )}

      {/* SUCCESS TOAST */}
      {isSuccess && (
        <div className="fixed bottom-8 right-8 bg-green-900 text-green-100 p-4 rounded-xl border border-green-500/50 shadow-2xl animate-bounce-in z-50">
            <div className="font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5"/> Purchase Successful!</div>
            <div className="text-xs mt-1">You now own the Carbon Credit NFT.</div>
            <a href={`https://amoy.polygonscan.com/tx/${hash}`} target="_blank" className="text-xs underline mt-2 block text-green-300">View Transaction</a>
        </div>
      )}
    </div>
  );
};

export default EnterpriseView;