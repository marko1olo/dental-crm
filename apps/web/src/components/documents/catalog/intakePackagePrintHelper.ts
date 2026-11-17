import type { Patient } from "@dental/shared";
import type { DocumentClinicProfileRequisites } from "../tabs/formSwitch/documentFormSwitchTypes";
import { useDocumentStore } from "../../../store/documentStore";
import { showToast } from "../../GlobalToast";
import { printPrimaryIntakePackage } from "../primaryIntakePackagePrintEngine";

type PatientWithAdminFields = Partial<Patient> & {
	readonly administrativeProfile?: Record<string, unknown> | null | undefined;
	readonly address?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
	readonly snils?: string | null | undefined;
};

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
	const pAdmin = adminProfile as Record<string, unknown> | null | undefined;
	const repFullName =
		(typeof pAdmin?.legalRepresentativeFullName === "string" ? pAdmin.legalRepresentativeFullName : null) ||
		docStore.minorRepresentativeFullName;
	const representative = repFullName
		? {
				fullName: repFullName,
				relationship:
					(typeof pAdmin?.legalRepresentativeRelationship === "string" ? pAdmin.legalRepresentativeRelationship : null) ||
					docStore.minorRepresentativeRelationship ||
					"Законный представитель",
				phone:
					(typeof pAdmin?.legalRepresentativePhone === "string" ? pAdmin.legalRepresentativePhone : null) ||
					docStore.minorRepresentativePhone ||
					patient?.phone,
				passport:
					(typeof pAdmin?.legalRepresentativeIdentityDocument === "string" ? pAdmin.legalRepresentativeIdentityDocument : null) ||
					docStore.minorRepresentativeIdentityDocument,
				basisDocument:
					(typeof pAdmin?.legalRepresentativeBasisDocument === "string" ? pAdmin.legalRepresentativeBasisDocument : null) ||
					docStore.minorRepresentativeAuthorityDocument,
			}
		: null;

	const draft = clinicProfileDraft as Record<string, unknown> | DocumentClinicProfileRequisites | null | undefined;
	const draftRecord = (draft && typeof draft === "object" ? draft : null) as Record<string, unknown> | null;
	const clinicPrintPayload = draftRecord
		? {
				clinicName:
					(typeof draftRecord.clinicName === "string" && draftRecord.clinicName) || "Стоматологическая клиника",
				legalName:
					(typeof draftRecord.legalName === "string" && draftRecord.legalName) || (typeof draftRecord.clinicName === "string" && draftRecord.clinicName) || "",
				inn: typeof draftRecord.inn === "string" ? draftRecord.inn : "",
				kpp: typeof draftRecord.kpp === "string" ? draftRecord.kpp : "",
				ogrn: typeof draftRecord.ogrn === "string" ? draftRecord.ogrn : "",
				licenseNumber:
					(typeof draftRecord.licenseNumber === "string" && draftRecord.licenseNumber) ||
					(typeof draftRecord.medicalLicenseNumber === "string" && draftRecord.medicalLicenseNumber) ||
					"",
				licenseDate:
					(typeof draftRecord.licenseDate === "string" && draftRecord.licenseDate) ||
					(typeof draftRecord.medicalLicenseIssuedAt === "string" && draftRecord.medicalLicenseIssuedAt) ||
					"",
				address: typeof draftRecord.address === "string" ? draftRecord.address : "",
				phone: typeof draftRecord.phone === "string" ? draftRecord.phone : "",
				directorFullName: typeof draftRecord.directorFullName === "string" ? draftRecord.directorFullName : "",
				city: typeof draftRecord.city === "string" ? draftRecord.city : "",
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
					snils: (typeof pAdmin?.snils === "string" ? pAdmin.snils : null) || (typeof p?.snils === "string" ? p.snils : null),
					registrationAddress: (typeof pAdmin?.registrationAddress === "string" ? pAdmin.registrationAddress : null) || p?.address,
					address: (typeof pAdmin?.registrationAddress === "string" ? pAdmin.registrationAddress : null) || p?.address,
					passportSeries: typeof pAdmin?.passportSeries === "string" ? pAdmin.passportSeries : undefined,
					passportNumber: typeof pAdmin?.passportNumber === "string" ? pAdmin.passportNumber : undefined,
					passportIssuedBy: typeof pAdmin?.passportIssuedBy === "string" ? pAdmin.passportIssuedBy : undefined,
					passportIssuedDate: typeof pAdmin?.passportIssuedDate === "string" ? pAdmin.passportIssuedDate : undefined,
					passportDepartmentCode: typeof pAdmin?.passportDepartmentCode === "string" ? pAdmin.passportDepartmentCode : undefined,
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
