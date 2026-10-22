import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { actionFailureToast } from "../../../lib/panelStateText";
import {
	type DuplicateCandidate,
	type DuplicateReport,
	dismissDuplicatePair,
	duplicatePairKey,
	fetchDuplicateReport,
	mergeDuplicatePair,
} from "../../../lib/patientDuplicatesApi";
import { showToast } from "../../GlobalToast";
import type { DuplicateConfirmState } from "./types";

export function usePatientDuplicates() {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const [report, setReport] = useState<DuplicateReport | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [busyPair, setBusyPair] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [confirming, setConfirming] = useState<DuplicateConfirmState | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			setReport(await fetchDuplicateReport(auth ? auth.denteClinicalReadHeaders() : {}));
		} catch (loadError) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(loadError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setReport(null);
			setError(loadError instanceof Error ? loadError.message : String(loadError));
		} finally {
			setLoading(false);
		}
	}, [auth]);

	useEffect(() => {
		void load();
	}, [load]);

	const merge = async (candidate: DuplicateCandidate, keepLeft: boolean) => {
		const key = duplicatePairKey(candidate);
		setBusyPair(key);
		setNotice(null);
		try {
			const data = await mergeDuplicatePair(
				{
					keepPatientId: keepLeft ? candidate.leftPatientId : candidate.rightPatientId,
					mergePatientId: keepLeft ? candidate.rightPatientId : candidate.leftPatientId,
					reason: "Объединено в разборе дублей",
				},
				auth ? auth.denteClinicalMutationHeaders() : {},
			);
			setNotice(data.summary);
			setConfirming(null);
			await load();
		} catch (mergeError) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(mergeError as { status?: number })?.status ?? null,
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
		setBusyPair(key);
		setNotice(null);
		try {
			const data = await dismissDuplicatePair(
				{
					leftPatientId: candidate.leftPatientId,
					rightPatientId: candidate.rightPatientId,
					reason: "Отмечено в разборе дублей",
				},
				auth ? auth.denteClinicalMutationHeaders() : {},
			);
			setNotice(data.message);
			await load();
		} catch (dismissError) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(dismissError as { status?: number })?.status ?? null,
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
