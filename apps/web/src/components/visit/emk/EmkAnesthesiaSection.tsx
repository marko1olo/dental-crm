import React from "react";
import { AlertTriangle, Minus, Plus, ShieldCheck, Syringe } from "lucide-react";
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
	const [patientWeightKg, setPatientWeightKg] = React.useState<number>(
		patientAge && patientAge < 14 ? 30 : 70,
	);

	const anesthesiaSafety = React.useMemo(() => {
		return calculateAnesthesiaCarpulesSafety({
			drugKey: selectedAnesDrugKey,
			carpulesCount: carpuleCount,
			patientWeightKg,
			patientAgeYears: patientAge ?? null,
		});
	}, [selectedAnesDrugKey, carpuleCount, patientWeightKg, patientAge]);

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

			{/* Интерактивный калькулятор карпул и предельной безопасной дозы по весу (МРД) */}
			<div className="flex items-center justify-between gap-2 flex-wrap p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs min-w-0">
				<div className="flex items-center gap-2 flex-wrap min-w-0">
					{/* Выбор веса */}
					<div className="flex items-center gap-1 shrink-0">
						<span className="text-[11px] font-bold text-[var(--muted)]">Вес:</span>
						{[15, 30, 50, 70, 85].map((w) => (
							<button
								key={w}
								type="button"
								onClick={() => setPatientWeightKg(w)}
								className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
									patientWeightKg === w
										? "bg-[var(--teal)] text-white border-[var(--teal)]"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
								}`}
							>
								{w} кг
							</button>
						))}
					</div>

					{/* Карпулы */}
					<div className="flex items-center gap-1 shrink-0 ml-1">
						<span className="text-[11px] font-bold text-[var(--muted)]">Карпул:</span>
						<button
							type="button"
							onClick={() => setCarpuleCount((prev) => Math.max(0.5, prev - 0.5))}
							className="w-6 h-6 rounded-md bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] hover:border-[var(--teal)] cursor-pointer"
							title="Уменьшить на 0.5 карпулы"
						>
							<Minus size={11} />
						</button>
						<span className="font-mono font-bold px-1.5">{carpuleCount}</span>
						<button
							type="button"
							onClick={() => setCarpuleCount((prev) => prev + 0.5)}
							className="w-6 h-6 rounded-md bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] hover:border-[var(--teal)] cursor-pointer"
							title="Увеличить на 0.5 карпулы"
						>
							<Plus size={11} />
						</button>
					</div>

					{/* Индикатор безопасности МРД */}
					<span
						className={`px-2 py-1 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1 shrink-0 ${
							anesthesiaSafety.isOverdose
								? "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/40"
								: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40"
						}`}
						title={anesthesiaSafety.formattedSafetyNote}
					>
						{anesthesiaSafety.isOverdose ? (
							<>
								<AlertTriangle size={12} className="shrink-0 text-rose-500" />
								<span>Передозировка! (max {anesthesiaSafety.maxSafeCarpules} карп.)</span>
							</>
						) : (
							<>
								<ShieldCheck size={12} className="shrink-0 text-emerald-500" />
								<span>Безопасно ({carpuleCount} из max {anesthesiaSafety.maxSafeCarpules} карп. · {anesthesiaSafety.safetyPercentage}%)</span>
							</>
						)}
					</span>
				</div>

				<button
					type="button"
					onClick={() =>
						handleApplyPreset(
							`${anesthesiaSafety.drugName} (${carpuleCount} карп.)`,
							anesthesiaSafety.formattedTreatmentSnippet,
						)
					}
					className="min-h-[28px] h-7 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs whitespace-nowrap shrink-0 ml-auto"
					title="Внести индивидуальный расчет анестезии в протокол"
				>
					<Syringe size={12} className="shrink-0" />
					<span>Внести в протокол</span>
				</button>
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
