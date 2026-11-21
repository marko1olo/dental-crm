/**
 * Administrative Launchers Registry — Реестр административных и финансовых автономных лончеров (Мандаты 8b, 8e, 8aq).
 * Касса, склад, расписание, телефония, лаборатория, лояльность, страхование, онлайн-запись, отчеты, документы и согласия.
 * Sweet Spot: <= 400 строк (Мандат 8b/8zi).
 */

import React from "react";
import type { StandaloneLaunchersProps } from "../modalsContainerTypes";
import { type LauncherRegistryEntry, evaluateLaunchersRegistry } from "./deepLinkMatcher";
import { clearUrlTokens } from "./deepLinkUrl";
import { DirectLoyaltyLauncher } from "../../../loyalty/DirectLoyaltyLauncher";
import { DirectInsuranceLauncher } from "../../../insurance/DirectInsuranceLauncher";
import { DirectPublicBookingLauncher } from "../../../booking/DirectPublicBookingLauncher";
import { DirectDentalLabLauncher } from "../../../lab/DirectDentalLabLauncher";
import { DirectTelephonyLauncher } from "../../../telephony/DirectTelephonyLauncher";
import { DirectRecallLauncher } from "../../../recalls/DirectRecallLauncher";
import { DirectTreatmentPlanLauncher } from "../../../treatment-plans/DirectTreatmentPlanLauncher";
import { DirectCashboxLauncher } from "../../../cashbox/DirectCashboxLauncher";
import { DirectWarehouseLauncher } from "../../../inventory/DirectWarehouseLauncher";
import { DirectSanpinLauncher } from "../../../sanpin/DirectSanpinLauncher";
import { OmnichannelOperatorDesk } from "../../../chat/OmnichannelOperatorDesk";
import { DocumentsView } from "../../../../DocumentsView";
import { DirectDocumentsLauncher } from "../../../documents/DirectDocumentsLauncher";
import { DirectUkepSigningLauncher } from "../../../documents/ukep/DirectUkepSigningLauncher";
import { PatientCabinetModal } from "../../../portal/patientCabinet/PatientCabinetModal";
import { StandalonePatientCardHost } from "./clinical/StandalonePatientCardHost";
import { DirectAnalyticsLauncher } from "../../../analytics/DirectAnalyticsLauncher";
import { DirectMarketingLauncher } from "../../../marketing/DirectMarketingLauncher";
import { DirectLeadsStandaloneLauncher } from "./administrative/LeadsStandaloneLauncher";
import { DirectPricelistLauncher } from "../../../catalog/DirectPricelistLauncher";
import { DirectPrescriptionLauncher } from "../../../prescriptions/DirectPrescriptionLauncher";
import { DirectShiftLauncher } from "../../../shift/DirectShiftLauncher";
import { DirectPayrollLauncher } from "../../../payroll/DirectPayrollLauncher";
import { DirectDoctorWalletLauncher } from "./administrative/DoctorWalletLaunchers";
import { DirectWaitlistMatchesLauncher } from "../../../schedule/DirectWaitlistMatchesLauncher";
import { DirectTomorrowRemindersLauncher } from "../../../schedule/DirectTomorrowRemindersLauncher";
import { HardwareSettingsTab } from "../../../settings/HardwareSettingsTab";
import { SettingsAccessTab } from "../../../settings/SettingsAccessTab";
import { SettingsStaffTab } from "../../../settings/SettingsStaffTab";
import { MedflexSettingsTab } from "../../../settings/integrations/MedflexSettingsTab";
import { type StaffProfileExtended, staffProfileExtendedSchema } from "@dental/shared";
import { renderReportsStandaloneLauncher } from "./ReportsStandaloneLauncher";
import { renderSpecializedAdministrativeLaunchers } from "./SpecializedAdministrativeLaunchers";

function DirectSettingsTransition(): null {
	React.useEffect(() => {
		import("../../../../store/appStore").then((m) => {
			if (m.useAppStore.getState().currentView !== "settings") {
				m.useAppStore.getState().setCurrentView("settings");
			}
		});
	}, []);
	return null;
}

