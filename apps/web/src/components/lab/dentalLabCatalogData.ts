/**
 * apps/web/src/components/lab/dentalLabCatalogData.ts
 *
 * DENTE Dental CRM — Канонический каталог зуботехнической лаборатории и ортопедии (SSOT).
 * 5 канонических стадий заказ-наряда, ортопедические конструкции, палитра VITA Classic + Bleach,
 * расчет рабочих дней без выходных, учет строго в копейках (amountKopecks) и автономия врача (Мандаты 8b, 8e, 8am).
 */

import {
	DENTAL_LAB_CONSTRUCTIONS,
	STAGE_TO_CANONICAL_PG_STATUS,
	mapStageToCanonicalPgStatus,
	CANONICAL_PG_LAB_STATUSES,
	type CanonicalPgLabStatus,
	formatKopecksToRub,
	toExactKopecks,
	percentageOfKopecks,
} from "@dental/shared";
import { isDemoShowcaseMode } from "../../lib/demoMode";

export type DentalLabStage =
	| "created"
	| "scan_sent"
	| "in_production"
	| "shipped"
	| "fitting_ready"
	| "in_clinic"
	| "seated"
	| "cancelled"
	| "rejected_remake";

export interface DentalLabStageMeta {
	readonly id: DentalLabStage;
	readonly stepNumber: number;
	readonly labelRu: string;
	readonly shortLabel: string;
	readonly descriptionRu: string;
	readonly colorClass: string;
	readonly bgToken: string;
	readonly borderToken: string;
	readonly textToken: string;
	readonly isFinal?: boolean | undefined;
	readonly badgeClass?: string | undefined;
	readonly title?: string | undefined;
}

/** 5 канонических стадий заказ-наряда зуботехнической лаборатории */
export const CANONICAL_LAB_STAGES: readonly DentalLabStageMeta[] = Object.freeze([
	{ id: "scan_sent", stepNumber: 1, labelRu: "Оттиск / Скан отправлен", shortLabel: "Отправлен", descriptionRu: "1. Создан / В работе клиники: цифровой скан или слепок передан курьеру лаборатории", colorClass: "text-[var(--teal,#0d9488)]", bgToken: "var(--teal-surface, rgba(13, 148, 136, 0.12))", borderToken: "var(--teal, #0d9488)", textToken: "var(--teal, #0d9488)", badgeClass: "badge-teal", title: "Оттиск / Скан отправлен" },
	{ id: "in_production", stepNumber: 2, labelRu: "В работе у техника", shortLabel: "В лаборатории", descriptionRu: "2. Отправлен в лабораторию / В производстве: CAD-моделировка, фрезеровка или спекание керамики", colorClass: "text-[var(--amber,#f59e0b)]", bgToken: "var(--amber-surface, rgba(245, 158, 11, 0.12))", borderToken: "var(--amber, #f59e0b)", textToken: "var(--amber-ink, #92400e)", badgeClass: "badge-amber", title: "В работе у техника" },
	{ id: "fitting_ready", stepNumber: 3, labelRu: "Примерка каркаса", shortLabel: "Примерка", descriptionRu: "3. Промежуточный этап: проверка прилегания каркаса и окклюзионных контактов в полости рта", colorClass: "text-[var(--accent,#3b82f6)]", bgToken: "var(--paper-soft, rgba(59, 130, 246, 0.12))", borderToken: "var(--accent, #3b82f6)", textToken: "var(--accent, #3b82f6)", badgeClass: "badge-blue", title: "Примерка каркаса" },
	{ id: "in_clinic", stepNumber: 4, labelRu: "Готово в клинике", shortLabel: "В клинике", descriptionRu: "4. Готов / Доставлен в клинику: конструкция проверена лабораторией и ожидает пациента", colorClass: "text-[var(--emerald,#10b981)]", bgToken: "var(--emerald-surface, rgba(16, 185, 129, 0.14))", borderToken: "var(--emerald, #10b981)", textToken: "var(--emerald-ink, #065f46)", badgeClass: "badge-emerald", title: "Готово в клинике" },
	{ id: "seated", stepNumber: 5, labelRu: "Зафиксировано во рту", shortLabel: "Зафиксировано", descriptionRu: "5. Припасован и зафиксирован: постоянная цементировка конструкции завершена, гарантия активирована", colorClass: "text-[var(--muted,#64748b)]", bgToken: "var(--paper-strong, rgba(100, 116, 139, 0.12))", borderToken: "var(--line, #cbd5e1)", textToken: "var(--ink-muted, #64748b)", isFinal: true, badgeClass: "badge-muted", title: "Зафиксировано во рту" },
]);

