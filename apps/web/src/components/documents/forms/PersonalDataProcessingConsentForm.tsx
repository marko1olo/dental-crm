import React, { useMemo } from "react";
import type { ClinicProfileDraft } from "../../../AppConstants";
import { useDocumentStore } from "../../../store/documentStore";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import { personalDataOperatorRequisitesReview } from "../personalDataOperatorRequisites";
import { PersonalDataOperatorSection } from "./personalData/PersonalDataOperatorSection";
import { PersonalDataDetailsSection } from "./personalData/PersonalDataDetailsSection";
import { PersonalDataTermsSection } from "./personalData/PersonalDataTermsSection";

export type DocumentClinicOperator = Pick<
	ClinicProfileDraft,
	"legalName" | "clinicName" | "inn" | "address"
>;

export interface PersonalDataProcessingConsentFormProps {
	/** Черновик профиля клиники: оператор, ИНН и адрес для согласия на ПДн. */
	clinicProfileDraft?: Partial<DocumentClinicOperator> | DocumentClinicOperator | undefined;
}

/**
 * Согласие на обработку персональных данных: цели, категории, передачи, отзыв.
 * Декомпозировано по Мандату 8b на компактные секции.
 */
export const PersonalDataProcessingConsentForm = React.memo(
	function PersonalDataProcessingConsentForm({
		clinicProfileDraft,
	}: PersonalDataProcessingConsentFormProps) {
		const safeOperator: DocumentClinicOperator = useMemo(
			() => ({
				legalName: clinicProfileDraft?.legalName ?? "",
				clinicName: clinicProfileDraft?.clinicName ?? "",
				inn: clinicProfileDraft?.inn ?? "",
				address: clinicProfileDraft?.address ?? "",
			}),
			[clinicProfileDraft],
		);
		const operatorReview = useMemo(
			() => personalDataOperatorRequisitesReview(safeOperator),
			[safeOperator],
		);

		const personalDataActions = useDocumentStore((state) => state.personalDataActions);
		const setPersonalDataActions = useDocumentStore((state) => state.setPersonalDataActions);
		const personalDataAutomatedDecisionAllowed = useDocumentStore((state) => state.personalDataAutomatedDecisionAllowed);
		const setPersonalDataAutomatedDecisionAllowed = useDocumentStore((state) => state.setPersonalDataAutomatedDecisionAllowed);
		const personalDataCategories = useDocumentStore((state) => state.personalDataCategories);
		const setPersonalDataCategories = useDocumentStore((state) => state.setPersonalDataCategories);
		const personalDataConsentGivenAt = useDocumentStore((state) => state.personalDataConsentGivenAt);
		const setPersonalDataConsentGivenAt = useDocumentStore((state) => state.setPersonalDataConsentGivenAt);
		const personalDataCrossBorderAllowed = useDocumentStore((state) => state.personalDataCrossBorderAllowed);
		const setPersonalDataCrossBorderAllowed = useDocumentStore((state) => state.setPersonalDataCrossBorderAllowed);
		const personalDataMedicalProcessingAcknowledged = useDocumentStore((state) => state.personalDataMedicalProcessingAcknowledged);
		const setPersonalDataMedicalProcessingAcknowledged = useDocumentStore((state) => state.setPersonalDataMedicalProcessingAcknowledged);
		const personalDataPurposes = useDocumentStore((state) => state.personalDataPurposes);
		const setPersonalDataPurposes = useDocumentStore((state) => state.setPersonalDataPurposes);
		const personalDataRetentionPeriod = useDocumentStore((state) => state.personalDataRetentionPeriod);
		const setPersonalDataRetentionPeriod = useDocumentStore((state) => state.setPersonalDataRetentionPeriod);
		const personalDataRevocationChannel = useDocumentStore((state) => state.personalDataRevocationChannel);
		const setPersonalDataRevocationChannel = useDocumentStore((state) => state.setPersonalDataRevocationChannel);
		const personalDataTransferRules = useDocumentStore((state) => state.personalDataTransferRules);
		const setPersonalDataTransferRules = useDocumentStore((state) => state.setPersonalDataTransferRules);
		const personalDataVoluntaryConsentConfirmed = useDocumentStore((state) => state.personalDataVoluntaryConsentConfirmed);
		const setPersonalDataVoluntaryConsentConfirmed = useDocumentStore((state) => state.setPersonalDataVoluntaryConsentConfirmed);

		return (
			<DocumentPayloadCard
				title="Согласие на обработку персональных данных"
				description="Оператор, цели, категории данных, передачи и отзыв согласия без пустого шаблона."
			>
				<PersonalDataOperatorSection
					safeOperator={safeOperator}
					problems={operatorReview.problems}
					requiredCount={operatorReview.requiredCount}
				/>
				<PersonalDataDetailsSection
					personalDataPurposes={personalDataPurposes}
					setPersonalDataPurposes={setPersonalDataPurposes}
					personalDataCategories={personalDataCategories}
					setPersonalDataCategories={setPersonalDataCategories}
					personalDataActions={personalDataActions}
					setPersonalDataActions={setPersonalDataActions}
					personalDataTransferRules={personalDataTransferRules}
					setPersonalDataTransferRules={setPersonalDataTransferRules}
					setPersonalDataRetentionPeriod={setPersonalDataRetentionPeriod}
					setPersonalDataRevocationChannel={setPersonalDataRevocationChannel}
				/>
				<PersonalDataTermsSection
					personalDataCrossBorderAllowed={personalDataCrossBorderAllowed}
					setPersonalDataCrossBorderAllowed={setPersonalDataCrossBorderAllowed}
					personalDataAutomatedDecisionAllowed={personalDataAutomatedDecisionAllowed}
					setPersonalDataAutomatedDecisionAllowed={setPersonalDataAutomatedDecisionAllowed}
					personalDataRetentionPeriod={personalDataRetentionPeriod}
					setPersonalDataRetentionPeriod={setPersonalDataRetentionPeriod}
					personalDataRevocationChannel={personalDataRevocationChannel}
					setPersonalDataRevocationChannel={setPersonalDataRevocationChannel}
					personalDataConsentGivenAt={personalDataConsentGivenAt}
					setPersonalDataConsentGivenAt={setPersonalDataConsentGivenAt}
					personalDataVoluntaryConsentConfirmed={personalDataVoluntaryConsentConfirmed}
					setPersonalDataVoluntaryConsentConfirmed={setPersonalDataVoluntaryConsentConfirmed}
					personalDataMedicalProcessingAcknowledged={personalDataMedicalProcessingAcknowledged}
					setPersonalDataMedicalProcessingAcknowledged={setPersonalDataMedicalProcessingAcknowledged}
				/>
			</DocumentPayloadCard>
		);
	},
);

PersonalDataProcessingConsentForm.displayName = "PersonalDataProcessingConsentForm";
