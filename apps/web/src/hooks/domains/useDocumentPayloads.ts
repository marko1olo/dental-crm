import type { ClinicalToothRow, DentalMedicalCard043uPayload, OutpatientMedicalCard025uPayload } from "@dental/shared";
import { useCallback, useMemo } from "react";

export function useDocumentPayloads(scope: any) {
    const {
        
    
    activeTreatmentPlanItems,
        dashboard,
        outpatient025uDoctorValue,
        outpatient025uVisitDateValue,
        documentPatient,
        recordExtractComplaintAndAnamnesisValue,
        visitNoteForm,
        recordExtractObjectiveStatusValue,
        recordExtractDiagnosisValue,
        recordExtractTreatmentProvidedValue,
        outpatient025uPatientSexCode,
        toDateInputValue,
        clinicProfileDraft,
        outpatient025uMedicalCardNumberValue,
        activeDoctor,
        clinicalToothRowsValue,
        outpatient025uSourceVisitIdsValue,
        outpatient025uLicenseValue,
        outpatient025uOpenedAt,
        recordExtractPeriodStart,
        recordExtractPeriodEnd,
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
        recordExtractRecommendations,
        outpatient025uFinalEpicrisis,
        confirmedDocumentLiteral,
        recordExtractPreparedFromSignedRecords,
        outpatient025uOfficialForm274nChecked,
        outpatient025uThirdPartyDataChecked,
    } = scope;

    function plannedServiceLinesForFinancialPayload() {
		return activeTreatmentPlanItems
			.filter((item) => item.status !== "cancelled")
			.filter(
				(item) =>
					!dashboard?.activeVisit?.id ||
					item.visitId === dashboard?.activeVisit?.id,
			)
			.map((item) => {
				const service = dashboard?.serviceCatalog?.find(
					(catalogItem) => catalogItem.id === item.serviceId,
				);
				const totalRub = Math.max(
					0,
					item.unitPriceRub * item.quantity - item.discountRub,
				);
				return {
					serviceName: service?.title ?? item.serviceId,
					toothOrArea: item.toothCode ? `зуб ${item.toothCode}` : null,
					quantity: item.quantity,
					unitPriceRub: item.unitPriceRub,
					discountRub: item.discountRub,
					totalRub,
				};
			});
	}

    function dentalMedicalCard043uPayloadValue(): DentalMedicalCard043uPayload {
		const doctor = outpatient025uDoctorValue();
		const visitDate = outpatient025uVisitDateValue();
		const patientProfile = documentPatient?.administrativeProfile;
		const complaintsAndAnamnesis = recordExtractComplaintAndAnamnesisValue();
		const complaintText =
			visitNoteForm.complaint.trim() ||
			complaintsAndAnamnesis.split(/\n{2,}/)[0]?.trim() ||
			"";
		const anamnesisText =
			visitNoteForm.anamnesis.trim() || complaintsAndAnamnesis || "";
		const objectiveText =
			visitNoteForm.objectiveStatus.trim() ||
			recordExtractObjectiveStatusValue() ||
			"";
		const diagnosisText =
			visitNoteForm.diagnosis.trim() || recordExtractDiagnosisValue() || "";
		const treatmentText =
			visitNoteForm.treatmentPlan.trim() ||
			recordExtractTreatmentProvidedValue() ||
			"";
		const sexRaw = (outpatient025uPatientSexCode ?? "")
			.toString()
			.toLowerCase();
		const sex =
			sexRaw === "female" ||
			sexRaw === "f" ||
			sexRaw === "жен" ||
			sexRaw === "женский"
				? "женский"
				: sexRaw === "male" ||
						sexRaw === "m" ||
						sexRaw === "муж" ||
						sexRaw === "мужской"
					? "мужской"
					: null;
		const birthDate = toDateInputValue(documentPatient?.birthDate) || null;
		const orgFullName =
			clinicProfileDraft?.legalName?.trim() ||
			clinicProfileDraft?.clinicName?.trim() ||
			"Стоматологическая клиника";
		const identityDocument = patientProfile?.identityDocument?.trim() || null;

		return {
			formNumber: "043/у",
			organization: {
				fullName: orgFullName,
				shortName: clinicProfileDraft?.clinicName?.trim() || null,
				address: clinicProfileDraft?.address?.trim() || null,
				phone: clinicProfileDraft?.phone?.trim() || null,
				ogrn: clinicProfileDraft?.ogrn?.trim() || null,
				inn: clinicProfileDraft?.inn?.trim() || null,
				licenseNumber: clinicProfileDraft?.medicalLicenseNumber?.trim() || null,
				licenseIssueDate:
					clinicProfileDraft?.medicalLicenseIssuedAt?.trim() || null,
				licenseAuthority:
					clinicProfileDraft?.medicalLicenseIssuer?.trim() || null,
			},
			patient: {
				fullName: documentPatient?.fullName?.trim() || "—",
				birthDate,
				sex,
				phone: documentPatient?.phone?.trim() || null,
				address:
					patientProfile?.registrationAddress?.trim() ||
					patientProfile?.residentialAddress?.trim() ||
					null,
				documentSeriesNumber: identityDocument,
				snils: patientProfile?.snils?.trim() || null,
				medicalCardNumber:
					documentPatient?.medicalCardNumber?.trim() ||
					documentPatient?.cardNumber?.trim() ||
					`043/у-${new Date().getFullYear()}-${documentPatient?.id?.slice(0, 8).toUpperCase() ?? "PATIENT"}`,
			},
			doctor: {
				fullName: doctor.fullName || activeDoctor?.fullName || "—",
				position: doctor.position || null,
				specialty: doctor.specialty || null,
			},
			visitDate,
			visitId: null,
			diaryId: null,
			complaint: complaintText || null,
			anamnesis: anamnesisText || null,
			structuredAnamnesis: null,
			statusLocalis: null,
			objectiveStatus: objectiveText || null,
			diagnosisIcd10: null,
			diagnosisTooth: null,
			diagnosisText: diagnosisText || null,
			treatmentDescription: treatmentText || null,
			treatmentPlan: treatmentText || null,
			complications: null,
			comorbidities: null,
			instrumentTrayBarcode: null,
			clinicalToothRows: clinicalToothRowsValue(),
			recommendations: null,
			nextVisitPlan: null,
			content: null,
			lockedAt: null,
			contentHash: null,
		};
	}

    function outpatient025uPayloadValue(): OutpatientMedicalCard025uPayload {
		return dentalMedicalCard043uPayloadValue();
	}

    return {
        plannedServiceLinesForFinancialPayload,
        dentalMedicalCard043uPayloadValue,
        outpatient025uPayloadValue,
    };
}
