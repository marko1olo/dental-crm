/**
 * useLauncherPatientDebt — честный резолв пациента и его долга для deep-link лаунчеров.
 *
 * Состояния:
 *  - "missing": в ссылке нет patientId — показываем гид, а не вымышленного пациента;
 *  - "loading": реальные данные идут из базы;
 *  - "notfound": пациента с таким id в базе нет;
 *  - "nodebt": пациент есть, неоплаченных счетов нет;
 *  - "ready": карточка, долг и семейный счёт получены из PostgreSQL.
 */

import { useEffect, useState } from "react";
import {
	type LauncherFamilyGroup,
	type LauncherPatient,
	fetchLauncherFamilyGroup,
	fetchLauncherOutstandingDebtRub,
	fetchLauncherPatient,
} from "./launcherFinanceApi";

export type LauncherPatientDebtState =
	| "loading"
	| "missing"
	| "notfound"
	| "nodebt"
	| "ready";

export interface LauncherPatientDebt {
	state: LauncherPatientDebtState;
	patient: LauncherPatient | null;
	debtRub: number;
	family: LauncherFamilyGroup | null;
}

/** patientId из ?patientId= в search или в hash (#/...?patientId=). */
export function readPatientIdFromUrl(): string | null {
	if (typeof window === "undefined") return null;
	const search = new URLSearchParams(window.location.search || "");
	const fromSearch = search.get("patientId");
	if (fromSearch) return fromSearch;
	const match = /[?&]patientId=([^&]+)/.exec(window.location.hash || "");
	const captured = match?.[1];
	return captured ? decodeURIComponent(captured) : null;
}

/**
 * Честное имя пациента по ?patientId=: null — ещё грузится, "" — пациента нет.
 * Общий для всех standalone-лаунчеров (касса, планы, гигиена, пародонтология).
 */
export function useLauncherPatientName(patientId: string | null): string | null {
	const [patientName, setPatientName] = useState<string | null>(patientId ? null : "");
	useEffect(() => {
		if (!patientId) return;
		let cancelled = false;
		void fetchLauncherPatient(patientId).then((patient) => {
			if (!cancelled) setPatientName(patient?.fullName || "Пациент");
		});
		return () => {
			cancelled = true;
		};
	}, [patientId]);
	return patientName;
}

export function useLauncherPatientDebt(rawPatientId: string | null): LauncherPatientDebt {
	const [state, setState] = useState<LauncherPatientDebtState>(
		rawPatientId ? "loading" : "missing",
	);
	const [patient, setPatient] = useState<LauncherPatient | null>(null);
	const [debtRub, setDebtRub] = useState(0);
	const [family, setFamily] = useState<LauncherFamilyGroup | null>(null);

	useEffect(() => {
		if (!rawPatientId) {
			setState("missing");
			setPatient(null);
			setDebtRub(0);
			setFamily(null);
			return;
		}
		let cancelled = false;
		setState("loading");
		void (async () => {
			const resolvedPatient = await fetchLauncherPatient(rawPatientId);
			if (cancelled) return;
			if (!resolvedPatient) {
				setState("notfound");
				return;
			}
			const [debt, familyGroup] = await Promise.all([
				fetchLauncherOutstandingDebtRub(rawPatientId),
				fetchLauncherFamilyGroup(rawPatientId),
			]);
			if (cancelled) return;
			setPatient(resolvedPatient);
			setDebtRub(debt);
			setFamily(familyGroup);
			setState(debt > 0 ? "ready" : "nodebt");
		})();
		return () => {
			cancelled = true;
		};
	}, [rawPatientId]);

	return { state, patient, debtRub, family };
}
