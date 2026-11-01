/**
 * apps/web/src/components/prescriptions/PrescriptionStudioModal.tsx
 *
 * Каноническая рецептурная студия DENTE Dental CRM (SSOT).
 * Мандаты 8e (Автономия врача), 8n (Соло-практика), 8x (Клинический язык), 8y (Пассивные предупреждения), 8am (1 Primary CTA).
 * Apple HIG: Сенсорные зоны >= 44x44px, Natural Thumb Zone, нативный мобильный Bottom Sheet.
 * Целевой размер фасада: 300–350 строк (Sweet Spot Mandate 8b).
 */

import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Clock, FileText, HeartPulse, ShieldCheck, Sparkles, X } from "lucide-react";
import {
	CANONICAL_DENTAL_DRUGS,
	PATIENT_CARE_RECOMMENDATIONS,
	findDrugById,
	formatSoapPrescriptionText,
	type DentalOutpatientDrug,
	type DentalFastPrescriptionSet,
} from "./prescriptionCatalogData";
import { formatPatientPrescriptionMemo } from "./generator";
import { PrescriptionPrintSheet } from "./PrescriptionPrintSheet";
import {
	PrescriptionQuickSets,
	PrescriptionDrugList,
	PrescriptionFooterActions,
} from "./studio";
import "./prescriptionStudio.css";

export interface PrescriptionStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		readonly id?: string | undefined;
		readonly fullName?: string | undefined;
		readonly name?: string | undefined;
		readonly birthDate?: string | undefined;
		readonly cardNumber?: string | undefined;
		readonly medicalCardNumber?: string | undefined;
		readonly allergies?: readonly string[] | string | undefined;
		readonly chronicDiseases?: readonly string[] | string | undefined;
	} | null | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly diary?: {
		readonly diagnosisIcd10?: string | undefined;
		readonly anamnesisVitae?: string | undefined;
		readonly notes?: string | undefined;
	} | undefined;
	readonly allergies?: readonly string[] | string | undefined;
	readonly initialSelectedDrugIds?: readonly string[] | undefined;
	readonly onInsertToDiary?: ((rxText: string) => void) | undefined;
	readonly onPrint?: (() => void) | undefined;
	readonly onSave?: ((savedRx: unknown) => void) | undefined;
	readonly disablePortal?: boolean | undefined;
}

