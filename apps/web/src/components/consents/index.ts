/**
 * apps/web/src/components/consents/index.ts
 *
 * Канонический SSOT юридического контура, согласий и договоров DENTE CRM.
 */

// Канонический каталог согласий и генератор печати А4 (Мандаты 8e, 8x, 8ap)
export * from "./consentCatalogData.js";

// Каноническая Студия подписания согласий и договоров (Мандаты 8am, 8e, Apple HIG)
export { ConsentStudioModal, type ConsentStudioModalProps } from "./ConsentStudioModal.js";

// Автономный лаунчер deep links (#consents, #consent, #documents, ?consents=1)
export { DirectConsentLauncher } from "./DirectConsentLauncher.js";

// Реэкспорт совместимости
export * from "./consentTemplatesRegistry.js";
export * from "./signaturePadMath.js";
export * from "./useConsentSigning.js";
export * from "./ConsentModal.js";
export * from "./InformedConsentModal.js";
export * from "./SignaturePadCanvas.js";
