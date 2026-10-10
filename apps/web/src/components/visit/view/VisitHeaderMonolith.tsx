/**
 * @file VisitHeaderMonolith.tsx
 * @description Канонический тонкий фасад шапки текущего приёма врача (VisitHeaderMonolith).
 * Декомпозирован по МАНДАТУ 8b и навыку /decomposer в модульную структуру:
 * apps/web/src/components/visit/view/visitHeader/
 * - types.ts (типы пропсов шапки визита, медицинских алертов, статусов приёма, кнопок действий)
 * - PatientAlertBadgesBar.tsx (полоса критических медицинских предупреждений: аллергии, соматика, непереносимость анестетиков)
 * - VisitTimerAndStatusControls.tsx (секундомер визита, оперативная очередь смены и присутствие)
 * - VisitActionButtonsToolbar.tsx (панель быстрых клинических действий: норма, бланки, печать 043/у, касса)
 * - index.tsx (мастер-компонент VisitHeaderMonolith и полные реэкспорты)
 */

export * from "./visitHeader/index.js";
export { default } from "./visitHeader/index.js";
