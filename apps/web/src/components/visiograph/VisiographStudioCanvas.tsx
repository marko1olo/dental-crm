/**
 * VisiographStudioCanvas.tsx
 * Full-featured interactive HTML5 Canvas / WebGL 2D Visiograph & PACS Studio (Mandates 8b, 8d, 8e, 8n).
 */

import { useState } from "react";
import { DEFAULT_VISIOGRAPH_IMAGE_PARAMS, type VisiographImageParams } from "./VisiographImageProcessor";
import { type CalibrationReference, DEFAULT_PIXEL_SCALE_MM, type AngleMeasurement, type PeriapicalLesion, type Point2D, type RulerMeasurement } from "./VisiographMeasurementMath";
import { handleToolCanvasClick, handleToolCanvasDoubleClick } from "./VisiographToolInteractions";
import { VisiographExportModal } from "./VisiographExportModal";
import { VisiographTopToolbar } from "./VisiographTopToolbar";
import { VisiographLesionsHud } from "./VisiographLesionsHud";
import {
	type ActiveVisiographTool,
	type SensorCalibrationPreset,
	type VisiographStudioCanvasProps,
	STANDARD_SENSOR_PRESETS,
	recalculateLesionsWithScale,
	recalculateRulersWithScale,
} from "./VisiographStudioTypes";
import { useVisiographCanvasState } from "./useVisiographCanvasState";
import { VisiographStudioSidebar } from "./VisiographStudioSidebar";
import { VisiographStudioViewport } from "./VisiographStudioViewport";
import { useVisiographStudioActions } from "./useVisiographStudioActions";

export type { SensorCalibrationPreset, ActiveVisiographTool, VisiographStudioCanvasProps };
export { STANDARD_SENSOR_PRESETS, recalculateRulersWithScale, recalculateLesionsWithScale };

