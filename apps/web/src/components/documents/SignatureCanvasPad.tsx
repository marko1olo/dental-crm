import { useEffect, useRef, useState } from "react";
import { Pen, Eraser, Check } from "lucide-react";

interface SignatureCanvasPadProps {
  onSign: (svg: string) => void;
  onCancel?: () => void;
  title?: string;
}

export function SignatureCanvasPad({ onSign, onCancel, title = "Подпись пациента" }: SignatureCanvasPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set correct resolution for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Normalize coordinate system to use css pixels
    ctx.scale(dpr, dpr);
    
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "var(--primary, #0f172a)";
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      const touch = e.touches[0];
      return {
        x: (touch?.clientX || 0) - rect.left,
        y: (touch?.clientY || 0) - rect.top
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasStroke(true);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasStroke(false);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke) return;
    
    // Generate simple SVG from canvas dataURL for transport
    const dataUrl = canvas.toDataURL("image/png");
    // In a real app we'd trace paths to SVG, but DataURL embedded in SVG works too
    const svg = `<svg width="${canvas.clientWidth}" height="${canvas.clientHeight}" xmlns="http://www.w3.org/2000/svg">
      <image href="${dataUrl}" width="100%" height="100%" />
    </svg>`;
    
    onSign(svg);
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex justify-between items-center px-2">
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Pen className="w-5 h-5 text-primary" />
          {title}
        </h3>
        <button 
          onClick={clearCanvas}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 text-sm font-medium transition-colors"
        >
          <Eraser className="w-4 h-4" />
          Очистить
        </button>
      </div>
      
      <div className="relative rounded-lg overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        {!hasStroke && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="text-slate-400 dark:text-slate-500 text-lg font-medium select-none">
              Поставьте подпись здесь
            </span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-64 cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
        />
      </div>

      <div className="flex justify-end gap-3 mt-2">
        {onCancel && (
          <button 
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            Отмена
          </button>
        )}
        <button 
          onClick={handleSave}
          disabled={!hasStroke}
          className="px-5 py-2 rounded-lg bg-primary text-white font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Check className="w-4 h-4" />
          Подписать документ
        </button>
      </div>
    </div>
  );
}
