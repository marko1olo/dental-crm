/**
 * DENTAL IMPLANT PLANNING & SURGICAL SAFETY MODAL
 * Clinical 3D Planning HUD, Collision Detection & Surgical Protocol Generator.
 *
 * Touch-First WCAG 2.1 Compliant (>= 48x48px interactive elements)
 * Multi-Theme CSS Tokenized (Light, Dark, Calm Teal, Cyber X-Ray, etc.)
 */

import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Bone,
	Check,
	CheckCircle2,
	ChevronRight,
	Clipboard,
	Coins,
	Compass,
	Download,
	Eye,
	FileText,
	Info,
	Layers,
	Percent,
	RotateCcw,
	Ruler,
	Save,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Thermometer,
	Wrench,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import {
	calculateKitPriceKopecks,
	findFixtureBySpecs,
	getAvailableDiameters,
	getAvailableLengths,
	getFixturesByBrand,
	getLinesByBrand,
	IMPLANT_BRANDS_METADATA,
	IMPLANT_CATALOG,
	type ImplantBrand,
	type ImplantFixture,
	type PlatformType,
} from "./implantCatalog";
import "./implantPlanning.css";
import {
	calculateInsertionAxis,
	estimateInsertionTorque,
	evaluateAdjacentRootSafety,
	evaluateInterImplantSafety,
	evaluateMandibularCanalSafety,
	evaluateMaxillarySinusSafety,
	type MischBoneDensity,
	performComprehensiveImplantSafetyAudit,
	type SafetyStatus,
	vec3,
} from "./implantPlanningMath";

export interface ImplantPlanningModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialToothFdi?: number;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly onInsertToProtocol?: (protocolText: string) => void;
	readonly onSavePlan?: (planData: unknown) => void;
}

