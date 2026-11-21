import type { ProstheticWarrantyPassport } from "@dental/shared";

export type { ProstheticWarrantyPassport };

export interface OrthopedicPassportData {
	readonly orderId?: string | undefined;
	readonly orderNumber?: string | undefined;
	readonly passportNumber?: string | undefined;
	readonly issueDate?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientChartNumber?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly technicianName?: string | undefined;
	readonly labName?: string | undefined;
	readonly toothFdi: string;
	readonly constructionName: string;
	readonly material: string;
	readonly colorVita: string;
	readonly stumpShade?: string | undefined;
	readonly preparationMarginLabel?: string | undefined;
	readonly fixationTypeLabel?: string | undefined;
	readonly warrantyMonths?: number | undefined;
	readonly warrantyLabelRu?: string | undefined;
	readonly batchLotNumber?: string | undefined;
	readonly standardsCompliance?: string | undefined;
	readonly careNotes?: readonly string[] | undefined;
	readonly integritySha256?: string | undefined;
	readonly canonicalPassport?: ProstheticWarrantyPassport | undefined;
}

export function normalizeToOrthopedicPassportData(
	input: OrthopedicPassportData | ProstheticWarrantyPassport,
): OrthopedicPassportData {
	if ("patientFullName" in input && "doctorFullName" in input) {
		const p = input as ProstheticWarrantyPassport;
		return {
			orderNumber: p.orderNumber,
			passportNumber: p.certificateNumber ? `ГП-${p.certificateNumber}` : `ГП-${p.orderNumber}`,
			patientName: p.patientFullName,
			doctorName: p.doctorFullName,
			clinicName: p.clinicName || "Стоматологическая клиника «DENTE»",
			technicianName: p.technicianLabName,
			labName: p.technicianLabName,
			toothFdi: p.toothFdi,
			constructionName: p.restorationType,
			material: p.frameworkMaterial,
			colorVita: p.shade,
			stumpShade: p.shadeStump ?? undefined,
			fixationTypeLabel: p.cementationProtocol,
			warrantyMonths: p.warrantyYears * 12,
			warrantyLabelRu: `${p.warrantyYears} ${p.warrantyYears === 1 ? "год" : p.warrantyYears < 5 ? "года" : "лет"}`,
			batchLotNumber: p.batchCode,
			standardsCompliance: `${p.gostStandard} · ${p.sanpinDisinfectionMark}`,
			issueDate: p.fixationDate,
			integritySha256: p.integritySha256,
			canonicalPassport: p,
		};
	}
	return input as OrthopedicPassportData;
}

export interface OrthopedicPassportA4ModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly passport: OrthopedicPassportData | ProstheticWarrantyPassport;
}
