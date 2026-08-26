import {
	Activity,
	AlertCircle,
	AlertTriangle,
	ArrowRight,
	Award,
	Check,
	CheckCircle2,
	ChevronRight,
	Clipboard,
	Compass,
	Copy,
	CornerDownRight,
	ExternalLink,
	Eye,
	FileText,
	Filter,
	Flame,
	Info,
	Layers,
	Percent,
	Printer,
	RefreshCw,
	RotateCcw,
	Save,
	Sliders,
	Smile,
	Sparkles,
	Trash2,
	User,
	Wrench,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import "./OrthodonticBracketMatrixModal.css";
import {
	ALL_FDI_TEETH,
	BRACKET_PRESCRIPTIONS,
	type BracketPrescriptionId,
	calculateTorqueDeviation,
	comparePrescriptions,
	createDefaultPatientBracketMatrix,
	formatToothNameFdi,
	getPrescription,
	isAnteriorTooth,
	isLowerTooth,
	isUpperTooth,
	LOWER_ARCH_TEETH,
	type PatientToothBracketState,
	type SlotSize,
	type ToothBracketSpec,
	type ToothBracketStatus,
	UPPER_ARCH_TEETH,
} from "./bracketPrescriptions";
import {
	type ArchwireSpec,
	type ArchwireVisitLog,
	calculateTorquePlay,
	ELASTICS_PRESETS,
	generateOrthodonticVisitSoapNote,
	getStandardSequenceForPrescription,
	MATERIAL_LABELS,
	STAGE_LABELS,
	STANDARD_ARCHWIRES,
	validateWireProgression,
	type WireMaterial,
	type WireSize,
	type WireTreatmentStage,
} from "./orthodonticWireSequencer";

export interface OrthodonticBracketMatrixModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly initialPrescription?: BracketPrescriptionId;
	readonly onInsertToProtocol?: (protocolText: string) => void;
}

