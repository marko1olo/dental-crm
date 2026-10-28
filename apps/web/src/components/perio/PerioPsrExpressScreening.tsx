/**
 * PerioPsrExpressScreening.tsx — Экспресс-скрининг ВОЗ (PSR/CPITN) по 6 секстантам
 * Первичный экран у кресла врача (Мандат 8e, Apple HIG, 220–270 строк).
 */

import React, { useMemo } from "react";
import { Check, ClipboardCopy, Layers, Sparkles, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import {
	PSR_CODE_DEFINITIONS,
	PSR_SEXTANTS_CONFIG,
	type PsrCode,
	type PsrScreeningMap,
	type PsrSextantId,
	type PerioScreeningSummary,
} from "./perioTypes";

export interface PerioPsrExpressScreeningProps {
	readonly screeningMap: PsrScreeningMap;
	readonly onUpdateSextant: (sextantId: PsrSextantId, code: PsrCode, asterisk?: boolean) => void;
	readonly onSetAllIntact: () => void;
	readonly onApplyHygienePreset: () => void;
	readonly onApplyPeriodontitisPreset: () => void;
	readonly isDetailedExpanded: boolean;
	readonly onToggleDetailed: () => void;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
}

export function computePsrSummary(screeningMap: PsrScreeningMap): PerioScreeningSummary {
	let maxCode: PsrCode = 0;
	let hasAsterisk = false;
	const codes: string[] = [];

	for (const sextant of PSR_SEXTANTS_CONFIG) {
		const s = screeningMap[sextant.id] ?? { code: 0 };
		if (s.code > maxCode) maxCode = s.code;
		if (s.asterisk) hasAsterisk = true;
		codes.push(`${s.code}${s.asterisk ? "*" : ""}`);
	}

	const psrFormula = `PSR: ${codes.join(" / ")}`;

	let suggestedDiagnosisRu = "Здоров (клинически интактный пародонт)";
	let icd10Code = "Z01.2";
	let hygienePlanRu = "Профилактический осмотр через 6 месяцев. Индивидуальная гигиена в норме.";
	let requiresDetailedCharting = false;

	if (maxCode === 1) {
		suggestedDiagnosisRu = "Катаральный гингивит легкой степени (BOP+)";
		icd10Code = "K05.1";
		hygienePlanRu = "Контролируемая гигиена, удаление мягкого налёта, полировка зубов пастой / Air-Flow.";
	} else if (maxCode === 2) {
		suggestedDiagnosisRu = "Хронический катаральный гингивит с зубными отложениями";
		icd10Code = "K05.1";
		hygienePlanRu = "Профессиональная гигиена: ультразвуковое снятие над- и поддесневого камня + Air-Flow + фторирование.";
	} else if (maxCode === 3) {
		suggestedDiagnosisRu = "Хронический пародонтит легкой/средней степени (карманы 4–5 мм)";
		icd10Code = "K05.3";
		hygienePlanRu = "Комплексная гигиена + закрытый кюретаж пародонтальных карманов в пораженных секстантах. Назначение антисептических аппликаций.";
		requiresDetailedCharting = true;
	} else if (maxCode === 4) {
		suggestedDiagnosisRu = "Хронический генерализованный пародонтит тяжелой степени (карманы >= 6 мм)";
		icd10Code = "K05.3";
		hygienePlanRu = "Глубокий скейлинг, открытый кюретаж / лоскутная операция, медикаментозное лечение, консультация хирурга-пародонтолога.";
		requiresDetailedCharting = true;
	}

	if (hasAsterisk) {
		suggestedDiagnosisRu += " с осложнениями (подвижность зубов / поражение фуркаций)";
		hygienePlanRu += " Рекомендовано избирательное пришлифовывание и шинирование подвижных зубов.";
	}

	return {
		maxPsrCode: maxCode,
		hasAsterisk,
		psrFormula,
		suggestedDiagnosisRu,
		icd10Code,
		hygienePlanRu,
		requiresDetailedCharting,
	};
}

export const PerioPsrExpressScreening: React.FC<PerioPsrExpressScreeningProps> = React.memo(({
	screeningMap,
	onUpdateSextant,
	onSetAllIntact,
	onApplyHygienePreset,
	onApplyPeriodontitisPreset,
	isDetailedExpanded,
	onToggleDetailed,
	onInsertToProtocol,
	readOnly = false,
}) => {
	const summary = useMemo(() => computePsrSummary(screeningMap), [screeningMap]);

	const formattedProtocolText = useMemo(() => {
		return `Дневник приёма: Пародонтологический экспресс-скрининг ВОЗ (PSR/CPITN).\n` +
			`Формула секстантов: ${summary.psrFormula}\n` +
			`Клинический статус: ${summary.suggestedDiagnosisRu} (МКБ-10: ${summary.icd10Code}).\n` +
			`План гигиены и лечения: ${summary.hygienePlanRu}`;
	}, [summary]);

	return (
		<div className="flex flex-col gap-3 p-3 sm:p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-xs w-full">
			{/* Верхний тулбар: 1-клик кнопки нормы и пресетов */}
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
				<div className="flex items-center gap-2">
					<Layers className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
					<div>
						<h3 className="text-sm font-bold text-[var(--ink)] leading-tight">
							Экспресс-скрининг пародонта ВОЗ (PSR)
						</h3>
						<p className="text-xs text-[var(--muted)]">
							Оценка 6 секстантов зубного ряда в 1 клик
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-1.5">
					<button
						type="button"
						onClick={onSetAllIntact}
						disabled={readOnly}
						className="min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-500/30"
						title="Выставить Код 0 по всем 6 секстантам (глубина <3.5 мм, без кровоточивости)"
						data-testid="psr-all-intact-btn"
					>
						<Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
						✓ Пародонт интактен (Код 0)
					</button>

					<button
						type="button"
						onClick={onApplyHygienePreset}
						disabled={readOnly}
						className="min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-[var(--line)]"
						title="Пресет: зубной налёт и камень (Код 1–2)"
						data-testid="psr-hygiene-preset-btn"
					>
						<Sparkles className="w-3.5 h-3.5 text-amber-500" />
						Гигиена (Код 1–2)
					</button>

					<button
						type="button"
						onClick={onApplyPeriodontitisPreset}
						disabled={readOnly}
						className="min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-[var(--line)]"
						title="Пресет: пародонтит с карманами (Код 3–4)"
						data-testid="psr-periodontitis-preset-btn"
					>
						Пародонтит (Код 3–4)
					</button>

				</div>
			</div>

			{/* Сетка 6 секстантов */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
				{PSR_SEXTANTS_CONFIG.map((sextant) => {
					const state = screeningMap[sextant.id] ?? { code: 0 };
					const def = PSR_CODE_DEFINITIONS[state.code];

					return (
						<div
							key={sextant.id}
							className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2 shadow-2xs transition-all"
							data-testid={`psr-sextant-card-${sextant.id}`}
						>
							<div className="flex items-center justify-between gap-1.5">
								<div className="min-w-0">
									<span className="font-bold text-xs text-[var(--ink)] flex items-center gap-1">
										<span className="px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] font-mono text-[11px]">
											{sextant.name}
										</span>
										<span className="text-[var(--muted)] font-normal text-xs">
											({sextant.teethRange})
										</span>
									</span>
									<span className="text-[11px] text-[var(--muted)] block truncate">
										{sextant.labelRu}
									</span>
								</div>

								<span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border shrink-0 ${def.badgeClass}`}>
									Код {state.code}{state.asterisk ? "*" : ""}
								</span>
							</div>

							{/* Кнопки выбора кода 0..4 и астериска: сенсорный минимум 44x44px на touch */}
							<div className="grid grid-cols-6 gap-1 pt-1">
								{([0, 1, 2, 3, 4] as const).map((code) => {
									const isSelected = state.code === code;
									const codeDef = PSR_CODE_DEFINITIONS[code];
									return (
										<button
											key={code}
											type="button"
											disabled={readOnly}
											onClick={() => onUpdateSextant(sextant.id, code, state.asterisk)}
											className={`min-h-[40px] sm:min-h-[34px] rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer touch-manipulation border ${
												isSelected
													? `${codeDef.badgeClass} ring-2 ring-teal-500/60 font-black shadow-xs`
													: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border-[var(--line)]"
											}`}
											title={`${codeDef.labelRu}: ${codeDef.descriptionRu}`}
											data-testid={`psr-${sextant.id}-code-${code}`}
										>
											{code}
										</button>
									);
								})}

								<button
									type="button"
									disabled={readOnly}
									onClick={() => onUpdateSextant(sextant.id, state.code, !state.asterisk)}
									className={`min-h-[40px] sm:min-h-[34px] rounded-lg font-bold text-sm flex items-center justify-center transition-all cursor-pointer touch-manipulation border ${
										state.asterisk
											? "bg-rose-500 text-white border-rose-600 ring-2 ring-rose-500/50"
											: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-rose-600 border-[var(--line)]"
									}`}
									title="Осложнение (*): подвижность зубов >= II ст. или поражение фуркации"
									data-testid={`psr-${sextant.id}-asterisk`}
								>
									*
								</button>
							</div>

							<p className="text-[11.5px] text-[var(--muted)] leading-tight truncate">
								{def.shortTitleRu}
							</p>
						</div>
					);
				})}
			</div>

			{/* Сводная клиническая плашка и рекомендации */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
				<div className="flex flex-col gap-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30">
							{summary.psrFormula}
						</span>
						<span className="text-xs font-semibold text-[var(--ink)]">
							{summary.suggestedDiagnosisRu}
						</span>
					</div>
					<p className="text-xs text-[var(--muted)] leading-snug">
						Рекомендации: {summary.hygienePlanRu}
					</p>
					{summary.requiresDetailedCharting && (
						<div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium pt-0.5">
							<AlertTriangle className="w-3.5 h-3.5 shrink-0" />
							<span>Обнаружены патологические карманы &ge; 4 мм — требуется углубленная пародонтограмма</span>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{onInsertToProtocol && (
						<button
							type="button"
							onClick={() => onInsertToProtocol(formattedProtocolText)}
							className="h-9 px-3 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-all"
							title="Вставить сводку PSR и план гигиены в медицинскую карту приёма"
							data-testid="psr-insert-diary-btn"
						>
							<ClipboardCopy className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
							В дневник
						</button>
					)}

					<button
						type="button"
						onClick={onToggleDetailed}
						className={`h-9 px-3.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all border ${
							isDetailedExpanded
								? "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
								: summary.requiresDetailedCharting
									? "bg-teal-600 hover:bg-teal-700 text-white border-teal-700 shadow-xs"
									: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
						}`}
						data-testid="psr-toggle-detailed-btn"
					>
						{isDetailedExpanded ? (
							<>
								<ChevronUp className="w-4 h-4" />
								Свернуть детальную карту
							</>
						) : (
							<>
								<ChevronDown className="w-4 h-4" />
								Детальная сетка зубов
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
});

PerioPsrExpressScreening.displayName = "PerioPsrExpressScreening";
