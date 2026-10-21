import type { FastifyInstance } from "fastify";
import { registerAgentRoutes } from "../routes/agentRoutes.js";
import { registerAiRoutes } from "../routes/ai.js";
import { registerAnalyticsRoutes } from "../routes/analytics.js";
import { registerAnesthesiaRoutes } from "../routes/anesthesia.js";
import { registerAuditRoutes } from "../routes/audit.js";
import { registerAuthRoutes } from "../routes/auth.js";
import { registerBillingRoutes } from "../routes/billing.js";
import { registerCommerceMlRoutes } from "../routes/commerceMl.js";
import { registerChatRoutes } from "../routes/chat.js";
import { registerClinicalRoutes } from "../routes/clinical.js";
import { registerClinicalImplantRoutes } from "../routes/clinicalImplants.js";
import { registerSurgeryRoutes } from "../routes/surgery/index.js";
import { registerClinicWorkflowsRoutes } from "../routes/clinicWorkflows.js";
import { registerCommunicationReceiptRoutes } from "../routes/communicationReceipts.js";
import { registerCommunicationRoutes } from "../routes/communications.js";
import { registerMessageTemplateRoutes } from "../routes/messageTemplates.js";
import { registerCommunicationOutboxRoutes } from "../routes/communicationsOutbox.js";
import { registerDashboardRoutes } from "../routes/dashboard.js";
import { registerDayConfirmationRoutes } from "../routes/dayConfirmations.js";
import { registerDemoRoutes } from "../routes/demo/index.js";
import registerDiaryRoutes from "../routes/diary.js";
import { registerDicomwebRoutes } from "../routes/dicomweb.js";
import { registerDocumentRoutes } from "../routes/documents.js";
import { registerTaxCertificateRoutes } from "../routes/taxCertificates.js";
import { registerDocumentTemplateRoutes } from "../routes/documentTemplates.js";
import registerEgiszRoutes from "../routes/egisz.js";
import { registerCryptoProNativeRoutes } from "../routes/cryptoProNativeRoutes.js";
import { registerFilesRoutes } from "../routes/files.js";
import { registerExpensesRoutes } from "../routes/expenses.js";
import { registerCashboxRoutes } from "../routes/cashbox.js";
import { registerCrmLeakDetectorRoutes } from "../routes/crmLeakDetector.js";
import { registerFinancialPnlRoutes } from "../routes/financialPnl.js";
import { registerPatientRelationshipsRoutes } from "../routes/patientRelationships.js";
import { registerFamilyFinanceRoutes } from "../routes/finance_family.js";
import { registerHealthRoutes } from "../routes/health.js";
import { registerHardwareRoutes } from "../routes/hardware.js";
import { registerImagingRoutes } from "../routes/imaging.js";
import { registerImagingPlanningRoutes } from "../routes/imaging_planning.js";
import { registerRadiologyDicomRoutes } from "../routes/radiology/dicomReceiverRoutes.js";
import { registerImportRoutes } from "../routes/imports.js";
import { registerOnboardingRoutes } from "../routes/onboarding/index.js";
import { registerIngestionRoutes } from "../routes/ingestion.js";
import { registerInsuranceRoutes } from "../routes/insurance.js";
import { registerInvoiceRoutes } from "../routes/invoices.js";
import { registerDiagnocatRoutes } from "../routes/integrations/diagnocat.js";
import { registerFlexbeRoutes } from "../routes/integrations/flexbe.js";
import { registerProdoctorovRoutes } from "../routes/integrations/prodoctorov.js";
import { inventoryRoutes } from "../routes/inventory.js";
import { warehouseRoutes } from "../routes/warehouse.js";
import { registerLabRoutes } from "../routes/lab.js";
import { registerLeadsRoutes } from "../routes/leads.js";
import { registerLoyaltyRoutes } from "../routes/loyalty.js";
import { registerExportRoutes } from "../routes/export.js";
import { registerMarketingRoutes } from "../routes/marketing.js";
import { registerMaxRoutes } from "../routes/max.js";
import { registerMdlpRoutes } from "../routes/mdlp.js";
import { registerMobileOtaRoutes } from "../routes/mobileOta.js";
import { registerPharmacologyRoutes } from "../routes/pharmacology.js";
import { registerPrescriptionRoutes } from "../routes/prescriptions.js";
import { registerMigrationRoutes } from "../routes/migration.js";
import { registerMigrationRunRoutes } from "../routes/migrationRuns.js";
import { registerOdontogramRoutes } from "../routes/odontogram.js";
import { registerPeriodontogramRoutes } from "../routes/periodontogram.js";
import { registerPediatricRoutes as registerPediatricDomainRoutes } from "../routes/pediatric.js";
import { registerOrthodonticsRoutes } from "../routes/orthodontics.js";
import registerToothHistoryRoutes from "../routes/toothHistory.js";
import { registerOutpatientRoutes } from "../routes/outpatient.js";
import { registerPatientDuplicateRoutes } from "../routes/patientDuplicates.js";
import { registerPatientRecallRoutes } from "../routes/patientRecall.js";
import { registerPatientRoutes } from "../routes/patients.js";
import { patientPortalRoutes } from "../routes/patientPortal.js";
import { portalRoutes } from "../routes/portal.js";
import { portalBudgetRoutes } from "../routes/portalBudgetRoutes.js";
import { publicBudgetRoutes } from "../routes/publicBudgetRoutes.js";
import { treatmentPlanRoutes } from "../routes/treatmentPlanRoutes.js";
import { clinicalBundlesRoutes } from "../routes/clinicalBundlesRoutes.js";
import { registerPricelistRoutes } from "../routes/pricelist.js";
import { registerPublicAppointmentActionRoutes } from "../routes/publicAppointmentActions.js";
import { registerPublicBookingRoutes } from "../routes/publicBooking.js";
import { registerPublicEstimatesRoutes } from "../routes/publicEstimates.js";
import { registerReferralRoutes } from "../routes/referrals.js";
import { registerReportRoutes } from "../routes/reports.js";
import { registerSberbankRoutes } from "../routes/sberbank.js";
import { registerSberPosWebhookRoutes } from "../routes/payments/sberPosWebhookRoute.js";
import { registerFiscalReceiptRoutes } from "../routes/fiscal/fiscalReceiptRoutes.js";
import { registerSbpQrRoutes } from "../routes/sbpQr.js";
import { registerScheduleRoutes } from "../routes/schedule.js";
import { registerSettingsRoutes } from "../routes/settings.js";
import { registerDoctorPreferencesRoutes } from "../routes/doctorPreferencesRoutes.js";
import { registerDoctorEarningsRoutes } from "../routes/doctorEarningsRoutes.js";
import { registerChairRentalRoutes } from "../routes/chairRentalRoutes.js";
import { registerStaffRoutes } from "../routes/staff.js";
import { registerStaffChatRoutes } from "../routes/staffChat.js";
import { registerSmartImportRoutes } from "../routes/smartImports.js";
import { registerSpeechRoutes } from "../routes/speech.js";
import { registerSpeechLiveRoutes } from "../routes/speechLive.js";
import { registerSanpinRoutes } from "../routes/sanpin.js";
import { registerSterilizationRoutes } from "../routes/sterilization.js";
import { registerSyncRoutes } from "../routes/sync/index.js";
import { registerSystemRoutes } from "../routes/system.js";
import { registerTelegramRoutes } from "../routes/telegram.js";
import { registerTelegramReferralLoyaltyRoutes } from "../routes/telegramReferralLoyalty.js";
import { registerTasksRoutes } from "../routes/tasks.js";
import { telephonyRoutes } from "../routes/telephony.js";
import registerTemplateRoutes from "../routes/templates.js";
import { copilotRoutes } from "../routes/copilot.js";
import { treatmentConsumablesRoutes } from "../routes/treatmentConsumables.js";
import { registerVisitRoutes } from "../routes/visits.js";
import { registerVkRoutes } from "../routes/vk.js";
import { registerWaitlistRoutes } from "../routes/waitlist.js";
import { registerWaitlistMatchRoutes } from "../routes/waitlistMatches.js";
import { registerWebsocketRoutes } from "../routes/websocket.js";
import { registerWhatsappRoutes } from "../routes/whatsapp.js";
import { registerOmnichannelBotRoutes } from "../routes/omnichannelBots.js";
import { workspaceProfileRoutes } from "../routes/workspaceProfile.js";
import { registerLanNetworkRoutes } from "../routes/lanNetwork.js";
import { registerXrayRoutes } from "../routes/xray.js";
import { registerYandexCalendarRoutes } from "../routes/yandexCalendar.js";
import { registerWarrantyRoutes } from "../routes/warranty.js";
import { registerShiftRoutes } from "../routes/shifts/index.js";