export function ImplantPlanningModal({
	isOpen,
	onClose,
	initialToothFdi = 46,
	patientId,
	patientName = "Пациент",
	onInsertToProtocol,
	onSavePlan,
}: ImplantPlanningModalProps) {
	// Active main tab in right panel: 'safety' | 'protocol' | 'finance'
	const [activeTab, setActiveTab] = useState<"safety" | "protocol" | "finance">("safety");

	// Selected FDI Tooth (11–48)
	const [toothFdi, setToothFdi] = useState<number>(initialToothFdi);

	// Selected Implant System
	const [selectedBrand, setSelectedBrand] = useState<ImplantBrand>("straumann");
	const [selectedLine, setSelectedLine] = useState<string>("BLX");
	const [selectedDiameter, setSelectedDiameter] = useState<number>(4.1);
	const [selectedLength, setSelectedLength] = useState<number>(10.0);

	// Misch Bone Density (D1, D2, D3, D4)
	const [boneDensity, setBoneDensity] = useState<MischBoneDensity>("D2");
	const [underdrillingUsed, setUnderdrillingUsed] = useState<boolean>(false);
	const [corticalTapUsed, setCorticalTapUsed] = useState<boolean>(false);

	// Anatomical Measurements & Sliders (mm)
	const [boneHeightMm, setBoneHeightMm] = useState<number>(13.5);
	const [boneWidthMm, setBoneWidthMm] = useState<number>(7.5);
	const [canalDistanceMm, setCanalDistanceMm] = useState<number>(4.5); // For lower mandible teeth
	const [sinusSubantralHeightMm, setSinusSubantralHeightMm] = useState<number>(11.0); // For upper maxilla teeth
	const [mesialRootClearanceMm, setMesialRootClearanceMm] = useState<number>(2.5);
	const [distalRootClearanceMm, setDistalRootClearanceMm] = useState<number>(2.8);
	const [adjacentImplantClearanceMm, setAdjacentImplantClearanceMm] = useState<number>(3.8);

	// Insertion Axis Tilt Angles (degrees)
	const [mesiodistalTiltDeg, setMesiodistalTiltDeg] = useState<number>(2);
	const [buccolingualTiltDeg, setBuccolingualTiltDeg] = useState<number>(3);

	// Copied state
	const [copied, setCopied] = useState<boolean>(false);

	// Is Mandible or Maxilla based on FDI number
	const isMandible = toothFdi >= 31 && toothFdi <= 48;
	const isMaxilla = toothFdi >= 11 && toothFdi <= 28;

	// Brand Lines & Dimensions Options
	const brandLines = useMemo(() => getLinesByBrand(selectedBrand), [selectedBrand]);

	// Handle Brand change
	const handleBrandChange = useCallback((brand: ImplantBrand) => {
		setSelectedBrand(brand);
		const lines = getLinesByBrand(brand);
		const firstLine = lines[0] ?? "Standard";
		setSelectedLine(firstLine);

		const dias = getAvailableDiameters(brand, firstLine);
		const dia = dias[0] ?? 4.0;
		setSelectedDiameter(dia);

		const lens = getAvailableLengths(brand, firstLine, dia);
		const len = lens[0] ?? 10.0;
		setSelectedLength(len);
	}, []);

	// Handle Line change
	const handleLineChange = useCallback(
		(line: string) => {
			setSelectedLine(line);
			const dias = getAvailableDiameters(selectedBrand, line);
			const dia = dias.includes(selectedDiameter) ? selectedDiameter : (dias[0] ?? 4.0);
			setSelectedDiameter(dia);

			const lens = getAvailableLengths(selectedBrand, line, dia);
			const len = lens.includes(selectedLength) ? selectedLength : (lens[0] ?? 10.0);
			setSelectedLength(len);
		},
		[selectedBrand, selectedDiameter, selectedLength],
	);

	// Handle Diameter change
	const handleDiameterChange = useCallback(
		(dia: number) => {
			setSelectedDiameter(dia);
			const lens = getAvailableLengths(selectedBrand, selectedLine, dia);
			if (!lens.includes(selectedLength)) {
				setSelectedLength(lens[0] ?? 10.0);
			}
		},
		[selectedBrand, selectedLine, selectedLength],
	);

	// Available diameters & lengths for currently selected system
	const availableDiameters = useMemo(
		() => getAvailableDiameters(selectedBrand, selectedLine),
		[selectedBrand, selectedLine],
	);

	const availableLengths = useMemo(
		() => getAvailableLengths(selectedBrand, selectedLine, selectedDiameter),
		[selectedBrand, selectedLine, selectedDiameter],
	);

	// Current Fixture Object
	const currentFixture = useMemo(() => {
		const found = findFixtureBySpecs(
			selectedBrand,
			selectedLine,
			selectedDiameter,
			selectedLength,
		);
		if (found) return found;
		// Fallback to first matching
		const list = getFixturesByBrand(selectedBrand);
		return (list[0] ?? IMPLANT_CATALOG[0])!;
	}, [selectedBrand, selectedLine, selectedDiameter, selectedLength]);

	// Comprehensive Safety & Biomechanical Calculations
	const audit = useMemo(() => {
		const entry = vec3(0, 0, 0);
		// Project apex based on length and tilts
		const radMD = (mesiodistalTiltDeg * Math.PI) / 180;
		const radBL = (buccolingualTiltDeg * Math.PI) / 180;
		const dx = Math.sin(radMD) * currentFixture.lengthMm;
		const dy = Math.sin(radBL) * currentFixture.lengthMm;
		const dz = -Math.cos(Math.max(Math.abs(radMD), Math.abs(radBL))) * currentFixture.lengthMm;
		const apex = vec3(dx, dy, dz);

		// Virtual Mandibular Canal Centerline (relative to crest)
		const canalZ = -(currentFixture.lengthMm + canalDistanceMm);
		const canal = {
			centerlinePoints: [
				vec3(-15, 0, canalZ),
				vec3(0, 0, canalZ),
				vec3(15, 0, canalZ),
			],
			canalRadiusMm: 1.5,
		};

		// Virtual Adjacent Roots
		const adjRoots = [
			{
				toothNumberFdi: toothFdi - 1,
				crownPoint: vec3(-6.5, 0, 0),
				apexPoint: vec3(-(6.5 + mesialRootClearanceMm), 0, -14),
				rootRadiusMm: 1.8,
			},
			{
				toothNumberFdi: toothFdi + 1,
				crownPoint: vec3(6.5, 0, 0),
				apexPoint: vec3(6.5 + distalRootClearanceMm, 0, -14),
				rootRadiusMm: 1.8,
			},
		];

		return performComprehensiveImplantSafetyAudit({
			toothNumberFdi: toothFdi,
			fixture: currentFixture,
			entryPoint: entry,
			apexPoint: apex,
			boneDensity,
			mandibularCanal: isMandible ? canal : null,
			maxillarySinusHeightMm: isMaxilla ? sinusSubantralHeightMm : null,
			adjacentRoots: adjRoots,
			underdrillingUsed,
			corticalTapUsed,
		});
	}, [
		toothFdi,
		currentFixture,
		mesiodistalTiltDeg,
		buccolingualTiltDeg,
		canalDistanceMm,
		sinusSubantralHeightMm,
		mesialRootClearanceMm,
		distalRootClearanceMm,
		boneDensity,
		underdrillingUsed,
		corticalTapUsed,
		isMandible,
		isMaxilla,
	]);

	// Kopeck-Exact Financial Cost Breakdown
	const kitCost = useMemo(() => {
		return calculateKitPriceKopecks(currentFixture, {
			includeHealingCap: true,
			includeTransfer: true,
			includeAbutment: true,
			includeGuidedSleeve: true,
		});
	}, [currentFixture]);

	// Copy surgical protocol to clipboard
	const handleCopyProtocol = useCallback(() => {
		const fullText = `${audit.surgicalProtocolText}\n\nСмета компонентов:\n- Имплантат ${currentFixture.brandName} ${currentFixture.line}: ${(currentFixture.fixturePriceKopecks / 100).toFixed(2)} ₽\n- Формирователь десны: ${(currentFixture.healingCapPriceKopecks / 100).toFixed(2)} ₽\n- Трансфер слепочный / Сканбоди: ${(currentFixture.transferPriceKopecks / 100).toFixed(2)} ₽\n- Абатмент титановый: ${(currentFixture.standardAbutmentPriceKopecks / 100).toFixed(2)} ₽\n- Навигационная гильза: ${(currentFixture.guidedSleevePriceKopecks / 100).toFixed(2)} ₽\nИТОГО ПО КОМПЛЕКТУ: ${kitCost.totalRublesFormatted}`;

		navigator.clipboard.writeText(fullText).then(() => {
			setCopied(true);
			showToast("Хирургический протокол имплантации скопирован", "success");
			setTimeout(() => setCopied(false), 2500);
		});
	}, [audit.surgicalProtocolText, currentFixture, kitCost]);

	// Insert protocol into Form 043/u
	const handleInsertProtocol = useCallback(() => {
		if (onInsertToProtocol) {
			onInsertToProtocol(audit.surgicalProtocolText);
			showToast("Протокол успешно вставлен в дневник 043/у", "success");
			onClose();
		}
	}, [audit.surgicalProtocolText, onInsertToProtocol, onClose]);

	// Save plan handler
	const handleSavePlan = useCallback(() => {
		if (onSavePlan) {
			onSavePlan({
				toothFdi,
				fixtureId: currentFixture.id,
				brand: currentFixture.brand,
				line: currentFixture.line,
				diameterMm: currentFixture.diameterMm,
				lengthMm: currentFixture.lengthMm,
				boneDensity,
				angulationDeg: audit.insertionAxis.totalAngulationDeg,
				expectedTorqueNcm: audit.torqueEstimate.expectedTorqueMeanNcm,
				kitCostKopecks: kitCost.totalKitKopecks,
			});
		}
		showToast("3D-план имплантации сохранен", "success");
	}, [toothFdi, currentFixture, boneDensity, audit, kitCost, onSavePlan]);

	if (!isOpen) return null;
	if (typeof document === "undefined") return null;

	return createPortal(
		<div
			className="implant-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="implant-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="implant-modal-container">
				{/* ─── MODAL HEADER ──────────────────────────────────────────────── */}
				<header className="px-5 py-3.5 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 flex items-center justify-between bg-[var(--surface,#f8fafc)] dark:bg-slate-900/80 backdrop-blur shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shadow-sm shrink-0">
							<Bone size={22} />
						</div>
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<h2
									id="implant-modal-title"
									className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] dark:text-white tracking-tight"
								>
									3D-Планирование дентальной имплантации
								</h2>
								<span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]">
									Зуб FDI {toothFdi} ({isMandible ? "Нижняя челюсть" : "Верхняя челюсть"})
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
								Пациент: <strong className="text-[var(--ink,#0f172a)] dark:text-slate-200">{patientName}</strong>{" "}
								• Защита анатомических зон (IAN, Sinus, Roots, Papilla)
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* FDI Tooth Selector Dropdown / Stepper */}
						<div className="flex items-center gap-1 bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700 rounded-lg p-1">
							<label htmlFor="fdi-select" className="text-xs font-bold text-[var(--muted,#64748b)] px-1">
								FDI:
							</label>
							<select
								id="fdi-select"
								value={toothFdi}
								onChange={(e) => setToothFdi(Number(e.target.value))}
								className="text-xs font-bold bg-transparent text-[var(--ink,#0f172a)] dark:text-white focus:outline-none cursor-pointer"
							>
								<optgroup label="Верхняя челюсть (Maxilla)">
									{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((fdi) => (
										<option key={fdi} value={fdi}>
											Зуб {fdi}
										</option>
									))}
								</optgroup>
								<optgroup label="Нижняя челюсть (Mandible)">
									{[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((fdi) => (
										<option key={fdi} value={fdi}>
											Зуб {fdi}
										</option>
									))}
								</optgroup>
							</select>
						</div>

						<button
							type="button"
							onClick={onClose}
							aria-label="Закрыть окно планирования"
							className="implant-touch-button w-10 h-10 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-800"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* ─── MODAL MAIN CONTENT GRID (3 PANELS) ────────────────────────── */}
				<div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
					{/* ─── LEFT COLUMN: FIXTURE SELECTOR & PARAMETERS (4 cols) ────── */}
					<div className="lg:col-span-4 flex flex-col gap-4">
						{/* Brand Selector Tabs (Touch-First >= 48px) */}
						<div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-3">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
								<Wrench size={14} className="text-[var(--teal)]" />
								Система имплантатов
							</span>

							{/* 5 Core Brands Buttons */}
							<div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-3 gap-1.5">
								{(
									[
										"straumann",
										"nobel_biocare",
										"osstem",
										"dentium",
										"astra_tech",
									] as ImplantBrand[]
								).map((brand) => {
									const meta = IMPLANT_BRANDS_METADATA[brand];
									const isActive = selectedBrand === brand;
									return (
										<button
											key={brand}
											type="button"
											onClick={() => handleBrandChange(brand)}
											className={`implant-touch-button flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-bold transition-all ${
												isActive
													? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-sm"
													: "bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-slate-300 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:border-[var(--teal)]"
											}`}
										>
											<span>{meta.name}</span>
											<span
												className={`text-[9px] font-normal ${
													isActive ? "text-white/80" : "text-[var(--muted,#64748b)]"
												}`}
											>
												{meta.country}
											</span>
										</button>
									);
								})}
							</div>

							{/* Line Selector Pills */}
							<div className="flex flex-col gap-1.5">
								<span className="text-xs font-semibold text-[var(--ink,#0f172a)] dark:text-slate-400">
									Линейка имплантата:
								</span>
								<div className="flex flex-wrap gap-1.5">
									{brandLines.map((line) => {
										const isActive = selectedLine === line;
										return (
											<button
												key={line}
												type="button"
												onClick={() => handleLineChange(line)}
												className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
													isActive
														? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm"
														: "bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-slate-300 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:border-slate-500"
												}`}
											>
												{line}
											</button>
										);
									})}
								</div>
							</div>

							{/* Diameter Selector (>= 48px buttons) */}
							<div className="flex flex-col gap-1.5">
								<span className="text-xs font-semibold text-[var(--ink,#0f172a)] dark:text-slate-400 flex items-center justify-between">
									<span>Диаметр (Ø мм):</span>
									<span className="font-bold text-[var(--teal)]">
										Ø {selectedDiameter.toFixed(1)} мм
									</span>
								</span>
								<div className="flex flex-wrap gap-1.5">
									{availableDiameters.map((dia) => {
										const isActive = Math.abs(selectedDiameter - dia) < 0.05;
										return (
											<button
												key={dia}
												type="button"
												onClick={() => handleDiameterChange(dia)}
												className={`implant-spec-pill ${isActive ? "active" : ""}`}
											>
												<span className="text-xs">Ø</span>
												<span className="text-sm font-bold">{dia.toFixed(1)}</span>
											</button>
										);
									})}
								</div>
							</div>

							{/* Length Selector (>= 48px buttons) */}
							<div className="flex flex-col gap-1.5">
								<span className="text-xs font-semibold text-[var(--ink,#0f172a)] dark:text-slate-400 flex items-center justify-between">
									<span>Длина (L мм):</span>
									<span className="font-bold text-[var(--teal)]">
										{selectedLength.toFixed(1)} мм
									</span>
								</span>
								<div className="flex flex-wrap gap-1.5">
									{availableLengths.map((len) => {
										const isActive = Math.abs(selectedLength - len) < 0.05;
										return (
											<button
												key={len}
												type="button"
												onClick={() => setSelectedLength(len)}
												className={`implant-spec-pill ${isActive ? "active" : ""}`}
											>
												<span className="text-xs font-normal">L</span>
												<span className="text-sm font-bold">{len.toFixed(1)}</span>
											</button>
										);
									})}
								</div>
							</div>
						</div>

						{/* Misch Bone Density & Tapping Controls */}
						<div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-3">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
								<Activity size={14} className="text-[var(--teal)]" />
								Плотность кости (Misch Classification)
							</span>

							<div className="grid grid-cols-4 gap-1.5">
								{(["D1", "D2", "D3", "D4"] as MischBoneDensity[]).map((d) => {
									const isActive = boneDensity === d;
									return (
										<button
											key={d}
											type="button"
											onClick={() => setBoneDensity(d)}
											className={`implant-density-btn flex flex-col items-center justify-center ${
												isActive ? "active" : ""
											}`}
										>
											<span className="text-sm font-bold">{d}</span>
											<span className="text-[9px] font-normal opacity-80">
												{d === "D1" ? ">1250" : d === "D2" ? "850-1250" : d === "D3" ? "350-850" : "<350"}
											</span>
										</button>
									);
								})}
							</div>

							<div className="flex flex-col gap-2 pt-1 border-t border-[var(--line,#e2e8f0)] dark:border-slate-700">
								<label className="flex items-center justify-between text-xs cursor-pointer select-none">
									<span className="text-[var(--ink,#0f172a)] dark:text-slate-300">
										Недопрепарирование (Underdrilling)
									</span>
									<input
										type="checkbox"
										checked={underdrillingUsed}
										onChange={(e) => setUnderdrillingUsed(e.target.checked)}
										className="w-4 h-4 rounded accent-[var(--teal)] cursor-pointer"
									/>
								</label>

								<label className="flex items-center justify-between text-xs cursor-pointer select-none">
									<span className="text-[var(--ink,#0f172a)] dark:text-slate-300">
										Кортикальный метчик (Bone Tap)
									</span>
									<input
										type="checkbox"
										checked={corticalTapUsed}
										onChange={(e) => setCorticalTapUsed(e.target.checked)}
										className="w-4 h-4 rounded accent-[var(--teal)] cursor-pointer"
									/>
								</label>
							</div>
						</div>

						{/* Anatomical Dimension Steppers */}
						<div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-3">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
								<Ruler size={14} className="text-[var(--teal)]" />
								Анатомические дистанции (КТ/CBCT)
							</span>

							{/* Mandible Canal Distance */}
							{isMandible && (
								<div className="flex items-center justify-between text-xs">
									<span className="text-slate-700 dark:text-slate-300">
										Дистанция до канала (IAN):
									</span>
									<div className="flex items-center gap-1.5">
										<input
											type="number"
											step="0.5"
											min="-2.0"
											max="15.0"
											value={canalDistanceMm}
											onChange={(e) => setCanalDistanceMm(Number(e.target.value))}
											className="w-16 px-2 py-1 text-right font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
										/>
										<span className="text-slate-500">мм</span>
									</div>
								</div>
							)}

							{/* Maxilla Sinus Subantral Height */}
							{isMaxilla && (
								<div className="flex items-center justify-between text-xs">
									<span className="text-slate-700 dark:text-slate-300">
										Остаточная кость под синусом:
									</span>
									<div className="flex items-center gap-1.5">
										<input
											type="number"
											step="0.5"
											min="1.0"
											max="20.0"
											value={sinusSubantralHeightMm}
											onChange={(e) => setSinusSubantralHeightMm(Number(e.target.value))}
											className="w-16 px-2 py-1 text-right font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
										/>
										<span className="text-slate-500">мм</span>
									</div>
								</div>
							)}

							{/* Adjacent Mesial Root */}
							<div className="flex items-center justify-between text-xs">
								<span className="text-slate-700 dark:text-slate-300">
									Зазор до медиального корня:
								</span>
								<div className="flex items-center gap-1.5">
									<input
										type="number"
										step="0.1"
										min="0.0"
										max="8.0"
										value={mesialRootClearanceMm}
										onChange={(e) => setMesialRootClearanceMm(Number(e.target.value))}
										className="w-16 px-2 py-1 text-right font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
									/>
									<span className="text-slate-500">мм</span>
								</div>
							</div>

							{/* Adjacent Distal Root */}
							<div className="flex items-center justify-between text-xs">
								<span className="text-slate-700 dark:text-slate-300">
									Зазор до дистального корня:
								</span>
								<div className="flex items-center gap-1.5">
									<input
										type="number"
										step="0.1"
										min="0.0"
										max="8.0"
										value={distalRootClearanceMm}
										onChange={(e) => setDistalRootClearanceMm(Number(e.target.value))}
										className="w-16 px-2 py-1 text-right font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
									/>
									<span className="text-slate-500">мм</span>
								</div>
							</div>

							{/* Tilts */}
							<div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
								<div className="flex flex-col gap-1">
									<span className="text-[11px] text-slate-500">Наклон MD (°):</span>
									<input
										type="number"
										step="1"
										min="-30"
										max="30"
										value={mesiodistalTiltDeg}
										onChange={(e) => setMesiodistalTiltDeg(Number(e.target.value))}
										className="px-2 py-1 font-bold text-center rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
									/>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-[11px] text-slate-500">Наклон BL (°):</span>
									<input
										type="number"
										step="1"
										min="-30"
										max="30"
										value={buccolingualTiltDeg}
										onChange={(e) => setBuccolingualTiltDeg(Number(e.target.value))}
										className="px-2 py-1 font-bold text-center rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* ─── MIDDLE COLUMN: 2D/3D VISUAL CROSS-SECTION (4 cols) ────── */}
					<div className="lg:col-span-4 flex flex-col gap-3">
						{/* Overall Status Banner */}
						<div
							className={`p-3 rounded-xl border flex items-center gap-3 shadow-sm ${
								audit.overallStatus === "danger"
									? "implant-badge-danger"
									: audit.overallStatus === "warning"
										? "implant-badge-warning"
										: "implant-badge-safe"
							}`}
						>
							{audit.overallStatus === "danger" ? (
								<AlertOctagon size={24} className="shrink-0" />
							) : audit.overallStatus === "warning" ? (
								<AlertTriangle size={24} className="shrink-0" />
							) : (
								<ShieldCheck size={24} className="shrink-0" />
							)}
							<div className="flex-1 min-w-0">
								<div className="text-xs font-bold uppercase tracking-wider">
									{audit.overallStatus === "danger"
										? "КРИТИЧЕСКИЙ РИСК (БЛОКИРОВКА)"
										: audit.overallStatus === "warning"
											? "ТРЕБУЕТСЯ КОРРЕКЦИЯ / СИНУС-ЛИФТИНГ"
											: "БЕЗОПАСНЫЙ 3D-ПРОТОКОЛ"}
								</div>
								<div className="text-xs truncate font-medium">
									{audit.overallStatus === "danger"
										? "Нарушен барьер безопасности IAN (< 2.0 мм) или корня (< 1.5 мм)"
										: audit.overallStatus === "warning"
											? "Предупреждение по пазухе или углу введения"
											: "Все дистанции соответствуют золотому стандарту"}
								</div>
							</div>
						</div>

						{/* Interactive SVG Cross-Section Canvas */}
						<div className="implant-cross-section-viewport relative flex-1 min-h-[380px] p-2 flex flex-col items-center justify-center">
							<svg
								viewBox="-60 -30 120 190"
								className="w-full h-full max-h-[460px] select-none"
							>
								{/* Grid & Ruler Guidelines */}
								<defs>
									<pattern id="grid-dots" width="10" height="10" patternUnits="userSpaceOnUse">
										<circle cx="2" cy="2" r="0.5" fill="#334155" opacity="0.4" />
									</pattern>
									<linearGradient id="bone-grad" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
										<stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
									</linearGradient>
									<linearGradient id="implant-metal" x1="0" y1="0" x2="1" y2="0">
										<stop offset="0%" stopColor="#94a3b8" />
										<stop offset="50%" stopColor="#cbd5e1" />
										<stop offset="100%" stopColor="#64748b" />
									</linearGradient>
								</defs>

								<rect x="-60" y="-30" width="120" height="190" fill="url(#grid-dots)" />

								{/* Bone Ridge Contour (Maxilla or Mandible Profile) */}
								<path
									d="M -50,0 Q -30,-5 0,-5 Q 30,-5 50,0 L 50,150 Q 0,155 -50,150 Z"
									fill="url(#bone-grad)"
									stroke="#334155"
									strokeWidth="1.5"
								/>

								{/* Cortical Crest Line */}
								<line x1="-45" y1="-5" x2="45" y2="-5" stroke="#0d9488" strokeWidth="1" strokeDasharray="2 2" />
								<text x="35" y="-8" fill="#0d9488" fontSize="5" fontWeight="bold" textAnchor="end">
									Гребень 0.0 мм
								</text>

								{/* Sinus Cavity for Maxilla */}
								{isMaxilla && (
									<g>
										<path
											d={`M -45,${sinusSubantralHeightMm * 6} Q 0,${(sinusSubantralHeightMm - 2) * 6} 45,${sinusSubantralHeightMm * 6}`}
											fill="none"
											stroke="#38bdf8"
											strokeWidth="2"
										/>
										<text
											x="0"
											y={sinusSubantralHeightMm * 6 + 10}
											fill="#38bdf8"
											fontSize="5"
											fontWeight="bold"
											textAnchor="middle"
										>
											Дно гайморовой пазухи ({sinusSubantralHeightMm} мм)
										</text>
									</g>
								)}

								{/* Mandibular Canal Circle for Mandible */}
								{isMandible && (
									<g>
										{/* 2.0 mm Danger Buffer Ring */}
										<circle
											cx="0"
											cy={(currentFixture.lengthMm + canalDistanceMm) * 6}
											r={(1.5 + 2.0) * 6}
											fill="rgba(239, 68, 68, 0.12)"
											stroke="#ef4444"
											strokeWidth="1"
											strokeDasharray="2 2"
										/>
										{/* Canal Center Circle */}
										<circle
											cx="0"
											cy={(currentFixture.lengthMm + canalDistanceMm) * 6}
											r={1.5 * 6}
											fill="#ef4444"
											opacity="0.8"
										/>
										<text
											x="0"
											y={(currentFixture.lengthMm + canalDistanceMm) * 6 + 18}
											fill="#fca5a5"
											fontSize="5"
											fontWeight="bold"
											textAnchor="middle"
										>
											Нижнечелюстной канал IAN (зазор {canalDistanceMm} мм)
										</text>
									</g>
								)}

								{/* Neighboring Tooth Roots Schematics */}
								{/* Mesial Root */}
								<path
									d={`M -30,0 Q -${25 + mesialRootClearanceMm * 2},40 -${20 + mesialRootClearanceMm * 3},80`}
									fill="none"
									stroke="#64748b"
									strokeWidth="6"
									strokeLinecap="round"
									opacity="0.7"
								/>
								<text
									x={`-${22 + mesialRootClearanceMm * 2}`}
									y="45"
									fill="#94a3b8"
									fontSize="4.5"
									fontWeight="bold"
								>
									FDI {toothFdi - 1} ({mesialRootClearanceMm} мм)
								</text>

								{/* Distal Root */}
								<path
									d={`M 30,0 Q ${25 + distalRootClearanceMm * 2},40 ${20 + distalRootClearanceMm * 3},80`}
									fill="none"
									stroke="#64748b"
									strokeWidth="6"
									strokeLinecap="round"
									opacity="0.7"
								/>
								<text
									x={`${12 + distalRootClearanceMm * 2}`}
									y="45"
									fill="#94a3b8"
									fontSize="4.5"
									fontWeight="bold"
								>
									FDI {toothFdi + 1} ({distalRootClearanceMm} мм)
								</text>

								{/* Scaled Implant Fixture Cylinder with Angulation */}
								<g
									transform={`rotate(${mesiodistalTiltDeg}, 0, 0)`}
									className="transition-transform duration-200"
								>
									{/* Platform Collar */}
									<rect
										x={-(currentFixture.diameterMm * 3)}
										y="-2"
										width={currentFixture.diameterMm * 6}
										height="4"
										rx="1"
										fill="#e2e8f0"
										stroke="#0f172a"
										strokeWidth="0.5"
									/>

									{/* Implant Body Tapered Polygon */}
									<polygon
										points={`-${currentFixture.diameterMm * 3},2 ${currentFixture.diameterMm * 3},2 ${currentFixture.apexDiameterMm * 3},${currentFixture.lengthMm * 6} -${currentFixture.apexDiameterMm * 3},${currentFixture.lengthMm * 6}`}
										fill="url(#implant-metal)"
										stroke="#0f766e"
										strokeWidth="1"
									/>

									{/* Thread Ridges */}
									{Array.from({
										length: Math.floor(currentFixture.lengthMm / 1.5),
									}).map((_, idx) => (
										<line
											key={idx}
											x1={-(currentFixture.diameterMm * 2.8)}
											y1={8 + idx * 9}
											x2={currentFixture.diameterMm * 2.8}
											y2={8 + idx * 9}
											stroke="#475569"
											strokeWidth="0.75"
										/>
									))}

									{/* Apex Point Marker */}
									<circle
										cx="0"
										cy={currentFixture.lengthMm * 6}
										r="1.5"
										fill="#14b8a6"
									/>

									{/* Guided Sleeve Representation */}
									<rect
										x={-(currentFixture.guidedSleeve.sleeveDiameterMm * 3)}
										y="-18"
										width={currentFixture.guidedSleeve.sleeveDiameterMm * 6}
										height={currentFixture.guidedSleeve.sleeveHeightMm * 2}
										fill="rgba(56, 189, 248, 0.25)"
										stroke="#38bdf8"
										strokeWidth="0.75"
										strokeDasharray="2 1"
									/>
									<text
										x="0"
										y="-20"
										fill="#38bdf8"
										fontSize="4"
										fontWeight="bold"
										textAnchor="middle"
									>
										Гильза Ø{currentFixture.guidedSleeve.sleeveDiameterMm} (H {currentFixture.guidedSleeve.sleeveHeightMm})
									</text>
								</g>
							</svg>

							{/* Overlay Dimension Callout Badges */}
							<div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] text-slate-300">
								<span>
									Наклон оси: <strong>{audit.insertionAxis.totalAngulationDeg}°</strong>
								</span>
								<span>
									Абатмент: <strong>{audit.insertionAxis.recommendedAbutmentAngleDeg}°</strong>
								</span>
								<span>
									Торк: <strong>{audit.torqueEstimate.expectedTorqueMeanNcm} Нсм</strong>
								</span>
							</div>
						</div>
					</div>

					{/* ─── RIGHT COLUMN: TABS (SAFETY / PROTOCOL / FINANCE) (4 cols) ─ */}
					<div className="lg:col-span-4 flex flex-col gap-3">
						{/* Tab Navigation */}
						<div className="grid grid-cols-3 p-1 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700">
							<button
								type="button"
								onClick={() => setActiveTab("safety")}
								className={`py-2 text-xs font-bold rounded-lg transition-all ${
									activeTab === "safety"
										? "bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--teal)] shadow-sm"
										: "text-[var(--muted,#64748b)] dark:text-slate-400 hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Безопасность
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("protocol")}
								className={`py-2 text-xs font-bold rounded-lg transition-all ${
									activeTab === "protocol"
										? "bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--teal)] shadow-sm"
										: "text-[var(--muted,#64748b)] dark:text-slate-400 hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Протокол сверления
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("finance")}
								className={`py-2 text-xs font-bold rounded-lg transition-all ${
									activeTab === "finance"
										? "bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--teal)] shadow-sm"
										: "text-[var(--muted,#64748b)] dark:text-slate-400 hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Смета (Копейки)
							</button>
						</div>

						{/* ─── TAB 1: SAFETY & BIOMECHANICS ──────────────────────────── */}
						{activeTab === "safety" && (
							<div className="flex flex-col gap-3">
								{/* Safety Rules Checks List */}
								<div className="flex flex-col gap-2">
									{/* IAN Canal Rule */}
									{isMandible && audit.mandibularCanalResult && (
										<div
											className={`p-3 rounded-xl border flex flex-col gap-1 ${
												audit.mandibularCanalResult.status === "danger"
													? "implant-badge-danger"
													: audit.mandibularCanalResult.status === "warning"
														? "implant-badge-warning"
														: "implant-badge-safe"
											}`}
										>
											<div className="flex items-center justify-between font-bold text-xs">
												<span>Нижнечелюстной канал (IAN ≥ 2.0 мм)</span>
												<span>{audit.mandibularCanalResult.clearanceMm} мм</span>
											</div>
											<p className="text-[11px] leading-tight">
												{audit.mandibularCanalResult.clinicalMessage}
											</p>
										</div>
									)}

									{/* Maxillary Sinus Rule */}
									{isMaxilla && audit.maxillarySinusResult && (
										<div
											className={`p-3 rounded-xl border flex flex-col gap-1 ${
												audit.maxillarySinusResult.status === "danger"
													? "implant-badge-danger"
													: audit.maxillarySinusResult.status === "warning"
														? "implant-badge-warning"
														: "implant-badge-safe"
											}`}
										>
											<div className="flex items-center justify-between font-bold text-xs">
												<span>Дно гайморовой пазухи (Sinus Floor)</span>
												<span>{audit.maxillarySinusResult.subantralBoneHeightMm} мм</span>
											</div>
											<p className="text-[11px] leading-tight">
												{audit.maxillarySinusResult.clinicalMessage}
											</p>
										</div>
									)}

									{/* Root Clearances */}
									<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-1.5">
										<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-300">
											Дистанция до корней (≥ 1.5 мм):
										</span>
										<div className="flex items-center justify-between text-xs">
											<span>Медиальный корень FDI {toothFdi - 1}:</span>
											<strong
												className={
													mesialRootClearanceMm < 1.5
														? "text-rose-600 font-bold"
														: "text-emerald-600 font-bold"
												}
											>
												{mesialRootClearanceMm} мм
											</strong>
										</div>
										<div className="flex items-center justify-between text-xs">
											<span>Дистальный корень FDI {toothFdi + 1}:</span>
											<strong
												className={
													distalRootClearanceMm < 1.5
														? "text-rose-600 font-bold"
														: "text-emerald-600 font-bold"
												}
											>
												{distalRootClearanceMm} мм
											</strong>
										</div>
									</div>
								</div>

								{/* Torque & Stability Gauge */}
								<div className="p-3.5 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex flex-col gap-2.5">
									<div className="flex items-center justify-between">
										<span className="text-xs font-bold text-[var(--teal)] flex items-center gap-1.5">
											<Zap size={14} className="text-[var(--teal)]" />
											Первичная стабильность и торк
										</span>
										<span
											className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
												audit.torqueEstimate.isImmediateLoadingEligible
													? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
													: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
											}`}
										>
											{audit.torqueEstimate.isImmediateLoadingEligible
												? "Немедленная нагрузка (35–45 Нсм)"
												: "Отсроченная нагрузка"}
										</span>
									</div>

									<div className="flex items-baseline justify-between">
										<span className="text-2xl font-black text-[var(--ink,#0f172a)] dark:text-white">
											{audit.torqueEstimate.expectedTorqueMinNcm}–
											{audit.torqueEstimate.expectedTorqueMaxNcm}
											<span className="text-sm font-normal text-[var(--muted,#64748b)] ml-1">Нсм</span>
										</span>
										<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
											Средний: <strong>{audit.torqueEstimate.expectedTorqueMeanNcm} Нсм</strong>
										</span>
									</div>

									<p className="text-[11px] text-[var(--ink,#0f172a)] dark:text-slate-300 leading-normal">
										{audit.torqueEstimate.surgicalTactics}
									</p>
								</div>
							</div>
						)}

						{/* ─── TAB 2: SURGICAL DRILL PROTOCOL ────────────────────────── */}
						{activeTab === "protocol" && (
							<div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
								<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-300">
									Пошаговая последовательность сверл ({currentFixture.brandName} {currentFixture.line}):
								</span>
								{currentFixture.drillSequence.map((step) => (
									<div
										key={step.stepNumber}
										className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-[var(--line,#e2e8f0)] dark:border-slate-700 flex items-start gap-2.5"
									>
										<span className="w-5 h-5 rounded-full bg-[var(--teal)] text-white font-bold text-xs flex items-center justify-center shrink-0">
											{step.stepNumber}
										</span>
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white">
												<span className="truncate">{step.drillName}</span>
												<span className="text-[var(--teal)] shrink-0 ml-2">
													{step.targetRpm} об/мин
												</span>
											</div>
											<div className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center justify-between mt-0.5">
												<span>{step.depthGuide}</span>
												{step.isBoneDenseOnly && (
													<span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
														Только D1/D2
													</span>
												)}
											</div>
										</div>
									</div>
								))}

								{/* Sleeve Specs */}
								<div className="p-3 rounded-lg bg-[var(--info-bg,rgba(2,132,199,0.1))] border border-[var(--info-fg,rgba(2,132,199,0.3))] text-xs text-[var(--info-fg,#0284c7)] flex flex-col gap-1">
									<strong className="font-bold flex items-center gap-1.5">
										<Info size={14} /> Навигационная гильза шаблона:
									</strong>
									<span>
										Внешний Ø: {currentFixture.guidedSleeve.sleeveDiameterMm} мм • Высота:{" "}
										{currentFixture.guidedSleeve.sleeveHeightMm} мм • Оффсет:{" "}
										{currentFixture.guidedSleeve.offsetMm} мм
									</span>
									<span className="text-[10px] opacity-80">
										Артикул: {currentFixture.guidedSleeve.sleeveArticle}
									</span>
								</div>
							</div>
						)}

						{/* ─── TAB 3: KOPECK-EXACT FINANCIAL BREAKDOWN ───────────────── */}
						{activeTab === "finance" && (
							<div className="flex flex-col gap-3">
								<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2">
									<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
										<Coins size={14} className="text-[var(--teal)]" />
										Смета хирургического комплекта (Копейки)
									</span>

									<div className="flex flex-col gap-1.5 text-xs">
										<div className="flex items-center justify-between">
											<span className="text-[var(--ink,#0f172a)] dark:text-slate-300">
												Имплантат {currentFixture.brandName} {currentFixture.line}:
											</span>
											<strong className="font-mono">
												{(kitCost.fixtureKopecks / 100).toFixed(2)} ₽
											</strong>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-[var(--ink,#0f172a)] dark:text-slate-300">
												Формирователь десны (Healing Cap):
											</span>
											<strong className="font-mono">
												{(kitCost.healingCapKopecks / 100).toFixed(2)} ₽
											</strong>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-[var(--ink,#0f172a)] dark:text-slate-300">
												Трансфер слепочный / Scanbody:
											</span>
											<strong className="font-mono">
												{(kitCost.transferKopecks / 100).toFixed(2)} ₽
											</strong>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-[var(--ink,#0f172a)] dark:text-slate-300">
												Абатмент стандартный титановый:
											</span>
											<strong className="font-mono">
												{(kitCost.abutmentKopecks / 100).toFixed(2)} ₽
											</strong>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-[var(--ink,#0f172a)] dark:text-slate-300">
												Навигационная гильза:
											</span>
											<strong className="font-mono">
												{(kitCost.guidedSleeveKopecks / 100).toFixed(2)} ₽
											</strong>
										</div>

										<div className="pt-2 border-t border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center justify-between text-sm font-bold text-[var(--teal)]">
											<span>ИТОГО КЛИНИЧЕСКИЙ КОМПЛЕКТ:</span>
											<span className="font-mono text-base font-black">
												{kitCost.totalRublesFormatted}
											</span>
										</div>
									</div>
								</div>

								<div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200">
									Все цены зафиксированы в копейках ({kitCost.totalKitKopecks} коп.) в
									соответствии с финансовым регламентом DENTE.
								</div>
							</div>
						)}
					</div>
				</div>

				{/* ─── MODAL FOOTER ACTIONS ──────────────────────────────────────── */}
				<footer className="px-5 py-3.5 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/80 shrink-0">
					<div className="flex items-center gap-2 text-xs text-[var(--muted,#64748b)]">
						<span>
							Выбран: <strong>{currentFixture.brandName} {currentFixture.line}</strong> (Ø
							{currentFixture.diameterMm} x {currentFixture.lengthMm} мм)
						</span>
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={handleCopyProtocol}
							className="implant-touch-button flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700"
						>
							{copied ? <Check size={16} className="text-emerald-500" /> : <Clipboard size={16} />}
							<span>{copied ? "Скопировано!" : "Копировать протокол"}</span>
						</button>

						{onInsertToProtocol && (
							<button
								type="button"
								onClick={handleInsertProtocol}
								className="implant-touch-button flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-[var(--teal)] hover:opacity-90 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
							>
								<FileText size={16} />
								<span>Вставить в карту 043/у</span>
							</button>
						)}

						<button
							type="button"
							onClick={handleSavePlan}
							className="implant-touch-button flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
						>
							<Save size={16} />
							<span>Сохранить 3D-план</span>
						</button>
					</div>
				</footer>
			</div>
		</div>,
		document.body,
	);
}
