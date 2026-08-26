import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Check,
	Compass,
	Layers,
	ShieldAlert,
	ShieldCheck,
	Sliders,
	Target,
} from "lucide-react";
import type React from "react";
import { MANDIBULAR_NERVE_SAFETY_MARGIN_MM } from "./cbctCaliperNerveMath";
import type { CrossSectionBoneProfile } from "./cbctCrossSectionEngine";

export interface CbctCrossSectionInspectorProps {
	profile: CrossSectionBoneProfile;
	onUpdateMeasurements?: (heightMm: number, widthMm: number) => void;
	showVirtualImplant?: boolean;
	plannedImplantDiameterMm?: number;
	plannedImplantLengthMm?: number;
}

export const CbctCrossSectionInspector: React.FC<CbctCrossSectionInspectorProps> = ({
	profile,
	onUpdateMeasurements,
	showVirtualImplant = true,
	plannedImplantDiameterMm = 4.0,
	plannedImplantLengthMm = 10.0,
}) => {
	const {
		sliceIndex,
		fdiTooth,
		toothNameRu,
		jaw,
		crestBoneHeightMm,
		crestalWidthMm,
		midBodyWidthMm,
		baseWidthMm,
		sinusFloorDistanceMm,
		sinusClearance,
		mandibularCanalDistanceMm,
		nerveClearance,
		densityHuEstimate,
		densityClass,
		densityDescriptionRu,
		implantFeasibility,
		recommendedImplant,
	} = profile;

	// Scale factor for rendering the cross-section inside 100x100 SVG
	// 1 mm ~ 2.2 units
	const scale = 2.4;
	const centerX = 50;
	const crestY = 20; // Top of alveolar crest

	const heightPx = Math.min(65, crestBoneHeightMm * scale);
	const crestHalfWidthPx = Math.min(25, (crestalWidthMm / 2) * scale);
	const midHalfWidthPx = Math.min(30, (midBodyWidthMm / 2) * scale);
	const baseHalfWidthPx = Math.min(35, (baseWidthMm / 2) * scale);

	const baseY = crestY + heightPx;
	const midY = crestY + Math.min(heightPx * 0.45, 5 * scale);
	const subCrestY = crestY + Math.min(heightPx * 0.15, 2 * scale);

	// Generate smooth alveolar ridge cross-sectional polygon path
	const ridgePolygonPath = `
		M ${centerX - crestHalfWidthPx} ${subCrestY}
		Q ${centerX} ${crestY - 2} ${centerX + crestHalfWidthPx} ${subCrestY}
		L ${centerX + midHalfWidthPx} ${midY}
		L ${centerX + baseHalfWidthPx} ${baseY}
		L ${centerX - baseHalfWidthPx} ${baseY}
		L ${centerX - midHalfWidthPx} ${midY}
		Z
	`.trim();

	// Virtual implant dimensions in SVG pixels
	const implantWidthPx = (plannedImplantDiameterMm / 2) * scale;
	const implantHeightPx = plannedImplantLengthMm * scale;
	const implantApexY = crestY + implantHeightPx;

	// Determine safety banner colors and text
	let safetyBanner = {
		title: "Костный объем достаточен",
		desc: "Параметры гребня соответствуют протоколу стандартной имплантации",
		badgeClass: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
		icon: <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />,
	};

	if (nerveClearance) {
		if (nerveClearance.isDanger) {
			safetyBanner = {
				title: "Критическая опасность повреждения нерва!",
				desc: nerveClearance.messageRu,
				badgeClass: "bg-rose-500/20 border-rose-500/40 text-rose-300",
				icon: <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />,
			};
		} else if (nerveClearance.isWarning) {
			safetyBanner = {
				title: "Внимание: снижение дистанции безопасности",
				desc: nerveClearance.messageRu,
				badgeClass: "bg-amber-500/20 border-amber-500/40 text-amber-300",
				icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
			};
		}
	} else if (sinusClearance) {
		if (sinusClearance.status === "severe_atrophy_two_stage") {
			safetyBanner = {
				title: "Выраженный дефицит высоты под пазухой (< 3 мм)",
				desc: sinusClearance.recommendedProtocol,
				badgeClass: "bg-rose-500/20 border-rose-500/40 text-rose-300",
				icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
			};
		} else if (sinusClearance.status === "lateral_window_indicated") {
			safetyBanner = {
				title: "Показан открытый синус-лифтинг (3–6 мм)",
				desc: sinusClearance.recommendedProtocol,
				badgeClass: "bg-amber-500/20 border-amber-500/40 text-amber-300",
				icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
			};
		} else if (sinusClearance.status === "crestal_lift_indicated") {
			safetyBanner = {
				title: "Показан закрытый синус-лифтинг по Саммерсу (6–10 мм)",
				desc: sinusClearance.recommendedProtocol,
				badgeClass: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
				icon: <Compass className="w-5 h-5 text-cyan-400 shrink-0" />,
			};
		}
	}

	return (
		<div className="flex flex-col h-full bg-slate-900/95 border border-slate-800 rounded-2xl p-4 overflow-y-auto select-none gap-4">
			{/* Header: FDI Tooth Title and Slice Index */}
			<div className="flex items-center justify-between border-b border-slate-800 pb-3">
				<div className="flex items-center gap-2.5">
					<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--teal-surface,#083344)] border border-[var(--teal-soft,#06b6d4)] text-[var(--teal,#06b6d4)] font-bold text-lg">
						{fdiTooth || `#${sliceIndex + 1}`}
					</div>
					<div>
						<h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
							{toothNameRu}
							<span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
								Срез {sliceIndex + 1}
							</span>
						</h2>
						<p className="text-xs text-slate-400">
							Позиция на дуге: <strong className="text-[var(--teal,#06b6d4)]">{profile.arcPositionMm} мм</strong> • Челюсть: {jaw === "maxilla" ? "Верхняя" : "Нижняя"}
						</p>
					</div>
				</div>

				{/* Density Badge */}
				<div className="flex flex-col items-end">
					<span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-xs">
						Плотность {densityClass} ({densityHuEstimate} HU)
					</span>
				</div>
			</div>

			{/* Main Grid: Cross-Section Visual Canvas + Dimension Calipers */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
				{/* Pararadicular SVG Cross-Section Slice Diagram */}
				<div className="relative aspect-square w-full bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden p-2">
					<svg
						className="w-full h-full"
						viewBox="0 0 100 100"
						preserveAspectRatio="xMidYMid meet"
					>
						<defs>
							{/* Bone trabecular pattern */}
							<pattern id="boneTexture" width="4" height="4" patternUnits="userSpaceOnUse">
								<circle cx="2" cy="2" r="0.6" fill="rgba(56, 189, 248, 0.2)" />
							</pattern>
							{/* Implant threaded gradient */}
							<linearGradient id="implantGrad" x1="0%" y1="0%" x2="100%" y2="0%">
								<stop offset="0%" stopColor="#475569" />
								<stop offset="50%" stopColor="#94a3b8" />
								<stop offset="100%" stopColor="#475569" />
							</linearGradient>
						</defs>

						{/* Background grid */}
						<line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
						<line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
						<line x1="0" y1="80" x2="100" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
						<line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

						{/* 1. Alveolar Ridge Bone Shape */}
						<path
							d={ridgePolygonPath}
							fill="url(#boneTexture)"
							stroke="var(--teal, #06b6d4)"
							strokeWidth="1.2"
							className="drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]"
						/>

						{/* 2. Maxillary Sinus Floor Line or Mandibular Canal */}
						{jaw === "maxilla" && sinusFloorDistanceMm !== null && (
							<g>
								{/* Sinus floor curve */}
								<path
									d={`M 15 ${baseY} Q ${centerX} ${baseY - 4} 85 ${baseY}`}
									fill="none"
									stroke="#38bdf8"
									strokeWidth="1.2"
									strokeDasharray="2 1"
								/>
								<text
									x="50"
									y={baseY + 6}
									fill="#38bdf8"
									fontSize="3.2"
									textAnchor="middle"
									fontWeight="bold"
								>
									Дно пазухи ({sinusFloorDistanceMm} мм)
								</text>
							</g>
						)}

						{jaw === "mandible" && mandibularCanalDistanceMm !== null && (
							<g>
								{/* 2.0 mm Safety corridor around canal */}
								<circle
									cx={centerX}
									cy={baseY}
									r={MANDIBULAR_NERVE_SAFETY_MARGIN_MM * scale + 3}
									fill="rgba(245, 158, 11, 0.12)"
									stroke="rgba(245, 158, 11, 0.6)"
									strokeWidth="0.6"
									strokeDasharray="1.5 1"
								/>
								{/* Canal lumen */}
								<circle
									cx={centerX}
									cy={baseY}
									r="3.5"
									fill="rgba(239, 68, 68, 0.3)"
									stroke="#ef4444"
									strokeWidth="0.9"
								/>
								<text
									x={centerX}
									y={baseY + 7}
									fill="#f87171"
									fontSize="3.0"
									textAnchor="middle"
									fontWeight="bold"
								>
									Канал N. Alveolaris
								</text>
							</g>
						)}

						{/* 3. Virtual Planned Implant */}
						{showVirtualImplant && (
							<g opacity="0.9">
								<rect
									x={centerX - implantWidthPx}
									y={crestY}
									width={implantWidthPx * 2}
									height={implantHeightPx}
									rx="1.5"
									fill="url(#implantGrad)"
									stroke="#e2e8f0"
									strokeWidth="0.6"
								/>
								{/* Apex indicator */}
								<line
									x1={centerX - implantWidthPx}
									y1={implantApexY}
									x2={centerX + implantWidthPx}
									y2={implantApexY}
									stroke="#eab308"
									strokeWidth="0.8"
								/>
								<text
									x={centerX}
									y={crestY + implantHeightPx / 2 + 1}
									fill="#0f172a"
									fontSize="3.0"
									textAnchor="middle"
									fontWeight="bold"
								>
									Ø{plannedImplantDiameterMm}x{plannedImplantLengthMm}
								</text>
							</g>
						)}

						{/* 4. Caliper Rulers Overlay */}
						{/* Vertical Height Line */}
						<line
							x1={centerX - baseHalfWidthPx - 4}
							y1={crestY}
							x2={centerX - baseHalfWidthPx - 4}
							y2={baseY}
							stroke="#38bdf8"
							strokeWidth="0.7"
						/>
						<line
							x1={centerX - baseHalfWidthPx - 6}
							y1={crestY}
							x2={centerX - baseHalfWidthPx - 2}
							y2={crestY}
							stroke="#38bdf8"
							strokeWidth="0.7"
						/>
						<line
							x1={centerX - baseHalfWidthPx - 6}
							y1={baseY}
							x2={centerX - baseHalfWidthPx - 2}
							y2={baseY}
							stroke="#38bdf8"
							strokeWidth="0.7"
						/>
						<text
							x={centerX - baseHalfWidthPx - 7}
							y={(crestY + baseY) / 2 + 1}
							fill="#38bdf8"
							fontSize="3.2"
							fontWeight="bold"
							textAnchor="end"
						>
							H: {crestBoneHeightMm} мм
						</text>

						{/* Crestal Width Line at 2mm */}
						<line
							x1={centerX - crestHalfWidthPx}
							y1={subCrestY}
							x2={centerX + crestHalfWidthPx}
							y2={subCrestY}
							stroke="#a855f7"
							strokeWidth="0.7"
						/>
						<text
							x={centerX + crestHalfWidthPx + 3}
							y={subCrestY + 1}
							fill="#c084fc"
							fontSize="3.0"
							fontWeight="bold"
							textAnchor="start"
						>
							W: {crestalWidthMm} мм
						</text>
					</svg>

					{/* Viewport orientation labels */}
					<div className="absolute top-1 left-2 text-[9px] font-bold text-slate-500">
						ЩЕЧНО (Buccal)
					</div>
					<div className="absolute top-1 right-2 text-[9px] font-bold text-slate-500">
						ЯЗЫЧНО (Lingual)
					</div>
				</div>

				{/* Detailed Numerical Measurements Table */}
				<div className="flex flex-col gap-2.5">
					<div className="grid grid-cols-2 gap-2">
						<div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
							<span className="text-[11px] text-slate-400">Высота гребня (H):</span>
							<div className="text-base font-bold text-[var(--teal,#38bdf8)]">
								{crestBoneHeightMm} мм
							</div>
						</div>
						<div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
							<span className="text-[11px] text-slate-400">Ширина гребня (2 мм):</span>
							<div className="text-base font-bold text-purple-400">
								{crestalWidthMm} мм
							</div>
						</div>
						<div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
							<span className="text-[11px] text-slate-400">Ширина тела (5 мм):</span>
							<div className="text-sm font-semibold text-slate-200">
								{midBodyWidthMm} мм
							</div>
						</div>
						<div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
							<span className="text-[11px] text-slate-400">Базальная ширина:</span>
							<div className="text-sm font-semibold text-slate-200">
								{baseWidthMm} мм
							</div>
						</div>
					</div>

					{/* Anatomical Clearance Metric */}
					{jaw === "maxilla" && sinusFloorDistanceMm !== null && (
						<div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-between">
							<span className="text-xs text-cyan-300">Дно гайморовой пазухи:</span>
							<span className="text-sm font-bold text-cyan-200">
								{sinusFloorDistanceMm} мм
							</span>
						</div>
					)}

					{jaw === "mandible" && mandibularCanalDistanceMm !== null && (
						<div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-center justify-between">
							<span className="text-xs text-amber-300">Нижнечелюстной канал:</span>
							<span className="text-sm font-bold text-amber-200">
								{mandibularCanalDistanceMm} мм
							</span>
						</div>
					)}

					{/* Manual Fine-Tune Caliper Sliders */}
					{onUpdateMeasurements && (
						<div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
							<div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
								<span className="flex items-center gap-1.5">
									<Sliders className="w-3.5 h-3.5" />
									Калибровка среза:
								</span>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-[11px] text-slate-400 w-16">H ({crestBoneHeightMm}мм):</label>
								<input
									type="range"
									min="4.0"
									max="22.0"
									step="0.5"
									value={crestBoneHeightMm}
									onChange={(e) =>
										onUpdateMeasurements(Number.parseFloat(e.target.value), crestalWidthMm)
									}
									className="flex-1 accent-[var(--teal,#06b6d4)] h-1.5 bg-slate-700 rounded-lg cursor-pointer"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-[11px] text-slate-400 w-16">W ({crestalWidthMm}мм):</label>
								<input
									type="range"
									min="3.0"
									max="14.0"
									step="0.2"
									value={crestalWidthMm}
									onChange={(e) =>
										onUpdateMeasurements(crestBoneHeightMm, Number.parseFloat(e.target.value))
									}
									className="flex-1 accent-purple-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
								/>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Safety Clearance Banner */}
			<div className={`p-3 rounded-xl border flex items-start gap-3 ${safetyBanner.badgeClass}`}>
				{safetyBanner.icon}
				<div className="flex flex-col">
					<span className="text-xs font-bold">{safetyBanner.title}</span>
					<span className="text-[11px] opacity-90 leading-tight mt-0.5">{safetyBanner.desc}</span>
				</div>
			</div>

			{/* Clinical Implant Recommendation Card */}
			<div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
						<Target className="w-4 h-4 text-[var(--teal,#06b6d4)]" />
						Рекомендованный имплантат:
					</span>
					<span className="px-2 py-0.5 rounded-md bg-[var(--teal,#06b6d4)]/20 text-[var(--teal,#06b6d4)] text-xs font-bold">
						Ø{recommendedImplant.diameterMm} × {recommendedImplant.lengthMm} мм
					</span>
				</div>

				<p className="text-xs text-slate-300">
					{implantFeasibility.clinicalAdviceRu}
				</p>

				<div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-700/50">
					<span>Костная пластика:</span>
					<strong className={recommendedImplant.isGraftingRequired ? "text-amber-400 font-semibold" : "text-emerald-400"}>
						{recommendedImplant.graftingTypeRu}
					</strong>
				</div>
			</div>
		</div>
	);
};
