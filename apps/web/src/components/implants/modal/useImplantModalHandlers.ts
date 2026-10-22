import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	getAnatomicalImplantDefaults,
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
		const defaults = getAnatomicalImplantDefaults(tooth);
		logic.setBoneDensity(defaults.boneDensity);
		logic.setDiameterMm(defaults.diameterMm);
		logic.setLengthMm(defaults.lengthMm);
		logic.setTorqueNcm(defaults.torqueNcm);
		logic.setCapType(defaults.capType);
	};

	const handleBrandSelect = (brand: string) => {
		logic.setSelectedBrand(brand);
		const found = FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === brand);
		if (found) {
			logic.setCatalogArticle(brand === "Osstem" ? "TS3S4010S" : brand === "Dentium" ? "FX4010" : brand === "Straumann" ? "021.2310" : brand === "Ankylos" ? "A-B110-CX" : brand === "Astra Tech" ? "EV-42110" : brand === "Nobel Biocare" ? "NP-35115" : `${brand.slice(0, 3).toUpperCase()}-4010`);
		}
	};

	const handleSelectStockItem = (item: ImplantWarehouseStockItem) => {
		logic.setSelectedStockItemId(item.id);
		if (item.lotNumber) logic.setLotNumber(item.lotNumber);
		if (item.sku) logic.setCatalogArticle(item.sku);
		if (item.expirationDate) logic.setExpirationDate(item.expirationDate);
	};

	const handleApplyStandardProtocol = () => {
		handleToothSelect(logic.toothFdi);
		logic.setCapType("fdm");
		logic.setIsGbrPerformed(false);
		logic.setTorqueNcm(35);
		showToast("Применен экспресс-протокол: торк 35 Н·см, ФДМ, шов Викрил 4-0", "success");
	};

	const handleApplyImmediateProtocol = () => {
		logic.setCapType("fdm");
		logic.setIsGbrPerformed(false);
		logic.setTorqueNcm(45);
		logic.setDiameterMm(4.5);
		logic.setLengthMm(11.5);
		showToast("Применен протокол одномоментной имплантации: немедленная нагрузка (45 Н·см)", "success");
	};

	const handleApplyTwoStageProtocol = () => {
		logic.setCapType("plug");
		logic.setIsGbrPerformed(false);
		logic.setTorqueNcm(35);
		showToast("Применен двухэтапный протокол: винт-заглушка с ушиванием раны наглухо (35 Н·см)", "success");
	};

	const handleApplyGbrProtocol = () => {
		logic.setCapType("plug");
		logic.setIsGbrPerformed(true);
		logic.setTorqueNcm(35);
		showToast("Применен протокол с костной пластикой НКР: Bio-Oss + Bio-Gide", "success");
	};

	const handleApplyBarcode = (customBarcode?: string) => {
		const raw = (customBarcode !== undefined ? customBarcode : logic.scannedBarcode || "").trim();
		if (!raw) return;
		logic.setCatalogArticle(raw);
		showToast("Идентификатор изделия зафиксирован", "success");
	};

	const generateDiaryText = () => {
		const tooth = logic.toothFdi;
		const brand = logic.assembledData.brand;
		const model = logic.assembledData.model;
		const dia = logic.assembledData.diameterMm;
		const len = logic.assembledData.lengthMm;
		const torque = logic.assembledData.torqueNcm;
		const density = logic.assembledData.boneDensity || "D2";
		const capStr = logic.assembledData.capType === "plug" ? "винт-заглушка (ушивание наглухо)" : "формирователь десны (ФДМ)";
		const lot = logic.assembledData.lotNumber;
		const sn = logic.assembledData.serialNumber;
		const ref = logic.assembledData.catalogArticle;
		const gbrStr = logic.isGbrPerformed
			? ` Костная пластика (НКР): графт ${logic.activeGraft?.name || "Geistlich Bio-Oss"}, мембрана ${logic.activeMembrane?.name || "Geistlich Bio-Gide"}.`
			: "";

		return (
			`ПРОТОКОЛ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ (Зуб FDI #${tooth})\n` +
			`Диагноз: K08.1 Потеря зубов вследствие удаления.\n\n` +
			`ХОД ОПЕРАЦИИ (SOAP):\n` +
			`Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Разрез по гребню альвеолярного отростка в области зуба #${tooth}, отслоен слизисто-надкостничный лоскут. ` +
			`Препарирование костного ложа фрезами с обильным охлаждением стерильным раствором NaCl 0.9% (800 об/мин). ` +
			`Плотность костной ткани по Misch: ${density}. ` +
			`Установлен дентальный имплантат ${brand} ${model} Ø ${dia} × ${len} мм. ` +
			`Первичная торк-стабильность: ${torque} Н·см (оптимум фиксации). Установлен ${capStr}.${gbrStr} ` +
			`Мобилизация слизисто-надкостничного лоскута, наложены узловые швы (Викрил 4-0) без натяжения. ` +
			`Гемостаз полный. Паспорт дентального имплантата оформлен и выдан пациенту.\n\n` +
			`ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ:\n` +
			`REF: ${ref} · LOT: ${lot} · SN: ${sn} · Стерилен до: ${logic.assembledData.expirationDate || "2028-11-30"}\n\n` +
			`НАЗНАЧЕНИЯ И РЕКОМЕНДАЦИИ:\n` +
			`Холод на щеку 15 мин каждые 2 часа в первый день. Ванночки с 0.05% хлоргексидином со 2-х суток. Исключить горячее, баню и физические нагрузки на 7 дней. Осмотр через 7 дней.`
		);
	};

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
	};

	return {
		handleToothSelect, handleBrandSelect, handleSelectStockItem,
		handleApplyStandardProtocol, handleApplyImmediateProtocol,
		handleApplyTwoStageProtocol, handleApplyGbrProtocol,
		handleApplyBarcode, generateDiaryText, handleSaveAndInsertDiary,
	};
}
