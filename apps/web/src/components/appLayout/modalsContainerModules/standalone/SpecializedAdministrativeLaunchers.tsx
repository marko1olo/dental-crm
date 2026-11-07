/**
 * SpecializedAdministrativeLaunchers — Фасад административных и финансовых лаунчеров (Мандат 8b, <= 180 строк).
 * Декомпозирован по модулям: касса, склад, зарплата, отчеты, планы лечения, документы и согласия.
 */

import React from "react";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import type { StandaloneLaunchersProps } from "../modalsContainerTypes";
import { renderReportsComplianceLaunchers } from "./administrative/ReportsComplianceLaunchers";
import { renderTreatmentPlanLaunchers } from "./administrative/TreatmentPlanLaunchers";
import { renderFamilyBillingLaunchers } from "./administrative/FamilyBillingLaunchers";
import { renderCashierFinanceLaunchers } from "./administrative/CashierFinanceLaunchers";
import { renderDoctorWalletLaunchers } from "./administrative/DoctorWalletLaunchers";
import { renderWarehouseMdlpLaunchers } from "./administrative/WarehouseMdlpLaunchers";
import { renderDocumentsStandaloneLauncher } from "./administrative/DocumentsStandaloneLauncher";
import { renderPricelistStandaloneLauncher } from "./administrative/PricelistStandaloneLauncher";
import { renderOmnichannelAndTelephonyLauncher } from "./administrative/OmnichannelAndTelephonyStandaloneLauncher";
import { renderSanPinStandaloneLauncher } from "./administrative/SanPinStandaloneLauncher";
import { renderLeadsStandaloneLauncher } from "./administrative/LeadsStandaloneLauncher";
import { renderRecallsStandaloneLauncher } from "./administrative/RecallsStandaloneLauncher";
import { DirectAppointmentLauncher } from "../../../schedule/DirectAppointmentLauncher";
import { DirectMarketingLauncher } from "../../../marketing/DirectMarketingLauncher";
import { DirectSettingsLauncher } from "../../../settings/DirectSettingsLauncher";
import { DirectPrescriptionLauncher } from "../../../prescriptions/DirectPrescriptionLauncher";
import { DirectCopilotLauncher } from "../../../copilot/DirectCopilotLauncher";
import { DirectDocumentsLauncher } from "../../../documents/DirectDocumentsLauncher";
import { DirectConsentLauncher } from "../../../consents/DirectConsentLauncher";
import { DirectShiftLauncher } from "../../../shift/DirectShiftLauncher";
import { DirectPayrollLauncher } from "../../../payroll/DirectPayrollLauncher";
import { DirectWarehouseLauncher } from "../../../inventory/DirectWarehouseLauncher";

