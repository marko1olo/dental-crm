import {
	getChemicalIndicatorDefinition,
	getDentalToolSetDefinition,
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
} from "./kraftPackagePresets.js";
import {
	formatKraftDataMatrixPayload,
	generate1DBarcodeString,
} from "./kraftPackageBarcodes.js";
import { calculatePackageExpiration } from "./kraftPackageExpiry.js";
import type { KraftBatchOptions, KraftPackageRecord } from "./kraftPackageTypes.js";

export function generateKraftBatchRecords(options: KraftBatchOptions): KraftPackageRecord[] {
	const quantity = Math.max(1, Math.min(100, options.quantity));
	const now = new Date();
	const packDateStr = options.customPackDate || now.toISOString();

	const expResult = calculatePackageExpiration(packDateStr, options.packageType, now);
	const toolSet = getDentalToolSetDefinition(options.toolSetId);
	const material = getKraftMaterialDefinition(options.packageType);
	const sizeDef = getKraftSizeDefinition(options.packageSize);
	const indicator = getChemicalIndicatorDefinition(options.indicatorId || "vinar_steritest_4");

	const batchId =
		options.customBatchId ||
		`KB-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${String(options.cycleNumber).padStart(2, "0")}`;

	const itemsList =
		options.customItems && options.customItems.length > 0
			? options.customItems
			: toolSet.typicalItemsRu;

	const records: KraftPackageRecord[] = [];

	for (let i = 1; i <= quantity; i++) {
		const serialNumber = i;
		const barcode128 = generate1DBarcodeString(batchId, serialNumber);
		const dataMatrixPayload = formatKraftDataMatrixPayload({
			batchId,
			autoclaveId: options.autoclaveId,
			cycleNumber: options.cycleNumber,
			packDate: expResult.packDateFormatted,
			expDate: expResult.expDateFormatted,
			operatorId: options.operatorId || "NURSE-01",
			toolSetId: toolSet.shortCode,
			serialNumber,
		});

		const record: KraftPackageRecord = {
			id: `kp-${batchId.toLowerCase()}-${String(serialNumber).padStart(3, "0")}`,
			batchId,
			serialNumber,
			packageType: options.packageType,
			packageSize: options.packageSize,
			toolSetId: toolSet.id,
			toolSetNameRu: toolSet.nameRu,
			itemsListRu: [...itemsList],
			packDate: expResult.packDateFormatted,
			expDate: expResult.expDateFormatted,
			daysLifespan: expResult.daysLifespan,
			daysRemaining: expResult.daysRemaining,
			status: expResult.status,
			autoclaveId: options.autoclaveId,
			cycleNumber: options.cycleNumber,
			operatorId: options.operatorId || "NURSE-01",
			operatorName: options.operatorName || "Персонал клиники",
			indicatorId: indicator.id,
			indicatorVerified: options.indicatorVerified ?? true,
			barcode128,
			barcodeDataMatrixPayload: dataMatrixPayload,
			isBreached: false,
			notes: options.notes || `Партия ${material.shortLabelRu}, размер ${sizeDef.dimensionsMmRu}`,
			createdAt: now.toISOString(),
		};

		records.push(record);
	}

	return records;
}
