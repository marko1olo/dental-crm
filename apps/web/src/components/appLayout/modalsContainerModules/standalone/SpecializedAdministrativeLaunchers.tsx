/**
 * SpecializedAdministrativeLaunchers — Фасад административных и финансовых лаунчеров (Мандат 8b, <= 120 строк).
 * Декомпозирован по модулям: касса, склад, зарплата, отчеты, планы лечения.
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

export function renderSpecializedAdministrativeLaunchers(
	props: StandaloneLaunchersProps,
): React.ReactElement | null {
	if (!isDemoShowcaseMode() && !import.meta.env?.DEV) return null;

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

	return null;
}
