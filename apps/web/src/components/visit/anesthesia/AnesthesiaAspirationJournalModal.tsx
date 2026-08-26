/**
 * AnesthesiaAspirationJournalModal.tsx — Electronic Aspiration Test Protocol & Conduction Anesthesia Journal
 * Standards: Минздрав РФ (Форма № 043/у), СтАР, ФАР
 *
 * Features:
 * - Dominant Technique Selectors (Weisbrem, Gow-Gates, Akinosi, Torusal, Tuberal, PDL 10-15 atm, Infiltration, etc.)
 * - Needle Specs (27G 35mm, 30G 25mm, 30G 21mm, 30G 12mm, 30G 8mm) with auto mismatch detection.
 * - Vascular Hit Risk Gauge & Two-Plane Aspiration verification.
 * - Giant Aspiration Buttons: [ 🟢 Аспирационная проба ОТРИЦАТЕЛЬНАЯ ] / [ 🔴 ПОЛОЖИТЕЛЬНАЯ (Кровь в карпуле) ].
 * - Positive Aspiration Stop & Replace workflow with full audit trail.
 * - Live Anesthesia Onset Countdown Timer (10m mandibular, 3m infiltration, 1m PDL) with push/toast notifications.
 * - Anatomical Numbness Zone Mapping (teeth, tongue, lip, mucosa, palate).
 * - 1-Click Form 043/u Statutory Protocol Export to Diary.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
	AlertTriangle,
	Check,
	Copy,
	FileText,
	Syringe,
	X,
} from 'lucide-react';
import {
	AnestheticDrugKey,
	ConductionTechniqueId,
	DENTAL_NEEDLE_CATALOG,
	ANESTHETIC_DRUGS_CATALOG,
	CONDUCTION_TECHNIQUES_CATALOG,
	NeedleGaugeId,
	TechniqueCategory,
	calculateAnestheticVolumeMg,
	getNeedleSpecification,
	getRecommendedWaitTimeSeconds,
	getTechniqueSpecification,
	validateNeedleForTechnique,
} from './anesthesiaTechniqueMath';
import {
	AspirationAttemptRecord,
	AspirationTestStatus,
	AnesthesiaSessionData,
	calculateInjectionVelocityPlan,
	evaluateVascularRisk,
	generateAspirationJournalEntry043,
} from './aspirationSafetyEngine';
import { AspirationTestCockpit } from './AspirationTestCockpit';
import { AnesthesiaOnsetTimerWidget } from './AnesthesiaOnsetTimerWidget';
import { AnesthesiaAnatomyMapWidget } from './AnesthesiaAnatomyMapWidget';
import { showToast } from '../../GlobalToast';

export interface AnesthesiaAspirationJournalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onApplyToDiary?: ((diaryText043: string, sessionData: AnesthesiaSessionData) => void) | undefined;
	readonly initialPatientFullName?: string | undefined;
	readonly initialMedCardNumber?: string | undefined;
	readonly initialPatientAgeYears?: number | undefined;
	readonly initialPatientWeightKg?: number | undefined;
	readonly initialToothNumber?: number | string | undefined;
	readonly initialTechniqueId?: ConductionTechniqueId | undefined;
	readonly initialNeedleId?: NeedleGaugeId | undefined;
	readonly initialDrugKey?: AnestheticDrugKey | undefined;
	readonly initialVolumeMl?: number | undefined;
	readonly initialSide?: 'right' | 'left' | 'bilateral' | undefined;
	readonly isLocked?: boolean | undefined;
}

export const AnesthesiaAspirationJournalModal: React.FC<AnesthesiaAspirationJournalModalProps> = ({
	isOpen,
	onClose,
	onApplyToDiary,
	initialPatientFullName = 'Смирнова Екатерина Васильевна',
	initialMedCardNumber = '043/у-2026/891',
	initialPatientAgeYears = 36,
	initialPatientWeightKg = 68,
	initialToothNumber = '46',
	initialTechniqueId = 'mandibular_weisbrem',
	initialNeedleId = 'gauge_27_long_35mm',
	initialDrugKey = 'articaine_1_100k',
	initialVolumeMl = 1.7,
	initialSide = 'right',
	isLocked = false,
}) => {
	// 1. Core Clinical State
	const [techniqueId, setTechniqueId] = useState<ConductionTechniqueId>(initialTechniqueId);
	const [needleId, setNeedleId] = useState<NeedleGaugeId>(initialNeedleId);
	const [drugKey, setDrugKey] = useState<AnestheticDrugKey>(initialDrugKey);
	const [volumeMl, setVolumeMl] = useState<number>(initialVolumeMl);
	const [side, setSide] = useState<'right' | 'left' | 'bilateral'>(initialSide);
	const [toothNumber, setToothNumber] = useState<string>(String(initialToothNumber || ''));
	const [patientFullName, setPatientFullName] = useState<string>(initialPatientFullName);
	const [notesRu, setNotesRu] = useState<string>('');

	// 2. Aspiration Protocol State
	const [aspirationStatus, setAspirationStatus] = useState<AspirationTestStatus>('not_performed');
	const [isTwoPlaneConfirmed, setIsTwoPlaneConfirmed] = useState<boolean>(true);
	const [attempts, setAttempts] = useState<AspirationAttemptRecord[]>([]);
	const [positiveEmergencyOpen, setPositiveEmergencyOpen] = useState<boolean>(false);
	const [isCopied, setIsCopied] = useState<boolean>(false);

	// 3. Category Filter Tab
	const [categoryFilter, setCategoryFilter] = useState<TechniqueCategory | 'all'>('all');

	// 4. Onset Countdown Timer State
	const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(() =>
		getRecommendedWaitTimeSeconds(initialTechniqueId),
	);
	const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
	const [timerCompleted, setTimerCompleted] = useState<boolean>(false);
	const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

	// Sync on props change
	useEffect(() => {
		if (isOpen) {
			setTechniqueId(initialTechniqueId);
			setNeedleId(initialNeedleId);
			setDrugKey(initialDrugKey);
			setVolumeMl(initialVolumeMl);
			setSide(initialSide);
			setToothNumber(String(initialToothNumber || ''));
			setPatientFullName(initialPatientFullName);
			const defaultSec = getRecommendedWaitTimeSeconds(initialTechniqueId);
			setTimerSecondsLeft(defaultSec);
			setIsTimerRunning(false);
			setTimerCompleted(false);
			setAspirationStatus('not_performed');
			setAttempts([]);
			setPositiveEmergencyOpen(false);
			setIsCopied(false);
		}
	}, [
		isOpen,
		initialTechniqueId,
		initialNeedleId,
		initialDrugKey,
		initialVolumeMl,
		initialSide,
		initialToothNumber,
		initialPatientFullName,
	]);

	// Auto-adjust default needle & timer when technique changes
	const handleTechniqueChange = (newTechId: ConductionTechniqueId) => {
		setTechniqueId(newTechId);
		const techSpec = getTechniqueSpecification(newTechId);
		setNeedleId(techSpec.recommendedNeedle);
		setVolumeMl(techSpec.typicalVolumeMl);
		const waitSec = techSpec.onsetMinutes.defaultWaitTimeSec;
		setTimerSecondsLeft(waitSec);
		setIsTimerRunning(false);
		setTimerCompleted(false);
	};

	// Audio chime on timer completion
	const playCompletionSound = useCallback(() => {
		if (!soundEnabled) return;
		try {
			const AudioContextClass =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			if (!AudioContextClass) return;
			const ctx = new AudioContextClass();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
			osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
			gain.gain.setValueAtTime(0.2, ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start();
			osc.stop(ctx.currentTime + 0.8);
		} catch {
			// Silent fallback for restricted environments
		}
	}, [soundEnabled]);

	// Timer interval loop
	useEffect(() => {
		let intervalId: NodeJS.Timeout | null = null;
		if (isTimerRunning && timerSecondsLeft > 0) {
			intervalId = setInterval(() => {
				setTimerSecondsLeft((prev) => {
					if (prev <= 1) {
						setIsTimerRunning(false);
						setTimerCompleted(true);
						playCompletionSound();
						showToast(
							`Анестезия готова! Онемение ${getTechniqueSpecification(techniqueId).shortNameRu} наступило.`,
							'success',
						);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}
		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	}, [isTimerRunning, timerSecondsLeft, techniqueId, playCompletionSound]);

	// Vascular risk assessment
	const vascularAssessment = useMemo(() => {
		return evaluateVascularRisk({
			techniqueId,
			needleId,
			patientAgeYears: initialPatientAgeYears,
		});
	}, [techniqueId, needleId, initialPatientAgeYears]);

	// Needle validation
	const needleValidation = useMemo(() => {
		return validateNeedleForTechnique(techniqueId, needleId);
	}, [techniqueId, needleId]);

	// Velocity plan
	const velocityPlan = useMemo(() => {
		return calculateInjectionVelocityPlan(volumeMl);
	}, [volumeMl]);

	// Active specs
	const currentTechnique = useMemo(() => {
		return getTechniqueSpecification(techniqueId);
	}, [techniqueId]);

	const currentNeedle = useMemo(() => {
		return getNeedleSpecification(needleId);
	}, [needleId]);

	// Session Data
	const sessionData: AnesthesiaSessionData = useMemo(() => {
		return {
			patientFullName,
			medCardNumber: initialMedCardNumber,
			patientAgeYears: initialPatientAgeYears,
			patientWeightKg: initialPatientWeightKg,
			toothNumber: toothNumber.trim() || undefined,
			side,
			techniqueId,
			needleId,
			drugKey,
			volumeMl,
			aspirationStatus,
			isTwoPlaneConfirmed,
			attempts,
			onsetDurationMinutesActual:
				Math.round((currentTechnique.onsetMinutes.defaultWaitTimeSec - timerSecondsLeft) / 60) ||
				currentTechnique.onsetMinutes.min,
			notesRu: notesRu.trim() || undefined,
		};
	}, [
		patientFullName,
		initialMedCardNumber,
		initialPatientAgeYears,
		initialPatientWeightKg,
		toothNumber,
		side,
		techniqueId,
		needleId,
		drugKey,
		volumeMl,
		aspirationStatus,
		isTwoPlaneConfirmed,
		attempts,
		currentTechnique,
		timerSecondsLeft,
		notesRu,
	]);

	// Export Result
	const exportResult = useMemo(() => {
		return generateAspirationJournalEntry043(sessionData);
	}, [sessionData]);

	// Handle Negative Aspiration Click
	const handleNegativeAspiration = () => {
		const newAttempt: AspirationAttemptRecord = {
			attemptNumber: attempts.length + 1,
			timestampIso: new Date().toISOString(),
			plane1Result: 'negative',
			plane2Result: isTwoPlaneConfirmed ? 'negative' : undefined,
			overallResult: 'negative',
			bloodObserved: false,
			needleId,
			actionTaken: 'proceed_slow_injection',
			notesRu: 'Отрицательная проба в 2-х плоскостях. Чисто.',
		};

		setAttempts((prev) => [...prev, newAttempt]);
		setAspirationStatus(attempts.length > 0 ? 'repositioned_and_retested' : 'negative_safe');
		setPositiveEmergencyOpen(false);

		if (!isTimerRunning && !timerCompleted) {
			setIsTimerRunning(true);
		}

		showToast('Аспирация ОТРИЦАТЕЛЬНАЯ (Чисто). Разрешено медленное введение!', 'success');
	};

	// Handle Positive Aspiration Click
	const handlePositiveAspiration = () => {
		const newAttempt: AspirationAttemptRecord = {
			attemptNumber: attempts.length + 1,
			timestampIso: new Date().toISOString(),
			plane1Result: 'positive_burst',
			plane2Result: undefined,
			overallResult: 'positive',
			bloodObserved: true,
			needleId,
			actionTaken: 'immediate_stop_needle_repositioned',
			notesRu: 'Попадание в сосуд! Кровь в карпуле. Остановка инъекции.',
		};

		setAttempts((prev) => [...prev, newAttempt]);
		setAspirationStatus('positive_burst');
		setPositiveEmergencyOpen(true);
		setIsTimerRunning(false);

		showToast('КРОВЬ В КАРПУЛЕ! Инъекция немедленно остановлена!', 'error', 4000);
	};

	const handleReplaceCarpuleAndRetest = () => {
		setPositiveEmergencyOpen(false);
		showToast('Карпула и игла заменены на новые. Выполните повторную аспирацию.', 'info');
	};

	const handleCopyDiary = async () => {
		try {
			await navigator.clipboard.writeText(exportResult.diaryText043);
			setIsCopied(true);
			showToast('Протокол Формы 043/у скопирован в буфер обмена', 'success');
			setTimeout(() => setIsCopied(false), 2000);
		} catch {
			showToast('Не удалось скопировать в буфер', 'warning');
		}
	};

	const handleApplyToDiary = () => {
		if (onApplyToDiary) {
			onApplyToDiary(exportResult.diaryText043, sessionData);
			showToast('Протокол анестезии успешно внесен в дневник Формы 043/у!', 'success');
		}
		onClose();
	};

	// Escape key handler
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) {
				onClose();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const filteredTechniques = Object.values(CONDUCTION_TECHNIQUES_CATALOG).filter((tech) => {
		if (categoryFilter === 'all') return true;
		return tech.category === categoryFilter;
	});

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
			<div
				className="w-full max-w-7xl max-h-[96vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
				style={{
					backgroundColor: 'var(--paper, #18181b)',
					borderColor: 'var(--border, #27272a)',
					color: 'var(--ink, #fafafa)',
				}}
			>
				{/* ── MODAL HEADER ── */}
				<div
					className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
					style={{
						backgroundColor: 'var(--paper-strong, #1f1f23)',
						borderColor: 'var(--border, #27272a)',
					}}
				>
					<div className="flex items-center gap-3 min-w-0">
						<div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
							<Syringe className="w-6 h-6" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-base sm:text-lg font-bold tracking-tight truncate">
									Электронный журнал анестезии & Аспирационная проба
								</h2>
								<span
									className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
										currentTechnique.vascularRiskTier === 'critical_high'
											? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
											: currentTechnique.vascularRiskTier === 'moderate'
												? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
												: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
									}`}
								>
									{currentTechnique.vascularRiskTier === 'critical_high'
										? '⚠️ Высокий сосудистый риск'
										: currentTechnique.vascularRiskTier === 'moderate'
											? '⚡ Умеренный риск'
											: '🟢 Низкий риск'}
								</span>
							</div>
							<p className="text-xs text-zinc-400 truncate">
								Стандарты безопасности СтАР & Минздрав РФ (Форма № 043/у) • Пациент:{' '}
								<span className="font-medium text-zinc-200">{patientFullName}</span>
								{toothNumber ? ` • Зуб: ${toothNumber}` : ''}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
							title="Закрыть (Esc)"
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* ── MODAL BODY: 3-COLUMN CLINICAL COCKPIT ── */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
					{/* ══ COLUMN 1: TECHNIQUE, NEEDLE & DRUG SELECTORS (4 Cols) ══ */}
					<div className="lg:col-span-4 flex flex-col gap-4">
						{/* Category Tabs */}
						<div className="flex flex-wrap gap-1 p-1 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
							<button
								type="button"
								onClick={() => setCategoryFilter('all')}
								className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
									categoryFilter === 'all'
										? 'bg-blue-600 text-white shadow-xs'
										: 'text-zinc-400 hover:text-zinc-200'
								}`}
							>
								Все
							</button>
							<button
								type="button"
								onClick={() => setCategoryFilter('conduction_mandibular')}
								className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
									categoryFilter === 'conduction_mandibular'
										? 'bg-blue-600 text-white shadow-xs'
										: 'text-zinc-400 hover:text-zinc-200'
								}`}
							>
								Нижняя челюсть
							</button>
							<button
								type="button"
								onClick={() => setCategoryFilter('conduction_maxillary')}
								className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
									categoryFilter === 'conduction_maxillary'
										? 'bg-blue-600 text-white shadow-xs'
										: 'text-zinc-400 hover:text-zinc-200'
								}`}
							>
								Верхняя челюсть
							</button>
							<button
								type="button"
								onClick={() => setCategoryFilter('conduction_palatal')}
								className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
									categoryFilter === 'conduction_palatal'
										? 'bg-blue-600 text-white shadow-xs'
										: 'text-zinc-400 hover:text-zinc-200'
								}`}
							>
								Небо
							</button>
							<button
								type="button"
								onClick={() => setCategoryFilter('infiltration')}
								className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
									categoryFilter === 'infiltration'
										? 'bg-blue-600 text-white shadow-xs'
										: 'text-zinc-400 hover:text-zinc-200'
								}`}
							>
								Инфильтрация
							</button>
							<button
								type="button"
								onClick={() => setCategoryFilter('intraligamentary_pressure')}
								className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
									categoryFilter === 'intraligamentary_pressure'
										? 'bg-blue-600 text-white shadow-xs'
										: 'text-zinc-400 hover:text-zinc-200'
								}`}
							>
								PDL (10–15 атм)
							</button>
						</div>

						{/* Technique Selector Grid */}
						<div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
							{filteredTechniques.map((tech) => {
								const isSelected = techniqueId === tech.id;
								return (
									<button
										key={tech.id}
										type="button"
										onClick={() => handleTechniqueChange(tech.id)}
										className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 min-h-[44px] ${
											isSelected
												? 'bg-blue-500/15 border-blue-500/50 text-blue-100 shadow-xs'
												: 'bg-zinc-900/40 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/50'
										}`}
									>
										<div className="min-w-0 flex-1">
											<div className="font-semibold text-xs sm:text-sm truncate">
												{tech.shortNameRu}
											</div>
											<div className="text-[11px] text-zinc-400 truncate">
												{tech.anatomicalLandmarksRu}
											</div>
										</div>
										<span
											className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
												tech.baseVascularHitRiskPercent >= 10
													? 'bg-rose-500/20 text-rose-300'
													: 'bg-zinc-800 text-zinc-400'
											}`}
										>
											{tech.baseVascularHitRiskPercent}% риск
										</span>
									</button>
								);
							})}
						</div>

						{/* Needle Gauge Selector */}
						<div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/80 flex flex-col gap-2">
							<div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
								<span>Калибр и длина иглы:</span>
								<span
									className="px-2 py-0.5 rounded-md text-[11px] font-bold"
									style={{
										backgroundColor: `${currentNeedle.colorCode}25`,
										color: currentNeedle.colorCode,
									}}
								>
									{currentNeedle.gauge} • {currentNeedle.lengthMm} мм
								</span>
							</div>

							<div className="grid grid-cols-2 gap-1.5">
								{Object.values(DENTAL_NEEDLE_CATALOG).map((n) => {
									const isSelected = needleId === n.id;
									return (
										<button
											key={n.id}
											type="button"
											onClick={() => setNeedleId(n.id)}
											className={`p-2 rounded-lg border text-left transition-all min-h-[44px] flex items-center gap-2 ${
												isSelected
													? 'bg-zinc-800 border-zinc-500 text-white'
													: 'bg-zinc-950/40 border-zinc-800/60 text-zinc-400 hover:text-zinc-200'
											}`}
										>
											<span
												className="w-3 h-3 rounded-full shrink-0"
												style={{ backgroundColor: n.colorCode }}
											/>
											<div className="min-w-0">
												<div className="text-xs font-bold truncate">
													{n.gauge} × {n.lengthMm} мм
												</div>
												<div className="text-[10px] text-zinc-500 truncate">
													{n.capColorRu} колпачок
												</div>
											</div>
										</button>
									);
								})}
							</div>

							{needleValidation.warningRu && (
								<div
									className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
										needleValidation.isSevereMismatch
											? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
											: 'bg-amber-500/10 border-amber-500/30 text-amber-300'
									}`}
								>
									<AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
									<span className="leading-tight">{needleValidation.warningRu}</span>
								</div>
							)}
						</div>

						{/* Anesthetic Drug & Volume */}
						<div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/80 flex flex-col gap-2.5">
							<div className="text-xs font-semibold text-zinc-300">Препарат и объем:</div>

							<div className="grid grid-cols-1 gap-1">
								{Object.values(ANESTHETIC_DRUGS_CATALOG).map((d) => {
									const isSelected = drugKey === d.key;
									return (
										<button
											key={d.key}
											type="button"
											onClick={() => setDrugKey(d.key)}
											className={`p-2 rounded-lg border text-left transition-all min-h-[44px] flex items-center justify-between ${
												isSelected
													? 'bg-blue-600/20 border-blue-500 text-blue-100'
													: 'bg-zinc-950/40 border-zinc-800/60 text-zinc-400 hover:text-zinc-200'
											}`}
										>
											<div className="min-w-0">
												<div className="text-xs font-bold truncate">{d.tradeNamesRu[0]}</div>
												<div className="text-[10px] text-zinc-500 truncate">{d.activeSubstanceRu}</div>
											</div>
											<span className="text-[10px] font-mono font-semibold text-zinc-400 ml-2 shrink-0">
												{d.vasoconstrictorRatio === 'none' ? 'БЕЗ адреналина' : d.vasoconstrictorRatio}
											</span>
										</button>
									);
								})}
							</div>

							{/* Volume chips */}
							<div className="flex items-center gap-1.5 flex-wrap pt-1">
								{[0.3, 0.5, 1.0, 1.7, 2.0, 3.4].map((vol) => {
									const isSelected = volumeMl === vol;
									return (
										<button
											key={vol}
											type="button"
											onClick={() => setVolumeMl(vol)}
											className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold min-h-[40px] border transition-all ${
												isSelected
													? 'bg-blue-600 text-white border-blue-500'
													: 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-700'
											}`}
										>
											{vol} мл
										</button>
									);
								})}
							</div>

							{/* Side & Tooth details */}
							<div className="grid grid-cols-2 gap-2 pt-1">
								<div>
									<label className="text-[11px] text-zinc-400 block mb-1">Сторона:</label>
									<div className="grid grid-cols-3 gap-1">
										{(['right', 'left', 'bilateral'] as const).map((s) => (
											<button
												key={s}
												type="button"
												onClick={() => setSide(s)}
												className={`py-1 rounded text-xs font-semibold border ${
													side === s
														? 'bg-zinc-700 border-zinc-500 text-white'
														: 'bg-zinc-900 border-zinc-800 text-zinc-400'
												}`}
											>
												{s === 'right' ? 'Право' : s === 'left' ? 'Лево' : 'Обе'}
											</button>
										))}
									</div>
								</div>
								<div>
									<label className="text-[11px] text-zinc-400 block mb-1">Зуб (FDI):</label>
									<input
										type="text"
										value={toothNumber}
										onChange={(e) => setToothNumber(e.target.value)}
										placeholder="Напр. 46"
										className="w-full px-2.5 py-1 text-xs rounded border bg-zinc-900 border-zinc-700 text-white focus:border-blue-500 outline-hidden font-mono"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* ══ COLUMN 2: DOMINANT ASPIRATION TEST COCKPIT (4 Cols) ══ */}
					<div className="lg:col-span-4">
						<AspirationTestCockpit
							currentTechnique={currentTechnique}
							vascularAssessment={vascularAssessment}
							velocityPlan={velocityPlan}
							aspirationStatus={aspirationStatus}
							isTwoPlaneConfirmed={isTwoPlaneConfirmed}
							onTwoPlaneChange={setIsTwoPlaneConfirmed}
							attempts={attempts}
							positiveEmergencyOpen={positiveEmergencyOpen}
							onNegativeAspiration={handleNegativeAspiration}
							onPositiveAspiration={handlePositiveAspiration}
							onReplaceCarpuleAndRetest={handleReplaceCarpuleAndRetest}
						/>
					</div>

					{/* ══ COLUMN 3: ANATOMICAL NUMBNESS MAP & ONSET COUNTDOWN TIMER (4 Cols) ══ */}
					<div className="lg:col-span-4 flex flex-col gap-4">
						<AnesthesiaOnsetTimerWidget
							currentTechnique={currentTechnique}
							timerSecondsLeft={timerSecondsLeft}
							isTimerRunning={isTimerRunning}
							timerCompleted={timerCompleted}
							soundEnabled={soundEnabled}
							onToggleSound={() => setSoundEnabled(!soundEnabled)}
							onToggleTimer={() => setIsTimerRunning(!isTimerRunning)}
							onAddMinute={() => setTimerSecondsLeft((prev) => prev + 60)}
							onResetTimer={() => {
								setIsTimerRunning(false);
								setTimerCompleted(false);
								setTimerSecondsLeft(currentTechnique.onsetMinutes.defaultWaitTimeSec);
							}}
						/>

						<AnesthesiaAnatomyMapWidget currentTechnique={currentTechnique} />

						{/* Doctor's Notes field */}
						<div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/80 flex flex-col gap-1.5">
							<label className="text-xs font-semibold text-zinc-300">
								Клинические примечания врача:
							</label>
							<input
								type="text"
								value={notesRu}
								onChange={(e) => setNotesRu(e.target.value)}
								placeholder="Напр. Пациент отмечает онемение кончика языка"
								className="w-full px-3 py-1.5 text-xs rounded-lg border bg-zinc-950 border-zinc-700 text-white focus:border-blue-500 outline-hidden"
							/>
						</div>
					</div>
				</div>

				{/* ── PREVIEW OF FORM 043/U MEDICAL RECORD ENTRY ── */}
				<div
					className="px-5 py-3 border-t flex flex-col gap-2 shrink-0"
					style={{
						backgroundColor: 'var(--paper-strong, #1f1f23)',
						borderColor: 'var(--border, #27272a)',
					}}
				>
					<div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
						<div className="flex items-center gap-2">
							<FileText className="w-4 h-4 text-blue-400" />
							<span>Предпросмотр протокола для амбулаторной карты 043/у:</span>
						</div>
						{exportResult.warningsRu.length > 0 && (
							<span className="text-amber-400 text-xs flex items-center gap-1 font-normal">
								<AlertTriangle className="w-3.5 h-3.5" />
								{exportResult.warningsRu[0]}
							</span>
						)}
					</div>

					<div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
						{exportResult.diaryText043}
					</div>
				</div>

				{/* ── MODAL FOOTER ACTIONS ── */}
				<div
					className="flex items-center justify-between px-5 py-3.5 border-t shrink-0 flex-wrap gap-3"
					style={{
						backgroundColor: 'var(--paper, #18181b)',
						borderColor: 'var(--border, #27272a)',
					}}
				>
					<button
						type="button"
						onClick={handleCopyDiary}
						className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition-colors min-h-[44px]"
					>
						{isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
						<span>{isCopied ? 'Скопировано!' : 'Копировать текст'}</span>
					</button>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition-colors min-h-[44px]"
						>
							Закрыть
						</button>

						<button
							type="button"
							onClick={handleApplyToDiary}
							disabled={isLocked}
							className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all min-h-[44px] shadow-md ${
								isLocked
									? 'opacity-50 cursor-not-allowed bg-zinc-700 text-zinc-400'
									: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30'
							}`}
						>
							<FileText className="w-4 h-4" />
							<span>📝 Вставить в дневник Формы 043/у</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
