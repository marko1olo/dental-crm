import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as cornerstone from "@cornerstonejs/core";
import * as cornerstoneTools from "@cornerstonejs/tools";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";

import { PanoramicRendererWindow } from "./PanoramicRendererWindow";
import { ViewportOverlays } from "./ViewportOverlays";
import { DicomToolbar } from "./DicomToolbar";
// ShadowAnalystTerminal removed — it is a 2D radiograph tool, not for 3D CT
import { initCornerstoneTools, setupMprToolGroup, setupVrToolGroup } from "../../utils/dicom/toolsInit";
import { ClinicalOverlay } from "./ClinicalOverlay";
import { BoneQualityPanel } from "./BoneQualityPanel";
import { generateClinicalReportPdf } from "../../utils/dicom/pdfExport";
import type { ImplantSystem } from "../../utils/dicom/boneQualityEngine";

interface Cornerstone3DViewerProps {
  imageIds: string[];
  isPreview?: boolean;
  onClose?: () => void;
}

export function Cornerstone3DViewer({ imageIds, isPreview = false, onClose }: Cornerstone3DViewerProps) {
  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);
  const vrRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [maximizedViewportId, setMaximizedViewportId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [volumeId, setVolumeId] = useState<string | null>(null);
  
  // Panorex State
  const [showPanorex, setShowPanorex] = useState(false);
  const [splinePoints, setSplinePoints] = useState<any[]>([]);
  const [panorexThickness, setPanorexThickness] = useState<number>(0);
  const [blendMode, setBlendMode] = useState<"mip" | "average">("mip");
  
  // Tools & UI State
  const [vrPreset, setVrPreset] = useState<"CT-Bone" | "CT-Soft-Tissue">("CT-Bone");
  const [activeTool, setActiveTool] = useState<string>("Crosshairs");
  const [isMinimized, setIsMinimized] = useState(false);
  const [boneDensityProfile, setBoneDensityProfile] = useState<number[]>([]);
  const [implants, setImplants] = useState<any[]>([]);
  const [patientId, setPatientId] = useState<string>("TEST_PATIENT_123");
  const [implantSystem, setImplantSystem] = useState<ImplantSystem>('osstem');
  const [activeFdi, setActiveFdi] = useState<number>(46);
  const [activeImplantDiam, setActiveImplantDiam] = useState<number>(4.0);
  const [activeImplantLen, setActiveImplantLen] = useState<number>(10.0);

  // 1. Initialize System
  useEffect(() => {
    async function init() {
      await cornerstone.init();
      await initCornerstoneTools();

      cornerstoneDICOMImageLoader.init({
        useLegacyMetadataProvider: true,
        maxWebWorkers: navigator.hardwareConcurrency ? Math.min(navigator.hardwareConcurrency, 7) : 1,
      });

      setIsInitialized(true);
    }
    
    if (!isInitialized) init();

    return () => {
      // Aggressive OOM Prevention: Purge cache and destroy all tools
      console.log("Purging DICOM Cache...");
      cornerstone.cache.purgeCache();
    };
  }, [isInitialized]);

  // 2. Load Volume and Render
  useEffect(() => {
    if (!isInitialized || !imageIds.length) return;

    const renderingEngineId = "my-engine";
    let renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
    if (!renderingEngine) {
      renderingEngine = new cornerstone.RenderingEngine(renderingEngineId);
    }

    const vId = "cornerstoneStreamingImageVolume:cbct-volume";
    setVolumeId(vId);

    const viewportIds = { axial: "AXIAL", sagittal: "SAGITTAL", coronal: "CORONAL", vr: "VR" };

    const viewportInputArray = [
      { viewportId: viewportIds.axial, type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC, element: axialRef.current as HTMLDivElement, defaultOptions: { orientation: cornerstone.Enums.OrientationAxis.AXIAL, background: [0, 0, 0] } },
      { viewportId: viewportIds.sagittal, type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC, element: sagittalRef.current as HTMLDivElement, defaultOptions: { orientation: cornerstone.Enums.OrientationAxis.SAGITTAL, background: [0, 0, 0] } },
      { viewportId: viewportIds.coronal, type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC, element: coronalRef.current as HTMLDivElement, defaultOptions: { orientation: cornerstone.Enums.OrientationAxis.CORONAL, background: [0, 0, 0] } },
      { viewportId: viewportIds.vr, type: cornerstone.Enums.ViewportType.VOLUME_3D, element: vrRef.current as HTMLDivElement, defaultOptions: { background: [0, 0, 0] } },
    ];

    renderingEngine.setViewports(viewportInputArray as any);

    async function loadAndRender() {
      // Load slices
      const batchSize = 20;
      for (let i = 0; i < imageIds.length; i += batchSize) {
        const batch = imageIds.slice(i, i + batchSize).map((imageId) => cornerstone.imageLoader.loadAndCacheImage(imageId));
        await Promise.all(batch);
      }

      // Sort slices by Z coordinate or instance number
      const sortedImageIds = [...imageIds].sort((a, b) => {
        const planeA = cornerstone.metaData.get('imagePlaneModule', a);
        const planeB = cornerstone.metaData.get('imagePlaneModule', b);
        if (planeA?.imagePositionPatient && planeB?.imagePositionPatient) {
          return planeA.imagePositionPatient[2] - planeB.imagePositionPatient[2];
        }
        const instA = cornerstone.metaData.get('instance', a);
        const instB = cornerstone.metaData.get('instance', b);
        return (instA?.InstanceNumber || 0) - (instB?.InstanceNumber || 0);
      });

      console.log(`[CT] Volume constructed with ${sortedImageIds.length} slices.`);

      const volume = await cornerstone.volumeLoader.createAndCacheVolume(vId, { imageIds: sortedImageIds });
      volume.load();

      // Tool setups
      setupMprToolGroup(renderingEngineId, [viewportIds.axial, viewportIds.sagittal, viewportIds.coronal]);
      setupVrToolGroup(renderingEngineId, viewportIds.vr);

      cornerstone.eventTarget.addEventListener(cornerstone.EVENTS.IMAGE_VOLUME_MODIFIED, (e: any) => {
        if (e.detail.volumeId === vId) {
          renderingEngine?.renderViewports([viewportIds.axial, viewportIds.sagittal, viewportIds.coronal, viewportIds.vr]);
        }
      });

      await cornerstone.setVolumesForViewports(
        renderingEngine!,
        [{ volumeId: vId, callback: ({ volumeActor }) => {
           volumeActor.getProperty().getRGBTransferFunction(0).setMappingRange(-1000, 3000);
        }}],
        [viewportIds.axial, viewportIds.sagittal, viewportIds.coronal, viewportIds.vr]
      );

      renderingEngine!.render();
    }

    loadAndRender();

    // Resize Observer for strict grid & Fullscreen stability with throttling
    let resizeTimer: number | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimer !== null) cancelAnimationFrame(resizeTimer);
      resizeTimer = requestAnimationFrame(() => {
        const engine = cornerstone.getRenderingEngine(renderingEngineId);
        if (engine) {
          // Force sync resize and re-render
          engine.resize(true, false);
          engine.render();
        }
      });
    });
    
    if (axialRef.current) resizeObserver.observe(axialRef.current);
    if (sagittalRef.current) resizeObserver.observe(sagittalRef.current);
    if (coronalRef.current) resizeObserver.observe(coronalRef.current);
    if (vrRef.current) resizeObserver.observe(vrRef.current);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      renderingEngine?.destroy();
      
      // Strict WebGL context destruction and Canvas resize
      const cleanCanvas = (ref: React.RefObject<HTMLDivElement | null>) => {
        if (ref.current) {
          const canvases = ref.current.querySelectorAll('canvas');
          canvases.forEach(canvas => {
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            gl?.getExtension('WEBGL_lose_context')?.loseContext();
            canvas.width = 0;
            canvas.height = 0;
          });
        }
      };
      
      cleanCanvas(axialRef);
      cleanCanvas(sagittalRef);
      cleanCanvas(coronalRef);
      cleanCanvas(vrRef);
    };
  }, [isInitialized, imageIds]);

  // Update VR Preset dynamically
  useEffect(() => {
    const engine = cornerstone.getRenderingEngine("my-engine");
    if (!engine) return;
    const vrViewport = engine.getViewport("VR") as cornerstone.Types.IVolumeViewport;
    if (vrViewport && typeof vrViewport.setProperties === 'function') {
      vrViewport.setProperties({ preset: vrPreset });
      vrViewport.render();
    }
  }, [vrPreset]);

  useEffect(() => {
    // Clinical collision warnings are shown on-canvas by ClinicalOverlay (pulsating red line)
    const handleCollision = (e: any) => {
      console.warn('[CT] Implant collision:', e.detail.message);
    };
    // Divergence warnings are shown on-canvas by ClinicalOverlay (orange dashed line + angle label)
    const handleDivergence = (e: any) => {
      console.warn('[CT] Divergence warning:', e.detail.text);
    };
    // When an implant is placed — update BoneQualityPanel active tooth
    const handleImplantPlaced = (e: any) => {
      if (e.detail?.toothNumber) setActiveFdi(e.detail.toothNumber);
    };
    // Angulation warning from ClinicalOverlay
    const handleAngulation = (e: any) => {
      console.warn('[CT] Angulation warning:', e.detail.message);
    };

    window.addEventListener('clinical-collision', handleCollision);
    window.addEventListener('shadow-analyst-divergence-warn', handleDivergence);
    window.addEventListener('clinical-implant-placed', handleImplantPlaced);
    window.addEventListener('ct-angulation-warn', handleAngulation);
    return () => {
      window.removeEventListener('clinical-collision', handleCollision);
      window.removeEventListener('shadow-analyst-divergence-warn', handleDivergence);
      window.removeEventListener('clinical-implant-placed', handleImplantPlaced);
      window.removeEventListener('ct-angulation-warn', handleAngulation);
    };
  }, []);

  useEffect(() => {
    const handleGenerateReport = () => {
      generateClinicalReportPdf({
        patientInfo: { fullName: "Test Patient", studyId: volumeId || "N/A", date: new Date().toLocaleDateString() },
        implants: implants,
        containerElement: containerRef.current
      });
    };

    const handleSavePlanning = async () => {
      try {
        const res = await fetch('/api/imaging/planning/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId, studyInstanceUid: volumeId, splinePointsJson: JSON.stringify(splinePoints), implantsJson: JSON.stringify(implants) })
        });
        if (!res.ok) console.error('[CT] Failed to save planning');
      } catch (err) {
        console.error('[CT] API Error: Could not save planning.', err);
      }
    };

    window.addEventListener('generate-clinical-report', handleGenerateReport);
    window.addEventListener('save-ct-planning', handleSavePlanning);

    return () => {
      window.removeEventListener('generate-clinical-report', handleGenerateReport);
      window.removeEventListener('save-ct-planning', handleSavePlanning);
    };
  }, [implants, splinePoints, volumeId, patientId]);

  // Autosave
  useEffect(() => {
    if (!volumeId || (splinePoints.length === 0 && implants.length === 0)) return;
    const timer = setTimeout(async () => {
      window.dispatchEvent(new CustomEvent('save-ct-planning'));
    }, 60000);
    return () => clearTimeout(timer);
  }, [splinePoints, implants, volumeId]);

  const handleGeneratePanorex = () => {
    if (!axialRef.current) return;
    
    try {
      const annotations = cornerstoneTools.annotation.state.getAnnotations(cornerstoneTools.SplineROITool.toolName, axialRef.current);
      if (annotations && annotations.length > 0) {
        const annotation = annotations[annotations.length - 1];
        const rawPoints = annotation?.data?.polyline || annotation?.data?.handles?.points || ((annotation?.data as any)?.contour?.points) || [];
        if (rawPoints.length > 0) {
          const formattedPoints = rawPoints.map((pt: any) => {
            if (Array.isArray(pt)) return { x: pt[0], y: pt[1], z: pt[2] };
            return pt;
          });
          setSplinePoints(formattedPoints);
          setShowPanorex(true);
          console.log(`[CT] Generated panoramic curve with ${formattedPoints.length} points.`);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    
    console.warn('[CT] No spline drawn. Using fallback points for Panorex.');
    setSplinePoints([{ x: 0, y: 0, z: 0 }, { x: 50, y: 50, z: 0 }]);
    setShowPanorex(true);
  };

  const setTool = (toolName: string) => {
    const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup("mpr-tool-group");
    if (!toolGroup) return;
    
    // Some tools might need setup
    if (toolName === cornerstoneTools.LengthTool.toolName || toolName === cornerstoneTools.ProbeTool.toolName) {
      console.log(`[CT] Activated measurement tool: ${toolName}`);
    }

    toolGroup.setToolDisabled(activeTool);
    toolGroup.setToolActive(toolName, {
      bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
    });
    setActiveTool(toolName);
  };

  const getGridStyle = (): React.CSSProperties => {
    if (maximizedViewportId) {
      return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
    }
    return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
  };

  const containerStyle: React.CSSProperties = isPreview 
    ? { width: '100%', height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column', backgroundColor: '#09090b', color: '#e4e4e7', overflow: 'hidden', borderRadius: '12px', border: '1px solid rgba(39, 39, 42, 0.8)' }
    : { width: '100%', height: '100%', maxWidth: 'calc(100vw - 64px)', maxHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', backgroundColor: '#000', color: '#e4e4e7', overflow: 'hidden', borderRadius: '16px', border: '1px solid rgba(82, 82, 91, 0.5)', boxShadow: '0 25px 50px -12px rgba(0,0,0,1)' };

  const pipWidget = (
    <div
      style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999, width: '320px', borderRadius: '14px', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(15,15,18,0.98) 0%, rgba(9,9,11,0.98) 100%)',
        border: '1px solid rgba(20,184,166,0.35)', boxShadow: '0 20px 60px rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', cursor: 'pointer'
      }}
      onClick={() => setIsMinimized(false)}
    >
      <div style={{ height: '3px', background: 'linear-gradient(to right, #14b8a6, #059669)' }} />
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#14b8a6', fontWeight: 900 }}>3D</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f4f4f5' }}>3D КТ Просмотрщик</div>
          <div style={{ fontSize: '11px', color: '#5eead4', marginTop: '2px' }}>Нажмите чтобы развернуть</div>
        </div>
      </div>
    </div>
  );

  const panorexRender = showPanorex && volumeId ? (
    <PanoramicRendererWindow 
      volumeId={volumeId} 
      splinePoints={splinePoints} 
      onClose={() => setShowPanorex(false)}
      thickness={panorexThickness}
      blendMode={blendMode}
    />
  ) : null;

  const handleSetWindowLevel = (lower: number, upper: number) => {
    const engine = cornerstone.getRenderingEngine("my-engine");
    if (!engine) return;
    const viewports = ["AXIAL", "SAGITTAL", "CORONAL"];
    viewports.forEach(vpId => {
      const vp = engine.getViewport(vpId) as any;
      if (vp && vp.setProperties) {
        vp.setProperties({ voiRange: { lower, upper } });
        vp.render();
      }
    });
    console.log(`[CT] Applied W/L Preset [${lower}, ${upper}]`);
  };

  const content = (
    <div ref={containerRef} style={containerStyle}>
      <DicomToolbar 
        activeTool={activeTool} setTool={setTool}
        panorexThickness={panorexThickness} setPanorexThickness={setPanorexThickness}
        blendMode={blendMode} setBlendMode={setBlendMode}
        onGeneratePanorex={handleGeneratePanorex}
        onSetWindowLevel={handleSetWindowLevel}
        isMinimized={isMinimized} setIsMinimized={setIsMinimized}
        onClose={onClose!} isPreview={isPreview!}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* GRID (Strict dimensions) */}
        <div style={{ flex: 1, display: 'grid', gap: '2px', backgroundColor: 'rgba(39, 39, 42, 0.8)', ...getGridStyle() }}>
          {/* AXIAL */}
          <div style={{ position: 'relative', backgroundColor: '#000', overflow: 'hidden', display: (!maximizedViewportId || maximizedViewportId === 'AXIAL') ? 'block' : 'none', cursor: 'crosshair' }} onDoubleClick={() => setMaximizedViewportId(p => p === 'AXIAL' ? null : 'AXIAL')}>
            <ViewportOverlays viewportType="AXIAL" orientationMarkers={{ top: 'A', bottom: 'P', left: 'R', right: 'L' }} onMaximize={() => setMaximizedViewportId(p => p === 'AXIAL' ? null : 'AXIAL')} />
            <ClinicalOverlay viewportId="AXIAL" renderingEngineId="my-engine" />
            <div ref={axialRef} style={{ width: '100%', height: '100%', outline: 'none' }} onContextMenu={e => e.preventDefault()} />
          </div>

          {/* SAGITTAL */}
          <div style={{ position: 'relative', backgroundColor: '#000', overflow: 'hidden', display: (!maximizedViewportId || maximizedViewportId === 'SAGITTAL') ? 'block' : 'none', cursor: 'crosshair' }} onDoubleClick={() => setMaximizedViewportId(p => p === 'SAGITTAL' ? null : 'SAGITTAL')}>
            <ViewportOverlays viewportType="SAGITTAL" orientationMarkers={{ top: 'S', bottom: 'I', left: 'A', right: 'P' }} onMaximize={() => setMaximizedViewportId(p => p === 'SAGITTAL' ? null : 'SAGITTAL')} />
            <ClinicalOverlay viewportId="SAGITTAL" renderingEngineId="my-engine" />
            <div ref={sagittalRef} style={{ width: '100%', height: '100%', outline: 'none' }} onContextMenu={e => e.preventDefault()} />
          </div>

          {/* CORONAL */}
          <div style={{ position: 'relative', backgroundColor: '#000', overflow: 'hidden', display: (!maximizedViewportId || maximizedViewportId === 'CORONAL') ? 'block' : 'none', cursor: 'crosshair' }} onDoubleClick={() => setMaximizedViewportId(p => p === 'CORONAL' ? null : 'CORONAL')}>
            <ViewportOverlays viewportType="CORONAL" orientationMarkers={{ top: 'S', bottom: 'I', left: 'R', right: 'L' }} onMaximize={() => setMaximizedViewportId(p => p === 'CORONAL' ? null : 'CORONAL')} />
            <ClinicalOverlay viewportId="CORONAL" renderingEngineId="my-engine" />
            <div ref={coronalRef} style={{ width: '100%', height: '100%', outline: 'none' }} onContextMenu={e => e.preventDefault()} />
          </div>

          {/* 3D VR */}
          <div style={{ position: 'relative', backgroundColor: '#000', overflow: 'hidden', display: (!maximizedViewportId || maximizedViewportId === 'VR') ? 'block' : 'none', cursor: 'move' }} onDoubleClick={() => setMaximizedViewportId(p => p === 'VR' ? null : 'VR')}>
            <ViewportOverlays viewportType="VR" vrPreset={vrPreset} onMaximize={() => setMaximizedViewportId(p => p === 'VR' ? null : 'VR')} />
            
            <div style={{ position: 'absolute', bottom: '12px', left: '12px', display: 'flex', gap: '8px', zIndex: 20 }}>
              <button 
                style={{ fontSize: '10px', fontWeight: 700, padding: '4px 12px', background: vrPreset === 'CT-Bone' ? '#f59e0b' : 'rgba(0,0,0,0.6)', color: vrPreset === 'CT-Bone' ? '#000' : '#a1a1aa', border: '1px solid', borderColor: vrPreset === 'CT-Bone' ? '#fbbf24' : '#3f3f46', borderRadius: '6px', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setVrPreset('CT-Bone'); }}
              >Кость/Эмаль</button>
              <button 
                style={{ fontSize: '10px', fontWeight: 700, padding: '4px 12px', background: vrPreset === 'CT-Soft-Tissue' ? '#f59e0b' : 'rgba(0,0,0,0.6)', color: vrPreset === 'CT-Soft-Tissue' ? '#000' : '#a1a1aa', border: '1px solid', borderColor: vrPreset === 'CT-Soft-Tissue' ? '#fbbf24' : '#3f3f46', borderRadius: '6px', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setVrPreset('CT-Soft-Tissue'); }}
              >Мягкие ткани</button>
            </div>
            
            <div ref={vrRef} style={{ width: '100%', height: '100%', outline: 'none' }} onContextMenu={e => e.preventDefault()} />
          </div>
        </div>

        {/* BONE QUALITY SIDEBAR */}
        <BoneQualityPanel
          huSamples={boneDensityProfile}
          implantDiameterMm={activeImplantDiam}
          implantLengthMm={activeImplantLen}
          implantSystem={implantSystem}
          toothFdi={activeFdi}
          onSystemChange={setImplantSystem}
        />
      </div>
    </div>
  );

  if (!isPreview && typeof document !== 'undefined') {
    if (isMinimized) {
      return <>{createPortal(pipWidget, document.body)}{panorexRender}</>;
    }
    return <>{createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 999998, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.80)', backdropFilter: 'blur(16px)', padding: '32px' }}>{content}</div>, document.body)}{panorexRender}</>;
  }

  return <>{content}{panorexRender}</>;
}
