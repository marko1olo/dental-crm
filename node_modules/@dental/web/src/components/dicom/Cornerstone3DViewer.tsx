import React, { useEffect, useRef, useState } from "react";
import * as cornerstone from "@cornerstonejs/core";
import * as cornerstoneTools from "@cornerstonejs/tools";
import { PanoramicRendererWindow } from "./PanoramicRendererWindow";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";
import dicomParser from "dicom-parser";
import { vec3, mat4 } from "gl-matrix";
import { calculateImplantBoneDensity, distancePointToSpline } from "../../mprMath";

export interface ImplantData {
  id: string;
  fdiCode: string;
  diameter: number;
  length: number;
  startWorld: vec3;
  endWorld: vec3;
  boneDensity: { averageHU: number, classification: string };
  distanceToNerve: number;
}

interface Cornerstone3DViewerProps {
  imageIds: string[];
}

export function Cornerstone3DViewer({ imageIds }: Cornerstone3DViewerProps) {
  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [volumeId, setVolumeId] = useState<string | null>(null);
  const [showPanorex, setShowPanorex] = useState(false);
  const [splinePoints, setSplinePoints] = useState<any[]>([]);
  const [panorexThickness, setPanorexThickness] = useState<number>(0);
  const [blendMode, setBlendMode] = useState<"mip" | "average">("mip");
  const [activeTool, setActiveTool] = useState<string>("Crosshairs");
  const [implants, setImplants] = useState<ImplantData[]>([]);
  const [aiProtocolLog, setAiProtocolLog] = useState<string>("");

  useEffect(() => {
    async function init() {
      // 1. Initialize cornerstone core
      await cornerstone.init();
      // 2. Initialize cornerstone tools
      await cornerstoneTools.init();

      // 3. Initialize DICOM image loader
      cornerstoneDICOMImageLoader.init({
        maxWebWorkers: navigator.hardwareConcurrency ? Math.min(navigator.hardwareConcurrency, 7) : 1,
      });

      setIsInitialized(true);
    }
    
    if (!isInitialized) {
      init();
    }

    return () => {
      // Hardcore performance cleanup!
      cornerstone.cache.purgeCache();
    };
  }, [isInitialized]);

  useEffect(() => {
    if (!isInitialized || !imageIds.length) return;

    async function loadAndRender() {
      const vId = "my-volume";
      setVolumeId(vId);
      const renderingEngineId = "my-engine";

      const renderingEngine = new cornerstone.RenderingEngine(renderingEngineId);

      const viewportIds = {
        axial: "AXIAL",
        sagittal: "SAGITTAL",
        coronal: "CORONAL",
      };

      const viewportInputArray = [
        {
          viewportId: viewportIds.axial,
          type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
          element: axialRef.current as HTMLDivElement,
          defaultOptions: {
            orientation: cornerstone.Enums.OrientationAxis.AXIAL,
            background: [0, 0, 0] as cornerstone.Types.Point3,
          },
        },
        {
          viewportId: viewportIds.sagittal,
          type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
          element: sagittalRef.current as HTMLDivElement,
          defaultOptions: {
            orientation: cornerstone.Enums.OrientationAxis.SAGITTAL,
            background: [0, 0, 0] as cornerstone.Types.Point3,
          },
        },
        {
          viewportId: viewportIds.coronal,
          type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
          element: coronalRef.current as HTMLDivElement,
          defaultOptions: {
            orientation: cornerstone.Enums.OrientationAxis.CORONAL,
            background: [0, 0, 0] as cornerstone.Types.Point3,
          },
        },
      ];

      renderingEngine.setViewports(viewportInputArray);

      // Define a volume in memory
      const volume = await cornerstone.volumeLoader.createAndCacheVolume(vId, {
        imageIds,
      });

      // Load the volume (decodes pixel data)
      volume.load();

      await cornerstone.setVolumesForViewports(
        renderingEngine,
        [{ volumeId: vId }],
        [viewportIds.axial, viewportIds.sagittal, viewportIds.coronal]
      );

      // Add crosshairs tool
      const toolGroupId = "mpr-tool-group";
      let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
      if (!toolGroup) {
        toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId)!;
      }
      
      cornerstoneTools.addTool(cornerstoneTools.CrosshairsTool);
      toolGroup.addTool(cornerstoneTools.CrosshairsTool.toolName);
      
      // We must configure crosshairs before setting active
      const crosshairsConfig = {
        viewportIndicators: false,
        autoPan: {
          enabled: false,
        },
        mobile: {
          enabled: true,
          opacity: 1,
          handleRadius: 6,
        },
      };
      toolGroup.setToolConfiguration(cornerstoneTools.CrosshairsTool.toolName, crosshairsConfig);
      
      toolGroup.setToolActive(cornerstoneTools.CrosshairsTool.toolName, {
        bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
      });

      // Also add WindowLevel on right click
      cornerstoneTools.addTool(cornerstoneTools.WindowLevelTool);
      toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName);
      toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
        bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
      });
      
      // Also add Zoom on Wheel
      cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
      toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
      toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
        bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
      });

      // Advanced Dental Tools
      cornerstoneTools.addTool(cornerstoneTools.SplineROITool);
      toolGroup.addTool(cornerstoneTools.SplineROITool.toolName);

      cornerstoneTools.addTool(cornerstoneTools.EllipticalROITool);
      toolGroup.addTool(cornerstoneTools.EllipticalROITool.toolName);

      cornerstoneTools.addTool(cornerstoneTools.ProbeTool);
      toolGroup.addTool(cornerstoneTools.ProbeTool.toolName);

      toolGroup.addViewport(viewportIds.axial, renderingEngineId);
      toolGroup.addViewport(viewportIds.sagittal, renderingEngineId);
      toolGroup.addViewport(viewportIds.coronal, renderingEngineId);

      // Force render
      renderingEngine.renderViewports([viewportIds.axial, viewportIds.sagittal, viewportIds.coronal]);
    }

    loadAndRender();

    return () => {
      cornerstone.getRenderingEngine("my-engine")?.destroy();
      cornerstoneTools.ToolGroupManager.destroyToolGroup("mpr-tool-group");
    };
  }, [isInitialized, imageIds]);

  const handleGeneratePanorex = () => {
    // In a real app, we'd query the cornerstoneTools state for SplineROITool annotations
    // const state = cornerstoneTools.annotation.state.getAnnotations(cornerstoneTools.SplineROITool.toolName, element);
    // Let's simulate we got some points
    setSplinePoints([{ x: 100, y: 100 }, { x: 200, y: 150 }, { x: 300, y: 100 }]);
    setShowPanorex(true);
  };

  const setTool = (toolName: string) => {
    const toolGroupId = "mpr-tool-group";
    const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
    if (!toolGroup) return;
    
    // Disable previous
    toolGroup.setToolDisabled(activeTool);
    // Enable new
    toolGroup.setToolActive(toolName, {
      bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
    });
    setActiveTool(toolName);
  };

  const simulateImplantPlacement = () => {
    // 1. We mock the physical placing in 3D world space (DICOM coords)
    const implantStart = vec3.fromValues(10, 20, -50);
    const implantEnd = vec3.fromValues(10, 20, -60); // 10mm length
    
    // 2. We mock nerve spline
    const nerveSpline = [
      vec3.fromValues(10, 22, -62),
      vec3.fromValues(12, 24, -65)
    ];

    // 3. Collision Detection Math
    const distToNerve = distancePointToSpline(implantEnd, nerveSpline);
    
    // 4. Bone Density Math (Mocking scalarData since we'd normally get it from volume)
    const classification = "D2"; 
    const avgHu = 650;

    const newImplant: ImplantData = {
      id: Math.random().toString(36).substring(7),
      fdiCode: "36",
      diameter: 4.0,
      length: 10.0,
      startWorld: implantStart,
      endWorld: implantEnd,
      boneDensity: { averageHU: avgHu, classification },
      distanceToNerve: distToNerve
    };

    setImplants([...implants, newImplant]);

    // AI AUTO-PROTOCOL GENERATION
    const logStr = `В область зуба ${newImplant.fdiCode} запланирована установка имплантата ${newImplant.diameter.toFixed(1)}x${newImplant.length.toFixed(1)} мм. Плотность кости по HU соответствует типу ${newImplant.boneDensity.classification} (${newImplant.boneDensity.averageHU} HU). Дистанция до нижнечелюстного канала ${newImplant.distanceToNerve.toFixed(1)} мм.`;
    
    setAiProtocolLog(logStr);

    // [OBLIQUE SNAP SIMULATION] 
    // In a full implementation, we'd do:
    // const D = vec3.sub(implantEnd, implantStart);
    // const N = vec3.normalize(D);
    // renderingEngine.getViewport('SAGITTAL').setCamera({ viewUp: N });
    // renderingEngine.render();
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '600px', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0a0a', color: '#fff', position: 'relative', fontFamily: 'sans-serif' }}>
      
      {/* KICKASS GLASSMORPHISM TOOLBAR */}
      <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 20, display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '4px', gap: '4px' }}>
          <button 
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.2s', backgroundColor: activeTool === cornerstoneTools.CrosshairsTool.toolName ? '#2563eb' : 'transparent', color: activeTool === cornerstoneTools.CrosshairsTool.toolName ? '#fff' : '#d4d4d8' }}
            onClick={() => setTool(cornerstoneTools.CrosshairsTool.toolName)}
          >
            MPR (Oblique)
          </button>
          <button 
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.2s', backgroundColor: activeTool === cornerstoneTools.SplineROITool.toolName ? '#2563eb' : 'transparent', color: activeTool === cornerstoneTools.SplineROITool.toolName ? '#fff' : '#d4d4d8' }}
            onClick={() => setTool(cornerstoneTools.SplineROITool.toolName)}
          >
            Дуга (Spline)
          </button>
          <button 
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.2s', backgroundColor: activeTool === cornerstoneTools.ProbeTool.toolName ? '#2563eb' : 'transparent', color: activeTool === cornerstoneTools.ProbeTool.toolName ? '#fff' : '#d4d4d8' }}
            onClick={() => setTool(cornerstoneTools.ProbeTool.toolName)}
          >
            Probe (HU)
          </button>
          <button 
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.2s', backgroundColor: activeTool === 'Implant' ? '#4f46e5' : 'transparent', color: activeTool === 'Implant' ? '#fff' : '#d4d4d8' }}
            onClick={simulateImplantPlacement}
          >
            Implant (+Log)
          </button>
        </div>

        <div style={{ width: '1px', height: '32px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 4px' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <span style={{ color: '#a3a3a3' }}>Толщина (ОПТГ):</span>
          <input 
            type="range" min="0" max="20" step="1" 
            value={panorexThickness} 
            onChange={(e) => setPanorexThickness(Number(e.target.value))}
            style={{ width: '96px', cursor: 'pointer' }}
          />
          <span style={{ width: '24px', textAlign: 'right' }}>{panorexThickness}mm</span>
        </div>

        <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '4px', gap: '4px', marginLeft: '4px' }}>
          <button 
            style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: panorexThickness === 0 ? 'not-allowed' : 'pointer', border: 'none', opacity: panorexThickness === 0 ? 0.5 : 1, transition: 'all 0.2s', backgroundColor: blendMode === 'mip' ? '#525252' : 'transparent', color: blendMode === 'mip' ? '#fff' : '#a3a3a3' }}
            onClick={() => setBlendMode("mip")}
            disabled={panorexThickness === 0}
          >
            MIP
          </button>
          <button 
            style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: panorexThickness === 0 ? 'not-allowed' : 'pointer', border: 'none', opacity: panorexThickness === 0 ? 0.5 : 1, transition: 'all 0.2s', backgroundColor: blendMode === 'average' ? '#525252' : 'transparent', color: blendMode === 'average' ? '#fff' : '#a3a3a3' }}
            onClick={() => setBlendMode("average")}
            disabled={panorexThickness === 0}
          >
            AVG
          </button>
        </div>

        <button 
          style={{ marginLeft: '8px', background: 'linear-gradient(to right, #2563eb, #4f46e5)', color: '#fff', padding: '8px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 0 15px rgba(79,70,229,0.5)', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
          onClick={handleGeneratePanorex}
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          Развернуть
        </button>
      </div>

      {showPanorex && volumeId && (
        <PanoramicRendererWindow 
          volumeId={volumeId} 
          splinePoints={splinePoints} 
          onClose={() => setShowPanorex(false)}
          thickness={panorexThickness}
          blendMode={blendMode}
        />
      )}

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '2px', backgroundColor: '#262626', padding: '2px' }}>
        <div style={{ position: 'relative', backgroundColor: '#000' }}>
          <div style={{ position: 'absolute', top: '8px', left: '8px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', color: '#f87171', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.05em', zIndex: 10 }}>AXIAL</div>
          <div ref={axialRef} style={{ width: '100%', height: '100%' }} onContextMenu={e => e.preventDefault()} />
        </div>
        <div style={{ position: 'relative', backgroundColor: '#000' }}>
          <div style={{ position: 'absolute', top: '8px', left: '8px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', color: '#4ade80', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.05em', zIndex: 10 }}>SAGITTAL</div>
          <div ref={sagittalRef} style={{ width: '100%', height: '100%' }} onContextMenu={e => e.preventDefault()} />
        </div>
        <div style={{ position: 'relative', backgroundColor: '#000' }}>
          <div style={{ position: 'absolute', top: '8px', left: '8px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', color: '#60a5fa', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.05em', zIndex: 10 }}>CORONAL</div>
          <div ref={coronalRef} style={{ width: '100%', height: '100%' }} onContextMenu={e => e.preventDefault()} />
        </div>
        <div style={{ position: 'relative', backgroundColor: '#171717', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ color: '#737373', fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>Surgical Module Logs</div>
          
          {aiProtocolLog && implants.length > 0 && (
            <div style={{ width: '100%', maxWidth: '384px', padding: '16px', borderRadius: '12px', border: '1px solid', backgroundColor: (implants[implants.length-1]?.distanceToNerve ?? Infinity) < 2.0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)', borderColor: (implants[implants.length-1]?.distanceToNerve ?? Infinity) < 2.0 ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)', color: (implants[implants.length-1]?.distanceToNerve ?? Infinity) < 2.0 ? '#fecaca' : '#dcfce7' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                AI Auto-Protocol
              </div>
              <p style={{ fontSize: '12px', lineHeight: 1.5 }}>{aiProtocolLog}</p>
              {(implants[implants.length-1]?.distanceToNerve ?? Infinity) < 2.0 && (
                <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 'bold', color: '#f87171' }}>
                  ⚠️ КРИТИЧЕСКАЯ БЛИЗОСТЬ К НЕРВУ!
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
