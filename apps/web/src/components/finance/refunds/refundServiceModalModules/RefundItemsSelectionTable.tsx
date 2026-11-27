import React from "react";
import { kopecksToRubles, percentageOfKopecks, rublesToKopecks } from "@dental/shared";
import { AlertCircle, Check } from "lucide-react";
import type { RefundServiceItem } from "./types";

export interface RefundItemsSelectionTableProps {
	readonly rawServices: readonly RefundServiceItem[];
	readonly selectedItemIds: Set<string>;
	readonly toggleSelectItem: (id: string) => void;
	readonly doctorCommissionPct: number;
	readonly doctorName: string;
}

export const RefundItemsSelectionTable: React.FC<RefundItemsSelectionTableProps> = ({
	rawServices,
	selectedItemIds,
	toggleSelectItem,
	doctorCommissionPct,
	doctorName,
}) => {
	return (
		<div>
			<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-2">
				1. Выберите позицию(и) из счета для возврата:
			</label>
			{rawServices.length === 0 ? (
				<div
					data-testid="refund-empty-services"
					className="p-8 rounded-xl border border-dashed border-[var(--border,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-center flex flex-col items-center justify-center gap-2"
				>
					<AlertCircle className="w-8 h-8 text-[var(--muted,#64748b)]" />
					<p className="text-sm font-semibold text-[var(--ink,#0f172a)] m-0">
						Позиции для возврата не найдены. Проверьте номер счёта или обратитесь к администратору
					</p>
					<p className="text-xs text-[var(--muted,#64748b)] m-0">
						В данном счёте отсутствуют позиции для оформления частичного возврата средств.
					</p>
				</div>
			) : (
				<div className="space-y-2 border border-[var(--border,#e2e8f0)] rounded-xl p-2.5 bg-[var(--paper-soft,#f8fafc)]">
					{rawServices.map((srv) => {
						const isSelected = selectedItemIds.has(srv.id);
						const netBaseKop = rublesToKopecks(Math.max(0, srv.priceRub - (srv.materialCostRub || 0)));
						const commissionBasisPoints = Math.max(0, Math.round((srv.commissionPct ?? doctorCommissionPct) * 100));
						const itemClawback = Math.round(
							kopecksToRubles(percentageOfKopecks(netBaseKop, commissionBasisPoints)),
						);

						return (
							<button
								key={srv.id}
								type="button"
								onClick={() => toggleSelectItem(srv.id)}
								className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 min-h-[48px] ${
									isSelected
										? "bg-amber-500/10 border-amber-500/40 text-[var(--ink,#0f172a)] shadow-sm"
										: "bg-[var(--paper,#ffffff)] border-[var(--border,#e2e8f0)] text-[var(--muted,#64748b)] hover:border-slate-300"
								}`}
							>
								<div
									className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 ${
										isSelected
											? "bg-amber-500 border-amber-500 text-white"
											: "border-slate-300 dark:border-slate-600 bg-[var(--paper,#ffffff)]"
									}`}
								>
									{isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-start justify-between gap-3">
										<div className="font-semibold text-sm text-[var(--ink,#0f172a)] leading-snug min-w-0">
											{srv.toothNumber && (
												<span className="px-1.5 py-0.5 rounded bg-[var(--primary-soft,rgba(13,148,136,0.12))] text-[var(--primary)] font-mono text-xs mr-1.5 inline-block">
													Зуб {srv.toothNumber}
												</span>
											)}
											{srv.name}
										</div>
										<div className="dente-money font-mono tracking-tight font-semibold text-sm text-[var(--ink,#0f172a)] shrink-0 tabular-nums whitespace-nowrap">
											{srv.priceRub.toLocaleString("ru-RU")} ₽
										</div>
									</div>

									<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[var(--ink-muted,#64748b)] mt-1">
										<span>Код: {srv.code || srv.code804n || "A16.07.002"}</span>
										<span aria-hidden="true">•</span>
										<span>Врач: {srv.doctorName || doctorName}</span>
										<span aria-hidden="true">•</span>
										<span className="text-[var(--warning,#d97706)] font-medium">
											Вычет з/п: -{itemClawback.toLocaleString("ru-RU")} ₽ ({srv.commissionPct ?? doctorCommissionPct}%)
										</span>
									</div>
								</div>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};
