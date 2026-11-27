/**
 * OfflineSyncGuardModal.tsx — DENTE CRM Offline Storage & CRDT Sync Status Guard
 *
 * Интерактивное модальное окно статуса автономной синхронизации клиники:
 * - Индикатор состояния сети (Онлайн / Офлайн-буферизация / Wi-Fi Mesh / Репликация)
 * - Индикатор емкости и целостности локального хранилища (IndexedDB / LocalStorage / Memory)
 * - Подсчет буферизированных приемов, зубных формул (FDI 11–48) и дневников 043/у
 * - Индикатор выживаемости узла (HEALTHY / DEGRADED / CRITICAL)
 * - Кнопка ручной принудительной синхронизации с анимацией прогресса
 * - Просмотр очереди Outbox с детализацией мутаций и разрешенных CRDT-конфликтов
 * - Экспорт аварийного криптографического слепка данных (.dente)
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Clock,
	Database,
	Download,
	FileText,
	HardDrive,
	Layers,
	Radio,
	RefreshCw,
	ShieldCheck,
	Sparkles,
	Wifi,
	WifiOff,
	X,
} from "lucide-react";
import {
	type CrdtOutboxQueueItem,
	type CrdtSyncEngineStatus,
	type CrdtSyncSummary,
	crdtSyncEngine,
	generateUuidV7,
	type SyncPushBatchRequest,
	type SyncPushBatchResponse,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import { denteClinicalMutationHeaders } from "../../lib/denteRequestHeaders";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import { OfflineMutationQueueViewer } from "./OfflineMutationQueueViewer";

export interface OfflineSyncGuardModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSyncComplete?: (summary: CrdtSyncSummary) => void;
	readonly customGatewayPushFn?: (batch: SyncPushBatchRequest) => Promise<SyncPushBatchResponse>;
}

export const OfflineSyncGuardModal: React.FC<OfflineSyncGuardModalProps> = ({
	isOpen,
	onClose,
	onSyncComplete,
	customGatewayPushFn,
}) => {
	const [status, setStatus] = useState<CrdtSyncEngineStatus>(() => crdtSyncEngine.getStatus());
	const [pendingItems, setPendingItems] = useState<CrdtOutboxQueueItem[]>([]);
	const [isSyncing, setIsSyncing] = useState(false);
	const [activeTab, setActiveTab] = useState<"overview" | "queue" | "diagnostics">("overview");
	const {
		pendingMutationCount,
		syncNow: drainOfflineOutbox,
		refresh: refreshPendingMutations,
	} = useOfflineSync({ autoSyncOnReconnect: false });

	const totalPendingUnified = pendingItems.length + pendingMutationCount;

	const refreshTelemetry = useCallback(async () => {
		try {
			const telemetry = await crdtSyncEngine.getTelemetry();
			setStatus(telemetry);
			const storage = crdtSyncEngine.getStorage();
			const items = await storage.getPendingOutbox();
			setPendingItems(items);
		} catch {
			// fallback to synchronous status
			setStatus(crdtSyncEngine.getStatus());
		}
	}, []);

	useEffect(() => {
		if (!isOpen) return;

		void refreshTelemetry();

		const unsubscribe = crdtSyncEngine.subscribe((event) => {
			if (event.status) {
				setStatus(event.status);
			}
			void refreshTelemetry();
		});

		const interval = setInterval(() => {
			void refreshTelemetry();
		}, 3000);

		return () => {
			unsubscribe();
			clearInterval(interval);
		};
	}, [isOpen, refreshTelemetry]);

	const handleManualSync = async () => {
		if (isSyncing) return;
		setIsSyncing(true);

		try {
			const gatewayFn = customGatewayPushFn || (async (batch: SyncPushBatchRequest): Promise<SyncPushBatchResponse> => {
				const response = await fetch("/api/sync/gateway", {
					method: "POST",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify(batch),
				});

				if (!response.ok) {
					throw new Error(`Ошибка шлюза синхронизации HTTP ${response.status}: ${response.statusText}`);
				}

				return (await response.json()) as SyncPushBatchResponse;
			});

			const result = await crdtSyncEngine.forceSync(gatewayFn);
			if (pendingMutationCount > 0) {
				try {
					await drainOfflineOutbox();
				} catch (drainErr) {
					showToast(
						drainErr instanceof Error ? `Часть локальной очереди не синхронизирована: ${drainErr.message}` : "Часть локальной очереди не синхронизирована",
						"warning",
					);
				}
			}
			await Promise.all([refreshTelemetry(), refreshPendingMutations()]);

			const totalSynced =
				result.pushedBatch.appliedCount +
				result.pushedBatch.duplicateCount +
				result.pushedBatch.mergedCount;
			if (result.success) {
				showToast(
					`Синхронизация завершена. Успешно отправлено пакетов: ${totalSynced}`,
					"success",
				);
				if (onSyncComplete) onSyncComplete(result);
			} else {
				showToast(
					result.pushedBatch.errors.join("; ") || "Часть мутаций требует повторной отправки",
					"warning",
				);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Сбой сетевого подключения к серверу клиники";
			showToast(`Ошибка синхронизации: ${msg}`, "error");
		} finally {
			setIsSyncing(false);
		}
	};

	const handleExportEmergencyBackup = async () => {
		try {
			const storage = crdtSyncEngine.getStorage();
			const appointments = await storage.listEntities("appointment");
			const odontograms = await storage.listEntities("odontogram_state");
			const diaries = await storage.listEntities("visit_diary");
			const patients = await storage.listEntities("patient");
			const payments = await storage.listEntities("payment");
			const pending = await storage.getPendingOutbox();

			const dump = {
				exportedAtIso: new Date().toISOString(),
				nodeId: crdtSyncEngine.getNodeId(),
				organizationId: crdtSyncEngine.getOrganizationId(),
				status,
				data: {
					appointments,
					odontograms,
					diaries,
					patients,
					payments,
					pendingOutbox: pending,
				},
			};

			const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `dente-offline-vault-${new Date().toISOString().slice(0, 10)}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			showToast(
				`Аварийный слепок выгружен. Сохранен файл с ${pending.length} ожидающими мутациями и клиническими данными`,
				"success",
			);
		} catch (err) {
			showToast(
				err instanceof Error ? err.message : "Не удалось сформировать файл",
				"error",
			);
		}
	};

	const survivabilityBadge = useMemo(() => {
		switch (status.survivabilityGrade) {
			case "HEALTHY":
				return {
					text: "Хранилище в норме",
					bg: "bg-[var(--success-soft)] text-[var(--success)]",
					icon: CheckCircle2,
				};
			case "DEGRADED":
				return {
					text: "Буферизация изменений",
					bg: "bg-[var(--warning-soft)] text-[var(--warning)]",
					icon: AlertTriangle,
				};
			case "CRITICAL":
			default:
				return {
					text: "Критическое переполнение",
					bg: "bg-[var(--danger-soft)] text-[var(--danger)]",
					icon: AlertCircle,
				};
		}
	}, [status.survivabilityGrade]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-x-clip max-w-[100vw]"
			role="dialog"
			aria-modal="true"
			aria-label="Модальное окно статуса автономной синхронизации"
			data-testid="offline-sync-guard-modal"
		>
			<div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[var(--paper)] text-[var(--ink)] rounded-2xl shadow-2xl border border-[var(--line)] overflow-hidden">
				{/* ── Modal Header ── */}
				<div className="h-14 px-6 border-b border-[var(--line)] flex items-center justify-between shrink-0 bg-[var(--paper-soft)]/50">
					<div className="flex items-center gap-3 min-w-0">
						<div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
							<Radio className="w-4 h-4 animate-pulse" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-base font-semibold tracking-tight">
									Автономная синхронизация
								</h2>
								<span
									className={`h-6 px-2 text-xs font-medium rounded-full inline-flex items-center gap-1 shrink-0 ${survivabilityBadge.bg}`}
								>
									<survivabilityBadge.icon className="w-3.5 h-3.5 shrink-0" />
									{survivabilityBadge.text}
								</span>
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="h-9 w-9 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors shrink-0"
						aria-label="Закрыть окно"
						data-testid="close-sync-modal-button"
					>
						<X className="w-4 h-4 shrink-0" />
					</button>
				</div>

				{/* ── Status Banner ── */}
				<div className="px-6 py-3 bg-[var(--paper-soft)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-4 text-xs flex-wrap">
						<div className="flex items-center gap-1.5">
							{status.isOnline ? (
								<Wifi className="w-4 h-4 text-[var(--success)]" />
							) : (
								<WifiOff className="w-4 h-4 text-[var(--warning)]" />
							)}
							<span className="font-medium text-sm text-[var(--ink)]">
								{status.isOnline ? "Сеть доступна" : "Автономный режим"}
							</span>
						</div>

						<div className="flex items-center gap-1.5 text-[var(--ink-muted)]">
							<Database className="w-3.5 h-3.5 shrink-0" />
							<span>Хранилище: <strong className="text-[var(--ink)]">{status.storageDriver}</strong></span>
						</div>

						<div className="flex items-center gap-1.5 text-[var(--ink-muted)]">
							<Layers className="w-3.5 h-3.5 shrink-0" />
							<span>В очереди: <strong className="text-[var(--ink)] font-mono tabular-nums">{totalPendingUnified}</strong></span>
						</div>

						{status.lastSyncTimestampIso && (
							<div className="flex items-center gap-1.5 text-[var(--ink-muted)]">
								<Clock className="w-3.5 h-3.5 shrink-0" />
								<span>Выгрузка: {new Date(status.lastSyncTimestampIso).toLocaleTimeString("ru-RU")}</span>
							</div>
						)}
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handleExportEmergencyBackup}
							className="h-9 px-3.5 rounded-lg text-sm font-medium gap-2 inline-flex items-center justify-center shrink-0 bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] transition-colors"
							title="Экспорт локального слепка данных"
						>
							<Download className="w-4 h-4 shrink-0" />
							<span>Экспорт слепка</span>
						</button>

						<button
							type="button"
							onClick={handleManualSync}
							disabled={isSyncing}
							className="h-9 px-3.5 rounded-lg text-sm font-medium gap-2 inline-flex items-center justify-center shrink-0 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm transition-colors disabled:opacity-50"
							data-testid="force-sync-button"
						>
							<RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
							<span>{isSyncing ? "Синхронизация..." : "Синхронизировать"}</span>
						</button>
					</div>
				</div>

				{/* ── Navigation Tabs (Apple Segmented) ── */}
				<div className="px-6 pt-4 shrink-0">
					<div className="p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] inline-flex items-center gap-1">
						<button
							type="button"
							onClick={() => setActiveTab("overview")}
							className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
								activeTab === "overview"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
									: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
						>
							Сводка хранилища
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("queue")}
							className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
								activeTab === "queue"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
									: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
						>
							<span>Очередь отправки</span>
							{totalPendingUnified > 0 && (
								<span className="h-5 px-1.5 text-xs font-medium rounded-full inline-flex items-center bg-[var(--warning-soft)] text-[var(--warning)] font-mono tabular-nums">
									{totalPendingUnified}
								</span>
							)}
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("diagnostics")}
							className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
								activeTab === "diagnostics"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
									: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
						>
							Телеметрия узла
						</button>
					</div>
				</div>

				{/* ── Tab Content Area ── */}
				<div className="flex-1 overflow-y-auto p-6 space-y-4">
					{activeTab === "overview" && (
						<div className="space-y-4">
							{/* Metric Cards Grid */}
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
								<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50">
									<div className="flex items-center justify-between text-xs text-[var(--ink-muted)] mb-1">
										<span>Зубные формулы</span>
										<Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
									</div>
									<div className="text-xl font-semibold text-[var(--ink)] font-mono tabular-nums">
										{status.bufferedRecordsCount.odontograms}
									</div>
									<div className="text-xs text-[var(--ink-muted)] mt-0.5">
										Постоянный и молочный прикус
									</div>
								</div>

								<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50">
									<div className="flex items-center justify-between text-xs text-[var(--ink-muted)] mb-1">
										<span>Дневники приема</span>
										<FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
									</div>
									<div className="text-xl font-semibold text-[var(--ink)] font-mono tabular-nums">
										{status.bufferedRecordsCount.diaries}
									</div>
									<div className="text-xs text-[var(--ink-muted)] mt-0.5">
										Медицинская карта
									</div>
								</div>

								<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50">
									<div className="flex items-center justify-between text-xs text-[var(--ink-muted)] mb-1">
										<span>Приемы / Визиты</span>
										<Activity className="w-3.5 h-3.5 text-[var(--success)]" />
									</div>
									<div className="text-xl font-semibold text-[var(--ink)] font-mono tabular-nums">
										{status.bufferedRecordsCount.appointments}
									</div>
									<div className="text-xs text-[var(--ink-muted)] mt-0.5">
										Расписание врачей
									</div>
								</div>

								<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50">
									<div className="flex items-center justify-between text-xs text-[var(--ink-muted)] mb-1">
										<span>Оплаты / Чеки</span>
										<ShieldCheck className="w-3.5 h-3.5 text-[var(--warning)]" />
									</div>
									<div className="text-xl font-semibold text-[var(--ink)] font-mono tabular-nums">
										{status.bufferedRecordsCount.payments}
									</div>
									<div className="text-xs text-[var(--ink-muted)] mt-0.5">
										Копеечная точность
									</div>
								</div>
							</div>

							{/* Clinical Guarantees Card */}
							<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2 text-xs">
								<div className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
									<ShieldCheck className="w-4 h-4 text-[var(--primary)] shrink-0" />
									<span>Гарантии автономной работы клиники</span>
								</div>
								<ul className="list-disc list-inside space-y-1 text-[var(--ink-muted)]">
									<li>
										<strong className="text-[var(--ink)]">Без потери данных:</strong> Все записи приемов, одонтограммы и дневники сохраняются локально при потере связи.
									</li>
									<li>
										<strong className="text-[var(--ink)]">Неблокирующий интерфейс:</strong> Врач продолжает заполнять протокол приема без всплывающих окон ошибок.
									</li>
									<li>
										<strong className="text-[var(--ink)]">Бесконфликтное слияние:</strong> Изменения разных поверхностей одного зуба объединяются без перезаписи.
									</li>
									<li>
										<strong className="text-[var(--ink)]">Идемпотентность пакетов:</strong> Повторная отправка при нестабильной сети не создает дубликатов чеков или записей.
									</li>
								</ul>
							</div>
						</div>
					)}

					{activeTab === "queue" && (
						<div className="space-y-3">
							<OfflineMutationQueueViewer
								maxHeight="380px"
								crdtItems={pendingItems}
								onSyncAll={handleManualSync}
							/>
						</div>
					)}

					{activeTab === "diagnostics" && (
						<div className="space-y-3 text-xs">
							<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50 space-y-2">
								<h3 className="text-sm font-semibold text-[var(--ink)]">Телеметрия рабочего места</h3>
								<div className="grid grid-cols-2 gap-2 text-xs">
									<div className="text-[var(--ink-muted)]">Счетчик последовательности:</div>
									<div className="font-mono text-right tabular-nums">L{status.lamportTime}</div>
									<div className="text-[var(--ink-muted)]">Сдвиг времени:</div>
									<div className="font-mono text-right tabular-nums">{status.clockSkewMs} мс</div>
									<div className="text-[var(--ink-muted)]">Уровень синхронизации:</div>
									<div className="font-mono text-right">{status.activeTier}</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* ── Modal Footer ── */}
				<div className="h-16 px-6 border-t border-[var(--line)] bg-[var(--paper-soft)]/50 flex items-center justify-end gap-3 shrink-0">
					<button
						type="button"
						onClick={onClose}
						className="h-9 px-3.5 rounded-lg text-sm font-medium inline-flex items-center justify-center shrink-0 bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] transition-colors"
						data-testid="close-sync-modal-footer-button"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};

export default OfflineSyncGuardModal;
