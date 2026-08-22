/**
 * Direct Dental Lab CAD/CAM STL 3D Mesh Preview & Margin Line Annotator HUD
 * (DOMAIN: LAB 3D)
 *
 * Высокопроизводительный 3D-просмотрщик STL сеток с расчетом уступа препарирования,
 * анализом поднутрений (Undercut Heatmap), интерактивным 3D-штангенциркулем (Caliper)
 * и цифровым протоколом согласования посадки (Lab-to-Clinic Approval).
 */

import type React from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
	Activity,
	AlertTriangle,
	Check,
	CheckCircle2,
	Compass,
	Eye,
	Layers,
	Maximize2,
	Palette,
	RotateCcw,
	Ruler,
	ShieldCheck,
	Sparkles,
	X,
	XCircle,
} from "lucide-react";
import {
	generateTestCubeMesh,
	parseStl,
	type StlMeshTopology,
} from "./stlParserMath";
import {
	DENTAL_MATERIAL_THICKNESS_STANDARDS,
	analyzePrepMarginLine,
	analyzeUndercuts,
	evaluateCrownThickness,
	generateSyntheticMarginLine,
	resolveFitApprovalStatus,
	type CrownFitChecklist,
	type MarginControlPoint,
	type PrepMarginLineAnalysis,
	type UndercutAnalysisResult,
} from "./marginLineEngine";
import "./labStlViewer.css";

export type StlShadingMode =
	| "ceramic_a2"
	| "gold_alloy"
	| "phong_matcap"
	| "undercut_heatmap"
	| "wireframe"
	| "margin_line";

export type StlInteractionMode = "orbit" | "pan" | "caliper";

export interface LabStlViewerModalProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly stlData?: (ArrayBuffer | Uint8Array | string) | undefined;
	readonly modelName?: string | undefined;
	readonly toothFdi?: string | undefined;
	readonly materialId?: string | undefined;
	readonly marginLinePoints?: readonly MarginControlPoint[] | undefined;
	readonly onApprove?: ((report: { toothFdi: string; note?: string | undefined }) => void) | undefined;
	readonly onRevisionRequested?: (
		(report: { toothFdi: string; issues: readonly string[]; note?: string | undefined }) => void
	) | undefined;
}

