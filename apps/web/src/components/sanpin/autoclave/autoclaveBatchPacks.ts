import {
	type AutoclavePackagingType,
	getPackagingRule,
} from "./autoclavePresets";
import { generateSanpinBarcode } from "./autoclaveBarcodeFormat";
import type { SterilePackRecord } from "./autoclaveEngineTypes";
import { computePackExpiryDate } from "./autoclaveExpiryEngine";

function formatDigits(num: number, digits: number): string {
	return String(num).padStart(digits, "0");
}

export function generateSterileBatchPacks(params: {
	autoclaveId: string;
	cycleNumber: number;
	packagingType: AutoclavePackagingType;
	packCount: number;
	itemCategoryRu: string;
	itemsListRu: string[];
	operatorName: string;
	operatorStaffId?: string;
	sterilizationDate?: Date | string;
}): SterilePackRecord[] {
	const {
		autoclaveId,
		cycleNumber,
		packagingType,
		packCount,
		itemCategoryRu,
		itemsListRu,
		operatorName,
		operatorStaffId,
		sterilizationDate = new Date(),
	} = params;

	const sDate = typeof sterilizationDate === "string" ? new Date(sterilizationDate) : sterilizationDate;
	const expiry = computePackExpiryDate(packagingType, sDate);
	const packRule = getPackagingRule(packagingType);

	const records: SterilePackRecord[] = [];
	for (let i = 1; i <= packCount; i++) {
		const packId = formatDigits(i, 3);
		const barcode = generateSanpinBarcode(autoclaveId, cycleNumber, sDate, packId);

		records.push({
			barcode,
			packId,
			autoclaveId,
			cycleNumber,
			sterilizationDate: sDate.toISOString(),
			expirationDate: expiry.expiryDate.toISOString(),
			packagingType,
			packagingNameRu: packRule.nameRu,
			itemCategoryRu,
			itemsListRu,
			operatorName,
			operatorStaffId,
			status: "sterile",
			isBreached: false,
		});
	}

	return records;
}
