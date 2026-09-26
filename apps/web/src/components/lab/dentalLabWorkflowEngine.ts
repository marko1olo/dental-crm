/**
 * dentalLabWorkflowEngine.ts — Движок зуботехнической лаборатории (ЗТЛ) и клинического ортопедического протокола.
 * 
 * ПОЛНЫЙ ЦИКЛ ОРТОПЕДИЧЕСКИХ РАБОТ:
 * 1. Коронки IPS e.max Press / CAD (дисиликат лития)
 * 2. Коронки из диоксида циркония Katana ML / Prettau Multilayer
 * 3. Металлокерамика Co-Cr / Ni-Cr с керамической облицовкой
 * 4. Бюгельные протезы с замковой фиксацией Bredent VKS / кламмерами
 * 5. Съемные акриловые протезы (Acry-Free / Ивокрил / Vertex)
 * 6. Индивидуальные титановые и циркониевые абатменты + коронка
 * 7. Временные фрезерованные / 3D-печатные коронки PMMA
 * 8. Элайнеры и ортодонтические каппы / сплинты
 * 
 * 4 КЛИНИЧЕСКИХ СТАТУСА (WAVE 8 — ЧИСТЫЙ CLINICAL WORKFLOW):
 * 1. draft               — Черновик (оформление ортопедом)
 * 2. sent_to_lab         — Отправлено в ЗТЛ (передано курьеру лаборатории)
 * 3. fitting_scheduled   — Примерка назначена [fittingDate / appointmentId]
 * 4. installed_completed — Сдано пациенту (окончательная фиксация)
 * 
 * ДЕТЕКЦИЯ ДЕДЛАЙНОВ И isDelayedAlert:
 * • Сверка плановой даты готовности из ЗТЛ против назначенной даты примерки/визита (fittingDate / scheduledVisitDate).
 * • Если ЗТЛ задерживает работу или дата готовности позже даты приема — выставляется флаг isDelayedAlert.
 * 
 * ФИНАНСОВЫЙ УЧЕТ В ЦЕЛОЧИСЛЕННЫХ КОПЕЙКАХ:
 * • Себестоимость лаборатории фиксируется строго в целочисленных копейках (labCostKopecks).
 * • Автоматический вычет лабораторных затрат из сдельной базы врача-ортопеда:
 *   DoctorWageBase = PatientPrice - LabCost (zero penny-drift, 100% kopeck exact).
 */

import {
	type ImplantPlatformType,
	IMPLANT_PLATFORMS,
	type AbutmentCategoryType,
	ABUTMENT_TYPE_OPTIONS,
	type FixationType,
	FIXATION_TYPES,
	type LabTechnologicalStageId,
	LAB_TECHNOLOGICAL_STAGES,
	LAB_TECHNOLOGICAL_STAGE_ORDER,
	type LabImplantComponentsManifest,
	formatImplantComponentsSummary,
} from "./orders/labWorkOrderPresets";

export type { ImplantPlatformType, AbutmentCategoryType, FixationType, LabTechnologicalStageId, LabImplantComponentsManifest };
export {
	IMPLANT_PLATFORMS,
	ABUTMENT_TYPE_OPTIONS,
	FIXATION_TYPES,
	LAB_TECHNOLOGICAL_STAGES,
	LAB_TECHNOLOGICAL_STAGE_ORDER,
	formatImplantComponentsSummary,
};

// ─── TRANSPARENT RE-EXPORTS (PHASE 1 DECOMPOSITION CONTRACT) ───────────────────
export * from "./dentalLabWorkflowModel";
export * from "./dentalLabWorkflowExport";

// ─── 1. ТИПЫ И КАТАЛОГ ОРТОПЕДИЧЕСКИХ КОНСТРУКЦИЙ ────────────────────────────

