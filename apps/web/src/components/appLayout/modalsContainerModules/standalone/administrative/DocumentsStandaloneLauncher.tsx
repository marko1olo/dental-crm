import React, { useState } from "react";
import { DocumentNavTabs, type DocumentCategoryTab } from "../../../../documents/DocumentNavTabs";
import { DocumentQuickRoleScenarios } from "../../../../documents/DocumentQuickRoleScenarios";
import { PatientContractsSection } from "../../../../documents/PatientContractsSection";
import { TaxAccountingPackageModal } from "../../../../documents/TaxAccountingPackageModal";
import { OutpatientCardPrintModal } from "../../../../documents/OutpatientCardPrintModal";

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

const SAMPLE_DOCS = [
	{
		id: "doc-contract-1",
		kind: "paid_medical_services_contract",
		title: "Договор на оказание медицинских услуг № Д-2026/042",
		status: "signed",
		createdAt: "2026-04-10T10:00:00Z",
		patientId: "pat-1",
		patientName: "Смирнов Алексей Викторович",
		payload: { contractNumber: "Д-2026/042", totalRub: 65000 },
	},
	{
		id: "doc-tax-1",
		kind: "tax_deduction_certificate",
		title: "Справка об оплате медицинских услуг для налогового вычета",
		status: "active",
		createdAt: "2026-04-10T11:00:00Z",
		patientId: "pat-1",
		patientName: "Смирнов Алексей Викторович",
		payload: { year: 2026, amountKopecks: 6500000 },
	},
];

export function renderDocumentsStandaloneLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	const isDocs = s.includes("documents") || s.includes("docs") || h.includes("documents") || h.includes("docs");
	if (!isDocs) return null;

	return <StandaloneDocumentsHub />;
}

function StandaloneDocumentsHub() {
	const [activeTab, setActiveTab] = useState<DocumentCategoryTab>("all");
	const [isTaxOpen, setIsTaxOpen] = useState(false);
	const [isCardOpen, setIsCardOpen] = useState(false);

	return (
		<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] p-4 md:p-6 flex flex-col gap-6">
			<header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
				<div>
					<h1 className="text-xl md:text-2xl font-bold tracking-tight">Документооборот и Договоры</h1>
					<p className="text-sm text-[var(--muted)]">
						Пациент: <span className="font-semibold text-[var(--ink)]">{SAMPLE_PATIENT.fullName}</span> • СНИЛС: {SAMPLE_PATIENT.administrativeProfile.snils}
					</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<button type="button" className="secondary-button" style={{ minHeight: "36px" }} onClick={() => setIsTaxOpen(true)}>
						Справка для налоговой
					</button>
					<button type="button" className="primary-button" style={{ minHeight: "36px" }} onClick={() => setIsCardOpen(true)}>
						Печать карты приёма
					</button>
				</div>
			</header>

			<section>
				<DocumentNavTabs activeTab={activeTab} onSelectTab={setActiveTab} counts={{ all: 14, intake: 4, clinical: 5, finance_tax: 3, certificates_sanpin: 2 }} />
			</section>

			<section>
				<h2 className="text-xs uppercase font-bold tracking-wider text-[var(--muted)] mb-2">Быстрые сценарии</h2>
				<DocumentQuickRoleScenarios
					onOpenPrimaryIntake={() => {}}
					onOpenClinicalVisit={() => setIsCardOpen(true)}
					onOpenSurgicalPackage={() => {}}
					onOpenTaxAccounting={() => setIsTaxOpen(true)}
					onOpenSanpinRegistry={() => {}}
				/>
			</section>

			<section className="bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper-subtle,#0f172a)] p-4 rounded-xl border border-[var(--line)]">
				<PatientContractsSection
					patient={SAMPLE_PATIENT as any}
					documents={SAMPLE_DOCS}
					onCreateContract={() => {}}
					onOpenDocument={() => {}}
					onPrintContract={() => {}}
					onOpenQuickIntake={() => {}}
				/>
			</section>

			<TaxAccountingPackageModal
				isOpen={isTaxOpen}
				onClose={() => setIsTaxOpen(false)}
				patient={SAMPLE_PATIENT as any}
				doctorFullName="Д-р Воронов Алексей Владимирович"
				existingDocuments={SAMPLE_DOCS}
				onCreateDocument={() => {}}
				onOpenDocument={() => {}}
				onSelectDocumentKind={() => {}}
			/>

			<OutpatientCardPrintModal
				isOpen={isCardOpen}
				onClose={() => setIsCardOpen(false)}
				patient={SAMPLE_PATIENT as any}
				doctorFullName="Д-р Воронов Алексей Владимирович"
			/>
		</div>
	);
}

export const DirectDocumentsLauncher: React.FC = () => {
	return renderDocumentsStandaloneLauncher();
};
