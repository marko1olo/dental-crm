import React, { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";

interface PanoramicRendererWindowProps {
  volumeId: string;
  splinePoints: any[]; // points from SplineROITool
  onClose: () => void;
  thickness?: number;
  blendMode?: "mip" | "average";
}

export function PanoramicRendererWindow({ volumeId, splinePoints, onClose, thickness = 0, blendMode = "mip" }: PanoramicRendererWindowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation, we would extract the scalarData, origin, direction, spacing
    // from cornerstone cache: cornerstone.cache.getVolume(volumeId)
    // For now, we simulate the worker call to show the UI integration.
    
    setLoading(true);
    
    // Fake processing delay
    const timer = setTimeout(() => {
      setLoading(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Draw a placeholder gradient representing the panoramic unwrap
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
          gradient.addColorStop(0, "#222");
          gradient.addColorStop(0.5, "#888");
          gradient.addColorStop(1, "#222");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.fillStyle = "#fff";
          ctx.font = "20px sans-serif";
          ctx.fillText("Panoramic Unwrap Rendered (Simulated)", 50, 100);
          ctx.fillText(`Spline Points: ${splinePoints.length}`, 50, 140);
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [volumeId, splinePoints]);

  return (
    <Rnd
      default={{
        x: 100,
        y: 100,
        width: 800,
        height: 300,
      }}
      minWidth={400}
      minHeight={200}
      bounds="window"
      className="bg-neutral-900 border border-neutral-700 shadow-2xl rounded-lg overflow-hidden flex flex-col z-50"
    >
      <div className="bg-neutral-800 p-2 flex justify-between items-center cursor-move handle">
        <h3 className="text-white font-medium text-sm">Panorex (Curved MPR)</h3>
        <button onClick={onClose} className="text-neutral-400 hover:text-white px-2">&times;</button>
      </div>
      <div className="flex-1 relative bg-black flex items-center justify-center p-4">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-400 mt-4 text-sm font-medium animate-pulse">Calculating Trilinear Interpolation...</span>
          </div>
        )}
        {error && <div className="text-red-500">{error}</div>}
        <canvas ref={canvasRef} width={800} height={300} className="w-full h-full object-contain" />
      </div>
    </Rnd>
  );
}
