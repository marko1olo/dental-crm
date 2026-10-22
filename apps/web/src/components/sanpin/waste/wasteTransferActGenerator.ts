import type { MedicalWasteClassId } from "./medicalWastePresets.js";
import type { MedicalWasteJournalRecord, MedicalWasteTransferAct } from "./types";

export function generateMedicalWasteTransferAct(params: {
	actNumber: string;
	actDate?: string | undefined;
	records: readonly MedicalWasteJournalRecord[];
	clinicInfo?: {
		name?: string | undefined;
		inn?: string | undefined;
		ogrn?: string | undefined;
		address?: string | undefined;
		responsiblePerson?: string | undefined;
		responsiblePosition?: string | undefined;
	} | undefined;
	disposalCompanyInfo?: {
		name?: string | undefined;
		inn?: string | undefined;
		licenseNumber?: string | undefined;
		contractNumber?: string | undefined;
		contractDate?: string | undefined;
		driverFullName?: string | undefined;
		vehiclePlateNumber?: string | undefined;
	} | undefined;
}): MedicalWasteTransferAct {
	const actDate = params.actDate || new Date().toISOString().slice(0, 10);

	const defaultClinic = {
		name: params.clinicInfo?.name || "Стоматологическая клиника",
		inn: params.clinicInfo?.inn || "",
		ogrn: params.clinicInfo?.ogrn || "",
		address: params.clinicInfo?.address || "",
		responsiblePerson: params.clinicInfo?.responsiblePerson || "Главная медицинская сестра",
		responsiblePosition: params.clinicInfo?.responsiblePosition || "Главная медицинская сестра",
	};

	const defaultDisposal = {
		name: params.disposalCompanyInfo?.name || "Специализированная организация по утилизации",
		inn: params.disposalCompanyInfo?.inn || "",
		licenseNumber: params.disposalCompanyInfo?.licenseNumber || "",
		contractNumber: params.disposalCompanyInfo?.contractNumber || "",
		contractDate: params.disposalCompanyInfo?.contractDate || "",
		driverFullName: params.disposalCompanyInfo?.driverFullName || "Водитель-экспедитор",
		vehiclePlateNumber: params.disposalCompanyInfo?.vehiclePlateNumber || "",
	};

	const totalsByClass: Record<MedicalWasteClassId, { count: number; totalNetWeightKg: number; totalGrossWeightKg: number }> = {
		class_A: { count: 0, totalNetWeightKg: 0, totalGrossWeightKg: 0 },
		class_B: { count: 0, totalNetWeightKg: 0, totalGrossWeightKg: 0 },
		class_V: { count: 0, totalNetWeightKg: 0, totalGrossWeightKg: 0 },
		class_G: { count: 0, totalNetWeightKg: 0, totalGrossWeightKg: 0 },
	};

	let totalNetWeightKg = 0;
	let totalPackagesCount = 0;

	for (const rec of params.records) {
		const entry = totalsByClass[rec.wasteClass];
		if (entry) {
			entry.count += rec.packageCount;
			entry.totalNetWeightKg = Math.round((entry.totalNetWeightKg + rec.netWeightKg) * 100) / 100;
			entry.totalGrossWeightKg = Math.round((entry.totalGrossWeightKg + rec.grossWeightKg) * 100) / 100;
		}
		totalNetWeightKg = Math.round((totalNetWeightKg + rec.netWeightKg) * 100) / 100;
		totalPackagesCount += rec.packageCount;
	}

	return {
		actNumber: params.actNumber, actDate, clinicInfo: defaultClinic,
		disposalCompanyInfo: defaultDisposal, transferredRecords: params.records,
		totalsByClass, totalNetWeightKg, totalPackagesCount,
	};
}
