import type { MigrationAutopilotResponse } from "@dental/shared";

export const DEMO_SHOWCASE_MIGRATION_AUTOPILOT: MigrationAutopilotResponse = {
	version: "dental-crm-migration-autopilot-v1",
	generatedAt: "2026-10-27T10:00:00.000Z",
	discovery: { roots: ["C:/ClinicData/Exports", "D:/Backups/MIS"], scannedFolders: 8, candidateCount: 3, probedCount: 2 },
	nextAction: "Проверить найденные таблицы пациентов и прайс-лист перед запуском полного импорта.",
	operatorPacket: {
		overallStatus: "ready_for_preview",
		score: 0.92,
		totals: { databaseSources: 1, mediaSources: 1, tableSources: 2, smartPreviewSources: 1, workstationHints: 0, publicLookupTargets: 2 },
		dryRun: {
			previewableSources: 2, adminBlockedSources: 0, doctorReviewRequiredSources: 0,
			estimatedOperatorMinutes: 4, estimatedClinicDowntimeMinutes: 0,
			fastestRoute: "Прямой перенос таблиц пациентов и прайс-листа (Excel/CSV)",
			nextBestAction: "Запустить пробный прогон (Dry Run)",
		},
		lanes: [
			{ id: "lane-patients", title: "Таблицы пациентов и медкарты", owner: "admin", status: "ready_for_preview", score: 0.95, detail: "1 420 пациентов сопоставлены без коллизий", nextAction: "Готово к предпросмотру" },
			{ id: "lane-pricelist", title: "Прейскурант услуг и процедуры", owner: "doctor", status: "ready_for_preview", score: 0.9, detail: "284 позиции сопоставлены с каталогом", nextAction: "Проверено врачом" },
			{ id: "lane-imaging", title: "Снимки и карты", owner: "operator", status: "in_progress", score: 0.88, detail: "450 снимков найдено в локальной папке", nextAction: "Пакетная привязка к визитам" },
		],
		handoffChecklist: [
			{ id: "chk-1", title: "Сверка дубликатов пациентов", owner: "admin", phase: "verify", status: "ready", detail: "Телефоны и ФИО нормализованы", requiredArtifact: "Реестр пациентов", doneWhen: "0 неразрешенных дублей" },
			{ id: "chk-2", title: "Контроль цен прейскуранта", owner: "doctor", phase: "verify", status: "ready", detail: "Цены в копейках зафиксированы", requiredArtifact: "Каталог услуг", doneWhen: "Подтверждено врачом" },
		],
		firstActions: ["Запустить пробный импорт (Dry Run)", "Проверить сопоставление категорий услуг", "Сверить телефоны пациентов"],
		onlineLookupPolicy: { allowed: ["legalName", "inn", "ogrn", "licenseNumber"], forbidden: ["patientPersonalData", "medicalRecords", "passwords"] },
	},
	sources: [
		{
			priority: "high", owner: "admin", score: 0.94, recommendedAction: "Открыть план переноса и запустить пробный прогон", riskFlags: [],
			candidate: { sourceFingerprint: "fp-patients-db", sourceKind: "database", matchedFiles: 3, displayPath: "C:/ClinicData/Exports/Patients_2026.xlsx" },
			readiness: { level: "ready", score: 0.95, blockers: [] },
		},
		{
			priority: "medium", owner: "operator", score: 0.88, recommendedAction: "Пакетный перенос рентген-снимков", riskFlags: [],
			candidate: { sourceFingerprint: "fp-images-dir", sourceKind: "media", matchedFiles: 450, displayPath: "D:/Backups/MIS/XRay_Studies" },
			readiness: { level: "ready", score: 0.9, blockers: [] },
		},
	],
	steps: [
		{ order: 1, title: "Поиск локальных баз и выгрузок", owner: "admin", blocking: false, detail: "Источники обнаружены" },
		{ order: 2, title: "Пробный прогон (Dry Run)", owner: "operator", blocking: false, detail: "1-клик валидация связей" },
		{ order: 3, title: "Утверждение импорта", owner: "doctor", blocking: false, detail: "Финальная запись в БД" },
	],
	warnings: [],
	privacyWarnings: ["Персональные данные пациентов обрабатываются локально без передачи в открытые сети."],
};