export type OrthopedicWorkTypeId =
	| "crown_zirconia"      // #1 Коронка из диоксида циркония (Katana ML / Prettau)
	| "crown_emax"          // #2 Коронка IPS e.max Press / CAD (дисиликат лития)
	| "metal_ceramic"       // #3 Металлокерамика (Co-Cr фрезерованный/литой)
	| "temporary_pmma"      // #4 Временная пластмассовая коронка PMMA CAD/CAM
	| "clasp_prosthesis"    // #5 Бюгельный протез (замки Bredent / кламмеры)
	| "custom_abutment"     // #6 Индивидуальный абатмент (Ti-Base / ZrO₂) + коронка
	| "removable_acrylic"   // #7 Съемный акриловый протез (Acry-Free / Ивокрил)
	| "aligners";           // #8 Элайнеры / Ортодонтические каппы / Сплинты

export interface OrthopedicWorkTypeDefinition {
	readonly id: OrthopedicWorkTypeId;
	readonly nameRu: string;
	readonly shortNameRu: string;
	readonly categoryRu: string;
	readonly descriptionRu: string;
	readonly icon: string;
	readonly defaultMaterialRu: string;
	readonly standardTurnaroundWorkingDays: number;
	readonly requiresFittingStage: boolean;
	readonly requiresStumpShade: boolean;
	readonly requiresImplantSystem: boolean;
	readonly defaultPriceKopecks: number;
	readonly defaultCostKopecks: number;
}