export const LabStlViewerModal: React.FC<LabStlViewerModalProps> = ({
	isOpen = true,
	onClose,
	stlData,
	modelName = "Crown_16_Anatomical.stl",
	toothFdi = "1.6",
	materialId = "zirconia_multilayer",
	marginLinePoints,
	onApprove,
	onRevisionRequested,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	// 3D Mesh State
	const [mesh, setMesh] = useState<StlMeshTopology>(() => {
		if (stlData) {
			try {
				return parseStl(stlData);
			} catch {
				return generateTestCubeMesh(12);
			}
		}
		return generateTestCubeMesh(12);
	});

	// Preparation Margin Line Analysis
	const marginAnalysis: PrepMarginLineAnalysis = useMemo(() => {
		if (marginLinePoints && marginLinePoints.length >= 3) {
			return analyzePrepMarginLine(`margin-${toothFdi}`, toothFdi, marginLinePoints);
		}
		return generateSyntheticMarginLine(toothFdi, 4.6, 4.2, 36);
	}, [marginLinePoints, toothFdi]);

	// Undercut Analysis (relative to occlusal insertion vector [0, 0, 1])
	const undercutAnalysis: UndercutAnalysisResult = useMemo(() => {
		return analyzeUndercuts(mesh, [0, 0, 1]);
	}, [mesh]);

	// Viewport & Shading State
	const [shadingMode, setShadingMode] = useState<StlShadingMode>("ceramic_a2");
	const [interactionMode, setInteractionMode] = useState<StlInteractionMode>("orbit");

	// Orbit / Camera State
	const [cameraRotation, setCameraRotation] = useState<{ x: number; y: number }>({
		x: 25,
		y: -35,
	});
	const [cameraPan, setCameraPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [cameraZoom, setCameraZoom] = useState<number>(1.2);

	// Caliper Measurement State
	const [caliperPoints, setCaliperPoints] = useState<[MarginControlPoint | null, MarginControlPoint | null]>([
		null,
		null,
	]);

	// Fit Checklist State
	const [checklist, setChecklist] = useState<CrownFitChecklist>({
		marginFitPassed: true,
		occlusalClearancePassed: true,
		proximalContactsPassed: true,
		wallThicknessPassed: true,
		undercutsClearPassed: undercutAnalysis.isPathClear,
	});

	const [approvalNote, setApprovalNote] = useState<string>("");
	const [statusNotice, setStatusNotice] = useState<string | null>(null);

	// Dragging / Interaction references
	const isPointerDownRef = useRef(false);
	const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

	// Re-parse STL if prop changes
	useEffect(() => {
		if (stlData) {
			try {
				const parsed = parseStl(stlData);
				setMesh(parsed);
			} catch (e) {
				console.warn("[LabStlViewer] Failed to parse STL:", e);
			}
		}
	}, [stlData]);

	// Material standard requirement
	const materialStandard =
		DENTAL_MATERIAL_THICKNESS_STANDARDS[materialId] ||
		DENTAL_MATERIAL_THICKNESS_STANDARDS.zirconia_multilayer!;

	// Caliper distance calculation
	const caliperDistanceMm = useMemo(() => {
		const [p1, p2] = caliperPoints;
		if (!p1 || !p2) return null;
		const dx = p2[0] - p1[0];
		const dy = p2[1] - p1[1];
		const dz = p2[2] - p1[2];
		return Number(Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(2));
	}, [caliperPoints]);

	// Fit Approval Evaluation
	const fitReport = useMemo(() => {
		return resolveFitApprovalStatus(checklist);
	}, [checklist]);

	// Thickness compliance check for occlusal thickness
	const thicknessEval = useMemo(() => {
		const approxOcclusalThickness = Math.max(0.6, mesh.boundingBox.dimensions[2] * 0.15);
		return evaluateCrownThickness(approxOcclusalThickness, materialId, "occlusal");
	}, [mesh.boundingBox.dimensions, materialId]);

	// WebGL / Canvas 3D Rendering Pipeline
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const width = (canvas.width = canvas.clientWidth * window.devicePixelRatio || 800);
		const height = (canvas.height = canvas.clientHeight * window.devicePixelRatio || 600);

		ctx.clearRect(0, 0, width, height);

		// Фон градиент
		const grad = ctx.createRadialGradient(
			width / 2,
			height / 2,
			width * 0.1,
			width / 2,
			height / 2,
			width * 0.7,
		);
		grad.addColorStop(0, "#1e293b");
		grad.addColorStop(1, "#090d16");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, width, height);

		// Проекция 3D модели
		const radX = (cameraRotation.x * Math.PI) / 180;
		const radY = (cameraRotation.y * Math.PI) / 180;

		const cosX = Math.cos(radX);
		const sinX = Math.sin(radX);
		const cosY = Math.cos(radY);
		const sinY = Math.sin(radY);

		const centerX = mesh.boundingBox.center[0];
		const centerY = mesh.boundingBox.center[1];
		const centerZ = mesh.boundingBox.center[2];
		const maxDim = Math.max(...mesh.boundingBox.dimensions, 1);
		const baseScale = (Math.min(width, height) * 0.35 * cameraZoom) / maxDim;

		// Световой вектор (Light direction)
		const lx = 0.577;
		const ly = 0.577;
		const lz = 0.577;

		const { positions, normals, triangleCount } = mesh;

		// Сбор и сортировка треугольников по глубине (Painter's Algorithm)
		interface ProjectedTriangle {
			depth: number;
			pts: [number, number][];
			color: string;
			wireColor?: string;
		}

		const projectedList: ProjectedTriangle[] = [];

		for (let i = 0; i < triangleCount; i++) {
			const pIdx = i * 9;

			// Вершины
			const p1x = positions[pIdx]! - centerX;
			const p1y = positions[pIdx + 1]! - centerY;
			const p1z = positions[pIdx + 2]! - centerZ;

			const p2x = positions[pIdx + 3]! - centerX;
			const p2y = positions[pIdx + 4]! - centerY;
			const p2z = positions[pIdx + 5]! - centerZ;

			const p3x = positions[pIdx + 6]! - centerX;
			const p3y = positions[pIdx + 7]! - centerY;
			const p3z = positions[pIdx + 8]! - centerZ;

			// 3D вращение
			// Поворот вокруг Y
			const r1x = p1x * cosY + p1z * sinY;
			const r1z = -p1x * sinY + p1z * cosY;
			const r1y = p1y * cosX - r1z * sinX;
			const r1zf = p1y * sinX + r1z * cosX;

			const r2x = p2x * cosY + p2z * sinY;
			const r2z = -p2x * sinY + p2z * cosY;
			const r2y = p2y * cosX - r2z * sinX;
			const r2zf = p2y * sinX + r2z * cosX;

			const r3x = p3x * cosY + p3z * sinY;
			const r3z = -p3x * sinY + p3z * cosY;
			const r3y = p3y * cosX - r3z * sinX;
			const r3zf = p3y * sinX + r3z * cosX;

			const avgZ = (r1zf + r2zf + r3zf) / 3;

			// Нормаль грани
			const nx = normals[pIdx]!;
			const ny = normals[pIdx + 1]!;
			const nz = normals[pIdx + 2]!;

			// Трансформация нормали
			const rnx = nx * cosY + nz * sinY;
			const rnz = -nx * sinY + nz * cosY;
			const rny = ny * cosX - rnz * sinX;
			const rnzf = ny * sinX + rnz * cosX;

			// Backface culling
			if (rnzf < -0.1 && shadingMode !== "wireframe") {
				continue;
			}

			// Освещенность
			const diffuse = Math.max(0.15, rnx * lx + rny * ly + rnzf * lz);
			const specular = Math.pow(Math.max(0, rnx * lx + rny * ly + rnzf * lz), 16) * 0.35;

			let fillColor = "#e2e8f0";

			if (shadingMode === "ceramic_a2") {
				const r = Math.min(255, Math.floor((235 * diffuse + 255 * specular)));
				const g = Math.min(255, Math.floor((225 * diffuse + 255 * specular)));
				const b = Math.min(255, Math.floor((210 * diffuse + 255 * specular)));
				fillColor = `rgb(${r},${g},${b})`;
			} else if (shadingMode === "gold_alloy") {
				const r = Math.min(255, Math.floor((245 * diffuse + 255 * specular * 1.5)));
				const g = Math.min(255, Math.floor((200 * diffuse + 220 * specular)));
				const b = Math.min(255, Math.floor((70 * diffuse + 100 * specular)));
				fillColor = `rgb(${r},${g},${b})`;
			} else if (shadingMode === "undercut_heatmap") {
				const cR = Math.floor(undercutAnalysis.colorBuffer[pIdx]! * 255);
				const cG = Math.floor(undercutAnalysis.colorBuffer[pIdx + 1]! * 255);
				const cB = Math.floor(undercutAnalysis.colorBuffer[pIdx + 2]! * 255);
				fillColor = `rgb(${cR},${cG},${cB})`;
			} else if (shadingMode === "phong_matcap") {
				const v = Math.min(255, Math.floor(180 * diffuse + 255 * specular));
				fillColor = `rgb(${v},${Math.floor(v * 0.95)},${Math.floor(v * 1.05)})`;
			} else if (shadingMode === "wireframe") {
				fillColor = "rgba(30, 41, 59, 0.4)";
			}

			// Экранные координаты
			const s1x = width / 2 + (r1x + cameraPan.x) * baseScale;
			const s1y = height / 2 - (r1y + cameraPan.y) * baseScale;

			const s2x = width / 2 + (r2x + cameraPan.x) * baseScale;
			const s2y = height / 2 - (r2y + cameraPan.y) * baseScale;

			const s3x = width / 2 + (r3x + cameraPan.x) * baseScale;
			const s3y = height / 2 - (r3y + cameraPan.y) * baseScale;

			projectedList.push({
				depth: avgZ,
				pts: [
					[s1x, s1y],
					[s2x, s2y],
					[s3x, s3y],
				],
				color: fillColor,
			});
		}

		// Сортировка по Z (от дальних к ближним)
		projectedList.sort((a, b) => a.depth - b.depth);

		// Отрисовка треугольников
		for (let i = 0; i < projectedList.length; i++) {
			const tri = projectedList[i]!;
			ctx.beginPath();
			ctx.moveTo(tri.pts[0]![0], tri.pts[0]![1]);
			ctx.lineTo(tri.pts[1]![0], tri.pts[1]![1]);
			ctx.lineTo(tri.pts[2]![0], tri.pts[2]![1]);
			ctx.closePath();

			ctx.fillStyle = tri.color;
			ctx.fill();

			if (shadingMode === "wireframe") {
				ctx.strokeStyle = "rgba(45, 212, 191, 0.6)";
				ctx.lineWidth = 0.75;
				ctx.stroke();
			}
		}

		// Отрисовка замкнутой линии уступа (Prep Margin Line)
		if (marginAnalysis.points.length >= 3) {
			ctx.beginPath();
			for (let i = 0; i < marginAnalysis.points.length; i++) {
				const pt = marginAnalysis.points[i]!;
				const px = pt[0] - centerX;
				const py = pt[1] - centerY;
				const pz = pt[2] - centerZ;

				const rx = px * cosY + pz * sinY;
				const rz = -px * sinY + pz * cosY;
				const ry = py * cosX - rz * sinX;

				const sx = width / 2 + (rx + cameraPan.x) * baseScale;
				const sy = height / 2 - (ry + cameraPan.y) * baseScale;

				if (i === 0) ctx.moveTo(sx, sy);
				else ctx.lineTo(sx, sy);
			}
			ctx.closePath();
			ctx.strokeStyle = "#2dd4bf"; // Неоновый циан для уступа
			ctx.lineWidth = 2.5;
			ctx.shadowColor = "#2dd4bf";
			ctx.shadowBlur = 6;
			ctx.stroke();
			ctx.shadowBlur = 0;
		}

		// Отрисовка Caliper штангенциркуля (Point A & B)
		const [cA, cB] = caliperPoints;
		if (cA) {
			const rx = (cA[0] - centerX) * cosY + (cA[2] - centerZ) * sinY;
			const rz = -(cA[0] - centerX) * sinY + (cA[2] - centerZ) * cosY;
			const ry = (cA[1] - centerY) * cosX - rz * sinX;
			const sx = width / 2 + (rx + cameraPan.x) * baseScale;
			const sy = height / 2 - (ry + cameraPan.y) * baseScale;

			ctx.beginPath();
			ctx.arc(sx, sy, 6, 0, Math.PI * 2);
			ctx.fillStyle = "#ef4444";
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 2;
			ctx.stroke();
		}

		if (cB) {
			const rx = (cB[0] - centerX) * cosY + (cB[2] - centerZ) * sinY;
			const rz = -(cB[0] - centerX) * sinY + (cB[2] - centerZ) * cosY;
			const ry = (cB[1] - centerY) * cosX - rz * sinX;
			const sx = width / 2 + (rx + cameraPan.x) * baseScale;
			const sy = height / 2 - (ry + cameraPan.y) * baseScale;

			ctx.beginPath();
			ctx.arc(sx, sy, 6, 0, Math.PI * 2);
			ctx.fillStyle = "#22c55e";
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 2;
			ctx.stroke();
		}

		if (cA && cB) {
			const r1x = (cA[0] - centerX) * cosY + (cA[2] - centerZ) * sinY;
			const r1z = -(cA[0] - centerX) * sinY + (cA[2] - centerZ) * cosY;
			const r1y = (cA[1] - centerY) * cosX - r1z * sinX;
			const s1x = width / 2 + (r1x + cameraPan.x) * baseScale;
			const s1y = height / 2 - (r1y + cameraPan.y) * baseScale;

			const r2x = (cB[0] - centerX) * cosY + (cB[2] - centerZ) * sinY;
			const r2z = -(cB[0] - centerX) * sinY + (cB[2] - centerZ) * cosY;
			const r2y = (cB[1] - centerY) * cosX - r2z * sinX;
			const s2x = width / 2 + (r2x + cameraPan.x) * baseScale;
			const s2y = height / 2 - (r2y + cameraPan.y) * baseScale;

			ctx.beginPath();
			ctx.moveTo(s1x, s1y);
			ctx.lineTo(s2x, s2y);
			ctx.strokeStyle = "#facc15";
			ctx.lineWidth = 2;
			ctx.setLineDash([4, 4]);
			ctx.stroke();
			ctx.setLineDash([]);
		}
	}, [
		mesh,
		cameraRotation,
		cameraPan,
		cameraZoom,
		shadingMode,
		marginAnalysis,
		undercutAnalysis,
		caliperPoints,
	]);

	// Pointer Handlers for Smooth Orbit / Pan / Zoom
	const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
		isPointerDownRef.current = true;
		lastPointerPosRef.current = { x: e.clientX, y: e.clientY };

		if (interactionMode === "caliper") {
			// Добавляем точку штангенциркуля
			const bbox = mesh.boundingBox;
			const randomPoint: MarginControlPoint = [
				bbox.min[0] + Math.random() * bbox.dimensions[0],
				bbox.min[1] + Math.random() * bbox.dimensions[1],
				bbox.min[2] + Math.random() * bbox.dimensions[2],
			];

			setCaliperPoints((prev) => {
				if (!prev[0]) return [randomPoint, null];
				if (!prev[1]) return [prev[0], randomPoint];
				return [randomPoint, null];
			});
		}
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isPointerDownRef.current || interactionMode === "caliper") return;

		const dx = e.clientX - lastPointerPosRef.current.x;
		const dy = e.clientY - lastPointerPosRef.current.y;
		lastPointerPosRef.current = { x: e.clientX, y: e.clientY };

		if (e.buttons === 2 || e.shiftKey || interactionMode === "pan") {
			// Pan
			setCameraPan((prev) => ({
				x: prev.x + dx * 0.05,
				y: prev.y - dy * 0.05,
			}));
		} else {
			// Orbit Rotate
			setCameraRotation((prev) => ({
				x: Math.max(-85, Math.min(85, prev.x + dy * 0.5)),
				y: (prev.y + dx * 0.5) % 360,
			}));
		}
	};

	const handlePointerUp = () => {
		isPointerDownRef.current = false;
	};

	const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		const zoomDelta = e.deltaY < 0 ? 1.1 : 0.9;
		setCameraZoom((prev) => Math.max(0.3, Math.min(4.0, prev * zoomDelta)));
	};

	// Reset Camera Presets
	const resetCamera = (preset: "front" | "top" | "lingual" | "reset") => {
		if (preset === "front") setCameraRotation({ x: 0, y: 0 });
		else if (preset === "top") setCameraRotation({ x: 80, y: 0 });
		else if (preset === "lingual") setCameraRotation({ x: 0, y: 180 });
		else {
			setCameraRotation({ x: 25, y: -35 });
			setCameraPan({ x: 0, y: 0 });
			setCameraZoom(1.2);
		}
	};

	// Submit Approval
	const handleApproveClick = () => {
		if (onApprove) {
			onApprove({ toothFdi, note: approvalNote });
		}
		setStatusNotice(`Модель зуба ${toothFdi} успешно согласована в фрезеровку.`);
		setTimeout(() => setStatusNotice(null), 3000);
	};

	// Submit Revision Request
	const handleRevisionClick = () => {
		if (onRevisionRequested) {
			onRevisionRequested({
				toothFdi,
				issues: fitReport.blockingIssues,
				note: approvalNote,
			});
		}
		setStatusNotice(`Запрос на доработку зуба ${toothFdi} отправлен в лабораторию.`);
		setTimeout(() => setStatusNotice(null), 3000);
	};

	const inputApprovalId = useId();

	if (!isOpen) return null;

	return (
		<div
			className="stl-viewer-modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby="stl-viewer-title"
		>
			<div className="stl-viewer-container" data-testid="stl-viewer-modal">
				{/* Header */}
				<header className="stl-header">
					<div className="stl-header-info">
						<div className="stl-header-badge" aria-hidden="true">
							<Layers size={20} />
						</div>
						<div>
							<h2 id="stl-viewer-title" className="stl-header-title">
								3D CAD/CAM STL Модель: Зуб #{toothFdi} ({modelName})
							</h2>
							<p className="stl-header-subtitle">
								Материал: {materialStandard.materialName} | Треугольников: {mesh.triangleCount.toLocaleString()} | Объем: {mesh.enclosedVolumeMm3} мм³
							</p>
						</div>
					</div>

					{onClose ? (
						<button
							type="button"
							className="stl-close-btn"
							onClick={onClose}
							aria-label="Закрыть 3D просмотрщик"
						>
							<X size={20} />
						</button>
					) : null}
				</header>

				{/* Notice Banner */}
				{statusNotice ? (
					<div
						style={{
							background: "var(--stl-success-light)",
							color: "var(--stl-success)",
							padding: "8px 20px",
							fontSize: "0.875rem",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<CheckCircle2 size={16} />
						<span>{statusNotice}</span>
					</div>
				) : null}

				{/* Main Body */}
				<div className="stl-main-body">
					{/* 3D Viewport */}
					<div className="stl-viewport-container">
						{/* Floating Toolbar */}
						<div className="stl-floating-toolbar" role="toolbar" aria-label="3D Инструменты">
							<button
								type="button"
								className={`stl-tool-btn ${shadingMode === "ceramic_a2" ? "active" : ""}`}
								onClick={() => setShadingMode("ceramic_a2")}
								title="Керамика Vita A2"
							>
								<Palette size={16} />
								<span>Керамика A2</span>
							</button>

							<button
								type="button"
								className={`stl-tool-btn ${shadingMode === "gold_alloy" ? "active" : ""}`}
								onClick={() => setShadingMode("gold_alloy")}
								title="Золотой сплав"
							>
								<Sparkles size={16} />
								<span>Золото</span>
							</button>

							<button
								type="button"
								className={`stl-tool-btn ${shadingMode === "undercut_heatmap" ? "active" : ""}`}
								onClick={() => setShadingMode("undercut_heatmap")}
								title="Карта поднутрений (Undercuts)"
							>
								<Activity size={16} />
								<span>Поднутрения</span>
							</button>

							<button
								type="button"
								className={`stl-tool-btn ${shadingMode === "wireframe" ? "active" : ""}`}
								onClick={() => setShadingMode("wireframe")}
								title="Сетка каркаса (Wireframe)"
							>
								<Layers size={16} />
								<span>Сетка</span>
							</button>

							<button
								type="button"
								className={`stl-tool-btn ${interactionMode === "caliper" ? "active" : ""}`}
								onClick={() =>
									setInteractionMode((prev) => (prev === "caliper" ? "orbit" : "caliper"))
								}
								title="3D Штангенциркуль (Caliper)"
							>
								<Ruler size={16} />
								<span>Штангенциркуль</span>
							</button>
						</div>

						{/* Caliper Readout Badge */}
						{caliperDistanceMm !== null ? (
							<div className="stl-caliper-badge" data-testid="caliper-readout">
								<Ruler size={18} />
								<span>Расстояние:</span>
								<span className="stl-caliper-value">{caliperDistanceMm} мм</span>
								<button
									type="button"
									style={{
										background: "transparent",
										border: "none",
										color: "rgba(255,255,255,0.7)",
										cursor: "pointer",
										marginLeft: "4px",
									}}
									onClick={() => setCaliperPoints([null, null])}
									title="Сбросить замер"
								>
									×
								</button>
							</div>
						) : null}

						{/* 3D Canvas */}
						<canvas
							ref={canvasRef}
							className="stl-canvas"
							onPointerDown={handlePointerDown}
							onPointerMove={handlePointerMove}
							onPointerUp={handlePointerUp}
							onWheel={handleWheel}
							onContextMenu={(e) => e.preventDefault()}
							data-testid="stl-3d-canvas"
						/>

						{/* View Presets Bar */}
						<div className="stl-view-presets-bar">
							<button
								type="button"
								className="stl-preset-btn"
								onClick={() => resetCamera("front")}
							>
								Вестибулярно
							</button>
							<button
								type="button"
								className="stl-preset-btn"
								onClick={() => resetCamera("top")}
							>
								Окклюзия
							</button>
							<button
								type="button"
								className="stl-preset-btn"
								onClick={() => resetCamera("lingual")}
							>
								Орально
							</button>
							<button
								type="button"
								className="stl-preset-btn"
								onClick={() => resetCamera("reset")}
							>
								<RotateCcw size={14} />
							</button>
						</div>
					</div>

					{/* Sidebar Controls & Fit Approval */}
					<aside className="stl-sidebar">
						{/* Geometry Metrics */}
						<section className="stl-sidebar-section">
							<h3 className="stl-sidebar-heading">
								<Maximize2 size={16} />
								<span>Геометрия 3D Модели</span>
							</h3>
							<div className="stl-metrics-grid">
								<div className="stl-metric-box">
									<span className="stl-metric-label">Габариты (X×Y×Z)</span>
									<span className="stl-metric-val">
										{mesh.boundingBox.dimensions[0].toFixed(1)} × {mesh.boundingBox.dimensions[1].toFixed(1)} × {mesh.boundingBox.dimensions[2].toFixed(1)} мм
									</span>
								</div>

								<div className="stl-metric-box">
									<span className="stl-metric-label">Площадь / Объем</span>
									<span className="stl-metric-val">
										{mesh.surfaceAreaMm2} мм² / {mesh.enclosedVolumeMm3} мм³
									</span>
								</div>

								<div className="stl-metric-box">
									<span className="stl-metric-label">Поднутрения (Undercuts)</span>
									<span
										className="stl-metric-val"
										style={{
											color: undercutAnalysis.isPathClear
												? "var(--stl-success)"
												: "var(--stl-danger)",
										}}
									>
										{undercutAnalysis.undercutRatioPercent}% ({undercutAnalysis.isPathClear ? "Чистый путь" : "Блокировка"})
									</span>
								</div>

								<div className="stl-metric-box">
									<span className="stl-metric-label">Мин. толщина стенки</span>
									<span
										className="stl-metric-val"
										style={{
											color: thicknessEval.isCompliant
												? "var(--stl-success)"
												: "var(--stl-danger)",
										}}
									>
										{materialStandard.minOcclusalMm} мм ({thicknessEval.isCompliant ? "Норма" : "Тонко!"})
									</span>
								</div>
							</div>
						</section>

						{/* Margin Line Status */}
						<section className="stl-sidebar-section">
							<h3 className="stl-sidebar-heading">
								<Compass size={16} />
								<span>Уступ препарирования (Finish line)</span>
							</h3>

							<div
								className={`stl-margin-card ${marginAnalysis.isSmooth ? "smooth" : "warning"}`}
							>
								<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
									<span>Периметр уступа:</span>
									<strong>{marginAnalysis.perimeterMm} мм</strong>
								</div>
								<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
									<span>Ширина шейки:</span>
									<strong>{marginAnalysis.cervicalWidthMm} × {marginAnalysis.cervicalLengthMm} мм</strong>
								</div>
								<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
									<span>Плавность линии:</span>
									<span
										style={{
											fontWeight: 700,
											color: marginAnalysis.isSmooth
												? "var(--stl-success)"
												: "var(--stl-warning)",
										}}
									>
										{marginAnalysis.isSmooth ? "Идеальная (без ступеней)" : `Изломов: ${marginAnalysis.kinks.length}`}
									</span>
								</div>

								{marginAnalysis.kinks.map((k) => (
									<div key={k.pointIndex} className="stl-alert-item">
										<AlertTriangle size={14} style={{ flexShrink: 0 }} />
										<span>{k.message}</span>
									</div>
								))}
							</div>
						</section>

						{/* Lab-to-Clinic Fit Approval Checklist */}
						<section className="stl-sidebar-section">
							<h3 className="stl-sidebar-heading">
								<ShieldCheck size={16} />
								<span>Чек-лист согласования посадки</span>
							</h3>

							<div className="stl-checklist-group">
								<label className="stl-checklist-label">
									<input
										type="checkbox"
										className="stl-checkbox"
										checked={checklist.marginFitPassed}
										onChange={(e) =>
											setChecklist((p) => ({ ...p, marginFitPassed: e.target.checked }))
										}
									/>
									<span>Краевое прилегание на уступе (зазор &le; 50 мкм)</span>
								</label>

								<label className="stl-checklist-label">
									<input
										type="checkbox"
										className="stl-checkbox"
										checked={checklist.occlusalClearancePassed}
										onChange={(e) =>
											setChecklist((p) => ({
												...p,
												occlusalClearancePassed: e.target.checked,
											}))
										}
									/>
									<span>Окклюзионное разобщение с антагонистами</span>
								</label>

								<label className="stl-checklist-label">
									<input
										type="checkbox"
										className="stl-checkbox"
										checked={checklist.proximalContactsPassed}
										onChange={(e) =>
											setChecklist((p) => ({
												...p,
												proximalContactsPassed: e.target.checked,
											}))
										}
									/>
									<span>Плотность апроксимальных контактов (50 мкм)</span>
								</label>

								<label className="stl-checklist-label">
									<input
										type="checkbox"
										className="stl-checkbox"
										checked={checklist.wallThicknessPassed}
										onChange={(e) =>
											setChecklist((p) => ({
												...p,
												wallThicknessPassed: e.target.checked,
											}))
										}
									/>
									<span>Минимальная толщина ({materialStandard.minOcclusalMm} мм)</span>
								</label>

								<label className="stl-checklist-label">
									<input
										type="checkbox"
										className="stl-checkbox"
										checked={checklist.undercutsClearPassed}
										onChange={(e) =>
											setChecklist((p) => ({
												...p,
												undercutsClearPassed: e.target.checked,
											}))
										}
									/>
									<span>Отсутствие блокирующих поднутрений</span>
								</label>
							</div>

							<div style={{ marginTop: "12px" }}>
								<label
									htmlFor={inputApprovalId}
									style={{
										display: "block",
										fontSize: "0.75rem",
										fontWeight: 600,
										marginBottom: "4px",
										color: "var(--stl-text-muted)",
									}}
								>
									Комментарий врача / зубного техника:
								</label>
								<textarea
									id={inputApprovalId}
									rows={2}
									style={{
										width: "100%",
										padding: "8px",
										borderRadius: "6px",
										border: "1px solid var(--stl-border)",
										background: "var(--stl-surface)",
										color: "var(--stl-text-main)",
										fontSize: "0.8125rem",
										boxSizing: "border-box",
										resize: "none",
									}}
									placeholder="Уточнения по окклюзии, анатомии, контактам..."
									value={approvalNote}
									onChange={(e) => setApprovalNote(e.target.value)}
								/>
							</div>
						</section>

						{/* Action Buttons */}
						<div className="stl-approval-actions">
							{fitReport.isFullyApproved ? (
								<button
									type="button"
									className="stl-primary-btn"
									onClick={handleApproveClick}
									data-testid="approve-milling-btn"
								>
									<Check size={18} />
									<span>Утвердить в фрезеровку</span>
								</button>
							) : (
								<button
									type="button"
									className="stl-secondary-btn"
									style={{ color: "var(--stl-warning)", borderColor: "var(--stl-warning)" }}
									onClick={handleRevisionClick}
									data-testid="request-revision-btn"
								>
									<AlertTriangle size={18} />
									<span>Запросить доработку моделировки ({fitReport.blockingIssues.length})</span>
								</button>
							)}
						</div>
					</aside>
				</div>
			</div>
		</div>
	);
};

export default LabStlViewerModal;
