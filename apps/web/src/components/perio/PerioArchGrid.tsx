/**
 * PerioArchGrid.tsx — Скоростная таблица ввода пародонтальных измерений (SEPA / Florida Probe).
 *
 * Создан по образу DentalPin (PerioArchBlock.vue):
 * - Фиксированная колонка под каждый зуб (table-fixed, colgroup)
 * - Авто-выделение значения при фокусе (selectOnFocus) для мгновенной перезаписи цифры
 * - Сквозная Tab-навигация слева направо по всем сайтам зондирования
 * - Клик-циклы:
 *     * Подвижность: 0 -> I -> II -> III -> 0
 *     * Фуркация: 0 -> I -> II -> III -> 0 (для моляров и премоляров)
 *     * Имплантат: ● / · (клик-переключатель)
 *     * BOP (кровоточивость) и Plaque (налёт): 1-клик кнопки-квадраты
 * - 1-клик пресеты нормы (Мандат 8e): «Физиологическая норма» (все карманы 2 мм, GM 0, BOP нет)
 * - Интегрированный SVG-профиль карманов PerioProfileStrip с нулевым сдвигом верстки (Zero CLS)
 */

import React, { useCallback, useId, useMemo, useState } from "react";
import type {
	FurcationGrade,
	MobilityGrade,
	PerioSiteKey,
	PerioSiteMeasurement,
	PerioToothRecord,
} from "@dental/shared";
import {
	PERIO_LOWER_ARCH_TEETH,
	PERIO_UPPER_ARCH_TEETH,
} from "@dental/shared";
import {
	Droplet,
	RotateCcw,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import {
	getOrderedSitesForTooth,
	isFurcationEligibleTooth,
	type PerioArch,
	type PerioAspect,
} from "./perioProfileMath";
import { PerioProfileStrip } from "./PerioProfileStrip";
import { probingDepthClasses } from "./perioHeatmap";

export interface PerioArchGridProps {
	/** Зубы зубного ряда (16 зубов: 18..28 для верхней челюсти, 48..38 для нижней) */
	readonly teeth: readonly PerioToothRecord[];
	/** Челюсть: верхняя ('upper') или нижняя ('lower') */
	readonly arch: PerioArch;
	/** Активная анатомическая поверхность: 'buccal' (вестибулярно), 'lingual' (орально) или 'both' (обе поверхности SEPA) */
	readonly initialAspect?: ("buccal" | "lingual" | "both") | undefined;
	/** Callback при изменении зубов */
	readonly onChange?: ((updatedTeeth: PerioToothRecord[]) => void) | undefined;
	/** Режим только для чтения */
	readonly readOnly?: boolean | undefined;
	/** Выбранный номер зуба */
	readonly selectedToothNumber?: number | null | undefined;
	/** Callback при выборе зуба */
	readonly onSelectTooth?: ((toothNumber: number) => void) | undefined;
	/** Дополнительный CSS класс */
	readonly className?: string | undefined;
}

export const PerioArchGrid: React.FC<PerioArchGridProps> = ({
	teeth,
	arch,
	initialAspect = "both",
	onChange,
	readOnly = false,
	selectedToothNumber = null,
	onSelectTooth,
	className = "",
}) => {
	const gridId = useId();
	const [activeAspect, setActiveAspect] = useState<"buccal" | "lingual" | "both">(initialAspect);

	// Упорядочивание зубов по дуге:
	// Верхняя: 18..11, 21..28
	// Нижняя:  48..41, 31..38
	const standardArchTeeth = arch === "upper" ? PERIO_UPPER_ARCH_TEETH : PERIO_LOWER_ARCH_TEETH;

	const orderedTeeth = useMemo(() => {
		const teethMap = new Map<number, PerioToothRecord>();
		for (const t of teeth) {
			teethMap.set(t.toothNumber, t);
		}
		return standardArchTeeth.map((num) => {
			return (
				teethMap.get(num) ?? {
					toothNumber: num,
					isMissing: false,
					isImplant: false,
					mobility: 0,
					furcation: 0,
					distoBuccal: { probingDepthMm: 0, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
					midBuccal: { probingDepthMm: 0, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
					mesioBuccal: { probingDepthMm: 0, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
					distoLingual: { probingDepthMm: 0, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
					midLingual: { probingDepthMm: 0, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
					mesioLingual: { probingDepthMm: 0, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				}
			);
		});
	}, [teeth, standardArchTeeth]);

	// Мутация отдельного зуба
	const updateTooth = useCallback(
		(toothNumber: number, patch: Partial<PerioToothRecord>) => {
			if (readOnly || !onChange) return;
			const updated = orderedTeeth.map((t) => (t.toothNumber === toothNumber ? { ...t, ...patch } : t));
			onChange(updated);
		},
		[readOnly, onChange, orderedTeeth]
	);

	// Мутация измерения конкретного сайта
	const updateSite = useCallback(
		(toothNumber: number, siteKey: PerioSiteKey, patch: Partial<PerioSiteMeasurement>) => {
			if (readOnly || !onChange) return;
			const updated = orderedTeeth.map((t) => {
				if (t.toothNumber !== toothNumber) return t;
				const current = t[siteKey] ?? {
					probingDepthMm: 0,
					gingivalMarginMm: 0,
					bleedingOnProbing: false,
					plaque: false,
					suppuration: false,
					calculus: false,
				};
				return {
					...t,
					[siteKey]: { ...current, ...patch },
				};
			});
			onChange(updated);
		},
		[readOnly, onChange, orderedTeeth]
	);

	// 1-клик пресет: Физиологическая норма (Мандат 8e)
	const applyPhysiologicalNorm = useCallback(() => {
		if (readOnly || !onChange) return;
		const updated = orderedTeeth.map((t) => {
			if (t.isMissing) return t;
			const normSite: PerioSiteMeasurement = {
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				plaque: false,
				suppuration: false,
				calculus: false,
				calMm: 2,
			};
			return {
				...t,
				mobility: 0 as MobilityGrade,
				furcation: 0 as FurcationGrade,
				distoBuccal: { ...normSite },
				midBuccal: { ...normSite },
				mesioBuccal: { ...normSite },
				distoLingual: { ...normSite },
				midLingual: { ...normSite },
				mesioLingual: { ...normSite },
			};
		});
		onChange(updated);
	}, [readOnly, onChange, orderedTeeth]);

	// 1-клик очистка всех измерений
	const resetAllMeasurements = useCallback(() => {
		if (readOnly || !onChange) return;
		const updated = orderedTeeth.map((t) => {
			const zeroSite: PerioSiteMeasurement = {
				probingDepthMm: 0,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				plaque: false,
				suppuration: false,
				calculus: false,
				calMm: 0,
			};
			return {
				...t,
				mobility: 0 as MobilityGrade,
				furcation: 0 as FurcationGrade,
				distoBuccal: { ...zeroSite },
				midBuccal: { ...zeroSite },
				mesioBuccal: { ...zeroSite },
				distoLingual: { ...zeroSite },
				midLingual: { ...zeroSite },
				mesioLingual: { ...zeroSite },
			};
		});
		onChange(updated);
	}, [readOnly, onChange, orderedTeeth]);

	// Клик-циклы
	const cycleMobility = (tooth: PerioToothRecord) => {
		if (readOnly || tooth.isMissing) return;
		const next = (((tooth.mobility ?? 0) + 1) % 4) as MobilityGrade;
		updateTooth(tooth.toothNumber, { mobility: next });
	};

	const cycleFurcation = (tooth: PerioToothRecord) => {
		if (readOnly || tooth.isMissing || !isFurcationEligibleTooth(tooth.toothNumber)) return;
		const next = (((tooth.furcation ?? 0) + 1) % 4) as FurcationGrade;
		updateTooth(tooth.toothNumber, { furcation: next });
	};

	const toggleImplant = (tooth: PerioToothRecord) => {
		if (readOnly || tooth.isMissing) return;
		updateTooth(tooth.toothNumber, { isImplant: !tooth.isImplant });
	};

	const toggleMissing = (tooth: PerioToothRecord) => {
		if (readOnly) return;
		updateTooth(tooth.toothNumber, { isMissing: !tooth.isMissing });
	};

	// Авто-выделение значения при фокусе (selectOnFocus)
	const handleFocusSelect = (e: React.FocusEvent<HTMLInputElement>) => {
		e.target.select();
	};

	// Быстрый парсинг числового ввода
	const handleNumericInput = (
		toothNumber: number,
		siteKey: PerioSiteKey,
		field: "probingDepthMm" | "gingivalMarginMm",
		valStr: string
	) => {
		const trimmed = valStr.trim();
		if (trimmed === "") {
			updateSite(toothNumber, siteKey, { [field]: 0 });
			return;
		}
		const num = Number(trimmed);
		if (!Number.isNaN(num)) {
			const clamped = field === "probingDepthMm"
				? Math.max(0, Math.min(15, Math.round(num)))
				: Math.max(-5, Math.min(10, Math.round(num)));
			updateSite(toothNumber, siteKey, { [field]: clamped });
		}
	};

	// Форматирование глифов
	const formatMobility = (m: number | undefined) => {
		if (!m || m === 0) return "·";
		return m === 1 ? "I" : m === 2 ? "II" : "III";
	};

	const formatFurcation = (f: number | undefined) => {
		if (!f || f === 0) return "·";
		return f === 1 ? "I" : f === 2 ? "II" : "III";
	};

	// Рендер набора строк для конкретной поверхности (вестибулярной или оральной)
	const renderSiteRows = (aspect: PerioAspect) => {
		const isBuccal = aspect === "buccal";
		const labelPrefix = isBuccal ? "Вестибулярно" : arch === "upper" ? "Нёбно" : "Язычно";
		const aspectLetter = isBuccal ? "V" : arch === "upper" ? "P" : "L";
		const badgeColor = isBuccal ? "text-amber-500" : "text-sky-500";

		return (
			<React.Fragment key={`aspect-rows-${aspect}`}>
				{/* 1. Глубина зондирования (PD) */}
				<tr className="border-b border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]">
					<th
						scope="row"
						className="px-2 py-1 text-right font-medium text-[11px] text-[var(--ink,#1e293b)] whitespace-nowrap"
					>
						Зондирование (PD) <span className={`text-[10px] font-bold ${badgeColor}`}>{aspectLetter}</span>
					</th>
					{orderedTeeth.map((tooth) => {
						const sites = getOrderedSitesForTooth(tooth.toothNumber, aspect);
						return (
							<td key={`pd-${aspect}-${tooth.toothNumber}`} className="px-0.5 py-1 text-center">
								<div className="flex items-center justify-center gap-0.5">
									{sites.map((siteKey, si) => {
										const val = tooth[siteKey]?.probingDepthMm ?? 0;

										return (
											<input
												key={`input-pd-${tooth.toothNumber}-${siteKey}`}
												type="number"
												min={0}
												max={15}
												value={val === 0 ? "" : val}
												placeholder="0"
												disabled={readOnly || tooth.isMissing}
												aria-label={`Зуб ${tooth.toothNumber}, сайт ${siteKey}, глубина`}
												onFocus={handleFocusSelect}
												onChange={(e) =>
													handleNumericInput(tooth.toothNumber, siteKey, "probingDepthMm", e.target.value)
												}
												className={`w-[17px] h-[20px] p-0 text-center font-mono text-[11px] font-semibold rounded border outline-none transition-colors ${
													tooth.isMissing
														? "opacity-30 bg-transparent border-transparent"
														: probingDepthClasses(val)
												}`}
											/>
										);
									})}
								</div>
							</td>
						);
					})}
				</tr>

				{/* 2. Десневой край (GM) */}
				<tr className="border-b border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]">
					<th
						scope="row"
						className="px-2 py-1 text-right font-medium text-[11px] text-[var(--muted,#64748b)] whitespace-nowrap"
					>
						Край десны (GM) <span className={`text-[10px] font-bold ${badgeColor}`}>{aspectLetter}</span>
					</th>
					{orderedTeeth.map((tooth) => {
						const sites = getOrderedSitesForTooth(tooth.toothNumber, aspect);
						return (
							<td key={`gm-${aspect}-${tooth.toothNumber}`} className="px-0.5 py-1 text-center">
								<div className="flex items-center justify-center gap-0.5">
									{sites.map((siteKey) => {
										const val = tooth[siteKey]?.gingivalMarginMm ?? 0;
										const hasRecession = val > 0;
										const hasHyperplasia = val < 0;

										return (
											<input
												key={`input-gm-${tooth.toothNumber}-${siteKey}`}
												type="number"
												min={-5}
												max={10}
												value={val === 0 ? "" : val}
												placeholder="0"
												disabled={readOnly || tooth.isMissing}
												aria-label={`Зуб ${tooth.toothNumber}, сайт ${siteKey}, край десны`}
												onFocus={handleFocusSelect}
												onChange={(e) =>
													handleNumericInput(tooth.toothNumber, siteKey, "gingivalMarginMm", e.target.value)
												}
												className={`w-[17px] h-[20px] p-0 text-center font-mono text-[10px] rounded border outline-none transition-colors ${
													tooth.isMissing
														? "opacity-30 bg-transparent border-transparent"
														: hasRecession
															? "text-sky-600 dark:text-sky-400 font-semibold bg-sky-500/10 border-sky-500/30"
															: hasHyperplasia
																? "text-purple-600 dark:text-purple-400 font-semibold bg-purple-500/10 border-purple-500/30"
																: "bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)] focus:border-[var(--primary,#0284c7)]"
												}`}
											/>
										);
									})}
								</div>
							</td>
						);
					})}
				</tr>

				{/* 3. Кровоточивость (BOP) */}
				<tr className="border-b border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]">
					<th
						scope="row"
						className="px-2 py-1 text-right font-medium text-[11px] text-[var(--danger,#ef4444)] whitespace-nowrap"
					>
						Кровоточивость (BOP) <span className={`text-[10px] font-bold ${badgeColor}`}>{aspectLetter}</span>
					</th>
					{orderedTeeth.map((tooth) => {
						const sites = getOrderedSitesForTooth(tooth.toothNumber, aspect);
						return (
							<td key={`bop-${aspect}-${tooth.toothNumber}`} className="px-0.5 py-1 text-center">
								<div className="flex items-center justify-center gap-1">
									{sites.map((siteKey) => {
										const isBop = tooth[siteKey]?.bleedingOnProbing ?? false;
										return (
											<button
												key={`bop-btn-${tooth.toothNumber}-${siteKey}`}
												type="button"
												disabled={readOnly || tooth.isMissing}
												aria-label={`Зуб ${tooth.toothNumber}, BOP`}
												onClick={() =>
													updateSite(tooth.toothNumber, siteKey, { bleedingOnProbing: !isBop })
												}
												className={`w-[14px] h-[14px] rounded-[3px] border transition-transform cursor-pointer ${
													isBop
														? "bg-rose-500 border-rose-600 shadow-sm scale-110"
														: "bg-transparent border-[var(--line,#cbd5e1)] hover:border-rose-400"
												} ${tooth.isMissing ? "opacity-20 cursor-not-allowed" : ""}`}
											/>
										);
									})}
								</div>
							</td>
						);
					})}
				</tr>

				{/* 4. Зубной налёт (Plaque) */}
				<tr className="border-b border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]">
					<th
						scope="row"
						className="px-2 py-1 text-right font-medium text-[11px] text-[var(--muted,#64748b)] whitespace-nowrap"
					>
						Налёт (PLQ) <span className={`text-[10px] font-bold ${badgeColor}`}>{aspectLetter}</span>
					</th>
					{orderedTeeth.map((tooth) => {
						const sites = getOrderedSitesForTooth(tooth.toothNumber, aspect);
						return (
							<td key={`plaque-${aspect}-${tooth.toothNumber}`} className="px-0.5 py-1 text-center">
								<div className="flex items-center justify-center gap-1">
									{sites.map((siteKey) => {
										const isPlq = tooth[siteKey]?.plaque ?? false;
										return (
											<button
												key={`plq-btn-${tooth.toothNumber}-${siteKey}`}
												type="button"
												disabled={readOnly || tooth.isMissing}
												aria-label={`Зуб ${tooth.toothNumber}, Plaque`}
												onClick={() =>
													updateSite(tooth.toothNumber, siteKey, { plaque: !isPlq })
												}
												className={`w-[14px] h-[14px] rounded-[3px] border transition-transform cursor-pointer ${
													isPlq
														? "bg-amber-400 border-amber-500 shadow-sm scale-110"
														: "bg-transparent border-[var(--line,#cbd5e1)] hover:border-amber-400"
												} ${tooth.isMissing ? "opacity-20 cursor-not-allowed" : ""}`}
											/>
										);
									})}
								</div>
							</td>
						);
					})}
				</tr>
			</React.Fragment>
		);
	};

	return (
		<section
			className={`perio-arch-grid-container flex flex-col gap-2 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3 shadow-sm ${className}`}
		>
			{/* Верхний тулбар: переключатели поверхностей и 1-клик пресеты нормы (Мандат 8e) */}
			<header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line,#e2e8f0)] pb-2.5">
				<div className="flex items-center gap-3">
					<h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink,#1e293b)] flex items-center gap-1.5">
						<ShieldCheck className="w-4 h-4 text-[var(--primary,#0284c7)]" />
						{arch === "upper" ? "Верхняя челюсть (18..28)" : "Нижняя челюсть (48..38)"}
					</h3>

					{/* Переключатель поверхностей */}
					<div className="flex items-center rounded-md border border-[var(--line,#e2e8f0)] p-0.5 bg-[var(--paper-soft,#f8fafc)] text-[10px]">
						<button
							type="button"
							onClick={() => setActiveAspect("both")}
							className={`px-2 py-0.5 rounded font-medium transition-colors ${
								activeAspect === "both"
									? "bg-[var(--paper,#ffffff)] text-[var(--primary,#0284c7)] shadow-sm font-semibold"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#1e293b)]"
							}`}
						>
							Обе (SEPA)
						</button>
						<button
							type="button"
							onClick={() => setActiveAspect("buccal")}
							className={`px-2 py-0.5 rounded font-medium transition-colors ${
								activeAspect === "buccal"
									? "bg-[var(--paper,#ffffff)] text-[var(--primary,#0284c7)] shadow-sm font-semibold"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#1e293b)]"
							}`}
						>
							Вестибулярно (V)
						</button>
						<button
							type="button"
							onClick={() => setActiveAspect("lingual")}
							className={`px-2 py-0.5 rounded font-medium transition-colors ${
								activeAspect === "lingual"
									? "bg-[var(--paper,#ffffff)] text-[var(--primary,#0284c7)] shadow-sm font-semibold"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#1e293b)]"
							}`}
						>
							{arch === "upper" ? "Нёбно (P)" : "Язычно (L)"}
						</button>
					</div>
				</div>

				{/* 1-клик пресеты врача (Мандат 8e) — ноль заблокированных кнопок */}
				{!readOnly && (
					<div className="flex items-center gap-2">
						<button
							type="button"
							data-testid="perio-preset-norm-btn"
							onClick={applyPhysiologicalNorm}
							className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[36px] text-xs font-semibold rounded-md text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer shadow-xs"
							title="Установить норму: глубина 2 мм, GM 0, BOP нет (Мандат 8e)"
						>
							<Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
							Физиологическая норма
						</button>

						<button
							type="button"
							onClick={resetAllMeasurements}
							className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-[var(--muted,#64748b)] hover:text-[var(--ink,#1e293b)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer"
							title="Очистить измерения дуги"
						>
							<RotateCcw className="w-3 h-3" />
							Сброс
						</button>
					</div>
				)}
			</header>

			{/* Визуальный профиль карманов PerioProfileStrip */}
			<div className="perio-strip-wrapper">
				<PerioProfileStrip
					teeth={orderedTeeth}
					arch={arch}
					aspect={activeAspect === "lingual" ? "lingual" : "buccal"}
					columnWidth={60}
					height={130}
					selectedToothNumber={selectedToothNumber}
					onToothClick={onSelectTooth}
				/>
			</div>

			{/* Таблица скоростного табличного ввода */}
			<div className="overflow-x-auto">
				<table className="perio-arch-table table-fixed border-collapse w-full text-center font-mono text-[11px] leading-tight select-none">
					<colgroup>
						<col style={{ width: 130 }} />
						{orderedTeeth.map((t) => (
							<col key={`col-${t.toothNumber}`} style={{ width: 60 }} />
						))}
					</colgroup>

					{/* Заголовки номеров зубов (FDI) */}
					<thead>
						<tr className="border-b border-[var(--line-strong,#94a3b8)] bg-[var(--paper-soft,#f8fafc)]">
							<th className="px-2 py-1.5 text-right font-bold text-[11px] text-[var(--muted,#64748b)]">
								Зуб (FDI)
							</th>
							{orderedTeeth.map((tooth) => {
								const isSelected = selectedToothNumber === tooth.toothNumber;
								return (
									<th
										key={`th-fdi-${tooth.toothNumber}`}
										onClick={() => onSelectTooth?.(tooth.toothNumber)}
										className={`px-1 py-1.5 font-bold text-[12px] cursor-pointer transition-colors ${
											isSelected
												? "text-[var(--primary,#0284c7)] bg-sky-500/10"
												: tooth.isMissing
													? "text-[var(--muted,#94a3b8)] line-through"
													: "text-[var(--ink,#1e293b)]"
										}`}
									>
										{tooth.toothNumber}
									</th>
								);
							})}
						</tr>
					</thead>

					<tbody>
						{/* Строка отсутствия зуба (Missing) */}
						<tr className="border-b border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]">
							<th scope="row" className="px-2 py-1 text-right font-medium text-[10px] text-[var(--muted,#64748b)]">
								Наличие
							</th>
							{orderedTeeth.map((tooth) => (
								<td key={`missing-${tooth.toothNumber}`} className="px-1 py-1">
									<button
										type="button"
										disabled={readOnly}
										onClick={() => toggleMissing(tooth)}
										className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
											tooth.isMissing
												? "bg-rose-500/15 text-rose-600 border-rose-300 font-bold"
												: "bg-transparent text-emerald-600 border-transparent hover:border-emerald-300"
										}`}
									>
										{tooth.isMissing ? "Удал" : "Есть"}
									</button>
								</td>
							))}
						</tr>

						{/* Имплантат (Импл ● / ·) */}
						<tr className="border-b border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]">
							<th scope="row" className="px-2 py-1 text-right font-medium text-[10px] text-[var(--muted,#64748b)]">
								Имплантат
							</th>
							{orderedTeeth.map((tooth) => (
								<td key={`imp-${tooth.toothNumber}`} className="px-1 py-1">
									<button
										type="button"
										disabled={readOnly || tooth.isMissing}
										onClick={() => toggleImplant(tooth)}
										className={`w-6 h-5 rounded text-[12px] font-bold border transition-colors cursor-pointer ${
											tooth.isImplant
												? "bg-sky-500/20 text-sky-600 border-sky-400"
												: "bg-transparent text-[var(--muted,#94a3b8)] border-transparent hover:border-[var(--line,#cbd5e1)]"
										}`}
									>
										{tooth.isImplant ? "●" : "·"}
									</button>
								</td>
							))}
						</tr>

						{/* Подвижность по Миллеру (0 -> I -> II -> III -> 0) */}
						<tr className="border-b border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]">
							<th scope="row" className="px-2 py-1 text-right font-medium text-[10px] text-[var(--muted,#64748b)]">
								Подвижность
							</th>
							{orderedTeeth.map((tooth) => {
								const mob = tooth.mobility ?? 0;
								return (
									<td key={`mob-${tooth.toothNumber}`} className="px-1 py-1">
										<button
											type="button"
											disabled={readOnly || tooth.isMissing}
											onClick={() => cycleMobility(tooth)}
											className={`w-6 h-5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
												mob > 0
													? "bg-rose-500/20 text-rose-600 border-rose-400"
													: "bg-transparent text-[var(--muted,#94a3b8)] border-transparent hover:border-[var(--line,#cbd5e1)]"
											}`}
										>
											{formatMobility(mob)}
										</button>
									</td>
								);
							})}
						</tr>

						{/* Фуркация корней (0 -> I -> II -> III -> 0) */}
						<tr className="border-b border-[var(--line-strong,#94a3b8)] hover:bg-[var(--paper-soft,#f8fafc)]">
							<th scope="row" className="px-2 py-1 text-right font-medium text-[10px] text-[var(--muted,#64748b)]">
								Фуркация
							</th>
							{orderedTeeth.map((tooth) => {
								const eligible = isFurcationEligibleTooth(tooth.toothNumber);
								const furc = tooth.furcation ?? 0;
								if (!eligible) {
									return (
										<td key={`furc-${tooth.toothNumber}`} className="px-1 py-1 text-[var(--muted,#cbd5e1)]">
											—
										</td>
									);
								}
								return (
									<td key={`furc-${tooth.toothNumber}`} className="px-1 py-1">
										<button
											type="button"
											disabled={readOnly || tooth.isMissing}
											onClick={() => cycleFurcation(tooth)}
											className={`w-6 h-5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
												furc > 0
													? "bg-amber-500/20 text-amber-600 border-amber-400"
													: "bg-transparent text-[var(--muted,#94a3b8)] border-transparent hover:border-[var(--line,#cbd5e1)]"
											}`}
										>
											{formatFurcation(furc)}
										</button>
									</td>
								);
							})}
						</tr>

						{/* Вестибулярная поверхность */}
						{(activeAspect === "both" || activeAspect === "buccal") && renderSiteRows("buccal")}

						{/* Оральная поверхность */}
						{(activeAspect === "both" || activeAspect === "lingual") && renderSiteRows("lingual")}
					</tbody>
				</table>
			</div>
		</section>
	);
};
