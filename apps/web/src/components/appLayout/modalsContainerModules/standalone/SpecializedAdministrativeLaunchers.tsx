/**
 * SpecializedAdministrativeLaunchers — Фасад административных и финансовых лаунчеров (Мандат 8b, <= 120 строк).
 * Декомпозирован по модулям: касса, склад, зарплата, отчеты, планы лечения.
 */

import type React from "react";
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

export function renderSpecializedAdministrativeLaunchers(
	props: StandaloneLaunchersProps,
): React.ReactElement | null {
	if (!isDemoShowcaseMode() && !import.meta.env?.DEV) return null;

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

	return null;
}
