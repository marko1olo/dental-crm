import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	getBoneDensityByToothFdi,
	parseImplantBarcode,
	parseStockDimensions,
	type ImplantWarehouseStockItem,
} from "../implantQuickPresets";

export function useImplantModalHandlers(
	logic: any,
	patientId: string,
	onSavePassport?: (data: any) => void,
	onInsertIntoDiary?: (diaryText: string) => void,
	onClose?: () => void,
) {
	const handleToothSelect = (tooth: number) => {
		logic.setToothFdi(tooth);
		const computedDensity = getBoneDensityByToothFdi(tooth);
		logic.setBoneDensity(computedDensity);
		logic.setDiameterMm(4.0);
		logic.setLengthMm(10.0);
		logic.setTorqueNcm(computedDensity === "D1" ? 40 : 35);
	};

	const handleBrandSelect = (brand: string) => {
		logic.setSelectedBrand(brand);
		const found = FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === brand);
		if (found) {
			logic.setDiameterMm(found.defaultDiameterMm);
			logic.setLengthMm(found.defaultLengthMm);
			logic.setTorqueNcm(found.defaultTorqueNcm);
			logic.setCatalogArticle(brand === "Osstem" ? "TS3S4010S" : brand === "Dentium" ? "FX4010" : brand === "Straumann" ? "021.2310" : brand === "Ankylos" ? "A-B110-CX" : brand === "Astra Tech" ? "EV-42110" : brand === "Nobel Biocare" ? "NP-35115" : `${brand.slice(0, 3).toUpperCase()}-4010`);
		}
	};

	const handleSelectStockItem = (item: ImplantWarehouseStockItem) => {
		logic.setSelectedStockItemId(item.id);
		if (item.lotNumber) logic.setLotNumber(item.lotNumber);
		if (item.sku) logic.setCatalogArticle(item.sku);
		if (item.expirationDate) logic.setExpirationDate(item.expirationDate);
		const parsedDims = parseStockDimensions(item.name);
		if (parsedDims.brand) logic.setSelectedBrand(parsedDims.brand);
		if (parsedDims.diameterMm) logic.setDiameterMm(parsedDims.diameterMm);
		if (parsedDims.lengthMm) logic.setLengthMm(parsedDims.lengthMm);
	};

	const handleApplyStandardProtocol = () => {
		handleToothSelect(logic.toothFdi);
		logic.setCapType("fdm");
		logic.setIsGbrPerformed(false);
		logic.setTorqueNcm(35);
		logic.setIsIsqEnabled(true);
		logic.setIsqValue(72);
		showToast("Применен стандартный протокол: торк 35 Н·см, ISQ 72, ФДМ", "success");
	};

	const handleApplyImmediateProtocol = () => {
		logic.setCapType("fdm");
		logic.setIsGbrPerformed(false);
		logic.setTorqueNcm(45);
		logic.setIsIsqEnabled(true);
		logic.setIsqValue(75);
		logic.setDiameterMm(4.5);
		logic.setLengthMm(11.5);
		showToast("Применен протокол одномоментной имплантации: немедленная нагрузка (45 Н·см, ISQ 75)", "success");
	};

	const handleApplyTwoStageProtocol = () => {
		logic.setCapType("plug");
		logic.setIsGbrPerformed(false);
		logic.setTorqueNcm(35);
		logic.setIsIsqEnabled(true);
		logic.setIsqValue(68);
		showToast("Применен двухэтапный протокол: винт-заглушка с ушиванием раны наглухо (35 Н·см)", "success");
	};

	const handleApplyGbrProtocol = () => {
		logic.setCapType("plug");
		logic.setIsGbrPerformed(true);
		logic.setTorqueNcm(35);
		logic.setIsIsqEnabled(true);
		logic.setIsqValue(70);
		showToast("Применен протокол с костной пластикой НКР (GBR): Bio-Oss + Bio-Gide", "success");
	};

	const handleApplyBarcode = (customBarcode?: string) => {
		const raw = (customBarcode !== undefined ? customBarcode : logic.scannedBarcode).trim();
		if (!raw) return;
		const parsed = parseImplantBarcode(raw);
		if (parsed.article) logic.setCatalogArticle(parsed.article);
		if (parsed.lot) logic.setLotNumber(parsed.lot);
		if (parsed.serial) logic.setSerialNumber(parsed.serial);
		if (parsed.expirationDate) logic.setExpirationDate(parsed.expirationDate);
		showToast("Штрихкод упаковки распознан", "success");
	};

	const generateDiaryText = () => `ПАСПОРТ ИМПЛАНТАТА (Зуб FDI #${logic.toothFdi}):\nУстановлен: ${logic.assembledData.brand} ${logic.assembledData.model} Ø ${logic.assembledData.diameterMm} x ${logic.assembledData.lengthMm} мм.\nТорк: ${logic.assembledData.torqueNcm} Н·см. ISQ: ${logic.isIsqEnabled ? logic.isqValue : 72}.\nLOT: ${logic.assembledData.lotNumber}, SN: ${logic.assembledData.serialNumber}.${logic.isGbrPerformed ? `\nНКР (GBR): графт ${logic.activeGraft?.name || "Bio-Oss"}, мембрана ${logic.activeMembrane?.name || "Bio-Gide"}.` : ""}`;

	const handleSaveAndInsertDiary = async () => {
		onSavePassport?.(logic.assembledData);
		const diary = generateDiaryText();
		onInsertIntoDiary?.(diary);
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
					baselineIsqMesiodistal: logic.isIsqEnabled ? Math.round(logic.isqValue) : 72,
					baselineIsqBuccolingual: logic.isIsqEnabled ? Math.round(logic.isqValue) : 72,
					boneGraftMaterial: logic.isGbrPerformed ? (logic.activeGraft?.name || "Костный графт Geistlich Bio-Oss") : null,
					membraneUsed: logic.isGbrPerformed ? (logic.activeMembrane?.name || "Коллагеновая мембрана Geistlich Bio-Gide") : null,
					sutureMaterial: logic.isGbrPerformed ? (logic.activeSuture?.name || "Шовный материал Ethicon Викрил 4-0") : null,
					operationPriceRub: logic.operationPriceRub,
				}),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => null);
				console.error("[useImplantModalHandlers] Ошибка сохранения протокола имплантации:", res.status, errData);
				const errorMsg = (errData as { message?: string })?.message || `Ошибка сервера (HTTP ${res.status})`;
				showToast(`Предупреждение: ${errorMsg}`, "error");
				return;
			}
			showToast(`Паспорт имплантата #${logic.toothFdi} сохранен в базу и внесен в дневник`, "success");
			onClose?.();
		} catch (networkErr) {
			console.error("[useImplantModalHandlers] Сетевой сбой при регистрации имплантата:", networkErr);
			showToast("Сетевой сбой при сохранении в базу. Черновик внесен в дневник.", "warning");
			onClose?.();
		}
	};

	return {
		handleToothSelect, handleBrandSelect, handleSelectStockItem,
		handleApplyStandardProtocol, handleApplyImmediateProtocol,
		handleApplyTwoStageProtocol, handleApplyGbrProtocol,
		handleApplyBarcode, generateDiaryText, handleSaveAndInsertDiary,
	};
}
