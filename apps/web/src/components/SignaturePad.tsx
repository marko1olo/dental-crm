import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onSign: (signatureBase64: string) => void;
  onCancel: () => void;
}

export function SignaturePad({ onSign, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Handle resize to keep canvas responsive without losing data (ideally)
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const canvas = canvasRef.current;
        // Save old content
        const ctx = canvas.getContext('2d');
        let imgData: ImageData | null = null;
        if (!isEmpty && ctx) {
            try {
                imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            } catch (e) {}
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#0f172a';
            
            if (imgData) {
                ctx.putImageData(imgData, 0, 0);
            } else {
                // Background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
            }
        }
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isEmpty]);

  // Clean up references and memory on unmount
  useEffect(() => {
    return () => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
           ctx.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    };
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    setIsEmpty(false);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.closePath();
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0]!.clientX - rect.left,
        y: e.touches[0]!.clientY - rect.top
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (isEmpty || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSign(dataUrl);
  };

  return (
    <>
      <div className="modal-header">
        <h2 className="modal-title">Подпись документа</h2>
        <p className="modal-subtitle">Пожалуйста, распишитесь внутри поля ниже</p>
      </div>
      
      <div className="modal-body" style={{ paddingBottom: 0 }}>
        <div 
          ref={containerRef} 
          style={{ width: '100%', height: '320px', border: '2px dashed var(--odontogram-border)', borderRadius: '12px', position: 'relative', overflow: 'hidden', touchAction: 'none' }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
          />
          {isEmpty && (
             <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--odontogram-ink-muted)', fontSize: '18px', fontWeight: 500 }}>
                 Место для подписи
             </div>
          )}
        </div>
      </div>

      <div className="modal-footer" style={{ paddingTop: '24px', justifyContent: 'space-between' }}>
        <button 
          onClick={clear}
          className="modal-btn secondary"
          style={{ flex: 'none' }}
        >
          Очистить
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
           <button 
             onClick={onCancel}
             className="modal-btn secondary"
           >
             Отмена
           </button>
           <button 
             onClick={handleSave}
             disabled={isEmpty}
             className="modal-btn primary"
             style={{ opacity: isEmpty ? 0.5 : 1, cursor: isEmpty ? 'not-allowed' : 'pointer' }}
           >
             Подписать
           </button>
        </div>
      </div>
    </>
  );
}
