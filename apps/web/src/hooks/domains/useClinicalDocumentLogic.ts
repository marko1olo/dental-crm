import { useMemo, useEffect, useCallback, useRef } from "react";
import { useDocumentStore } from "../../store/documentStore";
import { type MedicalRecordExtractDocumentDraftFields } from "../../AppConstants";
import {
    loadMedicalRecordExtractDocumentDraft,
    saveMedicalRecordExtractDocumentDraft,
    documentPayloadDraftKey,
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

    const medicalRecordExtractDraftHydratedKeyRef = useRef<string | null>(null);

    const inferredTreatmentArea = useMemo(() => {
		const toothCodes = activeTreatmentPlanItems
			.filter((item) => item.status !== "cancelled")
			.map((item) => item.toothCode?.trim())
			.filter((toothCode): toothCode is string => Boolean(toothCode));
		return Array.from(new Set(toothCodes)).slice(0, 6).join(", ");
	}, [activeTreatmentPlanItems]);

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

	const medicalRecordExtractDraftVisitId = documentPatientMatchesActiveVisit
		? (dashboard?.activeVisit?.id ?? null)
		: null;
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
        medicalRecordExtractDraftPersistenceKey,
        currentMedicalRecordExtractDocumentDraftFields,
        applyMedicalRecordExtractDocumentDraftFields,
        medicalRecordExtractDraftVisitId
    };
}
