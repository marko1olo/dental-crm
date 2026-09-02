/**
 * ============================================================================
 * CLINICAL DENTAL WARRANTY PASSPORT STUDIO (MODAL HUD)
 * Интерактивный Touch-First интерфейс оформления гарантийных сертификатов,
 * расчета рисков, предпросмотра паспорта A4/A5 и интеграции с формой 043/у
 * ============================================================================
 */

import {
	AlertTriangle,
	Award,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Copy,
	Download,
	Eye,
	FileCheck,
	FileText,
	Layers,
	Plus,
	Printer,
	QrCode,
	RefreshCw,
	ShieldAlert,
	ShieldCheck,
	Sliders,
	Sparkles,
	Trash2,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	addMonthsToDate,
	calculateMultiItemWarrantyTerms,
	calculateWarrantyTerms,
	formatRussianDate,
	formatShortDate,
	generateCertificateId,
	generateQrCodeSvg,
	generateSha256,
	generateWarrantyCertificateHtml,
	type WarrantyCalculationResult,
	type WarrantyCertificateData,
	type WarrantyItem,
	type WarrantyRiskFactors,
} from "./warrantyEngine.js";
import "./warrantyPassport.css";
import {
	DENTAL_MATERIALS_CATALOG,
	getAllWarrantyPresets,
	getWarrantyPreset,
	MANDATORY_WARRANTY_CONDITIONS,
	VITA_SHADES,
	type WarrantyCategory,
	type WarrantyPreset,
} from "./warrantyPresets.js";

export interface WarrantyPassportModalProps {
	isOpen: boolean;
	onClose: () => void;
	patient?: {
		id?: string | undefined;
		fullName?: string | null | undefined;
		birthDate?: string | null | undefined;
		cardNumber?: string | null | undefined;
		phone?: string | null | undefined;
		snils?: string | null | undefined;
	} | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	clinicLegalName?: string | null | undefined;
	clinicLicenseNumber?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	clinicWebsite?: string | null | undefined;
	initialCategory?: WarrantyCategory | undefined;
	initialTeeth?: string[] | undefined;
	onCertificateIssued?: ((certificate: WarrantyCertificateData) => void) | undefined;
	onAttachToForm043u?: ((payload: {
		certificateId: string;
		attachedAt: string;
		fullHtml: string;
		integrityHash: string;
		itemCount: number;
		adjustedWarrantyMonths: number;
	}) => void) | undefined;
}

const UPPER_RIGHT_TEETH = ["18", "17", "16", "15", "14", "13", "12", "11"];
const UPPER_LEFT_TEETH = ["21", "22", "23", "24", "25", "26", "27", "28"];
const LOWER_RIGHT_TEETH = ["48", "47", "46", "45", "44", "43", "42", "41"];
const LOWER_LEFT_TEETH = ["31", "32", "33", "34", "35", "36", "37", "38"];

