/**
 * apps/web/src/components/consents/ConsentModal.tsx
 *
 * Фасад совместимости со старыми модулями вызова модалки согласий.
 * Реэкспортирует InformedConsentModal и ConsentStudioModal (Мандаты 8b, 8e).
 */

export { InformedConsentModal, ConsentModal, type InformedConsentModalProps, default } from "./InformedConsentModal";
export { ConsentStudioModal, type ConsentStudioModalProps } from "./ConsentStudioModal";
