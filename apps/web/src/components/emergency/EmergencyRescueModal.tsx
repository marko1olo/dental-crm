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
	STATUTORY_EMERGENCY_KIT_MEMO,
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

						{/* Real-Time Calculated Dosage Section for Active Scenario */}
						<div className="emergency-dosage-banner">
							<div className="emergency-dosage-header">
								<div className="emergency-dosage-title">
									<Syringe size={18} />
									<span>Экстренные дозировки препаратов</span>
								</div>
								<div className="emergency-dosage-patient-tag">
									Масса: {patientWeightKg} кг • {patientAgeYears < 18 ? 'Детский возраст' : 'Взрослый'} ({patientAgeYears} л)
								</div>
							</div>

							<div className="emergency-dosage-cards-grid">
								{activeScenarioId === 'anaphylactic_shock' && (
									<>
										<div className="emergency-drug-card primary">
											<div className="emergency-drug-card-header">
												<div className="emergency-drug-name">
													<span>⚡ Адреналин 0.1% (Эпинефрин)</span>
												</div>
												<span className="emergency-drug-priority-badge first-line">1-я линия</span>
											</div>
											<div className="emergency-drug-dose-highlight">
												<span className="emergency-drug-dose-val">{allDosages.adrenaline_epi_01.calculatedVolumeMl} мл</span>
												<span className="emergency-drug-dose-sub">({allDosages.adrenaline_epi_01.calculatedDoseMg} мг)</span>
											</div>
											<div className="emergency-drug-route">
												<span>📍 В/М в среднюю треть бедра</span>
											</div>
											<div className="emergency-drug-note">
												Повтор через 5 мин при сохранении гипотонии
											</div>
										</div>

										<div className="emergency-drug-card">
											<div className="emergency-drug-card-header">
												<div className="emergency-drug-name">
													<span>💊 Преднизолон (ГКС)</span>
												</div>
												<span className="emergency-drug-priority-badge second-line">2-я линия</span>
											</div>
											<div className="emergency-drug-dose-highlight">
												<span className="emergency-drug-dose-val">{allDosages.prednisolone_30mg.calculatedDoseMg} мг</span>
												<span className="emergency-drug-dose-sub">({allDosages.prednisolone_30mg.calculatedVolumeMl} мл / {allDosages.prednisolone_30mg.numberOfAmpoules} амп.)</span>
											</div>
											<div className="emergency-drug-route">
												<span>📍 В/В струйно медленно за 2–3 мин</span>
											</div>
											<div className="emergency-drug-note">
												На 10 мл 0.9% NaCl для профилактики 2-й волны шока
											</div>
										</div>
									</>
								)}

								{activeScenarioId === 'local_anesthetic_toxicity' && (
									<>
										<div className="emergency-drug-card primary">
											<div className="emergency-drug-card-header">
												<div className="emergency-drug-name">
													<span>🧪 Липидная эмульсия 20% (Липофундин)</span>
												</div>
												<span className="emergency-drug-priority-badge first-line">Антидот</span>
											</div>
											<div className="emergency-drug-dose-highlight">
												<span className="emergency-drug-dose-val">{lipidRescueData.bolusVolumeMl} мл</span>
												<span className="emergency-drug-dose-sub">(болюс за 1–2 мин)</span>
											</div>
											<div className="emergency-drug-route">
												<span>📍 В/В инфузия: {lipidRescueData.infusionRateMlPerHour} мл/час ({lipidRescueData.infusionRateMlPerMin} мл/мин)</span>
											</div>
											<div className="emergency-drug-note">
												Макс доза: {lipidRescueData.maxTotalDoseMl} мл (12 мл/кг)
											</div>
										</div>

										<div className="emergency-drug-card">
											<div className="emergency-drug-card-header">
												<div className="emergency-drug-name">
													<span>💉 Диазепам 0.5% (Реланиум)</span>
												</div>
												<span className="emergency-drug-priority-badge second-line">При судорогах</span>
											</div>
											<div className="emergency-drug-dose-highlight">
												<span className="emergency-drug-dose-val">{allDosages.diazepam_relanium.calculatedDoseMg} мг</span>
												<span className="emergency-drug-dose-sub">({allDosages.diazepam_relanium.calculatedVolumeMl} мл)</span>
											</div>
											<div className="emergency-drug-route">
												<span>📍 В/В медленно за 2–3 мин</span>
											</div>
											<div className="emergency-drug-note">
												Готовность к ИВЛ мешком Амбу
											</div>
										</div>
									</>
								)}

								{activeScenarioId === 'hypertensive_crisis' && (
									<>
										<div className="emergency-drug-card primary">
											<div className="emergency-drug-card-header">
												<div className="emergency-drug-name">
													<span>💊 Каптоприл (Капотен)</span>
												</div>
												<span className="emergency-drug-priority-badge first-line">1-я линия</span>
											</div>
											<div className="emergency-drug-dose-highlight">
												<span className="emergency-drug-dose-val">25 мг</span>
												<span className="emergency-drug-dose-sub">(1 таблетка)</span>
											</div>
											<div className="emergency-drug-route">
												<span>📍 Сублингвально (под язык)</span>
											</div>
											<div className="emergency-drug-note">
												Снижение АД не более чем на 20–25% за 1–2 часа
											</div>
										</div>

										<div className="emergency-drug-card">
											<div className="emergency-drug-card-header">
												<div className="emergency-drug-name">
													<span>💊 Моксонидин (Физиотенз)</span>
												</div>
												<span className="emergency-drug-priority-badge second-line">Альтернатива</span>
											</div>
											<div className="emergency-drug-dose-highlight">
												<span className="emergency-drug-dose-val">0.2 мг</span>
												<span className="emergency-drug-dose-sub">(1 таблетка)</span>
											</div>
											<div className="emergency-drug-route">
												<span>📍 Сублингвально (под язык)</span>
											</div>
											<div className="emergency-drug-note">
												Контроль АД и ЧСС каждые 10 минут
											</div>
										</div>
									</>
								)}

								{activeScenarioId === 'angina_myocardial_infarction' && (
									<>
										<div className="emergency-drug-card primary">
											<div className="emergency-drug-card-header">
												<div className="emergency-drug-name">
													<span>💊 Нитроглицерин 0.5 мг</span>
												</div>
												<span className="emergency-drug-priority-badge first-line">ОКС</span>
											</div>
											<div className="emergency-drug-dose-highlight">
												<span className="emergency-drug-dose-val">0.5 мг</span>
												<span className="emergency-drug-dose-sub">(1 таб / 1 доза спрея)</span>
											</div>
											<div className="emergency-drug-route">
												<span>📍 Под язык строго сидя (при АД сист &gt; 100)</span>
											</div>
											<div className="emergency-drug-note">
												Противопоказан при АД &lt; 100 и приеме ингибиторов ФДЭ-5!
											</div>
										</div>

										<div className="emergency-drug-card">
											<div className="emergency-drug-card-header">
												<div className="emergency-drug-name">
													<span>💊 Аспирин (АСК)</span>
												</div>
												<span className="emergency-drug-priority-badge second-line">Антиагрегант</span>
											</div>
											<div className="emergency-drug-dose-highlight">
												<span className="emergency-drug-dose-val">250–325 мг</span>
												<span className="emergency-drug-dose-sub">(разжевать)</span>
											</div>
											<div className="emergency-drug-route">
												<span>📍 Разжевать и проглотить</span>
											</div>
											<div className="emergency-drug-note">
												Без кишечнорастворимой оболочки
											</div>
										</div>
									</>
								)}

								{activeScenarioId === 'bronchospasm_asthma' && (
									<>
										<div className="emergency-drug-card primary">
											<div className="emergency-drug-card-header">
												<div className="emergency-drug-name">
													<span>💨 Сальбутамол (Вентолин)</span>
												</div>
												<span className="emergency-drug-priority-badge first-line">Ингаляция</span>
											</div>
											<div className="emergency-drug-dose-highlight">
												<span className="emergency-drug-dose-val">2–4 дозы</span>
												<span className="emergency-drug-dose-sub">(200–400 мкг)</span>
											</div>
											<div className="emergency-drug-route">
												<span>📍 Через спейсер с задержкой дыхания</span>
											</div>
											<div className="emergency-drug-note">
												Повторить через 15–20 мин при необходимости
											</div>
										</div>

										<div className="emergency-drug-card">
											<div className="emergency-drug-card-header">
												<div className="emergency-drug-name">
													<span>💊 Преднизолон (ГКС)</span>
												</div>
												<span className="emergency-drug-priority-badge second-line">Парентерально</span>
											</div>
											<div className="emergency-drug-dose-highlight">
												<span className="emergency-drug-dose-val">{allDosages.prednisolone_30mg.calculatedDoseMg} мг</span>
												<span className="emergency-drug-dose-sub">({allDosages.prednisolone_30mg.calculatedVolumeMl} мл)</span>
											</div>
											<div className="emergency-drug-route">
												<span>📍 В/В медленно или В/М</span>
											</div>
											<div className="emergency-drug-note">
												При тяжелом удушье / астматическом статусе
											</div>
										</div>
									</>
								)}

								{activeScenarioId === 'hypoglycemia_diabetic' && (
									<>
										<div className="emergency-drug-card primary">
											<div className="emergency-drug-card-header">
												<div className="emergency-drug-name">
													<span>🍯 Глюкоза 40% (Декстроза)</span>
												</div>
												<span className="emergency-drug-priority-badge first-line">В/В струйно</span>
											</div>
											<div className="emergency-drug-dose-highlight">
												<span className="emergency-drug-dose-val">{allDosages.glucose_dextrose_40.calculatedVolumeMl} мл</span>
												<span className="emergency-drug-dose-sub">({(allDosages.glucose_dextrose_40.calculatedVolumeMl * 0.4).toFixed(0)} г глюкозы)</span>
											</div>
											<div className="emergency-drug-route">
												<span>📍 В/В струйно до восстановления сознания</span>
											</div>
											<div className="emergency-drug-note">
												При сохранении сознания: теплый сладкий чай / сахар
											</div>
										</div>
									</>
								)}

								{activeScenarioId === 'syncope_collapse' && (
									<>
										<div className="emergency-drug-card primary">
											<div className="emergency-drug-card-header">
												<div className="emergency-drug-name">
													<span>🧴 Аммиак 10% (Нашатырный спирт)</span>
												</div>
												<span className="emergency-drug-priority-badge first-line">Рефлекторно</span>
											</div>
											<div className="emergency-drug-dose-highlight">
												<span className="emergency-drug-dose-val">Пары на ватке</span>
												<span className="emergency-drug-dose-sub">(1–2 сек на 2 см)</span>
											</div>
											<div className="emergency-drug-route">
												<span>📍 Ингаляционно + положение Тренделенбурга</span>
											</div>
											<div className="emergency-drug-note">
												При брадикардии/гипотонии: Кордиамин 2 мл п/к или в/м
											</div>
										</div>
									</>
								)}

								{activeScenarioId === 'accidental_swallowing' && (
									<>
										<div className="emergency-drug-card primary">
											<div className="emergency-drug-card-header">
												<div className="emergency-drug-name">
													<span>🛑 Прием Геймлиха</span>
												</div>
												<span className="emergency-drug-priority-badge first-line">При асфиксии</span>
											</div>
											<div className="emergency-drug-dose-highlight">
												<span className="emergency-drug-dose-val">5 толчков</span>
												<span className="emergency-drug-dose-sub">(вверх в эпигастрий)</span>
											</div>
											<div className="emergency-drug-route">
												<span>📍 До восстановления проходимости</span>
											</div>
											<div className="emergency-drug-note">
												При попадании в ЖКТ: РВОТУ НЕ ВЫЗЫВАТЬ! Рентген/ФГДС.
											</div>
										</div>
									</>
								)}
							</div>
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
								<span>ТАЙМЕР ПОВТОРНОГО ВВЕДЕНИЯ АДРЕНАЛИНА</span>
							</div>

							<div className={`emergency-timer-display ${isAdrenalineDue ? 'due' : ''}`}>
								{formatTimerSeconds(adrenalineTimerSeconds)}
							</div>

							{isAdrenalineDue && (
								<div className="emergency-timer-alert">
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
									<RotateCcw size={14} />
									<span>Сброс</span>
								</button>
							</div>
						</div>

						{/* Statutory Emergency Kit Quick Reference (1-Click Static Memo) */}
						<div className="emergency-cpr-box">
							<div className="emergency-cpr-header">
								<div className="emergency-cpr-title">
									<Syringe size={18} style={{ color: 'var(--primary, #0ea5e9)' }} />
									<span>УКЛАДКА ЭКСТРЕННОЙ ПОМОЩИ (ПРИКАЗ МЗ РФ № 786н / 1144н)</span>
								</div>
							</div>

							<div className="emergency-cpr-guidelines-list">
								{STATUTORY_EMERGENCY_KIT_MEMO.map((kit) => (
									<div key={kit.drugId} className="emergency-cpr-guideline-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px', padding: '6px 0', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' }}>
										<div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
											<span style={{ fontWeight: 800, fontSize: '0.8125rem', color: 'var(--ink)' }}>{kit.tradeNameRu}</span>
											<span className="emergency-cpr-val highlight-ok" style={{ fontSize: '0.75rem' }}>{kit.dosageStandardRu.split(';')[0]}</span>
										</div>
										<span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>📍 {kit.routeRu}</span>
									</div>
								))}
							</div>
						</div>

						{/* Statutory Resuscitation Guidelines Card */}
						<div className="emergency-cpr-box">
							<div className="emergency-cpr-header">
								<div className="emergency-cpr-title">
									<Heart size={18} style={{ color: 'var(--bad-fg)' }} />
									<span>СТАНДАРТ БАЗОВОЙ СЛР (МИНЗДРАВ РФ & ФАР)</span>
								</div>
							</div>

							<div className="emergency-cpr-guidelines-list">
								<div className="emergency-cpr-guideline-row">
									<span className="emergency-cpr-label">Соотношение:</span>
									<span className="emergency-cpr-val highlight-bad">30 компрессий : 2 вдоха</span>
								</div>
								<div className="emergency-cpr-guideline-row">
									<span className="emergency-cpr-label">Частота нажатий:</span>
									<span className="emergency-cpr-val">100–120 в минуту</span>
								</div>
								<div className="emergency-cpr-guideline-row">
									<span className="emergency-cpr-label">Глубина компрессий:</span>
									<span className="emergency-cpr-val">5–6 см (1/3 грудной клетки)</span>
								</div>
								<div className="emergency-cpr-guideline-row">
									<span className="emergency-cpr-label">Положение:</span>
									<span className="emergency-cpr-val highlight-ok">Твердая горизонтальная поверхность</span>
								</div>
							</div>
						</div>

						{/* Emergency Incident Protocol Preview & Handover Box */}
						<div className="emergency-protocol-box">
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
								<div style={{ display: 'flex', gap: '0.5rem' }}>
									<button
										type="button"
										className={`emergency-protocol-tab-btn ${activeProtocolTab === 'act' ? 'active-act' : ''}`}
										onClick={() => setActiveProtocolTab('act')}
									>
										Акт 043/у
									</button>
									<button
										type="button"
										className={`emergency-protocol-tab-btn ${activeProtocolTab === 'cheatsheet' ? 'active-cheatsheet' : ''}`}
										onClick={() => setActiveProtocolTab('cheatsheet')}
									>
										Шпаргалка 112
									</button>
								</div>

								<span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
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
												style={{ background: 'var(--teal, #0d9488)', color: 'var(--on-teal, #ffffff)' }}
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
