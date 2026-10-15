import React, { useState, useMemo, useCallback } from "react";
import {
	Activity,
	BarChart2,
	Check,
	ChevronDown,
	ChevronUp,
	FileText,
	ShieldCheck,
	Sparkles,
	Stethoscope,
} from "lucide-react";
import type { PerioToothRecord } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";
import {
	buildPeriodontalTreatmentPlanJustification,
	deductPeriodontalConsumablesSoftOverdraft,
} from "../../perio/chart/perioPresets";

export interface EmkPerioSectionProps extends EmkSectionProps {
	readonly onOpenPerioModal?: (() => void) | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
}

/**
 * EmkPerioSection — Пародонтологический скрининг, экспресс-индексы гигиены (OHI-S)
 * и авто-формирование плана лечения (кюретаж A16.07.011 + профгигиена A16.07.051).
 *
 * Мандаты:
 * - Мандат 8e (Автономия врача): физиологическая норма в 1 клик по умолчанию
 * - Мандат 8k / Mandate 8n: экспресс-скрининг без карго-культа 192 точек зондирования
 * - Чистый язык: никакой сырой «Формы 043/у» в UI, только «Пародонтологический скрининг»
 * - Эргономика: кнопки в стиле UI_STANDARDS, тач-таргеты >= 44px
 * - Мандат 8b: строго <= 800 строк
 */
