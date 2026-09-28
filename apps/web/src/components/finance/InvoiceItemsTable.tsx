/**
 * InvoiceItemsTable.tsx — Таблица позиций сметы с контролем фиксации цен и рекомендацией аналогов 804н.
 */

import React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import {
	formatKopecksRu,
	type PlanToInvoiceValidationReport,
	type PriceLockResolutionPolicy,
} from "@dental/shared";

export interface InvoiceItemsTableProps {
	readonly report: PlanToInvoiceValidationReport;
	readonly adminOverrideAuthorized: boolean;
	readonly unapprovedItemIds: ReadonlySet<string>;
	readonly onItemResolutionChange: (itemId: string, resolution: PriceLockResolutionPolicy) => void;
	readonly onSelectAnalogue: (itemId: string, analogueServiceId: string) => void;
}

export const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
	report,
	adminOverrideAuthorized,
	unapprovedItemIds,
	onItemResolutionChange,
	onSelectAnalogue,
}) => {
	return (
		<div className="flex-1 overflow-y-auto p-6 min-h-0">
			{report.blockingReasons.length > 0 && !adminOverrideAuthorized && (
				<div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs">
					<div className="flex items-center gap-2 font-bold mb-1">
						<ShieldAlert
							size={16}
							className="text-rose-600 dark:text-rose-400"
						/>
						<span>
							Оформление заблокировано системой финансового контроля:
						</span>
					</div>
					<ul className="list-disc pl-5 space-y-0.5">
						{report.blockingReasons.map((reason, idx) => (
							<li key={idx}>{reason}</li>
						))}
					</ul>
				</div>
			)}

			<table className="w-full text-left text-xs border-collapse">
				<thead>
					<tr className="border-b border-[var(--line)] text-[var(--ink-muted)] uppercase tracking-wider font-semibold">
						<th className="pb-2 pl-2">Зуб / Услуга</th>
						<th className="pb-2 text-center">Код услуги</th>
						<th className="pb-2 text-right">Цена в плане</th>
						<th className="pb-2 text-right">Текущий прайс</th>
						<th className="pb-2 text-right">Дельта</th>
						<th className="pb-2 text-center">Режим фиксации</th>
						<th className="pb-2 text-right pr-2">Итого в наряд</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-[var(--line-subtle)]">
					{report.items.map((it) => {
						const hasArchived = it.isArchived || !it.isFoundInCatalog;
						const hasAnalogue = !!it.suggested804nAnalogue;
						const isUnapproved = unapprovedItemIds.has(it.itemId);

						return (
							<tr
								key={it.itemId}
								className={`hover:bg-[var(--paper-soft)] transition-colors ${
									it.severity === "BLOCKED" || isUnapproved
										? "bg-rose-500/5"
										: ""
								}`}
							>
								<td className="py-3 pl-2 max-w-[280px] min-w-0">
									<div className="font-semibold text-[var(--ink)] truncate min-w-0" title={it.nameRu}>
										{it.toothNumber ? `Зуб ${it.toothNumber}: ` : ""}
										{it.nameRu}
									</div>
									<div className="text-[11px] text-[var(--ink-muted)] truncate min-w-0">
										{it.categoryRu} • {it.quantity} шт.
									</div>

									{isUnapproved && (
										<div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded w-fit">
											<AlertTriangle size={11} className="shrink-0" />
											<span>ПП РФ №659: Требует Допсоглашения</span>
										</div>
									)}

									{/* Analogue Recommender Box */}
									{hasArchived && (
										<div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px]">
											<div className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1">
												<AlertTriangle size={12} />
												<span>
													Услуга архивирована. Рекомендуемый аналог:
												</span>
											</div>
											{hasAnalogue ? (
												<div className="mt-1 flex items-center justify-between gap-2 min-w-0">
													<span className="text-[var(--ink)] font-medium truncate min-w-0" title={it.suggested804nAnalogue ? `${it.suggested804nAnalogue.code804n} ${it.suggested804nAnalogue.title}` : undefined}>
														<strong>
															{it.suggested804nAnalogue?.code804n}
														</strong>{" "}
														{it.suggested804nAnalogue?.title} (
														{it.suggested804nAnalogue?.basePriceRub} ₽)
													</span>
													<button
														type="button"
														onClick={() =>
															onSelectAnalogue(
																it.itemId,
																it.suggested804nAnalogue!.serviceId,
															)
														}
														className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] whitespace-nowrap transition-colors cursor-pointer"
													>
														Применить
													</button>
												</div>
											) : (
												<div className="text-rose-600 dark:text-rose-400 font-medium">
													Прямой аналог не найден. Выберите услугу вручную.
												</div>
											)}
										</div>
									)}
								</td>

								<td className="py-3 text-center font-mono font-bold text-[var(--ink-muted)]">
									{it.code804n}
								</td>

								<td className="py-3 text-right font-medium text-[var(--ink)]">
									{formatKopecksRu(it.planUnitPriceKopecks)}
								</td>

								<td className="py-3 text-right font-medium text-[var(--ink)]">
									{it.currentCatalogPriceKopecks > 0
										? formatKopecksRu(it.currentCatalogPriceKopecks)
										: "—"}
								</td>

								<td className="py-3 text-right">
									{it.unitPriceDeltaKopecks > 0 ? (
										<span className="text-amber-600 dark:text-amber-400 font-bold">
											+{formatKopecksRu(it.unitPriceDeltaKopecks)}
										</span>
									) : it.unitPriceDeltaKopecks < 0 ? (
										<span className="text-emerald-600 dark:text-emerald-400 font-bold">
											{formatKopecksRu(it.unitPriceDeltaKopecks)}
										</span>
									) : (
										<span className="text-[var(--ink-muted)]">0 ₽</span>
									)}
								</td>

								<td className="py-3 text-center">
									<select
										value={it.selectedResolution}
										onChange={(e) =>
											onItemResolutionChange(
												it.itemId,
												e.target.value as PriceLockResolutionPolicy,
											)
										}
										className="px-2 py-1 bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg text-xs font-medium focus:ring-2 focus:ring-teal-500"
									>
										<option value="LOCK_ORIGINAL_PRICE">
											Зафиксировать план
										</option>
										<option value="UPDATE_TO_CURRENT_PRICE">
											Текущий прайс
										</option>
										<option value="REPLACE_WITH_804N_ANALOGUE">
											Аналог из каталога
										</option>
										<option value="ADMIN_OVERRIDE">Согласование</option>
									</select>
								</td>

								<td className="py-3 text-right pr-2 font-bold text-[var(--ink)]">
									{formatKopecksRu(it.effectiveLineNetKopecks)}
									{it.clinicAbsorptionKopecks > 0 && (
										<div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
											Скидка клиники:{" "}
											{formatKopecksRu(it.clinicAbsorptionKopecks)}
										</div>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};
