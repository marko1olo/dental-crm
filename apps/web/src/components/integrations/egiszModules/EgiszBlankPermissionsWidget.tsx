import { AlertTriangle, FileText, History, Info, RefreshCcw, ShieldCheck, ShieldOff } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { auth } from "../../../AppConstants";
import { showToast } from "../../GlobalToast";
import { classifyFailedHttpStatus, type EgiszEndpointOutcome, resolveEgiszCatalogState } from "../egiszAvailability";
import { EgiszAuditLogDrawer } from "./EgiszAuditLogDrawer";
import { EgiszRolePermissionsTable } from "./EgiszRolePermissionsTable";
import { EgiszSyncStatusBadge } from "./EgiszSyncStatusBadge";
import { cleanBlankLabel, type EgiszPermissionItem, readBlankPermissions, TONE_STYLES } from "./egiszWidgetTypes";

export const EgiszBlankPermissionsWidget: React.FC = () => {
	const [outcome, setOutcome] = useState<EgiszEndpointOutcome<readonly EgiszPermissionItem[]> | null>(null);
	const [updatingId, setUpdatingId] = useState<string | null>(null);
	const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);

	const load = useCallback(async (signal?: AbortSignal) => {
		setOutcome(null);
		const timeoutSignal = AbortSignal.timeout(8000);
		const effectiveSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

		try {
			const res = await fetch("/api/integrations/egisz-blank-permissions", {
				headers: auth.denteClinicalReadHeaders(),
				signal: effectiveSignal,
			});
			if (!res.ok) {
				setOutcome(classifyFailedHttpStatus(res.status));
				return;
			}
			setOutcome(readBlankPermissions(await res.json()));
		} catch {
			if (signal?.aborted) return;
			setOutcome({ kind: "network" });
		}
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		void load(controller.signal);
		return () => controller.abort();
	}, [load]);

	const togglePermission = useCallback(
		async (item: EgiszPermissionItem, patch: { isExportAllowed?: boolean; patientOptOutRespect?: boolean }) => {
			if (updatingId === item.id) return;
			setUpdatingId(item.id);
			try {
				const res = await fetch(`/api/integrations/egisz-blank-permissions/${encodeURIComponent(item.id)}`, {
					method: "PATCH",
					headers: { ...auth.denteClinicalReadHeaders(), "Content-Type": "application/json" },
					body: JSON.stringify(patch),
				});
				if (!res.ok) {
					showToast("Не удалось сохранить правило выгрузки бланка ЕГИСЗ", "error");
					return;
				}
				const updated = (await res.json()) as EgiszPermissionItem;
				const cleaned = cleanBlankLabel(updated.formCode ?? item.formCode, updated.fieldName ?? item.fieldName);
				setOutcome((prev) => {
					if (!prev || prev.kind !== "ok") return prev;
					return {
						kind: "ok",
						data: prev.data.map((r) =>
							r.id === item.id ? { ...r, ...updated, formCode: cleaned.title, fieldName: cleaned.subtitle } : r,
						),
					};
				});
				showToast(`Правило для «${item.formCode}» сохранено в базе данных`, "success");
			} catch {
				showToast("Сетевая ошибка при сохранении правила ЕГИСЗ", "error");
			} finally {
				setUpdatingId(null);
			}
		},
		[updatingId],
	);

	const state = resolveEgiszCatalogState(outcome);
	const tone = TONE_STYLES[state.tone];
	const rows = outcome && outcome.kind === "ok" ? outcome.data : [];
	const isLoading = state.kind === "loading";

	const StateIcon = state.kind === "ready" ? ShieldCheck : state.kind === "unavailable" ? ShieldOff : state.tone === "danger" || state.tone === "warning" ? AlertTriangle : isLoading ? RefreshCcw : Info;

	return (
		<div
			data-testid="egisz-blank-permissions-widget"
			data-egisz-catalog-state={state.kind}
			className="rounded-xl p-4 border"
			style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
		>
			{/* Верхний заголовок и панель действий */}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<FileText size={18} style={{ color: "var(--teal, #0d9488)", flexShrink: 0 }} aria-hidden="true" />
					<h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
						Права доступа к бланкам РЭМД ЕГИСЗ
					</h3>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
					<EgiszSyncStatusBadge statusKind={state.kind === "ready" ? "ready" : "not_configured"} />
					<button
						type="button"
						onClick={() => setIsAuditDrawerOpen(true)}
						style={{ height: 32, padding: "0 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--paper-soft)", color: "var(--ink)", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
						title="Открыть журнал аудита и квитанций ЕГИСЗ"
					>
						<History size={13} aria-hidden="true" />
						Журнал выгрузки
					</button>
					{state.canRetryLoad && (
						<button
							type="button"
							onClick={() => {
								if (isLoading) {
									showToast("Проверка прав доступа уже выполняется…", "info");
									return;
								}
								void load();
							}}
							aria-busy={isLoading}
							style={{ height: 32, padding: "0 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--paper-soft)", color: "var(--ink)", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
						>
							<RefreshCcw size={12} className={isLoading ? "animate-spin" : ""} aria-hidden="true" />
							Проверить
						</button>
					)}
				</div>
			</div>

			{/* Состояние справочника */}
			<div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
				<StateIcon size={17} className={`shrink-0 mt-0.5 ${tone.icon} ${isLoading ? "animate-spin" : ""}`} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
				<div style={{ minWidth: 0 }}>
					<p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{state.headline}</p>
					<p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--muted)" }}>{state.detail}</p>
				</div>
			</div>

			{/* Таблица прав выгрузки бланков */}
			<EgiszRolePermissionsTable items={rows} updatingId={updatingId} onTogglePermission={togglePermission} />

			{/* Шторка аудита квитанций ЕГИСЗ */}
			<EgiszAuditLogDrawer isOpen={isAuditDrawerOpen} onClose={() => setIsAuditDrawerOpen(false)} />
		</div>
	);
};
