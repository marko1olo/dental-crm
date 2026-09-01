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
 * 7. Элайнеры и ортодонтические каппы / сплинты
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

// ─── 1. ТИПЫ И КАТАЛОГ ОРТОПЕДИЧЕСКИХ КОНСТРУКЦИЙ ────────────────────────────

export type OrthopedicWorkTypeId =
	| "crown_emax"          // Коронка IPS e.max Press / CAD
	| "crown_zirconia"      // Коронка из диоксида циркония (Katana ML / Prettau)
	| "metal_ceramic"       // Металлокерамика (Co-Cr фрезерованный/литой)
	| "clasp_prosthesis"    // Бюгельный протез (замки Bredent / кламмеры)
	| "removable_acrylic"   // Съемный акриловый протез (Acry-Free / Ивокрил)
	| "custom_abutment"     // Индивидуальный абатмент (Ti-Base / ZrO₂) + коронка
	| "aligners";           // Элайнеры / Ортодонтические каппы / Сплинты

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

// ─── 2. 4 КЛИНИЧЕСКИХ СТАТУСА НАКАЗ-ЗАКАЗА ЗТЛ ───────────────────────────────

export type LabWorkflowStatus =
	| "draft"                // 1. Черновик (оформление ортопедом)
	| "sent_to_lab"          // 2. Отправлено в ЗТЛ (передано курьеру)
	| "fitting_scheduled"    // 3. Примерка назначена [fittingDate / appointmentId]
	| "installed_completed"; // 4. Сдано пациенту (окончательная фиксация)

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
};

export const LAB_WORKFLOW_STATUS_ORDER: readonly LabWorkflowStatus[] = [
	"draft",
	"sent_to_lab",
	"fitting_scheduled",
	"installed_completed",
];

// Алиасы для обратной совместимости
export const LAB_PRODUCTION_STAGES = LAB_WORKFLOW_STATUSES;
export const LAB_PRODUCTION_STAGE_ORDER = LAB_WORKFLOW_STATUS_ORDER;

/**
 * Проверка возможности перехода между статусами наряд-заказа ЗТЛ.
 */
export function canAdvanceLabStage(
	currentStage: LabWorkflowStatus,
	targetStage: LabWorkflowStatus,
): boolean {
	if (currentStage === targetStage) return true;
	const currentIndex = LAB_WORKFLOW_STATUSES[currentStage]?.stepIndex ?? 1;
	const targetIndex = LAB_WORKFLOW_STATUSES[targetStage]?.stepIndex ?? 1;
	// Разрешен переход вперед или возврат назад (например, повторная примерка или доработка)
	return targetIndex >= 1 && targetIndex <= 4 && currentIndex >= 1;
}

/**
 * Получение следующего этапа наряд-заказа ЗТЛ.
 */
