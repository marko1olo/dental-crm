import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
	X,
	Syringe,
	ShieldAlert,
	ShieldCheck,
	AlertTriangle,
	CheckCircle2,
	Copy,
	Heart,
	Activity,
	AlertOctagon,
	Clock,
	Play,
	Pause,
	RotateCcw,
	PhoneCall,
	FileText,
	Check,
	Flame,
	Info,
	ArrowRight,
	Stethoscope,
	User,
	Zap,
	HelpCircle
} from 'lucide-react';
import {
	AnestheticDrugId,
	ANESTHESIA_DRUG_CATALOG,
	EPINEPHRINE_CEILINGS_MG,
	AsaClassification,
	calculateAnesthesiaSafety,
	screenPatientContraindications,
	AnesthesiaCalculationResult,
	PatientAnesthesiaProfile
} from './anesthesiaSafetyEngine';
import {
	EmergencyScenarioId,
	EMERGENCY_PROTOCOLS,
	EmergencyProtocolDefinition,
	calculateAllEmergencyDosagesForWeight,
	formatEmergencyStopwatchTime,
	generateEmergencyForm043Act,
	generateEmergency112DispatchScript,
	ExecutedEmergencyStepLog
} from './emergencyProtocols';
import './anesthesia.css';

export interface AnesthesiaSafetyHubModalProps {
	isOpen: boolean;
	onClose: () => void;
	onApplyToDiary?: ((diaryText: string, calculation?: AnesthesiaCalculationResult) => void) | undefined;
	initialPatientName?: string | undefined;
	initialPatientWeightKg?: number | undefined;
	initialPatientAgeYears?: number | undefined;
	initialToothFdi?: string | number | undefined;
	initialSelectedDrug?: AnestheticDrugId | undefined;
	initialTab?: 'calculator' | 'emergency' | undefined;
	initialEmergencyScenario?: EmergencyScenarioId | undefined;
	clinicName?: string | undefined;
	clinicAddress?: string | undefined;
	cabinetNumber?: string | undefined;
	doctorFullName?: string | undefined;
}

