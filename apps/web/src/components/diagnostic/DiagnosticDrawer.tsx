/**
 * DENTE CRM — Diagnostic Drawer & Dev HUD («Под капотом»)
 *
 * Интерактивный пульт разработчика и администратора клиники:
 * - Живой поток структурированных логов с фильтрацией и поиском
 * - Мониторинг сетевых запросов и латентности с Correlation ID
 * - Инспекция офлайн-очереди мутаций и векторных часов
 * - 1-клик выгрузка диагностического JSON-отчета для техподдержки
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ClientLogEntry, LogLevel, NetworkLogEntry } from "@dental/shared";
import {
	Activity,
	AlertTriangle,
	Check,
	Clock,
	Copy,
	Database,
	Download,
	Globe,
	RefreshCw,
	Search,
	Terminal,
	Trash2,
	Wifi,
	WifiOff,
	X,
} from "lucide-react";
import { clientLogger } from "../../services/logging/clientLogger.js";
import { useOfflineStore } from "../../store/offlineStore.js";
import "./DiagnosticDrawer.css";

type TabKind = "logs" | "network" | "offline" | "system";

export interface DiagnosticDrawerProps {
	readonly organizationId?: string | null;
	readonly userId?: string | null;
	readonly userRole?: string | null;
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly showTriggerButton?: boolean;
}

export const DiagnosticDrawer: React.FC<DiagnosticDrawerProps> = ({
	organizationId,
	userId,
	userRole,
	isOpen: externalIsOpen,
	onClose: externalOnClose,
	showTriggerButton = true,
}) => {
	const [internalIsOpen, setInternalIsOpen] = useState(false);
	const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

	const handleClose = () => {
		if (externalOnClose) {
			externalOnClose();
		} else {
			setInternalIsOpen(false);
		}
	};

	const [activeTab, setActiveTab] = useState<TabKind>("logs");
	const [logs, setLogs] = useState<readonly ClientLogEntry[]>(() => clientLogger.getLogs());
	const [networkLogs, setNetworkLogs] = useState<readonly NetworkLogEntry[]>(() => clientLogger.getNetworkLogs());

	const [logLevelFilter, setLogLevelFilter] = useState<"ALL" | LogLevel>("ALL");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedModule, setSelectedModule] = useState<string>("ALL");
	const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
	const [copiedCorrelationId, setCopiedCorrelationId] = useState<string | null>(null);

	const offlineStore = useOfflineStore();
	const logsContainerRef = useRef<HTMLDivElement>(null);

	// Error count for trigger badge
	const errorCount = useMemo(() => {
		return logs.filter((l) => l.level === "ERROR").length;
	}, [logs]);

	// Live Subscription to ClientLogger
	useEffect(() => {
		const unsubscribeLogs = clientLogger.subscribeLogs(() => {
			setLogs(clientLogger.getLogs());
		});
		const unsubscribeNetwork = clientLogger.subscribeNetwork(() => {
			setNetworkLogs(clientLogger.getNetworkLogs());
		});

		return () => {
			unsubscribeLogs();
			unsubscribeNetwork();
		};
	}, []);

	// Hotkey listener: Ctrl+Shift+D to toggle HUD
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "в" || e.key === "В")) {
				e.preventDefault();
				if (isOpen) {
					handleClose();
				} else {
					setInternalIsOpen(true);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen]);

	// Distinct modules list for filter dropdown
	const availableModules = useMemo(() => {
		const set = new Set<string>();
		for (const log of logs) {
			if (log.module) set.add(log.module);
		}
		return Array.from(set).sort();
	}, [logs]);

	// Filtered logs
	const filteredLogs = useMemo(() => {
		return logs.filter((log) => {
			if (logLevelFilter !== "ALL" && log.level !== logLevelFilter) {
				return false;
			}
			if (selectedModule !== "ALL" && log.module !== selectedModule) {
				return false;
			}
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				const matchesMessage = log.message.toLowerCase().includes(query);
				const matchesModule = log.module.toLowerCase().includes(query);
				const matchesCorrelation = log.correlationId?.toLowerCase().includes(query);
				const matchesData = log.data ? JSON.stringify(log.data).toLowerCase().includes(query) : false;
				if (!matchesMessage && !matchesModule && !matchesCorrelation && !matchesData) {
					return false;
				}
			}
			return true;
		});
	}, [logs, logLevelFilter, selectedModule, searchQuery]);

	// Filtered Network logs
	const filteredNetworkLogs = useMemo(() => {
		if (!searchQuery.trim()) return networkLogs;
		const query = searchQuery.toLowerCase();
		return networkLogs.filter((net) => {
			return (
				net.url.toLowerCase().includes(query) ||
				net.method.toLowerCase().includes(query) ||
				net.correlationId.toLowerCase().includes(query) ||
				String(net.statusCode).includes(query)
			);
		});
	}, [networkLogs, searchQuery]);

	const toggleExpandLog = (id: string) => {
		setExpandedLogIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleCopyCorrelationId = async (id: string) => {
		try {
			await navigator.clipboard.writeText(id);
			setCopiedCorrelationId(id);
			setTimeout(() => setCopiedCorrelationId(null), 2000);
		} catch {
			// Clipboard write fallback
		}
	};

	const handleClearLogs = () => {
		clientLogger.clearLogs();
		setLogs([]);
		setNetworkLogs([]);
		setExpandedLogIds(new Set());
	};

	const handleExportReport = async () => {
		await clientLogger.downloadDiagnosticReport(
			{
				organizationId: organizationId ?? null,
				userId: userId ?? null,
				userRole: userRole ?? null,
			},
			{
				pendingCount: offlineStore.pendingMutationCount,
				failedCount: offlineStore.metrics.failedCount,
				draftsCount: offlineStore.metrics.totalDrafts,
				clockSkewMs: 0,
			},
		);
	};

	return (
		<>
			{showTriggerButton && !isOpen && (
				<button
					type="button"
					className="dente-diagnostic-trigger"
					onClick={() => setInternalIsOpen(true)}
					title="Открыть панель диагностики «Под капотом» (Ctrl+Shift+D)"
					aria-label="Открыть панель диагностики"
				>
					<Terminal size={16} />
					<span>Под капотом</span>
					{errorCount > 0 && <span className="dente-diagnostic-badge">{errorCount}</span>}
				</button>
			)}

			{isOpen && (
				<div className="dente-diagnostic-backdrop" onClick={handleClose}>
					<div
						className="dente-diagnostic-drawer"
						onClick={(e) => e.stopPropagation()}
						role="dialog"
						aria-label="Панель диагностики и логирования"
					>
						{/* Header */}
						<div className="dente-diagnostic-header">
							<div className="dente-diagnostic-title-group">
								<Activity size={20} color="var(--brand-primary, #0284c7)" />
								<h2 className="dente-diagnostic-title">Диагностика и Observability</h2>
								<span className="dente-diagnostic-env-tag">
									{import.meta.env?.MODE || "development"}
								</span>
							</div>
							<button
								type="button"
								className="dente-diagnostic-close-btn"
								onClick={handleClose}
								title="Закрыть (Esc)"
								aria-label="Закрыть панель диагностики"
							>
								<X size={20} />
							</button>
						</div>

						{/* Tabs */}
						<div className="dente-diagnostic-tabs">
							<button
								type="button"
								className={`dente-diagnostic-tab-btn ${activeTab === "logs" ? "active" : ""}`}
								onClick={() => setActiveTab("logs")}
							>
								<Terminal size={15} />
								<span>Консоль логов ({logs.length})</span>
							</button>
							<button
								type="button"
								className={`dente-diagnostic-tab-btn ${activeTab === "network" ? "active" : ""}`}
								onClick={() => setActiveTab("network")}
							>
								<Globe size={15} />
								<span>Сетевые запросы ({networkLogs.length})</span>
							</button>
							<button
								type="button"
								className={`dente-diagnostic-tab-btn ${activeTab === "offline" ? "active" : ""}`}
								onClick={() => setActiveTab("offline")}
							>
								<Database size={15} />
								<span>Офлайн-очередь ({offlineStore.pendingMutationCount})</span>
							</button>
							<button
								type="button"
								className={`dente-diagnostic-tab-btn ${activeTab === "system" ? "active" : ""}`}
								onClick={() => setActiveTab("system")}
							>
								<Activity size={15} />
								<span>Системный отчет</span>
							</button>
						</div>

						{/* Toolbar */}
						{(activeTab === "logs" || activeTab === "network") && (
							<div className="dente-diagnostic-toolbar">
								<div className="dente-diagnostic-search-box">
									<Search size={15} color="var(--muted, #64748b)" />
									<input
										type="text"
										className="dente-diagnostic-search-input"
										placeholder="Поиск по сообщениям, URL или Correlation ID..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
									{searchQuery && (
										<button
											type="button"
											className="dente-diagnostic-close-btn"
											style={{ minWidth: 24, minHeight: 24, padding: 0 }}
											onClick={() => setSearchQuery("")}
										>
											<X size={14} />
										</button>
									)}
								</div>

								{activeTab === "logs" && (
									<div className="dente-diagnostic-filter-group">
										<select
											className="dente-diagnostic-select"
											value={logLevelFilter}
											onChange={(e) => setLogLevelFilter(e.target.value as "ALL" | LogLevel)}
											aria-label="Фильтр уровня логов"
										>
											<option value="ALL">Все уровни</option>
											<option value="DEBUG">DEBUG</option>
											<option value="INFO">INFO</option>
											<option value="WARN">WARN</option>
											<option value="ERROR">ERROR</option>
											<option value="AUDIT">AUDIT</option>
										</select>

										<select
											className="dente-diagnostic-select"
											value={selectedModule}
											onChange={(e) => setSelectedModule(e.target.value)}
											aria-label="Фильтр модуля"
										>
											<option value="ALL">Все модули</option>
											{availableModules.map((mod) => (
												<option key={mod} value={mod}>
													{mod}
												</option>
											))}
										</select>
									</div>
								)}

								<div className="dente-diagnostic-filter-group">
									<button
										type="button"
										className="dente-diagnostic-action-btn"
										onClick={handleClearLogs}
										title="Очистить текущие логи"
									>
										<Trash2 size={14} />
										<span>Очистить</span>
									</button>
									<button
										type="button"
										className="dente-diagnostic-action-btn dente-diagnostic-primary-btn"
										onClick={handleExportReport}
										title="Скачать полный диагностический отчет .json"
									>
										<Download size={14} />
										<span>Экспорт .json</span>
									</button>
								</div>
							</div>
						)}

						{/* Content */}
						<div className="dente-diagnostic-content" ref={logsContainerRef}>
							{/* TAB 1: LOGS */}
							{activeTab === "logs" && (
								<div className="dente-diagnostic-list">
									{filteredLogs.length === 0 ? (
										<div className="dente-diagnostic-empty">
											{searchQuery ? "По вашему запросу логи не найдены" : "Журнал логов пуст"}
										</div>
									) : (
										filteredLogs.map((log) => {
											const isExpanded = expandedLogIds.has(log.id);
											const hasDetails = log.data !== undefined || Boolean(log.stack);
											const levelClass =
												log.level === "DEBUG"
													? "dente-diagnostic-pill-debug"
													: log.level === "INFO"
														? "dente-diagnostic-pill-info"
														: log.level === "WARN"
															? "dente-diagnostic-pill-warn"
															: log.level === "ERROR"
																? "dente-diagnostic-pill-error"
																: "dente-diagnostic-pill-audit";

											return (
												<div
													key={log.id}
													className="dente-diagnostic-card"
													style={{ cursor: hasDetails ? "pointer" : "default" }}
													onClick={() => hasDetails && toggleExpandLog(log.id)}
												>
													<div className="dente-diagnostic-card-header">
														<div className="dente-diagnostic-card-left">
															<span className={`dente-diagnostic-pill ${levelClass}`}>
																{log.level}
															</span>
															<span className="dente-diagnostic-module">{log.module}</span>
															<span className="dente-diagnostic-time">
																{log.timestamp.slice(11, 23)}
															</span>
														</div>
														{log.correlationId && (
															<button
																type="button"
																className="dente-diagnostic-action-btn"
																style={{ minHeight: 28, padding: "2px 8px", fontSize: 11 }}
																onClick={(e) => {
																	e.stopPropagation();
																	handleCopyCorrelationId(log.correlationId!);
																}}
																title="Копировать Correlation ID"
															>
																{copiedCorrelationId === log.correlationId ? (
																	<Check size={12} color="#16a34a" />
																) : (
																	<Copy size={12} />
																)}
																<span>{log.correlationId.slice(0, 16)}…</span>
															</button>
														)}
													</div>

													<div className="dente-diagnostic-message">{log.message}</div>

													{isExpanded && hasDetails && (
														<div
															className="dente-diagnostic-code-block"
															onClick={(e) => e.stopPropagation()}
														>
															{log.stack && (
																<div style={{ color: "#f87171", marginBottom: 8 }}>
																	{log.stack}
																</div>
															)}
															{log.data !== undefined && (
																<div>{JSON.stringify(log.data, null, 2)}</div>
															)}
														</div>
													)}
												</div>
											);
										})
									)}
								</div>
							)}

							{/* TAB 2: NETWORK */}
							{activeTab === "network" && (
								<div className="dente-diagnostic-list">
									{filteredNetworkLogs.length === 0 ? (
										<div className="dente-diagnostic-empty">
											{searchQuery
												? "Сетевые запросы по фильтру не найдены"
												: "Сетевые запросы пока не зафиксированы"}
										</div>
									) : (
										filteredNetworkLogs.map((net) => {
											const isExpanded = expandedLogIds.has(net.id);
											const hasDetails =
												Boolean(net.requestBodyPreview) ||
												Boolean(net.responsePreview) ||
												Boolean(net.error);
											const statusClass =
												net.statusCode && net.statusCode >= 200 && net.statusCode < 300
													? "dente-diagnostic-pill-status-ok"
													: net.statusCode && net.statusCode >= 400 && net.statusCode < 500
														? "dente-diagnostic-pill-status-warn"
														: "dente-diagnostic-pill-status-err";

											return (
												<div
													key={net.id}
													className="dente-diagnostic-card"
													style={{ cursor: hasDetails ? "pointer" : "default" }}
													onClick={() => hasDetails && toggleExpandLog(net.id)}
												>
													<div className="dente-diagnostic-card-header">
														<div className="dente-diagnostic-card-left">
															<span
																className="dente-diagnostic-pill"
																style={{ background: "#0284c7", color: "#fff" }}
															>
																{net.method}
															</span>
															<span className={`dente-diagnostic-pill ${statusClass}`}>
																{net.statusCode || "ERR"}
															</span>
															{net.latencyMs !== undefined && (
																<span className="dente-diagnostic-time">
																	<Clock size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
																	{net.latencyMs}ms
																</span>
															)}
															<span className="dente-diagnostic-time">
																{net.timestamp.slice(11, 23)}
															</span>
														</div>
														<button
															type="button"
															className="dente-diagnostic-action-btn"
															style={{ minHeight: 28, padding: "2px 8px", fontSize: 11 }}
															onClick={(e) => {
																e.stopPropagation();
																handleCopyCorrelationId(net.correlationId);
															}}
															title="Копировать Correlation ID"
														>
															{copiedCorrelationId === net.correlationId ? (
																<Check size={12} color="#16a34a" />
															) : (
																<Copy size={12} />
															)}
															<span>{net.correlationId.slice(0, 16)}…</span>
														</button>
													</div>

													<div
														className="dente-diagnostic-message"
														style={{ fontFamily: "monospace", fontSize: 12 }}
													>
														{net.url}
													</div>

													{isExpanded && hasDetails && (
														<div
															className="dente-diagnostic-code-block"
															onClick={(e) => e.stopPropagation()}
														>
															{net.error && (
																<div style={{ color: "#f87171", marginBottom: 6 }}>
																	Ошибка: {net.error}
																</div>
															)}
															{net.requestBodyPreview && (
																<div>
																	<span style={{ color: "#94a3b8" }}>Request Payload: </span>
																	{net.requestBodyPreview}
																</div>
															)}
														</div>
													)}
												</div>
											);
										})
									)}
								</div>
							)}

							{/* TAB 3: OFFLINE QUEUE */}
							{activeTab === "offline" && (
								<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
									<div className="dente-diagnostic-grid">
										<div className="dente-diagnostic-metric-card">
											<span className="dente-diagnostic-metric-label">Статус сети</span>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 8,
													marginTop: 4,
												}}
											>
												{offlineStore.networkState.isOnline ? (
													<>
														<Wifi size={18} color="#16a34a" />
														<span
															className="dente-diagnostic-metric-value"
															style={{ color: "#16a34a" }}
														>
															Online
														</span>
													</>
												) : (
													<>
														<WifiOff size={18} color="#dc2626" />
														<span
															className="dente-diagnostic-metric-value"
															style={{ color: "#dc2626" }}
														>
															Offline
														</span>
													</>
												)}
											</div>
										</div>

										<div className="dente-diagnostic-metric-card">
											<span className="dente-diagnostic-metric-label">Очередь Outbox</span>
											<span className="dente-diagnostic-metric-value">
												{offlineStore.pendingMutationCount}
											</span>
										</div>

										<div className="dente-diagnostic-metric-card">
											<span className="dente-diagnostic-metric-label">Сбои синхронизации</span>
											<span
												className="dente-diagnostic-metric-value"
												style={{
													color:
														offlineStore.metrics.failedCount > 0 ? "#dc2626" : "inherit",
												}}
											>
												{offlineStore.metrics.failedCount}
											</span>
										</div>

										<div className="dente-diagnostic-metric-card">
											<span className="dente-diagnostic-metric-label">Локальные черновики</span>
											<span className="dente-diagnostic-metric-value">
												{offlineStore.metrics.totalDrafts}
											</span>
										</div>
									</div>

									<div style={{ display: "flex", gap: 10 }}>
										<button
											type="button"
											className="dente-diagnostic-action-btn dente-diagnostic-primary-btn"
											disabled={offlineStore.isSyncing}
											onClick={() => offlineStore.syncOutbox()}
										>
											<RefreshCw
												size={15}
												className={offlineStore.isSyncing ? "dente-spin" : ""}
											/>
											<span>
												{offlineStore.isSyncing
													? "Синхронизация..."
													: "Синхронизировать сейчас"}
											</span>
										</button>
										<button
											type="button"
											className="dente-diagnostic-action-btn"
											onClick={() => offlineStore.refreshQueue()}
										>
											<RefreshCw size={15} />
											<span>Обновить статус</span>
										</button>
									</div>

									{offlineStore.pendingMutations.length > 0 && (
										<div>
											<h4 style={{ margin: "12px 0 8px", fontSize: 14 }}>
												Несинхронизированные мутации
											</h4>
											<div className="dente-diagnostic-list">
												{offlineStore.pendingMutations.map((mut) => (
													<div key={mut.mutationId} className="dente-diagnostic-card">
														<div className="dente-diagnostic-card-header">
															<div className="dente-diagnostic-card-left">
																<span className="dente-diagnostic-pill dente-diagnostic-pill-info">
																	{mut.action}
																</span>
																<span className="dente-diagnostic-module">
																	{mut.entityType}
																</span>
																<span className="dente-diagnostic-time">
																	{mut.timestamp.slice(11, 23)}
																</span>
															</div>
															<span style={{ fontSize: 11, color: "var(--muted, #64748b)" }}>
																ID: {mut.entityId.slice(0, 12)}…
															</span>
														</div>
														<div
															className="dente-diagnostic-code-block"
															style={{ maxHeight: 100 }}
														>
															{JSON.stringify(mut.payload, null, 2)}
														</div>
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							)}

							{/* TAB 4: SYSTEM REPORT */}
							{activeTab === "system" && (
								<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
									<div className="dente-diagnostic-grid">
										<div className="dente-diagnostic-metric-card">
											<span className="dente-diagnostic-metric-label">Приложение</span>
											<span className="dente-diagnostic-metric-value">DENTE CRM v0.1.0</span>
										</div>

										<div className="dente-diagnostic-metric-card">
											<span className="dente-diagnostic-metric-label">Окружение</span>
											<span className="dente-diagnostic-metric-value">
												{import.meta.env?.MODE || "development"}
											</span>
										</div>

										<div className="dente-diagnostic-metric-card">
											<span className="dente-diagnostic-metric-label">Клиентская сессия</span>
											<span style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
												{userRole ? `Роль: ${userRole}` : "Не авторизован"}
											</span>
											{organizationId && (
												<span style={{ fontSize: 11, color: "var(--muted, #64748b)" }}>
													Org: {organizationId.slice(0, 12)}…
												</span>
											)}
										</div>

										<div className="dente-diagnostic-metric-card">
											<span className="dente-diagnostic-metric-label">Браузер / Экран</span>
											<span style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
												{typeof window !== "undefined"
													? `${window.innerWidth}x${window.innerHeight} (${window.devicePixelRatio}x)`
													: "1440x900"}
											</span>
										</div>
									</div>

									<div
										style={{
											padding: 16,
											borderRadius: 8,
											background: "var(--paper-strong, #ffffff)",
											border: "1px solid var(--glass-border, rgba(0,0,0,0.08))",
											display: "flex",
											flexDirection: "column",
											gap: 12,
										}}
									>
										<h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
											Экспорт диагностического пакета
										</h4>
										<p style={{ margin: 0, fontSize: 13, color: "var(--muted, #64748b)", lineHeight: 1.5 }}>
											Диагностический отчет содержит полную техническую информацию о состоянии системы,
											параметрах браузера, последних 500 событиях консоли и 200 сетевых запросах.
											Все пароли, токены и номера банковских карт автоматически маскируются (152-ФЗ).
										</p>
										<div>
											<button
												type="button"
												className="dente-diagnostic-action-btn dente-diagnostic-primary-btn"
												style={{ minHeight: 48, padding: "0 20px", fontSize: 14, fontWeight: 600 }}
												onClick={handleExportReport}
											>
												<Download size={18} />
												<span>📥 Выгрузить диагностический отчет (.json)</span>
											</button>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default DiagnosticDrawer;
