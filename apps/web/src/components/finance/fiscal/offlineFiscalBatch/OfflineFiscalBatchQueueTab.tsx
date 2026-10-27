import React from "react";
import { CheckCircle2, Layers } from "lucide-react";
import type { DisplayReceiptItem } from "./offlineFiscalBatchTypes";

interface OfflineFiscalBatchQueueTabProps {
	readonly receiptsToDisplay: readonly DisplayReceiptItem[];
	readonly filteredReceipts: readonly DisplayReceiptItem[];
	readonly statusFilter: string;
	readonly setStatusFilter: (v: string) => void;
}

export function OfflineFiscalBatchQueueTab({
	receiptsToDisplay,
	filteredReceipts,
	statusFilter,
	setStatusFilter,
}: OfflineFiscalBatchQueueTabProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="text-sm text-[var(--muted)]">Список чеков, накопленных во время работы без связи с кассой:</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => setStatusFilter("all")}
						className={`dente-btn-pill ${statusFilter === "all" ? "active" : ""}`}
					>
						Все ({receiptsToDisplay.length})
					</button>
					<button
						type="button"
						onClick={() => setStatusFilter("pending")}
						className={`dente-btn-pill ${statusFilter === "pending" ? "active" : ""}`}
					>
						В очереди ({receiptsToDisplay.filter((r) => r.status === "pending").length})
					</button>
					<button
						type="button"
						onClick={() => setStatusFilter("fiscalized")}
						className={`dente-btn-pill ${statusFilter === "fiscalized" ? "active" : ""}`}
					>
						Фискализированы ({receiptsToDisplay.filter((r) => r.status === "fiscalized").length})
					</button>
				</div>
			</div>

			<div className="overflow-x-auto border border-[var(--glass-border)] rounded-lg">
				<table className="w-full text-xs text-left">
					<thead className="bg-[var(--paper-strong)] text-[var(--muted)] font-semibold border-b border-[var(--glass-border)]">
						<tr>
							<th className="p-3">ID / Время</th>
							<th className="p-3">Пациент</th>
							<th className="p-3">Услуги</th>
							<th className="p-3 text-right">Наличные</th>
							<th className="p-3 text-right">Карты</th>
							<th className="p-3 text-right">СБП</th>
							<th className="p-3 text-right">Аванс</th>
							<th className="p-3 text-right font-bold">Итого</th>
							<th className="p-3 text-center">Статус</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--glass-border)]">
						{filteredReceipts.length === 0 ? (
							<tr>
								<td colSpan={9} className="p-8 text-center text-[var(--muted)]">
									<Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
									<span>Очередь офлайн-чеков пуста. Все чеки фискализированы.</span>
								</td>
							</tr>
						) : (
							filteredReceipts.map((r) => (
								<tr key={r.id} className="hover:bg-[var(--glass-hover)] transition-colors">
									<td className="p-3 font-mono">
										<div className="font-semibold text-[var(--ink)]">{r.id}</div>
										<div className="text-[10px] text-[var(--muted)]">{new Date(r.timestampIso).toLocaleString("ru-RU")}</div>
									</td>
									<td className="p-3 font-medium">{r.patientFullName || "Пациент клиники"}</td>
									<td className="p-3 max-w-[200px] truncate text-[var(--muted)]" title={r.itemsNames}>{r.itemsNames}</td>
									<td className="p-3 text-right font-mono text-amber-600 dark:text-amber-400">{r.cashRub ? `${r.cashRub.toLocaleString("ru-RU")} ₽` : "—"}</td>
									<td className="p-3 text-right font-mono text-indigo-600 dark:text-indigo-400">{r.cardRub ? `${r.cardRub.toLocaleString("ru-RU")} ₽` : "—"}</td>
									<td className="p-3 text-right font-mono text-teal-600 dark:text-teal-400">{r.sbpRub ? `${r.sbpRub.toLocaleString("ru-RU")} ₽` : "—"}</td>
									<td className="p-3 text-right font-mono text-purple-600 dark:text-purple-400">{r.advanceOffsetRub ? `${r.advanceOffsetRub.toLocaleString("ru-RU")} ₽` : "—"}</td>
									<td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{r.totalRub.toLocaleString("ru-RU")} ₽</td>
									<td className="p-3 text-center">
										{r.status === "fiscalized" ? (
											<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
												<CheckCircle2 className="w-3 h-3" /> ФД #{r.fiscalDocNumber}
											</span>
										) : r.status === "duplicate_skipped" ? (
											<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600">Дубликат</span>
										) : (
											<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600">В очереди</span>
										)}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
