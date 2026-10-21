import type { Patient } from "@dental/shared";
import { useDocumentStore } from "../../../store/documentStore";
import { showToast } from "../../GlobalToast";
import { printPrimaryIntakePackage } from "../primaryIntakePackagePrintEngine";

export interface FastPrintIntakeParams {
	patient?: Patient | null | undefined;
	clinicProfileDraft?: any;
	clinicName?: string | undefined;
	doctorName?: string | undefined;
}

export function executeFastPrintPrimaryIntake({
	patient,
	clinicProfileDraft,
	clinicName,
	doctorName,
}: FastPrintIntakeParams): void {
	const docStore = useDocumentStore.getState();
	// biome-ignore lint/suspicious/noExplicitAny: patient profile
	const p = patient as any;
	const adminProfile = p?.administrativeProfile;
	const repFullName =
		adminProfile?.legalRepresentativeFullName ||
		docStore.minorRepresentativeFullName;
	const representative = repFullName
		? {
				fullName: repFullName,
				relationship:
					adminProfile?.legalRepresentativeRelationship ||
					docStore.minorRepresentativeRelationship ||
					"Законный представитель",
				phone:
					adminProfile?.legalRepresentativePhone ||
					docStore.minorRepresentativePhone ||
					patient?.phone,
				passport:
					adminProfile?.legalRepresentativeIdentityDocument ||
					docStore.minorRepresentativeIdentityDocument,
				basisDocument:
					adminProfile?.legalRepresentativeBasisDocument ||
					docStore.minorRepresentativeAuthorityDocument,
			}
		: null;

	const clinicPrintPayload = clinicProfileDraft
		? {
				clinicName:
					clinicProfileDraft.clinicName || "Стоматологическая клиника",
				legalName:
					clinicProfileDraft.legalName || clinicProfileDraft.clinicName || "",
				inn: clinicProfileDraft.inn || "",
				kpp: clinicProfileDraft.kpp || "",
				ogrn: clinicProfileDraft.ogrn || "",
				licenseNumber: clinicProfileDraft.licenseNumber || "",
				licenseDate: clinicProfileDraft.licenseDate || "",
				address: clinicProfileDraft.address || "",
				phone: clinicProfileDraft.phone || "",
				directorFullName: clinicProfileDraft.directorFullName || "",
				city: clinicProfileDraft.city || "",
			}
		: {
				clinicName: clinicName || "Стоматологическая клиника",
				legalName: clinicName || "",
				directorFullName: "",
				city: "",
			};

	printPrimaryIntakePackage({
		patient: patient
			? {
					fullName: patient.fullName,
					birthDate: patient.birthDate,
					phone: patient.phone,
					snils: adminProfile?.snils || p?.snils,
					registrationAddress: adminProfile?.registrationAddress || p?.address,
					address: adminProfile?.registrationAddress || p?.address,
					passportSeries: adminProfile?.passportSeries,
					passportNumber: adminProfile?.passportNumber,
					passportIssuedBy: adminProfile?.passportIssuedBy,
					passportIssuedDate: adminProfile?.passportIssuedDate,
					passportDepartmentCode: adminProfile?.passportDepartmentCode,
					gender: p?.gender,
					cardNumber: p?.cardNumber,
				}
			: null,
		representative,
		clinic: clinicPrintPayload,
		doctorFullName: doctorName || null,
		intakeNormApplied: Boolean(docStore.intakeAccuracyConfirmed),
	});
	showToast(
		"✓ Пакет первичного приёма (Договор + ИДС + Персданные) отправлен на печать",
		"success",
		3500,
	);
}
