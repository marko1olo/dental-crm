import { useCallback, useEffect, useMemo, useState } from "react";
import { operatorReadableErrorDetail } from "../../../AppHelpers";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { actionFailureToast, requestFailureCause } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { CHANNELS, SCOPES, cellKey, type Channel, type ConsentMatrix, type ConsentState, type Scope } from "./types";
import { buildMatrix, jsonObjectOrNull, parseConsentRows } from "./consentsApi";

export function useCommunicationConsents(patientId?: string | null) {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [matrix, setMatrix] = useState<ConsentMatrix>({});
	const [baseline, setBaseline] = useState<ConsentMatrix>({});
	const [loaded, setLoaded] = useState(false);

	const dirty = useMemo(() => {
		const keys = new Set([...Object.keys(matrix), ...Object.keys(baseline)]);
		for (const k of keys) {
			if ((matrix[k] ?? "revoked") !== (baseline[k] ?? "revoked")) return true;
		}
		return false;
	}, [matrix, baseline]);

	const load = useCallback(async () => {
		const pid = (patientId ?? "").trim();
		if (!pid) { setMatrix({}); setBaseline({}); setLoaded(false); setError(null); return; }
		setLoading(true); setError(null);
		try {
			const headers = auth && typeof auth.denteClinicalReadHeaders === "function" ? auth.denteClinicalReadHeaders() : {};
			const res = await fetch(`/api/communications/consents/${encodeURIComponent(pid)}`, { method: "GET", headers });
			const raw = await res.text();
			const json = jsonObjectOrNull(raw);
			if (!res.ok) {
				logger.error(`[comm-consents] GET ${res.status} ${raw.slice(0, 300)}`);
				const detail = operatorReadableErrorDetail(typeof json?.message === "string" ? json.message : null);
				setError(detail ?? (res.status === 404 ? "Пациент не найден — обновите карточку." : actionFailureToast("Согласия на связь не загружены", res.status)));
				setLoaded(false); return;
			}
			const defaultsRaw = json?.defaults as any;
			const defaults = {
				service: defaultsRaw?.service === "revoked" ? ("revoked" as const) : ("granted" as const),
				marketing: defaultsRaw?.marketing === "granted" ? ("granted" as const) : ("revoked" as const),
			};
			const next = buildMatrix(parseConsentRows(json?.consents), defaults);
			setMatrix(next); setBaseline({ ...next }); setLoaded(true);
		} catch (e) {
			showToast(actionFailureToast("Ошибка выполнения операции", (e as any)?.status ?? null), "error");
			logger.error("[comm-consents] load failed", e);
			setError(`Согласия не загружены: ${requestFailureCause(null)}.`); setLoaded(false);
		} finally { setLoading(false); }
	}, [auth, patientId]);

	useEffect(() => { void load(); }, [load]);

	const toggle = useCallback((channel: Channel, scope: Scope) => {
		const k = cellKey(channel, scope);
		setMatrix((prev) => ({ ...prev, [k]: (prev[k] ?? "revoked") === "granted" ? "revoked" : "granted" }));
	}, []);

	const save = useCallback(async () => {
		const pid = (patientId ?? "").trim();
		if (!pid) { showToast("Сначала выберите пациента.", "error", 8000); return; }
		if (!loaded) { showToast("Согласия загружаются, подождите завершения загрузки.", "info", 3000); return; }
		const entries: Array<{ channel: Channel; scope: Scope; state: ConsentState; source: string }> = [];
		for (const ch of CHANNELS) {
			for (const sc of SCOPES) {
				const state = matrix[cellKey(ch.value, sc.value)] ?? "revoked";
				const base = baseline[cellKey(ch.value, sc.value)] ?? "revoked";
				if (state !== base || state === "granted" || sc.value === "marketing") {
					entries.push({ channel: ch.value, scope: sc.value, state, source: "staff" });
				}
			}
		}
		if (entries.length === 0) {
			for (const ch of CHANNELS) for (const sc of SCOPES) {
				entries.push({ channel: ch.value, scope: sc.value, state: matrix[cellKey(ch.value, sc.value)] ?? "revoked", source: "staff" });
			}
		}
		setSaving(true); setError(null);
		try {
			const headers = auth && typeof auth.denteClinicalMutationHeaders === "function" ? auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" };
			const res = await fetch(`/api/communications/consents/${encodeURIComponent(pid)}`, { method: "PUT", headers, body: JSON.stringify({ entries }) });
			const raw = await res.text();
			const json = jsonObjectOrNull(raw);
			if (!res.ok) {
				logger.error(`[comm-consents] PUT ${res.status} ${raw.slice(0, 300)}`);
				const detail = operatorReadableErrorDetail(typeof json?.message === "string" ? json.message : null);
				const msg = detail ?? (res.status === 400 ? "Согласия не сохранены: проверьте каналы и статусы." : res.status === 404 ? "Пациент не найден в клинике." : actionFailureToast("Согласия на связь не сохранены", res.status));
				setError(msg); showToast(msg, "error", 12000); return;
			}
			setBaseline({ ...matrix }); showToast("Согласия на связь сохранены.", "success", 7000); void load();
		} catch (e) {
			logger.error("[comm-consents] save failed", e);
			const msg = `Согласия не сохранены: ${requestFailureCause(null)}.`; setError(msg); showToast(msg, "error", 12000);
		} finally { setSaving(false); }
	}, [auth, baseline, load, matrix, loaded, patientId]);

	return { loading, saving, error, matrix, loaded, dirty, load, save, toggle };
}
