/**
 * Проверяет, что все непереданные имена вообще существуют в области видимости
 * SettingsView. Если имя там есть — его просто забыли положить в settingsProps,
 * и правка безопасна. Если нет — надо сначала достать его из логики.
 */
import { readFileSync } from "node:fs";

const MISSING = [
	"applyClinicLookupSuggestion",
	"chairScheduleDirtyIds",
	"chairScheduleDrafts",
	"chairScheduleSaveStates",
	"chairScheduleSavingId",
	"changeClinicMode",
	"clinicLookupSuggestionApplySummary",
	"clinicLookupSuggestionFieldEntries",
	"clinicModeLabels",
	"clinicPublicLookup",
	"clinicPublicLookupBoundaryText",
	"clinicPublicLookupFieldLabels",
	"clinicPublicLookupProviderStatusLabels",
	"clinicPublicLookupSuggestionSourceLabels",
	"clinicPublicLookupWarningText",
	"humanizeMigrationText",
	"isClinicPublicLookupLoading",
	"legalMissingFields",
	"legalReadinessPercent",
	"lookupClinicPublicProfile",
	"newChairReadyToCreate",
	"newStaffReadyToCreate",
	"saveChairSchedule",
	"saveClinicProfileFromDraft",
	"saveStaffCredentials",
	"saveStaffSchedule",
	"setUiLanguage",
	"specialtyLabels",
	"staffScheduleDirtyIds",
	"staffScheduleDraftFromWorkingHours",
	"staffScheduleDrafts",
	"staffScheduleSaveStates",
	"staffScheduleSavingId",
	"updateChairScheduleDay",
	"updateChairScheduleDraft",
	"updateStaffScheduleDay",
	"updateStaffScheduleDraft",
];

const source = readFileSync("apps/web/src/SettingsView.tsx", "utf8");
const inScope = [];
const absent = [];

for (const name of MISSING) {
	// Ищем имя как отдельное слово: в деструктуризации, объявлении или импорте.
	const found = new RegExp(`(^|[^\\w$])${name}([^\\w$]|$)`, "m").test(source);
	(found ? inScope : absent).push(name);
}

console.log(`в области видимости SettingsView: ${inScope.length}`);
for (const name of inScope) console.log(`  есть  ${name}`);
console.log(`\nотсутствуют: ${absent.length}`);
for (const name of absent) console.log(`  НЕТ   ${name}`);
