import { useCallback, useEffect, useState } from "react";
import { useOptionalAppLogicContext } from "../../../../contexts/AppLogicContext";
import {
	type DuplicateCandidate,
	fetchDuplicatesForPatient,
	otherSideOf,
} from "../../../../lib/patientDuplicatesApi";
import type { PatientDuplicateMergeModalProps } from "./types";
import { performPatientDismiss, performPatientMerge } from "./duplicateMergeActions";

export function useDuplicateMergeLogic(props: PatientDuplicateMergeModalProps) {
	const { isOpen, onClose, patientId, duplicatePatient, onMergeSuccess } = props;
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;
	const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
	const [selectedCandidate, setSelectedCandidate] = useState<DuplicateCandidate | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isMerging, setIsMerging] = useState(false);

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
			await performPatientMerge({ patientId, targetId, headers, onMergeSuccess, onClose });
		} finally {
			setIsMerging(false);
		}
	};

	const handleDismiss = async () => {
		const headers = auth ? auth.denteClinicalMutationHeaders() : {};
		await performPatientDismiss({ selectedCandidate, headers, onClose });
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
