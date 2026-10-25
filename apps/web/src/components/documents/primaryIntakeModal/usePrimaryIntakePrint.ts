import type { Patient } from "@dental/shared";
import { useDocumentStore } from "../../../store/documentStore";
import { showToast } from "../../GlobalToast";
import { printPrimaryIntakePackage } from "../primaryIntakePackagePrintEngine";

interface UsePrimaryIntakePrintProps {
	patient: Patient | null;
	clinicProfileDraft?: any | undefined;
	doctorFullName?: string | null | undefined;
	isNormApplied: boolean;
}

function resolveClinicPrintPayload(c?: any) {
	return {
		clinicName: c?.clinicName || "Стоматологическая клиника",
		legalName: c?.legalName || c?.clinicName || "",
		fullName: c?.legalName || c?.clinicName || "",
		shortName: c?.clinicName || "",
		inn: c?.inn || "",
		kpp: c?.kpp || "",
		ogrn: c?.ogrn || "",
		licenseNumber: c?.licenseNumber || "",
		licenseDate: c?.licenseDate || "",
		address: c?.address || "",
		actualAddress: c?.address || "",
		phone: c?.phone || "",
		directorTitle: c?.directorTitle || "Руководитель",
		directorFullName: c?.directorFullName || "",
		city: c?.city || "",
		website: c?.website || "",
	};
}

export function usePrimaryIntakePrint({
	patient,
	clinicProfileDraft,
	doctorFullName,
	isNormApplied,
}: UsePrimaryIntakePrintProps) {
	const clinicPrintPayload = resolveClinicPrintPayload(clinicProfileDraft);

	const handleBatchPrint = () => {
		const store = useDocumentStore.getState();
		const adminProfile = (patient as any)?.administrativeProfile;
		const repFullName = adminProfile?.legalRepresentativeFullName || store.minorRepresentativeFullName;
		const representative = repFullName
			? {
					fullName: repFullName,
					relationship: adminProfile?.legalRepresentativeRelationship || store.minorRepresentativeRelationship || "Законный представитель",
					phone: adminProfile?.legalRepresentativePhone || store.minorRepresentativePhone || patient?.phone,
					passport: adminProfile?.legalRepresentativeIdentityDocument || store.minorRepresentativeIdentityDocument,
					basisDocument: adminProfile?.legalRepresentativeBasisDocument || store.minorRepresentativeAuthorityDocument,
				}
			: null;

		printPrimaryIntakePackage({
			patient: patient
				? {
						fullName: patient.fullName,
						birthDate: patient.birthDate,
						phone: patient.phone,
						snils: (patient as any)?.administrativeProfile?.snils || (patient as any)?.snils,
						registrationAddress: (patient as any)?.administrativeProfile?.registrationAddress || (patient as any)?.address,
						address: (patient as any)?.administrativeProfile?.registrationAddress || (patient as any)?.address,
						passportSeries: (patient as any)?.administrativeProfile?.passportSeries,
						passportNumber: (patient as any)?.administrativeProfile?.passportNumber,
						passportIssuedBy: (patient as any)?.administrativeProfile?.passportIssuedBy,
						passportIssuedDate: (patient as any)?.administrativeProfile?.passportIssuedDate,
						passportDepartmentCode: (patient as any)?.administrativeProfile?.passportDepartmentCode,
						gender: (patient as any)?.gender,
						cardNumber: (patient as any)?.cardNumber,
					}
				: null,
			representative,
			clinic: clinicPrintPayload,
			doctorFullName: doctorFullName || null,
			intakeNormApplied: isNormApplied || Boolean(store.intakeAccuracyConfirmed),
			questionnaireAnswers: {
				complaint: store.intakeChiefComplaint,
				allergies: store.intakeAllergyStatus,
				medications: store.intakeCurrentMedications,
				chronic: store.intakeChronicConditions,
				anticoagulants: store.intakeAnticoagulants,
				infections: store.intakeInfectiousRiskNotes,
				cardioEndocrine: store.intakeCardioEndocrineNotes,
				pregnancy: store.intakePregnancyStatus,
			},
		});
		showToast("Первичный пакет документов (Договор, Согласие ИДС, Персональные данные, Анкета здоровья) отправлен на печать", "success", 4000);
	};

	const handlePrintBlankPackage = () => {
		printPrimaryIntakePackage({
			patient: null,
			representative: null,
			clinic: clinicPrintPayload,
			doctorFullName: doctorFullName || null,
			intakeNormApplied: false,
		});
		showToast("Чистый первичный пакет («________») отправлен на печать", "info", 4000);
	};

	return {
		clinicPrintPayload,
		handleBatchPrint,
		handlePrintBlankPackage,
	};
}
