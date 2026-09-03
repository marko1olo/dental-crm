/**
 * EmergencyAnaphylaxisProtocolModal.tsx — Экстренный интерактивный протокол реанимации
 * при анафилактическом шоке, токсичности местных анестетиков (LAST / Липидная реанимация),
 * вазовагальном коллапсе и гипертоническом кризе.
 *
 * Нормативная база:
 * - Приказ Минздрава РФ № 786н (Приложение 11 — Аптечка экстренной помощи)
 * - Клинические рекомендации МЗ РФ «Анафилактический шок» (КР345)
 * - Клинические рекомендации ФАР «Системная токсичность местных анестетиков (LAST)»
 * - ASRA (American Society of Regional Anesthesia) Lipid Rescue Protocol
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
	AlertCircle,
	AlertOctagon,
	AlertTriangle,
	ArrowRight,
	Bell,
	BellOff,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Copy,
	FileDown,
	FileText,
	Heart,
	HeartPulse,
	Layers,
	LifeBuoy,
	Maximize2,
	Phone,
	PhoneCall,
	Play,
	Plus,
	Printer,
	RefreshCw,
	RotateCcw,
	ShieldAlert,
	Sparkles,
	Volume2,
	VolumeX,
	X,
	Zap,
} from "lucide-react";
import {
	EMERGENCY_PROTOCOLS,
	type EmergencyScenarioId,
	type EmergencyProtocolDefinition,
	type ExecutedEmergencyStepLog,
	calculateAllEmergencyDosagesForWeight,
	formatEmergencyStopwatchTime,
	generateEmergencyForm043Act,
	generateEmergency112DispatchScript,
} from "./emergencyProtocols";
import { soundFeedback } from "../../services/audio/SoundFeedbackService";
import { useVisitStore } from "../../store/visitStore";
import { showToast } from "../GlobalToast";
import "./emergencyAnaphylaxisProtocol.css";

export interface EmergencyAnaphylaxisProtocolModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialScenario?: EmergencyScenarioId | undefined;
	readonly patientName?: string | undefined;
	readonly patientAge?: number | undefined;
	readonly patientWeightKg?: number | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly injectedAnestheticInfo?: string | undefined;
	readonly onInsertToVisitNote?: ((protocolText: string) => void) | undefined;
}

export const EmergencyAnaphylaxisProtocolModal: React.FC<EmergencyAnaphylaxisProtocolModalProps> = ({
	isOpen,
	onClose,
	initialScenario = "last_toxicity",
	patientName = "Пациент",
	patientAge = 35,
	patientWeightKg = 70,
	clinicName = "Стоматологическая клиника",
	clinicAddress = "ул. Клиническая, д. 1",
	doctorName = "Лечащий врач-стоматолог",
	injectedAnestheticInfo = "Артикаин 4% с эпинефрином 1:100000 (1.7 мл)",
	onInsertToVisitNote,
}) => {
	// 1. Scenario and Weight State
	const [activeScenarioId, setActiveScenarioId] = useState<EmergencyScenarioId>(initialScenario);
	const [weightKg, setWeightKg] = useState<number>(patientWeightKg);
	const [patientAgeYears, setPatientAgeYears] = useState<number>(patientAge);

	// 2. Stopwatch & Metronome State
	const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);
	const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
	const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(false);

	// 3. Checklist & Event Log State
	const [completedChecklistItems, setCompletedChecklistItems] = useState<Record<string, boolean>>({});
	const [eventLogs, setEventLogs] = useState<ExecutedEmergencyStepLog[]>([]);
	const [administeredDrugs, setAdministeredDrugs] = useState<Array<{ name: string; dose: string; timeIso: string }>>([]);

	// 4. SBAR Dispatch Script Drawer
	const [showDispatchScript, setShowDispatchScript] = useState<boolean>(false);

	// Sync when props change or modal opens
	useEffect(() => {
		if (isOpen) {
			setActiveScenarioId(initialScenario);
			setWeightKg(patientWeightKg);
			setPatientAgeYears(patientAge);
			// Auto start stopwatch for immediate tracking of golden hour
			setIsTimerRunning(true);
			soundFeedback.playWarningAlert();
		} else {
			setIsTimerRunning(false);
			setIsMetronomeActive(false);
		}
	}, [isOpen, initialScenario, patientWeightKg, patientAge]);

	// Stopwatch Interval
	useEffect(() => {
		let timer: ReturnType<typeof setInterval> | null = null;
		if (isOpen && isTimerRunning) {
			timer = setInterval(() => {
				setStopwatchSeconds((prev) => prev + 1);
			}, 1000);
		}
		return () => {
			if (timer) clearInterval(timer);
		};
	}, [isOpen, isTimerRunning]);

	// Current Protocol Definition
	const currentProtocol: EmergencyProtocolDefinition = useMemo(() => {
		return EMERGENCY_PROTOCOLS[activeScenarioId] || EMERGENCY_PROTOCOLS.last_toxicity;
	}, [activeScenarioId]);

	// Calculated Dosages for Current Weight
	const calculatedDosages = useMemo(() => {
		return calculateAllEmergencyDosagesForWeight(weightKg, patientAgeYears);
	}, [weightKg, patientAgeYears]);

	// SBAR 112 Dispatch Script
	const dispatch112Script = useMemo(() => {
		return generateEmergency112DispatchScript({
			scenarioId: activeScenarioId,
			patientName,
			patientAge: patientAgeYears,
			patientWeightKg: weightKg,
			clinicName,
			clinicAddress,
			doctorName,
			injectedAnestheticInfo,
			stopwatchSeconds,
			administeredDrugs: administeredDrugs.map((d) => `${d.name} (${d.dose})`),
		});
	}, [
		activeScenarioId,
		patientName,
		patientAgeYears,
		weightKg,
		clinicName,
		clinicAddress,
		doctorName,
		injectedAnestheticInfo,
		stopwatchSeconds,
		administeredDrugs,
	]);

	// Log Action Helper
	const logResuscitationEvent = useCallback(
		(actionTitle: string, note?: string) => {
			const timeFormatted = formatEmergencyStopwatchTime(stopwatchSeconds);
			const newLog: ExecutedEmergencyStepLog = {
				stepNumber: eventLogs.length + 1,
				titleRu: actionTitle,
				timestampSeconds: stopwatchSeconds,
				timeFormatted,
				actionNotes: note,
			};
			setEventLogs((prev) => [newLog, ...prev]);
		},
		[stopwatchSeconds, eventLogs.length],
	);

	// Toggle Checklist Item
	const handleToggleCheckItem = useCallback(
		(stepNum: number, itemIndex: number, itemText: string) => {
			const key = `${activeScenarioId}_step${stepNum}_item${itemIndex}`;
			const isDone = !completedChecklistItems[key];
			setCompletedChecklistItems((prev) => ({ ...prev, [key]: isDone }));

			if (isDone) {
				soundFeedback.playActionSuccess();
				logResuscitationEvent(`Выполнено: ${itemText}`);
			}
		},
		[activeScenarioId, completedChecklistItems, logResuscitationEvent],
	);

	// Quick Drug Administration
	const handleAdministerDrug = useCallback(
		(drugName: string, doseText: string, routeText: string) => {
			const timeFormatted = formatEmergencyStopwatchTime(stopwatchSeconds);
			const nowIso = new Date().toISOString();

			setAdministeredDrugs((prev) => [
				...prev,
				{ name: drugName, dose: `${doseText} ${routeText}`, timeIso: nowIso },
			]);

			soundFeedback.playActionSuccess();
			logResuscitationEvent(`ВВЕДЕНИЕ ПРЕПАРАТА: ${drugName} ${doseText} (${routeText})`);
			showToast(`Зафиксировано введение: ${drugName} ${doseText} на ${timeFormatted}`, "success");
		},
		[stopwatchSeconds, logResuscitationEvent],
	);

	// 1-Click Insert Protocol to Form 043/u
	const handleInsertToProtocol = useCallback(() => {
		const actText = generateEmergencyForm043Act({
			scenarioId: activeScenarioId,
			patientName,
			patientAge: patientAgeYears,
			patientWeightKg: weightKg,
			doctorName,
			injectedAnestheticInfo,
			stopwatchTotalSeconds: stopwatchSeconds,
			executedSteps: eventLogs,
			administeredDrugs,
		});

		// Inject to visitStore
		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${actText}`
				: actText,
		}));

		// Custom DOM Event for live SOAP sync
		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: actText,
					mode: "smart_append",
				},
			}),
		);

		onInsertToVisitNote?.(actText);
		soundFeedback.playActionSuccess();
		showToast("Протокол реанимации успешно вставлен в дневник 043/у!", "success");
	}, [
		activeScenarioId,
		patientName,
		patientAgeYears,
		weightKg,
		doctorName,
		injectedAnestheticInfo,
		stopwatchSeconds,
		eventLogs,
		administeredDrugs,
		onInsertToVisitNote,
	]);

	// Print / Export Protocol Record
	const handlePrintRecord = useCallback(() => {
		const actText = generateEmergencyForm043Act({
			scenarioId: activeScenarioId,
			patientName,
			patientAge: patientAgeYears,
			patientWeightKg: weightKg,
			doctorName,
			injectedAnestheticInfo,
			stopwatchTotalSeconds: stopwatchSeconds,
			executedSteps: eventLogs,
			administeredDrugs,
		});

		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Реанимационная карта СМП — ${patientName}</title>
					<meta charset="utf-8" />
					<style>
						body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #0f172a; line-height: 1.5; font-size: 13px; }
						h1 { font-size: 18px; text-transform: uppercase; border-bottom: 2px solid #ef4444; padding-bottom: 8px; margin-bottom: 12px; }
						pre { white-space: pre-wrap; font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; background: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; }
						.header-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-weight: bold; }
						@media print { button { display: none; } body { padding: 0; } }
					</style>
				</head>
				<body>
					<h1>РЕАНИМАЦИОННАЯ КАРТА ОКАЗАНИЯ ЭКСТРЕННОЙ ПОМОЩИ (СМП 112)</h1>
					<div class="header-info">
						<div>Клиника: ${clinicName} (${clinicAddress})</div>
						<div>Врач: ${doctorName}</div>
						<div>Пациент: ${patientName} (${patientAgeYears} лет, ${weightKg} кг)</div>
						<div>Дата/Время: ${new Date().toLocaleString("ru-RU")}</div>
					</div>
					<pre>${actText}</pre>
					<script>window.print();</script>
				</body>
				</html>
			`);
			printWindow.document.close();
		}
	}, [
		activeScenarioId,
		patientName,
		patientAgeYears,
		weightKg,
		clinicName,
		clinicAddress,
		doctorName,
		injectedAnestheticInfo,
		stopwatchSeconds,
		eventLogs,
		administeredDrugs,
	]);

	if (!isOpen) return null;

	const commonWeights = [15, 25, 40, 50, 60, 70, 80, 90, 100, 110];

	return (
		<div
			className="emergency-protocol-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby="emergency-modal-title"
		>
			<div className="emergency-protocol-card" data-testid="emergency-protocol-modal">
				{/* 1. HEADER WITH RESUSCITATION CONTROLS */}
				<header className="emergency-header">
					<div className="emergency-header-title">
						<div className="emergency-icon-badge">
							<ShieldAlert size={28} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2
									id="emergency-modal-title"
									className="text-lg font-black tracking-tight text-slate-900 dark:text-white m-0 uppercase"
								>
									{currentProtocol.titleRu}
								</h2>
								<span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow">
									{currentProtocol.severityBadgeRu}
								</span>
							</div>
							<p className="text-xs text-slate-600 dark:text-slate-300 font-semibold m-0 mt-0.5">
								Пациент: <span className="font-bold text-slate-900 dark:text-white">{patientName}</span> ({patientAgeYears} лет, {weightKg} кг) · {injectedAnestheticInfo}
							</p>
						</div>
					</div>

					<div className="emergency-header-actions">
						{/* Call 112 / SBAR Script */}
						<button
							type="button"
							onClick={() => setShowDispatchScript(true)}
							className="emergency-action-btn danger"
							data-testid="open-dispatch-script-btn"
						>
							<PhoneCall size={18} />
							<span>Скрипт СМП (112)</span>
						</button>

						{/* Close */}
						<button
							type="button"
							onClick={onClose}
							className="emergency-action-btn"
							aria-label="Закрыть экстренный протокол"
							data-testid="emergency-close-btn"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* 2. SCENARIO SELECTOR TABS */}
				<nav className="emergency-scenarios-bar" aria-label="Сценарии неотложной помощи">
					<button
						type="button"
						onClick={() => {
							setActiveScenarioId("last_toxicity");
							soundFeedback.playActionSuccess();
						}}
						className={`emergency-scenario-btn last ${activeScenarioId === "last_toxicity" ? "active" : ""}`}
						data-testid="tab-last-toxicity"
					>
						<Zap size={16} />
						<span>Токсичность МА (LAST / Липиды 20%)</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setActiveScenarioId("anaphylaxis");
							soundFeedback.playActionSuccess();
						}}
						className={`emergency-scenario-btn ${activeScenarioId === "anaphylaxis" ? "active" : ""}`}
						data-testid="tab-anaphylaxis"
					>
						<AlertOctagon size={16} />
						<span>Анафилактический шок</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setActiveScenarioId("syncope_collapse");
							soundFeedback.playActionSuccess();
						}}
						className={`emergency-scenario-btn syncope ${activeScenarioId === "syncope_collapse" ? "active" : ""}`}
						data-testid="tab-syncope"
					>
						<HeartPulse size={16} />
						<span>Обморок / Коллапс</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setActiveScenarioId("hypertensive_crisis");
							soundFeedback.playActionSuccess();
						}}
						className={`emergency-scenario-btn crisis ${activeScenarioId === "hypertensive_crisis" ? "active" : ""}`}
						data-testid="tab-crisis"
					>
						<Layers size={16} />
						<span>Гипертонический криз</span>
					</button>
				</nav>

				{/* 3. IMMEDIATE GOLDEN RULE BANNER */}
				<div className="emergency-golden-banner" data-testid="emergency-golden-banner">
					<AlertTriangle size={20} className="shrink-0" />
					<div>{currentProtocol.immediateGoldenRuleRu}</div>
				</div>

				{/* 4. MAIN MODAL BODY */}
				<div className="emergency-modal-body">
					{/* LEFT COLUMN: DOSAGE CALCULATOR & STEP-BY-STEP TIMELINE */}
					<div className="flex flex-col gap-4">
						{/* Weight Adjustment & Quick Calculator */}
						<section className="emergency-calc-panel" aria-label="Калькулятор дозировок по массе тела">
							<div className="flex items-center justify-between">
								<div className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-2">
									<LifeBuoy size={16} className="text-red-500" />
									<span>Расчет дозировок по массе тела: <strong>{weightKg} кг</strong> {weightKg < 40 ? "(Ребенок/Подросток)" : "(Взрослый)"}</span>
								</div>

								{/* Manual Weight Adjust */}
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setWeightKg((w) => Math.max(10, w - 5))}
										className="w-8 h-8 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-black text-sm flex items-center justify-center hover:bg-slate-100"
									>
										-5
									</button>
									<span className="font-mono font-black text-sm w-12 text-center text-red-600 dark:text-red-400">
										{weightKg} кг
									</span>
									<button
										type="button"
										onClick={() => setWeightKg((w) => Math.min(160, w + 5))}
										className="w-8 h-8 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-black text-sm flex items-center justify-center hover:bg-slate-100"
									>
										+5
									</button>
								</div>
							</div>

							{/* Weight Preset Chips */}
							<div className="emergency-weight-chips">
								{commonWeights.map((w) => (
									<button
										key={w}
										type="button"
										onClick={() => {
											setWeightKg(w);
											soundFeedback.playSpeechCaptured();
										}}
										className={`emergency-weight-chip ${weightKg === w ? "active" : ""}`}
										data-testid={`weight-chip-${w}`}
									>
										{w} кг
									</button>
								))}
							</div>

							{/* Dynamic Dose Cards */}
							<div className="emergency-dose-grid">
								{/* Adrenaline */}
								<div className="emergency-dose-card primary-drug" data-testid="dose-card-epinephrine">
									<div className="text-[11px] font-black uppercase text-red-600 dark:text-red-400 flex items-center justify-between">
										<span>ЭПИНЕФРИН 0.1%</span>
										<span>В/М В БЕДРО</span>
									</div>
									<div className="emergency-dose-val">{calculatedDosages.epinephrine.volumeText}</div>
									<div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
										{calculatedDosages.epinephrine.doseText} · {calculatedDosages.epinephrine.noteRu}
									</div>
									<button
										type="button"
										onClick={() =>
											handleAdministerDrug(
												"Эпинефрин 0.1%",
												calculatedDosages.epinephrine.volumeText,
												"в/м в переднебоковую поверхность бедра",
											)
										}
										className="emergency-action-btn danger mt-1 py-1.5 text-xs justify-center"
										data-testid="admin-btn-epinephrine"
									>
										<Plus size={14} /> Ввести {calculatedDosages.epinephrine.volumeText}
									</button>
								</div>

								{/* 20% Lipid Emulsion (LAST) */}
								<div className="emergency-dose-card lipid-drug" data-testid="dose-card-lipid">
									<div className="text-[11px] font-black uppercase text-orange-600 dark:text-orange-400 flex items-center justify-between">
										<span>ЛИПИДЫ 20% (LAST)</span>
										<span>В/В БОЛЮС + ИНФУЗИЯ</span>
									</div>
									<div className="emergency-dose-val lipid">
										Болюс: {calculatedDosages.lipidEmulsion20.bolusVolumeText}
									</div>
									<div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
										Инфузия: {calculatedDosages.lipidEmulsion20.infusionRateText} · макс: {calculatedDosages.lipidEmulsion20.maxTotal30MinText}
									</div>
									<button
										type="button"
										onClick={() =>
											handleAdministerDrug(
												"20% Липидная эмульсия (Липофундин)",
												`Болюс ${calculatedDosages.lipidEmulsion20.bolusVolumeText}`,
												"в/в струйно за 1 мин",
											)
										}
										className="emergency-action-btn mt-1 py-1.5 text-xs justify-center font-bold bg-orange-600 text-white border-orange-700 hover:bg-orange-700"
										data-testid="admin-btn-lipid-bolus"
									>
										<Plus size={14} /> Ввести болюс {calculatedDosages.lipidEmulsion20.bolusVolumeText}
									</button>
								</div>

								{/* Dexamethasone / Prednisolone */}
								<div className="emergency-dose-card" data-testid="dose-card-hormone">
									<div className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 flex items-center justify-between">
										<span>ДЕКСАМЕТАЗОН / ПРЕДНИЗОЛОН</span>
										<span>В/В СТРУЙНО</span>
									</div>
									<div className="emergency-dose-val text-indigo-600 dark:text-indigo-400">
										{calculatedDosages.prednisolone.volumeText}
									</div>
									<div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
										{calculatedDosages.prednisolone.doseText} (или Дексаметазон 8–16 мг)
									</div>
									<button
										type="button"
										onClick={() =>
											handleAdministerDrug(
												"Преднизолон",
												calculatedDosages.prednisolone.volumeText,
												"в/в медленно струйно",
											)
										}
										className="emergency-action-btn mt-1 py-1.5 text-xs justify-center font-bold"
										data-testid="admin-btn-prednisolone"
									>
										<Plus size={14} /> Ввести {calculatedDosages.prednisolone.volumeText}
									</button>
								</div>

								{/* 0.9% NaCl Infusion */}
								<div className="emergency-dose-card" data-testid="dose-card-nacl">
									<div className="text-[11px] font-black uppercase text-teal-600 dark:text-teal-400 flex items-center justify-between">
										<span>0.9% NaCl (ФИЗРАСТВОР)</span>
										<span>СТРУЙНО</span>
									</div>
									<div className="emergency-dose-val text-teal-600 dark:text-teal-400">
										{calculatedDosages.nacl09Infusion.volumeText}
									</div>
									<div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
										{calculatedDosages.nacl09Infusion.noteRu}
									</div>
									<button
										type="button"
										onClick={() =>
											handleAdministerDrug(
												"0.9% NaCl",
												calculatedDosages.nacl09Infusion.volumeText,
												"в/в струйно под давлением",
											)
										}
										className="emergency-action-btn mt-1 py-1.5 text-xs justify-center font-bold"
										data-testid="admin-btn-nacl"
									>
										<Plus size={14} /> Начать инфузию {calculatedDosages.nacl09Infusion.volumeText}
									</button>
								</div>
							</div>
						</section>

						{/* Step-by-Step Interactive Timeline */}
						<section className="emergency-timeline" aria-label="Пошаговый алгоритм действий">
							{currentProtocol.steps.map((step) => {
								return (
									<article
										key={step.stepNumber}
										className={`emergency-step-card ${step.isCriticalFirstAction ? "critical" : ""}`}
										data-testid={`emergency-step-${step.stepNumber}`}
									>
										<div className="emergency-step-header">
											<div className="flex items-center gap-2.5">
												<div className="emergency-step-num">{step.stepNumber}</div>
												<h3 className="text-sm font-black text-slate-900 dark:text-white m-0">
													{step.titleRu}
												</h3>
											</div>
											<span className="emergency-step-time">{step.timeframeRu}</span>
										</div>

										<p className="text-xs text-slate-700 dark:text-slate-300 m-0 leading-relaxed font-medium">
											{step.descriptionRu}
										</p>

										{step.criticalWarningRu && (
											<div className="p-2 rounded bg-amber-500/10 border-l-4 border-amber-500 text-xs text-amber-800 dark:text-amber-200 font-semibold flex items-center gap-2">
												<AlertTriangle size={16} className="shrink-0 text-amber-500" />
												<span>{step.criticalWarningRu}</span>
											</div>
										)}

										{/* Interactive Checklist for the Step */}
										<div className="emergency-checklist">
											{step.checklistItemsRu.map((item, idx) => {
												const itemKey = `${activeScenarioId}_step${step.stepNumber}_item${idx}`;
												const isDone = Boolean(completedChecklistItems[itemKey]);
												return (
													<div
														key={idx}
														onClick={() => handleToggleCheckItem(step.stepNumber, idx, item)}
														className={`emergency-check-item ${isDone ? "done" : ""}`}
														role="checkbox"
														aria-checked={isDone}
														data-testid={`check-item-${step.stepNumber}-${idx}`}
													>
														<div
															className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
																isDone
																	? "bg-green-600 border-green-700 text-white"
																	: "border-slate-400 bg-white dark:bg-slate-800"
															}`}
														>
															{isDone && <Check size={14} />}
														</div>
														<span>{item}</span>
													</div>
												);
											})}
										</div>
									</article>
								);
							})}
						</section>
					</div>

					{/* RIGHT COLUMN: TIMER, CPR METRONOME, QUICK ADMIN, RESUSCITATION LOG */}
					<aside className="emergency-sidebar">
						{/* 1. Resuscitation Stopwatch Panel */}
						<div className="emergency-stopwatch-panel" data-testid="stopwatch-panel">
							<div className="text-[11px] font-black tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
								<Clock size={14} className="text-red-400" />
								<span>ТАЙМЕР РЕАНИМАЦИИ</span>
							</div>

							<div
								className={`emergency-stopwatch-digits ${isTimerRunning ? "running" : ""}`}
								data-testid="stopwatch-digits"
							>
								{formatEmergencyStopwatchTime(stopwatchSeconds)}
							</div>

							<div className="emergency-timer-btns">
								<button
									type="button"
									onClick={() => {
										setIsTimerRunning((prev) => !prev);
										soundFeedback.playSpeechCaptured();
									}}
									className={`emergency-timer-btn ${isTimerRunning ? "pause" : "start"}`}
									data-testid="timer-toggle-btn"
								>
									{isTimerRunning ? <RotateCcw size={14} /> : <Play size={14} />}
									<span>{isTimerRunning ? "Пауза" : "Старт"}</span>
								</button>

								<button
									type="button"
									onClick={() => {
										setStopwatchSeconds(0);
										soundFeedback.playSpeechCaptured();
										logResuscitationEvent("Сброс таймера реанимации");
									}}
									className="emergency-timer-btn reset"
									data-testid="timer-reset-btn"
								>
									<RotateCcw size={14} />
									<span>Сброс</span>
								</button>

								<button
									type="button"
									onClick={() => {
										logResuscitationEvent("Фиксация контрольной точки витальных функций");
										soundFeedback.playActionSuccess();
										showToast("Контрольная точка зафиксирована", "info");
									}}
									className="emergency-timer-btn start"
									data-testid="timer-lap-btn"
								>
									<CheckCircle2 size={14} />
									<span>Метка</span>
								</button>
							</div>
						</div>

						{/* 2. CPR Metronome (110 bpm) */}
						<button
							type="button"
							onClick={() => {
								setIsMetronomeActive((prev) => !prev);
								soundFeedback.playSpeechCaptured();
							}}
							className={`emergency-cpr-metronome ${isMetronomeActive ? "active" : ""}`}
							data-testid="cpr-metronome-btn"
						>
							<Heart size={18} className={isMetronomeActive ? "text-white animate-ping" : "text-red-400"} />
							<span>{isMetronomeActive ? "СЛР Метроном (110 уд/мин ВКЛ)" : "Включить метроном СЛР (110 уд/мин)"}</span>
						</button>

						{/* 3. Direct Emergency Call Button */}
						<a
							href="tel:112"
							onClick={() => {
								logResuscitationEvent("ВЫЗОВ СМП 112");
								soundFeedback.playActionSuccess();
							}}
							className="emergency-call-btn"
							data-testid="call-112-btn"
						>
							<Phone size={20} />
							<span>ВЫЗВАТЬ СМП (112 / 103)</span>
						</a>

						{/* 4. Quick Medication Actions */}
						<div className="flex flex-col gap-2">
							<div className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
								Быстрая фиксация введения:
							</div>
							<div className="emergency-quick-admin-grid">
								<button
									type="button"
									onClick={() =>
										handleAdministerDrug(
											"Эпинефрин 0.1%",
											calculatedDosages.epinephrine.volumeText,
											"в/м в бедро",
										)
									}
									className="emergency-quick-drug-btn"
								>
									<span className="font-bold text-red-600 dark:text-red-400">
										+ Адреналин ({calculatedDosages.epinephrine.volumeText})
									</span>
									<span className="text-[10px] text-slate-500 font-mono">в/м</span>
								</button>

								{activeScenarioId === "last_toxicity" && (
									<button
										type="button"
										onClick={() =>
											handleAdministerDrug(
												"Липиды 20%",
												`Болюс ${calculatedDosages.lipidEmulsion20.bolusVolumeText}`,
												"в/в струйно",
											)
										}
										className="emergency-quick-drug-btn"
									>
										<span className="font-bold text-orange-600 dark:text-orange-400">
											+ Липиды 20% ({calculatedDosages.lipidEmulsion20.bolusVolumeText})
										</span>
										<span className="text-[10px] text-slate-500 font-mono">болюс</span>
									</button>
								)}

								<button
									type="button"
									onClick={() =>
										handleAdministerDrug(
											"Дексаметазон",
											"8 мг (2 ампулы)",
											"в/в струйно",
										)
									}
									className="emergency-quick-drug-btn"
								>
									<span className="font-bold text-indigo-600 dark:text-indigo-400">
										+ Дексаметазон (8 мг)
									</span>
									<span className="text-[10px] text-slate-500 font-mono">в/в</span>
								</button>

								<button
									type="button"
									onClick={() =>
										handleAdministerDrug(
											"0.9% NaCl",
											calculatedDosages.nacl09Infusion.volumeText,
											"в/в струйно",
										)
									}
									className="emergency-quick-drug-btn"
								>
									<span className="font-bold text-teal-600 dark:text-teal-400">
										+ Физраствор ({calculatedDosages.nacl09Infusion.volumeText})
									</span>
									<span className="text-[10px] text-slate-500 font-mono">болюс</span>
								</button>
							</div>
						</div>

						{/* 5. Resuscitation Action Log */}
						<div className="flex flex-col gap-2">
							<div className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center justify-between">
								<span>Журнал реанимации:</span>
								<span className="font-mono text-red-500 font-bold">{eventLogs.length} событий</span>
							</div>

							<div className="emergency-log-card" data-testid="resuscitation-event-log">
								{eventLogs.length === 0 ? (
									<div className="text-slate-400 italic text-[11px] p-2">
										События и введенные препараты фиксируются здесь по секундам таймера...
									</div>
								) : (
									eventLogs.map((log, idx) => (
										<div key={idx} className="emergency-log-entry">
											<span className="emergency-log-time">{log.timeFormatted}</span>
											<span>— {log.titleRu}</span>
										</div>
									))
								)}
							</div>
						</div>
					</aside>
				</div>

				{/* 5. FOOTER: ACTIONS & FORM 043/u INSERTION */}
				<footer className="emergency-footer">
					<div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
						Укладка неотложной помощи: ст. 786н, Приложение 11 · Адреналин 0.1%, Преднизолон, Липиды 20%, Воздуховод, Мешок Амбу
					</div>

					<div className="emergency-footer-btns">
						<button
							type="button"
							onClick={handlePrintRecord}
							className="emergency-action-btn"
							data-testid="print-emergency-record-btn"
						>
							<Printer size={16} />
							<span>Печать карты для СМП</span>
						</button>

						<button
							type="button"
							onClick={handleInsertToProtocol}
							className="emergency-action-btn primary"
							data-testid="insert-to-043-btn"
						>
							<FileText size={16} />
							<span>1-Клик вставка в дневник 043/у</span>
						</button>
					</div>
				</footer>

				{/* SBAR 112 DISPATCH MODAL DRAWER */}
				{showDispatchScript && (
					<div
						className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
						role="dialog"
						aria-modal="true"
						aria-labelledby="dispatch-script-title"
					>
						<div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl p-5 border border-red-500 shadow-2xl flex flex-col gap-4">
							<div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
								<div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-base uppercase">
									<PhoneCall size={20} />
									<h3 id="dispatch-script-title" className="m-0 text-base">Скрипт вызова СМП (112 / 103) по стандарту SBAR</h3>
								</div>
								<button
									type="button"
									onClick={() => setShowDispatchScript(false)}
									className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
								>
									<X size={18} />
								</button>
							</div>

							<div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs leading-relaxed text-slate-900 dark:text-slate-100 whitespace-pre-wrap max-h-[60vh] overflow-y-auto select-all">
								{dispatch112Script}
							</div>

							<div className="flex items-center justify-between gap-3 pt-2">
								<a
									href="tel:112"
									className="emergency-action-btn danger flex-1 justify-center"
									onClick={() => logResuscitationEvent("ЗВОНОК 112")}
								>
									<Phone size={16} /> Набрать 112
								</a>

								<button
									type="button"
									onClick={() => {
										navigator.clipboard?.writeText(dispatch112Script);
										soundFeedback.playActionSuccess();
										showToast("Текст скопирован в буфер обмена", "success");
									}}
									className="emergency-action-btn flex-1 justify-center"
								>
									<Copy size={16} /> Скопировать текст
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
