import { useMemo, useEffect, useCallback, useRef } from "react";
import { useDocumentStore } from "../../store/documentStore";
import { type Outpatient025uDocumentDraftFields, type MedicalRecordExtractDocumentDraftFields } from "../../AppConstants";
import {
    loadOutpatient025uDocumentDraft,
    saveOutpatient025uDocumentDraft,
    loadMedicalRecordExtractDocumentDraft,
    saveMedicalRecordExtractDocumentDraft,
    documentPayloadDraftKey,
    emptyOutpatient025uDocumentDraftFields,
    emptyMedicalRecordExtractDocumentDraftFields
} from "../../AppHelpers";

export interface ClinicalDocumentLogicProps {
    dashboard: any;
    documentLocalPersistenceOrganizationId: string | null;
    documentPatientMatchesActiveVisit: boolean;
    activeTreatmentPlanItems: any[];
    documentPatient: any;
}

export function useClinicalDocumentLogic(props: ClinicalDocumentLogicProps) {
    const { dashboard, documentLocalPersistenceOrganizationId, documentPatientMatchesActiveVisit, activeTreatmentPlanItems, documentPatient } = props;
    
    const documentState = useDocumentStore();
    const {
        selectedDocumentKind,
        outpatient025uMedicalCardNumber,
        outpatient025uOpenedAt,
        outpatient025uPatientSexCode,
        outpatient025uCitizenship,
        outpatient025uRegistrationUrbanRuralCode,
        outpatient025uStayUrbanRuralCode,
        outpatient025uOmsIssuedAt,
        outpatient025uInsurerName,
        outpatient025uSocialSupportCode,
        outpatient025uHealthStatusDisclosureContact,
        outpatient025uEmploymentCode,
        outpatient025uDisabilityGroup,
        outpatient025uWorkOrStudyPlace,
        outpatient025uPalliativeCareNeedCode,
        outpatient025uBloodGroup,
        outpatient025uRhFactor,
        outpatient025uKellK1,
        outpatient025uOtherBloodData,
        outpatient025uAllergyHistory,
        outpatient025uFinalEpicrisis,
        outpatient025uOfficialForm274nChecked,
        outpatient025uThirdPartyDataChecked,
        setOutpatient025uMedicalCardNumber,
        setOutpatient025uOpenedAt,
        setOutpatient025uPatientSexCode,
        setOutpatient025uCitizenship,
        setOutpatient025uRegistrationUrbanRuralCode,
        setOutpatient025uStayUrbanRuralCode,
        setOutpatient025uOmsIssuedAt,
        setOutpatient025uInsurerName,
        setOutpatient025uSocialSupportCode,
        setOutpatient025uHealthStatusDisclosureContact,
        setOutpatient025uEmploymentCode,
        setOutpatient025uDisabilityGroup,
        setOutpatient025uWorkOrStudyPlace,
        setOutpatient025uPalliativeCareNeedCode,
        setOutpatient025uBloodGroup,
        setOutpatient025uRhFactor,
        setOutpatient025uKellK1,
        setOutpatient025uOtherBloodData,
        setOutpatient025uAllergyHistory,
        setOutpatient025uFinalEpicrisis,
        setOutpatient025uOfficialForm274nChecked,
        setOutpatient025uThirdPartyDataChecked,
        setAnesthesiaZone,
        setLabTeethOrArea,
        anesthesiaZone,
        labTeethOrArea,
        recordExtractPeriodStart,
        recordExtractPeriodEnd,
        recordExtractSourceVisitIds,
        recordExtractComplaintAndAnamnesis,
        recordExtractObjectiveStatus,
        recordExtractDiagnosis,
        recordExtractTreatmentProvided,
        recordExtractRecommendations,
        recordExtractDoctorFullName,
        recordExtractRecipientFullName,
        recordExtractRecipientAuthority,
        recordExtractIssuedAt,
        recordExtractPreparedFromSignedRecords,
        recordExtractThirdPartyDataChecked,
        setRecordExtractPeriodStart,
        setRecordExtractPeriodEnd,
        setRecordExtractSourceVisitIds,
        setRecordExtractComplaintAndAnamnesis,
        setRecordExtractObjectiveStatus,
        setRecordExtractDiagnosis,
        setRecordExtractTreatmentProvided,
        setRecordExtractRecommendations,
        setRecordExtractDoctorFullName,
        setRecordExtractRecipientFullName,
        setRecordExtractRecipientAuthority,
        setRecordExtractIssuedAt,
        setRecordExtractPreparedFromSignedRecords,
        setRecordExtractThirdPartyDataChecked
    } = documentState;

    const outpatient025uDraftHydratedKeyRef = useRef<string | null>(null);

    const medicalRecordExtractDraftHydratedKeyRef = useRef<string | null>(null);

    const inferredTreatmentArea = useMemo(() => {
		const toothCodes = activeTreatmentPlanItems
			.filter((item) => item.status !== "cancelled")
			.map((item) => item.toothCode?.trim())
			.filter((toothCode): toothCode is string => Boolean(toothCode));
		return Array.from(new Set(toothCodes)).slice(0, 6).join(", ");
	}, [activeTreatmentPlanItems]);

    const outpatient025uDraftVisitId = documentPatientMatchesActiveVisit
		? (dashboard?.activeVisit?.id ?? null)
		: null;

    const medicalRecordExtractDraftVisitId = documentPatientMatchesActiveVisit
		? (dashboard?.activeVisit?.id ?? null)
		: null;

    const outpatient025uDraftPersistenceKey = useMemo(
		() =>
			documentPayloadDraftKey(
				"outpatient_medical_card_025u",
				documentLocalPersistenceOrganizationId,
				documentPatient?.id ?? null,
				outpatient025uDraftVisitId,
			),
		[
			documentLocalPersistenceOrganizationId,
			documentPatient?.id,
			outpatient025uDraftVisitId,
		],
	);

    const medicalRecordExtractDraftPersistenceKey = useMemo(
		() =>
			documentPayloadDraftKey(
				"medical_record_extract",
				documentLocalPersistenceOrganizationId,
				documentPatient?.id ?? null,
				medicalRecordExtractDraftVisitId,
			),
		[
			documentLocalPersistenceOrganizationId,
			documentPatient?.id,
			medicalRecordExtractDraftVisitId,
		],
	);

    const outpatient025uFieldsRef = useRef<Outpatient025uDocumentDraftFields>({
		recordExtractPeriodStart,
		recordExtractPeriodEnd,
		recordExtractSourceVisitIds,
		recordExtractComplaintAndAnamnesis,
		recordExtractObjectiveStatus,
		recordExtractDiagnosis,
		recordExtractTreatmentProvided,
		recordExtractRecommendations,
		recordExtractDoctorFullName,
		recordExtractPreparedFromSignedRecords,
		outpatient025uMedicalCardNumber,
		outpatient025uOpenedAt,
		outpatient025uPatientSexCode,
		outpatient025uCitizenship,
		outpatient025uRegistrationUrbanRuralCode,
		outpatient025uStayUrbanRuralCode,
		outpatient025uOmsIssuedAt,
		outpatient025uInsurerName,
		outpatient025uSocialSupportCode,
		outpatient025uHealthStatusDisclosureContact,
		outpatient025uEmploymentCode,
		outpatient025uDisabilityGroup,
		outpatient025uWorkOrStudyPlace,
		outpatient025uPalliativeCareNeedCode,
		outpatient025uBloodGroup,
		outpatient025uRhFactor,
		outpatient025uKellK1,
		outpatient025uOtherBloodData,
		outpatient025uAllergyHistory,
		outpatient025uFinalEpicrisis,
		outpatient025uOfficialForm274nChecked,
		outpatient025uThirdPartyDataChecked,
	});

    const currentOutpatient025uDocumentDraftFields = useCallback(
		() => outpatient025uFieldsRef.current,
		[],
	);

    const applyOutpatient025uDocumentDraftFields = useCallback(
		(fields: Outpatient025uDocumentDraftFields) => {
			setRecordExtractPeriodStart(fields.recordExtractPeriodStart);
			setRecordExtractPeriodEnd(fields.recordExtractPeriodEnd);
			setRecordExtractSourceVisitIds(fields.recordExtractSourceVisitIds);
			setRecordExtractComplaintAndAnamnesis(
				fields.recordExtractComplaintAndAnamnesis,
			);
			setRecordExtractObjectiveStatus(fields.recordExtractObjectiveStatus);
			setRecordExtractDiagnosis(fields.recordExtractDiagnosis);
			setRecordExtractTreatmentProvided(fields.recordExtractTreatmentProvided);
			setRecordExtractRecommendations(fields.recordExtractRecommendations);
			setRecordExtractDoctorFullName(fields.recordExtractDoctorFullName);
			setRecordExtractPreparedFromSignedRecords(
				fields.recordExtractPreparedFromSignedRecords,
			);
			setOutpatient025uMedicalCardNumber(
				fields.outpatient025uMedicalCardNumber,
			);
			setOutpatient025uOpenedAt(fields.outpatient025uOpenedAt);
			setOutpatient025uPatientSexCode(fields.outpatient025uPatientSexCode);
			setOutpatient025uCitizenship(fields.outpatient025uCitizenship);
			setOutpatient025uRegistrationUrbanRuralCode(
				fields.outpatient025uRegistrationUrbanRuralCode,
			);
			setOutpatient025uStayUrbanRuralCode(
				fields.outpatient025uStayUrbanRuralCode,
			);
			setOutpatient025uOmsIssuedAt(fields.outpatient025uOmsIssuedAt);
			setOutpatient025uInsurerName(fields.outpatient025uInsurerName);
			setOutpatient025uSocialSupportCode(
				fields.outpatient025uSocialSupportCode,
			);
			setOutpatient025uHealthStatusDisclosureContact(
				fields.outpatient025uHealthStatusDisclosureContact,
			);
			setOutpatient025uEmploymentCode(fields.outpatient025uEmploymentCode);
			setOutpatient025uDisabilityGroup(fields.outpatient025uDisabilityGroup);
			setOutpatient025uWorkOrStudyPlace(fields.outpatient025uWorkOrStudyPlace);
			setOutpatient025uPalliativeCareNeedCode(
				fields.outpatient025uPalliativeCareNeedCode,
			);
			setOutpatient025uBloodGroup(fields.outpatient025uBloodGroup);
			setOutpatient025uRhFactor(fields.outpatient025uRhFactor);
			setOutpatient025uKellK1(fields.outpatient025uKellK1);
			setOutpatient025uOtherBloodData(fields.outpatient025uOtherBloodData);
			setOutpatient025uAllergyHistory(fields.outpatient025uAllergyHistory);
			setOutpatient025uFinalEpicrisis(fields.outpatient025uFinalEpicrisis);
			setOutpatient025uOfficialForm274nChecked(
				fields.outpatient025uOfficialForm274nChecked,
			);
			setOutpatient025uThirdPartyDataChecked(
				fields.outpatient025uThirdPartyDataChecked,
			);
		},
		[
			setRecordExtractPeriodStart,
			setRecordExtractPeriodEnd,
			setRecordExtractSourceVisitIds,
			setRecordExtractComplaintAndAnamnesis,
			setRecordExtractObjectiveStatus,
			setRecordExtractDiagnosis,
			setRecordExtractTreatmentProvided,
			setRecordExtractRecommendations,
			setRecordExtractDoctorFullName,
			setRecordExtractPreparedFromSignedRecords,
			setOutpatient025uMedicalCardNumber,
			setOutpatient025uOpenedAt,
			setOutpatient025uPatientSexCode,
			setOutpatient025uCitizenship,
			setOutpatient025uRegistrationUrbanRuralCode,
			setOutpatient025uStayUrbanRuralCode,
			setOutpatient025uOmsIssuedAt,
			setOutpatient025uInsurerName,
			setOutpatient025uSocialSupportCode,
			setOutpatient025uHealthStatusDisclosureContact,
			setOutpatient025uEmploymentCode,
			setOutpatient025uDisabilityGroup,
			setOutpatient025uWorkOrStudyPlace,
			setOutpatient025uPalliativeCareNeedCode,
			setOutpatient025uBloodGroup,
			setOutpatient025uRhFactor,
			setOutpatient025uKellK1,
			setOutpatient025uOtherBloodData,
			setOutpatient025uAllergyHistory,
			setOutpatient025uFinalEpicrisis,
			setOutpatient025uOfficialForm274nChecked,
			setOutpatient025uThirdPartyDataChecked,
		],
	);

    const medicalRecordExtractFieldsRef =
		useRef<MedicalRecordExtractDocumentDraftFields>({
			recordExtractPeriodStart,
			recordExtractPeriodEnd,
			recordExtractSourceVisitIds,
			recordExtractComplaintAndAnamnesis,
			recordExtractObjectiveStatus,
			recordExtractDiagnosis,
			recordExtractTreatmentProvided,
			recordExtractRecommendations,
			recordExtractDoctorFullName,
			recordExtractRecipientFullName,
			recordExtractRecipientAuthority,
			recordExtractIssuedAt,
			recordExtractPreparedFromSignedRecords,
			recordExtractThirdPartyDataChecked,
		});

    const currentMedicalRecordExtractDocumentDraftFields = useCallback(
		() => medicalRecordExtractFieldsRef.current,
		[],
	);

    const applyMedicalRecordExtractDocumentDraftFields = useCallback(
		(fields: MedicalRecordExtractDocumentDraftFields) => {
			setRecordExtractPeriodStart(fields.recordExtractPeriodStart);
			setRecordExtractPeriodEnd(fields.recordExtractPeriodEnd);
			setRecordExtractSourceVisitIds(fields.recordExtractSourceVisitIds);
			setRecordExtractComplaintAndAnamnesis(
				fields.recordExtractComplaintAndAnamnesis,
			);
			setRecordExtractObjectiveStatus(fields.recordExtractObjectiveStatus);
			setRecordExtractDiagnosis(fields.recordExtractDiagnosis);
			setRecordExtractTreatmentProvided(fields.recordExtractTreatmentProvided);
			setRecordExtractRecommendations(fields.recordExtractRecommendations);
			setRecordExtractDoctorFullName(fields.recordExtractDoctorFullName);
			setRecordExtractRecipientFullName(fields.recordExtractRecipientFullName);
			setRecordExtractRecipientAuthority(
				fields.recordExtractRecipientAuthority,
			);
			setRecordExtractIssuedAt(fields.recordExtractIssuedAt);
			setRecordExtractPreparedFromSignedRecords(
				fields.recordExtractPreparedFromSignedRecords,
			);
			setRecordExtractThirdPartyDataChecked(
				fields.recordExtractThirdPartyDataChecked,
			);
		},
		[
			setRecordExtractPeriodStart,
			setRecordExtractPeriodEnd,
			setRecordExtractSourceVisitIds,
			setRecordExtractComplaintAndAnamnesis,
			setRecordExtractObjectiveStatus,
			setRecordExtractDiagnosis,
			setRecordExtractTreatmentProvided,
			setRecordExtractRecommendations,
			setRecordExtractDoctorFullName,
			setRecordExtractRecipientFullName,
			setRecordExtractRecipientAuthority,
			setRecordExtractIssuedAt,
			setRecordExtractPreparedFromSignedRecords,
			setRecordExtractThirdPartyDataChecked,
		],
	);

    useEffect(() => {
		if (
			selectedDocumentKind !== "outpatient_medical_card_025u" ||
			!outpatient025uDraftPersistenceKey
		) {
			outpatient025uDraftHydratedKeyRef.current = null;
			return;
		}
		const storedDraft = loadOutpatient025uDocumentDraft(
			documentLocalPersistenceOrganizationId,
			outpatient025uDraftPersistenceKey,
		);
		applyOutpatient025uDocumentDraftFields(
			storedDraft ?? emptyOutpatient025uDocumentDraftFields(),
		);
		outpatient025uDraftHydratedKeyRef.current =
			outpatient025uDraftPersistenceKey;
	}, [
		documentLocalPersistenceOrganizationId,
		outpatient025uDraftPersistenceKey,
		selectedDocumentKind,
		applyOutpatient025uDocumentDraftFields,
	]);

    useEffect(() => {
		if (
			selectedDocumentKind !== "outpatient_medical_card_025u" ||
			!documentPatient?.id ||
			!outpatient025uDraftPersistenceKey
		)
			return;
		if (
			outpatient025uDraftHydratedKeyRef.current !==
			outpatient025uDraftPersistenceKey
		)
			return;
		saveOutpatient025uDocumentDraft(
			documentLocalPersistenceOrganizationId,
			outpatient025uDraftPersistenceKey,
			documentPatient.id,
			outpatient025uDraftVisitId,
			currentOutpatient025uDocumentDraftFields(),
		);
	}, [
		documentPatient?.id,
		documentLocalPersistenceOrganizationId,
		outpatient025uDraftPersistenceKey,
		outpatient025uDraftVisitId,
		selectedDocumentKind,
		currentOutpatient025uDocumentDraftFields,
	]);

    useEffect(() => {
		if (
			selectedDocumentKind !== "medical_record_extract" ||
			!medicalRecordExtractDraftPersistenceKey
		) {
			medicalRecordExtractDraftHydratedKeyRef.current = null;
			return;
		}
		const storedDraft = loadMedicalRecordExtractDocumentDraft(
			documentLocalPersistenceOrganizationId,
			medicalRecordExtractDraftPersistenceKey,
		);
		applyMedicalRecordExtractDocumentDraftFields(
			storedDraft ?? emptyMedicalRecordExtractDocumentDraftFields(),
		);
		medicalRecordExtractDraftHydratedKeyRef.current =
			medicalRecordExtractDraftPersistenceKey;
	}, [
		documentLocalPersistenceOrganizationId,
		medicalRecordExtractDraftPersistenceKey,
		selectedDocumentKind,
		applyMedicalRecordExtractDocumentDraftFields,
	]);

    useEffect(() => {
		if (
			selectedDocumentKind !== "medical_record_extract" ||
			!documentPatient?.id ||
			!medicalRecordExtractDraftPersistenceKey
		)
			return;
		if (
			medicalRecordExtractDraftHydratedKeyRef.current !==
			medicalRecordExtractDraftPersistenceKey
		)
			return;
		saveMedicalRecordExtractDocumentDraft(
			documentLocalPersistenceOrganizationId,
			medicalRecordExtractDraftPersistenceKey,
			documentPatient.id,
			medicalRecordExtractDraftVisitId,
			currentMedicalRecordExtractDocumentDraftFields(),
		);
	}, [
		documentPatient?.id,
		documentLocalPersistenceOrganizationId,
		medicalRecordExtractDraftPersistenceKey,
		medicalRecordExtractDraftVisitId,
		selectedDocumentKind,
		currentMedicalRecordExtractDocumentDraftFields,
	]);

    useEffect(() => {
		if (!inferredTreatmentArea) return;
		if (!anesthesiaZone.trim()) {
			setAnesthesiaZone(inferredTreatmentArea);
		}
		if (!labTeethOrArea.trim()) {
			setLabTeethOrArea(inferredTreatmentArea);
		}
	}, [
		anesthesiaZone,
		inferredTreatmentArea,
		labTeethOrArea,
		setAnesthesiaZone,
		setLabTeethOrArea,
	]);


    return {
        inferredTreatmentArea,
        outpatient025uDraftPersistenceKey,
        medicalRecordExtractDraftPersistenceKey,
        currentOutpatient025uDocumentDraftFields,
        currentMedicalRecordExtractDocumentDraftFields,
        applyOutpatient025uDocumentDraftFields,
        applyMedicalRecordExtractDocumentDraftFields,
        outpatient025uDraftVisitId,
        medicalRecordExtractDraftVisitId
    };
}