/** Дополнительные статусы производства и логистики ЗТЛ */
export const AUXILIARY_LAB_STAGES: readonly DentalLabStageMeta[] = Object.freeze([
	{
		id: "shipped",
		stepNumber: 3.5,
		labelRu: "В пути / Передано курьеру",
		shortLabel: "В пути",
		descriptionRu: "Заказ-наряд передан курьерской службе для доставки в клинику",
		colorClass: "text-[var(--accent,#3b82f6)]",
		bgToken: "var(--paper-soft, rgba(59, 130, 246, 0.12))",
		borderToken: "var(--accent, #3b82f6)",
		textToken: "var(--accent, #3b82f6)",
		badgeClass: "badge-blue",
		title: "В пути / Передано курьеру",
	},
	{
		id: "cancelled",
		stepNumber: 0,
		labelRu: "Отменён",
		shortLabel: "Отменён",
		descriptionRu: "Заказ-наряд аннулирован клиникой или лабораторией",
		colorClass: "text-[var(--danger,#ef4444)]",
		bgToken: "var(--danger-soft, rgba(239, 68, 68, 0.12))",
		borderToken: "var(--danger, #ef4444)",
		textToken: "var(--danger, #ef4444)",
		isFinal: true,
		badgeClass: "badge-danger",
		title: "Отменён",
	},
	{
		id: "rejected_remake",
		stepNumber: 0,
		labelRu: "Брак / Переделка",
		shortLabel: "Переделка",
		descriptionRu: "Возврат в лабораторию на гарантийную переделку или исправление брака",
		colorClass: "text-[var(--warning-ink,#b45309)]",
		bgToken: "var(--warning-soft, rgba(245, 158, 11, 0.15))",
		borderToken: "var(--warning-line, #f59e0b)",
		textToken: "var(--warning-ink, #b45309)",
		badgeClass: "badge-amber",
		title: "Брак / Переделка",
	},
]);

export const ALL_LAB_STAGES: readonly DentalLabStageMeta[] = Object.freeze([
	...CANONICAL_LAB_STAGES,
	...AUXILIARY_LAB_STAGES,
]);

export function mapDbStatusToStage(status: string | null | undefined): DentalLabStage {
	switch (status) {
		case "draft": case "sent": case "scan_sent": return "scan_sent";
		case "in_progress": case "in_production": return "in_production";
		case "shipped": return "shipped";
		case "fitting": case "fitting_ready": case "refitting": return "fitting_ready";
		case "received": case "in_clinic": case "ready": case "ready_in_clinic": return "in_clinic";
		case "completed": case "seated": case "fitted": return "seated";
		case "cancelled": return "cancelled";
		case "rejected_remake": case "rework": return "rejected_remake";
		default: return "scan_sent";
	}
}

export const STAGE_TO_DB_STATUS: Record<DentalLabStage, CanonicalPgLabStatus> = {
	scan_sent: "sent",
	in_production: "in_progress",
	fitting_ready: "fitting",
	in_clinic: "ready_in_clinic",
	seated: "completed",
	created: "sent",
	shipped: "shipped",
	cancelled: "cancelled",
	rejected_remake: "rejected_remake",
};

export interface OrthopedicMaterialMeta {
	readonly id: string;
	readonly titleRu: string;
	readonly shortTitle: string;
	readonly categoryRu: string;
	readonly defaultDurationDays: number;
	readonly baseLabCostKopecks: number;
	readonly defaultPatientPriceKopecks: number;
	readonly descriptionRu: string;
	readonly requiresShade: boolean;
	readonly allowsStumpShade: boolean;
	readonly standardWorkingDays: number;
	readonly defaultLabCostKopecks: number;
	readonly material: string;
}

