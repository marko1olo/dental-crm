/**
 * DENTE Dental CRM — Visit Diary Photo Upload (SSOT Facade)
 *
 * Архитектурная декомпозиция монолита по Мандату 8b/8zi (Sweet Spot 150-250 строк):
 * - apps/web/src/components/visit/photoUpload/useVisitDiaryPhotoUploadState.ts (хук состояния, blob и автономия)
 * - apps/web/src/components/visit/photoUpload/VisitDiaryPhotoActionsToolbar.tsx (панель действий врача)
 * - apps/web/src/components/visit/photoUpload/VisitDiaryPhotoThumbnailGrid.tsx (сетка миниатюр и зум)
 * - apps/web/src/components/visit/photoUpload/VisitDiaryPhotoUpload.tsx (фасад компонента)
 */

export type { DiaryPrintPhoto } from "./visit/photoUpload/VisitDiaryPhotoUpload";
export { VisitDiaryPhotoUpload } from "./visit/photoUpload/VisitDiaryPhotoUpload";
