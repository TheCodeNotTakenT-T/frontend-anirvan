import { useState, useEffect, useRef, DragEvent } from 'react';
import { 
  Upload, FileText, CheckCircle2, Clock, XCircle, 
  Loader2, Wallet, LayoutDashboard, PlusCircle, LogIn, 
  TrendingUp, Coins, Image as ImageIcon, Film 
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
  const [currentTime, setCurrentTime] = useState(Date.now());
  
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
  
  // Drag and Drop States
  const [isDraggingDeed, setIsDraggingDeed] = useState(false);
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);

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

  // --- 1. LOGIN GATE & DATA FETCH ---
  useEffect(() => {
    if (isConnected && address && mode === 'dashboard') {
        fetchMyApplications();
    }
  }, [isConnected, address, mode]);

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
              submittedAt: d.submitted_at, 
              walletAddress: d.wallet_address,
              images: d.images
          } as LandApplication));
          setMyApplications(apps);
      }
      setIsLoadingDashboard(false);
  };

  // --- 2. REGISTRATION SUBMISSION (UPDATED BUCKETS) ---
  const handleSubmit = async () => {
    if (!formData.id || !coordinates || !selectedFile || !address) return;
    setIsSubmitting(true);

    try {
        // 1. UPLOAD PDF (Stays in 'land_documents')
        const docName = `${Date.now()}_doc_${selectedFile.name.replace(/\s/g, '_')}`;
        const { error: docError } = await supabase.storage
            .from('land_documents')
            .upload(docName, selectedFile);
        if (docError) throw docError;

        const { data: { publicUrl: docUrl } } = supabase.storage
            .from('land_documents')
            .getPublicUrl(docName);

        // 2. UPLOAD IMAGES (Goes to 'land_images')
        const imageUrls = [];
        for (const img of selectedImages) {
            const imgName = `${Date.now()}_img_${img.name.replace(/\s/g, '_')}`;
            
            // Upload to new bucket
            const { error: imgError } = await supabase.storage
                .from('land_images') 
                .upload(imgName, img);
            if (imgError) throw imgError;

            // Get URL from new bucket
            const { data: { publicUrl: imgUrl } } = supabase.storage
                .from('land_images')
                .getPublicUrl(imgName);
                
            imageUrls.push(imgUrl);
        }

        // 3. UPLOAD VIDEO (Goes to 'land_videos')
        let videoUrl = '';
        if (selectedVideo) {
            const vidName = `${Date.now()}_vid_${selectedVideo.name.replace(/\s/g, '_')}`;
            
            // Upload to new bucket
            const { error: vidError } = await supabase.storage
                .from('land_videos')
                .upload(vidName, selectedVideo);
            if (vidError) throw vidError;

            // Get URL from new bucket
            videoUrl = supabase.storage
                .from('land_videos')
                .getPublicUrl(vidName).data.publicUrl;
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
        setSelectedFile(null);
        setFormData(p => ({...p, pdfName: ''}));
    } catch (e: any) {
        console.error("Upload Error:", e);
        alert(e.message || "Upload failed");
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- DRAG AND DROP HELPERS ---
  const handleDrag = (e: DragEvent, setState: (v: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setState(true);
    else if (e.type === "dragleave") setState(false);
  };

  const handleDropImages = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhotos(false);
    if (e.dataTransfer.files) {
        const newImages = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        setSelectedImages(prev => [...prev, ...newImages].slice(0, 5));
    }
  };

  const handleDropVideo = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingVideo(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('video/')) setSelectedVideo(file);
    }
  };

  const handleDropDeed = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingDeed(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
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
      
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-8">
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
                        <input type="text" placeholder="Full Name" className="w-full bg-anirvan-dark border border-white/10 rounded-lg p-3 text-white focus:border-anirvan-accent outline-none" value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
                        <input type="text" placeholder="Survey Number (e.g. SRV-101)" className="w-full bg-anirvan-dark border border-white/10 rounded-lg p-3 text-white focus:border-anirvan-accent outline-none" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
                        <div className="relative">
                             <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full bg-anirvan-dark border border-white/10 rounded-lg p-3 text-white text-left flex justify-between">{formData.species} <span>▼</span></button>
                             {isDropdownOpen && (
                                <div className="absolute z-10 w-full mt-2 bg-anirvan-dark border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-fade-in">
                                    {speciesOptions.map(opt => (
                                        <div 
                                            key={opt} 
                                            onClick={() => { setFormData({...formData, species: opt}); setIsDropdownOpen(false); }} 
                                            className="px-4 py-3 text-white hover:bg-anirvan-accent hover:text-anirvan-dark transition-colors cursor-pointer font-bold"
                                        >
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                             )}
                        </div>
                        <button onClick={() => setStep(2)} disabled={!formData.ownerName || !formData.id} className="w-full bg-anirvan-primary text-anirvan-dark py-3 rounded-lg font-bold mt-4 disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
                    </div>
                </div>
            )}
            
            {/* Step 2 */}
            {step === 2 && (
                <div className="bg-anirvan-card border border-white/10 rounded-xl p-8 text-center animate-fade-in">
                    <h2 className="text-2xl font-bold text-white mb-4">2. Upload Deed (PDF)</h2>
                    <div 
                        onClick={() => fileInputRef.current?.click()} 
                        onDragEnter={(e) => handleDrag(e, setIsDraggingDeed)}
                        onDragOver={(e) => handleDrag(e, setIsDraggingDeed)}
                        onDragLeave={(e) => handleDrag(e, setIsDraggingDeed)}
                        onDrop={handleDropDeed}
                        className={`border-2 border-dashed rounded-xl p-12 transition-all cursor-pointer ${
                            isDraggingDeed ? 'border-anirvan-accent bg-anirvan-accent/5 scale-[1.02]' : 'border-white/10 hover:border-anirvan-accent'
                        }`}
                    >
                        <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={(e) => { if(e.target.files?.[0]) handleFile(e.target.files[0]) }} />
                        <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${isDraggingDeed ? 'text-anirvan-accent' : 'text-white'}`}/>
                        <p className="text-anirvan-muted font-medium">{formData.pdfName || "Click or Drag to Upload PDF"}</p>
                    </div>
                    <div className="flex gap-4 mt-8"><button onClick={() => setStep(1)} className="text-white/50 hover:text-white transition-colors px-4">Back</button><button onClick={() => setStep(3)} disabled={!selectedFile} className="flex-1 bg-anirvan-primary text-anirvan-dark py-3 rounded-lg font-bold disabled:opacity-50">Next</button></div>
                </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
                <div className="animate-fade-in">
                     <div className="h-[400px] w-full bg-black rounded-xl overflow-hidden relative border border-white/10"><div ref={mapDiv} className="w-full h-full" /></div>
                     <div className="flex gap-4 mt-4"><button onClick={() => setStep(2)} className="text-white/50 hover:text-white transition-colors px-4">Back</button><button onClick={() => setStep(4)} disabled={!coordinates} className="flex-1 bg-anirvan-primary text-anirvan-dark py-3 rounded-lg font-bold disabled:opacity-50">Next</button></div>
                </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
                <div className="bg-anirvan-card border border-white/10 rounded-xl p-8 animate-fade-in">
                    <h2 className="text-2xl font-bold text-white mb-6">4. Evidence & Submit</h2>
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        {/* Photo Upload Section */}
                        <div 
                            onClick={() => imageInputRef.current?.click()} 
                            onDragEnter={(e) => handleDrag(e, setIsDraggingPhotos)}
                            onDragOver={(e) => handleDrag(e, setIsDraggingPhotos)}
                            onDragLeave={(e) => handleDrag(e, setIsDraggingPhotos)}
                            onDrop={handleDropImages}
                            className={`border-2 border-dashed p-8 rounded-xl text-center cursor-pointer transition-all ${
                                isDraggingPhotos ? 'border-anirvan-accent bg-anirvan-accent/5 scale-[1.02]' : 'border-white/10 hover:bg-white/5'
                            }`}
                        >
                            <ImageIcon className={`mx-auto mb-3 h-8 w-8 transition-colors ${isDraggingPhotos ? 'text-anirvan-accent' : 'text-white'}`}/>
                            <p className="text-sm font-bold text-white mb-1">Photos ({selectedImages.length}/5)</p>
                            <p className="text-[10px] text-anirvan-muted uppercase tracking-wider">Drag or click to add</p>
                            <input type="file" ref={imageInputRef} className="hidden" multiple accept="image/*" onChange={e => {if(e.target.files) setSelectedImages(prev => [...prev, ...Array.from(e.target.files!)].slice(0, 5))}}/>
                        </div>

                        {/* Video Upload Section */}
                        <div 
                            onClick={() => videoInputRef.current?.click()} 
                            onDragEnter={(e) => handleDrag(e, setIsDraggingVideo)}
                            onDragOver={(e) => handleDrag(e, setIsDraggingVideo)}
                            onDragLeave={(e) => handleDrag(e, setIsDraggingVideo)}
                            onDrop={handleDropVideo}
                            className={`border-2 border-dashed p-8 rounded-xl text-center cursor-pointer transition-all ${
                                isDraggingVideo ? 'border-anirvan-accent bg-anirvan-accent/5 scale-[1.02]' : 'border-white/10 hover:bg-white/5'
                            }`}
                        >
                            <Film className={`mx-auto mb-3 h-8 w-8 transition-colors ${isDraggingVideo ? 'text-anirvan-accent' : 'text-white'}`}/>
                            <p className="text-sm font-bold text-white mb-1">{selectedVideo ? "Video Added" : "Add Video (Max 1)"}</p>
                            <p className="text-[10px] text-anirvan-muted uppercase tracking-wider">Drag or click to add</p>
                            <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={e => {if(e.target.files?.[0]) setSelectedVideo(e.target.files[0])}}/>
                        </div>
                    </div>
                    
                    <div className="mb-6 flex items-center justify-center gap-2 text-xs text-anirvan-muted italic">
                        <Clock className="h-3.5 w-3.5" /> Requirement: Minimum 1 photo or video evidence
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setStep(3)} className="text-white/50 hover:text-white transition-colors px-4">Back</button>
                        <button 
                            onClick={handleSubmit} 
                            disabled={isSubmitting || (selectedImages.length === 0 && !selectedVideo)} 
                            className="flex-1 bg-anirvan-primary text-anirvan-dark py-4 rounded-lg font-black tracking-widest uppercase hover:bg-anirvan-accent transition-all active:scale-[0.98] disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg shadow-anirvan-primary/10"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin"/> : <Wallet className="h-5 w-5"/>}
                            {isSubmitting ? 'Submitting...' : 'Sign & Submit'}
                        </button>
                    </div>
                </div>
            )}
        </div>
      ) : (
        // --- DASHBOARD VIEW ---
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
                        const submittedTime = new Date(app.submittedAt!).getTime();
                        const secondsElapsed = Math.floor((currentTime - submittedTime) / 1000);
                        const pendingTokens = app.status === 'APPROVED' ? Math.floor(secondsElapsed / 60) : 0;
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

                                {app.status === 'APPROVED' && (
                                    <div className="bg-black/30 rounded-lg p-4 border border-white/5 flex flex-col md:flex-row gap-6">
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