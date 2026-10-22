import {
	CLASS_B_WEIGHT_ESTIMATES,
	calculateClassBWasteWeightKg,
	roundQuantity,
} from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import type {
	ShiftCloseClassBWasteInput,
	ShiftCloseClassBWasteResult,
} from "./classBWasteTypes.js";
import { generateDeterministicWasteActIdentifiers } from "./classBWasteIdentifiers.js";
import { formatShiftCloseClassBWasteActHtml } from "./classBWasteHtmlFormat.js";
import { syncMedicalWasteRegister } from "./classBWasteRegisterSync.js";

/**
 * 1-Click Batch Class B Waste Disposal at Shift Close (СанПиН 2.1.3684-21).
 */
export async function executeShiftCloseClassBWasteDisposal(
	input: ShiftCloseClassBWasteInput,
): Promise<ShiftCloseClassBWasteResult> {
	const now = new Date();
	const actDate = input.shiftDate || now.toISOString().slice(0, 10);
	const identifiers = generateDeterministicWasteActIdentifiers(actDate);
	const actNumber = identifiers.actNumber;
	const sealNumber = identifiers.sealNumber;
	const barcode = identifiers.barcode;

	const carpulesCount = Math.max(0, input.accumulatedCarpulesCount);
	const brokenCarpulesCount = Math.max(0, input.brokenCarpulesCount ?? 0);
	const partiallyUsedCarpulesCount = Math.max(0, input.partiallyUsedCarpulesCount ?? 0);
	const needlesCount = Math.max(0, input.accumulatedNeedlesCount);
	const sharpsCount = Math.max(0, input.accumulatedSharpsCount ?? 0);
	const contaminatedCount = Math.max(0, input.contaminatedItemsCount ?? 0);

	const tareWeightKg = input.customTareKg !== undefined ? input.customTareKg : CLASS_B_WEIGHT_ESTIMATES.standardPunctureContainerTareKg;
	const netWeightKg = calculateClassBWasteWeightKg(carpulesCount, needlesCount + sharpsCount, contaminatedCount);
	const grossWeightKg = roundQuantity(netWeightKg + tareWeightKg, 3);

	const pos = input.responsibleStaffPosition || "Медицинская сестра / Врач";
	const clinic = input.clinicName || "Стоматологическая клиника «DENTE»";
	const disinfectionProtocol =
		input.disinfectionProtocol ||
		"Химическая дезинфекция 3% Аламинол (замачивание 60 мин) / автоклавирование 134°C (СанПиН 2.1.3684-21 и СанПиН 3.3686-21)";

	const actHtml = formatShiftCloseClassBWasteActHtml(
		actNumber, actDate, sealNumber, barcode, carpulesCount, needlesCount, sharpsCount,
		grossWeightKg, tareWeightKg, netWeightKg, input.responsibleStaffName, pos, clinic,
		{ brokenCarpulesCount, partiallyUsedCarpulesCount, disinfectionProtocol, cabinetId: input.cabinetId, chairId: input.chairId },
	);

	const brokenNotice = brokenCarpulesCount > 0 ? ` (из них бой: ${brokenCarpulesCount} шт.)` : "";
	const partialNotice = partiallyUsedCarpulesCount > 0 ? ` (неполные: ${partiallyUsedCarpulesCount} шт.)` : "";
	const toastMessage = `Сдача отходов Класса Б: ${carpulesCount} карпул${brokenNotice}${partialNotice}, ${needlesCount + sharpsCount} игл (${netWeightKg} кг) внесены в журнал СанПиН 2.1.3684-21 (Пломба ${sealNumber}).`;

	if (input.onToast) input.onToast(toastMessage, "success");
	else showToast(toastMessage, "success");

	await syncMedicalWasteRegister(input.fetchFn, {
		actDate, netWeightKg, cabinetId: input.cabinetId, chairId: input.chairId,
		totalCarpulesCount: carpulesCount, brokenCarpulesCount, partiallyUsedCarpulesCount,
		totalSharpsCount: needlesCount + sharpsCount, responsibleStaffName: input.responsibleStaffName,
		actNumber, sealNumber,
	});

	return {
		success: true, actNumber, actDate, sealNumber, barcode, wasteClass: "class_B", packageType: "yellow_container_sharps",
		packageCount: 1, grossWeightKg, tareWeightKg, netWeightKg, totalCarpulesCount: carpulesCount,
		brokenCarpulesCount, partiallyUsedCarpulesCount, totalSharpsCount: needlesCount + sharpsCount,
		responsibleStaffName: input.responsibleStaffName, responsibleStaffPosition: pos, singlePersonApproval: true,
		disinfectionProtocol, cabinetId: input.cabinetId, chairId: input.chairId, actHtml, toastMessage,
	};
}
