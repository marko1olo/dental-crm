import type { DocumentPayload, GeneratedDocument } from "@dental/shared";
import type { DocumentState } from "./types";

export function buildConsentPayload(
	kind: GeneratedDocument["kind"],
	state: DocumentState,
): DocumentPayload | null {
	if (kind === "minor_legal_representative_consent") {
		const {
			minorRepresentativeFullNameValue,
			minorRepresentativeRelationshipValue,
			minorRepresentativeIdentityDocumentValue,
			minorRepresentativeAuthorityDocument,
			minorRepresentativePhoneValue,
			minorConsentPatientFullNameValue,
			minorConsentPatientBirthDateValue,
			minorConsentInterventionScopeValue,
			minorConsentDiagnosisOrIndicationValue,
			minorConsentRisks,
			minorConsentAlternatives,
			minorConsentDoctorFullNameValue,
			minorConsentSignedAt,
			minorConsentIdentityVerified,
			minorConsentAuthorityVerified,
			minorConsentExplained,
			minorConsentStored,
			minorConsentAgeExplanation,
			documentTextLines,
			confirmedDocumentLiteral,
		} = state;
		return {
			minorLegalRepresentativeConsent: {
				representativeFullName: minorRepresentativeFullNameValue(),
				representativeRelationship: minorRepresentativeRelationshipValue(),
				representativeIdentityDocument:
					minorRepresentativeIdentityDocumentValue(),
				authorityDocument: minorRepresentativeAuthorityDocument.trim(),
				representativePhone: minorRepresentativePhoneValue() || null,
				minorFullName: minorConsentPatientFullNameValue(),
				minorBirthDate: minorConsentPatientBirthDateValue(),
				interventionScope: minorConsentInterventionScopeValue(),
				diagnosisOrIndication: minorConsentDiagnosisOrIndicationValue(),
				explainedRisks: documentTextLines(minorConsentRisks),
				alternativesExplained: documentTextLines(minorConsentAlternatives),
				doctorFullName: minorConsentDoctorFullNameValue(),
				signedAt: minorConsentSignedAt.trim(),
				representativeIdentityVerified: confirmedDocumentLiteral(
					minorConsentIdentityVerified,
					"личность представителя проверена",
				),
				representativeAuthorityVerified: confirmedDocumentLiteral(
					minorConsentAuthorityVerified,
					"полномочия представителя проверены",
				),
				informedConsentExplained: confirmedDocumentLiteral(
					minorConsentExplained,
					"информированное согласие разъяснено",
				),
				medicalRecordConsentStored: confirmedDocumentLiteral(
					minorConsentStored,
					"согласие сохранено в медкарте",
				),
				ageAppropriateExplanationGiven: confirmedDocumentLiteral(
					minorConsentAgeExplanation,
					"ребенку дано объяснение по возрасту",
				),
			},
		};
	}

	if (kind === "patient_intake_questionnaire") {
		const {
			intakeChiefComplaint,
			intakeAllergyStatus,
			intakeCurrentMedications,
			intakeChronicConditions,
			intakePregnancyStatus,
			intakeAnticoagulants,
			intakeInfectiousRiskNotes,
			intakeCardioEndocrineNotes,
			intakeEmergencyContact,
			intakeAdditionalNotes,
			intakeAccuracyConfirmed,
			confirmedDocumentLiteral,
		} = state;
		return {
			patientIntakeQuestionnaire: {
				chiefComplaint: intakeChiefComplaint.trim(),
				allergyStatus: intakeAllergyStatus.trim(),
				currentMedications: intakeCurrentMedications.trim(),
				chronicConditions: intakeChronicConditions.trim(),
				pregnancyStatus: intakePregnancyStatus,
				anticoagulants: intakeAnticoagulants.trim(),
				infectiousRiskNotes: intakeInfectiousRiskNotes.trim(),
				cardioEndocrineNotes: intakeCardioEndocrineNotes.trim(),
				emergencyContact: intakeEmergencyContact.trim() || null,
				additionalNotes: intakeAdditionalNotes.trim() || null,
				accuracyConfirmed: confirmedDocumentLiteral(
					intakeAccuracyConfirmed,
					"пациент подтвердил достоверность анкеты",
				),
			},
		};
	}

	if (kind === "informed_consent") {
		const {
			informedConsentIntervention,
			informedConsentToothOrArea,
			inferredTreatmentArea,
			informedConsentDiagnosisOrIndication,
			dashboard,
			informedConsentExpectedBenefit,
			informedConsentAnesthesia,
			informedConsentMaterialNotes,
			informedConsentTrustedContact,
			informedConsentRisks,
			informedConsentAlternatives,
			informedConsentAftercare,
			informedConsentDoctorFullName,
			activeDoctor,
			informedConsentConfirmedAt,
			informedConsentQuestionsAnswered,
			informedConsentRisksUnderstood,
			informedConsentWithdrawUnderstood,
			documentTextLines,
			confirmedDocumentLiteral,
		} = state;
		return {
			informedConsent: {
				intervention: informedConsentIntervention.trim(),
				toothOrArea:
					informedConsentToothOrArea.trim() || inferredTreatmentArea || "",
				diagnosisOrIndication:
					informedConsentDiagnosisOrIndication.trim() ||
					dashboard?.activeVisit?.complaint ||
					"",
				expectedBenefit: informedConsentExpectedBenefit.trim(),
				plannedAnesthesia: informedConsentAnesthesia.trim() || null,
				materialOrMedicationNotes: informedConsentMaterialNotes.trim() || null,
				trustedContactForMedicalInfo:
					informedConsentTrustedContact.trim() || null,
				explainedRisks: documentTextLines(informedConsentRisks),
				alternatives: documentTextLines(informedConsentAlternatives),
				aftercareRequirements: documentTextLines(informedConsentAftercare),
				doctorFullName:
					informedConsentDoctorFullName.trim() || activeDoctor?.fullName || "",
				consentConfirmedAt: informedConsentConfirmedAt.trim(),
				patientQuestionsAnswered: confirmedDocumentLiteral(
					informedConsentQuestionsAnswered,
					"вопросы пациента по информированному согласию закрыты",
				),
				patientUnderstandsRisks: confirmedDocumentLiteral(
					informedConsentRisksUnderstood,
					"риски информированного согласия понятны",
				),
				patientMayWithdrawBeforeIntervention: confirmedDocumentLiteral(
					informedConsentWithdrawUnderstood,
					"право отказаться до вмешательства объяснено",
				),
			},
		};
	}

	if (kind === "procedure_specific_consent_packet") {
		const {
			procedureConsentProcedureType,
			procedureConsentProcedureName,
			procedureConsentToothOrArea,
			inferredTreatmentArea,
			procedureConsentDiagnosisOrIndication,
			dashboard,
			clinicalToothRowsValue,
			procedureConsentAnesthesia,
			procedureConsentMaterials,
			procedureConsentPatientRiskFactors,
			procedureConsentSpecificRisks,
			procedureConsentAlternatives,
			procedureConsentAftercare,
			procedureConsentDoctorFullName,
			activeDoctor,
			procedureConsentConfirmedAt,
			procedureConsentLocalFormAttached,
			procedureConsentQuestionsAnswered,
			procedureConsentExactProcedureConfirmed,
			procedureConsentRisksUnderstood,
			documentTextLines,
			confirmedDocumentLiteral,
		} = state;
		return {
			procedureSpecificConsent: {
				procedureType: procedureConsentProcedureType,
				procedureName: procedureConsentProcedureName.trim(),
				toothOrArea:
					procedureConsentToothOrArea.trim() || inferredTreatmentArea || "",
				diagnosisOrIndication:
					procedureConsentDiagnosisOrIndication.trim() ||
					dashboard?.activeVisit?.complaint ||
					"",
				clinicalToothRows: clinicalToothRowsValue(),
				plannedAnesthesia: procedureConsentAnesthesia.trim() || null,
				materialsAndSystems: procedureConsentMaterials.trim() || null,
				patientSpecificRiskFactors: documentTextLines(
					procedureConsentPatientRiskFactors,
				),
				procedureSpecificRisks: documentTextLines(
					procedureConsentSpecificRisks,
				),
				alternatives: documentTextLines(procedureConsentAlternatives),
				aftercareAndLimits: documentTextLines(procedureConsentAftercare),
				doctorFullName:
					procedureConsentDoctorFullName.trim() || activeDoctor?.fullName || "",
				consentConfirmedAt: procedureConsentConfirmedAt.trim(),
				localClinicFormAttached: procedureConsentLocalFormAttached,
				patientQuestionsAnswered: confirmedDocumentLiteral(
					procedureConsentQuestionsAnswered,
					"вопросы пациента по процедуре закрыты",
				),
				exactProcedureConfirmed: confirmedDocumentLiteral(
					procedureConsentExactProcedureConfirmed,
					"процедура, зона и объем подтверждены",
				),
				patientUnderstandsSpecificRisks: confirmedDocumentLiteral(
					procedureConsentRisksUnderstood,
					"процедурные риски понятны",
				),
			},
		};
	}

	if (kind === "anesthesia_consent_log") {
		const {
			anesthesiaMethod,
			anesthesiaAnesthetic,
			anesthesiaVasoconstrictor,
			anesthesiaZone,
			anesthesiaAllergyStatus,
			anesthesiaRestrictionNotes,
			anesthesiaDoseTime,
			anesthesiaDoseMl,
			anesthesiaReaction,
			anesthesiaRisksExplained,
			anesthesiaAllergyRestrictionsChecked,
			anesthesiaConsentConfirmed,
			confirmedDocumentLiteral,
		} = state;
		return {
			anesthesiaConsentLog: {
				method: anesthesiaMethod.trim(),
				anesthetic: anesthesiaAnesthetic.trim(),
				vasoconstrictor: anesthesiaVasoconstrictor.trim() || null,
				plannedZone: anesthesiaZone.trim(),
				allergyStatus: anesthesiaAllergyStatus.trim(),
				restrictionNotes: anesthesiaRestrictionNotes.trim() || null,
				doseRows: [
					{
						time: anesthesiaDoseTime.trim(),
						medication: [
							anesthesiaAnesthetic.trim(),
							anesthesiaVasoconstrictor.trim(),
						]
							.filter(Boolean)
							.join(", "),
						doseMl: anesthesiaDoseMl.trim(),
						zone: anesthesiaZone.trim(),
						reaction: anesthesiaReaction.trim() || null,
					},
				],
				patientAnesthesiaRisksExplained: confirmedDocumentLiteral(
					anesthesiaRisksExplained,
					"риски анестезии разъяснены",
				),
				allergyAndRestrictionStatusChecked: confirmedDocumentLiteral(
					anesthesiaAllergyRestrictionsChecked,
					"аллергии и ограничения проверены",
				),
				patientConfirmedAnesthesiaConsent: confirmedDocumentLiteral(
					anesthesiaConsentConfirmed,
					"согласие на местную анестезию подтверждено",
				),
			},
		};
	}

	if (kind === "photo_video_consent") {
		const {
			photoVideoClinicalRecordUseConfirmed,
			photoVideoLabTransferAllowed,
			photoVideoColleagueConsultationAllowed,
			photoVideoEducationUseAllowed,
			photoVideoMarketingUseAllowed,
			photoVideoRecognizablePublicationAllowed,
			photoVideoMaterials,
			photoVideoAnonymizationConfirmed,
			photoVideoRevocationChannel,
			photoVideoScopeNotes,
			confirmedDocumentLiteral,
		} = state;
		return {
			photoVideoConsent: {
				clinicalRecordUse: confirmedDocumentLiteral(
					photoVideoClinicalRecordUseConfirmed,
					"использование фото, видео и снимков в медицинской карте подтверждено",
				),
				labTransferAllowed: photoVideoLabTransferAllowed,
				colleagueConsultationAllowed: photoVideoColleagueConsultationAllowed,
				educationUseAllowed: photoVideoEducationUseAllowed,
				marketingUseAllowed: photoVideoMarketingUseAllowed,
				recognizablePublicationAllowed:
					photoVideoRecognizablePublicationAllowed,
				materials: photoVideoMaterials,
				anonymizationRequired: confirmedDocumentLiteral(
					photoVideoAnonymizationConfirmed,
					"обезличивание внешнего использования подтверждено",
				),
				revocationChannel: photoVideoRevocationChannel.trim(),
				scopeNotes: photoVideoScopeNotes.trim() || null,
			},
		};
	}

	if (kind === "personal_data_processing_consent") {
		const {
			clinicProfileDraft,
			personalDataPurposes,
			personalDataCategories,
			personalDataActions,
			personalDataTransferRules,
			personalDataCrossBorderAllowed,
			personalDataAutomatedDecisionAllowed,
			personalDataRetentionPeriod,
			personalDataRevocationChannel,
			personalDataConsentGivenAt,
			personalDataVoluntaryConsentConfirmed,
			personalDataMedicalProcessingAcknowledged,
			documentTextLines,
			confirmedDocumentLiteral,
		} = state;
		return {
			personalDataProcessingConsent: {
				operatorLegalName:
					clinicProfileDraft?.legalName?.trim() ||
					clinicProfileDraft?.clinicName?.trim() ||
					"",
				operatorInn: clinicProfileDraft?.inn?.replace(/[^\d]/g, "") || "",
				operatorAddress: clinicProfileDraft?.address?.trim() || "",
				processingPurposes: documentTextLines(personalDataPurposes),
				personalDataCategories: documentTextLines(personalDataCategories),
				processingActions: documentTextLines(personalDataActions),
				thirdPartyTransferRules: personalDataTransferRules.trim(),
				crossBorderTransferAllowed: personalDataCrossBorderAllowed,
				automatedDecisionMakingAllowed: personalDataAutomatedDecisionAllowed,
				retentionPeriod: personalDataRetentionPeriod.trim(),
				revocationChannel: personalDataRevocationChannel.trim(),
				consentGivenAt: personalDataConsentGivenAt.trim(),
				patientConfirmedVoluntaryConsent: confirmedDocumentLiteral(
					personalDataVoluntaryConsentConfirmed,
					"добровольное согласие на ПДн подтверждено",
				),
				medicalDataProcessingAcknowledged: confirmedDocumentLiteral(
					personalDataMedicalProcessingAcknowledged,
					"обработка медицинских данных понятна",
				),
			},
		};
	}

	if (kind === "medical_intervention_refusal") {
		const {
			refusalIntervention,
			refusalClinicalIndication,
			refusalPatientReason,
			refusalExplainedRisks,
			refusalAlternatives,
			refusalUrgentWarningSigns,
			refusalDoctorFullName,
			activeDoctor,
			refusalConfirmedAt,
			refusalConsequencesUnderstood,
			refusalSecondOpinionOffered,
			refusalEmergencyCareExplained,
			documentTextLines,
			confirmedDocumentLiteral,
		} = state;
		return {
			medicalInterventionRefusal: {
				refusedIntervention: refusalIntervention.trim(),
				clinicalIndication: refusalClinicalIndication.trim(),
				patientReason: refusalPatientReason.trim() || null,
				explainedRisks: documentTextLines(refusalExplainedRisks),
				alternativesOffered: documentTextLines(refusalAlternatives),
				urgentWarningSigns: documentTextLines(refusalUrgentWarningSigns),
				doctorFullName:
					refusalDoctorFullName.trim() || activeDoctor?.fullName || "",
				refusalConfirmedAt: refusalConfirmedAt.trim(),
				patientUnderstandsConsequences: confirmedDocumentLiteral(
					refusalConsequencesUnderstood,
					"последствия отказа понятны",
				),
				secondOpinionOffered: confirmedDocumentLiteral(
					refusalSecondOpinionOffered,
					"второе мнение или альтернатива предложены",
				),
				emergencyCareExplained: confirmedDocumentLiteral(
					refusalEmergencyCareExplained,
					"экстренная помощь объяснена",
				),
			},
		};
	}

	return null;
}
