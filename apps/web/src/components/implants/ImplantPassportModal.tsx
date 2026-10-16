import React, { useState, useEffect, useId } from "react";
import {
	CheckCircle2,
	X,
	Sliders,
	AlertTriangle,
	Printer,
} from "lucide-react";
import { DentalImplant } from "../icons/DentalIcons";
import { showToast } from "../GlobalToast";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	STANDARD_DIAMETERS,
	STANDARD_LENGTHS,
	QUICK_TORQUE_OPTIONS,
	MISCH_DENSITY_NOTES,
	getBoneDensityByToothFdi,
	parseImplantBarcode,
	parseStockDimensions,
	type FastImplantPassportData,
	type MischDensity,
	type ImplantCapType,
	type ImplantWarehouseStockItem,
	type ImplantConsumablesStock,
	DEFAULT_CANONICAL_IMPLANT_STOCK,
	DEFAULT_CANONICAL_CONSUMABLES,
} from "./implantQuickPresets";
import { ImplantPassportCard } from "./ImplantPassportCard";
import "./implants.css";

import {
	FREQUENT_IMPLANT_SITES,
	PERMANENT_TEETH_OPTIONS,
} from "./implantConstants";
export { FREQUENT_IMPLANT_SITES, PERMANENT_TEETH_OPTIONS };
import { ImplantIsqTab } from "./ImplantIsqTab";
import { ImplantDiaryTab } from "./ImplantDiaryTab";
import { ImplantProtocolTab } from "./ImplantProtocolTab";

export interface ImplantPassportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorName?: string;
	readonly doctorId?: string;
	readonly initialTooth?: number;
	readonly initialTab?: "protocol" | "isq" | "diary" | "passport";
	readonly inventoryOverdraftActive?: boolean;
	readonly onSavePassport?: (data: FastImplantPassportData) => void;
	readonly onInsertIntoDiary?: (diaryText: string) => void;
	readonly className?: string;
}