/** 6 канонических ортопедических конструкций частной стоматологии РФ (Мандат 8n: 1-5 кресел) */
export const CANONICAL_LAB_MATERIALS: readonly OrthopedicMaterialMeta[] = Object.freeze([
	{
		id: "zirconia_multilayer", titleRu: "Циркониевая коронка Multi-layer (многослойный диоксид циркония)", shortTitle: "Цирконий (ZrO2)",
		categoryRu: "Несъемное протезирование", defaultDurationDays: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.standardTurnaroundDays,
		baseLabCostKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultZtlCostKopecks,
		defaultPatientPriceKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultPatientPriceKopecks,
		descriptionRu: "Высокоэстетичный градиентный цирконий с естественной прозрачностью режущего края", requiresShade: true, allowsStumpShade: true,
		standardWorkingDays: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.standardTurnaroundDays,
		defaultLabCostKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultZtlCostKopecks, material: "Диоксид циркония",
	},
	{
		id: "emax_press", titleRu: "Пресс-керамика (дисиликат лития — вкладка / винир / коронка)", shortTitle: "Дисиликат лития",
		categoryRu: "Несъемное протезирование", defaultDurationDays: DENTAL_LAB_CONSTRUCTIONS.crown_emax.standardTurnaroundDays,
		baseLabCostKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_emax.defaultZtlCostKopecks,
		defaultPatientPriceKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_emax.defaultPatientPriceKopecks,
		descriptionRu: "Дисиликат лития высочайшей эстетики для виниров и коронок во фронтальной зоне", requiresShade: true, allowsStumpShade: true,
		standardWorkingDays: DENTAL_LAB_CONSTRUCTIONS.crown_emax.standardTurnaroundDays,
		defaultLabCostKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_emax.defaultZtlCostKopecks, material: "Дисиликат лития",
	},
	{
		id: "metal_ceramic_cocr", titleRu: "Металлокерамика на биосовместимом Co-Cr сплаве", shortTitle: "Металлокерамика",
		categoryRu: "Несъемное протезирование", defaultDurationDays: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.standardTurnaroundDays,
		baseLabCostKopecks: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.defaultZtlCostKopecks,
		defaultPatientPriceKopecks: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.defaultPatientPriceKopecks,
		descriptionRu: "Классическая прочная коронка с послойным нанесением керамической массы", requiresShade: true, allowsStumpShade: false,
		standardWorkingDays: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.standardTurnaroundDays,
		defaultLabCostKopecks: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.defaultZtlCostKopecks, material: "Металлокерамика Co-Cr",
	},
	{
		id: "clasp_prosthesis", titleRu: "Бюгельный протез с прецизионной замковой фиксацией", shortTitle: "Бюгельный протез",
		categoryRu: "Съемное протезирование", defaultDurationDays: DENTAL_LAB_CONSTRUCTIONS.clasp_denture.standardTurnaroundDays,
		baseLabCostKopecks: DENTAL_LAB_CONSTRUCTIONS.clasp_denture.defaultZtlCostKopecks,
		defaultPatientPriceKopecks: DENTAL_LAB_CONSTRUCTIONS.clasp_denture.defaultPatientPriceKopecks,
		descriptionRu: "Литая металлическая дуга с точной биомеханикой распределения жевательного давления", requiresShade: true, allowsStumpShade: false,
		standardWorkingDays: DENTAL_LAB_CONSTRUCTIONS.clasp_denture.standardTurnaroundDays,
		defaultLabCostKopecks: DENTAL_LAB_CONSTRUCTIONS.clasp_denture.defaultZtlCostKopecks, material: "Бюгельный протез",
	},
	{
		id: "zirconia_abutment", titleRu: "Индивидуальный циркониевый абатмент на Ti-Base", shortTitle: "Циркониевый абатмент",
		categoryRu: "Протезирование на имплантатах", defaultDurationDays: 5, baseLabCostKopecks: 650000, defaultPatientPriceKopecks: 1800000,
		descriptionRu: "Индивидуальный анатомический переходник с титановым основанием Ti-Base", requiresShade: true, allowsStumpShade: true,
		standardWorkingDays: 5, defaultLabCostKopecks: 650000, material: "Цирконий на титане",
	},
	{
		id: "pmma_temp", titleRu: "Временная CAD/CAM коронка PMMA", shortTitle: "Временная PMMA",
		categoryRu: "Временные конструкции", defaultDurationDays: 2, baseLabCostKopecks: 120000, defaultPatientPriceKopecks: 450000,
		descriptionRu: "Фрезерованная полимерная коронка для моделирования десневого контура и немедленной нагрузки", requiresShade: true, allowsStumpShade: false,
		standardWorkingDays: 2, defaultLabCostKopecks: 120000, material: "CAD/CAM PMMA",
	},
	{
		id: "aligner_splint", titleRu: "Ортодонтический элайнер / ретенционная каппа", shortTitle: "Каппа / элайнер",
		categoryRu: "Ортодонтия и элайнеры", defaultDurationDays: DENTAL_LAB_CONSTRUCTIONS.aligner_splint.standardTurnaroundDays,
		baseLabCostKopecks: DENTAL_LAB_CONSTRUCTIONS.aligner_splint.defaultZtlCostKopecks,
		defaultPatientPriceKopecks: DENTAL_LAB_CONSTRUCTIONS.aligner_splint.defaultPatientPriceKopecks,
		descriptionRu: "Прецизионная термоформованная полимерная каппа для позиционирования зубов", requiresShade: false, allowsStumpShade: false,
		standardWorkingDays: DENTAL_LAB_CONSTRUCTIONS.aligner_splint.standardTurnaroundDays,
		defaultLabCostKopecks: DENTAL_LAB_CONSTRUCTIONS.aligner_splint.defaultZtlCostKopecks, material: "Биополимер",
	},
]);