export const ORTHOPEDIC_WORK_TYPES: Record<OrthopedicWorkTypeId, OrthopedicWorkTypeDefinition> = {
	crown_emax: {
		id: "crown_emax",
		nameRu: "Коронка IPS e.max Press / CAD (дисиликат лития)",
		shortNameRu: "Коронка e.max Press",
		categoryRu: "Несъемное протезирование",
		descriptionRu: "Высокоэстетичная цельнокерамическая реставрация из дисиликата лития с естественной опалесценцией и флюоресценцией.",
		icon: "diamond",
		defaultMaterialRu: "IPS e.max Press (Ivoclar Vivadent)",
		standardTurnaroundWorkingDays: 5,
		requiresFittingStage: true,
		requiresStumpShade: true,
		requiresImplantSystem: false,
		defaultPriceKopecks: 2400000, // 24 000 руб
		defaultCostKopecks: 800000,   // 8 000 руб
	},
	crown_zirconia: {
		id: "crown_zirconia",
		nameRu: "Коронка из диоксида циркония (Katana ML / Prettau)",
		shortNameRu: "Коронка ZrO₂ (Katana ML)",
		categoryRu: "Несъемное протезирование",
		descriptionRu: "Анатомическая монолитная коронка из многослойного диоксида циркония с плавным градиентом прозрачности и прочностью > 1100 МПа.",
		icon: "crown",
		defaultMaterialRu: "Katana Zirconia HTML (Kuraray Noritake)",
		standardTurnaroundWorkingDays: 5,
		requiresFittingStage: false,
		requiresStumpShade: true,
		requiresImplantSystem: false,
		defaultPriceKopecks: 2200000, // 22 000 руб
		defaultCostKopecks: 700000,   // 7 000 руб
	},
	metal_ceramic: {
		id: "metal_ceramic",
		nameRu: "Металлокерамическая коронка (Co-Cr фрезерованный / литой)",
		shortNameRu: "Металлокерамика Co-Cr",
		categoryRu: "Несъемное протезирование",
		descriptionRu: "Классическая металлокерамическая коронка на фрезерованном или литом кобальт-хромовом каркасе с послойной керамической облицовкой.",
		icon: "shield",
		defaultMaterialRu: "Co-Cr сплав Bego Wiron light + Noritake EX-3",
		standardTurnaroundWorkingDays: 6,
		requiresFittingStage: true,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		defaultPriceKopecks: 1400000, // 14 000 руб
		defaultCostKopecks: 450000,   // 4 500 руб
	},
	temporary_pmma: {
		id: "temporary_pmma",
		nameRu: "Временная пластмассовая коронка PMMA (фрезерованная / 3D печать)",
		shortNameRu: "Временная PMMA",
		categoryRu: "Временное протезирование",
		descriptionRu: "Высокоточная провизорная коронка из фрезерованного PMMA CAD/CAM или биосовместимого 3D-фотополимера для защиты препарированного зуба.",
		icon: "clock",
		defaultMaterialRu: "PMMA CAD/CAM фрезерованная / NextDent C&B",
		standardTurnaroundWorkingDays: 2,
		requiresFittingStage: false,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		defaultPriceKopecks: 250000, // 2 500 руб
		defaultCostKopecks: 80000,   // 800 руб
	},
	clasp_prosthesis: {
		id: "clasp_prosthesis",
		nameRu: "Бюгельный протез с замковой фиксацией Bredent / кламмерами",
		shortNameRu: "Бюгельный протез Bredent",
		categoryRu: "Съемное протезирование",
		descriptionRu: "Дуговой цельнолитой протез на Co-Cr каркасе с микрозамками Bredent VKS-SG или опорно-удерживающими кламмерами и гарнитурными зубами.",
		icon: "tooth",
		defaultMaterialRu: "Co-Cr дуга BEGO + замки Bredent VKS + Ivoclar Vivodent",
		standardTurnaroundWorkingDays: 10,
		requiresFittingStage: true,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		defaultPriceKopecks: 4800000, // 48 000 руб
		defaultCostKopecks: 1650000,  // 16 500 руб
	},
	removable_acrylic: {
		id: "removable_acrylic",
		nameRu: "Съемный пластиночный протез (Acry-Free / Ивокрил)",
		shortNameRu: "Съемный акриловый протез",
		categoryRu: "Съемное протезирование",
		descriptionRu: "Полный или частичный съемный протез из безаллергенного термопласта Acry-Free или горячеполимеризуемой акриловой пластмассы.",
		icon: "clamp",
		defaultMaterialRu: "Термопласт Acry-Free / Акрил Vertex Rapid Simplified",
		standardTurnaroundWorkingDays: 8,
		requiresFittingStage: true,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		defaultPriceKopecks: 3200000, // 32 000 руб
		defaultCostKopecks: 1100000,  // 11 000 руб
	},
	custom_abutment: {
		id: "custom_abutment",
		nameRu: "Индивидуальный абатмент (Ti-Base / ZrO₂) + коронка",
		shortNameRu: "Индивидуальный абатмент + коронка",
		categoryRu: "Протезирование на имплантатах",
		descriptionRu: "Фрезерованный индивидуальный титановый или циркониевый абатмент с винтовой фиксацией на дентальный имплантат и циркониевой коронкой.",
		icon: "bolt",
		defaultMaterialRu: "Титан Grade 5 ELI + ZrO₂ Katana ML (Medentika / Straumann)",
		standardTurnaroundWorkingDays: 7,
		requiresFittingStage: true,
		requiresStumpShade: false,
		requiresImplantSystem: true,
		defaultPriceKopecks: 3800000, // 38 000 руб
		defaultCostKopecks: 1300000,  // 13 000 руб
	},
	aligners: {
		id: "aligners",
		nameRu: "Элайнеры / Ортодонтические каппы / Сплинты",
		shortNameRu: "Элайнеры / Сплинт-каппа",
		categoryRu: "Ортодонтия и сплинты",
		descriptionRu: "Серия прозрачных биосовместимых капп толщиной 0.75 мм из многослойного полиэтилентерефталата (PET-G) для перемещения зубов или окклюзионной терапии.",
		icon: "Target",
		defaultMaterialRu: "Биосовместимый полимер Duran / Zendura FLX (3D-печать моделей)",
		standardTurnaroundWorkingDays: 6,
		requiresFittingStage: false,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		defaultPriceKopecks: 1800000, // 18 000 руб
		defaultCostKopecks: 550000,   // 5 500 руб
	},
};

