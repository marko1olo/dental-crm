/**
 * useRecallListState.ts
 * Hook for loading, inviting and filtering candidates in RecallListPanel.
 * Governed by Mandate 8b (Strict <= 120 lines).
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import type { RecallBand, RecallCandidate, RecallReport } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { sliceDomList } from "../../../utils/domVirtualizationHelper";
import { invitationText } from "./recallListUtils";

export function useRecallListState(auth: any, clinicName: string) {
	const [report, setReport] = useState<RecallReport | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [busyPatient, setBusyPatient] = useState<string | null>(null);
	const [called, setCalled] = useState<Set<string>>(new Set());
	const [activeBand, setActiveBand] = useState<RecallBand | null>(null);
	const [displayLimit, setDisplayLimit] = useState<number>(40);

	const load = useCallback(async () => {
		setError(null);
		try {
			const res = await fetch("/api/patients/recall-candidates", {
				headers: auth && typeof auth.denteClinicalReadHeaders === "function" ? auth.denteClinicalReadHeaders() : {},
			});
			const payload = (await res.json()) as RecallReport & { message?: string };
			if (!res.ok) throw new Error(payload.message ?? `Сервер ответил ${res.status}`);
			setReport(payload);
		} catch (err) {
			setReport(null);
			setError(err instanceof Error ? err.message : "Не удалось загрузить список пациентов на контрольный осмотр.");
		}
	}, [auth]);

	useEffect(() => { void load(); }, [load]);

	const invite = useCallback(async (candidate: RecallCandidate) => {
		setBusyPatient(candidate.patientId);
		setNotice(null);
		try {
			const res = await fetch("/api/patients/recall-candidates/invite", {
				method: "POST",
				headers: { ...(auth && typeof auth.denteClinicalMutationHeaders === "function" ? auth.denteClinicalMutationHeaders() : {}), "content-type": "application/json" },
				body: JSON.stringify({ patientId: candidate.patientId, channel: "sms", body: invitationText(candidate, clinicName) }),
			});
			const payload = (await res.json()) as { message?: string };
			setNotice(payload.message ?? (res.ok ? "Приглашение поставлено в очередь." : `Сервер ответил ${res.status}`));
		} catch (err) {
			showToast(actionFailureToast("Ошибка выполнения операции", (err as { status?: number })?.status ?? null), "error");
			setNotice(err instanceof Error ? err.message : String(err));
		} finally { setBusyPatient(null); }
	}, [auth, clinicName]);

	const markCalled = useCallback((id: string) => { setCalled((prev) => new Set(prev).add(id)); }, []);

	const filteredCandidates = useMemo(() => {
		return (report?.candidates ?? []).filter((c) => activeBand === null || c.band === activeBand);
	}, [report?.candidates, activeBand]);

	const candidateSlice = useMemo(() => sliceDomList(filteredCandidates, displayLimit, 0), [filteredCandidates, displayLimit]);

	return { report, error, notice, busyPatient, called, activeBand, setActiveBand, setDisplayLimit, invite, markCalled, candidateSlice };
}
