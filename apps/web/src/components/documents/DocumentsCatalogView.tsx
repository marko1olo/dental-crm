import React from "react";
import type { DocumentsCatalogViewProps } from "./catalog/types";
import { CatalogToolbar } from "./catalog/CatalogToolbar";
import { CatalogCard } from "./catalog/CatalogCard";
import { CatalogModals } from "./catalog/CatalogModals";
import { CatalogExpressBar } from "./catalog/CatalogExpressBar";
import { useDocumentsCatalogState } from "./catalog/useDocumentsCatalogState";

export * from "./catalog/types";

/**
 * DocumentsCatalogView — масштабируемый каталог документов, информированных согласий (ИДС)
 * и справок для налогового вычета (ФНС) DENTE Dental CRM.
 *
 * Принципы Мандата 8e и Первых Принципов:
 * 1. Пакет первичного приёма печатается в 1 клик без 10 промежуточных окон.
 * 2. Никаких сырых номеров бланков и канцелярщины в интерфейсе.
 * 3. Кнопки «Печать» и «Сохранить» никогда не блокируются (disabled).
 * 4. Незаполненные реквизиты честно печатаются строками "___________" для ручного заполнения.
 */
export const DocumentsCatalogView: React.FC<DocumentsCatalogViewProps> = (props) => {
	const {
		patient, patientName = "Пациент", patientAgeYears = 6, doctorName, clinicName,
		clinicProfileDraft, existingDocuments, onCreateDocument, onOpenIssuedDocumentHtml,
		onSelectRegistryTab, onOpenFocusEditor, onOpenAutoclaveLog, className = "",
	} = props;

	const s = useDocumentsCatalogState(props);
	const effectivePatientName = patient?.fullName || patientName;

	return (
		<div
			className={`flex flex-col gap-3 p-3 sm:p-4 bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-xl border border-[var(--line,#e2e8f0)] shadow-xs ${className}`}
			data-testid="documents-catalog-view"
		>
			<CatalogToolbar
				searchQuery={s.searchQuery}
				setSearchQuery={s.setSearchQuery}
				activeCategory={s.activeCategory}
				setActiveCategory={s.setActiveCategory}
				categoryCounts={s.categoryCounts}
				existingDocsCount={existingDocuments?.length ?? 0}
				onSelectRegistryTab={onSelectRegistryTab}
				onOpenAutoclaveLog={onOpenAutoclaveLog}
				handleOpenIntake={s.handleOpenIntake}
				setIsDiplomaModalOpen={s.setIsDiplomaModalOpen}
			/>

			<CatalogExpressBar
				onFastPrintPrimaryIntake={s.handleFastPrintPrimaryIntake}
				onOpenTax={() => s.handleOpenTax("form")}
			/>

			<div
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
				data-testid="documents-catalog-grid"
			>
				{s.filteredItems.map((item) => (
					<CatalogCard
						key={item.id}
						item={item}
						patientDoc={existingDocuments?.find((d) => d.kind === item.kind)}
						onOpenFocusEditor={onOpenFocusEditor}
					/>
				))}
			</div>

			<CatalogModals
				patient={patient}
				effectivePatientName={effectivePatientName}
				patientAgeYears={patientAgeYears}
				doctorName={doctorName}
				clinicName={clinicName}
				clinicProfileDraft={clinicProfileDraft}
				existingDocuments={existingDocuments}
				mappedTaxPayments={s.mappedTaxPayments}
				isDiplomaModalOpen={s.isDiplomaModalOpen}
				setIsDiplomaModalOpen={s.setIsDiplomaModalOpen}
				isConsentModalOpen={s.isConsentModalOpen}
				setIsConsentModalOpen={s.setIsConsentModalOpen}
				isLocalTaxModalOpen={s.isLocalTaxModalOpen}
				setIsLocalTaxModalOpen={s.setIsLocalTaxModalOpen}
				taxInitialTab={s.taxInitialTab}
				isLocalIntakeModalOpen={s.isLocalIntakeModalOpen}
				setIsLocalIntakeModalOpen={s.setIsLocalIntakeModalOpen}
				isOutpatientCardModalOpen={s.isOutpatientCardModalOpen}
				setIsOutpatientCardModalOpen={s.setIsOutpatientCardModalOpen}
				isContractModalOpen={s.isContractModalOpen}
				setIsContractModalOpen={s.setIsContractModalOpen}
				selectedA4Tab={s.selectedA4Tab}
				setSelectedA4Tab={s.setSelectedA4Tab}
				onCreateDocument={onCreateDocument}
				onOpenIssuedDocumentHtml={onOpenIssuedDocumentHtml}
				handleOpenKind={s.handleOpenKind}
			/>
		</div>
	);
};

export default DocumentsCatalogView;
