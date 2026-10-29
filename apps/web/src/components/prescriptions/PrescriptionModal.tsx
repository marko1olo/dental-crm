/**
 * PrescriptionModal.tsx — Canonical Single Source of Truth for Medical Prescriptions & Outpatient Pharmacopeia
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y, 8am & Apple HIG).
 * Exactly ONE Primary CTA button #0d9488. Touch target >= 44x44px. Zero decree numbers.
 */

import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
	X,
	Printer,
	Copy,
	Check,
	FileText,
	AlertTriangle,
	Search,
	Sparkles,
	Trash2,
	Plus,
	ShieldCheck,
	ChevronRight,
} from "lucide-react";
import {
	CANONICAL_DENTAL_DRUGS,
	CLINICAL_FAST_SETS,
	findDrugById,
	formatSoapPrescriptionText,
	type DentalOutpatientDrug,
	type DentalFastPrescriptionSet,
} from "./prescriptionCatalogData";
import { PrescriptionPrintSheet } from "./PrescriptionPrintSheet";
import {
	formatPatientPrescriptionMemo,
} from "./generator/prescriptionEngine";
import {
	DENTAL_MEDICATIONS_CATALOG,
} from "./generator/prescriptionPresets";

export interface PrescriptionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		readonly id?: string;
		readonly fullName?: string;
		readonly name?: string;
		readonly birthDate?: string;
		readonly cardNumber?: string;
		readonly medicalCardNumber?: string;
		readonly allergies?: readonly string[] | string;
		readonly chronicDiseases?: readonly string[] | string;
	} | null;
	readonly patientName?: string;
	readonly doctorName?: string;
	readonly doctorSpecialty?: string;
	readonly clinicName?: string;
	readonly clinicAddress?: string;
	readonly clinicPhone?: string;
	readonly clinicOgrn?: string;
	readonly diary?: {
		readonly diagnosisIcd10?: string;
		readonly anamnesisVitae?: string;
		readonly notes?: string;
	};
	readonly allergies?: readonly string[] | string;
	readonly initialSelectedDrugIds?: readonly string[];
	readonly onInsertToDiary?: (rxText: string) => void;
	readonly onPrint?: () => void;
	readonly disablePortal?: boolean;
}