/**
 * 90%+ CIS/RU market popularity catalog in descending order:
 * #1 Katana STML/UTML ZrO2
 * #2 IPS e.max CAD/Press
 * #3 Metal-ceramic CoCr/NiCr
 * #4 PMMA temporary (milled/3D printed)
 * #5 Clasp dentures (Bredent/MK-1)
 * #6 Custom Ti-Base abutments
 * #7 Full acrylic dentures (Acry-Free/Ivocap/Vertex)
 * #8 Aligners / Splints
 */
export const ORDERED_MARKET_ORTHOPEDIC_TYPES: readonly OrthopedicWorkTypeId[] = [
	"crown_zirconia",
	"crown_emax",
	"metal_ceramic",
	"temporary_pmma",
	"clasp_prosthesis",
	"custom_abutment",
	"removable_acrylic",
	"aligners",
] as const;

// ─── 2. 4 КЛИНИЧЕСКИХ СТАТУСА НАКАЗ-ЗАКАЗА ЗТЛ ───────────────────────────────

export type LabWorkflowStatus =
	| "draft"                // 1. Черновик (оформление ортопедом)
	| "sent_to_lab"          // 2. Отправлено в ЗТЛ (передано курьеру)
	| "fitting_scheduled"    // 3. Примерка назначена [fittingDate / appointmentId]
	| "installed_completed"  // 4. Сдано пациенту (окончательная фиксация)
	| "warranty_rework";     // 5. Гарантийная переделка / рекламация ЗТЛ

export type LabProductionStageId = LabWorkflowStatus; // Совместимость с компонентами

export interface LabWorkflowStatusDefinition {
	readonly id: LabWorkflowStatus;
	readonly stepIndex: number;
	readonly nameRu: string;
	readonly shortTitleRu: string;
	readonly descriptionRu: string;
	readonly icon: string;
	readonly badgeClass: string;
	readonly colorHex: string;
}

export const LAB_WORKFLOW_STATUSES: Record<LabWorkflowStatus, LabWorkflowStatusDefinition> = {
	draft: {
		id: "draft",
		stepIndex: 1,
		nameRu: "Черновик",
		shortTitleRu: "Черновик",
		descriptionRu: "Наряд-заказ первично оформлен ортопедом, уточняются параметры слепка и оттенок.",
		icon: "FileText",
		badgeClass: "badge-slate",
		colorHex: "#64748b",
	},
	sent_to_lab: {
		id: "sent_to_lab",
		stepIndex: 2,
		nameRu: "Отправлено в ЗТЛ",
		shortTitleRu: "В лаборатории",
		descriptionRu: "Слепки / цифровые сканы переданы курьеру и поступили в зуботехническую лабораторию.",
		icon: "Truck",
		badgeClass: "badge-blue",
		colorHex: "#3b82f6",
	},
	fitting_scheduled: {
		id: "fitting_scheduled",
		stepIndex: 3,
		nameRu: "Примерка назначена",
		shortTitleRu: "Примерка",
		descriptionRu: "Работа изготовлена ЗТЛ, назначена дата клинической примерки или сдачи в расписании приема.",
		icon: "Calendar",
		badgeClass: "badge-amber",
		colorHex: "#f59e0b",
	},
	installed_completed: {
		id: "installed_completed",
		stepIndex: 4,
		nameRu: "Сдано пациенту",
		shortTitleRu: "Сдано",
		descriptionRu: "Ортопедическая конструкция окончательно зафиксирована в полости рта пациента, наряд закрыт.",
		icon: "CheckCircle2",
		badgeClass: "badge-emerald",
		colorHex: "#10b981",
	},
	warranty_rework: {
		id: "warranty_rework",
		stepIndex: 5,
		nameRu: "Гарантийная переделка / рекламация",
		shortTitleRu: "Переделка / Рекламация",
		descriptionRu: "Работа направлена в ЗТЛ на гарантийную переделку или доработку (скол керамики, завышение прикуса, коррекция краевого прилегания).",
		icon: "RotateCcw",
		badgeClass: "badge-rose",
		colorHex: "#f43f5e",
	},
};

export const LAB_WORKFLOW_STATUS_ORDER: readonly LabWorkflowStatus[] = [
	"draft",
	"sent_to_lab",
	"fitting_scheduled",
	"installed_completed",
];

