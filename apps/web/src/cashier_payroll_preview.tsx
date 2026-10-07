import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/modules/mobile-shift.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./components/finance/CashShiftWidget.css";
import "./components/finance/payroll/doctorPayroll.css";
import "./styles/dente-operations.css";
import "./styles/modules/mobile-doctor-payout.css";

import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";
import { CashShiftWidget } from "./components/finance/CashShiftWidget";
import { ShiftCloseZReportModal } from "./components/finance/fiscal/ShiftCloseZReportModal";
import { CashRegisterModal } from "./components/finance/CashRegisterModal";
import { DoctorPieceRateCalculatorSection } from "./components/settings/owner/DoctorPieceRateCalculatorSection";
import { DoctorPayrollModal } from "./components/payroll/DoctorPayrollModal";
import { TimesheetT13Modal } from "./components/payroll/TimesheetT13Modal";
import { DoctorPayoutMobileWallet } from "./components/finance/DoctorPayoutMobileWallet";
import { DoctorPayoutDashboard } from "./pages/DoctorPayoutDashboard";
import { AppLogicProvider } from "./contexts/AppLogicContext";
import { PaymentCapture } from "./PaymentCapture";
import type { DoctorPayoutReport, DoctorPayoutRow } from "./pages/DoctorPayoutDashboard";
import type { DoctorCompletedServiceItem } from "./components/payroll/staffPayrollEngine";

const MOCK_DOCTOR_ROW: DoctorPayoutRow = {
	doctorUserId: "doc-sokolov-01",
	doctorName: "Д-р Соколов А. В.",
	role: "Стоматолог-терапевт, ортопед",
	isActive: true,
	revenueRub: 348000,
	paymentCount: 14,
	materialCostRub: 2800,
	materialMovements: 14,
	materialMovementsUnpriced: 0,
	materialsState: "counted",
	labCostRub: 14000,
	labOrdersCount: 2,
	withheldLabRub: 14000,
	commissionPct: 40,
	materialDeductionPct: 25,
	labDeductionPct: 100,
	rateEffectiveFrom: "2026-10-01",
	rateRowCount: 1,
	state: "computed",
	accruedRub: 139200,
	withheldMaterialRub: 700,
	payoutRub: 124500,
	note: "Расчёт по согласованной ставке 40% с удержанием ЗТЛ и части клинических материалов Уровня 2",
	visits: [
		{
			visitId: "v-01",
			appointmentId: "app-01",
			paidAt: "2026-10-05T11:00:00.000Z",
			visitDate: "2026-10-05",
			patientId: "pat-01",
			patientName: "Ковалёв Роман Станиславович",
			medicalCardNumber: "043/у-102",
			revenueRub: 38000,
			paymentCount: 1,
			services: [
				{
					id: "srv-1",
					title: "Протезирование зуба коронкой из диоксида циркония e.max",
					order804nCode: "A16.07.006.002",
					toothCode: "16",
					priceRub: 32000,
					quantity: 1,
				},
				{
					id: "srv-2",
					title: "Восстановление зуба культевой вкладкой",
					order804nCode: "A16.07.003",
					toothCode: "16",
					priceRub: 6000,
					quantity: 1,
				},
			],
			materials: [
				{
					id: "mat-1",
					name: "Салфетки нагрудные одноразовые (клиника)",
					quantity: 1,
					unit: "шт",
					unitCostRub: 4.5,
					totalCostRub: 4.5,
					isOverheadConsumable: true,
					coveredByClinic: true,
				},
				{
					id: "mat-2",
					name: "Валики ватные стоматологические (клиника)",
					quantity: 4,
					unit: "шт",
					unitCostRub: 2.1,
					totalCostRub: 8.4,
					isOverheadConsumable: true,
					coveredByClinic: true,
				},
				{
					id: "mat-3",
					name: "Слепочная масса Variotime Monophase (Heraeus)",
					quantity: 1,
					unit: "картридж",
					unitCostRub: 1400,
					totalCostRub: 1400,
					isOverheadConsumable: false,
					coveredByClinic: false,
				},
			],
		},
		{
			visitId: "v-02",
			appointmentId: "app-02",
			paidAt: "2026-10-05T14:30:00.000Z",
			visitDate: "2026-10-05",
			patientId: "pat-02",
			patientName: "Смирнова Екатерина Васильевна",
			medicalCardNumber: "043/у-105",
			revenueRub: 6300,
			paymentCount: 1,
			services: [
				{
					id: "srv-3",
					title: "Лечение глубокого кариеса световой пломбой Filtek Ultimate",
					order804nCode: "A16.07.002.001",
					toothCode: "24",
					priceRub: 5400,
					quantity: 1,
				},
				{
					id: "srv-4",
					title: "Анестезия инфильтрационная Ubistesin Forte",
					order804nCode: "A16.07.004",
					toothCode: "24",
					priceRub: 900,
					quantity: 1,
				},
			],
			materials: [
				{
					id: "mat-4",
					name: "Перчатки нитриловые смотровые (клиника)",
					quantity: 2,
					unit: "пар",
					unitCostRub: 25,
					totalCostRub: 50,
					isOverheadConsumable: true,
					coveredByClinic: true,
				},
			],
		},
	],
	labOrders: [
		{
			id: "lab-01",
			orderNumber: "ЗТЛ-2026-101",
			toothFdi: "16",
			restorationType: "Коронка из диоксида циркония Multi-Layer",
			material: "Цирконий Katana",
			patientName: "Ковалёв Роман Станиславович",
			status: "ready_in_clinic",
			completedAt: "2026-10-04T12:00:00.000Z",
			priceRub: 14000,
			withheldRub: 14000,
			deductionPct: 100,
		},
	],
};

