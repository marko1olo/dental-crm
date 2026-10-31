/**
 * apps/web/src/components/consents/index.ts
 *
 * Канонический SSOT юридического контура, согласий и договоров DENTE CRM.
 */

// Канонический реестр 15 бланков Минздрава, хэширование целостности и печать А4
export * from "./consentCatalogData";

// Каноническая студия пакетного подписания согласий и договоров (Мандаты 8e, 8am)
export { ConsentStudioModal, type ConsentStudioModalProps } from "./ConsentStudioModal";

// Автономный лаунчер deep links (#consents, #consent, ?consent=1, dente:open-consent)
export { DirectConsentLauncher } from "./DirectConsentLauncher";

// Фасады совместимости
export { InformedConsentModal, ConsentModal, type InformedConsentModalProps } from "./InformedConsentModal";
