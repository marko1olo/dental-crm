/**
 * Administrative Launchers Registry — Реестр административных и финансовых автономных лончеров (Мандаты 8b, 8e, 8aq).
 * Касса, склад, расписание, телефония, лаборатория, лояльность, страхование, онлайн-запись, отчеты.
 */

import React from "react";
import type { StandaloneLaunchersProps } from "../modalsContainerTypes";
import {
	type LauncherRegistryEntry,
	evaluateLaunchersRegistry,
} from "./deepLinkMatcher";
import { clearUrlTokens } from "./deepLinkUrl";
import { DirectLoyaltyLauncher } from "../../../loyalty/DirectLoyaltyLauncher";
import { DirectInsuranceLauncher } from "../../../insurance/DirectInsuranceLauncher";
import { DirectPublicBookingLauncher } from "../../../booking/DirectPublicBookingLauncher";
import { DirectDentalLabLauncher } from "../../../lab/DirectDentalLabLauncher";
import { DirectTelephonyLauncher } from "../../../telephony/DirectTelephonyLauncher";
import { DirectScheduleLauncher } from "../../../schedule/DirectScheduleLauncher";
import { DirectTreatmentPlanLauncher } from "../../../treatment-plans/DirectTreatmentPlanLauncher";
import { DirectCashRegisterLauncher } from "../../../billing/DirectCashRegisterLauncher";
import { DirectWarehouseLauncher } from "../../../inventory/DirectWarehouseLauncher";
import { DirectSanpinLauncher } from "../../../sanpin/DirectSanpinLauncher";
import { DirectSterilizationLauncher } from "../../../sanpin/DirectSterilizationLauncher";
import { DirectCopilotLauncher } from "../../../copilot/DirectCopilotLauncher";
import { PatientOmnichannelHubModal } from "../../../messaging/PatientOmnichannelHubModal";
import { DocumentsView } from "../../../../DocumentsView";
import { DirectPatientLauncher } from "../../../patients/DirectPatientLauncher";
import { StandalonePatientCardHost } from "./clinical/StandalonePatientCardHost";
import { DirectAnalyticsLauncher } from "../../../analytics/DirectAnalyticsLauncher";
import { renderPayrollLauncher } from "./PayrollStandaloneLauncher";
import { renderReportsStandaloneLauncher } from "./ReportsStandaloneLauncher";
import { renderSpecializedAdministrativeLaunchers } from "./SpecializedAdministrativeLaunchers";

