import { useMemo } from "react";
import {
	buildA4ConsentData,
	buildA4MedicalCardData,
	buildA4PersonalDataConsent,
} from "./a4ClinicalDocsBuilder";
import {
	buildA4ClinicRequisites,
	buildA4PatientRequisites,
	buildA4TodayRu,
} from "./a4ClinicPatientDefaults";
import { buildA4ActData, buildA4ContractData } from "./a4FinancialDocsBuilder";
import { buildA4TreatmentPlanData } from "./a4TreatmentPlanBuilder";
import type { UseA4PreviewDataOptions } from "./types";
import { useA4LatestDocs } from "./useA4LatestDocs";

export function useA4PreviewData(opts: UseA4PreviewDataOptions) {
	const todayRu = useMemo(() => buildA4TodayRu(), []);
	const cl = useMemo(
		() => buildA4ClinicRequisites(opts.clinicProfileDraft),
		[opts.clinicProfileDraft],
	);
	const pt = useMemo(
		() => buildA4PatientRequisites(opts.patient),
		[opts.patient],
	);
	const doctor =
		opts.doctorFullName ||
		cl.directorFullName ||
		"Воронов Алексей Владимирович";

	const { latestContractDoc, latestActDoc, latestPlanDoc } = useA4LatestDocs(
		opts.patient,
		opts.existingDocuments,
	);

	const contractData = useMemo(
		() =>
			buildA4ContractData(
				cl,
				pt,
				doctor,
				todayRu,
				opts.contractData,
				latestContractDoc,
			),
		[cl, pt, doctor, todayRu, opts.contractData, latestContractDoc],
	);

	const actData = useMemo(
		() =>
			buildA4ActData(
				cl,
				pt,
				doctor,
				todayRu,
				contractData.contractNumber,
				contractData.contractDate,
				opts.actData,
				latestActDoc,
			),
		[cl, pt, doctor, todayRu, contractData, opts.actData, latestActDoc],
	);

	const treatmentPlanData = useMemo(
		() =>
			buildA4TreatmentPlanData(
				cl,
				pt,
				doctor,
				todayRu,
				opts.treatmentPlanData,
				latestPlanDoc,
			),
		[cl, pt, doctor, todayRu, opts.treatmentPlanData, latestPlanDoc],
	);

	const medicalCardData = useMemo(
		() => buildA4MedicalCardData(cl, pt, doctor, todayRu, opts.medicalCardData),
		[cl, pt, doctor, todayRu, opts.medicalCardData],
	);

	const consentData = useMemo(
		() =>
			buildA4ConsentData(
				cl,
				pt,
				doctor,
				todayRu,
				contractData.contractNumber,
				contractData.contractDate,
				opts.consentData,
			),
		[cl, pt, doctor, todayRu, contractData, opts.consentData],
	);

	const personalDataConsent = useMemo(
		() => buildA4PersonalDataConsent(cl, pt, todayRu, opts.personalDataConsent),
		[cl, pt, todayRu, opts.personalDataConsent],
	);

	return {
		todayRu,
		cl,
		pt,
		doctor,
		contractData,
		actData,
		treatmentPlanData,
		medicalCardData,
		consentData,
		personalDataConsent,
	};
}
