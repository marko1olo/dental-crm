/**
 * Patient Mobile Portal & Online Booking Presets
 * (DOMAIN: PATIENT PORTAL PRESETS & CLINICAL SCENARIOS)
 *
 * Канонический фасад пресетов и сценариев портала пациента.
 * Декомпозирован на модули в ./presets/:
 * - demoProfile: профиль пациента
 * - demoVisits: клинические протоколы Формы 043/у
 * - demoScansAndDocuments: RVG/ОПТГ/КЛКТ снимки и ИДС/договоры
 * - demoInvoices: счета и фискальные чеки 54-ФЗ
 * - demoBooking: филиалы и врачи для онлайн-записи
 * - demoServicesAndUpcoming: услуги прайса и предстоящий визит
 * - demoTreatmentPlan: 3-уровневый комплексный план лечения
 * - patientPortalSafeGetters: Zero-Mock геттеры витринного режима (Мандаты 8c, 8f, 8y)
 */

export * from "./presets/demoProfile.js";
export * from "./presets/demoVisits.js";
export * from "./presets/demoScansAndDocuments.js";
export * from "./presets/demoInvoices.js";
export * from "./presets/demoBooking.js";
export * from "./presets/demoServicesAndUpcoming.js";
export * from "./presets/demoTreatmentPlan.js";
export * from "./presets/patientPortalSafeGetters.js";
