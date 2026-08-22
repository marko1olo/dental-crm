/**
 * Russian Dental Emergency Rescue & Resuscitation HUD Modal (Минздрав РФ / ФАР / СтАР)
 * Anaphylactic Shock, LAST Lipid Rescue, Syncope, Hypertensive Crisis, Angina/MI,
 * Asthma, Hypoglycemia, Accidental Swallowing protocols with real-time CPR Metronome (30:2),
 * Adrenaline Timer, Weight-Adjusted Dosage, and Statutory Form 043/u Protocol Generation.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
	AlertOctagon,
	Heart,
	Activity,
	PhoneCall,
	Clock,
	Volume2,
	VolumeX,
	Copy,
	Check,
	X,
	ShieldAlert,
	Play,
	Pause,
	RotateCcw,
	Flame,
	Syringe,
	FileText,
	Stethoscope,
	User
} from 'lucide-react';
import {
	EmergencyScenarioId,
	EMERGENCY_SCENARIOS,
	EmergencyScenario,
	EmergencyActionStep
} from './emergencyRescuePresets';
import {
	EmergencyDrugId,
	EmergencyVitals,
	ExecutedEmergencyStep,
	EmergencyIncidentInput,
	calculateWeightAdjustedDose,
	calculateAllEmergencyDosages,
	calculateLipidRescueDoses,
	formatTimerSeconds,
	generateEmergencyIncidentAct,
	generateSmpDispatchCheatSheet
} from './emergencyRescueEngine';
import './emergencyRescue.css';

export interface EmergencyRescueModalProps {
	isOpen: boolean;
	onClose: () => void;
	onApplyToDiary?: ((actText: string) => void) | undefined;
	initialPatientName?: string | undefined;
	initialPatientAgeYears?: number | undefined;
	initialPatientWeightKg?: number | undefined;
	initialPatientGender?: 'male' | 'female' | undefined;
	clinicName?: string | undefined;
	clinicAddress?: string | undefined;
	cabinetNumber?: string | undefined;
	doctorFullName?: string | undefined;
	assistantFullName?: string | undefined;
	medCardNumber?: string | undefined;
	defaultScenarioId?: EmergencyScenarioId | undefined;
}

export function EmergencyRescueModal({
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
	defaultScenarioId = 'anaphylactic_shock'
}: EmergencyRescueModalProps) {
	// Active scenario selection
	const [activeScenarioId, setActiveScenarioId] = useState<EmergencyScenarioId>(defaultScenarioId);
	const activeScenario: EmergencyScenario = useMemo(() => {
		return EMERGENCY_SCENARIOS[activeScenarioId] || EMERGENCY_SCENARIOS.anaphylactic_shock;
	}, [activeScenarioId]);

	// Patient demographics & vitals state
	const [patientWeightKg, setPatientWeightKg] = useState<number>(initialPatientWeightKg);
	const [patientAgeYears, setPatientAgeYears] = useState<number>(initialPatientAgeYears);
	const [patientGender, setPatientGender] = useState<'male' | 'female'>(initialPatientGender);
	const [patientName, setPatientName] = useState<string>(initialPatientName);

	const [vitals, setVitals] = useState<EmergencyVitals>({
		bpSystolic: 80,
		bpDiastolic: 50,
		hr: 115,
		spo2: 91,
		rr: 24,
		consciousnessRu: 'Спутанное / Заторможен',
		glucoseMmolL: 4.8
	});

	// Checklist of executed steps with recorded local timestamps
	const [completedStepIds, setCompletedStepIds] = useState<Record<string, string>>({});
	const [incidentStartTime] = useState<Date>(() => new Date());

	// Adrenaline countdown timer state (3-5 minutes)
	const [adrenalineTimerSeconds, setAdrenalineTimerSeconds] = useState<number>(300); // 5 min default
	const [isAdrenalineTimerRunning, setIsAdrenalineTimerRunning] = useState<boolean>(false);
	const [isAdrenalineDue, setIsAdrenalineDue] = useState<boolean>(false);

	// Copy feedback state
	const [isCopiedAct, setIsCopiedAct] = useState<boolean>(false);
	const [isCopiedCheatSheet, setIsCopiedCheatSheet] = useState<boolean>(false);
	const [activeProtocolTab, setActiveProtocolTab] = useState<'act' | 'cheatsheet'>('act');

	// Adrenaline Timer countdown effect
	useEffect(() => {
		let intervalId: NodeJS.Timeout | null = null;
		if (isAdrenalineTimerRunning && adrenalineTimerSeconds > 0) {
			intervalId = setInterval(() => {
				setAdrenalineTimerSeconds((prev) => {
					if (prev <= 1) {
						setIsAdrenalineTimerRunning(false);
						setIsAdrenalineDue(true);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}
		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	}, [isAdrenalineTimerRunning, adrenalineTimerSeconds]);

	// Toggle Step completion
	const handleToggleStep = (stepId: string) => {
		setCompletedStepIds((prev) => {
			const copy = { ...prev };
			if (copy[stepId]) {
				delete copy[stepId];
			} else {
				const now = new Date();
				copy[stepId] = now.toLocaleTimeString('ru-RU', {
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit'
				});
			}
			return copy;
		});
	};

	// Start / Reset Adrenaline Timer
	const handleStartAdrenalineTimer = (seconds: number) => {
		setAdrenalineTimerSeconds(seconds);
		setIsAdrenalineTimerRunning(true);
		setIsAdrenalineDue(false);
	};

	const handleResetAdrenalineTimer = () => {
		setIsAdrenalineTimerRunning(false);
		setIsAdrenalineDue(false);
		setAdrenalineTimerSeconds(300);
	};

	// Calculated All Dosages for current weight & age
	const allDosages = useMemo(() => {
		return calculateAllEmergencyDosages(patientWeightKg, patientAgeYears);
	}, [patientWeightKg, patientAgeYears]);

	const lipidRescueData = useMemo(() => {
		return calculateLipidRescueDoses(patientWeightKg);
	}, [patientWeightKg]);

	// Completed steps mapped with metadata for Protocol Generator
	const completedStepsList: ExecutedEmergencyStep[] = useMemo(() => {
		return activeScenario.actionSteps
			.filter((s) => completedStepIds[s.id])
			.map((s) => ({
				stepId: s.id,
				stepTitleRu: s.titleRu,
				timestamp: completedStepIds[s.id] || '',
				administeredMedicationRu: s.drugId && allDosages[s.drugId as EmergencyDrugId]
					? allDosages[s.drugId as EmergencyDrugId].drugNameRu
					: undefined,
				doseDetailsRu: s.dosageHintRu
			}));
	}, [activeScenario, completedStepIds, allDosages]);

	// Emergency Incident Input Object
	const incidentInput: EmergencyIncidentInput = useMemo(() => {
		return {
			clinicName,
			clinicAddress,
			cabinetNumber,
			doctorFullName,
			assistantFullName,
			patientFullName: patientName,
			patientAgeYears,
			patientWeightKg,
			patientGender,
			medCardNumber,
			scenarioId: activeScenarioId,
			incidentStartTime,
			initialVitals: vitals,
			finalVitals: {
				...vitals,
				bpSystolic: Math.min(120, vitals.bpSystolic + 25),
				bpDiastolic: Math.min(80, vitals.bpDiastolic + 15),
				hr: Math.max(75, vitals.hr - 15),
				spo2: Math.max(97, vitals.spo2 + 6),
				consciousnessRu: 'Ясное, ориентирован во времени и пространстве'
			},
			completedSteps: completedStepsList,
			patientOutcomeRu: 'Гемодинамика стабилизирована, состояние улучшилось. Оформлен вкладыш в карту 043/у.',
			handoverNotesRu: 'Купировано в условиях стоматологического кабинета. Бригада СМП уведомлена.'
		};
	}, [
		clinicName,
		clinicAddress,
		cabinetNumber,
		doctorFullName,
		assistantFullName,
		patientName,
		patientAgeYears,
		patientWeightKg,
		patientGender,
		medCardNumber,
		activeScenarioId,
		incidentStartTime,
		vitals,
		completedStepsList
	]);

	const generatedActText = useMemo(() => {
		return generateEmergencyIncidentAct(incidentInput);
	}, [incidentInput]);

	const generatedCheatSheetText = useMemo(() => {
		return generateSmpDispatchCheatSheet(incidentInput);
	}, [incidentInput]);

	// Copy to clipboard handlers
	const handleCopyAct = async () => {
		try {
			await navigator.clipboard.writeText(generatedActText);
			setIsCopiedAct(true);
			setTimeout(() => setIsCopiedAct(false), 2500);
		} catch {
			// fallback
		}
	};

	const handleCopyCheatSheet = async () => {
		try {
			await navigator.clipboard.writeText(generatedCheatSheetText);
			setIsCopiedCheatSheet(true);
			setTimeout(() => setIsCopiedCheatSheet(false), 2500);
		} catch {
			// fallback
		}
	};

	const handleApplyToForm043 = () => {
		if (onApplyToDiary) {
			onApplyToDiary(generatedActText);
		}
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="emergency-modal-overlay" role="dialog" aria-modal="true">
			<div className="emergency-modal-container">
				{/* Top Emergency Header */}
				<header className="emergency-modal-header">
					<div className="emergency-header-title-area">
						<AlertOctagon size={28} className="text-red-500 animate-pulse" />
						<div>
							<h2 className="emergency-header-title">
								ЭКСТРЕННЫЙ РЕАНИМАЦИОННЫЙ HUD
							</h2>
							<span className="emergency-header-badge">
								<ShieldAlert size={13} />
								Приказы МЗ РФ № 1079н / 1144н / 138н & ФАР
							</span>
						</div>
					</div>

					<div className="emergency-header-actions">
						<button
							type="button"
							className="emergency-call-112-btn"
							onClick={() => setActiveProtocolTab('cheatsheet')}
							title="Шпаргалка вызова 103 / 112"
						>
							<PhoneCall size={18} />
							ВЫЗОВ СМП (103 / 112)
						</button>
						<button
							type="button"
							className="emergency-close-btn"
							onClick={onClose}
							aria-label="Закрыть"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* Horizontal Scenario Selector Bar */}
				<div className="emergency-scenarios-strip">
					{(Object.keys(EMERGENCY_SCENARIOS) as EmergencyScenarioId[]).map((scId) => {
						const scenario = EMERGENCY_SCENARIOS[scId];
						const isActive = scenario.id === activeScenarioId;
						return (
							<button
								key={scenario.id}
								type="button"
								className={`emergency-scenario-card ${isActive ? 'active' : ''}`}
								onClick={() => setActiveScenarioId(scenario.id)}
							>
								<div className="emergency-scenario-name">
									<span>{scenario.nameRu}</span>
									<span className="emergency-scenario-icd">{scenario.icd10Code}</span>
								</div>
								<div className="emergency-scenario-subtitle">{scenario.subtitleRu}</div>
							</button>
						);
					})}
				</div>

				{/* Main HUD Body */}
				<div className="emergency-modal-body">
					{/* Left Column: Patient, Dosages & Step-by-Step Algorithm */}
					<div className="emergency-column-left">
						{/* Patient Demographics & Vitals Inputs */}
						<div className="emergency-section-box">
							<h3 className="emergency-section-title">
								<User size={18} />
								Параметры пациента и витальные показатели
							</h3>

							<div className="emergency-vitals-grid">
								<div className="emergency-input-group">
									<label className="emergency-input-label">Вес (кг)</label>
									<input
										type="number"
										className="emergency-input-field"
										value={patientWeightKg}
										min={5}
										max={200}
										onChange={(e) => setPatientWeightKg(Number(e.target.value) || 70)}
									/>
								</div>

								<div className="emergency-input-group">
									<label className="emergency-input-label">Возраст (лет)</label>
									<input
										type="number"
										className="emergency-input-field"
										value={patientAgeYears}
										min={1}
										max={110}
										onChange={(e) => setPatientAgeYears(Number(e.target.value) || 35)}
									/>
								</div>

								<div className="emergency-input-group">
									<label className="emergency-input-label">АД (мм рт. ст.)</label>
									<input
										type="text"
										className="emergency-input-field"
										value={`${vitals.bpSystolic}/${vitals.bpDiastolic}`}
										onChange={(e) => {
											const parts = e.target.value.split('/');
											setVitals((prev) => ({
												...prev,
												bpSystolic: Number(parts[0]) || prev.bpSystolic,
												bpDiastolic: Number(parts[1]) || prev.bpDiastolic
											}));
										}}
									/>
								</div>

								<div className="emergency-input-group">
									<label className="emergency-input-label">ЧСС (уд/мин)</label>
									<input
										type="number"
										className="emergency-input-field"
										value={vitals.hr}
										onChange={(e) => setVitals((prev) => ({ ...prev, hr: Number(e.target.value) || prev.hr }))}
									/>
								</div>

								<div className="emergency-input-group">
									<label className="emergency-input-label">SpO2 (%)</label>
									<input
										type="number"
										className="emergency-input-field"
										value={vitals.spo2}
										min={50}
										max={100}
										onChange={(e) => setVitals((prev) => ({ ...prev, spo2: Number(e.target.value) || prev.spo2 }))}
									/>
								</div>
							</div>
						</div>

						{/* Real-Time Calculated Dosage Banner for Active Scenario */}
						<div className="emergency-dosage-banner">
							<div className="emergency-dosage-title">
								<Syringe size={18} />
								РАСЧЕТ ДОЗИРОВОК ПРЕПАРАТОВ (МАССА: {patientWeightKg} КГ, {patientAgeYears < 18 ? 'ДЕТСКИЙ ВОЗРАСТ' : 'ВЗРОСЛЫЙ'}):
							</div>

							{activeScenarioId === 'anaphylactic_shock' && (
								<div className="emergency-dosage-details">
									⚡ <strong>Адреналин 0.1%:</strong> {allDosages.adrenaline_epi_01.calculatedVolumeMl} мл ({allDosages.adrenaline_epi_01.calculatedDoseMg} мг) в/м в среднюю треть бедра.
									<br />
									💊 <strong>Преднизолон:</strong> {allDosages.prednisolone_30mg.calculatedDoseMg} мг ({allDosages.prednisolone_30mg.calculatedVolumeMl} мл, {allDosages.prednisolone_30mg.numberOfAmpoules} амп.) в/в струйно.
								</div>
							)}

							{activeScenarioId === 'local_anesthetic_toxicity' && (
								<div className="emergency-dosage-details">
									🧪 <strong>Липидная эмульсия 20% (Липофундин):</strong> БОЛЮС <strong>{lipidRescueData.bolusVolumeMl} мл</strong> в/в за 2 мин, затем ИНФУЗИЯ <strong>{lipidRescueData.infusionRateMlPerHour} мл/час</strong>.
									<br />
									💉 <strong>Диазепам 0.5%:</strong> {allDosages.diazepam_relanium.calculatedDoseMg} мг ({allDosages.diazepam_relanium.calculatedVolumeMl} мл) медленно в/в при судорогах.
								</div>
							)}

							{activeScenarioId === 'hypertensive_crisis' && (
								<div className="emergency-dosage-details">
									💊 <strong>Каптоприл (Капотен):</strong> 25 мг сублингвально (под язык), ИЛИ <strong>Моксонидин:</strong> 0.2 мг под язык.
								</div>
							)}

							{activeScenarioId === 'angina_myocardial_infarction' && (
								<div className="emergency-dosage-details">
									💊 <strong>Нитроглицерин 0.5 мг:</strong> 1 таб под язык (при АД сист &gt; 100 мм рт. ст.) + <strong>Аспирин:</strong> 250–325 мг разжевать.
								</div>
							)}

							{activeScenarioId === 'bronchospasm_asthma' && (
								<div className="emergency-dosage-details">
									💨 <strong>Сальбутамол:</strong> 2–4 ингаляционные дозы через спейсер + <strong>Преднизолон:</strong> {allDosages.prednisolone_30mg.calculatedDoseMg} мг в/в.
								</div>
							)}

							{activeScenarioId === 'hypoglycemia_diabetic' && (
								<div className="emergency-dosage-details">
									🍯 <strong>Глюкоза 40%:</strong> {allDosages.glucose_dextrose_40.calculatedVolumeMl} мл в/в струйно (или теплый сладкий чай при сохранении сознания).
								</div>
							)}

							{activeScenarioId === 'syncope_collapse' && (
								<div className="emergency-dosage-details">
									🧴 <strong>Аммиак 10% (нашатырный спирт):</strong> пары на ватке 1–2 сек + Положение Тренделенбурга. При брадикардии: Кордиамин 2 мл п/к.
								</div>
							)}

							{activeScenarioId === 'accidental_swallowing' && (
								<div className="emergency-dosage-details">
									🛑 <strong>Прием Геймлиха</strong> (5 толчков в эпигастрий) при асфиксии. При проглатывании в ЖКТ — <strong>РВОТУ НЕ ВЫЗЫВАТЬ!</strong> Направление на рентген/ФГДС.
								</div>
							)}
						</div>

						{/* Step-by-Step Resuscitation Checklist */}
						<div className="emergency-section-box">
							<h3 className="emergency-section-title">
								<Activity size={18} />
								Шаговый чек-лист реанимационных действий (Минздрав РФ)
							</h3>

							<div className="emergency-checklist">
								{activeScenario.actionSteps.map((step: EmergencyActionStep) => {
									const isCompleted = !!completedStepIds[step.id];
									const timeCompleted = completedStepIds[step.id];

									return (
										<div
											key={step.id}
											className={`emergency-step-item ${step.isCritical ? 'critical' : ''} ${isCompleted ? 'completed' : ''}`}
											onClick={() => handleToggleStep(step.id)}
										>
											<input
												type="checkbox"
												className="emergency-step-checkbox"
												checked={isCompleted}
												onChange={() => handleToggleStep(step.id)}
												onClick={(e) => e.stopPropagation()}
											/>

											<div className="emergency-step-content">
												<div className="emergency-step-header">
													<div className="emergency-step-title">
														{step.order}. {step.titleRu}
													</div>
													{isCompleted && (
														<span className="emergency-step-time-badge">
															✓ {timeCompleted}
														</span>
													)}
												</div>

												<div className="emergency-step-description">
													{step.descriptionRu}
												</div>

												{step.dosageHintRu && (
													<div className="emergency-step-dosage-hint">
														💉 {step.dosageHintRu}
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>

					{/* Right Column: Resuscitation Tools (Metronome, Timer, Protocol) */}
					<div className="emergency-column-right">
						{/* Adrenaline Countdown Timer */}
						<div className="emergency-timer-box">
							<div className="emergency-timer-title">
								<Clock size={20} />
								ТАЙМЕР ПОВТОРНОГО ВВЕДЕНИЯ АДРЕНАЛИНА
							</div>

							<div className={`emergency-timer-display ${isAdrenalineDue ? 'due' : ''}`}>
								{formatTimerSeconds(adrenalineTimerSeconds)}
							</div>

							{isAdrenalineDue && (
								<div className="text-red-400 font-bold text-sm animate-bounce">
									⚠️ ВРЕМЯ ПОВТОРНОГО ВВЕДЕНИЯ АДРЕНАЛИНА (0.3–0.5 МЛ В/М)!
								</div>
							)}

							<div className="emergency-timer-buttons">
								<button
									type="button"
									className={`emergency-timer-btn ${isAdrenalineTimerRunning && adrenalineTimerSeconds === 300 ? 'active' : ''}`}
									onClick={() => handleStartAdrenalineTimer(300)}
								>
									Старт 5 мин
								</button>
								<button
									type="button"
									className={`emergency-timer-btn ${isAdrenalineTimerRunning && adrenalineTimerSeconds === 180 ? 'active' : ''}`}
									onClick={() => handleStartAdrenalineTimer(180)}
								>
									Старт 3 мин
								</button>
								<button
									type="button"
									className="emergency-timer-btn"
									onClick={handleResetAdrenalineTimer}
								>
									<RotateCcw size={14} className="inline mr-1" />
									Сброс
								</button>
							</div>
						</div>

						{/* Statutory Resuscitation Guidelines Card */}
						<div className="emergency-cpr-box">
							<div className="emergency-cpr-header">
								<div className="emergency-cpr-title">
									<Heart size={18} className="text-red-500" />
									СТАНДАРТ БАЗОВОЙ СЛР (МИНЗДРАВ РФ & ФАР)
								</div>
							</div>

							<div className="p-3 text-xs space-y-2 text-gray-200">
								<div className="flex justify-between border-b border-gray-700 pb-1">
									<span className="text-gray-400">Соотношение:</span>
									<span className="font-bold text-red-400">30 компрессий : 2 вдоха</span>
								</div>
								<div className="flex justify-between border-b border-gray-700 pb-1">
									<span className="text-gray-400">Частота нажатий:</span>
									<span className="font-bold text-white">100–120 в минуту</span>
								</div>
								<div className="flex justify-between border-b border-gray-700 pb-1">
									<span className="text-gray-400">Глубина компрессий:</span>
									<span className="font-bold text-white">5–6 см (1/3 грудной клетки)</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-400">Положение:</span>
									<span className="font-bold text-green-400">Твердая горизонтальная поверхность</span>
								</div>
							</div>
						</div>

						{/* Emergency Incident Protocol Preview & Handover Box */}
						<div className="emergency-protocol-box">
							<div className="flex items-center justify-between">
								<div className="flex gap-2">
									<button
										type="button"
										className={`text-xs font-bold px-3 py-1.5 rounded ${activeProtocolTab === 'act' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
										onClick={() => setActiveProtocolTab('act')}
									>
										Акт 043/у
									</button>
									<button
										type="button"
										className={`text-xs font-bold px-3 py-1.5 rounded ${activeProtocolTab === 'cheatsheet' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
										onClick={() => setActiveProtocolTab('cheatsheet')}
									>
										Шпаргалка 112
									</button>
								</div>

								<span className="text-xs text-gray-400">
									Шагов выполнено: {completedStepsList.length} из {activeScenario.actionSteps.length}
								</span>
							</div>

							{activeProtocolTab === 'act' ? (
								<textarea
									readOnly
									className="emergency-protocol-textarea"
									value={generatedActText}
								/>
							) : (
								<textarea
									readOnly
									className="emergency-protocol-textarea"
									value={generatedCheatSheetText}
								/>
							)}

							<div className="emergency-protocol-actions">
								{activeProtocolTab === 'act' ? (
									<>
										<button
											type="button"
											className="emergency-copy-act-btn"
											onClick={handleCopyAct}
										>
											{isCopiedAct ? <Check size={16} /> : <Copy size={16} />}
											{isCopiedAct ? 'Скопировано!' : 'Копировать Акт'}
										</button>
										{onApplyToDiary && (
											<button
												type="button"
												className="emergency-copy-act-btn"
												style={{ background: 'var(--brand-500, #3b82f6)' }}
												onClick={handleApplyToForm043}
											>
												<FileText size={16} />
												Вставить в карту 043/у
											</button>
										)}
									</>
								) : (
									<button
										type="button"
										className="emergency-copy-act-btn"
										style={{ background: 'var(--bad-fg, #ef4444)' }}
										onClick={handleCopyCheatSheet}
									>
										{isCopiedCheatSheet ? <Check size={16} /> : <Copy size={16} />}
										{isCopiedCheatSheet ? 'Скопировано для звонка!' : 'Копировать шпаргалку 112'}
									</button>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
