import React, { useState, useId } from "react";
import {
	Activity,
	CheckCircle2,
	X,
	ShieldCheck,
	Sliders,
	FileText,
	Copy,
	AlertTriangle,
	Printer,
	Zap,
	Layers,
	TrendingUp,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	STANDARD_DIAMETERS,
	STANDARD_LENGTHS,
	QUICK_TORQUE_OPTIONS,
	MISCH_DENSITY_NOTES,
	type FastImplantPassportData,
	type MischDensity,
	type ImplantCapType,
} from "./implantQuickPresets";
import { ImplantPassportCard } from "./ImplantPassportCard";
import "./implants.css";

export interface ImplantPassportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorName?: string;
	readonly doctorId?: string;
	readonly initialTooth?: number;
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
	const [boneDensity, setBoneDensity] = useState<MischDensity>("D2");
	const [capType, setCapType] = useState<ImplantCapType>("fdm");
	const [catalogArticle, setCatalogArticle] = useState<string>("TS3S4010S");
	const [lotNumber, setLotNumber] = useState<string>("LOT-2026-OSS-8842");
	const [serialNumber, setSerialNumber] = useState<string>("SN-991428");
	const [isOverdraftDismissed, setIsOverdraftDismissed] = useState<boolean>(false);
	const isOverdraftActive = inventoryOverdraftActive;
	const [activeTab, setActiveTab] = useState<"protocol" | "isq" | "diary" | "passport">("protocol");
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
		isqDay0: 72,
		capType,
		patientName,
		patientId,
		doctorName,
		dateIso: new Date().toISOString(),
		isWarehouseOverdraft: isOverdraftActive,
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
							: `${brand.slice(0, 3).toUpperCase()}-4010`,
			);
		}
	};

	const generateDiaryText = () => {
		const gbrText = isGbrPerformed
			? "Проведена направленная костная регенерация (НКР): аугментация костным графтом, уложена барьерная мембрана."
			: "Костная пластика не проводилась (стандартный протокол без аугментации).";

		const stabilityText = isIsqEnabled
			? `RFA магнитно-резонансная стабилометрия: 72 ISQ. Первичный торк: ${assembledData.torqueNcm} Н·см.`
			: `Механическая первичная стабильность: ${assembledData.torqueNcm} Н·см.`;

		const capText =
			capType === "plug"
				? "Установлен винт-заглушка (двухэтапный протокол с ушиванием раны наглухо)."
				: "Установлен формирователь десны (ФДМ, одноэтапный протокол с формированием десневого контура).";

		return (
			`ПАСПОРТ ИМПЛАНТАТА (Зуб FDI #${toothFdi}):\n` +
			`Установлен имплантат: ${assembledData.brand} ${assembledData.model} Ø ${assembledData.diameterMm} x ${assembledData.lengthMm} мм.\n` +
			`Торк первичной стабильности: ${assembledData.torqueNcm} Н·см. Плотность кости: ${assembledData.boneDensity}.\n` +
			`${stabilityText}\n` +
			`${capText}\n` +
			`Аугментация: ${gbrText}\n` +
			`LOT: ${assembledData.lotNumber}, SN: ${assembledData.serialNumber}.\n` +
			(isOverdraftActive ? "Примечание: списание проведено в мягкий овердрафт склада.\n" : "") +
			`Рекомендации даны. Протокол зафиксирован.`
		);
	};

	const handleSave = () => {
		onSavePassport?.(assembledData);
		if (onInsertIntoDiary) {
			onInsertIntoDiary(generateDiaryText());
		}
		showToast(`Паспорт имплантата #${toothFdi} сохранен`, "success");
		onClose();
	};

	const handleInsertDiary = () => {
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
						},
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// fallback
		}

		showToast("Данные паспорта имплантата внесены в карту 043/у", "success");
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
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
							<ShieldCheck size={22} />
						</div>
						<div>
							<h2 id={titleId} className="text-base font-black text-[var(--ink)] flex items-center gap-2 flex-wrap">
								<span>Паспорт дентального имплантата</span>
								<span className="text-xs text-[var(--muted)] font-normal hidden sm:inline">
									· Хирургический паспорт имплантации
								</span>
								<span className="text-xs px-2.5 py-0.5 rounded-lg font-mono font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]">
									Зуб FDI #{toothFdi}
								</span>
							</h2>
							<p className="text-xs text-[var(--muted)]">
								{patientName} · {doctorName} · Быстрая фиксация без бюрократических замков
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
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

				{/* Nav Tabs (Touch-First >= 48px) */}
				<nav className="flex items-center gap-2 px-5 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] overflow-x-auto text-xs font-bold shrink-0" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "protocol"}
						onClick={() => setActiveTab("protocol")}
						className={`min-h-[48px] px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
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
						className={`min-h-[48px] px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
							activeTab === "isq"
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)]"
						}`}
						data-testid="implant-tab-isq"
					>
						2. Стабильность ({torqueNcm} Н·см{isIsqEnabled ? " · 72 ISQ" : " · Ключ"})
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "diary"}
						onClick={() => setActiveTab("diary")}
						className={`min-h-[48px] px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
							activeTab === "diary"
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)]"
						}`}
						data-testid="implant-tab-diary"
					>
						3. В карту 043/у
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "passport"}
						onClick={() => setActiveTab("passport")}
						className={`min-h-[48px] px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
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
							<div className="flex-1">
								<strong className="text-[var(--amber-dark,#b45309)]">Мягкий овердрафт склада: </strong>
								<span>Задержка накладной не блокирует сохранение. Паспорт сохраняется штатно.</span>
							</div>
							<button
								type="button"
								onClick={() => setIsOverdraftDismissed(true)}
								className="text-xs font-bold underline text-[var(--ink)]"
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
						<div className="space-y-4" data-testid="tab-content-isq">
							<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-4">
								<div className="flex items-center gap-3">
									<div className="p-3 bg-[var(--teal,#0d9488)] text-white rounded-xl">
										<Activity size={24} />
									</div>
									<div>
										<div className="text-sm font-black text-[var(--ink)]">
											{isIsqEnabled ? "RFA магнитно-резонансная стабилометрия" : "Механический контроль торка ключом"}
										</div>
										<div className="text-xs text-[var(--muted)]">
											Первичная стабильность: {torqueNcm} Н·см · {torqueNcm >= 35 ? "Высокая (оптимум 35 Н·см)" : "Стандартная"}
											{isIsqEnabled ? " · ISQ День 0: 72 (Остеоинтеграция стабильна)" : ""}
										</div>
									</div>
								</div>
								<div className="text-right">
									<div className="text-xl font-black font-mono text-[var(--teal,#0d9488)]">
										{torqueNcm} Н·см
									</div>
									{isIsqEnabled && (
										<div className="text-xs font-bold text-[var(--muted)]">
											72 ISQ
										</div>
									)}
								</div>
							</div>

							<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)] leading-relaxed">
								<strong className="text-[var(--ink)] block mb-1">
									Клинический протокол (Мандаты 8e, 8i, 8k):
								</strong>
								CRM не симулирует микро-замеры 16 точек анизотропии в перчатках у кресла. Зафиксирован надежный первичный торк {torqueNcm} Н·см, ISQ {assembledData.isqDay0 ?? 72} и плотность кости {boneDensity}. Данные автоматически экспортируются в карту 043/у.
							</div>
						</div>
					) : activeTab === "diary" ? (
						<div className="space-y-3" data-testid="tab-content-diary">
							<div className="flex items-center justify-between">
								<span className="text-xs font-black uppercase text-[var(--muted)] tracking-wider">
									Текст протокола для Карты 043/у:
								</span>
								<button
									type="button"
									onClick={() => {
										navigator.clipboard?.writeText(generateDiaryText());
										showToast("Протокол скопирован в буфер обмена", "success");
									}}
									className="implant-touch-btn bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] text-xs flex items-center gap-1.5"
									data-testid="btn-copy-protocol"
								>
									<Copy size={14} />
									<span>Скопировать</span>
								</button>
							</div>
							<textarea
								readOnly
								value={generateDiaryText()}
								className="w-full p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] font-mono text-xs text-[var(--ink)] leading-relaxed resize-none"
								rows={8}
								data-testid="protocol-preview-text"
							/>
						</div>
					) : (
						<div className="space-y-4" data-testid="tab-content-protocol">
							{/* 1-Click Clinical Presets (Standard vs GBR) */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2">
								<div className="text-xs font-black uppercase text-[var(--muted)] tracking-wider">
									Клинический протокол вмешательства (1 клик):
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									<button
										type="button"
										onClick={() => setIsGbrPerformed(false)}
										className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all flex items-center justify-between touch-manipulation ${
											!isGbrPerformed
												? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
												: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
										}`}
										data-testid="preset-standard-implantation"
									>
										<span className="flex items-center gap-2">
											<Zap size={16} className={!isGbrPerformed ? "text-[var(--warn)]" : "text-[var(--teal,#0d9488)]"} />
											<span>Стандартная имплантация (без НКР / Без костной пластики)</span>
										</span>
										{!isGbrPerformed && <CheckCircle2 size={16} className="text-white shrink-0" />}
									</button>

									<button
										type="button"
										onClick={() => setIsGbrPerformed(true)}
										className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all flex items-center justify-between touch-manipulation ${
											isGbrPerformed
												? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
												: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
										}`}
										data-testid="preset-gbr-implantation"
									>
										<span className="flex items-center gap-2">
											<Layers size={16} className={isGbrPerformed ? "text-[var(--teal,#0d9488)]" : "text-[var(--brand-primary,#0ea5e9)]"} />
											<span>Имплантация с НКР (костная пластика)</span>
										</span>
										{isGbrPerformed && <CheckCircle2 size={16} className="text-white shrink-0" />}
									</button>
								</div>
							</div>

							{/* 1-Click Выбор: ФДМ vs Винт-заглушка (Gingiva Former vs Cover Screw) */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2">
								<div className="text-xs font-black uppercase text-[var(--muted)] tracking-wider">
									Формирователь десны / Винт-заглушка (1 клик):
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									<button
										type="button"
										onClick={() => setCapType("fdm")}
										className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all flex items-center justify-between touch-manipulation ${
											capType === "fdm"
												? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
												: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
										}`}
										data-testid="btn-cap-type-fdm"
									>
										<span className="flex flex-col">
											<span className="font-extrabold">ФДМ (формирователь десны)</span>
											<span className="text-[10px] opacity-85">Одноэтапный протокол с формированием контура</span>
										</span>
										{capType === "fdm" && <CheckCircle2 size={18} className="text-white shrink-0" />}
									</button>

									<button
										type="button"
										onClick={() => setCapType("plug")}
										className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all flex items-center justify-between touch-manipulation ${
											capType === "plug"
												? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
												: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
										}`}
										data-testid="btn-cap-type-plug"
									>
										<span className="flex flex-col">
											<span className="font-extrabold">Винт-заглушка (Cover screw)</span>
											<span className="text-[10px] opacity-85">Двухэтапный протокол (ушивание наглухо)</span>
										</span>
										{capType === "plug" && <CheckCircle2 size={18} className="text-white shrink-0" />}
									</button>
								</div>
							</div>

							{/* Stability Mode Switcher (Torque vs ISQ device) */}
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() => setIsIsqEnabled(false)}
									className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all inline-flex items-center gap-2 cursor-pointer touch-manipulation ${
										!isIsqEnabled
											? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
									}`}
									data-testid="btn-stability-torque-only"
								>
									<Activity size={16} />
									<span>Контроль стабильности по торку (35 Н·см ключом)</span>
									{!isIsqEnabled && <CheckCircle2 size={16} className="text-white shrink-0" />}
								</button>

								<button
									type="button"
									onClick={() => setIsIsqEnabled(true)}
									className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all inline-flex items-center gap-2 cursor-pointer touch-manipulation ${
										isIsqEnabled
											? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
									}`}
									data-testid="btn-stability-isq-sensor"
								>
									<TrendingUp size={16} />
									<span>Магнитный резонанс ISQ (72 ISQ Osstell / Penguin)</span>
									{isIsqEnabled && <CheckCircle2 size={16} className="text-white shrink-0" />}
								</button>
							</div>

							{/* Выбор системы имплантации */}
							<div>
								<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)] block mb-2">
									Имплантационная система:
								</span>
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
									{FAST_IMPLANT_SYSTEM_PRESETS.map((sys) => {
										const isSel = selectedBrand === sys.brand;
										return (
											<button
												key={sys.brand}
												type="button"
												onClick={() => handleBrandSelect(sys.brand)}
												className={`implant-system-pill ${isSel ? "selected" : ""}`}
												data-testid={`btn-system-${sys.brand} implant-preset-btn-${sys.brand}`}
											>
												<div className="truncate font-extrabold" title={sys.brand}>{sys.brand}</div>
												<div className="text-[10px] opacity-80 truncate" title={sys.model}>{sys.model}</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* Misch Bone Density Cards */}
							<div>
								<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)] block mb-2">
									Плотность кости (Классификация Misch D1–D4):
								</span>
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-1">
									{(["D1", "D2", "D3", "D4"] as MischDensity[]).map((b) => {
										const isSel = boneDensity === b;
										return (
											<button
												key={b}
												type="button"
												onClick={() => setBoneDensity(b)}
												className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
													isSel
														? "bg-[var(--teal-surface,rgba(13,148,136,0.1))] border-[var(--teal,#0d9488)] text-[var(--ink)] shadow-xs"
														: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:border-[var(--line-strong,#94a3b8)]"
												}`}
												data-testid={`bone-card-${b}`}
											>
												<div className="flex items-center justify-between">
													<span className="font-black text-xs text-[var(--teal,#0d9488)]">{b}</span>
													{isSel && <CheckCircle2 size={14} className="text-[var(--teal,#0d9488)] shrink-0" />}
												</div>
												<div className="text-[11px] font-bold text-[var(--ink)] truncate" title={MISCH_DENSITY_NOTES[b].title}>{MISCH_DENSITY_NOTES[b].title}</div>
												<div className="text-[10px] text-[var(--muted)] truncate" title={MISCH_DENSITY_NOTES[b].hint}>{MISCH_DENSITY_NOTES[b].hint}</div>
											</button>
										);
									})}
								</div>
								<select
									id="passport-bone"
									value={boneDensity}
									onChange={(e) => setBoneDensity(e.target.value as MischDensity)}
									className="sr-only"
									data-testid="select-bone-density"
									aria-label="Выбор плотности кости по Misch"
								>
									{(["D1", "D2", "D3", "D4"] as MischDensity[]).map((b) => (
										<option key={b} value={b}>
											{MISCH_DENSITY_NOTES[b].title}
										</option>
									))}
								</select>
							</div>

							{/* Размеры и Торк */}
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
								<div className="flex flex-col gap-1">
									<label htmlFor="passport-dia" className="text-xs font-bold text-[var(--ink)]">
										Диаметр (Ø мм):
									</label>
									<select
										id="passport-dia"
										value={diameterMm}
										onChange={(e) => setDiameterMm(Number(e.target.value))}
										className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)]"
										data-testid="select-diameter"
									>
										{STANDARD_DIAMETERS.map((d) => (
											<option key={d} value={d}>
												Ø {d} мм
											</option>
										))}
									</select>
									<input
										id="implant-dia"
										type="number"
										step="0.1"
										value={diameterMm}
										onChange={(e) => setDiameterMm(Number(e.target.value))}
										className="sr-only"
										data-testid="input-diameter"
										aria-label="Диаметр имплантата числовой"
									/>
								</div>

								<div className="flex flex-col gap-1">
									<label htmlFor="passport-len" className="text-xs font-bold text-[var(--ink)]">
										Длина (мм):
									</label>
									<select
										id="passport-len"
										value={lengthMm}
										onChange={(e) => setLengthMm(Number(e.target.value))}
										className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)]"
										data-testid="select-length"
									>
										{STANDARD_LENGTHS.map((l) => (
											<option key={l} value={l}>
												{l} мм
											</option>
										))}
									</select>
									<input
										id="implant-len"
										type="number"
										step="0.5"
										value={lengthMm}
										onChange={(e) => setLengthMm(Number(e.target.value))}
										className="sr-only"
										data-testid="input-length"
										aria-label="Длина имплантата числовая"
									/>
								</div>

								<div className="flex flex-col gap-1">
									<div className="flex items-center justify-between">
										<label htmlFor="passport-torque" className="text-xs font-bold text-[var(--ink)]">
											Торк стабилизации:
										</label>
										<span className="text-xs font-mono font-black text-[var(--teal,#0d9488)]">
											{torqueNcm} Н·см
										</span>
									</div>
									<select
										id="passport-torque"
										value={torqueNcm}
										onChange={(e) => setTorqueNcm(Number(e.target.value))}
										className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono font-bold text-[var(--ink)]"
										data-testid="select-torque"
									>
										{QUICK_TORQUE_OPTIONS.map((t) => (
											<option key={t} value={t}>
												{t} Н·см {t === 35 ? "(Идеал)" : ""}
											</option>
										))}
									</select>
									<input
										type="range"
										id="torque-slider"
										min="15"
										max="60"
										step="5"
										value={torqueNcm}
										onChange={(e) => setTorqueNcm(Number(e.target.value))}
										className="w-full h-2 bg-[var(--line)] rounded-lg appearance-none cursor-pointer accent-[var(--teal,#0d9488)] mt-1"
										data-testid="torque-slider"
										aria-label="Ползунок торка первичной стабилизации"
									/>
								</div>

								<div className="flex flex-col gap-1">
									<label htmlFor="passport-lot" className="text-xs font-bold text-[var(--ink)]">
										LOT / Партия завода:
									</label>
									<input
										id="passport-lot"
										type="text"
										value={lotNumber}
										onChange={(e) => setLotNumber(e.target.value)}
										className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono font-bold text-[var(--ink)]"
										data-testid="input-lot input-passport-lot"
									/>
								</div>
							</div>

							{/* Артикул REF и Серийный номер */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="flex flex-col gap-1">
									<label htmlFor="passport-article" className="text-xs font-bold text-[var(--ink)]">
										REF / Каталожный артикул:
									</label>
									<input
										id="passport-article"
										type="text"
										value={catalogArticle}
										onChange={(e) => setCatalogArticle(e.target.value)}
										placeholder="TS3S4010S"
										className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono font-bold text-[var(--ink)]"
										data-testid="input-article input-passport-article"
									/>
								</div>

								<div className="flex flex-col gap-1">
									<label htmlFor="passport-sn" className="text-xs font-bold text-[var(--ink)]">
										Серийный номер (SN):
									</label>
									<input
										id="passport-sn"
										type="text"
										value={serialNumber}
										onChange={(e) => setSerialNumber(e.target.value)}
										className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono font-bold text-[var(--ink)]"
										data-testid="input-sn input-passport-sn"
									/>
								</div>

								{/* Статус склада и мягкий овердрафт (Мандат 8e) */}
								<div className="flex items-center justify-between p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs">
									<span className="text-[var(--muted)]">
										Складской статус: {isOverdraftActive ? "Мягкий овердрафт (задержка накладной)" : "компоненты оприходованы"}
									</span>
									<span className={`text-xs font-semibold ${isOverdraftActive ? "text-amber-500" : "text-[var(--teal,#0d9488)]"}`}>
										{isOverdraftActive ? "Овердрафт разрешен (списание до проведения накладной)" : "В наличии"}
									</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<footer className="implant-passport-actions">
					<div
						className="text-xs text-[var(--muted)] truncate"
						title={`${selectedSystem.brand} Ø ${diameterMm} × ${lengthMm} мм · ${torqueNcm} Н·см`}
					>
						{selectedSystem.brand} Ø {diameterMm} × {lengthMm} мм · {torqueNcm} Н·см
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrintPassport}
							className="implant-touch-btn bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-1.5"
							data-testid="btn-print-implant-passport-footer implant-print-passport-btn"
							title="Распечатать паспорт имплантата"
						>
							<Printer size={15} className="text-[var(--teal,#0d9488)]" />
							<span>Печать</span>
						</button>

						<button
							type="button"
							onClick={handleInsertDiary}
							className="implant-touch-btn bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-1.5"
							data-testid="btn-passport-insert-diary implant-insert-diary-btn"
						>
							<FileText size={16} />
							<span>Внести в карту 043/у</span>
						</button>

						<button
							type="button"
							onClick={handleSave}
							className="implant-touch-btn bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs flex items-center gap-1.5"
							data-testid="btn-save-implant-passport implant-save-passport-btn"
						>
							<CheckCircle2 size={16} />
							<span>Сохранить паспорт в карту 043/у</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default ImplantPassportModal;
