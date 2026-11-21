import React, { useCallback } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";
import { deductPeriodontalConsumablesSoftOverdraft } from "../../perio/perioCatalogData";

export interface EmkPerioSummaryProps extends EmkSectionProps {
	readonly perioStatus: "healthy" | "gingivitis" | "periodontitis_mild" | "periodontitis_moderate" | "periodontitis_severe" | "custom";
	readonly setPerioStatus: (status: "healthy" | "gingivitis" | "periodontitis_mild" | "periodontitis_moderate" | "periodontitis_severe" | "custom") => void;
	readonly hygieneLevel: "good" | "fair" | "poor" | null;
	readonly setHygieneLevel: (level: "good" | "fair" | "poor") => void;
	readonly setHasBop: (bop: boolean) => void;
	readonly setMobilityLevel: (level: 0 | 1 | 2 | 3) => void;
}

/**
 * EmkPerioSummary — Физиологическая норма пародонта (Мандат 8e),
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
	// 1. Физиологическая норма пародонта
	const handleApplyHealthyNorm = useCallback(() => {
		setPerioStatus("healthy");
		setHygieneLevel("good");
		setHasBop(false);
		setMobilityLevel(0);

		const normStatusRu =
			"Пародонт: десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, кровоточивость отсутствует (BOP 0%), патологических карманов нет, подвижность зубов физиологическая (0 ст.). Скрининг PSR: 0 во всех секстантах.";

		const currentObjectiveStatus = typeof visitNoteForm?.objectiveStatus === "string" ? visitNoteForm.objectiveStatus : "";
		updateVisitNoteField?.(
			"objectiveStatus",
			appendClinicalText(currentObjectiveStatus, normStatusRu, "\n\n"),
		);

		const currentDiag = String(visitNoteForm?.diagnosis || "").trim();
		if (!currentDiag || currentDiag.includes("Здоров") || currentDiag.includes("Z01.2")) {
			updateVisitNoteField?.("diagnosis", "Z01.2 Стоматологическое обследование (Пародонт интактен / норма)");
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

	// 2. Профессиональная гигиена полости рта (A16.07.051)
	const handleAddProphyService = useCallback(() => {
		const prophyPriceKopecks = 550000;
		const prophyService = {
			serviceId: "hygiene_prophy_catalog",
			serviceCode: "A16.07.051",
			code: "A16.07.051",
			name: "Профессиональная гигиена полости рта и зубов (ультразвуковое снятие отложений, Air-Flow, полировка, фторирование)",
			title: "Профессиональная гигиена полости рта и зубов (ультразвуковое снятие отложений, Air-Flow, полировка, фторирование)",
			priceKopecks: prophyPriceKopecks,
			amountKopecks: prophyPriceKopecks,
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
								serviceCode: prophyService.serviceCode,
								name: prophyService.name,
								title: prophyService.name,
								code: prophyService.serviceCode,
								unitPriceKopecks: prophyPriceKopecks,
								priceKopecks: prophyPriceKopecks,
								amountKopecks: prophyPriceKopecks,
								quantity: 1,
								category: "hygiene",
								stageKind: "hygiene",
							},
						],
					},
				}),
			);
			void deductPeriodontalConsumablesSoftOverdraft("hygiene");
		}

		const planAddition =
			"• Профессиональная гигиена полости рта (A16.07.051): ультразвуковое удаление над- и поддесневых зубных отложений скейлером, воздушно-абразивная обработка Air-Flow, полировка эмали пастой, глубокое фторирование.";
		const currentTreatmentPlan = typeof visitNoteForm?.treatmentPlan === "string" ? visitNoteForm.treatmentPlan : "";
		updateVisitNoteField?.(
			"treatmentPlan",
			appendClinicalText(currentTreatmentPlan, planAddition, "\n\n"),
		);

		showToast("Пародонтологический протокол и гигиена добавлены в смету и дневник", "success", 3000);
	}, [visitNoteForm?.treatmentPlan, updateVisitNoteField]);

	// 3. Экспресс-индекс гигиены OHI-S
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

			const currentObjectiveStatus = typeof visitNoteForm?.objectiveStatus === "string" ? visitNoteForm.objectiveStatus : "";
			updateVisitNoteField?.(
				"objectiveStatus",
				appendClinicalText(currentObjectiveStatus, text, "\n\n"),
			);

			showToast(`Индекс гигиены OHI-S зафиксирован (${level === "good" ? "Хорошая" : level === "fair" ? "Удовлетворительная" : "Неудовлетворительная"})`, "info", 2000);
		},
		[visitNoteForm?.objectiveStatus, updateVisitNoteField, setHygieneLevel],
	);

	return (
		<div className="space-y-3.5">
			{/* РЯД 1: Физиологическая норма и профгигиена */}
			<div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--paper-soft)] p-2.5 rounded-xl border border-[var(--line)]/60">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleApplyHealthyNorm}
						className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
							perioStatus === "healthy"
								? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
								: "bg-[var(--paper)] border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--paper-soft)]"
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
					className="secondary-button min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--primary)] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
					data-testid="emk-hygiene-prophy-btn"
					title="Назначить профессиональную гигиену полости рта и пародонтологический протокол"
				>
					<Sparkles size={14} className="shrink-0 text-[var(--primary)]" />
					<span>Назначить пародонтологический протокол</span>
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
								? "border-[var(--success-line)] bg-[var(--success-soft)] text-[var(--success-ink)] font-bold ring-1 ring-[var(--success-line)]"
								: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)]"
						}`}
						data-testid="emk-hygiene-good-btn"
					>
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold">1. Хорошая гигиена</span>
							<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--success-soft)] text-[var(--success-ink)] border border-[var(--success-line)]">
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
								? "border-[var(--warning-line)] bg-[var(--warning-soft)] text-[var(--warning-ink)] font-bold ring-1 ring-[var(--warning-line)]"
								: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)]"
						}`}
						data-testid="emk-hygiene-fair-btn"
					>
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold">2. Удовлетворительная</span>
							<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--warning-soft)] text-[var(--warning-ink)] border border-[var(--warning-line)]">
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
								? "border-[var(--danger-line)] bg-[var(--danger-soft)] text-[var(--danger-ink)] font-bold ring-1 ring-[var(--danger-line)]"
								: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)]"
						}`}
						data-testid="emk-hygiene-poor-btn"
					>
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold">3. Неудовлетворительная</span>
							<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--danger-soft)] text-[var(--danger-ink)] border border-[var(--danger-line)]">
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