export interface VitaShadeSSOT {
	readonly code: string;
	readonly label: string;
	readonly group: "Bleach" | "A" | "B" | "C" | "D";
	readonly approxHex: string;
	readonly hexColor?: string | undefined;
}

export type VitaShadeMeta = VitaShadeSSOT;

/** Каноническая шкала VITA Classical (A1–D4) + Bleach (BL1–BL4) с реалистичными Hex-тонами */
export const VITA_SHADES_SSOT: readonly VitaShadeSSOT[] = Object.freeze([
	{ code: "BL1", label: "BL1 (Ультра-белый)", group: "Bleach", approxHex: "#FFFFFF", hexColor: "#FFFFFF" },
	{ code: "BL2", label: "BL2 (Экстра-светлый)", group: "Bleach", approxHex: "#FBF9F0", hexColor: "#FBF9F0" },
	{ code: "BL3", label: "BL3 (Светлый опалесцент)", group: "Bleach", approxHex: "#F7F3E6", hexColor: "#F7F3E6" },
	{ code: "BL4", label: "BL4 (Мягкий отбеленный)", group: "Bleach", approxHex: "#F3EEDB", hexColor: "#F3EEDB" },
	{ code: "A1", label: "A1 (Светлый красновато-коричневый)", group: "A", approxHex: "#EFE8D6", hexColor: "#EFE8D6" },
	{ code: "A2", label: "A2 (Универсальный естественный)", group: "A", approxHex: "#E7DCBF", hexColor: "#E7DCBF" },
	{ code: "A3", label: "A3 (Насыщенный дентинный)", group: "A", approxHex: "#DFCFA5", hexColor: "#DFCFA5" },
	{ code: "A3.5", label: "A3.5 (Темный дентинный)", group: "A", approxHex: "#D3BF8E", hexColor: "#D3BF8E" },
	{ code: "A4", label: "A4 (Интенсивный коричневый)", group: "A", approxHex: "#C3AB74", hexColor: "#C3AB74" },
	{ code: "B1", label: "B1 (Светлый красновато-желтый)", group: "B", approxHex: "#EFEBD9", hexColor: "#EFEBD9" },
	{ code: "B2", label: "B2 (Естественный желтоватый)", group: "B", approxHex: "#E6DCB9", hexColor: "#E6DCB9" },
	{ code: "B3", label: "B3 (Теплый золотистый)", group: "B", approxHex: "#DFCFA1", hexColor: "#DFCFA1" },
	{ code: "B4", label: "B4 (Интенсивный золотистый)", group: "B", approxHex: "#CEBA84", hexColor: "#CEBA84" },
	{ code: "C1", label: "C1 (Светлый сероватый)", group: "C", approxHex: "#E7E2D5", hexColor: "#E7E2D5" },
	{ code: "C2", label: "C2 (Средний серый)", group: "C", approxHex: "#DBD4C2", hexColor: "#DBD4C2" },
	{ code: "C3", label: "C3 (Пепельно-серый)", group: "C", approxHex: "#CCC3AF", hexColor: "#CCC3AF" },
	{ code: "C4", label: "C4 (Темно-серый)", group: "C", approxHex: "#B9AE98", hexColor: "#B9AE98" },
	{ code: "D2", label: "D2 (Светлый красно-серый)", group: "D", approxHex: "#E4DEC9", hexColor: "#E4DEC9" },
	{ code: "D3", label: "D3 (Теплый серый)", group: "D", approxHex: "#D8CEB3", hexColor: "#D8CEB3" },
	{ code: "D4", label: "D4 (Насыщенный красновато-серый)", group: "D", approxHex: "#C6B999", hexColor: "#C6B999" },
]);