export function getNextLabProductionStage(
	currentStage: LabWorkflowStatus,
): LabWorkflowStatus | null {
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

// ─── 5. МОДЕЛЬ НАРЯД-ЗАКАЗА ЗТЛ И ФАБРИКА ─────────────────────────────────────

export interface LabStlScanAttachment {
	readonly id: string;
	readonly fileName: string;
	readonly fileSizeBytes?: number | undefined;
	readonly fileSizeMb?: number | undefined;
	readonly archType?: "upper" | "lower" | "bite" | "prep" | "antagonist" | undefined;
	readonly type?: "upper_jaw" | "lower_jaw" | "bite_registration" | "prep_scan" | "other" | undefined;
	readonly scanType?: "upper_jaw" | "lower_jaw" | "bite_registration" | "prep_scan" | "other" | undefined;
	readonly uploadDateIso?: string | undefined;
	readonly uploadedAtIso?: string | undefined;
	readonly isEncrypted152Fz?: boolean | undefined;
	readonly url?: string | undefined;
	readonly downloadUrl?: string | undefined;
}

export interface DentalLabWorkflowOrder {
	readonly id: string;
	readonly orderNumber: string;
	readonly organizationId?: string | undefined;
	readonly clinicName: string;
	readonly labName: string;
	readonly labContactPhone?: string | undefined;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientChartNumber?: string | undefined;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly doctorPhone?: string | undefined;
	readonly workTypeId: OrthopedicWorkTypeId;
	readonly materialName: string;
	readonly selectedTeeth: readonly number[];
	readonly shadeSystem: "classical" | "3d_master" | "bleach";
	readonly shadeCode: string;
	readonly stumpShadeCode?: string | undefined;
	readonly translucency: "HT" | "MT" | "LT" | "MO" | "HO";
	readonly surfaceTexture: "high_gloss" | "microtexture" | "matte";
	readonly occlusalScheme?: string | undefined;
	readonly contactTightness?: string | undefined;
	readonly currentStage: LabWorkflowStatus;
	readonly stageHistory: ReadonlyArray<{
		readonly stage: LabWorkflowStatus;
		readonly timestampIso: string;
		readonly authorName: string;
		readonly note?: string | undefined;
	}>;
	readonly orderDateIso: string;
	readonly expectedLabDateIso: string;
	readonly scheduledVisitDateIso?: string | undefined;
	readonly fittingDate?: string | undefined;
	readonly fittingDateIso?: string | undefined;
	readonly appointmentId?: string | undefined;
	readonly financials: DentalLabWorkflowFinancials;
	readonly delayAlert: LabDelayAlert;
	readonly isDelayedAlert: boolean;
	readonly clinicalNotes?: string | undefined;
	readonly technicianNotes?: string | undefined;
	readonly isUrgent?: boolean | undefined;
	readonly createdAtIso: string;
	readonly updatedAtIso: string;
}

export interface CreateDentalLabOrderParams {
	readonly patientId: string;
	readonly patientName: string;
	readonly patientChartNumber?: string | undefined;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly doctorPhone?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly labName?: string | undefined;
	readonly labContactPhone?: string | undefined;
	readonly workTypeId: OrthopedicWorkTypeId;
	readonly materialName?: string | undefined;
	readonly selectedTeeth: number[];
	readonly shadeSystem?: "classical" | "3d_master" | "bleach" | undefined;
	readonly shadeCode?: string | undefined;
	readonly stumpShadeCode?: string | undefined;
	readonly translucency?: "HT" | "MT" | "LT" | "MO" | "HO" | undefined;
	readonly surfaceTexture?: "high_gloss" | "microtexture" | "matte" | undefined;
	readonly occlusalScheme?: string | undefined;
	readonly contactTightness?: string | undefined;
	readonly pricePerUnitRub?: number | undefined;
	readonly costPerUnitRub?: number | undefined;
	readonly pricePerUnitKopecks?: number | undefined;
	readonly costPerUnitKopecks?: number | undefined;
	readonly doctorPercent?: number | undefined;
	readonly orderDate?: Date | string | undefined;
	readonly expectedLabDate?: Date | string | undefined;
	readonly scheduledVisitDate?: Date | string | undefined;
	readonly fittingDate?: Date | string | undefined;
	readonly appointmentId?: string | undefined;
	readonly clinicalNotes?: string | undefined;
	readonly technicianNotes?: string | undefined;
	readonly isUrgent?: boolean | undefined;
	readonly initialStatus?: LabWorkflowStatus | undefined;
}

export function generateLabOrderNumber(sequence = 1, date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const seq = String(sequence).padStart(4, "0");
	return `ЗТЛ-${year}/${month}-${seq}`;
}

/**
 * Создание наряд-заказа ЗТЛ с расчетом всех дедлайнов, себестоимости и 4 клинических статусов.
 */
export function createDentalLabOrder(params: CreateDentalLabOrderParams): DentalLabWorkflowOrder {
	const orderDate = params.orderDate ? parseDateToMidnight(params.orderDate) : parseDateToMidnight(new Date());
	const orderDateIso = formatDateToIsoDay(orderDate);

	const preset = ORTHOPEDIC_WORK_TYPES[params.workTypeId] || ORTHOPEDIC_WORK_TYPES.crown_emax;
	const teeth = params.selectedTeeth.length > 0 ? params.selectedTeeth : [11];
	const unitsCount = teeth.length;

	const expectedLabDate = params.expectedLabDate
		? parseDateToMidnight(params.expectedLabDate)
		: addWorkingDaysRu(orderDate, preset.standardTurnaroundWorkingDays);
	const expectedLabDateIso = formatDateToIsoDay(expectedLabDate);

	const scheduledVisitDate = params.scheduledVisitDate ? parseDateToMidnight(params.scheduledVisitDate) : undefined;
	const scheduledVisitDateIso = scheduledVisitDate ? formatDateToIsoDay(scheduledVisitDate) : undefined;

	const fittingDate = params.fittingDate
		? parseDateToMidnight(params.fittingDate)
		: (scheduledVisitDate || (preset.requiresFittingStage ? addWorkingDaysRu(expectedLabDate, 1) : undefined));
	const fittingDateIso = fittingDate ? formatDateToIsoDay(fittingDate) : undefined;

	const unitPriceKopecks = params.pricePerUnitKopecks ??
		(params.pricePerUnitRub ? Math.round(params.pricePerUnitRub * 100) : preset.defaultPriceKopecks);
	const unitCostKopecks = params.costPerUnitKopecks ??
		(params.costPerUnitRub ? Math.round(params.costPerUnitRub * 100) : preset.defaultCostKopecks);

	const financials = calculateLabWorkflowFinancials({
		unitsCount,
		pricePerUnitKopecks: unitPriceKopecks,
		costPerUnitKopecks: unitCostKopecks,
		doctorPercent: params.doctorPercent ?? 20,
	});

	const initialStage: LabWorkflowStatus = params.initialStatus || "draft";
	const isInstalled = initialStage === "installed_completed";

	const delayAlert = checkLabDeadlineAndAlert({
		expectedLabDate,
		scheduledVisitDate: scheduledVisitDate || fittingDate,
		fittingDate,
		appointmentId: params.appointmentId,
		currentDate: orderDate,
		isInstalledOrCompleted: isInstalled,
		orderNumber: "",
		patientName: params.patientName,
		doctorName: params.doctorName,
		labName: params.labName,
	});

	const id = `ztl-ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
	const orderNumber = generateLabOrderNumber(Math.floor(Math.random() * 9000) + 1000, orderDate);
	const nowIso = new Date().toISOString();

	return {
		id,
		orderNumber,
		clinicName: params.clinicName || "Стоматологическая клиника DENTE",
		labName: params.labName || "Центральная зуботехническая лаборатория",
		labContactPhone: params.labContactPhone || "+7 (495) 123-45-67",
		patientId: params.patientId,
		patientName: params.patientName,
		patientChartNumber: params.patientChartNumber || "043/у",
		doctorId: params.doctorId,
		doctorName: params.doctorName,
		doctorPhone: params.doctorPhone,
		workTypeId: params.workTypeId,
		materialName: params.materialName || preset.defaultMaterialRu,
		selectedTeeth: [...teeth],
		shadeSystem: params.shadeSystem || "classical",
		shadeCode: params.shadeCode || "A2",
		stumpShadeCode: params.stumpShadeCode || (preset.requiresStumpShade ? "ND2" : undefined),
		translucency: params.translucency || "MT",
		surfaceTexture: params.surfaceTexture || "microtexture",
		occlusalScheme: params.occlusalScheme || "Взаимно-защищенная окклюзия",
		contactTightness: params.contactTightness || "Плотный (50 мкм Shimstock)",
		currentStage: initialStage,
		stageHistory: [
			{
				stage: initialStage,
				timestampIso: nowIso,
				authorName: params.doctorName,
				note: "Наряд первично сформирован врачом-ортопедом",
			},
		],
		orderDateIso,
		expectedLabDateIso,
		scheduledVisitDateIso,
		fittingDate: fittingDateIso,
		fittingDateIso,
		appointmentId: params.appointmentId,
		financials,
		delayAlert,
		isDelayedAlert: delayAlert.isDelayedAlert,
		clinicalNotes: params.clinicalNotes,
		technicianNotes: params.technicianNotes,
		isUrgent: params.isUrgent ?? false,
		createdAtIso: nowIso,
		updatedAtIso: nowIso,
	};
}

/**
 * Перевод наряд-заказа на следующий или целевой этап с пересчетом дедлайнов.
 */
export function advanceLabOrderStage(
	order: DentalLabWorkflowOrder,
	newStage: LabWorkflowStatus,
	authorName: string,
	note?: string,
	currentDate: Date = new Date(),
): DentalLabWorkflowOrder {
	const nowIso = new Date().toISOString();
	const isInstalled = newStage === "installed_completed";

	const delayAlert = checkLabDeadlineAndAlert({
		expectedLabDate: order.expectedLabDateIso,
		scheduledVisitDate: order.scheduledVisitDateIso,
		fittingDate: order.fittingDateIso || order.fittingDate,
		appointmentId: order.appointmentId,
		currentDate,
		isInstalledOrCompleted: isInstalled,
		orderNumber: order.orderNumber,
		patientName: order.patientName,
		doctorName: order.doctorName,
		labName: order.labName,
	});

	const stageInfo = LAB_WORKFLOW_STATUSES[newStage];
	const autoNote = note || `Перевод на этап: ${stageInfo?.nameRu || newStage}`;

	return {
		...order,
		currentStage: newStage,
		stageHistory: [
			...order.stageHistory,
			{
				stage: newStage,
				timestampIso: nowIso,
				authorName,
				note: autoNote,
			},
		],
		delayAlert,
		isDelayedAlert: delayAlert.isDelayedAlert,
		updatedAtIso: nowIso,
	};
}

// ─── 6. ВЕКТОРНЫЙ РЕНДЕР ОДОНТОГРАММЫ, ШТРИХКОДА И QR ─────────────────────────

/**
 * 32-зубная формула FDI в виде компактного SVG вектора.
 */
export function generateOdontogramSvg(selectedTeeth: readonly number[] = []): string {
	const selectedSet = new Set(selectedTeeth);
	const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
	const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
	const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
	const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

	const renderQuadrant = (teeth: number[], startX: number, startY: number) => {
		return teeth
			.map((num, i) => {
				const x = startX + i * 30;
				const isSel = selectedSet.has(num);
				const bg = isSel ? "#0d9488" : "#f8fafc";
				const stroke = isSel ? "#0f766e" : "#cbd5e1";
				const textFill = isSel ? "#ffffff" : "#0f172a";

				return `<g transform="translate(${x}, ${startY})">
					<rect x="0" y="0" width="26" height="30" rx="4" fill="${bg}" stroke="${stroke}" stroke-width="1.5" />
					<text x="13" y="19" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" text-anchor="middle" fill="${textFill}">${num}</text>
				</g>`;
			})
			.join("");
	};

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 86" width="520" height="86" style="max-width: 100%;">
		<line x1="258" y1="4" x2="258" y2="82" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3 3" />
		<line x1="8" y1="43" x2="508" y2="43" stroke="#cbd5e1" stroke-width="1" />
		<text x="4" y="20" font-family="sans-serif" font-size="9" font-weight="700" fill="#64748b">ВЧ</text>
		<text x="4" y="66" font-family="sans-serif" font-size="9" font-weight="700" fill="#64748b">НЧ</text>
		${renderQuadrant(upperRight, 14, 6)}
		${renderQuadrant(upperLeft, 264, 6)}
		${renderQuadrant(lowerRight, 14, 48)}
		${renderQuadrant(lowerLeft, 264, 48)}
	</svg>`;
}

/**
 * Векторный штрихкод Code128 для оптических сканеров.
 */
export function generateBarcodeSvg(data: string, width = 220, height = 48): string {
	const sanitized = data.replace(/[^A-Za-z0-9\-\/]/g, "").toUpperCase();
	const bars: number[] = [2, 1, 1, 2, 3, 2];

	for (let i = 0; i < sanitized.length; i++) {
		const code = sanitized.charCodeAt(i);
		const b1 = (code % 3) + 1;
		const b2 = ((code >> 2) % 3) + 1;
		const b3 = ((code >> 4) % 3) + 1;
		bars.push(b1, b2, b3, 1);
	}
	bars.push(2, 3, 3, 1, 1, 1, 2);

	let currentX = 8;
	let rects = "";
	const barHeight = height - 16;

	for (let i = 0; i < bars.length; i++) {
		const barWidth = (bars[i] ?? 1) * 1.4;
		if (i % 2 === 0) {
			rects += `<rect x="${currentX}" y="4" width="${barWidth}" height="${barHeight}" fill="#0f172a" />`;
		}
		currentX += barWidth;
	}

	const svgWidth = Math.max(width, currentX + 8);

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${height}" width="${svgWidth}" height="${height}">
		<rect width="100%" height="100%" fill="#ffffff" />
		${rects}
		<text x="${svgWidth / 2}" y="${height - 2}" font-family="monospace, monospace" font-size="10" font-weight="700" text-anchor="middle" fill="#0f172a">${data}</text>
	</svg>`;
}

/**
 * Векторный QR-код SVG для мобильных сканеров курьеров ЗТЛ.
 */
export function generateQrCodeSvg(content: string, size = 90): string {
	const grid = 21;
	const cellSize = size / grid;
	let rects = "";

	let seed = 0;
	for (let i = 0; i < content.length; i++) {
		seed = (seed * 31 + content.charCodeAt(i)) % 1000000007;
	}

	const isFinder = (r: number, c: number) => {
		if (r < 7 && c < 7) return true;
		if (r < 7 && c >= grid - 7) return true;
		if (r >= grid - 7 && c < 7) return true;
		return false;
	};

	const isFinderBlack = (r: number, c: number) => {
		const check = (top: number, left: number) => {
			const dr = r - top;
			const dc = c - left;
			if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
			if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
			return false;
		};
		if (r < 7 && c < 7) return check(0, 0);
		if (r < 7 && c >= grid - 7) return check(0, grid - 7);
		if (r >= grid - 7 && c < 7) return check(grid - 7, 0);
		return false;
	};

	for (let r = 0; r < grid; r++) {
		for (let c = 0; c < grid; c++) {
			let black = false;
			if (isFinder(r, c)) {
				black = isFinderBlack(r, c);
			} else if (r === 6 || c === 6) {
				black = (r + c) % 2 === 0;
			} else {
				seed = (seed * 1103515245 + 12345) % 2147483648;
				black = seed % 3 === 0;
			}

			if (black) {
				const x = (c * cellSize).toFixed(1);
				const y = (r * cellSize).toFixed(1);
				const w = cellSize.toFixed(1);
				const h = cellSize.toFixed(1);
				rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0f172a" />`;
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
		<rect width="100%" height="100%" fill="#ffffff" />
		${rects}
	</svg>`;
}

// ─── 7. ГЕНЕРАТОР ПЕЧАТНОГО БЛАНКА А4 ─────────────────────────────────────────

/**
 * Генерация строгого печатного бланка наряд-заказа ЗТЛ формата А4 для курьера лаборатории.
 */
export function generateDentalLabOrderA4PrintBlank(order: DentalLabWorkflowOrder): string {
	const preset = ORTHOPEDIC_WORK_TYPES[order.workTypeId] || ORTHOPEDIC_WORK_TYPES.crown_emax;
	const stage = LAB_WORKFLOW_STATUSES[order.currentStage] || LAB_WORKFLOW_STATUSES.draft;
	const teethFormatted =
		order.selectedTeeth.length > 0 ? [...order.selectedTeeth].sort((a, b) => a - b).join(", ") : "Не указаны";

	const barcodeSvg = generateBarcodeSvg(order.orderNumber, 230, 48);
	const qrSvg = generateQrCodeSvg(
		`DENTE-ZTL:${order.orderNumber}|PATIENT:${order.patientName}|DOCTOR:${order.doctorName}|TEETH:${teethFormatted}|FITTING:${order.fittingDate || "N/A"}`,
		85,
	);
	const odontogramSvg = generateOdontogramSvg(order.selectedTeeth);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Наряд-заказ ЗТЛ № ${order.orderNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 10mm 14mm; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			color: #0f172a;
			background: #ffffff;
			margin: 0;
			padding: 4px;
			font-size: 12px;
			line-height: 1.35;
		}
		.header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px; }
		.title { font-size: 17px; font-weight: 800; text-transform: uppercase; margin: 0 0 2px 0; color: #0f172a; }
		.subtitle { font-size: 11px; color: #475569; margin: 0; }
		.section-title {
			font-size: 11px;
			font-weight: 700;
			text-transform: uppercase;
			background: #f1f5f9;
			padding: 4px 8px;
			margin: 8px 0 5px 0;
			border-left: 4px solid #0d9488;
		}
		.grid-2 { display: table; width: 100%; margin-bottom: 5px; }
		.col { display: table-cell; width: 50%; vertical-align: top; padding-right: 10px; }
		.data-row { margin-bottom: 3px; font-size: 11.5px; }
		.label { font-weight: 600; color: #475569; width: 150px; display: inline-block; }
		.value { font-weight: 700; color: #0f172a; }
		.box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 8px; margin-top: 3px; }
		.teeth-block { text-align: center; margin: 4px 0; }
		.status-strip {
			display: table;
			width: 100%;
			border: 1px solid #cbd5e1;
			border-radius: 4px;
			background: #f8fafc;
			margin: 6px 0;
			table-layout: fixed;
		}
		.status-cell {
			display: table-cell;
			text-align: center;
			padding: 6px 4px;
			font-size: 10px;
			font-weight: 700;
			border-right: 1px solid #e2e8f0;
			color: #64748b;
		}
		.status-cell:last-child { border-right: none; }
		.status-cell.active {
			background: #0d9488;
			color: #ffffff;
		}
		.signatures { margin-top: 16px; display: table; width: 100%; }
		.sig-col { display: table-cell; width: 33.3%; padding: 0 8px; text-align: center; }
		.sig-line { border-bottom: 1px solid #0f172a; margin-top: 28px; margin-bottom: 4px; }
		.sig-sub { font-size: 9.5px; color: #64748b; }
	</style>
</head>
<body>
	<table class="header-table">
		<tr>
			<td style="vertical-align: middle;">
				<h1 class="title">Наряд-заказ № ${order.orderNumber}</h1>
				<p class="subtitle">${order.clinicName} • Зуботехническая лаборатория «${order.labName}»</p>
			</td>
			<td style="text-align: right; vertical-align: middle;">
				${barcodeSvg}
			</td>
		</tr>
	</table>

	<div class="grid-2">
		<div class="col">
			<div class="data-row"><span class="label">Пациент (Ф.И.О.):</span> <span class="value">${order.patientName}</span></div>
			<div class="data-row"><span class="label">№ Медкарты:</span> <span class="value">${order.patientChartNumber || "—"}</span></div>
			<div class="data-row"><span class="label">Врач-ортопед:</span> <span class="value">${order.doctorName}</span></div>
			<div class="data-row"><span class="label">Телефон врача:</span> <span class="value">${order.doctorPhone || "—"}</span></div>
		</div>
		<div class="col">
			<div class="data-row"><span class="label">Дата наряда:</span> <span class="value">${formatRussianDate(order.orderDateIso)}</span></div>
			<div class="data-row"><span class="label">Срок сдачи ЗТЛ:</span> <span class="value" style="color: #0d9488;">${formatRussianDate(order.expectedLabDateIso)}</span></div>
			<div class="data-row"><span class="label">Дата примерки:</span> <span class="value">${order.fittingDate ? formatRussianDate(order.fittingDate) : (order.scheduledVisitDateIso ? formatRussianDate(order.scheduledVisitDateIso) : "По согласованию")}</span></div>
			<div class="data-row"><span class="label">Текущий статус:</span> <span class="value">${stage.nameRu}</span></div>
		</div>
	</div>

	<!-- 4-Статусный трек клинического процесса -->
	<div class="status-strip">
		<div class="status-cell ${order.currentStage === "draft" ? "active" : ""}">
			1. Черновик
		</div>
		<div class="status-cell ${order.currentStage === "sent_to_lab" ? "active" : ""}">
			2. Отправлено в ЗТЛ
		</div>
		<div class="status-cell ${order.currentStage === "fitting_scheduled" ? "active" : ""}">
			3. Примерка (${order.fittingDate ? formatRussianDate(order.fittingDate) : "Дата"})
		</div>
		<div class="status-cell ${order.currentStage === "installed_completed" ? "active" : ""}">
			4. Сдано пациенту
		</div>
	</div>

	<div class="section-title">1. Зубная формула и локализация протезирования (FDI)</div>
	<div class="teeth-block">
		${odontogramSvg}
		<p style="margin: 3px 0 0 0; font-size: 11px; font-weight: 700;">Выбранные зубы: ${teethFormatted} (всего единиц: ${order.financials.unitsCount})</p>
	</div>

	<div class="section-title">2. Спецификация ортопедической конструкции</div>
	<div class="box">
		<div class="data-row"><span class="label">Вид конструкции:</span> <span class="value">${preset.nameRu}</span></div>
		<div class="data-row"><span class="label">Материал:</span> <span class="value">${order.materialName}</span></div>
		<div class="data-row">
			<span class="label">Оттенок (VITA):</span>
			<span class="value" style="color: #0d9488; font-size: 12.5px;">${order.shadeCode} (${order.shadeSystem.toUpperCase()})</span>
			${order.stumpShadeCode ? `<span style="margin-left: 14px;"><span class="label" style="width: auto;">Культя (ND):</span> <span class="value">${order.stumpShadeCode}</span></span>` : ""}
		</div>
		<div class="data-row">
			<span class="label">Прозрачность:</span> <span class="value">${order.translucency}</span>
			<span style="margin-left: 14px;"><span class="label" style="width: auto;">Текстура:</span> <span class="value">${order.surfaceTexture}</span></span>
		</div>
		${order.occlusalScheme ? `<div class="data-row"><span class="label">Окклюзия:</span> <span class="value">${order.occlusalScheme}</span></div>` : ""}
		${order.contactTightness ? `<div class="data-row"><span class="label">Контакты:</span> <span class="value">${order.contactTightness}</span></div>` : ""}
	</div>

	<div class="section-title">3. Клинические указания врачу и лаборатории</div>
	<div class="box" style="min-height: 32px;">
		${order.clinicalNotes ? `<p style="margin: 0; font-size: 11.5px;">${order.clinicalNotes}</p>` : '<p style="margin: 0; color: #94a3b8; font-style: italic; font-size: 11.5px;">Изготовление строго по анатомическим нормам и силиконовому ключу.</p>'}
	</div>

	<div class="section-title">4. Взаиморасчеты и финансовый контроль</div>
	<div class="grid-2">
		<div class="col">
			<div class="data-row"><span class="label">Стоимость для пациента:</span> <span class="value">${order.financials.patientPriceTotalRub.toLocaleString("ru-RU")} ₽</span></div>
			<div class="data-row"><span class="label">Себестоимость ЗТЛ:</span> <span class="value">${order.financials.labCostTotalRub.toLocaleString("ru-RU")} ₽</span></div>
			<div class="data-row"><span class="label">Маржа клиники:</span> <span class="value" style="color: #0d9488;">${order.financials.clinicGrossMarginRub.toLocaleString("ru-RU")} ₽ (${order.financials.grossMarginPercent}%)</span></div>
		</div>
		<div class="col" style="text-align: right;">
			${qrSvg}
		</div>
	</div>

	<div class="signatures">
		<div class="sig-col">
			<div class="sig-line"></div>
			<div class="sig-sub">Врач-ортопед (${order.doctorName})</div>
		</div>
		<div class="sig-col">
			<div class="sig-line"></div>
			<div class="sig-sub">Курьер (Принял / Передал)</div>
		</div>
		<div class="sig-col">
			<div class="sig-line"></div>
			<div class="sig-sub">Зубной техник (${order.labName})</div>
		</div>
	</div>
</body>
</html>`;
}

// ─── 8. ЭКСПОРТ В CSV (RFC 4180 C UTF-8 BOM) ──────────────────────────────────

/**
 * Экспорт реестра наряд-заказов ЗТЛ в CSV файл для бухгалтерии и аналитики.
 */
export function exportDentalLabOrdersToCsv(orders: readonly DentalLabWorkflowOrder[]): string {
	const headers = [
		"Номер наряда",
		"Пациент",
		"№ Медкарты",
		"Врач-ортопед",
		"Лаборатория",
		"Вид конструкции",
		"Зубы (FDI)",
		"Кол-во единиц",
		"Оттенок (VITA)",
		"Оттенок культи (ND)",
		"Текущий статус",
		"Дата наряда",
		"План готовности ЗТЛ",
		"Дата примерки",
		"ID Приема",
		"Статус дедлайна",
		"Задержка ЗТЛ (Alert)",
		"Стоимость пациента (руб)",
		"Себестоимость ЗТЛ (руб)",
		"Маржа клиники (руб)",
		"ЗП врача (руб)",
		"Примечания",
	];

	const escapeCsv = (val: unknown): string => {
		if (val === null || val === undefined) return '""';
		const str = String(val).replace(/"/g, '""');
		return `"${str}"`;
	};

	const rows = orders.map((ord) => {
		const preset = ORTHOPEDIC_WORK_TYPES[ord.workTypeId] || ORTHOPEDIC_WORK_TYPES.crown_emax;
		const stage = LAB_WORKFLOW_STATUSES[ord.currentStage] || LAB_WORKFLOW_STATUSES.draft;
		const teethStr = ord.selectedTeeth.join(", ");

		return [
			escapeCsv(ord.orderNumber),
			escapeCsv(ord.patientName),
			escapeCsv(ord.patientChartNumber || ""),
			escapeCsv(ord.doctorName),
			escapeCsv(ord.labName),
			escapeCsv(preset.nameRu),
			escapeCsv(teethStr),
			escapeCsv(ord.financials.unitsCount),
			escapeCsv(ord.shadeCode),
			escapeCsv(ord.stumpShadeCode || ""),
			escapeCsv(stage.nameRu),
			escapeCsv(ord.orderDateIso),
			escapeCsv(ord.expectedLabDateIso),
			escapeCsv(ord.fittingDate || ord.scheduledVisitDateIso || ""),
			escapeCsv(ord.appointmentId || ""),
			escapeCsv(ord.delayAlert.status),
			escapeCsv(ord.isDelayedAlert ? "ДА" : "НЕТ"),
			escapeCsv(ord.financials.patientPriceTotalRub),
			escapeCsv(ord.financials.labCostTotalRub),
			escapeCsv(ord.financials.clinicGrossMarginRub),
			escapeCsv(ord.financials.doctorWageRub),
			escapeCsv(ord.clinicalNotes || ""),
		].join(";");
	});

	// UTF-8 BOM для корректного открытия в Excel на Windows
	return `\uFEFF${headers.join(";")}\r\n${rows.join("\r\n")}`;
}
