import React, { useMemo, useState, useEffect } from 'react';
import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Baby,
	Check,
	CheckCircle2,
	ChevronRight,
	Copy,
	Heart,
	Info,
	Minus,
	Plus,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Syringe,
	User,
	Wind,
	X,
	Zap,
} from 'lucide-react';
import {
	CarpuleVolumeMl,
	LimitingFactor,
	MrdCalculationResult,
	MrdDrugId,
	PediatricFormula,
	SafetyZone,
	calculateAnesthesiaMrd,
	MRD_DRUG_CATALOG,
	EPINEPHRINE_LIMITS_MG,
} from './anesthesiaMrdMath';

export interface AnesthesiaMrdCaliperModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onApplyToDiary?: ((soapText: string, result: MrdCalculationResult) => void) | undefined;
	readonly initialDrugId?: MrdDrugId | undefined;
	readonly initialWeightKg?: number | undefined;
	readonly initialAgeYears?: number | null | undefined;
	readonly initialCarpulesCount?: number | undefined;
	readonly initialCarpuleVolumeMl?: CarpuleVolumeMl | undefined;
	readonly initialIsCardiacRisk?: boolean | undefined;
	readonly initialHasSulfiteAllergy?: boolean | undefined;
	readonly initialHasBronchialAsthma?: boolean | undefined;
	readonly initialToothNumber?: number | string | undefined;
	readonly isLocked?: boolean | undefined;
}

