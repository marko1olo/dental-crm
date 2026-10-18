import { useCallback, useEffect, useState } from "react";
import { useOptionalAppLogicContext } from "../../../../contexts/AppLogicContext";
import {
	dismissDuplicatePair,
	fetchDuplicatesForPatient,
	mergeDuplicatePair,
	otherSideOf,
	type DuplicateCandidate,
} from "../../../../lib/patientDuplicatesApi";
import { showToast } from "../../../GlobalToast";
import type { PatientDuplicateMergeModalProps } from "./types";

export function useDuplicateMergeLogic(props: PatientDuplicateMergeModalProps) {
	const { isOpen, onClose, patientId, duplicatePatient, onMergeSuccess } = props;
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;
	const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
	const [selectedCandidate, setSelectedCandidate] = useState<DuplicateCandidate | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isMerging, setIsMerging] = useState(false);
	const mergeReason = "1-Click неразрушающее слияние дубликатов";

	const loadDuplicates = useCallback(async () => {
		if (!patientId || !isOpen || duplicatePatient) return;
		setIsLoading(true);
		try {
			const headers = auth ? auth.denteClinicalReadHeaders() : {};
			const dups = await fetchDuplicatesForPatient(patientId, headers);
			setCandidates(dups);
			const firstDup = dups[0];
			if (firstDup) setSelectedCandidate(firstDup);
		} catch (e) {
			console.warn("[PatientDuplicateMergeModal] Could not fetch duplicates:", e);
		} finally {
			setIsLoading(false);
		}
	}, [patientId, isOpen, duplicatePatient, auth]);

	useEffect(() => {
		if (isOpen) {
			void loadDuplicates();
		} else {
			setCandidates([]);
			setSelectedCandidate(null);
		}
	}, [isOpen, loadDuplicates]);

	const target = duplicatePatient || (selectedCandidate ? otherSideOf(selectedCandidate, patientId) : null);
	const confidencePercent = selectedCandidate ? Math.round(selectedCandidate.confidence * 100) : 95;

	const handleMerge = async () => {
		const targetId = target?.patientId || target?.id;
		if (!targetId) return;
		setIsMerging(true);
		try {
			const headers = auth ? auth.denteClinicalMutationHeaders() : {};
			const res = await mergeDuplicatePair(
				{ keepPatientId: patientId, mergePatientId: targetId, reason: mergeReason },
				headers,
			);
			showToast(res.summary || "Карточки пациентов успешно объединены", "success");
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-patient-merged", {
						detail: { primaryPatientId: patientId, mergedPatientId: targetId },
					}),
				);
			}
			onMergeSuccess?.(res);
			onClose();
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Не удалось объединить карточки";
			showToast(msg, "error");
		} finally {
			setIsMerging(false);
		}
	};

	const handleDismiss = async () => {
		if (!selectedCandidate) {
			onClose();
			return;
		}
		try {
			const headers = auth ? auth.denteClinicalMutationHeaders() : {};
			await dismissDuplicatePair(
				{
					leftPatientId: selectedCandidate.leftPatientId,
					rightPatientId: selectedCandidate.rightPatientId,
					reason: "Отклонено врачом / администратором: разные люди",
				},
				headers,
			);
			showToast("Пара помечена как разные люди и больше не предлагается", "info");
			onClose();
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Ошибка сохранения решения";
			showToast(msg, "error");
		}
	};

	return {
		candidates,
		selectedCandidate,
		isLoading,
		isMerging,
		target,
		confidencePercent,
		handleMerge,
		handleDismiss,
	};
}
