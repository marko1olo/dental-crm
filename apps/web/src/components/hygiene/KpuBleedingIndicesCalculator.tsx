/**
 * KpuBleedingIndicesCalculator.tsx — Клинический калькулятор индекса КПУ (DMFT)
 * и индекса кровоточивости десневой борозды (SBI Мюллемана-Коуэлла / BOP).
 *
 * (DOMAIN: CLINICAL HYGIENE & CARIES INDICES — DMFT / KPU & SULCUS BLEEDING SBI)
 *
 * Клинические стандарты:
 * 1. Индекс КПУ (ВОЗ / МЗ РФ):
 *    - К (Decayed / кариозные зубы)
 *    - П (Filled / пломбированные зубы)
 *    - У (Missing / удаленные зубы по поводу кариеса и осложнений)
 *    - Итоговый индекс: КПУ = К + П + У (0..32).
 *    - Градация ВОЗ: Очень низкий (0-1.5), Низкий (1.6-3.4), Средний (3.5-4.9), Высокий (5.0-8.0), Очень высокий (>8.0).
 *
 * 2. Индекс кровоточивости десневой борозды (SBI по Mühlemann-Cowell, 1971):
 *    - 0 = Норма: десна бледно-розовая плотная, кровоточивость при зондировании отсутствует.
 *    - 1 = Точечное кровотечение через 20-30 сек после зондирования (внешний вид десны не изменен).
 *    - 2 = Кровотечение сразу после зондирования, легкая гиперемия маргинального края.
 *    - 3 = Обильное кровотечение при зондировании, выраженный отек десневого сосочка.
 *    - 4 = Спонтанная кровоточивость, язвенно-некротические изменения десневой борозды.
 *    - Расчет: SBI = Сумма баллов / количество исследованных участков (0.0..4.0).
 *    - BOP % = (Участки с кровоточивостью / Всего участков) * 100%.
 *
 * Мандаты 8e, 8i, 8k, 8n:
 * - 1-клик нормы для обоих индексов.
 * - Мгновенная вставка в дневник приёма 043/у.
 * - Сенсорные цели >= 44x44px, 0% эмодзи, WCAG AAA контраст.
 */

import React, { memo, useCallback, useMemo, useState } from "react";
import { Check, Clipboard, Droplets, RotateCcw, ShieldCheck } from "lucide-react";
import { DentalForm043 } from "../icons/DentalIcons";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";

export interface KpuBleedingIndicesCalculatorProps {
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly initialDecayed?: number | undefined;
	readonly initialFilled?: number | undefined;
	readonly initialMissing?: number | undefined;
}

export type BleedingScore = 0 | 1 | 2 | 3 | 4;

export interface BleedingSiteState {
	readonly toothNumber: number;
	readonly regionNameRu: string;
	readonly score: BleedingScore;
}

const DEFAULT_BLEEDING_SITES: readonly BleedingSiteState[] = [
	{ toothNumber: 16, regionNameRu: "16 (Верхний правый моляр)", score: 0 },
	{ toothNumber: 11, regionNameRu: "11 (Верхний центральный резец)", score: 0 },
	{ toothNumber: 26, regionNameRu: "26 (Верхний левый моляр)", score: 0 },
	{ toothNumber: 36, regionNameRu: "36 (Нижний левый моляр)", score: 0 },
	{ toothNumber: 31, regionNameRu: "31 (Нижний центральный резец)", score: 0 },
	{ toothNumber: 46, regionNameRu: "46 (Нижний правый моляр)", score: 0 },
];

