import { useCallback, useEffect, useRef, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { actionFailureToast } from "../../../lib/panelStateText";
import {
	type DuplicateCandidate,
	type DuplicateReport,
	dismissDuplicatePair,
	duplicatePairKey,
	fetchDuplicateReport,
	fetchDuplicatesForPatient,
	mergeDuplicatePair,
} from "../../../lib/patientDuplicatesApi";
import { showToast } from "../../GlobalToast";
import type { DuplicateConfirmState } from "./types";

function extractHttpStatus(err: unknown): number | null {
	if (err && typeof err === "object" && "status" in err && typeof err.status === "number") {
		return err.status;
	}
	return null;
}

export function usePatientDuplicates(patientId?: string | undefined) {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const [report, setReport] = useState<DuplicateReport | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [busyPair, setBusyPair] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [confirming, setConfirming] = useState<DuplicateConfirmState | null>(null);
	const mergeKeysRef = useRef(new Map<string, string>());
	const dismissKeysRef = useRef(new Map<string, string>());

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const headers = auth ? auth.denteClinicalReadHeaders() : {};
			if (patientId) {
				const candidates = await fetchDuplicatesForPatient(patientId, headers);
				setReport({
					candidates,
					examinedPatients: candidates.length,
					dismissedPairs: 0,
					note: "Показаны вероятные дубли для открытой карточки пациента.",
				});
			} else {
				setReport(await fetchDuplicateReport(headers));
			}
		} catch (loadError) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					extractHttpStatus(loadError),
				),
				"error",
			);
			setReport(null);
			setError(loadError instanceof Error ? loadError.message : String(loadError));
		} finally {
			setLoading(false);
		}
	}, [auth, patientId]);

	useEffect(() => {
		void load();
	}, [load]);

	const merge = async (candidate: DuplicateCandidate, keepLeft: boolean) => {
		const key = duplicatePairKey(candidate);
		const actionKey = `${key}:${keepLeft ? "left" : "right"}`;
		const idempotencyKey = mergeKeysRef.current.get(actionKey) ?? generateUuidV7();
		mergeKeysRef.current.set(actionKey, idempotencyKey);
		setBusyPair(key);
		setNotice(null);
		try {
			const data = await mergeDuplicatePair(
				{
					keepPatientId: keepLeft ? candidate.leftPatientId : candidate.rightPatientId,
					mergePatientId: keepLeft ? candidate.rightPatientId : candidate.leftPatientId,
					reason: "Объединено в разборе дублей",
					idempotencyKey,
				},
				auth ? auth.denteClinicalMutationHeaders() : {},
			);
			mergeKeysRef.current.delete(actionKey);
			setNotice(data.summary);
			setConfirming(null);
			await load();
		} catch (mergeError) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					extractHttpStatus(mergeError),
				),
				"error",
			);
			setNotice(mergeError instanceof Error ? mergeError.message : String(mergeError));
		} finally {
			setBusyPair(null);
		}
	};

	const dismiss = async (candidate: DuplicateCandidate) => {
		const key = duplicatePairKey(candidate);
		const idempotencyKey = dismissKeysRef.current.get(key) ?? generateUuidV7();
		dismissKeysRef.current.set(key, idempotencyKey);
		setBusyPair(key);
		setNotice(null);
		try {
			const data = await dismissDuplicatePair(
				{
					leftPatientId: candidate.leftPatientId,
					rightPatientId: candidate.rightPatientId,
					reason: "Отмечено в разборе дублей",
					idempotencyKey,
				},
				auth ? auth.denteClinicalMutationHeaders() : {},
			);
			dismissKeysRef.current.delete(key);
			setNotice(data.message);
			await load();
		} catch (dismissError) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					extractHttpStatus(dismissError),
				),
				"error",
			);
			setNotice(dismissError instanceof Error ? dismissError.message : String(dismissError));
		} finally {
			setBusyPair(null);
		}
	};

	return {
		report,
		error,
		loading,
		busyPair,
		notice,
		confirming,
		setConfirming,
		merge,
		dismiss,
	};
}