export const WarrantyPassportModal: React.FC<WarrantyPassportModalProps> = ({
	isOpen,
	onClose,
	patient,
	doctorName = "Д-р Иванов Иван Иванович",
	doctorSpecialty = "Врач-стоматолог ортопед / терапевт",
	clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»",
	clinicLegalName = "ООО «ДЕНТЕ КЛИНИК»",
	clinicLicenseNumber = "ЛО41-01137-77/00368291",
	clinicAddress = "г. Москва, ул. Стоматологическая, д. 24, корп. 1",
	clinicPhone = "+7 (495) 789-01-23",
	clinicWebsite = "https://dente-clinic.ru",
	initialCategory = "composite_restoration",
	initialTeeth = [],
	onCertificateIssued,
	onAttachToForm043u,
}) => {
	const [activeTab, setActiveTab] = useState<"editor" | "preview" | "schedule" | "conditions">("editor");

	// Состояние выбранных зубов для добавления
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>(initialTeeth.length > 0 ? initialTeeth : ["1.6"]);
	const [activeCategory, setActiveCategory] = useState<WarrantyCategory>(initialCategory);
	const [currentWorkTitle, setCurrentWorkTitle] = useState<string>("");
	const [currentMaterial, setCurrentMaterial] = useState<string>("");
	const [currentManufacturer, setCurrentManufacturer] = useState<string>("");
	const [currentCountry, setCurrentCountry] = useState<string>("");
	const [currentShade, setCurrentShade] = useState<string>("A2");
	const [currentLot, setCurrentLot] = useState<string>("");
	const [customWarrantyMonths, setCustomWarrantyMonths] = useState<number | undefined>(undefined);

	// Список позиций гарантийного паспорта
	const [items, setItems] = useState<WarrantyItem[]>([]);

	// Состояние факторов риска пациента
	const [riskFactors, setRiskFactors] = useState<WarrantyRiskFactors>({
		hygieneScore: 1.0,
		kpuIndex: 4,
		bruxism: false,
		nightGuardPrescribed: false,
		nightGuardUsed: false,
		smoking: "none",
		diabetes: "none",
		malocclusion: false,
		periodontitis: "none",
		poorCompliance: false,
		osteoporosis: false,
	});

	const [certificateId, setCertificateId] = useState<string>("");
	const [issueDate, setIssueDate] = useState<string>("");
	const [copiedLink, setCopiedLink] = useState(false);
	const [attachedStatus, setAttachedStatus] = useState(false);

	const initialTeethKey = initialTeeth ? initialTeeth.join(",") : "";

	// Инициализация при открытии модального окна
	useEffect(() => {
		if (isOpen) {
			const id = generateCertificateId("WAR");
			const nowIso = new Date().toISOString().slice(0, 10);
			setCertificateId(id);
			setIssueDate(nowIso);
			setAttachedStatus(false);
			setCopiedLink(false);

			const preset = getWarrantyPreset(initialCategory);
			setActiveCategory(initialCategory);
			setCurrentWorkTitle(preset.title);

			const mat = DENTAL_MATERIALS_CATALOG.find((m) => m.category === initialCategory);
			if (mat) {
				setCurrentMaterial(mat.name);
				setCurrentManufacturer(mat.manufacturer);
				setCurrentCountry(mat.country);
				setCurrentShade(mat.popularShades?.[0] ?? "A2");
			}

			// Если переданы начальные зубы, создаем первичную позицию
			if (initialTeeth && initialTeeth.length > 0) {
				const initialItems: WarrantyItem[] = initialTeeth.map((tooth, idx) => ({
					id: `item_${Date.now()}_${idx}`,
					toothNumber: tooth,
					category: initialCategory,
					clinicalWorkTitle: preset.title,
					materialName: mat?.name ?? preset.recommendedMaterials[0] ?? "Композит световой",
					manufacturer: mat?.manufacturer ?? preset.popularManufacturers[0] ?? "3M ESPE",
					country: mat?.country ?? "США",
					vitaShade: "A2",
					baseWarrantyMonths: preset.baseWarrantyMonths,
					baseServiceLifeMonths: preset.baseServiceLifeMonths,
				}));
				setItems(initialItems);
			} else {
				// Базовая дефолтная позиция
				setItems([
					{
						id: `item_${Date.now()}_0`,
						toothNumber: "1.6",
						category: initialCategory,
						clinicalWorkTitle: preset.title,
						materialName: mat?.name ?? "Filtek Ultimate (3M ESPE)",
						manufacturer: mat?.manufacturer ?? "3M ESPE",
						country: mat?.country ?? "США",
						vitaShade: "A2",
						baseWarrantyMonths: preset.baseWarrantyMonths,
						baseServiceLifeMonths: preset.baseServiceLifeMonths,
					},
				]);
			}
		}
	}, [isOpen, initialCategory, initialTeethKey]);

	// Обработчик выбора категории
	const handleSelectCategory = (cat: WarrantyCategory) => {
		setActiveCategory(cat);
		const preset = getWarrantyPreset(cat);
		setCurrentWorkTitle(preset.title);

		const mat = DENTAL_MATERIALS_CATALOG.find((m) => m.category === cat);
		if (mat) {
			setCurrentMaterial(mat.name);
			setCurrentManufacturer(mat.manufacturer);
			setCurrentCountry(mat.country);
			setCurrentShade(mat.popularShades?.[0] ?? "A2");
		} else {
			setCurrentMaterial(preset.recommendedMaterials[0] ?? "");
			setCurrentManufacturer(preset.popularManufacturers[0] ?? "");
			setCurrentCountry("Германия");
		}
		setCustomWarrantyMonths(undefined);
	};

	// Быстрый выбор материала из каталога
	const handleSelectMaterialMeta = (mat: (typeof DENTAL_MATERIALS_CATALOG)[0]) => {
		setCurrentMaterial(mat.name);
		setCurrentManufacturer(mat.manufacturer);
		setCurrentCountry(mat.country);
		if (mat.popularShades && mat.popularShades.length > 0) {
			setCurrentShade(mat.popularShades[0] ?? "A2");
		}
		setCustomWarrantyMonths(mat.warrantyMonthsDefault);
	};

	// Переключение зуба в зубной формуле
	const toggleTooth = (tooth: string) => {
		const formatted = tooth.includes(".") ? tooth : `${tooth[0]}.${tooth[1]}`;
		setSelectedTeeth((prev) =>
			prev.includes(formatted) ? prev.filter((t) => t !== formatted) : [...prev, formatted],
		);
	};

	// Добавление позиций в гарантийный паспорт
	const handleAddItem = () => {
		if (selectedTeeth.length === 0) return;

		const preset = getWarrantyPreset(activeCategory);
		const newItems: WarrantyItem[] = selectedTeeth.map((tooth, idx) => ({
			id: `item_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
			toothNumber: tooth,
			category: activeCategory,
			clinicalWorkTitle: currentWorkTitle || preset.title,
			materialName: currentMaterial || preset.recommendedMaterials[0] || "Стоматологический материал",
			manufacturer: currentManufacturer || preset.popularManufacturers[0] || "Производитель",
			country: currentCountry || "Германия",
			vitaShade: currentShade || undefined,
			lotNumber: currentLot || undefined,
			baseWarrantyMonths: customWarrantyMonths ?? preset.baseWarrantyMonths,
			baseServiceLifeMonths: preset.baseServiceLifeMonths,
		}));

		setItems((prev) => [...prev, ...newItems]);
		setCurrentLot("");
	};

	// Удаление позиции
	const handleRemoveItem = (id: string) => {
		setItems((prev) => prev.filter((it) => it.id !== id));
	};

	// Расчет сводных гарантийных сроков
	const calculation: WarrantyCalculationResult = useMemo(() => {
		return calculateMultiItemWarrantyTerms(items, riskFactors, issueDate);
	}, [items, riskFactors, issueDate]);

	// Полноценный объект гарантийного сертификата
	const certificateData: WarrantyCertificateData = useMemo(() => {
		const pName = patient?.fullName || "Пациент стоматологической клиники";
		const pCard = patient?.cardNumber || "043-9824";
		const dName = doctorName || "Д-р Иванов Иван Иванович";
		const vUrl = `${clinicWebsite}/portal/warranty?cert=${certificateId}&card=${encodeURIComponent(pCard)}`;
		const qr = generateQrCodeSvg(vUrl, { size: 140 });

		const rawContentForHash = `${certificateId}|${issueDate}|${pName}|${pCard}|${dName}|${items.map((i) => `${i.toothNumber}:${i.category}:${i.materialName}:${i.lotNumber || ""}`).join(";")}|${calculation.adjustedWarrantyMonths}|${calculation.totalRiskMultiplier}`;
		const hash = generateSha256(rawContentForHash);

		return {
			certificateId,
			issueDate,
			patient: {
				fullName: pName,
				birthDate: patient?.birthDate || undefined,
				cardNumber: pCard,
				phone: patient?.phone || undefined,
				snils: patient?.snils || undefined,
			},
			doctor: {
				fullName: dName,
				specialty: doctorSpecialty || "Врач-стоматолог",
			},
			clinic: {
				name: clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»",
				legalName: clinicLegalName || "ООО «ДЕНТЕ КЛИНИК»",
				licenseNumber: clinicLicenseNumber || "ЛО41-01137-77/00368291",
				address: clinicAddress || "г. Москва",
				phone: clinicPhone || "+7 (495) 789-01-23",
				website: clinicWebsite || undefined,
			},
			items,
			calculation,
			verificationUrl: vUrl,
			qrCodeSvg: qr,
			integrityHash: hash,
			signedByDoctor: true,
			signedByChief: true,
			attachedToForm043u: attachedStatus,
		};
	}, [
		certificateId,
		issueDate,
		patient,
		doctorName,
		doctorSpecialty,
		clinicName,
		clinicLegalName,
		clinicLicenseNumber,
		clinicAddress,
		clinicPhone,
		clinicWebsite,
		items,
		calculation,
		attachedStatus,
	]);

	// Генерация готового HTML сертификата
	const certificateHtml = useMemo(() => {
		return generateWarrantyCertificateHtml(certificateData);
	}, [certificateData]);

	// Печать документа
	const handlePrint = useCallback(() => {
		const printWin = window.open("", "_blank", "width=850,height=1000");
		if (printWin) {
			printWin.document.write(certificateHtml);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	}, [certificateHtml]);

	// Прикрепление к карте 043/у
	const handleAttachTo043u = () => {
		setAttachedStatus(true);
		if (onAttachToForm043u) {
			onAttachToForm043u({
				certificateId: certificateData.certificateId,
				attachedAt: new Date().toISOString(),
				fullHtml: certificateHtml,
				integrityHash: certificateData.integrityHash,
				itemCount: certificateData.items.length,
				adjustedWarrantyMonths: certificateData.calculation.adjustedWarrantyMonths,
			});
		}
		if (onCertificateIssued) {
			onCertificateIssued(certificateData);
		}
	};

	// Копирование проверочной ссылки для пациента
	const handleCopyLink = () => {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(certificateData.verificationUrl);
			setCopiedLink(true);
			setTimeout(() => setCopiedLink(false), 2500);
		}
	};

	if (!isOpen) return null;

	const modalContent = (
		<div className="warranty-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
			<div className="warranty-modal-window" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className="warranty-modal-header">
					<div className="warranty-header-left">
						<div className="warranty-header-icon">
							<ShieldCheck size={22} />
						</div>
						<div className="warranty-header-title">
							<h3>Гарантийный паспорт & Сертификат качества</h3>
							<p>
								Закон РФ № 2300-1 «О защите прав потребителей» • Положение СтАР • Медкарта №{" "}
								{patient?.cardNumber || "043/у"}
							</p>
						</div>
					</div>
					<div className="warranty-header-actions">
						<button
							type="button"
							className="warranty-btn-icon"
							onClick={onClose}
							title="Закрыть студию гарантий"
							aria-label="Закрыть"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Navigation Tabs */}
				<div className="warranty-tabs-bar">
					<button
						type="button"
						className={`warranty-tab-btn ${activeTab === "editor" ? "active" : ""}`}
						onClick={() => setActiveTab("editor")}
					>
						<Sliders size={16} />
						Редактор позиций и рисков
					</button>
					<button
						type="button"
						className={`warranty-tab-btn ${activeTab === "preview" ? "active" : ""}`}
						onClick={() => setActiveTab("preview")}
					>
						<Eye size={16} />
						Гарантийный паспорт (A4 / A5)
					</button>
					<button
						type="button"
						className={`warranty-tab-btn ${activeTab === "schedule" ? "active" : ""}`}
						onClick={() => setActiveTab("schedule")}
					>
						<Calendar size={16} />
						График чекапов ({calculation.checkupSchedule.length})
					</button>
					<button
						type="button"
						className={`warranty-tab-btn ${activeTab === "conditions" ? "active" : ""}`}
						onClick={() => setActiveTab("conditions")}
					>
						<FileCheck size={16} />
						Условия сохранения гарантии (СтАР)
					</button>
				</div>

				{/* Modal Body */}
				<div className="warranty-modal-body">
					{activeTab === "editor" && (
						<div className="warranty-studio-grid">
							{/* Left Column: Form and Items */}
							<div className="warranty-studio-main">
								{/* Зубная формула */}
								<div className="warranty-card-section">
									<div className="warranty-section-header">
										<h4>
											<Award size={16} />
											1. Выберите зубы для включения в сертификат:
										</h4>
										<span className="warranty-label">
											Выбрано: {selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "нет"}
										</span>
									</div>

									<div className="warranty-teeth-formula">
										{/* Верхняя челюсть */}
										<div className="warranty-arch-row">
											{UPPER_RIGHT_TEETH.map((t) => {
												const f = `${t[0]}.${t[1]}`;
												const isSel = selectedTeeth.includes(f);
												const hasW = items.some((it) => it.toothNumber === f);
												return (
													<button
														key={t}
														type="button"
														className={`warranty-tooth-chip ${isSel ? "selected" : ""} ${hasW ? "has-work" : ""}`}
														onClick={() => toggleTooth(t)}
													>
														{f}
													</button>
												);
											})}
											<div className="warranty-arch-divider" />
											{UPPER_LEFT_TEETH.map((t) => {
												const f = `${t[0]}.${t[1]}`;
												const isSel = selectedTeeth.includes(f);
												const hasW = items.some((it) => it.toothNumber === f);
												return (
													<button
														key={t}
														type="button"
														className={`warranty-tooth-chip ${isSel ? "selected" : ""} ${hasW ? "has-work" : ""}`}
														onClick={() => toggleTooth(t)}
													>
														{f}
													</button>
												);
											})}
										</div>

										{/* Нижняя челюсть */}
										<div className="warranty-arch-row">
											{LOWER_RIGHT_TEETH.map((t) => {
												const f = `${t[0]}.${t[1]}`;
												const isSel = selectedTeeth.includes(f);
												const hasW = items.some((it) => it.toothNumber === f);
												return (
													<button
														key={t}
														type="button"
														className={`warranty-tooth-chip ${isSel ? "selected" : ""} ${hasW ? "has-work" : ""}`}
														onClick={() => toggleTooth(t)}
													>
														{f}
													</button>
												);
											})}
											<div className="warranty-arch-divider" />
											{LOWER_LEFT_TEETH.map((t) => {
												const f = `${t[0]}.${t[1]}`;
												const isSel = selectedTeeth.includes(f);
												const hasW = items.some((it) => it.toothNumber === f);
												return (
													<button
														key={t}
														type="button"
														className={`warranty-tooth-chip ${isSel ? "selected" : ""} ${hasW ? "has-work" : ""}`}
														onClick={() => toggleTooth(t)}
													>
														{f}
													</button>
												);
											})}
										</div>
									</div>
								</div>

								{/* Категории и нормативы СтАР */}
								<div className="warranty-card-section">
									<div className="warranty-section-header">
										<h4>
											<Layers size={16} />
											2. Нормативная категория стоматологической помощи:
										</h4>
									</div>

									<div className="warranty-presets-grid">
										{getAllWarrantyPresets().map((preset) => (
											<button
												key={preset.category}
												type="button"
												className={`warranty-preset-card ${activeCategory === preset.category ? "active" : ""}`}
												onClick={() => handleSelectCategory(preset.category)}
											>
												<span className="warranty-preset-title">{preset.shortTitle}</span>
												<div className="warranty-preset-meta">
													<span>Гарантия: {preset.baseWarrantyMonths} мес.</span>
													<span>Срок сл.: {Math.round(preset.baseServiceLifeMonths / 12)} г.</span>
												</div>
											</button>
										))}
									</div>

									{/* Форма параметров материала */}
									<div className="warranty-form-row">
										<div className="warranty-form-group full-width">
											<label className="warranty-label">Клиническое описание работы</label>
											<input
												type="text"
												className="warranty-input"
												value={currentWorkTitle}
												onChange={(e) => setCurrentWorkTitle(e.target.value)}
												placeholder="Например: Пломбирование нанокомпозитом Filtek Ultimate"
											/>
										</div>

										<div className="warranty-form-group">
											<label className="warranty-label">Материал & Препарат</label>
											<input
												type="text"
												className="warranty-input"
												value={currentMaterial}
												onChange={(e) => setCurrentMaterial(e.target.value)}
												placeholder="IPS e.max Press, Katana Zirconia..."
											/>
										</div>

										<div className="warranty-form-group">
											<label className="warranty-label">Производитель & Страна</label>
											<input
												type="text"
												className="warranty-input"
												value={currentManufacturer}
												onChange={(e) => setCurrentManufacturer(e.target.value)}
												placeholder="Ivoclar Vivadent (Лихтенштейн)"
											/>
										</div>

										<div className="warranty-form-group">
											<label className="warranty-label">Оттенок по шкале VITA</label>
											<select
												className="warranty-select"
												value={currentShade}
												onChange={(e) => setCurrentShade(e.target.value)}
											>
												{VITA_SHADES.map((s) => (
													<option key={s} value={s}>
														{s}
													</option>
												))}
											</select>
										</div>

										<div className="warranty-form-group">
											<label className="warranty-label">Серийный номер / LOT / UDI</label>
											<input
												type="text"
												className="warranty-input"
												value={currentLot}
												onChange={(e) => setCurrentLot(e.target.value)}
												placeholder="LOT #984214 / SN-842"
											/>
										</div>
									</div>

									<button
										type="button"
										className="warranty-btn-primary"
										onClick={handleAddItem}
										disabled={selectedTeeth.length === 0}
									>
										<Plus size={16} />
										Добавить в гарантийный паспорт ({selectedTeeth.length} поз.)
									</button>
								</div>

								{/* Список добавленных позиций */}
								<div className="warranty-card-section">
									<div className="warranty-section-header">
										<h4>
											<FileText size={16} />
											Позиции гарантийного сертификата ({items.length}):
										</h4>
									</div>

									{items.length === 0 ? (
										<div style={{ color: "var(--ink-2)", fontSize: "13px", padding: "10px 0" }}>
											Позиции не добавлены. Выберите зубы и нажмите «Добавить в гарантийный паспорт».
										</div>
									) : (
										<table className="warranty-items-table">
											<thead>
												<tr>
													<th>Зуб</th>
													<th>Вид работы</th>
													<th>Материал</th>
													<th>Оттенок / LOT</th>
													<th>Гарантия</th>
													<th>Действия</th>
												</tr>
											</thead>
											<tbody>
												{items.map((it) => (
													<tr key={it.id}>
														<td>
															<strong>{it.toothNumber}</strong>
														</td>
														<td>{it.clinicalWorkTitle}</td>
														<td>{it.materialName}</td>
														<td>
															{it.vitaShade ? `Шейд: ${it.vitaShade}` : "—"}
															{it.lotNumber ? ` • ${it.lotNumber}` : ""}
														</td>
														<td>{it.customWarrantyMonths ?? calculation.adjustedWarrantyMonths} мес.</td>
														<td>
															<button
																type="button"
																className="warranty-btn-icon"
																onClick={() => handleRemoveItem(it.id)}
																title="Удалить позицию"
															>
																<Trash2 size={14} />
															</button>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							</div>

							{/* Right Column: Risk Factors & HUD */}
							<div className="warranty-studio-sidebar">
								<div className="warranty-risk-panel">
									<div className="warranty-risk-header">
										<h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
											Калькулятор рисков (OHI-S & Соматика)
										</h4>
										<span className={`warranty-risk-score-badge ${calculation.riskLevel}`}>
											{calculation.riskLevel === "low"
												? "Низкий риск"
												: calculation.riskLevel === "moderate"
													? "Умеренный"
													: calculation.riskLevel === "high"
														? "Высокий риск"
														: "Критический"}
										</span>
									</div>

									{/* OHI-S Гигиенический индекс */}
									<div className="warranty-slider-wrap">
										<div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
											<span className="warranty-label">Индекс гигиены OHI-S (Green-Vermillion):</span>
											<strong style={{ color: "var(--teal)" }}>{riskFactors.hygieneScore.toFixed(1)}</strong>
										</div>
										<input
											type="range"
											min="0.0"
											max="3.0"
											step="0.1"
											value={riskFactors.hygieneScore}
											onChange={(e) =>
												setRiskFactors((prev) => ({ ...prev, hygieneScore: parseFloat(e.target.value) }))
											}
											style={{ width: "100%", accentColor: "var(--teal)" }}
										/>
										<div className="warranty-slider-labels">
											<span>0.0 (Отл.)</span>
											<span>1.2 (Норма)</span>
											<span>1.8 (Удовл.)</span>
											<span>3.0 (Плохо)</span>
										</div>
									</div>

									{/* Бруксизм и каппа */}
									<div className="warranty-toggle-row">
										<span>Бруксизм / Гипертонус мышц</span>
										<button
											type="button"
											className={`warranty-toggle-switch ${riskFactors.bruxism ? "active" : ""}`}
											onClick={() => setRiskFactors((prev) => ({ ...prev, bruxism: !prev.bruxism }))}
											aria-label="Бруксизм"
										/>
									</div>

									{riskFactors.bruxism && (
										<div className="warranty-toggle-row" style={{ paddingLeft: "16px", background: "var(--paper-soft)" }}>
											<span>Ношение защитной каппы</span>
											<button
												type="button"
												className={`warranty-toggle-switch ${riskFactors.nightGuardUsed ? "active" : ""}`}
												onClick={() =>
													setRiskFactors((prev) => ({
														...prev,
														nightGuardUsed: !prev.nightGuardUsed,
														nightGuardPrescribed: true,
													}))
												}
												aria-label="Ночная каппа"
											/>
										</div>
									)}

									{/* Курение */}
									<div className="warranty-form-group">
										<label className="warranty-label">Статус курения табака</label>
										<select
											className="warranty-select"
											value={riskFactors.smoking}
											onChange={(e) =>
												setRiskFactors((prev) => ({
													...prev,
													smoking: e.target.value as "none" | "light" | "heavy",
												}))
											}
										>
											<option value="none">Не курит (0 сигарет)</option>
											<option value="light">Умеренно (до 10 сигарет/сутки)</option>
											<option value="heavy">Интенсивно (&gt; 10 сигарет/сутки)</option>
										</select>
									</div>

									{/* Сахарный диабет */}
									<div className="warranty-form-group">
										<label className="warranty-label">Сахарный диабет</label>
										<select
											className="warranty-select"
											value={riskFactors.diabetes}
											onChange={(e) =>
												setRiskFactors((prev) => ({
													...prev,
													diabetes: e.target.value as "none" | "compensated" | "decompensated",
												}))
											}
										>
											<option value="none">Отсутствует</option>
											<option value="compensated">Компенсированный (HbA1c &lt; 7.0%)</option>
											<option value="decompensated">Декомпенсированный (HbA1c &ge; 7.0%)</option>
										</select>
									</div>

									{/* Патология прикуса */}
									<div className="warranty-toggle-row">
										<span>Травматический прикус / окклюзия</span>
										<button
											type="button"
											className={`warranty-toggle-switch ${riskFactors.malocclusion ? "active" : ""}`}
											onClick={() => setRiskFactors((prev) => ({ ...prev, malocclusion: !prev.malocclusion }))}
											aria-label="Малокклюзия"
										/>
									</div>

									{/* Пародонтит */}
									<div className="warranty-form-group">
										<label className="warranty-label">Заболевания пародонта</label>
										<select
											className="warranty-select"
											value={riskFactors.periodontitis}
											onChange={(e) =>
												setRiskFactors((prev) => ({
													...prev,
													periodontitis: e.target.value as "none" | "mild" | "moderate" | "severe",
												}))
											}
										>
											<option value="none">Пародонт здоров (интактен)</option>
											<option value="mild">Пародонтит легкой степени</option>
											<option value="moderate">Пародонтит средней степени</option>
											<option value="severe">Генерализованный тяжелый пародонтит</option>
										</select>
									</div>

									{/* Итоговый HUD */}
									<div className="warranty-hud-summary">
										<div className="warranty-hud-row">
											<span className="lbl">Базовая гарантия:</span>
											<span className="val">{calculation.baseWarrantyMonths} мес.</span>
										</div>
										<div className="warranty-hud-row">
											<span className="lbl">Коэффициент надежности:</span>
											<span className="val">{Math.round(calculation.totalRiskMultiplier * 100)}%</span>
										</div>
										<div className="warranty-hud-row">
											<span className="lbl">Адаптированная гарантия:</span>
											<span className="val highlight">{calculation.adjustedWarrantyMonths} мес.</span>
										</div>
										<div className="warranty-hud-row">
											<span className="lbl">Срок службы конструкций:</span>
											<span className="val">
												{calculation.adjustedServiceLifeMonths} мес. (
												{(calculation.adjustedServiceLifeMonths / 12).toFixed(1)} лет)
											</span>
										</div>
										<div className="warranty-hud-row">
											<span className="lbl">Следующий обязательный чекап:</span>
											<span className="val" style={{ color: "var(--teal)" }}>
												{formatShortDate(calculation.nextCheckupDueDate)}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{activeTab === "preview" && (
						<div className="warranty-preview-container">
							<div className="warranty-preview-frame">
								<iframe
									title="Гарантийный паспорт предпросмотр"
									className="warranty-preview-iframe"
									srcDoc={certificateHtml}
								/>
							</div>
						</div>
					)}

					{activeTab === "schedule" && (
						<div style={{ maxWidth: "800px", margin: "0 auto" }}>
							<h3 style={{ fontSize: "16px", marginBottom: "12px", color: "var(--ink)" }}>
								Индивидуальный график диспансерных осмотров и профгигиены
							</h3>
							<p style={{ fontSize: "13px", color: "var(--ink-2)", marginBottom: "16px" }}>
								Периодичность контрольных визитов: каждые {calculation.checkupIntervalMonths} мес. для сохранения
								гарантийных обязательств клиники.
							</p>

							<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
								{calculation.checkupSchedule.map((chk) => (
									<div
										key={chk.index}
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											padding: "12px 16px",
											background: "var(--paper-soft)",
											border: "1px solid var(--line)",
											borderRadius: "8px",
										}}
									>
										<div>
											<strong style={{ fontSize: "14px", color: "var(--teal)" }}>Визит #{chk.index}</strong>
											<div style={{ fontSize: "12px", color: "var(--ink-2)", marginTop: "2px" }}>
												{chk.recommendedProcedures.join(" • ")}
											</div>
										</div>
										<div style={{ textAlign: "right" }}>
											<strong style={{ fontSize: "15px", color: "var(--ink)" }}>{chk.formattedDate}</strong>
											<div style={{ fontSize: "11px", color: "var(--ok-fg)", fontWeight: 700 }}>ОБЯЗАТЕЛЬНЫЙ ВИЗИТ</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{activeTab === "conditions" && (
						<div style={{ maxWidth: "860px", margin: "0 auto" }}>
							<h3 style={{ fontSize: "16px", marginBottom: "8px", color: "var(--ink)" }}>
								Обязательные условия сохранения гарантийных обязательств (Закон РФ № 2300-1 & СтАР)
							</h3>
							<p style={{ fontSize: "13px", color: "var(--ink-2)", marginBottom: "16px" }}>
								Гарантия клиники действует при строгом соблюдении пациентом следующих медицинских и эксплуатационных
								требований:
							</p>

							<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
								{MANDATORY_WARRANTY_CONDITIONS.map((cond) => (
									<div
										key={cond.id}
										style={{
											padding: "12px 16px",
											background: "var(--paper-soft)",
											border: "1px solid var(--line)",
											borderRadius: "8px",
										}}
									>
										<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
											<span
												style={{
													width: "22px",
													height: "22px",
													borderRadius: "50%",
													background: "var(--teal)",
													color: "var(--on-teal, #ffffff)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													fontSize: "11px",
													fontWeight: "bold",
												}}
											>
												{cond.number}
											</span>
											<strong style={{ fontSize: "13.5px", color: "var(--ink)" }}>{cond.title}</strong>
										</div>
										<p style={{ fontSize: "12.5px", color: "var(--ink-2)", margin: "4px 0 6px 30px" }}>
											{cond.description}
										</p>
										<div style={{ fontSize: "11.5px", color: "var(--bad-fg)", marginLeft: "30px" }}>
											<strong>Последствия нарушения:</strong> {cond.penaltyDescription}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="warranty-modal-footer">
					<div className="warranty-footer-left">
						<QrCode size={16} />
						<span>Сертификат: {certificateId}</span>
						<span>•</span>
						<span>ЭЦП: {certificateData.integrityHash.slice(0, 16)}...</span>
					</div>

					<div className="warranty-footer-right">
						<button
							type="button"
							className="warranty-btn-secondary"
							onClick={handleCopyLink}
							title="Скопировать ссылку для пациента"
						>
							{copiedLink ? <Check size={16} /> : <Copy size={16} />}
							{copiedLink ? "Ссылка скопирована!" : "Ссылка для пациента"}
						</button>

						<button type="button" className="warranty-btn-secondary" onClick={handlePrint}>
							<Printer size={16} />
							Печать (A4 / A5)
						</button>

						<button
							type="button"
							className="warranty-btn-primary"
							onClick={handleAttachTo043u}
							disabled={attachedStatus}
						>
							{attachedStatus ? <CheckCircle2 size={16} /> : <FileCheck size={16} />}
							{attachedStatus ? "Прикреплено к 043/у" : "Выдать паспорт & В карту 043/у"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return createPortal(modalContent, document.body);
};
