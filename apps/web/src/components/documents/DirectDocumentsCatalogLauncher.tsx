/**
 * apps/web/src/components/documents/DirectDocumentsCatalogLauncher.tsx
 * Standalone лаунчер каталога шаблонов документов (?documents_catalog=1, #documents-catalog)
 * Мандат 8aq: Монтирование в живой UI. Мандат 8b: строго <= 120 строк.
 */

import React, { useMemo, useState } from "react";
import { DocumentsView } from "../../DocumentsView";
import { PrimaryIntakePackageModal } from "./PrimaryIntakePackageModal";
import { PatientConsentSignDrawer } from "./PatientConsentSignDrawer";
import { AppLogicProvider, useOptionalAppLogicContext } from "../../contexts/AppLogicContext";

const DEMO_PATIENT = {
	id: "pat-demo-01",
	fullName: "Смирнов Алексей Петрович",
	birthDate: "1988-04-12",
	phone: "+7 (916) 123-45-67",
	cardNumber: "К-4821",
	gender: "male" as const,
	allergies: ["Пенициллины"],
};

const DEMO_DOCUMENTS = [
	{ id: "doc-01", kind: "paid_medical_services_contract", title: "Договор на оказание медицинских услуг", status: "issued", patientId: "pat-demo-01", createdAt: "2026-10-25T10:00:00Z", issuedAt: "2026-10-25T10:15:00Z" },
	{ id: "doc-02", kind: "informed_voluntary_consent_primary", title: "Информированное добровольное согласие на осмотр", status: "issued", patientId: "pat-demo-01", createdAt: "2026-10-25T10:05:00Z", issuedAt: "2026-10-25T10:16:00Z" },
	{ id: "doc-03", kind: "dental_medical_card_043u", title: "Медицинская карта приёма стоматолога", status: "issued", patientId: "pat-demo-01", createdAt: "2026-10-25T10:20:00Z", issuedAt: "2026-10-25T11:00:00Z" },
	{ id: "doc-04", kind: "therapeutic_treatment_plan", title: "План стоматологического лечения", status: "draft", patientId: "pat-demo-01", createdAt: "2026-10-28T14:00:00Z" },
];

export function DirectDocumentsCatalogLauncher(): React.ReactElement | null {
	const [isIntakeOpen, setIsIntakeOpen] = useState(false);
	const existingContext = useOptionalAppLogicContext();

	const fallbackAppLogic: any = useMemo(() => ({
		dashboard: { patients: [DEMO_PATIENT], documents: DEMO_DOCUMENTS, appointments: [], doctors: [{ id: "doc-01", fullName: "Д-р Воронов М. С.", role: "doctor" }] },
		activePatient: DEMO_PATIENT,
		activeDoctor: { id: "doc-01", fullName: "Д-р Воронов М. С.", role: "doctor" },
		activeDocuments: DEMO_DOCUMENTS,
		activeUsableDocuments: DEMO_DOCUMENTS,
		patientName: DEMO_PATIENT.fullName,
		createDocument: async () => {},
		requestDocumentIssue: () => {},
		requestDocumentVoid: () => {},
		confirmDocumentIssue: async () => {},
		confirmDocumentVoid: async () => {},
		openIssuedDocumentHtml: () => {},
		downloadIssuedDocumentHtml: () => {},
		downloadIssuedDocumentPdf: () => {},
		handleDirectPrintPrimaryIntake: () => setIsIntakeOpen(true),
		money: (rub: number) => `${rub?.toLocaleString("ru-RU") ?? "0"} ₽`,
	}), []);

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
					clinicName="Стоматология ДЕНТЕ"
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

	const content = (
		<div
			className="fixed inset-0 z-[1000] flex flex-col bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#0f172a)] p-3 sm:p-6 overflow-y-auto"
			data-testid="standalone-documents-catalog-root"
		>
			<DocumentsView />
			{isIntakeOpen && (
				<PrimaryIntakePackageModal
					isOpen={isIntakeOpen}
					onClose={() => setIsIntakeOpen(false)}
					patient={null}
				/>
			)}
		</div>
	);

	if (!existingContext) {
		return <AppLogicProvider value={fallbackAppLogic}>{content}</AppLogicProvider>;
	}
	return content;
}

export function renderDocumentsCatalogLauncher(): React.ReactElement | null {
	return <DirectDocumentsCatalogLauncher />;
}

export default DirectDocumentsCatalogLauncher;
