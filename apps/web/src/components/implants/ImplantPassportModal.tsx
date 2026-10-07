import React, { useState, useId } from "react";
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
	type FastImplantPassportData,
	type MischDensity,
	type ImplantCapType,
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
	const [lotNumber, setLotNumber] = useState<string>("LOT-2026-OSS-8842");
	const [serialNumber, setSerialNumber] = useState<string>("SN-991428");
	const [scannedBarcode, setScannedBarcode] = useState<string>("");
	const [isOverdraftDismissed, setIsOverdraftDismissed] = useState<boolean>(false);
	const isOverdraftActive = Boolean(inventoryOverdraftActive);
	const [activeTab, setActiveTab] = useState<"protocol" | "isq" | "diary" | "passport">(initialTab);
	const [isGbrPerformed, setIsGbrPerformed] = useState<boolean>(false);
	const [isIsqEnabled, setIsIsqEnabled] = useState<boolean>(false);
	const titleId = useId();

	const selectedSystem =
		FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === selectedBrand) ??
		FAST_IMPLANT_SYSTEM_PRESETS[0]!;

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
		isqDay0: isIsqEnabled ? isqValue : 72,
		capType,
		patientName,
		patientId,
		doctorName,
		doctorId,
		dateIso: new Date().toISOString(),
		isWarehouseOverdraft: isOverdraftActive,
	};

	const handleToothSelect = (tooth: number) => {
		setToothFdi(tooth);
		setBoneDensity(getBoneDensityByToothFdi(tooth));
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
			? "Проведена направленная костная регенерация (НКР): аугментация костным графтом, уложена барьерная мембрана."
			: "Костная пластика не проводилась (стандартный протокол без аугментации).";

		const stabilityText = isIsqEnabled
			? `RFA магнитно-резонансная стабилометрия: ${isqValue} ISQ. Первичный торк: ${assembledData.torqueNcm} Н·см.`
			: `Механическая первичная стабильность: ${assembledData.torqueNcm} Н·см.`;

		const capText =
			capType === "plug"
				? "Установлен винт-заглушка (двухэтапный протокол с ушиванием раны наглухо)."
				: "Установлен формирователь десны (ФДМ, одноэтапный протокол с формированием десневого контура).";

		return (
			`ПАСПОРТ ИМПЛАНТАТА (Зуб FDI #${toothFdi}):\n` +
			`Установлен имплантат: ${assembledData.brand} ${assembledData.model} Ø ${assembledData.diameterMm} x ${assembledData.lengthMm} мм.\n` +
			`Торк первичной стабильности: ${assembledData.torqueNcm} Н·см. Плотность кости по Misch: ${assembledData.boneDensity}.\n` +
			`${stabilityText}\n` +
			`${capText}\n` +
			`Аугментация: ${gbrText}\n` +
			`LOT: ${assembledData.lotNumber}, SN: ${assembledData.serialNumber}.\n` +
			(isOverdraftActive ? "Примечание: списание проведено в мягкий овердрафт склада.\n" : "") +
			`Рекомендации даны. Протокол зафиксирован.`
		);
	};

	// 1-клик сохранение паспорта и протокола в карту 043/у (Мандат 8e / Закон Миллера)
	const handleSaveAndInsertDiary = () => {
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
				data-testid="implant-passport-modal implant-surgical-passport-modal"
			>
				{/* Header */}
				<header className="implant-passport-header-bar">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
							<DentalImplant size={22} />
						</div>
						<div className="min-w-0">
							<h2 id={titleId} className="text-base font-black text-[var(--ink)] flex items-center gap-2 flex-wrap min-w-0">
								<span>Паспорт дентального имплантата</span>
								<span className="text-xs text-[var(--muted)] font-normal hidden sm:inline truncate">
									· Хирургический паспорт имплантации
								</span>
								<span className="text-xs px-2.5 py-0.5 rounded-lg font-mono font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shrink-0">
									Зуб FDI #{toothFdi}
								</span>
							</h2>
							<p className="text-xs text-[var(--muted)] truncate" title={`${patientName} · ${doctorName} · Протокол установки имплантата`}>
								{patientName} · {doctorName} · Протокол установки имплантата
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handlePrintPassport}
							className="implant-touch-btn bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] text-xs flex items-center gap-1.5"
							data-testid="btn-print-implant-passport"
							title="Распечатать паспорт имплантата / гарантийный сертификат"
						>
							<Printer size={15} className="text-[var(--teal,#0d9488)]" />
							<span>Печать бланка</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab(activeTab === "passport" ? "protocol" : "passport")}
							className="implant-touch-btn bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] text-xs"
							data-testid="btn-toggle-passport-view"
						>
							<Sliders size={15} />
							<span>{activeTab === "passport" ? "Параметры" : "Предпросмотр карты"}</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="implant-touch-btn bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)] p-2.5"
							aria-label="Закрыть окно паспорта"
							data-testid="btn-close-implant-passport implant-passport-close-btn"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* Nav Tabs (Touch-First >= 48px, Compact 1-Row) */}
				<nav className="flex items-center gap-2 px-5 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] overflow-x-auto text-xs font-bold shrink-0 no-scrollbar" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "protocol"}
						onClick={() => setActiveTab("protocol")}
						className={`min-h-[48px] px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center touch-manipulation shrink-0 whitespace-nowrap ${
							activeTab === "protocol"
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)]"
						}`}
						data-testid="implant-tab-protocol"
					>
						1. Протокол & Кость
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "isq"}
						onClick={() => setActiveTab("isq")}
						className={`min-h-[48px] px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center touch-manipulation shrink-0 whitespace-nowrap ${
							activeTab === "isq"
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)]"
						}`}
						data-testid="implant-tab-isq"
					>
						2. Стабильность ({torqueNcm} Н·см{isIsqEnabled ? ` · ${isqValue} ISQ` : " · Ключ"})
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "diary"}
						onClick={() => setActiveTab("diary")}
						className={`min-h-[48px] px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center touch-manipulation shrink-0 whitespace-nowrap ${
							activeTab === "diary"
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)]"
						}`}
						data-testid="implant-tab-diary"
					>
						3. В дневник приёма
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "passport"}
						onClick={() => setActiveTab("passport")}
						className={`min-h-[48px] px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center touch-manipulation shrink-0 whitespace-nowrap ${
							activeTab === "passport"
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)]"
						}`}
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
							className="implant-touch-btn bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-1.5"
							data-testid="btn-print-implant-passport-footer implant-print-passport-btn"
							title="Распечатать паспорт имплантата / гарантийный сертификат"
						>
							<Printer size={15} className="text-[var(--teal,#0d9488)]" />
							<span>Печать паспорта</span>
						</button>

						<button
							type="button"
							onClick={handleSaveAndInsertDiary}
							className="implant-touch-btn bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs flex items-center gap-1.5"
							data-testid="btn-save-implant-passport btn-passport-insert-diary implant-save-passport-btn implant-insert-diary-btn"
							title="Сохранить паспорт и внести протокол в дневник приёма"
						>
							<CheckCircle2 size={16} />
							<span>В дневник приёма</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default ImplantPassportModal;
