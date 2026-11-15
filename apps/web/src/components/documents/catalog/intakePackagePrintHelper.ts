import type { Patient } from "@dental/shared";
import type { DocumentClinicProfileRequisites } from "../tabs/formSwitch/documentFormSwitchTypes";
import { useDocumentStore } from "../../../store/documentStore";
import { showToast } from "../../GlobalToast";
import { printPrimaryIntakePackage } from "../primaryIntakePackagePrintEngine";

interface PatientAdministrativeProfile {
	readonly snils?: string | null | undefined;
	readonly registrationAddress?: string | null | undefined;
	readonly passportSeries?: string | null | undefined;
	readonly passportNumber?: string | null | undefined;
	readonly passportIssuedBy?: string | null | undefined;
	readonly passportIssuedDate?: string | null | undefined;
	readonly passportDepartmentCode?: string | null | undefined;
	readonly legalRepresentativeFullName?: string | null | undefined;
	readonly legalRepresentativeRelationship?: string | null | undefined;
	readonly legalRepresentativePhone?: string | null | undefined;
	readonly legalRepresentativeIdentityDocument?: string | null | undefined;
	readonly legalRepresentativeBasisDocument?: string | null | undefined;
}

interface PatientWithAdminFields extends Partial<Patient> {
	readonly administrativeProfile?: PatientAdministrativeProfile | null | undefined;
	readonly snils?: string | null | undefined;
	readonly address?: string | null | undefined;
	readonly gender?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
}

export interface FastPrintIntakeParams {
	patient?: Patient | null | undefined;
	clinicProfileDraft?: DocumentClinicProfileRequisites | Record<string, unknown> | null | undefined;
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
	const p = patient as PatientWithAdminFields | undefined;
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
