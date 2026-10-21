import { AlertTriangle, FileText, Package, Plus, Search } from "lucide-react";
import React from "react";

export interface StockTableEmptyStateProps {
	readonly loadError: string | null;
	readonly effectiveSearch: string;
	readonly isLoading: boolean;
	readonly onRetry?: (() => void) | undefined;
	readonly onOpenWaybills?: (() => void) | undefined;
	readonly onOpenAddModal?: (() => void) | undefined;
}

export const StockTableEmptyState: React.FC<StockTableEmptyStateProps> = ({
	loadError,
	effectiveSearch,
	isLoading,
	onRetry,
	onOpenWaybills,
	onOpenAddModal,
}) => {
	return (
		<tr>
			<td
				colSpan={7}
				style={{
					padding: "32px 16px",
					textAlign: "center",
					color: "var(--muted)",
				}}
			>
				{loadError ? (
					<div className="flex flex-col items-center gap-3">
						<AlertTriangle size={24} className="text-rose-600 dark:text-rose-400" />
						<span className="text-[var(--ink)] font-semibold text-sm">
							{loadError}
						</span>
						{onRetry && (
							<button
								type="button"
								onClick={onRetry}
								disabled={isLoading}
								className="secondary-button h-8 px-4 rounded-lg text-xs font-bold inline-flex items-center justify-center cursor-pointer"
								style={{ height: 32, minHeight: 32, borderRadius: 8 }}
							>
								{isLoading ? "Загружаем..." : "Повторить"}
							</button>
						)}
					</div>
				) : effectiveSearch ? (
					<div className="flex flex-col items-center gap-2">
						<Search size={28} className="text-[var(--muted)] opacity-60" />
						<span className="text-[var(--ink)] font-semibold text-sm">
							Материалы не найдены по запросу «{effectiveSearch}»
						</span>
						<span className="text-[var(--muted)] text-xs">
							Проверьте правильность наименования, артикула SKU или штрихкода партии.
						</span>
					</div>
				) : (
					<div className="flex flex-col items-center gap-3 max-w-md mx-auto text-center" data-testid="inventory-empty-state-card">
						<Package size={36} className="text-teal-600 dark:text-teal-400" />
						<span className="text-[var(--ink)] font-bold text-base" data-testid="inventory-empty-state-title">
							Материалы не заприходованы. Добавить первую партию
						</span>
						<span className="text-[var(--muted)] text-xs leading-relaxed">
							Оформите первую приходную накладную для оприходования медикаментов, анестетиков и расходников по FEFO.
						</span>
						<div className="flex flex-wrap items-center justify-center gap-2 mt-2">
							{onOpenWaybills && (
								<button
									type="button"
									onClick={onOpenWaybills}
									className="primary-button h-8 px-3.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
									style={{ height: 32, minHeight: 32, borderRadius: 8 }}
									data-testid="empty-state-acceptance-waybills-btn"
								>
									<FileText size={14} />
									<span>Приходная накладная</span>
								</button>
							)}
							{onOpenAddModal && (
								<button
									type="button"
									onClick={onOpenAddModal}
									className="secondary-button h-8 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
									style={{
										height: 32,
										minHeight: 32,
										borderRadius: 8,
										border: "1px solid var(--line)",
										background: "var(--paper-soft)",
										color: "var(--ink)",
									}}
									data-testid="empty-state-add-first-material-btn"
								>
									<Plus size={14} />
									<span>Добавить первую партию</span>
								</button>
							)}
						</div>
					</div>
				)}
			</td>
		</tr>
	);
};

export default StockTableEmptyState;
