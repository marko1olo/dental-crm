/**
 * EmergencyVitalsMonitorModal.tsx — Intraoperative Vitals Monitor & Emergency Protocols HUD
 * Standards: Минздрав РФ, ФАР, СтАР
 *
 * Features:
 * - Dominant 24-32px vital signs display (BP, HR, SpO2, Glucose, MAP, Shock Index)
 * - 1-Click Vitals Presets (Норма, Криз, Коллапс, Анафилаксия, Гипогликемия)
 * - Immediate Epinephrine Blockade Indicator (>180/110 mmHg)
 * - 1-Click Interactive Algorithms (Анафилаксия, Обморок, Гиперкриз, Гипогликемия, ОКС, СЛР)
 * - Weight-adjusted real-time drug dose calculators
 * - 5-Minute Adrenaline repeat timer
 * - 103/112 Ambulance Dispatcher Rapid Cheat Sheet
 * - 1-Click Form 043/u Statutory Protocol Export to Diary
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Copy,
	Droplet,
	FileText,
	Flame,
	Heart,
	HeartPulse,
	Info,
	Minus,
	Pause,
	PhoneCall,
	Pill,
	Play,
	Plus,
	RotateCcw,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Syringe,
	User,
	Volume2,
	Wind,
	X,
	Zap,
} from 'lucide-react';
import {
	VitalsInput,
	VitalsTriageReport,
	evaluateVitalsTriage,
	calculateMeanArterialPressure,
	calculateShockIndex,
} from './vitalsTriageMath';
import {
	EmergencyScenarioId,
	EMERGENCY_SCENARIOS_CATALOG,
	EmergencyScenarioDefinition,
	ExecutedEmergencyStepRecord,
	EmergencyIncidentData,
	calculateWeightAdjustedEmergencyDoses,
	generateEmergencyProtocol043,
	generateAmbulanceCheatSheet,
	formatEmergencyTime,
} from './emergencyProtocolsEngine';
import { showToast } from '../../GlobalToast';

export interface EmergencyVitalsMonitorModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onApplyToDiary?: ((protocol043Text: string, incidentData: EmergencyIncidentData) => void) | undefined;
	readonly initialPatientName?: string | undefined;
	readonly initialPatientAgeYears?: number | undefined;
	readonly initialPatientWeightKg?: number | undefined;
	readonly initialPatientGender?: 'male' | 'female' | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly cabinetNumber?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly assistantFullName?: string | undefined;
	readonly medCardNumber?: string | undefined;
	readonly initialScenarioId?: EmergencyScenarioId | undefined;
	readonly isLocked?: boolean | undefined;
}

export const EmergencyVitalsMonitorModal: React.FC<EmergencyVitalsMonitorModalProps> = ({
	isOpen,
	onClose,
	onApplyToDiary,
	initialPatientName = 'Иванов Иван Иванович',
	initialPatientAgeYears = 42,
	initialPatientWeightKg = 75,
	initialPatientGender = 'male',
	clinicName = 'Стоматологическая клиника DENTE',
	clinicAddress = 'г. Москва, ул. Клиническая, д. 10, стр. 2',
	cabinetNumber = '1',
	doctorFullName = 'Д-р Смирнов А. В.',
	assistantFullName = 'Медсестра Петрова Е. С.',
	medCardNumber = '043/у-2026/894',
	initialScenarioId = 'anaphylactic_shock',
	isLocked = false,
}) => {
	// 1. Patient Demographics State
	const [patientName, setPatientName] = useState<string>(initialPatientName);
	const [patientAge, setPatientAge] = useState<number>(initialPatientAgeYears);
	const [patientWeightKg, setPatientWeightKg] = useState<number>(initialPatientWeightKg);
	const [patientGender, setPatientGender] = useState<'male' | 'female'>(initialPatientGender);

	// 2. Intraoperative Vitals State
	const [bpSystolic, setBpSystolic] = useState<number>(120);
	const [bpDiastolic, setBpDiastolic] = useState<number>(80);
	const [heartRate, setHeartRate] = useState<number>(75);
	const [spO2, setSpO2] = useState<number>(98);
	const [glucose, setGlucose] = useState<number | null>(5.4);
	const [respiratoryRate, setRespiratoryRate] = useState<number>(16);

	// 3. Active Emergency Scenario & Checklist State
	const [activeScenarioId, setActiveScenarioId] = useState<EmergencyScenarioId>(initialScenarioId);
	const [executedSteps, setExecutedSteps] = useState<ExecutedEmergencyStepRecord[]>([]);
	const [incidentStartTimeIso] = useState<string>(() => new Date().toISOString());

	// 4. Ambulance (СМП 103/112) Call State
	const [isSmpModalOpen, setIsSmpModalOpen] = useState<boolean>(false);
	const [isSmpCalled, setIsSmpCalled] = useState<boolean>(false);
	const [smpCallTimeIso, setSmpCallTimeIso] = useState<string | undefined>(undefined);
	const [smpBrigadeNumber, setSmpBrigadeNumber] = useState<string>('');
	const [outcome, setOutcome] = useState<EmergencyIncidentData['outcome']>('stabilized_in_clinic');

	// 5. Adrenaline Repeat Timer (300 sec / 5 min)
	const [adrenalineTimerSeconds, setAdrenalineTimerSeconds] = useState<number>(300);
	const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

	// 6. UI Notification state
	const [isCopied, setIsCopied] = useState<boolean>(false);

	// Sync initial props on open
	useEffect(() => {
		if (isOpen) {
			setPatientName(initialPatientName);
			setPatientAge(initialPatientAgeYears);
			setPatientWeightKg(initialPatientWeightKg);
			setPatientGender(initialPatientGender);
			setActiveScenarioId(initialScenarioId);
		}
	}, [isOpen, initialPatientName, initialPatientAgeYears, initialPatientWeightKg, initialPatientGender, initialScenarioId]);

	// Escape key handler
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) {
				if (isSmpModalOpen) {
					setIsSmpModalOpen(false);
				} else {
					onClose();
				}
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, isSmpModalOpen, onClose]);

	// Adrenaline Timer Interval
	useEffect(() => {
		let interval: NodeJS.Timeout | null = null;
		if (isTimerRunning && adrenalineTimerSeconds > 0) {
			interval = setInterval(() => {
				setAdrenalineTimerSeconds((prev) => {
					if (prev <= 1) {
						setIsTimerRunning(false);
						showToast('⏰ ВРЕМЯ ПОВТОРА АДРЕНАЛИНА! Оцените АД и готовность ко 2-й дозе.');
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}
		return () => {
			if (interval) clearInterval(interval);
		};
	}, [isTimerRunning, adrenalineTimerSeconds]);

	// Vitals Input Bundle
	const currentVitalsInput: VitalsInput = useMemo(() => ({
		bpSystolic,
		bpDiastolic,
		heartRate,
		spO2,
		bloodGlucose: glucose,
		respiratoryRate,
	}), [bpSystolic, bpDiastolic, heartRate, spO2, glucose, respiratoryRate]);

	// Mathematical Triage Report
	const triageReport: VitalsTriageReport = useMemo(() => {
		return evaluateVitalsTriage(currentVitalsInput);
	}, [currentVitalsInput]);

	// Weight-adjusted drug doses
	const weightDoses = useMemo(() => {
		return calculateWeightAdjustedEmergencyDoses(patientWeightKg);
	}, [patientWeightKg]);

	// Active Scenario Definition
	const activeScenario: EmergencyScenarioDefinition = useMemo(() => {
		return EMERGENCY_SCENARIOS_CATALOG[activeScenarioId] || EMERGENCY_SCENARIOS_CATALOG.anaphylactic_shock;
	}, [activeScenarioId]);

	// Step execution toggle
	const handleToggleStep = (stepId: string, stepTitle: string, defaultDrugDose?: string) => {
		setExecutedSteps((prev) => {
			const existingIndex = prev.findIndex((s) => s.stepId === stepId);
			if (existingIndex >= 0) {
				// uncheck
				return prev.filter((s) => s.stepId !== stepId);
			}
			// check and stamp
			return [
				...prev,
				{
					stepId,
					stepTitle,
					executedAtIso: new Date().toISOString(),
					administeredDrugDose: defaultDrugDose,
				},
			];
		});

		// If step is adrenaline injection, start 5 min timer automatically
		if (stepId.includes('adrenaline') || stepId.includes('epinephrine')) {
			setAdrenalineTimerSeconds(300);
			setIsTimerRunning(true);
			showToast('⏱ Запущен 5-минутный таймер контроля адреналина');
		}
	};

	// 1-Click Vitals Presets
	const applyVitalsPreset = (presetKey: 'norm' | 'crisis' | 'collapse' | 'anaphylaxis' | 'hypoglycemia' | 'tachycardia') => {
		switch (presetKey) {
			case 'norm':
				setBpSystolic(120);
				setBpDiastolic(80);
				setHeartRate(75);
				setSpO2(98);
				setGlucose(5.2);
				setRespiratoryRate(16);
				break;
			case 'crisis':
				setBpSystolic(195);
				setBpDiastolic(115);
				setHeartRate(102);
				setSpO2(97);
				setActiveScenarioId('hypertensive_crisis');
				break;
			case 'collapse':
				setBpSystolic(75);
				setBpDiastolic(45);
				setHeartRate(46);
				setSpO2(95);
				setActiveScenarioId('syncope_collapse');
				break;
			case 'anaphylaxis':
				setBpSystolic(60);
				setBpDiastolic(30);
				setHeartRate(130);
				setSpO2(87);
				setActiveScenarioId('anaphylactic_shock');
				break;
			case 'hypoglycemia':
				setBpSystolic(105);
				setBpDiastolic(65);
				setHeartRate(108);
				setGlucose(2.6);
				setActiveScenarioId('hypoglycemia');
				break;
			case 'tachycardia':
				setHeartRate(145);
				setBpSystolic(140);
				setBpDiastolic(90);
				break;
		}
	};

	// Assemble incident data object
	const assembleIncidentData = useCallback((): EmergencyIncidentData => {
		return {
			scenarioId: activeScenarioId,
			patientFullName: patientName,
			patientAgeYears: patientAge,
			patientWeightKg: patientWeightKg,
			patientGender,
			clinicName,
			clinicAddress,
			cabinetNumber,
			doctorFullName,
			assistantFullName,
			medCardNumber,
			initialVitals: currentVitalsInput,
			latestVitals: currentVitalsInput,
			incidentStartTimeIso,
			triageReport,
			executedSteps,
			smpCalled: isSmpCalled,
			smpCallTimeIso,
			smpBrigadeNumber,
			outcome,
		};
	}, [
		activeScenarioId,
		patientName,
		patientAge,
		patientWeightKg,
		patientGender,
		clinicName,
		clinicAddress,
		cabinetNumber,
		doctorFullName,
		assistantFullName,
		medCardNumber,
		currentVitalsInput,
		incidentStartTimeIso,
		triageReport,
		executedSteps,
		isSmpCalled,
		smpCallTimeIso,
		smpBrigadeNumber,
		outcome,
	]);

	// 1-Click Export to Form 043/u
	const handleApplyToDiary = () => {
		if (isLocked) return;
		const incidentData = assembleIncidentData();
		const protocolText = generateEmergencyProtocol043(incidentData);

		if (onApplyToDiary) {
			onApplyToDiary(protocolText, incidentData);
		} else {
			try {
				window.dispatchEvent(
					new CustomEvent('dente-apply-soap-protocol', {
						detail: {
							soap: {
								complications: protocolText,
							},
							mode: 'smart_append',
						},
					}),
				);
			} catch {
				// fallback
			}
		}

		showToast('✅ Протокол неотложки успешно экспортирован в дневник 043/у');
		onClose();
	};

	// Copy protocol text to clipboard
	const handleCopyProtocol = () => {
		const incidentData = assembleIncidentData();
		const protocolText = generateEmergencyProtocol043(incidentData);
		navigator.clipboard.writeText(protocolText);
		setIsCopied(true);
		showToast('📋 Протокол скопирован в буфер обмена');
		setTimeout(() => setIsCopied(false), 2000);
	};

	// Format timer mm:ss
	const timerMin = Math.floor(adrenalineTimerSeconds / 60);
	const timerSec = adrenalineTimerSeconds % 60;
	const formattedTimer = `${timerMin}:${timerSec < 10 ? '0' : ''}${timerSec}`;

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-labelledby="vitals-monitor-title"
		>
			<div className="relative w-full max-w-5xl rounded-2xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--border,#e2e8f0)] shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
				{/* 1. TOP HEADER: Status Banner & Call 103 Button */}
				<div
					className={`flex flex-wrap items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b ${
						triageReport.overallLevel === 'emergency' || triageReport.overallLevel === 'crisis'
							? 'bg-rose-600 text-white border-rose-700 animate-pulse'
							: triageReport.overallLevel === 'attention'
								? 'bg-amber-500 text-slate-900 border-amber-600'
								: 'bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border-[var(--border,#e2e8f0)]'
					}`}
				>
					<div className="flex items-center gap-3">
						<div
							className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
								triageReport.overallLevel === 'emergency' || triageReport.overallLevel === 'crisis'
									? 'bg-white text-rose-600 shadow-md'
									: 'bg-teal-500/20 text-teal-700 dark:text-teal-300'
							}`}
						>
							<HeartPulse size={24} className={triageReport.overallLevel !== 'normal' ? 'animate-bounce' : ''} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 id="vitals-monitor-title" className="text-lg sm:text-xl font-black tracking-tight">
									Монитор витальных функций и Неотложка
								</h2>
								<span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold uppercase bg-black/20 text-current">
									Минздрав РФ / ФАР
								</span>
							</div>
							<p className="text-xs opacity-90">
								{patientName} • {patientAge} лет • {patientWeightKg} кг • Кабинет №{cabinetNumber}
							</p>
						</div>
					</div>

					{/* Header Actions */}
					<div className="flex items-center gap-2 mt-2 sm:mt-0">
						<button
							type="button"
							onClick={() => setIsSmpModalOpen(true)}
							className="min-h-[44px] px-4 rounded-xl font-bold text-sm bg-red-700 hover:bg-red-800 text-white border border-red-500 shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
							aria-label="Вызов бригады скорой помощи 103 или 112"
						>
							<PhoneCall size={18} className="animate-pulse" />
							<span>🚨 Вызов 103 / 112</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-black/10 hover:bg-black/20 text-current transition-colors cursor-pointer"
							aria-label="Закрыть монитор"
						>
							<X size={22} />
						</button>
					</div>
				</div>

				{/* 2. WARNING / BLOCKADE STRIP (IF ANY CRISIS DETECTED) */}
				{triageReport.isAdrenalineBlocked && (
					<div className="bg-rose-950 text-rose-100 px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-between border-b border-rose-700">
						<div className="flex items-center gap-2">
							<AlertOctagon size={18} className="text-rose-400 shrink-0" />
							<span>
								⛔ <strong>БЛОКИРОВКА АДРЕНАЛИНА!</strong> АД {bpSystolic}/{bpDiastolic} мм рт.ст. Введение местных анестетиков с эпинефрином ЗАПРЕЩЕНО!
							</span>
						</div>
						<span className="text-xs bg-rose-800 px-2 py-0.5 rounded text-white font-mono">
							Криз III ст.
						</span>
					</div>
				)}

				{triageReport.isCriticalHypoxia && (
					<div className="bg-orange-950 text-orange-100 px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 border-b border-orange-700">
						<Wind size={18} className="text-orange-400 shrink-0" />
						<span>
							💨 <strong>КРИТИЧЕСКАЯ ГИПОКСИЯ (SpO2 {spO2}%)!</strong> Немедленная подача кислорода 10–15 л/мин через маску с резервуаром.
						</span>
					</div>
				)}

				{/* 3. MODAL BODY (SCROLLABLE) */}
				<div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 bg-[var(--paper,#ffffff)]">
					{/* TOP ROW: 4 DOMINANT VITALS TILES (24-32px Font Standard) */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
						{/* 1. Blood Pressure Card */}
						<div
							className={`p-3 sm:p-4 rounded-2xl border flex flex-col justify-between transition-all ${
								triageReport.bloodPressure.level === 'emergency' || triageReport.bloodPressure.level === 'crisis'
									? 'bg-rose-500/10 border-rose-500/40 text-rose-950 dark:text-rose-200'
									: triageReport.bloodPressure.level === 'attention'
										? 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200'
										: 'bg-[var(--paper-soft,#f8fafc)] border-[var(--border,#e2e8f0)]'
							}`}
						>
							<div className="flex items-center justify-between">
								<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1">
									<Activity size={14} className="text-rose-500" />
									АД (мм рт.ст.)
								</span>
								<span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
									СрАД: {triageReport.meanArterialPressure}
								</span>
							</div>

							{/* Large Numbers */}
							<div className="my-2 flex items-baseline gap-1">
								<span className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
									{bpSystolic} / {bpDiastolic}
								</span>
							</div>

							{/* Quick BP Adjusters */}
							<div className="flex items-center gap-1.5 mt-1">
								<button
									type="button"
									onClick={() => {
										setBpSystolic((p) => Math.max(40, p - 10));
										setBpDiastolic((p) => Math.max(20, p - 5));
									}}
									className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--paper-strong,#e2e8f0)] hover:bg-[var(--border,#cbd5e1)] flex items-center justify-center font-bold text-sm cursor-pointer"
									aria-label="Уменьшить давление на 10 мм рт.ст."
								>
									<Minus size={16} />
								</button>
								<button
									type="button"
									onClick={() => {
										setBpSystolic((p) => Math.min(260, p + 10));
										setBpDiastolic((p) => Math.min(160, p + 5));
									}}
									className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--paper-strong,#e2e8f0)] hover:bg-[var(--border,#cbd5e1)] flex items-center justify-center font-bold text-sm cursor-pointer"
									aria-label="Увеличить давление на 10 мм рт.ст."
								>
									<Plus size={16} />
								</button>
								<span className="text-[11px] font-medium text-[var(--muted)] leading-tight truncate">
									{triageReport.bloodPressure.statusLabelRu}
								</span>
							</div>
						</div>

						{/* 2. Heart Rate Card */}
						<div
							className={`p-3 sm:p-4 rounded-2xl border flex flex-col justify-between transition-all ${
								triageReport.heartRate.level === 'emergency' || triageReport.heartRate.level === 'crisis'
									? 'bg-rose-500/10 border-rose-500/40 text-rose-950 dark:text-rose-200'
									: triageReport.heartRate.level === 'attention'
										? 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200'
										: 'bg-[var(--paper-soft,#f8fafc)] border-[var(--border,#e2e8f0)]'
							}`}
						>
							<div className="flex items-center justify-between">
								<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1">
									<Heart size={14} className="text-red-500 fill-red-500" />
									ЧСС / Пульс
								</span>
								<span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
									BPM
								</span>
							</div>

							<div className="my-2 flex items-baseline gap-1.5">
								<span className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
									{heartRate}
								</span>
								<span className="text-xs text-[var(--muted)]">уд/мин</span>
							</div>

							<div className="flex items-center gap-1.5 mt-1">
								<button
									type="button"
									onClick={() => setHeartRate((p) => Math.max(0, p - 5))}
									className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--paper-strong,#e2e8f0)] hover:bg-[var(--border,#cbd5e1)] flex items-center justify-center font-bold text-sm cursor-pointer"
									aria-label="Уменьшить ЧСС на 5 уд/мин"
								>
									<Minus size={16} />
								</button>
								<button
									type="button"
									onClick={() => setHeartRate((p) => Math.min(220, p + 5))}
									className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--paper-strong,#e2e8f0)] hover:bg-[var(--border,#cbd5e1)] flex items-center justify-center font-bold text-sm cursor-pointer"
									aria-label="Увеличить ЧСС на 5 уд/мин"
								>
									<Plus size={16} />
								</button>
								<span className="text-[11px] font-medium text-[var(--muted)] leading-tight truncate">
									{triageReport.heartRate.statusLabelRu}
								</span>
							</div>
						</div>

						{/* 3. SpO2 Oxygen Saturation Card */}
						<div
							className={`p-3 sm:p-4 rounded-2xl border flex flex-col justify-between transition-all ${
								triageReport.spO2.level === 'emergency' || triageReport.spO2.level === 'crisis'
									? 'bg-rose-500/10 border-rose-500/40 text-rose-950 dark:text-rose-200'
									: triageReport.spO2.level === 'attention'
										? 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200'
										: 'bg-[var(--paper-soft,#f8fafc)] border-[var(--border,#e2e8f0)]'
							}`}
						>
							<div className="flex items-center justify-between">
								<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1">
									<Wind size={14} className="text-sky-500" />
									SpO2 Сатурация
								</span>
								<span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
									%
								</span>
							</div>

							<div className="my-2 flex items-baseline gap-1.5">
								<span className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
									{spO2}%
								</span>
							</div>

							<div className="flex items-center gap-1.5 mt-1">
								<button
									type="button"
									onClick={() => setSpO2((p) => Math.max(50, p - 2))}
									className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--paper-strong,#e2e8f0)] hover:bg-[var(--border,#cbd5e1)] flex items-center justify-center font-bold text-sm cursor-pointer"
									aria-label="Уменьшить SpO2 на 2%"
								>
									<Minus size={16} />
								</button>
								<button
									type="button"
									onClick={() => setSpO2((p) => Math.min(100, p + 2))}
									className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--paper-strong,#e2e8f0)] hover:bg-[var(--border,#cbd5e1)] flex items-center justify-center font-bold text-sm cursor-pointer"
									aria-label="Увеличить SpO2 на 2%"
								>
									<Plus size={16} />
								</button>
								<span className="text-[11px] font-medium text-[var(--muted)] leading-tight truncate">
									{triageReport.spO2.statusLabelRu}
								</span>
							</div>
						</div>

						{/* 4. Blood Glucose Card */}
						<div
							className={`p-3 sm:p-4 rounded-2xl border flex flex-col justify-between transition-all ${
								triageReport.glucose && (triageReport.glucose.level === 'emergency' || triageReport.glucose.level === 'crisis')
									? 'bg-rose-500/10 border-rose-500/40 text-rose-950 dark:text-rose-200'
									: triageReport.glucose?.level === 'attention'
										? 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200'
										: 'bg-[var(--paper-soft,#f8fafc)] border-[var(--border,#e2e8f0)]'
							}`}
						>
							<div className="flex items-center justify-between">
								<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1">
									<Droplet size={14} className="text-amber-500" />
									Глюкоза крови
								</span>
								<span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
									ммоль/л
								</span>
							</div>

							<div className="my-2 flex items-baseline gap-1.5">
								<span className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
									{glucose !== null ? glucose.toFixed(1) : '—'}
								</span>
								<span className="text-xs text-[var(--muted)]">ммоль/л</span>
							</div>

							<div className="flex items-center gap-1.5 mt-1">
								<button
									type="button"
									onClick={() => setGlucose((p) => (p !== null ? Math.max(1.0, Math.round((p - 0.5) * 10) / 10) : 5.0))}
									className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--paper-strong,#e2e8f0)] hover:bg-[var(--border,#cbd5e1)] flex items-center justify-center font-bold text-sm cursor-pointer"
									aria-label="Уменьшить глюкозу на 0.5 ммоль/л"
								>
									<Minus size={16} />
								</button>
								<button
									type="button"
									onClick={() => setGlucose((p) => (p !== null ? Math.min(25.0, Math.round((p + 0.5) * 10) / 10) : 5.0))}
									className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--paper-strong,#e2e8f0)] hover:bg-[var(--border,#cbd5e1)] flex items-center justify-center font-bold text-sm cursor-pointer"
									aria-label="Увеличить глюкозу на 0.5 ммоль/л"
								>
									<Plus size={16} />
								</button>
								<span className="text-[11px] font-medium text-[var(--muted)] leading-tight truncate">
									{triageReport.glucose?.statusLabelRu || 'Не измерялась'}
								</span>
							</div>
						</div>
					</div>

					{/* QUICK VITALS PRESETS BAR (1-CLICK SPEED SETTERS) */}
					<div className="flex items-center gap-2 overflow-x-auto pb-1">
						<span className="text-xs font-bold text-[var(--muted)] shrink-0">
							Быстрые пресеты:
						</span>
						<button
							type="button"
							onClick={() => applyVitalsPreset('norm')}
							className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--border)] shrink-0 transition-colors cursor-pointer"
						>
							🟢 Норма (120/80, 75 bpm)
						</button>
						<button
							type="button"
							onClick={() => applyVitalsPreset('crisis')}
							className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shrink-0 transition-colors cursor-pointer"
						>
							🔴 Криз (195/115) [Стоп-Адреналин]
						</button>
						<button
							type="button"
							onClick={() => applyVitalsPreset('collapse')}
							className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 shrink-0 transition-colors cursor-pointer"
						>
							🟡 Обморок (75/45, 46 bpm)
						</button>
						<button
							type="button"
							onClick={() => applyVitalsPreset('anaphylaxis')}
							className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-700 text-white hover:bg-rose-800 shrink-0 transition-colors cursor-pointer"
						>
							🚨 Анафилаксия (60/30, SpO2 87%)
						</button>
						<button
							type="button"
							onClick={() => applyVitalsPreset('hypoglycemia')}
							className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-300 shrink-0 transition-colors cursor-pointer"
						>
							🍬 Гипогликемия (2.6 ммоль/л)
						</button>
					</div>

					{/* PROTOCOL SELECTOR TABS (1-CLICK ALGORITHM SWITCHER) */}
					<div className="border-t border-[var(--border,#e2e8f0)] pt-4">
						<div className="flex items-center justify-between mb-3">
							<h3 className="text-sm sm:text-base font-black flex items-center gap-2">
								<Stethoscope size={18} className="text-teal-600 dark:text-teal-400" />
								<span>Алгоритмы неотложной помощи (Минздрав РФ)</span>
							</h3>
							{/* Shock index pill */}
							<div className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--border)] flex items-center gap-1.5">
								<span>Шоковый индекс:</span>
								<span
									className={`font-black ${
										triageReport.shockIndex.isDecompensatedShock
											? 'text-rose-600'
											: triageReport.shockIndex.isShockThreat
												? 'text-amber-600'
												: 'text-teal-600'
									}`}
								>
									{triageReport.shockIndex.shockIndex} ({triageReport.shockIndex.level})
								</span>
							</div>
						</div>

						{/* Tabs */}
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
							{(
								[
									{ id: 'anaphylactic_shock', label: 'Анафилаксия', badge: 'T78.2' },
									{ id: 'syncope_collapse', label: 'Обморок / Коллапс', badge: 'R55' },
									{ id: 'hypertensive_crisis', label: 'Гиперкриз', badge: 'I10' },
									{ id: 'hypoglycemia', label: 'Гипогликемия', badge: 'E16.2' },
									{ id: 'angina_acs', label: 'ОКС / Стенокардия', badge: 'I20' },
									{ id: 'cardiac_arrest', label: 'СЛР 30:2', badge: 'I46.9' },
								] as const
							).map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveScenarioId(tab.id)}
									className={`min-h-[44px] p-2 rounded-xl text-left flex flex-col justify-center border transition-all cursor-pointer ${
										activeScenarioId === tab.id
											? 'bg-[var(--teal-surface,#f0fdfa)] border-[var(--teal,#0d9488)] text-[var(--teal-strong,#0f766e)] shadow-xs font-bold'
											: 'bg-[var(--paper-soft,#f8fafc)] border-[var(--border,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink)]'
									}`}
								>
									<span className="text-xs truncate font-bold">{tab.label}</span>
									<span className="text-[10px] opacity-75 font-mono">{tab.badge}</span>
								</button>
							))}
						</div>
					</div>

					{/* ACTIVE SCENARIO HUD & STEP-BY-STEP CHECKLIST */}
					<div className="rounded-2xl border border-[var(--border,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-4 sm:p-5 space-y-4">
						{/* Scenario Title Header */}
						<div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border,#e2e8f0)] pb-3">
							<div>
								<div className="flex items-center gap-2">
									<h4 className="text-base font-black text-[var(--ink)]">
										{activeScenario.titleRu}
									</h4>
									<span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
										Код МКБ-10: {activeScenario.icd10Code}
									</span>
								</div>
								<p className="text-xs text-[var(--muted)] mt-0.5">
									{activeScenario.statutoryBasisRu}
								</p>
							</div>

							{/* Adrenaline 5-Min Timer Widget */}
							<div className="flex items-center gap-2 bg-[var(--paper)] px-3 py-1.5 rounded-xl border border-[var(--border)] shadow-xs">
								<Clock size={16} className={isTimerRunning ? 'text-rose-500 animate-spin' : 'text-[var(--muted)]'} />
								<div className="text-xs font-mono font-black">
									Таймер адреналина: <span className="text-rose-600 dark:text-rose-400 text-sm">{formattedTimer}</span>
								</div>
								<button
									type="button"
									onClick={() => setIsTimerRunning((p) => !p)}
									className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] flex items-center justify-center cursor-pointer text-xs"
									title={isTimerRunning ? 'Пауза' : 'Старт'}
								>
									{isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
								</button>
								<button
									type="button"
									onClick={() => {
										setIsTimerRunning(false);
										setAdrenalineTimerSeconds(300);
									}}
									className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] flex items-center justify-center cursor-pointer text-xs"
									title="Сброс"
								>
									<RotateCcw size={16} />
								</button>
							</div>
						</div>

						{/* Weight-Adjusted Dosage Pill Box */}
						<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-950 dark:text-teal-100 flex flex-wrap items-center gap-4 text-xs">
							<span className="font-bold flex items-center gap-1">
								<Syringe size={14} className="text-teal-600" />
								Дозировки на вес {patientWeightKg} кг:
							</span>
							<span>
								<strong>Адреналин 0.1%:</strong> {weightDoses.adrenalineAnaphylaxis.textRu}
							</span>
							<span>
								<strong>Дексаметазон:</strong> {weightDoses.dexamethasone.textRu}
							</span>
							<span>
								<strong>0.9% NaCl:</strong> {weightDoses.nacl09Infusion.textRu}
							</span>
						</div>

						{/* Step-by-Step Action Items */}
						<div className="space-y-2.5">
							{activeScenario.actionSteps.map((step, idx) => {
								const isExecuted = executedSteps.some((s) => s.stepId === step.id);
								const executedRecord = executedSteps.find((s) => s.stepId === step.id);

								return (
									<div
										key={step.id}
										onClick={() => handleToggleStep(step.id, step.titleRu, step.medication?.doseAdult)}
										className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
											isExecuted
												? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100'
												: step.priority === 'immediate_sec'
													? 'bg-rose-500/5 border-rose-300 dark:border-rose-900/50 hover:bg-rose-500/10'
													: 'bg-[var(--paper)] border-[var(--border)] hover:bg-[var(--paper-soft)]'
										}`}
									>
										{/* Checkbox Icon */}
										<div
											className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
												isExecuted
													? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
													: 'border-[var(--border,#cbd5e1)] bg-[var(--paper)]'
											}`}
										>
											{isExecuted && <Check size={16} />}
										</div>

										{/* Content */}
										<div className="flex-1 min-w-0">
											<div className="flex flex-wrap items-center justify-between gap-1">
												<div className="flex items-center gap-2">
													<span className="text-xs font-mono font-black opacity-75">
														#{idx + 1}
													</span>
													<h5 className={`text-sm font-bold ${isExecuted ? 'line-through opacity-80' : ''}`}>
														{step.titleRu}
													</h5>
												</div>
												{executedRecord ? (
													<span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
														Выполнено в {formatEmergencyTime(executedRecord.executedAtIso)}
													</span>
												) : (
													<span
														className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
															step.priority === 'immediate_sec'
																? 'bg-rose-500/10 text-rose-600'
																: 'bg-[var(--paper-strong)] text-[var(--muted)]'
														}`}
													>
														{step.priority === 'immediate_sec' ? 'Немедленно (0-60 сек)' : '1-2 мин'}
													</span>
												)}
											</div>

											<p className="text-xs text-[var(--muted)] mt-1">
												{step.instructionRu}
											</p>

											{step.medication && (
												<div className="mt-2 text-xs p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--border)] font-mono text-[var(--ink)]">
													💊 <strong>Препарат:</strong> {step.medication.nameRu} • {step.medication.doseAdult} ({step.medication.routeOfAdminRu})
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* 4. BOTTOM ACTION BAR (HOT PATH EXPORT & ACTIONS) */}
				<div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:px-6 sm:py-4 bg-[var(--paper-soft,#f8fafc)] border-t border-[var(--border,#e2e8f0)] shrink-0">
					<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
						<FileText size={16} />
						<span>
							Выполнено шагов: <strong>{executedSteps.length}</strong> из {activeScenario.actionSteps.length}
						</span>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{/* Copy Plaintext */}
						<button
							type="button"
							onClick={handleCopyProtocol}
							className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border)] flex items-center gap-1.5 transition-colors cursor-pointer"
						>
							{isCopied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
							<span>{isCopied ? 'Скопировано' : 'Копировать'}</span>
						</button>

						{/* Export to 043/u */}
						<button
							type="button"
							onClick={handleApplyToDiary}
							className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
						>
							<FileText size={16} />
							<span>📋 Экспорт в дневник 043/у</span>
						</button>

						{/* Close button */}
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-[var(--paper-strong,#e2e8f0)] hover:bg-[var(--border,#cbd5e1)] text-[var(--ink)] transition-colors cursor-pointer"
						>
							Закрыть
						</button>
					</div>
				</div>

				{/* 5. AMBULANCE 103 / 112 DISPATCHER MODAL OVERLAY */}
				{isSmpModalOpen && (
					<div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
						<div className="relative w-full max-w-xl rounded-2xl bg-[var(--paper,#ffffff)] border border-rose-500 shadow-2xl p-5 space-y-4">
							<div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-900 pb-3">
								<div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
									<PhoneCall size={22} className="animate-pulse" />
									<h4 className="text-lg font-black">
										Шпаргалка звонка в СМП 103 / 112
									</h4>
								</div>
								<button
									type="button"
									onClick={() => setIsSmpModalOpen(false)}
									className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 cursor-pointer"
									aria-label="Закрыть окно вызова СМП"
								>
									<X size={18} />
								</button>
							</div>

							<div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-xl border border-rose-200 dark:border-rose-900 text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed">
								{generateAmbulanceCheatSheet(assembleIncidentData())}
							</div>

							{/* SMP Form inputs */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
								<div>
									<label className="text-xs font-bold text-[var(--muted)] block mb-1">
										Номер бригады СМП (если назвали):
									</label>
									<input
										type="text"
										value={smpBrigadeNumber}
										onChange={(e) => setSmpBrigadeNumber(e.target.value)}
										placeholder="Например: 14 или Реанимация 4"
										className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-xs font-mono"
									/>
								</div>
								<div>
									<label className="text-xs font-bold text-[var(--muted)] block mb-1">
										Статус звонка:
									</label>
									<button
										type="button"
										onClick={() => {
											setIsSmpCalled(true);
											setSmpCallTimeIso(new Date().toISOString());
											showToast('🚑 Вызов СМП зафиксирован в протоколе');
										}}
										className={`w-full min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
											isSmpCalled
												? 'bg-emerald-600 text-white'
												: 'bg-rose-600 hover:bg-rose-700 text-white'
										}`}
									>
										{isSmpCalled ? <CheckCircle2 size={16} /> : <PhoneCall size={16} />}
										<span>{isSmpCalled ? 'Вызов 103 зафиксирован' : 'Отметить: «Вызов совершен»'}</span>
									</button>
								</div>
							</div>

							<div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
								<button
									type="button"
									onClick={() => {
										navigator.clipboard.writeText(generateAmbulanceCheatSheet(assembleIncidentData()));
										showToast('📋 Текст для диспетчера скорой скопирован');
									}}
									className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--border)] cursor-pointer"
								>
									Скопировать текст
								</button>
								<button
									type="button"
									onClick={() => setIsSmpModalOpen(false)}
									className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
								>
									Готово
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
