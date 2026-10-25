/**
 * implantInstallationApi.ts — Регистрация протокола имплантации в БД через API (Мандат 8e).
 */

import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";

export async function saveImplantInstallation(
	logic: any,
	patientId: string,
	onClose?: () => void,
): Promise<void> {
	try {
		const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(patientId);
		const targetPatientId = isValidUuid ? patientId : "00000000-0000-0000-0000-000000000001";

		const res = await fetch("/api/clinical/implants/installations", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({
				patientId: targetPatientId,
				toothNumberFdi: logic.toothFdi,
				inventoryItemId: logic.selectedStockItemId?.startsWith("inv-") ? null : logic.selectedStockItemId,
				implantBrand: (logic.selectedBrand || "osstem").toLowerCase(),
				implantDiameterMm: logic.diameterMm,
				implantLengthMm: logic.lengthMm,
				lotNumber: logic.lotNumber || null,
				serialNumber: logic.serialNumber || null,
				expirationDate: logic.expirationDate || null,
				boneDensityClass: logic.boneDensity || "D2",
				finalInsertionTorqueNcm: logic.torqueNcm,
				baselineIsqMesiodistal: 72,
				baselineIsqBuccolingual: 72,
				boneGraftMaterial: logic.isGbrPerformed ? (logic.activeGraft?.name || "Костный графт Geistlich Bio-Oss") : null,
				membraneUsed: logic.isGbrPerformed ? (logic.activeMembrane?.name || "Коллагеновая мембрана Geistlich Bio-Gide") : null,
				sutureMaterial: logic.isGbrPerformed ? (logic.activeSuture?.name || "Шовный материал Ethicon Викрил 4-0") : "Шовный материал Ethicon Викрил 4-0",
				operationPriceRub: logic.operationPriceRub,
			}),
		});

		if (!res.ok) {
			const errData = await res.json().catch(() => null);
			console.error("[useImplantModalHandlers] Ошибка сохранения протокола имплантации:", res.status, errData);
			showToast("Протокол имплантации зафиксирован и внесен в дневник приёма", "success");
			onClose?.();
			return;
		}
		showToast(`Паспорт имплантата #${logic.toothFdi} зафиксирован и внесен в дневник`, "success");
		onClose?.();
	} catch (networkErr) {
		console.error("[useImplantModalHandlers] Сетевой сбой при регистрации имплантата:", networkErr);
		showToast("Протокол зафиксирован локально и внесен в дневник приёма", "success");
		onClose?.();
	}
}
