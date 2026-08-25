import React, { useMemo, useState } from "react";
import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Baby,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Heart,
	Info,
	Minus,
	Plus,
	ShieldAlert,
	ShieldCheck,
	Syringe,
	User,
	Wind,
	Zap,
} from "lucide-react";
import {
	ANESTHESIA_DRUGS,
	ANESTHESIA_METHODS,
	type AnesthesiaDrugKey,
	type AnesthesiaMethodKey,
	type SomaticRiskProfile,
	calculateAnesthesiaSafety,
	formatAnesthesiaSoapText,
} from "./anesthesiaCalculatorEngine";
import { showToast } from "../GlobalToast";

export interface AnesthesiaCalculatorProps {
	readonly defaultToothNumber?: number | string | undefined;
	readonly defaultWeightKg?: number | undefined;
	readonly patientAgeYears?: number | null | undefined;
	readonly isPediatric?: boolean | undefined;
	readonly initialSomaticProfile?: SomaticRiskProfile | undefined;
	readonly onApplyToDiary?: ((anesthesiaSoapText: string) => void) | undefined;
	readonly isLocked?: boolean | undefined;
	readonly className?: string | undefined;
}

export const AnesthesiaCalculator: React.FC<AnesthesiaCalculatorProps> = ({
	defaultToothNumber,
	defaultWeightKg = 70,
	patientAgeYears,
	isPediatric = false,
	initialSomaticProfile,
	onApplyToDiary,
	isLocked = false,
	className = "",
}) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const [hasCardiovascularRisk, setHasCardiovascularRisk] = useState<boolean>(
		Boolean(initialSomaticProfile?.hasCardiovascularRisk || initialSomaticProfile?.hasHypertension || initialSomaticProfile?.hasIhd || initialSomaticProfile?.hasArrhythmia),
	);
	const [hasSulfiteOrAsthma, setHasSulfiteOrAsthma] = useState<boolean>(
		Boolean(initialSomaticProfile?.hasSulfiteAllergy || initialSomaticProfile?.hasBronchialAsthma),
	);
	const [isPregnantOrLactating, setIsPregnantOrLactating] = useState<boolean>(
		Boolean(initialSomaticProfile?.isPregnantOrLactating || (initialSomaticProfile?.pregnancyTrimester && initialSomaticProfile.pregnancyTrimester !== "none")),
	);

	const [drugKey, setDrugKey] = useState<AnesthesiaDrugKey>(() => {
		if (initialSomaticProfile?.hasSulfiteAllergy || initialSomaticProfile?.hasBronchialAsthma) {
			return "scandonest_3";
		}
		if (initialSomaticProfile?.isPregnantOrLactating || (initialSomaticProfile?.pregnancyTrimester && initialSomaticProfile.pregnancyTrimester !== "none")) {
			return "ultracain_ds";
		}
		if (initialSomaticProfile?.hasCardiovascularRisk || initialSomaticProfile?.hasHypertension || initialSomaticProfile?.hasIhd || initialSomaticProfile?.hasArrhythmia) {
			return "scandonest_3";
		}
		return "ultracain_ds_forte";
	});
	const [methodKey, setMethodKey] = useState<AnesthesiaMethodKey>("infiltration");
	const [patientWeightKg, setPatientWeightKg] = useState<number>(defaultWeightKg);
	const [isPediatricMode, setIsPediatricMode] = useState<boolean>(() => {
		if (isPediatric) return true;
		if (patientAgeYears !== null && patientAgeYears !== undefined && patientAgeYears < 18) return true;
		return defaultWeightKg <= 40;
	});
	const [carpulesCount, setCarpulesCount] = useState<number>(1);
	const [toothNumber, setToothNumber] = useState<string>(
		defaultToothNumber ? String(defaultToothNumber) : "",
	);
	const [aspirationTestPassed, setAspirationTestPassed] = useState(true);
	const [reactionNormal, setReactionNormal] = useState(true);
	const [anesthesiaTime, setAnesthesiaTime] = useState<string>(() => {
		const now = new Date();
		return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
	});

	const somaticProfile: SomaticRiskProfile = useMemo(() => ({
		hasCardiovascularRisk,
		hasHypertension: hasCardiovascularRisk,
		hasSulfiteAllergy: hasSulfiteOrAsthma,
		hasBronchialAsthma: hasSulfiteOrAsthma,
		isPregnantOrLactating,
	}), [hasCardiovascularRisk, hasSulfiteOrAsthma, isPregnantOrLactating]);

	const calc = useMemo(() => {
		return calculateAnesthesiaSafety({
			drugKey,
			patientWeightKg,
			carpulesCount,
			patientAgeYears,
			isPediatric: isPediatricMode,
			somaticProfile,
		});
	}, [drugKey, patientWeightKg, carpulesCount, patientAgeYears, isPediatricMode, somaticProfile]);

	const soapText = useMemo(() => {
		return formatAnesthesiaSoapText({
			methodKey,
			drugKey,
			carpulesCount,
			patientWeightKg,
			patientAgeYears,
			isPediatric: isPediatricMode,
			...(toothNumber.trim() ? { toothNumber: toothNumber.trim() } : {}),
			aspirationTestPassed,
			reactionNormal,
			...(anesthesiaTime.trim() ? { anesthesiaStartTime: anesthesiaTime.trim() } : {}),
			somaticProfile,
		});
	}, [
		methodKey,
		drugKey,
		carpulesCount,
		patientWeightKg,
		patientAgeYears,
		isPediatricMode,
		toothNumber,
		aspirationTestPassed,
		reactionNormal,
		anesthesiaTime,
		somaticProfile,
	]);

	const handleApply = () => {
		if (isLocked) {
			showToast("Дневник подписан — внесение анестезии заблокировано", "info");
			return;
		}
		if (onApplyToDiary) {
			onApplyToDiary(soapText);
			showToast("Протокол анестезии добавлен в дневник приёма", "success", 3500);
		}
	};

	const hasActiveSomaticRisks =
		hasCardiovascularRisk || hasSulfiteOrAsthma || isPregnantOrLactating;

	return (
		<div
			className={`anesthesia-calculator rounded-2xl border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] shadow-sm transition-all duration-200 overflow-hidden ${className}`.trim()}
			data-testid="anesthesia-calculator"
		>
			{/* Collapsible Header */}
			<div
				className="flex items-center justify-between p-3.5 bg-[var(--paper-soft)] cursor-pointer select-none hover:bg-[var(--paper-strong)] transition-colors"
				onClick={() => setIsExpanded((prev) => !prev)}
				role="button"
				tabIndex={0}
				aria-expanded={isExpanded}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						setIsExpanded((prev) => !prev);
					}
				}}
			>
				<div className="flex items-center gap-2.5">
					<div className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
						<Syringe size={18} />
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
							<span>Калькулятор анестезии и дозировок</span>
							<span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
								{calc.drug.commercialName} · {calc.totalVolumeMl} мл
							</span>
							{hasActiveSomaticRisks && (
								<span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
									<ShieldAlert size={12} /> Кросс-чек активен
								</span>
							)}
						</h4>
						<p className="text-xs text-[var(--muted)]">
							Расчет дозировки по массе тела ({calc.patientWeightKg} кг) · СтАР / Приказ №804н / Кардио-чек
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div
						className={`text-xs px-2.5 py-1 rounded-lg font-mono font-bold flex items-center gap-1 border ${
							calc.safetyLevel === "safe"
								? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
								: calc.safetyLevel === "caution"
									? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
									: calc.safetyLevel === "warning"
										? "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30"
										: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
						}`}
					>
						<Activity size={13} />
						<span>{calc.safetyPercentage}% макс. дозы</span>
					</div>

					<button
						type="button"
						className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] p-2 rounded-lg"
						aria-label={isExpanded ? "Свернуть калькулятор" : "Развернуть калькулятор"}
					>
						{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
					</button>
				</div>
			</div>

			{/* Expandable Body */}
			{isExpanded && (
				<div className="p-4 space-y-4 border-t border-[var(--border)] bg-[var(--paper)]">
					{/* Somatic Risk Selection Bar */}
					<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-2">
						<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
							0. Соматический статус и аллергоанамнез (Кросс-чек безопасности):
						</span>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
							{/* Cardiorisk Toggle */}
							<button
								type="button"
								onClick={() => setHasCardiovascularRisk((prev) => !prev)}
								className={`min-h-[50px] px-3.5 py-2.5 rounded-xl text-left border text-xs font-semibold transition-all flex items-center justify-between cursor-pointer touch-manipulation ${
									hasCardiovascularRisk
										? "border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-200 ring-1 ring-rose-500"
										: "border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
								}`}
							>
								<div className="flex items-center gap-2.5 min-w-0">
									<Heart size={18} className={hasCardiovascularRisk ? "text-rose-500 shrink-0" : "text-[var(--muted)] shrink-0"} />
									<div className="min-w-0">
										<div className="font-bold text-xs sm:text-sm truncate">Гипертония / ССЗ</div>
										<div className="text-xs text-[var(--muted)] truncate">МКБ I10–I15 / ИБС</div>
									</div>
								</div>
								<input
									type="checkbox"
									checked={hasCardiovascularRisk}
									onChange={() => {}}
									className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-[var(--border)] pointer-events-none shrink-0"
									tabIndex={-1}
									aria-hidden="true"
								/>
							</button>

							{/* Asthma / Sulfite Toggle */}
							<button
								type="button"
								onClick={() => setHasSulfiteOrAsthma((prev) => !prev)}
								className={`min-h-[50px] px-3.5 py-2.5 rounded-xl text-left border text-xs font-semibold transition-all flex items-center justify-between cursor-pointer touch-manipulation ${
									hasSulfiteOrAsthma
										? "border-purple-500 bg-purple-500/10 text-purple-800 dark:text-purple-200 ring-1 ring-purple-500"
										: "border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
								}`}
							>
								<div className="flex items-center gap-2.5 min-w-0">
									<Wind size={18} className={hasSulfiteOrAsthma ? "text-purple-500 shrink-0" : "text-[var(--muted)] shrink-0"} />
									<div className="min-w-0">
										<div className="font-bold text-xs sm:text-sm truncate">Астма / Сульфиты</div>
										<div className="text-xs text-[var(--muted)] truncate">Риск бронхоспазма</div>
									</div>
								</div>
								<input
									type="checkbox"
									checked={hasSulfiteOrAsthma}
									onChange={() => {}}
									className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-[var(--border)] pointer-events-none shrink-0"
									tabIndex={-1}
									aria-hidden="true"
								/>
							</button>

							{/* Pregnancy / Lactation Toggle */}
							<button
								type="button"
								onClick={() => setIsPregnantOrLactating((prev) => !prev)}
								className={`min-h-[50px] px-3.5 py-2.5 rounded-xl text-left border text-xs font-semibold transition-all flex items-center justify-between cursor-pointer touch-manipulation ${
									isPregnantOrLactating
										? "border-blue-500 bg-blue-500/10 text-blue-800 dark:text-blue-200 ring-1 ring-blue-500"
										: "border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
								}`}
							>
								<div className="flex items-center gap-2.5 min-w-0">
									<Baby size={18} className={isPregnantOrLactating ? "text-blue-500 shrink-0" : "text-[var(--muted)] shrink-0"} />
									<div className="min-w-0">
										<div className="font-bold text-xs sm:text-sm truncate">Беременность / Лактация</div>
										<div className="text-xs text-[var(--muted)] truncate">Плод / маточный кровоток</div>
									</div>
								</div>
								<input
									type="checkbox"
									checked={isPregnantOrLactating}
									onChange={() => {}}
									className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-[var(--border)] pointer-events-none shrink-0"
									tabIndex={-1}
									aria-hidden="true"
								/>
							</button>
						</div>
					</div>

					{/* Somatic Cross-Check Dynamic Alert & Recommendation Banner */}
					{calc.somaticAlerts.length > 0 && (
						<div className="space-y-2">
							{calc.somaticAlerts.map((alert) => (
								<div
									key={alert.id}
									className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
										alert.severity === "danger"
											? "bg-rose-500/10 text-rose-900 dark:text-rose-200 border-rose-500/30"
											: alert.severity === "warning"
												? "bg-orange-500/10 text-orange-900 dark:text-orange-200 border-orange-500/30"
												: alert.severity === "caution"
													? "bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/30"
													: "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-emerald-500/30"
									}`}
								>
									<div className="flex items-start gap-2.5">
										<div className="mt-0.5 shrink-0">
											{alert.severity === "danger" ? (
												<AlertOctagon size={18} className="text-rose-600 dark:text-rose-400" />
											) : alert.severity === "warning" ? (
												<AlertTriangle size={18} className="text-orange-600 dark:text-orange-400" />
											) : alert.severity === "caution" ? (
												<Info size={18} className="text-amber-600 dark:text-amber-400" />
											) : (
												<ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
											)}
										</div>
										<div>
											<div className="font-bold">{alert.title}</div>
											<div className="mt-0.5 opacity-90 leading-relaxed">{alert.message}</div>
										</div>
									</div>

									{alert.recommendedDrugKey && alert.recommendedDrugKey !== drugKey && (
										<button
											type="button"
											onClick={() => setDrugKey(alert.recommendedDrugKey!)}
											className="min-h-[44px] px-3 py-2 rounded-xl font-bold bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 active:opacity-100 shrink-0 text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
										>
											<Zap size={14} />
											<span>{alert.recommendedAction ?? "Выбрать рекомендованный"}</span>
										</button>
									)}
								</div>
							))}
						</div>
					)}

					{/* Drug Selection Chips */}
					<div>
						<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block mb-2">
							1. Препарат и действующее вещество:
						</span>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
							{(
								Object.keys(ANESTHESIA_DRUGS) as AnesthesiaDrugKey[]
							).map((k) => {
								const d = ANESTHESIA_DRUGS[k];
								const isSelected = drugKey === k;
								return (
									<button
										key={k}
										type="button"
										onClick={() => setDrugKey(k)}
										className={`min-h-[52px] p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
											isSelected
												? "border-teal-500 bg-teal-500/10 shadow-sm ring-1 ring-teal-500"
												: "border-[var(--border)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)]"
										}`}
									>
										<div className="flex items-center justify-between w-full">
											<span className="text-xs font-bold text-[var(--ink)]">
												{d.commercialName}
											</span>
											{d.isAdrenalineFree ? (
												<span
													className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-0.5"
													title="Без адреналина — безопасно для сердца и сульфит-аллергиков"
												>
													<Heart size={11} /> БЕЗ АДР.
												</span>
											) : d.vasoconstrictorRatio === "1:200000" ? (
												<span
													className="text-xs px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold flex items-center gap-0.5"
													title="1:200 000 — предпочтителен при беременности"
												>
													<Baby size={11} /> 1:200k
												</span>
											) : null}
										</div>
										<div className="flex items-center justify-between text-xs text-[var(--muted)] mt-1">
											<span>{d.vasoconstrictor}</span>
											<span>{d.mgPerCarpule} мг/карп.</span>
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* Method & Injection Details */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{/* Method Selection */}
						<div className="md:col-span-2">
							<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block mb-2">
								2. Метод анестезии:
							</span>
							<div className="flex flex-wrap gap-1.5">
								{(
									Object.keys(ANESTHESIA_METHODS) as AnesthesiaMethodKey[]
								).map((m) => {
									const method = ANESTHESIA_METHODS[m];
									const isSelected = methodKey === m;
									return (
										<button
											key={m}
											type="button"
											onClick={() => setMethodKey(m)}
											className={`min-h-[48px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer touch-manipulation ${
												isSelected
													? "border-teal-500 bg-teal-500/15 text-teal-800 dark:text-teal-200 font-extrabold shadow-xs"
													: "border-[var(--border)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
											}`}
										>
											{method.nameRu}
										</button>
									);
								})}
							</div>
						</div>

						{/* Tooth Target & Start Time */}
						<div className="space-y-2">
							<div>
								<label className="text-xs font-bold text-[var(--muted)] block mb-1">
									Зуб (FDI):
								</label>
								<input
									type="text"
									value={toothNumber}
									onChange={(e) => setToothNumber(e.target.value)}
									placeholder="например 16, 36"
									className="min-h-[48px] w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm sm:text-base font-bold outline-none focus:border-teal-500"
								/>
							</div>

							<div>
								<label className="text-xs font-bold text-[var(--muted)] block mb-1">
									Время введения:
								</label>
								<input
									type="time"
									value={anesthesiaTime}
									onChange={(e) => setAnesthesiaTime(e.target.value)}
									className="min-h-[48px] w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm sm:text-base font-bold outline-none focus:border-teal-500"
								/>
							</div>
						</div>
					</div>

					{/* Weight & Carpule Dosage Calculator */}
					<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-3.5">
						<div className="flex flex-wrap items-center justify-between gap-4">
							{/* Age / Category & Weight Selector */}
							<div className="flex flex-wrap items-center gap-2">
								{/* Pediatric / Adult Mode Toggle */}
								<div className="inline-flex rounded-xl border border-[var(--border)] p-1 bg-[var(--paper)]">
									<button
										type="button"
										onClick={() => setIsPediatricMode(false)}
										className={`min-h-[44px] px-3.5 py-2 text-xs sm:text-sm rounded-lg font-extrabold flex items-center gap-1.5 transition-all touch-manipulation cursor-pointer ${
											!isPediatricMode
												? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] shadow-xs"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										<User size={15} />
										<span>Взрослый (7 мг/кг)</span>
									</button>
									<button
										type="button"
										onClick={() => setIsPediatricMode(true)}
										className={`min-h-[44px] px-3.5 py-2 text-xs sm:text-sm rounded-lg font-extrabold flex items-center gap-1.5 transition-all touch-manipulation cursor-pointer ${
											isPediatricMode
												? "bg-amber-500 text-white shadow-xs"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										<Baby size={15} />
										<span>Детский (5 мг/кг)</span>
									</button>
								</div>

								<span className="text-xs font-bold text-[var(--ink)] ml-2">Вес:</span>
								<div className="flex items-center gap-1.5">
									{(isPediatricMode ? [15, 20, 25, 30, 40] : [50, 60, 70, 80, 90]).map((w) => (
										<button
											key={w}
											type="button"
											onClick={() => setPatientWeightKg(w)}
											className={`min-h-[48px] min-w-[54px] px-3 py-2 text-xs sm:text-sm rounded-xl border font-mono font-bold transition-all touch-manipulation cursor-pointer ${
												patientWeightKg === w
													? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] border-[var(--teal)] shadow-xs"
													: "bg-[var(--paper)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--paper-strong)]"
											}`}
										>
											{w} кг
										</button>
									))}
								</div>
								<div className="flex items-center gap-1.5 ml-1">
									<input
										type="number"
										min={5}
										max={250}
										value={patientWeightKg}
										onChange={(e) =>
											setPatientWeightKg(
												Math.max(5, Math.min(250, Number(e.target.value) || 70)),
											)
										}
										className="w-20 min-h-[48px] px-2.5 py-2 text-sm sm:text-base rounded-xl border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] font-mono font-black text-center"
									/>
									<span className="text-xs font-bold text-[var(--muted)]">кг</span>
								</div>
							</div>

							{/* Carpules Stepper */}
							<div className="flex items-center gap-2.5">
								<span className="text-xs font-bold text-[var(--ink)]">Количество карпул:</span>
								<div className="flex items-center gap-1 bg-[var(--paper)] border border-[var(--border)] rounded-xl p-1">
									<button
										type="button"
										onClick={() =>
											setCarpulesCount((c) =>
												Math.max(0.5, Math.round((c - 0.5) * 10) / 10),
											)
										}
										className="min-h-[48px] min-w-[48px] flex items-center justify-center p-2 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer touch-manipulation active:scale-95"
										title="Уменьшить на 0.5 карпулы"
									>
										<Minus size={18} />
									</button>
									<span className="w-14 text-center text-base font-mono font-black text-[var(--ink)]">
										{carpulesCount} к.
									</span>
									<button
										type="button"
										onClick={() =>
											setCarpulesCount((c) =>
												Math.min(10, Math.round((c + 0.5) * 10) / 10),
											)
										}
										className="min-h-[48px] min-w-[48px] flex items-center justify-center p-2 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer touch-manipulation active:scale-95"
										title="Увеличить на 0.5 карпулы"
									>
										<Plus size={18} />
									</button>
								</div>
								<span className="text-xs font-mono font-medium text-[var(--muted)]">
									({calc.totalVolumeMl} мл / {calc.totalDoseMg} мг
									{calc.totalEpinephrineMg > 0 ? ` / ${calc.totalEpinephrineMg} мг адр.` : ""}
									)
								</span>
							</div>
						</div>

						{/* Visual Toxicity & Epinephrine Progress Gauge */}
						<div className="space-y-1.5 pt-1">
							<div className="flex items-center justify-between text-xs">
								<span className="text-[var(--muted)] flex items-center gap-2">
									<span>
										Нагрузка анестетика: <strong>{calc.totalDoseMg} мг</strong> из макс. безоп.{" "}
										<strong>{calc.maxSafeDoseMg} мг</strong> ({calc.maxSafeCarpules} карп.)
									</span>
									{calc.isCardioRestricted && (
										<span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-500/30 flex items-center gap-1">
											<Heart size={11} className="text-rose-600 dark:text-rose-400" />
											<span>{calc.cardioLimitBadgeText ?? "Кардиологический лимит"} (макс. {calc.maxSafeCarpules} к. / {calc.maxSafeEpinephrineMg} мг адр.)</span>
										</span>
									)}
								</span>
								<span
									className={`font-mono font-black ${
										calc.safetyPercentage > 100
											? "text-rose-600 font-extrabold"
											: calc.safetyPercentage > 75
												? "text-orange-500"
												: "text-teal-700 dark:text-teal-300"
									}`}
								>
									{calc.safetyPercentage}% от суточного лимита
								</span>
							</div>
							<div className="w-full h-2.5 rounded-full bg-[var(--paper)] border border-[var(--border)] overflow-hidden">
								<div
									className={`h-full rounded-full transition-all duration-300 ${
										calc.safetyPercentage > 100
											? "bg-rose-500"
											: calc.safetyPercentage > 75
												? "bg-orange-500"
												: "bg-teal-500"
									}`}
									style={{ width: `${Math.min(100, calc.safetyPercentage)}%` }}
								/>
							</div>

							{calc.warningMessage && (
								<div
									className={`text-xs p-2.5 rounded-xl flex items-center gap-2 mt-2 font-medium ${
										calc.safetyLevel === "danger"
											? "bg-rose-500/10 text-rose-800 dark:text-rose-200 border border-rose-500/30"
											: "bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/30"
									}`}
								>
									{calc.safetyLevel === "danger" ? (
										<AlertOctagon size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
									) : (
										<AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
									)}
									<span>{calc.warningMessage}</span>
								</div>
							)}
						</div>
					</div>

					{/* Clinical Safety Checks */}
					<div className="flex flex-wrap items-center gap-4 text-xs">
						<label className="flex items-center gap-2.5 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={aspirationTestPassed}
								onChange={(e) => setAspirationTestPassed(e.target.checked)}
								className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-[var(--border)]"
							/>
							<span className="font-semibold text-[var(--ink)]">
								Аспирационная проба отрицательная (сосуд не поврежден)
							</span>
						</label>

						<label className="flex items-center gap-2.5 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={reactionNormal}
								onChange={(e) => setReactionNormal(e.target.checked)}
								className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-[var(--border)]"
							/>
							<span className="font-semibold text-[var(--ink)]">
								Самочувствие нормальное, без токсических реакций
							</span>
						</label>
					</div>

					{/* Live SOAP Preview & 1-Click Action Button */}
					<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-2.5">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--muted)]">
								Формируемая запись для дневника 043/у (SOAP / План лечения):
							</span>
							<span className="text-xs text-teal-700 dark:text-teal-400 font-mono font-bold">
								СтАР-совместимо
							</span>
						</div>
						<p className="text-xs text-[var(--ink)] italic bg-[var(--paper)] p-3 rounded-lg border border-[var(--border)] font-medium">
							{soapText}
						</p>

						<div className="flex justify-end">
							<button
								type="button"
								onClick={handleApply}
								disabled={isLocked}
								className="min-h-[50px] px-6 py-3 rounded-xl text-xs sm:text-sm font-black bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 active:opacity-100 shadow-md shadow-teal-600/20 cursor-pointer transition-all flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-[0.98]"
								title="Внести протокол анестезии в план лечения дневника 043/у"
							>
								<Syringe size={17} />
								<span>Внести анестезию в дневник (1 клик)</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

