import {
	dismissDuplicatePair,
	mergeDuplicatePair,
	type DuplicateCandidate,
} from "../../../../lib/patientDuplicatesApi";
import { showToast } from "../../../GlobalToast";

export async function performPatientMerge({
	patientId,
	targetId,
	headers,
	onMergeSuccess,
	onClose,
}: {
	patientId: string;
	targetId: string;
	headers: any;
	onMergeSuccess?: (res: any) => void;
	onClose: () => void;
}) {
	try {
		const res = await mergeDuplicatePair(
			{
				keepPatientId: patientId,
				mergePatientId: targetId,
				reason: "1-Click неразрушающее слияние дубликатов",
			},
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
	}
}

export async function performPatientDismiss({
	selectedCandidate,
	headers,
	onClose,
}: {
	selectedCandidate: DuplicateCandidate | null;
	headers: any;
	onClose: () => void;
}) {
	if (!selectedCandidate) {
		onClose();
		return;
	}
	try {
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
}