export function OrthodonticBracketMatrixModal({
	isOpen,
	onClose,
	patientId,
	patientName,
	initialPrescription = "damon_q_standard",
	onInsertToProtocol,
}: OrthodonticBracketMatrixModalProps) {
	// Active Tab inside modal: 'matrix' | 'sequencer' | 'comparison' | 'journal'
	const [activeTab, setActiveTab] = useState<"matrix" | "sequencer" | "comparison" | "journal">("matrix");

	// Active Prescription
	const [prescriptionId, setPrescriptionId] = useState<BracketPrescriptionId>(initialPrescription);

	// Patient Tooth Matrix
	const [patientMatrix, setPatientMatrix] = useState<Record<number, PatientToothBracketState>>(() =>
		createDefaultPatientBracketMatrix(initialPrescription),
	);

	// Selected Tooth for Inspector Drawer
	const [selectedTooth, setSelectedTooth] = useState<number | null>(11);

	// Active Archwires State
	const [upperWireSize, setUpperWireSize] = useState<WireSize>(".014");
	const [upperWireMaterial, setUpperWireMaterial] = useState<WireMaterial>("copper_niti");
	const [lowerWireSize, setLowerWireSize] = useState<WireSize>(".014");
	const [lowerWireMaterial, setLowerWireMaterial] = useState<WireMaterial>("copper_niti");

	// Intermaxillary Elastics & Notes
	const [selectedElastics, setSelectedElastics] = useState<string>("el_class_2_fox");
	const [doctorName, setDoctorName] = useState<string>("Д-р Смирнова Е. В.");
	const [visitNotes, setVisitNotes] = useState<string>("Плановая смена дуг, контроль торка центральных резцов.");
	const [copied, setCopied] = useState<boolean>(false);

	// Comparison Tab Target Prescription
	const [comparisonTargetId, setComparisonTargetId] = useState<BracketPrescriptionId>("mbt_022");

	// Visit History Log
	const [visitHistory, setVisitHistory] = useState<ArchwireVisitLog[]>([
		{
			id: "log-1",
			visitDate: "15.01.2026",
			arch: "both",
			upperWireSize: ".014",
			upperWireMaterial: "copper_niti",
			lowerWireSize: ".014",
			lowerWireMaterial: "copper_niti",
			doctorName: "Д-р Смирнова Е. В.",
			appointmentIntervalWeeks: 8,
			notes: "Первичная фиксация брекет-системы Damon Q на обе челюсти. Установка дуг Cu-NiTi .014.",
			bracketActions: [
				{ toothNumber: 11, action: "fixed" },
				{ toothNumber: 21, action: "fixed" },
			],
		},
	]);

	const currentPrescription = useMemo(() => getPrescription(prescriptionId), [prescriptionId]);

	// Handle switching prescription system
	const handleSelectPrescription = useCallback((newId: BracketPrescriptionId) => {
		setPrescriptionId(newId);
		setPatientMatrix((prev) => {
			const pres = getPrescription(newId);
			const next: Record<number, PatientToothBracketState> = {};
			for (const tooth of ALL_FDI_TEETH) {
				const old = prev[tooth];
				const spec = pres.teeth[tooth];
				next[tooth] = {
					toothNumber: tooth,
					status: old ? old.status : tooth % 10 === 8 ? "not_indicated" : "fixed",
					customTorque: spec?.nominalTorque,
					customAngulation: spec?.nominalAngulation,
					customRotation: spec?.nominalRotation,
					slotSize: pres.slotSize,
					bracketBrand: pres.name,
					hasHook: spec?.hookAvailable ?? false,
					notes: old?.notes ?? "",
				};
			}
			return next;
		});
		showToast("Пропись изменена: " + getPrescription(newId).name, "info");
	}, []);

	// Torque Play Calculations for Active Wires
	const upperTorquePlay = useMemo(
		() => calculateTorquePlay(upperWireSize, currentPrescription.slotSize),
		[upperWireSize, currentPrescription.slotSize],
	);

	const lowerTorquePlay = useMemo(
		() => calculateTorquePlay(lowerWireSize, currentPrescription.slotSize),
		[lowerWireSize, currentPrescription.slotSize],
	);

	// Progression Safety Check
	const wireProgressionCheck = useMemo(
		() => validateWireProgression(upperWireSize, upperWireSize, currentPrescription.slotSize),
		[upperWireSize, currentPrescription.slotSize],
	);

	// Prescriptions Comparison Table
	const comparisonData = useMemo(
		() => comparePrescriptions(prescriptionId, comparisonTargetId),
		[prescriptionId, comparisonTargetId],
	);

	// Tooth Statistics
	const stats = useMemo(() => {
		let fixed = 0;
		let rebonded = 0;
		let lost = 0;
		let debonded = 0;
		for (const t of ALL_FDI_TEETH) {
			const s = patientMatrix[t]?.status;
			if (s === "fixed") fixed++;
			else if (s === "rebonded") rebonded++;
			else if (s === "lost") lost++;
			else if (s === "debonded") debonded++;
		}
		return { fixed, rebonded, lost, debonded, total: fixed + rebonded };
	}, [patientMatrix]);

	// Update individual tooth state
	const handleUpdateTooth = useCallback((toothNum: number, patch: Partial<PatientToothBracketState>) => {
		setPatientMatrix((prev) => ({
			...prev,
			[toothNum]: {
				...prev[toothNum]!,
				...patch,
				lastModified: new Date().toLocaleDateString("ru-RU"),
			},
		}));
	}, []);

	// Batch arch actions
	const handleBatchFixArch = useCallback(
		(arch: "upper" | "lower") => {
			const teethToFix = arch === "upper" ? UPPER_ARCH_TEETH : LOWER_ARCH_TEETH;
			setPatientMatrix((prev) => {
				const next = { ...prev };
				for (const t of teethToFix) {
					if (t % 10 !== 8 && next[t]) {
						next[t] = { ...next[t]!, status: "fixed" };
					}
				}
				return next;
			});
			showToast("Вся " + (arch === "upper" ? "верхняя" : "нижняя") + " челюсть зафиксирована", "success");
		},
		[],
	);

	const handleResetToNominal = useCallback(() => {
		setPatientMatrix(createDefaultPatientBracketMatrix(prescriptionId));
		showToast("Значения торка и ангуляции сброшены к номиналу прописи", "info");
	}, [prescriptionId]);

	// Create New Visit Log
	const handleSaveVisitLog = useCallback(() => {
		const elPreset = ELASTICS_PRESETS.find((e) => e.id === selectedElastics);
		const newLog: ArchwireVisitLog = {
			id: "log-" + Date.now(),
			visitDate: new Date().toLocaleDateString("ru-RU"),
			...(patientId ? { patientId } : {}),
			arch: "both",
			upperWireSize,
			upperWireMaterial,
			lowerWireSize,
			lowerWireMaterial,
			...(elPreset ? { elasticsPattern: elPreset.name + " (" + elPreset.forceLevel + ")" } : {}),
			doctorName,
			appointmentIntervalWeeks: 6,
			notes: visitNotes,
			bracketActions: selectedTooth
				? [
						{
							toothNumber: selectedTooth,
							action: patientMatrix[selectedTooth]?.status || "fixed",
						},
					]
				: [],
		};

		setVisitHistory((prev) => [newLog, ...prev]);
		showToast("Протокол приема сохранен в журнал", "success");
	}, [
		patientId,
		upperWireSize,
		upperWireMaterial,
		lowerWireSize,
		lowerWireMaterial,
		selectedElastics,
		doctorName,
		visitNotes,
		selectedTooth,
		patientMatrix,
	]);

	// Generate and Copy SOAP text
	const currentSoapText = useMemo(() => {
		const elPreset = ELASTICS_PRESETS.find((e) => e.id === selectedElastics);
		return generateOrthodonticVisitSoapNote({
			id: "current",
			visitDate: new Date().toLocaleDateString("ru-RU"),
			...(patientId ? { patientId } : {}),
			arch: "both",
			upperWireSize,
			upperWireMaterial,
			lowerWireSize,
			lowerWireMaterial,
			...(elPreset ? { elasticsPattern: elPreset.name + " (" + elPreset.dimension + " " + elPreset.forceLevel + ")" } : {}),
			doctorName,
			appointmentIntervalWeeks: 6,
			notes: visitNotes,
			bracketActions: Object.values(patientMatrix)
				.filter((t) => t.status === "rebonded" || t.status === "lost")
				.map((t) => ({ toothNumber: t.toothNumber, action: t.status })),
		});
	}, [
		patientId,
		upperWireSize,
		upperWireMaterial,
		lowerWireSize,
		lowerWireMaterial,
		selectedElastics,
		doctorName,
		visitNotes,
		patientMatrix,
	]);

	const handleCopySoap = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(currentSoapText);
			setCopied(true);
			showToast("Протокол 043/у скопирован в буфер обмена", "success");
			setTimeout(() => setCopied(false), 2500);
		} catch {
			showToast("Не удалось скопировать в буфер", "error");
		}
	}, [currentSoapText]);

	const handleInsertProtocol = useCallback(() => {
		if (onInsertToProtocol) {
			onInsertToProtocol(currentSoapText);
			showToast("Протокол вставлен в дневник приема", "success");
		} else {
			try {
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							soap: {
								treatmentDescription: currentSoapText,
							},
							mode: "smart_append",
						},
					}),
				);
				showToast("Протокол отправлен в активный дневник", "success");
			} catch {
				handleCopySoap();
			}
		}
	}, [onInsertToProtocol, currentSoapText, handleCopySoap]);

	if (!isOpen) return null;

	const modalContent = (
		<div className="ortho-matrix-overlay" onClick={onClose} data-testid="orthodontic-bracket-matrix-modal">
			<div
				className="ortho-matrix-modal"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label="Матрица брекетов и протокол смены дуг"
			>
				{/* ─── Modal Header ─── */}
				<header className="ortho-matrix-header">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal,var(--brand-primary))] text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
							<Sliders size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<span className="text-xs uppercase tracking-wider font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] px-2 py-0.5 rounded border border-[var(--teal,var(--brand-primary))]/30">
									Ортодонтия · Пропись брекетов
								</span>
								<span className="text-xs font-semibold text-[var(--muted,#64748b)]">
									Паз: {currentPrescription.slotSize}" · {currentPrescription.ligatingType === "self_ligating" ? "Самолигирующая" : "Лигатурная"}
								</span>
							</div>
							<h2 className="text-lg font-black text-[var(--ink,#0f172a)] dark:text-white m-0 mt-0.5">
								{currentPrescription.name} — {patientName || "Пациент"}
							</h2>
						</div>
					</div>

					{/* Top Right Actions */}
					<div className="flex items-center gap-2">
						<div className="hidden sm:flex items-center gap-2 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-[var(--line,#cbd5e1)] text-xs font-bold">
							<span className="text-emerald-700 dark:text-emerald-300">● {stats.fixed} зафиксировано</span>
							{stats.rebonded > 0 && <span className="text-amber-700 dark:text-amber-300">● {stats.rebonded} переклеено</span>}
							{stats.lost > 0 && <span className="text-rose-700 dark:text-rose-300">● {stats.lost} сколов</span>}
						</div>
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-800 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-colors cursor-pointer"
							title="Закрыть окно"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* ─── Navigation Tabs ─── */}
				<nav className="ortho-matrix-tabs">
					<button
						type="button"
						onClick={() => setActiveTab("matrix")}
						className={"ortho-tab-btn " + (activeTab === "matrix" ? "active" : "")}
					>
						<Compass size={16} />
						<span>1. Матрица торка и ангуляции (18..48)</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("sequencer")}
						className={"ortho-tab-btn " + (activeTab === "sequencer" ? "active" : "")}
					>
						<Zap size={16} />
						<span>2. Протокол смены дуг и люфт торка</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("comparison")}
						className={"ortho-tab-btn " + (activeTab === "comparison" ? "active" : "")}
					>
						<Layers size={16} />
						<span>3. Сравнение систем (Roth / MBT / Damon)</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("journal")}
						className={"ortho-tab-btn " + (activeTab === "journal" ? "active" : "")}
					>
						<FileText size={16} />
						<span>4. Журнал активаций & Протокол 043/у</span>
					</button>
				</nav>

				{/* ─── Body Content ─── */}
				<div className="ortho-matrix-body">
					{/* ─── TAB 1: DENTAL ARCH MATRIX ─── */}
					{activeTab === "matrix" && (
						<div className="flex flex-col gap-4">
							{/* System Quick Pills */}
							<div className="flex items-center justify-between gap-2 flex-wrap bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 p-3 rounded-2xl border border-[var(--line,#cbd5e1)]">
								<div className="flex items-center gap-1.5 flex-wrap">
									<span className="text-xs font-bold text-[var(--muted,#64748b)] mr-1">Пропись:</span>
									{(
										[
											{ id: "damon_q_standard", label: "Damon Q Std .022" },
											{ id: "damon_q_high_torque", label: "Damon Q High (+17°)" },
											{ id: "damon_q_low_torque", label: "Damon Q Low (+2°)" },
											{ id: "roth_022", label: "Roth .022" },
											{ id: "mbt_022", label: "MBT .022" },
											{ id: "alexander_018", label: "Alexander .018" },
											{ id: "custom", label: "Custom" },
										] as const
									).map((sys) => (
										<button
											key={sys.id}
											type="button"
											onClick={() => handleSelectPrescription(sys.id)}
											className={
												"min-h-[40px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer " +
												(prescriptionId === sys.id
													? "bg-[var(--teal,var(--brand-primary))] text-white shadow-sm"
													: "bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 hover:bg-[var(--surface-muted,#e2e8f0)] border border-[var(--line,#cbd5e1)]")
											}
										>
											{sys.label}
										</button>
									))}
								</div>

								{/* Batch Actions */}
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => handleBatchFixArch("upper")}
										className="min-h-[38px] px-2.5 rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-700 hover:bg-[var(--surface-muted,#e2e8f0)] text-[var(--ink,#0f172a)] dark:text-slate-100 text-xs font-bold border border-[var(--line,#cbd5e1)] cursor-pointer"
										title="Зафиксировать все зубы верхней челюсти"
									>
										Фикс. в/ч
									</button>
									<button
										type="button"
										onClick={() => handleBatchFixArch("lower")}
										className="min-h-[38px] px-2.5 rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-700 hover:bg-[var(--surface-muted,#e2e8f0)] text-[var(--ink,#0f172a)] dark:text-slate-100 text-xs font-bold border border-[var(--line,#cbd5e1)] cursor-pointer"
										title="Зафиксировать все зубы нижней челюсти"
									>
										Фикс. н/ч
									</button>
									<button
										type="button"
										onClick={handleResetToNominal}
										className="min-h-[38px] px-2.5 rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-700 hover:bg-[var(--surface-muted,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-rose-600 text-xs font-bold border border-[var(--line,#cbd5e1)] cursor-pointer"
										title="Сбросить все зубы к номинальным значениям"
									>
										<RotateCcw size={14} />
									</button>
								</div>
							</div>

							{/* Main Dental Arch Grid: Upper Arch (18..28) & Lower Arch (48..38) */}
							<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
								{/* Left: Teeth Grid (8 cols) */}
								<div className="lg:col-span-8 flex flex-col gap-4">
									{/* Upper Arch Section */}
									<div className="ortho-arch-section">
										<div className="flex items-center justify-between mb-2">
											<span className="text-xs font-bold uppercase text-[var(--teal-dark,var(--teal))]">
												Верхняя челюсть (Maxilla) — 18..11 | 21..28
											</span>
											<span className="text-[11px] text-[var(--muted,#64748b)]">Торк / Ангуляция / Оффсет</span>
										</div>

										<div className="ortho-quadrant-grid">
											{UPPER_ARCH_TEETH.map((tooth) => {
												const spec = currentPrescription.teeth[tooth];
												const state = patientMatrix[tooth];
												const isSelected = selectedTooth === tooth;
												const torque = state?.customTorque ?? spec?.nominalTorque ?? 0;
												const ang = state?.customAngulation ?? spec?.nominalAngulation ?? 0;
												const rot = state?.customRotation ?? spec?.nominalRotation ?? 0;
												const statusClass = state ? "status-" + state.status : "";

												return (
													<div
														key={tooth}
														onClick={() => setSelectedTooth(tooth)}
														className={"ortho-tooth-card " + (isSelected ? "selected " : "") + statusClass}
														title={formatToothNameFdi(tooth)}
													>
														<div className="flex items-center justify-between w-full">
															<span className="text-xs font-black text-[var(--ink,#0f172a)] dark:text-white">
																{tooth}
															</span>
															{state?.hasHook && (
																<span className="w-2 h-2 rounded-full bg-amber-500" title="Крючок" />
															)}
														</div>

														<div className="flex flex-col items-center gap-0.5 my-1">
															<span
																className={
																	"torque-badge " +
																	(torque > 0 ? "torque-positive" : torque < 0 ? "torque-negative" : "torque-neutral")
																}
															>
																T: {torque > 0 ? "+" + torque : torque}°
															</span>
															<span className="text-[10px] text-[var(--muted,#64748b)] font-semibold">
																A: {ang}° {rot !== 0 ? "R: " + rot + "°" : ""}
															</span>
														</div>

														<span className="text-[9px] uppercase font-bold text-[var(--muted,#64748b)] truncate max-w-full">
															{state?.status === "fixed"
																? "Фикс"
																: state?.status === "rebonded"
																	? "Перекл"
																	: state?.status === "lost"
																		? "Скол"
																		: state?.status === "debonded"
																			? "Снят"
																			: state?.status === "planned"
																				? "План"
																				: "—"}
														</span>
													</div>
												);
											})}
										</div>
									</div>

									{/* Lower Arch Section */}
									<div className="ortho-arch-section">
										<div className="flex items-center justify-between mb-2">
											<span className="text-xs font-bold uppercase text-[var(--teal-dark,var(--teal))]">
												Нижняя челюсть (Mandibula) — 48..41 | 31..38
											</span>
											<span className="text-[11px] text-[var(--muted,#64748b)]">Торк / Ангуляция / Оффсет</span>
										</div>

										<div className="ortho-quadrant-grid">
											{LOWER_ARCH_TEETH.map((tooth) => {
												const spec = currentPrescription.teeth[tooth];
												const state = patientMatrix[tooth];
												const isSelected = selectedTooth === tooth;
												const torque = state?.customTorque ?? spec?.nominalTorque ?? 0;
												const ang = state?.customAngulation ?? spec?.nominalAngulation ?? 0;
												const rot = state?.customRotation ?? spec?.nominalRotation ?? 0;
												const statusClass = state ? "status-" + state.status : "";

												return (
													<div
														key={tooth}
														onClick={() => setSelectedTooth(tooth)}
														className={"ortho-tooth-card " + (isSelected ? "selected " : "") + statusClass}
														title={formatToothNameFdi(tooth)}
													>
														<div className="flex items-center justify-between w-full">
															<span className="text-xs font-black text-[var(--ink,#0f172a)] dark:text-white">
																{tooth}
															</span>
															{state?.hasHook && (
																<span className="w-2 h-2 rounded-full bg-amber-500" title="Крючок" />
															)}
														</div>

														<div className="flex flex-col items-center gap-0.5 my-1">
															<span
																className={
																	"torque-badge " +
																	(torque > 0 ? "torque-positive" : torque < 0 ? "torque-negative" : "torque-neutral")
																}
															>
																T: {torque > 0 ? "+" + torque : torque}°
															</span>
															<span className="text-[10px] text-[var(--muted,#64748b)] font-semibold">
																A: {ang}° {rot !== 0 ? "R: " + rot + "°" : ""}
															</span>
														</div>

														<span className="text-[9px] uppercase font-bold text-[var(--muted,#64748b)] truncate max-w-full">
															{state?.status === "fixed"
																? "Фикс"
																: state?.status === "rebonded"
																	? "Перекл"
																	: state?.status === "lost"
																		? "Скол"
																		: state?.status === "debonded"
																			? "Снят"
																			: state?.status === "planned"
																				? "План"
																				: "—"}
														</span>
													</div>
												);
											})}
										</div>
									</div>
								</div>

								{/* Right: Selected Tooth Inspector Card (4 cols) */}
								<div className="lg:col-span-4 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] rounded-2xl p-4 flex flex-col justify-between shadow-sm">
									{selectedTooth ? (
										<div>
											<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)]">
												<div>
													<span className="text-[10px] uppercase tracking-wider font-bold text-[var(--teal-dark,var(--teal))]">
														Инспектор замка
													</span>
													<h3 className="text-base font-black text-[var(--ink,#0f172a)] dark:text-white m-0">
														{formatToothNameFdi(selectedTooth)}
													</h3>
												</div>
												<div className="w-8 h-8 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 flex items-center justify-center font-bold text-sm">
													{selectedTooth}
												</div>
											</div>

											{/* Status Selector */}
											<div className="space-y-3 text-xs">
												<div>
													<label className="font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 block mb-1">
														Клинический статус на приеме:
													</label>
													<div className="grid grid-cols-3 gap-1">
														{(
															[
																{ id: "fixed", label: "Зафиксирован" },
																{ id: "rebonded", label: "Переклеен" },
																{ id: "lost", label: "Скол / Утеря" },
																{ id: "debonded", label: "Снят" },
																{ id: "planned", label: "План" },
																{ id: "not_indicated", label: "Отсутствует" },
															] as const
														).map((st) => (
															<button
																key={st.id}
																type="button"
																onClick={() => handleUpdateTooth(selectedTooth, { status: st.id })}
																className={
																	"min-h-[36px] px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center " +
																	(patientMatrix[selectedTooth]?.status === st.id
																		? "bg-[var(--teal,var(--brand-primary))] text-white shadow-sm"
																		: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]")
																}
															>
																{st.label}
															</button>
														))}
													</div>
												</div>

												{/* Torque Custom Tuning */}
												<div className="p-3 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/60 border border-[var(--line,#cbd5e1)] space-y-2">
													<div className="flex items-center justify-between">
														<span className="font-bold text-[var(--ink,#0f172a)] dark:text-slate-200">
															Торк (Torque °):
														</span>
														<div className="flex items-center gap-1.5">
															<input
																type="number"
																aria-label="Индивидуальный торк зуба в градусах"
																value={patientMatrix[selectedTooth]?.customTorque ?? 0}
																onChange={(e) =>
																	handleUpdateTooth(selectedTooth, { customTorque: Number(e.target.value) })
																}
																className="w-16 h-8 text-center font-black bg-[var(--paper,#ffffff)] dark:bg-slate-700 border border-[var(--line,#cbd5e1)] rounded-lg outline-none"
															/>
															<span className="font-bold">°</span>
														</div>
													</div>

													{/* Deviation from nominal notice */}
													{(() => {
														const dev = calculateTorqueDeviation(
															selectedTooth,
															patientMatrix[selectedTooth]?.customTorque ?? 0,
															prescriptionId,
														);
														if (dev.deviation !== 0) {
															return (
																<div className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
																	<AlertTriangle size={12} />
																	<span>
																		Отклонение от нормы: {dev.deviation > 0 ? "+" + dev.deviation : dev.deviation}°
																		({dev.direction === "labial_root" ? "вестибулярный наклон" : "небный наклон"})
																	</span>
																</div>
															);
														}
														return (
															<div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
																<Check size={12} />
																<span>Соответствует стандартной прописи ({dev.nominalTorque}°)</span>
															</div>
														);
													})()}
												</div>

												{/* Angulation & Hook */}
												<div className="grid grid-cols-2 gap-2">
													<div className="p-2.5 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/60 border border-[var(--line,#cbd5e1)]">
														<span className="font-bold text-[var(--muted,#64748b)] block text-[11px]">
															Ангуляция (Tip °)
														</span>
														<input
															type="number"
															aria-label="Индивидуальная ангуляция зуба в градусах"
															value={patientMatrix[selectedTooth]?.customAngulation ?? 0}
															onChange={(e) =>
																handleUpdateTooth(selectedTooth, { customAngulation: Number(e.target.value) })
															}
															className="w-full h-8 mt-1 text-center font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-700 border border-[var(--line,#cbd5e1)] rounded-lg"
														/>
													</div>

													<div className="p-2.5 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/60 border border-[var(--line,#cbd5e1)] flex flex-col justify-between">
														<span className="font-bold text-[var(--muted,#64748b)] text-[11px]">
															Крючок на брекете
														</span>
														<button
															type="button"
															onClick={() =>
																handleUpdateTooth(selectedTooth, {
																	hasHook: !patientMatrix[selectedTooth]?.hasHook,
																})
															}
															className={
																"min-h-[32px] mt-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 " +
																(patientMatrix[selectedTooth]?.hasHook
																	? "bg-amber-500 text-white"
																	: "bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-[var(--muted,#64748b)] border border-[var(--line,#cbd5e1)]")
															}
														>
															{patientMatrix[selectedTooth]?.hasHook ? "С крючком" : "Без крючка"}
														</button>
													</div>
												</div>

												{/* Notes input */}
												<div>
													<label className="font-bold text-[var(--muted,#64748b)] block mb-1">
														Клиническая заметка по зубу:
													</label>
													<input
														type="text"
														placeholder="Например: перевернут брекет для обратного торка"
														value={patientMatrix[selectedTooth]?.notes ?? ""}
														onChange={(e) => handleUpdateTooth(selectedTooth, { notes: e.target.value })}
														className="w-full h-9 px-3 text-xs bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] rounded-xl outline-none"
													/>
												</div>
											</div>
										</div>
									) : (
										<div className="flex flex-col items-center justify-center h-full text-[var(--muted,#64748b)] py-12">
											<Compass size={36} className="mb-2 opacity-50" />
											<p className="text-xs font-semibold m-0">Выберите зуб на зубной дуге для настройки</p>
										</div>
									)}

									<div className="pt-3 mt-3 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between text-[11px] text-[var(--muted,#64748b)]">
										<span>Система: {currentPrescription.name}</span>
										<span className="font-bold">Паз: {currentPrescription.slotSize}"</span>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* ─── TAB 2: ARCHWIRE SEQUENCER & TORQUE PLAY ─── */}
					{activeTab === "sequencer" && (
						<div className="flex flex-col gap-5">
							{/* Top: Active Archwires Status Cards */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Upper Arch Wire Card */}
								<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] space-y-3">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
												ВЧ
											</div>
											<div>
												<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-white m-0">
													Дуга верхней челюсти
												</h4>
												<span className="text-[11px] text-[var(--muted,#64748b)]">
													{MATERIAL_LABELS[upperWireMaterial]} {upperWireSize}
												</span>
											</div>
										</div>
										<span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-300 dark:border-blue-800">
											{upperTorquePlay.isTorqueActive ? "Торк активен" : "Круглая (0% торк)"}
										</span>
									</div>

									{/* Wire Selector */}
									<div className="grid grid-cols-2 gap-2 text-xs">
										<div>
											<label className="font-bold text-[var(--muted,#64748b)] block mb-1">Размер дуги:</label>
											<select
												aria-label="Размер дуги верхней челюсти"
												value={upperWireSize}
												onChange={(e) => setUpperWireSize(e.target.value as WireSize)}
												className="w-full min-h-[40px] px-2.5 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] font-semibold"
											>
												{STANDARD_ARCHWIRES.map((w) => (
													<option key={w.id} value={w.size}>
														{w.size} ({w.shape === "round" ? "Круглая" : "Прямоугольная"})
													</option>
												))}
											</select>
										</div>

										<div>
											<label className="font-bold text-[var(--muted,#64748b)] block mb-1">Материал сплава:</label>
											<select
												aria-label="Материал сплава дуги верхней челюсти"
												value={upperWireMaterial}
												onChange={(e) => setUpperWireMaterial(e.target.value as WireMaterial)}
												className="w-full min-h-[40px] px-2.5 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] font-semibold"
											>
												{Object.entries(MATERIAL_LABELS).map(([k, v]) => (
													<option key={k} value={k}>
														{v}
													</option>
												))}
											</select>
										</div>
									</div>

									{/* Torque Play & Clearance Telemetry */}
									<div className="p-3 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#cbd5e1)] space-y-1.5 text-xs">
										<div className="flex items-center justify-between font-bold">
											<span className="text-[var(--muted,#64748b)]">Люфт дуги в пазе {currentPrescription.slotSize}":</span>
											<span className="text-[var(--ink,#0f172a)] dark:text-white">
												{upperTorquePlay.playAngleDegrees}°
											</span>
										</div>
										<div className="flex items-center justify-between font-bold">
											<span className="text-[var(--muted,#64748b)]">Экспрессия номинального торка:</span>
											<span className="text-emerald-700 dark:text-emerald-300">
												{upperTorquePlay.maxTorqueTransmissionPercent}%
											</span>
										</div>
										<p className="text-[11px] text-[var(--muted,#64748b)] m-0 pt-1 leading-relaxed border-t border-[var(--line,#cbd5e1)]">
											{upperTorquePlay.clinicalNote}
										</p>
									</div>
								</div>

								{/* Lower Arch Wire Card */}
								<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] space-y-3">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
												НЧ
											</div>
											<div>
												<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-white m-0">
													Дуга нижней челюсти
												</h4>
												<span className="text-[11px] text-[var(--muted,#64748b)]">
													{MATERIAL_LABELS[lowerWireMaterial]} {lowerWireSize}
												</span>
											</div>
										</div>
										<span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-2.5 py-1 rounded-full border border-purple-300 dark:border-purple-800">
											{lowerTorquePlay.isTorqueActive ? "Торк активен" : "Круглая (0% торк)"}
										</span>
									</div>

									{/* Wire Selector */}
									<div className="grid grid-cols-2 gap-2 text-xs">
										<div>
											<label className="font-bold text-[var(--muted,#64748b)] block mb-1">Размер дуги:</label>
											<select
												aria-label="Размер дуги нижней челюсти"
												value={lowerWireSize}
												onChange={(e) => setLowerWireSize(e.target.value as WireSize)}
												className="w-full min-h-[40px] px-2.5 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] font-semibold"
											>
												{STANDARD_ARCHWIRES.map((w) => (
													<option key={w.id} value={w.size}>
														{w.size} ({w.shape === "round" ? "Круглая" : "Прямоугольная"})
													</option>
												))}
											</select>
										</div>

										<div>
											<label className="font-bold text-[var(--muted,#64748b)] block mb-1">Материал сплава:</label>
											<select
												aria-label="Материал сплава дуги нижней челюсти"
												value={lowerWireMaterial}
												onChange={(e) => setLowerWireMaterial(e.target.value as WireMaterial)}
												className="w-full min-h-[40px] px-2.5 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] font-semibold"
											>
												{Object.entries(MATERIAL_LABELS).map(([k, v]) => (
													<option key={k} value={k}>
														{v}
													</option>
												))}
											</select>
										</div>
									</div>

									{/* Torque Play & Clearance Telemetry */}
									<div className="p-3 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#cbd5e1)] space-y-1.5 text-xs">
										<div className="flex items-center justify-between font-bold">
											<span className="text-[var(--muted,#64748b)]">Люфт дуги в пазе {currentPrescription.slotSize}":</span>
											<span className="text-[var(--ink,#0f172a)] dark:text-white">
												{lowerTorquePlay.playAngleDegrees}°
											</span>
										</div>
										<div className="flex items-center justify-between font-bold">
											<span className="text-[var(--muted,#64748b)]">Экспрессия номинального торка:</span>
											<span className="text-emerald-700 dark:text-emerald-300">
												{lowerTorquePlay.maxTorqueTransmissionPercent}%
											</span>
										</div>
										<p className="text-[11px] text-[var(--muted,#64748b)] m-0 pt-1 leading-relaxed border-t border-[var(--line,#cbd5e1)]">
											{lowerTorquePlay.clinicalNote}
										</p>
									</div>
								</div>
							</div>

							{/* Intermaxillary Elastics & Visit Logging Section */}
							<div className="p-5 rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] space-y-4 shadow-sm">
								<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)]">
									<div className="flex items-center gap-2">
										<Zap size={20} className="text-[var(--teal,var(--brand-primary))]" />
										<h3 className="text-base font-bold text-[var(--ink,#0f172a)] dark:text-white m-0">
											Фиксация протокола активации на приеме
										</h3>
									</div>
									<span className="text-xs text-[var(--muted,#64748b)]">Текущий визит</span>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
									<div>
										<label className="font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 block mb-1">
											Межчелюстные эластики (Тяги):
										</label>
										<select
											aria-label="Выбор межчелюстных эластиков"
											value={selectedElastics}
											onChange={(e) => setSelectedElastics(e.target.value)}
											className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] font-semibold"
										>
											{ELASTICS_PRESETS.map((el) => (
												<option key={el.id} value={el.id}>
													{el.name} — {el.animalCode} ({el.forceLevel})
												</option>
											))}
										</select>
										<p className="text-[11px] text-[var(--muted,#64748b)] mt-1">
											{ELASTICS_PRESETS.find((e) => e.id === selectedElastics)?.indication}
										</p>
									</div>

									<div>
										<label className="font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 block mb-1">
											Врач-ортодонт:
										</label>
										<input
											type="text"
											value={doctorName}
											onChange={(e) => setDoctorName(e.target.value)}
											className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] font-semibold"
										/>
									</div>

									<div>
										<label className="font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 block mb-1">
											Клинические отметки и задачи на шаг:
										</label>
										<input
											type="text"
											value={visitNotes}
											onChange={(e) => setVisitNotes(e.target.value)}
											className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] font-semibold"
										/>
									</div>
								</div>

								<div className="flex items-center justify-end gap-3 pt-2">
									<button
										type="button"
										onClick={handleSaveVisitLog}
										className="min-h-[44px] px-5 rounded-xl bg-[var(--teal,var(--brand-primary))] hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-[var(--teal,var(--brand-primary))]/20 cursor-pointer active:scale-95 transition-all"
									>
										<Save size={16} />
										<span>Сохранить смену дуг в историю</span>
									</button>
								</div>
							</div>
						</div>
					)}

					{/* ─── TAB 3: PRESCRIPTIONS COMPARISON STUDIO ─── */}
					{activeTab === "comparison" && (
						<div className="flex flex-col gap-4">
							{/* Selector Header */}
							<div className="flex items-center justify-between gap-3 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 p-4 rounded-2xl border border-[var(--line,#cbd5e1)] flex-wrap">
								<div className="flex items-center gap-3">
									<div>
										<span className="text-[10px] uppercase font-bold text-[var(--muted,#64748b)]">Базовая пропись</span>
										<div className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-white">
											{currentPrescription.name}
										</div>
									</div>
									<ArrowRight size={18} className="text-[var(--muted,#64748b)]" />
									<div>
										<span className="text-[10px] uppercase font-bold text-[var(--muted,#64748b)]">Сравнить с системой:</span>
										<select
											aria-label="Выбор системы брекетов для клинического сравнения"
											value={comparisonTargetId}
											onChange={(e) => setComparisonTargetId(e.target.value as BracketPrescriptionId)}
											className="min-h-[38px] px-3 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-700 border border-[var(--line,#cbd5e1)] text-xs font-bold cursor-pointer"
										>
											{Object.values(BRACKET_PRESCRIPTIONS).map((p) => (
												<option key={p.id} value={p.id}>
													{p.name}
												</option>
											))}
										</select>
									</div>
								</div>

								<div className="text-xs text-[var(--muted,#64748b)] max-w-md leading-relaxed">
									Сравнение номинальных углов торка (Torque °) и ангуляции (Angulation °) для предотвращения резорбции корней.
								</div>
							</div>

							{/* Comparison Table */}
							<div className="overflow-x-auto rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] dark:bg-slate-900 shadow-sm">
								<table className="w-full text-left text-xs border-collapse">
									<thead>
										<tr className="bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-b border-[var(--line,#e2e8f0)] font-bold text-[var(--muted,#64748b)]">
											<th className="p-3">Зуб (FDI)</th>
											<th className="p-3 text-center">Торк ({currentPrescription.name})</th>
											<th className="p-3 text-center">Торк ({getPrescription(comparisonTargetId).name})</th>
											<th className="p-3 text-center">Разница Δ Torque</th>
											<th className="p-3 text-center">Ангуляция ({currentPrescription.name})</th>
											<th className="p-3 text-center">Ангуляция ({getPrescription(comparisonTargetId).name})</th>
											<th className="p-3 text-center">Разница Δ Tip</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800">
										{comparisonData.map((row) => {
											const hasTorqueDiff = row.torqueDiff !== 0;
											const hasAngDiff = row.angulationDiff !== 0;

											return (
												<tr
													key={row.toothNumber}
													className={
														"hover:bg-[var(--surface,#f1f5f9)] dark:hover:bg-slate-800/50 transition-colors " +
														(row.toothNumber % 10 === 1 ? "bg-[var(--surface-muted,#f8fafc)]/50 font-bold" : "")
													}
												>
													<td className="p-3 font-bold text-[var(--ink,#0f172a)] dark:text-white">
														{row.toothName}
													</td>
													<td className="p-3 text-center font-bold">{row.baseTorque}°</td>
													<td className="p-3 text-center font-bold">{row.targetTorque}°</td>
													<td className="p-3 text-center">
														{hasTorqueDiff ? (
															<span
																className={
																	"px-2 py-0.5 rounded font-black " +
																	(row.torqueDiff > 0
																		? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
																		: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300")
																}
															>
																{row.torqueDiff > 0 ? "+" + row.torqueDiff : row.torqueDiff}°
															</span>
														) : (
															<span className="text-[var(--muted,#64748b)]">0°</span>
														)}
													</td>
													<td className="p-3 text-center font-bold">{row.baseAngulation}°</td>
													<td className="p-3 text-center font-bold">{row.targetAngulation}°</td>
													<td className="p-3 text-center">
														{hasAngDiff ? (
															<span className="px-2 py-0.5 rounded font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
																{row.angulationDiff > 0 ? "+" + row.angulationDiff : row.angulationDiff}°
															</span>
														) : (
															<span className="text-[var(--muted,#64748b)]">0°</span>
														)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* ─── TAB 4: VISIT JOURNAL & SOAP PROTOCOL ─── */}
					{activeTab === "journal" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
							{/* Left: Previous Visits Timeline (6 cols) */}
							<div className="lg:col-span-6 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] rounded-2xl p-5 shadow-sm space-y-4">
								<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)]">
									<h3 className="text-base font-bold text-[var(--ink,#0f172a)] dark:text-white m-0">
										История активаций и смены дуг
									</h3>
									<span className="text-xs text-[var(--muted,#64748b)] font-semibold">
										Записей: {visitHistory.length}
									</span>
								</div>

								<div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
									{visitHistory.map((item) => (
										<div
											key={item.id}
											className="p-4 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#cbd5e1)] space-y-2 text-xs"
										>
											<div className="flex items-center justify-between">
												<span className="font-bold text-[var(--ink,#0f172a)] dark:text-white text-sm">
													{item.visitDate}
												</span>
												<span className="text-[11px] text-[var(--muted,#64748b)] font-semibold">
													{item.doctorName}
												</span>
											</div>
											<div className="flex items-center gap-2 flex-wrap">
												{item.upperWireSize && (
													<span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
														ВЧ: {item.upperWireSize}
													</span>
												)}
												{item.lowerWireSize && (
													<span className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded font-bold">
														НЧ: {item.lowerWireSize}
													</span>
												)}
												{item.elasticsPattern && (
													<span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded font-bold">
														Тяги: {item.elasticsPattern}
													</span>
												)}
											</div>
											<p className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-300 m-0 leading-relaxed">
												{item.notes}
											</p>
										</div>
									))}
								</div>
							</div>

							{/* Right: SOAP Form 043/y Preview (6 cols) */}
							<div className="lg:col-span-6 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
								<div>
									<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)]">
										<div className="flex items-center gap-2">
											<FileText size={18} className="text-[var(--teal,var(--brand-primary))]" />
											<h3 className="text-base font-bold text-[var(--ink,#0f172a)] dark:text-white m-0">
												Структурированный протокол 043/у (SOAP)
											</h3>
										</div>
										<button
											type="button"
											onClick={handleCopySoap}
											className="text-xs font-bold text-[var(--teal-dark,var(--teal))] hover:underline flex items-center gap-1 cursor-pointer"
										>
											<Copy size={13} />
											<span>{copied ? "Скопировано!" : "Скопировать"}</span>
										</button>
									</div>

									<pre className="mt-3 p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[380px] whitespace-pre-wrap select-text">
										{currentSoapText}
									</pre>
								</div>

								<div className="flex items-center gap-2 pt-2">
									<button
										type="button"
										onClick={handleInsertProtocol}
										className="flex-1 min-h-[44px] px-4 rounded-xl bg-[var(--teal,var(--brand-primary))] hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[var(--teal,var(--brand-primary))]/20 cursor-pointer active:scale-95 transition-all"
									>
										<Zap size={16} />
										<span>Вставить в дневник приема 043/у</span>
									</button>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* ─── Modal Footer ─── */}
				<footer className="ortho-matrix-footer">
					<div className="flex items-center gap-2 text-xs text-[var(--muted,#64748b)]">
						<Info size={16} className="text-[var(--teal,var(--brand-primary))]" />
						<span>
							Пропись {currentPrescription.name} · Паз {currentPrescription.slotSize}" · 32 зуба в формуле
						</span>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCopySoap}
							className="min-h-[44px] px-4 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] text-[var(--ink,#0f172a)] dark:text-slate-100 font-bold text-xs border border-[var(--line,#cbd5e1)] flex items-center gap-2 cursor-pointer transition-all"
						>
							<Copy size={15} />
							<span>Копировать SOAP</span>
						</button>

						<button
							type="button"
							onClick={handleInsertProtocol}
							className="min-h-[44px] px-5 rounded-xl bg-[var(--teal,var(--brand-primary))] hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-[var(--teal,var(--brand-primary))]/20 cursor-pointer active:scale-95 transition-all"
						>
							<CheckCircle2 size={16} />
							<span>Готово (Сохранить в карту)</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	if (typeof document === "undefined") {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
}
