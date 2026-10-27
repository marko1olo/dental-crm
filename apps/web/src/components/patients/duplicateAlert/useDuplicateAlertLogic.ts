import { useCallback, useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { actionFailureToast } from "../../../lib/panelStateText";
import {
	type DuplicateCandidate,
	dismissDuplicatePair,
	duplicatePairKey,
	fetchDuplicatesForPatient,
	mergeDuplicatePair,
	otherSideOf,
} from "../../../lib/patientDuplicatesApi";
import { showToast } from "../../GlobalToast";

export function useDuplicateAlertLogic(patientId: string) {
	const appLogic = useAppLogicContext();
	const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
	const [notice, setNotice] = useState<string | null>(null);
	const [busyKey, setBusyKey] = useState<string | null>(null);
	const [confirmKey, setConfirmKey] = useState<string | null>(null);

	const auth = appLogic?.auth;
	const patientIdRef = useRef(patientId);
	patientIdRef.current = patientId;

	const load = useCallback(async () => {
		const reqId = patientId;
		try {
			const headers = auth ? auth.denteClinicalReadHeaders() : {};
			const fresh = await fetchDuplicatesForPatient(reqId, headers);
			if (patientIdRef.current !== reqId) return;
			setCandidates(fresh);
		} catch {
			if (patientIdRef.current !== reqId) return;
			setCandidates([]);
		}
	}, [patientId, auth]);

	useEffect(() => {
		void load();
	}, [load]);

	const [prevPatientId, setPrevPatientId] = useState(patientId);
	if (patientId !== prevPatientId) {
		setPrevPatientId(patientId);
		setCandidates([]);
		setNotice(null);
		setConfirmKey(null);
		setBusyKey(null);
	}

	async function merge(candidate: DuplicateCandidate) {
		const key = duplicatePairKey(candidate);
		const keepPatientId = patientId;
		setBusyKey(key);
		try {
			const other = otherSideOf(candidate, keepPatientId);
			const headers = auth ? auth.denteClinicalMutationHeaders() : {};
			const result = await mergeDuplicatePair(
				{ keepPatientId, mergePatientId: other.patientId, reason: "Объединено из карточки пациента" },
				headers,
			);
			if (patientIdRef.current !== keepPatientId) return;
			setNotice(result.summary);
			setConfirmKey(null);
			await load();
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			if (patientIdRef.current !== keepPatientId) return;
			setNotice(error instanceof Error ? error.message : String(error));
		} finally {
			setBusyKey(null);
		}
	}

	async function dismiss(candidate: DuplicateCandidate) {
		const key = duplicatePairKey(candidate);
		const decidedOnPatientId = patientId;
		setBusyKey(key);
		try {
			const headers = auth ? auth.denteClinicalMutationHeaders() : {};
			const result = await dismissDuplicatePair(
				{ leftPatientId: candidate.leftPatientId, rightPatientId: candidate.rightPatientId, reason: "Отмечено из карточки пациента" },
				headers,
			);
			if (patientIdRef.current !== decidedOnPatientId) return;
			setNotice(result.message);
			await load();
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			if (patientIdRef.current !== decidedOnPatientId) return;
			setNotice(error instanceof Error ? error.message : String(error));
		} finally {
			setBusyKey(null);
		}
	}

	return {
		candidates,
		notice,
		busyKey,
		confirmKey,
		setConfirmKey,
		merge,
		dismiss,
	};
}
