import { useMemo } from "react";
import type { GeneratedDocument, Patient } from "@dental/shared";

export function useA4LatestDocs(
	patient?: Patient | null | undefined,
	existingDocuments?: readonly GeneratedDocument[] | undefined,
) {
	const patientDocs = useMemo(() => {
		const docs = existingDocuments ?? [];
		if (!patient?.id) return docs;
		const filtered = docs.filter((d) => d.patientId === patient?.id);
		return filtered.length > 0 ? filtered : docs;
	}, [existingDocuments, patient?.id]);

	const latestContractDoc = useMemo(
		() => patientDocs.find((d) => d.kind === "paid_medical_services_contract"),
		[patientDocs],
	);
	const latestActDoc = useMemo(
		() => patientDocs.find((d) => d.kind === "completed_works_act"),
		[patientDocs],
	);
	const latestPlanDoc = useMemo(
		() => patientDocs.find((d) => d.kind === "treatment_plan"),
		[patientDocs],
	);

	return { latestContractDoc, latestActDoc, latestPlanDoc };
}
