import React, { useState } from "react";
import {
	Activity,
	AlertTriangle,
	Check,
	ChevronRight,
	FileText,
	Receipt,
	ShieldAlert,
	ShieldCheck,
	Camera,
	Sliders,
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

const STANDARD_DIAMETERS = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5] as const;
const STANDARD_LENGTHS = [7.0, 8.5, 10.0, 11.5, 13.0] as const;

export const ImplantWorkspace: React.FC<ImplantWorkspaceProps> = ({
	volume,
	archCurve,
	renderers,
	maximizedViewport,
	mobileActiveTab,
	patientDisplayName,
	activeCrossSection,
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
}) => {
	// Doctor directive: Base is MPR (3 orthogonal windows to trace canal nerve + surgeon station)
	const [viewMode, setViewMode] = useState<"mpr_mode" | "pano_cross_mode">("mpr_mode");
	const [edentulousTooth, setEdentulousTooth] = useState<ZakharovEdentulousToothFdi>(26);
	const edentulousData = React.useMemo(() => {
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

	const isNerveDanger = displayNerveClearanceMm !== null && displayNerveClearanceMm < 2.0;
	const isNerveWarning = displayNerveClearanceMm !== null && displayNerveClearanceMm >= 2.0 && displayNerveClearanceMm < 3.5;

	return (
		<div
			className="flex-1 flex flex-col min-h-0 min-w-0 w-full h-full gap-1 p-0.5 bg-zinc-950"
			data-testid="cbct-workspace-implant-root"
		>
			{/* Top Bar: Sub-Layout Switcher (MPR + Plan vs Pano + Cross + Plan) */}
			<div className="flex items-center justify-between px-2.5 py-1 bg-zinc-900 border border-amber-500/30 rounded-lg shrink-0 gap-2">
				<div className="flex items-center gap-2">
					<DentalImplant className="w-4 h-4 text-amber-400" />
					<span className="text-xs font-bold text-amber-300">Хирургическое планирование имплантации</span>
					<span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
						{selectedBrand.toUpperCase()} Ø{selectedDiameterMm.toFixed(1)} × L{selectedLengthMm.toFixed(1)} мм
					</span>
				</div>

				<div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded border border-zinc-800">
					<button
						type="button"
						onClick={() => setViewMode("pano_cross_mode")}
						className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
							viewMode === "pano_cross_mode"
								? "bg-amber-600 text-white shadow-xs"
								: "text-zinc-400 hover:text-zinc-200"
						}`}
						data-testid="cbct-implant-submode-panocross-btn"
					>
						ОПТГ + Гребень (Cross-Section)
					</button>
					<button
						type="button"
						onClick={() => setViewMode("mpr_mode")}
						className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
							viewMode === "mpr_mode"
								? "bg-cyan-600 text-white shadow-xs"
								: "text-zinc-400 hover:text-zinc-200"
						}`}
						data-testid="cbct-implant-submode-mpr-btn"
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
					{viewMode === "pano_cross_mode" ? renderers.renderPanoramic("flex-1 flex flex-col w-full h-full") : renderers.renderAxial("flex-1 flex flex-col w-full h-full")}
				</div>

				{/* Top-Right Quadrant: Coronal in MPR Mode or Cross-Section in Pano Mode */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-zinc-800 bg-black ${
						mobileActiveTab === "axial" ? "flex" : "hidden lg:flex"
					}`}
					data-testid="cbct-implant-top-right-viewport"
				>
					{viewMode === "pano_cross_mode"
						? renderers.renderCrossSection("flex-1 flex flex-col w-full h-full", false)
						: renderers.renderCoronal("flex-1 flex flex-col w-full h-full")}
				</div>

				{/* Bottom-Left Quadrant */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-zinc-800 bg-black ${
						mobileActiveTab === "coronal" ? "flex" : "hidden lg:flex"
					}`}
					data-testid="cbct-implant-bottom-left-viewport"
				>
					{viewMode === "pano_cross_mode" ? renderers.renderAxial("flex-1 flex flex-col w-full h-full") : renderers.renderSagittal("flex-1 flex flex-col w-full h-full")}
				</div>

				{/* Bottom-Right Quadrant: Surgeon Planning & Misch D1-D5 Station */}
				<div
					className="flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-y-auto border border-amber-500/50 bg-zinc-950 p-3 gap-2.5 shadow-xl"
					data-testid="cbct-implant-surgeon-station-panel"
				>
					<div className="flex items-center justify-between border-b border-zinc-800 pb-2">
						<div className="flex items-center gap-1.5">
							<DentalImplant className="w-4 h-4 text-amber-400" />
							<h3 className="text-xs font-bold text-zinc-100">Библиотека и профиль Карла Миша</h3>
						</div>
						<div className="flex items-center gap-1">
							<span
								className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
									isNerveDanger
										? "bg-rose-950/80 text-rose-300 border-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
										: isNerveWarning
											? "bg-amber-950/80 text-amber-300 border-amber-500/80"
											: "bg-emerald-950/80 text-emerald-300 border-emerald-500/80"
								}`}
								data-testid="cbct-implant-nerve-safety-badge"
							>
								{isNerveDanger ? <ShieldAlert className="w-3 h-3 text-rose-400" /> : <ShieldCheck className="w-3 h-3 text-emerald-400" />}
								<span data-testid="cbct-implant-nerve-clearance-badge">Нерв: {displayNerveClearanceMm !== null ? `${displayNerveClearanceMm.toFixed(1)} мм` : "—"}</span>
							</span>
						</div>
					</div>

					{/* Brand Select Chips */}
					<div className="flex flex-col gap-1" data-testid="cbct-selected-implant-card">
						<span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Производитель имплантата:</span>
						<div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
							{IMPLANT_BRANDS.map((b) => (
								<button
									key={b.key}
									type="button"
									onClick={() => onSelectBrand?.(b.key)}
									className={`py-1 px-1.5 rounded text-[11px] font-semibold text-center truncate border transition-colors cursor-pointer ${
										selectedBrand === b.key
											? "bg-amber-600 text-white border-amber-400 shadow-xs font-bold"
											: "bg-zinc-900 text-zinc-300 hover:text-white border-zinc-800"
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
							<span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Диаметр (Ø мм):</span>
							<div className="grid grid-cols-3 gap-1">
								{STANDARD_DIAMETERS.map((d) => (
									<button
										key={d}
										type="button"
										onClick={() => onSelectDiameterMm?.(d)}
										className={`py-1 px-1 rounded text-xs font-mono text-center border transition-colors cursor-pointer ${
											Math.abs(selectedDiameterMm - d) < 0.1
												? "bg-amber-600 text-white border-amber-400 font-bold"
												: "bg-zinc-900 text-zinc-300 hover:text-white border-zinc-800"
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
							<div className="grid grid-cols-3 gap-1">
								{STANDARD_LENGTHS.map((l) => (
									<button
										key={l}
										type="button"
										onClick={() => onSelectLengthMm?.(l)}
										className={`py-1 px-1 rounded text-xs font-mono text-center border transition-colors cursor-pointer ${
											Math.abs(selectedLengthMm - l) < 0.1
												? "bg-amber-600 text-white border-amber-400 font-bold"
												: "bg-zinc-900 text-zinc-300 hover:text-white border-zinc-800"
										}`}
										data-testid={`cbct-implant-len-${l}`}
									>
										{l.toFixed(1)}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Carl Misch Bone Quality Profile (D1-D5) */}
					<div
						className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 flex flex-col gap-1.5"
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
						<div className="grid grid-cols-3 gap-1 pt-1 text-[10px]" data-testid="cbct-implant-3zone-density">
							<div className="flex flex-col bg-zinc-950 rounded px-1.5 py-0.5 border border-zinc-800" title="Кортикальный гребень">
								<span className="text-zinc-500 text-[9px] uppercase">Гребень 20%</span>
								<span className="font-mono font-bold text-cyan-300" data-testid="misch-zone-crest-hu">
									{displayMeanHU !== null ? `${Math.round(displayMeanHU * 1.15)} HU` : "—"}
								</span>
							</div>
							<div className="flex flex-col bg-zinc-950 rounded px-1.5 py-0.5 border border-zinc-800" title="Губчатое тело">
								<span className="text-zinc-500 text-[9px] uppercase">Тело 60%</span>
								<span className="font-mono font-bold text-cyan-300" data-testid="misch-zone-core-hu">
									{displayMeanHU !== null ? `${Math.round(displayMeanHU * 0.95)} HU` : "—"}
								</span>
							</div>
							<div className="flex flex-col bg-zinc-950 rounded px-1.5 py-0.5 border border-zinc-800" title="Базальный апекс">
								<span className="text-zinc-500 text-[9px] uppercase">Апекс 20%</span>
								<span className="font-mono font-bold text-cyan-300" data-testid="misch-zone-apex-hu">
									{displayMeanHU !== null ? `${Math.round(displayMeanHU * 1.05)} HU` : "—"}
								</span>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
							<div>
								Торрк посадки: <span className="font-mono text-zinc-200 font-bold">{displayTorque}</span>
							</div>
							<div>
								Протокол: <span data-testid="cbct-implant-drilling-protocol" className="font-mono text-zinc-200 font-bold">{displayDrillingProtocol}</span>
							</div>
						</div>
					</div>

					{/* Anatomical Ridge Measurement & Doctor-Editable Form 043/u (Mandates 1, 8e) */}
					<div
						className="p-2 rounded-lg bg-zinc-900/90 border border-amber-500/30 flex flex-col gap-1.5"
						data-testid="cbct-zakharov-ridge-automation"
					>
						<div className="flex items-center justify-between text-xs">
							<span className="font-bold text-zinc-300 flex items-center gap-1">
								<Activity className="w-3.5 h-3.5 text-amber-400" />
								<span>Замер гребня (W2/W6/H):</span>
							</span>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => setEdentulousTooth(26)}
									className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
										edentulousTooth === 26
											? "bg-amber-600 text-white border-amber-400 shadow-xs"
											: "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
									}`}
									data-testid="cbct-ridge-tooth-26-btn"
									title="Позиция #26: замер альвеолярного гребня"
								>
									#26
								</button>
								<button
									type="button"
									onClick={() => setEdentulousTooth(27)}
									className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
										edentulousTooth === 27
											? "bg-amber-600 text-white border-amber-400 shadow-xs"
											: "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
									}`}
									data-testid="cbct-ridge-tooth-27-btn"
									title="Позиция #27: замер альвеолярного гребня"
								>
									#27
								</button>
								{activeCrossSection?.nearestToothFdi && activeCrossSection.nearestToothFdi !== "26" && activeCrossSection.nearestToothFdi !== "27" && (
									<span className="px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold" title="Текущий срез">
										#{activeCrossSection.nearestToothFdi}
									</span>
								)}
							</div>
						</div>

						{/* Measurements Chips: H, W2, W6 */}
						<div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-center" data-testid="cbct-ridge-measurements-badge">
							<div className="p-1 rounded bg-zinc-950 border border-zinc-800" title="Остаточная высота до дна синуса">
								<span className="text-[9px] text-zinc-500 block uppercase">H (синус)</span>
								<span className="font-bold text-amber-300">{edentulousData.crestHeightH_Mm.toFixed(1)} мм</span>
							</div>
							<div className="p-1 rounded bg-zinc-950 border border-zinc-800" title="Ширина гребня на 2 мм ниже вершины">
								<span className="text-[9px] text-zinc-500 block uppercase">W2 (-2мм)</span>
								<span className="font-bold text-cyan-300">{edentulousData.crestWidthW2_Mm.toFixed(1)} мм</span>
							</div>
							<div className="p-1 rounded bg-zinc-950 border border-zinc-800" title="Базальная ширина гребня на 6 мм ниже вершины">
								<span className="text-[9px] text-zinc-500 block uppercase">W6 (-6мм)</span>
								<span className="font-bold text-purple-300">{edentulousData.basalWidthW6_Mm.toFixed(1)} мм</span>
							</div>
						</div>

						{/* Clinical Sinus Lift Recommendation & 1-Click Form 043/u */}
						<div className="text-[10px] text-zinc-400 flex items-center justify-between pt-0.5">
							<span className="truncate">Синус: <strong className="text-zinc-200">{edentulousTooth === 26 ? "Саммерс" : "Латеральный"}</strong></span>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => setIsEditing043((prev) => !prev)}
									className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
										isEditing043
											? "bg-cyan-950 text-cyan-300 border-cyan-500"
											: "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
									}`}
									title={isEditing043 ? "Скрыть редактор протокола" : "Редактировать текст протокола 043/у"}
									data-testid="cbct-ridge-edit-043-toggle-btn"
								>
									{isEditing043 ? "Свернуть" : "Текст 043/у"}
								</button>
								<button
									type="button"
									onClick={() => {
										exportZakharovRidgeTo043Emr(edentulousData, resolvedPatient, handleExportToEmr);
										if (isEditing043 && edited043Text) {
											try {
												window.dispatchEvent(
													new CustomEvent("dente-apply-soap-protocol", {
														detail: {
															soap: {
																statusLocalis: edited043Text,
																treatmentDescription: "",
																diagnosisIcd10: "K08.1",
																diagnosisTooth: String(edentulousTooth),
															},
															immediate: true,
															mode: "smart_append",
														},
													}),
												);
											} catch {}
										}
									}}
									className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
									data-testid="cbct-ridge-export-043-btn"
									title={`Внести замеры W2/W6/H и протокол синус-лифтинга в форму 043/у (${resolvedPatient})`}
								>
									<FileText className="w-3 h-3 text-amber-400" />
									<span>В 043/у</span>
								</button>
							</div>
						</div>

						{/* Inline Doctor Editor for Form 043/u (Doctor Autonomy Mandate 1) */}
						{isEditing043 && (
							<div className="flex flex-col gap-1 pt-1 border-t border-zinc-800">
								<div className="flex items-center justify-between text-[10px] text-zinc-400">
									<span>Редактирование протокола 043/у ({resolvedPatient}):</span>
									<span className="text-zinc-500 font-mono">{edited043Text.length} симв.</span>
								</div>
								<textarea
									value={edited043Text}
									onChange={(e) => setEdited043Text(e.target.value)}
									rows={4}
									className="w-full rounded bg-zinc-950 p-1.5 text-[10px] font-mono text-zinc-200 border border-zinc-700 focus:border-amber-400 focus:outline-none resize-none leading-relaxed"
									placeholder="Текст протокола 043/у для медкарты..."
									data-testid="cbct-ridge-043-textarea"
								/>
							</div>
						)}
					</div>

					{/* 1-Click Action Buttons for Doctor */}
					<div className="grid grid-cols-2 gap-1.5 mt-auto pt-1">
						{handleExportToPlan && (
							<button
								type="button"
								onClick={handleExportToPlan}
								className="py-1.5 px-2 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
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
								className="py-1.5 px-2 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
								data-testid="cbct-implant-add-to-emr-btn"
								title="Зафиксировать позицию и протокол в медкарту (Форма 043/у)"
							>
								<Camera className="w-3.5 h-3.5" />
								<span>В медкарту 043/у</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
