/**
 * OfflineMutationQueueViewer.tsx — DENTE CRM Outbox Mutation Inspection Panel
 *
 * Инспекционная панель очереди локальных мутаций:
 * - Хронологический просмотр отложенных приемов, зубных формул (FDI) и дневников (Форма 043/у)
 * - Индикация количества попыток (retryCount), меток времени и ошибок
 * - Ручной запуск принудительного дренажа при восстановлении связи
 * - Автономная защита: отсутствие потери данных врача при аварийных сбоях питания
 */

import React, { useCallback, useState } from "react";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	Download,
	Layers,
	RefreshCw,
	ShieldCheck,
} from "lucide-react";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import type { OfflineMutation } from "../../services/offline";
import { showToast } from "../GlobalToast";

export interface OfflineMutationQueueViewerProps {
	readonly className?: string | undefined;
	readonly maxHeight?: string | undefined;
}

export const OfflineMutationQueueViewer: React.FC<OfflineMutationQueueViewerProps> = ({
	className = "",
	maxHeight = "360px",
}) => {
	const {
		pendingMutations,
		pendingMutationCount,
		isSyncing,
		isOnline,
		syncNow,
		clearSynced,
		lastSyncAt,
		lastSyncError,
	} = useOfflineSync();

	const [selectedMutation, setSelectedMutation] = useState<OfflineMutation | null>(null);

	const handleSync = useCallback(async () => {
		if (isSyncing) return;
		try {
			const result = await syncNow();
			if (result.appliedCount > 0) {
				showToast(
					`Синхронизировано мутаций: ${result.appliedCount}`,
					"success",
				);
			} else if (result.failedCount > 0) {
				showToast(
					`Не удалось синхронизировать ${result.failedCount} мутаций`,
					"warning",
				);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Ошибка сети";
			showToast(`Сбой отправки очереди: ${msg}`, "error");
		}
	}, [isSyncing, syncNow]);

	const formatEntityType = (type: string) => {
		switch (type) {
			case "appointment":
				return "Прием / Запись";
			case "odontogram":
				return "Зубная формула (FDI)";
			case "visit_diary":
				return "Дневник приема";
			case "patient":
				return "Пациент";
			case "payment":
				return "Платеж / Чек";
			case "treatment_plan":
				return "План лечения";
			default:
				return type;
		}
	};

	return (
		<div
			className={`flex flex-col rounded-xl border border-[var(--glass-border,rgba(0,0,0,0.08))] dark:border-white/10 bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong)] text-[var(--ink,#0f172a)] dark:text-slate-100 overflow-hidden shadow-sm ${className}`}
			data-testid="offline-mutation-queue-viewer"
		>
			{/* Header bar */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border,rgba(0,0,0,0.06))] dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
				<div className="flex items-center gap-2">
					<div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
						<Layers className="w-4 h-4" />
					</div>
					<div>
						<div className="text-xs font-bold">Очередь сброса мутаций (Outbox)</div>
						<div className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400">
							{pendingMutationCount === 0
								? "Все клинические данные синхронизированы"
								: `${pendingMutationCount} операций ожидают передачи на сервер`}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleSync}
						disabled={isSyncing || pendingMutationCount === 0 || !isOnline}
						className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--brand,#2563eb)] hover:bg-[var(--brand-strong,#1d4ed8)] text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed h-[30px]"
						data-testid="drain-outbox-button"
					>
						<RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
						<span>{isSyncing ? "Сброс..." : "Сбросить сейчас"}</span>
					</button>
				</div>
			</div>

			{/* Queue Items List */}
			<div
				className="overflow-y-auto divide-y divide-[var(--glass-border,rgba(0,0,0,0.06))] dark:divide-white/5 p-2"
				style={{ maxHeight }}
			>
				{pendingMutations.length === 0 ? (
					<div className="py-8 text-center text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
						<CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
						<div className="font-semibold text-slate-800 dark:text-slate-200">Очередь пуста</div>
						<div className="text-[11px] mt-0.5">Данные врача в полной безопасности</div>
					</div>
				) : (
					pendingMutations.map((mut) => (
						<div
							key={mut.mutationId}
							onClick={() => setSelectedMutation(mut)}
							className="p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
						>
							<div className="min-w-0">
								<div className="flex items-center gap-2">
									<span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
										{mut.action.toUpperCase()}
									</span>
									<span className="font-semibold truncate">
										{formatEntityType(mut.entityType)}
									</span>
								</div>
								<div className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 truncate mt-0.5">
									ID: {mut.entityId} • {new Date(mut.timestamp).toLocaleTimeString("ru-RU")}
								</div>
							</div>

							<div className="flex items-center gap-2 flex-shrink-0">
								<span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
									{mut.status}
								</span>
								{mut.retryCount > 0 && (
									<span className="text-[10px] font-mono text-slate-400">
										Попыток: {mut.retryCount}
									</span>
								)}
							</div>
						</div>
					))
				)}
			</div>

			{/* Payload Inspector Drawer */}
			{selectedMutation && (
				<div className="p-3 border-t border-[var(--glass-border,rgba(0,0,0,0.06))] dark:border-white/5 bg-slate-50/50 dark:bg-black/30">
					<div className="flex items-center justify-between text-xs mb-1.5">
						<span className="font-semibold">Полезная нагрузка ({selectedMutation.mutationId}):</span>
						<button
							type="button"
							onClick={() => setSelectedMutation(null)}
							className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
						>
							Закрыть
						</button>
					</div>
					<pre className="text-[10px] font-mono p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-white/10 overflow-x-auto max-h-[140px]">
						{JSON.stringify(selectedMutation.payload, null, 2)}
					</pre>
				</div>
			)}
		</div>
	);
};

export default OfflineMutationQueueViewer;
