import React, { useCallback, useMemo, useState } from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { showToast } from "../../GlobalToast";
import type { DocumentKind } from "@dental/shared";
import { classifyNdflServiceCode } from "@dental/shared";
import type { TaxDeductionTab } from "../../finance/taxDeduction/types";
import type { TaxPaymentRecord } from "../taxCertificateEngine";
import type { ProfessionalA4DocumentTab } from "../ProfessionalDocumentA4Sheet";
import type { DocumentCatalogCategory, DocumentsCatalogViewProps } from "./types";
import { getAllCatalogItems } from "./catalogItems";
import { CatalogToolbar } from "./CatalogToolbar";
import { CatalogCard } from "./CatalogCard";
import { CatalogModals } from "./CatalogModals";

export const DocumentsCatalogView: React.FC<DocumentsCatalogViewProps> = ({
	patient, patientName = "Пациент", patientAgeYears = 6, doctorName, clinicName,
	clinicProfileDraft, existingDocuments, eligibleTaxPayments, onCreateDocument,
	onOpenIssuedDocumentHtml, onOpenDocument, onOpenPrimaryIntakePackage,
	onOpenTaxCertificate, onSelectRegistryTab, onOpenFocusEditor, onOpenAutoclaveLog,
	className = "",
}) => {
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [activeCategory, setActiveCategory] = useState<DocumentCatalogCategory>("all");
	const [isDiplomaModalOpen, setIsDiplomaModalOpen] = useState<boolean>(false);
	const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);
	const [isLocalTaxModalOpen, setIsLocalTaxModalOpen] = useState<boolean>(false);
	const [taxInitialTab, setTaxInitialTab] = useState<TaxDeductionTab>("form");
	const [isLocalIntakeModalOpen, setIsLocalIntakeModalOpen] = useState<boolean>(false);
	const [isOutpatientCardModalOpen, setIsOutpatientCardModalOpen] = useState<boolean>(false);
	const [isContractModalOpen, setIsContractModalOpen] = useState<boolean>(false);
	const [selectedA4Tab, setSelectedA4Tab] = useState<ProfessionalA4DocumentTab | null>(null);

	const { setSelectedDocumentKind } = useDocumentStore();
	const effectivePatientName = patient?.fullName || patientName;

	const mappedTaxPayments = useMemo<TaxPaymentRecord[] | undefined>(() => {
		if (!eligibleTaxPayments || eligibleTaxPayments.length === 0) return undefined;
		return eligibleTaxPayments.map((p, idx) => {
			const amountRub = Number(p.amountRub ?? p.amount ?? 0);
			const rawCode804n = p.code804n ? String(p.code804n).trim() : undefined;
			const serviceName = String(p.description || p.serviceName || "Стоматологические медицинские услуги");
			const isExplicitlyExpensive = p.taxServiceCode === "2" || p.taxCode === "2" || Boolean(p.isExpensiveTreatment);
			const taxCode = isExplicitlyExpensive ? ("2" as const) : classifyNdflServiceCode(serviceName, rawCode804n);
			return {
				id: String(p.id || `pay-${idx}`), dateIso: String(p.paidAt || p.createdAt || p.dateIso || new Date().toISOString()),
				amountRub, amountKopecks: Math.round(amountRub * 100), taxCode, serviceName,
				code804n: rawCode804n || (taxCode === "2" ? "A16.07.054" : "A16.07.002"),
				receiptNumber: String(p.receiptNumber || `ФЧ-${idx + 1}`),
				fiscalDocumentNumber: String(p.fiscalDocumentNumber || `${501 + idx}`),
				fiscalSign: String(p.fiscalSign || `${88776655 + idx}`),
				isRefund: Boolean(p.status === "refunded" || p.isRefund),
			};
		});
	}, [eligibleTaxPayments]);

	const handleOpenKind = useCallback((kind: DocumentKind, titleRu?: string) => {
		setSelectedDocumentKind(kind); onOpenDocument?.(kind);
		if (titleRu) showToast(`Выбран документ: ${titleRu}`, "info", 1500);
	}, [onOpenDocument, setSelectedDocumentKind]);

	const handleOpenIntake = useCallback(() => {
		if (onOpenPrimaryIntakePackage) onOpenPrimaryIntakePackage(); else setIsLocalIntakeModalOpen(true);
	}, [onOpenPrimaryIntakePackage]);

	const handleOpenTax = useCallback((tab: TaxDeductionTab = "form") => {
		setTaxInitialTab(tab);
		if (onOpenTaxCertificate) onOpenTaxCertificate(); else setIsLocalTaxModalOpen(true);
	}, [onOpenTaxCertificate]);

	const catalogItems = useMemo(() => getAllCatalogItems({
		setSelectedA4Tab, handleOpenKind, handleOpenTax, setIsDiplomaModalOpen, setIsConsentModalOpen,
	}), [handleOpenKind, handleOpenTax]);

	const filteredItems = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return catalogItems.filter((i) => {
			if (activeCategory !== "all" && i.category !== activeCategory) return false;
			if (!q) return true;
			return i.titleRu.toLowerCase().includes(q) || i.descriptionRu.toLowerCase().includes(q) || i.badgeRu.toLowerCase().includes(q);
		});
	}, [catalogItems, activeCategory, searchQuery]);

	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = { all: catalogItems.length, intake: 0, clinical: 0, finance_tax: 0, refusal: 0, pediatric: 0 };
		for (const i of catalogItems) counts[i.category] = (counts[i.category] || 0) + 1;
		return counts;
	}, [catalogItems]);

	return (
		<div className={`flex flex-col gap-3 p-3 sm:p-4 bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-xl border border-[var(--line,#e2e8f0)] shadow-xs ${className}`} data-testid="documents-catalog-view">
			<CatalogToolbar
				searchQuery={searchQuery} setSearchQuery={setSearchQuery} activeCategory={activeCategory}
				setActiveCategory={setActiveCategory} categoryCounts={categoryCounts}
				existingDocsCount={existingDocuments?.length ?? 0} onSelectRegistryTab={onSelectRegistryTab}
				onOpenAutoclaveLog={onOpenAutoclaveLog} handleOpenIntake={handleOpenIntake}
				setIsDiplomaModalOpen={setIsDiplomaModalOpen}
			/>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="documents-catalog-grid">
				{filteredItems.map((item) => (
					<CatalogCard key={item.id} item={item} patientDoc={existingDocuments?.find((d) => d.kind === item.kind)} onOpenFocusEditor={onOpenFocusEditor} />
				))}
			</div>
			<CatalogModals
				patient={patient} effectivePatientName={effectivePatientName} patientAgeYears={patientAgeYears}
				doctorName={doctorName} clinicName={clinicName} clinicProfileDraft={clinicProfileDraft}
				existingDocuments={existingDocuments} mappedTaxPayments={mappedTaxPayments}
				isDiplomaModalOpen={isDiplomaModalOpen} setIsDiplomaModalOpen={setIsDiplomaModalOpen}
				isConsentModalOpen={isConsentModalOpen} setIsConsentModalOpen={setIsConsentModalOpen}
				isLocalTaxModalOpen={isLocalTaxModalOpen} setIsLocalTaxModalOpen={setIsLocalTaxModalOpen}
				taxInitialTab={taxInitialTab} isLocalIntakeModalOpen={isLocalIntakeModalOpen}
				setIsLocalIntakeModalOpen={setIsLocalIntakeModalOpen} isOutpatientCardModalOpen={isOutpatientCardModalOpen}
				setIsOutpatientCardModalOpen={setIsOutpatientCardModalOpen} isContractModalOpen={isContractModalOpen}
				setIsContractModalOpen={setIsContractModalOpen} selectedA4Tab={selectedA4Tab}
				setSelectedA4Tab={setSelectedA4Tab} onCreateDocument={onCreateDocument}
				onOpenIssuedDocumentHtml={onOpenIssuedDocumentHtml} handleOpenKind={handleOpenKind}
			/>
		</div>
	);
};
