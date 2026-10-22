import { Calculator } from "lucide-react";
import React from "react";
import {
	STATUTORY_DISINFECTANTS_CATALOG,
	type DisinfectantBrandPreset,
	type DisinfectionSolutionCalculationResult,
} from "./disinfectionLogsEngine.js";

interface GeneralCleaningSolutionFieldsProps {
	selectedBrandId: string;
	onBrandChange: (brandId: string) => void;
	selectedBrand: DisinfectantBrandPreset;
	concentrationPercent: number;
	setConcentrationPercent: (c: number) => void;
	calculation: DisinfectionSolutionCalculationResult;
}

export function GeneralCleaningSolutionFields({
	selectedBrandId,
	onBrandChange,
	selectedBrand,
	concentrationPercent,
	setConcentrationPercent,
	calculation,
}: GeneralCleaningSolutionFieldsProps) {
	return (
		<>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
				<div>
					<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
						Торговое наименование дезсредства
					</label>
					<select
						value={selectedBrandId}
						onChange={(e) => onBrandChange(e.target.value)}
						className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-bold"
					>
						{STATUTORY_DISINFECTANTS_CATALOG.map((b) => (
							<option key={b.id} value={b.id}>
								{b.nameRu} ({b.activeIngredientRu.split("(")[0]})
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
						Концентрация рабочего раствора (%)
					</label>
					<select
						value={concentrationPercent}
						onChange={(e) => setConcentrationPercent(parseFloat(e.target.value) || 1.0)}
						className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-extrabold"
					>
						{selectedBrand.availableConcentrations.map((c) => (
							<option key={c.percent} value={c.percent}>
								{c.percent}% — {c.targetRegimeRu} ({c.exposureMinutes} мин)
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="p-4 rounded-xl border-2 border-teal-500 bg-teal-50/50 flex flex-col gap-2">
				<div className="flex items-center gap-2 text-xs font-black uppercase text-teal-800 tracking-wider">
					<Calculator size={16} />
					<span>Честный математический расчет расхода препарата</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center pt-2">
					<div className="p-2.5 rounded-lg bg-white border border-teal-200">
						<div className="text-[11px] text-[var(--muted,#64748b)] font-semibold">Объем раствора</div>
						<div className="text-lg font-black text-[var(--ink,#0f172a)]">
							{calculation.totalSolutionVolumeLiters.toFixed(2)} л
						</div>
						<div className="text-[10px] text-teal-700">{calculation.rateMlPerM2} мл/м² × {calculation.treatedAreaM2} м²</div>
					</div>

					<div className="p-2.5 rounded-lg bg-white border border-teal-200">
						<div className="text-[11px] text-[var(--muted,#64748b)] font-semibold">Концентрат дезсредства</div>
						<div className="text-lg font-black text-teal-700">
							{calculation.requiredConcentrateVolumeMl.toFixed(1)} мл
						</div>
						<div className="text-[10px] text-teal-700">при {calculation.concentrationPercent}% концентрации</div>
					</div>

					<div className="p-2.5 rounded-lg bg-white border border-teal-200">
						<div className="text-[11px] text-[var(--muted,#64748b)] font-semibold">Водопроводная вода</div>
						<div className="text-lg font-black text-[var(--ink,#0f172a)]">
							{calculation.requiredWaterVolumeLiters.toFixed(2)} л
						</div>
						<div className="text-[10px] text-teal-700">для разведения концентрата</div>
					</div>
				</div>
			</div>
		</>
	);
}
