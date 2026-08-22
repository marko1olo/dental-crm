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
	Check
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
import './anesthesia.css';

export interface AnesthesiaProtocolModalProps {
	isOpen: boolean;
	onClose: () => void;
	onApplyToDiary?: (diaryText: string, result: AnesthesiaCalculationResult) => void;
	initialToothNumber?: number | string;
	initialPatientWeightKg?: number;
	initialPatientAgeYears?: number;
	initialHasCardioRisk?: boolean;
}

export function AnesthesiaProtocolModal({
	isOpen,
	onClose,
	onApplyToDiary,
	initialToothNumber = 46,
	initialPatientWeightKg = 70,
	initialPatientAgeYears = 35,
	initialHasCardioRisk = false
}: AnesthesiaProtocolModalProps) {
	const [selectedDrugId, setSelectedDrugId] = useState<AnestheticDrugId>('articaine_1_100k');
	const [carpulesCount, setCarpulesCount] = useState<number>(1.0);
	const [patientWeightKg, setPatientWeightKg] = useState<number>(initialPatientWeightKg);
	const [patientAgeYears, setPatientAgeYears] = useState<number>(initialPatientAgeYears);
	const [asaStatus, setAsaStatus] = useState<AsaPhysicalStatus>(initialHasCardioRisk ? 'asa_3' : 'asa_1');

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
			hasCardiovascularRisk: hasCardioRisk,
			hasSulfiteAllergy,
			hasBronchialAsthma: hasAsthma,
			isPregnantOrLactating: isPregnant,
			techniqueId,
			needleType,
			targetToothNumberFdi: targetTooth,
			aspirationNegativeConfirmed: aspirationConfirmed
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
		aspirationConfirmed
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
			<div className="anesthesia-modal-container">
				{/* Header */}
				<div className="anesthesia-modal-header">
					<div className="anesthesia-header-title">
						<Syringe size={22} color="var(--brand-500, #3b82f6)" />
						<span>Протокол местной анестезии & Калькулятор безопасности доз</span>
						<span className="anesthesia-header-badge">СтАР / Минздрав РФ</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="anesthesia-btn"
						style={{ minHeight: '36px', minWidth: '36px', padding: '0.25rem', border: 'none' }}
					>
						<X size={20} />
					</button>
				</div>

				{/* Body */}
				<div className="anesthesia-modal-body">
					{/* Patient Vitals & Risk Bar */}
					<div style={{ background: 'var(--paper-strong, #f8fafc)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--line, #e2e8f0)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
						{/* Weight */}
						<div>
							<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
								Масса тела пациента: <strong>{patientWeightKg} кг</strong>
							</label>
							<input
								type="range"
								min={15}
								max={140}
								step={1}
								value={patientWeightKg}
								onChange={e => setPatientWeightKg(parseInt(e.target.value))}
								style={{ width: '100%' }}
							/>
						</div>

						{/* Age */}
						<div>
							<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
								Возраст: <strong>{patientAgeYears} лет</strong> ({calcResult.ageCategory === 'pediatric' ? 'Детский' : calcResult.ageCategory === 'geriatric' ? 'Пожилой (x0.7)' : 'Взрослый'})
							</label>
							<input
								type="range"
								min={4}
								max={95}
								step={1}
								value={patientAgeYears}
								onChange={e => setPatientAgeYears(parseInt(e.target.value))}
								style={{ width: '100%' }}
							/>
						</div>

						{/* ASA Status */}
						<div>
							<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
								Соматический статус (ASA)
							</label>
							<select
								value={asaStatus}
								onChange={e => setAsaStatus(e.target.value as AsaPhysicalStatus)}
								style={{ width: '100%', minHeight: '38px', padding: '0.375rem', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', fontSize: '0.8125rem' }}
							>
								{Object.entries(ASA_CLASSIFICATIONS).map(([key, val]) => (
									<option key={key} value={key}>
										{val.nameRu} (Лимит адреналина {val.epiLimitMg} мг)
									</option>
								))}
							</select>
						</div>

						{/* Tooth FDI */}
						<div>
							<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
								Зуб (FDI)
							</label>
							<input
								type="text"
								value={targetTooth}
								onChange={e => setTargetTooth(e.target.value)}
								style={{ width: '100%', minHeight: '38px', padding: '0.375rem', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', fontSize: '0.8125rem' }}
							/>
						</div>
					</div>

					{/* Risk Checkboxes */}
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8125rem' }}>
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
					<div>
						<div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.5rem' }}>
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
										Карпула: {drug.carpuleVolumeMl} мл • МДД: {drug.maxDoseMgPerKgAdult} мг/кг (до {drug.maxCarpules70kgAdult} карп.)
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Technique & Carpules Stepper */}
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
						<div>
							<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
								Методика анестезии
							</label>
							<select
								value={techniqueId}
								onChange={e => handleTechniqueChange(e.target.value as InjectionTechniqueId)}
								style={{ width: '100%', minHeight: '44px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)' }}
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
								style={{ width: '100%', minHeight: '44px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)' }}
							>
								{Object.values(DENTAL_NEEDLES).map(needle => (
									<option key={needle.id} value={needle.id}>
										{needle.nameRu}
									</option>
								))}
							</select>
						</div>

						<div>
							<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
								Количество карпул: <strong>{carpulesCount} шт.</strong> ({calcResult.injectedVolumeMl} мл)
							</label>
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
					<div className="anesthesia-safety-meter">
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<span style={{ fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
								<Activity size={16} />
								Шкала токсической и кардиоваскулярной безопасности:
							</span>
							<span style={{ fontSize: '0.8125rem', fontWeight: 700, color: calcResult.safetyZone === 'safe' ? 'var(--ok, #10b981)' : calcResult.safetyZone === 'caution' ? '#84cc16' : calcResult.safetyZone === 'warning' ? 'var(--warn, #f59e0b)' : 'var(--bad, #ef4444)' }}>
								{calcResult.safetyZone === 'safe' && 'БЕЗОПАСНО (ЗЕЛЕНАЯ ЗОНА)'}
								{calcResult.safetyZone === 'caution' && 'ВНИМАНИЕ (ЖЕЛТАЯ ЗОНА)'}
								{calcResult.safetyZone === 'warning' && 'ПРЕДЕЛ (ОРАНЖЕВАЯ ЗОНА)'}
								{calcResult.safetyZone === 'overdose_danger' && 'ОПАСНОСТЬ: ПРЕВЫШЕНИЕ МДД!'}
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
								<span style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>
									{calcResult.percentOfMaxDose}% от МДД
								</span>
							</div>

							<div className="anesthesia-metric-box">
								<span className="metric-label">Эпинефрин (Адреналин)</span>
								<span className="metric-value">
									{calcResult.drug.isAdrenalineFree ? '0.00 мг' : `${calcResult.injectedEpinephrineMg.toFixed(3)} мг`}
								</span>
								<span style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>
									Лимит: {calcResult.maxSafeEpinephrineMg.toFixed(2)} мг ({calcResult.percentOfEpiMaxDose}%)
								</span>
							</div>

							<div className="anesthesia-metric-box">
								<span className="metric-label">Макс. карпул для пациента</span>
								<span className="metric-value">{calcResult.maxSafeCarpulesCount} карп.</span>
								<span style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>
									Введено: {carpulesCount} карп.
								</span>
							</div>
						</div>
					</div>

					{/* Contraindications & Warnings */}
					{calcResult.contraindicationsTriggered.length > 0 && (
						<div className="anesthesia-alert-box danger">
							<ShieldAlert size={18} />
							<div>
								{calcResult.contraindicationsTriggered.map((c, i) => (
									<div key={i}>{c}</div>
								))}
							</div>
						</div>
					)}

					{calcResult.warnings.length > 0 && (
						<div className="anesthesia-alert-box warning">
							<AlertTriangle size={18} />
							<div>
								{calcResult.warnings.map((w, i) => (
									<div key={i}>{w}</div>
								))}
							</div>
						</div>
					)}

					{/* Aspiration Test Confirmation Checkbox */}
					<div style={{ background: 'var(--paper-strong, #f8fafc)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)' }}>
						<label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
							<input
								type="checkbox"
								checked={aspirationConfirmed}
								onChange={e => setAspirationConfirmed(e.target.checked)}
							/>
							<ShieldCheck size={18} color={aspirationConfirmed ? 'var(--ok, #10b981)' : 'var(--muted, #64748b)'} />
							Аспирационная проба отрицательна — кровь в карпуле отсутствует (проверка сосудистого русла)
						</label>
					</div>

					{/* Clinical Diary Snippet Box */}
					<div>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
							<span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted, #64748b)' }}>
								Запись для Дневника амбулаторной карты (Форма № 043/у):
							</span>
							<button
								type="button"
								onClick={handleCopyDiary}
								className="anesthesia-btn"
								style={{ minHeight: '32px', padding: '0.125rem 0.5rem', fontSize: '0.75rem' }}
							>
								{isCopied ? <Check size={14} color="var(--ok, #10b981)" /> : <Copy size={14} />}
								{isCopied ? 'Скопировано!' : 'Скопировать текст'}
							</button>
						</div>
						<div className="anesthesia-diary-box">
							{calcResult.diaryEntryRu}
						</div>
					</div>

					{/* Action Buttons */}
					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
						<button
							type="button"
							onClick={onClose}
							className="anesthesia-btn"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={handleApply}
							className="anesthesia-btn autoclave-btn-primary"
						>
							<CheckCircle2 size={16} />
							Применить протокол анестезии
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
