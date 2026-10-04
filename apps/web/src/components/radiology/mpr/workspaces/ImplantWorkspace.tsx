import React, { useState, useMemo } from "react";
import {
	Activity,
	AlertTriangle,
	Check,
	ChevronRight,
	ChevronDown,
	Sparkles,
	FileText,
	Receipt,
	ShieldAlert,
	ShieldCheck,
	Camera,
	Sliders,
	Grid2X2,
	RotateCcw,
	Layers,
	Crosshair,
} from "lucide-react";
import { DentalImplant, BoneDensityMisch } from "../../../icons/DentalIcons";
import type { WorkspaceCommonProps } from "./workspaceTypes";
import type { ImplantBrandKey } from "../../implantSafetyEngine";
import {
	getZakharovRidgeMeasurement,
	exportZakharovRidgeTo043Emr,
	buildZakharov043SoapProtocol,
	type ZakharovEdentulousToothFdi,
} from "../../zakharovRidgeAutomation";
import {
	CLINICAL_IMPLANT_BRANDS,
	STANDARD_CLINICAL_DIAMETERS,
	STANDARD_CLINICAL_LENGTHS,
	IMPLANT_PLATFORM_COLORS,
	type ClinicalImplantBrandKey,
	type ClinicalImplantSpec,
	type ClinicalImplantPose,
	findClinicalImplant,
	DEFAULT_IMPLANT_POSE,
} from "./implant/implantCatalog";
import { ImplantCrossSectionGrid } from "./implant/ImplantCrossSectionGrid";
import { measureCrossSectionRidgeWidths2_4_6 } from "../../cbctRidgeCaliperMath";

export interface ImplantWorkspaceProps extends WorkspaceCommonProps {
	readonly implantSubLayout?: "mpr_plus_plan" | "pano_plus_cross" | undefined;
}

const IMPLANT_BRANDS: readonly { key: ImplantBrandKey; label: string }[] = [
	{ key: "straumann", label: "Straumann" },
	{ key: "nobel_biocare", label: "Nobel Biocare" },
	{ key: "osstem", label: "Osstem" },
	{ key: "dentium", label: "Dentium" },
	{ key: "mis", label: "MIS" },
];

