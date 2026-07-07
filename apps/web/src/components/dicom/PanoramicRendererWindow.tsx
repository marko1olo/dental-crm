// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as cornerstone from '@cornerstonejs/core';
import { X, Activity, Droplet, Ruler, Target, Layers } from 'lucide-react';
import { generateCatmullRomSpline, calculateCurveFrames, Point3D } from "../../utils/math/mprMath";
import { ClinicalStore, checkImplantCollision } from '../../utils/dicom/clinicalImplants';
import { createPanorexWorker } from '../../utils/dicom/panorexWorker';

interface Props {
  volumeId: string;
  splinePoints: Point3D[];
  onClose: () => void;
  thickness?: number;
  blendMode?: 'mip' | 'average';
}

export function PanoramicRendererWindow({ volumeId, splinePoints, onClose, thickness = 0, blendMode = 'mip' }: Props) {
  const panorexCanvasRef = useRef<HTMLCanvasElement>(null);
  const crossCanvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pointsCount, setPointsCount] = useState(0);
  const [csIndex, setCsIndex] = useState(0); 
  const [isMinimized, setIsMinimized] = useState(false);
  const [framesData, setFramesData] = useState<any[]>([]);

  useEffect(() => {
    workerRef.current = createPanorexWorker();
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const [, setStoreUpdate] = useState(0);
  useEffect(() => {
    return ClinicalStore.subscribe(() => setStoreUpdate(v => v + 1));
  }, []);
  
  useEffect(() => {
    if (!volumeId || !splinePoints || splinePoints.length < 2) {
      setError("Need at least 2 points for a spline.");
      setLoading(false);
      return;
    }

    try {
      const volume = cornerstone.cache.getVolume(volumeId);
      if (!volume) throw new Error("Volume not found in cache");

      const { dimensions, spacing, origin, direction } = volume;
      const scalarData = (volume as any).scalarData || ((volume as any).getScalarData ? (volume as any).getScalarData() : null);
      
      if (!scalarData) {
         setError("No scalar data available for Web Worker.");
         setLoading(false);
         return;
      }

      const res = 0.5; // mm per pixel
      const panHeight = 120; // mm
      const csWidth = 50; // mm
      const csHeight = 120; // mm

      // 1. Math: Generate smooth curve and frames
      const smoothCurve = generateCatmullRomSpline(splinePoints, 400);
      const frames = calculateCurveFrames(smoothCurve);

      // Resample strictly by distance to avoid distortion
      const resampledFrames: typeof frames = [];
      resampledFrames.push(frames[0]);
      let currentPt = frames[0].point;
      let nextIdx = 1;
      
      while (nextIdx < frames.length) {
        const targetFrame = frames[nextIdx];
        const dx = (targetFrame as any).point.x - currentPt.x;
        const dy = (targetFrame as any).point.y - currentPt.y;
        const dz = (targetFrame as any).point.z - currentPt.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (dist < res) {
          currentPt = (targetFrame as any).point;
          nextIdx++;
          continue;
        }
        const ratio = res / dist;
        const newPt = {
          x: currentPt.x + dx * ratio,
          y: currentPt.y + dy * ratio,
          z: currentPt.z + dz * ratio
        };
        resampledFrames.push({
          point: newPt,
          tangent: (targetFrame as any).tangent,
          normal: (targetFrame as any).normal,
          up: (targetFrame as any).up
        });
        currentPt = newPt;
      }

      setPointsCount(resampledFrames.length);
      setFramesData(resampledFrames);

      const ww = 4000;
      const wl = 1000;

      if (!workerRef.current) return;

      const zStart = splinePoints[0].z - panHeight/2;
      const csWidthPixels = Math.floor(csWidth / res);
      const csHeightPixels = Math.floor(csHeight / res);

      workerRef.current.onmessage = (e) => {
        const { type, buffer, width, height } = e.data;
        if (type === 'PANOREX_RESULT') {
          const panCanvas = panorexCanvasRef.current;
          if (panCanvas) {
            panCanvas.width = width;
            panCanvas.height = height;
            const ctx = panCanvas.getContext('2d');
            if (ctx) {
              const imageData = new ImageData(buffer, width, height);
              ctx.putImageData(imageData, 0, 0);

              for (const nerve of ClinicalStore.nerves) {
                if (nerve.points.length === 0) continue;
                ctx.strokeStyle = nerve.color || '#FF4500';
                ctx.lineWidth = 3;
                ctx.beginPath();
                let first = true;

                for (const pt of nerve.points) {
                  let bestDist = Infinity;
                  let bestX = 0;
                  for (let i = 0; i < resampledFrames.length; i++) {
                    const fPt = resampledFrames[i].point;
                    const d2 = Math.pow(pt.x - fPt.x, 2) + Math.pow(pt.y - fPt.y, 2);
                    if (d2 < bestDist) {
                      bestDist = d2;
                      bestX = i;
                    }
                  }
                  
                  const y = height - 1 - ((pt.z - zStart) / res);
                  if (first) {
                    ctx.moveTo(bestX, y);
                    first = false;
                  } else {
                    ctx.lineTo(bestX, y);
                  }
                }
                ctx.stroke();
              }
            }
          }
        } else if (type === 'CROSS_SECTIONS_RESULT') {
          const csCanvas = crossCanvasRef.current;
          if (csCanvas) {
            csCanvas.width = width; 
            csCanvas.height = height;
            const ctx = csCanvas.getContext('2d');
            if (ctx) {
              const imageData = new ImageData(buffer, width, height);
              ctx.putImageData(imageData, 0, 0);
              
              for (let sliceOffset = -2; sliceOffset <= 2; sliceOffset++) {
                let targetIndex = (csIndex !== undefined ? csIndex : Math.floor(resampledFrames.length / 2)) + sliceOffset * 4;
                if (targetIndex >= resampledFrames.length) targetIndex = resampledFrames.length - 1;
                if (targetIndex < 0) targetIndex = 0;

                const frame = resampledFrames[targetIndex];
                const centerPt = (frame as any).point;
                const nx = (frame as any).normal.x;
                const ny = (frame as any).normal.y;
                const csZStart = centerPt.z - csHeight/2;

                ctx.fillStyle = '#0d9488';
                ctx.font = '12px monospace';
                ctx.fillText(`Slice ${targetIndex}`, (sliceOffset + 2) * csWidthPixels + 4, 14);

                if (sliceOffset === 0) {
                  ctx.fillStyle = '#fbbf24';
                  ctx.fillText('V', (sliceOffset + 2) * csWidthPixels + 4, csHeightPixels - 8);
                  ctx.fillText('L', (sliceOffset + 3) * csWidthPixels - 14, csHeightPixels - 8);
                }

                for (const implant of ClinicalStore.implants) {
                  const fPt = centerPt;
                  const d2 = Math.pow(implant.position.x - fPt.x, 2) + Math.pow(implant.position.y - fPt.y, 2);
                  if (d2 < 25) { 
                    const isCol = checkImplantCollision(implant, 2.0);
                    ctx.strokeStyle = isCol ? '#ef4444' : (implant.color || '#0ea5e9');
                    ctx.lineWidth = 4;
                    
                    const tipZ = csHeightPixels - 1 - ((implant.position.z - csZStart) / res);
                    const tipOffset = (implant.position.x - fPt.x)*nx + (implant.position.y - fPt.y)*ny;
                    const tipX = (sliceOffset + 2) * csWidthPixels + (csWidthPixels/2) + (tipOffset / res);

                    const neckZ = csHeightPixels - 1 - (((implant.position.z + implant.direction.z * implant.length) - csZStart) / res);
                    
                    ctx.beginPath();
                    ctx.moveTo(tipX, tipZ);
                    ctx.lineTo(tipX, neckZ);
                    ctx.stroke();

                    if (isCol) {
                       ctx.fillStyle = '#ef4444';
                       ctx.font = 'bold 12px monospace';
                       ctx.fillText('! COLLISION', (sliceOffset + 2) * csWidthPixels + 4, 28);
                    }
                  }
                }
              }
            }
          }
          setLoading(false);
        }
      };

      workerRef.current.postMessage({
        type: 'PANOREX',
        frames: resampledFrames,
        volumeData: scalarData,
        dimensions,
        spacing,
        origin,
        direction,
        panHeight,
        csWidth,
        csHeight,
        res,
        ww,
        wl
      });

      workerRef.current.postMessage({
        type: 'CROSS_SECTIONS',
        frames: resampledFrames,
        volumeData: scalarData,
        dimensions,
        spacing,
        origin,
        direction,
        panHeight,
        csWidth,
        csHeight,
        res,
        csIndex,
        ww,
        wl
      });

    } catch (err: any) {
      setError(err.message || "Failed to initialize Panorex");
      setLoading(false);
    }
  }, [volumeId, splinePoints, csIndex, ClinicalStore.implants.length, ClinicalStore.nerves.length]);

  const handleCrossSectionClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!framesData || framesData.length === 0 || !crossCanvasRef.current) return;

    const rect = crossCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const res = 0.5;
    const csWidth = 50; 
    const csHeight = 120;
    const csWidthPixels = Math.floor(csWidth / res);
    const csHeightPixels = Math.floor(csHeight / res);

    const sliceIdx = Math.floor(x / csWidthPixels);
    const sliceOffset = sliceIdx - 2;
    
    let targetIndex = csIndex + sliceOffset * 4;
    if (targetIndex >= framesData.length) targetIndex = framesData.length - 1;
    if (targetIndex < 0) targetIndex = 0;

    const frame = framesData[targetIndex];
    if (!frame) return;

    const localX = x % csWidthPixels;
    const offset = (localX - csWidthPixels/2) * res;

    const wx = (frame as any).point.x + (frame as any).normal.x * offset;
    const wy = (frame as any).point.y + (frame as any).normal.y * offset;

    const zStart = splinePoints[0].z - csHeight/2;
    const wz = zStart + ((csHeightPixels - 1 - y) * res);

    if (e.shiftKey) { 
      ClinicalStore.addImplant({
        id: `imp-${Date.now()}`,
        position: { x: wx, y: wy, z: wz },
        direction: { x: 0, y: 0, z: 1 }, 
        length: 10,
        diameter: 4.0
      });
      console.log("Placed Implant at", wx, wy, wz);
    } else if (e.ctrlKey || e.metaKey) { 
      ClinicalStore.addNervePoint('main-nerve', { x: wx, y: wy, z: wz });
      console.log("Placed Nerve Point at", wx, wy, wz);
    }
  };

  const containerStyle: React.CSSProperties = { width: '90%', maxWidth: '1400px', height: '90%', maxHeight: '850px', backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px rgba(0,0,0,0.9)', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: '#e4e4e7', fontFamily: 'Inter, sans-serif', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' };

  if (isMinimized) {
    return createPortal(
      <div
        style={{
          position: 'fixed', bottom: '100px', right: '24px', zIndex: 999999,
          width: '320px', borderRadius: '14px', overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(15,15,18,0.98) 0%, rgba(9,9,11,0.98) 100%)',
          border: '1px solid rgba(20,184,166,0.35)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
          transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: 'auto',
        }}
        onClick={() => setIsMinimized(false)}
        onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseOut={e => (e.currentTarget.style.transform = 'none')}
      >
        <div style={{ height: '3px', background: 'linear-gradient(to right, #0ea5e9, #14b8a6)' }} />
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9c0 0 3-3 9-3s9 3 9 3"/><path d="M3 15c0 0 3 3 9 3s9-3 9-3"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f4f4f5', letterSpacing: '0.01em' }}>Панорамикс + Срезы</div>
            <div style={{ fontSize: '11px', color: '#7dd3fc', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0ea5e9', display: 'inline-block', boxShadow: '0 0 6px #0ea5e9' }} />
              CBCT · Нажмите чтобы развернуть
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid rgba(39,39,42,0.8)', backgroundColor: 'rgba(39,39,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Развернуть">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            </div>
            <div
              style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              title="Закрыть"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
      <div style={containerStyle}>
      
      {/* HEADER */}
      <div style={{ backgroundColor: 'rgba(15, 15, 18, 0.95)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0ea5e9', boxShadow: '0 0 8px rgba(14,165,233,0.9)' }} />
          <div>
            <div style={{ color: '#f4f4f5', fontWeight: 700, fontSize: '13px', letterSpacing: '0.03em' }}>Панорамикс + Срезы</div>
            <div style={{ color: '#52525b', fontSize: '10px', marginTop: '1px' }}>DENTAL CBCT · Panoramic &amp; Cross-Sections</div>
          </div>
          
          <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, backgroundColor: 'rgba(14,165,233,0.18)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s' }} title="Нервный канал">
              <Activity size={12} /> Нерв
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '11px', fontWeight: 500, color: '#52525b', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s' }} onMouseOver={e=>e.currentTarget.style.color='#e4e4e7'} onMouseOut={e=>e.currentTarget.style.color='#52525b'} title="Виртуальный имплант">
              <Droplet size={12} /> Имплант
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '11px', fontWeight: 500, color: '#52525b', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s' }} onMouseOver={e=>e.currentTarget.style.color='#e4e4e7'} onMouseOut={e=>e.currentTarget.style.color='#52525b'} title="Линейные измерения">
              <Ruler size={12} /> Линейка
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '11px', fontWeight: 500, color: '#52525b', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s' }} onMouseOver={e=>e.currentTarget.style.color='#e4e4e7'} onMouseOut={e=>e.currentTarget.style.color='#52525b'} title="Плотность HU">
              <Target size={12} /> HU
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', color: '#71717a', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '7px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '7px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      {/* CONTENT */}
      <div style={{ flex: 1, position: 'relative', backgroundColor: '#000', display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px', overflow: 'hidden' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 20, backdropFilter: 'blur(4px)' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid rgba(20, 184, 166, 0.2)', borderTopColor: '#14b8a6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <span style={{ color: '#2dd4bf', marginTop: '16px', fontSize: '14px', fontWeight: 500, letterSpacing: '0.05em' }}>Processing Voxel Data in Worker...</span>
          </div>
        )}
        {error && <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 30, color: '#ef4444', backgroundColor: 'rgba(127, 29, 29, 0.9)', padding: '16px', borderRadius: '8px', border: '1px solid #991b1b', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>{error}</div>}
        
        {/* Panorex View */}
        <div style={{ flex: 1, border: '1px solid rgba(39,39,42,0.8)', backgroundColor: '#09090b', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)' }}>
           <div style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '12px', fontFamily: 'monospace', color: '#2dd4bf', fontWeight: 800, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(39,39,42,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '6px' }}>
             <Activity size={14} /> PANORAMIC (Unwrapped)
           </div>
           
           <div 
              style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0', cursor: 'ew-resize' }}
              onWheel={(e) => {
                e.preventDefault();
                setCsIndex(prev => {
                  const step = e.deltaY > 0 ? 5 : -5;
                  return Math.max(0, Math.min(pointsCount - 1, prev + step));
                });
              }}
           >
             <canvas ref={panorexCanvasRef} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
           </div>
           
           {/* Cross-section indicator line overlay */}
           {pointsCount > 0 && panorexCanvasRef.current && (
             <div 
               style={{ position: 'absolute', top: 0, bottom: 0, width: '2px', backgroundColor: 'rgba(20, 184, 166, 0.8)', boxShadow: '0 0 10px rgba(20, 184, 166, 1)', pointerEvents: 'none', zIndex: 10, left: `calc(50% - ${(panorexCanvasRef.current.clientWidth)/2}px + ${(csIndex / pointsCount) * panorexCanvasRef.current.clientWidth}px)` }}
             />
           )}

           {/* Slider to select cross section */}
           {pointsCount > 0 && (
             <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.7)', padding: '12px 16px', borderRadius: '12px', backdropFilter: 'blur(8px)', border: '1px solid rgba(39,39,42,0.8)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
                 <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#71717a', fontWeight: 700 }}>L</span>
                 <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#5eead4', fontWeight: 700, letterSpacing: '0.05em' }}>Slice Position: {csIndex} / {pointsCount}</span>
                 <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#71717a', fontWeight: 700 }}>R</span>
               </div>
               <input 
                 type="range" min="0" max={pointsCount - 1} value={csIndex} 
                 onChange={(e) => setCsIndex(Number(e.target.value))}
                 style={{ width: '100%', accentColor: '#0d9488', cursor: 'pointer', height: '6px', backgroundColor: '#27272a', borderRadius: '999px', appearance: 'none', outline: 'none' }}
               />
             </div>
           )}
        </div>

        {/* Multi-Slice Cross-Section View */}
        <div 
          style={{ height: '320px', border: '1px solid rgba(39,39,42,0.8)', backgroundColor: '#09090b', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)' }}
          onWheel={(e) => {
            e.preventDefault();
            setCsIndex(prev => {
              const step = e.deltaY > 0 ? 5 : -5;
              return Math.max(0, Math.min(pointsCount - 1, prev + step));
            });
          }}
        >
           <div style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '12px', fontFamily: 'monospace', color: '#2dd4bf', fontWeight: 800, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(39,39,42,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '6px' }}>
             <Layers size={14} /> CROSS-SECTIONS (Orthogonal)
           </div>
           
           <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
             <canvas ref={crossCanvasRef} onClick={handleCrossSectionClick} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'crosshair' }} />
           </div>
           
           <div style={{ position: 'absolute', bottom: '12px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
              <span style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#a1a1aa', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid rgba(39,39,42,0.8)', backdropFilter: 'blur(4px)' }}>Shift+Click: Set Implant | Ctrl+Click: Set Nerve Point</span>
           </div>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}