const MOCK_PAYOUT_REPORT: DoctorPayoutReport = {
	period: {
		from: "2026-10-01T00:00:00.000Z",
		to: "2026-10-31T23:59:59.000Z",
	},
	rows: [MOCK_DOCTOR_ROW],
	totals: {
		revenueRub: 348000,
		paymentCount: 14,
		attributableRevenueRub: 348000,
		unattributedRevenueRub: 0,
		materialCostRub: 2800,
		labCostRub: 14000,
		accruedRub: 139200,
		withheldMaterialRub: 700,
		withheldLabRub: 14000,
		payoutRub: 124500,
		doctorsCounted: 1,
		doctorsWithoutRate: 0,
	},
	scope: "all",
	isEmpty: false,
	methodNote: "Расчёт по кассовому методу и сдельным ставкам",
	limitations: [
		"Расходники Уровня 1 (салфетки, валики, слюноотсосы, перчатки) защищены ст. 129 ТК РФ и оплачены клиникой (0 ₽ вычетов).",
	],
};

const MOCK_PAYROLL_SERVICES: DoctorCompletedServiceItem[] = [
	{
		id: "cs-1",
		dateIso: "2026-10-05T11:30:00.000Z",
		patientName: "Ковалёв Роман Станиславович",
		medicalCardNumber: "043/у-102",
		serviceNameRu: "Протезирование зуба коронкой из диоксида циркония",
		category: "orthopedics",
		toothCode: "16",
		order804nCode: "A16.07.006.002",
		grossRevenueKop: 3200000,
		customCommissionPercent: 25,
		materialCostKop: 140000,
		labCostKop: 1400000,
		doctorId: "doc-sokolov-01",
		isWarrantyRework: false,
	},
	{
		id: "cs-2",
		dateIso: "2026-10-05T14:45:00.000Z",
		patientName: "Смирнова Екатерина Васильевна",
		medicalCardNumber: "043/у-105",
		serviceNameRu: "Восстановление зуба светоотверждаемым композитом",
		category: "therapy",
		toothCode: "24",
		order804nCode: "A16.07.002.001",
		grossRevenueKop: 540000,
		customCommissionPercent: 30,
		materialCostKop: 0,
		labCostKop: 0,
		doctorId: "doc-sokolov-01",
		isWarrantyRework: false,
	},
	{
		id: "cs-3",
		dateIso: "2026-10-06T10:15:00.000Z",
		patientName: "Волков Денис Андреевич",
		medicalCardNumber: "043/у-108",
		serviceNameRu: "Гарантийная пришлифовка и полировка пломбы (Переделка)",
		category: "therapy",
		toothCode: "11",
		order804nCode: "A16.07.002.001",
		grossRevenueKop: 0,
		customCommissionPercent: 0,
		materialCostKop: 0,
		labCostKop: 0,
		doctorId: "doc-sokolov-01",
		isWarrantyRework: true,
	},
];

function CashierPayrollPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const view = params.get("view") || "cash_shift";

	const [isZReportOpen, setIsZReportOpen] = useState(true);
	const [isCashRegisterOpen, setIsCashRegisterOpen] = useState(true);
	const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(true);
	const [paymentAmount, setPaymentAmount] = useState("0");
	const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "other" | "bank_transfer" | "online" | "insurance" | "family_wallet">("cash");

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	const mockAppLogic = {
		auth: {
			denteClinicalReadHeaders: () => ({}),
			activeRole: "owner",
		},
		dashboard: {
			clinicSettings: {
				profile: { mode: "small_clinic" },
			},
		},
	} as any;

	return (
		<AppLogicProvider value={mockAppLogic}>
			<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] p-2 sm:p-4 flex flex-col items-center justify-start">
			{/* Верхний диагностический баннер */}
			<div className="w-full max-w-5xl mb-3 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-2 text-xs">
				<div className="flex items-center gap-2">
					<span className="font-bold text-[var(--ink)] uppercase tracking-wider">
						DENTE RED TEAM AUDIT:
					</span>
					<span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/30">
						Вьюпорт: {window.innerWidth}×{window.innerHeight}
					</span>
					<span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold border border-blue-500/30">
						Тема: {rawTheme.toUpperCase()}
					</span>
					<span className="font-semibold text-[var(--muted)]">
						Вид: {view}
					</span>
				</div>
			</div>

			{/* 1. АРМ Кассы и виджет кассовой смены */}
			{view === "cash_shift" && (
				<div className="w-full max-w-4xl animate-in fade-in duration-150">
					<div className="mb-2">
						<h2 className="text-base font-bold text-[var(--ink)]">
							АРМ Кассы — Управление кассовой сменой 54-ФЗ
						</h2>
						<p className="text-xs text-[var(--muted)]">
							Смена № 42 открыта в 08:30 &bull; Кассир: Сидорова Анна Павловна &bull; В ящике: 14 500 ₽ &bull; Эквайринг: 38 000 ₽ &bull; СБП: 12 000 ₽
						</p>
					</div>
					<CashShiftWidget
						compact={false}
						initialIsOpen={true}
						shiftNumber={42}
						cashierName="Сидорова Анна Павловна"
						cashInDrawerRub={14500}
						cardSumRub={38000}
						sbpSumRub={12000}
						advanceOffsetRub={5000}
						openedAt="08:30"
						clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
						clinicInn="7701234567"
					/>
				</div>
			)}

			{/* 2. Модалка закрытия смены и Z-отчета 54-ФЗ */}
			{view === "z_report" && (
				<ShiftCloseZReportModal
					isOpen={isZReportOpen}
					onClose={() => setIsZReportOpen(false)}
					shiftNumber={42}
					cashierFullName="Сидорова Анна Павловна"
					clinicLegalName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					clinicInn="7701234567"
					clinicKpp="770101001"
					clinicAddress="г. Москва, ул. Арбат, 24"
					initialCashInDrawerRub={14500}
					initialTab="reconciliation"
				/>
			)}

			{/* 3. Модалка кассового аппарата и ящика (CashRegisterModal) */}
			{view === "cash_register" && (
				<CashRegisterModal
					isOpen={isCashRegisterOpen}
					onClose={() => setIsCashRegisterOpen(false)}
					isShiftOpen={true}
					shiftNumber={42}
					cashierFullName="Сидорова Анна Павловна"
					cashInDrawerRub={14500}
					cardSumRub={38000}
					sbpSumRub={12000}
					advanceOffsetRub={5000}
					initialTab="drawer"
				/>
			)}

			{/* 4. Десктопная ведомость выплат врачам (DoctorPayoutDashboard) */}
			{view === "doctor_payout_dashboard" && (
				<div className="w-full max-w-6xl animate-in fade-in duration-150">
					<DoctorPayoutDashboard initialReport={MOCK_PAYOUT_REPORT} />
				</div>
			)}

			{/* 4b. Расчет сдельной оплаты труда (DoctorPieceRateCalculatorSection) */}
			{view === "piece_rate_calculator" && (
				<div className="w-full max-w-5xl">
					<DoctorPieceRateCalculatorSection />
				</div>
			)}

			{/* 5. Официальная ведомость Т-51 / Расчет врача (DoctorPayrollModal) */}
			{view === "doctor_payroll_t51" && (
				<DoctorPayrollModal
					isOpen={isPayrollModalOpen}
					onClose={() => setIsPayrollModalOpen(false)}
					clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					doctorsList={[
						{
							id: "doc-sokolov-01",
							name: "Д-р Соколов Алексей Владимирович",
							specialtyId: "general-dentist",
						},
						{
							id: "doc-gromov-02",
							name: "Д-р Громов Константин Дмитриевич",
							specialtyId: "surgeon",
						},
					]}
					initialDoctorId="doc-sokolov-01"
					initialServices={MOCK_PAYROLL_SERVICES}
					initialBasePercentage={40}
					initialPeriodStart="2026-10-01"
					initialPeriodEnd="2026-10-31"
				/>
			)}

			{/* 5b. Табель учета рабочего времени персонала Т-13 (TimesheetT13Modal) */}
			{view === "timesheet_t13" && (
				<TimesheetT13Modal
					isOpen={true}
					onClose={() => {}}
					clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					employees={[
						{
							id: "emp-1",
							tabNumber: "00101",
							name: "Д-р Воронов Алексей Владимирович",
							positionRu: "Врач-стоматолог терапевт",
							departmentRu: "Клиническое отделение",
							defaultShiftHours: 6.6,
						},
						{
							id: "emp-2",
							tabNumber: "00102",
							name: "Д-р Громов Константин Дмитриевич",
							positionRu: "Врач-стоматолог хирург-имплантолог",
							departmentRu: "Хирургическое отделение",
							defaultShiftHours: 6.6,
						},
						{
							id: "emp-3",
							tabNumber: "00103",
							name: "Иванова Мария Сергеевна",
							positionRu: "Ассистент врача-стоматолога",
							departmentRu: "Сестринская служба / ЦСО",
							defaultShiftHours: 7.8,
						},
						{
							id: "emp-4",
							tabNumber: "00104",
							name: "Сидорова Анна Павловна",
							positionRu: "Администратор клиники",
							departmentRu: "Ресепшен и клиентский сервис",
							defaultShiftHours: 8.0,
						},
					]}
				/>
			)}

			{/* 6. Мобильный кошелек выплат врача (DoctorPayoutMobileWallet) */}
			{view === "mobile_wallet" && (
				<div className="w-full max-w-md mx-auto">
					<DoctorPayoutMobileWallet
						report={MOCK_PAYOUT_REPORT}
						month="2026-10"
						onMonthChange={() => {}}
						onRefresh={() => {}}
						onOpenPayrollModal={() => setIsPayrollModalOpen(true)}
						canEditRates={true}
						isLoading={false}
					/>
				</div>
			)}

			{/* 7. Применение 100% гарантийной скидки врача (PaymentCapture) */}
			{view === "warranty_discount" && (
				<div className="w-full max-w-2xl bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-4 shadow-sm">
					<div className="mb-3 pb-3 border-b border-[var(--line)] flex items-center justify-between">
						<div>
							<h3 className="text-sm font-bold text-[var(--ink)]">
								Касса: Прием пациента &bull; Гарантийная переделка 100%
							</h3>
							<p className="text-xs text-[var(--muted)]">
								Пациент: Волков Денис Андреевич (Карта 043/у-108) &bull; Врач: Д-р Соколов А. В.
							</p>
						</div>
						<span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400">
							Гарантийный случай (0 ₽)
						</span>
					</div>

					<PaymentCapture
						amount={paymentAmount}
						remainingDebt={5400}
						feedback=""
						fiscalCashierName="Сидорова Анна Павловна"
						fiscalFd=""
						fiscalFn=""
						fiscalFpd=""
						fiscalReceiptIssuedAt=""
						fiscalReceiptNumber=""
						fiscalReceiptUrl=""
						isSaving={false}
						method={paymentMethod}
						methodLabels={{
							cash: "Наличные",
							card: "Банковская карта",
							online: "СБП / Онлайн",
							bank_transfer: "Безналичный расчет",
							insurance: "Страховая / ДМС",
							family_wallet: "Семейный баланс",
							other: "Иное",
						}}
						onAmountChange={setPaymentAmount}
						onMethodChange={setPaymentMethod}
						onFiscalCashierNameChange={() => {}}
						onFiscalFdChange={() => {}}
						onFiscalFnChange={() => {}}
						onFiscalFpdChange={() => {}}
						onFiscalReceiptIssuedAtChange={() => {}}
						onFiscalReceiptNumberChange={() => {}}
						onFiscalReceiptUrlChange={() => {}}
						onPayerBirthDateChange={() => {}}
						onPayerFullNameChange={() => {}}
						onPayerIdentityDocumentChange={() => {}}
						onPayerInnChange={() => {}}
						onPayerRelationshipChange={() => {}}
						onTaxDeductionCodeChange={() => {}}
						patientContextMessage=""
						patientContextReady={true}
						patientDefaults={{
							fullName: "Волков Денис Андреевич",
							birthDate: "1990-05-15",
							identityDocument: "Паспорт РФ 4515 981240",
							taxpayerInn: "770198234120",
						}}
						payerBirthDate="1990-05-15"
						payerFullName="Волков Денис Андреевич"
						payerIdentityDocument="Паспорт РФ 4515 981240"
						payerInn="770198234120"
						payerRelationship="self"
						taxDeductionCode="1"
						onSubmit={() => {}}
					/>
				</div>
			)}
			</div>
		</AppLogicProvider>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<CashierPayrollPreviewApp />
		</React.StrictMode>
	);
}
