import React, { useEffect, useRef, useState } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Sketch from '@arcgis/core/widgets/Sketch';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import { Loader2 } from 'lucide-react';

// Import ESRI CSS
import '@arcgis/core/assets/esri/themes/light/main.css';

interface EsriGeofenceProps {
  onAreaCalculated: (areaAcres: number, geometry: any) => void;
  readOnly?: boolean;
  initialGeometry?: any;
}

const EsriGeofence: React.FC<EsriGeofenceProps> = ({ onAreaCalculated, readOnly = false, initialGeometry }) => {
  const mapDiv = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapDiv.current) return;

    // 1. Initialize Map with Satellite Basemap (High Res)
    const map = new Map({
      basemap: "satellite"
    });

    const graphicsLayer = new GraphicsLayer();
    map.add(graphicsLayer);

    // 2. Center on a sample location (Kerala, India as per Doc)
    const view = new MapView({
      container: mapDiv.current,
      map: map,
      center: [76.9366, 8.5241], // Aruvikkara, Kerala (from Doc)
      zoom: 16
    });

    // 3. Add Sketch Widget for Drawing
    view.when(() => {
      setLoading(false);

      if (!readOnly) {
        const sketch = new Sketch({
          layer: graphicsLayer,
          view: view,
          creationMode: "single", // One polygon per parcel
          availableCreateTools: ["polygon", "rectangle"],
          visibleElements: {
            selectionTools: {
              "lasso-selection": false,
              "rectangle-selection": false,
            },
            settingsMenu: false
          }
        });

        view.ui.add(sketch, "top-right");

        // Event: Listen for draw completion
        sketch.on("create", (event) => {
          if (event.state === "complete") {
            const geometry = event.graphic.geometry;
            // Calculate Area using Geometry Engine
            if (geometry && geometry.type === "polygon") {
              const areaSqMeters = geometryEngine.planarArea(geometry, "square-meters");
              const areaAcres = areaSqMeters * 0.000247105;
              
              onAreaCalculated(parseFloat(areaAcres.toFixed(2)), geometry);
            }
          }
        });
      }

      // If viewing existing parcel (Validation Mode)
      if (initialGeometry) {
        // Add polygon to layer logic here (simplified for prototype)
      }
    });

    return () => {
      if (view) {
        view.destroy();
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[400px] bg-black/20 rounded-xl overflow-hidden border border-white/10">
      <div ref={mapDiv} className="w-full h-full absolute inset-0" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
          <Loader2 className="h-8 w-8 text-anirvan-accent animate-spin" />
        </div>
      )}
      <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-1 text-xs rounded border border-white/20">
        Powered by ESRI ArcGIS
      </div>
    </div>
  );
};

export default EsriGeofence;