export const ALL_LAB_WORKFLOW_STATUSES: readonly LabWorkflowStatus[] = [
	...LAB_WORKFLOW_STATUS_ORDER,
	"warranty_rework",
];

// Алиасы для обратной совместимости
export const LAB_PRODUCTION_STAGES = LAB_WORKFLOW_STATUSES;
export const LAB_PRODUCTION_STAGE_ORDER = LAB_WORKFLOW_STATUS_ORDER;

/**
 * Проверка возможности перехода между статусами наряд-заказа ЗТЛ.
 * Включает переход из installed_completed в warranty_rework («Гарантийная переделка / доработка»).
 */
export function canAdvanceLabStage(
	currentStage: LabWorkflowStatus,
	targetStage: LabWorkflowStatus,
): boolean {
	if (currentStage === targetStage) return true;
	if (targetStage === "warranty_rework") {
		// Разрешен переход на гарантийную переделку из сданной работы или примерки
		return currentStage === "installed_completed" || currentStage === "fitting_scheduled";
	}
	if (currentStage === "warranty_rework") {
		// Из гарантийной переделки работа может снова поехать в ЗТЛ, на примерку или быть зафиксирована
		return targetStage === "sent_to_lab" || targetStage === "fitting_scheduled" || targetStage === "installed_completed";
	}
	const currentIndex = LAB_WORKFLOW_STATUSES[currentStage]?.stepIndex ?? 1;
	const targetIndex = LAB_WORKFLOW_STATUSES[targetStage]?.stepIndex ?? 1;
	// Разрешен переход вперед или возврат назад (например, повторная примерка или доработка)
	return targetIndex >= 1 && targetIndex <= 5 && currentIndex >= 1;
}

/**
 * Получение следующего этапа наряд-заказа ЗТЛ.
 */
export function getNextLabProductionStage(
	currentStage: LabWorkflowStatus,
): LabWorkflowStatus | null {
	if (currentStage === "warranty_rework") {
		return "sent_to_lab";
	}
	const currentIndex = LAB_WORKFLOW_STATUS_ORDER.indexOf(currentStage);
	if (currentIndex === -1 || currentIndex >= LAB_WORKFLOW_STATUS_ORDER.length - 1) {
		return null;
	}
	return LAB_WORKFLOW_STATUS_ORDER[currentIndex + 1] ?? null;
}

// ─── 3. ДЕТЕКЦИЯ ДЕДЛАЙНОВ И ОПОВЕЩЕНИЯ (isDelayedAlert / lab_delay_alert) ───

export type LabDeadlineStatus =
	| "ON_TRACK"        // В графике, запас времени достаточен
	| "APPROACHING"     // Срок приближается (осталось <= 2 дней)
	| "URGENT_TODAY"    // Срок готовности сегодня!
	| "OVERDUE"         // Лаборатория просрочила плановую дату готовности
	| "VISIT_CONFLICT"; // КРИТИЧЕСКИЙ КОНФЛИКТ: дата готовности ЗТЛ позже даты визита/примерки!

export interface LabDelayAlert {
	readonly hasAlert: boolean;
	readonly isDelayedAlert: boolean;
	readonly lab_delay_alert: boolean; // Алиас для полной совместимости
	readonly status: LabDeadlineStatus;
	readonly severity: "CRITICAL" | "WARNING" | "INFO" | "OK";
	readonly daysDifference: number; // Дни до готовности ЗТЛ (отрицательные = просрочено)
	readonly expectedLabDateIso: string;
	readonly scheduledVisitDateIso?: string | undefined;
	readonly fittingDateIso?: string | undefined;
	readonly appointmentId?: string | undefined;
	readonly alertMessageRu: string;
	readonly detailedReasonRu: string;
	readonly recommendedActionRu: string;
}