export const ADMINISTRATIVE_LAUNCHERS_REGISTRY: readonly LauncherRegistryEntry<StandaloneLaunchersProps>[] = [
	// 0. Студия зарплат и сдельной мотивации врачей (SSOT)
	{
		id: "doctor-payroll-studio",
		title: "Студия зарплат и сдельной мотивации врачей",
		criteria: {
			tokens: [
				"payroll",
				"doctor-payroll",
				"salary",
				"commissions",
				"doctor-payout",
				"payroll-studio",
				"doctor-payroll-report",
				"executive-payroll",
				"assistant-payroll",
			],
			searchIncludes: [
				"payroll=1",
				"doctor-payroll=1",
				"doctor_payroll=1",
				"salary=1",
				"commissions=1",
				"doctor-payout=1",
				"executive_payroll=1",
				"assistant_payroll=1",
			],
			exactHashes: [
				"#payroll",
				"#doctor-payroll",
				"#salary",
				"#commissions",
				"#doctor-payout",
				"#payroll-studio",
				"#doctor-payroll-report",
				"#executive-payroll",
				"#assistant-payroll",
			],
			hashPrefixes: [
				"#payroll?",
				"#doctor-payroll?",
				"#salary?",
				"#commissions?",
				"#doctor-payroll-report?",
				"#executive-payroll?",
				"#assistant-payroll?",
			],
		},
		render: () => <DirectPayrollLauncher />,
	},
	// 0b. Расчетный кошелек врача (SSOT)
	{
		id: "doctor-payout-wallet",
		title: "Мобильный расчетный кошелек врача",
		criteria: {
			tokens: ["wallet", "doctor-wallet", "doctor_wallet"],
			searchIncludes: ["wallet=1", "standalone=wallet", "payout_wallet=1"],
			exactHashes: ["#wallet", "#doctor-wallet", "#doctor-payout-wallet"],
			hashPrefixes: ["#wallet?", "#doctor-wallet?", "#doctor-payout-wallet?"],
		},
		render: () => <DirectDoctorWalletLauncher />,
	},
	// 0. Студия кассовой смены и Z-отчёт (SSOT)
	{
		id: "shift-studio",
		title: "Студия кассовой смены и Z-отчёт",
		criteria: {
			tokens: ["shift", "cash-shift", "z-report", "shift-closing", "shift-studio", "shift_studio", "shift-journal", "shift_journal"],
			searchIncludes: ["shift=1", "z_report=1", "shift_closing=1", "standalone=shift", "shift_studio=1", "shift_journal=1"],
			exactHashes: ["#shift", "#cash-shift", "#z-report", "#shift-closing", "#shift-studio", "#shift_studio", "#shift-journal", "#shift_journal"],
			hashPrefixes: ["#shift?", "#cash-shift?", "#z-report?", "#shift-closing?", "#shift-studio?", "#shift-journal?"],
		},
		render: () => <DirectShiftLauncher />,
	},
	// 0. Студия рецептов и назначений (SSOT)
	{
		id: "prescriptions-studio",
		title: "Студия рецептов и медикаментозных назначений",
		criteria: {
			tokens: ["prescriptions", "prescription", "rx", "prescription-studio"],
			searchIncludes: ["prescriptions=1", "prescription=1", "rx=1", "standalone=prescriptions"],
			exactHashes: ["#prescriptions", "#prescription", "#rx", "#prescription-studio"],
			hashPrefixes: ["#prescriptions?", "#prescription?", "#rx?", "#prescription-studio?"],
		},
		render: () => <DirectPrescriptionLauncher />,
	},
	// 0. Прейскурант услуг и каталог клиники (SSOT)
	{
		id: "pricelist-studio",
		title: "Прейскурант услуг и каталог клиники",
		criteria: {
			tokens: ["pricelist", "prices", "services-catalog", "pricelist-studio"],
			searchIncludes: ["pricelist=1", "prices=1", "standalone=pricelist", "services-catalog=1"],
			exactHashes: ["#pricelist", "#prices", "#services-catalog", "#pricelist-studio"],
			hashPrefixes: ["#pricelist?", "#prices?", "#services-catalog?"],
		},
		render: () => <DirectPricelistLauncher />,
	},
	// 1. Программа лояльности и семейный счет
	{
		id: "loyalty-studio",
		title: "Программа лояльности и семейный счет",
		criteria: {
			tokens: ["loyalty", "bonuses", "points", "family-pool", "loyalty-studio"],
			searchIncludes: ["loyalty=1", "bonuses=1", "standalone=loyalty", "loyalty=direct"],
			exactHashes: ["#loyalty", "#bonuses", "#points", "#family-pool", "#loyalty-studio"],
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
			searchIncludes: ["insurance=1", "dms=1", "standalone=insurance", "standalone=dms"],
			exactHashes: ["#insurance", "#dms", "#insurance-studio", "#dms-studio"],
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
			searchIncludes: ["booking=1", "online_booking=1", "public_booking=1", "standalone=booking", "standalone=online_booking"],
			exactHashes: ["#booking", "#online-booking", "#public-booking", "#booking-studio"],
			hashPrefixes: ["#booking?", "#booking/", "#online-booking?", "#public-booking?"],
		},
		render: () => <DirectPublicBookingLauncher />,
	},
	// 3b. Личный кабинет пациента (Портал)
	{
		id: "patient-cabinet",
		title: "Личный кабинет пациента",
		criteria: {
			tokens: ["portal", "patient-cabinet", "patient_cabinet", "cabinet"],
			searchIncludes: ["portal=1", "patient_cabinet=1", "patient-cabinet=1", "standalone=portal"],
			exactHashes: ["#portal", "#patient-cabinet", "#patient_cabinet"],
			hashPrefixes: ["#portal?", "#portal/", "#patient-cabinet?", "#patient_cabinet?"],
		},
		render: () => (
			<PatientCabinetModal
				isOpen={true}
				onClose={() => clearUrlTokens(["portal", "patient-cabinet", "patient_cabinet", "cabinet"])}
			/>
		),
	},
	// 4. Зуботехническая лаборатория и наряды
	{
		id: "dental-lab",
		title: "Зуботехническая лаборатория и наряды",
		criteria: {
			tokens: ["lab", "ztl", "dental-lab", "lab-studio", "lab-orders"],
			searchIncludes: ["standalone=dental_lab", "standalone=lab_order", "standalone=lab_hub", "tab=lab", "lab=1", "dental-lab=1"],
			exactHashes: ["#lab", "#ztl", "#dental-lab", "#lab-studio", "#lab-orders"],
			hashIncludes: ["dental-lab", "dental_lab"],
		},
		render: () => <DirectDentalLabLauncher />,
	},
	// 5. Диспансерный учет, повторные вызовы и профосмотры
	{
		id: "recalls-studio",
		title: "Студия повторных вызовов и профосмотров",
		criteria: {
			tokens: ["recalls", "prophylaxis", "recall-hub"],
			searchIncludes: ["recalls=1", "standalone=recalls", "prophylaxis=1"],
			exactHashes: ["#recalls", "#prophylaxis", "#recall-hub"],
			hashPrefixes: ["#recalls?", "#recalls/", "#prophylaxis?", "#recall-hub?"],
		},
		render: () => <DirectRecallLauncher />,
	},
	// 5b. Телефония и журнал звонков
	{
		id: "telephony-studio",
		title: "Телефония и журнал звонков",
		criteria: {
			tokens: ["telephony", "calls", "softphone", "incoming"],
			exclude: ["recalls", "recall-hub", "prophylaxis"],
		},
		render: () => <DirectTelephonyLauncher />,
	},
	// 7. Планы лечения и комплексные сметы
	{
		id: "treatment-plans-studio",
		title: "Планы лечения и комплексные сметы",
		criteria: {
			tokens: ["treatment-studio", "treatment-plan", "treatment_plan", "treatment-plans"],
		},
		render: () => <DirectTreatmentPlanLauncher />,
	},
	// 8. Касса, чеки и кассовый расчёт (Cashbox & Checkout SSOT)
	{
		id: "cash-register",
		title: "Касса и чеки",
		criteria: {
			tokens: ["cashier", "cashier-studio", "kassa", "cashbox", "receipt", "checkout", "billing-checkout", "billing_checkout", "checkout-studio", "cashbox-studio"],
			searchIncludes: ["cashier=1", "kassa=1", "checkout=1", "standalone=cashier", "cashbox=1"],
			exactHashes: ["#cashier", "#kassa", "#cashier-studio", "#checkout", "#receipt", "#cashbox"],
			hashPrefixes: ["#cashier?", "#kassa?", "#checkout?", "#cashbox?"],
		},
		render: () => <DirectCashboxLauncher />,
	},
	// 9. Склад материалов и маркировка (SSOT)
	{
		id: "warehouse-inventory",
		title: "Склад материалов и маркировка",
		criteria: {
			tokens: ["warehouse", "inventory-hub", "stock", "warehouse-studio", "inventory"],
			searchIncludes: ["warehouse=1", "inventory=1", "stock=1", "standalone=warehouse", "standalone=inventory"],
			exactHashes: ["#warehouse", "#inventory", "#stock", "#warehouse-studio", "#inventory-hub"],
			hashPrefixes: ["#warehouse?", "#inventory?", "#stock?"],
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
		render: () => <DirectSanpinLauncher />,
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
			tokens: ["copilot", "ai=1", "ai-assistant", "chairside-copilot", "copilot_standalone", "copilot-standalone", "copilot_drawer", "copilot-drawer", "copilot_proof", "copilot-proof"],
		},
		render: () => {
			if (typeof window !== "undefined" && (window as any).__denteCopilot) {
				(window as any).__denteCopilot.open();
			}
			return null;
		},
	},
	// 13. Омниканальный центр сообщений (SSOT)
	{
		id: "omnichannel-hub",
		title: "Омниканальный центр сообщений",
		criteria: {
			tokens: ["omnichannel_hub", "messaging_hub"],
		},
		render: () => (
			<div className="fixed inset-0 z-[99999] w-full h-screen min-h-screen p-2 sm:p-4 bg-[var(--paper)] text-[var(--ink)] box-border flex flex-col overflow-hidden">
				<OmnichannelOperatorDesk className="flex-1 w-full h-full" />
			</div>
		),
	},
	// 14. Студия документов и договоров SSOT
	{
		id: "documents-studio",
		title: "Студия документов и договоров",
		criteria: {
			tokens: ["documents", "docs-studio", "docs_studio", "documents-studio"],
			exclude: ["documents_catalog", "documents-catalog"],
			searchIncludes: ["documents=1", "docs=1", "standalone=documents"],
			exactHashes: ["#documents", "#docs-studio", "#documents-studio", "#contract", "#tax-certificate"],
			hashPrefixes: ["#documents?", "#docs-studio?", "#documents-studio?"],
		},
		render: () => <DirectDocumentsLauncher />,
	},
	// 14b. Каталог шаблонов документов
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
	// 14c. Юридическая электронная подпись врача (УКЭП ГОСТ / КриптоПро CSP)
	{
		id: "ukep-signing-studio",
		title: "Юридическая электронная подпись врача (УКЭП)",
		criteria: {
			tokens: ["ukep", "cryptopro", "ukep-signing", "crypto-pro", "crypto_pro"],
			searchIncludes: ["ukep=1", "cryptopro=1", "standalone=ukep"],
			exactHashes: ["#ukep", "#cryptopro", "#ukep-signing", "#crypto-pro"],
			hashPrefixes: ["#ukep?", "#cryptopro?"],
		},
		render: () => <DirectUkepSigningLauncher />,
	},
	// 15. Картотека пациентов и экспресс-регистрация
	{
		id: "patients-catalog",
		title: "Картотека пациентов и экспресс-регистрация",
		criteria: {
			tokens: ["patients", "patient-studio", "patient_studio", "express-patient", "express_patient"],
		},
		render: () => (
			<StandalonePatientCardHost
				onClose={() => clearUrlTokens(["patients", "patient-studio", "patient_studio", "express-patient", "express_patient"])}
			/>
		),
	},
	// 16. Карточка пациента 360
	{
		id: "patient-card-360",
		title: "Карточка пациента 360",
		criteria: {
			tokens: ["patient-card", "patient_card", "patient_modal", "patient-modal"],
		},
		render: () => (
			<StandalonePatientCardHost onClose={() => clearUrlTokens(["patient-card", "patient_card", "patient_modal", "patient-modal"])} />
		),
	},
	// 17. Аналитика и дашборд руководителя
	{
		id: "analytics-studio",
		title: "Аналитика и дашборд руководителя",
		criteria: {
			exactHashes: ["#executive-studio", "#clinic-analytics-studio"],
			hashIncludes: ["executive-studio", "clinic-analytics-studio"],
			searchIncludes: ["executive_studio=1", "analytics=studio", "dashboard=studio"],
		},
		render: () => <DirectAnalyticsLauncher />,
	},
	// 18. Воронка первичных обращений и CRM Лиды
	{
		id: "leads-studio",
		title: "Воронка первичных обращений и CRM Лиды",
		criteria: {
			tokens: ["leads", "crm-leads", "leads-studio", "kanban"],
			searchIncludes: ["leads=1", "standalone=leads"],
			exactHashes: ["#leads", "#crm-leads", "#kanban", "#leads-studio"],
			hashPrefixes: ["#leads?", "#leads/", "#crm-leads?", "#kanban?"],
		},
		render: () => <DirectLeadsStandaloneLauncher />,
	},
	// 19. Маркетинг, акции и ROMI
	{
		id: "marketing-studio",
		title: "Студия маркетинга, акций и ROMI",
		criteria: {
			tokens: ["marketing-studio"],
			searchIncludes: ["marketing=standalone", "marketing-studio=1", "standalone=marketing"],
			exactHashes: ["#marketing-studio"],
			hashPrefixes: ["#marketing-studio?"],
		},
		render: () => <DirectMarketingLauncher />,
	},
	// 20. Студия настроек клиники и реквизитов (SSOT переход в SettingsView)
	{
		id: "settings-studio",
		title: "Студия настроек клиники и реквизитов",
		criteria: {
			tokens: ["clinic-setup", "clinic-requisites", "settings-studio"],
			searchIncludes: ["clinic_setup=1", "standalone=settings", "standalone=clinic_setup"],
			exactHashes: ["#clinic-setup", "#clinic-requisites", "#settings-studio"],
			hashPrefixes: ["#settings-studio?", "#clinic-setup?", "#clinic-requisites?"],
		},
		render: () => <DirectSettingsTransition />,
	},
	// 21. Лист ожидания и подбор пациентов в освободившийся слот (SSOT)
	{
		id: "waitlist-matches",
		title: "Лист ожидания и подбор пациентов",
		criteria: {
			tokens: ["waitlist-matches", "waitlist_matches"],
			searchIncludes: ["waitlist-matches=true", "waitlist_matches=true"],
			exactHashes: ["#waitlist-matches", "#waitlist_matches"],
			hashPrefixes: ["#waitlist-matches?", "#waitlist_matches?"],
		},
		render: () => <DirectWaitlistMatchesLauncher />,
	},
	// 21b. Напоминания о завтрашних приёмах (SSOT)
	{
		id: "tomorrow-reminders",
		title: "Напоминания о завтрашних приёмах",
		criteria: {
			tokens: ["tomorrow-reminders", "tomorrow_reminders", "reminders", "appointment-reminders"],
			searchIncludes: ["reminders=1", "tomorrow-reminders=1", "tomorrow_reminders=1"],
			exactHashes: ["#tomorrow-reminders", "#tomorrow_reminders", "#reminders", "#appointment-reminders"],
			hashPrefixes: ["#tomorrow-reminders?", "#tomorrow_reminders?", "#reminders?", "#appointment-reminders?"],
		},
		render: () => <DirectTomorrowRemindersLauncher />,
	},
	// 22. Студия оборудования и аппаратных шлюзов клиники
	{
		id: "hardware-studio",
		title: "Студия оборудования и аппаратных шлюзов",
		criteria: {
			tokens: ["hardware", "hardware-studio", "equipment", "sensor-gateway"],
			searchIncludes: ["hardware=1", "standalone=hardware", "hardware-studio=1"],
			exactHashes: ["#hardware", "#hardware-studio", "#equipment", "#settings/hardware"],
			hashPrefixes: ["#hardware?", "#hardware-studio?", "#equipment?"],
		},
		render: () => (
			<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6" data-testid="hardware-standalone-view">
				<HardwareSettingsTab />
			</div>
		),
	},
	// 23. Студия прав доступа и ролевой матрицы персонала (RBAC)
	{
		id: "settings-access-studio",
		title: "Права доступа и ролевая матрица персонала (RBAC)",
		criteria: {
			tokens: ["access", "settings-access", "rbac", "role-matrix"],
			searchIncludes: ["access=1", "standalone=access", "rbac=1"],
			exactHashes: ["#access", "#settings/access", "#access-studio", "#rbac"],
			hashPrefixes: ["#access?", "#settings/access?", "#rbac?"],
		},
		render: () => (
			<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6" data-testid="settings-access-standalone-view">
				<SettingsAccessTab />
			</div>
		),
	},
	// 24. Студия управления сотрудниками клиники (Staff Management)
	{
		id: "settings-staff-studio",
		title: "Управление сотрудниками клиники (Staff Management)",
		criteria: {
			tokens: ["staff", "settings-staff", "staff-management"],
			searchIncludes: ["staff=1", "standalone=staff", "staff-management=1"],
			exactHashes: ["#staff", "#settings/staff", "#staff-studio"],
			hashPrefixes: ["#staff?", "#settings/staff?"],
		},
		render: () => (
			<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6" data-testid="settings-staff-standalone-view">
				<SettingsStaffTab props={{ dashboard: { clinicSettings: { staff: DEMO_STAFF_MEMBERS, name: "Клиника ДЕНТЕ" } } }} />
			</div>
		),
	},
	// 25. Интеграция с агрегаторами МедФлекс и ПроДокторов
	{
		id: "settings-medflex-studio",
		title: "Интеграция с агрегаторами МедФлекс и ПроДокторов",
		criteria: {
			tokens: ["medflex", "prodoctorov", "settings-medflex"],
			searchIncludes: ["medflex=1", "standalone=medflex", "prodoctorov=1"],
			exactHashes: ["#medflex", "#prodoctorov", "#settings/medflex", "#settings/prodoctorov"],
			hashPrefixes: ["#medflex?", "#prodoctorov?", "#settings/medflex?"],
		},
		render: () => (
			<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6" data-testid="settings-medflex-standalone-view">
				<div className="max-w-5xl mx-auto">
					<MedflexSettingsTab />
				</div>
			</div>
		),
	},
];

