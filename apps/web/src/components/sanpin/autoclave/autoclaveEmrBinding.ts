import type {
	PatientSterileUsageRecord,
	SterilePackRecord,
} from "./autoclaveEngineTypes";
import { evaluatePackStatus } from "./autoclaveExpiryEngine";

export function bindPackToPatientRecord(
	pack: SterilePackRecord,
	patientId: string,
	patientName: string,
	doctorName: string,
	visitDate: string = new Date().toISOString().slice(0, 10),
): { success: boolean; record?: PatientSterileUsageRecord; error?: string } {
	const currentStatus = evaluatePackStatus(pack.sterilizationDate, pack.packagingType, pack.isBreached);

	if (currentStatus === "expired") {
		return {
			success: false,
			error: `Запрещено СанПиН: Срок стерильности пакета ${pack.barcode} истек (${pack.expirationDate.slice(0, 10)}). Пакет подлежит повторной стерилизации.`,
		};
	}

	if (currentStatus === "breached") {
		return {
			success: false,
			error: `Запрещено СанПиН: Нарушена герметичность упаковки ${pack.barcode}.`,
		};
	}

	const usageRecord: PatientSterileUsageRecord = {
		packBarcode: pack.barcode,
		patientId,
		patientName,
		doctorName,
		nurseName: pack.operatorName,
		visitDate,
		verifiedSterile: true,
		recordedAtIso: new Date().toISOString(),
	};

	return {
		success: true,
		record: usageRecord,
	};
}