export function AnesthesiaSafetyHubModal({
	isOpen,
	onClose,
	onApplyToDiary,
	initialPatientName = 'Иванов Иван Иванович',
	initialPatientWeightKg = 70,
	initialPatientAgeYears = 35,
	initialToothFdi = 46,
	initialSelectedDrug = 'articaine_4_epi_100k',
	initialTab = 'calculator',
	initialEmergencyScenario = 'anaphylaxis',
	clinicName = 'Стоматологическая клиника DENTE',
	clinicAddress = 'г. Москва, ул. Усачёва, д. 29',
	cabinetNumber = '1',
	doctorFullName = 'Д-р Волкова Е. С.'
}: AnesthesiaSafetyHubModalProps) {
	// Navigation State
	const [activeTab, setActiveTab] = useState<'calculator' | 'emergency'>(initialTab);

	// Calculator State
	const [selectedDrugId, setSelectedDrugId] = useState<AnestheticDrugId>(initialSelectedDrug);
	const [carpulesCount, setCarpulesCount] = useState<number>(1.0);
	const [patientWeightKg, setPatientWeightKg] = useState<number>(initialPatientWeightKg);
	const [patientAgeYears, setPatientAgeYears] = useState<number>(initialPatientAgeYears);
	const [asaStatus, setAsaStatus] = useState<AsaClassification>('asa_1');
	const [targetTooth, setTargetTooth] = useState<string | number>(initialToothFdi);
	const [aspirationConfirmed, setAspirationConfirmed] = useState<boolean>(true);

	// Somatic Risk Checklist State
	const [takesMaoInhibitors, setTakesMaoInhibitors] = useState<boolean>(false);
	const [takesTricyclicAntidepressants, setTakesTricyclicAntidepressants] = useState<boolean>(false);
	const [hasThyrotoxicosis, setHasThyrotoxicosis] = useState<boolean>(false);
	const [hasCardiacArrhythmia, setHasCardiacArrhythmia] = useState<boolean>(false);
	const [hasCardiovascularRisk, setHasCardiovascularRisk] = useState<boolean>(false);
	const [hasHypertension, setHasHypertension] = useState<boolean>(false);
	const [hasSulfiteAllergy, setHasSulfiteAllergy] = useState<boolean>(false);
	const [hasAsthma, setHasAsthma] = useState<boolean>(false);
	const [isPregnant, setIsPregnant] = useState<boolean>(false);
	const [hasLiverDisease, setHasLiverDisease] = useState<boolean>(false);

	// Emergency Protocols State
	const [activeEmergencyScenario, setActiveEmergencyScenario] = useState<EmergencyScenarioId>(initialEmergencyScenario);
	const [timerSeconds, setTimerSeconds] = useState<number>(0);
	const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
	const [completedStepNumbers, setCompletedStepNumbers] = useState<Record<number, ExecutedEmergencyStepLog>>({});
	const [show112ScriptModal, setShow112ScriptModal] = useState<boolean>(false);

	// Feedback toast / copied state
	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [copyNotificationText, setCopyNotificationText] = useState<string>('');

	// Timer ref
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Sync initial tab if prop changes
	useEffect(() => {
		if (isOpen) {
			setActiveTab(initialTab);
			if (initialEmergencyScenario) {
				setActiveEmergencyScenario(initialEmergencyScenario);
			}
		}
	}, [isOpen, initialTab, initialEmergencyScenario]);

	// Stopwatch ticker
	useEffect(() => {
		if (isTimerRunning) {
			timerRef.current = setInterval(() => {
				setTimerSeconds(prev => prev + 1);
			}, 1000);
		} else if (timerRef.current) {
			clearInterval(timerRef.current);
		}
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [isTimerRunning]);

	// Core Calculation
	const calcResult: AnesthesiaCalculationResult = useMemo(() => {
		return calculateAnesthesiaSafety({
			drugId: selectedDrugId,
			carpulesCount,
			patientWeightKg,
			patientAgeYears,
			asaStatus,
			takesMaoInhibitors,
			takesTricyclicAntidepressants,
			hasThyrotoxicosis,
			hasCardiacArrhythmia,
			hasCardiovascularRisk: hasCardiovascularRisk || hasHypertension || hasCardiacArrhythmia,
			hasHypertension,
			hasSulfiteAllergy,
			hasBronchialAsthma: hasAsthma,
			isPregnantOrLactating: isPregnant,
			hasSevereLiverDisease: hasLiverDisease,
			targetToothFdi: targetTooth,
			aspirationConfirmed
		});
	}, [
		selectedDrugId,
		carpulesCount,
		patientWeightKg,
		patientAgeYears,
		asaStatus,
		takesMaoInhibitors,
		takesTricyclicAntidepressants,
		hasThyrotoxicosis,
		hasCardiacArrhythmia,
		hasCardiovascularRisk,
		hasHypertension,
		hasSulfiteAllergy,
		hasAsthma,
		isPregnant,
		hasLiverDisease,
		targetTooth,
		aspirationConfirmed
	]);

	// Emergency Protocol Definition
	const emergencyProtocol: EmergencyProtocolDefinition = useMemo(() => {
		return EMERGENCY_PROTOCOLS[activeEmergencyScenario] || EMERGENCY_PROTOCOLS.anaphylaxis;
	}, [activeEmergencyScenario]);

	// Weight-calculated emergency doses
	const calculatedEmergencyDoses = useMemo(() => {
		return calculateAllEmergencyDosagesForWeight(activeEmergencyScenario, patientWeightKg, patientAgeYears);
	}, [activeEmergencyScenario, patientWeightKg, patientAgeYears]);

	// Handler to switch drug to recommended alternative
	const handleSwitchToRecommended = () => {
		if (calcResult.recommendedAlternativeId) {
			setSelectedDrugId(calcResult.recommendedAlternativeId);
		} else {
			setSelectedDrugId('mepivacaine_3_plain');
		}
	};

	// Copy Diary Handler
	const handleCopyText = (text: string, label: string) => {
		navigator.clipboard.writeText(text);
		setCopyNotificationText(label);
		setIsCopied(true);
		setTimeout(() => {
			setIsCopied(false);
			setCopyNotificationText('');
		}, 2000);
	};

	// Apply Calculation to Diary Handler
	const handleApplyCalculation = () => {
		if (onApplyToDiary) {
			onApplyToDiary(calcResult.soapDiaryText, calcResult);
		}
		onClose();
	};

	// Toggle emergency step checkbox
	const handleToggleEmergencyStep = (stepNumber: number, stepTitle: string) => {
		setCompletedStepNumbers(prev => {
			const next = { ...prev };
			if (next[stepNumber]) {
				delete next[stepNumber];
			} else {
				next[stepNumber] = {
					stepNumber,
					titleRu: stepTitle,
					timestampSeconds: timerSeconds,
					timeFormatted: formatEmergencyStopwatchTime(timerSeconds)
				};
			}
			return next;
		});
	};

	// Generate and Apply Emergency Act
	const handleApplyEmergencyAct = () => {
		const actText = generateEmergencyForm043Act({
			scenarioId: activeEmergencyScenario,
			patient: {
				fullName: initialPatientName,
				ageYears: patientAgeYears,
				weightKg: patientWeightKg,
				cardioRisk: hasCardiovascularRisk || hasHypertension,
				asthmaOrAllergy: hasAsthma || hasSulfiteAllergy
			},
			doctorFullName,
			clinicName,
			clinicAddress,
			cabinetNumber,
			startTimeIso: new Date(Date.now() - timerSeconds * 1000).toISOString(),
			initialBp: '80/50',
			finalBp: '120/80',
			initialHr: '125',
			finalHr: '78',
			initialSpo2: '91',
			finalSpo2: '98',
			executedSteps: Object.values(completedStepNumbers),
			smpBrigadeCalled: Boolean(completedStepNumbers[3] || activeEmergencyScenario === 'anaphylaxis' || activeEmergencyScenario === 'last_toxicity'),
			patientOutcome: 'transferred_to_smp'
		});

		handleCopyText(actText, 'Акт реанимации скопирован!');
		if (onApplyToDiary) {
			onApplyToDiary(actText, calcResult);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="anesthesia-modal-overlay">
			<div className="anesthesia-modal-container hub-container">
				{/* Modal Top Header */}
				<div className="anesthesia-modal-header hub-header">
					<div className="anesthesia-header-title">
						<div className="hub-logo-box">
							<Syringe size={22} className="hub-logo-icon" />
						</div>
						<div>
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
								<span className="hub-title-text">Центр безопасности анестезии & Экстренные протоколы</span>
								<span className="anesthesia-header-badge">Приказ МЗ РФ № 786н</span>
							</div>
							<div className="hub-subtitle-text">
								Фармакологический скрининг, калькулятор МРД карпул и пошаговые реанимационные алгоритмы
							</div>
						</div>
					</div>

					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<button
							type="button"
							onClick={onClose}
							className="anesthesia-btn hub-btn-close"
							title="Закрыть окно"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				{/* Primary Mode Tabs Bar */}
				<div className="hub-tabs-bar">
					<button
						type="button"
						className={`hub-tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
						onClick={() => setActiveTab('calculator')}
					>
						<Syringe size={18} />
						<span>1. Калькулятор карпул & Скрининг безопасности</span>
					</button>

					<button
						type="button"
						className={`hub-tab-btn emergency-tab ${activeTab === 'emergency' ? 'active' : ''}`}
						onClick={() => setActiveTab('emergency')}
					>
						<AlertOctagon size={18} />
						<span>2. Экстренные протоколы реанимации (МЗ РФ)</span>
						<span className="emergency-pulse-dot" />
					</button>
				</div>

				{/* Modal Body */}
				<div className="anesthesia-modal-body">
					{/* ========================================================================= */}
					{/* TAB 1: ANESTHESIA MRD & PHARMACOLOGICAL SAFETY CALCULATOR                 */}
					{/* ========================================================================= */}
					{activeTab === 'calculator' && (
						<div className="hub-tab-content">
							{/* Patient Vitals & Demographics Bar */}
							<div className="hub-card patient-vitals-card">
								<div className="card-section-title">
									<User size={16} />
									<span>Параметры пациента и соматический статус (ASA)</span>
								</div>

								<div className="patient-inputs-grid">
									{/* Weight Input */}
									<div className="input-group">
										<div className="input-label-row">
											<span className="input-label">Масса тела:</span>
											<span className="input-val-badge"><strong>{patientWeightKg} кг</strong></span>
										</div>
										<input
											type="range"
											min={10}
											max={150}
											step={1}
											value={patientWeightKg}
											onChange={e => setPatientWeightKg(parseInt(e.target.value) || 70)}
											className="hub-slider"
										/>
									</div>

									{/* Age Input */}
									<div className="input-group">
										<div className="input-label-row">
											<span className="input-label">Возраст:</span>
											<span className="input-val-badge">
												<strong>{patientAgeYears} лет</strong> ({calcResult.isPediatric ? 'Детский норматив' : calcResult.isGeriatric ? 'Пожилой (x0.8)' : 'Взрослый'})
											</span>
										</div>
										<input
											type="range"
											min={3}
											max={95}
											step={1}
											value={patientAgeYears}
											onChange={e => setPatientAgeYears(parseInt(e.target.value) || 35)}
											className="hub-slider"
										/>
									</div>

									{/* ASA Status */}
									<div className="input-group">
										<span className="input-label">Категория ASA:</span>
										<select
											value={asaStatus}
											onChange={e => setAsaStatus(e.target.value as AsaClassification)}
											className="hub-select"
										>
											<option value="asa_1">ASA I: Здоровый пациент (Лимит адреналина 0.20 мг)</option>
											<option value="asa_2">ASA II: Легкая патология (Лимит 0.20 мг)</option>
											<option value="asa_3">ASA III: Тяжелая патология (Кардиолимит 0.04 мг)</option>
											<option value="asa_4">ASA IV: Угроза жизни (Кардиолимит 0.04 мг / Адреналин-free)</option>
										</select>
									</div>

									{/* Tooth FDI */}
									<div className="input-group">
										<span className="input-label">Зуб (FDI):</span>
										<input
											type="text"
											value={targetTooth}
											onChange={e => setTargetTooth(e.target.value)}
											className="hub-text-input"
											placeholder="напр. 46, 16, 24"
										/>
									</div>
								</div>

								{/* Somatic Screening Checklist */}
								<div className="screening-checklist-container">
									<div className="screening-header">
										<AlertTriangle size={15} color="var(--warn-fg, #f59e0b)" />
										<span>Скрининг анамнеза, фармакотерапии и противопоказаний (СтАР / МЗ РФ):</span>
									</div>

									<div className="screening-chips-grid">
										<label className={`screening-chip ${takesMaoInhibitors ? 'checked danger' : ''}`}>
											<input
												type="checkbox"
												checked={takesMaoInhibitors}
												onChange={e => setTakesMaoInhibitors(e.target.checked)}
											/>
											<Zap size={14} />
											<span>Ингибиторы МАО (ИМАО)</span>
										</label>

										<label className={`screening-chip ${takesTricyclicAntidepressants ? 'checked danger' : ''}`}>
											<input
												type="checkbox"
												checked={takesTricyclicAntidepressants}
												onChange={e => setTakesTricyclicAntidepressants(e.target.checked)}
											/>
											<Zap size={14} />
											<span>Трициклические антидепрессанты (ТЦА)</span>
										</label>

										<label className={`screening-chip ${hasThyrotoxicosis ? 'checked danger' : ''}`}>
											<input
												type="checkbox"
												checked={hasThyrotoxicosis}
												onChange={e => setHasThyrotoxicosis(e.target.checked)}
											/>
											<Flame size={14} />
											<span>Тиреотоксикоз / Гипертиреоз</span>
										</label>

										<label className={`screening-chip ${hasCardiacArrhythmia ? 'checked danger' : ''}`}>
											<input
												type="checkbox"
												checked={hasCardiacArrhythmia}
												onChange={e => setHasCardiacArrhythmia(e.target.checked)}
											/>
											<Heart size={14} />
											<span>Аритмия / АВ-блокада / Тахикардия</span>
										</label>

										<label className={`screening-chip ${hasCardiovascularRisk ? 'checked warning' : ''}`}>
											<input
												type="checkbox"
												checked={hasCardiovascularRisk}
												onChange={e => setHasCardiovascularRisk(e.target.checked)}
											/>
											<Activity size={14} />
											<span>ИБС / Стенокардия / Гипертония</span>
										</label>

										<label className={`screening-chip ${hasSulfiteAllergy ? 'checked danger' : ''}`}>
											<input
												type="checkbox"
												checked={hasSulfiteAllergy}
												onChange={e => setHasSulfiteAllergy(e.target.checked)}
											/>
											<ShieldAlert size={14} />
											<span>Аллергия на сульфиты (E223)</span>
										</label>

										<label className={`screening-chip ${hasAsthma ? 'checked danger' : ''}`}>
											<input
												type="checkbox"
												checked={hasAsthma}
												onChange={e => setHasAsthma(e.target.checked)}
											/>
											<span>Бронхиальная астма (J45)</span>
										</label>

										<label className={`screening-chip ${isPregnant ? 'checked warning' : ''}`}>
											<input
												type="checkbox"
												checked={isPregnant}
												onChange={e => setIsPregnant(e.target.checked)}
											/>
											<span>Беременность / Лактация</span>
										</label>

										<label className={`screening-chip ${hasLiverDisease ? 'checked warning' : ''}`}>
											<input
												type="checkbox"
												checked={hasLiverDisease}
												onChange={e => setHasLiverDisease(e.target.checked)}
											/>
											<span>Печеночная недостаточность</span>
										</label>
									</div>
								</div>
							</div>

							{/* Drug Selection Cards Grid */}
							<div>
								<div className="section-label-row">
									<span className="section-label">Выберите препарат анестетика:</span>
									<span className="section-hint">Каталог Минздрава РФ / СтАР</span>
								</div>

								<div className="anesthesia-drugs-grid">
									{Object.values(ANESTHESIA_DRUG_CATALOG).map(drug => {
										const isSelected = selectedDrugId === drug.id;
										return (
											<div
												key={drug.id}
												className={`anesthesia-drug-card ${isSelected ? 'selected' : ''}`}
												onClick={() => setSelectedDrugId(drug.id)}
												role="button"
												tabIndex={0}
												onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedDrugId(drug.id); }}
											>
												<div className="drug-card-header">
													<span className="drug-card-title">{drug.tradeNamesRu[0]}</span>
													<span className={`drug-epi-pill ${drug.isAdrenalineFree ? 'no-epi' : 'has-epi'}`}>
														{drug.vasoconstrictorRatio === 'none' ? 'Без адреналина' : drug.vasoconstrictorRatio}
													</span>
												</div>
												<div className="drug-card-substance">{drug.activeSubstanceRu}</div>
												<div className="drug-card-footer-info">
													<span>Карпула: {drug.standardCarpuleVolumeMl} мл ({drug.mgActivePerCarpule} мг)</span>
													<span>МДД: {calcResult.isPediatric ? drug.maxDoseMgPerKgPediatric : drug.maxDoseMgPerKgAdult} мг/кг</span>
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* Carpules Stepper & Volume */}
							<div className="hub-card carpules-stepper-card">
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
									<div>
										<span style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
											Количество карпул к введению:
										</span>
										<span style={{ marginLeft: '0.5rem', fontSize: '1.125rem', fontWeight: 800, color: 'var(--brand-primary, var(--teal))' }}>
											{carpulesCount} шт. ({calcResult.injectedVolumeMl} мл)
										</span>
									</div>

									<div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
										{[0.5, 1.0, 1.5, 2.0, 3.0, 4.0].map(val => (
											<button
												key={val}
												type="button"
												className={`carpule-quick-btn ${carpulesCount === val ? 'active' : ''}`}
												onClick={() => setCarpulesCount(val)}
											>
												{val} к.
											</button>
										))}
									</div>
								</div>

								<input
									type="range"
									min={0.5}
									max={6.0}
									step={0.5}
									value={carpulesCount}
									onChange={e => setCarpulesCount(parseFloat(e.target.value) || 1.0)}
									className="hub-slider"
									style={{ marginTop: '0.75rem' }}
								/>
							</div>

							{/* Live Safety Speedometer & Meter */}
							<div className="anesthesia-safety-meter">
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<span style={{ fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
										<Activity size={16} />
										Шкала токсической и кардиоваскулярной безопасности:
									</span>
									<span style={{
										fontSize: '0.8125rem',
										fontWeight: 800,
										color: calcResult.safetyZone === 'safe' ? 'var(--ok-fg)'
											: calcResult.safetyZone === 'caution' ? 'var(--warn-fg, #84cc16)'
											: calcResult.safetyZone === 'warning' ? 'var(--warn-fg, #f59e0b)'
											: 'var(--bad-fg, #ef4444)'
									}}>
										{calcResult.safetyZone === 'safe' && 'БЕЗОПАСНО (ЗЕЛЕНАЯ ЗОНА)'}
										{calcResult.safetyZone === 'caution' && 'УМЕРЕННАЯ НАГРУЗКА (ЖЕЛТАЯ ЗОНА)'}
										{calcResult.safetyZone === 'warning' && 'ПРЕДЕЛ ДОЗЫ (ОРАНЖЕВАЯ ЗОНА)'}
										{calcResult.safetyZone === 'overdose_danger' && 'ОПАСНОСТЬ: ПРЕВЫШЕНИЕ МРД / ПРОТИВОПОКАЗАНИЕ!'}
									</span>
								</div>

								<div className="safety-meter-bar-container">
									<div
										className={`safety-meter-bar-fill ${calcResult.safetyZone}`}
										style={{ width: `${Math.min(100, Math.max(calcResult.percentOfMaxDose, calcResult.percentOfEpiMaxDose))}%` }}
									/>
								</div>

								{/* Metrics Grid */}
								<div className="anesthesia-metrics-grid">
									<div className="anesthesia-metric-box">
										<span className="metric-label">Действующее вещество</span>
										<span className="metric-value">{calcResult.injectedActiveMg} / {calcResult.maxSafeActiveMg} мг</span>
										<span style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>
											{calcResult.percentOfMaxDose}% от МРД ({calcResult.remainingSafeActiveMg} мг ост.)
										</span>
									</div>

									<div className="anesthesia-metric-box">
										<span className="metric-label">Эпинефрин (Адреналин)</span>
										<span className="metric-value">
											{calcResult.drug.isAdrenalineFree ? '0.000 мг (Free)' : `${calcResult.injectedEpinephrineMg.toFixed(3)} мг`}
										</span>
										<span style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>
											Лимит: {calcResult.maxSafeEpinephrineMg.toFixed(2)} мг ({calcResult.percentOfEpiMaxDose}%)
										</span>
									</div>

									<div className="anesthesia-metric-box">
										<span className="metric-label">Максимум карпул</span>
										<span className="metric-value">{calcResult.maxSafeCarpulesCount} карп.</span>
										<span style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>
											Введено: {carpulesCount} карп. ({calcResult.remainingSafeCarpulesCount} карп. ост.)
										</span>
									</div>

									<div className="anesthesia-metric-box">
										<span className="metric-label">Ограничивающий фактор</span>
										<span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink, #0f172a)' }}>
											{calcResult.limitingFactor}
										</span>
									</div>
								</div>
							</div>

							{/* Blocking Contraindications Alert Box */}
							{calcResult.blockingContraindications.length > 0 && (
								<div className="anesthesia-alert-box danger" style={{ flexDirection: 'column', gap: '0.5rem' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
										<ShieldAlert size={20} />
										<span>БЛОКИРУЮЩИЕ ПРОТИВОПОКАЗАНИЯ ДЛЯ ТЕКУЩЕГО ПРЕПАРАТА:</span>
									</div>
									<ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', lineHeight: 1.4 }}>
										{calcResult.blockingContraindications.map((reason, idx) => (
											<li key={idx}>{reason}</li>
										))}
									</ul>
									<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
										<button
											type="button"
											className="hub-btn-action-primary"
											onClick={handleSwitchToRecommended}
										>
											<ShieldCheck size={16} />
											Переключить на безопасный Мепивакаин 3% (Скандонест)
										</button>
									</div>
								</div>
							)}

							{/* Warnings Alert Box */}
							{calcResult.warnings.length > 0 && calcResult.blockingContraindications.length === 0 && (
								<div className="anesthesia-alert-box warning">
									<AlertTriangle size={18} />
									<div>
										{calcResult.warnings.map((w, idx) => (
											<div key={idx} style={{ marginBottom: '0.25rem' }}>{w}</div>
										))}
									</div>
								</div>
							)}

							{/* Aspiration Test Confirmation Checkbox */}
							<div className="hub-card aspiration-check-card">
								<label className="aspiration-check-label">
									<input
										type="checkbox"
										checked={aspirationConfirmed}
										onChange={e => setAspirationConfirmed(e.target.checked)}
									/>
									<ShieldCheck size={18} color={aspirationConfirmed ? 'var(--ok-fg)' : 'var(--muted, #64748b)'} />
									<span>
										<strong>Аспирационная проба отрицательна</strong> — кровь в карпуле отсутствует (проверка сосудистого русла перед введением полной дозы)
									</span>
								</label>
							</div>

							{/* Clinical Diary Snippet Box */}
							<div className="hub-card diary-card">
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
									<span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--muted, #64748b)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
										<FileText size={15} />
										Запись для Дневника амбулаторной карты (Форма № 043/у):
									</span>
									<button
										type="button"
										onClick={() => handleCopyText(calcResult.soapDiaryText, 'Запись скопирована!')}
										className="anesthesia-btn"
										style={{ minHeight: '32px', padding: '0.125rem 0.5rem', fontSize: '0.75rem' }}
									>
										{isCopied && copyNotificationText.includes('скопирована') ? <Check size={14} color="var(--ok-fg)" /> : <Copy size={14} />}
										{isCopied && copyNotificationText.includes('скопирована') ? copyNotificationText : 'Скопировать'}
									</button>
								</div>
								<div className="anesthesia-diary-box">
									{calcResult.soapDiaryText}
								</div>
							</div>

							{/* Tab Footer Actions */}
							<div className="hub-footer-actions">
								<button
									type="button"
									onClick={onClose}
									className="anesthesia-btn"
								>
									Отмена
								</button>
								<button
									type="button"
									onClick={handleApplyCalculation}
									disabled={calcResult.isBlocked}
									className={`anesthesia-btn ${calcResult.isBlocked ? 'disabled' : 'anesthesia-btn-primary'}`}
								>
									<CheckCircle2 size={16} />
									Применить протокол в карту (Форма 043/у)
								</button>
							</div>
						</div>
					)}

					{/* ========================================================================= */}
					{/* TAB 2: INTERACTIVE EMERGENCY RESUSCITATION TIMELINE (ORDERS 786n / 1144n)  */}
					{/* ========================================================================= */}
					{activeTab === 'emergency' && (
						<div className="hub-tab-content emergency-tab-content">
							{/* Emergency Header Banner with Stopwatch & S.O.S. */}
							<div className="emergency-header-banner" style={{ borderColor: emergencyProtocol.colorTheme.primary }}>
								<div className="emergency-header-left">
									<div className="emergency-title-box">
										<AlertOctagon size={24} color={emergencyProtocol.colorTheme.primary} />
										<div>
											<div className="emergency-title-text">{emergencyProtocol.titleRu}</div>
											<div className="emergency-statutory-text">{emergencyProtocol.statutoryOrderRu}</div>
										</div>
									</div>
								</div>

								{/* Stopwatch & Emergency Call */}
								<div className="emergency-header-right">
									{/* Stopwatch */}
									<div className="emergency-stopwatch-box">
										<div className="stopwatch-label">Таймер инцидента:</div>
										<div className="stopwatch-display">
											<Clock size={16} />
											<span>{formatEmergencyStopwatchTime(timerSeconds)}</span>
										</div>
										<div className="stopwatch-controls">
											<button
												type="button"
												className={`timer-ctrl-btn ${isTimerRunning ? 'pause' : 'play'}`}
												onClick={() => setIsTimerRunning(!isTimerRunning)}
												title={isTimerRunning ? 'Пауза' : 'Старт таймера'}
											>
												{isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
											</button>
											<button
												type="button"
												className="timer-ctrl-btn reset"
												onClick={() => { setIsTimerRunning(false); setTimerSeconds(0); setCompletedStepNumbers({}); }}
												title="Сбросить таймер"
											>
												<RotateCcw size={14} />
											</button>
										</div>
									</div>

									{/* 112 Dispatch S.O.S. Button */}
									<button
										type="button"
										className="hub-btn-sos-112"
										onClick={() => setShow112ScriptModal(true)}
									>
										<PhoneCall size={18} />
										<span>ШПАРГАЛКА 112 / 103</span>
									</button>
								</div>
							</div>

							{/* Scenario Selector Pills */}
							<div className="emergency-scenarios-pills-row">
								{Object.values(EMERGENCY_PROTOCOLS).map(scen => {
									const isActive = activeEmergencyScenario === scen.id;
									return (
										<button
											key={scen.id}
											type="button"
											className={`emergency-scenario-pill ${isActive ? 'active' : ''}`}
											onClick={() => {
												setActiveEmergencyScenario(scen.id);
												setCompletedStepNumbers({});
											}}
										>
											<span className="pill-dot" style={{ background: scen.colorTheme.primary }} />
											<span>{scen.shortTitleRu}</span>
										</button>
									);
								})}
							</div>

							{/* Golden Rule Banner */}
							<div className="emergency-golden-rule-box">
								<Info size={18} color={emergencyProtocol.colorTheme.primary} />
								<div className="golden-rule-text">
									{emergencyProtocol.immediateGoldenRuleRu}
								</div>
							</div>

							{/* Weight-Adjusted Exact Drug Dosages Banner */}
							<div className="hub-card emergency-doses-card">
								<div className="card-section-title">
									<Stethoscope size={16} />
									<span>Точный расчет дозировок неотложных средств для массы <strong>{patientWeightKg} кг</strong>:</span>
								</div>

								<div className="emergency-doses-grid">
									{Object.entries(calculatedEmergencyDoses).map(([drugName, doseInfo], idx) => (
										<div key={idx} className="emergency-dose-item">
											<span className="dose-drug-name">{drugName}</span>
											<span className="dose-val-main">{doseInfo.doseText} ({doseInfo.volumeText})</span>
											{doseInfo.noteRu && <span className="dose-val-sub">{doseInfo.noteRu}</span>}
										</div>
									))}
								</div>
							</div>

							{/* Interactive Step-by-Step Resuscitation Timeline */}
							<div className="emergency-timeline-container">
								<div className="timeline-header-row">
									<span className="timeline-header-title">Пошаговый протокол реанимационных действий (Чек-лист):</span>
									<span className="timeline-progress-badge">
										Выполнено: {Object.keys(completedStepNumbers).length} из {emergencyProtocol.steps.length} шагов
									</span>
								</div>

								<div className="timeline-steps-list">
									{emergencyProtocol.steps.map((step) => {
										const isDone = Boolean(completedStepNumbers[step.stepNumber]);
										const doneInfo = completedStepNumbers[step.stepNumber];

										return (
											<div
												key={step.stepNumber}
												className={`timeline-step-card ${isDone ? 'completed' : ''} ${step.isCriticalFirstAction ? 'critical' : ''}`}
											>
												<div className="step-card-header">
													<div className="step-number-badge">
														<span>Шаг {step.stepNumber}</span>
														<span className="step-timeframe">({step.timeframeRu})</span>
													</div>

													<div className="step-title-text">{step.titleRu}</div>

													<label className="step-checkbox-label">
														<input
															type="checkbox"
															checked={isDone}
															onChange={() => handleToggleEmergencyStep(step.stepNumber, step.titleRu)}
														/>
														<span className="step-checkbox-custom">
															{isDone ? <Check size={14} /> : null}
														</span>
														<span>{isDone ? `Выполнено [${doneInfo?.timeFormatted}]` : 'Отметить'}</span>
													</label>
												</div>

												<div className="step-body-description">
													{step.descriptionRu}
												</div>

												{step.drugDetail && (
													<div className="step-drug-highlight-box">
														<div className="drug-highlight-header">
															<Syringe size={14} />
															<strong>{step.drugDetail.drugNameRu}</strong> — {step.drugDetail.administrationRouteRu}
														</div>
														<div className="drug-highlight-doses">
															<span>Взрослая доза: <strong>{step.drugDetail.standardAdultDoseRu}</strong></span>
															<span>Детская доза: <strong>{step.drugDetail.standardPediatricDoseRu}</strong></span>
														</div>
													</div>
												)}

												{step.criticalWarningRu && (
													<div className="step-critical-warning">
														<AlertTriangle size={14} />
														<span>{step.criticalWarningRu}</span>
													</div>
												)}

												<div className="step-checklist-items">
													{step.checklistItemsRu.map((item, cIdx) => (
														<div key={cIdx} className="step-sub-item">
															<ArrowRight size={12} />
															<span>{item}</span>
														</div>
													))}
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* Required Kit Items */}
							<div className="hub-card kit-items-card">
								<div className="card-section-title">
									<ShieldCheck size={16} />
									<span>Необходимое оснащение по укладке Приказа МЗ РФ № 786н:</span>
								</div>
								<div className="kit-items-grid">
									{emergencyProtocol.kitItemsRequiredRu.map((kitItem, idx) => (
										<div key={idx} className="kit-item-row">
											<CheckCircle2 size={14} color="var(--ok-fg)" />
											<span>{kitItem}</span>
										</div>
									))}
								</div>
							</div>

							{/* Emergency Tab Footer Actions */}
							<div className="hub-footer-actions">
								<button
									type="button"
									onClick={() => setShow112ScriptModal(true)}
									className="anesthesia-btn"
								>
									<PhoneCall size={16} />
									Текст для диспетчера 112
								</button>

								<button
									type="button"
									onClick={handleApplyEmergencyAct}
									className="anesthesia-btn anesthesia-btn-primary"
								>
									<FileText size={16} />
									Сформировать протокол реанимации (Форма 043/у)
								</button>
							</div>
						</div>
					)}
				</div>

				{/* 112 Dispatcher Script Submodal / Drawer */}
				{show112ScriptModal && (
					<div className="hub-submodal-overlay">
						<div className="hub-submodal-container">
							<div className="hub-submodal-header">
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
									<PhoneCall size={18} color="var(--bad, #ef4444)" />
									<span>Шпаргалка звонка в Службу 112 / 103 (Скорая помощь)</span>
								</div>
								<button
									type="button"
									onClick={() => setShow112ScriptModal(false)}
									className="anesthesia-btn"
									style={{ minHeight: '32px', minWidth: '32px', padding: '0.25rem', border: 'none' }}
								>
									<X size={16} />
								</button>
							</div>

							<div className="hub-submodal-body">
								<div className="dispatcher-script-box">
									<pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.8125rem', lineHeight: 1.5 }}>
										{generateEmergency112DispatchScript({
											scenarioId: activeEmergencyScenario,
											clinicName,
											clinicAddress,
											cabinetNumber,
											patientAgeYears,
											currentBp: '80/50',
											currentHr: '120',
											currentSpo2: '92',
											adrenalineGivenMg: activeEmergencyScenario === 'anaphylaxis' ? 0.5 : undefined
										})}
									</pre>
								</div>
							</div>

							<div className="hub-submodal-footer">
								<button
									type="button"
									onClick={() => {
										const script = generateEmergency112DispatchScript({
											scenarioId: activeEmergencyScenario,
											clinicName,
											clinicAddress,
											cabinetNumber,
											patientAgeYears,
											currentBp: '80/50',
											currentHr: '120',
											currentSpo2: '92',
											adrenalineGivenMg: activeEmergencyScenario === 'anaphylaxis' ? 0.5 : undefined
										});
										handleCopyText(script, 'Текст для 112 скопирован!');
									}}
									className="anesthesia-btn anesthesia-btn-primary"
								>
									<Copy size={14} />
									Скопировать шпаргалку
								</button>
								<button
									type="button"
									onClick={() => setShow112ScriptModal(false)}
									className="anesthesia-btn"
								>
									Закрыть
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
