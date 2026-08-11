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
				medicalCardNumber: outpatient025uMedicalCardNumberValue() || null,
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
		const patientProfile = documentPatient?.administrativeProfile;
		const doctor = outpatient025uDoctorValue();
		const sourceVisitIds = outpatient025uSourceVisitIdsValue();
		const visitDate = outpatient025uVisitDateValue();
		const complaintsAndAnamnesis = recordExtractComplaintAndAnamnesisValue();
		const treatmentProvided = recordExtractTreatmentProvidedValue();
		return {
			formNumber: "025/у",
			sourceOrderReference: "Приказ Минздрава России от 13.05.2025 N 274н",
			medicalOrganizationName:
				clinicProfileDraft?.legalName?.trim() ||
				clinicProfileDraft?.clinicName?.trim() ||
				"",
			medicalOrganizationAddress: clinicProfileDraft?.address?.trim() || null,
			medicalOrganizationOgrnOrOgrnip: clinicProfileDraft?.ogrn?.trim() || null,
			medicalOrganizationLicense: outpatient025uLicenseValue(),
			medicalCardNumber: outpatient025uMedicalCardNumberValue(),
			openedAt: outpatient025uOpenedAt.trim(),
			periodStart: recordExtractPeriodStart.trim(),
			periodEnd: recordExtractPeriodEnd.trim(),
			sourceVisitIds,
			patientFullName: documentPatient?.fullName ?? "",
			patientBirthDate: toDateInputValue(documentPatient?.birthDate) || null,
			patientSexCode: outpatient025uPatientSexCode,
			citizenship: outpatient025uCitizenship.trim() || null,
			identityDocument: patientProfile?.identityDocument?.trim() || null,
			identityDocumentSeries: null,
			identityDocumentNumber: null,
			patientPhone: documentPatient?.phone?.trim() || null,
			patientEmail: documentPatient?.email?.trim() || null,
			registrationAddress: patientProfile?.registrationAddress?.trim() || null,
			registrationUrbanRuralCode: outpatient025uRegistrationUrbanRuralCode,
			stayAddress: patientProfile?.residentialAddress?.trim() || null,
			stayUrbanRuralCode: outpatient025uStayUrbanRuralCode,
			omsPolicy: patientProfile?.insurancePolicyNumber?.trim() || null,
			omsIssuedAt: outpatient025uOmsIssuedAt.trim() || null,
			insurerName: outpatient025uInsurerName.trim() || null,
			snils: patientProfile?.snils?.trim() || null,
			socialSupportCode: outpatient025uSocialSupportCode.trim() || null,
			healthStatusDisclosureContact:
				outpatient025uHealthStatusDisclosureContact.trim() || null,
			employmentCode: outpatient025uEmploymentCode.trim() || null,
			disabilityGroup: outpatient025uDisabilityGroup.trim() || null,
			workOrStudyPlace: outpatient025uWorkOrStudyPlace.trim() || null,
			palliativeCareNeedCode:
				outpatient025uPalliativeCareNeedCode.trim() || null,
			bloodGroup: outpatient025uBloodGroup.trim() || null,
			rhFactor: outpatient025uRhFactor.trim() || null,
			kellK1: outpatient025uKellK1.trim() || null,
			otherBloodData: outpatient025uOtherBloodData.trim() || null,
			allergyHistory: outpatient025uAllergyHistory.trim() || null,
			chronicDispensaryRegister: [],
			finalDiagnoses: [
				{
					date: visitDate,
					diagnosis: recordExtractDiagnosisValue(),
					icd10Code: null,
					firstOrRepeat: "unknown",
					doctorFullName: doctor.fullName,
					doctorPosition: doctor.position,
					doctorSpecialty: doctor.specialty,
				},
			],
			specialistVisitRecords: [
				{
					sourceVisitId: sourceVisitIds[0] ?? "",
					visitDate,
					location: clinicProfileDraft?.clinicName?.trim() || null,
					doctorFullName: doctor.fullName,
					doctorPosition: doctor.position,
					doctorSpecialty: doctor.specialty,
					firstOrRepeat: "unknown",
					complaints: complaintsAndAnamnesis,
					anamnesis: complaintsAndAnamnesis,
					objectiveData: recordExtractObjectiveStatusValue(),
					primaryDiagnosis: recordExtractDiagnosisValue(),
					primaryDiagnosisIcd10: null,
					complications: null,
					comorbidities: null,
					externalCause: null,
					healthGroup: null,
					dispensaryObservation: null,
					orders: recordExtractRecommendations.trim() || treatmentProvided,
					treatmentProvided,
					medicinesAndPhysiotherapy: null,
					sickLeaveOrCertificate: null,
					preferentialPrescriptions: null,
					informedConsentOrRefusal:
						"согласия и отказы проверены по подписанной медицинской записи клиники",
					clinicalToothRows: clinicalToothRowsValue(),
				},
			],
			dynamicObservationRecords: [],
			stageEpicrisisRecords: [],
			departmentHeadConsultations: [],
			medicalCommissionRecords: [],
			dispensaryObservationEntries: [],
			hospitalizationRows: [],
			ambulatorySurgeryRows: [],
			xrayDoseRows: [],
			functionalResults: [],
			laboratoryResults: [],
			finalEpicrisis: outpatient025uFinalEpicrisis.trim() || null,
			preparedFromSignedMedicalRecords: confirmedDocumentLiteral(
				recordExtractPreparedFromSignedRecords,
				"карта 025/у собрана из подписанных медицинских записей",
			),
			officialForm274nChecked: confirmedDocumentLiteral(
				outpatient025uOfficialForm274nChecked,
				"структура карты 025/у сверена с приказом Минздрава N 274н",
			),
			thirdPartyDataChecked: confirmedDocumentLiteral(
				outpatient025uThirdPartyDataChecked,
				"данные третьих лиц для карты 025/у проверены",
			),
		};
	}

    return {
        plannedServiceLinesForFinancialPayload,
        dentalMedicalCard043uPayloadValue,
        outpatient025uPayloadValue,
    };
}