export const AnesthesiaMrdCaliperModal: React.FC<AnesthesiaMrdCaliperModalProps> = ({
	isOpen,
	onClose,
	onApplyToDiary,
	initialDrugId = 'articaine_1_100k',
	initialWeightKg = 70,
	initialAgeYears = 35,
	initialCarpulesCount = 1.0,
	initialCarpuleVolumeMl = 1.7,
	initialIsCardiacRisk = false,
	initialHasSulfiteAllergy = false,
	initialHasBronchialAsthma = false,
	initialToothNumber = '',
	isLocked = false,
}) => {
	const [selectedDrugId, setSelectedDrugId] = useState<MrdDrugId>(initialDrugId);
	const [patientWeightKg, setPatientWeightKg] = useState<number>(initialWeightKg);
	const [patientAgeYears, setPatientAgeYears] = useState<number | null>(initialAgeYears);
	const [carpulesCount, setCarpulesCount] = useState<number>(initialCarpulesCount);
	const [carpuleVolumeMl, setCarpuleVolumeMl] = useState<CarpuleVolumeMl>(initialCarpuleVolumeMl);
	const [isCardiacRisk, setIsCardiacRisk] = useState<boolean>(initialIsCardiacRisk);
	const [hasSulfiteAllergy, setHasSulfiteAllergy] = useState<boolean>(initialHasSulfiteAllergy);
	const [hasBronchialAsthma, setHasBronchialAsthma] = useState<boolean>(initialHasBronchialAsthma);
	const [isPediatricMode, setIsPediatricMode] = useState<boolean>(() => {
		if (initialAgeYears !== null && initialAgeYears < 18) return true;
		return initialWeightKg < 40;
	});
	const [pediatricFormula, setPediatricFormula] = useState<PediatricFormula>('clark');
	const [toothNumber, setToothNumber] = useState<string>(String(initialToothNumber || ''));
	const [isCopied, setIsCopied] = useState<boolean>(false);

	// Sync when props change on opening
	useEffect(() => {
		if (isOpen) {
			setSelectedDrugId(initialDrugId);
			setPatientWeightKg(initialWeightKg);
			setPatientAgeYears(initialAgeYears);
			setCarpulesCount(initialCarpulesCount);
			setCarpuleVolumeMl(initialCarpuleVolumeMl);
			setIsCardiacRisk(initialIsCardiacRisk);
			setHasSulfiteAllergy(initialHasSulfiteAllergy);
			setHasBronchialAsthma(initialHasBronchialAsthma);
			if (initialAgeYears !== null && initialAgeYears < 18) {
				setIsPediatricMode(true);
			}
		}
	}, [
		isOpen,
		initialDrugId,
		initialWeightKg,
		initialAgeYears,
		initialCarpulesCount,
		initialCarpuleVolumeMl,
		initialIsCardiacRisk,
		initialHasSulfiteAllergy,
		initialHasBronchialAsthma,
	]);

	// Close on Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) {
				onClose();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, onClose]);

	// Calculation result
	const mrdResult: MrdCalculationResult = useMemo(() => {
		return calculateAnesthesiaMrd({
			drugId: selectedDrugId,
			patientWeightKg,
			carpulesCount,
			carpuleVolumeMl,
			isCardiacRisk,
			isPediatric: isPediatricMode,
			patientAgeYears: isPediatricMode ? (patientAgeYears ?? 8) : patientAgeYears,
			pediatricFormula,
			hasSulfiteAllergy,
			hasBronchialAsthma,
		});
	}, [
		selectedDrugId,
		patientWeightKg,
		carpulesCount,
		carpuleVolumeMl,
		isCardiacRisk,
		isPediatricMode,
		patientAgeYears,
		pediatricFormula,
		hasSulfiteAllergy,
		hasBronchialAsthma,
	]);

	const handleCopyDiary = () => {
		navigator.clipboard.writeText(mrdResult.soapDiaryText);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handleApply = () => {
		if (isLocked) return;
		if (onApplyToDiary) {
			onApplyToDiary(mrdResult.soapDiaryText, mrdResult);
		}
		onClose();
	};

	// Quick weight presets
	const adultWeightPresets = [50, 60, 70, 80, 90, 100];
	const pediatricWeightPresets = [12, 16, 20, 25, 30, 35];

	if (!isOpen) return null;

	// Calculate speedometer needle rotation: 0% -> -90deg (far left), 50% -> 0deg (top), 100% -> 90deg (far right)
	const clampedPercent = Math.max(0, Math.min(150, mrdResult.peakUtilizationPercent));
	// Map 0..150% to -90..+90 degrees
	const needleAngle = Math.min(90, Math.max(-90, -90 + (clampedPercent / 100) * 180));

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-labelledby="anesthesia-caliper-title"
		>
			<div className="relative w-full max-w-4xl rounded-2xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--border,#e2e8f0)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
				{/* 1. Modal Header */}
				<div className="flex items-center justify-between px-5 py-4 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--border,#e2e8f0)] shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--teal-surface,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal-soft,#99f6e4)]">
							<Syringe size={22} />
						</div>
						<div>
							<h3 id="anesthesia-caliper-title" className="text-base sm:text-lg font-black text-[var(--ink)] flex items-center gap-2">
								<span>Калипер безопасной дозы анестетика (MRD)</span>
								<span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] hidden sm:inline-block">
									СтАР / Минздрав РФ / AHA
								</span>
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)]">
								Расчет предельной токсичности действующего вещества и кардиологический шлюз адреналина (0.04 мг)
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong,#e2e8f0)] transition-colors cursor-pointer"
						aria-label="Закрыть калипер"
					>
						<X size={20} />
					</button>
				</div>

				{/* 2. Modal Body */}
				<div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
					{/* TOP ROW: Visual Speedometer & Cardiac Gateway Banner */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
						{/* Speedometer Radial Gauge Card (5 cols) */}
						<div className="lg:col-span-5 p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#e2e8f0)] flex flex-col items-center justify-center relative overflow-hidden text-center shadow-xs">
							<div className="text-xs font-black uppercase tracking-wider text-[var(--muted)] mb-1 flex items-center gap-1.5">
								<Activity size={15} className="text-[var(--teal)]" />
								<span>Спидометр безопасности дозы</span>
							</div>

							{/* Semi-circular Speedometer Arc SVG */}
							<div className="relative w-48 h-28 my-1 flex items-end justify-center">
								<svg viewBox="0 0 200 110" className="w-full h-full">
									{/* Background Arc Tracks */}
									<path
										d="M 20 100 A 80 80 0 0 1 180 100"
										fill="none"
										stroke="var(--border,#e2e8f0)"
										strokeWidth="16"
										strokeLinecap="round"
									/>
									{/* Green Zone: 0 - 70% (0 - 126 deg) */}
									<path
										d="M 20 100 A 80 80 0 0 1 135 28"
										fill="none"
										stroke="#10b981"
										strokeWidth="14"
										strokeLinecap="round"
										opacity="0.85"
									/>
									{/* Yellow Zone: 70 - 85% */}
									<path
										d="M 135 28 A 80 80 0 0 1 162 50"
										fill="none"
										stroke="#eab308"
										strokeWidth="14"
										opacity="0.9"
									/>
									{/* Orange/Red Zone: 85 - 100%+ */}
									<path
										d="M 162 50 A 80 80 0 0 1 180 100"
										fill="none"
										stroke="#ef4444"
										strokeWidth="14"
										strokeLinecap="round"
									/>

									{/* Needle Indicator */}
									<g transform={`rotate(${needleAngle}, 100, 100)`}>
										<line
											x1="100"
											y1="100"
											x2="100"
											y2="28"
											stroke="var(--ink,#0f172a)"
											strokeWidth="3.5"
											strokeLinecap="round"
										/>
										<circle cx="100" cy="100" r="7" fill="var(--ink,#0f172a)" />
									</g>
								</svg>

								{/* Center Numeric Readout */}
								<div className="absolute bottom-0 inset-x-0 flex flex-col items-center">
									<span
										className="text-2xl sm:text-3xl font-mono font-black transition-colors"
										style={{ color: mrdResult.speedoMeterColorHex }}
									>
										{mrdResult.peakUtilizationPercent}%
									</span>
								</div>
							</div>

							{/* Status Badge */}
							<div
								className="mt-1 px-3 py-1 rounded-full font-mono font-black text-xs uppercase tracking-wide border flex items-center gap-1.5 shadow-2xs"
								style={{
									backgroundColor: `${mrdResult.speedoMeterColorHex}15`,
									color: mrdResult.speedoMeterColorHex,
									borderColor: `${mrdResult.speedoMeterColorHex}40`,
								}}
							>
								{mrdResult.safetyZone === 'red_stop' ? (
									<AlertOctagon size={14} />
								) : mrdResult.safetyZone === 'orange_warning' || mrdResult.safetyZone === 'yellow_caution' ? (
									<AlertTriangle size={14} />
								) : (
									<ShieldCheck size={14} />
								)}
								<span>{mrdResult.speedoMeterLabelRu}</span>
							</div>

							{/* Limiting Factor Tag */}
							<div className="mt-2 text-xs text-[var(--muted)] px-2 py-1 rounded-lg bg-[var(--paper)] border border-[var(--border)] leading-tight max-w-xs">
								<span className="font-bold text-[var(--ink)]">Лимитирующий фактор: </span>
								<span>{mrdResult.limitingFactorDescriptionRu}</span>
							</div>
						</div>

						{/* Live Numerical Metrics & Gate Status (7 cols) */}
						<div className="lg:col-span-7 flex flex-col justify-between gap-3">
							{/* Metric Cards Grid */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
								{/* Active Substance Metric */}
								<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)] flex flex-col justify-between">
									<div className="text-xs font-bold text-[var(--muted)] flex items-center justify-between">
										<span>Действующее вещ-во</span>
										<span className="font-mono text-xs font-bold text-[var(--teal)]">
											{mrdResult.activeDosePercent}% МРД
										</span>
									</div>
									<div className="my-1.5">
										<div className="text-lg font-mono font-black text-[var(--ink)]">
											{mrdResult.injectedActiveMg}{' '}
											<span className="text-xs font-normal text-[var(--muted)]">/ {mrdResult.maxSafeActiveMg} мг</span>
										</div>
									</div>
									<div className="text-xs font-semibold text-[var(--muted)] flex justify-between">
										<span>Остаток:</span>
										<span className="font-mono font-bold text-[var(--ink)]">{mrdResult.remainingSafeActiveMg} мг</span>
									</div>
								</div>

								{/* Epinephrine Metric */}
								<div
									className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${
										isCardiacRisk
											? 'bg-rose-500/5 border-rose-500/30'
											: 'bg-[var(--paper-soft)] border-[var(--border)]'
									}`}
								>
									<div className="text-xs font-bold text-[var(--muted)] flex items-center justify-between">
										<span className="flex items-center gap-1">
											<Heart size={12} className={isCardiacRisk ? 'text-rose-500' : 'text-[var(--muted)]'} />
											<span>Эпинефрин</span>
										</span>
										<span className={`font-mono text-xs font-bold ${mrdResult.isEpinephrineOverdose ? 'text-rose-600' : 'text-[var(--teal)]'}`}>
											{mrdResult.drug.isAdrenalineFree ? '0%' : `${mrdResult.epinephrineDosePercent}%`}
										</span>
									</div>
									<div className="my-1.5">
										<div className="text-lg font-mono font-black text-[var(--ink)]">
											{mrdResult.drug.isAdrenalineFree ? '0.00' : mrdResult.injectedEpinephrineMg}{' '}
											<span className="text-xs font-normal text-[var(--muted)]">
												/ {mrdResult.maxSafeEpinephrineMg} мг
											</span>
										</div>
									</div>
									<div className="text-xs font-semibold text-[var(--muted)] flex justify-between">
										<span>Лимит:</span>
										<span className="font-mono font-bold text-[var(--ink)]">
											{isCardiacRisk ? '<= 0.04 мг (Кардио)' : '<= 0.20 мг'}
										</span>
									</div>
								</div>

								{/* Safe Carpules Metric */}
								<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)] flex flex-col justify-between">
									<div className="text-xs font-bold text-[var(--muted)] flex items-center justify-between">
										<span>Предел карпул</span>
										<span className="font-mono text-xs font-bold text-[var(--teal)]">
											{mrdResult.carpuleVolumeMl} мл/к.
										</span>
									</div>
									<div className="my-1.5">
										<div className="text-lg font-mono font-black text-[var(--ink)]">
											{mrdResult.carpulesCount}{' '}
											<span className="text-xs font-normal text-[var(--muted)]">
												/ {mrdResult.maxSafeCarpulesCount} карп.
											</span>
										</div>
									</div>
									<div className="text-xs font-semibold text-[var(--muted)] flex justify-between">
										<span>Доступно ещё:</span>
										<span className="font-mono font-bold text-[var(--ok-fg,#10b981)]">
											+{mrdResult.remainingSafeCarpules} карп.
										</span>
									</div>
								</div>
							</div>

							{/* Cardiovascular Gate Interactive Banner */}
							<div
								className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
									isCardiacRisk
										? 'bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-100 ring-1 ring-rose-500/30'
										: 'bg-[var(--paper-soft)] border-[var(--border)] text-[var(--ink)]'
								}`}
							>
								<div className="flex items-center gap-2.5">
									<div className={`p-2 rounded-lg ${isCardiacRisk ? 'bg-rose-500 text-white' : 'bg-[var(--paper)] text-[var(--muted)] border border-[var(--border)]'}`}>
										<Heart size={18} />
									</div>
									<div>
										<div className="text-xs sm:text-sm font-black flex items-center gap-2">
											<span>Кардиологический шлюз адреналина (Cardiac Dose Gate)</span>
											{isCardiacRisk && (
												<span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500 text-white">
													АКТИВЕН: ≤ 0.04 мг
												</span>
											)}
										</div>
										<p className="text-xs opacity-85 mt-0.5">
											ИБС, стенокардия, артериальная гипертензия, аритмия, прием бета-блокаторов или ASA III
										</p>
									</div>
								</div>

								<button
									type="button"
									onClick={() => setIsCardiacRisk((prev) => !prev)}
									className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer touch-manipulation shrink-0 border ${
										isCardiacRisk
											? 'bg-rose-600 text-white border-rose-700 shadow-xs'
											: 'bg-[var(--paper)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--paper-strong)]'
									}`}
								>
									{isCardiacRisk ? 'Шлюз ВКЛЮЧЕН (0.04 мг)' : 'Включить кардио-шлюз'}
								</button>
							</div>
						</div>
					</div>

					{/* WARNINGS / CONTRAINDICATIONS ALERTS */}
					{(mrdResult.contraindications.length > 0 || mrdResult.warnings.length > 0) && (
						<div className="space-y-2">
							{mrdResult.contraindications.map((c, i) => (
								<div
									key={i}
									className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5 font-medium animate-in fade-in"
								>
									<AlertOctagon size={18} className="text-rose-600 shrink-0 mt-0.5" />
									<div>
										<span className="font-bold block">ПРОТИВОПОКАЗАНИЕ:</span>
										<span>{c}</span>
									</div>
								</div>
							))}
							{mrdResult.warnings.map((w, i) => (
								<div
									key={i}
									className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 font-medium animate-in fade-in"
								>
									<AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
									<div>
										<span className="font-bold block">ПРЕДУПРЕЖДЕНИЕ БЕЗОПАСНОСТИ:</span>
										<span>{w}</span>
									</div>
								</div>
							))}
						</div>
					)}

					{/* STEP 1: Drug Selection Cards */}
					<div>
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">
								1. Выберите местноанестезирующий препарат:
							</span>
							<span className="text-xs text-[var(--muted)]">
								Объем карпулы по умолчанию: {mrdResult.drug.defaultVolumeMl} мл
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
							{(Object.keys(MRD_DRUG_CATALOG) as MrdDrugId[]).map((drugKey) => {
								const drug = MRD_DRUG_CATALOG[drugKey];
								const isSelected = selectedDrugId === drugKey;

								return (
									<button
										key={drugKey}
										type="button"
										onClick={() => setSelectedDrugId(drugKey)}
										className={`min-h-[64px] p-3 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer touch-manipulation ${
											isSelected
												? 'border-[var(--teal)] bg-[var(--teal-surface)] text-[var(--ink)] shadow-xs ring-2 ring-[var(--teal)]/40'
												: 'border-[var(--border)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)]'
										}`}
									>
										<div className="flex items-center justify-between w-full">
											<span className="text-xs sm:text-sm font-black text-[var(--ink)]">
												{drug.tradeNamesRu[0]}
											</span>
											{drug.isAdrenalineFree ? (
												<span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[var(--ok-bg,#dcfce7)] text-[var(--ok-fg,#166534)] border border-[var(--ok-fg)]/20">
													БЕЗ АДР.
												</span>
											) : drug.vasoconstrictorRatio === '1:200000' ? (
												<span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]">
													1:200 000
												</span>
											) : (
												<span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
													1:100 000
												</span>
											)}
										</div>

										<div className="text-xs text-[var(--muted)] mt-1 truncate">
											{drug.activeSubstanceRu}
										</div>

										<div className="flex items-center justify-between text-xs text-[var(--muted)] mt-1.5 pt-1.5 border-t border-[var(--border)]/60 font-mono">
											<span>МРД: {drug.maxDoseMgPerKgAdult} мг/кг</span>
											<span>Макс: {drug.absoluteMaxDoseMgAdult} мг</span>
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* STEP 2: Patient Parameters (Weight, Age, Pediatric Mode) */}
					<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">
								2. Параметры пациента и педиатрический режим:
							</span>

							{/* Adult vs Pediatric Toggle */}
							<div className="inline-flex rounded-xl border border-[var(--border)] p-1 bg-[var(--paper)]">
								<button
									type="button"
									onClick={() => setIsPediatricMode(false)}
									className={`min-h-[40px] px-3.5 py-1.5 text-xs rounded-lg font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
										!isPediatricMode
											? 'bg-[var(--teal)] text-[var(--on-teal,#ffffff)] shadow-xs'
											: 'text-[var(--muted)] hover:text-[var(--ink)]'
									}`}
								>
									<User size={14} />
									<span>Взрослый (до 7.0 мг/кг)</span>
								</button>
								<button
									type="button"
									onClick={() => setIsPediatricMode(true)}
									className={`min-h-[40px] px-3.5 py-1.5 text-xs rounded-lg font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
										isPediatricMode
											? 'bg-amber-500 text-white shadow-xs'
											: 'text-[var(--muted)] hover:text-[var(--ink)]'
									}`}
								>
									<Baby size={14} />
									<span>Детский / Педиатрия (&lt; 18 лет)</span>
								</button>
							</div>
						</div>

						{/* Weight Selection & Steppers */}
						<div className="space-y-2">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
									<span>Масса тела пациента:</span>
									<span className="font-mono font-black text-sm text-[var(--teal)]">{patientWeightKg} кг</span>
								</label>

								{/* Quick preset buttons */}
								<div className="flex items-center gap-1 flex-wrap">
									{(isPediatricMode ? pediatricWeightPresets : adultWeightPresets).map((w) => (
										<button
											key={w}
											type="button"
											onClick={() => setPatientWeightKg(w)}
											className={`min-h-[40px] min-w-[46px] px-2.5 py-1 text-xs rounded-xl border font-mono font-bold transition-all cursor-pointer touch-manipulation ${
												patientWeightKg === w
													? 'bg-[var(--teal)] text-[var(--on-teal,#ffffff)] border-[var(--teal)] shadow-xs'
													: 'bg-[var(--paper)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--paper-strong)]'
											}`}
										>
											{w} кг
										</button>
									))}
								</div>
							</div>

							<div className="flex items-center gap-3">
								<input
									type="range"
									min={5}
									max={140}
									step={1}
									value={patientWeightKg}
									onChange={(e) => setPatientWeightKg(Number(e.target.value))}
									className="flex-1 accent-[var(--teal)] cursor-pointer"
								/>
								<div className="flex items-center gap-1">
									<input
										type="number"
										min={5}
										max={200}
										value={patientWeightKg}
										onChange={(e) => setPatientWeightKg(Math.max(5, Math.min(200, Number(e.target.value) || 70)))}
										className="w-20 min-h-[44px] px-2 text-sm font-mono font-black rounded-xl border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] text-center outline-none focus:border-[var(--teal)]"
									/>
									<span className="text-xs font-bold text-[var(--muted)]">кг</span>
								</div>
							</div>
						</div>

						{/* Pediatric Formulas Selector (if Pediatric Mode) */}
						{isPediatricMode && (
							<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-amber-500/30 space-y-3 animate-in fade-in">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
										<Baby size={16} />
										<span>Формула расчета педиатрической дозы:</span>
									</div>

									{/* Age Input */}
									<div className="flex items-center gap-2">
										<span className="text-xs text-[var(--muted)]">Возраст ребенка:</span>
										<input
											type="number"
											min={1}
											max={17}
											value={patientAgeYears ?? 8}
											onChange={(e) => setPatientAgeYears(Math.max(1, Math.min(17, Number(e.target.value) || 8)))}
											className="w-16 min-h-[38px] px-2 text-xs font-mono font-bold rounded-lg border border-[var(--border)] bg-[var(--paper-soft)] text-center"
										/>
										<span className="text-xs text-[var(--muted)]">лет</span>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
									<button
										type="button"
										onClick={() => setPediatricFormula('clark')}
										className={`min-h-[44px] p-2.5 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
											pediatricFormula === 'clark'
												? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500'
												: 'border-[var(--border)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)]'
										}`}
									>
										<div className="font-bold">Правило Кларка (по весу)</div>
										<div className="text-xs text-[var(--muted)]">Доза = Взрослая × (Вес / 70)</div>
									</button>

									<button
										type="button"
										onClick={() => setPediatricFormula('young')}
										className={`min-h-[44px] p-2.5 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
											pediatricFormula === 'young'
												? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500'
												: 'border-[var(--border)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)]'
										}`}
									>
										<div className="font-bold">Правило Янга (по возрасту)</div>
										<div className="text-xs text-[var(--muted)]">Доза = Взрослая × (Возраст / (В+12))</div>
									</button>

									<button
										type="button"
										onClick={() => setPediatricFormula('direct_mg_kg')}
										className={`min-h-[44px] p-2.5 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
											pediatricFormula === 'direct_mg_kg'
												? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500'
												: 'border-[var(--border)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)]'
										}`}
									>
										<div className="font-bold">Прямой стандарт (мг/кг)</div>
										<div className="text-xs text-[var(--muted)]">Артикаин: 5.0 мг/кг</div>
									</button>
								</div>
							</div>
						)}
					</div>

					{/* STEP 3: Dosage Stepper & Carpule Volume */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Carpules Stepper Card */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-3">
							<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)] block">
								3. Количество карпул:
							</span>

							<div className="flex items-center justify-between gap-3">
								<div className="flex items-center gap-1 bg-[var(--paper)] border border-[var(--border)] rounded-xl p-1">
									<button
										type="button"
										onClick={() => setCarpulesCount((c) => Math.max(0.5, Math.round((c - 0.5) * 10) / 10))}
										className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer touch-manipulation active:scale-95"
										title="Уменьшить на 0.5 карпулы"
									>
										<Minus size={20} />
									</button>
									<span className="w-16 text-center text-lg sm:text-xl font-mono font-black text-[var(--ink)]">
										{carpulesCount} к.
									</span>
									<button
										type="button"
										onClick={() => setCarpulesCount((c) => Math.min(10, Math.round((c + 0.5) * 10) / 10))}
										className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer touch-manipulation active:scale-95"
										title="Увеличить на 0.5 карпулы"
									>
										<Plus size={20} />
									</button>
								</div>

								{/* Quick Carpule Presets */}
								<div className="flex items-center gap-1.5 flex-wrap">
									{[1, 2, 3, 4].map((c) => (
										<button
											key={c}
											type="button"
											onClick={() => setCarpulesCount(c)}
											className={`min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs rounded-xl border font-mono font-bold transition-all cursor-pointer touch-manipulation ${
												carpulesCount === c
													? 'bg-[var(--teal)] text-[var(--on-teal,#ffffff)] border-[var(--teal)]'
													: 'bg-[var(--paper)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--paper-strong)]'
											}`}
										>
											{c}к
										</button>
									))}
									<button
										type="button"
										onClick={() => setCarpulesCount(mrdResult.maxSafeCarpulesCount)}
										className="min-h-[44px] px-3 py-1 text-xs rounded-xl border border-[var(--teal)] bg-[var(--teal-surface)] text-[var(--teal)] font-bold hover:bg-[var(--teal)] hover:text-white transition-colors cursor-pointer"
										title="Установить максимальную безопасную дозу"
									>
										Макс ({mrdResult.maxSafeCarpulesCount}к)
									</button>
								</div>
							</div>

							<div className="text-xs text-[var(--muted)] font-mono">
								Суммарный объем: <strong>{mrdResult.injectedVolumeMl} мл</strong> ({mrdResult.injectedActiveMg} мг действ. в-ва)
							</div>
						</div>

						{/* Carpule Volume & Tooth Target */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-3">
							<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)] block">
								4. Объем карпулы и зуб (FDI):
							</span>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="text-xs font-bold text-[var(--muted)] block mb-1">
										Объем карпулы:
									</label>
									<div className="flex rounded-xl border border-[var(--border)] p-1 bg-[var(--paper)]">
										{([1.7, 1.8, 2.0] as CarpuleVolumeMl[]).map((v) => (
											<button
												key={v}
												type="button"
												onClick={() => setCarpuleVolumeMl(v)}
												className={`flex-1 min-h-[40px] text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
													carpuleVolumeMl === v
														? 'bg-[var(--teal)] text-[var(--on-teal,#ffffff)] shadow-2xs'
														: 'text-[var(--muted)] hover:text-[var(--ink)]'
												}`}
											>
												{v} мл
											</button>
										))}
									</div>
								</div>

								<div>
									<label className="text-xs font-bold text-[var(--muted)] block mb-1">
										Зуб (FDI):
									</label>
									<input
										type="text"
										value={toothNumber}
										onChange={(e) => setToothNumber(e.target.value)}
										placeholder="напр. 16, 46"
										className="w-full min-h-[48px] px-3 text-sm font-bold rounded-xl border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* STEP 4: Live Form 043/u SOAP Note Preview */}
					<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
								<Copy size={14} className="text-[var(--teal)]" />
								<span>Формируемая запись для дневника 043/у (СтАР):</span>
							</span>
							<button
								type="button"
								onClick={handleCopyDiary}
								className="min-h-[36px] px-3 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-strong)] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
							>
								{isCopied ? <Check size={14} className="text-[var(--ok-fg)]" /> : <Copy size={14} />}
								<span>{isCopied ? 'Скопировано!' : 'Скопировать'}</span>
							</button>
						</div>

						<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--border)] text-xs text-[var(--ink)] leading-relaxed italic font-medium">
							{mrdResult.soapDiaryText}
						</div>
					</div>
				</div>

				{/* 3. Modal Footer Actions */}
				<div className="flex items-center justify-between px-5 py-4 bg-[var(--paper-soft)] border-t border-[var(--border)] shrink-0">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[48px] px-5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-strong)] text-xs sm:text-sm font-bold transition-colors cursor-pointer"
					>
						Отмена
					</button>

					<div className="flex items-center gap-2.5">
						<button
							type="button"
							onClick={handleApply}
							disabled={isLocked}
							className="min-h-[50px] px-6 py-3 rounded-xl text-xs sm:text-sm font-black bg-[var(--teal)] text-[var(--on-teal,#ffffff)] hover:opacity-90 active:opacity-100 shadow-md cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-[0.98]"
						>
							<CheckCircle2 size={18} />
							<span>Применить дозировку в дневник (1 клик)</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
