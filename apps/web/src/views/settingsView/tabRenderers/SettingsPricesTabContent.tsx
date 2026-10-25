/**
 * @file apps/web/src/views/settingsView/tabRenderers/SettingsPricesTabContent.tsx
 * @description Dedicated pricelist tab renderer with analysis warnings and summary.
 */

import React from "react";
import type { DentalPricelistAnalysisResponse } from "@dental/shared";
import { money } from "../../../utils/formatters";
import { SettingsPricesTab } from "../../../components/settings/SettingsPricesTab";

export interface SettingsPricesTabContentProps {
	pricelistAnalysis?: any;
	pricelistImageNote?: string | undefined;
	pricelistWarningsText?: ((warnings: any[]) => string) | undefined;
	pricelistItemMaterialText?: ((item: any) => string) | undefined;
	pricelistMaterialSummaryText?: ((summary: any) => string) | undefined;
}

export const SettingsPricesTabContent: React.FC<SettingsPricesTabContentProps> = ({
	pricelistAnalysis,
	pricelistImageNote,
	pricelistWarningsText = () => "",
	pricelistItemMaterialText = () => "",
	pricelistMaterialSummaryText = () => "",
}) => {
	const typedPricelistItems = (pricelistAnalysis?.items ??
		[]) as DentalPricelistAnalysisResponse["items"];
	const pricelistWarningRows = (typedPricelistItems ?? []).filter(
		(item) => (item?.warnings ?? []).length > 0,
	);
	const typedPricelistResponseWarnings = (pricelistAnalysis?.warnings ??
		[]) as DentalPricelistAnalysisResponse["warnings"];
	const typedPricelistSummary = (pricelistAnalysis?.summary ??
		[]) as DentalPricelistAnalysisResponse["summary"];

	const pricelistSummaryPriceRangeText = (summary: DentalPricelistAnalysisResponse["summary"][number]): string => {
		if (summary.minPriceRub === null || summary.maxPriceRub === null) return "не определяются — ни одна строка категории не отдала цену";
		const range = summary.minPriceRub === summary.maxPriceRub ? money(summary.minPriceRub) : `${money(summary.minPriceRub)} — ${money(summary.maxPriceRub)}`;
		return summary.averagePriceRub === null ? `${range}, среднее не определяется` : `${range}, в среднем ${money(summary.averagePriceRub)}`;
	};

	return (
		<div className="space-y-4">
			{typedPricelistResponseWarnings.length > 0 && (
				<section
					aria-label="Замечания к разбору всего прайса"
					className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2"
				>
					<strong className="text-amber-700 dark:text-amber-400 block">
						Прайс целиком: замечаний — {typedPricelistResponseWarnings.length}
					</strong>
					<ul className="list-disc pl-4 space-y-1 text-[var(--ink)]">
						{typedPricelistResponseWarnings.map((warning) => (
							<li key={warning}>{pricelistWarningsText([warning])}</li>
						))}
					</ul>
				</section>
			)}

			{typeof pricelistImageNote === "string" && pricelistImageNote.trim() && (
				<p className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)]">
					Фото прайса: {pricelistImageNote}
				</p>
			)}

			{typedPricelistSummary.length > 0 && (
				<section
					aria-label="Материалы и бренды, распознанные в прайсе"
					className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs space-y-2"
				>
					<strong className="text-[var(--ink)] block">Материалы, распознанные в прайсе</strong>
					<ul className="list-disc pl-4 max-h-48 overflow-y-auto space-y-1">
						{typedPricelistSummary.map((summary) => (
							<li key={`${summary.category}-${summary.specialty}`}>
								{summary.category} — строк {summary.count}, с ценой {summary.pricedCount}:{" "}
								<span className="text-[var(--muted)]">
									{pricelistMaterialSummaryText(summary)}
								</span>
								<br />
								<span className="text-[11px] text-[var(--muted)]">
									Цены в категории: {pricelistSummaryPriceRangeText(summary)}
								</span>
							</li>
						))}
					</ul>
				</section>
			)}

			{pricelistWarningRows.length > 0 && (
				<section
					aria-label="Строки прайса, требующие ручной проверки"
					className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2"
				>
					<strong className="text-amber-700 dark:text-amber-400 block">
						Проверьте руками: строк с предупреждениями — {pricelistWarningRows.length} из {typedPricelistItems.length}
					</strong>
					<ul className="list-disc pl-4 max-h-48 overflow-y-auto space-y-1">
						{pricelistWarningRows.map((item) => (
							<li key={item.id}>
								Строка {item.sourceLine} — {item.title}:{" "}
								<span className="text-amber-600 font-bold">
									{pricelistWarningsText(item.warnings)}
								</span>
								<br />
								<span className="text-[11px] text-[var(--muted)]">
									Материал по разбору: {pricelistItemMaterialText(item)}
								</span>
							</li>
						))}
					</ul>
				</section>
			)}

			<SettingsPricesTab />
		</div>
	);
};