/**
 * Регистрация всех доменных групп маршрутов Dente API.
 * Порядок регистрации со 100% точностью повторяет канонический порядок (Zero Logic Mutation).
 */
export async function registerAllRoutes(app: FastifyInstance): Promise<void> {
	await registerHealthRoutes(app);
	await registerLanNetworkRoutes(app);
	await registerHardwareRoutes(app);
	await registerMobileOtaRoutes(app);

	await registerAiRoutes(app);
	await registerBillingRoutes(app);
	await registerCommerceMlRoutes(app);
	await registerSberbankRoutes(app);
	await registerSberPosWebhookRoutes(app);
	await registerClinicalRoutes(app);
	await registerTasksRoutes(app);
	await registerChatRoutes(app);
	await registerCommunicationRoutes(app);
	await registerMessageTemplateRoutes(app);
	await registerDashboardRoutes(app);
	await registerDemoRoutes(app);
	await registerDocumentRoutes(app);
	await registerTaxCertificateRoutes(app);
	await registerDocumentTemplateRoutes(app);
	await registerImagingRoutes(app);
	await registerImagingPlanningRoutes(app);
	await registerRadiologyDicomRoutes(app);
	await registerIngestionRoutes(app);
	await registerImportRoutes(app);
	await registerOnboardingRoutes(app);
	// Движок переноса чужой базы: стейджинг, карантин, сверка, откат.
	await registerMigrationRoutes(app);
	// Оркестрация по фазам для больших выгрузок: заливка потоком, очередь, воркер.
	await registerMigrationRunRoutes(app);
	// Зубная формула и история зуба. Оба модуля были написаны, но ни разу не
	// зарегистрированы: Fastify отвечал «Route POST:/api/patients/:id/
	// tooth-states/batch not found», поэтому состояния зубов физически не могли
	// сохраниться, а вкладка «История зуба» не имела источника данных.
	await registerOdontogramRoutes(app);
	await registerPediatricDomainRoutes(app);
	await registerPeriodontogramRoutes(app);
	await registerToothHistoryRoutes(app);
	await registerOutpatientRoutes(app);
	await registerLoyaltyRoutes(app);
	await registerReferralRoutes(app);
	await registerAnesthesiaRoutes(app);
	await registerClinicalImplantRoutes(app);
	await registerSurgeryRoutes(app);
	await registerSbpQrRoutes(app);
	await registerFiscalReceiptRoutes(app);
	await registerPharmacologyRoutes(app);
	await registerPrescriptionRoutes(app);
	await registerMdlpRoutes(app);
	// Ни один из этих модулей раньше не регистрировался, поэтому семейный кошелёк,
	// ДМС, зуботехническая лаборатория, лист ожидания, лиды, стерилизация,
	// файлы, планирование по снимкам и каналы VK/WhatsApp/MAX отвечали 404.
	// Проверено на дубли: среди 225 объявленных путей пересечений с уже
	// работающими маршрутами нет.
	await registerFilesRoutes(app);
	await registerFamilyFinanceRoutes(app);
	await registerInsuranceRoutes(app);
	await registerInvoiceRoutes(app);
	await registerLabRoutes(app);
	await registerLeadsRoutes(app);
	/* registerMaxRoutes и registerWhatsappRoutes навешивают внутри себя
     app.addHook("preHandler", ...) с проверкой requireNonDoctorAccess. При
     вызове напрямую с корневым экземпляром хук попадает в корневую область и
     срабатывает на КАЖДОМ запросе всего API, а не только на своих маршрутах.

     Замерено на живом сервере, scratch/probe-doctor-403-scope.mjs: врач,
     разблокировавший смену своим PIN, получал 403 «Доктора не могут
     выполнять это действие: non-doctor mutation» на всё, включая
     /api/health, /api/dashboard, /api/patients и чтение зубной формулы. Без
     токена сотрудника те же маршруты отвечали 200. То есть стоматолог,
     войдя под собой, не мог работать в программе вообще — а зубная формула
     это его основной инструмент.

     app.register создаёт границу инкапсуляции: хук остаётся внутри своего
     модуля. Маршруты внутри объявлены абсолютными путями (/api/max/...,
     /api/whatsapp/...), поэтому префикс не нужен и адреса не меняются. */
	await app.register(registerMaxRoutes);
	await registerSanpinRoutes(app);
	await registerSterilizationRoutes(app);
	await registerVkRoutes(app);
	await registerWaitlistRoutes(app);
	// registerWhatsappRoutes инкапсулирует канонический вебхук-контур (/api/whatsapp/webhook и /api/v1/webhooks/whatsapp)
	await app.register(registerWhatsappRoutes);
	await registerPatientRoutes(app);
	await registerOrthodonticsRoutes(app);
	await registerExportRoutes(app);
	await registerMarketingRoutes(app);
	await registerPricelistRoutes(app);
	await registerScheduleRoutes(app);
	await registerSettingsRoutes(app);
	await registerDoctorPreferencesRoutes(app);
	await registerDoctorEarningsRoutes(app);
	await registerChairRentalRoutes(app);
	await registerStaffRoutes(app);
	await registerStaffChatRoutes(app);
	await registerSpeechRoutes(app);
	await registerSpeechLiveRoutes(app);
	void registerSmartImportRoutes(app);
	void registerYandexCalendarRoutes(app);
	await registerClinicWorkflowsRoutes(app);
	await registerSyncRoutes(app);
	void registerSystemRoutes(app);
	// Живые обновления. Раньше плагин не регистрировался вовсе, поэтому
	// /api/ws/schedule отвечал 404, а все wsBroker.broadcast* были пустышками.
	await registerWebsocketRoutes(app);
	await registerTelegramRoutes(app);
	await registerTelegramReferralLoyaltyRoutes(app);
	await registerOmnichannelBotRoutes(app);
	await registerVisitRoutes(app);
	await registerDicomwebRoutes(app);
	await registerXrayRoutes(app);
	await registerDiagnocatRoutes(app);
	await registerAuthRoutes(app);
	await registerAnalyticsRoutes(app);
	await registerAuditRoutes(app);
	await workspaceProfileRoutes(app);
	await registerFlexbeRoutes(app);
	await registerProdoctorovRoutes(app);

	// Вторая партия ранее незарегистрированных модулей.
	await registerDiaryRoutes(app);
	await registerEgiszRoutes(app);
	await registerCryptoProNativeRoutes(app);
	// templates.ts нашёл тест routeRegistrationCoverage: полностью готовый
	// CRUD шаблонов приёма (аналог «Шаблонов амбулаторных карт»), при этом
	// apps/web обращается к /api/templates, а маршрута не существовало.
	await registerTemplateRoutes(app);
	await app.register(inventoryRoutes, { prefix: "/api/inventory" });
	await app.register(warehouseRoutes, { prefix: "/api/warehouse" });
	await app.register(treatmentConsumablesRoutes, {
		prefix: "/api/treatment-consumables",
	});
	await app.register(copilotRoutes);
	await app.register(portalRoutes, { prefix: "/api/portal" });
	await app.register(patientPortalRoutes, { prefix: "/api/portal" });
	await app.register(portalBudgetRoutes, { prefix: "/api/portal" });
	await app.register(publicBudgetRoutes);
	await app.register(treatmentPlanRoutes);
	await app.register(clinicalBundlesRoutes);
	await app.register(registerExpensesRoutes);
	await registerCashboxRoutes(app);
	await registerCrmLeakDetectorRoutes(app);
	await registerFinancialPnlRoutes(app);
	await registerPatientRelationshipsRoutes(app);
	await app.register(registerPublicEstimatesRoutes);
	await app.register(registerPublicBookingRoutes, {
		prefix: "/api/public/booking",
	});
	await app.register(telephonyRoutes, { prefix: "/api/telephony" });

	// Сообщения пациентам: справочник шаблонов, очередь отправки, согласия,
	// настройки рассылки и состояние шлюзов.
	await registerCommunicationOutboxRoutes(app);

	// Отчёты руководителю.
	await registerReportRoutes(app);

	// Квитанции о доставке от провайдеров.
	await registerCommunicationReceiptRoutes(app);

	// Подтверждение и отмена приёма пациентом по ссылке из напоминания.
	await registerPublicAppointmentActionRoutes(app);

	// Утренний обзвон: кто подтвердил, до кого напоминание не дошло и кому поэтому надо звонить.
	await registerDayConfirmationRoutes(app);

	// Разбор дублей пациентов.
	await registerPatientDuplicateRoutes(app);

	// Возврат пациентов.
	await registerPatientRecallRoutes(app);

	// Кому предложить окно после отмены.
	await registerWaitlistMatchRoutes(app);

	// Автономный клинический агент DENTE (/api/agent/chat, /api/agent/tools).
	await app.register(registerAgentRoutes);

	// Гарантийные паспорта и публичная верификация QR
	await app.register(registerWarrantyRoutes);

	// Смена врача и авто-закрытие по расписанию (Mandates 8e, 8n)
	await registerShiftRoutes(app);
}