export const ADMINISTRATIVE_LAUNCHERS_REGISTRY: readonly LauncherRegistryEntry<StandaloneLaunchersProps>[] =
	[
		// 1. Программа лояльности, бонусы и семейный баланс
		{
			id: "loyalty-studio",
			title: "Программа лояльности и семейный счет",
			criteria: {
				tokens: ["loyalty", "bonuses", "points", "family-pool", "loyalty-studio"],
				searchIncludes: [
					"loyalty=1",
					"bonuses=1",
					"standalone=loyalty",
					"loyalty=direct",
				],
				exactHashes: [
					"#loyalty",
					"#bonuses",
					"#points",
					"#family-pool",
					"#loyalty-studio",
				],
				hashPrefixes: ["#loyalty?", "#loyalty/"],
			},
			render: () => <DirectLoyaltyLauncher />,
		},

		// 2. Страховая медицина и ДМС
		{
			id: "insurance-studio",
			title: "Страховая медицина и ДМС",
			criteria: {
				tokens: ["insurance", "dms", "insurance-studio", "dms-studio"],
				searchIncludes: [
					"insurance=1",
					"dms=1",
					"standalone=insurance",
					"standalone=dms",
				],
				exactHashes: [
					"#insurance",
					"#dms",
					"#insurance-studio",
					"#dms-studio",
				],
				hashPrefixes: ["#insurance?", "#insurance/", "#dms?"],
			},
			render: () => <DirectInsuranceLauncher />,
		},

		// 3. Публичная онлайн-запись пациентов на приём
		{
			id: "online-booking",
			title: "Онлайн-запись пациентов",
			criteria: {
				tokens: ["booking", "online-booking", "public-booking", "booking-studio"],
				searchIncludes: [
					"booking=1",
					"online_booking=1",
					"public_booking=1",
					"standalone=booking",
					"standalone=online_booking",
				],
				exactHashes: [
					"#booking",
					"#online-booking",
					"#public-booking",
					"#booking-studio",
				],
				hashPrefixes: [
					"#booking?",
					"#booking/",
					"#online-booking?",
					"#public-booking?",
				],
			},
			render: () => <DirectPublicBookingLauncher />,
		},

		// 4. Зуботехническая лаборатория и наряды
		{
			id: "dental-lab",
			title: "Зуботехническая лаборатория и наряды",
			criteria: {
				tokens: ["lab", "ztl", "dental-lab", "lab-studio", "lab-orders"],
				searchIncludes: [
					"standalone=dental_lab",
					"standalone=lab_order",
					"standalone=lab_hub",
					"tab=lab",
					"lab=1",
					"dental-lab=1",
				],
				exactHashes: [
					"#lab",
					"#ztl",
					"#dental-lab",
					"#lab-studio",
					"#lab-orders",
				],
				hashIncludes: ["dental-lab", "dental_lab"],
			},
			render: () => <DirectDentalLabLauncher />,
		},

		// 5. Телефония и журнал входящих/исходящих звонков
		{
			id: "telephony-studio",
			title: "Телефония и журнал звонков",
			criteria: {
				tokens: ["telephony", "calls", "softphone"],
			},
			render: () => <DirectTelephonyLauncher />,
		},

		// 6. Расписание приёмов и сетка кресел
		{
			id: "schedule-studio",
			title: "Расписание приёмов и график врачей",
			criteria: {
				tokens: [
					"schedule_studio",
					"schedule-studio",
					"chair-schedule",
					"appointments",
				],
				exactHashes: ["#schedule", "#appointments"],
			},
			render: () => <DirectScheduleLauncher />,
		},

		// 7. Планы лечения и сметы
		{
			id: "treatment-plans-studio",
			title: "Планы лечения и комплексные сметы",
			criteria: {
				tokens: [
					"treatment-studio",
					"treatment-plan",
					"treatment_plan",
					"treatment-plans",
				],
			},
			render: () => <DirectTreatmentPlanLauncher />,
		},

		// 8. Касса, чеки и кассовый расчёт
		{
			id: "cash-register",
			title: "Касса и чеки",
			criteria: {
				tokens: [
					"billing-checkout",
					"billing_checkout",
					"checkout-studio",
					"cashbox-studio",
				],
			},
			render: () => <DirectCashRegisterLauncher />,
		},

		// 9. Склад материалов и Честный Знак
		{
			id: "warehouse-inventory",
			title: "Склад материалов и маркировка",
			criteria: {
				tokens: ["warehouse", "inventory-hub", "stock"],
			},
			render: () => <DirectWarehouseLauncher />,
		},

		// 10. Журнал автоклавирования и стерилизации
		{
			id: "sterilization-hub",
			title: "Журнал автоклавирования и стерилизации",
			criteria: {
				tokens: ["sterilization", "autoclave", "sanpin-autoclave"],
			},
			render: () => <DirectSterilizationLauncher />,
		},

		// 11. Производственный санитарный контроль
		{
			id: "sanpin-control",
			title: "Санитарный контроль и дезинфекция",
			criteria: {
				tokens: ["sanpin"],
			},
			render: () => <DirectSanpinLauncher />,
		},

		// 12. Клинический ИИ-ассистент врача
		{
			id: "copilot-assistant",
			title: "Клинический ИИ-ассистент",
			criteria: {
				tokens: [
					"copilot",
					"ai=1",
					"ai-assistant",
					"chairside-copilot",
					"copilot_standalone",
					"copilot-standalone",
					"copilot_drawer",
					"copilot-drawer",
					"copilot_proof",
					"copilot-proof",
				],
			},
			render: () => <DirectCopilotLauncher />,
		},

		// 13. Омниканальный хаб мессенджеров
		{
			id: "omnichannel-hub",
			title: "Омниканальный центр сообщений",
			criteria: {
				tokens: ["omnichannel_hub", "messaging_hub"],
			},
			render: () => (
				<div className="fixed inset-0 z-[99999] w-full h-screen min-h-screen bg-[var(--paper)] text-[var(--ink)] box-border flex flex-col overflow-hidden">
					<PatientOmnichannelHubModal
						isOpen={true}
						onClose={() => {}}
						portal={false}
					/>
				</div>
			),
		},

		// 14. Каталог шаблонов и бланков документов
		{
			id: "documents-catalog",
			title: "Каталог шаблонов документов",
			criteria: {
				tokens: ["documents_catalog", "documents-catalog"],
			},
			render: () => (
				<div
					className="w-full min-h-screen p-3 sm:p-6 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#0f172a)] overflow-y-auto"
					data-testid="standalone-documents-catalog-root"
				>
					<DocumentsView />
				</div>
			),
		},

		// 15. Экспресс-регистрация и картотека пациентов
		{
			id: "patients-catalog",
			title: "Картотека пациентов и экспресс-регистрация",
			criteria: {
				tokens: [
					"patients",
					"patient-studio",
					"patient_studio",
					"express-patient",
					"express_patient",
				],
			},
			render: () => <DirectPatientLauncher />,
		},

		// 16. Карточка пациента 360
		{
			id: "patient-card-360",
			title: "Карточка пациента 360",
			criteria: {
				tokens: ["patient-card", "patient_card"],
			},
			render: () => (
				<StandalonePatientCardHost
					onClose={() => clearUrlTokens(["patient-card", "patient_card"])}
				/>
			),
		},

		// 17. Сводная аналитика и дашборд руководителя
		{
			id: "analytics-studio",
			title: "Аналитика и дашборд руководителя",
			criteria: {
				exactHashes: ["#analytics", "#dashboard", "#executive-studio"],
				hashIncludes: ["executive-studio"],
				searchIncludes: [
					"executive_studio",
					"analytics=direct",
					"dashboard=direct",
				],
			},
			render: () => <DirectAnalyticsLauncher />,
		},
	];

export function renderAdministrativeLaunchers(
	props: StandaloneLaunchersProps,
): React.ReactElement | null {
	// 1. Поиск совпадений в реестре административных лончеров
	const matchedLauncher = evaluateLaunchersRegistry(
		ADMINISTRATIVE_LAUNCHERS_REGISTRY,
		props,
	);
	if (matchedLauncher) {
		return matchedLauncher;
	}

	// 2. Расчет зарплаты и комиссии врачей (?payroll=1, ?payout=1, #payroll)
	const payroll = renderPayrollLauncher();
	if (payroll) {
		return payroll;
	}

	// 3. Управленческие отчеты и аудит (?reports=1, #reports, ?analytics=1)
	const reports = renderReportsStandaloneLauncher();
	if (reports) {
		return reports;
	}

	// 4. Специализированные административные модули (ЕГИСЗ, СБП, кассовые ордера, МДЛП)
	const specializedAdmin = renderSpecializedAdministrativeLaunchers(props);
	if (specializedAdmin) {
		return specializedAdmin;
	}

	return null;
}
