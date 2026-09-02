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
	HelpCircle,
	Trash2,
	Printer,
	ChevronDown,
	ChevronUp
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
import {
	validateCarpuleExpirationDate,
	evaluatePreoperativeVitalsSafety,
	createAnesthesiaPkuRecord,
	generateAnesthesiaPkuDisposalAct,
	generateAnesthesiaPkuDisposalHtml,
	AnesthesiaDisposalReason,
	AnesthesiaDisinfectionMethod
} from '@dental/shared';
import './anesthesia.css';

export interface AnesthesiaSafetyHubModalProps {
	isOpen: boolean;
	onClose: () => void;
	onApplyToDiary?: ((diaryText: string, calculation?: AnesthesiaCalculationResult) => void) | undefined;
	initialPatientName?: string | undefined;
	initialMedicalCard043?: string | undefined;
	initialPatientWeightKg?: number | undefined;
	initialPatientAgeYears?: number | undefined;
	initialToothFdi?: string | number | undefined;
	initialSelectedDrug?: AnestheticDrugId | undefined;
	initialTab?: 'calculator' | 'emergency' | 'pku_disposal' | undefined;
	initialEmergencyScenario?: EmergencyScenarioId | undefined;
	clinicName?: string | undefined;
	clinicAddress?: string | undefined;
	cabinetNumber?: string | undefined;
	doctorFullName?: string | undefined;
	nurseFullName?: string | undefined;
}

