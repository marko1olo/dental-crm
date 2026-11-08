/**
 * @file copilotShowcaseData.ts
 * @description Isolated showcase/demo mock datasets for DENTE AI Copilot (Mandate 8wy).
 * Strict separation: Only loaded when isDemoShowcaseMode() === true.
 * Mandate 8b: <= 120 lines. Zero cartoon emojis.
 */

export interface ShowcaseMemoryFact {
	id: string;
	category: "materials" | "anesthesia" | "protocols" | "equipment" | "custom";
	fact: string;
	createdAt: string;
}

export interface ShowcaseThread {
	id: string;
	title: string;
	updatedAt: string;
	pinned?: boolean;
	patientName?: string;
	patientId?: string;
	messageCount: number;
	previewText?: string;
}

export interface ShowcaseToolLog {
	id: string;
	toolName: string;
	category: "clinical" | "workstation" | "financial";
	status: "success" | "pending" | "running" | "rejected";
	durationMs?: number;
	args: Record<string, unknown>;
	resultSummary: string;
	timestamp: string;
}

export interface ShowcaseChatMessage {
	id: string;
	role: "user" | "assistant";
	text: string;
	citation?: string;
	timestamp: string;
	applied?: boolean;
	actionProposal?: { id: string; toolName: string; description: string; payload: Record<string, unknown> };
	suggestedReplies?: string[];
}

export const SHOWCASE_MEMORY_FACTS: ShowcaseMemoryFact[] = [
	{ id: "mem-1", category: "materials", fact: "Предпочтение наногибридного композита светового отверждения (Filtek Ultimate / Harmonize) и бонда 7 поколения", createdAt: "2026-10-15" },
	{ id: "mem-2", category: "anesthesia", fact: "Инфильтрационная и проводниковая анестезия: Артикаин 1:200 000 по умолчанию, без вазоконстриктора при гипертонии", createdAt: "2026-10-16" },
	{ id: "mem-3", category: "equipment", fact: "Рабочая станция кабинета №1: Визиограф Planmeca ProSensor, локальная dropzone C:\\Radiology\\Export", createdAt: "2026-10-20" },
	{ id: "mem-4", category: "protocols", fact: "Формирование протокола SOAP: подробное обоснование диагноза по МКБ-10 с формулой FDI", createdAt: "2026-10-25" },
];

export const SHOWCASE_THREADS: ShowcaseThread[] = [
	{ id: "thread-active", title: "Приём: Осмотр и глубокий кариес 36", updatedAt: "10:16", pinned: true, patientName: "Иванов Иван Иванович", patientId: "pat-active", messageCount: 4, previewText: "Сформирован протокол приёма и план лечения зуба 36" },
	{ id: "thread-prev-1", title: "Консультация ортопеда: All-on-4 нижняя челюсть", updatedAt: "Вчера, 16:40", pinned: false, patientName: "Смирнова Елена Павловна", patientId: "pat-smirnova", messageCount: 6, previewText: "Сформирована сравнительная смета: цирконий vs металлокерамика" },
	{ id: "thread-prev-2", title: "Анализ снимка КЛКТ: Зуб 46 периапикальный очаг", updatedAt: "28 окт, 14:10", pinned: false, patientName: "Кузнецов Алексей Сергеевич", patientId: "pat-kuznetsov", messageCount: 3, previewText: "Обнаружен дополнительный дистально-язычный канал Radix Entomolaris" },
];

export const SHOWCASE_TOOL_LOGS: ShowcaseToolLog[] = [
	{ id: "log-1", toolName: "updateToothStatus", category: "clinical", status: "success", durationMs: 42, args: { tooth: 36, diagnosis: "K02.1" }, resultSummary: "Одонтограмма обновлена: K02.1 Кариес дентина (Зуб 36)", timestamp: "10:16:02" },
	{ id: "log-2", toolName: "generateSoapDiary", category: "clinical", status: "success", durationMs: 120, args: { tooth: 36, anesthesic: "Articaine 1.7ml", material: "Nano-composite" }, resultSummary: "Дневник приёма SOAP сформирован и готов к подписанию", timestamp: "10:16:05" },
];

export const SHOWCASE_INITIAL_MESSAGES: ShowcaseChatMessage[] = [
	{ id: "msg-init-1", role: "user", text: "Пациент с жалобами на боли от холодного в зубе 36. Сформируй протокол приёма и план лечения.", timestamp: "10:15" },
	{
		id: "msg-init-2", role: "assistant", timestamp: "10:16", applied: false,
		text: "Диагноз: K02.1 Глубокий кариес дентина (Зуб 36). Назначено препарирование, изолирующая прокладка и реставрация нанокомпозитом под инфильтрационной анестезией Артикаин 1.7 мл.",
		citation: "Клинические рекомендации СтАР / ITI Consensus",
		actionProposal: { id: "act-init-1", toolName: "generateSoapDiary", description: "Запись протокола приёма и сметы в карту пациента", payload: { tooth: 36, diagnosis: "K02.1" } },
		suggestedReplies: ["Прокладка Ionosit", "Смета на зуб 36", "Контроль 7 дн"],
	},
];
