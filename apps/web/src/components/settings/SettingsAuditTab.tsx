import {
	Database,
	History,
	Search,
	ShieldCheck,
	SlidersHorizontal,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import type { AuditEvent } from "@dental/shared";

function formatTime(isoString: string | null | undefined): string {
	if (!isoString) return "Н/Д";
	return new Date(isoString).toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatDateTime(isoString: string | null | undefined): string {
	if (!isoString) return "Н/Д";
	return new Date(isoString).toLocaleString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function SettingsAuditTab() {
	const {
		browserContinuityState,
		browserContinuityChecks,
		requestBrowserStoragePersistence,
		browserCanRequestPersistentStorage,
		localBridgeStatusState,
		localBridgeReadiness,
		localBridgeUsePlans,
		persistenceHealth,
		downloadPersistenceExport,
		isPersistenceExporting,
		auditEvents,
		dashboard,
	} = useAppLogicContext();

	const typedImportBatches = (dashboard?.importBatches || []) as any[];

	const [auditSearch, setAuditSearch] = useState("");

	const filteredAuditEvents = useMemo(() => {
		let filtered = (auditEvents || []) as AuditEvent[];
		if (auditSearch.trim().length > 0) {
			const q = auditSearch.toLowerCase();
			filtered = filtered.filter(
				(e) =>
					e.action.toLowerCase().includes(q) ||
					e.entityId.toLowerCase().includes(q) ||
					e.reason?.toLowerCase().includes(q)
			);
		}
		return filtered.sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
	}, [auditEvents, auditSearch]);

	const typedBrowserContinuityChecks = browserContinuityChecks as any[];
	const browserContinuityValue =
		browserContinuityState === "safe"
			? "Защищено"
			: browserContinuityState === "warning"
				? "Внимание"
				: "Уязвимо";

	const typedLocalBridgeReadiness = localBridgeReadiness as any;
	const localBridgeStatusValue =
		localBridgeStatusState === "ready"
			? "Готово"
			: localBridgeStatusState === "degraded"
				? "Ограничено"
				: "Отключено";
	const typedLocalBridgeUsePlans = localBridgeUsePlans as any;

	const typedPersistenceIntegrity = persistenceHealth as any;

	return (
		<section className="settings-panel animate-fade-in settings-audit-tab" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
			<div className="panel continuity-panel">
				<div className="panel-heading">
					<h2>Сохранность данных в браузере</h2>
					<span className={`status-pill status-${browserContinuityState}`}>
						{browserContinuityValue}
					</span>
				</div>
				<div className="ops-list">
					<article className="ops-row">
						<ShieldCheck aria-hidden="true" />
						<div>
							<h3>Гарантия сохранности хранилища</h3>
							<p>
								{browserCanRequestPersistentStorage
									? "Доступен запрос Persistent Storage API"
									: "Недоступно в этом браузере / протоколе"}
							</p>
						</div>
						<button
							className="text-button"
							type="button"
							onClick={requestBrowserStoragePersistence}
							disabled={!browserCanRequestPersistentStorage}
						>
							Запросить квоту
						</button>
					</article>
					<div className="browser-continuity-grid">
						{(typedBrowserContinuityChecks || []).map((check: any) => (
							<article key={check.label} className="ops-row">
								<ShieldCheck aria-hidden="true" />
								<div>
									<h3>{check.label}</h3>
									<p>{check.warnings?.join(", ") || "В норме"}</p>
								</div>
								<span>{formatTime(check.checkedAt)}</span>
							</article>
						))}
					</div>
				</div>
			</div>

			<div className="panel bridge-panel">
				<div className="panel-heading">
					<h2>Модули рабочей станции</h2>
					<span className={`status-pill status-${localBridgeStatusState}`}>
						{localBridgeStatusValue}
					</span>
				</div>
				<div className="ops-list">
					<div className="local-bridge-grid">
						{(typedLocalBridgeReadiness?.bridges || []).map((bridge: any) => (
							<article key={bridge.kind} className="ops-row">
								<SlidersHorizontal aria-hidden="true" />
								<div>
									<h3>{bridge.localBridgeEndpointSummary}</h3>
									<p>Граница: {bridge.privacyBoundary} | Задержка: {bridge.latencyMs}мс</p>
								</div>
								<span>{bridge.warning ? "Внимание" : "Норма"}</span>
							</article>
						))}
					</div>
					{typedLocalBridgeUsePlans ? (
						<div className="local-bridge-plan-grid">
							{(typedLocalBridgeUsePlans.plans || []).map((plan: any) => (
								<article key={plan.scenario} className="ops-row">
									<SlidersHorizontal aria-hidden="true" />
									<div>
										<h3>Сценарий: {plan.scenario}</h3>
										<p>Блокировка врача: {plan.doctorBlocking ? "Да" : "Нет"}</p>
									</div>
									<span>Надежность: {plan.confidence * 100}%</span>
								</article>
							))}
						</div>
					) : null}
				</div>
			</div>

			<div className="panel database-panel">
				<div className="panel-heading">
					<h2>Резервное копирование и целостность</h2>
					<button
						type="button"
						className="primary-button"
						onClick={() => downloadPersistenceExport()}
						disabled={isPersistenceExporting}
					>
						{isPersistenceExporting ? "Экспорт..." : "Экспорт БД"}
					</button>
				</div>
				<div className="ops-list">
					{typedPersistenceIntegrity ? (
						<>
							<article className="ops-row">
								<History aria-hidden="true" />
								<div>
									<h3>
										{typedPersistenceIntegrity.ok ? "База данных цела" : "База данных повреждена"}
									</h3>
									<p>{typedPersistenceIntegrity.nextAction}</p>
								</div>
								<span>{formatDateTime(typedPersistenceIntegrity.checkedAt)}</span>
							</article>
							<div className="backup-check-grid">
								{(typedPersistenceIntegrity.backups || []).slice(0, 6).map((backup: any) => (
									<span key={backup.fileName} style={{ display: "block", margin: "4px 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
										{backup.readable && backup.checksumVerified !== false ? "✅" : "❌"} {Math.round(backup.sizeBytes / 1024)} КБ — {backup.fileName}
									</span>
								))}
							</div>
						</>
					) : (
						<article className="ops-empty">
							<ShieldCheck aria-hidden="true" />
							<p>Нет информации о резервных копиях.</p>
						</article>
					)}
				</div>
			</div>

			<div className="panel import-history-panel">
				<div className="panel-heading">
					<h2>Пакеты импорта</h2>
					<span className="status-pill status-arrived">
						{(typedImportBatches || []).length}
					</span>
				</div>
				<div className="ops-list">
					{(typedImportBatches || []).length ? (
						(typedImportBatches || []).map((batch: any) => (
							<article className="ops-row" key={batch.id}>
								<Database aria-hidden="true" />
								<div>
									<h3>{batch.sourceName}</h3>
									<p>
										{batch.importedRows} строк | {batch.skippedRows} пропущено | {formatDateTime(batch.createdAt)}
									</p>
								</div>
								<span>{batch.status === "completed" ? "Завершено" : "В процессе"}</span>
							</article>
						))
					) : (
						<article className="ops-empty">
							<Database aria-hidden="true" />
							<p>Система импорта пока не обрабатывала пакеты данных.</p>
						</article>
					)}
				</div>
			</div>

			<div className="panel audit-panel">
				<div className="panel-heading" style={{ flexDirection: "column", alignItems: "flex-start", gap: "1rem" }}>
					<div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
						<h2>Аудит событий</h2>
						<ShieldCheck aria-hidden="true" />
					</div>
					<div className="search-bar" style={{ display: "flex", width: "100%", alignItems: "center", gap: "0.5rem", background: "var(--color-bg-secondary)", padding: "0.5rem 1rem", borderRadius: "0.5rem" }}>
						<Search size={16} style={{ color: "var(--color-text-tertiary)" }} />
						<input
							type="text"
							placeholder="Поиск по действию, причине или ID сущности..."
							value={auditSearch}
							onChange={(e) => setAuditSearch(e.target.value)}
							style={{ flex: 1, border: "none", background: "transparent", outline: "none", color: "var(--color-text-primary)" }}
						/>
					</div>
				</div>
				<div className="ops-list" style={{ maxHeight: "600px", overflowY: "auto" }}>
					{filteredAuditEvents.length > 0 ? (
						filteredAuditEvents.map((event: any) => (
							<article className="ops-row" key={event.id} style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start", padding: "1rem", borderBottom: "1px solid var(--color-border-subtle)" }}>
								<div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
									<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
										<span style={{
											padding: "0.15rem 0.5rem",
											background: (event.action || "").includes("delete") || (event.action || "").includes("remove") ? "var(--color-danger-transparent)" : "var(--color-accent-transparent)",
											color: (event.action || "").includes("delete") || (event.action || "").includes("remove") ? "var(--color-danger)" : "var(--color-accent)",
											borderRadius: "1rem",
											fontSize: "0.75rem",
											fontWeight: 600,
											textTransform: "uppercase",
											letterSpacing: "0.02em"
										}}>
											{event.action}
										</span>
										<span style={{ fontSize: "0.8rem", color: "var(--color-text-tertiary)", fontFamily: "monospace" }}>
											#{event.entityId}
										</span>
									</div>
									<p style={{ margin: "0.5rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.9rem", lineHeight: "1.4" }}>
										{event.reason ?? "Причина не задокументирована системой"}
									</p>
								</div>
								<span style={{ fontSize: "0.85rem", color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
									{formatDateTime(event.createdAt)}
								</span>
							</article>
						))
					) : (
						<div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-tertiary)" }}>
							События не найдены
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
