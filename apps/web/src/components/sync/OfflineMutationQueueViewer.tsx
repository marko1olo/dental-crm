/**
 * OfflineMutationQueueViewer.tsx — DENTE CRM Outbox Mutation Inspection Panel
 *
 * Инспекционная панель очереди локальных мутаций:
 * - Хронологический просмотр отложенных приемов, зубных формул (FDI) и дневников (Форма 043/у)
 * - Индикация количества попыток (retryCount), меток времени и ошибок
 * - Ручной запуск принудительного дренажа при восстановлении связи
 * - Автономная защита: отсутствие потери данных врача при аварийных сбоях питания
 */

import React, { useCallback, useMemo, useState } from "react";
import {
	CheckCircle2,
	Layers,
	RefreshCw,
} from "lucide-react";
import type { CrdtOutboxQueueItem } from "@dental/shared";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import type { OfflineMutation } from "../../services/offline";
import { showToast } from "../GlobalToast";

export interface OfflineMutationQueueViewerProps {
	readonly className?: string | undefined;
	readonly maxHeight?: string | undefined;
	readonly crdtItems?: readonly CrdtOutboxQueueItem[] | undefined;
	readonly onSyncAll?: (() => Promise<void>) | undefined;
}

interface UnifiedQueueRow {
	id: string;
	action: string;
	entityType: string;
	entityId: string;
	timestamp: number | string;
	status: string;
	retryCount: number;
	payload: unknown;
}