export type PrescriptionDrugItem = DentalOutpatientDrug;
export type PrescriptionFormType = "standard" | "special";

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
	isOpen,
	onClose,
	patient,
	patientName: propPatientName,
	doctorName = "Д-р Соколов А. В.",
	doctorSpecialty = "Врач-стоматолог",
	clinicName = "Стоматологическая клиника «ДЕНТЕ»",
	clinicAddress = "г. Москва, ул. Большая Полянка, д. 28, стр. 1",
	clinicPhone,
	clinicOgrn = "ОГРН 1157746123456",
	diary,
	allergies,
	initialSelectedDrugIds = ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005"],
	onInsertToDiary,
	onPrint,
	disablePortal = false,
}) => {
	// Resolved patient metadata
	const patientName = propPatientName || patient?.fullName || patient?.name || "Иванова Мария Сергеевна";
	const patientCard = patient?.cardNumber || patient?.medicalCardNumber || "К-4821";
	const patientBirthDate = patient?.birthDate || "1988-04-12";

	// Form Type (Standard Rx vs Special Strict Accounting Rx)
	const [formType, setFormType] = useState<PrescriptionFormType>("standard");

	// Active tab on mobile (Apple HIG segmented control)
	const [mobileTab, setMobileTab] = useState<"catalog" | "preview">("catalog");

	// Catalog search & category filter
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState<string>("all");

	// Selected drugs state
	const [selectedDrugs, setSelectedDrugs] = useState<DentalOutpatientDrug[]>(() => {
		const initList: DentalOutpatientDrug[] = [];
		for (const id of initialSelectedDrugIds) {
			const found = findDrugById(id);
			if (found && !initList.some((d) => d.id === found.id)) {
				initList.push(found);
			}
		}
		return initList;
	});

	// UI Action States
	const [isMemoCopied, setIsMemoCopied] = useState(false);
	const [isInsertedToDiary, setIsInsertedToDiary] = useState(false);

	// Allergies & Somatic Detection (Non-blocking Mandate 8e & 8y)
	const rawAllergies = useMemo(() => {
		const arr: string[] = [];
		if (Array.isArray(allergies)) arr.push(...allergies);
		else if (typeof allergies === "string") arr.push(allergies);
		if (Array.isArray(patient?.allergies)) arr.push(...patient.allergies);
		else if (typeof patient?.allergies === "string") arr.push(patient.allergies);
		return arr.join(" ").toLowerCase();
	}, [allergies, patient?.allergies]);

	const hasPenicillinAllergy = useMemo(
		() => rawAllergies.includes("пенициллин") || rawAllergies.includes("амоксициллин"),
		[rawAllergies],
	);

	const hasNsaidAllergy = useMemo(
		() => rawAllergies.includes("нпвс") || rawAllergies.includes("аспирин") || rawAllergies.includes("ибупрофен"),
		[rawAllergies],
	);

	const isPenicillinSelected = useMemo(
		() => selectedDrugs.some((d) => d.category === "antibiotic" && d.id.includes("amoxi")),
		[selectedDrugs],
	);

	const isNsaidSelected = useMemo(
		() => selectedDrugs.some((d) => d.category === "nsaid"),
		[selectedDrugs],
	);

	const hasUlcerOrGastritis = useMemo(() => {
		const chronic = (typeof patient?.chronicDiseases === "string"
			? patient.chronicDiseases
			: Array.isArray(patient?.chronicDiseases)
				? patient.chronicDiseases.join(" ")
				: ""
		).toLowerCase();
		const anamnesis = (diary?.anamnesisVitae || "").toLowerCase();
		return (
			chronic.includes("язв") ||
			chronic.includes("гастрит") ||
			anamnesis.includes("язв") ||
			anamnesis.includes("гастрит")
		);
	}, [patient?.chronicDiseases, diary?.anamnesisVitae]);

	const hasGastroprotection = useMemo(
		() => selectedDrugs.some((d) => d.category === "gastro"),
		[selectedDrugs],
	);

	// Drug Selection Actions
	const handleSelectFastSet = useCallback((set: DentalFastPrescriptionSet) => {
		const newDrugs: DentalOutpatientDrug[] = [];
		for (const id of set.drugIds) {
			const found = findDrugById(id);
			if (found) newDrugs.push(found);
		}
		setSelectedDrugs(newDrugs);
	}, []);

	const handleAddDrug = useCallback((drug: DentalOutpatientDrug) => {
		setSelectedDrugs((prev) => (prev.some((d) => d.id === drug.id) ? prev : [...prev, drug]));
	}, []);

	const handleRemoveDrug = useCallback((id: string) => {
		setSelectedDrugs((prev) => prev.filter((d) => d.id !== id));
	}, []);

	const handleAddGastroprotection = useCallback(() => {
		const omeprazole = findDrugById("omeprazole_20");
		if (omeprazole) handleAddDrug(omeprazole);
	}, [handleAddDrug]);

	// Filtered Catalog
	const filteredCatalog = useMemo(() => {
		return CANONICAL_DENTAL_DRUGS.filter((drug) => {
			if (activeCategory !== "all" && drug.category !== activeCategory) return false;
			if (!searchQuery) return true;
			const q = searchQuery.toLowerCase();
			return (
				drug.tradeName.toLowerCase().includes(q) ||
				drug.activeSubstanceRu.toLowerCase().includes(q) ||
				drug.latinName.toLowerCase().includes(q)
			);
		});
	}, [activeCategory, searchQuery]);

	// Handlers for Outpatient Integration Actions
	const handleCopyPatientMemo = useCallback(() => {
		if (selectedDrugs.length === 0) {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-toast", {
						detail: { text: "Выберите хотя бы один препарат", type: "warning" },
					}),
				);
				window.dispatchEvent(
					new CustomEvent("dente:toast", {
						detail: { text: "Выберите хотя бы один препарат", type: "warning" },
					}),
				);
			}
			return;
		}

		// Convert to generator medications format for maximum compatibility
		const memoMeds = selectedDrugs.map((d) => {
			const foundInGen = DENTAL_MEDICATIONS_CATALOG.find((m) => m.id === d.id);
			if (foundInGen) return foundInGen;
			return {
				id: d.id,
				tradeNameRu: d.tradeName,
				activeSubstanceRu: d.activeSubstanceRu,
				dosageRu: d.dosageRu,
				formRu: d.formRu,
				signaRu: d.signaRussian,
			};
		});

		const memo = formatPatientPrescriptionMemo({
			clinicName,
			clinicPhone,
			patientName,
			doctorName,
			medications: memoMeds,
		});

		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(memo);
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-toast", {
					detail: {
						text: "Схема приёма лекарств скопирована для отправки пациенту в мессенджер",
						type: "success",
					},
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente:toast", {
					detail: {
						text: "Схема приёма лекарств скопирована для отправки пациенту в мессенджер",
						type: "success",
					},
				}),
			);
		}

		setIsMemoCopied(true);
		setTimeout(() => setIsMemoCopied(false), 3000);
	}, [clinicName, clinicPhone, patientName, doctorName, selectedDrugs]);

	const handleInsertToDiary = useCallback(() => {
		const rxText = formatSoapPrescriptionText(selectedDrugs);
		if (onInsertToDiary) {
			onInsertToDiary(rxText);
		}
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:toast", {
					detail: {
						text: "Назначения успешно внесены в медицинскую карту визита (дневник SOAP)",
						type: "success",
					},
				}),
			);
		}
		setIsInsertedToDiary(true);
		setTimeout(() => setIsInsertedToDiary(false), 3000);
	}, [selectedDrugs, onInsertToDiary]);

	const handlePrint = useCallback(() => {
		if (onPrint) {
			onPrint();
		} else if (typeof window !== "undefined") {
			window.print();
		}
	}, [onPrint]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-200 max-w-full overflow-x-clip"
			role="dialog"
			aria-modal="true"
			aria-label="Рецептурный бланк на лекарственные препараты"
			data-testid="prescription-print-modal"
			data-modal="prescription-modal"
			id="prescription-modal"
		>
			<div
				data-testid="prescription-modal"
				className="flex flex-col w-full max-w-6xl max-h-[calc(100vh-64px)] h-[92dvh] sm:h-[820px] rounded-t-[24px] sm:rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden overflow-x-clip min-h-0"
			>
				{/* Apple HIG Tactile Drag Handle (Mobile) */}
				<div className="sm:hidden w-full flex justify-center pt-3 pb-1.5 bg-[var(--paper-soft)] shrink-0 cursor-grab">
					<div className="w-10 h-1 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.5))]" />
				</div>

				{/* Header: Title, Patient Context, Form Type & Close */}
				<header className="px-5 py-3.5 bg-[var(--paper-strong)] border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-[var(--teal,#0d9488)] border border-teal-500/20 flex items-center justify-center shrink-0">
							<FileText className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<h2 className="text-base font-bold text-[var(--ink)] truncate">
									Рецептурный бланк и памятка
								</h2>
								<span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
									{patientCard}
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] truncate">
								Пациент: <strong className="text-[var(--ink)]">{patientName}</strong> · Лечащий врач: {doctorName}
								{diary?.diagnosisIcd10 ? ` · Диагноз: ${diary.diagnosisIcd10}` : ""}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2.5 shrink-0 ml-auto">
						{/* Form Type Selector without decree numbers (Mandate 8x & 8ap) */}
						<div className="hidden md:flex items-center p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs">
							<button
								type="button"
								onClick={() => setFormType("standard")}
								className={`px-3 py-1.5 rounded-md font-medium transition-colors border-0 cursor-pointer ${
									formType === "standard"
										? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
										: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Рецептурный бланк
							</button>
							<button
								type="button"
								onClick={() => setFormType("special")}
								className={`px-3 py-1.5 rounded-md font-medium transition-colors border-0 cursor-pointer ${
									formType === "special"
										? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
										: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Специальный бланк
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-transparent hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border-0 transition-colors cursor-pointer"
							style={{ background: "transparent", color: "var(--muted)" }}
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* Mobile Segmented Tab Bar (Apple HIG) */}
				<div className="flex lg:hidden px-4 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0">
					<div className="grid grid-cols-2 w-full p-1 bg-[var(--paper)] rounded-xl border border-[var(--line)] text-xs font-semibold gap-1">
						<button
							type="button"
							onClick={() => setMobileTab("catalog")}
							className={`min-h-[40px] rounded-lg transition-colors border-0 cursor-pointer ${
								mobileTab === "catalog"
									? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
									: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							style={{
								background: mobileTab === "catalog" ? "var(--teal, #0d9488)" : "var(--paper-soft)",
								color: mobileTab === "catalog" ? "#ffffff" : "var(--muted)",
							}}
						>
							Каталог и наборы ({selectedDrugs.length})
						</button>
						<button
							type="button"
							onClick={() => setMobileTab("preview")}
							className={`min-h-[40px] rounded-lg transition-colors border-0 cursor-pointer ${
								mobileTab === "preview"
									? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
									: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							style={{
								background: mobileTab === "preview" ? "var(--teal, #0d9488)" : "var(--paper-soft)",
								color: mobileTab === "preview" ? "#ffffff" : "var(--muted)",
							}}
						>
							Предпросмотр бланка
						</button>
					</div>
				</div>

				{/* Passive Warning Strip: Allergy & Somatic (Mandates 8e & 8y: Non-blocking Vector Icons Only, Zero Emojis) */}
				{((hasPenicillinAllergy && isPenicillinSelected) ||
					(hasNsaidAllergy && isNsaidSelected) ||
					(hasUlcerOrGastritis && isNsaidSelected && !hasGastroprotection)) ? (
					<div
						data-testid="prescription-allergy-modal-banner"
						className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-950 dark:text-amber-100 flex flex-col gap-1.5 shrink-0"
					>
						{hasPenicillinAllergy && isPenicillinSelected && (
							<div
								data-testid="allergy-conflict-penicillin"
								className="flex items-center gap-2"
							>
								<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
								<span>
									Внимание: у пациента аллергия на пенициллины в анамнезе. Автономия врача (Печать доступна).
								</span>
							</div>
						)}
						{hasNsaidAllergy && isNsaidSelected && (
							<div
								data-testid="allergy-conflict-nsaid"
								className="flex items-center gap-2"
							>
								<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
								<span>
									Внимание: у пациента аллергия на НПВС/аспирин в анамнезе. Автономия врача (Печать доступна).
								</span>
							</div>
						)}
						{hasUlcerOrGastritis && isNsaidSelected && !hasGastroprotection && (
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
									<span>Прием НПВС при гастрите/язве желудка может раздражать слизистую.</span>
								</div>
								<button
									type="button"
									onClick={handleAddGastroprotection}
									className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
								>
									+ Добавить Омепразол 20 мг
								</button>
							</div>
						)}
					</div>
				) : null}

				{/* Two-Column Workbench Body */}
				<div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
					{/* Left Column: 1-Click Fast Sets + Drug Catalog + Selected List */}
					<div
						className={`lg:col-span-6 xl:col-span-7 flex flex-col min-h-0 border-r border-[var(--line)] bg-[var(--paper)] ${
							mobileTab === "preview" ? "hidden lg:flex" : "flex"
						}`}
					>
						{/* 1-Click Clinical Fast Sets Row */}
						<div className="p-4 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
									<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
									Экспресс-наборы в 1 клик
								</span>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{CLINICAL_FAST_SETS.slice(0, 4).concat([
									{
										id: "alveolitis_dry_socket",
										label: "Альвеолит (Сухая лунка)",
										desc: "Амоксиклав 1000 мг + Нимесил 100 мг + Холисал гель",
										drugIds: ["amoxiclav_875_125", "nimesulide_100", "cholisal_gel"],
									},
								]).map((set) => {
									const isSetConflicting =
										(hasPenicillinAllergy && set.drugIds.some((id) => id.includes("amoxi"))) ||
										(hasNsaidAllergy && set.drugIds.some((id) => id.includes("nime") || id.includes("ibu") || id.includes("keto")));
									return (
										<button
											key={set.id}
											type="button"
											onClick={() => handleSelectFastSet(set)}
											className="min-h-[44px] p-2.5 text-left rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)] transition-all flex flex-col justify-between group shadow-2xs relative"
										>
											<div className="flex items-center justify-between gap-1 w-full">
												<div className="font-semibold text-xs text-[var(--ink)] group-hover:text-[var(--teal,#0d9488)] transition-colors truncate">
													{set.label}
												</div>
												{isSetConflicting && (
													<span
														data-testid={`preset-allergy-badge-${set.id}`}
														className="text-[9px] font-bold text-amber-700 bg-amber-500/15 px-1.5 py-0.5 rounded shrink-0"
													>
														Аллерген
													</span>
												)}
											</div>
											<div className="text-[11px] text-[var(--muted)] truncate w-full mt-0.5">
												{set.desc}
											</div>
										</button>
									);
								})}
							</div>
						</div>

						{/* Catalog Filter & Search */}
						<div className="p-3 border-b border-[var(--line)] bg-[var(--paper)] flex flex-wrap items-center gap-2 shrink-0">
							<div className="relative flex-1 min-w-[180px]">
								<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Поиск по названию или действию..."
									className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
								/>
							</div>
							<select
								value={activeCategory}
								onChange={(e) => setActiveCategory(e.target.value)}
								className="px-2.5 py-1.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none"
							>
								<option value="all">Все группы</option>
								<option value="antibiotic">Антибиотики</option>
								<option value="nsaid">Обезболивающие (НПВС)</option>
								<option value="antiseptic">Антисептики</option>
								<option value="mucosa">Слизистая и десны</option>
								<option value="gastro">Гастропротекция</option>
							</select>
						</div>

						{/* Scrollable Drug List & Active Prescriptions */}
						<div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
							{/* Prescribed Drugs Section */}
							<div>
								<div className="flex items-center justify-between mb-2">
									<h4 className="text-xs font-bold text-[var(--ink)]">
										Выписанные препараты ({selectedDrugs.length}):
									</h4>
									{selectedDrugs.length > 0 && (
										<button
											type="button"
											onClick={() => setSelectedDrugs([])}
											className="bg-transparent border-0 text-[11px] text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer"
										>
											Очистить всё
										</button>
									)}
								</div>

								{selectedDrugs.length === 0 ? (
									<div className="p-4 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl bg-[var(--paper-soft)]">
										Препараты не выбраны. Кликните на экспресс-набор выше или выберите из каталога ниже.
									</div>
								) : (
									<div className="flex flex-col gap-2">
										{selectedDrugs.map((drug, idx) => (
											<div
												key={drug.id}
												className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-start justify-between gap-3 shadow-2xs"
											>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<span className="w-5 h-5 rounded-full bg-[var(--paper)] text-[10px] font-bold flex items-center justify-center text-[var(--muted)]">
															{idx + 1}
														</span>
														<span className="font-bold text-xs text-[var(--ink)] truncate">
															{drug.tradeName}
														</span>
														{((hasPenicillinAllergy && drug.id.includes("amoxi")) ||
															(hasNsaidAllergy && drug.category === "nsaid")) && (
															<span
																data-testid={`drug-allergy-badge-${drug.id}`}
																className="text-[9px] font-bold text-amber-700 bg-amber-500/15 px-1.5 py-0.5 rounded"
															>
																Аллерген
															</span>
														)}
														<span className="text-[10px] font-mono text-[var(--muted)] bg-[var(--paper)] px-1.5 py-0.5 rounded border border-[var(--line)]">
															{drug.quantityLabel}
														</span>
													</div>
													<div className="text-[11px] text-[var(--teal,#0d9488)] font-mono italic mt-1 truncate">
														{drug.latinName}
													</div>
													<div className="text-[11px] text-[var(--ink)] mt-1 bg-[var(--paper)] p-1.5 rounded-lg border border-[var(--line-subtle,var(--line))]">
														<strong>Режим:</strong> {drug.signaRussian}
													</div>
												</div>
												<button
													type="button"
													onClick={() => handleRemoveDrug(drug.id)}
													className="bg-transparent border-0 p-1.5 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-[var(--paper)] transition-colors shrink-0 cursor-pointer"
													aria-label={`Удалить ${drug.tradeName}`}
												>
													<Trash2 className="w-4 h-4" />
												</button>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Pharmacopeia Catalog List */}
							<div>
								<h4 className="text-xs font-bold text-[var(--ink)] mb-2">
									Каталог стоматологической фармакопеи:
								</h4>
								<div className="flex flex-col gap-1.5">
									{filteredCatalog.map((drug) => {
										const isSelected = selectedDrugs.some((d) => d.id === drug.id);
										return (
											<div
												key={drug.id}
												className="p-2.5 rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-2 transition-colors"
											>
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-2">
														<span className="font-semibold text-xs text-[var(--ink)] truncate">
															{drug.tradeName}
														</span>
														{((hasPenicillinAllergy && drug.id.includes("amoxi")) ||
															(hasNsaidAllergy && drug.category === "nsaid")) && (
															<span
																data-testid={`drug-allergy-badge-${drug.id}`}
																className="text-[9px] font-bold text-amber-700 bg-amber-500/15 px-1.5 py-0.5 rounded"
															>
																Аллерген
															</span>
														)}
														<span className="text-[10px] text-[var(--muted)]">
															({drug.dosageRu})
														</span>
													</div>
													<div className="text-[11px] text-[var(--muted)] truncate">
														{drug.categoryLabelRu} · {drug.signaRussian}
													</div>
												</div>
												<button
													type="button"
													onClick={() => (isSelected ? handleRemoveDrug(drug.id) : handleAddDrug(drug))}
													className={`h-9 min-h-[36px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
														isSelected
															? "bg-teal-500/15 text-[var(--teal,#0d9488)] border border-teal-500/30"
															: "bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)]"
													}`}
												>
													{isSelected ? (
														<>
															<Check className="w-3.5 h-3.5" />
															<span>В бланке</span>
														</>
													) : (
														<>
															<Plus className="w-3.5 h-3.5" />
															<span>Добавить</span>
														</>
													)}
												</button>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					</div>

					{/* Right Column: Live Printable Sheet Preview */}
					<div
						className={`lg:col-span-6 xl:col-span-5 flex flex-col min-h-0 bg-[var(--paper-soft)] p-4 overflow-y-auto ${
							mobileTab === "catalog" ? "hidden lg:flex" : "flex"
						}`}
					>
						<div className="flex items-center justify-between mb-3 shrink-0">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
								Предпросмотр бланка А5
							</span>
							<span className="text-[11px] text-[var(--muted)] flex items-center gap-1 font-mono">
								<ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
								Электронная подпись
							</span>
						</div>

						{/* Human-readable patient memo card for outpatient care */}
						<div
							data-testid="patient-prescription-memo-card"
							className="mb-4 p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs text-xs flex flex-col gap-2"
						>
							<div className="flex items-center justify-between">
								<span className="font-bold text-[var(--ink)]">Памятка пациенту (WhatsApp/Telegram):</span>
								<span className="text-[10px] text-[var(--muted)]">Человеческий язык</span>
							</div>
							<p className="text-[11px] text-[var(--muted)] leading-relaxed">
								Напоминание о приеме препаратов после приёма формируется автоматически без латыни и сложных аббревиатур.
							</p>
						</div>

						<PrescriptionPrintSheet
							clinicName={clinicName}
							clinicAddress={clinicAddress}
							clinicPhone={clinicPhone}
							clinicOgrn={clinicOgrn}
							patientName={patientName}
							patientBirthDate={patientBirthDate}
							medicalCardNumber={patientCard}
							doctorName={doctorName}
							doctorSpecialty={doctorSpecialty}
							items={selectedDrugs}
							isMemoMode={false}
							className="shadow-md"
						/>
					</div>
				</div>

				{/* Footer Actions: Exactly ONE Primary CTA #0d9488 (Mandate 8am) */}
				<footer
					data-testid="prescription-all-actions-row"
					className="px-4 sm:px-5 py-2.5 sm:py-3 bg-[var(--paper-strong)] border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shrink-0 z-10"
				>
					{/* Left Group: Patient Memo Copy & Print */}
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							data-testid="med-rx-copy-patient-btn"
							title="Скопировать схему приёма и памятку для отправки пациенту в WhatsApp/Telegram"
							onClick={handleCopyPatientMemo}
							className="med-rx-copy-patient-btn secondary-button h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-2 transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
						>
							{isMemoCopied ? (
								<>
									<Check className="w-4 h-4 text-emerald-500 shrink-0" />
									<span className="text-emerald-600 dark:text-emerald-400">Скопировано!</span>
								</>
							) : (
								<>
									<Copy className="w-4 h-4 text-[var(--muted)] shrink-0" />
									<span>Скопировать для пациента (WhatsApp/TG)</span>
								</>
							)}
						</button>

						<button
							type="button"
							data-testid="print-prescription-btn"
							onClick={handlePrint}
							className="med-rx-print-btn secondary-button h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-2 transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
						>
							<Printer className="w-4 h-4 text-[var(--muted)] shrink-0" />
							<span>Печать рецепта (А5)</span>
						</button>

						<button
							type="button"
							data-testid="print-patient-memo-btn"
							onClick={handlePrint}
							className="secondary-button h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
						>
							<Printer className="w-4 h-4 text-[var(--muted)] shrink-0" />
							<span>Печать памятки</span>
						</button>
					</div>

					{/* Right Group: Exactly ONE Primary CTA #0d9488 (Mandate 8am) */}
					<div className="flex items-center gap-3 ml-auto">
						<button
							type="button"
							data-testid="insert-to-diary-btn"
							onClick={handleInsertToDiary}
							className="med-rx-insert-diary-btn h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-5 py-1.5 rounded-xl font-bold text-xs text-white bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] active:scale-[0.98] transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer border-0"
						>
							{isInsertedToDiary ? (
								<>
									<Check className="w-4 h-4 shrink-0" />
									<span>Внесено в карту приёма</span>
								</>
							) : (
								<>
									<Check className="w-4 h-4 shrink-0" />
									<span>Внести в карту приёма</span>
									<ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-80" />
								</>
							)}
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return disablePortal || typeof document === "undefined"
		? modalContent
		: createPortal(modalContent, document.body);
};

PrescriptionModal.displayName = "PrescriptionModal";
