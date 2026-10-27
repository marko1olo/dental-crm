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
import "./components/payroll/doctorPayroll.css";
import { DoctorPayrollTab } from "./views/financeView/DoctorPayrollTab";
import { DoctorPayrollModal } from "./components/payroll/DoctorPayrollModal";
import type { DoctorCompletedServiceItem } from "@dental/shared/payroll";

const SAMPLE_DOCTORS = [
	{ id: "doc-1", name: "Д-р Смирнов А.В.", specialtyId: "general_dentist" },
	{ id: "doc-2", name: "Д-р Кузнецова Е.И.", specialtyId: "therapist" },
	{ id: "doc-3", name: "Д-р Васильев Д.М.", specialtyId: "orthopedist" },
	{ id: "doc-4", name: "Д-р Орлов С.П.", specialtyId: "surgeon_implantologist" },
];

const SAMPLE_SERVICES: DoctorCompletedServiceItem[] = [
	{
		id: "srv-1",
		dateIso: "2026-10-12",
		patientName: "Иванов Иван Петрович",
		medicalCardNumber: "№ 1042/26",
		serviceNameRu: "Керамическая коронка E-max с индивидуальной эстетикой",
		category: "orthopedics",
		grossRevenueKop: 3500000,
		labCostKop: 800000,
		materialCostKop: 250000,
		customCommissionPercent: 30,
		doctorId: "doc-1",
		performerId: "doc-1",
		isPaid: true,
		paidAmountKop: 3500000,
	},
	{
		id: "srv-2",
		dateIso: "2026-10-14",
		patientName: "Сидорова Анна Михайловна",
		medicalCardNumber: "№ 0891/26",
		serviceNameRu: "Эндодонтическое лечение моляра под микроскопом (3 канала)",
		category: "therapy",
		grossRevenueKop: 1800000,
		labCostKop: 0,
		materialCostKop: 300000,
		customCommissionPercent: 28,
		doctorId: "doc-1",
		performerId: "doc-1",
		isPaid: true,
		paidAmountKop: 1800000,
	},
	{
		id: "srv-3",
		dateIso: "2026-10-18",
		patientName: "Козлов Дмитрий Сергеевич",
		medicalCardNumber: "№ 1205/26",
		serviceNameRu: "Комплексная гигиена полости рта Air-Flow + ультразвук",
		category: "hygiene",
		grossRevenueKop: 650000,
		labCostKop: 0,
		materialCostKop: 80000,
		customCommissionPercent: 25,
		doctorId: "doc-1",
		performerId: "doc-1",
		isPaid: true,
		paidAmountKop: 650000,
	},
	{
		id: "srv-4",
		dateIso: "2026-10-22",
		patientName: "Федорова Елена Николаевна",
		medicalCardNumber: "№ 0532/26",
		serviceNameRu: "Установка имплантата Dentium SuperLine + формирователь десны",
		category: "surgery",
		grossRevenueKop: 4500000,
		labCostKop: 0,
		materialCostKop: 1100000,
		customCommissionPercent: 30,
		doctorId: "doc-1",
		performerId: "doc-1",
		isPaid: true,
		paidAmountKop: 4500000,
	},
];

function PayrollPreviewApp() {
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-5 flex flex-col gap-4">
			<header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
				<div>
					<h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--ink)] m-0">
						Зарплата врачей (Doctor Payroll & Net Revenue)
					</h1>
					<p className="text-xs text-[var(--muted)] m-0">
						Клиническая сдельная оплата, Net Revenue (минус ЗТЛ и расходники) &amp; аренда кресла соло-врача
					</p>
				</div>
				<button
					type="button"
					onClick={() => setIsModalOpen(true)}
					className="dente-btn dente-btn-primary min-h-[44px] sm:min-h-0 sm:h-9 px-3.5 text-xs font-semibold rounded-lg bg-[var(--teal,#0d9488)] text-white hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer whitespace-nowrap self-start sm:self-auto"
					data-testid="open-payroll-modal-btn"
				>
					Открыть ведомость
				</button>
			</header>

			<main className="flex-1 w-full max-w-7xl mx-auto">
				<DoctorPayrollTab
					clinicName="ООО «Денте Стоматология»"
					doctorsList={SAMPLE_DOCTORS}
					services={SAMPLE_SERVICES}
					onOpenPayrollModal={() => setIsModalOpen(true)}
				/>
			</main>

			<DoctorPayrollModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				clinicName="ООО «Денте Стоматология»"
				doctorsList={SAMPLE_DOCTORS}
				initialDoctorId="doc-1"
				initialServices={SAMPLE_SERVICES}
			/>
		</div>
	);
}

const rootElem = document.getElementById("root");
if (rootElem) {
	createRoot(rootElem).render(<PayrollPreviewApp />);
}