export const OfflineMutationQueueViewer: React.FC<OfflineMutationQueueViewerProps> = ({
	className = "",
	maxHeight = "360px",
	crdtItems = [],
	onSyncAll,
}) => {
	const {
		pendingMutations,
		isSyncing,
		isOnline,
		syncNow,
	} = useOfflineSync();

	const [selectedMutation, setSelectedMutation] = useState<UnifiedQueueRow | null>(null);

	const unifiedRows = useMemo<UnifiedQueueRow[]>(() => {
		const seenIds = new Set<string>();
		const rows: UnifiedQueueRow[] = [];

		for (const mut of pendingMutations as OfflineMutation[]) {
			seenIds.add(mut.mutationId);
			rows.push({
				id: mut.mutationId,
				action: mut.action,
				entityType: mut.entityType,
				entityId: mut.entityId,
				timestamp: mut.timestamp,
				status: mut.status,
				retryCount: mut.retryCount,
				payload: mut.payload,
			});
		}

		for (const item of crdtItems) {
			if (seenIds.has(item.mutationId)) continue;
			seenIds.add(item.mutationId);
			rows.push({
				id: item.mutationId,
				action: item.action,
				entityType: item.entityKind,
				entityId: item.entityId,
				timestamp: item.createdAtMs || item.createdAtIso,
				status: item.retryCount > 0 ? "Повтор" : "Ожидает",
				retryCount: item.retryCount,
				payload: item.payload,
			});
		}

		return rows;
	}, [pendingMutations, crdtItems]);

	const handleSync = useCallback(async () => {
		if (isSyncing) return;
		if (!isOnline) {
			showToast("Нет подключения к сети клиники", "warning");
			return;
		}
		if (unifiedRows.length === 0) {
			showToast("Все клинические данные уже синхронизированы", "info");
			return;
		}
		try {
			if (onSyncAll) {
				await onSyncAll();
				return;
			}
			const result = await syncNow();
			if (result.appliedCount > 0) {
				showToast(
					`Синхронизировано мутаций: ${result.appliedCount}`,
					"success",
				);
			} else if (result.failedCount > 0) {
				showToast(
					`Не удалось синхронизировать ${result.failedCount} записей`,
					"warning",
				);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Ошибка сети";
			showToast(`Сбой отправки очереди: ${msg}`, "error");
		}
	}, [isSyncing, isOnline, unifiedRows.length, onSyncAll, syncNow]);

	const formatEntityType = (type: string) => {
		switch (type) {
			case "appointment":
				return "Прием / Запись";
			case "odontogram":
			case "odontogram_state":
				return "Зубная формула (FDI)";
			case "visit_diary":
				return "Дневник приема";
			case "patient":
				return "Пациент";
			case "patient_administrative_profile":
				return "Профиль пациента";
			case "payment":
				return "Платеж / Чек";
			case "patient_invoice":
				return "Счет на оплату";
			case "treatment_plan":
			case "treatment_item":
				return "План лечения";
			case "clinical_task":
				return "Назначение";
			default:
				return type;
		}
	};

	const formatActionLabel = (action: string) => {
		switch (action.toLowerCase()) {
			case "create":
				return "Создание";
			case "update":
				return "Обновление";
			case "delete":
				return "Удаление";
			case "upsert":
				return "Сохранение";
			default:
				return action;
		}
	};

	return (
		<div
			className={`flex flex-col rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] overflow-hidden shadow-sm ${className}`}
			data-testid="offline-mutation-queue-viewer"
		>
			{/* Header bar */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)]">
				<div className="flex items-center gap-2.5">
					<div className="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
						<Layers className="w-4 h-4 shrink-0" />
					</div>
					<div>
						<div className="text-sm font-semibold">Очередь сброса мутаций</div>
						<div className="text-xs text-[var(--ink-muted)]">
							{unifiedRows.length === 0
								? "Все клинические данные синхронизированы"
								: `${unifiedRows.length} операций ожидают передачи на сервер`}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleSync}
						disabled={isSyncing}
						className="h-8 px-2.5 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 shrink-0 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-sm transition-colors disabled:opacity-50"
						data-testid="drain-outbox-button"
					>
						<RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
						<span>{isSyncing ? "Отправка..." : "Отправить сейчас"}</span>
					</button>
				</div>
			</div>

			{/* Queue Items List */}
			<div
				className="overflow-y-auto divide-y divide-[var(--line)] p-2"
				style={{ maxHeight }}
			>
				{unifiedRows.length === 0 ? (
					<div className="py-12 flex flex-col items-center text-center gap-2.5 text-[var(--ink-muted)]">
						<CheckCircle2 className="w-10 h-10 text-[var(--success)]" />
						<div className="text-sm font-semibold text-[var(--ink)]">Очередь пуста</div>
						<div className="text-xs">Данные врача в полной безопасности</div>
					</div>
				) : (
					unifiedRows.map((mut) => (
						<div
							key={mut.id}
							onClick={() => setSelectedMutation(mut)}
							className="p-2.5 rounded-lg hover:bg-[var(--paper-soft)] transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
						>
							<div className="min-w-0">
								<div className="flex items-center gap-2">
									<span className="h-6 px-2 text-xs font-medium rounded-full inline-flex items-center gap-1 shrink-0 bg-[var(--primary)]/10 text-[var(--primary)]">
										{formatActionLabel(mut.action)}
									</span>
									<span className="font-medium text-sm truncate text-[var(--ink)]">
										{formatEntityType(mut.entityType)}
									</span>
								</div>
								<div className="text-xs text-[var(--ink-muted)] truncate mt-0.5">
									Код: {mut.entityId.slice(0, 8)} • {new Date(mut.timestamp).toLocaleTimeString("ru-RU")}
								</div>
							</div>

							<div className="flex items-center gap-2 shrink-0">
								<span className="h-6 px-2 text-xs font-medium rounded-full inline-flex items-center gap-1 shrink-0 bg-[var(--warning-soft)] text-[var(--warning)]">
									{mut.status}
								</span>
								{mut.retryCount > 0 && (
									<span className="text-xs font-mono text-[var(--ink-muted)] tabular-nums">
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
				<div className="p-3 border-t border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center justify-between text-xs mb-1.5">
						<span className="font-semibold text-[var(--ink)]">Содержимое операции:</span>
						<button
							type="button"
							onClick={() => setSelectedMutation(null)}
							className="h-8 px-2.5 rounded-md text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
						>
							Закрыть
						</button>
					</div>
					<pre className="text-xs font-mono p-2 bg-[var(--paper)] text-[var(--ink)] rounded-lg border border-[var(--line)] overflow-x-auto max-h-[140px]">
						{JSON.stringify(selectedMutation.payload, null, 2)}
					</pre>
				</div>
			)}
		</div>
	);
};

export default OfflineMutationQueueViewer;