export interface StumpShadeItem {
	readonly code: string;
	readonly label: string;
	readonly hexColor: string;
}

export const STUMP_SHADES: readonly StumpShadeItem[] = Object.freeze([
	{ code: "ND1", label: "ND1 (Отбеленная культя)", hexColor: "#F5EFE1" },
	{ code: "ND2", label: "ND2 (Светлая витальная)", hexColor: "#EADDC6" },
	{ code: "ND3", label: "ND3 (Средняя витальная)", hexColor: "#DFC9A8" },
	{ code: "ND4", label: "ND4 (Темная витальная)", hexColor: "#D0B58E" },
	{ code: "ND5", label: "ND5 (Слегка измененная в цвете)", hexColor: "#BF9F74" },
	{ code: "ND6", label: "ND6 (Дисколорит средней степени)", hexColor: "#AB895E" },
	{ code: "ND7", label: "ND7 (Выраженный дисколорит)", hexColor: "#8D6E48" },
	{ code: "ND8", label: "ND8 (Темно-коричневая культя)", hexColor: "#6A4E32" },
	{ code: "ND9", label: "ND9 (Металлическая культевая вкладка)", hexColor: "#7A7D84" },
]);

export const UPPER_JAW_TEETH: readonly number[] = Object.freeze([17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27]);
export const LOWER_JAW_TEETH: readonly number[] = Object.freeze([47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37]);
export const FDI_QUICK_TEETH: readonly number[] = Object.freeze([...UPPER_JAW_TEETH, ...LOWER_JAW_TEETH]);

/** Демо-список зуботехнических лабораторий (изолирован строго за isDemoShowcaseMode, DEF-19-01) */
export const DEMO_CLINIC_LABORATORIES: readonly string[] = Object.freeze([
	"Арт-Дент Лаб (CAD/CAM центр)",
	"Орто-Мастер ЗТЛ (Прецизионная ортопедия)",
	"Премиум-Смайл Лаб (Эстетическая керамика)",
	"Собственная зуботехническая лаборатория клиники",
]);

/** Возвращает лаборатории клиники с изоляцией демо-данных */
export function getClinicLaboratories(): readonly string[] {
	return isDemoShowcaseMode() ? DEMO_CLINIC_LABORATORIES : [];
}

export const CLINIC_LABORATORIES: readonly string[] = DEMO_CLINIC_LABORATORIES;

export interface DentalLabOrderEntry {
	readonly id: string;
	readonly orderNumber?: string | number | undefined;
	readonly patientId?: string | undefined;
	readonly patientName: string;
	readonly doctorName: string;
	readonly teeth: readonly number[];
	readonly materialId: string;
	readonly shadeCode: string;
	readonly stage: DentalLabStage;
	readonly labCostKopecks: number;
	readonly patientPriceKopecks: number;
	readonly laboratoryName: string;
	readonly createdAt: string;
	readonly dueDate: string;
	readonly notes?: string | undefined;
	readonly isUrgent?: boolean | undefined;
	readonly paidFromCashOperationId?: string | null | undefined;
	readonly isLockedInstalled?: boolean | undefined;
	readonly portalToken?: string | null | undefined;
	readonly workType?: string | null | undefined;
	readonly isWarranty?: boolean | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly attachedImageUrl?: string | null | undefined;
	readonly patientPhone?: string | undefined;
	readonly doctorId?: string | undefined;
}

