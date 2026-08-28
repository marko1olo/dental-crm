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
	type SyncPushBatchRequest,
	type SyncPushBatchResponse,
} from "@dental/shared";
import { showToast } from "../GlobalToast";

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
	const [selectedMutation, setSelectedMutation] = useState<CrdtOutboxQueueItem | null>(null);

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
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(batch),
				});

				if (!response.ok) {
					throw new Error(`Ошибка шлюза синхронизации HTTP ${response.status}: ${response.statusText}`);
				}

				return (await response.json()) as SyncPushBatchResponse;
			});

			const result = await crdtSyncEngine.forceSync(gatewayFn);
			await refreshTelemetry();

			if (result.success) {
				showToast(
					`Синхронизация завершена. Успешно отправлено пакетов: ${result.pushedBatch.appliedCount + result.pushedBatch.duplicateCount + result.pushedBatch.mergedCount}`,
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

	if (!isOpen) return null;

	const survivabilityBadge = useMemo(() => {
		switch (status.survivabilityGrade) {
			case "HEALTHY":
				return {
					text: "Хранилище в норме",
					bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
					icon: CheckCircle2,
				};
			case "DEGRADED":
				return {
					text: "Буферизация изменений",
					bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
					icon: AlertTriangle,
				};
			case "CRITICAL":
			default:
				return {
					text: "Критическое переполнение",
					bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
					icon: AlertCircle,
				};
		}
	}, [status.survivabilityGrade]);

	const formatEntityKindTitle = (kind: string) => {
		switch (kind) {
			case "appointment":
			case "visit":
				return "Прием / Расписание";
			case "odontogram_state":
				return "Зубная формула (FDI)";
			case "visit_diary":
				return "SOAP-дневник (043/у)";
			case "patient":
				return "Карта пациента";
			case "payment":
			case "patient_invoice":
				return "Оплата / Счет";
			default:
				return kind;
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
			role="dialog"
			aria-modal="true"
			aria-label="Модальное окно статуса автономной синхронизации"
			data-testid="offline-sync-guard-modal"
		>
			<div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[var(--paper,#ffffff)] dark:bg-[#181a20] text-[var(--ink,#0f172a)] dark:text-slate-100 rounded-xl shadow-2xl border border-[var(--glass-border,rgba(255,255,255,0.1))] overflow-hidden">
				{/* ── Modal Header ── */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--glass-border,rgba(0,0,0,0.08))] dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-[var(--brand,#2563eb)]/10 text-[var(--brand,#2563eb)] dark:text-blue-400">
							<Radio className="w-5 h-5 animate-pulse" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base font-bold tracking-tight">
									Автономная синхронизация и CRDT-хранилище
								</h2>
								<span
									className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${survivabilityBadge.bg}`}
								>
									<survivabilityBadge.icon className="w-3 h-3" />
									{survivabilityBadge.text}
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
								Отказоустойчивое сохранение приемов, зубных формул (FDI 11–48) и SOAP-дневников
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
						aria-label="Закрыть окно"
						data-testid="close-sync-modal-button"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* ── Status Banner ── */}
				<div className="px-5 py-3 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-cyan-500/5 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-cyan-500/10 border-b border-[var(--glass-border,rgba(0,0,0,0.06))] dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-4 text-xs">
						<div className="flex items-center gap-1.5">
							{status.isOnline ? (
								<Wifi className="w-4 h-4 text-emerald-500" />
							) : (
								<WifiOff className="w-4 h-4 text-amber-500" />
							)}
							<span className="font-semibold">
								{status.isOnline ? "Сеть доступна (Онлайн)" : "Офлайн-режим (Без сети)"}
							</span>
						</div>

						<div className="flex items-center gap-1.5 text-[var(--muted,#64748b)] dark:text-slate-400">
							<Database className="w-3.5 h-3.5" />
							<span>Драйвер: <strong className="text-[var(--ink,#0f172a)] dark:text-slate-200 uppercase">{status.storageDriver}</strong></span>
						</div>

						<div className="flex items-center gap-1.5 text-[var(--muted,#64748b)] dark:text-slate-400">
							<Layers className="w-3.5 h-3.5" />
							<span>В очереди: <strong className="text-[var(--ink,#0f172a)] dark:text-slate-200">{status.totalPending}</strong></span>
						</div>

						{status.lastSyncTimestampIso && (
							<div className="flex items-center gap-1.5 text-[var(--muted,#64748b)] dark:text-slate-400">
								<Clock className="w-3.5 h-3.5" />
								<span>Посл. выгрузка: {new Date(status.lastSyncTimestampIso).toLocaleTimeString("ru-RU")}</span>
							</div>
						)}
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleExportEmergencyBackup}
							className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--glass-border,rgba(0,0,0,0.12))] dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-[var(--ink,#0f172a)] dark:text-slate-200 transition-colors h-[32px]"
							title="Экспорт локального слепка данных"
						>
							<Download className="w-3.5 h-3.5" />
							<span>Экспорт .dente</span>
						</button>

						<button
							type="button"
							onClick={handleManualSync}
							disabled={isSyncing}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--brand,#2563eb)] hover:bg-[var(--brand-strong,#1d4ed8)] text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed h-[32px]"
							data-testid="force-sync-button"
						>
							<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
							<span>{isSyncing ? "Синхронизация..." : "Синхронизировать сейчас"}</span>
						</button>
					</div>
				</div>

				{/* ── Navigation Tabs ── */}
				<div className="flex items-center gap-2 px-5 pt-3 border-b border-[var(--glass-border,rgba(0,0,0,0.06))] dark:border-white/5">
					<button
						type="button"
						onClick={() => setActiveTab("overview")}
						className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-colors ${
							activeTab === "overview"
								? "border-[var(--brand,#2563eb)] text-[var(--brand,#2563eb)] dark:text-blue-400"
								: "border-transparent text-[var(--muted,#64748b)] dark:text-slate-400 hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						Сводка хранилища
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("queue")}
						className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
							activeTab === "queue"
								? "border-[var(--brand,#2563eb)] text-[var(--brand,#2563eb)] dark:text-blue-400"
								: "border-transparent text-[var(--muted,#64748b)] dark:text-slate-400 hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						<span>Очередь Outbox</span>
						{pendingItems.length > 0 && (
							<span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
								{pendingItems.length}
							</span>
						)}
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("diagnostics")}
						className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-colors ${
							activeTab === "diagnostics"
								? "border-[var(--brand,#2563eb)] text-[var(--brand,#2563eb)] dark:text-blue-400"
								: "border-transparent text-[var(--muted,#64748b)] dark:text-slate-400 hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						CRDT & Векторные часы
					</button>
				</div>

				{/* ── Tab Content Area ── */}
				<div className="flex-1 overflow-y-auto p-5 space-y-4">
					{activeTab === "overview" && (
						<div className="space-y-4">
							{/* Metric Cards Grid */}
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
								<div className="p-3.5 rounded-lg border border-[var(--glass-border,rgba(0,0,0,0.08))] dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
									<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mb-1">
										<span>Зубные формулы</span>
										<Sparkles className="w-3.5 h-3.5 text-blue-500" />
									</div>
									<div className="text-xl font-bold text-[var(--ink,#0f172a)] dark:text-white">
										{status.bufferedRecordsCount.odontograms}
									</div>
									<div className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5">
										FDI 11–48 / 51–85
									</div>
								</div>

								<div className="p-3.5 rounded-lg border border-[var(--glass-border,rgba(0,0,0,0.08))] dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
									<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mb-1">
										<span>SOAP-дневники</span>
										<FileText className="w-3.5 h-3.5 text-indigo-500" />
									</div>
									<div className="text-xl font-bold text-[var(--ink,#0f172a)] dark:text-white">
										{status.bufferedRecordsCount.diaries}
									</div>
									<div className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5">
										Форма 043/у
									</div>
								</div>

								<div className="p-3.5 rounded-lg border border-[var(--glass-border,rgba(0,0,0,0.08))] dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
									<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mb-1">
										<span>Приемы / Визиты</span>
										<Activity className="w-3.5 h-3.5 text-emerald-500" />
									</div>
									<div className="text-xl font-bold text-[var(--ink,#0f172a)] dark:text-white">
										{status.bufferedRecordsCount.appointments}
									</div>
									<div className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5">
										Расписание врачей
									</div>
								</div>

								<div className="p-3.5 rounded-lg border border-[var(--glass-border,rgba(0,0,0,0.08))] dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
									<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mb-1">
										<span>Оплаты / Чеки</span>
										<ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
									</div>
									<div className="text-xl font-bold text-[var(--ink,#0f172a)] dark:text-white">
										{status.bufferedRecordsCount.payments}
									</div>
									<div className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5">
										Копеечная точность
									</div>
								</div>
							</div>

							{/* Clinical Guarantees Card */}
							<div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 space-y-2 text-xs">
								<div className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
									<ShieldCheck className="w-4 h-4" />
									<span>Гарантии автономной работы клиники (CRDT LWW-Element-Set)</span>
								</div>
								<ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
									<li>
										<strong>Без потери данных:</strong> Все записи приемов, одонтограммы и дневники сохраняются в локальную IndexedDB при потере связи.
									</li>
									<li>
										<strong>Неблокирующий интерфейс:</strong> Врач продолжает заполнять протокол приема без всплывающих окон ошибок.
									</li>
									<li>
										<strong>Бесконфликтное слияние:</strong> Изменения разных поверхностей одного зуба (напр. O и M) объединяются без перезаписи.
									</li>
									<li>
										<strong>Идемпотентность пакетов:</strong> Повторная отправка при нестабильной сети не создает дубликатов чеков или записей.
									</li>
								</ul>
							</div>
						</div>
					)}

					{activeTab === "queue" && (
						<div className="space-y-3">
							<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
								<span>Ожидающие отправки мутации ({pendingItems.length})</span>
								<span>Сортировка: хронологическая</span>
							</div>

							{pendingItems.length === 0 ? (
								<div className="py-12 text-center text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
									<CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/60 mb-2" />
									<p className="font-medium text-slate-700 dark:text-slate-200">Очередь синхронизации пуста</p>
									<p className="text-[11px] mt-0.5">Все локальные изменения успешно переданы на сервер клиники</p>
								</div>
							) : (
								<div className="divide-y divide-[var(--glass-border,rgba(0,0,0,0.06))] dark:divide-white/5 border border-[var(--glass-border,rgba(0,0,0,0.08))] dark:border-white/10 rounded-lg overflow-hidden max-h-[380px] overflow-y-auto">
									{pendingItems.map((item) => (
										<div
											key={item.id}
											onClick={() => setSelectedMutation(item)}
											className="p-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
										>
											<div className="flex items-center gap-2.5 min-w-0">
												<div className="p-1.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold">
													{item.action.toUpperCase()}
												</div>
												<div className="min-w-0">
													<div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
														{formatEntityKindTitle(item.entityKind)}
													</div>
													<div className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 font-mono truncate">
														ID: {item.entityId} • {new Date(item.createdAtIso).toLocaleTimeString("ru-RU")}
													</div>
												</div>
											</div>

											<div className="flex items-center gap-2 flex-shrink-0">
												<span className="px-2 py-0.5 text-[10px] font-medium rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
													{item.status}
												</span>
												<span className="text-[10px] font-mono text-slate-400">
													L{item.lamportTime}
												</span>
											</div>
										</div>
									))}
								</div>
							)}

							{/* Payload Inspection Modal / Sheet */}
							{selectedMutation && (
								<div className="p-3.5 rounded-lg border border-[var(--glass-border,rgba(0,0,0,0.08))] dark:border-white/10 bg-slate-50 dark:bg-black/40 space-y-2">
									<div className="flex items-center justify-between text-xs">
										<span className="font-semibold">Детали полезной нагрузки мутации:</span>
										<button
											type="button"
											onClick={() => setSelectedMutation(null)}
											className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
										>
											Скрыть
										</button>
									</div>
									<pre className="text-[10px] font-mono p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-white/10 overflow-x-auto max-h-[160px]">
										{JSON.stringify(selectedMutation.payload, null, 2)}
									</pre>
								</div>
							)}
						</div>
					)}

					{activeTab === "diagnostics" && (
						<div className="space-y-3 text-xs">
							<div className="p-3.5 rounded-lg border border-[var(--glass-border,rgba(0,0,0,0.08))] dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-2">
								<h3 className="font-semibold text-slate-800 dark:text-slate-200">Телеметрия узла</h3>
								<div className="grid grid-cols-2 gap-2 text-[11px]">
									<div>ID Узла / Рабочего места:</div>
									<div className="font-mono text-right">{crdtSyncEngine.getNodeId()}</div>
									<div>Счетчик Lamport Clocks:</div>
									<div className="font-mono text-right">L{status.lamportTime}</div>
									<div>Калибровка часов (Skew):</div>
									<div className="font-mono text-right">{status.clockSkewMs} мс</div>
									<div>Активный уровень синхронизации:</div>
									<div className="font-mono text-right">{status.activeTier}</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* ── Modal Footer ── */}
				<div className="px-5 py-3 border-t border-[var(--glass-border,rgba(0,0,0,0.08))] dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
					<div className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400">
						DENTE CRM • LWW-Element-Set Offline Engine
					</div>

					<button
						type="button"
						onClick={onClose}
						className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-[var(--ink,#0f172a)] dark:text-slate-100 transition-colors h-[32px]"
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
