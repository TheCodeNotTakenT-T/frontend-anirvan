import { useState, useEffect, useRef } from 'react';
import { 
  Upload, FileText, CheckCircle2, Clock, XCircle, 
  Loader2, Wallet, LayoutDashboard, PlusCircle, LogIn, 
  TrendingUp, Coins 
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 

// --- WAGMI & RAINBOWKIT ---
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// --- ARCGIS IMPORTS ---
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Sketch from "@arcgis/core/widgets/Sketch";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import Polygon from "@arcgis/core/geometry/Polygon"; 
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils";
import "@arcgis/core/assets/esri/themes/light/main.css";

import { LandApplication } from '../types';

const LandownerView = () => {
  const { address, isConnected } = useAccount();

  // --- STATE ---
  const [mode, setMode] = useState<'register' | 'dashboard'>('register');
  const [step, setStep] = useState(1);
  const [currentTime, setCurrentTime] = useState(Date.now()); // <--- NEW: For the live ticker
  
  // Registration Form State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const speciesOptions = ["Native Hardwood", "Bamboo", "Fruit Bearing"];
  const [formData, setFormData] = useState<Partial<LandApplication>>({
    ownerName: '', species: 'Native Hardwood', area: 0, id: '', pdfName: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [coordinates, setCoordinates] = useState<{lat: number, lon: number} | null>(null);
  const [polygonRings, setPolygonRings] = useState<number[][]>([]);
  
  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  
  // Dashboard Data
  const [myApplications, setMyApplications] = useState<LandApplication[]>([]);

  // Refs
  const mapDiv = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // --- 1. LOGIN GATE: Fetch Dashboard Data on Connect ---
  useEffect(() => {
    if (isConnected && address && mode === 'dashboard') {
        fetchMyApplications();
    }
  }, [isConnected, address, mode]);

  // --- NEW: Live Ticker Effect ---
  // This updates the 'currentTime' every second so the tokens go up in real-time
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchMyApplications = async () => {
      setIsLoadingDashboard(true);
      const { data, error } = await supabase
          .from('land_applications')
          .select('*')
          .eq('wallet_address', address);

      if (!error && data) {
          const apps: LandApplication[] = data.map((d: any) => ({
              id: d.survey_number,
              ownerName: d.full_name,
              species: d.tree_species,
              area: d.area_acres,
              status: d.status,
              submittedAt: d.submitted_at, // Vital for calculation
              walletAddress: d.wallet_address,
              images: d.images
          } as LandApplication));
          setMyApplications(apps);
      }
      setIsLoadingDashboard(false);
  };

  // --- 2. REGISTRATION SUBMISSION ---
  const handleSubmit = async () => {
    if (!formData.id || !coordinates || !selectedFile || !address) return;
    setIsSubmitting(true);

    try {
        const docName = `${Date.now()}_doc_${selectedFile.name.replace(/\s/g, '_')}`;
        await supabase.storage.from('land_documents').upload(docName, selectedFile);
        const { data: { publicUrl: docUrl } } = supabase.storage.from('land_documents').getPublicUrl(docName);

        const imageUrls = [];
        for (const img of selectedImages) {
            const imgName = `${Date.now()}_img_${img.name.replace(/\s/g, '_')}`;
            await supabase.storage.from('land_documents').upload(imgName, img);
            imageUrls.push(supabase.storage.from('land_documents').getPublicUrl(imgName).data.publicUrl);
        }

        let videoUrl = '';
        if (selectedVideo) {
            const vidName = `${Date.now()}_vid_${selectedVideo.name.replace(/\s/g, '_')}`;
            await supabase.storage.from('land_documents').upload(vidName, selectedVideo);
            videoUrl = supabase.storage.from('land_documents').getPublicUrl(vidName).data.publicUrl;
        }

        const { error } = await supabase.from('land_applications').insert([{
            full_name: formData.ownerName,
            survey_number: formData.id,
            tree_species: formData.species,
            area_acres: formData.area,
            status: 'PENDING',
            document_url: docUrl,
            coordinates: coordinates,
            polygon_path: polygonRings,
            images: imageUrls,
            video_url: videoUrl,
            wallet_address: address
        }]);

        if (error) throw error;

        alert("Application Submitted!");
        setMode('dashboard');
        setStep(1);
        setSelectedImages([]);
        setSelectedVideo(null);
    } catch (e: any) {
        alert(e.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- MAP LOGIC ---
  useEffect(() => {
    if (mode === 'register' && step === 3 && mapDiv.current) {
      const graphicsLayer = new GraphicsLayer();
      const map = new Map({ basemap: "satellite", layers: [graphicsLayer] });
      const view = new MapView({ container: mapDiv.current, map, center: [76.2711, 10.8505], zoom: 16 });
      const sketch = new Sketch({ layer: graphicsLayer, view, creationMode: "single", availableCreateTools: ["polygon", "rectangle"], visibleElements: { selectionTools: { "lasso-selection": false }, settingsMenu: false } });
      view.ui.add(sketch, "top-right");
      sketch.on("create", (event) => {
        if (event.state === "complete" && event.graphic?.geometry?.type === "polygon") {
            const poly = event.graphic.geometry as Polygon;
            const area = geometryEngine.planarArea(poly, "acres");
            if (poly.extent?.center) {
                setFormData(p => ({ ...p, area: parseFloat(area.toFixed(2)) }));
                if (typeof poly.extent.center.latitude === 'number' && typeof poly.extent.center.longitude === 'number') {
                  setCoordinates({ lat: poly.extent.center.latitude, lon: poly.extent.center.longitude });
                }
                if (webMercatorUtils.canProject(poly, view.spatialReference)) {
                    const geoPoly = webMercatorUtils.webMercatorToGeographic(poly) as Polygon;
                    if(geoPoly.rings?.length) setPolygonRings(geoPoly.rings[0]);
                }
            }
        }
      });
      return () => { view.destroy(); };
    }
  }, [step, mode]);

  // --- VIEW: NOT CONNECTED ---
  if (!isConnected) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in">
            <div className="bg-anirvan-card border border-white/10 p-12 rounded-2xl shadow-2xl text-center max-w-md w-full">
                <div className="bg-anirvan-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Wallet className="h-10 w-10 text-anirvan-accent" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">Welcome, Landowner</h1>
                <p className="text-anirvan-muted mb-8">Connect your wallet to register land and track earnings.</p>
                <div className="flex justify-center"><ConnectButton /></div>
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-white/30">
                    <LogIn className="h-3 w-3" /> Secure Blockchain Login
                </div>
            </div>
        </div>
    );
  }

  // --- VIEW: CONNECTED ---
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Navigation Tabs */}
      <div className="flex justify-between items-center mb-8">
        <div className="bg-white/5 p-1 rounded-xl flex">
            <button onClick={() => setMode('register')} className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'register' ? 'bg-anirvan-primary text-white shadow-lg' : 'text-anirvan-muted hover:text-white'}`}>
                <PlusCircle className="h-4 w-4"/> Register Land
            </button>
            <button onClick={() => setMode('dashboard')} className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'dashboard' ? 'bg-anirvan-primary text-white shadow-lg' : 'text-anirvan-muted hover:text-white'}`}>
                <LayoutDashboard className="h-4 w-4"/> My Dashboard
            </button>
        </div>
        <div className="hidden md:flex items-center gap-3 bg-anirvan-dark border border-white/10 px-4 py-2 rounded-full">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-mono text-anirvan-muted">{address?.slice(0,6)}...{address?.slice(-4)}</span>
        </div>
      </div>

      {mode === 'register' ? (
        <div className="max-w-4xl mx-auto">
            {/* ... (Keep your Registration UI exactly as it was, skipping for brevity) ... */}
            {/* Note: I am not changing the Register Wizard code, assuming it is same as before. 
                I am focusing on the Dashboard changes below. */}
            
            {/* Simplified Placeholder for Wizard (In real code, keep your Wizard here) */}
             <div className="flex items-center justify-between mb-8 max-w-lg mx-auto">
               {[1,2,3,4].map(i => (
                    <div key={i} className={`h-8 w-8 rounded-full border-2 flex items-center justify-center font-bold ${step >= i ? 'border-anirvan-accent text-anirvan-accent' : 'border-white/10 text-white/10'}`}>{i}</div>
                ))}
            </div>
            
            {/* Step 1 */}
            {step === 1 && (
                <div className="bg-anirvan-card border border-white/10 rounded-xl p-8 shadow-2xl animate-fade-in">
                    <h2 className="text-2xl font-bold text-white mb-6">1. Land Details</h2>
                    <div className="space-y-4">
                        <input type="text" placeholder="Full Name" className="w-full bg-anirvan-dark border border-white/10 rounded-lg p-3 text-white" value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
                        <input type="text" placeholder="Survey Number (e.g. SRV-101)" className="w-full bg-anirvan-dark border border-white/10 rounded-lg p-3 text-white" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
                        <div className="relative">
                             <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full bg-anirvan-dark border border-white/10 rounded-lg p-3 text-white text-left flex justify-between">{formData.species} <span>▼</span></button>
                             {isDropdownOpen && <div className="absolute z-10 w-full mt-2 bg-anirvan-dark border border-white/10 rounded-xl overflow-hidden">{speciesOptions.map(opt => <div key={opt} onClick={() => { setFormData({...formData, species: opt}); setIsDropdownOpen(false); }} className="px-4 py-3 text-white hover:bg-white/10 cursor-pointer">{opt}</div>)}</div>}
                        </div>
                        <button onClick={() => setStep(2)} disabled={!formData.ownerName || !formData.id} className="w-full bg-anirvan-primary text-anirvan-dark py-3 rounded-lg font-bold mt-4 disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
                    </div>
                </div>
            )}
            
            {/* Step 2 */}
            {step === 2 && (
                <div className="bg-anirvan-card border border-white/10 rounded-xl p-8 text-center animate-fade-in">
                    <h2 className="text-2xl font-bold text-white mb-4">2. Upload Deed (PDF)</h2>
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/10 hover:border-anirvan-accent rounded-xl p-10 cursor-pointer">
                        <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={(e) => { if(e.target.files?.[0]) handleFile(e.target.files[0]) }} />
                        <Upload className="h-10 w-10 text-white mx-auto mb-2"/>
                        <p className="text-anirvan-muted">{formData.pdfName || "Click to Upload PDF"}</p>
                    </div>
                    <div className="flex gap-4 mt-6"><button onClick={() => setStep(1)} className="text-white/50">Back</button><button onClick={() => setStep(3)} disabled={!selectedFile} className="flex-1 bg-anirvan-primary text-anirvan-dark py-3 rounded-lg font-bold disabled:opacity-50">Next</button></div>
                </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
                <div className="animate-fade-in">
                     <div className="h-[400px] w-full bg-black rounded-xl overflow-hidden relative border border-white/10"><div ref={mapDiv} className="w-full h-full" /></div>
                     <div className="flex gap-4 mt-4"><button onClick={() => setStep(2)} className="text-white/50">Back</button><button onClick={() => setStep(4)} disabled={!coordinates} className="flex-1 bg-anirvan-primary text-anirvan-dark py-3 rounded-lg font-bold disabled:opacity-50">Next</button></div>
                </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
                <div className="bg-anirvan-card border border-white/10 rounded-xl p-8 animate-fade-in">
                    <h2 className="text-2xl font-bold text-white mb-6">4. Evidence & Submit</h2>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div onClick={() => imageInputRef.current?.click()} className="border border-white/10 p-6 rounded-xl text-center cursor-pointer hover:bg-white/5"><Upload className="mx-auto mb-2 text-white"/><p className="text-sm text-anirvan-muted">Photos ({selectedImages.length})</p><input type="file" ref={imageInputRef} className="hidden" multiple accept="image/*" onChange={e => {if(e.target.files) setSelectedImages([...selectedImages, ...Array.from(e.target.files)])}}/></div>
                        <div onClick={() => videoInputRef.current?.click()} className="border border-white/10 p-6 rounded-xl text-center cursor-pointer hover:bg-white/5"><Upload className="mx-auto mb-2 text-white"/><p className="text-sm text-anirvan-muted">{selectedVideo ? "Video Added" : "Add Video"}</p><input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={e => {if(e.target.files?.[0]) setSelectedVideo(e.target.files[0])}}/></div>
                    </div>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-anirvan-primary text-anirvan-dark py-4 rounded-lg font-bold tracking-widest uppercase hover:scale-[1.01] transition-transform disabled:opacity-50 flex justify-center items-center gap-2">
                        {isSubmitting ? <Loader2 className="animate-spin"/> : <Wallet className="h-5 w-5"/>}
                        {isSubmitting ? 'Submitting...' : 'Sign & Submit'}
                    </button>
                </div>
            )}
        </div>
      ) : (
        // --- DASHBOARD VIEW (UPDATED FOR TOKEN VIEW) ---
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">My Applications</h2>
            {isLoadingDashboard ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 text-anirvan-accent animate-spin"/></div>
            ) : myApplications.length === 0 ? (
                <div className="bg-anirvan-card border border-white/10 rounded-xl p-12 text-center">
                    <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><FileText className="h-8 w-8 text-white/20"/></div>
                    <h3 className="text-white font-bold text-lg">No Applications Found</h3>
                </div>
            ) : (
                <div className="grid gap-4">
                    {myApplications.map((app) => {
                        // --- LIVE MATH LOGIC ---
                        // 1. Calculate time passed since submission
                        const submittedTime = new Date(app.submittedAt!).getTime();
                        const secondsElapsed = Math.floor((currentTime - submittedTime) / 1000);
                        
                        // 2. Calculate Tokens (1 token per 60 seconds)
                        // If status is not approved, we show 0
                        const pendingTokens = app.status === 'APPROVED' ? Math.floor(secondsElapsed / 60) : 0;
                        
                        // 3. Calculate Price (Pending * 20 POL)
                        const currentPrice = pendingTokens * 20;

                        return (
                            <div key={app.id} className="bg-anirvan-card border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors animate-fade-in">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{app.ownerName}</h3>
                                        <div className="flex gap-4 mt-2 text-xs text-anirvan-muted font-mono">
                                            <span>ID: {app.id}</span>
                                            <span>•</span>
                                            <span>{app.area} Acres</span>
                                            <span>•</span>
                                            <span>{new Date(app.submittedAt!).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 border ${
                                        app.status === 'APPROVED' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                    }`}>
                                        {app.status === 'APPROVED' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                        {app.status}
                                    </div>
                                </div>

                                {/* --- NEW: TOKEN & PRICE SECTION (Like Enterprise View) --- */}
                                {app.status === 'APPROVED' && (
                                    <div className="bg-black/30 rounded-lg p-4 border border-white/5 flex flex-col md:flex-row gap-6">
                                        
                                        {/* Accumulated Tokens */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 text-anirvan-muted text-xs mb-1">
                                                <TrendingUp className="h-3 w-3" /> Accumulated Tokens
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl font-bold text-white">{pendingTokens}</span>
                                                <span className="bg-lime-500/10 border border-lime-500/50 text-lime-400 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                                                    <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-lime-400"></span> Live
                                                </span>
                                            </div>
                                        </div>

                                        {/* Current Value */}
                                        <div className="flex-1 border-l border-white/10 pl-6">
                                            <div className="flex items-center gap-2 text-anirvan-muted text-xs mb-1">
                                                <Coins className="h-3 w-3" /> Current Value (POL)
                                            </div>
                                            <div className="text-2xl font-mono font-bold text-anirvan-accent">
                                                {currentPrice} POL
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      )}
    </div>
  );
  
  function handleFile(file: File) {
    if (file.type !== 'application/pdf') return alert("PDF only");
    setSelectedFile(file);
    setFormData(p => ({ ...p, pdfName: file.name }));
  }
};

export default LandownerView;