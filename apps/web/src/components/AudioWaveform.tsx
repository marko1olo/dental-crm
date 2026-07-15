import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isRecording: boolean;
  color?: string;
}

export function AudioWaveform({ isRecording, color = "var(--red-500)" }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isRecording) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      const barWidth = 4;
      const barSpacing = 3;
      const barCount = Math.floor(width / (barWidth + barSpacing));
      
      ctx.fillStyle = color;
      
      for (let i = 0; i < barCount; i++) {
        // Random height for fake waveform
        const targetHeight = Number(crypto.getRandomValues(new Uint32Array(1))[0]) / 4294967295 * height * 0.8;
        const x = i * (barWidth + barSpacing);
        const y = (height - targetHeight) / 2;
        
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, targetHeight, 2);
        ctx.fill();
      }
      
      // Slower update for fake waveform to avoid seizure
      setTimeout(() => {
        if (isRecording) {
            animationFrameId = requestAnimationFrame(draw);
        }
      }, 100);
    };
    
    draw();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      const width = canvas?.width || 0;
      const height = canvas?.height || 0;
      ctx?.clearRect(0, 0, width, height);
    };
  }, [isRecording, color]);
  
  if (!isRecording) return null;
  
  return (
    <canvas 
      ref={canvasRef} 
      width={120} 
      height={40} 
      style={{
        display: 'block',
        margin: '0 auto',
        opacity: 0.8,
        flexShrink: 0,
        maxWidth: "100%",
        height: "auto"
      }}
    />
  );
}