export function AnesthesiaSafetyHubModal({
	isOpen,
	onClose,
	onApplyToDiary,
	initialPatientName = 'Иванов Иван Иванович',
	initialMedicalCard043 = '043-2026/104',
	initialPatientWeightKg = 70,
	initialPatientAgeYears = 35,
	initialToothFdi = 46,
	initialSelectedDrug = 'articaine_4_epi_100k',
	initialTab = 'calculator',
	initialEmergencyScenario = 'anaphylaxis',
	clinicName = 'Стоматологическая клиника DENTE',
	clinicAddress = 'г. Москва, ул. Усачёва, д. 29',
	cabinetNumber = '1',
	doctorFullName = 'Д-р Волкова Е. С.',
	nurseFullName = 'Смирнова А. В.'
}: AnesthesiaSafetyHubModalProps) {
	// Navigation State
	const [activeTab, setActiveTab] = useState<'calculator' | 'emergency' | 'pku_disposal'>(initialTab);

	// Calculator State
	const [selectedDrugId, setSelectedDrugId] = useState<AnestheticDrugId>(initialSelectedDrug);
	const [carpulesCount, setCarpulesCount] = useState<number>(1.0);
	const [patientWeightKg, setPatientWeightKg] = useState<number>(initialPatientWeightKg);
	const [patientAgeYears, setPatientAgeYears] = useState<number>(initialPatientAgeYears);
	const [asaStatus, setAsaStatus] = useState<AsaClassification>('asa_1');
	const [targetTooth, setTargetTooth] = useState<string | number>(initialToothFdi);
	const [aspirationConfirmed, setAspirationConfirmed] = useState<boolean>(true);

	// Preoperative Vitals State
	const [bpSystolic, setBpSystolic] = useState<number>(120);
	const [bpDiastolic, setBpDiastolic] = useState<number>(80);
	const [heartRateBpm, setHeartRateBpm] = useState<number>(72);
	const [spo2Percent, setSpo2Percent] = useState<number>(98);
	const [assistantName, setAssistantName] = useState<string>(nurseFullName);

	// Carpule Batch State
	const [seriesNumber, setSeriesNumber] = useState<string>('ART-2026');
	const [batchNumber, setBatchNumber] = useState<string>('84019');
	const [expirationDate, setExpirationDate] = useState<string>('2027-06');

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
	const [show112ScriptInline, setShow112ScriptInline] = useState<boolean>(false);

	// PKU & SanPiN Disposal State
	const [disposalReason, setDisposalReason] = useState<AnesthesiaDisposalReason>('used_in_procedure');
	const [disinfectionMethod, setDisinfectionMethod] = useState<AnesthesiaDisinfectionMethod>('chemical_disinfection');
	const [disinfectantName, setDisinfectantName] = useState<string>('Аламинол 3%');
	const [disinfectantExposureMinutes, setDisinfectantExposureMinutes] = useState<number>(60);
	const [pkuPreviewMode, setPkuPreviewMode] = useState<'formatted_text' | 'print_layout'>('formatted_text');

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

	// Live Vitals Evaluation
	const vitalsEvaluation = useMemo(() => {
		return evaluatePreoperativeVitalsSafety({
			bpSystolic,
			bpDiastolic,
			heartRateBpm,
			spo2Percent
		});
	}, [bpSystolic, bpDiastolic, heartRateBpm, spo2Percent]);

	// Live Expiration Evaluation
	const expValidation = useMemo(() => {
		return validateCarpuleExpirationDate(expirationDate);
	}, [expirationDate]);

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
			hasCardiovascularRisk: hasCardiovascularRisk || hasHypertension || hasCardiacArrhythmia || (bpSystolic >= 140) || (heartRateBpm > 90),
			hasHypertension: hasHypertension || bpSystolic >= 140,
			hasSulfiteAllergy,
			hasBronchialAsthma: hasAsthma,
			isPregnantOrLactating: isPregnant,
			hasSevereLiverDisease: hasLiverDisease,
			targetToothFdi: targetTooth,
			aspirationConfirmed,
			carpuleBatch: {
				seriesNumber,
				batchNumber,
				expirationDate: expValidation.formattedExpDateRu
			},
			nurseFullName: assistantName,
			bpSystolic,
			bpDiastolic,
			heartRateBpm,
			spo2Percent
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
		aspirationConfirmed,
		seriesNumber,
		batchNumber,
		expValidation.formattedExpDateRu,
		assistantName,
		bpSystolic,
		bpDiastolic,
		heartRateBpm,
		spo2Percent
	]);

	// Emergency Protocol Definition
	const emergencyProtocol: EmergencyProtocolDefinition = useMemo(() => {
		return EMERGENCY_PROTOCOLS[activeEmergencyScenario] || EMERGENCY_PROTOCOLS.anaphylaxis;
	}, [activeEmergencyScenario]);

	// Weight-calculated emergency doses
	const calculatedEmergencyDoses = useMemo(() => {
		return calculateAllEmergencyDosagesForWeight(activeEmergencyScenario, patientWeightKg, patientAgeYears);
	}, [activeEmergencyScenario, patientWeightKg, patientAgeYears]);

	// PKU Disposal Record
	const pkuRecord = useMemo(() => {
		const now = new Date();
		const dateIso = now.toISOString().slice(0, 10);
		const time = now.toTimeString().slice(0, 5);
		const drugSpec = ANESTHESIA_DRUG_CATALOG[selectedDrugId] || ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k;
		const volumeMlTotal = Number((carpulesCount * (drugSpec?.standardCarpuleVolumeMl ?? 1.7)).toFixed(2));

		return createAnesthesiaPkuRecord({
			dateIso,
			time,
			clinicName,
			cabinetNumber,
			patientFullName: initialPatientName,
			medicalCardNumber043: initialMedicalCard043,
			doctorFullName,
			nurseFullName: assistantName,
			drugId: selectedDrugId,
			drugNameRu: drugSpec.tradeNamesRu[0] ?? drugSpec.activeSubstanceRu,
			activeSubstanceRu: drugSpec.activeSubstanceRu,
			seriesNumber: seriesNumber || 'НЕ УКАЗАНА',
			batchNumber: batchNumber || 'НЕ УКАЗАНА',
			expirationDate: expValidation.formattedExpDateRu,
			carpulesUsedCount: carpulesCount,
			carpulesDisposedCount: carpulesCount,
			volumeMlTotal,
			disposalReason,
			wasteClass: 'class_b_hazardous',
			disinfectionMethod,
			disinfectantNameRu: disinfectantName,
			disinfectantExposureMinutes,
			assistantSignatureConfirmed: true
		});
	}, [
		clinicName,
		cabinetNumber,
		initialPatientName,
		initialMedicalCard043,
		doctorFullName,
		assistantName,
		selectedDrugId,
		seriesNumber,
		batchNumber,
		expValidation.formattedExpDateRu,
		carpulesCount,
		disposalReason,
		disinfectionMethod,
		disinfectantName,
		disinfectantExposureMinutes
	]);

	const pkuActText = useMemo(() => {
		return generateAnesthesiaPkuDisposalAct(pkuRecord);
	}, [pkuRecord]);

	const pkuActHtml = useMemo(() => {
		return generateAnesthesiaPkuDisposalHtml(pkuRecord);
	}, [pkuRecord]);

	// Handler to switch drug to recommended alternative
	const handleSwitchToRecommended = () => {
		if (calcResult.recommendedAlternativeId) {
			setSelectedDrugId(calcResult.recommendedAlternativeId);
		} else {
			setSelectedDrugId('mepivacaine_3_plain');
		}
	};

	// Copy Helper
	const handleCopyText = async (text: string, notificationMsg: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setIsCopied(true);
			setCopyNotificationText(notificationMsg);
			setTimeout(() => {
				setIsCopied(false);
				setCopyNotificationText('');
			}, 2500);
		} catch {
			// Fallback
		}
	};

	// Apply Calculation to Diary
	const handleApplyCalculation = () => {
		if (onApplyToDiary) {
			onApplyToDiary(calcResult.soapDiaryText, calcResult);
		}
		onClose();
	};

	// Toggle Step in Emergency Protocol
	const handleToggleStep = (stepNumber: number, stepTitle: string) => {
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
			initialBp: `${bpSystolic}/${bpDiastolic}`,
			finalBp: '120/80',
			initialHr: String(heartRateBpm),
			finalHr: '78',
			initialSpo2: String(spo2Percent),
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

	const handlePrintPkuAct = () => {
		const printWin = window.open('', '_blank', 'width=800,height=900');
		if (printWin) {
			printWin.document.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Акт списания анестетика (СанПиН 3.3686-21)</title>
					<meta charset="utf-8">
					<style>body { margin: 20px; font-family: Arial, sans-serif; }</style>
				</head>
				<body>
					${pkuActHtml}
					<script>window.onload = function() { window.print(); }</script>
				</body>
				</html>
			`);
			printWin.document.close();
		}
	};

	if (!isOpen) return null;

	return (
		<div className="anesthesia-modal-overlay">
			<div className="anesthesia-modal-container hub-container" style={{ maxWidth: '920px' }}>
				{/* Modal Top Header */}
				<div className="anesthesia-modal-header hub-header">
					<div className="anesthesia-header-title">
						<div className="hub-logo-box">
							<Syringe size={22} className="hub-logo-icon" />
						</div>
						<div>
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
								<span className="hub-title-text">Центр безопасности анестезии & Экстренные протоколы</span>
								<span className="anesthesia-header-badge">Приказ МЗ РФ № 786н & СанПиН</span>
							</div>
							<div className="hub-subtitle-text">
								Фармакологический скрининг, калькулятор МРД, журнал учета ПКУ и пошаговая реанимация
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
						<Syringe size={16} />
						<span>1. Калькулятор МРД & Скрининг безопасности</span>
					</button>

					<button
						type="button"
						className={`hub-tab-btn emergency-tab ${activeTab === 'emergency' ? 'active' : ''}`}
						onClick={() => setActiveTab('emergency')}
					>
						<AlertOctagon size={16} />
						<span>2. Экстренные протоколы реанимации (МЗ РФ)</span>
						<span className="emergency-pulse-dot" />
					</button>

					<button
						type="button"
						className={`hub-tab-btn ${activeTab === 'pku_disposal' ? 'active' : ''}`}
						onClick={() => setActiveTab('pku_disposal')}
					>
						<Trash2 size={16} />
						<span>3. Журнал ПКУ & Акт списания (СанПиН 3.3686-21)</span>
					</button>
				</div>

				{/* Modal Body */}
				<div className="anesthesia-modal-body" style={{ maxHeight: 'calc(88vh - 140px)', overflowY: 'auto' }}>
					{/* ========================================================================= */}
					{/* TAB 1: ANESTHESIA MRD & PHARMACOLOGICAL SAFETY CALCULATOR                 */}
					{/* ========================================================================= */}
					{activeTab === 'calculator' && (
						<div className="hub-tab-content">
							{/* Preoperative Vitals Banner (Live Safety Check) */}
							{vitalsEvaluation.warnings.length > 0 && (
								<div
									style={{
										padding: '0.75rem 1rem',
										borderRadius: '8px',
										background: vitalsEvaluation.isCrisis ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
										border: `1px solid ${vitalsEvaluation.isCrisis ? 'var(--bad, #ef4444)' : 'var(--warn-fg, #d97706)'}`,
										color: vitalsEvaluation.isCrisis ? 'var(--bad-fg, #ef4444)' : 'var(--warn-fg, #d97706)',
										fontSize: '0.8125rem',
										fontWeight: 600,
										marginBottom: '1rem',
										display: 'flex',
										flexDirection: 'column',
										gap: '0.375rem'
									}}
								>
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
										<Activity size={18} />
										<span>ПРЕДОПЕРАЦИОННАЯ ОЦЕНКА ГЕМОДИНАМИКИ:</span>
									</div>
									<ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
										{vitalsEvaluation.warnings.map((w, idx) => (
											<li key={idx}>{w}</li>
										))}
									</ul>
									{vitalsEvaluation.recommendedActionRu && (
										<div style={{ fontWeight: 700, marginTop: '0.25rem' }}>
											Рекомендация: {vitalsEvaluation.recommendedActionRu}
										</div>
									)}
								</div>
							)}

							{/* Expiration warning banner */}
							{expValidation.warningRu && (
								<div
									style={{
										padding: '0.625rem 1rem',
										borderRadius: '8px',
										background: expValidation.isExpired ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
										border: `1px solid ${expValidation.isExpired ? 'var(--bad, #ef4444)' : 'var(--warn-fg, #d97706)'}`,
										color: expValidation.isExpired ? 'var(--bad-fg, #ef4444)' : 'var(--warn-fg, #d97706)',
										fontSize: '0.8125rem',
										fontWeight: 600,
										marginBottom: '1rem',
										display: 'flex',
										alignItems: 'center',
										gap: '0.5rem'
									}}
								>
									<AlertTriangle size={18} />
									<span>{expValidation.warningRu}</span>
								</div>
							)}

							{/* Patient Vitals & Demographics Bar */}
							<div className="hub-card patient-vitals-card">
								<div className="card-section-title">
									<User size={16} />
									<span>Параметры пациента, точный ввод массы и гемодинамика</span>
								</div>

								<div className="patient-inputs-grid">
									{/* Weight Input (Slider + Direct Keyboard Input) */}
									<div className="input-group">
										<div className="input-label-row">
											<span className="input-label">Масса тела (кг):</span>
											<input
												type="number"
												autoFocus
												min={5}
												max={250}
												step={1}
												value={patientWeightKg}
												onChange={e => setPatientWeightKg(Math.max(5, parseInt(e.target.value) || 70))}
												className="hub-text-input"
												style={{ width: '70px', height: '28px', textAlign: 'center', fontWeight: 700, padding: '0.125rem' }}
											/>
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

									{/* Age Input (Slider + Direct Keyboard Input) */}
									<div className="input-group">
										<div className="input-label-row">
											<span className="input-label">Возраст (лет):</span>
											<input
												type="number"
												min={1}
												max={110}
												step={1}
												value={patientAgeYears}
												onChange={e => setPatientAgeYears(Math.max(1, parseInt(e.target.value) || 35))}
												className="hub-text-input"
												style={{ width: '70px', height: '28px', textAlign: 'center', fontWeight: 700, padding: '0.125rem' }}
											/>
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

									{/* Preoperative Hemodynamics (АД, ЧСС, SpO2) */}
									<div className="input-group">
										<span className="input-label">АД (мм рт. ст.) / ЧСС (уд/мин):</span>
										<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.375rem' }}>
											<input
												type="number"
												min={60}
												max={260}
												value={bpSystolic}
												onChange={e => setBpSystolic(parseInt(e.target.value) || 120)}
												className="hub-text-input"
												placeholder="Систол."
												title="Систолическое АД"
											/>
											<input
												type="number"
												min={40}
												max={160}
												value={bpDiastolic}
												onChange={e => setBpDiastolic(parseInt(e.target.value) || 80)}
												className="hub-text-input"
												placeholder="Диастол."
												title="Диастолическое АД"
											/>
											<input
												type="number"
												min={35}
												max={200}
												value={heartRateBpm}
												onChange={e => setHeartRateBpm(parseInt(e.target.value) || 72)}
												className="hub-text-input"
												placeholder="ЧСС"
												title="Пульс / ЧСС"
											/>
										</div>
									</div>

									{/* ASA Status & Tooth FDI */}
									<div className="input-group">
										<span className="input-label">Категория ASA & Зуб (FDI):</span>
										<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.375rem' }}>
											<select
												value={asaStatus}
												onChange={e => setAsaStatus(e.target.value as AsaClassification)}
												className="hub-select"
											>
												<option value="asa_1">ASA I: Здоровый</option>
												<option value="asa_2">ASA II: Легкая патология</option>
												<option value="asa_3">ASA III: Тяжелая патология</option>
												<option value="asa_4">ASA IV: Угроза жизни</option>
											</select>
											<input
												type="text"
												value={targetTooth}
												onChange={e => setTargetTooth(e.target.value)}
												className="hub-text-input"
												placeholder="FDI 46"
											/>
										</div>
									</div>
								</div>

								{/* Carpule Batch Tracking & Assistant Row */}
								<div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--line, #e2e8f0)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.625rem' }}>
									<div className="input-group">
										<span className="input-label" style={{ fontSize: '0.75rem' }}>Серия карпулы:</span>
										<input
											type="text"
											value={seriesNumber}
											onChange={e => setSeriesNumber(e.target.value)}
											className="hub-text-input"
											placeholder="ART-2026"
											style={{ height: '32px', fontSize: '0.8125rem' }}
										/>
									</div>

									<div className="input-group">
										<span className="input-label" style={{ fontSize: '0.75rem' }}>Номер партии:</span>
										<input
											type="text"
											value={batchNumber}
											onChange={e => setBatchNumber(e.target.value)}
											className="hub-text-input"
											placeholder="84019"
											style={{ height: '32px', fontSize: '0.8125rem' }}
										/>
									</div>

									<div className="input-group">
										<span className="input-label" style={{ fontSize: '0.75rem' }}>Срок годности:</span>
										<input
											type="text"
											value={expirationDate}
											onChange={e => setExpirationDate(e.target.value)}
											className="hub-text-input"
											placeholder="2027-06"
											style={{ height: '32px', fontSize: '0.8125rem' }}
										/>
									</div>

									<div className="input-group">
										<span className="input-label" style={{ fontSize: '0.75rem' }}>Ассистент / Медсестра:</span>
										<input
											type="text"
											value={assistantName}
											onChange={e => setAssistantName(e.target.value)}
											className="hub-text-input"
											placeholder="ФИО медсестры"
											style={{ height: '32px', fontSize: '0.8125rem' }}
										/>
									</div>
								</div>

								{/* Somatic Screening Checklist */}
								<div className="screening-checklist-container">
									<div className="screening-header">
										<AlertTriangle size={15} color="var(--warn-fg, #d97706)" />
										<span>Скрининг сопутствующей патологии и фармакотерапии (СтАР / МЗ РФ):</span>
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

							{/* Drug Selector & Dosage Grid */}
							<div className="hub-card drug-dosage-card">
								<div className="card-section-title">
									<Syringe size={16} />
									<span>Выбор анестетика и дозирование</span>
								</div>

								<div className="drug-selection-grid">
									{Object.values(ANESTHESIA_DRUG_CATALOG).map(drug => {
										const isSelected = drug.id === selectedDrugId;
										const isRestrictedForCardio = (hasCardiovascularRisk || hasHypertension || asaStatus === 'asa_3' || asaStatus === 'asa_4') && !drug.isAdrenalineFree;
										const isSulfiteDanger = (hasSulfiteAllergy || hasAsthma) && !drug.isAdrenalineFree;

										return (
											<button
												key={drug.id}
												type="button"
												className={`drug-tile-btn ${isSelected ? 'selected' : ''} ${isSulfiteDanger ? 'blocked' : ''}`}
												onClick={() => setSelectedDrugId(drug.id)}
											>
												<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
													<div>
														<div className="drug-tile-name">{drug.tradeNamesRu[0]}</div>
														<div className="drug-tile-substance">{drug.activeSubstanceRu} {drug.activeConcentrationPercent}%</div>
													</div>
													{drug.isAdrenalineFree && (
														<span className="drug-tile-badge safe">Free</span>
													)}
													{drug.vasoconstrictorRatio === '1:100000' && (
														<span className="drug-tile-badge strong">1:100k</span>
													)}
													{drug.vasoconstrictorRatio === '1:200000' && (
														<span className="drug-tile-badge standard">1:200k</span>
													)}
												</div>

												<div className="drug-tile-details">
													<span>Действие: {drug.durationSoftTissueMinutes} мин</span>
													<span>МРД: {drug.maxDoseMgPerKgAdult} мг/кг</span>
												</div>

												{isSulfiteDanger && (
													<div className="drug-tile-warning">
														Сульфиты (Астма / Аллергия)
													</div>
												)}
												{isRestrictedForCardio && !isSulfiteDanger && (
													<div className="drug-tile-warning">
														Лимит адреналина ≤ 0.04 мг
													</div>
												)}
											</button>
										);
									})}
								</div>

								{/* Carpule Volume & Count Controls */}
								<div className="carpules-selector-bar">
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
										<span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Объем анестетика:</span>
										<div className="carpule-stepper-box">
											<button
												type="button"
												className="stepper-btn"
												onClick={() => setCarpulesCount(prev => Math.max(0.5, Number((prev - 0.5).toFixed(1))))}
											>
												-
											</button>
											<span className="stepper-value">{carpulesCount} карп. ({calcResult.injectedVolumeMl} мл)</span>
											<button
												type="button"
												className="stepper-btn"
												onClick={() => setCarpulesCount(prev => Math.min(10, Number((prev + 0.5).toFixed(1))))}
											>
												+
											</button>
										</div>
									</div>

									<div className="carpule-quick-chips">
										{[0.5, 1.0, 1.5, 2.0, 3.0].map(val => (
											<button
												key={val}
												type="button"
												className={`carpule-chip ${carpulesCount === val ? 'active' : ''}`}
												onClick={() => setCarpulesCount(val)}
											>
												{val} карп.
											</button>
										))}
									</div>
								</div>
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
											: calcResult.safetyZone === 'caution' ? 'var(--ok-fg)'
											: calcResult.safetyZone === 'warning' ? 'var(--warn-fg, #d97706)'
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
									style={{ minHeight: '36px' }}
								>
									Отмена
								</button>
								<button
									type="button"
									onClick={handleApplyCalculation}
									disabled={calcResult.isBlocked}
									className={`anesthesia-btn ${calcResult.isBlocked ? 'disabled' : 'anesthesia-btn-primary'}`}
									style={{ minHeight: '36px' }}
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
								<div className="emergency-header-title-box">
									<div className="scenario-icon-box" style={{ background: emergencyProtocol.colorTheme.bgLight }}>
										<AlertOctagon size={24} color={emergencyProtocol.colorTheme.primary} />
									</div>
									<div>
										<div className="scenario-name-text">{emergencyProtocol.titleRu}</div>
										<div className="scenario-statutory-text">
											{emergencyProtocol.statutoryOrderRu} | {emergencyProtocol.subtitleRu}
										</div>
									</div>
								</div>

								{/* Stopwatch Widget */}
								<div className="emergency-stopwatch-widget">
									<div className="stopwatch-display">
										<Clock size={16} />
										<span className="stopwatch-digits">{formatEmergencyStopwatchTime(timerSeconds)}</span>
									</div>
									<div className="stopwatch-controls">
										<button
											type="button"
											onClick={() => setIsTimerRunning(prev => !prev)}
											className={`anesthesia-btn ${isTimerRunning ? 'stopwatch-btn-pause' : 'stopwatch-btn-play'}`}
											title={isTimerRunning ? 'Пауза секундомера' : 'Старт секундомера'}
											style={{ minHeight: '32px', minWidth: '32px', padding: '0.25rem' }}
										>
											{isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
										</button>
										<button
											type="button"
											onClick={() => {
												setIsTimerRunning(false);
												setTimerSeconds(0);
												setCompletedStepNumbers({});
											}}
											className="anesthesia-btn"
											title="Сбросить время и шаги"
											style={{ minHeight: '32px', minWidth: '32px', padding: '0.25rem' }}
										>
											<RotateCcw size={14} />
										</button>
									</div>
								</div>
							</div>

							{/* Emergency Scenario Selector Grid */}
							<div className="scenario-selector-grid">
								{(Object.keys(EMERGENCY_PROTOCOLS) as EmergencyScenarioId[]).map(scId => {
									const sc = EMERGENCY_PROTOCOLS[scId];
									const isSelected = scId === activeEmergencyScenario;
									return (
										<button
											key={scId}
											type="button"
											className={`scenario-btn ${isSelected ? 'active' : ''}`}
											onClick={() => {
												setActiveEmergencyScenario(scId);
												setCompletedStepNumbers({});
											}}
											style={{ borderLeftColor: sc.colorTheme.primary }}
										>
											<div className="scenario-btn-title">{sc.titleRu}</div>
											<div className="scenario-btn-sub">{sc.statutoryOrderRu.split('(')[0]}</div>
										</button>
									);
								})}
							</div>

							{/* GOLDEN RULE BANNER */}
							<div className="golden-rule-banner">
								<div className="golden-rule-title">
									<AlertTriangle size={18} />
									<span>ЗОЛОТОЕ ПРАВИЛО / FIRST-LINE ДЕЙСТВИЕ:</span>
								</div>
								<div className="golden-rule-body">
									{emergencyProtocol.immediateGoldenRuleRu}
								</div>
							</div>

							{/* Weight-Adjusted Emergency Drug Dosages Card */}
							<div className="hub-card emergency-dosages-card">
								<div className="card-section-title" style={{ color: emergencyProtocol.colorTheme.primary }}>
									<Syringe size={16} />
									<span>Точные дозировки препаратов для пациента {patientWeightKg} кг ({calcResult.isPediatric ? 'Ребенок' : 'Взрослый'}):</span>
								</div>

								<div className="emergency-drug-table-container">
									<table className="emergency-drug-table">
										<thead>
											<tr>
												<th>Препарат</th>
												<th>Рассчитанная доза ({patientWeightKg} кг)</th>
												<th>Путь введения</th>
												<th>Место / Техника</th>
												<th>Обоснование</th>
											</tr>
										</thead>
										<tbody>
											{emergencyProtocol.steps
												.filter(s => s.drugDetail)
												.map((step, idx) => {
													const drug = step.drugDetail!;
													const doseInfo = calculatedEmergencyDoses[drug.drugNameRu];

													return (
														<tr key={idx} className={step.isCriticalFirstAction ? 'first-line-row' : ''}>
															<td className="drug-name-cell">
																<strong>{drug.drugNameRu}</strong>
																<div className="drug-conc-sub">{drug.activeSubstanceRu}</div>
															</td>
															<td className="drug-dose-cell">
																<span className="dose-badge">{doseInfo?.doseText ?? drug.standardAdultDoseRu}</span>
																{doseInfo?.volumeText && (
																	<div style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>{doseInfo.volumeText}</div>
																)}
															</td>
															<td>{drug.administrationRouteRu}</td>
															<td>{drug.ampoulePresentationRu}</td>
															<td>{drug.clinicalRationaleRu}</td>
														</tr>
													);
												})}
										</tbody>
									</table>
								</div>
							</div>

							{/* Step-by-Step Action Timeline */}
							<div className="hub-card timeline-card">
								<div className="card-section-title">
									<Activity size={16} />
									<span>Пошаговый протокол действий (отмечайте выполненные пункты):</span>
								</div>

								<div className="emergency-timeline">
									{emergencyProtocol.steps.map(step => {
										const isDone = Boolean(completedStepNumbers[step.stepNumber]);
										const logEntry = completedStepNumbers[step.stepNumber];

										return (
											<div
												key={step.stepNumber}
												className={`timeline-item ${isDone ? 'completed' : ''} ${step.isCriticalFirstAction ? 'critical' : ''}`}
												onClick={() => handleToggleStep(step.stepNumber, step.titleRu)}
											>
												<div className="timeline-marker">
													{isDone ? <Check size={14} /> : step.stepNumber}
												</div>

												<div className="timeline-content">
													<div className="timeline-step-header">
														<span className="step-title-text">{step.titleRu}</span>
														{isDone && logEntry && (
															<span className="step-timestamp-badge">
																<Clock size={12} />
																{logEntry.timeFormatted}
															</span>
														)}
													</div>

													<div className="step-desc-text">{step.descriptionRu}</div>

													{step.drugDetail && (
														<div className="step-drug-box">
															<strong>Дозировка:</strong> {step.drugDetail.standardAdultDoseRu} ({step.drugDetail.administrationRouteRu})
														</div>
													)}

													{step.criticalWarningRu && (
														<div className="step-warning-box">
															<strong>Внимание:</strong> {step.criticalWarningRu}
														</div>
													)}
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* INLINE COLLAPSIBLE CARD: 112 Dispatcher Script (Anti-Matryoshka / Zero Submodals) */}
							<div className="hub-card" style={{ padding: '0.875rem 1rem', background: 'var(--paper-strong, #f8fafc)', border: '1px solid var(--line, #e2e8f0)' }}>
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										cursor: 'pointer'
									}}
									onClick={() => setShow112ScriptInline(prev => !prev)}
								>
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--bad-fg, #ef4444)' }}>
										<PhoneCall size={18} />
										<span>Шпаргалка звонка в Службу 112 / 103 (Скорая медицинская помощь)</span>
									</div>
									<button
										type="button"
										className="anesthesia-btn"
										style={{ minHeight: '30px', minWidth: '30px', padding: '0.125rem' }}
									>
										{show112ScriptInline ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
									</button>
								</div>

								{show112ScriptInline && (
									<div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--line, #e2e8f0)' }}>
										<div className="dispatcher-script-box" style={{ background: 'var(--paper, #ffffff)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)' }}>
											<pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.5, color: 'var(--ink, #0f172a)' }}>
												{generateEmergency112DispatchScript({
													scenarioId: activeEmergencyScenario,
													clinicName,
													clinicAddress,
													cabinetNumber,
													patientAgeYears,
													currentBp: `${bpSystolic}/${bpDiastolic}`,
													currentHr: String(heartRateBpm),
													currentSpo2: String(spo2Percent),
													adrenalineGivenMg: activeEmergencyScenario === 'anaphylaxis' ? 0.5 : undefined
												})}
											</pre>
										</div>

										<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
											<button
												type="button"
												onClick={() => {
													const script = generateEmergency112DispatchScript({
														scenarioId: activeEmergencyScenario,
														clinicName,
														clinicAddress,
														cabinetNumber,
														patientAgeYears,
														currentBp: `${bpSystolic}/${bpDiastolic}`,
														currentHr: String(heartRateBpm),
														currentSpo2: String(spo2Percent),
														adrenalineGivenMg: activeEmergencyScenario === 'anaphylaxis' ? 0.5 : undefined
													});
													handleCopyText(script, 'Текст для 112 скопирован!');
												}}
												className="anesthesia-btn anesthesia-btn-primary"
												style={{ minHeight: '34px', fontSize: '0.8125rem' }}
											>
												<Copy size={14} />
												{isCopied && copyNotificationText.includes('112') ? 'Скопировано!' : 'Скопировать шпаргалку 112'}
											</button>
										</div>
									</div>
								)}
							</div>

							{/* Emergency Bottom Action Bar */}
							<div className="emergency-footer-actions">
								<button
									type="button"
									onClick={() => setShow112ScriptInline(prev => !prev)}
									className="anesthesia-btn"
									style={{ borderColor: 'var(--bad, #ef4444)', color: 'var(--bad-fg, #ef4444)', minHeight: '36px' }}
								>
									<PhoneCall size={16} />
									{show112ScriptInline ? 'Скрыть шпаргалку 112' : 'Шпаргалка 112 / 103'}
								</button>

								<button
									type="button"
									onClick={handleApplyEmergencyAct}
									className="anesthesia-btn anesthesia-btn-primary emergency-save-btn"
									style={{ minHeight: '36px' }}
								>
									<FileText size={16} />
									Сформировать протокол реанимации (Форма 043/у)
								</button>
							</div>
						</div>
					)}

					{/* ========================================================================= */}
					{/* TAB 3: SUBJECT-QUANTITATIVE ACCOUNTING (ПКУ) & SANPIN 3.3686-21 DISPOSAL */}
					{/* ========================================================================= */}
					{activeTab === 'pku_disposal' && (
						<div className="hub-tab-content">
							<div className="hub-card" style={{ padding: '0.875rem 1rem', marginBottom: '1rem' }}>
								<div className="card-section-title" style={{ color: 'var(--teal)', marginBottom: '0.75rem' }}>
									<FileText size={16} />
									<span>Протокол списания карпул (СанПиН 3.3686-21)</span>
								</div>

								<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
									<div className="input-group">
										<span className="input-label">Причина списания:</span>
										<select
											value={disposalReason}
											onChange={e => setDisposalReason(e.target.value as AnesthesiaDisposalReason)}
											className="hub-select"
										>
											<option value="used_in_procedure">Израсходовано на приеме (введено пациенту)</option>
											<option value="damaged_broken">Механический бой / повреждение карпулы</option>
											<option value="expired">Истечение установленного срока годности</option>
											<option value="unsealed_unused">Вскрытая неиспользованная остаточная доза</option>
										</select>
									</div>

									<div className="input-group">
										<span className="input-label">Метод дезинфекции:</span>
										<select
											value={disinfectionMethod}
											onChange={e => setDisinfectionMethod(e.target.value as AnesthesiaDisinfectionMethod)}
											className="hub-select"
										>
											<option value="chemical_disinfection">Химическая дезинфекция (раствор ДС)</option>
											<option value="autoclaving_destructive">Автоклавирование (деструктивный метод)</option>
										</select>
									</div>

									{disinfectionMethod === 'chemical_disinfection' && (
										<>
											<div className="input-group">
												<span className="input-label">Препарат дезинфекции:</span>
												<input
													type="text"
													value={disinfectantName}
													onChange={e => setDisinfectantName(e.target.value)}
													className="hub-text-input"
													placeholder="напр. Аламинол 3%"
												/>
											</div>

											<div className="input-group">
												<span className="input-label">Экспозиция (мин):</span>
												<input
													type="number"
													min={15}
													max={180}
													step={5}
													value={disinfectantExposureMinutes}
													onChange={e => setDisinfectantExposureMinutes(parseInt(e.target.value) || 60)}
													className="hub-text-input"
													style={{ width: '80px', textAlign: 'center' }}
												/>
											</div>
										</>
									)}
								</div>
							</div>

							{/* Preview Mode Switcher */}
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
								<div style={{ display: 'flex', gap: '0.5rem' }}>
									<button
										type="button"
										className={`hub-tab-btn ${pkuPreviewMode === 'formatted_text' ? 'active' : ''}`}
										style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', minHeight: '30px' }}
										onClick={() => setPkuPreviewMode('formatted_text')}
									>
										<FileText size={14} />
										<span>Текстовый протокол (043/у)</span>
									</button>

									<button
										type="button"
										className={`hub-tab-btn ${pkuPreviewMode === 'print_layout' ? 'active' : ''}`}
										style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', minHeight: '30px' }}
										onClick={() => setPkuPreviewMode('print_layout')}
									>
										<Printer size={14} />
										<span>Бланк для печати (СанПиН)</span>
									</button>
								</div>

								<div style={{ display: 'flex', gap: '0.5rem' }}>
									<button
										type="button"
										onClick={() => handleCopyText(pkuActText, 'Акт списания скопирован!')}
										className="anesthesia-btn"
										style={{ minHeight: '32px', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
									>
										{isCopied && copyNotificationText.includes('списания') ? <Check size={14} color="var(--ok-fg)" /> : <Copy size={14} />}
										<span>{isCopied && copyNotificationText.includes('списания') ? copyNotificationText : 'Скопировать акт'}</span>
									</button>

									<button
										type="button"
										onClick={handlePrintPkuAct}
										className="anesthesia-btn"
										style={{ minHeight: '32px', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
									>
										<Printer size={14} />
										<span>Печать</span>
									</button>
								</div>
							</div>

							{/* Document Preview */}
							{pkuPreviewMode === 'formatted_text' ? (
								<div
									style={{
										background: 'var(--paper-strong, #f8fafc)',
										border: '1px solid var(--line, #e2e8f0)',
										borderRadius: '8px',
										padding: '0.875rem',
										fontFamily: 'monospace',
										fontSize: '0.75rem',
										lineHeight: 1.4,
										whiteSpace: 'pre-wrap',
										color: 'var(--ink, #0f172a)'
									}}
								>
									{pkuActText}
								</div>
							) : (
								<div
									style={{
										background: 'var(--paper-strong)',
										border: '1px solid var(--line)',
										borderRadius: '8px',
										padding: '1rem',
										overflowX: 'auto'
									}}
									dangerouslySetInnerHTML={{ __html: pkuActHtml }}
								/>
							)}

							{/* PKU Footer Actions */}
							<div className="hub-footer-actions" style={{ marginTop: '1rem' }}>
								<button
									type="button"
									onClick={onClose}
									className="anesthesia-btn"
									style={{ minHeight: '36px' }}
								>
									Закрыть
								</button>
								<button
									type="button"
									onClick={() => {
										handleCopyText(pkuActText, 'Акт списания скопирован!');
										if (onApplyToDiary) {
											onApplyToDiary(calcResult.soapDiaryText + '\n\n' + pkuActText, calcResult);
										}
										onClose();
									}}
									className="anesthesia-btn anesthesia-btn-primary"
									style={{ minHeight: '36px', background: 'var(--teal)', borderColor: 'var(--teal)', color: 'var(--on-teal, #fff)' }}
								>
									<CheckCircle2 size={16} />
									Зафиксировать списание в ПКУ и карте 043/у
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
