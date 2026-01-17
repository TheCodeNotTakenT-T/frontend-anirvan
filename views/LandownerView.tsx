import { useState, useEffect, useRef, DragEvent } from 'react';
import { PencilRuler, Upload, Search, FileText, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient'; // Import Supabase client

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
    
  // --- STATE DEFINITIONS ---
  const [mode, setMode] = useState<'register' | 'dashboard'>('register');
  const [step, setStep] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const speciesOptions = ["Native Hardwood", "Bamboo", "Fruit Bearing"];
  const [isDragging, setIsDragging] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState<Partial<LandApplication>>({
    ownerName: '',
    species: 'Native Hardwood',
    area: 0,
    id: '', 
    pdfName: ''
  });
  
  // Added State for Supabase Logic
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [coordinates, setCoordinates] = useState<{lat: number, lon: number} | null>(null);
  const [polygonRings, setPolygonRings] = useState<number[][]>([]);
  const [searchId, setSearchId] = useState('');
  const [myApplication, setMyApplication] = useState<LandApplication | null>(null);

  // --- REFS ---
  const mapDiv = useRef<HTMLDivElement>(null);
  const layerRef = useRef<GraphicsLayer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- VALIDATION HELPERS ---
  const isStep1Valid = formData.ownerName && formData.ownerName.trim() !== '' && 
                       formData.id && formData.id.trim() !== '';

  const isStep2Valid = !!selectedFile; // Changed to check for actual file object

  const isStep3Valid = !!coordinates;

  // --- FILE HANDLING (Updated with Validation) ---
  const handleFile = (file: File) => {
    // 1. Validate Type
    if (file.type !== 'application/pdf') {
      alert("Only PDF files are allowed.");
      return;
    }
    // 2. Validate Size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }
    
    setSelectedFile(file);
    setFormData(prev => ({ ...prev, pdfName: file.name }));
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // --- ESRI MAP LOGIC ---
  useEffect(() => {
    if (mode === 'register' && step === 3 && mapDiv.current) {
      const graphicsLayer = new GraphicsLayer();
      layerRef.current = graphicsLayer;
      
      const map = new Map({ 
          basemap: "satellite", 
          layers: [graphicsLayer] 
      });

      const view = new MapView({
        container: mapDiv.current,
        map: map,
        center: [76.2711, 10.8505],
        zoom: 16
      });

      const sketch = new Sketch({
        layer: graphicsLayer,
        view: view,
        creationMode: "single", 
        availableCreateTools: ["polygon", "rectangle"],
        visibleElements: { 
            selectionTools: { "lasso-selection": false }, 
            settingsMenu: false 
        }
      });

      view.ui.add(sketch, "top-right");

      sketch.on("create", (event) => {
        if (event.state === "complete" && event.graphic?.geometry) {
            const geometry = event.graphic.geometry;
            
            if (geometry.type === "polygon") {
                const polygon = geometry as Polygon;
                const area = geometryEngine.planarArea(polygon, "acres");
                
                if (polygon.extent && polygon.extent.center) {
                    const center = polygon.extent.center;
                    
                    setFormData(prev => ({ ...prev, area: parseFloat(area.toFixed(2)) }));
                    setCoordinates({ lat: center.latitude ?? 0, lon: center.longitude ?? 0 });
                    
                    if (webMercatorUtils.canProject(polygon, view.spatialReference)) {
                        const geoPoly = webMercatorUtils.webMercatorToGeographic(polygon) as Polygon;
                        if(geoPoly.rings && geoPoly.rings.length > 0) {
                             setPolygonRings(geoPoly.rings[0]);
                        }
                    }
                }
            }
        }
      });

      return () => { 
          if (view) view.destroy(); 
      };
    }
  }, [step, mode]);

  // --- SUPABASE SUBMISSION LOGIC ---
  const handleSubmit = async () => {
    if (!formData.id || !coordinates || !selectedFile) return;

    setIsSubmitting(true);

    try {
        // 1. Upload PDF to Supabase Storage
        const fileName = `${Date.now()}_${selectedFile.name.replace(/\s/g, '_')}`;
        
        const { error: uploadError } = await supabase.storage
            .from('land_documents')
            .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('land_documents')
            .getPublicUrl(fileName);

        // 3. Insert Record into Table
        const { error: insertError } = await supabase
            .from('land_applications')
            .insert([
                {
                    full_name: formData.ownerName,
                    survey_number: formData.id,
                    tree_species: formData.species,
                    area_acres: formData.area,
                    status: 'PENDING',
                    document_url: publicUrl,
                    coordinates: coordinates,
                    polygon_path: polygonRings
                }
            ]);

        if (insertError) throw insertError;

        alert("Application Successfully Submitted!");
        
        // Reset and Redirect
        setMode('dashboard');
        setSearchId(formData.id!);
        // We temporarily set a local object to show immediate result, 
        // though handleSearch will fetch fresh data.
        setMyApplication({
            id: formData.id!,
            ownerName: formData.ownerName!,
            species: formData.species!,
            area: formData.area!,
            pdfName: selectedFile.name,
            coordinates: coordinates,
            polygonPath: polygonRings,
            status: 'PENDING',
            submittedAt: new Date().toISOString(),
            images: [],
            videoName: ''
        });
        
        // Clear Form
        setStep(1);
        setFormData({ ownerName: '', species: 'Native Hardwood', area: 0, id: '', pdfName: '' });
        setSelectedFile(null);
        setCoordinates(null);

    } catch (error: any) {
        console.error('Submission error:', error);
        alert(`Error: ${error.message || "Submission failed"}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- SUPABASE SEARCH LOGIC ---
  const handleSearch = async () => {
    if (!searchId) return;

    const { data, error } = await supabase
        .from('land_applications')
        .select('*')
        .eq('survey_number', searchId)
        .single();

    if (error || !data) {
        setMyApplication(null);
        alert("Application not found.");
    } else {
        // Map Database columns back to Frontend Type
        const app: LandApplication = {
            id: data.survey_number,
            ownerName: data.full_name,
            species: data.tree_species,
            area: data.area_acres,
            pdfName: 'Document.pdf', // Or extract from data.document_url
            coordinates: data.coordinates,
            polygonPath: data.polygon_path,
            status: data.status,
            submittedAt: data.submitted_at,
            images: [],
            videoName: ''
        };
        setMyApplication(app);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-center mb-8">
        <div className="bg-white/5 p-1 rounded-xl flex">
            <button onClick={() => setMode('register')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'register' ? 'bg-anirvan-primary text-white' : 'text-anirvan-muted'}`}>Register Land</button>
            <button onClick={() => setMode('dashboard')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'dashboard' ? 'bg-anirvan-primary text-white' : 'text-anirvan-muted'}`}>My Dashboard</button>
        </div>
      </div>

      {mode === 'register' ? (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8 max-w-lg mx-auto">
                {[1,2,3].map(i => (
                    <div key={i} className={`h-8 w-8 rounded-full border-2 flex items-center justify-center font-bold ${step >= i ? 'border-anirvan-accent text-anirvan-accent' : 'border-white/10 text-white/10'}`}>{i}</div>
                ))}
            </div>

            {step === 1 && (
                <div className="bg-anirvan-card border border-white/10 rounded-xl p-8 animate-fade-in shadow-2xl">
                    <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">1. Land Details</h2>
                    <div className="space-y-5">
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-anirvan-muted mb-2 block">Full Name</label>
                            <input 
                                type="text" 
                                className="w-full bg-anirvan-dark border border-white/10 rounded-lg p-3 text-white focus:border-anirvan-accent outline-none" 
                                onChange={e => setFormData({...formData, ownerName: e.target.value})} 
                                value={formData.ownerName}
                                placeholder="As per government ID" 
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-anirvan-muted mb-2 block">Survey Number (ID)</label>
                            <input 
                                type="text" 
                                className="w-full bg-anirvan-dark border border-white/10 rounded-lg p-3 text-white focus:border-anirvan-accent outline-none" 
                                onChange={e => setFormData({...formData, id: e.target.value})} 
                                value={formData.id}
                                placeholder="e.g. SRV-KL-992" 
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-anirvan-muted mb-2 block">Tree Species</label>
                            <div className="relative">
                                <button 
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full bg-anirvan-dark border border-white/10 rounded-lg p-3 text-white text-left focus:border-anirvan-accent outline-none flex justify-between items-center transition-all hover:border-white/20"
                                >
                                    {formData.species}
                                    <span className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''} text-anirvan-muted`}>▼</span>
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-2 bg-anirvan-dark border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-fade-in">
                                        {speciesOptions.map((opt) => (
                                            <div
                                                key={opt}
                                                onClick={() => {
                                                    setFormData({...formData, species: opt});
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="px-4 py-3 text-white cursor-pointer transition-colors hover:bg-anirvan-accent hover:text-anirvan-dark font-bold text-sm"
                                            >
                                                {opt}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setStep(2)} 
                            disabled={!isStep1Valid}
                            className={`w-full py-3 rounded-lg font-bold mt-4 transition-all duration-200
                                ${isStep1Valid 
                                    ? 'bg-anirvan-primary text-anirvan-dark hover:bg-anirvan-accent cursor-pointer' 
                                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                                }`}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="bg-anirvan-card border border-white/10 rounded-xl p-6 animate-fade-in text-center max-w-2xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">2. Verification Documents</h2>
                    <p className="text-anirvan-muted text-sm mb-6">Upload your land deed or tax receipts</p>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                        className={`group border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center ${isDragging ? 'border-anirvan-accent bg-anirvan-accent/5' : 'border-white/10 hover:border-anirvan-accent/50 hover:bg-white/5'}`}
                    >
                        <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                        <div className={`p-4 rounded-full mb-4 ${isDragging ? 'bg-anirvan-accent text-anirvan-dark' : 'bg-white/5 text-anirvan-muted group-hover:text-anirvan-accent'}`}><Upload className="h-8 w-8" /></div>
                        <p className="text-white font-bold text-lg">Click or Drag PDF here</p>
                        <p className="text-xs text-anirvan-muted mt-2">Ownership Deed (Max 5MB)</p>
                    </div>
                    {formData.pdfName && <div className="mt-4 bg-anirvan-primary/10 text-anirvan-accent py-2 px-4 rounded-lg inline-flex items-center gap-2 border border-anirvan-primary/20"><FileText className="h-4 w-4" /> <span className="text-sm font-mono font-bold">{formData.pdfName}</span></div>}
                    <div className="flex gap-4 mt-8">
                        <button onClick={() => setStep(1)} className="px-6 py-3 text-anirvan-muted">Back</button>
                        
                        <button 
                            onClick={() => setStep(3)} 
                            disabled={!isStep2Valid} 
                            className={`flex-1 py-3 rounded-lg font-bold transition-all
                                ${isStep2Valid 
                                    ? 'bg-anirvan-primary text-anirvan-dark hover:bg-anirvan-accent cursor-pointer' 
                                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                                }`}
                        >
                            Next Step
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="animate-fade-in space-y-4">
                    <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg flex gap-3">
                        <PencilRuler className="h-6 w-6 text-blue-400" />
                        <div><h3 className="font-bold text-blue-200">Draw Your Land Boundary</h3><p className="text-sm text-blue-200/70">Use the Polygon tool in the top right.</p></div>
                    </div>
                    <div className="h-[500px] w-full bg-black rounded-xl border border-white/10 overflow-hidden relative">
                        <div ref={mapDiv} className="w-full h-full" />
                        <div className="absolute bottom-4 left-4 bg-black/80 p-3 rounded text-white border border-white/10">{formData.area ? `${formData.area} Acres` : 'Draw to calculate area'}</div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setStep(2)} className="px-6 py-3 text-anirvan-muted">Back</button>
                        
                        <button 
                            onClick={handleSubmit} 
                            disabled={!isStep3Valid || isSubmitting} 
                            className={`flex-1 font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2
                                ${isStep3Valid
                                    ? 'bg-anirvan-primary text-anirvan-dark hover:bg-anirvan-accent cursor-pointer'
                                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                                }`}
                        >
                            {isSubmitting && <Loader2 className="animate-spin h-5 w-5" />}
                            {isSubmitting ? 'Uploading...' : 'Submit for Verification'}
                        </button>
                    </div>
                </div>
            )}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
            <div className="bg-anirvan-card border border-white/10 rounded-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Check Application Status</h2>
                <div className="flex gap-2 mb-8">
                    <input type="text" value={searchId} onChange={(e) => setSearchId(e.target.value)} placeholder="Survey Number (e.g. SRV-KL-992)" className="flex-1 bg-anirvan-dark border border-white/10 rounded-lg p-3 text-white outline-none focus:border-anirvan-accent" />
                    <button onClick={handleSearch} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-colors"><Search className="h-6 w-6" /></button>
                </div>
                {myApplication && (
                    <div className="border-t border-white/10 pt-6 animate-fade-in">
                        <div className="flex justify-between items-start mb-4">
                            <div><h3 className="text-xl font-bold text-white">{myApplication.ownerName}</h3><p className="text-sm text-anirvan-muted">Survey: {myApplication.id}</p></div>
                            <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${myApplication.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : myApplication.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {myApplication.status === 'APPROVED' && <CheckCircle2 className="h-4 w-4" />}
                                {myApplication.status === 'PENDING' && <Clock className="h-4 w-4" />}
                                {myApplication.status === 'REJECTED' && <XCircle className="h-4 w-4" />}
                                {myApplication.status}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default LandownerView;