export const ImplantPassportModal: React.FC<ImplantPassportModalProps> = ({
	isOpen,
	onClose,
	patientName = "Пациент",
	patientId = "PAT-01",
	doctorName = "Хирург-имплантолог",
	doctorId = "DOC-01",
	initialTooth = 46,
	initialTab = "protocol",
	inventoryOverdraftActive = false,
	onSavePassport,
	onInsertIntoDiary,
	className = "",
}) => {
	const [toothFdi, setToothFdi] = useState<number>(initialTooth);
	const [selectedBrand, setSelectedBrand] = useState<string>("Osstem");
	const [diameterMm, setDiameterMm] = useState<number>(4.0);
	const [lengthMm, setLengthMm] = useState<number>(10.0);
	const [torqueNcm, setTorqueNcm] = useState<number>(35); // 35 Н·см по умолчанию
	const [boneDensity, setBoneDensity] = useState<MischDensity>(() => getBoneDensityByToothFdi(initialTooth));
	const [isqValue, setIsqValue] = useState<number>(72);
	const [capType, setCapType] = useState<ImplantCapType>("fdm");
	const [catalogArticle, setCatalogArticle] = useState<string>("TS3S4010S");
	const [lotNumber, setLotNumber] = useState<string>("24C1208");
	const [serialNumber, setSerialNumber] = useState<string>("SN-884210");
	const [scannedBarcode, setScannedBarcode] = useState<string>("");
	const [isOverdraftDismissed, setIsOverdraftDismissed] = useState<boolean>(false);
	const isOverdraftActive = Boolean(inventoryOverdraftActive);
	const [activeTab, setActiveTab] = useState<"protocol" | "isq" | "diary" | "passport">(initialTab);
	const [isGbrPerformed, setIsGbrPerformed] = useState<boolean>(false);
	const [isIsqEnabled, setIsIsqEnabled] = useState<boolean>(false);

	// Реальный склад и экономика врача (Мандаты 8e, 8n)
	const [stockItems, setStockItems] = useState<readonly ImplantWarehouseStockItem[]>(DEFAULT_CANONICAL_IMPLANT_STOCK);
	const [stockConsumables, setStockConsumables] = useState<ImplantConsumablesStock>(DEFAULT_CANONICAL_CONSUMABLES);
	const [selectedStockItemId, setSelectedStockItemId] = useState<string>("inv-oss-4010");
	const [expirationDate, setExpirationDate] = useState<string>("2028-11-30");
	const [selectedGraftId, setSelectedGraftId] = useState<string>("inv-bio-oss-05");
	const [selectedMembraneId, setSelectedMembraneId] = useState<string>("inv-bio-gide-1622");
	const [selectedSutureId, setSelectedSutureId] = useState<string>("inv-vicryl-40");
	const [operationPriceRub, setOperationPriceRub] = useState<number>(45000);
	const [implantCostRub, setImplantCostRub] = useState<number>(12500);

	const titleId = useId();

	// Загрузка реальных остатков со склада при открытии
	useEffect(() => {
		let isCancelled = false;
		async function fetchStock() {
			try {
				const res = await fetch("/api/clinical/implants/stock");
				if (!res.ok) return;
				const data = await res.json();
				if (!isCancelled && data.success && Array.isArray(data.implants) && data.implants.length > 0) {
					setStockItems(data.implants);
					if (data.consumables) {
						setStockConsumables({
							grafts: data.consumables.grafts || DEFAULT_CANONICAL_CONSUMABLES.grafts,
							membranes: data.consumables.membranes || DEFAULT_CANONICAL_CONSUMABLES.membranes,
							sutures: data.consumables.sutures || DEFAULT_CANONICAL_CONSUMABLES.sutures,
						});
					}
				}
			} catch {
				// Оффлайн фоллбэк: канонические складские остатки уже в стейте
			}
		}
		if (isOpen) {
			fetchStock();
		}
		return () => {
			isCancelled = true;
		};
	}, [isOpen]);

	const selectedSystem =
		FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === selectedBrand) ??
		FAST_IMPLANT_SYSTEM_PRESETS[0]!;

	const activeGraft =
		stockConsumables.grafts.find((g) => g.id === selectedGraftId) ??
		stockConsumables.grafts[0];
	const activeMembrane =
		stockConsumables.membranes.find((m) => m.id === selectedMembraneId) ??
		stockConsumables.membranes[0];
	const activeSuture =
		stockConsumables.sutures.find((s) => s.id === selectedSutureId) ??
		stockConsumables.sutures[0];

	const consumablesCostRub = isGbrPerformed
		? Number(activeGraft?.unitCostRub || 0) +
			Number(activeMembrane?.unitCostRub || 0) +
			Number(activeSuture?.unitCostRub || 0)
		: 0;

	const doctorGrossMarginRub = Math.max(
		0,
		operationPriceRub - (implantCostRub + consumablesCostRub),
	);

	const effectiveIsq = isIsqEnabled ? isqValue : 72;
	const isImmediateLoadingFeasible =
		torqueNcm >= 35 && torqueNcm <= 55 && effectiveIsq >= 70;

	const assembledData: FastImplantPassportData = {
		passportId: `IMP-PASSPORT-${toothFdi}-${Date.now().toString().slice(-6)}`,
		toothFdi,
		brand: selectedSystem.brand,
		model: selectedSystem.model,
		catalogArticle: catalogArticle.trim() || "TS3S4010S",
		diameterMm,
		lengthMm,
		torqueNcm,
		lotNumber: lotNumber.trim() || `LOT-${selectedSystem.brand.slice(0, 3)}-AUTO`,
		serialNumber: serialNumber.trim() || `SN-${Date.now().toString().slice(-4)}`,
		boneDensity,
		isqDay0: effectiveIsq,
		capType,
		patientName,
		patientId,
		doctorName,
		doctorId,
		dateIso: new Date().toISOString(),
		isWarehouseOverdraft: isOverdraftActive,
		inventoryItemId: selectedStockItemId,
		expirationDate,
		operationPriceRub,
		implantCostRub,
		consumablesCostRub,
		doctorGrossMarginRub,
		netDoctorIncomeRub: doctorGrossMarginRub,
		isImmediateLoadingFeasible,
		boneGraftMaterial: isGbrPerformed ? activeGraft?.name : undefined,
		membraneUsed: isGbrPerformed ? activeMembrane?.name : undefined,
		sutureMaterial: isGbrPerformed ? activeSuture?.name : undefined,
	};


	const handleToothSelect = (tooth: number) => {
		setToothFdi(tooth);
		const computedDensity = getBoneDensityByToothFdi(tooth);
		setBoneDensity(computedDensity);
		setDiameterMm(4.0);
		setLengthMm(10.0);
		setTorqueNcm(computedDensity === "D1" ? 40 : 35);
	};

	const handleBrandSelect = (brand: string) => {
		setSelectedBrand(brand);
		const found = FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === brand);
		if (found) {
			setDiameterMm(found.defaultDiameterMm);
			setLengthMm(found.defaultLengthMm);
			setTorqueNcm(found.defaultTorqueNcm);
			setCatalogArticle(
				brand === "Osstem"
					? "TS3S4010S"
					: brand === "Dentium"
						? "FX4010"
						: brand === "Straumann"
							? "021.2310"
							: brand === "Ankylos"
								? "A-B110-CX"
								: brand === "Astra Tech"
									? "EV-42110"
									: brand === "Nobel Biocare"
										? "NP-35115"
										: `${brand.slice(0, 3).toUpperCase()}-4010`,
			);
		}
	};

	const handleSelectStockItem = (item: ImplantWarehouseStockItem) => {
		setSelectedStockItemId(item.id);
		if (item.lotNumber) setLotNumber(item.lotNumber);
		if (item.sku) setCatalogArticle(item.sku);
		if (item.expirationDate) setExpirationDate(item.expirationDate);
		if (item.unitCostRub) setImplantCostRub(Number(item.unitCostRub));

		const parsedDims = parseStockDimensions(item.name);
		if (parsedDims.brand) {
			setSelectedBrand(parsedDims.brand);
		} else {
			const brandFound = FAST_IMPLANT_SYSTEM_PRESETS.find((p) =>
				item.name.toLowerCase().includes(p.brand.toLowerCase()),
			);
			if (brandFound) {
				setSelectedBrand(brandFound.brand);
			}
		}
		if (parsedDims.diameterMm) setDiameterMm(parsedDims.diameterMm);
		if (parsedDims.lengthMm) setLengthMm(parsedDims.lengthMm);
	};

	const handleApplyStandardProtocol = () => {
		const computedDensity = getBoneDensityByToothFdi(toothFdi);
		setBoneDensity(computedDensity);
		setDiameterMm(4.0);
		setLengthMm(10.0);
		const optimalTorque = computedDensity === "D1" ? 40 : 35;
		setTorqueNcm(optimalTorque);
		setIsqValue(72);
		setIsIsqEnabled(true);
		setCapType("fdm");
		setIsGbrPerformed(false);

		// Автоподбор изделия со склада клиники для выбранной системы
		const matchingStock =
			stockItems.find((s) => s.name.toLowerCase().includes(selectedBrand.toLowerCase())) ??
			stockItems[0];
		if (matchingStock) {
			handleSelectStockItem(matchingStock);
		}

		showToast(
			`Применен стандартный протокол: торк ${optimalTorque} Н·см, ISQ 72, ФДМ, складской артикул привязан`,
			"success",
		);
	};

	const handleApplyBarcode = (customBarcode?: string) => {
		const raw = (customBarcode !== undefined ? customBarcode : scannedBarcode).trim();
		if (!raw) return;
		const parsed = parseImplantBarcode(raw);
		let updatedCount = 0;
		if (parsed.article) {
			setCatalogArticle(parsed.article);
			updatedCount++;
		}
		if (parsed.lot) {
			setLotNumber(parsed.lot);
			updatedCount++;
		}
		if (parsed.serial) {
			setSerialNumber(parsed.serial);
			updatedCount++;
		}
		if (parsed.expirationDate) {
			setExpirationDate(parsed.expirationDate);
			updatedCount++;
		}

		// Поиск физического товара на складе по штрихкоду или артикулу
		const matchedStock = stockItems.find(
			(si) =>
				(si.barcode && raw.includes(si.barcode.slice(-8))) ||
				(si.sku && raw.includes(si.sku)) ||
				(parsed.article && si.sku === parsed.article),
		);
		if (matchedStock) {
			setSelectedStockItemId(matchedStock.id);
			if (matchedStock.lotNumber) setLotNumber(matchedStock.lotNumber);
			if (matchedStock.expirationDate) setExpirationDate(matchedStock.expirationDate);
			if (matchedStock.unitCostRub) setImplantCostRub(Number(matchedStock.unitCostRub));
			updatedCount++;
		}

		if (updatedCount > 0) {
			showToast(
				`Штрихкод упаковки распознан: ${parsed.article ? `REF ${parsed.article} ` : ""}${parsed.lot ? `LOT ${parsed.lot}` : ""}`,
				"success",
			);
		} else {
			showToast("Штрихкод не содержит стандартных тегов GS1 (01/10/21)", "info");
		}
	};

	const generateDiaryText = () => {
		const gbrText = isGbrPerformed
			? `Проведена направленная костная регенерация (НКР): аугментация костным графтом ${activeGraft?.name || "Bio-Oss"}, уложена барьерная мембрана ${activeMembrane?.name || "Bio-Gide"}. Шов: ${activeSuture?.name || "Викрил 4-0"}.`
			: "Костная пластика не проводилась (стандартный протокол без аугментации).";

		const stabilityText = isIsqEnabled
			? `RFA магнитно-резонансная стабилометрия: ${isqValue} ISQ. Первичный торк: ${assembledData.torqueNcm} Н·см.`
			: `Механическая первичная стабильность: ${assembledData.torqueNcm} Н·см.`;

		const capText =
			capType === "plug"
				? "Установлен винт-заглушка (двухэтапный протокол с ушиванием раны наглухо)."
				: "Установлен формирователь десны (ФДМ, одноэтапный протокол с формированием десневого контура).";

		const immediateText = isImmediateLoadingFeasible
			? "Показатели торка и ISQ соответствуют критериям немедленной нагрузки (Immediate Loading)."
			: "Стандартный протокол отсроченной нагрузки.";

		return (
			`ПАСПОРТ ИМПЛАНТАТА (Зуб FDI #${toothFdi}):\n` +
			`Установлен имплантат: ${assembledData.brand} ${assembledData.model} Ø ${assembledData.diameterMm} x ${assembledData.lengthMm} мм.\n` +
			`Торк первичной стабильности: ${assembledData.torqueNcm} Н·см. Плотность кости по Misch: ${assembledData.boneDensity}.\n` +
			`${stabilityText}\n` +
			`${immediateText}\n` +
			`${capText}\n` +
			`Аугментация: ${gbrText}\n` +
			`LOT: ${assembledData.lotNumber}, SN: ${assembledData.serialNumber}, Срок годности: ${assembledData.expirationDate || "2028-11-30"}.\n` +
			(isOverdraftActive ? "Примечание: списание проведено в мягкий овердрафт склада.\n" : "") +
			`Рекомендации даны. Протокол зафиксирован.`
		);
	};

	// 1-клик сохранение паспорта и протокола в карту 043/у (Мандат 8e / Закон Миллера)
	const handleSaveAndInsertDiary = async () => {
		onSavePassport?.(assembledData);
		const diaryEntry = generateDiaryText();
		if (onInsertIntoDiary) {
			onInsertIntoDiary(diaryEntry);
		}

		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							treatmentDescription: diaryEntry,
							objectiveStatus: `Зуб FDI #${toothFdi}: дефект зубного ряда (К08.1). Альвеолярный гребень достаточного объема, плотность кости по Misch: ${boneDensity}.`,
							assessment: `Частичное отсутствие зубов (К08.1). Состояние после дентальной имплантации зуба #${toothFdi}.`,
							plan: `Динамическое наблюдение остеоинтеграции #${toothFdi}. Снятие швов через 7-10 дней. Контрольная радиовизиография.`,
							diagnosisIcd10: "K08.1",
						},
						finding: {
							toothNumber: toothFdi,
						},
						immediate: true,
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// fallback
		}

		// Отправка на бэкенд для автосписания склада и связки со счетом (Мандаты 8e, 8n)
		try {
			await fetch("/api/clinical/implants/installations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					patientId: patientId.includes("-") ? patientId : undefined,
					toothNumberFdi: toothFdi,
					inventoryItemId: selectedStockItemId,
					implantBrand: selectedSystem.brand.toLowerCase().replace(/\s+/g, "_"),
					implantDiameterMm: diameterMm,
					implantLengthMm: lengthMm,
					lotNumber: assembledData.lotNumber,
					serialNumber: assembledData.serialNumber,
					expirationDate: assembledData.expirationDate,
					boneDensityClass: boneDensity,
					finalInsertionTorqueNcm: torqueNcm,
					baselineIsqMesiodistal: isIsqEnabled ? isqValue : 72,
					baselineIsqBuccolingual: isIsqEnabled ? isqValue : 72,
					boneGraftMaterial: isGbrPerformed ? activeGraft?.name : undefined,
					boneGraftItemId: isGbrPerformed ? selectedGraftId : undefined,
					membraneUsed: isGbrPerformed ? activeMembrane?.name : undefined,
					membraneItemId: isGbrPerformed ? selectedMembraneId : undefined,
					sutureMaterial: isGbrPerformed ? activeSuture?.name : undefined,
					sutureItemId: isGbrPerformed ? selectedSutureId : undefined,
					operationPriceRub,
				}),
			});
		} catch {
			// Оффлайн-устойчивость: не блокировать врача у кресла
		}

		showToast(`Паспорт имплантата #${toothFdi} сохранен и внесен в дневник приёма`, "success");
		onClose();
	};

	const handlePrintPassport = () => {
		try {
			window.print();
		} catch {
			// fallback
		}
		showToast(`Бланк паспорта имплантата #${toothFdi} отправлен на печать`, "success");
	};

	if (!isOpen) return null;

	return (
		<div
			className="implant-passport-modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			data-testid="implant-passport-modal-backdrop"
		>
			<div
				className={`implant-passport-card-container implant-surgical-passport-modal ${className}`.trim()}
				data-testid="implant-passport-modal"
			>
				{/* Apple iOS HIG Drag Handle для мобильных экранов */}
				<div className="implant-sheet-drag-handle" aria-hidden="true" />

				{/* Header */}
				<header className="implant-passport-header-bar">
					<div className="implant-passport-header-title">
						<div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
							<DentalImplant size={18} />
						</div>
						<div className="min-w-0 flex-1 overflow-hidden">
							<h2 id={titleId}>
								<span className="title-text">Паспорт дентального имплантата</span>
								<span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-md font-mono font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shrink-0 whitespace-nowrap">
									#{toothFdi}
								</span>
							</h2>
							<p className="text-[11px] sm:text-xs text-[var(--muted)] truncate" title={`${patientName} · ${doctorName} · Протокол установки имплантата`}>
								{patientName} · {doctorName}
							</p>
						</div>
					</div>

					<div className="implant-passport-header-actions">
						<button
							type="button"
							onClick={handlePrintPassport}
							className="secondary-button"
							data-testid="btn-print-implant-passport"
							title="Распечатать паспорт имплантата / гарантийный сертификат"
						>
							<Printer size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span className="implant-btn-text-hide-mobile">Печать</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab(activeTab === "passport" ? "protocol" : "passport")}
							className="secondary-button implant-desktop-only"
							data-testid="btn-toggle-passport-view"
						>
							<Sliders size={15} className="shrink-0" />
							<span>{activeTab === "passport" ? "Параметры" : "Предпросмотр карты"}</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="icon-button"
							aria-label="Закрыть окно паспорта"
							data-testid="btn-close-implant-passport implant-passport-close-btn"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* Nav Tabs (Touch-First >= 44px, Canonical DENTE Secondary Buttons) */}
				<nav className="implant-tabs-nav" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "protocol"}
						onClick={() => setActiveTab("protocol")}
						className={`secondary-button ${activeTab === "protocol" ? "active" : ""}`}
						data-testid="implant-tab-protocol"
					>
						1. Протокол & Кость
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "isq"}
						onClick={() => setActiveTab("isq")}
						className={`secondary-button ${activeTab === "isq" ? "active" : ""}`}
						data-testid="implant-tab-isq"
					>
						2. Стабильность ({torqueNcm} Н·см{isIsqEnabled ? ` · ${isqValue} ISQ` : " · Ключ"})
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "diary"}
						onClick={() => setActiveTab("diary")}
						className={`secondary-button ${activeTab === "diary" ? "active" : ""}`}
						data-testid="implant-tab-diary"
					>
						3. В дневник приёма
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "passport"}
						onClick={() => setActiveTab("passport")}
						className={`secondary-button ${activeTab === "passport" ? "active" : ""}`}
						data-testid="implant-tab-passport"
					>
						4. Гарантийный паспорт
					</button>
				</nav>

				{/* Body */}
				<div className="implant-passport-content">
					{/* Мягкий овердрафт предупреждение */}
					{isOverdraftActive && !isOverdraftDismissed && (
						<div className="p-3 rounded-xl bg-[var(--amber-surface,rgba(245,158,11,0.1))] border border-[var(--amber-soft,rgba(245,158,11,0.3))] text-xs text-[var(--ink)] flex items-center gap-2.5" data-testid="passport-overdraft-notice">
							<AlertTriangle size={18} className="text-[var(--amber,#f59e0b)] shrink-0" />
							<div className="flex-1 min-w-0">
								<strong className="text-[var(--amber,#f59e0b)]">Мягкий овердрафт склада: </strong>
								<span>Задержка накладной не блокирует сохранение. Паспорт сохраняется штатно.</span>
							</div>
							<button
								type="button"
								onClick={() => setIsOverdraftDismissed(true)}
								className="text-xs font-bold underline text-[var(--ink)] cursor-pointer shrink-0"
							>
								Закрыть
							</button>
						</div>
					)}

					{activeTab === "passport" ? (
						<div data-testid="tab-content-passport">
							<ImplantPassportCard data={assembledData} />
						</div>
					) : activeTab === "isq" ? (
						<ImplantIsqTab
							torqueNcm={torqueNcm}
							isqValue={isqValue}
							setIsqValue={setIsqValue}
							isIsqEnabled={isIsqEnabled}
							setIsIsqEnabled={setIsIsqEnabled}
							boneDensity={boneDensity}
						/>
					) : activeTab === "diary" ? (
						<ImplantDiaryTab diaryText={generateDiaryText()} />
					) : (
						<ImplantProtocolTab
							toothFdi={toothFdi}
							handleToothSelect={handleToothSelect}
							boneDensity={boneDensity}
							setBoneDensity={setBoneDensity}
							scannedBarcode={scannedBarcode}
							setScannedBarcode={setScannedBarcode}
							handleApplyBarcode={handleApplyBarcode}
							isGbrPerformed={isGbrPerformed}
							setIsGbrPerformed={setIsGbrPerformed}
							capType={capType}
							setCapType={setCapType}
							isIsqEnabled={isIsqEnabled}
							setIsIsqEnabled={setIsIsqEnabled}
							selectedBrand={selectedBrand}
							handleBrandSelect={handleBrandSelect}
							diameterMm={diameterMm}
							setDiameterMm={setDiameterMm}
							lengthMm={lengthMm}
							setLengthMm={setLengthMm}
							torqueNcm={torqueNcm}
							setTorqueNcm={setTorqueNcm}
							lotNumber={lotNumber}
							setLotNumber={setLotNumber}
							catalogArticle={catalogArticle}
							setCatalogArticle={setCatalogArticle}
							serialNumber={serialNumber}
							setSerialNumber={setSerialNumber}
							isOverdraftActive={isOverdraftActive}
							stockItems={stockItems}
							selectedStockItemId={selectedStockItemId}
							onSelectStockItem={handleSelectStockItem}
							stockConsumables={stockConsumables}
							selectedGraftId={selectedGraftId}
							onSelectGraftId={setSelectedGraftId}
							selectedMembraneId={selectedMembraneId}
							onSelectMembraneId={setSelectedMembraneId}
							selectedSutureId={selectedSutureId}
							onSelectSutureId={setSelectedSutureId}
							operationPriceRub={operationPriceRub}
							setOperationPriceRub={setOperationPriceRub}
							implantCostRub={implantCostRub}
							consumablesCostRub={consumablesCostRub}
							doctorGrossMarginRub={doctorGrossMarginRub}
							expirationDate={expirationDate}
							setExpirationDate={setExpirationDate}
							isqValue={isqValue}
							onApplyStandardProtocol={handleApplyStandardProtocol}
						/>
					)}
				</div>

				{/* Footer: Закон Миллера (не более 1-2 кнопок прямого действия) */}
				<footer className="implant-passport-actions">
					<div
						className="text-xs text-[var(--muted)] truncate min-w-0 flex-1"
						title={`${selectedSystem.brand} Ø ${diameterMm} × ${lengthMm} мм · ${torqueNcm} Н·см`}
					>
						{selectedSystem.brand} Ø {diameterMm} × {lengthMm} мм · {torqueNcm} Н·см
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handlePrintPassport}
							className="secondary-button"
							data-testid="btn-print-implant-passport-footer implant-print-passport-btn"
							title="Распечатать паспорт имплантата / гарантийный сертификат"
						>
							<Printer size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span>Печать паспорта</span>
						</button>

						<button
							type="button"
							onClick={handleSaveAndInsertDiary}
							className="primary-button"
							data-testid="btn-save-implant-passport btn-passport-insert-diary implant-save-passport-btn implant-insert-diary-btn"
							title="Сохранить паспорт имплантата и внести протокол в дневник приёма"
						>
							<CheckCircle2 size={16} className="shrink-0" />
							<span>Сохранить паспорт имплантата · В дневник приёма</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default ImplantPassportModal;
