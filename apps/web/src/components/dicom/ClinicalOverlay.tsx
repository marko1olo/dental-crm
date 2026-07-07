import React, { useEffect, useRef } from 'react';
import * as cornerstone from '@cornerstonejs/core';
import { ClinicalStore, checkImplantCollision } from '../../utils/dicom/clinicalImplants';
import { drawCrownMockup, getAngulationWarning } from "../../utils/math/toothGeometry";

interface Props {
  viewportId: string;
  renderingEngineId: string;
}

export function ClinicalOverlay({ viewportId, renderingEngineId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId: number;

    const renderOverlay = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const engine = cornerstone.getRenderingEngine(renderingEngineId);
      if (!engine) return;

      const viewport = engine.getViewport(viewportId);
      if (!viewport) return;

      // Match canvas size to the viewport element
      const element = viewport.element;
      if (canvas.width !== element.clientWidth || canvas.height !== element.clientHeight) {
        canvas.width = element.clientWidth;
        canvas.height = element.clientHeight;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- Draw Nerves ---
      for (const nerve of ClinicalStore.nerves) {
        if (nerve.points.length === 0) continue;

        ctx.strokeStyle = nerve.color || '#FF4500';
        ctx.lineWidth = 2;
        ctx.beginPath();

        let firstPoint = true;
        for (const pt of nerve.points) {
          // worldToCanvas returns [x, y] relative to the element
          const canvasPt = viewport.worldToCanvas([pt.x, pt.y, pt.z]);
          if (!canvasPt) continue;

          if (firstPoint) {
            ctx.moveTo(canvasPt[0], canvasPt[1]);
            firstPoint = false;
          } else {
            ctx.lineTo(canvasPt[0], canvasPt[1]);
          }

          // Draw a small circle at each point
          ctx.save();
          ctx.fillStyle = nerve.color || '#FF4500';
          ctx.beginPath();
          ctx.arc(canvasPt[0], canvasPt[1], 3, 0, 2 * Math.PI);
          ctx.fill();
          ctx.restore();
        }
        ctx.stroke();
      }

      // --- Draw Implants ---
      for (const implant of ClinicalStore.implants) {
        const isCollision = checkImplantCollision(implant, 2.0);
        
        const tip = implant.position;
        const neck = {
          x: tip.x + implant.direction.x * implant.length,
          y: tip.y + implant.direction.y * implant.length,
          z: tip.z + implant.direction.z * implant.length,
        };

        const tipCanvas = viewport.worldToCanvas([tip.x, tip.y, tip.z]);
        const neckCanvas = viewport.worldToCanvas([neck.x, neck.y, neck.z]);

        if (tipCanvas && neckCanvas) {
          // Draw cylinder axis
          ctx.strokeStyle = isCollision ? '#ef4444' : (implant.color || '#0ea5e9'); // Red if collision, else blue
          ctx.lineWidth = 4;
          
          if (isCollision) {
            // Pulsating effect for collision
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10 + Math.sin(Date.now() / 150) * 10;
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.beginPath();
          ctx.moveTo(tipCanvas[0], tipCanvas[1]);
          ctx.lineTo(neckCanvas[0], neckCanvas[1]);
          ctx.stroke();
          
          ctx.shadowBlur = 0; // reset

          // Draw Tip and Neck dots
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(tipCanvas[0], tipCanvas[1], 4, 0, 2 * Math.PI);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(neckCanvas[0], neckCanvas[1], 4, 0, 2 * Math.PI);
          ctx.fill();

          // --- Surgical Sleeve Rendering ---
          // Assuming sleeve params: height 5mm, diameter 5mm, offset 9mm (D-factor)
          // For MVP, we use hardcoded default if not present on implant
          const sleeveHeight = 5;
          const sleeveDiameter = 5;
          const sleeveOffset = 9;
          
          // Calculate sleeve bottom center based on offset along the implant direction
          const sleeveBottom = {
            x: neck.x + implant.direction.x * sleeveOffset,
            y: neck.y + implant.direction.y * sleeveOffset,
            z: neck.z + implant.direction.z * sleeveOffset,
          };
          
          // Calculate sleeve top center
          const sleeveTop = {
            x: sleeveBottom.x + implant.direction.x * sleeveHeight,
            y: sleeveBottom.y + implant.direction.y * sleeveHeight,
            z: sleeveBottom.z + implant.direction.z * sleeveHeight,
          };
          
          const sleeveBottomCanvas = viewport.worldToCanvas([sleeveBottom.x, sleeveBottom.y, sleeveBottom.z]);
          const sleeveTopCanvas = viewport.worldToCanvas([sleeveTop.x, sleeveTop.y, sleeveTop.z]);
          
          if (sleeveBottomCanvas && sleeveTopCanvas) {
            ctx.save();
            ctx.strokeStyle = '#a855f7'; // purple-500
            ctx.fillStyle = 'rgba(168, 85, 247, 0.2)'; // translucent purple
            ctx.lineWidth = Math.max(2, sleeveDiameter * 2); // Approximate scale for MVP
            
            ctx.beginPath();
            ctx.moveTo(sleeveBottomCanvas[0], sleeveBottomCanvas[1]);
            ctx.lineTo(sleeveTopCanvas[0], sleeveTopCanvas[1]);
            ctx.stroke();
            
            ctx.restore();
          }

          // --- Virtual Crown Mockup (FDI-driven prosthetically guided) ---
          const { angleDeg, isWarning, message: angMsg } = getAngulationWarning(implant.direction.z);

          // Calculate 2D rotation: crown points "up" along implant axis on screen
          const dx2 = neckCanvas[0] - tipCanvas[0];
          const dy2 = neckCanvas[1] - tipCanvas[1];
          const canvasAngle = Math.atan2(dy2, dx2);

          // Scale: ~8 px per mm is a reasonable default for typical CBCT display
          const pixelsPerMm = 8;
          const fdi = implant.toothFdi ?? 46;

          ctx.save();
          ctx.translate(neckCanvas[0], neckCanvas[1]);
          ctx.rotate(canvasAngle - Math.PI / 2); // rotate so crown extends "above" neck
          drawCrownMockup(ctx, fdi, pixelsPerMm, isWarning);
          ctx.restore();

          // Angulation warning overlay
          if (isWarning && angMsg) {
            ctx.save();
            ctx.font = 'bold 11px monospace';
            const warnLabel = `⚠ ${angleDeg.toFixed(1)}° >15°`;
            const tw = ctx.measureText(warnLabel).width;
            const wx = neckCanvas[0] + 14;
            const wy = neckCanvas[1] - 14;
            ctx.fillStyle = 'rgba(69, 10, 10, 0.9)';
            ctx.fillRect(wx - 2, wy - 13, tw + 8, 18);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.strokeRect(wx - 2, wy - 13, tw + 8, 18);
            ctx.fillStyle = '#fca5a5';
            ctx.fillText(warnLabel, wx + 2, wy);
            ctx.restore();

            // Dispatch warning (for external listeners, e.g. logging panel)
            window.dispatchEvent(new CustomEvent('ct-angulation-warn', {
              detail: { implantId: implant.id, angleDeg, message: angMsg }
            }));
          }
        }
      }

      // --- Divergence / Convergence Analysis ---
      const reportedPairs = new Set<string>();
      for (let i = 0; i < ClinicalStore.implants.length; i++) {
        for (let j = i + 1; j < ClinicalStore.implants.length; j++) {
          const imp1 = ClinicalStore.implants[i];
          const imp2 = ClinicalStore.implants[j];
          if (!imp1 || !imp2) continue;
          
          // Dot product of normalized direction vectors
          const dot = imp1.direction.x * imp2.direction.x + 
                      imp1.direction.y * imp2.direction.y + 
                      imp1.direction.z * imp2.direction.z;
          
          // Clamp to avoid precision issues
          const clampedDot = Math.max(-1, Math.min(1, dot));
          const angleRad = Math.acos(clampedDot);
          const angleDeg = angleRad * (180 / Math.PI);
          
          if (angleDeg > 15) {
            // Draw orange dashed line between their necks
            const neck1 = {
              x: imp1.position.x + imp1.direction.x * imp1.length,
              y: imp1.position.y + imp1.direction.y * imp1.length,
              z: imp1.position.z + imp1.direction.z * imp1.length,
            };
            const neck2 = {
              x: imp2.position.x + imp2.direction.x * imp2.length,
              y: imp2.position.y + imp2.direction.y * imp2.length,
              z: imp2.position.z + imp2.direction.z * imp2.length,
            };

            const neckCanvas1 = viewport.worldToCanvas([neck1.x, neck1.y, neck1.z]);
            const neckCanvas2 = viewport.worldToCanvas([neck2.x, neck2.y, neck2.z]);

            if (neckCanvas1 && neckCanvas2) {
              ctx.save();
              ctx.strokeStyle = '#f97316'; // orange-500
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.moveTo(neckCanvas1[0], neckCanvas1[1]);
              ctx.lineTo(neckCanvas2[0], neckCanvas2[1]);
              ctx.stroke();

              const mx = (neckCanvas1[0] + neckCanvas2[0]) / 2;
              const my = (neckCanvas1[1] + neckCanvas2[1]) / 2;
              ctx.font = "bold 12px sans-serif";
              ctx.fillStyle = '#ffedd5';
              ctx.fillText(`Δ = ${angleDeg.toFixed(1)}°`, mx, my - 10);
              ctx.restore();
            }

            const pairId = `${imp1.id}-${imp2.id}`;
            if (!reportedPairs.has(pairId)) {
               reportedPairs.add(pairId);
               window.dispatchEvent(new CustomEvent('shadow-analyst-divergence-warn', {
                 detail: {
                   text: `Внимание: Превышен угол конвергенции/дивергенции между имплантатами. Расхождение ${angleDeg.toFixed(1)}°. Риск ортопедической несостоятельности!`
                 }
               }));
            }
          }
        }
      }
      // Keep rendering loop going
      animationFrameId = requestAnimationFrame(renderOverlay);
    };

    renderOverlay();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [viewportId, renderingEngineId]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Critical: pass clicks to Cornerstone underneath
        zIndex: 50 // Above Cornerstone, below tools
      }}
    />
  );
}
