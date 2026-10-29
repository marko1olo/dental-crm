import React, { useCallback } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";
import { deductPeriodontalConsumablesSoftOverdraft } from "../../perio/chart/perioPresets";

export interface EmkPerioSummaryProps extends EmkSectionProps {
	readonly perioStatus: "healthy" | "gingivitis" | "periodontitis_mild" | "periodontitis_moderate" | "periodontitis_severe" | "custom";
	readonly setPerioStatus: (status: "healthy" | "gingivitis" | "periodontitis_mild" | "periodontitis_moderate" | "periodontitis_severe" | "custom") => void;
	readonly hygieneLevel: "good" | "fair" | "poor" | null;
	readonly setHygieneLevel: (level: "good" | "fair" | "poor") => void;
	readonly setHasBop: (bop: boolean) => void;
	readonly setMobilityLevel: (level: 0 | 1 | 2 | 3) => void;
}

/**
 * EmkPerioSummary — Экспресс-норма пародонта в 1 клик (Мандат 8e),
 * быстрая профессиональная гигиена и экспресс-индекс OHI-S в 3 клика.
 * Строго <= 300 строк.
 */
export function EmkPerioSummary({
	visitNoteForm,
	updateVisitNoteField,
	perioStatus,
	setPerioStatus,
	hygieneLevel,
	setHygieneLevel,
	setHasBop,
	setMobilityLevel,
}: EmkPerioSummaryProps) {
	// 1. Физиологическая норма пародонта в 1 клик
	const handleApplyHealthyNorm = useCallback(() => {
		setPerioStatus("healthy");
		setHygieneLevel("good");
		setHasBop(false);
		setMobilityLevel(0);

		const normStatusRu =
			"Пародонт: десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, кровоточивость отсутствует (BOP 0%), патологических карманов нет, подвижность зубов физиологическая (0 ст.). Скрининг PSR: 0 во всех секстантах.";

		updateVisitNoteField(
			"objectiveStatus",
			appendClinicalText(visitNoteForm?.objectiveStatus || "", normStatusRu, "\n\n"),
		);

		const currentDiag = String(visitNoteForm?.diagnosis || "").trim();
		if (!currentDiag || currentDiag.includes("Здоров") || currentDiag.includes("Z01.2")) {
			updateVisitNoteField("diagnosis", "Z01.2 Стоматологическое обследование (Пародонт интактен / норма)");
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						objectiveStatus: normStatusRu,
						diagnosis: "Z01.2 Пародонт интактен",
						mode: "merge",
					},
				}),
			);
		}

		showToast("✓ Пародонт в норме: физиологический статус внесён в дневник приёма", "success", 2500);
	}, [visitNoteForm?.objectiveStatus, visitNoteForm?.diagnosis, updateVisitNoteField, setPerioStatus, setHygieneLevel, setHasBop, setMobilityLevel]);

	// 2. 1-клик профессиональная гигиена (A16.07.051)
	const handleAddProphyService = useCallback(() => {
		const prophyService = {
			serviceId: "hygiene_prophy_catalog",
			code804n: "A16.07.051",
			code: "A16.07.051",
			name: "Профессиональная гигиена полости рта и зубов (ультразвуковое снятие отложений, Air-Flow, полировка, фторирование)",
			priceRub: 5500,
			price: 5500,
			quantity: 1,
			category: "hygiene",
		};

		useVisitStore.getState().addCompletedService(prophyService);

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						services: [
							{
								serviceId: prophyService.serviceId,
								title: prophyService.name,
								unitPriceRub: prophyService.priceRub,
								quantity: 1,
								code804n: prophyService.code804n,
							},
						],
					},
				}),
			);
			void deductPeriodontalConsumablesSoftOverdraft("hygiene");
		}

		const planAddition =
			"• Профессиональная гигиена полости рта (A16.07.051): ультразвуковое удаление над- и поддесневых зубных отложений скейлером, воздушно-абразивная обработка Air-Flow, полировка эмали пастой, глубокое фторирование.";
		updateVisitNoteField(
			"treatmentPlan",
			appendClinicalText(visitNoteForm?.treatmentPlan || "", planAddition, "\n\n"),
		);

		showToast("Профессиональная гигиена (A16.07.051) добавлена в смету и дневник", "success", 3000);
	}, [visitNoteForm?.treatmentPlan, updateVisitNoteField]);

	// 3. Экспресс-индекс гигиены OHI-S в 3 клика
	const handleApplyHygieneLevel = useCallback(
		(level: "good" | "fair" | "poor") => {
			setHygieneLevel(level);

			let text = "";
			if (level === "good") {
				text = "Индекс гигиены OHI-S: 0.4 (хорошая гигиена полости рта). Мягкий зубной налёт в незначительном количестве, зубной камень отсутствует.";
			} else if (level === "fair") {
				text = "Индекс гигиены OHI-S: 1.2 (удовлетворительная гигиена полости рта). Умеренное количество наддесневого зубного налёта на пришеечных поверхностях моляров и резцов.";
			} else {
				text = "Индекс гигиены OHI-S: 2.2 (неудовлетворительная гигиена полости рта). Обильные над- и поддесневые зубные отложения, плотный пигментированный налёт курильщика/биоплёнка.";
			}

			updateVisitNoteField(
				"objectiveStatus",
				appendClinicalText(visitNoteForm?.objectiveStatus || "", text, "\n\n"),
			);

			showToast(`Индекс гигиены OHI-S зафиксирован (${level === "good" ? "Хорошая" : level === "fair" ? "Удовлетворительная" : "Неудовлетворительная"})`, "info", 2000);
		},
		[visitNoteForm?.objectiveStatus, updateVisitNoteField, setHygieneLevel],
	);

	return (
		<div className="space-y-3.5">
			{/* РЯД 1: Физиологическая норма в 1 клик и профгигиена */}
			<div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--paper-soft)] p-2.5 rounded-xl border border-[var(--line)]/60">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleApplyHealthyNorm}
						className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
							perioStatus === "healthy"
								? "bg-teal-600 text-white hover:bg-teal-700"
								: "bg-[var(--paper)] border border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/15"
						}`}
						data-testid="emk-perio-norm-btn"
						title="Отметить пародонт интактным и зафиксировать норму в дневнике"
					>
						<ShieldCheck size={16} className="shrink-0" />
						<span>✓ Пародонт в норме / Интактен</span>
					</button>

					<span className="text-[11px] text-[var(--muted)] hidden md:inline">
						Бороздка ≤ 2 мм • Кровоточивость 0% • Подвижность 0 ст.
					</span>
				</div>

				<button
					type="button"
					onClick={handleAddProphyService}
					className="secondary-button min-h-[44px] px-3.5 py-2 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300 hover:bg-sky-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
					data-testid="emk-hygiene-prophy-btn"
					title="Добавить профессиональную гигиену полости рта (A16.07.051) в смету и дневник"
				>
					<Sparkles size={14} className="shrink-0 text-sky-600 dark:text-sky-400" />
					<span>+ Профгигиена в смету (A16.07.051)</span>
				</button>
			</div>

			{/* РЯД 2: Экспресс-индекс гигиены OHI-S в 3 клика */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--ink)]">
						Экспресс-индекс гигиены полости рта (OHI-S):
					</span>
					<span className="text-[11px] text-[var(--muted)]">
						6 индексных зубов (16, 11, 26, 36, 31, 46)
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
					<button
						type="button"
						onClick={() => handleApplyHygieneLevel("good")}
						className={`min-h-[44px] px-3 py-2 rounded-xl border text-left flex flex-col justify-center transition-all cursor-pointer ${
							hygieneLevel === "good"
								? "border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500"
								: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)]"
						}`}
						data-testid="emk-hygiene-good-btn"
					>
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold">1. Хорошая гигиена</span>
							<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
								0.0 – 0.6
							</span>
						</div>
						<span className="text-[11px] text-[var(--muted)] leading-tight mt-0.5">
							Налёта нет или незначительный
						</span>
					</button>

					<button
						type="button"
						onClick={() => handleApplyHygieneLevel("fair")}
						className={`min-h-[44px] px-3 py-2 rounded-xl border text-left flex flex-col justify-center transition-all cursor-pointer ${
							hygieneLevel === "fair"
								? "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200 font-bold ring-1 ring-amber-500"
								: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)]"
						}`}
						data-testid="emk-hygiene-fair-btn"
					>
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold">2. Удовлетворительная</span>
							<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
								0.7 – 1.6
							</span>
						</div>
						<span className="text-[11px] text-[var(--muted)] leading-tight mt-0.5">
							Умеренный налёт на пришеечной 1/3
						</span>
					</button>

					<button
						type="button"
						onClick={() => handleApplyHygieneLevel("poor")}
						className={`min-h-[44px] px-3 py-2 rounded-xl border text-left flex flex-col justify-center transition-all cursor-pointer ${
							hygieneLevel === "poor"
								? "border-rose-500 bg-rose-500/15 text-rose-900 dark:text-rose-200 font-bold ring-1 ring-rose-500"
								: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)]"
						}`}
						data-testid="emk-hygiene-poor-btn"
					>
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold">3. Неудовлетворительная</span>
							<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300">
								≥ 1.7
							</span>
						</div>
						<span className="text-[11px] text-[var(--muted)] leading-tight mt-0.5">
							Обильные зубные отложения и камень
						</span>
					</button>
				</div>
			</div>
		</div>
	);
}
