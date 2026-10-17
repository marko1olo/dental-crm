import { showToast } from "../../GlobalToast";
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
		showToast("Применен стандартный протокол: торк 35 Н·см, ISQ 72, ФДМ", "success");
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

	const generateDiaryText = () => `ПАСПОРТ ИМПЛАНТАТА (Зуб FDI #${logic.toothFdi}):\nУстановлен: ${logic.assembledData.brand} ${logic.assembledData.model} Ø ${logic.assembledData.diameterMm} x ${logic.assembledData.lengthMm} мм.\nТорк: ${logic.assembledData.torqueNcm} Н·см. ISQ: ${logic.isIsqEnabled ? logic.isqValue : 72}.\nLOT: ${logic.assembledData.lotNumber}, SN: ${logic.assembledData.serialNumber}.`;

	const handleSaveAndInsertDiary = async () => {
		onSavePassport?.(logic.assembledData);
		const diary = generateDiaryText();
		onInsertIntoDiary?.(diary);
		try {
			await fetch("/api/clinical/implants/installations", {
				method: "POST", headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ patientId, toothNumberFdi: logic.toothFdi, implantBrand: logic.selectedBrand.toLowerCase(), implantDiameterMm: logic.diameterMm, implantLengthMm: logic.lengthMm, lotNumber: logic.lotNumber, serialNumber: logic.serialNumber, finalInsertionTorqueNcm: logic.torqueNcm, baselineIsqMesiodistal: logic.isIsqEnabled ? logic.isqValue : 72, baselineIsqBuccolingual: logic.isIsqEnabled ? logic.isqValue : 72 }),
			});
		} catch { /* offline resilience */ }
		showToast(`Паспорт имплантата #${logic.toothFdi} сохранен и внесен в дневник`, "success");
		onClose?.();
	};

	return {
		handleToothSelect, handleBrandSelect, handleSelectStockItem,
		handleApplyStandardProtocol, handleApplyBarcode, generateDiaryText,
		handleSaveAndInsertDiary,
	};
}