/** Экспресс-расчет контрольных дат с учетом рабочих дней ЗТЛ в РФ (без сб и вс) */
export function addWorkingDaysRu(startDate: Date | string, workingDays: number): Date {
	const current = typeof startDate === "string" ? new Date(startDate) : new Date(startDate.getTime());
	let added = 0;
	while (added < workingDays) {
		current.setDate(current.getDate() + 1);
		const dayOfWeek = current.getDay();
		if (dayOfWeek !== 0 && dayOfWeek !== 6) added++;
	}
	return current;
}

export const formatKopecks = (kopecks: number | bigint): string => formatKopecksToRub(kopecks);
export const formatKopecksToRubles = formatKopecks;

export function calcNetRevenueKopecks(patientPriceKopecks: number, labCostKopecks: number): number {
	return Math.max(0, patientPriceKopecks - labCostKopecks);
}

export function getStageMeta(stageId: DentalLabStage): DentalLabStageMeta {
	return ALL_LAB_STAGES.find((s) => s.id === stageId) ?? CANONICAL_LAB_STAGES[0]!;
}

export function getMaterialMeta(materialId: string): OrthopedicMaterialMeta {
	return CANONICAL_LAB_MATERIALS.find((m) => m.id === materialId) ?? CANONICAL_LAB_MATERIALS[0]!;
}

export function isOrderOverdue(order: DentalLabOrderEntry): boolean {
	if (order.stage === "in_clinic" || order.stage === "seated") return false;
	const due = new Date(order.dueDate).getTime();
	return due < new Date().setHours(0, 0, 0, 0);
}

export const SEED_LAB_ORDERS: readonly DentalLabOrderEntry[] = Object.freeze([
	{
		id: "lab-ord-1", orderNumber: "ЗТЛ-100", patientId: "01a00000-0000-0000-0000-000000000002", patientName: "Воронов Дмитрий Игоревич", doctorName: "Д-р Смирнова Е. В. (Ортопед)",
		teeth: [11], materialId: "zirconia_multilayer", shadeCode: "A2", stage: "in_production",
		labCostKopecks: 750000, patientPriceKopecks: 2400000, laboratoryName: "Арт-Дент Лаб (CAD/CAM центр)",
		createdAt: "2026-10-25T09:30:00Z", dueDate: "2026-11-07", notes: "Циркониевая коронка Multi-layer (многослойный диоксид циркония)", isUrgent: false,
	},
	{
		id: "lab-ord-2", orderNumber: "ЗТЛ-101", patientId: "01a00000-0000-0000-0000-000000000001", patientName: "Ковалева Елена Павловна", doctorName: "Д-р Смирнова Е. В. (Ортопед)",
		teeth: [16], materialId: "zirconia_multilayer", shadeCode: "A1", stage: "in_clinic",
		labCostKopecks: 750000, patientPriceKopecks: 2400000, laboratoryName: "Арт-Дент Лаб (CAD/CAM центр)",
		createdAt: "2026-10-22T14:15:00Z", dueDate: "2026-11-05", notes: "Готово в клинике", isUrgent: false,
	},
	{
		id: "lab-ord-3", orderNumber: "ЗТЛ-102", patientId: "01a00000-0000-0000-0000-000000000003", patientName: "Кузнецов Михаил Викторович", doctorName: "Д-р Смирнова Е. В. (Ортопед)",
		teeth: [36], materialId: "zirconia_multilayer", shadeCode: "A3", stage: "seated",
		labCostKopecks: 750000, patientPriceKopecks: 2400000, laboratoryName: "Арт-Дент Лаб (CAD/CAM центр)",
		createdAt: "2026-10-20T11:00:00Z", dueDate: "2026-11-03", notes: "Зафиксировано во рту", isUrgent: false,
	},
	{
		id: "lab-ord-4", orderNumber: "ЗТЛ-104", patientId: "01a00000-0000-0000-0000-000000000004", patientName: "Алексеева Наталья Григорьевна", doctorName: "Д-р Смирнова Е. В. (Ортопед)",
		teeth: [45, 46, 47], materialId: "metal_ceramic_cocr", shadeCode: "A3.5", stage: "scan_sent",
		labCostKopecks: 1140000, patientPriceKopecks: 4200000, laboratoryName: "Арт-Дент Лаб (CAD/CAM центр)",
		createdAt: "2026-10-30T16:45:00Z", dueDate: "2026-11-06", notes: "Мостовидный протез с промывным пространством в области 46", isUrgent: false,
	},
]);

