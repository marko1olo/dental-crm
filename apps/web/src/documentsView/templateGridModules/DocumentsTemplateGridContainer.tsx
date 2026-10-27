/**
 * DocumentsTemplateGridContainer.tsx
 * Assembled Document Template Catalog with Dual-Tier Desktop Grid & Mobile iOS HIG.
 * Mandates 8b, 8e, 8n, Apple HIG: Strict line limit, 0px horizontal drift.
 */

import React from "react";
import { DocumentAccessibleAnchorForm } from "./DocumentAccessibleAnchorForm";
import { DocumentGridEmptyState } from "./DocumentGridEmptyState";
import { DocumentTemplateCardDesktop } from "./DocumentTemplateCardDesktop";
import { DocumentTemplateCardMobile } from "./DocumentTemplateCardMobile";
import type { DocumentsTemplateGridProps } from "./documentTemplateTypes";
import { PrimaryIntakePackageBanner } from "./PrimaryIntakePackageBanner";
import { useDocumentGridState } from "./useDocumentGridState";

export const DocumentsTemplateGridContainer: React.FC<
	DocumentsTemplateGridProps
> = ({
	selectedDocumentKind,
	onSelectDocumentKind,
	onCreateDocument,
	onOpenFocusEditor,
	activeCategoryTab,
	searchQuery,
	documentCreateSavingKind,
	sanitizedDocumentFactoryGroups,
	documentLabels,
	className = "",
	onOpenPrimaryIntakePackage,
}) => {
	const { filteredTemplates } = useDocumentGridState({
		activeCategoryTab,
		searchQuery,
		documentLabels,
	});

	const showIntakeBanner =
		(!activeCategoryTab || activeCategoryTab === "all" || activeCategoryTab === "intake") &&
		!(searchQuery ?? "").trim();

	const commonActionProps = {
		onSelectDocumentKind,
		onCreateDocument,
		onOpenFocusEditor,
		onOpenPrimaryIntakePackage,
	};

	return (
		<section
			className={`documents-template-grid-section ${className}`}
			aria-label="Сетка шаблонов документов"
			data-testid="documents-catalog-grid"
		>
			<DocumentAccessibleAnchorForm
				selectedDocumentKind={selectedDocumentKind}
				onSelectDocumentKind={onSelectDocumentKind}
				onCreateDocument={onCreateDocument}
				sanitizedDocumentFactoryGroups={sanitizedDocumentFactoryGroups}
				documentLabels={documentLabels}
			/>

			{showIntakeBanner && (
				<PrimaryIntakePackageBanner
					onOpenPrimaryIntakePackage={onOpenPrimaryIntakePackage}
				/>
			)}

			{/* Десктопная сетка карточек */}
			<div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
				{filteredTemplates.map((template) => (
					<DocumentTemplateCardDesktop
						key={template.id}
						template={template}
						isSelected={selectedDocumentKind === template.kind}
						isSaving={documentCreateSavingKind === template.kind}
						{...commonActionProps}
					/>
				))}
			</div>

			{/* Мобильный список iOS Grouped List Cards */}
			<div className="sm:hidden w-full rounded-[16px] bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] divide-y divide-[var(--line-subtle,#f1f5f9)] overflow-hidden shadow-xs">
				{filteredTemplates.map((template) => (
					<DocumentTemplateCardMobile
						key={template.id}
						template={template}
						isSelected={selectedDocumentKind === template.kind}
						isSaving={documentCreateSavingKind === template.kind}
						{...commonActionProps}
					/>
				))}
			</div>

			{filteredTemplates.length === 0 && (
				<DocumentGridEmptyState searchQuery={searchQuery} />
			)}
		</section>
	);
};