export interface CheckLabDeadlineParams {
	readonly expectedLabDate: string | Date;
	readonly scheduledVisitDate?: string | Date | null | undefined;
	readonly fittingDate?: string | Date | null | undefined;
	readonly appointmentId?: string | null | undefined;
	readonly currentDate?: string | Date | undefined;
	readonly isInstalledOrCompleted?: boolean | undefined;
	readonly orderNumber?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly labName?: string | undefined;
}

export function parseDateToMidnight(input: string | Date): Date {
	const d = typeof input === "string" ? new Date(input) : new Date(input.getTime());
	d.setHours(0, 0, 0, 0);
	return d;
}

export function formatDateToIsoDay(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function formatRussianDate(isoString: string): string {
	if (!isoString) return "—";
	const parts = isoString.slice(0, 10).split("-");
	if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
		return `${parts[2]}.${parts[1]}.${parts[0]}`;
	}
	return isoString;
}

/**
 * Добавление рабочих дней с пропуском суббот и воскресений.
 */
export function addWorkingDaysRu(startDate: Date | string, daysToAdd: number): Date {
	const result = parseDateToMidnight(startDate);
	let added = 0;
	while (added < daysToAdd) {
		result.setDate(result.getDate() + 1);
		const dayOfWeek = result.getDay();
		if (dayOfWeek !== 0 && dayOfWeek !== 6) {
			added++;
		}
	}
	return result;
}

/**
 * Проверка дедлайнов ЗТЛ и генерация isDelayedAlert для администратора клиники.
 */
