import { useMemo } from "react";
import { isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import { type ConsentTemplateKey, type ConsentSubstitutionContext } from "../../../consents/consentTemplates";
import { detectConsentScopeMismatch, sanitizeConsentContext, type ConsentScopeMismatchResult } from "../../../consents/consentSummaryHelper";
import { detectRequiredVisitConsents } from "../../../consents/consentSsotEngine";
import type {
	VisitConsentsTabPatient,
	VisitConsentsTabDoctor,
	VisitConsentsTabNoteForm,
	VisitConsentsTabDashboard,
	ConsentRecordState,
} from "../visitConsentTypes";

interface UseConsentContextBuilderParams {
	activePatient?: VisitConsentsTabPatient | null | undefined;
	activeDoctor?: VisitConsentsTabDoctor | null | undefined;
	dashboard?: VisitConsentsTabDashboard | null | undefined;
	visitNoteForm?: VisitConsentsTabNoteForm | null | undefined;
	selectedToothForMenu?: any;
	consentRecords: Record<string, ConsentRecordState>;
	isVisitClosed: boolean;
}

export function useConsentContextBuilder({
	activePatient, activeDoctor, dashboard, visitNoteForm,
	selectedToothForMenu, consentRecords, isVisitClosed,
}: UseConsentContextBuilderParams) {
	const substitutionContext = useMemo<ConsentSubstitutionContext>(() => {
		const docName =
			activeDoctor?.fullName || activeDoctor?.name ||
			(activeDoctor?.specialty ? `Врач-стоматолог (${activeDoctor.specialty})` : "Врач-стоматолог");
		const clinicBrand =
			dashboard?.clinicSettings?.profile?.brandName || dashboard?.organization?.name || "Стоматологическая клиника «DENTE»";
		const clinicLegal = dashboard?.clinicSettings?.profile?.legalEntityName || clinicBrand;
		const toothLabel = typeof selectedToothForMenu === "number" ? String(selectedToothForMenu) : (selectedToothForMenu?.code || "По клиническому плану");

		return sanitizeConsentContext({
			patientName: activePatient?.fullName || activePatient?.name || "Пациент",
			birthDate: activePatient?.birthDate || "—",
			passport: activePatient?.passport || activePatient?.documentNumber || "—",
			doctorName: docName,
			clinicName: clinicBrand,
			clinicLegalName: clinicLegal,
			clinicAddress: dashboard?.clinicSettings?.profile?.address || (isDemoShowcaseMode() ? "г. Москва, ул. Большая Стоматологическая, д. 12" : "«________________________________________»"),
			clinicOgrn: dashboard?.clinicSettings?.profile?.ogrn || (isDemoShowcaseMode() ? "1217700123456" : "«________________»"),
			licenseNumber: dashboard?.clinicSettings?.profile?.medicalLicenseNumber || (isDemoShowcaseMode() ? "ЛО41-01137-77/00368421" : "«________________________________________»"),
			diagnosisIcd: visitNoteForm?.diagnosis || (isDemoShowcaseMode() ? "Z01.2 Стоматологическое обследование" : "________________________________________"),
			toothNumbers: toothLabel,
			date: new Date().toLocaleDateString("ru-RU"),
			snils: activePatient?.snils || null,
			phone: activePatient?.phone || null,
		});
	}, [activePatient, activeDoctor, dashboard, visitNoteForm?.diagnosis, selectedToothForMenu]);

	const requiredFlags = useMemo<Partial<Record<ConsentTemplateKey, boolean>>>(() => {
		const textContext = `${visitNoteForm?.diagnosis || ""} ${visitNoteForm?.treatmentPlan || ""} ${visitNoteForm?.complaint || ""} ${visitNoteForm?.anamnesis || ""}`.toLowerCase();
		const ssotFlags = detectRequiredVisitConsents({
			textContext, isVisitClosed, hasInspectionSigned: Boolean(consentRecords.CONSENT_INSPECTION_1051N?.isSigned),
		});
		return {
			CONSENT_INSPECTION_1051N: false, CONSENT_ANESTHESIA: false, CONSENT_THERAPY: false,
			CONSENT_SURGERY_IMPLANT: false, CONSENT_ORTHOPEDICS: false,
			CONSENT_PERSONAL_DATA: !consentRecords.CONSENT_PERSONAL_DATA?.isSigned,
			CONSENT_ORTHODONTICS: false, CONSENT_HYGIENE_BLEACHING: false, CONSENT_PEDIATRIC: false,
			...ssotFlags,
		};
	}, [visitNoteForm, consentRecords, isVisitClosed]);

	const signedConsentKeys = useMemo<ConsentTemplateKey[]>(() => {
		return Object.entries(consentRecords).filter(([_, rec]) => rec.isSigned).map(([k]) => k as ConsentTemplateKey);
	}, [consentRecords]);

	const consentScopeMismatch = useMemo<ConsentScopeMismatchResult>(() => {
		return detectConsentScopeMismatch({
			signedConsentKeys,
			treatmentPlanText: visitNoteForm?.treatmentPlan,
			diagnosisText: visitNoteForm?.diagnosis,
			complaintText: visitNoteForm?.complaint,
			anamnesisText: visitNoteForm?.anamnesis,
			objectiveStatusText: visitNoteForm?.objectiveStatus,
			additionalProcedures: selectedToothForMenu
				? [typeof selectedToothForMenu === "number" ? String(selectedToothForMenu) : (selectedToothForMenu?.code || "")]
				: [],
		});
	}, [signedConsentKeys, visitNoteForm, selectedToothForMenu]);

	return { substitutionContext, requiredFlags, signedConsentKeys, consentScopeMismatch };
}
