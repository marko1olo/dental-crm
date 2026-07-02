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
    <div className="w-full h-full flex flex-col bg-neutral-950 text-white relative font-sans">
      
      {/* KICKASS GLASSMORPHISM TOOLBAR */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-2xl shadow-2xl">
        <div className="flex bg-black/40 rounded-xl p-1 gap-1">
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTool === cornerstoneTools.CrosshairsTool.toolName ? 'bg-blue-600 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/10'}`}
            onClick={() => setTool(cornerstoneTools.CrosshairsTool.toolName)}
          >
            MPR (Oblique)
          </button>
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTool === cornerstoneTools.SplineROITool.toolName ? 'bg-blue-600 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/10'}`}
            onClick={() => setTool(cornerstoneTools.SplineROITool.toolName)}
          >
            Дуга (Spline)
          </button>
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTool === cornerstoneTools.ProbeTool.toolName ? 'bg-blue-600 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/10'}`}
            onClick={() => setTool(cornerstoneTools.ProbeTool.toolName)}
          >
            Probe (HU)
          </button>
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTool === 'Implant' ? 'bg-indigo-600 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/10'}`}
            onClick={simulateImplantPlacement}
          >
            Implant (+Log)
          </button>
        </div>

        <div className="w-px h-8 bg-white/20 mx-1"></div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400">Толщина (ОПТГ):</span>
          <input 
            type="range" min="0" max="20" step="1" 
            value={panorexThickness} 
            onChange={(e) => setPanorexThickness(Number(e.target.value))}
            className="w-24 accent-blue-500"
          />
          <span className="w-6 text-right">{panorexThickness}mm</span>
        </div>

        <div className="flex bg-black/40 rounded-xl p-1 gap-1 ml-1">
          <button 
            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${blendMode === 'mip' ? 'bg-neutral-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/10'}`}
            onClick={() => setBlendMode("mip")}
            disabled={panorexThickness === 0}
          >
            MIP
          </button>
          <button 
            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${blendMode === 'average' ? 'bg-neutral-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/10'}`}
            onClick={() => setBlendMode("average")}
            disabled={panorexThickness === 0}
          >
            AVG
          </button>
        </div>

        <button 
          className="ml-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
          onClick={handleGeneratePanorex}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
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

      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-[1px] bg-neutral-800 p-[1px]">
        <div className="relative bg-black group">
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/50 backdrop-blur text-[10px] font-bold text-red-400 tracking-wider z-10 opacity-70 group-hover:opacity-100 transition-opacity">AXIAL</div>
          <div ref={axialRef} className="w-full h-full" onContextMenu={e => e.preventDefault()} />
        </div>
        <div className="relative bg-black group">
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/50 backdrop-blur text-[10px] font-bold text-green-400 tracking-wider z-10 opacity-70 group-hover:opacity-100 transition-opacity">SAGITTAL</div>
          <div ref={sagittalRef} className="w-full h-full" onContextMenu={e => e.preventDefault()} />
        </div>
        <div className="relative bg-black group">
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/50 backdrop-blur text-[10px] font-bold text-blue-400 tracking-wider z-10 opacity-70 group-hover:opacity-100 transition-opacity">CORONAL</div>
          <div ref={coronalRef} className="w-full h-full" onContextMenu={e => e.preventDefault()} />
        </div>
        <div className="relative bg-neutral-900 flex flex-col items-center justify-center p-4">
          <div className="text-neutral-500 text-sm font-medium mb-4">Surgical Module Logs</div>
          
          {aiProtocolLog && implants.length > 0 && (
            <div className={`w-full max-w-sm p-4 rounded-xl border backdrop-blur-sm ${
              (implants[implants.length-1]?.distanceToNerve ?? Infinity) < 2.0 
              ? 'bg-red-500/20 border-red-500/50 text-red-100' 
              : 'bg-green-500/20 border-green-500/50 text-green-100'
            }`}>
              <div className="font-bold mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                AI Auto-Protocol
              </div>
              <p className="text-xs leading-relaxed">{aiProtocolLog}</p>
              {(implants[implants.length-1]?.distanceToNerve ?? Infinity) < 2.0 && (
                <div className="mt-2 text-xs font-bold text-red-400">
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