export const ImplantWorkspace: React.FC<ImplantWorkspaceProps> = ({
	volume,
	archCurve,
	renderers,
	maximizedViewport,
	mobileActiveTab,
	patientDisplayName,
	activeCrossSection,
	activeCrossSectionIdx = 0,
	crossSections = [],
	onChangeCrossSectionIdx,
	crossSectionStepMm = 2.0,
	onChangeCrossSectionStepMm,
	jawType = "mandible",
	handleSelectTooth,
	selectedBrand = "osstem",
	onSelectBrand,
	selectedDiameterMm = 4.0,
	onSelectDiameterMm,
	selectedLengthMm = 10.0,
	onSelectLengthMm,
	displayBoneClass = "D3",
	displayMeanHU = 480,
	displayTorque = "35 Н·см",
	displayNerveClearanceMm = 4.2,
	displayDrillingProtocol = "Сверление 800 об/мин",
	nerveSafetyStatus = "safe",
	handleExportToEmr,
	handleExportToPlan,
	implantEntryXOffsetMm,
	onChangeImplantEntryXOffsetMm,
	implantEntryDepthMm,
	onChangeImplantEntryDepthMm,
	implantAngulationDeg,
	onChangeImplantAngulationDeg,
	windowWidth = 4025,
	windowLevel = 525,
}) => {
	// Sub-layout view mode: Pano + Cross vs Pano + Multi-Slice Grid (1/2/3 mm) vs MPR 3D Grid
	const [viewMode, setViewMode] = useState<"mpr_mode" | "pano_cross_mode" | "pano_grid_mode">("pano_grid_mode");

	// Local fallback state if not controlled externally
	const [localXOffsetMm, setLocalXOffsetMm] = useState<number>(0.0);
	const [localDepthMm, setLocalDepthMm] = useState<number>(0.5);
	const [localAngulationDeg, setLocalAngulationDeg] = useState<number>(0.0);

	const currentXOffsetMm = implantEntryXOffsetMm !== undefined ? implantEntryXOffsetMm : localXOffsetMm;
	const currentDepthMm = implantEntryDepthMm !== undefined ? implantEntryDepthMm : localDepthMm;
	const currentAngulationDeg = implantAngulationDeg !== undefined ? implantAngulationDeg : localAngulationDeg;

	const handleUpdateXOffset = (val: number) => {
		const clamped = Math.max(-4.0, Math.min(4.0, Number(val.toFixed(1))));
		if (onChangeImplantEntryXOffsetMm) onChangeImplantEntryXOffsetMm(clamped);
		else setLocalXOffsetMm(clamped);
	};

	const handleUpdateDepth = (val: number) => {
		const clamped = Math.max(-2.0, Math.min(6.0, Number(val.toFixed(1))));
		if (onChangeImplantEntryDepthMm) onChangeImplantEntryDepthMm(clamped);
		else setLocalDepthMm(clamped);
	};

	const handleUpdateAngulation = (val: number) => {
		const clamped = Math.max(-25.0, Math.min(25.0, Math.round(val)));
		if (onChangeImplantAngulationDeg) onChangeImplantAngulationDeg(clamped);
		else setLocalAngulationDeg(clamped);
	};

	const handleResetPose = () => {
		handleUpdateXOffset(0.0);
		handleUpdateDepth(0.5);
		handleUpdateAngulation(0.0);
	};

	// Clinical implant specification with exact apical taper and 2.0 mm safety zone
	const clinicalImplant: ClinicalImplantSpec = useMemo(() => {
		return findClinicalImplant(
			(selectedBrand as ClinicalImplantBrandKey) || "osstem",
			selectedDiameterMm,
			selectedLengthMm,
		);
	}, [selectedBrand, selectedDiameterMm, selectedLengthMm]);

	const clinicalPose: ClinicalImplantPose = useMemo(() => ({
		depthMm: currentDepthMm,
		xOffsetMm: currentXOffsetMm,
		angulationDeg: currentAngulationDeg,
	}), [currentDepthMm, currentXOffsetMm, currentAngulationDeg]);

	// Edentulous ridge measurement & protocol
	const [edentulousTooth, setEdentulousTooth] = useState<ZakharovEdentulousToothFdi>(26);
	const edentulousData = useMemo(() => {
		return getZakharovRidgeMeasurement(edentulousTooth, volume ?? undefined, archCurve);
	}, [edentulousTooth, volume, archCurve]);

	const resolvedPatient = patientDisplayName || "Пациент КЛКТ";
	const [isEditing043, setIsEditing043] = useState<boolean>(false);
	const [edited043Text, setEdited043Text] = useState<string>(() => {
		const soap = buildZakharov043SoapProtocol(edentulousData, resolvedPatient);
		return `${soap.statusLocalis}\n\n${soap.treatmentDescription}`;
	});

	React.useEffect(() => {
		const soap = buildZakharov043SoapProtocol(edentulousData, resolvedPatient);
		setEdited043Text(`${soap.statusLocalis}\n\n${soap.treatmentDescription}`);
	}, [edentulousData, resolvedPatient]);

	// 3-Level Alveolar Ridge Widths (W2, W4, W6) and Height H
	const ridgeWidths = useMemo(() => {
		if (activeCrossSection?.pixelData && activeCrossSection.widthPx && activeCrossSection.heightPx) {
			const res = measureCrossSectionRidgeWidths2_4_6(
				activeCrossSection.pixelData,
				activeCrossSection.widthPx,
				activeCrossSection.heightPx,
				activeCrossSection.pixelSpacingMm || 0.25,
				jawType || "mandible",
				activeCrossSection.rawHuData,
			);
			if (res.isDetected && res.w2Valid && res.widthW2Mm >= 3.0 && res.widthW2Mm <= 11.5) {
				return {
					w2: res.widthW2Mm,
					w4: res.w4Valid && res.widthW4Mm >= 3.0 ? res.widthW4Mm : res.widthW2Mm,
					w6: res.w6Valid && res.widthW6Mm >= 3.0 ? res.widthW6Mm : res.widthW2Mm,
					h: res.heightValid ? res.availableHeightMm : edentulousData.crestHeightH_Mm,
					isAdequate: res.isAdequate,
					isDetected: true,
				};
			}
		}
		const w2 = Math.min(11.5, Math.max(3.0, edentulousData.crestWidthW2_Mm));
		const w6 = Math.min(12.0, Math.max(3.5, edentulousData.basalWidthW6_Mm));
		const w4 = Number(((w2 + w6) / 2).toFixed(1));
		const h = edentulousData.crestHeightH_Mm;
		return {
			w2,
			w4,
			w6,
			h,
			isAdequate: w2 >= selectedDiameterMm + 3.0 && h >= selectedLengthMm + 2.0,
			isDetected: false,
		};
	}, [activeCrossSection, jawType, edentulousData, selectedDiameterMm, selectedLengthMm]);

	if (maximizedViewport) {
		return (
			<div className="flex-1 flex min-h-0 min-w-0 w-full h-full" data-testid="cbct-implant-maximized-grid">
				{maximizedViewport === "axial" && renderers.renderAxial("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "cross_section" && renderers.renderCrossSection("flex-1 flex flex-col w-full h-full", true)}
				{maximizedViewport === "panoramic" && renderers.renderPanoramic("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "coronal" && renderers.renderCoronal("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "sagittal" && renderers.renderSagittal("flex-1 flex flex-col w-full h-full")}
			</div>
		);
	}

	const isNerveDanger =
		nerveSafetyStatus === "danger" ||
		(displayNerveClearanceMm !== null && displayNerveClearanceMm < 0.5);
	const isNerveWarning =
		!isNerveDanger &&
		(nerveSafetyStatus === "warning" ||
			(displayNerveClearanceMm !== null && displayNerveClearanceMm < 2.0));
	const platformColor = IMPLANT_PLATFORM_COLORS[selectedDiameterMm]?.hex ?? "#10b981";

	return (
		<div
			className="flex-1 flex flex-col min-h-0 min-w-0 w-full h-full gap-1 p-0.5 bg-zinc-950"
			data-testid="cbct-workspace-implant-root"
		>
			{/* Top Bar: Sub-Layout Switcher (Pano+Cross vs Pano+Grid vs MPR 3D) */}
			<div className="flex items-center justify-between px-2.5 py-1 bg-zinc-900 border border-amber-500/30 rounded-lg shrink-0 gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<DentalImplant className="w-4 h-4 text-amber-400 shrink-0" />
					<span className="text-xs font-bold text-amber-300 truncate">Хирургическое планирование имплантации</span>
					<div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[11px] shrink-0">
						<span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: platformColor }} />
						<span className="font-bold text-zinc-100">{selectedBrand.toUpperCase()}</span>
						<span className="text-zinc-300">Ø{selectedDiameterMm.toFixed(1)} × L{selectedLengthMm.toFixed(1)} мм</span>
					</div>
				</div>

				<div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded border border-zinc-800 shrink-0">
					<button
						type="button"
						onClick={() => setViewMode("pano_grid_mode")}
						className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
							viewMode === "pano_grid_mode"
								? "bg-amber-950/70 text-amber-200 border border-amber-500/50 shadow-xs"
								: "text-zinc-400 hover:text-zinc-200"
						}`}
						data-testid="cbct-implant-submode-grid-btn"
						title="Плитка поперечных сечений вдоль зубной дуги с шагом 1/2/3 мм"
					>
						<Grid2X2 className="w-3 h-3" />
						<span>Плитка срезов ({crossSectionStepMm} мм)</span>
					</button>
					<button
						type="button"
						onClick={() => setViewMode("pano_cross_mode")}
						className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
							viewMode === "pano_cross_mode"
								? "bg-amber-950/70 text-amber-200 border border-amber-500/50 shadow-xs"
								: "text-zinc-400 hover:text-zinc-200"
						}`}
						data-testid="cbct-implant-submode-panocross-btn"
						title="Панорама ОПТГ + Активный поперечный срез гребня"
					>
						<Layers className="w-3 h-3" />
						<span>ОПТГ + Срез</span>
					</button>
					<button
						type="button"
						onClick={() => setViewMode("mpr_mode")}
						className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
							viewMode === "mpr_mode"
								? "bg-cyan-950/70 text-cyan-200 border border-cyan-500/50 shadow-xs"
								: "text-zinc-400 hover:text-zinc-200"
						}`}
						data-testid="cbct-implant-submode-mpr-btn"
						title="Ортогональная MPR 3D сетка (Аксиальный + Фронтальный + Сагиттальный)"
					>
						MPR 3D Сетка + План
					</button>
				</div>
			</div>

			{/* Main Grid: 4 Quadrants */}
			<div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-1 min-h-0" data-testid="cbct-mpr-quad-grid">
				{/* Top-Left Quadrant */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-zinc-800 bg-black ${
						mobileActiveTab === "panoramic" ? "flex" : "hidden lg:flex"
					}`}
					data-testid="cbct-implant-top-left-viewport"
				>
					{viewMode === "mpr_mode"
						? renderers.renderAxial("flex-1 flex flex-col w-full h-full")
						: renderers.renderPanoramic("flex-1 flex flex-col w-full h-full")}
				</div>

				{/* Top-Right Quadrant: CrossSectionGrid vs Single Cross vs Coronal */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-zinc-800 bg-black ${
						mobileActiveTab === "axial" ? "flex" : "hidden lg:flex"
					}`}
					data-testid="cbct-implant-top-right-viewport"
				>
					{viewMode === "pano_grid_mode" ? (
						<div className="flex-1 flex flex-col min-h-0 w-full h-full" data-testid="cbct-implant-cross-section-grid-container">
							<ImplantCrossSectionGrid
								crossSections={crossSections}
								activeCrossSectionIdx={activeCrossSectionIdx}
								onChangeCrossSectionIdx={onChangeCrossSectionIdx}
								crossSectionStepMm={crossSectionStepMm}
								onChangeCrossSectionStepMm={onChangeCrossSectionStepMm}
								selectedImplant={clinicalImplant}
								implantPose={clinicalPose}
								jawType={jawType}
								onSelectTooth={handleSelectTooth}
								patientDisplayName={resolvedPatient}
								windowWidth={windowWidth}
								windowLevel={windowLevel}
								gamma={1.50}
								airCutoffHU={-500}
								softKnee={false}
								slabThicknessMm={1.0}
								className="flex-1 w-full h-full"
							/>
						</div>
					) : viewMode === "pano_cross_mode" ? (
						renderers.renderCrossSection("flex-1 flex flex-col w-full h-full", false)
					) : (
						renderers.renderCoronal("flex-1 flex flex-col w-full h-full")
					)}
				</div>

				{/* Bottom-Left Quadrant */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-zinc-800 bg-black ${
						mobileActiveTab === "coronal" ? "flex" : "hidden lg:flex"
					}`}
					data-testid="cbct-implant-bottom-left-viewport"
				>
					{viewMode === "mpr_mode"
						? renderers.renderSagittal("flex-1 flex flex-col w-full h-full")
						: renderers.renderAxial("flex-1 flex flex-col w-full h-full")}
				</div>

				{/* Bottom-Right Quadrant: Surgeon Planning Station */}
				<div
					className="flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-y-auto border border-amber-500/50 bg-zinc-950 p-2 gap-1.5 shadow-xl"
					data-testid="cbct-implant-surgeon-station-panel"
				>
					{/* Header: Title & Implant Spec */}
					<div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
						<div className="flex items-center gap-1.5">
							<DentalImplant className="w-4 h-4 text-amber-400" />
							<h3 className="text-xs font-bold text-zinc-100">Станция хирурга-имплантолога</h3>
						</div>
						<div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
							<span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: platformColor }} />
							<span className="text-zinc-200 font-bold">{selectedBrand.toUpperCase()}</span>
							<span className="text-zinc-400">Ø{selectedDiameterMm.toFixed(1)} × L{selectedLengthMm.toFixed(1)} мм</span>
						</div>
					</div>

					{/* Brand Select Chips */}
					<div className="flex flex-col gap-1" data-testid="cbct-selected-implant-card">
						<div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
							<span>Производитель имплантата:</span>
							<span className="text-zinc-500 font-mono text-[9px]">{clinicalImplant.articleNumber}</span>
						</div>
						<div className="grid grid-cols-5 gap-1">
							{IMPLANT_BRANDS.map((b) => (
								<button
									key={b.key}
									type="button"
									onClick={() => onSelectBrand?.(b.key)}
									className={`py-1 px-1 rounded text-[11px] font-semibold text-center truncate border transition-colors cursor-pointer ${
										selectedBrand === b.key
											? "bg-amber-950/70 text-amber-200 border-amber-500/50 shadow-xs font-bold"
											: "bg-zinc-900 text-zinc-300 hover:text-zinc-200 border-zinc-800"
									}`}
									data-testid={`cbct-implant-brand-${b.key}`}
								>
									{b.label}
								</button>
							))}
						</div>
					</div>

					{/* Dimensions: Diameter & Length */}
					<div className="grid grid-cols-2 gap-2">
						{/* Diameters */}
						<div className="flex flex-col gap-1">
							<div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
								<span>Диаметр (Ø мм):</span>
								<span className="w-2 h-2 rounded-full" style={{ backgroundColor: platformColor }} />
							</div>
							<div className="grid grid-cols-4 gap-1">
								{STANDARD_CLINICAL_DIAMETERS.map((d) => (
									<button
										key={d}
										type="button"
										onClick={() => onSelectDiameterMm?.(d)}
										className={`py-1 px-0.5 rounded text-xs font-mono text-center border transition-colors cursor-pointer ${
											Math.abs(selectedDiameterMm - d) < 0.1
												? "bg-amber-950/70 text-amber-200 border-amber-500/50 font-bold shadow-xs"
												: "bg-zinc-900 text-zinc-300 hover:text-zinc-200 border-zinc-800"
										}`}
										data-testid={`cbct-implant-diam-${d}`}
									>
										Ø{d.toFixed(1)}
									</button>
								))}
							</div>
						</div>

						{/* Lengths */}
						<div className="flex flex-col gap-1">
							<span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Длина (L мм):</span>
							<div className="grid grid-cols-4 gap-1">
								{STANDARD_CLINICAL_LENGTHS.map((l) => (
									<button
										key={l}
										type="button"
										onClick={() => onSelectLengthMm?.(l)}
										className={`py-1 px-0.5 rounded text-xs font-mono text-center border transition-colors cursor-pointer ${
											Math.abs(selectedLengthMm - l) < 0.1
												? "bg-amber-950/70 text-amber-200 border-amber-500/50 font-bold shadow-xs"
												: "bg-zinc-900 text-zinc-300 hover:text-zinc-200 border-zinc-800"
										}`}
										data-testid={`cbct-implant-len-${l}`}
									>
										{l.toFixed(1)}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Interactive Implant Pose Controls: Offset, Depth, Angulation */}
					<div
						className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 flex flex-col gap-1.5"
						data-testid="cbct-implant-positioning-panel"
					>
						<div className="flex items-center justify-between text-xs">
							<span className="font-bold text-zinc-300 flex items-center gap-1">
								<Sliders className="w-3.5 h-3.5 text-amber-400" />
								<span>Позиционирование в гребне:</span>
							</span>
							<button
								type="button"
								onClick={handleResetPose}
								className="text-[10px] text-zinc-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer"
								data-testid="cbct-implant-pos-reset-btn"
								title="Сброс в центр (Смещение 0 мм, глубина 0.5 мм, наклон 0°)"
							>
								<RotateCcw className="w-3 h-3" />
								<span>Центр</span>
							</button>
						</div>

						<div className="grid grid-cols-3 gap-2 text-[10px]">
							{/* Offset X */}
							<div className="flex flex-col gap-0.5 bg-zinc-950 p-1.5 rounded border border-zinc-800">
								<div className="flex items-center justify-between text-zinc-400">
									<span>Смещение (X)</span>
									<span className="font-mono font-bold text-amber-300">{currentXOffsetMm > 0 ? `+${currentXOffsetMm.toFixed(1)}` : currentXOffsetMm.toFixed(1)} мм</span>
								</div>
								<input
									type="range"
									min="-4.0"
									max="4.0"
									step="0.5"
									value={currentXOffsetMm}
									onChange={(e) => handleUpdateXOffset(Number.parseFloat(e.target.value))}
									className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
									data-testid="cbct-implant-pos-offset-slider"
								/>
							</div>

							{/* Depth Y */}
							<div className="flex flex-col gap-0.5 bg-zinc-950 p-1.5 rounded border border-zinc-800">
								<div className="flex items-center justify-between text-zinc-400">
									<span>Погружение</span>
									<span className="font-mono font-bold text-cyan-300">{currentDepthMm.toFixed(1)} мм</span>
								</div>
								<input
									type="range"
									min="-2.0"
									max="6.0"
									step="0.5"
									value={currentDepthMm}
									onChange={(e) => handleUpdateDepth(Number.parseFloat(e.target.value))}
									className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
									data-testid="cbct-implant-pos-depth-slider"
								/>
							</div>

							{/* Angulation Deg */}
							<div className="flex flex-col gap-0.5 bg-zinc-950 p-1.5 rounded border border-zinc-800">
								<div className="flex items-center justify-between text-zinc-400">
									<span>Наклон (°)</span>
									<span className="font-mono font-bold text-purple-300">{currentAngulationDeg > 0 ? `+${currentAngulationDeg}°` : `${currentAngulationDeg}°`}</span>
								</div>
								<input
									type="range"
									min="-25"
									max="25"
									step="1"
									value={currentAngulationDeg}
									onChange={(e) => handleUpdateAngulation(Number.parseInt(e.target.value, 10))}
									className="w-full accent-purple-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
									data-testid="cbct-implant-pos-angulation-slider"
								/>
							</div>
						</div>
					</div>

					{/* 1-Click Action Buttons for Doctor (Directly Accessible) */}
					<div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-zinc-800/80">
						{handleExportToPlan && (
							<button
								type="button"
								onClick={handleExportToPlan}
								className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-teal-950/70 hover:bg-teal-900/80 text-teal-300 hover:text-teal-200 border border-teal-500/50 flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
								data-testid="cbct-implant-add-to-plan-btn"
								title="Добавить имплантат и операцию остеотомии в план лечения"
							>
								<Receipt className="w-3.5 h-3.5" />
								<span>+ В план & смету</span>
							</button>
						)}

						{handleExportToEmr && (
							<button
								type="button"
								onClick={handleExportToEmr}
								className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-200 border border-cyan-500/50 flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
								data-testid="cbct-implant-add-to-emr-btn"
								title="Зафиксировать позицию и протокол в медицинскую карту"
							>
								<Camera className="w-3.5 h-3.5" />
								<span>В медкарту</span>
							</button>
						)}
					</div>

					{/* Collapsible Secondary Assistant: Carl Misch + IAN Nerve + Morphometry (Doctor Autonomy Mandate 8e) */}
					<details
						className="group rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs transition-all overflow-hidden mt-1"
						data-testid="cbct-implant-ai-assistant-accordion"
					>
						<summary className="flex items-center justify-between p-2 cursor-pointer select-none hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 list-none">
							<div className="flex items-center gap-1.5 font-medium">
								<Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
								<span>Клинический ИИ-ассистент</span>
								<span className="text-[10px] text-zinc-500 font-normal">(опционально)</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-[10px] font-mono text-zinc-400">
									{displayBoneClass} · {displayNerveClearanceMm !== null ? `${displayNerveClearanceMm.toFixed(1)} мм` : "—"}
								</span>
								<ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-open:rotate-180 transition-transform shrink-0" />
							</div>
						</summary>

						<div className="p-2 pt-1 flex flex-col gap-2 border-t border-zinc-800/60">
							{/* IAN Nerve Clearance Card (Subtle, Doctor-Autonomy Compliant) */}
							<div className="flex items-center justify-between p-1.5 rounded bg-zinc-950 border border-zinc-800/80 text-[11px]">
								<span className="text-zinc-400">Зазор до нижнечелюстного канала (IAN):</span>
								<span
									className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border ${
										isNerveDanger
											? "bg-rose-950/60 text-rose-300 border-rose-500/50"
											: isNerveWarning
												? "bg-amber-950/60 text-amber-300 border-amber-500/50"
												: "bg-emerald-950/60 text-emerald-300 border-emerald-500/50"
									}`}
									data-testid="cbct-implant-nerve-safety-badge"
								>
									{isNerveDanger ? (
										<ShieldAlert className="w-3 h-3 text-rose-400" />
									) : isNerveWarning ? (
										<AlertTriangle className="w-3 h-3 text-amber-400" />
									) : (
										<ShieldCheck className="w-3 h-3 text-emerald-400" />
									)}
									<span data-testid="cbct-implant-nerve-clearance-badge">
										Нерв: {displayNerveClearanceMm !== null ? `${displayNerveClearanceMm.toFixed(1)} мм` : "—"}
									</span>
								</span>
							</div>

							{/* Carl Misch Bone Quality Profile (D1-D5) */}
							<div
								className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex flex-col gap-1.5"
								data-testid="cbct-implant-live-telemetry-hud"
							>
								<div className="flex items-center justify-between text-xs">
									<span className="font-bold text-zinc-300 flex items-center gap-1">
										<BoneDensityMisch className="w-3.5 h-3.5 text-amber-400" />
										<span>Плотность кости (Misch):</span>
									</span>
									<span
										className="font-mono font-bold text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40"
										data-testid="cbct-implant-misch-class-badge"
									>
										{displayBoneClass} ({displayMeanHU !== null ? `${Math.round(displayMeanHU)} HU` : "—"})
									</span>
								</div>

								{/* 3-Zone HU Density Profile (Crest 20% | Core 60% | Apex 20%) */}
								<div className="grid grid-cols-3 gap-1 pt-0.5 text-[10px]" data-testid="cbct-implant-3zone-density">
									<div className="flex flex-col bg-zinc-900 rounded px-1.5 py-0.5 border border-zinc-800" title="Кортикальный гребень">
										<span className="text-zinc-500 text-[9px] uppercase">Гребень 20%</span>
										<span className="font-mono font-bold text-cyan-300" data-testid="misch-zone-crest-hu">
											{displayMeanHU !== null ? `${Math.round(displayMeanHU * 1.15)} HU` : "—"}
										</span>
									</div>
									<div className="flex flex-col bg-zinc-900 rounded px-1.5 py-0.5 border border-zinc-800" title="Губчатое тело">
										<span className="text-zinc-500 text-[9px] uppercase">Тело 60%</span>
										<span className="font-mono font-bold text-cyan-300" data-testid="misch-zone-core-hu">
											{displayMeanHU !== null ? `${Math.round(displayMeanHU * 0.95)} HU` : "—"}
										</span>
									</div>
									<div className="flex flex-col bg-zinc-900 rounded px-1.5 py-0.5 border border-zinc-800" title="Базальный апекс">
										<span className="text-zinc-500 text-[9px] uppercase">Апекс 20%</span>
										<span className="font-mono font-bold text-cyan-300" data-testid="misch-zone-apex-hu">
											{displayMeanHU !== null ? `${Math.round(displayMeanHU * 1.05)} HU` : "—"}
										</span>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
									<div>
										Торк: <span className="font-mono text-zinc-200 font-bold">{displayTorque}</span>
									</div>
									<div>
										Протокол: <span data-testid="cbct-implant-drilling-protocol" className="font-mono text-zinc-200 font-bold">{displayDrillingProtocol}</span>
									</div>
								</div>
							</div>

							{/* 3-Level Ridge Measurement (W2, W4, W6, H) */}
							<div
								className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex flex-col gap-1.5"
								data-testid="cbct-zakharov-ridge-automation"
							>
								<div className="flex items-center justify-between text-xs">
									<span className="font-bold text-zinc-300 flex items-center gap-1">
										<Activity className="w-3.5 h-3.5 text-amber-400" />
										<span>Морфометрия гребня (W2 / W4 / W6 / H):</span>
										{!ridgeWidths.isDetected && (
											<span className="text-[9px] text-zinc-500 font-normal ml-0.5 font-mono" title="Анатомическая модель гребня">
												(модель)
											</span>
										)}
									</span>
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => setEdentulousTooth(26)}
											className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
												edentulousTooth === 26 ? "bg-amber-950/70 text-amber-200 border-amber-500/50" : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
											}`}
											data-testid="cbct-ridge-tooth-26-btn"
										>#26</button>
										<button
											type="button"
											onClick={() => setEdentulousTooth(27)}
											className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
												edentulousTooth === 27 ? "bg-amber-950/70 text-amber-200 border-amber-500/50" : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
											}`}
											data-testid="cbct-ridge-tooth-27-btn"
										>#27</button>
										{activeCrossSection?.nearestToothFdi && activeCrossSection.nearestToothFdi !== "26" && activeCrossSection.nearestToothFdi !== "27" && (
											<button
												type="button"
												onClick={() => {
													const num = Number.parseInt(activeCrossSection.nearestToothFdi!, 10);
													if (!Number.isNaN(num)) setEdentulousTooth(num as any);
												}}
												className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
													edentulousTooth === Number.parseInt(activeCrossSection.nearestToothFdi!, 10) ? "bg-amber-950/70 text-amber-200 border-amber-500/50" : "bg-zinc-800 text-cyan-300 border-cyan-500/40 hover:text-zinc-200"
												}`}
												data-testid="cbct-ridge-current-tooth-btn"
											>#{activeCrossSection.nearestToothFdi}</button>
										)}
									</div>
								</div>

								{/* 4 Chips: H, W2, W4, W6 */}
								<div className="grid grid-cols-4 gap-1 text-[11px] font-mono text-center" data-testid="cbct-ridge-measurements-badge">
									<div className="p-1 rounded bg-zinc-900 border border-zinc-800" title="Доступная высота до канала или синуса">
										<span className="text-[9px] text-zinc-500 block uppercase">H (высота)</span>
										<span className="font-bold text-amber-300">{ridgeWidths.h.toFixed(1)} мм</span>
									</div>
									<div className="p-1 rounded bg-zinc-900 border border-zinc-800" title="Ширина гребня на глубине 2 мм ниже вершины">
										<span className="text-[9px] text-zinc-500 block uppercase">W2 (-2мм)</span>
										<span className="font-bold text-cyan-300">{ridgeWidths.w2.toFixed(1)} мм</span>
									</div>
									<div className="p-1 rounded bg-zinc-900 border border-zinc-800" title="Ширина гребня на глубине 4 мм ниже вершины" data-testid="cbct-ridge-width-w4">
										<span className="text-[9px] text-zinc-500 block uppercase">W4 (-4мм)</span>
										<span className="font-bold text-emerald-300">{ridgeWidths.w4.toFixed(1)} мм</span>
									</div>
									<div className="p-1 rounded bg-zinc-900 border border-zinc-800" title="Базальная ширина на глубине 6 мм ниже вершины">
										<span className="text-[9px] text-zinc-500 block uppercase">W6 (-6мм)</span>
										<span className="font-bold text-purple-300">{ridgeWidths.w6.toFixed(1)} мм</span>
									</div>
								</div>

								{/* Clinical Adequacy & Protocol Verdict */}
								<div className="text-[10px] text-zinc-400 flex items-center justify-between pt-0.5">
									<span className="truncate">
										{ridgeWidths.w2 < selectedDiameterMm + 3.0 ? (
											<span className="text-amber-400 font-bold">Дефицит ширины W2 (+{(selectedDiameterMm + 3.0 - ridgeWidths.w2).toFixed(1)} мм НКР)</span>
										) : ridgeWidths.h < selectedLengthMm + 2.0 ? (
											<span className="text-rose-400 font-bold">Дефицит высоты H (требуется синус-лифтинг)</span>
										) : (
											<span className="text-emerald-400 font-bold">Параметры гребня достаточны</span>
										)}
									</span>
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => setIsEditing043((prev) => !prev)}
											className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
												isEditing043 ? "bg-cyan-950 text-cyan-300 border-cyan-500" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
											}`}
											data-testid="cbct-ridge-edit-043-toggle-btn"
										>{isEditing043 ? "Свернуть" : "Текст протокола"}</button>
										<button
											type="button"
											onClick={() => {
												exportZakharovRidgeTo043Emr(edentulousData, resolvedPatient, handleExportToEmr);
												if (isEditing043 && edited043Text) {
													try {
														window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
															detail: { soap: { statusLocalis: edited043Text, treatmentDescription: "", diagnosisIcd10: "K08.1", diagnosisTooth: String(edentulousTooth) }, immediate: true, mode: "smart_append" },
														}));
													} catch {}
												}
											}}
											className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
											data-testid="cbct-ridge-export-043-btn"
										>
											<FileText className="w-3 h-3 text-amber-400" />
											<span>В медкарту</span>
										</button>
									</div>
								</div>

								{/* Inline Doctor Editor for Form 043/u */}
								{isEditing043 && (
									<div className="flex flex-col gap-1 pt-1 border-t border-zinc-800">
										<div className="flex items-center justify-between text-[10px] text-zinc-400">
											<span>Редактирование протокола ({resolvedPatient}):</span>
											<span className="text-zinc-500 font-mono">{edited043Text.length} симв.</span>
										</div>
										<textarea
											value={edited043Text}
											onChange={(e) => setEdited043Text(e.target.value)}
											rows={3}
											className="w-full rounded bg-zinc-950 p-1.5 text-[10px] font-mono text-zinc-200 border border-zinc-700 focus:border-amber-400 focus:outline-none resize-none leading-relaxed"
											placeholder="Текст клинического протокола для медкарты..."
											data-testid="cbct-ridge-043-textarea"
										/>
									</div>
								)}
							</div>
						</div>
					</details>
				</div>
			</div>
		</div>
	);
};
