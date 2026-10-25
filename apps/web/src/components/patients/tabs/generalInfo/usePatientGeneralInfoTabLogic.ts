import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_SOMATIC_HEALTHY_NORM } from "../../safetyMath";
import type { PatientClinicalSafetyProfile } from "../../safetyMath";
import type { PatientGeneralInfo, PatientVisitHistoryItem } from "./types";
import { usePatientFamilyLoader } from "../../overview/usePatientFamilyLoader";
import { computePassportSummary, computeInsuranceSummary, computeNotesSummary } from "./generalInfoSummaries";

interface UsePatientGeneralInfoTabParams {
	patient?: PatientGeneralInfo | null;
	safetyProfile?: PatientClinicalSafetyProfile | null;
	disabled?: boolean;
	onUpdatePatient?: (field: keyof PatientGeneralInfo, value: any) => void;
	onUpdateSafetyProfile?: (profile: PatientClinicalSafetyProfile) => void;
}

export function usePatientGeneralInfoTabLogic({
	patient,
	safetyProfile = DEFAULT_SOMATIC_HEALTHY_NORM,
	disabled = false,
	onUpdatePatient,
	onUpdateSafetyProfile,
}: UsePatientGeneralInfoTabParams) {
	const currentProfile = safetyProfile ?? DEFAULT_SOMATIC_HEALTHY_NORM;

	const [addressesMatchState, setAddressesMatchState] = useState<boolean>(() => {
		if (typeof patient?.addressesMatch === "boolean") return patient.addressesMatch;
		if (!patient?.residentialAddress) return true;
		return patient.residentialAddress === (patient.registrationAddress || patient.address);
	});

	const [accordionsOpen, setAccordionsOpen] = useState({
		passport: false,
		insurance: Boolean(patient?.dmsInsuranceCompany || patient?.dmsPolicyNumber || patient?.snils),
		notes: false,
	});

	useEffect(() => {
		if (patient?.dmsInsuranceCompany || patient?.dmsPolicyNumber || patient?.snils) {
			setAccordionsOpen((prev) => (prev.insurance ? prev : { ...prev, insurance: true }));
		}
	}, [patient?.dmsInsuranceCompany, patient?.dmsPolicyNumber, patient?.snils]);

	const [viewingProtocolVisit, setViewingProtocolVisit] = useState<PatientVisitHistoryItem | null>(null);
	const { familyData, familyLoadFailure, loadFamily } = usePatientFamilyLoader(patient?.id, null);

	const toggleAccordion = useCallback((key: "passport" | "insurance" | "notes") => {
		setAccordionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	const passportSummary = useMemo(() => computePassportSummary(patient), [
		patient?.docType, patient?.passportSeries, patient?.passportNumber,
		patient?.registrationAddress, patient?.address, patient?.residentialAddress,
	]);

	const insuranceSummary = useMemo(() => computeInsuranceSummary(patient), [
		patient?.snils, patient?.inn, patient?.omsPolicyNumber,
		patient?.dmsInsuranceCompany, patient?.dmsPolicyNumber,
	]);

	const notesSummary = useMemo(() => computeNotesSummary(patient), [
		patient?.serviceAlertTags, patient?.registryNotes, patient?.notes,
		patient?.doctorClinicalNotes, patient?.acquisitionSource,
	]);

	const handleToggleAllergy = useCallback((field: "hasPenicillinAllergy" | "hasNsaidAllergy" | "hasLatexAllergy") => {
		if (disabled) return;
		onUpdateSafetyProfile?.({ ...currentProfile, [field]: !currentProfile[field] });
	}, [currentProfile, disabled, onUpdateSafetyProfile]);

	const handleToggleServiceTag = useCallback((tag: string) => {
		if (disabled) return;
		const currentTags = Array.isArray(patient?.serviceAlertTags) ? patient.serviceAlertTags : [];
		const exists = currentTags.includes(tag);
		const updatedTags = exists ? currentTags.filter((t) => t !== tag) : [...currentTags, tag];
		onUpdatePatient?.("serviceAlertTags", updatedTags);
		if (!exists) {
			const existingNotes = (patient?.registryNotes ?? patient?.notes ?? "").trim();
			const newNotes = existingNotes ? `${existingNotes}; ${tag}` : tag;
			onUpdatePatient?.("registryNotes", newNotes);
			onUpdatePatient?.("notes", newNotes);
		}
	}, [disabled, patient?.serviceAlertTags, patient?.registryNotes, patient?.notes, onUpdatePatient]);

	const handleAppendDoctorTag = useCallback((tag: string) => {
		if (disabled) return;
		const existingNotes = (patient?.doctorClinicalNotes ?? "").trim();
		if (existingNotes.includes(tag)) return;
		onUpdatePatient?.("doctorClinicalNotes", existingNotes ? `${existingNotes}; ${tag}` : tag);
	}, [disabled, patient?.doctorClinicalNotes, onUpdatePatient]);

	return {
		currentProfile, addressesMatchState, setAddressesMatchState,
		accordionsOpen, toggleAccordion, passportSummary,
		insuranceSummary, notesSummary, handleToggleAllergy,
		handleToggleServiceTag, handleAppendDoctorTag,
		familyData, familyLoadFailure, loadFamily,
		viewingProtocolVisit, setViewingProtocolVisit,
	};
}
