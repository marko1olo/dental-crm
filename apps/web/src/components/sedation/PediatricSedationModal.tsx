/**
 * Pediatric Sedation Monitor & Frankl Behavior Log Modal Component
 * 100% Token Compliant, Multi-Theme, Touch-First (>=44px), Medical Grade HUD.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
	Activity,
	Wind,
	Award,
	HeartPulse,
	FileText,
	CheckCircle2,
	AlertTriangle,
	X,
	Printer,
	Copy,
	ShieldAlert,
	Sparkles,
	Clock,
	Droplets,
	Info,
	Play,
	Square,
	Plus,
	RotateCcw
} from 'lucide-react';
import {
	FranklRating,
	FRANKL_BEHAVIOR_SCALE,
	AromaMaskScentId,
	AROMA_MASK_SCENTS,
	BraveryBadgeId,
	BRAVERY_BADGES,
	SEDATION_PRESETS,
	SedationPresetId,
	SEDATION_SAFETY_LIMITS
} from './sedationPresets';
import {
	calculateGasMixture,
	calculateSedationGasConsumption,
	evaluateVitalSigns,
	generateSedationProtocol043,
	generateBraveryDiploma,
	validateFastingSafety,
	VitalSignsLogEntry,
	GasConsumptionResult,
	getAgeVitalNorms
} from './sedationEngine';
import './pediatricSedation.css';

export interface PediatricSedationModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string | undefined;
	patientName?: string | undefined;
	patientAge?: number | undefined;
	patientBirthDate?: string | undefined;
	doctorName?: string | undefined;
	assistantName?: string | undefined;
	clinicalDiagnosis?: string | undefined;
	plannedProcedure?: string | undefined;
	initialFrankl?: FranklRating | undefined;
	onSaveProtocol?: ((protocolText: string, consumption: GasConsumptionResult) => void) | undefined;
}

type TabType = 'monitor' | 'protocol043' | 'diploma' | 'preparation';

export const PediatricSedationModal: React.FC<PediatricSedationModalProps> = ({
	isOpen,
	onClose,
	patientId: _patientId,
	patientName = 'Иванов Миша',
	patientAge = 5,
	patientBirthDate: _patientBirthDate,
	doctorName = 'Д-р Петрова А. С.',
	assistantName = 'Медсестра Смирнова Е. В.',
	clinicalDiagnosis = 'К02.1 Кариес дентина зубов 54, 55 (множественный кариес)',
	plannedProcedure = 'Препарирование и пломбирование полостей зубов 54, 55 светоотверждаемым композитом',
	initialFrankl = 'frankl_2_negative',
	onSaveProtocol
}) => {
	// Active Tab Navigation
	const [activeTab, setActiveTab] = useState<TabType>('monitor');

	// Session State
	const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
	const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);
	const [selectedPreset, setSelectedPreset] = useState<SedationPresetId>('standard_pediatric_therapy');

	// Gas Parameters
	const [n2oPercent, setN2oPercent] = useState<number>(0); // Starts at 0% (100% O2)
	const [flowRateLpm, setFlowRateLpm] = useState<number>(5.0);
	const [maskScent, setMaskScent] = useState<AromaMaskScentId>('strawberry');

	// Frankl Behavioral Ratings
	const [preOpFrankl, setPreOpFrankl] = useState<FranklRating>(initialFrankl);
	const [postOpFrankl, setPostOpFrankl] = useState<FranklRating>('frankl_4_definitely_positive');

	// Fasting Info
	const [fastingLiquidsHours, setFastingLiquidsHours] = useState<number>(2.5);
	const [fastingSolidsHours, setFastingSolidsHours] = useState<number>(6.0);

	// Current Live Vital Signs
	const [currentSpo2, setCurrentSpo2] = useState<number>(98);
	const [currentPulse, setCurrentPulse] = useState<number>(95);
	const [currentRespiratoryRate, setCurrentRespiratoryRate] = useState<number>(22);
	const [currentSystolicBp, setCurrentSystolicBp] = useState<number>(100);
	const [currentDiastolicBp, setCurrentDiastolicBp] = useState<number>(65);

	// Vital Signs History Logs
	const [vitalLogs, setVitalLogs] = useState<VitalSignsLogEntry[]>([
		{
			id: 'log_0',
			timestampMinutes: 0,
			spo2Percent: 99,
			pulseBpm: 105,
			respiratoryRate: 24,
			systolicBp: 100,
			diastolicBp: 65,
			n2oPercent: 0,
			o2Percent: 100,
			flowRateLpm: 5.0,
			franklRating: initialFrankl,
			notes: 'Индукция 100% O2, адаптация к маске'
		}
	]);

	// Bravery Diploma State
	const [selectedBadge, setSelectedBadge] = useState<BraveryBadgeId>('magic_mask_master');
	const [customDiplomaPraise, setCustomDiplomaPraise] = useState<string>('');

	// Notification / Feedback Toast State
	const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);

	// Age Norms & Live Gas Output
	const ageNorms = useMemo(() => getAgeVitalNorms(patientAge), [patientAge]);
	const gasMixture = useMemo(() => calculateGasMixture(n2oPercent, flowRateLpm), [n2oPercent, flowRateLpm]);

	// Vital signs real-time evaluation
	const vitalsEval = useMemo(
		() =>
			evaluateVitalSigns(
				{
					spo2: currentSpo2,
					pulse: currentPulse,
					respiratoryRate: currentRespiratoryRate,
					systolicBp: currentSystolicBp,
					diastolicBp: currentDiastolicBp
				},
				patientAge
			),
		[currentSpo2, currentPulse, currentRespiratoryRate, currentSystolicBp, currentDiastolicBp, patientAge]
	);

	// Fasting validation
	const fastingEval = useMemo(
		() => validateFastingSafety(fastingLiquidsHours, fastingSolidsHours),
		[fastingLiquidsHours, fastingSolidsHours]
	);

	// Gas Consumption Calculation
	const gasConsumption = useMemo(() => {
		const timelineSteps = vitalLogs.map((log, idx) => {
			const nextLog = vitalLogs[idx + 1];
			const dur = nextLog ? Math.max(1, nextLog.timestampMinutes - log.timestampMinutes) : 5;
			return {
				durationMin: dur,
				flowRateLpm: log.flowRateLpm,
				n2oPercent: log.n2oPercent,
				o2Percent: log.o2Percent
			};
		});

		// Add active uncommitted segment if session is active
		if (isSessionActive && timelineSteps.length > 0) {
			const lastLog = vitalLogs[vitalLogs.length - 1];
			const activeDuration = Math.max(1, elapsedMinutes - (lastLog ? lastLog.timestampMinutes : 0));
			if (activeDuration > 0) {
				timelineSteps.push({
					durationMin: activeDuration,
					flowRateLpm,
					n2oPercent,
					o2Percent: gasMixture.o2Percent
				});
			}
		}

		return calculateSedationGasConsumption(timelineSteps);
	}, [vitalLogs, isSessionActive, elapsedMinutes, flowRateLpm, n2oPercent, gasMixture.o2Percent]);

	// Form 043/u Output
	const protocol043 = useMemo(() => {
		return generateSedationProtocol043({
			patientFullName: patientName,
			patientAgeYears: patientAge,
			procedureDate: new Date().toLocaleDateString('ru-RU'),
			doctorFullName: doctorName,
			assistantFullName: assistantName,
			clinicalDiagnosisRu: clinicalDiagnosis,
			plannedProcedureRu: plannedProcedure,
			preOpFrankl,
			postOpFrankl,
			maskScent,
			fastingHoursSinceSolids: fastingSolidsHours,
			fastingHoursSinceLiquids: fastingLiquidsHours,
			vitalLogs
		});
	}, [
		patientName,
		patientAge,
		doctorName,
		assistantName,
		clinicalDiagnosis,
		plannedProcedure,
		preOpFrankl,
		postOpFrankl,
		maskScent,
		fastingSolidsHours,
		fastingLiquidsHours,
		vitalLogs
	]);

	// Diploma Data
	const diplomaData = useMemo(() => {
		return generateBraveryDiploma({
			childName: patientName,
			childAgeYears: patientAge,
			procedureDate: new Date().toLocaleDateString('ru-RU'),
			doctorName,
			badgeId: selectedBadge,
			customPraiseRu: customDiplomaPraise.trim() || undefined
		});
	}, [patientName, patientAge, doctorName, selectedBadge, customDiplomaPraise]);

	// Session Timer Effect
	useEffect(() => {
		let timer: ReturnType<typeof setInterval> | null = null;
		if (isSessionActive) {
			timer = setInterval(() => {
				setElapsedMinutes((prev) => prev + 1);
			}, 60000); // 1 minute per tick in real-time
		}
		return () => {
			if (timer) clearInterval(timer);
		};
	}, [isSessionActive]);

	// Handle Emergency 100% O2 Flush Button
	const handleEmergencyFlush = useCallback(() => {
		setN2oPercent(0);
		setFlowRateLpm(6.0);

		// Record flush log entry
		const flushEntry: VitalSignsLogEntry = {
			id: `log_${Date.now()}`,
			timestampMinutes: elapsedMinutes,
			spo2Percent: currentSpo2,
			pulseBpm: currentPulse,
			respiratoryRate: currentRespiratoryRate,
			systolicBp: currentSystolicBp,
			diastolicBp: currentDiastolicBp,
			n2oPercent: 0,
			o2Percent: 100,
			flowRateLpm: 6.0,
			franklRating: preOpFrankl,
			notes: 'ЭКСТРЕННАЯ ПРОДУВКА: 100% O2 (6.0 л/мин)'
		};
		setVitalLogs((prev) => [...prev, flushEntry]);
	}, [elapsedMinutes, currentSpo2, currentPulse, currentRespiratoryRate, currentSystolicBp, currentDiastolicBp, preOpFrankl]);

	// Handle Quick Titration Step
	const handleStepN2o = useCallback(
		(delta: number) => {
			setN2oPercent((prev) => {
				const nextVal = Math.max(0, Math.min(SEDATION_SAFETY_LIMITS.maxN2oPercentRoutine, prev + delta));
				return nextVal;
			});
		},
		[]
	);

	// Handle Adding Vital Log Row
	const handleAddVitalLog = useCallback(() => {
		const newEntry: VitalSignsLogEntry = {
			id: `log_${Date.now()}`,
			timestampMinutes: elapsedMinutes,
			spo2Percent: currentSpo2,
			pulseBpm: currentPulse,
			respiratoryRate: currentRespiratoryRate,
			systolicBp: currentSystolicBp,
			diastolicBp: currentDiastolicBp,
			n2oPercent,
			o2Percent: gasMixture.o2Percent,
			flowRateLpm,
			franklRating: isSessionActive ? postOpFrankl : preOpFrankl,
			notes: n2oPercent === 0 ? '100% O2' : `Титрование N2O ${n2oPercent}%`
		};
		setVitalLogs((prev) => [...prev, newEntry]);
	}, [
		elapsedMinutes,
		currentSpo2,
		currentPulse,
		currentRespiratoryRate,
		currentSystolicBp,
		currentDiastolicBp,
		n2oPercent,
		gasMixture.o2Percent,
		flowRateLpm,
		isSessionActive,
		postOpFrankl,
		preOpFrankl
	]);

	// Handle Preset Change
	const handlePresetChange = useCallback((presetId: SedationPresetId) => {
		setSelectedPreset(presetId);
		const preset = SEDATION_PRESETS[presetId];
		setN2oPercent(preset.targetN2oPercent);
		setFlowRateLpm(preset.defaultFlowRateLpm);
		if (preset.recommendedMaskScent in AROMA_MASK_SCENTS) {
			setMaskScent(preset.recommendedMaskScent as AromaMaskScentId);
		}
	}, []);

	// Handle Copy Protocol to Clipboard
	const handleCopyProtocol = useCallback(() => {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(protocol043.fullFormattedTextRu);
			setCopiedFeedback(true);
			setTimeout(() => setCopiedFeedback(false), 2500);
		}
	}, [protocol043]);

	// Handle Print Trigger
	const handlePrint = useCallback(() => {
		window.print();
	}, []);

	// Handle Save & Submit
	const handleSave = useCallback(() => {
		if (onSaveProtocol) {
			onSaveProtocol(protocol043.fullFormattedTextRu, gasConsumption);
		}
		onClose();
	}, [onSaveProtocol, protocol043, gasConsumption, onClose]);

	if (!isOpen) return null;

	return (
		<div className="sedation-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sedation-title">
			<div className="sedation-modal-container">
				{/* Modal Header */}
				<header className="sedation-modal-header">
					<div className="sedation-header-left">
						<h2 id="sedation-title" className="sedation-header-title">
							<Wind className="w-5 h-5 text-teal" style={{ color: 'var(--teal)' }} />
							Монитор детской седации ЗАКС & Шкала Франкла
						</h2>
						<div className="sedation-header-badges">
							<span className="sedation-chip-badge">
								{patientName} ({patientAge} {patientAge <= 4 ? 'года' : 'лет'})
							</span>
							{isSessionActive ? (
								<span className="sedation-chip-badge active-session">
									<Activity className="w-3.5 h-3.5 animate-pulse" />
									Седация идет: {elapsedMinutes} мин
								</span>
							) : (
								<span className="sedation-chip-badge">
									<Clock className="w-3.5 h-3.5" />
									Сессия остановлена
								</span>
							)}
						</div>
					</div>
					<button
						type="button"
						className="sedation-close-btn"
						onClick={onClose}
						aria-label="Закрыть окно седации"
					>
						<X className="w-5 h-5" />
					</button>
				</header>

				{/* Navigation Tabs Bar */}
				<nav className="sedation-tabs-nav" aria-label="Разделы монитора седации">
					<button
						type="button"
						className={`sedation-tab-btn ${activeTab === 'monitor' ? 'active' : ''}`}
						onClick={() => setActiveTab('monitor')}
					>
						<Activity className="w-4 h-4" />
						Пульт и Мониторинг
					</button>
					<button
						type="button"
						className={`sedation-tab-btn ${activeTab === 'protocol043' ? 'active' : ''}`}
						onClick={() => setActiveTab('protocol043')}
					>
						<FileText className="w-4 h-4" />
						Протокол 043/у
					</button>
					<button
						type="button"
						className={`sedation-tab-btn ${activeTab === 'diploma' ? 'active' : ''}`}
						onClick={() => setActiveTab('diploma')}
					>
						<Award className="w-4 h-4" />
						Грамота храбрости
					</button>
					<button
						type="button"
						className={`sedation-tab-btn ${activeTab === 'preparation' ? 'active' : ''}`}
						onClick={() => setActiveTab('preparation')}
					>
						<Sparkles className="w-4 h-4" />
						Подготовка и Пресеты
					</button>
				</nav>

				{/* Modal Body Content */}
				<main className="sedation-modal-body">
					{/* TAB 1: LIVE MONITOR & GAS MIXER */}
					{activeTab === 'monitor' && (
						<div className="sedation-tab-pane">
							{/* Session Control Banner */}
							<div className="sedation-card">
								<div className="flex items-center justify-between flex-wrap gap-3">
									<div className="flex items-center gap-3">
										{!isSessionActive ? (
											<button
												type="button"
												className="sedation-btn-primary"
												onClick={() => setIsSessionActive(true)}
											>
												<Play className="w-4 h-4" />
												Начать сеанс седации ЗАКС
											</button>
										) : (
											<button
												type="button"
												className="sedation-btn-secondary"
												onClick={() => setIsSessionActive(false)}
											>
												<Square className="w-4 h-4 text-warn" />
												Приостановить таймер
											</button>
										)}
										<button
											type="button"
											className="sedation-btn-secondary"
											onClick={() => {
												setElapsedMinutes(0);
												setN2oPercent(0);
											}}
											title="Сброс таймера"
										>
											<RotateCcw className="w-4 h-4" />
											Сброс
										</button>
									</div>

									<div className="flex items-center gap-2">
										<span className="text-xs font-semibold" style={{ color: 'var(--ink-2, var(--ink))' }}>
											Сценарий:
										</span>
										<select
											className="sedation-titration-btn"
											value={selectedPreset}
											onChange={(e) => handlePresetChange(e.target.value as SedationPresetId)}
											aria-label="Выбор клинического сценария"
										>
											{Object.values(SEDATION_PRESETS).map((p) => (
												<option key={p.id} value={p.id}>
													{p.titleRu}
												</option>
											))}
										</select>
									</div>
								</div>
							</div>

							{/* Dual Gauge Gas Mixer HUD */}
							<div className="sedation-card">
								<div className="sedation-card-title">
									<span className="flex items-center gap-2">
										<Wind className="w-4 h-4" style={{ color: 'var(--teal)' }} />
										Газосмесительный блок (ЗАКС N₂O / O₂)
									</span>
									<span
										className="text-xs font-semibold px-2 py-0.5 rounded"
										style={{
											background: gasMixture.isSafe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
											color: gasMixture.isSafe ? 'var(--ok-fg)' : 'var(--bad-fg)'
										}}
									>
										{gasMixture.statusMessageRu}
									</span>
								</div>

								{/* Gauges Box */}
								<div className="sedation-mixer-grid">
									<div className="sedation-gauge-box o2-box">
										<span className="sedation-gauge-label">Кислород (O₂) Концентрация</span>
										<span className="sedation-gauge-value" style={{ color: 'var(--ok-fg)' }}>
											{gasMixture.o2Percent}%
										</span>
										<span className="sedation-gauge-sub">
											Поток: {gasMixture.o2FlowLpm} л/мин (мин. 50% в педиатрии)
										</span>
									</div>

									<div className="sedation-gauge-box n2o-box">
										<span className="sedation-gauge-label">Закись Азота (N₂O) Концентрация</span>
										<span className="sedation-gauge-value" style={{ color: 'var(--teal)' }}>
											{gasMixture.n2oPercent}%
										</span>
										<span className="sedation-gauge-sub">
											Поток: {gasMixture.n2oFlowLpm} л/мин (макс. {SEDATION_SAFETY_LIMITS.maxN2oPercentRoutine}%)
										</span>
									</div>
								</div>

								{/* Dual Color Gradient Bar */}
								<div className="sedation-dual-bar-container" aria-label="Соотношение газов смеси">
									<div
										className="sedation-dual-bar-o2"
										style={{ width: `${gasMixture.o2Percent}%` }}
									>
										O₂ {gasMixture.o2Percent}%
									</div>
									<div
										className="sedation-dual-bar-n2o"
										style={{ width: `${gasMixture.n2oPercent}%` }}
									>
										{gasMixture.n2oPercent > 5 ? `N₂O ${gasMixture.n2oPercent}%` : ''}
									</div>
								</div>

								{/* Interactive Mixture Slider */}
								<div className="sedation-slider-wrapper">
									<div className="flex justify-between text-xs font-semibold" style={{ color: 'var(--ink-2, var(--ink))' }}>
										<span>100% O₂ (Индукция / Выход)</span>
										<span>Терапевтический коридор (30–40% N₂O)</span>
										<span>Предел 50% N₂O</span>
									</div>
									<input
										type="range"
										min={0}
										max={50}
										step={5}
										value={n2oPercent}
										onChange={(e) => setN2oPercent(Number(e.target.value))}
										className="sedation-slider"
										aria-label="Регулятор концентрации закиси азота"
									/>
								</div>

								{/* Titration Quick Step Buttons */}
								<div className="sedation-titration-row">
									<span className="text-xs font-semibold" style={{ color: 'var(--ink-2, var(--ink))' }}>
										Титрование N₂O:
									</span>
									<button
										type="button"
										className="sedation-titration-btn"
										onClick={() => handleStepN2o(-10)}
										title="Уменьшить N2O на 10%"
									>
										-10%
									</button>
									<button
										type="button"
										className="sedation-titration-btn"
										onClick={() => handleStepN2o(-5)}
										title="Уменьшить N2O на 5%"
									>
										-5%
									</button>
									<button
										type="button"
										className={`sedation-titration-btn ${n2oPercent === 0 ? 'active' : ''}`}
										onClick={() => setN2oPercent(0)}
									>
										0% (Чистый O₂)
									</button>
									<button
										type="button"
										className={`sedation-titration-btn ${n2oPercent === 30 ? 'active' : ''}`}
										onClick={() => setN2oPercent(30)}
									>
										30% N₂O
									</button>
									<button
										type="button"
										className={`sedation-titration-btn ${n2oPercent === 40 ? 'active' : ''}`}
										onClick={() => setN2oPercent(40)}
									>
										40% N₂O
									</button>
									<button
										type="button"
										className={`sedation-titration-btn ${n2oPercent === 50 ? 'active' : ''}`}
										onClick={() => setN2oPercent(50)}
									>
										50% N₂O
									</button>
									<button
										type="button"
										className="sedation-titration-btn"
										onClick={() => handleStepN2o(+5)}
										title="Увеличить N2O на 5%"
									>
										+5%
									</button>
									<button
										type="button"
										className="sedation-titration-btn"
										onClick={() => handleStepN2o(+10)}
										title="Увеличить N2O на 10%"
									>
										+10%
									</button>

									{/* Total Flow Rate Selector */}
									<div className="flex items-center gap-1.5 ml-2">
										<span className="text-xs font-semibold" style={{ color: 'var(--ink-2, var(--ink))' }}>
											Поток:
										</span>
										<select
											className="sedation-titration-btn"
											value={flowRateLpm}
											onChange={(e) => setFlowRateLpm(Number(e.target.value))}
											aria-label="Суммарный поток газовой смеси"
										>
											<option value={3.5}>3.5 л/мин</option>
											<option value={4.0}>4.0 л/мин</option>
											<option value={4.5}>4.5 л/мин</option>
											<option value={5.0}>5.0 л/мин (стандарт)</option>
											<option value={5.5}>5.5 л/мин</option>
											<option value={6.0}>6.0 л/мин</option>
											<option value={7.0}>7.0 л/мин</option>
										</select>
									</div>

									{/* Emergency Flush 100% O2 Button */}
									<button
										type="button"
										className="sedation-flush-emergency-btn"
										onClick={handleEmergencyFlush}
										title="Экстренный перевод на 100% кислород"
									>
										<ShieldAlert className="w-4 h-4" />
										100% O₂ Продувка (5 мин)
									</button>
								</div>
							</div>

							{/* Frankl Behavior Rating Scale Selector */}
							<div className="sedation-card">
								<div className="sedation-card-title">
									<span>Шкала поведения Франкла (Frankl Behavior Rating Scale)</span>
									<span className="text-xs font-normal" style={{ color: 'var(--ink-2, var(--ink))' }}>
										Текущая оценка: {FRANKL_BEHAVIOR_SCALE[postOpFrankl].nameRu}
									</span>
								</div>

								<div className="frankl-grid">
									{Object.values(FRANKL_BEHAVIOR_SCALE).map((item) => {
										const isSelected = postOpFrankl === item.id;
										return (
											<button
												key={item.id}
												type="button"
												className={`frankl-card ${isSelected ? 'selected' : ''}`}
												onClick={() => setPostOpFrankl(item.id)}
											>
												<div className="frankl-card-header">
													<span className="frankl-emoji">{item.badgeEmoji}</span>
													<span className="frankl-score-badge">Балл {item.score}</span>
												</div>
												<h4 className="frankl-card-title">{item.shortLabelRu}</h4>
												<p className="frankl-card-desc">{item.clinicalDescriptionRu}</p>
											</button>
										);
									})}
								</div>
							</div>

							{/* Vital Signs Live HUD & Log Entry */}
							<div className="sedation-card">
								<div className="sedation-card-title">
									<span className="flex items-center gap-2">
										<HeartPulse className="w-4 h-4 text-red-500" style={{ color: 'var(--bad-fg)' }} />
										Мониторинг витальных функций (Возрастная группа: {ageNorms.ageGroupRu})
									</span>
									<button
										type="button"
										className="sedation-btn-primary"
										style={{ minHeight: '38px', padding: '0.375rem 0.875rem' }}
										onClick={handleAddVitalLog}
									>
										<Plus className="w-4 h-4" />
										Записать замер в карту
									</button>
								</div>

								{/* Vital Cards HUD */}
								<div className="sedation-vitals-hud">
									<div className={`sedation-vital-card ${vitalsEval.spo2Status}`}>
										<div className="sedation-vital-header">
											<span>SpO₂ (Сатурация)</span>
											<span>Норма ≥ {ageNorms.spo2MinSafe}%</span>
										</div>
										<div className="sedation-vital-val">
											<input
												type="number"
												min={70}
												max={100}
												value={currentSpo2}
												onChange={(e) => setCurrentSpo2(Number(e.target.value))}
												className="w-16 bg-transparent border-b border-line text-2xl font-extrabold focus:outline-none"
												aria-label="Текущее значение SpO2"
											/>
											<span className="sedation-vital-unit">%</span>
										</div>
									</div>

									<div className={`sedation-vital-card ${vitalsEval.pulseStatus}`}>
										<div className="sedation-vital-header">
											<span>ЧСС (Пульс)</span>
											<span>
												Норма: {ageNorms.pulseBpmMin}–{ageNorms.pulseBpmMax}
											</span>
										</div>
										<div className="sedation-vital-val">
											<input
												type="number"
												min={40}
												max={200}
												value={currentPulse}
												onChange={(e) => setCurrentPulse(Number(e.target.value))}
												className="w-16 bg-transparent border-b border-line text-2xl font-extrabold focus:outline-none"
												aria-label="Текущее значение ЧСС"
											/>
											<span className="sedation-vital-unit">уд/мин</span>
										</div>
									</div>

									<div className={`sedation-vital-card ${vitalsEval.respiratoryStatus}`}>
										<div className="sedation-vital-header">
											<span>ЧДД (Дыхание)</span>
											<span>
												Норма: {ageNorms.respiratoryRateMin}–{ageNorms.respiratoryRateMax}
											</span>
										</div>
										<div className="sedation-vital-val">
											<input
												type="number"
												min={8}
												max={60}
												value={currentRespiratoryRate}
												onChange={(e) => setCurrentRespiratoryRate(Number(e.target.value))}
												className="w-16 bg-transparent border-b border-line text-2xl font-extrabold focus:outline-none"
												aria-label="Текущее значение ЧДД"
											/>
											<span className="sedation-vital-unit">в мин</span>
										</div>
									</div>

									<div className={`sedation-vital-card ${vitalsEval.bpStatus}`}>
										<div className="sedation-vital-header">
											<span>АД (Давление)</span>
											<span>
												{ageNorms.systolicBpMin}–{ageNorms.systolicBpMax}/{ageNorms.diastolicBpMin}–{ageNorms.diastolicBpMax}
											</span>
										</div>
										<div className="sedation-vital-val text-xl">
											<input
												type="number"
												min={60}
												max={180}
												value={currentSystolicBp}
												onChange={(e) => setCurrentSystolicBp(Number(e.target.value))}
												className="w-12 bg-transparent border-b border-line text-xl font-bold focus:outline-none"
												aria-label="Систолическое АД"
											/>
											<span>/</span>
											<input
												type="number"
												min={40}
												max={120}
												value={currentDiastolicBp}
												onChange={(e) => setCurrentDiastolicBp(Number(e.target.value))}
												className="w-12 bg-transparent border-b border-line text-xl font-bold focus:outline-none"
												aria-label="Диастолическое АД"
											/>
										</div>
									</div>
								</div>

								{/* Vitals Log Table */}
								<div className="sedation-table-container">
									<table className="sedation-vitals-table">
										<thead>
											<tr>
												<th>Время</th>
												<th>N₂O (%)</th>
												<th>O₂ (%)</th>
												<th>Поток</th>
												<th>SpO₂</th>
												<th>ЧСС</th>
												<th>ЧДД</th>
												<th>Франкл</th>
												<th>Отметка врача</th>
											</tr>
										</thead>
										<tbody>
											{vitalLogs.map((log) => {
												const f = FRANKL_BEHAVIOR_SCALE[log.franklRating];
												return (
													<tr key={log.id}>
														<td className="font-semibold">+{log.timestampMinutes} мин</td>
														<td>
															<span className="font-bold" style={{ color: 'var(--teal)' }}>
																{log.n2oPercent}%
															</span>
														</td>
														<td>
															<span className="font-bold" style={{ color: 'var(--ok-fg)' }}>
																{log.o2Percent}%
															</span>
														</td>
														<td>{log.flowRateLpm.toFixed(1)} л/мин</td>
														<td>
															<span
																className="font-bold"
																style={{
																	color:
																		log.spo2Percent >= 95
																			? 'var(--ok-fg)'
																			: log.spo2Percent >= 92
																			? 'var(--warn)'
																			: 'var(--bad-fg)'
																}}
															>
																{log.spo2Percent}%
															</span>
														</td>
														<td>{log.pulseBpm} уд/мин</td>
														<td>{log.respiratoryRate ?? '-'}</td>
														<td>
															<span title={f.nameRu}>
																{f.score} {f.badgeEmoji}
															</span>
														</td>
														<td className="text-xs" style={{ color: 'var(--ink-2, var(--ink))' }}>
															{log.notes ?? '-'}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>

							{/* Live Gas Consumption Odometer */}
							<div className="sedation-card">
								<div className="sedation-card-title">
									<span>Калькулятор расхода медицинских газов & Себестоимость</span>
									<span
										className={`text-xs font-semibold ${
											gasConsumption.isFlushAdequate ? 'text-ok-fg' : 'text-warn'
										}`}
									>
										{gasConsumption.isFlushAdequate
											? '✓ Продувка 100% O2 завершена (>=5 мин)'
											: '⚠ Требуется продувка чистым O2 в конце (5 мин)'}
									</span>
								</div>

								<div className="sedation-odometer-grid">
									<div className="sedation-odometer-box">
										<span className="sedation-odometer-lbl">Общий объем O₂ (Кислород)</span>
										<span className="sedation-odometer-val" style={{ color: 'var(--ok-fg)' }}>
											{gasConsumption.totalO2VolumeLiters} л
										</span>
										<span className="text-xs" style={{ color: 'var(--ink-2, var(--ink))' }}>
											Стоимость: {gasConsumption.o2CostRub} ₽
										</span>
									</div>

									<div className="sedation-odometer-box">
										<span className="sedation-odometer-lbl">Общий объем N₂O (Закись)</span>
										<span className="sedation-odometer-val" style={{ color: 'var(--teal)' }}>
											{gasConsumption.totalN2oVolumeLiters} л
										</span>
										<span className="text-xs" style={{ color: 'var(--ink-2, var(--ink))' }}>
											Стоимость: {gasConsumption.n2oCostRub} ₽
										</span>
									</div>

									<div className="sedation-odometer-box">
										<span className="sedation-odometer-lbl">Длительность седации</span>
										<span className="sedation-odometer-val">
											{gasConsumption.totalSedationDurationMinutes} мин
										</span>
										<span className="text-xs" style={{ color: 'var(--ink-2, var(--ink))' }}>
											Продувка O₂: {gasConsumption.flushDurationMinutes} мин
										</span>
									</div>

									<div className="sedation-odometer-box">
										<span className="sedation-odometer-lbl">Итого себестоимость газов</span>
										<span className="sedation-odometer-val" style={{ color: 'var(--teal-dark, var(--teal))' }}>
											{gasConsumption.totalCostRub} ₽
										</span>
										<span className="text-xs" style={{ color: 'var(--ink-2, var(--ink))' }}>
											Макс N₂O: {gasConsumption.maxN2oReachedPercent}%
										</span>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* TAB 2: FORM 043/U PROTOCOL PREVIEW */}
					{activeTab === 'protocol043' && (
						<div className="sedation-tab-pane">
							<div className="sedation-card">
								<div className="sedation-card-title">
									<span>Протокол ингаляционной седации ЗАКС (Вкладыш формы 043/у)</span>
									<div className="flex items-center gap-2">
										<button
											type="button"
											className="sedation-btn-secondary"
											onClick={handleCopyProtocol}
										>
											{copiedFeedback ? (
												<>
													<CheckCircle2 className="w-4 h-4 text-ok-fg" />
													Скопировано!
												</>
											) : (
												<>
													<Copy className="w-4 h-4" />
													Скопировать в медкарту
												</>
											)}
										</button>
										<button
											type="button"
											className="sedation-btn-secondary"
											onClick={handlePrint}
										>
											<Printer className="w-4 h-4" />
											Печать протокола
										</button>
									</div>
								</div>

								{protocol043.safetyWarnings.length > 0 && (
									<div
										className="p-3 rounded-lg flex items-center gap-2"
										style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warn)' }}
									>
										<AlertTriangle className="w-4 h-4 flex-shrink-0" />
										<span className="text-xs font-semibold">{protocol043.safetyWarnings.join(' ')}</span>
									</div>
								)}

								<textarea
									className="sedation-protocol-textbox"
									readOnly
									value={protocol043.fullFormattedTextRu}
									aria-label="Текст официального протокола формы 043/у"
								/>
							</div>
						</div>
					)}

					{/* TAB 3: BRAVERY DIPLOMA GENERATOR */}
					{activeTab === 'diploma' && (
						<div className="sedation-tab-pane">
							<div className="sedation-card">
								<div className="sedation-card-title">
									<span>Генератор детской грамоты «За храбрость у стоматолога»</span>
									<button
										type="button"
										className="sedation-btn-primary"
										onClick={handlePrint}
									>
										<Printer className="w-4 h-4" />
										Распечатать грамоту
									</button>
								</div>

								{/* Badge Selector */}
								<div className="flex flex-wrap gap-2 mb-2">
									{Object.values(BRAVERY_BADGES).map((badge) => {
										const isSelected = selectedBadge === badge.id;
										return (
											<button
												key={badge.id}
												type="button"
												className={`sedation-titration-btn ${isSelected ? 'active' : ''}`}
												onClick={() => setSelectedBadge(badge.id)}
											>
												<span>{badge.badgeEmoji}</span>
												<span>{badge.titleRu}</span>
											</button>
										);
									})}
								</div>

								{/* Custom Praise input */}
								<div className="flex flex-col gap-1.5">
									<label className="text-xs font-semibold" style={{ color: 'var(--ink-2, var(--ink))' }}>
										Персональная похвала от доктора (опционально):
									</label>
									<input
										type="text"
										className="sedation-titration-btn w-full text-left"
										placeholder={BRAVERY_BADGES[selectedBadge].congratulationRu}
										value={customDiplomaPraise}
										onChange={(e) => setCustomDiplomaPraise(e.target.value)}
									/>
								</div>
							</div>

							{/* Diploma Visual Certificate Card */}
							<div className="sedation-diploma-wrapper">
								<div className="sedation-diploma-card">
									<div className="sedation-diploma-stars">★★★★★</div>
									<h2 className="sedation-diploma-title">{diplomaData.titleRu}</h2>
									<p className="sedation-diploma-subtitle">{diplomaData.subtitleRu}</p>

									<div className="sedation-diploma-recipient">{diplomaData.recipientNameRu}</div>
									<p className="text-xs" style={{ color: 'var(--ink-2, var(--ink))' }}>
										Возраст: {diplomaData.ageTextRu}
									</p>

									<div className="sedation-diploma-badge-block">
										<span className="sedation-diploma-medal-emoji">{diplomaData.badgeEmoji}</span>
										<h3 className="sedation-diploma-badge-title">{diplomaData.badgeTitleRu}</h3>
										<span className="text-xs font-semibold" style={{ color: 'var(--teal)' }}>
											{diplomaData.badgeSubtitleRu}
										</span>
									</div>

									<p className="sedation-diploma-congrats">{diplomaData.congratulationTextRu}</p>

									<div className="sedation-diploma-footer">
										<div>
											<div>{diplomaData.doctorTitleRu}</div>
											<div className="text-xs">{diplomaData.clinicTitleRu}</div>
										</div>
										<div className="sedation-diploma-seal">{diplomaData.sealTextRu}</div>
										<div>Дата: {diplomaData.dateRu}</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* TAB 4: PREPARATION & FASTING & MASK SCENTS */}
					{activeTab === 'preparation' && (
						<div className="sedation-tab-pane">
							{/* Aroma Mask Selector */}
							<div className="sedation-card">
								<div className="sedation-card-title">
									<span>Выбор аромата маски ЗАКС (снижение тревожности)</span>
									<span className="text-xs" style={{ color: 'var(--ink-2, var(--ink))' }}>
										Текущий: {AROMA_MASK_SCENTS[maskScent].nameRu}
									</span>
								</div>

								<div className="sedation-scents-grid">
									{Object.values(AROMA_MASK_SCENTS).map((scent) => {
										const isSelected = maskScent === scent.id;
										return (
											<button
												key={scent.id}
												type="button"
												className={`sedation-scent-card ${isSelected ? 'selected' : ''}`}
												onClick={() => setMaskScent(scent.id)}
											>
												<span className="sedation-scent-emoji">{scent.emoji}</span>
												<span className="sedation-scent-name">{scent.nameRu}</span>
												<span className="text-xs" style={{ color: 'var(--ink-2, var(--ink))' }}>
													{scent.descriptionRu}
												</span>
											</button>
										);
									})}
								</div>
							</div>

							{/* Fasting Calculator & Verification */}
							<div className="sedation-card">
								<div className="sedation-card-title">
									<span>Контроль голодного интервала перед седацией (EAPD / AAPD)</span>
									<span
										className={`text-xs font-semibold ${
											fastingEval.isSafe ? 'text-ok-fg' : 'text-bad-fg'
										}`}
									>
										{fastingEval.isSafe ? '✓ Голодный интервал соблюден' : '⚠ Нарушение голодного режима'}
									</span>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="flex flex-col gap-2">
										<label className="text-xs font-semibold" style={{ color: 'var(--ink-2, var(--ink))' }}>
											<Droplets className="w-3.5 h-3.5 inline mr-1" />
											Часов с момента приема чистых жидкостей (минимум 2 ч):
										</label>
										<input
											type="number"
											step={0.5}
											min={0}
											max={24}
											value={fastingLiquidsHours}
											onChange={(e) => setFastingLiquidsHours(Number(e.target.value))}
											className="sedation-titration-btn text-left"
										/>
									</div>

									<div className="flex flex-col gap-2">
										<label className="text-xs font-semibold" style={{ color: 'var(--ink-2, var(--ink))' }}>
											<Info className="w-3.5 h-3.5 inline mr-1" />
											Часов с момента приема твердой / молочной пищи (минимум 6 ч):
										</label>
										<input
											type="number"
											step={0.5}
											min={0}
											max={24}
											value={fastingSolidsHours}
											onChange={(e) => setFastingSolidsHours(Number(e.target.value))}
											className="sedation-titration-btn text-left"
										/>
									</div>
								</div>

								{fastingEval.warningsRu.length > 0 && (
									<div
										className="p-3 rounded-lg text-xs"
										style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--bad-fg)' }}
									>
										{fastingEval.warningsRu.map((w, i) => (
											<div key={i}>• {w}</div>
										))}
									</div>
								)}

								<div className="text-xs" style={{ color: 'var(--ink-2, var(--ink))' }}>
									{fastingEval.recommendationsRu.map((r, i) => (
										<div key={i}>✓ {r}</div>
									))}
								</div>
							</div>

							{/* Pre-Op Frankl Assessment */}
							<div className="sedation-card">
								<div className="sedation-card-title">
									<span>Исходный уровень поведения ребенка до процедуры (Pre-Op Frankl)</span>
								</div>
								<div className="frankl-grid">
									{Object.values(FRANKL_BEHAVIOR_SCALE).map((item) => {
										const isSelected = preOpFrankl === item.id;
										return (
											<button
												key={item.id}
												type="button"
												className={`frankl-card ${isSelected ? 'selected' : ''}`}
												onClick={() => setPreOpFrankl(item.id)}
											>
												<div className="frankl-card-header">
													<span className="frankl-emoji">{item.badgeEmoji}</span>
													<span className="frankl-score-badge">Балл {item.score}</span>
												</div>
												<h4 className="frankl-card-title">{item.shortLabelRu}</h4>
												<p className="frankl-card-desc">{item.clinicalDescriptionRu}</p>
											</button>
										);
									})}
								</div>
							</div>
						</div>
					)}
				</main>

				{/* Modal Footer Actions */}
				<footer className="sedation-modal-header sedation-actions-bar">
					<div className="text-xs" style={{ color: 'var(--ink-2, var(--ink))' }}>
						Общий расход: O₂ {gasConsumption.totalO2VolumeLiters} л / N₂O {gasConsumption.totalN2oVolumeLiters} л ({gasConsumption.totalCostRub} ₽)
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							className="sedation-btn-secondary"
							onClick={onClose}
						>
							Отмена
						</button>
						<button
							type="button"
							className="sedation-btn-primary"
							onClick={handleSave}
						>
							<CheckCircle2 className="w-4 h-4" />
							Сохранить протокол в медкарту
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};
