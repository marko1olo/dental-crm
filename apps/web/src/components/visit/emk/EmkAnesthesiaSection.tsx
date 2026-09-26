import React from "react";
import { AlertTriangle, Syringe } from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	CARPULE_ANESTHESIA_PRESETS,
	calculateAnesthesiaCarpulesSafety,
	evaluateAnesthesiaRisk,
} from "../../../lib/clinicalProtocols043";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";

export function EmkAnesthesiaSection({
	visitNoteForm,
	updateVisitNoteField,
	isLocked,
	patientAge,
	patientGender,
}: EmkSectionProps) {
	const [selectedAnesDrugKey, setSelectedAnesDrugKey] = React.useState<string>("ultracain_ds");
	const [carpuleCount, setCarpuleCount] = React.useState<number>(1);

	const patientWeightKg = 70; // Среднестатистический взрослый вес по умолчанию
	const anesthesiaSafety = React.useMemo(() => {
		return calculateAnesthesiaCarpulesSafety({
			drugKey: selectedAnesDrugKey,
			carpulesCount: carpuleCount,
			patientWeightKg,
		});
	}, [selectedAnesDrugKey, carpuleCount, patientWeightKg]);

	const anamnesis = visitNoteForm?.anamnesis || "";
	const anesthesiaRisk = React.useMemo(() => {
		return evaluateAnesthesiaRisk(anamnesis, selectedAnesDrugKey);
	}, [anamnesis, selectedAnesDrugKey]);

	const handleApplyPreset = (name: string, snippet: string) => {
		const curr = visitNoteForm?.treatmentPlan || "";
		updateVisitNoteField("treatmentPlan", appendClinicalText(curr, snippet, "\n\n"));
		showToast(`Анестезия (${name}) внесена в протокол`, "success", 2500);
	};

	return (
		<div className="flex flex-col gap-2.5 mt-1 min-w-0 max-w-full">
			{/* Быстрый протокол анестезии (1-клик пресеты) — чистый разделитель без двойных рамок (Анти-Матрёшка) */}
			<div className="flex items-center justify-between gap-2 flex-wrap pt-3 border-t border-[var(--line)] bg-transparent min-w-0">
				<div className="flex items-center gap-1.5 flex-wrap min-w-0">
					<span className="text-[11px] font-extrabold text-[var(--muted)] flex items-center gap-1 shrink-0">
						<Syringe size={13} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Анестезия:</span>
					</span>

					<button
						type="button"
						onClick={() =>
							handleApplyPreset(
								"Ультракаин Д-С 1:200k, 1 карп.",
								"Анестезия: инфильтрационная Sol. Ultracaini D-S 1:200 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое.",
							)
						}
						className="min-h-[30px] sm:min-h-[32px] h-7.5 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
						data-testid="btn-anes-ultracain-ds"
						title="1 клик: внести стандартную анестезию 1:200 000 в протокол"
					>
						<Syringe size={12} className="text-blue-500 shrink-0" />
						<span>Ультракаин 1:200k (1 карп.)</span>
					</button>

					<button
						type="button"
						onClick={() =>
							handleApplyPreset(
								"Ультракаин Форте 1:100k, 1 карп.",
								"Анестезия: проводниковая/инфильтрационная Sol. Ultracaini D-S Forte 1:100 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое.",
							)
						}
						className="min-h-[30px] sm:min-h-[32px] h-7.5 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
						data-testid="btn-anes-ultracain-ds-forte"
						title="1 клик: внести глубокую анестезию 1:100 000 в протокол"
					>
						<Syringe size={12} className="text-blue-500 shrink-0" />
						<span>Ультракаин Форте (1 карп.)</span>
					</button>

					<button
						type="button"
						onClick={() =>
							handleApplyPreset(
								"Скандонест 3% без адреналина, 1 карп.",
								"Анестезия: инфильтрационная Sol. Scandonest 3% (без адреналина) — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание достаточное.",
							)
						}
						className="min-h-[30px] sm:min-h-[32px] h-7.5 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
						data-testid="btn-anes-scandonest-3"
						title="1 клик: безадреналиновая анестезия для кардио-пациентов"
					>
						<Syringe size={12} className="text-blue-500 shrink-0" />
						<span>Скандонест 3% (без адреналина)</span>
					</button>
				</div>
			</div>

			{/* Предупреждение о кардиоваскулярном риске */}
			{anesthesiaRisk.isWarningTriggered && (
				<div
					className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 flex items-start justify-between gap-2.5 text-xs text-amber-950 dark:text-amber-200 min-w-0 max-w-full"
					role="alert"
				>
					<div className="flex items-start gap-2 min-w-0 flex-1">
						<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
						<div className="space-y-1 min-w-0 flex-1">
							<strong className="font-extrabold block text-amber-950 dark:text-amber-100 break-words">
								Внимание: Группа кардиоваскулярного риска (Гипертония / ССЗ)
							</strong>
							<p className="m-0 leading-relaxed font-medium break-words">
								{anesthesiaRisk.warningMessage}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={() => setSelectedAnesDrugKey("scandonest_3")}
						className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 hover:bg-amber-300 shrink-0 cursor-pointer min-h-[30px]"
					>
						Выбрать Скандонест 3%
					</button>
				</div>
			)}
		</div>
	);
}