// Обратная совместимость алиасов для других частей CRM
export const LAB_CONSTRUCTION_CATALOG = CANONICAL_LAB_MATERIALS;
export const VITA_SHADES = VITA_SHADES_SSOT;
export const LAB_STAGES = CANONICAL_LAB_STAGES;
export type LabConstructionType = OrthopedicMaterialMeta;
export type LabStageId = DentalLabStage | "draft" | "sent" | "in_progress" | "fitting" | "ready" | "installed" | "warranty";
export { DENTAL_LAB_CONSTRUCTIONS } from "@dental/shared";

export interface PartnerLaboratory {
	readonly id: string;
	readonly name: string;
	readonly phone: string;
	readonly courierCutoffTime: string;
	readonly city: string;
	readonly isDefault?: boolean | undefined;
}

/** Демо-список партнерских лабораторий (изолирован строго за isDemoShowcaseMode, DEF-19-01) */
export const DEMO_PARTNER_LABS: readonly PartnerLaboratory[] = Object.freeze([
	{ id: "lab_artdent", name: "Арт-Дент Лаб (CAD/CAM центр)", phone: "+7 (495) 789-01-23", courierCutoffTime: "17:00", city: "Москва", isDefault: true },
	{ id: "lab_ortho", name: "Орто-Мастер ЗТЛ (Высокоточная ортопедия)", phone: "+7 (916) 555-88-99", courierCutoffTime: "18:00", city: "Москва" },
	{ id: "lab_premium", name: "Премиум-Смайл Лаб (Эстетическая керамика)", phone: "+7 (985) 123-45-67", courierCutoffTime: "16:30", city: "Москва" },
	{ id: "lab_inhouse", name: "Собственная лаборатория клиники", phone: "Внутр. 104", courierCutoffTime: "20:00", city: "Клиника" },
]);

/** Возвращает партнерские лаборатории с изоляцией демо-данных */
export function getPartnerLaboratories(): readonly PartnerLaboratory[] {
	return isDemoShowcaseMode() ? DEMO_PARTNER_LABS : [];
}

export const PARTNER_LABS: readonly PartnerLaboratory[] = DEMO_PARTNER_LABS;

export interface LabFastPreset {
	readonly id: string;
	readonly label: string;
	readonly workTypeId: string;
	readonly shadeCode: string;
	readonly stumpShadeCode?: string | undefined;
	readonly daysOffset: number;
	readonly isWarranty?: boolean | undefined;
}

export const LAB_FAST_PRESETS: readonly LabFastPreset[] = Object.freeze([
	{ id: "preset_zr_a2", label: "Цирконий А2", workTypeId: "zirconia_multilayer", shadeCode: "A2", stumpShadeCode: "ND2", daysOffset: 5 },
	{ id: "preset_emax_a1", label: "E-max А1", workTypeId: "emax_press", shadeCode: "A1", stumpShadeCode: "ND1", daysOffset: 5 },
	{ id: "preset_veneer_bl2", label: "Винир BL2", workTypeId: "veneer_emax", shadeCode: "BL2", stumpShadeCode: "ND1", daysOffset: 7 },
	{ id: "preset_pmma_a2", label: "Временная PMMA А2", workTypeId: "temporary_pmma", shadeCode: "A2", daysOffset: 2 },
	{ id: "preset_bridge_a3", label: "Мост цирконий А3", workTypeId: "zirconia_multilayer", shadeCode: "A3", stumpShadeCode: "ND3", daysOffset: 7 },
	{ id: "preset_aligner", label: "Каппа / элайнер", workTypeId: "aligner_ortho", shadeCode: "", daysOffset: 4 },
]);