export function renderSpecializedAdministrativeLaunchers(
	props: StandaloneLaunchersProps,
): React.ReactElement | null {
	if (!isDemoShowcaseMode() && !import.meta.env?.DEV) return null;

	// 0. Студия кассовой смены и Z-отчёт SSOT (#shift, #cash-shift, #z-report, #shift-closing, ?shift=1, ?z_report=1)
	if (
		typeof window !== "undefined" &&
		(window.location.hash === "#shift" ||
			window.location.hash.startsWith("#shift?") ||
			window.location.hash === "#cash-shift" ||
			window.location.hash.startsWith("#cash-shift?") ||
			window.location.hash === "#z-report" ||
			window.location.hash.startsWith("#z-report?") ||
			window.location.hash === "#shift-closing" ||
			window.location.hash.startsWith("#shift-closing?") ||
			window.location.hash === "#shift-studio" ||
			window.location.hash.startsWith("#shift-studio?") ||
			window.location.search.includes("shift=1") ||
			window.location.search.includes("z_report=1") ||
			window.location.search.includes("shift_closing=1"))
	) {
		return <DirectShiftLauncher />;
	}

	// 0a. Студия информированных согласий и договоров SSOT (#consents, #consent, #consent-studio, ?consents=1, ?consent=1)
	if (
		typeof window !== "undefined" &&
		(window.location.hash === "#consents" ||
			window.location.hash.startsWith("#consents?") ||
			window.location.hash === "#consent" ||
			window.location.hash.startsWith("#consent?") ||
			window.location.hash === "#consent-studio" ||
			window.location.hash.startsWith("#consent-studio?") ||
			window.location.search.includes("consents=1") ||
			window.location.search.includes("consent=1"))
	) {
		return <DirectConsentLauncher />;
	}

	// 0b. Студия документов и договоров SSOT (#documents, #docs-studio, ?documents=1, ?docs=1)
	if (
		typeof window !== "undefined" &&
		(window.location.hash === "#documents" ||
			window.location.hash.startsWith("#documents?") ||
			window.location.hash === "#docs-studio" ||
			window.location.hash.startsWith("#docs-studio?") ||
			window.location.hash === "#documents-studio" ||
			window.location.search.includes("documents=1") ||
			window.location.search.includes("docs=1"))
	) {
		return <DirectDocumentsLauncher />;
	}

	// 0. Кабинет ИИ-копайлота и голосовой ассистент (?copilot=1, #copilot, #ai, #assistant)
	if (
		typeof window !== "undefined" &&
		(window.location.hash === "#copilot" ||
			window.location.hash.startsWith("#copilot?") ||
			window.location.hash === "#ai" ||
			window.location.hash.startsWith("#ai?") ||
			window.location.hash === "#assistant" ||
			window.location.hash.startsWith("#assistant?") ||
			window.location.hash === "#chairside-copilot" ||
			window.location.search.includes("copilot=1") ||
			window.location.search.includes("ai=1") ||
			window.location.search.includes("assistant=1"))
	) {
		return <DirectCopilotLauncher />;
	}

	// 0. Карточка приёма и быстрое бронирование (?appointment=1, #appointment, #quick-book)
	if (
		typeof window !== "undefined" &&
		(window.location.hash === "#appointment" ||
			window.location.hash.startsWith("#appointment?") ||
			window.location.hash === "#quick-book" ||
			window.location.hash.startsWith("#quick-book?") ||
			window.location.hash === "#booking-modal" ||
			window.location.search.includes("appointment=1"))
	) {
		return <DirectAppointmentLauncher />;
	}

	// 0. Повторные вызовы и диспансеризация (?recalls=1, #recalls, #prophylaxis)
	const recalls = renderRecallsStandaloneLauncher();
	if (recalls) return recalls;

	// 0. Журналы стерилизации и автоклавирования СанПиН (?sanpin=1, ?sterilization=1)
	const sanpin = renderSanPinStandaloneLauncher();
	if (sanpin) return sanpin;

	// 0. Прейскурант и каталог услуг (?pricelist=1, ?catalog=1)
	const pricelist = renderPricelistStandaloneLauncher();
	if (pricelist) return pricelist;

	// 0. Реестр документов и бланков (?documents=1, ?docs=1)
	const docs = renderDocumentsStandaloneLauncher();
	if (docs) return docs;

	// 0. Каноническая студия склада материалов SSOT (#warehouse, #inventory, #stock, ?warehouse=1, ?inventory=1)
	if (
		typeof window !== "undefined" &&
		(window.location.hash === "#warehouse" ||
			window.location.hash.startsWith("#warehouse?") ||
			window.location.hash === "#inventory" ||
			window.location.hash.startsWith("#inventory?") ||
			window.location.hash === "#stock" ||
			window.location.hash.startsWith("#stock?") ||
			window.location.hash === "#warehouse-studio" ||
			window.location.search.includes("warehouse=1") ||
			window.location.search.includes("inventory=1") ||
			window.location.search.includes("stock=1"))
	) {
		return <DirectWarehouseLauncher />;
	}

	// 0. Склад материалов и маркировка Честный Знак / МДЛП (?inventory=1, ?mdlp=1)
	const warehouseMdlp = renderWarehouseMdlpLaunchers();
	if (warehouseMdlp) return warehouseMdlp;

	// 1. ЕГИСЗ РЭМД, подбор слотов и ДМС гарантийные письма
	const compliance = renderReportsComplianceLaunchers(props);
	if (compliance) return compliance;

	// 2. Сценарии планов лечения, сметы и презентер
	const treatmentPlans = renderTreatmentPlanLaunchers(props);
	if (treatmentPlans) return treatmentPlans;

	// 3. Семейный сводный биллинг
	const familyBilling = renderFamilyBillingLaunchers();
	if (familyBilling) return familyBilling;

	// 4. Касса, чеки, СБП и кассовые ордера
	const cashier = renderCashierFinanceLaunchers(props);
	if (cashier) return cashier;

	// 5. Мобильный кошелек врача
	const doctorWallet = renderDoctorWalletLaunchers();
	if (doctorWallet) return doctorWallet;

	// 6. Омниканальный чат и телефония
	const omnichannelAndTelephony = renderOmnichannelAndTelephonyLauncher();
	if (omnichannelAndTelephony) return omnichannelAndTelephony;

	// 7. Воронка первичных обращений и CRM Лиды (?leads=1, #leads, #crm-leads, #kanban)
	const leads = renderLeadsStandaloneLauncher();
	if (leads) return leads;

	// 8. Маркетинг, акции и ROMI (?marketing=1, #marketing, #romi, #campaigns)
	if (
		typeof window !== "undefined" &&
		(window.location.hash === "#marketing" ||
			window.location.hash.startsWith("#marketing?") ||
			window.location.hash === "#romi" ||
			window.location.hash.startsWith("#romi?") ||
			window.location.hash === "#campaigns" ||
			window.location.hash.startsWith("#campaigns?") ||
			window.location.search.includes("marketing=1") ||
			window.location.search.includes("romi=1"))
	) {
		return <DirectMarketingLauncher />;
	}

	// 9. Студия настроек клиники и реквизитов (?settings=1, #settings, #clinic-setup, #clinic-requisites)
	if (
		typeof window !== "undefined" &&
		(window.location.hash === "#settings" ||
			window.location.hash.startsWith("#settings?") ||
			window.location.hash.startsWith("#settings/") ||
			window.location.hash === "#clinic-setup" ||
			window.location.hash.startsWith("#clinic-setup?") ||
			window.location.hash === "#clinic-requisites" ||
			window.location.hash.startsWith("#clinic-requisites?") ||
			window.location.hash === "#settings-studio" ||
			window.location.search.includes("settings=1") ||
			window.location.search.includes("clinic_setup=1") ||
			window.location.search.includes("standalone=settings"))
	) {
		return <DirectSettingsLauncher />;
	}

	// 10. Студия рецептов и медикаментозных назначений (?prescriptions=1, ?rx=1, #prescriptions, #rx, #prescription-studio)
	if (
		typeof window !== "undefined" &&
		(window.location.hash === "#prescriptions" ||
			window.location.hash.startsWith("#prescriptions?") ||
			window.location.hash === "#rx" ||
			window.location.hash.startsWith("#rx?") ||
			window.location.hash === "#prescription-studio" ||
			window.location.hash.startsWith("#prescription-studio?") ||
			window.location.search.includes("prescriptions=1") ||
			window.location.search.includes("rx=1"))
	) {
		return <DirectPrescriptionLauncher />;
	}

	// 11. Студия зарплат и сдельной мотивации (?payroll=1, #payroll, #doctor-payroll, #salary, #commissions)
	if (
		typeof window !== "undefined" &&
		(window.location.hash === "#payroll" ||
			window.location.hash.startsWith("#payroll?") ||
			window.location.hash === "#doctor-payroll" ||
			window.location.hash.startsWith("#doctor-payroll?") ||
			window.location.hash === "#salary" ||
			window.location.hash.startsWith("#salary?") ||
			window.location.hash === "#commissions" ||
			window.location.hash.startsWith("#commissions?") ||
			window.location.search.includes("payroll=1") ||
			window.location.search.includes("doctor_payroll=1"))
	) {
		return <DirectPayrollLauncher />;
	}

	return null;
}
