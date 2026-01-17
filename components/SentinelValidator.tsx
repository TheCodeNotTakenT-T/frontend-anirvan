import { useState, useEffect, useRef } from 'react';
import { Loader, ChevronLeft, ChevronRight, Key, Info, AlertTriangle, Calendar } from 'lucide-react';

interface SentinelProps {
  initialLat: number;
  initialLon: number;
  polygonPath?: number[][];
  onValidationComplete?: () => void;
}

interface SatellitePass {
  date: string;
  cloudCover: number;
  id: string;
}

export default function SentinelValidator({ initialLat, initialLon, polygonPath }: SentinelProps) {
  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Image Source URLs
  const [imageUrl, setImageUrl] = useState(''); // NASA True Color
  const [ndviImageUrl, setNdviImageUrl] = useState(''); // Sentinel Hub NDVI
  const [esriImageUrl, setEsriImageUrl] = useState(''); // ESRI Basemap
  
  const [error, setError] = useState('');
  
  // History
  const [history, setHistory] = useState<SatellitePass[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Auth
  const [sentinelToken, setSentinelToken] = useState('');
  
  // Metrics
  const [greenCoverage, setGreenCoverage] = useState<number | null>(null);
  const [ndviStats, setNdviStats] = useState<{
    mean: number;
    healthy: number;
    moderate: number;
    sparse: number;
    barren: number;
  } | null>(null);
  
  // Map Geometry
  const [activeBBox, setActiveBBox] = useState<{minLon:number, maxLon:number, minLat:number, maxLat:number} | null>(null);
  
  // Canvas Refs
  const trueColorOverlayRef = useRef<HTMLCanvasElement>(null);
  const ndviOverlayRef = useRef<HTMLCanvasElement>(null);
  const esriOverlayRef = useRef<HTMLCanvasElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null);

  // Dimensions
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 300;
  const LAYER_ID = 'HLS_S30_Nadir_BRDF_Adjusted_Reflectance';

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    initializeView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLat, initialLon, polygonPath]);

  // --- FIX: REACTIVE DRAWING ---
  
  // 1. True Color Overlay
  useEffect(() => {
    if (imageUrl && trueColorOverlayRef.current && activeBBox) {
        drawPolygonOverlay(trueColorOverlayRef, activeBBox);
    }
  }, [imageUrl, activeBBox]);

  // 2. NDVI Overlay 
  // FIX: Added 'analyzing' to dependencies. When analyzing is true, the canvas is unmounted. 
  // We need to redraw when it re-mounts (analyzing becomes false).
  useEffect(() => {
    if (ndviImageUrl && ndviOverlayRef.current && activeBBox && !analyzing) {
        drawPolygonOverlay(ndviOverlayRef, activeBBox);
    }
  }, [ndviImageUrl, activeBBox, analyzing]);

  // 3. ESRI Overlay
  useEffect(() => {
    if (esriImageUrl && esriOverlayRef.current && activeBBox) {
        drawPolygonOverlay(esriOverlayRef, activeBBox);
    }
  }, [esriImageUrl, activeBBox]);


  const initializeView = () => {
    setGreenCoverage(null);
    setNdviStats(null);
    setNdviImageUrl('');
    setEsriImageUrl('');
    setError('');
    
    // Calculate BBox with specific Aspect Ratio
    let bbox;
    
    // Default center
    let centerLon = initialLon;
    let centerLat = initialLat;
    let lonSpan = 0.01;
    let latSpan = 0.01;

    if (polygonPath && polygonPath.length > 0) {
        let minLon = polygonPath[0][0], maxLon = polygonPath[0][0];
        let minLat = polygonPath[0][1], maxLat = polygonPath[0][1];

        polygonPath.forEach(([lon, lat]) => {
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        });

        centerLon = (minLon + maxLon) / 2;
        centerLat = (minLat + maxLat) / 2;
        lonSpan = maxLon - minLon;
        latSpan = maxLat - minLat;
        
        // Add a base buffer so edges aren't touching
        lonSpan = Math.max(lonSpan * 1.2, 0.005);
        latSpan = Math.max(latSpan * 1.2, 0.005);
    }

    // --- RATIO FIX ---
    // Force the BBox to match the Canvas Aspect Ratio (400/300)
    // This prevents the image from looking "stretched" or distorted.
    const targetRatio = CANVAS_WIDTH / CANVAS_HEIGHT; // 1.333
    const currentRatio = lonSpan / latSpan;

    if (currentRatio < targetRatio) {
        // Box is too tall, widen the longitude
        lonSpan = latSpan * targetRatio;
    } else {
        // Box is too wide, heighten the latitude
        latSpan = lonSpan / targetRatio;
    }

    bbox = { 
        minLon: centerLon - lonSpan / 2, 
        maxLon: centerLon + lonSpan / 2, 
        minLat: centerLat - latSpan / 2, 
        maxLat: centerLat + latSpan / 2 
    };

    setActiveBBox(bbox);
    searchArchives(bbox);
    loadEsriBasemap(bbox);
  };

  // --- 2. DATA FETCHING ---
  const searchArchives = async (bbox: {minLon:number, maxLon:number, minLat:number, maxLat:number}) => {
    setLoading(true);
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90); 
        
        const centerLon = (bbox.minLon + bbox.maxLon) / 2;
        const centerLat = (bbox.minLat + bbox.maxLat) / 2;
        // Search slightly wider for metadata to ensure we catch granules
        const searchBox = `${centerLon-0.05},${centerLat-0.05},${centerLon+0.05},${centerLat+0.05}`;

        const params = new URLSearchParams({
            short_name: 'HLSS30', 
            bounding_box: searchBox,
            temporal: `${startDate.toISOString()},${endDate.toISOString()}`,
            page_size: '15', 
            sort_key: '-start_date', 
        });

        const metaRes = await fetch(`https://cmr.earthdata.nasa.gov/search/granules.json?${params.toString()}`);
        const metaData = await metaRes.json();
        
        if (!metaData.feed?.entry) throw new Error("No imagery found.");

        const passes = metaData.feed.entry.map((e: any) => ({
            date: e.time_start.split('T')[0],
            cloudCover: e.cloud_cover ? Math.round(parseFloat(e.cloud_cover)) : 100,
            id: e.id
        }));

        setHistory(passes);
        if(passes.length > 0) {
            setCurrentIndex(0);
            loadSpecificPass(passes[0], bbox);
        } else {
            setLoading(false);
            setError("No cloud-free imagery found.");
        }

    } catch (err) {
        setLoading(false);
        setError("Network Error: Could not fetch NASA history.");
    }
  };

  const loadSpecificPass = (pass: SatellitePass, bbox: {minLon:number, maxLon:number, minLat:number, maxLat:number}) => {
    setLoading(true);
    setNdviImageUrl(''); 
    setGreenCoverage(null);
    setNdviStats(null);
    
    // Fetch True Color
    const bboxString = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
    const wmsParams = new URLSearchParams({
        service: 'WMS', request: 'GetMap', layers: LAYER_ID, styles: '', format: 'image/jpeg',
        transparent: 'false', version: '1.1.1', width: CANVAS_WIDTH.toString(), height: CANVAS_HEIGHT.toString(),
        srs: 'EPSG:4326', bbox: bboxString, time: pass.date 
    });

    const finalUrl = `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${wmsParams.toString()}`;
    
    const img = new Image();
    img.crossOrigin = "Anonymous"; 
    img.onload = () => { 
        setImageUrl(finalUrl); 
        setLoading(false);
        
        if (sentinelToken) runVegetationMath(bbox, pass.date);
    };
    img.onerror = () => { setLoading(false); setError("Image unavailable."); };
    img.src = finalUrl;
  };

  const loadEsriBasemap = (bbox: {minLon:number, maxLon:number, minLat:number, maxLat:number}) => {
    const bboxString = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
    const esriParams = new URLSearchParams({
      bbox: bboxString, bboxSR: '4326', size: `${CANVAS_WIDTH},${CANVAS_HEIGHT}`,
      imageSR: '4326', format: 'png', transparent: 'false', f: 'image'
    });
    const url = `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?${esriParams.toString()}`;
    setEsriImageUrl(url);
  };

  const drawPolygonOverlay = (ref: React.RefObject<HTMLCanvasElement>, bbox: {minLon:number, maxLon:number, minLat:number, maxLat:number}) => {
    if (!ref.current || !polygonPath) return;
    const ctx = ref.current.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const regionPath = new Path2D();
    const lonSpan = bbox.maxLon - bbox.minLon;
    const latSpan = bbox.maxLat - bbox.minLat;

    polygonPath.forEach(([lon, lat], i) => {
      // Logic maps geo coordinates to pixels based on the Aspect-Ratio-Corrected BBox
      const x = ((lon - bbox.minLon) / lonSpan) * CANVAS_WIDTH;
      const y = ((bbox.maxLat - lat) / latSpan) * CANVAS_HEIGHT;
      if (i === 0) regionPath.moveTo(x, y);
      else regionPath.lineTo(x, y);
    });
    regionPath.closePath();
    
    // THE RED BORDER
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3;
    ctx.stroke(regionPath);
  };

  // --- 3. NDVI LOGIC ---
  const runVegetationMath = async (bbox: {minLon:number, maxLon:number, minLat:number, maxLat:number}, date: string) => {
    if (!sentinelToken) return;
    setAnalyzing(true);
    
    try {
      const evalscript = `
        //VERSION=3
        function setup() { return { input: ["B04", "B08", "dataMask"], output: { bands: 4 } }; }
        function evaluatePixel(sample) {
          let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
          if (ndvi < 0.2) return [0.6, 0.6, 0.6, sample.dataMask]; 
          else if (ndvi < 0.4) return [0.9, 0.9, 0.4, sample.dataMask]; 
          else if (ndvi < 0.6) return [0.5, 0.8, 0.2, sample.dataMask]; 
          else return [0.1, 0.6, 0.1, sample.dataMask]; 
        }
      `;

      const response = await fetch("https://services.sentinel-hub.com/api/v1/process", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sentinelToken}` },
        body: JSON.stringify({
          input: {
            bounds: { bbox: [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat], properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" } },
            data: [{ type: "sentinel-2-l2a", dataFilter: { timeRange: { from: `${date}T00:00:00Z`, to: `${date}T23:59:59Z` }, mosaickingOrder: "leastCC" } }]
          },
          output: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, responses: [{ identifier: "default", format: { type: "image/png" } }] },
          evalscript: evalscript
        })
      });

      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || "Invalid Token");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setNdviImageUrl(url);
      
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => { 
          calculateStats(img, bbox); 
      };
      img.src = url;

    } catch (err) {
      setAnalyzing(false);
      setError(err instanceof Error ? err.message : "NDVI Calc Failed");
    }
  };

  const calculateStats = (img: HTMLImageElement, bbox: {minLon:number, maxLon:number, minLat:number, maxLat:number}) => {
      // 1. Draw image to hidden canvas for pixel data
      if(!analysisCanvasRef.current || !polygonPath) return;
      const ctx = analysisCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if(!ctx) return;
      
      ctx.clearRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // 2. Create Polygon Mask
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = CANVAS_WIDTH;
      maskCanvas.height = CANVAS_HEIGHT;
      const maskCtx = maskCanvas.getContext('2d');
      if(!maskCtx) return;

      const regionPath = new Path2D();
      const lonSpan = bbox.maxLon - bbox.minLon;
      const latSpan = bbox.maxLat - bbox.minLat;

      polygonPath.forEach(([lon, lat], i) => {
        const x = ((lon - bbox.minLon) / lonSpan) * CANVAS_WIDTH;
        const y = ((bbox.maxLat - lat) / latSpan) * CANVAS_HEIGHT;
        if (i === 0) regionPath.moveTo(x, y);
        else regionPath.lineTo(x, y);
      });
      regionPath.closePath();
      maskCtx.fillStyle = '#FFFFFF';
      maskCtx.fill(regionPath);

      // 3. Pixel Math
      const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
      const maskData = maskCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;

      let totalPixels = 0, ndviSum = 0;
      let healthyCount = 0, moderateCount = 0, sparseCount = 0, barrenCount = 0;

      for (let i = 0; i < imgData.length; i += 4) {
          if (maskData[i + 3] === 0) continue; // Skip pixels outside polygon
          
          totalPixels++;
          const r = imgData[i] / 255;
          const g = imgData[i + 1] / 255;
          const b = imgData[i + 2] / 255;

          // Estimate NDVI from RGB (Simulated for visual output mapping)
          let pixelVal = 0;
          if (r > 0.5 && g > 0.5 && b < 0.5) { pixelVal = 0.3; sparseCount++; } 
          else if (g > 0.7 && r < 0.6 && b < 0.4) { pixelVal = 0.5; moderateCount++; }
          else if (g > 0.5 && r < 0.3 && b < 0.3) { pixelVal = 0.7; healthyCount++; }
          else { pixelVal = 0.1; barrenCount++; }
          
          ndviSum += pixelVal;
      }

      if(totalPixels > 0) {
          const mean = ndviSum / totalPixels;
          setNdviStats({
              mean: parseFloat(mean.toFixed(2)),
              healthy: Math.round((healthyCount / totalPixels) * 100),
              moderate: Math.round((moderateCount / totalPixels) * 100),
              sparse: Math.round((sparseCount / totalPixels) * 100),
              barren: Math.round((barrenCount / totalPixels) * 100)
          });
          setGreenCoverage(Math.round(((healthyCount + moderateCount) / totalPixels) * 100));
      }
      setAnalyzing(false);
  };

  const handleNavigate = (dir: 'prev' | 'next') => {
      if(!activeBBox) return;
      let next = dir === 'prev' ? currentIndex + 1 : currentIndex - 1;
      if(next >= 0 && next < history.length) {
          setCurrentIndex(next);
          loadSpecificPass(history[next], activeBBox);
      }
  };

  const currentPass = history[currentIndex] || { date: '---', cloudCover: 0 };

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full bg-anirvan-dark/50 p-4 relative">
      <canvas ref={analysisCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="hidden" />

      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 text-red-100 px-4 py-2 rounded-lg border border-red-500/50 flex items-center gap-2 text-xs shadow-xl backdrop-blur">
            <AlertTriangle className="h-4 w-4" /> {error}
            <button onClick={() => setError('')} className="ml-2 hover:text-white">✕</button>
        </div>
      )}

      {/* TOP ROW: IMAGES */}
      <div className="grid grid-cols-3 gap-4 h-[320px] mb-4">
        
        {/* 1. True Color */}
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black group shadow-lg">
            <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">True Color (RGB)</div>
            {imageUrl ? (
                <>
                    <img src={imageUrl} className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                    <canvas ref={trueColorOverlayRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="absolute inset-0 w-full h-full opacity-80" />
                </>
            ) : <div className="h-full flex items-center justify-center text-xs text-white/30"><Loader className="animate-spin" /></div>}
        </div>

        {/* 2. NDVI */}
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black group shadow-lg">
            <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-emerald-400 border border-emerald-500/30">NDVI Heatmap</div>
            {!sentinelToken ? (
                 <div className="h-full flex flex-col items-center justify-center text-xs text-white/30 p-4 text-center">
                    <Key className="h-6 w-6 mb-2 opacity-50" />
                    <span className="opacity-70">Requires Sentinel Hub Token</span>
                 </div>
            ) : analyzing ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-emerald-400">
                    <Loader className="animate-spin mb-2 h-6 w-6" /> 
                    Calculating Index...
                </div>
            ) : ndviImageUrl ? (
                <>
                    <img src={ndviImageUrl} className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                    {/* The canvas below receives the drawPolygonOverlay call via useEffect */}
                    <canvas ref={ndviOverlayRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="absolute inset-0 w-full h-full opacity-80" />
                    
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur rounded p-1.5 border border-white/10 text-[9px] space-y-0.5">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#1a991a]"></div><span className="text-white/80">Healthy</span></div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#80cc33]"></div><span className="text-white/80">Moderate</span></div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#e6e666]"></div><span className="text-white/80">Sparse</span></div>
                    </div>
                </>
            ) : <div className="h-full flex items-center justify-center text-xs text-white/30">No Data</div>}
        </div>

        {/* 3. ESRI */}
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black group shadow-lg">
            <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-blue-400 border border-blue-500/30">High-Res Basemap</div>
            {esriImageUrl && (
                <>
                    <img src={esriImageUrl} className="w-full h-full object-cover" />
                    <canvas ref={esriOverlayRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="absolute inset-0 w-full h-full opacity-80" />
                </>
            )}
        </div>
      </div>

      {/* BOTTOM ROW: CONTROLS & DATA */}
      <div className="flex-1 bg-black/30 border border-white/5 rounded-xl p-4 grid grid-cols-4 gap-6">
          
          {/* Col 1: Token Input */}
          <div className="col-span-1 space-y-2 border-r border-white/5 pr-6 flex flex-col justify-center">
              <label className="text-[10px] uppercase text-anirvan-muted font-bold flex items-center gap-1">
                  <Key className="h-3 w-3" /> API Credentials
              </label>
              <input 
                  type="password" 
                  value={sentinelToken}
                  onChange={e => setSentinelToken(e.target.value)}
                  placeholder="Sentinel Hub Token..."
                  className="w-full bg-black/50 border border-white/10 rounded px-2 py-2 text-xs text-white focus:border-anirvan-accent outline-none"
              />
              <button 
                onClick={() => activeBBox && runVegetationMath(activeBBox, currentPass.date)}
                disabled={analyzing || !sentinelToken}
                className="w-full bg-white/5 hover:bg-white/10 text-anirvan-accent text-[10px] py-1.5 rounded border border-white/5 uppercase font-bold disabled:opacity-50"
              >
                {analyzing ? 'Processing...' : 'Run Analysis'}
              </button>
          </div>

          {/* Col 2: Timeline */}
          <div className="col-span-1 space-y-2 border-r border-white/5 pr-6 flex flex-col justify-center">
               <div className="flex justify-between items-center text-[10px] text-anirvan-muted uppercase font-bold mb-1">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Pass Date</span>
                  <span className={currentPass.cloudCover > 20 ? 'text-red-400' : 'text-green-400'}>{currentPass.cloudCover}% Cloud</span>
               </div>
               <div className="flex items-center gap-2 bg-black/50 p-1.5 rounded border border-white/5">
                   <button onClick={() => handleNavigate('prev')} disabled={loading} className="p-1 hover:text-white text-anirvan-muted disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                   <span className="flex-1 text-center font-mono text-sm font-bold text-white tracking-wide">{currentPass.date}</span>
                   <button onClick={() => handleNavigate('next')} disabled={loading} className="p-1 hover:text-white text-anirvan-muted disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
               </div>
               <div className="text-[9px] text-center text-anirvan-muted/60">NASA HLSS30 Satellite Data</div>
          </div>

          {/* Col 3 & 4: Stats */}
          <div className="col-span-2 flex justify-between items-center pl-2">
              {ndviStats ? (
                  <>
                    <div className="text-center">
                        <div className={`text-4xl font-bold font-mono ${greenCoverage && greenCoverage > 40 ? 'text-emerald-400' : 'text-yellow-400'}`}>{greenCoverage}%</div>
                        <div className="text-[10px] text-anirvan-muted uppercase tracking-wide mt-1">Vegetation Coverage</div>
                    </div>
                    <div className="h-10 w-px bg-white/10"></div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-white font-mono">{ndviStats.mean}</div>
                        <div className="text-[10px] text-anirvan-muted uppercase tracking-wide mt-1">Mean Index</div>
                    </div>
                    <div className="h-10 w-px bg-white/10"></div>
                    <div className="space-y-1.5 text-[10px] min-w-[100px]">
                        <div className="flex justify-between items-center text-white"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Healthy</span> <span className="font-mono">{ndviStats.healthy}%</span></div>
                        <div className="flex justify-between items-center text-anirvan-muted"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Moderate</span> <span className="font-mono">{ndviStats.moderate}%</span></div>
                        <div className="flex justify-between items-center text-anirvan-muted"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500/50"></span> Sparse</span> <span className="font-mono">{ndviStats.sparse + ndviStats.barren}%</span></div>
                    </div>
                  </>
              ) : (
                  <div className="w-full h-full border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center text-anirvan-muted opacity-50 gap-2">
                      <Info className="h-5 w-5" /> 
                      <span className="text-xs">Run analysis to view vegetation metrics</span>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}