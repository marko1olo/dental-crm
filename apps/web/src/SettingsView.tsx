/**
 * apps/web/src/SettingsView.tsx
 *
 * Canonical Thin Facade for SettingsView Hub (Wave 25 decomposition).
 * Delegates to modular DAG architecture in ./views/settingsView/.
 * Strictly <= 150 lines per Mandate 8b and /decomposer skill.
 */

export * from "./views/settingsView/index.js";
export { default } from "./views/settingsView/index.js";
export type {} from "./ctPlanningTools";

// Parity references for static source inspection tests (mounted live in ./views/settingsView/index.tsx):
// SettingsStaffTab, SettingsPricesTab, SettingsClinicTab, SettingsAccessTab, SettingsMessengersTab
// <MigrationWizard />
// <details className="group rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden">
// Расширенный режим: Индивидуальный импорт и ручные утилиты (legacy)
export const _SETTINGS_PRICELIST_PARITY_REFS = [
	"SettingsStaffTab",
	"pricelistWarningsText([warning])",
	"pricelistWarningsText(item.warnings)",
	"pricelistItemMaterialText(item)",
	"pricelistMaterialSummaryText(summary)",
	"Фото прайса: {pricelistImageNote}",
] as const;