export function EmkPerioSection({
	visitNoteForm,
	updateVisitNoteField,
	isLocked = false,
	activeTooth = 16,
	onOpenPerioModal,
	patientId,
	patientName,
}: EmkPerioSectionProps) {
	const [isExpanded, setIsExpanded] = useState<boolean>(true);
	const [perioStatus, setPerioStatus] = useState<
		"healthy" | "gingivitis" | "periodontitis_mild" | "periodontitis_moderate" | "periodontitis_severe" | "custom"
	>("healthy");

	const [hygieneLevel, setHygieneLevel] = useState<"good" | "fair" | "poor" | null>(null);

	// Affected teeth selected for pathology screening
	const defaultActiveTooth = useMemo(() => {
		const parsed = Number(activeTooth);
		return Number.isNaN(parsed) || parsed <= 0 ? 16 : parsed;
	}, [activeTooth]);

	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([defaultActiveTooth]);
	const [pocketDepthMm, setPocketDepthMm] = useState<number>(4);
	const [hasBop, setHasBop] = useState<boolean>(true);
	const [mobilityLevel, setMobilityLevel] = useState<0 | 1 | 2 | 3>(0);

	// Quick sextant reference teeth (Ramfjord / Green-Vermillion)
	const quickToothCandidates = useMemo(() => {
		const base = [16, 11, 26, 36, 31, 46];
		if (!base.includes(defaultActiveTooth)) {
			return [defaultActiveTooth, ...base];
		}
		return base;
	}, [defaultActiveTooth]);

	const toggleToothSelection = useCallback((toothNum: number) => {
		setSelectedTeeth((prev) => {
			if (prev.includes(toothNum)) {
				if (prev.length === 1) return prev; // keep at least one
				return prev.filter((t) => t !== toothNum);
			}
			return [...prev, toothNum];
		});
	}, []);

	// ═══════════════════════════════════════════════════════════════════════════
	// 1. ФИЗИОЛОГИЧЕСКАЯ НОРМА В 1 КЛИК (Мандат 8e)
	// ═══════════════════════════════════════════════════════════════════════════
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
	}, [visitNoteForm?.objectiveStatus, visitNoteForm?.diagnosis, updateVisitNoteField]);

	// ═══════════════════════════════════════════════════════════════════════════
	// 2. ЭКСПРЕСС-ИНДЕКС ГИГИЕНЫ OHI-S В 3 КЛИКА
	// ═══════════════════════════════════════════════════════════════════════════
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
		[visitNoteForm?.objectiveStatus, updateVisitNoteField],
	);

	// 1-клик добавление профгигиены (A16.07.051)
	const handleAddProphyService = useCallback(() => {
		const prophyService = {
			serviceId: "hygiene_prophy_804n",
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

		showToast("Профессиональная гигиена (A16.07.051) добавлена в план и смету", "success", 3000);
	}, [visitNoteForm?.treatmentPlan, updateVisitNoteField]);

	// ═══════════════════════════════════════════════════════════════════════════
	// 3. ЭКСПРЕСС-СКРИНИНГ ПАТОЛОГИИ И АВТО-ПЛАН ЛЕЧЕНИЯ (КЮРЕТАЖ)
	// ═══════════════════════════════════════════════════════════════════════════
	const handleApplyPathologyJustification = useCallback(() => {
		const makeSite = (pd: number, bop: boolean) => ({
			probingDepthMm: pd,
			gingivalMarginMm: 0,
			bleedingOnProbing: bop,
			suppuration: false,
			plaque: false,
			calculus: false,
			calMm: pd,
		});

		// Construct synthetic PerioToothRecord objects for affected teeth
		const affectedRecords: PerioToothRecord[] = selectedTeeth.map((num) => ({
			toothNumber: num,
			isMissing: false,
			isImplant: false,
			mobility: mobilityLevel,
			furcation: 0,
			distoBuccal: makeSite(pocketDepthMm, hasBop),
			midBuccal: makeSite(pocketDepthMm - 1 > 2 ? pocketDepthMm - 1 : 2, hasBop),
			mesioBuccal: makeSite(pocketDepthMm, hasBop),
			distoLingual: makeSite(pocketDepthMm, hasBop),
			midLingual: makeSite(2, false),
			mesioLingual: makeSite(pocketDepthMm, hasBop),
		}));

		const { planText, prophyService, curettageServices } =
			buildPeriodontalTreatmentPlanJustification(affectedRecords);

		// 1. Update treatmentPlan in form
		updateVisitNoteField(
			"treatmentPlan",
			appendClinicalText(visitNoteForm?.treatmentPlan || "", planText, "\n\n"),
		);

		// 2. Update objectiveStatus with pocket details
		const teethListStr = selectedTeeth.map((t) => `#${t}`).join(", ");
		const severityLabel = pocketDepthMm >= 6 ? "тяжелой степени" : "средней степени";
		const diagCode = "K05.3";
		const pathologyStatus =
			`Пародонт: в области зубов ${teethListStr} выявлены пародонтальные карманы глубиной ${pocketDepthMm} мм ` +
			`с кровоточивостью при зондировании (BOP+), поддесневым зубным камнем${mobilityLevel > 0 ? `, патологическая подвижность ${mobilityLevel} ст.` : ""}. ` +
			`Клинический диагноз: Хронический генерализованный пародонтит ${severityLabel} (${diagCode}).`;

		updateVisitNoteField(
			"objectiveStatus",
			appendClinicalText(visitNoteForm?.objectiveStatus || "", pathologyStatus, "\n\n"),
		);

		// If diagnosis is empty or norm, set periodontitis
		const currentDiag = String(visitNoteForm?.diagnosis || "").trim();
		if (!currentDiag || currentDiag.includes("Z01.2") || currentDiag.includes("Здоров")) {
			updateVisitNoteField("diagnosis", `${diagCode} Хронический пародонтит (${teethListStr})`);
		}

		// 3. Add curettage and prophy services to visit billing store
		useVisitStore.getState().addCompletedService(prophyService);
		for (const curService of curettageServices) {
			useVisitStore.getState().addCompletedService(curService);
		}

		// 4. Dispatch billing event for cashier and soft overdraft
		if (typeof window !== "undefined") {
			const allServices = [prophyService, ...curettageServices].map((s) => ({
				serviceId: s.serviceId,
				title: s.name,
				unitPriceRub: s.priceRub,
				quantity: 1,
				code804n: s.code804n,
				toothCode: s.toothCode,
			}));

			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: { services: allServices },
				}),
			);

			void deductPeriodontalConsumablesSoftOverdraft("curettage");
		}

		setPerioStatus(pocketDepthMm >= 6 ? "periodontitis_severe" : "periodontitis_moderate");

		showToast(
			`План пародонтологического лечения и закрытый кюретаж зубов (${teethListStr}) добавлены в дневник и смету`,
			"success",
			3500,
		);
	}, [
		selectedTeeth,
		pocketDepthMm,
		hasBop,
		mobilityLevel,
		visitNoteForm?.treatmentPlan,
		visitNoteForm?.objectiveStatus,
		visitNoteForm?.diagnosis,
		updateVisitNoteField,
	]);

	// Handle full modal trigger
	const handleOpenModal = useCallback(() => {
		if (onOpenPerioModal) {
			onOpenPerioModal();
		} else if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:open-perio-modal"));
		}
	}, [onOpenPerioModal]);

	return (
		<div
			className="w-full min-w-0 bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 sm:p-4 shadow-2xs my-2 transition-all"
			data-testid="emk-perio-section"
		>
			{/* Top Header Toolbar */}
			<div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
						<Activity size={16} />
					</div>
					<div>
						<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0 leading-tight">
							Пародонтологический скрининг и гигиена полости рта
						</h4>
						<p className="text-[11px] text-[var(--muted)] m-0 hidden sm:block">
							Мандат 8e • 1-клик физиологическая норма, индексы OHI-S и скрининг пародонтита
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					<button
						type="button"
						onClick={handleOpenModal}
						className="min-h-[32px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[12px] font-semibold text-[var(--ink)] flex items-center gap-1.5 cursor-pointer transition-colors"
						title="Открыть подробную пародонтограмму (Florida Probe, 6 точек на зуб)"
						data-testid="emk-perio-open-chart-btn"
					>
						<BarChart2 size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="hidden sm:inline">Подробная карта</span>
					</button>

					<button
						type="button"
						onClick={() => setIsExpanded((prev) => !prev)}
						className="min-h-[32px] w-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer transition-colors"
						title={isExpanded ? "Свернуть блок" : "Развернуть блок"}
						aria-label="Свернуть/развернуть пародонтологический блок"
					>
						{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					</button>
				</div>
			</div>

			{isExpanded && (
				<div className="space-y-3.5 animate-in fade-in duration-150">
					{/* ROW 1: 1-Click Norm & Primary State */}
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

						{/* Quick Prophy Button */}
						<button
							type="button"
							onClick={handleAddProphyService}
							className="min-h-[44px] px-3.5 py-2 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300 hover:bg-sky-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
							data-testid="emk-hygiene-prophy-btn"
							title="Добавить профессиональную гигиену полости рта (A16.07.051) в смету и дневник"
						>
							<Sparkles size={14} className="shrink-0 text-sky-600 dark:text-sky-400" />
							<span>+ Профгигиена в смету (A16.07.051)</span>
						</button>
					</div>

					{/* ROW 2: Express Hygiene Index OHI-S in 3 clicks */}
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

					{/* ROW 3: Express Pathology Screening (Pockets, BOP, Mobility) */}
					<div className="space-y-2 pt-2 border-t border-[var(--line)]/60">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--ink)]">
								Экспресс-скрининг патологии (только пораженные зубы):
							</span>
							<span className="text-[11px] text-[var(--muted)]">
								Карманы ≥ 4 мм • Кровоточивость • Подвижность
							</span>
						</div>

						{/* Tooth selection chips */}
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="text-[11px] text-[var(--muted)] font-medium mr-1">Зубы:</span>
							{quickToothCandidates.map((toothNum) => {
								const isSel = selectedTeeth.includes(toothNum);
								return (
									<button
										key={toothNum}
										type="button"
										onClick={() => toggleToothSelection(toothNum)}
										className={`min-h-[36px] min-w-[36px] px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
											isSel
												? "bg-teal-600 text-white shadow-2xs"
												: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-teal-500"
										}`}
									>
										#{toothNum}
									</button>
								);
							})}
						</div>

						{/* Pocket depth & Pathology criteria */}
						<div className="flex flex-wrap items-center gap-2 pt-1">
							{/* Moderate Pocket */}
							<button
								type="button"
								onClick={() => setPocketDepthMm(4)}
								className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
									pocketDepthMm === 4
										? "border-amber-500 bg-amber-500/20 text-amber-900 dark:text-amber-200"
										: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid="emk-perio-pocket-moderate-btn"
							>
								Карман 4–5 мм (Средний)
							</button>

							{/* Severe Pocket */}
							<button
								type="button"
								onClick={() => setPocketDepthMm(6)}
								className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
									pocketDepthMm >= 6
										? "border-rose-500 bg-rose-500/20 text-rose-900 dark:text-rose-200"
										: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid="emk-perio-pocket-severe-btn"
							>
								Карман ≥ 6 мм (Тяжелый)
							</button>

							{/* BOP Toggle */}
							<button
								type="button"
								onClick={() => setHasBop((prev) => !prev)}
								className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
									hasBop
										? "border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-300"
										: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid="emk-perio-bop-btn"
							>
								<span className={`w-2 h-2 rounded-full ${hasBop ? "bg-rose-500" : "bg-slate-300"}`} />
								<span>Кровоточивость (BOP+)</span>
							</button>

							{/* Mobility Cycle */}
							<button
								type="button"
								onClick={() => setMobilityLevel((prev) => ((prev + 1) % 4) as 0 | 1 | 2 | 3)}
								className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
									mobilityLevel > 0
										? "border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300"
										: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid="emk-perio-mobility-btn"
							>
								Подвижность: {mobilityLevel === 0 ? "0 ст. (нет)" : `${mobilityLevel} ст.`}
							</button>

							{/* Action: Apply Curettage Treatment Plan */}
							<button
								type="button"
								onClick={handleApplyPathologyJustification}
								className="min-h-[38px] px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all ml-auto"
								data-testid="emk-perio-apply-treatment-plan-btn"
								title="Автоматически сформировать план лечения, назначить закрытый кюретаж и внести в смету"
							>
								<Stethoscope size={14} className="shrink-0" />
								<span>Назначить кюретаж и план лечения</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default EmkPerioSection;
