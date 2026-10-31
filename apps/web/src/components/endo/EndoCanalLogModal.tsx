/**
 * DENTE Dental CRM — Canonical Chairside Endodontic SSOT Modal (Facade)
 * apps/web/src/components/endo/EndoCanalLogModal.tsx
 *
 * Канонический фасад над EndodonticStudioModal.tsx (Мандаты 8b / 8s / 8aq).
 * Ликвидирован 34KB монолит в пользу единого SSOT EndodonticStudioModal.
 */

import { EndodonticStudioModal, type EndodonticStudioModalProps } from "./EndodonticStudioModal";

export { EndodonticStudioModal, EndodonticStudioModal as EndoCanalLogModal };
export type { EndodonticStudioModalProps, EndodonticStudioModalProps as EndoCanalLogModalProps };
export default EndodonticStudioModal;
export * from "./endodonticsCatalogData";