export const KpuBleedingIndicesCalculator: React.FC<KpuBleedingIndicesCalculatorProps> = memo(({
	onInsertToProtocol,
	readOnly = false,
	initialDecayed = 0,
	initialFilled = 0,
	initialMissing = 0,
}) => {
	// КПУ State
	const [decayed, setDecayed] = useState<number>(initialDecayed);
	const [filled, setFilled] = useState<number>(initialFilled);
	const [missing, setMissing] = useState<number>(initialMissing);

	// SBI Bleeding Sites State
	const [bleedingSites, setBleedingSites] = useState<readonly BleedingSiteState[]>(DEFAULT_BLEEDING_SITES);
	const [copyStatus, setCopyStatus] = useState<boolean>(false);
	const [insertStatus, setInsertStatus] = useState<boolean>(false);

	// Расчет КПУ
	const totalKpu = useMemo(() => decayed + filled + missing, [decayed, filled, missing]);

	const kpuIntensity = useMemo(() => {
		if (totalKpu === 0) return { label: "Физиологическая норма (0)", colorClass: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10" };
		if (totalKpu <= 1.5) return { label: "Очень низкий (ВОЗ)", colorClass: "text-teal-700 dark:text-teal-300 border-teal-500/30 bg-teal-500/10" };
		if (totalKpu <= 3.4) return { label: "Низкий (ВОЗ)", colorClass: "text-teal-700 dark:text-teal-300 border-teal-500/30 bg-teal-500/10" };
		if (totalKpu <= 4.9) return { label: "Средний (ВОЗ)", colorClass: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10" };
		if (totalKpu <= 8.0) return { label: "Высокий (ВОЗ)", colorClass: "text-orange-600 dark:text-orange-400 border-orange-500/30 bg-orange-500/10" };
		return { label: "Очень высокий (ВОЗ)", colorClass: "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10" };
	}, [totalKpu]);

	// Расчет индекса SBI и BOP %
	const { sbiScore, bopPercent, sbiRating } = useMemo(() => {
		const totalPoints = bleedingSites.reduce((sum, site) => sum + site.score, 0);
		const count = bleedingSites.length;
		const avg = count > 0 ? Math.round((totalPoints / count) * 10) / 10 : 0;
		const bleedingCount = bleedingSites.filter((site) => site.score > 0).length;
		const bop = count > 0 ? Math.round((bleedingCount / count) * 100) : 0;

		let rating = "Кровоточивость отсутствует (норма)";
		let badgeClass = "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10";

		if (avg === 0) {
			rating = "Норма (0.0)";
		} else if (avg <= 1.0) {
			rating = "Легкая степень";
			badgeClass = "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10";
		} else if (avg <= 2.0) {
			rating = "Средняя степень";
			badgeClass = "text-orange-600 dark:text-orange-400 border-orange-500/30 bg-orange-500/10";
		} else {
			rating = "Тяжелая степень";
			badgeClass = "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10";
		}

		return { sbiScore: avg, bopPercent: bop, sbiRating: { label: rating, badgeClass } };
	}, [bleedingSites]);

	// 1-Клик Норма КПУ
	const handlePresetKpuNorm = useCallback(() => {
		if (readOnly) return;
		setDecayed(0);
		setFilled(0);
		setMissing(0);
		showToast("Индекс КПУ сброшен в норму (0)", "success", 2500);
	}, [readOnly]);

	// 1-Клик Норма кровоточивости десневой борозды
	const handlePresetBleedingNorm = useCallback(() => {
		if (readOnly) return;
		setBleedingSites(DEFAULT_BLEEDING_SITES);
		showToast("Индекс десневой борозды SBI установлен в норму (0.0 / BOP 0%)", "success", 2500);
	}, [readOnly]);

	// Обновление балла конкретного зуба в SBI
	const updateSiteScore = useCallback((toothNumber: number, score: BleedingScore) => {
		if (readOnly) return;
		setBleedingSites((prev) =>
			prev.map((site) => (site.toothNumber === toothNumber ? { ...site, score } : site)),
		);
	}, [readOnly]);

	// Формирование текста протокола для ЭМК 043/у
	const protocolText = useMemo(() => {
		return [
			"• Индекс интенсивности кариеса КПУ (ВОЗ):",
			`  - К (кариозные): ${decayed}`,
			`  - П (пломбированные): ${filled}`,
			`  - У (удаленные по кариесу): ${missing}`,
			`  - КПУ(з) суммарно: ${totalKpu} (${kpuIntensity.label})`,
			"• Индекс кровоточивости десневой борозды (SBI Мюллемана-Коуэлла):",
			`  - Средний балл SBI: ${sbiScore.toFixed(1)} (${sbiRating.label})`,
			`  - Кровоточивость при зондировании (BOP): ${bopPercent}% (норма 0%)`,
		].join("\n");
	}, [decayed, filled, missing, totalKpu, kpuIntensity.label, sbiScore, sbiRating.label, bopPercent]);

	// Вставка в медицинскую карту 043/у
	const handleInsertTo043 = useCallback(() => {
		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${protocolText}`
				: protocolText,
		}));

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: protocolText,
					mode: "smart_append",
				},
			}),
		);

		onInsertToProtocol?.(protocolText);

		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(protocolText);
		}

		setInsertStatus(true);
		setTimeout(() => setInsertStatus(false), 2500);
		showToast("Индексы КПУ и десневой борозды внесены в карту приёма", "success", 3500);
	}, [protocolText, onInsertToProtocol]);

	const handleCopy = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(protocolText);
			setCopyStatus(true);
			setTimeout(() => setCopyStatus(false), 2000);
			showToast("Протокол КПУ и SBI скопирован", "success", 2500);
		}
	}, [protocolText]);

	return (
		<div className="flex flex-col gap-3 p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] shadow-2xs">
			{/* Шапка блока */}
			<div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2 min-w-0">
					<div className="p-1.5 rounded-lg bg-teal-500/15 border border-teal-500/25 text-teal-600 dark:text-teal-400 shrink-0">
						<Droplets size={16} />
					</div>
					<div className="min-w-0">
						<h5 className="text-xs font-bold text-[var(--ink)] truncate">
							Индексы КПУ (кариес) и кровоточивости десневой борозды (SBI / BOP)
						</h5>
						<p className="text-[10px] text-[var(--muted)] truncate">
							Форма 043/у • Оценка интенсивности кариеса и степени воспаления десневой борозды
						</p>
					</div>
				</div>

				{!readOnly && (
					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={handleInsertTo043}
							className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer touch-manipulation"
							title="Внести КПУ и SBI в медицинскую карту"
						>
							{insertStatus ? <Check size={14} /> : <DentalForm043 size={14} />}
							<span>{insertStatus ? "Внесено!" : "В карту 043/у"}</span>
						</button>
						<button
							type="button"
							onClick={handleCopy}
							className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition-all cursor-pointer"
							title="Скопировать в буфер"
							aria-label="Скопировать"
						>
							{copyStatus ? <Check size={14} className="text-emerald-500" /> : <Clipboard size={14} />}
						</button>
					</div>
				)}
			</div>

			{/* Секция 1: Индекс КПУ (DMFT) */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2.5">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-1.5">
						<span className="text-xs font-bold text-[var(--ink)]">
							Индекс КПУ(з):
						</span>
						<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${kpuIntensity.colorClass}`}>
							{kpuIntensity.label}
						</span>
					</div>

					<div className="flex items-center gap-2">
						<span className="text-xs text-[var(--muted)]">
							КПУ = <strong>{totalKpu}</strong> (К: {decayed}, П: {filled}, У: {missing})
						</span>
						{!readOnly && (
							<button
								type="button"
								onClick={handlePresetKpuNorm}
								className="h-7 px-2 rounded-md bg-[var(--paper)] hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-[var(--line)] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
								title="Норма КПУ = 0"
							>
								<ShieldCheck size={12} />
								<span>Норма КПУ</span>
							</button>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
					{/* К - Кариес */}
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
						<div className="flex flex-col">
							<span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">К (Кариес)</span>
							<span className="text-[9px] text-[var(--muted)]">нелеченые зубы</span>
						</div>
						<div className="flex items-center gap-1">
							<button
								type="button"
								disabled={readOnly || decayed <= 0}
								onClick={() => setDecayed((v) => Math.max(0, v - 1))}
								className="min-h-[36px] min-w-[32px] rounded bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-black hover:bg-[var(--line)] disabled:opacity-30 cursor-pointer"
							>
								-
							</button>
							<span className="w-6 text-center font-mono font-black text-sm">{decayed}</span>
							<button
								type="button"
								disabled={readOnly || decayed >= 32}
								onClick={() => setDecayed((v) => Math.min(32, v + 1))}
								className="min-h-[36px] min-w-[32px] rounded bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-black hover:bg-[var(--line)] disabled:opacity-30 cursor-pointer"
							>
								+
							</button>
						</div>
					</div>

					{/* П - Пломба */}
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
						<div className="flex flex-col">
							<span className="text-[11px] font-bold text-teal-700 dark:text-teal-300">П (Пломбирован)</span>
							<span className="text-[9px] text-[var(--muted)]">леченый кариес</span>
						</div>
						<div className="flex items-center gap-1">
							<button
								type="button"
								disabled={readOnly || filled <= 0}
								onClick={() => setFilled((v) => Math.max(0, v - 1))}
								className="min-h-[36px] min-w-[32px] rounded bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-black hover:bg-[var(--line)] disabled:opacity-30 cursor-pointer"
							>
								-
							</button>
							<span className="w-6 text-center font-mono font-black text-sm">{filled}</span>
							<button
								type="button"
								disabled={readOnly || filled >= 32}
								onClick={() => setFilled((v) => Math.min(32, v + 1))}
								className="min-h-[36px] min-w-[32px] rounded bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-black hover:bg-[var(--line)] disabled:opacity-30 cursor-pointer"
							>
								+
							</button>
						</div>
					</div>

					{/* У - Удален */}
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
						<div className="flex flex-col">
							<span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">У (Удален)</span>
							<span className="text-[9px] text-[var(--muted)]">по поводу осложнений</span>
						</div>
						<div className="flex items-center gap-1">
							<button
								type="button"
								disabled={readOnly || missing <= 0}
								onClick={() => setMissing((v) => Math.max(0, v - 1))}
								className="min-h-[36px] min-w-[32px] rounded bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-black hover:bg-[var(--line)] disabled:opacity-30 cursor-pointer"
							>
								-
							</button>
							<span className="w-6 text-center font-mono font-black text-sm">{missing}</span>
							<button
								type="button"
								disabled={readOnly || missing >= 32}
								onClick={() => setMissing((v) => Math.min(32, v + 1))}
								className="min-h-[36px] min-w-[32px] rounded bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-black hover:bg-[var(--line)] disabled:opacity-30 cursor-pointer"
							>
								+
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Секция 2: Индекс десневой борозды SBI (Мюллеман-Коуэлл) */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2.5">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-1.5">
						<span className="text-xs font-bold text-[var(--ink)]">
							Индекс кровоточивости десневой борозды (SBI Мюллемана):
						</span>
						<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sbiRating.badgeClass}`}>
							{sbiRating.label}
						</span>
					</div>

					<div className="flex items-center gap-2">
						<span className="text-xs text-[var(--muted)]">
							SBI: <strong>{sbiScore.toFixed(1)}</strong> • BOP: <strong>{bopPercent}%</strong>
						</span>
						{!readOnly && (
							<button
								type="button"
								onClick={handlePresetBleedingNorm}
								className="h-7 px-2 rounded-md bg-[var(--paper)] hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-[var(--line)] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
								title="Норма: кровоточивость 0 / BOP 0%"
							>
								<RotateCcw size={12} />
								<span>Норма борозды</span>
							</button>
						)}
					</div>
				</div>

				{/* Сетка зубов для оценки кровоточивости */}
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
					{bleedingSites.map((site) => (
						<div
							key={site.toothNumber}
							className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1.5 text-center min-w-0"
						>
							<div className="flex items-center justify-between text-xs font-mono font-black text-teal-800 dark:text-teal-300">
								<span>#{site.toothNumber}</span>
								<span className="text-[10px] font-bold text-[var(--muted)]">
									Балл: {site.score}
								</span>
							</div>

							<div className="flex items-center justify-center gap-0.5">
								{([0, 1, 2, 3, 4] as const).map((b) => (
									<button
										key={b}
										type="button"
										disabled={readOnly}
										onClick={() => updateSiteScore(site.toothNumber, b)}
										className={`min-h-[44px] min-w-[24px] sm:min-w-[28px] px-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
											site.score === b
												? b === 0
													? "bg-emerald-500 text-slate-950 font-black shadow-xs ring-1 ring-emerald-300"
													: b <= 2
														? "bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-300"
														: "bg-rose-600 text-white font-black shadow-xs ring-1 ring-rose-300"
												: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
										}`}
										title={
											b === 0
												? "0: Кровоточивость отсутствует (норма)"
												: b === 1
													? "1: Точечное кровотечение через 20-30 сек"
													: b === 2
														? "2: Кровотечение сразу, гиперемия края"
														: b === 3
															? "3: Обильное кровотечение, отек сосочка"
															: "4: Спонтанное кровотечение, изъязвление"
										}
									>
										{b}
									</button>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
});

KpuBleedingIndicesCalculator.displayName = "KpuBleedingIndicesCalculator";