export function checkLabDeadlineAndAlert(params: CheckLabDeadlineParams): LabDelayAlert {
	const expectedDate = parseDateToMidnight(params.expectedLabDate);
	const expectedIso = formatDateToIsoDay(expectedDate);
	const expectedRu = formatRussianDate(expectedIso);

	const today = params.currentDate ? parseDateToMidnight(params.currentDate) : parseDateToMidnight(new Date());

	// Дата визита или дата примерки
	const visitDateRaw = params.fittingDate || params.scheduledVisitDate;
	const visitDate = visitDateRaw ? parseDateToMidnight(visitDateRaw) : null;
	const visitIso = visitDate ? formatDateToIsoDay(visitDate) : undefined;
	const visitRu = visitIso ? formatRussianDate(visitIso) : "не назначен";

	const fittingIso = params.fittingDate ? formatDateToIsoDay(parseDateToMidnight(params.fittingDate)) : visitIso;
	const appointmentId = params.appointmentId || undefined;

	// Если работа уже сдана пациенту — дедлайн закрыт
	if (params.isInstalledOrCompleted) {
		return {
			hasAlert: false,
			isDelayedAlert: false,
			lab_delay_alert: false,
			status: "ON_TRACK",
			severity: "OK",
			daysDifference: 0,
			expectedLabDateIso: expectedIso,
			scheduledVisitDateIso: visitIso,
			fittingDateIso: fittingIso,
			appointmentId,
			alertMessageRu: "Работа успешно зафиксирована в полости рта.",
			detailedReasonRu: "Заказ завершен в полном объеме.",
			recommendedActionRu: "Действий не требуется.",
		};
	}

	const diffToLabMs = expectedDate.getTime() - today.getTime();
	const daysToLab = Math.round(diffToLabMs / (1000 * 60 * 60 * 24));

	// 1. Проверка конфликта визита / примерки: если дата приема пациента РАНЬШЕ даты готовности ЗТЛ
	if (visitDate && expectedDate.getTime() > visitDate.getTime()) {
		const conflictDays = Math.round((expectedDate.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
		return {
			hasAlert: true,
			isDelayedAlert: true,
			lab_delay_alert: true,
			status: "VISIT_CONFLICT",
			severity: "CRITICAL",
			daysDifference: daysToLab,
			expectedLabDateIso: expectedIso,
			scheduledVisitDateIso: visitIso,
			fittingDateIso: fittingIso,
			appointmentId,
			alertMessageRu: `КРИТИЧЕСКИЙ КОНФЛИКТ: Готовность ЗТЛ (${expectedRu}) позже приема пациента (${visitRu}) на ${conflictDays} дн.!`,
			detailedReasonRu: `Пациент записан на прием ${visitRu}, однако лаборатория сдает конструкцию только ${expectedRu}. Пациент придет на примерку без работы!`,
			recommendedActionRu: `Срочно свяжитесь с администратором для переноса визита пациента на дату не ранее ${expectedRu} или согласуйте ускоренное изготовление.`,
		};
	}

	// 2. Проверка просрочки со стороны лаборатории (сегодня > дата готовности)
	if (daysToLab < 0) {
		const overdueDays = Math.abs(daysToLab);
		return {
			hasAlert: true,
			isDelayedAlert: true,
			lab_delay_alert: true,
			status: "OVERDUE",
			severity: "CRITICAL",
			daysDifference: daysToLab,
			expectedLabDateIso: expectedIso,
			scheduledVisitDateIso: visitIso,
			fittingDateIso: fittingIso,
			appointmentId,
			alertMessageRu: `ПРОСРОЧЕНО ЗТЛ: Заказ задерживается на ${overdueDays} дн. (план был: ${expectedRu})!`,
			detailedReasonRu: `Лаборатория не доставила готовую ортопедическую работу в клинику к нормативному сроку ${expectedRu}.`,
			recommendedActionRu: `Свяжитесь с курьерской службой или лабораторией для выяснения точного времени доставки.`,
		};
	}

	// 3. Сдача сегодня
	if (daysToLab === 0) {
		return {
			hasAlert: true,
			isDelayedAlert: false,
			lab_delay_alert: false,
			status: "URGENT_TODAY",
			severity: "WARNING",
			daysDifference: 0,
			expectedLabDateIso: expectedIso,
			scheduledVisitDateIso: visitIso,
			fittingDateIso: fittingIso,
			appointmentId,
			alertMessageRu: `Сдача работы из ЗТЛ сегодня (${expectedRu})! Ожидается доставка курьером.`,
			detailedReasonRu: `Заказ должен поступить в клинику сегодня. Проверьте приемку и дезинфекцию работы.`,
			recommendedActionRu: `Проконтролируйте приемку коробки с нарядом у администратора при визите курьера.`,
		};
	}

	// 4. Срок приближается (1-2 дня)
	if (daysToLab <= 2) {
		return {
			hasAlert: false,
			isDelayedAlert: false,
			lab_delay_alert: false,
			status: "APPROACHING",
			severity: "INFO",
			daysDifference: daysToLab,
			expectedLabDateIso: expectedIso,
			scheduledVisitDateIso: visitIso,
			fittingDateIso: fittingIso,
			appointmentId,
			alertMessageRu: `Срок сдачи ЗТЛ через ${daysToLab} дн. (${expectedRu}).`,
			detailedReasonRu: `Работа находится на финальных стадиях изготовления в лаборатории.`,
			recommendedActionRu: `Убедитесь, что визит пациента назначен на дату после ${expectedRu}.`,
		};
	}

	// 5. В графике
	return {
		hasAlert: false,
		isDelayedAlert: false,
		lab_delay_alert: false,
		status: "ON_TRACK",
		severity: "OK",
		daysDifference: daysToLab,
		expectedLabDateIso: expectedIso,
		scheduledVisitDateIso: visitIso,
		fittingDateIso: fittingIso,
		appointmentId,
		alertMessageRu: `В графике. Срок готовности через ${daysToLab} дн. (${expectedRu}).`,
		detailedReasonRu: `Производственный цикл ЗТЛ протекает без задержек.`,
		recommendedActionRu: `Действий не требуется.`,
	};
}

// ─── 4. ФИНАНСОВЫЙ УЧЕТ В ЦЕЛОЧИСЛЕННЫХ КОПЕЙКАХ ──────────────────────────────

export interface DentalLabWorkflowFinancials {
	readonly unitsCount: number;
	readonly pricePerUnitKopecks: number;
	readonly costPerUnitKopecks: number;
	readonly patientPriceTotalKopecks: number;
	readonly labCostKopecks: number;         // Себестоимость ЗТЛ в копейках
	readonly labCostTotalKopecks: number;    // Алиас
	readonly clinicGrossMarginKopecks: number;
	readonly grossMarginPercent: number;
	readonly doctorPercent: number;
	readonly doctorWageBaseKopecks: number; // Сдельная база врача (Стоимость пациента - Себестоимость ЗТЛ)
	readonly doctorWageKopecks: number;     // Начисленная ЗП врача-ортопеда в копейках
	readonly clinicNetProfitKopecks: number; // Чистая прибыль клиники в копейках
	readonly patientPriceTotalRub: number;
	readonly labCostTotalRub: number;
	readonly clinicGrossMarginRub: number;
	readonly doctorWageRub: number;
	readonly clinicNetProfitRub: number;
	readonly isBalanced: boolean;
}

export interface CalculateLabFinancialsParams {
	readonly unitsCount: number;
	readonly pricePerUnitKopecks?: number | undefined;
	readonly costPerUnitKopecks?: number | undefined;
	readonly pricePerUnitRub?: number | undefined;
	readonly costPerUnitRub?: number | undefined;
	readonly doctorPercent?: number | undefined; // По умолчанию 20%
}

/**
 * Целочисленный расчет себестоимости ЗТЛ и сдельной оплаты врача-ортопеда.
 * Инвариант: doctorWageKopecks + clinicNetProfitKopecks === doctorWageBaseKopecks (Zero Penny-Drift).
 */
export function calculateLabWorkflowFinancials(
	params: CalculateLabFinancialsParams,
): DentalLabWorkflowFinancials {
	const count = Math.max(1, Math.round(params.unitsCount || 1));

	// Получаем цену и себестоимость строго в целочисленных копейках
	const pricePerUnit = Math.max(
		0,
		Math.round(
			params.pricePerUnitKopecks ??
				(params.pricePerUnitRub ? params.pricePerUnitRub * 100 : 0),
		),
	);

	const costPerUnit = Math.max(
		0,
		Math.round(
			params.costPerUnitKopecks ??
				(params.costPerUnitRub ? params.costPerUnitRub * 100 : 0),
		),
	);

	const doctorPct = Math.max(0, Math.min(100, params.doctorPercent ?? 20));

	const patientPriceTotalKopecks = pricePerUnit * count;
	const labCostKopecks = costPerUnit * count;
	const clinicGrossMarginKopecks = Math.max(0, patientPriceTotalKopecks - labCostKopecks);

	const grossMarginPercent =
		patientPriceTotalKopecks > 0
			? Number(((clinicGrossMarginKopecks / patientPriceTotalKopecks) * 100).toFixed(1))
			: 0;

	// Сдельная база врача-ортопеда: стоимость за вычетом затрат на лабораторию
	const doctorWageBaseKopecks = clinicGrossMarginKopecks;
	const doctorWageKopecks = Math.round((doctorWageBaseKopecks * doctorPct) / 100);
	const clinicNetProfitKopecks = doctorWageBaseKopecks - doctorWageKopecks;

	return {
		unitsCount: count,
		pricePerUnitKopecks: pricePerUnit,
		costPerUnitKopecks: costPerUnit,
		patientPriceTotalKopecks,
		labCostKopecks,
		labCostTotalKopecks: labCostKopecks,
		clinicGrossMarginKopecks,
		grossMarginPercent,
		doctorPercent: doctorPct,
		doctorWageBaseKopecks,
		doctorWageKopecks,
		clinicNetProfitKopecks,
		patientPriceTotalRub: patientPriceTotalKopecks / 100,
		labCostTotalRub: labCostKopecks / 100,
		clinicGrossMarginRub: clinicGrossMarginKopecks / 100,
		doctorWageRub: doctorWageKopecks / 100,
		clinicNetProfitRub: clinicNetProfitKopecks / 100,
		isBalanced: doctorWageKopecks + clinicNetProfitKopecks === doctorWageBaseKopecks,
	};
}
