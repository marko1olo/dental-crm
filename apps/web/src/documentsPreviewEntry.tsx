import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./theme.css";
import "./styles/modules/documents.css";
import "./components/documents/documentNavigation.css";

import { DocumentNavTabs, type DocumentCategoryTab } from "./components/documents/DocumentNavTabs";
import { DocumentQuickRoleScenarios } from "./components/documents/DocumentQuickRoleScenarios";
import { PatientContractsSection } from "./components/documents/PatientContractsSection";
import { SurgicalPackageModal } from "./components/documents/SurgicalPackageModal";
import { TaxAccountingPackageModal } from "./components/documents/TaxAccountingPackageModal";
import { SanpinRegistryPackageModal } from "./components/documents/SanpinRegistryPackageModal";
import { OutpatientCardPrintModal } from "./components/documents/OutpatientCardPrintModal";
import { SickLeaveElnModal } from "./components/documents/sickLeave/SickLeaveElnModal";

const SAMPLE_PATIENT = {
	id: "pat-1",
	fullName: "Смирнов Алексей Викторович",
	birthDate: "1988-06-15",
	phone: "+7 (916) 123-45-67",
	gender: "male" as const,
	notes: "Аллергия на пенициллиновый ряд",
	createdAt: new Date().toISOString(),
	administrativeProfile: {
		snils: "123-456-789 00",
		passportSeries: "4510",
		passportNumber: "123456",
		passportIssuedBy: "ОВД Замоскворечье г. Москвы",
		passportIssuedDate: "2010-07-20",
		passportDepartmentCode: "770-001",
		registrationAddress: "г. Москва, ул. Большая Ордынка, д. 24, кв. 12",
	},
};

const SAMPLE_DOCUMENTS: any[] = [
	{
		id: "doc-contract-1",
		kind: "paid_medical_services_contract",
		title: "Договор возмездного оказания стоматологических услуг № Д-2026/042",
		status: "signed",
		createdAt: "2026-04-10T10:00:00Z",
		patientId: "pat-1",
		patientName: "Смирнов Алексей Викторович",
		payload: { contractNumber: "Д-2026/042", totalRub: 65000 },
	},
	{
		id: "doc-consent-1",
		kind: "informed_consent",
		title: "Информированное добровольное согласие (ИДС)",
		status: "signed",
		createdAt: "2026-04-10T10:15:00Z",
		patientId: "pat-1",
		patientName: "Смирнов Алексей Викторович",
	},
	{
		id: "doc-043-1",
		kind: "dental_medical_card_043u",
		title: "Медицинская карта стоматологического пациента",
		status: "active",
		createdAt: "2026-04-10T10:30:00Z",
		patientId: "pat-1",
		patientName: "Смирнов Алексей Викторович",
	},
];

