import React, { useState, useMemo } from 'react';
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
	Layers,
	FileText,
	Check,
	User,
	Clock
} from 'lucide-react';
import {
	AnestheticDrugId,
	DENTAL_ANESTHETICS,
	INJECTION_TECHNIQUES,
	InjectionTechniqueId,
	NeedleGaugeType,
	DENTAL_NEEDLES
} from './anesthesiaCatalog';
import {
	AsaPhysicalStatus,
	ASA_CLASSIFICATIONS,
	calculateAnesthesiaSafety,
	AnesthesiaCalculationResult
} from './anesthesiaEngine';
import { validateCarpuleExpirationDate, evaluatePreoperativeVitalsSafety } from '@dental/shared';
import './anesthesia.css';

export interface AnesthesiaProtocolModalProps {
	isOpen: boolean;
	onClose: () => void;
	onApplyToDiary?: ((diaryText: string, result: AnesthesiaCalculationResult) => void) | undefined;
	initialToothNumber?: number | string | undefined;
	initialPatientWeightKg?: number | undefined;
	initialPatientAgeYears?: number | undefined;
	initialHasCardioRisk?: boolean | undefined;
	nurseFullName?: string | undefined;
}

export function AnesthesiaProtocolModal({
	isOpen,
	onClose,
	onApplyToDiary,
	initialToothNumber = 46,
	initialPatientWeightKg = 70,
	initialPatientAgeYears = 35,
	initialHasCardioRisk = false,
	nurseFullName = 'Смирнова А. В.'
}: AnesthesiaProtocolModalProps) {
	const [selectedDrugId, setSelectedDrugId] = useState<AnestheticDrugId>('articaine_1_100k');
	const [carpulesCount, setCarpulesCount] = useState<number>(1.0);
	const [patientWeightKg, setPatientWeightKg] = useState<number>(initialPatientWeightKg);
	const [patientAgeYears, setPatientAgeYears] = useState<number>(initialPatientAgeYears);
	const [asaStatus, setAsaStatus] = useState<AsaPhysicalStatus>(initialHasCardioRisk ? 'asa_3' : 'asa_1');

	// Vitals
	const [bpSystolic, setBpSystolic] = useState<number>(120);
	const [bpDiastolic, setBpDiastolic] = useState<number>(80);
	const [heartRateBpm, setHeartRateBpm] = useState<number>(72);
	const [spo2Percent, setSpo2Percent] = useState<number>(98);
	const [assistantName, setAssistantName] = useState<string>(nurseFullName);

	// Batch
	const [seriesNumber, setSeriesNumber] = useState<string>('ART-2026');
	const [batchNumber, setBatchNumber] = useState<string>('84019');
	const [expirationDate, setExpirationDate] = useState<string>('2027-06');

	// Risk factors
	const [hasCardioRisk, setHasCardioRisk] = useState<boolean>(initialHasCardioRisk);
	const [hasSulfiteAllergy, setHasSulfiteAllergy] = useState<boolean>(false);
	const [hasAsthma, setHasAsthma] = useState<boolean>(false);
	const [isPregnant, setIsPregnant] = useState<boolean>(false);

	// Technique & Needle
	const [techniqueId, setTechniqueId] = useState<InjectionTechniqueId>('mandibular_torus');
	const [needleType, setNeedleType] = useState<NeedleGaugeType>('g27_long_35mm');
	const [targetTooth, setTargetTooth] = useState<string | number>(initialToothNumber);
	const [aspirationConfirmed, setAspirationConfirmed] = useState<boolean>(true);

	const [isCopied, setIsCopied] = useState<boolean>(false);

	// Live validation
	const expValidation = useMemo(() => {
		return validateCarpuleExpirationDate(expirationDate);
	}, [expirationDate]);

	const vitalsValidation = useMemo(() => {
		return evaluatePreoperativeVitalsSafety({
			bpSystolic,
			bpDiastolic,
			heartRateBpm,
			spo2Percent
		});
	}, [bpSystolic, bpDiastolic, heartRateBpm, spo2Percent]);

	// Update needle default when technique changes
	const handleTechniqueChange = (newTechId: InjectionTechniqueId) => {
		setTechniqueId(newTechId);
		const defaultNeedle = INJECTION_TECHNIQUES[newTechId]?.defaultNeedle;
		if (defaultNeedle) {
			setNeedleType(defaultNeedle);
		}
	};

	// Calculation result
	const calcResult: AnesthesiaCalculationResult = useMemo(() => {
		return calculateAnesthesiaSafety({
			drugId: selectedDrugId,
			carpulesCount,
			patientWeightKg,
			patientAgeYears,
			asaStatus,
			hasCardiovascularRisk: hasCardioRisk || bpSystolic >= 140 || heartRateBpm > 90,
			hasSulfiteAllergy,
			hasBronchialAsthma: hasAsthma,
			isPregnantOrLactating: isPregnant,
			techniqueId,
			needleType,
			targetToothNumberFdi: targetTooth,
			aspirationNegativeConfirmed: aspirationConfirmed,
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
		hasCardioRisk,
		hasSulfiteAllergy,
		hasAsthma,
		isPregnant,
		techniqueId,
		needleType,
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

	const handleCopyDiary = () => {
		navigator.clipboard.writeText(calcResult.diaryEntryRu);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handleApply = () => {
		if (onApplyToDiary) {
			onApplyToDiary(calcResult.diaryEntryRu, calcResult);
		}
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="anesthesia-modal-overlay">
			<div className="anesthesia-modal-container" style={{ maxWidth: '820px' }}>
				{/* Header */}
				<div className="anesthesia-modal-header">
					<div className="anesthesia-header-title">
						<Syringe size={22} color="var(--brand-primary, var(--teal))" />
						<span>Протокол местной анестезии & Калькулятор безопасности доз</span>
						<span className="anesthesia-header-badge">СтАР / Минздрав РФ</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="anesthesia-btn"
						style={{ minHeight: '32px', minWidth: '32px', padding: '0.25rem', border: 'none' }}
					>
						<X size={20} />
					</button>
				</div>

				{/* Body */}
				<div className="anesthesia-modal-body" style={{ maxHeight: 'calc(88vh - 140px)', overflowY: 'auto' }}>
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
								marginBottom: '0.75rem',
								display: 'flex',
								alignItems: 'center',
								gap: '0.5rem'
							}}
						>
							<AlertTriangle size={16} />
							<span>{expValidation.warningRu}</span>
						</div>
					)}

					{/* Patient Vitals & Risk Bar */}
					<div style={{ background: 'var(--paper-strong, #f8fafc)', padding: '0.875rem 1rem', borderRadius: '10px', border: '1px solid var(--line, #e2e8f0)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
						{/* Weight with Direct Numeric Input */}
						<div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
								<label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)' }}>
									Масса тела (кг):
								</label>
								<input
									type="number"
									autoFocus
									min={5}
									max={250}
									value={patientWeightKg}
									onChange={e => setPatientWeightKg(Math.max(5, parseInt(e.target.value) || 70))}
									style={{ width: '60px', height: '26px', fontSize: '0.8125rem', fontWeight: 700, textAlign: 'center', borderRadius: '4px', border: '1px solid var(--line, #e2e8f0)' }}
								/>
							</div>
							<input
								type="range"
								min={15}
								max={140}
								step={1}
								value={patientWeightKg}
								onChange={e => setPatientWeightKg(parseInt(e.target.value) || 70)}
								style={{ width: '100%' }}
							/>
						</div>

						{/* Age with Direct Numeric Input */}
						<div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
								<label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)' }}>
									Возраст (лет):
								</label>
								<input
									type="number"
									min={1}
									max={110}
									value={patientAgeYears}
									onChange={e => setPatientAgeYears(Math.max(1, parseInt(e.target.value) || 35))}
									style={{ width: '60px', height: '26px', fontSize: '0.8125rem', fontWeight: 700, textAlign: 'center', borderRadius: '4px', border: '1px solid var(--line, #e2e8f0)' }}
								/>
							</div>
							<input
								type="range"
								min={4}
								max={95}
								step={1}
								value={patientAgeYears}
								onChange={e => setPatientAgeYears(parseInt(e.target.value) || 35)}
								style={{ width: '100%' }}
							/>
						</div>

						{/* Preoperative Hemodynamics (АД, ЧСС) */}
						<div>
							<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
								АД (мм рт. ст.) / ЧСС (уд/мин)
							</label>
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem' }}>
								<input
									type="number"
									value={bpSystolic}
									onChange={e => setBpSystolic(parseInt(e.target.value) || 120)}
									style={{ height: '32px', fontSize: '0.75rem', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)' }}
									placeholder="120"
									title="Систолическое АД"
								/>
								<input
									type="number"
									value={bpDiastolic}
									onChange={e => setBpDiastolic(parseInt(e.target.value) || 80)}
									style={{ height: '32px', fontSize: '0.75rem', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)' }}
									placeholder="80"
									title="Диастолическое АД"
								/>
								<input
									type="number"
									value={heartRateBpm}
									onChange={e => setHeartRateBpm(parseInt(e.target.value) || 72)}
									style={{ height: '32px', fontSize: '0.75rem', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)' }}
									placeholder="72"
									title="ЧСС"
								/>
							</div>
						</div>

						{/* ASA Status & Tooth */}
						<div>
							<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
								ASA & Зуб FDI
							</label>
							<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.25rem' }}>
								<select
									value={asaStatus}
									onChange={e => setAsaStatus(e.target.value as AsaPhysicalStatus)}
									style={{ height: '32px', padding: '0.25rem', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', fontSize: '0.75rem' }}
								>
									{Object.entries(ASA_CLASSIFICATIONS).map(([key, val]) => (
										<option key={key} value={key}>
											{val.nameRu.split(':')[0]}
										</option>
									))}
								</select>
								<input
									type="text"
									value={targetTooth}
									onChange={e => setTargetTooth(e.target.value)}
									style={{ height: '32px', padding: '0.25rem', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', fontSize: '0.8125rem', textAlign: 'center' }}
									placeholder="46"
								/>
							</div>
						</div>
					</div>

					{/* Carpule Batch Tracking & Nurse Row */}
					<div style={{ background: 'var(--paper, #ffffff)', padding: '0.625rem 0.875rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
						<div>
							<label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>Серия карпулы:</label>
							<input
								type="text"
								value={seriesNumber}
								onChange={e => setSeriesNumber(e.target.value)}
								style={{ width: '100%', height: '30px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--line, #e2e8f0)', padding: '0.25rem' }}
								placeholder="ART-2026"
							/>
						</div>
						<div>
							<label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>Номер партии:</label>
							<input
								type="text"
								value={batchNumber}
								onChange={e => setBatchNumber(e.target.value)}
								style={{ width: '100%', height: '30px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--line, #e2e8f0)', padding: '0.25rem' }}
								placeholder="84019"
							/>
						</div>
						<div>
							<label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>Срок годности:</label>
							<input
								type="text"
								value={expirationDate}
								onChange={e => setExpirationDate(e.target.value)}
								style={{ width: '100%', height: '30px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--line, #e2e8f0)', padding: '0.25rem' }}
								placeholder="2027-06"
							/>
						</div>
						<div>
							<label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>Ассистент / Медсестра:</label>
							<input
								type="text"
								value={assistantName}
								onChange={e => setAssistantName(e.target.value)}
								style={{ width: '100%', height: '30px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--line, #e2e8f0)', padding: '0.25rem' }}
								placeholder="ФИО медсестры"
							/>
						</div>
					</div>

					{/* Risk Checkboxes */}
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
						<label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
							<input
								type="checkbox"
								checked={hasCardioRisk}
								onChange={e => setHasCardioRisk(e.target.checked)}
							/>
							<Heart size={14} color="var(--bad, #ef4444)" />
							Сердечно-сосудистый риск / Гипертония
						</label>

						<label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
							<input
								type="checkbox"
								checked={hasSulfiteAllergy}
								onChange={e => setHasSulfiteAllergy(e.target.checked)}
							/>
							Аллергия на сульфиты (E223)
						</label>

						<label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
							<input
								type="checkbox"
								checked={hasAsthma}
								onChange={e => setHasAsthma(e.target.checked)}
							/>
							Бронхиальная астма
						</label>

						<label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
							<input
								type="checkbox"
								checked={isPregnant}
								onChange={e => setIsPregnant(e.target.checked)}
							/>
							Беременность / Лактация
						</label>
					</div>

					{/* Drug Selection Cards */}
					<div style={{ marginBottom: '0.75rem' }}>
						<div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.375rem' }}>
							Выберите препарат местного анестетика:
						</div>
						<div className="anesthesia-drugs-grid">
							{Object.values(DENTAL_ANESTHETICS).map(drug => (
								<div
									key={drug.id}
									className={`anesthesia-drug-card ${selectedDrugId === drug.id ? 'selected' : ''}`}
									onClick={() => setSelectedDrugId(drug.id)}
								>
									<div className="drug-card-header">
										<span className="drug-card-title">{drug.tradeNamesRu[0]}</span>
										<span className={`drug-epi-pill ${drug.isAdrenalineFree ? 'no-epi' : 'has-epi'}`}>
											{drug.vasoconstrictorRatio === 'none' ? 'Без адреналина' : drug.vasoconstrictorRatio}
										</span>
									</div>
									<div className="drug-card-substance">{drug.activeSubstanceRu}</div>
									<div style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>
										Карпула: {drug.carpuleVolumeMl} мл • МРД: {drug.maxDoseMgPerKgAdult} мг/кг
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Technique & Carpules Stepper */}
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
						<div>
							<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
								Методика анестезии
							</label>
							<select
								value={techniqueId}
								onChange={e => handleTechniqueChange(e.target.value as InjectionTechniqueId)}
								style={{ width: '100%', minHeight: '36px', padding: '0.375rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', fontSize: '0.8125rem' }}
							>
								{Object.values(INJECTION_TECHNIQUES).map(tech => (
									<option key={tech.id} value={tech.id}>
										{tech.nameRu}
									</option>
								))}
							</select>
						</div>

						<div>
							<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
								Размер иглы
							</label>
							<select
								value={needleType}
								onChange={e => setNeedleType(e.target.value as NeedleGaugeType)}
								style={{ width: '100%', minHeight: '36px', padding: '0.375rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', fontSize: '0.8125rem' }}
							>
								{Object.values(DENTAL_NEEDLES).map(needle => (
									<option key={needle.id} value={needle.id}>
										{needle.nameRu}
									</option>
								))}
							</select>
						</div>

						<div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
								<label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)' }}>
									Карпулы: <strong>{carpulesCount} шт.</strong> ({calcResult.injectedVolumeMl} мл)
								</label>
								<input
									type="number"
									min={0.5}
									max={10}
									step={0.5}
									value={carpulesCount}
									onChange={e => setCarpulesCount(Math.max(0.5, parseFloat(e.target.value) || 1.0))}
									style={{ width: '54px', height: '24px', fontSize: '0.75rem', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--line, #e2e8f0)' }}
								/>
							</div>
							<input
								type="range"
								min={0.5}
								max={6.0}
								step={0.5}
								value={carpulesCount}
								onChange={e => setCarpulesCount(parseFloat(e.target.value))}
								style={{ width: '100%' }}
							/>
						</div>
					</div>

					{/* Live Safety Meter */}
					<div className="anesthesia-safety-meter" style={{ marginBottom: '0.75rem' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<span style={{ fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
								<Activity size={16} />
								Шкала токсической и кардиоваскулярной безопасности:
							</span>
							<span style={{ fontSize: '0.8125rem', fontWeight: 700, color: calcResult.safetyZone === 'safe' ? 'var(--ok-fg)' : calcResult.safetyZone === 'caution' ? 'var(--ok-fg)' : calcResult.safetyZone === 'warning' ? 'var(--warn-fg, #d97706)' : 'var(--bad-fg)' }}>
								{calcResult.safetyZone === 'safe' && 'БЕЗОПАСНО (ЗЕЛЕНАЯ ЗОНА)'}
								{calcResult.safetyZone === 'caution' && 'УМЕРЕННАЯ НАГРУЗКА (ЖЕЛТАЯ ЗОНА)'}
								{calcResult.safetyZone === 'warning' && 'ПРЕДЕЛ (ОРАНЖЕВАЯ ЗОНА)'}
								{calcResult.safetyZone === 'overdose_danger' && 'ОПАСНОСТЬ: ПРЕВЫШЕНИЕ МРД!'}
							</span>
						</div>

						<div className="safety-meter-bar-container">
							<div
								className={`safety-meter-bar-fill ${calcResult.safetyZone}`}
								style={{ width: `${Math.min(100, Math.max(calcResult.percentOfMaxDose, calcResult.percentOfEpiMaxDose))}%` }}
							/>
						</div>

						{/* Metrics Boxes */}
						<div className="anesthesia-metrics-grid">
							<div className="anesthesia-metric-box">
								<span className="metric-label">Действующее вещ-во</span>
								<span className="metric-value">{calcResult.injectedActiveMg} / {calcResult.maxSafeActiveMg} мг</span>
								<span style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>{calcResult.percentOfMaxDose}% от МРД</span>
							</div>

							<div className="anesthesia-metric-box">
								<span className="metric-label">Эпинефрин (Адреналин)</span>
								<span className="metric-value">
									{calcResult.drug.isAdrenalineFree ? '0 мг (Free)' : `${calcResult.injectedEpinephrineMg.toFixed(3)} мг`}
								</span>
								<span style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>
									Лимит: {calcResult.maxSafeEpinephrineMg.toFixed(2)} мг ({calcResult.percentOfEpiMaxDose}%)
								</span>
							</div>

							<div className="anesthesia-metric-box">
								<span className="metric-label">Макс. карпул</span>
								<span className="metric-value">{calcResult.maxSafeCarpulesCount} карп.</span>
								<span style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>Введено: {carpulesCount} карп.</span>
							</div>
						</div>
					</div>

					{/* Blocking Alerts */}
					{calcResult.contraindicationsTriggered.length > 0 && (
						<div className="anesthesia-alert-box danger" style={{ marginBottom: '0.75rem' }}>
							<ShieldAlert size={20} />
							<div>
								<strong>КРИТИЧЕСКИЕ ПРОТИВОПОКАЗАНИЯ:</strong>
								{calcResult.contraindicationsTriggered.map((c, i) => (
									<div key={i} style={{ marginTop: '0.25rem' }}>• {c}</div>
								))}
							</div>
						</div>
					)}

					{/* Warnings */}
					{calcResult.warnings.length > 0 && calcResult.contraindicationsTriggered.length === 0 && (
						<div className="anesthesia-alert-box warning" style={{ marginBottom: '0.75rem' }}>
							<AlertTriangle size={18} />
							<div>
								{calcResult.warnings.map((w, i) => (
									<div key={i} style={{ marginBottom: '0.25rem' }}>{w}</div>
								))}
							</div>
						</div>
					)}

					{/* Aspiration Checkbox */}
					<div style={{ background: 'var(--paper, #fff)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
						<input
							type="checkbox"
							id="asp-check"
							checked={aspirationConfirmed}
							onChange={e => setAspirationConfirmed(e.target.checked)}
						/>
						<label htmlFor="asp-check" style={{ fontSize: '0.8125rem', cursor: 'pointer' }}>
							<ShieldCheck size={16} color={aspirationConfirmed ? 'var(--ok-fg)' : 'var(--muted, #64748b)'} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
							<strong>Аспирационная проба отрицательна</strong> (кровь в карпуле отсутствует)
						</label>
					</div>

					{/* Diary Snippet Box */}
					<div style={{ background: 'var(--paper-strong, #f8fafc)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
							<span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
								<FileText size={14} />
								Готовая запись в Дневник амбулаторной карты 043/у:
							</span>
							<button
								type="button"
								onClick={handleCopyDiary}
								className="anesthesia-btn"
								style={{ minHeight: '30px', padding: '0.125rem 0.5rem', fontSize: '0.75rem' }}
							>
								{isCopied ? <Check size={14} color="var(--ok-fg)" /> : <Copy size={14} />}
								<span>{isCopied ? 'Скопировано!' : 'Скопировать'}</span>
							</button>
						</div>
						<div className="anesthesia-diary-box">
							{calcResult.diaryEntryRu}
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="anesthesia-modal-footer">
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
						onClick={handleApply}
						disabled={calcResult.isOverdose || calcResult.contraindicationsTriggered.length > 0}
						className={`anesthesia-btn ${calcResult.isOverdose || calcResult.contraindicationsTriggered.length > 0 ? 'disabled' : 'anesthesia-btn-primary'}`}
						style={{ minHeight: '36px' }}
					>
						<CheckCircle2 size={16} />
						Применить протокол в карту (043/у)
					</button>
				</div>
			</div>
		</div>
	);
}