const DEMO_STAFF_MEMBERS: StaffProfileExtended[] = [
	staffProfileExtendedSchema.parse({
		id: "11111111-1111-4111-8111-111111111111",
		organizationId: "00000000-0000-4000-8000-000000000001",
		fullName: "Д-р Захаров Андрей Васильевич",
		role: "owner",
		phone: "+7 (999) 111-22-33",
		specialties: ["surgeon", "general"],
		active: true,
	}),
	staffProfileExtendedSchema.parse({
		id: "22222222-2222-4222-8222-222222222222",
		organizationId: "00000000-0000-4000-8000-000000000001",
		fullName: "Д-р Смирнова Елена Павловна",
		role: "curator",
		phone: "+7 (999) 222-33-44",
		specialties: ["therapist", "general"],
		active: true,
	}),
	staffProfileExtendedSchema.parse({
		id: "33333333-3333-4333-8333-333333333333",
		organizationId: "00000000-0000-4000-8000-000000000001",
		fullName: "Кузнецова Анна Сергеевна",
		role: "administrator",
		phone: "+7 (999) 333-44-55",
		specialties: ["universal"],
		active: true,
	}),
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

	// 2. Управленческие отчеты и аудит (?reports=1, #reports, ?analytics=1)
	const reports = renderReportsStandaloneLauncher();
	if (reports) {
		return reports;
	}

	// 4. Специализированные административные модули (ЕГИСЗ, СБП, кассовые ордера, МДЛП, Документы)
	const specializedAdmin = renderSpecializedAdministrativeLaunchers(props);
	if (specializedAdmin) {
		return specializedAdmin;
	}

	return null;
}