function DocumentsPreviewApp() {
	const [activeTab, setActiveTab] = useState<DocumentCategoryTab>("all");
	const [isSurgicalOpen, setIsSurgicalOpen] = useState(false);
	const [isTaxOpen, setIsTaxOpen] = useState(false);
	const [isSanpinOpen, setIsSanpinOpen] = useState(false);
	const [isOutpatientOpen, setIsOutpatientOpen] = useState(false);
	const [isSickLeaveOpen, setIsSickLeaveOpen] = useState(
		typeof window !== "undefined" && window.location.search.includes("open=sick-leave")
	);

	const counts: Record<DocumentCategoryTab, number> = {
		all: 14,
		intake: 4,
		clinical: 5,
		finance_tax: 3,
		certificates_sanpin: 2,
	};

	return (
		<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] p-4 md:p-6 flex flex-col gap-6">
			{/* Header */}
			<header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
				<div>
					<h1 className="text-xl md:text-2xl font-bold tracking-tight">Документооборот и Договоры</h1>
					<p className="text-sm text-[var(--muted)]">
						Пациент: <span className="font-semibold text-[var(--ink)]">{SAMPLE_PATIENT.fullName}</span> • СНИЛС: {SAMPLE_PATIENT.administrativeProfile.snils}
					</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						className="primary-button"
						onClick={() => setIsOutpatientOpen(true)}
						data-testid="preview-open-card-btn"
					>
						Печать карты приёма
					</button>
					<button
						type="button"
						className="secondary-button"
						onClick={() => setIsSickLeaveOpen(true)}
						data-testid="open-sick-leave-eln-modal-btn"
					>
						Больничный лист (ЭЛН)
					</button>
				</div>
			</header>

			{/* Navigation Tabs */}
			<section>
				<DocumentNavTabs
					activeTab={activeTab}
					onSelectTab={setActiveTab}
					counts={counts}
				/>
			</section>

			{/* Quick Role Scenarios */}
			<section>
				<h2 className="text-xs uppercase font-bold tracking-wider text-[var(--muted)] mb-2">Быстрые сценарии (0-Click)</h2>
				<DocumentQuickRoleScenarios
					onOpenPrimaryIntake={() => {}}
					onOpenClinicalVisit={() => setIsOutpatientOpen(true)}
					onOpenSurgicalPackage={() => setIsSurgicalOpen(true)}
					onOpenTaxAccounting={() => setIsTaxOpen(true)}
					onOpenSanpinRegistry={() => setIsSanpinOpen(true)}
					onOpenSickLeaveEln={() => setIsSickLeaveOpen(true)}
				/>
			</section>

			{/* Patient Contracts Section */}
			<section className="bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper-subtle,#0f172a)] p-4 rounded-xl border border-[var(--line)]">
				<PatientContractsSection
					patient={SAMPLE_PATIENT as any}
					contracts={SAMPLE_DOCUMENTS}
					onCreateContract={() => {}}
					onOpenContract={() => {}}
					onPrintBlankContract={() => {}}
				/>
			</section>

			{/* Modals */}
			<SurgicalPackageModal
				isOpen={isSurgicalOpen}
				onClose={() => setIsSurgicalOpen(false)}
				patient={SAMPLE_PATIENT as any}
				doctorFullName="Д-р Воронов Алексей Владимирович"
				existingDocuments={SAMPLE_DOCUMENTS}
				onCreateDocument={() => {}}
				onOpenDocument={() => {}}
				onSelectDocumentKind={() => {}}
			/>

			<TaxAccountingPackageModal
				isOpen={isTaxOpen}
				onClose={() => setIsTaxOpen(false)}
				patient={SAMPLE_PATIENT as any}
				taxYear={2026}
				setTaxYear={() => {}}
				payerOptions={[]}
				selectedPayerKey="patient"
				onSelectPayerKey={() => {}}
				existingDocuments={SAMPLE_DOCUMENTS}
				onCreateDocument={() => {}}
				onOpenDocument={() => {}}
				onSelectDocumentKind={() => {}}
				onOpenFnsXmlModal={() => {}}
			/>

			<SanpinRegistryPackageModal
				isOpen={isSanpinOpen}
				onClose={() => setIsSanpinOpen(false)}
				patient={SAMPLE_PATIENT as any}
				onOpenSickLeaveEln={() => setIsSickLeaveOpen(true)}
				onOpenAutoclaveLog257={() => {}}
				onOpenEgiszRemd={() => {}}
				onOpenPsoJournal366={() => {}}
				onOpenSanpinRegisters={() => {}}
				onSelectDocumentKind={() => {}}
				onCreateDocument={() => {}}
				existingDocuments={SAMPLE_DOCUMENTS}
			/>

			<OutpatientCardPrintModal
				isOpen={isOutpatientOpen}
				onClose={() => setIsOutpatientOpen(false)}
				patient={SAMPLE_PATIENT as any}
				doctorFullName="Д-р Воронов Алексей Владимирович"
			/>

			<SickLeaveElnModal
				isOpen={isSickLeaveOpen}
				onClose={() => setIsSickLeaveOpen(false)}
				initialPatientName={SAMPLE_PATIENT.fullName}
				initialPatientBirthDate={SAMPLE_PATIENT.birthDate}
				initialPatientSnils={SAMPLE_PATIENT.administrativeProfile.snils}
				initialPatientGender={SAMPLE_PATIENT.gender}
				initialDoctorFio="Д-р Воронов Алексей Владимирович"
				initialDoctorSpecialty="Врач-стоматолог-терапевт"
			/>
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<DocumentsPreviewApp />);
}