export function VisiographStudioCanvas(props: VisiographStudioCanvasProps) {
	const { imageUrl, patientId = "pat_unknown", patientFullName = "Пациент ДЕНТЕ", toothCode = null, studyId, doctorName = "Врач-рентгенолог ДЕНТЕ", initialTool = "pointer", onSaveToRecord, onClose } = props;
	const [params, setParams] = useState<VisiographImageParams>({ ...DEFAULT_VISIOGRAPH_IMAGE_PARAMS });
	const [activeClinicalFilter, setActiveClinicalFilter] = useState<string | null>(null);
	const [activeTool, setActiveTool] = useState<ActiveVisiographTool>(initialTool);
	const [activeSensorPresetId, setActiveSensorPresetId] = useState<string | null>(null);
	const [calibration, setCalibration] = useState<CalibrationReference>({
		type: "sphere_5mm", p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 }, knownLengthMm: 5.0, pixelDistance: 100, scaleMmPerPixel: DEFAULT_PIXEL_SCALE_MM,
	});
	const [isCalibrated, setIsCalibrated] = useState(false);
	const [rulers, setRulers] = useState<RulerMeasurement[]>([]);
	const [angles, setAngles] = useState<AngleMeasurement[]>([]);
	const [lesions, setLesions] = useState<PeriapicalLesion[]>([]);
	const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
	const [canvasRotationDeg, setCanvasRotationDeg] = useState<number>(0);
	const [drawingPoints, setDrawingPoints] = useState<Point2D[]>([]);
	const [hoverPos, setHoverPos] = useState<Point2D | null>(null);
	const [showExportModal, setShowExportModal] = useState(false);
	const [currentToothCode, setCurrentToothCode] = useState<string>(toothCode || "16");

	const { canvasRef, getCanvasPoint, handleMouseMove, handleMouseLeave } = useVisiographCanvasState({
		imageUrl, params, rulers, angles, lesions, calibration, isCalibrated, activeTool, drawingPoints, hoverPos, setHoverPos,
	});

	const { handleApplySensorPreset, handleResetParams, handleApplyClinicalFilter, handlePrintProtocol, handleAttachToVisit } = useVisiographStudioActions({
		canvasRef, patientId, patientFullName, doctorName, studyId, toothCode, rulers, angles, lesions, calibration, isCalibrated,
		activeClinicalFilter, setParams, setActiveClinicalFilter, setActiveSensorPresetId, setIsCalibrated, setCalibration, setRulers, setLesions, onSaveToRecord,
	});

	const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		handleToolCanvasClick({
			pt: getCanvasPoint(e), activeTool, drawingPoints, calibration, calibRefType: "sphere_5mm", customMmInput: 5.0,
			toothCode, rulersCount: rulers.length, anglesCount: angles.length, setDrawingPoints, setRulers, setAngles, setLesions, setCalibration, setIsCalibrated, setActiveTool,
		});
	};

	return (
		<div className="visiograph-studio-container" style={{ display: "flex", flexDirection: "column", background: "var(--paper, #0d1117)", color: "var(--ink, #c9d1d9)", borderRadius: "12px", border: "1px solid var(--line, #30363d)", overflow: "hidden", minHeight: "580px" }}>
			<VisiographTopToolbar
				activeTool={activeTool} setActiveTool={setActiveTool} onClearDrawing={() => setDrawingPoints([])} params={params} setParams={setParams}
				activeClinicalFilter={activeClinicalFilter} onApplyClinicalFilter={handleApplyClinicalFilter} canvasZoom={canvasZoom} setCanvasZoom={setCanvasZoom}
				setCanvasRotationDeg={setCanvasRotationDeg} sensorPresets={STANDARD_SENSOR_PRESETS} activeSensorPresetId={activeSensorPresetId}
				isCalibrated={isCalibrated} onApplySensorPreset={handleApplySensorPreset} onResetAll={() => { handleResetParams(); setCanvasZoom(1.0); setCanvasRotationDeg(0); }}
				onPrintProtocol={handlePrintProtocol} onOpenExportModal={() => setShowExportModal(true)} onClose={onClose} toothCode={currentToothCode}
				onToothChange={setCurrentToothCode} onAttachToVisit={handleAttachToVisit}
			/>
			<div style={{ display: "flex", flex: 1, minHeight: "480px", position: "relative" }}>
				<VisiographStudioSidebar
					params={params} setParams={setParams} onResetParams={handleResetParams} setActiveClinicalFilter={setActiveClinicalFilter}
					isCalibrated={isCalibrated} calibration={calibration} activeTool={activeTool} activeSensorPresetId={activeSensorPresetId}
					onApplySensorPreset={handleApplySensorPreset} onStartManualCalibration={() => { setActiveSensorPresetId(null); setActiveTool("calibrate"); setDrawingPoints([]); }}
					rulersCount={rulers.length} anglesCount={angles.length} lesionsCount={lesions.length} onClearAllMeasurements={() => { setRulers([]); setAngles([]); setLesions([]); }}
				/>
				<VisiographStudioViewport
					canvasRef={canvasRef} canvasZoom={canvasZoom} setCanvasZoom={setCanvasZoom} canvasRotationDeg={canvasRotationDeg} activeTool={activeTool}
					onCanvasClick={onCanvasClick} onCanvasDoubleClick={() => handleToolCanvasDoubleClick({ activeTool, drawingPoints, calibration, toothCode, setDrawingPoints, setRulers, setLesions })}
					onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
				/>
				<VisiographLesionsHud lesions={lesions} />
			</div>
			<VisiographExportModal
				isOpen={showExportModal} onClose={() => setShowExportModal(false)} canvasRef={canvasRef} patientId={patientId} patientFullName={patientFullName}
				doctorName={doctorName} studyId={studyId} toothCode={toothCode} rulers={rulers} angles={angles} lesions={lesions} calibration={calibration}
				isCalibrated={isCalibrated} onSaveToRecord={onSaveToRecord} onPrintProtocol={handlePrintProtocol}
			/>
		</div>
	);
}
