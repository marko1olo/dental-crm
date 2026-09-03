import React, { useState, useMemo } from 'react';
import {
	X,
	Activity,
	Gauge,
	ShieldCheck,
	AlertTriangle,
	CheckCircle2,
	Copy,
	Check,
	Compass,
	Clock,
	Layers,
	FileText,
	Award
} from 'lucide-react';
import {
	MischBoneDensity,
	MISCH_BONE_DENSITIES,
	TORQUE_STANDARDS,
	ISQ_THRESHOLDS
} from './implantIsqPresets';
import {
	DirectionalIsqReadings,
	evaluateImplantIsqStability,
	ImplantIsqAssessmentResult
} from './implantIsqEngine';
import './implantIsq.css';

export interface ImplantIsqProtocolModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSaveProtocol?: (result: ImplantIsqAssessmentResult) => void;
	initialToothNumber?: number | string;
	initialImplantSystem?: string;
	initialDiameterMm?: number;
	initialLengthMm?: number;
	surgeonName?: string;
}

const COMMON_IMPLANT_SYSTEMS = [
	'Straumann BLX Roxolid SLActive',
	'Straumann Bone Level Tapered (BLT)',
	'Nobel Biocare NobelActive TiUltra',
	'Nobel Biocare NobelReplace CC',
	'Osstem TS III SA',
	'Dentium SuperLine',
	'Astra Tech OsseoSpeed EV'
];

