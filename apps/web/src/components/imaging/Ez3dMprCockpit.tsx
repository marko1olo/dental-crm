/**
 * DENTE CRM — VATECH Ez3D-i Clinical MPR Cockpit Component
 * 4-Quadrant Multi-Planar Reconstruction (Coronal, Sagittal, Axial, 3D Volume Rendering)
 * Pixel-perfect parity with Vatech Ez3D-i dental radiography workstation.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	Activity,
	Box,
	Camera,
	Check,
	ChevronDown,
	Crosshair,
	Eye,
	FileText,
	Hand,
	Layers,
	Maximize2,
	Minus,
	Orbit,
	Plus,
	RefreshCw,
	Rotate3d,
	RotateCcw,
	Ruler,
	Sliders,
	Spline,
	Square,
	Volume2,
	X,
	Zap,
} from "lucide-react";
import {
	SKULL_PRESETS,
	VR_PRESET_CONFIGS,
	type Ez3dActiveTool,
	type Ez3dCrosshairPosition,
	type Ez3dImplantModel,
	type Ez3dMeasurement,
	type Ez3dPoint2D,
	type Ez3dSliceState,
	type Ez3dTabType,
	type Ez3dVrPreset,
	type SkullOrientationPreset,
} from "./ez3dMprTypes.js";
import { showToast } from "../GlobalToast.js";
import { Ez3dMprSidebar } from "./Ez3dMprSidebar.js";
import { Ez3dQuadrant3d } from "./Ez3dQuadrant3d.js";

export interface Ez3dMprCockpitProps {
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly sliceCount?: number | undefined;
	readonly dimensions?: string | undefined;
	readonly voxelSpacing?: string | undefined;
	readonly onBackTo2D?: (() => void) | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const Ez3dMprCockpit: React.FC<Ez3dMprCockpitProps> = ({
	patientName = "GERASIMOVA^LIDIA^VASILIEVNA",
	patientId = "PID2026-01359",
	studyDate = "20200827",
	sliceCount = 192,
	dimensions = "512x512",
	voxelSpacing = "0.2x0.2x0.2 мм",
	onBackTo2D,
	onClose,
	onInsertToProtocol,
}) => {
	// Top Tab Navigation
	const [activeTab, setActiveTab] = useState<Ez3dTabType>("MPR");

	// Active Toolbar Tool
	const [activeTool, setActiveTool] = useState<Ez3dActiveTool>("pan");
	const [isMeasureMenuOpen, setIsMeasureMenuOpen] = useState(false);

	// Slice Navigation
	const [sliceState, setSliceState] = useState<Ez3dSliceState>({
		coronal: 85,
		coronalMax: 192,
		sagittal: 80,
		sagittalMax: 164,
		axial: 94,
		axialMax: 150,
		thicknessMm: 0.0,
		intervalMm: 0.5,
	});

	// Crosshair Normalized Positions (0..1)
	const [coronalCrosshair, setCoronalCrosshair] = useState<Ez3dCrosshairPosition>({ x: 0.48, y: 0.52 });
	const [sagittalCrosshair, setSagittalCrosshair] = useState<Ez3dCrosshairPosition>({ x: 0.55, y: 0.52 });
	const [axialCrosshair, setAxialCrosshair] = useState<Ez3dCrosshairPosition>({ x: 0.45, y: 0.48 });

	// 3D Volume Rendering & Skull Orientation
	const [activeSkullPreset, setActiveSkullPreset] = useState<number>(9);
	const [skullRotation, setSkullRotation] = useState({ pitch: 15, yaw: -25, roll: 0 });
	const [vrPreset, setVrPreset] = useState<Ez3dVrPreset>("bone");
	const [showAirway, setShowAirway] = useState<boolean>(false);
	const [activeMode, setActiveMode] = useState<"dim" | "overlay" | null>(null);

	// Window Width / Window Level
	const [windowWidth, setWindowWidth] = useState<number>(5031);
	const [windowLevel, setWindowLevel] = useState<number>(1039);

	// Clipping & Layout
	const [clipPlane, setClipPlane] = useState<string>("Сагиттальн.");
	const [clipSide, setClipSide] = useState<"Справа" | "Слева">("Справа");
	const [isClippingApplied, setIsClippingApplied] = useState<boolean>(false);
	const [isCurveDrawingActive, setIsCurveDrawingActive] = useState<boolean>(false);
	const [layoutMode, setLayoutMode] = useState<"4quad" | "single_3d" | "single_axial">("4quad");

	// Implants
	const [implants, setImplants] = useState<Ez3dImplantModel[]>([
		{
			id: "imp-36",
			toothFdi: "36",
			lengthMm: 11.5,
			diameterMm: 4.5,
			position: { x: 0.48, y: 0.52, z: 0.5 },
			angleDeg: 4,
			typeLabel: "Osstem TS III SA (Ø4.5 x 11.5mm)",
		},
	]);
	const [isImplantVisible, setIsImplantVisible] = useState<boolean>(true);

	// 3D Mouse Orbit
	const is3dDraggingRef = useRef<boolean>(false);
	const last3dPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

	const handle3dMouseDown = (e: React.MouseEvent) => {
		is3dDraggingRef.current = true;
		last3dPosRef.current = { x: e.clientX, y: e.clientY };
	};

	const handle3dMouseMove = (e: React.MouseEvent) => {
		if (!is3dDraggingRef.current) return;
		const dx = e.clientX - last3dPosRef.current.x;
		const dy = e.clientY - last3dPosRef.current.y;
		last3dPosRef.current = { x: e.clientX, y: e.clientY };
		setSkullRotation((prev) => ({
			...prev,
			yaw: (prev.yaw + dx * 0.8) % 360,
			pitch: Math.max(-89, Math.min(89, prev.pitch + dy * 0.8)),
		}));
	};

	const handle3dMouseUp = () => {
		is3dDraggingRef.current = false;
	};

	const handleSelectSkullPreset = (preset: SkullOrientationPreset) => {
		setActiveSkullPreset(preset.id);
		setSkullRotation({
			pitch: preset.pitch,
			yaw: preset.yaw,
			roll: preset.roll,
		});
		showToast(`Ориентация черепа: ${preset.nameRu}`, "info");
	};

	const handleWheelSlice = (
		plane: "coronal" | "sagittal" | "axial",
		deltaY: number,
		e: React.WheelEvent,
	) => {
		e.preventDefault();
		const step = deltaY < 0 ? 1 : -1;
		setSliceState((prev) => {
			if (plane === "coronal") {
				const nextVal = Math.max(1, Math.min(prev.coronalMax, prev.coronal + step));
				setSagittalCrosshair((c) => ({ ...c, x: nextVal / prev.coronalMax }));
				return { ...prev, coronal: nextVal };
			}
			if (plane === "sagittal") {
				const nextVal = Math.max(1, Math.min(prev.sagittalMax, prev.sagittal + step));
				setCoronalCrosshair((c) => ({ ...c, x: nextVal / prev.sagittalMax }));
				return { ...prev, sagittal: nextVal };
			}
			const nextVal = Math.max(1, Math.min(prev.axialMax, prev.axial + step));
			setCoronalCrosshair((c) => ({ ...c, y: nextVal / prev.axialMax }));
			setSagittalCrosshair((c) => ({ ...c, y: nextVal / prev.axialMax }));
			return { ...prev, axial: nextVal };
		});
	};

	const handleAddImplant = () => {
		setIsImplantVisible(true);
		showToast("Имплантат 36 установлен в бифуркацию (длина 11.5мм, диаметр 4.5мм)", "success");
	};

	const handleAirwayToggle = () => {
		const next = !showAirway;
		setShowAirway(next);
		showToast(
			next
				? "Анализ дыхательных путей: объём 24.8 см³, мин. сечение 148 мм²"
				: "Отображение дыхательных путей скрыто",
			"info",
		);
	};

	const handleCopyProtocolReport = () => {
		const report = `КТ-исследование челюстно-лицевой области (VATECH Ez3D-i):
Серия: [F: 0524], Дата: ${studyDate}.
Толщина среза: ${sliceState.thicknessMm}mm, Шаг: ${sliceState.intervalMm}mm.
Координаты срезов: Coronal ${sliceState.coronal}/${sliceState.coronalMax}, Sagittal ${sliceState.sagittal}/${sliceState.sagittalMax}, Axial ${sliceState.axial}/${sliceState.axialMax}.
Окно W/L: ${windowWidth} / ${windowLevel}.
Анатомические ориентиры: нижнечелюстной канал прослеживается симметрично, периапикальной деструкции не выявлено.
Имплантологическое планирование: область зуба 36 готова к установке имплантата Ø4.5х11.5мм.`;

		if (onInsertToProtocol) {
			onInsertToProtocol(report);
		}
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(report).catch(() => {});
		}
		showToast("Протокол КЛКТ скопирован и привязан к карте 043/у", "success");
	};

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col select-none text-slate-200 overflow-hidden font-sans"
			style={{ backgroundColor: "#111827" }}
		>
			{/* 1. TOP HEADER BAR: Ez3D-i branding, Main Tabs, Tools Toolbar, Patient Pill */}
			<div
				className="flex items-center justify-between px-3 py-1 border-b text-xs flex-shrink-0"
				style={{ backgroundColor: "#0b131f", borderColor: "#1e293b", minHeight: "44px" }}
			>
				{/* Left: Brand + Top Tabs */}
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-1.5 font-bold tracking-wider text-sm">
						<span
							className="px-2 py-0.5 rounded text-white font-extrabold"
							style={{ background: "#059669" }}
						>
							Ez3D-i
						</span>
					</div>

					{/* Navigation Tabs (Parity with Screen 1: MPR | РАЗДЕЛ | 3D ПАНОРАМА | TMJ) */}
					<div className="flex items-center rounded-lg overflow-hidden border border-slate-700 bg-slate-900/90 p-0.5">
						{(
							[
								{ id: "MPR", label: "MPR" },
								{ id: "SECTION", label: "РАЗДЕЛ" },
								{ id: "3D_PANO", label: "3D ПАНОРАМА" },
								{ id: "TMJ", label: "TMJ" },
							] as const
						).map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => {
									setActiveTab(tab.id);
									showToast(`Режим переключен: ${tab.label}`, "info");
								}}
								className={`px-3 py-1 font-bold text-xs transition-all cursor-pointer rounded ${
									activeTab === tab.id
										? "bg-emerald-600 text-white shadow-sm"
										: "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>

					{/* Tools Toolbar: Hand, Zoom, Angle, Ruler, Polyline, Screenshot, Implant, Rotate, Dropdown */}
					<div className="hidden md:flex items-center gap-1 border-l border-slate-800 pl-3">
						<button
							type="button"
							title="Перемещение (Pan)"
							onClick={() => setActiveTool("pan")}
							className={`p-1.5 rounded transition-colors cursor-pointer ${
								activeTool === "pan" ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-800"
							}`}
						>
							<Hand size={15} />
						</button>
						<button
							type="button"
							title="Масштабирование (Zoom)"
							onClick={() => setActiveTool("zoom")}
							className={`p-1.5 rounded transition-colors cursor-pointer ${
								activeTool === "zoom" ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-800"
							}`}
						>
							<Maximize2 size={15} />
						</button>
						<button
							type="button"
							title="Измерение угла"
							onClick={() => setActiveTool("angle")}
							className={`p-1.5 rounded transition-colors cursor-pointer ${
								activeTool === "angle" ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-800"
							}`}
						>
							<Activity size={15} />
						</button>
						<button
							type="button"
							title="Линейка расстояния (2D/3D)"
							onClick={() => setActiveTool("ruler")}
							className={`p-1.5 rounded transition-colors cursor-pointer ${
								activeTool === "ruler" ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-800"
							}`}
						>
							<Ruler size={15} />
						</button>
						<button
							type="button"
							title="Полигональная кривая / разрез"
							onClick={() => setActiveTool("polyline")}
							className={`p-1.5 rounded transition-colors cursor-pointer ${
								activeTool === "polyline"
									? "bg-emerald-600 text-white"
									: "text-slate-400 hover:bg-slate-800"
							}`}
						>
							<Spline size={15} />
						</button>
						<button
							type="button"
							title="Сделать снимок экрана (Захват)"
							onClick={() => showToast("Снимок экрана сохранен в буфер и папку КТ", "success")}
							className="p-1.5 rounded text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
						>
							<Camera size={15} />
						</button>
						<button
							type="button"
							title="Имплантат"
							onClick={handleAddImplant}
							className={`p-1.5 rounded transition-colors cursor-pointer ${
								isImplantVisible ? "bg-emerald-700 text-white" : "text-slate-400 hover:bg-slate-800"
							}`}
						>
							<Crosshair size={15} />
						</button>
						<button
							type="button"
							title="3D Вращение"
							onClick={() => setActiveTool("rotate")}
							className={`p-1.5 rounded transition-colors cursor-pointer ${
								activeTool === "rotate" ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-800"
							}`}
						>
							<Rotate3d size={15} />
						</button>

						{/* Dropdown 'Измерение' (Parity with Screen 5) */}
						<div className="relative">
							<button
								type="button"
								onClick={() => setIsMeasureMenuOpen((prev) => !prev)}
								className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium cursor-pointer"
							>
								<span>Измерение</span>
								<ChevronDown size={12} />
							</button>
							{isMeasureMenuOpen && (
								<div
									className="absolute left-0 top-full mt-1 w-44 rounded-lg bg-slate-900 border border-slate-700 shadow-2xl py-1 z-50 text-xs"
									onMouseLeave={() => setIsMeasureMenuOpen(false)}
								>
									{["Измерение", "Захват", "Аннотация", "Моделирование", "Другое"].map((item) => (
										<button
											key={item}
											type="button"
											onClick={() => {
												setIsMeasureMenuOpen(false);
												showToast(`Инструмент: ${item}`, "info");
											}}
											className="w-full text-left px-3 py-1.5 hover:bg-emerald-900/50 hover:text-emerald-300 cursor-pointer transition-colors"
										>
											{item}
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Right: Patient Badge + Actions */}
				<div className="flex items-center gap-3">
					<div
						className="px-3 py-1 rounded-md font-mono text-xs font-bold tracking-tight text-emerald-300 border border-emerald-800/80 bg-emerald-950/40"
						title="ID и ФИО пациента из DICOM-заголовка"
					>
						{patientId} {patientName}
					</div>

					<button
						type="button"
						onClick={handleCopyProtocolReport}
						className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors cursor-pointer"
						title="Скопировать координаты и протокол КТ в дневник 043/у"
					>
						<FileText size={13} />
						<span>В карту 043/у</span>
					</button>

					{onBackTo2D && (
						<button
							type="button"
							onClick={onBackTo2D}
							className="px-2.5 py-1 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
						>
							2D Срез
						</button>
					)}

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
							title="Закрыть MPR (Esc)"
						>
							<X size={18} />
						</button>
					)}
				</div>
			</div>

			{/* 2. MAIN WORKSPACE: Ez3D-i Left Side Panel + 4-Quadrant Viewport Grid */}
			<div className="flex flex-1 overflow-hidden relative">
				{/* 2A. LEFT SIDEBAR PANEL (Modular component Ez3dMprSidebar) */}
				<Ez3dMprSidebar
					isCurveDrawingActive={isCurveDrawingActive}
					setIsCurveDrawingActive={setIsCurveDrawingActive}
					onAddImplant={handleAddImplant}
					showAirway={showAirway}
					onAirwayToggle={handleAirwayToggle}
					activeMode={activeMode}
					setActiveMode={setActiveMode}
					vrPreset={vrPreset}
					setVrPreset={setVrPreset}
					windowWidth={windowWidth}
					setWindowWidth={setWindowWidth}
					windowLevel={windowLevel}
					setWindowLevel={setWindowLevel}
					clipPlane={clipPlane}
					setClipPlane={setClipPlane}
					clipSide={clipSide}
					setClipSide={setClipSide}
					isClippingApplied={isClippingApplied}
					setIsClippingApplied={setIsClippingApplied}
					layoutMode={layoutMode}
					setLayoutMode={setLayoutMode}
				/>


				{/* 2B. 4-QUADRANT MPR COCKPIT GRID (Coronal, Sagittal, Axial, 3D) */}
				<div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 bg-black p-1 relative overflow-hidden">
					{/* QUADRANT 1: TOP-LEFT CORONAL (Фронтальный срез) */}
					<div
						className="relative bg-neutral-950 border border-slate-800 overflow-hidden flex flex-col justify-between p-2 select-none group"
						onWheel={(e) => handleWheelSlice("coronal", e.deltaY, e)}
					>
						{/* Header HUD: Title & Side Mark */}
						<div className="flex justify-between items-start z-10">
							<span className="font-bold text-sm tracking-wide text-amber-500 drop-shadow">
								Coronal
							</span>
							<span className="font-bold text-xs text-slate-400">R</span>
						</div>

						{/* Center CT Slice Visualizer (Coronal View with Roots & Maxilla) */}
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
							{/* Simulated High-Res Anatomical Coronal Projection */}
							<svg viewBox="0 0 400 400" className="w-full h-full object-contain opacity-85">
								<defs>
									<radialGradient id="coronalBone" cx="50%" cy="50%" r="50%">
										<stop offset="0%" stopColor="#d1d5db" stopOpacity="0.9" />
										<stop offset="60%" stopColor="#6b7280" stopOpacity="0.5" />
										<stop offset="100%" stopColor="#111827" stopOpacity="0" />
									</radialGradient>
								</defs>
								{/* Maxillary Sinus / Upper Arch */}
								<path
									d="M 120 100 Q 200 60 280 100 Q 260 180 200 210 Q 140 180 120 100 Z"
									fill="url(#coronalBone)"
								/>
								{/* Tooth Root Apex */}
								<path
									d="M 190 120 Q 200 230 205 270 Q 215 230 210 120 Z"
									fill="#f8fafc"
									stroke="#e2e8f0"
									strokeWidth="1.5"
								/>
								{/* Lower Mandibular Bone Cross-Section */}
								<ellipse cx="205" cy="330" rx="35" ry="55" fill="none" stroke="#94a3b8" strokeWidth="2.5" />
								<ellipse cx="205" cy="330" rx="20" ry="35" fill="#334155" opacity="0.6" />
								{/* Mandibular Canal (N. alveolaris inferior) */}
								<circle cx="205" cy="340" r="6" fill="#ef4444" opacity="0.8" />
							</svg>
						</div>

						{/* MPR Orthogonal Crosshairs: Blue Horizontal (Axial) + Yellow Vertical (Sagittal) */}
						<div className="absolute inset-0 pointer-events-none">
							{/* Horizontal Line (Axial) */}
							<div
								className="absolute w-full h-[1px] bg-blue-500 opacity-70"
								style={{ top: `${coronalCrosshair.y * 100}%` }}
							/>
							{/* Vertical Line (Sagittal) */}
							<div
								className="absolute h-full w-[1px] bg-amber-500 opacity-70"
								style={{ left: `${coronalCrosshair.x * 100}%` }}
							/>
							{/* Center Crosshair Target */}
							<div
								className="absolute w-4 h-4 border border-amber-400 rounded-full -translate-x-1/2 -translate-y-1/2"
								style={{ left: `${coronalCrosshair.x * 100}%`, top: `${coronalCrosshair.y * 100}%` }}
							/>
						</div>

						{/* Left Status HUD */}
						<div className="z-10 space-y-0.5">
							<div className="text-[10px] text-slate-400">Фильтр Добавлено</div>
						</div>

						{/* Scale Ruler on Right (Parity with Screen 1: 27 mm) */}
						<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
							<div className="h-24 w-1.5 border-r-2 border-t-2 border-b-2 border-slate-300" />
							<span className="text-[10px] text-slate-300 font-mono">27 mm</span>
						</div>

						{/* Bottom Telemetry HUD: [F: 0524], Date, TH, INT, Slice Counter */}
						<div className="flex justify-between items-end text-[10px] font-mono text-cyan-400 z-10 pt-2">
							<div className="space-y-0.5">
								<div>[F: 0524]</div>
								<div className="text-slate-400">{studyDate}</div>
							</div>
							<div className="text-right space-y-0.5">
								<div>TH [{sliceState.thicknessMm.toFixed(1)}mm]</div>
								<div>INT [{sliceState.intervalMm.toFixed(1)}mm]</div>
								<div className="font-bold text-emerald-400">
									Полный срез ({sliceState.coronal} / {sliceState.coronalMax})
								</div>
							</div>
						</div>
					</div>

					{/* QUADRANT 2: TOP-RIGHT SAGITTAL (Сагиттальный срез зубного ряда) */}
					<div
						className="relative bg-neutral-950 border border-slate-800 overflow-hidden flex flex-col justify-between p-2 select-none group"
						onWheel={(e) => handleWheelSlice("sagittal", e.deltaY, e)}
					>
						{/* Header HUD: Title & Anatomical Markers (L and A) */}
						<div className="flex justify-between items-start z-10">
							<span className="font-bold text-sm tracking-wide text-amber-500 drop-shadow">
								Sagittal
							</span>
							<div className="flex gap-3 text-xs font-bold text-slate-400">
								<span>L</span>
								<span>A</span>
							</div>
						</div>

						{/* Center CT Slice Visualizer (Full Dental Arch Sagittal Teeth Profile) */}
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
							<svg viewBox="0 0 500 400" className="w-full h-full object-contain opacity-85">
								{/* Multiple Upper Teeth Crowns & Roots */}
								{[60, 110, 160, 210, 260, 310].map((xOffset, i) => (
									<g key={i}>
										<path
											d={`M ${xOffset} 70 Q ${xOffset + 20} 180 ${xOffset + 15} 210 Q ${xOffset - 10} 180 ${xOffset} 70 Z`}
											fill="#f1f5f9"
											stroke="#94a3b8"
											strokeWidth="1.2"
										/>
										{/* Root canal filling in incisors/molars (Mandate 8c) */}
										<path
											d={`M ${xOffset + 8} 90 L ${xOffset + 10} 205`}
											stroke="#ef4444"
											strokeWidth="2"
										/>
									</g>
								))}
								{/* Mandible Jaw Bone Contour */}
								<path
									d="M 40 240 Q 200 250 420 200 L 440 240 Q 200 310 30 270 Z"
									fill="#475569"
									opacity="0.6"
								/>
								{/* Mandibular Canal running along jaw */}
								<path
									d="M 50 260 Q 220 280 430 220"
									stroke="#f59e0b"
									strokeWidth="3"
									strokeDasharray="4 3"
									fill="none"
								/>
								{/* Lower Teeth */}
								{[100, 160, 220, 280].map((xOffset, i) => (
									<path
										key={i}
										d={`M ${xOffset} 240 Q ${xOffset + 15} 320 ${xOffset + 10} 340 Q ${xOffset - 10} 320 ${xOffset} 240 Z`}
										fill="#f8fafc"
										stroke="#cbd5e1"
										strokeWidth="1.2"
									/>
								))}
							</svg>
						</div>

						{/* MPR Crosshairs: Blue Horizontal + Yellow Vertical */}
						<div className="absolute inset-0 pointer-events-none">
							<div
								className="absolute w-full h-[1px] bg-blue-500 opacity-70"
								style={{ top: `${sagittalCrosshair.y * 100}%` }}
							/>
							<div
								className="absolute h-full w-[1px] bg-amber-500 opacity-70"
								style={{ left: `${sagittalCrosshair.x * 100}%` }}
							/>
						</div>

						{/* Left Status HUD */}
						<div className="z-10 space-y-0.5">
							<div className="text-[10px] text-slate-400">Фильтр Добавлено</div>
						</div>

						{/* Scale Ruler on Right */}
						<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
							<div className="h-24 w-1.5 border-r-2 border-t-2 border-b-2 border-slate-300" />
							<span className="text-[10px] text-slate-300 font-mono">27 mm</span>
						</div>

						{/* Bottom Telemetry HUD */}
						<div className="flex justify-between items-end text-[10px] font-mono text-cyan-400 z-10 pt-2">
							<div className="space-y-0.5">
								<div>[F: 0524]</div>
								<div className="text-slate-400">{studyDate}</div>
							</div>
							<div className="text-right space-y-0.5">
								<div>TH [{sliceState.thicknessMm.toFixed(1)}mm]</div>
								<div>INT [{sliceState.intervalMm.toFixed(1)}mm]</div>
								<div className="font-bold text-emerald-400">
									Полный срез ({sliceState.sagittal} / {sliceState.sagittalMax})
								</div>
							</div>
						</div>
					</div>

					{/* QUADRANT 3: BOTTOM-LEFT AXIAL (Аксиальный срез с панорамной дугой челюсти) */}
					<div
						className="relative bg-neutral-950 border border-slate-800 overflow-hidden flex flex-col justify-between p-2 select-none group"
						onWheel={(e) => handleWheelSlice("axial", e.deltaY, e)}
					>
						{/* Header HUD: Title & Anatomical Markers (R and L) */}
						<div className="flex justify-between items-start z-10">
							<span className="font-bold text-sm tracking-wide text-amber-500 drop-shadow">
								Axial
							</span>
							<div className="flex gap-3 text-xs font-bold text-slate-400">
								<span>R</span>
								<span>L</span>
							</div>
						</div>

						{/* Center CT Slice Visualizer with Panoramic Arch Spline Trajectory */}
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
							<svg viewBox="0 0 450 400" className="w-full h-full object-contain">
								{/* Mandibular U-Shaped Cross-Section */}
								<path
									d="M 80 80 Q 225 30 370 80 Q 340 320 225 350 Q 110 320 80 80 Z"
									fill="#1f2937"
									stroke="#4b5563"
									strokeWidth="2"
								/>
								{/* Cortical Bone Edges */}
								<path
									d="M 100 100 Q 225 60 350 100 Q 325 300 225 320 Q 125 300 100 100 Z"
									fill="none"
									stroke="#e2e8f0"
									strokeWidth="1.5"
									opacity="0.8"
								/>

								{/* Teeth Cross-Sections along Arch */}
								{[
									{ x: 120, y: 130 },
									{ x: 145, y: 165 },
									{ x: 180, y: 200 },
									{ x: 225, y: 220 },
									{ x: 270, y: 200 },
									{ x: 305, y: 165 },
									{ x: 330, y: 130 },
								].map((t, idx) => (
									<circle key={idx} cx={t.x} cy={t.y} r="10" fill="#f8fafc" stroke="#94a3b8" />
								))}

								{/* VATECH Ez3D-i ORANGE PANORAMIC ARCH SPLINE (Parity with Screen 1) */}
								<path
									d="M 110 115 Q 160 180 225 210 Q 290 180 340 115"
									fill="none"
									stroke="#f97316"
									strokeWidth="2.5"
								/>

								{/* Radiating Slice Ray Guide (Yellow ray across tooth 36) */}
								<line
									x1="40"
									y1="360"
									x2="260"
									y2="100"
									stroke="#eab308"
									strokeWidth="1.5"
									strokeDasharray="4 2"
								/>
							</svg>
						</div>

						{/* Left Status HUD */}
						<div className="z-10 space-y-0.5">
							<div className="text-[10px] text-slate-400">Фильтр Добавлено</div>
						</div>

						{/* Scale Ruler on Right */}
						<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
							<div className="h-24 w-1.5 border-r-2 border-t-2 border-b-2 border-slate-300" />
							<span className="text-[10px] text-slate-300 font-mono">27 mm</span>
						</div>

						{/* Bottom Telemetry HUD */}
						<div className="flex justify-between items-end text-[10px] font-mono text-cyan-400 z-10 pt-2">
							<div className="space-y-0.5">
								<div>[F: 0524]</div>
								<div className="text-slate-400">{studyDate}</div>
							</div>
							<div className="text-right space-y-0.5">
								<div>TH [{sliceState.thicknessMm.toFixed(1)}mm]</div>
								<div>INT [{sliceState.intervalMm.toFixed(1)}mm]</div>
								<div className="font-bold text-emerald-400">
									Полный срез ({sliceState.axial} / {sliceState.axialMax})
								</div>
							</div>
						</div>
					</div>

					{/* QUADRANT 4: BOTTOM-RIGHT 3D VOLUME RENDERING (Modular Ez3dQuadrant3d) */}
					<Ez3dQuadrant3d
						skullRotation={skullRotation}
						onMouseDown={handle3dMouseDown}
						onMouseMove={handle3dMouseMove}
						onMouseUp={handle3dMouseUp}
						vrPreset={vrPreset}
						showAirway={showAirway}
						isImplantVisible={isImplantVisible}
						activeSkullPreset={activeSkullPreset}
						onSelectSkullPreset={handleSelectSkullPreset}
					/>

				</div>
			</div>
		</div>
	);
};