export const PrescriptionStudioModal: React.FC<PrescriptionStudioModalProps> = ({
	isOpen,
	onClose,
	patient,
	patientName: propPatientName,
	doctorName = "Д-р Соколов А. В.",
	doctorSpecialty = "Врач-стоматолог-терапевт",
	clinicName = "Стоматологическая клиника «ДЕНТЕ»",
	clinicAddress = "г. Москва, ул. Большая Полянка, д. 28, стр. 1",
	clinicPhone = "+7 (495) 215-55-40",
	clinicOgrn = "ОГРН 1157746123456",
	diary,
	allergies: propAllergies,
	initialSelectedDrugIds,
	onInsertToDiary,
	onPrint,
	onSave,
	disablePortal = false,
}) => {
	const patientName = patient?.fullName || patient?.name || propPatientName || "Иванова Мария Сергеевна";
	const patientCard = patient?.medicalCardNumber || patient?.cardNumber || "К-4821";
	const patientBirthDate = patient?.birthDate || "1988-04-12";

	const rawAllergies = patient?.allergies || propAllergies || [];
	const allergiesList: string[] = useMemo(() => {
		if (Array.isArray(rawAllergies)) return rawAllergies.map(String);
		if (typeof rawAllergies === "string") return rawAllergies.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
		return [];
	}, [rawAllergies]);

	const allergiesString = allergiesList.join(", ");
	const hasPenicillinAllergy = useMemo(() => /пенициллин|амокси|ампицилл/i.test(allergiesString), [allergiesString]);
	const hasNsaidAllergy = useMemo(() => /нпвс|нпвп|аспирин|кеторол|ибупрофен|нимесулид/i.test(allergiesString), [allergiesString]);

	const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>(() => {
		if (initialSelectedDrugIds !== undefined) return [...initialSelectedDrugIds];
		return ["nimesulide_100", "chlorhexidine_005"];
	});

	const [activeCategory, setActiveCategory] = useState<string>("all");
	const [formType, setFormType] = useState<"standard" | "special">("standard");
	const [mobileTab, setMobileTab] = useState<"catalog" | "preview">("catalog");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [isMemoCopied, setIsMemoCopied] = useState<boolean>(false);
	const [isSoapCopied, setIsSoapCopied] = useState<boolean>(false);

	const selectedDrugs = useMemo(() => {
		return selectedDrugIds.map((id) => findDrugById(id)).filter((d): d is DentalOutpatientDrug => Boolean(d));
	}, [selectedDrugIds]);

	const handleToggleDrug = useCallback((drugId: string) => {
		setSelectedDrugIds((prev) => (prev.includes(drugId) ? prev.filter((id) => id !== drugId) : [...prev, drugId]));
	}, []);

	const handleSelectFastSet = useCallback((set: DentalFastPrescriptionSet) => setSelectedDrugIds([...set.drugIds]), []);
	const handleRemoveDrug = useCallback((drugId: string) => setSelectedDrugIds((prev) => prev.filter((id) => id !== drugId)), []);
	const handleClearDrugs = useCallback(() => setSelectedDrugIds([]), []);

	const filteredDrugs = useMemo(() => {
		return CANONICAL_DENTAL_DRUGS.filter((d) => {
			const matchesCategory = activeCategory === "all" || d.category === activeCategory;
			const query = searchQuery.trim().toLowerCase();
			if (!query) return matchesCategory;
			return (
				matchesCategory &&
				(d.tradeName.toLowerCase().includes(query) ||
					d.activeSubstanceRu.toLowerCase().includes(query) ||
					d.memoInstruction.toLowerCase().includes(query))
			);
		});
	}, [activeCategory, searchQuery]);

	const handleCopyPatientMemo = useCallback(() => {
		if (selectedDrugs.length === 0) {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-toast", {
						detail: { text: "Выберите хотя бы один препарат", type: "warning" },
					}),
				);
			}
			return;
		}

		const memoMeds = selectedDrugs.map((d) => ({
			tradeNameRu: d.tradeName,
			activeSubstanceRu: d.activeSubstanceRu,
			dosageRu: d.dosageRu,
			formRu: d.formRu,
			signaRu: d.signaRussian,
		}));

		const text = formatPatientPrescriptionMemo({
			clinicName,
			clinicPhone,
			patientName,
			doctorName,
			medications: memoMeds,
		});

		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(text).catch(() => {});
		}
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-toast", {
					detail: { text: "Схема приёма лекарств скопирована для отправки пациенту в мессенджер", type: "success" },
				}),
			);
		}
		setIsMemoCopied(true);
		setTimeout(() => setIsMemoCopied(false), 2500);
	}, [clinicName, clinicPhone, patientName, doctorName, selectedDrugs]);

	const handleCopySoap = useCallback(() => {
		const text = formatSoapPrescriptionText(selectedDrugs);
		if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
		if (onInsertToDiary) onInsertToDiary(text);
		setIsSoapCopied(true);
		setTimeout(() => setIsSoapCopied(false), 2500);
	}, [selectedDrugs, onInsertToDiary]);

	const handlePrint = useCallback(() => {
		if (onPrint) onPrint();
		else if (typeof window !== "undefined") window.print();
	}, [onPrint]);

	const handleIssueAndSubmit = useCallback(() => {
		const rxPayload = { patientName, doctorName, clinicName, formType, drugs: selectedDrugs, issuedAt: new Date().toISOString() };
		if (onSave) onSave(rxPayload);
		if (onInsertToDiary) onInsertToDiary(formatSoapPrescriptionText(selectedDrugs));
		onClose();
	}, [patientName, doctorName, clinicName, formType, selectedDrugs, onSave, onInsertToDiary, onClose]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[1000000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-md rx-studio-overlay overflow-hidden"
			role="dialog"
			aria-modal="true"
			aria-label="Рецептурный бланк на лекарственные препараты"
			data-testid="prescription-print-modal"
			data-modal="prescription-modal"
			id="prescription-modal"
		>
			<div
				className="rx-studio-shell flex flex-col w-full max-w-6xl h-[94vh] sm:h-[820px] max-h-[96vh] rounded-t-[24px] sm:rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden min-h-0"
				data-testid="prescription-modal"
			>
				{/* Apple HIG Mobile Drag Handle (36x5px) */}
				<div className="rx-drag-handle w-10 h-1 rounded-full bg-[var(--line)] mx-auto my-2 shrink-0 sm:hidden" aria-hidden="true" />

				{/* Header Bar */}
				<header className="rx-header-bar" title="Медицинская документация: Рецептурный бланк">
					<div className="rx-header-row-1">
						<div className="rx-header-title">
							<HeartPulse className="w-5 h-5 text-[var(--rx-teal)] shrink-0" />
							<span>Рецептурный бланк</span>
							<span className="text-xs px-2 py-0.5 rounded-full bg-[var(--rx-teal-subtle)] text-[var(--rx-teal)] font-mono font-medium shrink-0">
								{patientCard}
							</span>
							<span className="text-xs font-normal text-[var(--rx-ink-muted)] hidden md:inline">
								({formType === "special" ? "Срок действия: 15 дней" : "Срок действия: 60 дней"})
							</span>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="rx-icon-btn min-h-[44px]"
							aria-label="Закрыть студию рецептов"
							title="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					<div className="rx-header-row-2">
						<div className="rx-header-meta">
							<span className="font-semibold text-[var(--rx-ink)]">{patientName}</span>
							<span>•</span>
							<span>{doctorName}</span>
							{diary?.diagnosisIcd10 && (
								<>
									<span>•</span>
									<span className="text-[var(--rx-teal)] font-medium">{diary.diagnosisIcd10}</span>
								</>
							)}
						</div>

						<div className="rx-form-switcher" role="group" aria-label="Тип бланка">
							<button
								type="button"
								onClick={() => setFormType("standard")}
								className={`rx-form-switch-btn ${formType === "standard" ? "active" : ""}`}
							>
								Стандартный рецепт
							</button>
							<button
								type="button"
								onClick={() => setFormType("special")}
								className={`rx-form-switch-btn ${formType === "special" ? "active" : ""}`}
							>
								Специальный бланк
							</button>
						</div>
					</div>
				</header>

				{/* Passive Warning Strip: Allergy Notice (Mandates 8y & 8e) */}
				{(hasPenicillinAllergy || hasNsaidAllergy || allergiesList.length > 0) && (
					<div data-testid="prescription-allergy-modal-banner" className="rx-allergy-strip">
						<div className="rx-allergy-strip-content">
							<AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
							{hasPenicillinAllergy && (
								<span data-testid="allergy-conflict-penicillin">Внимание: у пациента аллергия на пенициллины в анамнезе.</span>
							)}
							{hasNsaidAllergy && (
								<span data-testid="allergy-conflict-nsaid">Внимание: у пациента аллергия на НПВС/аспирин в анамнезе.</span>
							)}
							{!hasPenicillinAllergy && !hasNsaidAllergy && allergiesList.length > 0 && (
								<span>Аллергоанамнез: {allergiesString}</span>
							)}
						</div>
						<span className="rx-allergy-badge-autonomy">Автономия врача (Печать доступна)</span>
					</div>
				)}

				{/* Mobile Segmented Tab Bar */}
				<div className="rx-mobile-tabs">
					<div className="rx-mobile-tabs-grid">
						<button
							type="button"
							onClick={() => setMobileTab("catalog")}
							className={`rx-mobile-tab-btn min-h-[44px] ${mobileTab === "catalog" ? "active" : ""}`}
						>
							<Sparkles className="w-4 h-4" /> Каталог и наборы ({selectedDrugs.length})
						</button>
						<button
							type="button"
							onClick={() => setMobileTab("preview")}
							className={`rx-mobile-tab-btn min-h-[44px] ${mobileTab === "preview" ? "active" : ""}`}
						>
							<FileText className="w-4 h-4" /> Памятка и бланк
						</button>
					</div>
				</div>

				{/* Two-Column Studio Workbench */}
				<div className="rx-workbench-grid">
					{/* Left: 1-Click Fast Presets + Catalog + Active Rp Items */}
					<div className={`rx-workbench-left ${mobileTab === "preview" ? "hidden-mobile" : ""}`}>
						<PrescriptionQuickSets
							onSelectFastSet={handleSelectFastSet}
							hasPenicillinAllergy={hasPenicillinAllergy}
							hasNsaidAllergy={hasNsaidAllergy}
						/>

						<PrescriptionDrugList
							searchQuery={searchQuery}
							onSearchChange={setSearchQuery}
							activeCategory={activeCategory}
							onSelectCategory={setActiveCategory}
							filteredDrugs={filteredDrugs}
							selectedDrugIds={selectedDrugIds}
							onToggleDrug={handleToggleDrug}
							selectedDrugs={selectedDrugs}
							onRemoveDrug={handleRemoveDrug}
							onClearDrugs={handleClearDrugs}
							hasPenicillinAllergy={hasPenicillinAllergy}
							hasNsaidAllergy={hasNsaidAllergy}
						/>
					</div>

					{/* Right: Patient Care Memo + A5 Sheet Preview */}
					<div className={`rx-workbench-right ${mobileTab === "catalog" ? "hidden-mobile" : ""}`}>
						<div className="rx-care-card" data-testid="patient-prescription-memo-card">
							<div className="rx-care-title">
								<Clock className="w-4 h-4 text-[var(--rx-teal)]" />
								<span>Рекомендации пациенту по уходу:</span>
							</div>
							<ul className="rx-care-list">
								{PATIENT_CARE_RECOMMENDATIONS.map((rec, idx) => (
									<li key={idx}>{rec}</li>
								))}
							</ul>
						</div>

						<div className="flex-1 min-h-0">
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--rx-ink-muted)]">
									Предпросмотр бланка А5
								</span>
								<span className="text-[11px] text-[var(--rx-ink-muted)] flex items-center gap-1 font-mono">
									<ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Электронный рецепт
								</span>
							</div>
							<PrescriptionPrintSheet
								formType={formType}
								isSpecial={formType === "special"}
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
				</div>

				{/* Action Footer: Exactly ONE Primary CTA (Mandates 8am, 8e & Apple HIG) */}
				<PrescriptionFooterActions
					onPrint={handlePrint}
					onCopyPatientMemo={handleCopyPatientMemo}
					isMemoCopied={isMemoCopied}
					onCopySoap={handleCopySoap}
					isSoapCopied={isSoapCopied}
					onIssueAndSubmit={handleIssueAndSubmit}
				/>
			</div>
		</div>
	);

	if (disablePortal || typeof document === "undefined") return modalContent;
	return createPortal(modalContent, document.body);
};

export {
	PrescriptionStudioModal as PrescriptionModal,
	PrescriptionStudioModal as PrescriptionWorkspaceModal,
	PrescriptionStudioModal as PrescriptionCockpitModal,
	PrescriptionStudioModal as PrescriptionPrintModal,
};
export type { PrescriptionStudioModalProps as PrescriptionModalProps };
export default PrescriptionStudioModal;
