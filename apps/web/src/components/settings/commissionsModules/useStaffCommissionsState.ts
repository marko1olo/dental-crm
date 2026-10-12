/**
 * useStaffCommissionsState.ts
 *
 * Хук инкапсуляции сетевых вызовов и черновиков ставок врачей (GET/PUT /api/settings/staff/commissions).
 * Сжимает фасад StaffCommissionsPanel до < 150 строк.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import {
	isDoctorLikeRole,
	parseCommissionInput,
	percentLabel,
	serverMessageOf,
	type CommissionRate,
	type LoadState,
	type SaveState,
	type StaffMemberLite,
} from "./staffCommissionsTypes";

export function useStaffCommissionsState() {
	const appLogic = useOptionalAppLogicContext();
	const authRef = useRef(appLogic?.auth);
	authRef.current = appLogic?.auth;

	const dashboardUnknown = (appLogic as { dashboard?: unknown } | null)?.dashboard;
	const clinicSettings =
		dashboardUnknown &&
		typeof dashboardUnknown === "object" &&
		dashboardUnknown !== null &&
		"clinicSettings" in dashboardUnknown
			? (dashboardUnknown as { clinicSettings?: { staff?: StaffMemberLite[] } }).clinicSettings
			: undefined;
	const staff: StaffMemberLite[] = Array.isArray(clinicSettings?.staff)
		? clinicSettings?.staff
		: [];

	const staffNameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const member of staff) {
			const id = typeof member.id === "string" ? member.id : "";
			if (!id) continue;
			const name = typeof member.fullName === "string" ? member.fullName.trim() : "";
			map.set(id, name.length > 0 ? name : id);
		}
		return map;
	}, [staff]);

	const doctors = useMemo(() => {
		return staff.filter((m) => {
			const role = String(m.role ?? "");
			const active = m.active !== false;
			return active && isDoctorLikeRole(role);
		});
	}, [staff]);

	const [load, setLoad] = useState<LoadState>({ kind: "idle" });
	const [save, setSave] = useState<SaveState>({ kind: "idle" });
	const [editingUserId, setEditingUserId] = useState<string | null>(null);
	const [draft, setDraft] = useState("");
	const [draftMaterialDeduction, setDraftMaterialDeduction] = useState("0");
	const [draftLabDeduction, setDraftLabDeduction] = useState("100");

	const rateByUserId = useMemo(() => {
		const map = new Map<string, CommissionRate>();
		if (load.kind !== "ready") return map;
		for (const rate of load.rates) {
			if (!map.has(rate.userId)) map.set(rate.userId, rate);
		}
		return map;
	}, [load]);

	const loadRates = useCallback(async () => {
		setLoad({ kind: "loading" });
		try {
			const response = await fetch("/api/settings/staff/commissions", {
				method: "GET",
				headers: denteAdminSecretRequestHeaders(
					undefined,
					// biome-ignore lint/suspicious/noExplicitAny: admin session
					(authRef.current as any)?.settingsAdminSecretSession,
				),
			});
			const payload = (await response.json().catch((err) => {
				showToast(
					actionFailureToast(
						"Ошибка ответа сервера",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				return null;
			})) as unknown;

			if (!response.ok) {
				const msg =
					serverMessageOf(payload) ??
					(response.status === 401 || response.status === 403
						? "Нет прав смотреть ставки врачей: войдите как администратор клиники."
						: `Ставки не загружены (ответ ${response.status}).`);
				setLoad({ kind: "failed", message: msg });
				return;
			}
			const body = payload as { commissions?: unknown };
			const list = Array.isArray(body.commissions) ? body.commissions : [];
			const rates: CommissionRate[] = [];
			for (const row of list) {
				if (!row || typeof row !== "object") continue;
				const r = row as Record<string, unknown>;
				const userId = typeof r.userId === "string" ? r.userId : "";
				const commissionPct = String(r.commissionPct ?? "");
				if (!userId || !commissionPct) continue;
				rates.push({
					userId,
					commissionPct,
					materialCostDeductionPct: String(r.materialCostDeductionPct ?? "0"),
					labCostDeductionPct: String(r.labCostDeductionPct ?? "100"),
					effectiveFrom: String(r.effectiveFrom ?? ""),
				});
			}
			setLoad({ kind: "ready", rates });
		} catch {
			setLoad({
				kind: "failed",
				message: "Ставки не загружены: нет связи с программой клиники.",
			});
		}
	}, []);

	useEffect(() => {
		void loadRates();
	}, [loadRates]);

	const beginEdit = (userId: string, currentRate: CommissionRate | null) => {
		setEditingUserId(userId);
		setDraft(currentRate?.commissionPct ?? "");
		setDraftMaterialDeduction(currentRate?.materialCostDeductionPct ?? "0");
		setDraftLabDeduction(currentRate?.labCostDeductionPct ?? "100");
		setSave({ kind: "idle" });
	};

	const cancelEdit = () => {
		setEditingUserId(null);
		setDraft("");
		setDraftMaterialDeduction("0");
		setDraftLabDeduction("100");
		setSave({ kind: "idle" });
	};

	const saveRate = async (userId: string) => {
		const pct = parseCommissionInput(draft);
		const matPct = parseCommissionInput(draftMaterialDeduction);
		const labPct = parseCommissionInput(draftLabDeduction);
		if (pct === null || matPct === null || labPct === null) {
			setSave({
				kind: "failed",
				message:
					"Процент от кассы и доли удержания указываются числами от 0 до 100. Ставка не сохранена.",
			});
			return;
		}
		const name = staffNameById.get(userId) ?? "врача";
		setSave({ kind: "saving", userId });
		try {
			const response = await fetch(`/api/settings/staff/${userId}/commission`, {
				method: "PUT",
				headers: denteAdminSecretRequestHeaders(
					{ "Content-Type": "application/json" },
					authRef.current?.settingsAdminSecretSession,
				),
				body: JSON.stringify({
					commissionPct: pct,
					materialCostDeductionPct: matPct,
					labCostDeductionPct: labPct,
				}),
			});
			const payload = (await response.json().catch((err) => {
				showToast(
					actionFailureToast(
						"Ошибка ответа сервера",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				return null;
			})) as unknown;

			if (!response.ok) {
				const msg =
					serverMessageOf(payload) ??
					actionFailureToast(`Ставка «${name}» не сохранена`, response.status);
				setSave({ kind: "failed", message: msg });
				showToast(msg, "error");
				return;
			}
			showToast(
				`Ставка «${name}»: ${percentLabel(pct)} (материалы ${percentLabel(matPct)}, ЗТЛ ${percentLabel(labPct)})`,
				"success",
			);
			setEditingUserId(null);
			setDraft("");
			setSave({ kind: "idle" });
			await loadRates();
		} catch {
			const msg = actionFailureToast(`Ставка «${name}» не сохранена`, null);
			setSave({ kind: "failed", message: msg });
			showToast(msg, "error");
		}
	};

	const rows = useMemo(() => {
		const seen = new Set<string>();
		const result: Array<{ userId: string; name: string; rate: CommissionRate | null }> = [];
		for (const d of doctors) {
			const id = typeof d.id === "string" ? d.id : "";
			if (!id || seen.has(id)) continue;
			seen.add(id);
			result.push({
				userId: id,
				name: staffNameById.get(id) ?? id,
				rate: rateByUserId.get(id) ?? null,
			});
		}
		if (load.kind === "ready") {
			for (const rate of load.rates) {
				if (seen.has(rate.userId)) continue;
				seen.add(rate.userId);
				result.push({
					userId: rate.userId,
					name: staffNameById.get(rate.userId) ?? rate.userId,
					rate,
				});
			}
		}
		result.sort((a, b) => a.name.localeCompare(b.name, "ru"));
		return result;
	}, [doctors, load, rateByUserId, staffNameById]);

	const withoutRate = rows.filter((r) => r.rate === null).length;

	return {
		doctors,
		rows,
		withoutRate,
		load,
		save,
		editingUserId,
		draft,
		draftMaterialDeduction,
		draftLabDeduction,
		setDraft,
		setDraftMaterialDeduction,
		setDraftLabDeduction,
		loadRates,
		beginEdit,
		cancelEdit,
		saveRate,
	};
}
