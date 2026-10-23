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
import "./components/insurance/insurance.css";
import { DmsGuaranteeLetterModal } from "./components/insurance/DmsGuaranteeLetterModal";
import { DmsRegistryExportModal } from "./components/insurance/DmsRegistryExportModal";

const SAMPLE_PATIENT = {
	id: "pat-101",
	fullName: "Ковалёв Роман Станиславович",
	birthDate: "1988-04-12",
	policyNumber: "СГЗ-77-991283",
	insuranceCompany: "АО «СОГАЗ»",
	phone: "+7 (999) 888-77-66",
};

const SAMPLE_INITIAL_LETTER = {
	id: "gl-sogaz-001",
	organizationId: "org-1",
	patientId: "pat-101",
	patientFullName: "Ковалёв Роман Станиславович",
	patientBirthDate: "1988-04-12",
	policyNumber: "СГЗ-77-991283",
	insurerKey: "sogaz",
	insurerName: "АО «СОГАЗ»",
	letterNumber: "ГП-СОГАЗ-2026-8812",
	issueDate: "2026-08-01",
	validFrom: "2026-08-01",
	validUntil: "2026-10-31",
	maxCoverageRub: 50000,
	usedAmountRub: 12500,
	franchisePct: 0,
	franchiseType: "percent" as const,
	franchiseFixedRub: 0,
	programExclusions: ["orthopedics", "bleaching", "implantation"],
	approvedServiceCodes: ["A16.07.002.001", "A11.07.010", "A16.07.030.001"],
	approvedDiagnosisCodes: ["K02.1", "K04.0"],
	notes: "Согласовано лечение кариеса и пульпита зубов 1.6, 1.5. Куратор: Смирнова А.В.",
	status: "active" as const,
};

const SAMPLE_BILL_ITEMS = [
	{
		id: "bill-item-1",
		serviceCode804n: "A16.07.002.001",
		serviceName: "Восстановление зуба пломбой (светоотверждаемый композит)",
		toothNumber: "1.6",
		quantity: 1,
		unitPriceKopecks: 550000,
	},
	{
		id: "bill-item-2",
		serviceCode804n: "A11.07.010",
		serviceName: "Введение лекарственных препаратов в корневой канал",
		toothNumber: "1.6",
		quantity: 1,
		unitPriceKopecks: 320000,
	},
];

function InsurancePreviewApp() {
	const [isOpen, setIsOpen] = useState(true);
	const isRegistry = window.location.search.includes("mode=registry");

	if (isRegistry) {
		return (
			<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center p-4">
				<DmsRegistryExportModal
					isOpen={isOpen}
					onClose={() => setIsOpen(false)}
					records={[]}
				/>
			</div>
		);
	}

	return (
		<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center">
			<DmsGuaranteeLetterModal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				patient={SAMPLE_PATIENT}
				initialLetter={SAMPLE_INITIAL_LETTER}
				billItems={SAMPLE_BILL_ITEMS}
			/>
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<InsurancePreviewApp />);
}
