import React, { useMemo, useState } from "react";
import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Heart,
	Minus,
	Plus,
	ShieldCheck,
	Syringe,
	Zap,
} from "lucide-react";
import {
	ANESTHESIA_DRUGS,
	ANESTHESIA_METHODS,
	type AnesthesiaDrugKey,
	type AnesthesiaMethodKey,
	calculateAnesthesiaSafety,
	formatAnesthesiaSoapText,
} from "./anesthesiaCalculatorEngine";
import { showToast } from "../GlobalToast";

export interface AnesthesiaCalculatorProps {
	readonly defaultToothNumber?: number | string | undefined;
	readonly defaultWeightKg?: number | undefined;
	readonly onApplyToDiary?: ((anesthesiaSoapText: string) => void) | undefined;
	readonly isLocked?: boolean | undefined;
	readonly className?: string | undefined;
}

export const AnesthesiaCalculator: React.FC<AnesthesiaCalculatorProps> = ({
	defaultToothNumber,
	defaultWeightKg = 70,
	onApplyToDiary,
	isLocked = false,
	className = "",
}) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const [drugKey, setDrugKey] = useState<AnesthesiaDrugKey>("ultracain_ds_forte");
	const [methodKey, setMethodKey] = useState<AnesthesiaMethodKey>("infiltration");
	const [patientWeightKg, setPatientWeightKg] = useState<number>(defaultWeightKg);
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

	const calc = useMemo(() => {
		return calculateAnesthesiaSafety({
			drugKey,
			patientWeightKg,
			carpulesCount,
		});
	}, [drugKey, patientWeightKg, carpulesCount]);

	const soapText = useMemo(() => {
		return formatAnesthesiaSoapText({
			methodKey,
			drugKey,
			carpulesCount,
			patientWeightKg,
			...(toothNumber.trim() ? { toothNumber: toothNumber.trim() } : {}),
			aspirationTestPassed,
			reactionNormal,
			...(anesthesiaTime.trim() ? { anesthesiaStartTime: anesthesiaTime.trim() } : {}),
		});
	}, [
		methodKey,
		drugKey,
		carpulesCount,
		patientWeightKg,
		toothNumber,
		aspirationTestPassed,
		reactionNormal,
		anesthesiaTime,
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

	const safetyBarColorClass =
		calc.safetyLevel === "safe"
			? "bg-emerald-500 text-emerald-700 dark:text-emerald-300"
			: calc.safetyLevel === "caution"
				? "bg-amber-500 text-amber-700 dark:text-amber-300"
				: calc.safetyLevel === "warning"
					? "bg-orange-500 text-orange-700 dark:text-orange-300"
					: "bg-rose-600 text-rose-700 dark:text-rose-300";

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
							<span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
								{calc.drug.commercialName} · {calc.totalVolumeMl} мл
							</span>
						</h4>
						<p className="text-xs text-[var(--muted)]">
							Расчет дозировки по массе тела ({calc.patientWeightKg} кг) · СтАР / Приказ №804н
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
										className={`min-h-[48px] p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
											isSelected
												? "border-teal-500 bg-teal-500/10 shadow-sm ring-1 ring-teal-500"
												: "border-[var(--border)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)]"
										}`}
									>
										<div className="flex items-center justify-between w-full">
											<span className="text-xs font-bold text-[var(--ink)]">
												{d.commercialName}
											</span>
											{d.isAdrenalineFree && (
												<span
													className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-0.5"
													title="Без адреналина — безопасно для сердца"
												>
													<Heart size={9} /> БЕЗ АДР.
												</span>
											)}
										</div>
										<span className="text-[10px] text-[var(--muted)] line-clamp-1 mt-0.5">
											{d.vasoconstrictor} · {d.mgPerCarpule} мг/карп.
										</span>
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
											className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
												isSelected
													? "border-teal-500 bg-teal-500/15 text-teal-800 dark:text-teal-200 font-bold"
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
									className="min-h-[44px] w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:border-teal-500"
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
									className="min-h-[44px] w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:border-teal-500"
								/>
							</div>
						</div>
					</div>

					{/* Weight & Carpule Dosage Calculator */}
					<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-3">
						<div className="flex flex-wrap items-center justify-between gap-4">
							{/* Weight Selector */}
							<div className="flex items-center gap-2">
								<span className="text-xs font-bold text-[var(--ink)]">Масса тела:</span>
								<div className="flex items-center gap-1">
									{[50, 60, 70, 80, 90].map((w) => (
										<button
											key={w}
											type="button"
											onClick={() => setPatientWeightKg(w)}
											className={`min-h-[38px] px-2.5 py-1 text-xs rounded-lg border font-mono font-medium transition-all ${
												patientWeightKg === w
													? "bg-teal-600 text-white border-teal-600 font-bold"
													: "bg-[var(--paper)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--paper-strong)]"
											}`}
										>
											{w} кг
										</button>
									))}
								</div>
								<div className="flex items-center gap-1 ml-1">
									<input
										type="number"
										min={10}
										max={250}
										value={patientWeightKg}
										onChange={(e) =>
											setPatientWeightKg(
												Math.max(10, Math.min(250, Number(e.target.value) || 70)),
											)
										}
										className="w-16 min-h-[38px] px-2 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] font-mono font-bold text-center"
									/>
									<span className="text-xs text-[var(--muted)]">кг</span>
								</div>
							</div>

							{/* Carpules Stepper */}
							<div className="flex items-center gap-2">
								<span className="text-xs font-bold text-[var(--ink)]">Количество карпул:</span>
								<div className="flex items-center gap-1 bg-[var(--paper)] border border-[var(--border)] rounded-xl p-1">
									<button
										type="button"
										onClick={() =>
											setCarpulesCount((c) =>
												Math.max(0.5, Math.round((c - 0.5) * 10) / 10),
											)
										}
										className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
										title="Уменьшить на 0.5 карпулы"
									>
										<Minus size={14} />
									</button>
									<span className="w-12 text-center text-sm font-mono font-bold text-[var(--ink)]">
										{carpulesCount} к.
									</span>
									<button
										type="button"
										onClick={() =>
											setCarpulesCount((c) =>
												Math.min(10, Math.round((c + 0.5) * 10) / 10),
											)
										}
										className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
										title="Увеличить на 0.5 карпулы"
									>
										<Plus size={14} />
									</button>
								</div>
								<span className="text-xs font-mono text-[var(--muted)]">
									({calc.totalVolumeMl} мл / {calc.totalDoseMg} мг)
								</span>
							</div>
						</div>

						{/* Visual Toxicity Progress Gauge */}
						<div className="space-y-1 pt-1">
							<div className="flex items-center justify-between text-xs">
								<span className="text-[var(--muted)]">
									Нагрузка анестетика: <strong>{calc.totalDoseMg} мг</strong> из макс. безоп.{" "}
									<strong>{calc.maxSafeDoseMg} мг</strong> ({calc.maxSafeCarpules} карп.)
								</span>
								<span className="font-mono font-bold text-[var(--ink)]">
									{calc.safetyPercentage}%
								</span>
							</div>
							<div className="w-full h-2.5 rounded-full bg-[var(--paper)] border border-[var(--border)] overflow-hidden">
								<div
									className={`h-full rounded-full transition-all duration-300 ${
										calc.safetyLevel === "safe"
											? "bg-emerald-500"
											: calc.safetyLevel === "caution"
												? "bg-amber-500"
												: calc.safetyLevel === "warning"
													? "bg-orange-500"
													: "bg-rose-600"
									}`}
									style={{ width: `${Math.min(100, calc.safetyPercentage)}%` }}
								/>
							</div>

							{calc.warningMessage && (
								<div
									className={`text-xs p-2 rounded-lg flex items-center gap-2 mt-2 ${
										calc.safetyLevel === "danger"
											? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30"
											: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
									}`}
								>
									{calc.safetyLevel === "danger" ? (
										<AlertOctagon size={16} className="shrink-0" />
									) : (
										<AlertTriangle size={16} className="shrink-0" />
									)}
									<span>{calc.warningMessage}</span>
								</div>
							)}
						</div>
					</div>

					{/* Clinical Safety Checks */}
					<div className="flex flex-wrap items-center gap-4 text-xs">
						<label className="flex items-center gap-2 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={aspirationTestPassed}
								onChange={(e) => setAspirationTestPassed(e.target.checked)}
								className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-[var(--border)]"
							/>
							<span className="font-medium text-[var(--ink)]">
								Аспирационная проба отрицательная (сосуд не поврежден)
							</span>
						</label>

						<label className="flex items-center gap-2 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={reactionNormal}
								onChange={(e) => setReactionNormal(e.target.checked)}
								className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-[var(--border)]"
							/>
							<span className="font-medium text-[var(--ink)]">
								Самочувствие нормальное, без токсических реакций
							</span>
						</label>
					</div>

					{/* Live SOAP Preview & 1-Click Action Button */}
					<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-2.5">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--muted)]">
								Формируемая запись для дневника 043/у (SOAP / План лечения):
							</span>
							<span className="text-[10px] text-teal-700 dark:text-teal-400 font-mono">
								СтАР-совместимо
							</span>
						</div>
						<p className="text-xs text-[var(--ink)] italic bg-[var(--paper)] p-2.5 rounded-lg border border-[var(--border)]">
							{soapText}
						</p>

						<div className="flex justify-end">
							<button
								type="button"
								onClick={handleApply}
								disabled={isLocked}
								className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:from-teal-700 active:to-emerald-700 shadow-md shadow-teal-600/20 cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
								title="Внести протокол анестезии в план лечения дневника 043/у"
							>
								<Syringe size={15} />
								<span>Внести анестезию в дневник (1 клик)</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
