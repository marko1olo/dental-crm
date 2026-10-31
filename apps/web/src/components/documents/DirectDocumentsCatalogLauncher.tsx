/**
 * apps/web/src/components/documents/DirectDocumentsCatalogLauncher.tsx
 *
 * Standalone лаунчер каталога документов, согласий 1051н и справок НДФЛ.
 * Мандат 8aq: Монтирование в живой UI (AppShell).
 * Реагирует на:
 * - Хэши URL: #documents, #consents, #intake-package, #ndfl, #documents-catalog
 * - Query-параметры: ?documents_catalog=1, ?consent_sign_drawer=1
 * - Событие CustomEvent: "dente:open-documents"
 */

import React, { useEffect, useMemo, useState } from "react";
import { DocumentsView } from "../../DocumentsView";
import { ClinicalVisitPackageModal } from "./ClinicalVisitPackageModal";
import { ConsentModal } from "../consents/ConsentModal";
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
	{ id: "doc-01", kind: "paid_medical_services_contract" as const, title: "Договор оказания платных медицинских услуг", status: "issued" as const, patientId: "pat-demo-01", createdAt: "2026-10-25T10:00:00Z", issuedAt: "2026-10-25T10:15:00Z" },
	{ id: "doc-02", kind: "informed_consent" as const, title: "Информированное добровольное согласие на лечение", status: "issued" as const, patientId: "pat-demo-01", createdAt: "2026-10-25T10:05:00Z", issuedAt: "2026-10-25T10:16:00Z" },
	{ id: "doc-03", kind: "dental_medical_card_043u" as const, title: "Медицинская карта приёма", status: "issued" as const, patientId: "pat-demo-01", createdAt: "2026-10-25T10:20:00Z", issuedAt: "2026-10-25T11:00:00Z" },
	{ id: "doc-04", kind: "treatment_plan" as const, title: "План стоматологического лечения", status: "draft" as const, patientId: "pat-demo-01", createdAt: "2026-10-28T14:00:00Z" },
];

export function DirectDocumentsCatalogLauncher(): React.ReactElement | null {
	const [hash, setHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""));
	const [customEventState, setCustomEventState] = useState<{ open: boolean; tab?: "primary" | "clinical" | "tax" } | null>(null);
	const [isPackageOpen, setIsPackageOpen] = useState(false);
	const [packageTab, setPackageTab] = useState<"primary" | "clinical" | "tax">("primary");

	const existingContext = useOptionalAppLogicContext();

	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleHashChange = () => {
			setHash(window.location.hash);
		};

		const handleCustomOpen = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			const targetTab = detail?.tab === "ndfl" || detail?.tab === "tax" ? "tax" : detail?.tab === "clinical" ? "clinical" : "primary";
			setCustomEventState({ open: true, tab: targetTab });
			setPackageTab(targetTab);
			setIsPackageOpen(true);
		};

		window.addEventListener("hashchange", handleHashChange);
		window.addEventListener("dente:open-documents", handleCustomOpen);

		return () => {
			window.removeEventListener("hashchange", handleHashChange);
			window.removeEventListener("dente:open-documents", handleCustomOpen);
		};
	}, []);

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
		handleDirectPrintPrimaryIntake: () => {
			setPackageTab("primary");
			setIsPackageOpen(true);
		},
		money: (rub: number) => `${rub?.toLocaleString("ru-RU") ?? "0"} ₽`,
	}), []);

	if (typeof window === "undefined") return null;

	const s = window.location.search || "";
	const h = hash || "";
	const search = new URLSearchParams(s);

	const isConsentModalStandalone =
		search.get("consent_sign_drawer") === "1" ||
		search.get("patient_consent_drawer") === "1" ||
		h.includes("consent-sign-drawer") ||
		h.includes("patient-consent-drawer");

	if (isConsentModalStandalone) {
		return (
			<div className="fixed inset-0 z-[1000] flex flex-col bg-black/40" data-testid="standalone-consent-drawer-root">
				<ConsentModal
					isOpen={true}
					onClose={() => {
						if (window.location.hash === "#consents") window.location.hash = "";
					}}
					patient={{ id: "p-01", fullName: "Смирнов Алексей Петрович", birthDate: "1988-04-12" } as any}
					doctorFullName="Д-р Воронов Алексей Владимирович"
					clinicName="Стоматология ДЕНТЕ"
					defaultConsentKind="therapeutic"
				/>
			</div>
		);
	}

	const isIntakeHash = h === "#intake-package" || h === "#intake";
	const isNdflHash = h === "#ndfl" || h === "#tax";
	const isDocCatalogStandalone =
		search.get("documents_catalog") === "1" ||
		search.get("document_templates") === "1" ||
		h === "#documents" ||
		h.includes("documents-catalog") ||
		h.includes("documents_catalog") ||
		h.includes("document-templates") ||
		isIntakeHash ||
		isNdflHash ||
		customEventState?.open;

	if (!isDocCatalogStandalone) return null;

	const effectiveTab = isNdflHash ? "tax" : isIntakeHash ? "primary" : packageTab;
	const shouldShowPackageModal = isPackageOpen || isIntakeHash || isNdflHash;

	const content = (
		<div
			className="fixed inset-0 z-[1000] flex flex-col bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#0f172a)] p-3 sm:p-6 overflow-y-auto"
			data-testid="standalone-documents-catalog-root"
		>
			<DocumentsView />
			{shouldShowPackageModal && (
				<ClinicalVisitPackageModal
					isOpen={shouldShowPackageModal}
					onClose={() => {
						setIsPackageOpen(false);
						setCustomEventState(null);
						if (window.location.hash === "#intake-package" || window.location.hash === "#ndfl" || window.location.hash === "#documents") {
							window.location.hash = "";
						}
					}}
					patient={DEMO_PATIENT as any}
					initialTab={effectiveTab}
					doctorFullName="Д-р Воронов М. С."
					existingDocuments={DEMO_DOCUMENTS as any}
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
