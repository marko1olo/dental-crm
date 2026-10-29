import React, { useCallback, useMemo } from "react";
import { Stethoscope } from "lucide-react";
import type { PerioToothRecord } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";
import {
	buildPeriodontalTreatmentPlanJustification,
	deductPeriodontalConsumablesSoftOverdraft,
} from "../../perio/chart/perioPresets";

export interface EmkPerioMeasurementsProps extends EmkSectionProps {
	readonly activeTooth?: number | undefined;
	readonly selectedTeeth: number[];
	readonly setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	readonly pocketDepthMm: number;
	readonly setPocketDepthMm: (depth: number) => void;
	readonly hasBop: boolean;
	readonly setHasBop: React.Dispatch<React.SetStateAction<boolean>>;
	readonly mobilityLevel: 0 | 1 | 2 | 3;
	readonly setMobilityLevel: React.Dispatch<React.SetStateAction<0 | 1 | 2 | 3>>;
	readonly setPerioStatus: (status: "healthy" | "gingivitis" | "periodontitis_mild" | "periodontitis_moderate" | "periodontitis_severe" | "custom") => void;
}

/**
 * EmkPerioMeasurements — Экспресс-скрининг пародонтальной патологии
 * (глубина карманов, кровоточивость BOP, подвижность) и авто-план лечения
 * с закрытым кюретажем патологических карманов (A16.07.011) и профгигиеной.
 * Строго <= 300 строк.
 */
export function EmkPerioMeasurements({
	visitNoteForm,
	updateVisitNoteField,
	activeTooth = 16,
	selectedTeeth,
	setSelectedTeeth,
	pocketDepthMm,
	setPocketDepthMm,
	hasBop,
	setHasBop,
	mobilityLevel,
	setMobilityLevel,
	setPerioStatus,
}: EmkPerioMeasurementsProps) {
	const defaultActiveTooth = useMemo(() => {
		const parsed = Number(activeTooth);
		return Number.isNaN(parsed) || parsed <= 0 ? 16 : parsed;
	}, [activeTooth]);

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
	}, [setSelectedTeeth]);

	// Экспресс-скрининг патологии и авто-план лечения (закрытый кюретаж)
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

		// 1. Обновляем план лечения в форме
		updateVisitNoteField(
			"treatmentPlan",
			appendClinicalText(visitNoteForm?.treatmentPlan || "", planText, "\n\n"),
		);

		// 2. Обновляем объективный статус данными о карманах
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

		const currentDiag = String(visitNoteForm?.diagnosis || "").trim();
		if (!currentDiag || currentDiag.includes("Z01.2") || currentDiag.includes("Здоров")) {
			updateVisitNoteField("diagnosis", `${diagCode} Хронический пародонтит (${teethListStr})`);
		}

		// 3. Добавляем услуги кюретажа и гигиены в смету визита
		useVisitStore.getState().addCompletedService(prophyService);
		for (const curService of curettageServices) {
			useVisitStore.getState().addCompletedService(curService);
		}

		// 4. Диспатчим событие сметы для кассы и мягкого списания расходников
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
		setPerioStatus,
	]);

	return (
		<div className="space-y-2 pt-2 border-t border-[var(--line)]/60">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--ink)]">
					Экспресс-скрининг патологии (только пораженные зубы):
				</span>
				<span className="text-[11px] text-[var(--muted)]">
					Карманы ≥ 4 мм • Кровоточивость • Подвижность
				</span>
			</div>

			{/* Выбор зубов */}
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

			{/* Параметры кармана и патологии */}
			<div className="flex flex-wrap items-center gap-2 pt-1">
				{/* Средний карман 4-5 мм */}
				<button
					type="button"
					onClick={() => setPocketDepthMm(4)}
					className={`secondary-button min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
						pocketDepthMm === 4
							? "border-amber-500 bg-amber-500/20 text-amber-900 dark:text-amber-200"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					data-testid="emk-perio-pocket-moderate-btn"
				>
					Карман 4–5 мм (Средний)
				</button>

				{/* Тяжелый карман >= 6 мм */}
				<button
					type="button"
					onClick={() => setPocketDepthMm(6)}
					className={`secondary-button min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
						pocketDepthMm >= 6
							? "border-rose-500 bg-rose-500/20 text-rose-900 dark:text-rose-200"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					data-testid="emk-perio-pocket-severe-btn"
				>
					Карман ≥ 6 мм (Тяжелый)
				</button>

				{/* Переключатель кровоточивости BOP */}
				<button
					type="button"
					onClick={() => setHasBop((prev) => !prev)}
					className={`secondary-button min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
						hasBop
							? "border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-300"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:bg-[var(--paper-soft)]"
					}`}
					data-testid="emk-perio-bop-btn"
				>
					<span className={`w-2 h-2 rounded-full ${hasBop ? "bg-rose-500" : "bg-slate-300"}`} />
					<span>Кровоточивость (BOP+)</span>
				</button>

				{/* Переключатель степени подвижности */}
				<button
					type="button"
					onClick={() => setMobilityLevel((prev) => ((prev + 1) % 4) as 0 | 1 | 2 | 3)}
					className={`secondary-button min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
						mobilityLevel > 0
							? "border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:bg-[var(--paper-soft)]"
					}`}
					data-testid="emk-perio-mobility-btn"
				>
					Подвижность: {mobilityLevel === 0 ? "0 ст. (нет)" : `${mobilityLevel} ст.`}
				</button>

				{/* Действие: Назначить кюретаж и план лечения */}
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
	);
}