export function ImplantIsqProtocolModal({
	isOpen,
	onClose,
	onSaveProtocol,
	initialToothNumber = 36,
	initialImplantSystem = 'Straumann BLX Roxolid SLActive',
	initialDiameterMm = 4.0,
	initialLengthMm = 10.0,
	surgeonName = 'Хирург-имплантолог'
}: ImplantIsqProtocolModalProps) {
	const [implantSystem, setImplantSystem] = useState<string>(initialImplantSystem);
	const [toothNumber, setToothNumber] = useState<string | number>(initialToothNumber);
	const [diameterMm, setDiameterMm] = useState<number>(initialDiameterMm);
	const [lengthMm, setLengthMm] = useState<number>(initialLengthMm);
	const [boneDensity, setBoneDensity] = useState<MischBoneDensity>('D2');

	// Surgical variables
	const [insertionTorqueNcm, setInsertionTorqueNcm] = useState<number>(38);
	const [isqReadings, setIsqReadings] = useState<DirectionalIsqReadings>({
		vestibularBuccal: 72,
		lingualPalatal: 74,
		mesial: 70,
		distal: 71
	});
	const [isGbr, setIsGbr] = useState<boolean>(false);
	const [isImmediateExtraction, setIsImmediateExtraction] = useState<boolean>(false);

	const [isCopiedDiary, setIsCopiedDiary] = useState<boolean>(false);
	const [isCopiedPassport, setIsCopiedPassport] = useState<boolean>(false);

	// Evaluation result
	const assessment: ImplantIsqAssessmentResult = useMemo(() => {
		return evaluateImplantIsqStability({
			implantSystemName: implantSystem,
			diameterMm,
			lengthMm,
			toothNumberFdi: toothNumber,
			insertionTorqueNcm,
			boneDensity,
			isqReadings,
			isGbrOrSinusLift: isGbr,
			isImmediateExtractionSocket: isImmediateExtraction,
			surgeonName
		});
	}, [
		implantSystem,
		diameterMm,
		lengthMm,
		toothNumber,
		insertionTorqueNcm,
		boneDensity,
		isqReadings,
		isGbr,
		isImmediateExtraction,
		surgeonName
	]);

	const handleDirectionalIsqChange = (key: keyof DirectionalIsqReadings, val: number) => {
		const clamped = Math.max(1, Math.min(100, val || 0));
		setIsqReadings(prev => ({ ...prev, [key]: clamped }));
	};

	const handleCopyDiary = () => {
		navigator.clipboard.writeText(assessment.diaryEntryRu);
		setIsCopiedDiary(true);
		setTimeout(() => setIsCopiedDiary(false), 2000);
	};

	const handleCopyPassport = () => {
		navigator.clipboard.writeText(assessment.implantPassportSnippetRu);
		setIsCopiedPassport(true);
		setTimeout(() => setIsCopiedPassport(false), 2000);
	};

	const handleSave = () => {
		if (onSaveProtocol) {
			onSaveProtocol(assessment);
		}
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="isq-modal-overlay">
			<div className="isq-modal-container">
				{/* Modal Header */}
				<div className="isq-modal-header">
					<div className="isq-header-title">
						<Activity size={22} color="var(--brand-500, #3b82f6)" />
						<span>Дентальная имплантация: Торк & RFA ISQ Остеоинтеграция</span>
						<span className="isq-header-badge">Osstell / Penguin RFA</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="isq-btn"
						style={{ minHeight: '44px', minWidth: '44px', padding: '0.5rem', border: 'none' }}
						aria-label="Закрыть модальное окно"
					>
						<X size={20} />
					</button>
				</div>

				{/* Modal Body */}
				<div className="isq-modal-body">
					{/* Implant Fixture Parameters */}
					<div style={{ background: 'var(--paper-strong, #f8fafc)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--line, #e2e8f0)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
						<div>
							<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
								Имплантационная система
							</label>
							<select
								value={implantSystem}
								onChange={e => setImplantSystem(e.target.value)}
								style={{ width: '100%', minHeight: '44px', padding: '0.375rem 0.5rem', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', fontSize: '0.8125rem' }}
							>
								{COMMON_IMPLANT_SYSTEMS.map(sys => (
									<option key={sys} value={sys}>
										{sys}
									</option>
								))}
							</select>
						</div>

						<div>
							<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
								Зуб (FDI) / Размеры
							</label>
							<div style={{ display: 'flex', gap: '0.375rem' }}>
								<input
									type="text"
									value={toothNumber}
									onChange={e => setToothNumber(e.target.value)}
									style={{ width: '60px', minHeight: '44px', padding: '0.375rem', textAlign: 'center', fontWeight: 700, borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)' }}
								/>
								<span style={{ display: 'flex', alignItems: 'center', fontSize: '0.8125rem' }}>Ø</span>
								<input
									type="number"
									step={0.1}
									value={diameterMm}
									onChange={e => setDiameterMm(parseFloat(e.target.value))}
									style={{ width: '60px', minHeight: '44px', padding: '0.375rem', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)' }}
								/>
								<span style={{ display: 'flex', alignItems: 'center', fontSize: '0.8125rem' }}>x</span>
								<input
									type="number"
									step={0.5}
									value={lengthMm}
									onChange={e => setLengthMm(parseFloat(e.target.value))}
									style={{ width: '60px', minHeight: '44px', padding: '0.375rem', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)' }}
								/>
							</div>
						</div>

						<div>
							<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
								Плотность кости (Misch)
							</label>
							<select
								value={boneDensity}
								onChange={e => setBoneDensity(e.target.value as MischBoneDensity)}
								style={{ width: '100%', minHeight: '44px', padding: '0.375rem 0.5rem', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', fontSize: '0.8125rem' }}
							>
								{Object.entries(MISCH_BONE_DENSITIES).map(([key, val]) => (
									<option key={key} value={key}>
										{val.nameRu}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Surgical Flags */}
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8125rem' }}>
						<label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
							<input
								type="checkbox"
								checked={isGbr}
								onChange={e => setIsGbr(e.target.checked)}
							/>
							НКР / Костная аугментация / Синус-лифтинг
						</label>
						<label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
							<input
								type="checkbox"
								checked={isImmediateExtraction}
								onChange={e => setIsImmediateExtraction(e.target.checked)}
							/>
							Одномоментная имплантация в лунку удаленного зуба
						</label>
					</div>

					{/* Sensor Instruments: Torque Gauge & 4-Directional ISQ */}
					<div className="isq-sensors-grid">
						{/* Panel 1: Insertion Torque Gauge */}
						<div className="isq-sensor-card">
							<div className="isq-card-title">
								<Gauge size={18} color="var(--brand-500, #3b82f6)" />
								Первичный торк введения (Н·см)
							</div>

							<div className="torque-display-large">
								{insertionTorqueNcm} <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>Н·см</span>
							</div>

							<div
								className="torque-band-badge"
								style={{
									background: assessment.torqueCategory === 'high_stability' ? 'rgba(16, 185, 129, 0.15)' : assessment.torqueCategory === 'standard_stability' ? 'rgba(59, 130, 246, 0.15)' : assessment.torqueCategory === 'excessive_torque_risk' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
									color: assessment.torqueCategory === 'high_stability' ? 'var(--ok, #10b981)' : assessment.torqueCategory === 'standard_stability' ? 'var(--brand-500, #3b82f6)' : assessment.torqueCategory === 'excessive_torque_risk' ? 'var(--bad, #ef4444)' : 'var(--warn, #f59e0b)'
								}}
							>
								{assessment.torqueStatusRu}
							</div>

							<input
								type="range"
								min={5}
								max={70}
								step={1}
								value={insertionTorqueNcm}
								onChange={e => setInsertionTorqueNcm(parseInt(e.target.value))}
								style={{ width: '100%' }}
							/>

							<div style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)', textAlign: 'center' }}>
								{TORQUE_STANDARDS[assessment.torqueCategory].clinicalImplicationRu}
							</div>
						</div>

						{/* Panel 2: 4-Directional ISQ RFA Compass */}
						<div className="isq-sensor-card">
							<div className="isq-card-title">
								<Compass size={18} color="var(--ok, #10b981)" />
								RFA Датчики ISQ (4 направления)
							</div>

							{/* Compass Matrix */}
							<div className="isq-cross-container">
								<div />
								{/* Vestibular */}
								<div className="isq-direction-box">
									<span className="isq-direction-label">Вестиб. (V)</span>
									<input
										type="number"
										value={isqReadings.vestibularBuccal}
										onChange={e => handleDirectionalIsqChange('vestibularBuccal', parseInt(e.target.value))}
										className="isq-direction-input"
									/>
								</div>
								<div />

								{/* Mesial */}
								<div className="isq-direction-box">
									<span className="isq-direction-label">Медиал. (M)</span>
									<input
										type="number"
										value={isqReadings.mesial}
										onChange={e => handleDirectionalIsqChange('mesial', parseInt(e.target.value))}
										className="isq-direction-input"
									/>
								</div>

								{/* Center: Mean ISQ Badge */}
								<div style={{ textAlign: 'center' }}>
									<div style={{ fontSize: '1.5rem', fontWeight: 800, color: assessment.meanIsq >= 70 ? 'var(--ok, #10b981)' : assessment.meanIsq >= 60 ? 'var(--warn, #f59e0b)' : 'var(--bad, #ef4444)' }}>
										{assessment.meanIsq}
									</div>
									<div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--muted, #64748b)' }}>ISQ СРЕДНИЙ</div>
								</div>

								{/* Distal */}
								<div className="isq-direction-box">
									<span className="isq-direction-label">Дистал. (D)</span>
									<input
										type="number"
										value={isqReadings.distal}
										onChange={e => handleDirectionalIsqChange('distal', parseInt(e.target.value))}
										className="isq-direction-input"
									/>
								</div>

								<div />
								{/* Lingual */}
								<div className="isq-direction-box">
									<span className="isq-direction-label">Язычн. (L)</span>
									<input
										type="number"
										value={isqReadings.lingualPalatal}
										onChange={e => handleDirectionalIsqChange('lingualPalatal', parseInt(e.target.value))}
										className="isq-direction-input"
									/>
								</div>
								<div />
							</div>

							<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted, #64748b)', borderTop: '1px solid var(--line, #e2e8f0)', paddingTop: '0.375rem' }}>
								<span>Мин: <strong>{assessment.minIsq}</strong> / Макс: <strong>{assessment.maxIsq}</strong></span>
								<span>Анизотропия Δ: <strong>{assessment.anisotropyDeltaIsq} ISQ</strong></span>
							</div>
						</div>
					</div>

					{/* Smart Clinical Recommendation Banner */}
					<div
						className={`isq-recommendation-banner ${assessment.loadingRecommendation === 'immediate_loading_safe' ? 'immediate' : assessment.loadingRecommendation === 'extended_healing_gbr' ? 'extended' : 'delayed'}`}
					>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink, #0f172a)' }}>
							<ShieldCheck size={20} color={assessment.loadingRecommendation === 'immediate_loading_safe' ? 'var(--ok, #10b981)' : 'var(--brand-500, #3b82f6)'} />
							{assessment.loadingRecommendationTitleRu}
						</div>
						<div style={{ fontSize: '0.8125rem', color: 'var(--ink, #0f172a)' }}>
							{assessment.clinicalRationaleRu}
						</div>
					</div>

					{/* Warnings */}
					{assessment.warnings.length > 0 && (
						<div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', color: 'var(--warn, #f59e0b)', fontSize: '0.8125rem' }}>
							<AlertTriangle size={18} />
							<div>
								{assessment.warnings.map((w, i) => (
									<div key={i}>{w}</div>
								))}
							</div>
						</div>
					)}

					{/* Osseointegration Timeline Preview */}
					<div>
						<div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.5rem' }}>
							Динамика остеоинтеграции и фазы ремоделирования кости:
						</div>
						<div className="isq-timeline-stages">
							<div className="isq-timeline-stage-card">
								<span style={{ fontWeight: 700, fontSize: '0.75rem' }}>1. День 0 (Установка)</span>
								<span style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>Первичная механическая стабильность (торк {insertionTorqueNcm} Н·см, ISQ {assessment.meanIsq})</span>
							</div>
							<div className="isq-timeline-stage-card">
								<span style={{ fontWeight: 700, fontSize: '0.75rem' }}>2. Недели 2–4 (Ремоделирование)</span>
								<span style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>Критический провал стабильности (остеокластическая резорбция micro-bone)</span>
							</div>
							<div className="isq-timeline-stage-card">
								<span style={{ fontWeight: 700, fontSize: '0.75rem' }}>3. Недели 6–8 (Ранняя фиксация)</span>
								<span style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>Вторичная остеоинтеграция (формирование ламеллярной кости)</span>
							</div>
							<div className="isq-timeline-stage-card">
								<span style={{ fontWeight: 700, fontSize: '0.75rem' }}>4. Неделя 12 (Зрелая интеграция)</span>
								<span style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>Зрелая костная мозоль, окончательное протезирование постоянной коронкой</span>
							</div>
						</div>
					</div>

					{/* Clinical Diary & Passport Boxes */}
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
						<div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
								<span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted, #64748b)' }}>Протокол операции (Форма № 043/у):</span>
								<button
									type="button"
									onClick={handleCopyDiary}
									className="isq-btn"
									style={{ minHeight: '44px', minWidth: '44px', padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
									aria-label="Скопировать протокол операции"
								>
									{isCopiedDiary ? <Check size={16} color="var(--ok, #10b981)" /> : <Copy size={16} />}
									Копировать
								</button>
							</div>
							<div className="isq-diary-box" style={{ minHeight: '80px' }}>
								{assessment.diaryEntryRu}
							</div>
						</div>

						<div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
								<span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted, #64748b)' }}>Паспорт имплантата:</span>
								<button
									type="button"
									onClick={handleCopyPassport}
									className="isq-btn"
									style={{ minHeight: '44px', minWidth: '44px', padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
									aria-label="Скопировать паспорт имплантата"
								>
									{isCopiedPassport ? <Check size={16} color="var(--ok, #10b981)" /> : <Copy size={16} />}
									Копировать
								</button>
							</div>
							<div className="isq-diary-box" style={{ minHeight: '80px' }}>
								{assessment.implantPassportSnippetRu}
							</div>
						</div>
					</div>

					{/* Action Buttons */}
					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
						<button
							type="button"
							onClick={onClose}
							className="isq-btn"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={handleSave}
							className="isq-btn isq-btn-primary"
						>
							<CheckCircle2 size={16} />
							Сохранить протокол ISQ
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
