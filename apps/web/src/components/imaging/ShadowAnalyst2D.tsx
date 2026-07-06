// @ts-nocheck
import { useState, useRef, useEffect, MouseEvent } from "react";
import { HotkeyTooltip } from "../onboarding/HotkeyTooltip";

interface Point { x: number; y: number; }
interface Annotation {
  id: string;
  type: "lesion";
  start: Point;
  end: Point;
  label: string;
}

export function ShadowAnalyst2D({ src }: { src: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [filter, setFilter] = useState<"normal" | "contrast" | "invert" | "edge">("normal");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [startPt, setStartPt] = useState<Point | null>(null);
  const [currentPt, setCurrentPt] = useState<Point | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.crossOrigin = "Anonymous";
    img.onload = () => setImage(img);
  }, [src]);

  useEffect(() => {
    draw();
  }, [image, filter, annotations, startPt, currentPt]);

  const applyFilter = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (filter === "normal") return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;

    if (filter === "invert") {
      for (let i = 0; i < d.length; i += 4) {
        d[i] = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
      }
    } else if (filter === "contrast") {
      const factor = (259 * (128 + 255)) / (255 * (259 - 128)); // High contrast boost
      for (let i = 0; i < d.length; i += 4) {
        d[i] = factor * (d[i] - 128) + 128;
        d[i + 1] = factor * (d[i + 1] - 128) + 128;
        d[i + 2] = factor * (d[i + 2] - 128) + 128;
      }
    } else if (filter === "edge") {
      // Simple Sobel-like or edge detection convolution could be applied here
      // For performance in JS, we'll do a simple difference filter
      const out = new Uint8ClampedArray(d.length);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          const right = (y * width + (x + 1)) * 4;
          const bottom = ((y + 1) * width + x) * 4;
          
          const val = Math.abs(d[idx] - d[right]) + Math.abs(d[idx] - d[bottom]);
          const edge = val > 50 ? 255 : 0;
          out[idx] = out[idx + 1] = out[idx + 2] = edge;
          out[idx + 3] = 255;
        }
      }
      for (let i = 0; i < d.length; i++) {
        d[i] = out[i];
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fixed internal resolution for consistent drawing
    canvas.width = 800;
    canvas.height = 600;

    // Draw Image
    const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    const dx = (canvas.width - w) / 2;
    const dy = (canvas.height - h) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, dx, dy, w, h);

    applyFilter(ctx, canvas.width, canvas.height);

    // Draw annotations
    ctx.strokeStyle = "#ef4444";
    ctx.fillStyle = "#ef4444";
    ctx.lineWidth = 2;

    const drawLine = (p1: Point, p2: Point, text: string) => {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Circle at ends
      ctx.beginPath(); ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2); ctx.fill();

      // Text
      ctx.font = "14px Arial";
      ctx.fillText(text, (p1.x + p2.x) / 2 + 10, (p1.y + p2.y) / 2);
    };

    annotations.forEach(a => drawLine(a.start, a.end, a.label));

    if (drawing && startPt && currentPt) {
      const dist = Math.sqrt(Math.pow(currentPt.x - startPt.x, 2) + Math.pow(currentPt.y - startPt.y, 2));
      const mm = (dist * 0.1).toFixed(1); // Mock calibration: 1px = 0.1mm
      drawLine(startPt, currentPt, `${mm} mm`);
    }
  };

  const getPos = (e: MouseEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  return (
    <div className="shadow-analyst-2d" id="shadow-analyst-view" style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0f172a", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ padding: "12px", background: "#1e293b", display: "flex", gap: "12px", borderBottom: "1px solid #334155" }}>
        <HotkeyTooltip hotkey="1" description="Оригинал">
          <button onClick={() => setFilter("normal")} style={{ background: filter === "normal" ? "#0d9488" : "#334155", color: "white", padding: "6px 12px", border: "none", borderRadius: "6px", cursor: "pointer" }}>Normal</button>
        </HotkeyTooltip>
        
        <HotkeyTooltip hotkey="2" description="Усилить контраст (W/L)">
          <button onClick={() => setFilter("contrast")} style={{ background: filter === "contrast" ? "#0d9488" : "#334155", color: "white", padding: "6px 12px", border: "none", borderRadius: "6px", cursor: "pointer" }}>Contrast</button>
        </HotkeyTooltip>

        <HotkeyTooltip hotkey="3" description="Инверсия для поиска кариеса">
          <button onClick={() => setFilter("invert")} style={{ background: filter === "invert" ? "#0d9488" : "#334155", color: "white", padding: "6px 12px", border: "none", borderRadius: "6px", cursor: "pointer" }}>Invert</button>
        </HotkeyTooltip>

        <HotkeyTooltip hotkey="4" description="Выделение контуров корней">
          <button onClick={() => setFilter("edge")} style={{ background: filter === "edge" ? "#0d9488" : "#334155", color: "white", padding: "6px 12px", border: "none", borderRadius: "6px", cursor: "pointer" }}>Bone Edge</button>
        </HotkeyTooltip>

        <div style={{ flex: 1 }} />
        
        <HotkeyTooltip hotkey="Click + Drag" description="Измерить очаг патологии">
          <button style={{ background: "#475569", color: "#cbd5e1", padding: "6px 12px", border: "none", borderRadius: "6px" }}>Measurement Tool Active</button>
        </HotkeyTooltip>
      </div>

      <div style={{ flex: 1, position: "relative", cursor: "crosshair" }}>
        <canvas 
          ref={canvasRef}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          onMouseDown={(e) => {
            if (e.button === 0) {
              setDrawing(true);
              setStartPt(getPos(e));
              setCurrentPt(getPos(e));
            }
          }}
          onMouseMove={(e) => {
            if (drawing) setCurrentPt(getPos(e));
          }}
          onMouseUp={() => {
            if (drawing && startPt && currentPt) {
              const dist = Math.sqrt(Math.pow(currentPt.x - startPt.x, 2) + Math.pow(currentPt.y - startPt.y, 2));
              if (dist > 5) {
                const mm = (dist * 0.1).toFixed(1);
                setAnnotations([...annotations, { id: Math.random().toString(), type: "lesion", start: startPt, end: currentPt, label: `${mm} mm` }]);
                
                // Dispatch to Odontogram
                const toothStr = window.prompt("Введите номер зуба для переноса в формулу:", "36");
                if (toothStr && !isNaN(parseInt(toothStr))) {
                    window.dispatchEvent(new CustomEvent('clinical-finding-detected', {
                        detail: { toothNumber: parseInt(toothStr), finding: 'Caries' }
                    }));
                }
              }
            }
            setDrawing(false);
          }}
          onContextMenu={(e) => e.preventDefault()}
        />
        {!image && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#94a3b8" }}>Loading 2D X-Ray...</div>}
      </div>
    </div>
  );
}
