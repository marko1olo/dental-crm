/**
 * apps/web/src/components/documents/DirectDocumentsCatalogLauncher.tsx
 * Standalone лаунчер каталога шаблонов документов (?documents_catalog=1, #documents-catalog)
 * Мандат 8aq: Монтирование в живой UI. Мандат 8b: строго <= 120 строк.
 */

import React, { useState } from "react";
import { DocumentsTemplateGrid } from "../../documentsView/DocumentsTemplateGrid";
import { PrimaryIntakePackageModal } from "./PrimaryIntakePackageModal";
import { PatientConsentSignDrawer } from "./PatientConsentSignDrawer";

export function DirectDocumentsCatalogLauncher(): React.ReactElement | null {
	const [isIntakeOpen, setIsIntakeOpen] = useState(false);
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	const search = new URLSearchParams(s);

	const isConsentDrawerStandalone =
		search.get("consent_sign_drawer") === "1" ||
		search.get("patient_consent_drawer") === "1" ||
		h.includes("consent-sign-drawer") ||
		h.includes("patient-consent-drawer");

	if (isConsentDrawerStandalone) {
		return (
			<div className="fixed inset-0 z-[1000] flex flex-col bg-black/40" data-testid="standalone-consent-drawer-root">
				<PatientConsentSignDrawer
					isOpen={true}
					onClose={() => {}}
					patient={{ id: "p-01", fullName: "Смирнов Алексей Петрович", birthDate: "1988-04-12" } as any}
					doctorFullName="Д-р Воронов Алексей Владимирович"
					clinicName="Стоматология ДЕНТЕ Премиум"
					defaultConsentKind="therapeutic"
				/>
			</div>
		);
	}

	const isDocCatalogStandalone =
		search.get("documents_catalog") === "1" ||
		search.get("document_templates") === "1" ||
		h.includes("documents-catalog") ||
		h.includes("documents_catalog") ||
		h.includes("document-templates");

	if (!isDocCatalogStandalone) return null;

	return (
		<div
			className="fixed inset-0 z-[1000] flex flex-col bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#0f172a)] p-4 sm:p-6 overflow-y-auto"
			data-testid="standalone-documents-catalog-root"
		>
			<DocumentsTemplateGrid
				selectedDocumentKind="primary_intake_package"
				onSelectDocumentKind={() => {}}
				onCreateDocument={() => {}}
				onOpenFocusEditor={() => {}}
				activeCategoryTab="all"
				searchQuery=""
				onOpenPrimaryIntakePackage={() => setIsIntakeOpen(true)}
			/>
			{isIntakeOpen && (
				<PrimaryIntakePackageModal
					isOpen={isIntakeOpen}
					onClose={() => setIsIntakeOpen(false)}
					patient={null}
				/>
			)}
		</div>
	);
}

export function renderDocumentsCatalogLauncher(): React.ReactElement | null {
	return <DirectDocumentsCatalogLauncher />;
}

export default DirectDocumentsCatalogLauncher;
