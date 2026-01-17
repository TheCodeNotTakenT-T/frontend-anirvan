import { useState, useEffect } from 'react';
import { CheckCircle2, FileText, MapPin, RefreshCcw, Inbox, ExternalLink, Loader2 } from 'lucide-react';
import SentinelValidator from '../components/SentinelValidator';
import { LandApplication } from '../types';
import { supabase } from '../supabaseClient'; // Import Supabase client

const ValidationView = () => {
  const [applications, setApplications] = useState<LandApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<LandApplication | null>(null);
  
  // --- SUPABASE STATE ---
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // --- FETCH DATA FROM SUPABASE ---
  const loadApplications = async () => {
    setLoading(true);
    try {
      // Fetch all applications
      const { data, error } = await supabase
        .from('land_applications')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Map Database Columns (snake_case) to Frontend Type (camelCase)
        const mappedApps: LandApplication[] = data.map((row: any) => ({
          id: row.survey_number,
          ownerName: row.full_name,
          species: row.tree_species,
          area: row.area_acres,
          pdfName: row.document_url, // Contains the full Supabase Storage URL
          coordinates: row.coordinates,
          polygonPath: row.polygon_path,
          status: row.status,
          submittedAt: row.submitted_at,
          images: [],
          videoName: ''
        }));

        // Filter for PENDING items to show in the "Review Queue"
        // (You can remove this filter if you want to see history)
        const pendingQueue = mappedApps.filter(app => app.status === 'PENDING');
        setApplications(pendingQueue);
        
        // If the currently selected app was processed/removed, deselect it
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

  // --- UPDATE STATUS IN SUPABASE ---
  const handleDecision = async (status: 'APPROVED' | 'REJECTED') => {
    if(!selectedApp) return;
    
    setProcessingId(selectedApp.id);

    try {
        // Update DB
        const { error } = await supabase
            .from('land_applications')
            .update({ status: status })
            .eq('survey_number', selectedApp.id);

        if (error) throw error;

        // UI Feedback
        const msg = status === 'APPROVED' ? "Parcel Approved & Credits Minted!" : "Parcel Rejected.";
        alert(msg);
        
        // Remove from local queue (since it is no longer PENDING)
        setApplications(prev => prev.filter(a => a.id !== selectedApp.id));
        setSelectedApp(null);

    } catch (err: any) {
        console.error('Error updating status:', err);
        alert('Failed to update status.');
    } finally {
        setProcessingId(null);
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
                            {/* PDF Link - Uses Supabase URL */}
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
                                    <span>Document Proof</span>
                                    <ExternalLink className="h-3 w-3 opacity-50 ml-1" />
                                </a>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleDecision('REJECTED')} 
                                    disabled={!!processingId}
                                    className="bg-red-950/20 border border-red-500/30 hover:bg-red-600 hover:text-white text-red-400 px-4 py-2 rounded-lg font-bold text-xs transition-all uppercase tracking-wider disabled:opacity-50"
                                >
                                    Reject
                                </button>
                                
                                <button 
                                    onClick={() => handleDecision('APPROVED')} 
                                    disabled={!!processingId}
                                    className="bg-anirvan-primary hover:bg-anirvan-accent text-anirvan-dark px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg transition-all uppercase tracking-wider disabled:opacity-50"
                                >
                                    {processingId === selectedApp.id ? <Loader2 className="animate-spin h-3.5 w-3.5"/> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                    Approve
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area - Full Width */}
                    <div className="flex-1 bg-black/20 rounded-xl border border-white/10 overflow-hidden relative">
                         {selectedApp.coordinates && (
                            <SentinelValidator 
                                initialLat={selectedApp.coordinates.lat} 
                                initialLon={selectedApp.coordinates.lon} 
                                polygonPath={selectedApp.polygonPath} 
                                // Pass validation callback so internal buttons in the map also trigger Supabase update
                                onValidationComplete={() => handleDecision('APPROVED')}
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