export interface DoctorNetRevenueCalculation {
	readonly orthoGrossKopecks: number;
	readonly labCostKopecks: number;
	readonly netRevenueKopecks: number;
	readonly doctorPercent: number;
	readonly doctorWageKopecks: number;
}

export function calculateZtlPayrollNetRevenue(
	orthoGrossKopecks: number,
	labCostKopecks: number,
	doctorPercent = 25,
	isWarranty = false,
): DoctorNetRevenueCalculation {
	const effectiveLabCost = isWarranty ? 0 : Math.max(0, labCostKopecks);
	const netRevenue = Math.max(0, orthoGrossKopecks - effectiveLabCost);
	const safeDoctorPct = Math.min(100, Math.max(0, Number.isFinite(doctorPercent) ? doctorPercent : 25));
	const doctorWageKopecks = percentageOfKopecks(
		toExactKopecks(Math.round(netRevenue)),
		Math.round(safeDoctorPct * 100),
	);
	return {
		orthoGrossKopecks,
		labCostKopecks: effectiveLabCost,
		netRevenueKopecks: netRevenue,
		doctorPercent: safeDoctorPct,
		doctorWageKopecks,
	};
}

export function formatDateIso(date: Date = new Date()): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export function formatRuDate(isoOrDate: string | Date): string {
	if (!isoOrDate) return "—";
	if (isoOrDate instanceof Date) {
		const d = String(isoOrDate.getDate()).padStart(2, "0");
		const m = String(isoOrDate.getMonth() + 1).padStart(2, "0");
		const y = isoOrDate.getFullYear();
		return `${d}.${m}.${y}`;
	}
	const p = isoOrDate.slice(0, 10).split("-");
	return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : isoOrDate;
}

export type PartnerDentalLab = PartnerLaboratory;
export interface DentalLabCatalogItem extends OrthopedicMaterialMeta {
	readonly materialNameRu?: string;
}
export const DENTAL_LAB_CATALOG = CANONICAL_LAB_MATERIALS;
export type VitaShadeItem = VitaShadeSSOT;
export function getVitaHex(code: string): string {
	const found = VITA_SHADES_SSOT.find((s) => s.code.toUpperCase() === code.toUpperCase());
	return found?.approxHex || "#E7DCBF";
}
export type DentalLabOrder = DentalLabOrderEntry;
export const SAMPLE_LAB_ORDERS = SEED_LAB_ORDERS;
export type LabStageDef = DentalLabStageMeta;

export const CHAIRSIDE_EXPRESS_PRESETS = [
	{ id: "zirconia_prettau", title: "Коронка диоксид циркония (Katana STML)", shortTitle: "Коронка Katana STML (ZrO2)", mat: "zirconia_multilayer", type: "single_crown", days: 5, shade: "A2" },
	{ id: "emax_press", title: "Коронка E.max прессованная", shortTitle: "Коронка E.max прессованная", mat: "emax_lithium_disilicate", type: "single_crown", days: 5, shade: "A2" },
	{ id: "pfm_cocr", title: "Металлокерамика", shortTitle: "Металлокерамика CoCr", mat: "pfm_cocr", type: "single_crown", days: 5, shade: "A3" },
	{ id: "pmma_cadcam", title: "Временная PMMA CAD/CAM", shortTitle: "Временная PMMA CAD/CAM", mat: "pmma_temporary", type: "single_crown", days: 2, shade: "A2" },
	{ id: "buegel_clasp", title: "Съемный бюгельный протез", shortTitle: "Съемный бюгельный протез", mat: "buegel_cocr_clasp", type: "clasp_denture", days: 7, shade: "A3" },
	{ id: "aligners_set", title: "Элайнеры (набор капп)", shortTitle: "Элайнеры (набор капп)", mat: "biocompatible_3d_resin", type: "aligners", days: 7, shade: "BL2" },
] as const;

export const VITA_EXPRESS_SHADES = ["A1", "A2", "A3", "A3.5", "B1", "Bleach"] as const;

export { getBridgeSpanTeeth } from "./fdiPickerModules/fdiBridgeSpanHelper";

export * from "./orderEngine/labExpressPresetsData";
