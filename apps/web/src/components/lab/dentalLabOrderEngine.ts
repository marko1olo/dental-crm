/**
 * dentalLabOrderEngine.ts — Канонический доменный движок нарядов в зуботехническую лабораторию (ЗТЛ).
 *
 * СТРОГИЙ СТОМАТОЛОГИЧЕСКИЙ ДОМЕН (БЕЗ ОБЩЕМЕДИЦИНСКОГО БЛОАТА):
 * • В стоматологии «Лаборатория» — это исключительно ЗТЛ (зуботехническая лаборатория:
 *   коронки, мосты, виниры, элайнеры, бюгели, культевые вкладки, хирургические шаблоны).
 * • Никакой биохимии крови, онкомаркеров, цитологии и мазков.
 *
 * 6 КАНОНИЧЕСКИХ СТАТУСОВ НАРЯДА ЗТЛ:
 * 1. sent_to_lab           — «Отправлен в ЗТЛ»
 * 2. in_progress           — «В работе»
 * 3. ready_in_clinic       — «Готов / В клинике»
 * 4. try_in                — «Примерка»
 * 5. delivered_to_patient  — «Сдан пациенту»
 * 6. warranty_rework       — «Переделка (гарантия)»
 *
 * 5 КАНОНИЧЕСКИХ КЛИНИЧЕСКИХ ЭТАПОВ (CANONICAL_5_CLINICAL_LAB_STATUSES):
 * Оттиск (sent) -> В лаборатории (in_progress) -> Примерка (fitting) -> Готово (ready) -> Фиксация (completed)
 *
 * 6 ВИДОВ СТОМАТОЛОГИЧЕСКИХ ОРТОПЕДИЧЕСКИХ КОНСТРУКЦИЙ:
 * 1. crown_zirconia        — Коронка цирконий (Multi-Layer Katana/Prettau)
 * 2. crown_emax            — E-max пресс (дисиликат лития IPS e.max)
 * 3. metal_ceramic         — Металлокерамика (Co-Cr фрезерованный/литой)
 * 4. clasp_denture         — Бюгельный протез (замковый Bredent / кламмерный)
 * 5. aligner_splint        — Каппа / элайнер / сплинт
 * 6. surgical_guide        — Хирургический шаблон для имплантации
 *
 * РАСЦВЕТКА VITA И ХАРАКТЕРИСТИКИ:
 * • VITA Classical: A1–A4, B1–B4, C1–C4, D2–D4 (16 оттенков)
 * • VITA Bleach: BL1, BL2, BL3, BL4, 0M1, 0M2, 0M3 (ультрасветлые)
 * • Прозрачность эмали: HT (High), MT (Medium), LT (Low), MO (Med Opacity), HO (High Opacity)
 * • Оттенок культи (IPS Natural Die): ND1 .. ND9
 *
 * ФИНАНСОВЫЙ УЧЕТ В ЦЕЛОЧИСЛЕННЫХ КОПЕЙКАХ:
 * • Себестоимость ЗТЛ (ztlCostKopecks) вычитается из валовой стоимости пациента при расчете сдельной базы врача:
 *   doctorWageBaseKopecks = max(0, patientPriceKopecks - ztlCostKopecks)
 *   doctorWageKopecks = round(doctorWageBaseKopecks * (doctorSharePercent / 100))
 *   clinicMarginKopecks = patientPriceKopecks - ztlCostKopecks - doctorWageKopecks
 *
 * АЛЕРТ ДЕДЛАЙНА (КЛИНИЧЕСКИЙ ТРИГГЕР):
 * • Если у пациента на сегодня назначен визит на сдачу/примерку коронки,
 *   а статус наряда в ЗТЛ еще «В работе» или «Отправлен в ЗТЛ» — выставляется алерт:
 *   «Работа из ЗТЛ еще не поступила в клинику!»
 */

export * from "./dentalLabDefinitions";
import {
	DENTAL_LAB_CONSTRUCTIONS,
	DENTAL_LAB_STATUSES,
	type DentalLabConstructionType,
	type DentalLabOrderStatus,
} from "./dentalLabDefinitions";

// ─── 5. ФИНАНСОВЫЙ РАСЧЕТ С УДЕРЖАНИЕМ СЕБЕСТОИМОСТИ ЗТЛ (EXACT KOPECKS) ──────

export interface ZtlWageFinancials {
	readonly unitsCount: number;
	readonly patientPriceKopecks: number;
	readonly ztlCostKopecks: number;
	readonly doctorWageBaseKopecks: number; // Валовая выручка минус себестоимость ЗТЛ
	readonly doctorSharePercent: number;
	readonly doctorWageKopecks: number;     // Сдельная ЗП врача
	readonly clinicMarginKopecks: number;   // Чистая маржа клиники
	// Форматированные значения в рублях для UI
	readonly patientPriceRub: number;
	readonly ztlCostRub: number;
	readonly doctorWageBaseRub: number;
	readonly doctorWageRub: number;
	readonly clinicMarginRub: number;
	readonly isBalanced: boolean;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
	readonly warrantyLiabilityKopecks?: number | undefined;
	readonly warrantyLiabilityRub?: number | undefined;
	readonly warrantyLiabilityLabelRu?: string | undefined;
}

export interface CalculateZtlFinancialsParams {
	readonly unitsCount: number;
	readonly patientPriceRub?: number | undefined;
	readonly patientPriceKopecks?: number | undefined;
	readonly ztlCostRub?: number | undefined;
	readonly ztlCostKopecks?: number | undefined;
	readonly doctorSharePercent?: number | undefined; // По умолчанию 20%
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
}

/**
 * Рассчитывает сдельную оплату врача-ортопеда с гарантированным вычетом себестоимости ЗТЛ.
 * Инвариант: doctorWageKopecks + clinicMarginKopecks === doctorWageBaseKopecks.
 * Гарантийный протокол: пациент СТРОГО 0 ₽, учет затрат как обязательства клиники или брак ЗТЛ.
 */
export function calculateZtlWageFinancials(params: CalculateZtlFinancialsParams): ZtlWageFinancials {
	const count = Math.max(1, Math.round(params.unitsCount || 1));

	const unitPriceKop = Math.max(
		0,
		Math.round(
			params.patientPriceKopecks ??
				(params.patientPriceRub != null ? params.patientPriceRub * 100 : 2400000),
		),
	);

	const unitCostKop = Math.max(
		0,
		Math.round(
			params.ztlCostKopecks ??
				(params.ztlCostRub != null ? params.ztlCostRub * 100 : 750000),
		),
	);

	const docPct = Math.max(0, Math.min(100, params.doctorSharePercent ?? 20));

	const isWarranty = Boolean(params.isWarrantyRework);
	const liabilityType = params.warrantyLiabilityType || "clinic_warranty";

	if (isWarranty) {
		// При гарантийной переделке пациент платит строго 0 ₽
		let effectiveZtlCostKop = unitCostKop * count;
		let warrantyLiabilityKopecks = effectiveZtlCostKop;
		let liabilityLabelRu = "Гарантийные обязательства клиники";

		if (liabilityType === "lab_defect") {
			effectiveZtlCostKop = 0;
			warrantyLiabilityKopecks = 0;
			liabilityLabelRu = "Брак ЗТЛ (переделка за счет лаборатории 0 ₽)";
		}

		const clinicMarginKopecks = effectiveZtlCostKop === 0 ? 0 : -effectiveZtlCostKop;

		return {
			unitsCount: count,
			patientPriceKopecks: 0,
			ztlCostKopecks: effectiveZtlCostKop,
			doctorWageBaseKopecks: 0,
			doctorSharePercent: docPct,
			doctorWageKopecks: 0,
			clinicMarginKopecks,
			patientPriceRub: 0,
			ztlCostRub: effectiveZtlCostKop / 100,
			doctorWageBaseRub: 0,
			doctorWageRub: 0,
			clinicMarginRub: clinicMarginKopecks === 0 ? 0 : clinicMarginKopecks / 100,
			isBalanced: true,
			isWarrantyRework: true,
			warrantyLiabilityType: liabilityType,
			warrantyLiabilityKopecks,
			warrantyLiabilityRub: warrantyLiabilityKopecks / 100,
			warrantyLiabilityLabelRu: liabilityLabelRu,
		};
	}

	const patientPriceKopecks = unitPriceKop * count;
	const ztlCostKopecks = unitCostKop * count;

	// Сдельная база врача: строго выручка минус себестоимость ЗТЛ
	const doctorWageBaseKopecks = Math.max(0, patientPriceKopecks - ztlCostKopecks);

	// Зарплата врача
	const doctorWageKopecks = Math.round((doctorWageBaseKopecks * docPct) / 100);

	// Маржа клиники
	const clinicMarginKopecks = Math.max(0, doctorWageBaseKopecks - doctorWageKopecks);

	return {
		unitsCount: count,
		patientPriceKopecks,
		ztlCostKopecks,
		doctorWageBaseKopecks,
		doctorSharePercent: docPct,
		doctorWageKopecks,
		clinicMarginKopecks,
		patientPriceRub: patientPriceKopecks / 100,
		ztlCostRub: ztlCostKopecks / 100,
		doctorWageBaseRub: doctorWageBaseKopecks / 100,
		doctorWageRub: doctorWageKopecks / 100,
		clinicMarginRub: clinicMarginKopecks / 100,
		isBalanced: doctorWageKopecks + clinicMarginKopecks === doctorWageBaseKopecks,
		isWarrantyRework: false,
	};
}

// ─── 6. АЛЕРТ ДЕДЛАЙНА И КОНТРОЛЬ ПРИХОДА РАБОТЫ ─────────────────────────────

export type LabDeadlineAlertSeverity = "CRITICAL_TODAY" | "OVERDUE" | "URGENT_TODAY" | "INFO" | "OK" | "VISIT_CONFLICT";

export interface LabDeadlineAlertResult {
	readonly hasAlert: boolean;
	readonly isDelayedAlert: boolean;
	readonly severity: LabDeadlineAlertSeverity;
	readonly badgeTextRu: string;
	readonly messageRu: string;
	readonly actionRu: string;
	readonly daysUntilDeadline: number;
	readonly badgeLabelRu?: string;
	readonly actionPromptRu?: string;
	readonly warningRu?: string;
}

export interface CheckLabOrderAlertParams {
	readonly status: DentalLabOrderStatus;
	readonly deadlineDate?: string | Date | undefined;
	readonly dueDate?: string | Date | undefined;
	readonly scheduledVisitDate?: string | Date | null | undefined;
	readonly todayDate?: string | Date | undefined;
	readonly patientName?: string | undefined;
	readonly toothNotation?: string | undefined;
	readonly orderId?: string | undefined;
	readonly orderNumber?: string | undefined;
}

export function parseDateOnly(val?: string | Date | null): Date {
	if (!val) {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}
	const d = typeof val === "string" ? new Date(val) : new Date(val.getTime());
	d.setHours(0, 0, 0, 0);
	return d;
}

export function toIsoDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function formatRuDate(iso: string): string {
	if (!iso) return "—";
	const p = iso.slice(0, 10).split("-");
	return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : iso;
}

/**
 * Добавление рабочих дней ЗТЛ с пропуском суббот и воскресений.
 */
export function addWorkingDaysRu(startDate: Date | string, daysToAdd: number): Date {
	const result = parseDateOnly(startDate);
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
 * Расчет плановой даты готовности ЗТЛ с учетом рабочих дней лаборатории.
 */
export function calculateLabReadinessDate(
	startDate: Date | string = new Date(),
	turnaroundWorkingDays = 5,
): string {
	const d = addWorkingDaysRu(startDate, Math.max(1, turnaroundWorkingDays));
	return toIsoDate(d);
}

export interface FittingCollisionGuardResult {
	readonly hasCollision: boolean;
	readonly warningRu: string | null;
	readonly daysGap: number;
	readonly deadlineDateIso: string;
	readonly scheduledVisitDateIso: string | null;
}

/**
 * Защита от коллизий визита примерки и срока готовности ЗТЛ:
 * Если визит на примерку/фиксацию в расписании назначен РАНЬШЕ расчетного срока готовности ЗТЛ,
 * формируется тревожное предупреждение: «Внимание: прием на примерку назначен раньше готовности лаборатории!».
 */
export function checkFittingAppointmentCollision(
	deadlineDate: string | Date,
	scheduledVisitDate?: string | Date | null,
): FittingCollisionGuardResult {
	const deadline = parseDateOnly(deadlineDate);
	const deadlineIso = toIsoDate(deadline);
	if (!scheduledVisitDate) {
		return {
			hasCollision: false,
			warningRu: null,
			daysGap: 0,
			deadlineDateIso: deadlineIso,
			scheduledVisitDateIso: null,
		};
	}
	const visit = parseDateOnly(scheduledVisitDate);
	const visitIso = toIsoDate(visit);
	const diffMs = deadline.getTime() - visit.getTime();
	const daysGap = Math.round(diffMs / (1000 * 60 * 60 * 24));
	const hasCollision = daysGap > 0;

	return {
		hasCollision,
		warningRu: hasCollision
			? `Внимание: прием на примерку назначен раньше готовности лаборатории! (дефицит: ${daysGap} дн., готовность: ${deadlineIso}, визит: ${visitIso})`
			: null,
		daysGap: hasCollision ? daysGap : 0,
		deadlineDateIso: deadlineIso,
		scheduledVisitDateIso: visitIso,
	};
}

/**
 * Проверяет дедлайн наряда ЗТЛ и выявляет критический алерт:
 * 1. Коллизия графика: визит назначен РАНЬШЕ готовности ЗТЛ.
 * 2. Прием на сегодня, а работа еще не в клинике.
 * 3. Задержка или просрочка со стороны лаборатории.
 */
export function detectLabDeadlineAlert(params: CheckLabOrderAlertParams): LabDeadlineAlertResult {
	const today = params.todayDate ? parseDateOnly(params.todayDate) : parseDateOnly(new Date());
	const todayIso = toIsoDate(today);

	// Если статус «Задерживается» — немедленно формируется тревожный янтарный алерт
	if (params.status === "delayed") {
		return {
			hasAlert: true,
			isDelayedAlert: true,
			severity: "CRITICAL_TODAY",
			badgeTextRu: "Задерживается ЗТЛ",
			badgeLabelRu: "Задерживается ЗТЛ",
			messageRu: "Лаборатория задерживает изготовление работы. Требуется перенос приема пациента.",
			warningRu: "Лаборатория задерживает изготовление работы. Требуется перенос приема пациента.",
			actionRu: "Перенести прием пациента в расписании (1 клик).",
			actionPromptRu: "Перенести прием пациента в расписании (1 клик).",
			daysUntilDeadline: -1,
		};
	}

	// Если работа уже в клинике, на примерке или сдана — алерта непоступления нет
	if (params.status === "ready_in_clinic") {
		return {
			hasAlert: false,
			isDelayedAlert: false,
			severity: "OK",
			badgeTextRu: "В клинике (Готов)",
			badgeLabelRu: "В клинике (Готов)",
			messageRu: "Работа доставлена в клинику и готова к примерке или фиксации.",
			actionRu: "Пригласить пациента на прием.",
			daysUntilDeadline: 0,
		};
	}

	if (params.status === "try_in") {
		return {
			hasAlert: false,
			isDelayedAlert: false,
			severity: "OK",
			badgeTextRu: "Примерка",
			badgeLabelRu: "Примерка",
			messageRu: "Конструкция на этапе клинической примерки в полости рта.",
			actionRu: "Зафиксировать результат примерки.",
			daysUntilDeadline: 0,
		};
	}

	if (params.status === "delivered_to_patient") {
		return {
			hasAlert: false,
			isDelayedAlert: false,
			severity: "OK",
			badgeTextRu: "Сдан пациенту",
			badgeLabelRu: "Сдан пациенту",
			messageRu: "Работа успешно установлена и сдана пациенту.",
			actionRu: "Наряд закрыт.",
			daysUntilDeadline: 0,
		};
	}

	if (params.status === "warranty_rework") {
		return {
			hasAlert: true,
			isDelayedAlert: true,
			severity: "INFO",
			badgeTextRu: "Переделка (гарантия)",
			badgeLabelRu: "Переделка (гарантия)",
			messageRu: "Наряд находится на гарантийной переделке / доработке.",
			actionRu: "Ожидайте повторной доставки из ЗТЛ.",
			daysUntilDeadline: 0,
		};
	}

	// Статусы: "sent_to_lab" или "in_progress" (работа НЕ в клинике)
	const rawDeadline = params.deadlineDate || params.dueDate;
	if (!rawDeadline) {
		return {
			hasAlert: false,
			isDelayedAlert: false,
			severity: "OK",
			badgeTextRu: "Срок не задан",
			badgeLabelRu: "Срок не задан",
			messageRu: "",
			warningRu: "",
			actionRu: "",
			actionPromptRu: "",
			daysUntilDeadline: 0,
		};
	}

	const visitDate = params.scheduledVisitDate ? parseDateOnly(params.scheduledVisitDate) : null;
	const visitIso = visitDate ? toIsoDate(visitDate) : null;

	const deadline = parseDateOnly(rawDeadline);
	const deadlineIso = toIsoDate(deadline);
	const diffMs = deadline.getTime() - today.getTime();
	const daysUntilDeadline = Math.round(diffMs / (1000 * 60 * 60 * 24));

	// 1. ЗАЩИТА ОТ КОЛЛИЗИЙ (Fitting Appointment Guard):
	// Если визит на примерку назначен РАНЬШЕ расчетного срока готовности ЗТЛ
	if (visitDate && visitDate.getTime() < deadline.getTime()) {
		const collisionDays = Math.round((deadline.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
		return {
			hasAlert: true,
			isDelayedAlert: true,
			severity: "CRITICAL_TODAY",
			badgeTextRu: "Прием раньше готовности ЗТЛ!",
			badgeLabelRu: "Прием раньше готовности ЗТЛ!",
			messageRu: `Внимание: прием на примерку назначен раньше готовности лаборатории! (дефицит: ${collisionDays} дн.)`,
			warningRu: `Внимание: прием на примерку назначен раньше готовности лаборатории! (дефицит: ${collisionDays} дн.)`,
			actionRu: `Перенести прием на дату не ранее расчетной готовности лаборатории (${formatRuDate(deadlineIso)}, разница ${collisionDays} дн.).`,
			actionPromptRu: `Перенести прием на дату не ранее расчетной готовности лаборатории (${formatRuDate(deadlineIso)}, разница ${collisionDays} дн.).`,
			daysUntilDeadline,
		};
	}

	// 2. ГЛАВНЫЙ КЛИНИЧЕСКИЙ АЛЕРТ: визит пациента назначен на СЕГОДНЯ (или раньше), а работа еще в ЗТЛ!
	if (visitIso && visitIso <= todayIso) {
		const toothLabel = params.toothNotation ? ` (зуб ${params.toothNotation})` : "";
		return {
			hasAlert: true,
			isDelayedAlert: true,
			severity: "CRITICAL_TODAY",
			badgeTextRu: "Работа еще не поступила в клинику!",
			badgeLabelRu: "Работа еще не поступила в клинику!",
			messageRu: `Работа из ЗТЛ еще не поступила в клинику! У пациента ${params.patientName || ""}${toothLabel} назначен прием на ${formatRuDate(visitIso)}, а статус в ЗТЛ еще «${DENTAL_LAB_STATUSES[params.status].labelRu}».`,
			actionRu: "Срочно связаться с лабораторией/курьером или предупредить врача и регистратора!",
			daysUntilDeadline,
		};
	}

	// 3. Дедлайн ЗТЛ просрочен (сегодня > дата дедлайна)
	if (daysUntilDeadline < 0) {
		const overdueDays = Math.abs(daysUntilDeadline);
		return {
			hasAlert: true,
			isDelayedAlert: true,
			severity: "OVERDUE",
			badgeTextRu: `Просрочено ЗТЛ на ${overdueDays} дн.`,
			badgeLabelRu: `Просрочено ЗТЛ на ${overdueDays} дн.`,
			messageRu: `Лаборатория не сдала работу к плановому сроку ${formatRuDate(deadlineIso)} (задержка ${overdueDays} дн.).`,
			warningRu: `Лаборатория не сдала работу к плановому сроку ${formatRuDate(deadlineIso)} (задержка ${overdueDays} дн.).`,
			actionRu: "Перенести прием пациента и запросить у техника статус изготовления.",
			actionPromptRu: "Перенести прием пациента и запросить у техника статус изготовления.",
			daysUntilDeadline,
		};
	}

	// 4. Срок сдачи сегодня
	if (daysUntilDeadline === 0) {
		return {
			hasAlert: true,
			isDelayedAlert: false,
			severity: "URGENT_TODAY",
			badgeTextRu: "Сдача из ЗТЛ сегодня",
			messageRu: `Плановая дата сдачи из лаборатории — сегодня (${formatRuDate(deadlineIso)}). Ожидается доставка курьером.`,
			actionRu: "Принять работу у курьера и зарегистрировать поступление.",
			daysUntilDeadline: 0,
		};
	}

	// В графике
	return {
		hasAlert: false,
		isDelayedAlert: false,
		severity: "OK",
		badgeTextRu: `В графике (${daysUntilDeadline} дн.)`,
		messageRu: `Работа изготавливается в плановом режиме. Срок сдачи: ${formatRuDate(deadlineIso)}.`,
		actionRu: "Действий не требуется.",
		daysUntilDeadline,
	};
}

// ─── 7. МОДЕЛЬ ДАННЫХ И НАВИГАЦИЯ СТАТУСОВ ──────────────────────────────────

export interface DentalLabOrderRecord {
	readonly id: string;
	readonly orderNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly labName: string;
	readonly technicianName?: string | undefined;
	readonly teethFdi: readonly number[];
	readonly teeth?: readonly (number | string)[] | undefined;
	readonly constructionType: DentalLabConstructionType;
	readonly materialRu: string;
	readonly material?: string | undefined;
	readonly vitaShade: string;
	readonly colorVita?: string | undefined;
	readonly shadeSystem?: "classical" | "3d_master" | "bleach" | undefined;
	readonly translucency?: string | undefined;
	readonly stumpShade?: string | undefined;
	readonly sentDate: string;     // YYYY-MM-DD
	readonly deadlineDate: string; // YYYY-MM-DD (дата примерки/сдачи)
	readonly dueDate?: string | undefined;
	readonly status: DentalLabOrderStatus;
	readonly patientPriceKopecks: number;
	readonly priceRub?: number | undefined;
	readonly ztlCostKopecks: number;
	readonly doctorSharePercent: number;
	readonly scheduledVisitDate?: string | undefined; // YYYY-MM-DD
	readonly appointmentId?: string | undefined;
	readonly isWarrantyRemake?: boolean | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyReason?: string | undefined;
	readonly reworkReason?: string | undefined;
	readonly clinicalNotes?: string | undefined;
	readonly attachedScanUrl?: string | undefined;
	// Поддержка частичной поставки и гарантийной переделки
	readonly deliveredTeeth?: readonly number[] | undefined;
	readonly reworkTeeth?: readonly number[] | undefined;
	readonly isPartialDelivery?: boolean | undefined;
	readonly originalOrderId?: string | undefined;
	readonly originalOrderNumber?: string | undefined;
	readonly warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
	readonly fittingCollisionWarning?: string | undefined;
	readonly anatomicalFeatures?: {
		readonly opalescence?: boolean | undefined;
		readonly mamelons?: boolean | undefined;
		readonly calcifications?: boolean | undefined;
		readonly translucencyLevel?: string | undefined;
		readonly stumpShade?: string | undefined;
	} | undefined;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface PartialDeliveryParams {
	readonly order?: DentalLabOrderRecord | undefined;
	readonly originalOrder?: DentalLabOrderRecord | undefined;
	readonly readyTeeth?: readonly (number | string)[] | undefined;
	readonly deliveredTeeth?: readonly (number | string)[] | undefined;
	readonly reworkTeeth: readonly (number | string)[];
	readonly reworkReason: string;
	readonly liabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
	readonly warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
}

export interface PartialDeliveryResult {
	readonly deliveredOrder: DentalLabOrderRecord;
	readonly reworkOrder: DentalLabOrderRecord;
	readonly summaryRu: string;
	readonly summaryMessageRu: string;
}

/**
 * Обработка сценария частичной поставки и гарантийной переделки:
 * Из наряда на несколько единиц (например 4 коронки) готовые (3 ед.) принимаются в клинике
 * и могут быть сданы пациенту, а дефектная (1 ед.) отправляется на гарантийную переделку (0 ₽ для пациента).
 * Заказ не зависает в мертвом тупике.
 */
export function processPartialDeliveryAndRework(params: PartialDeliveryParams): PartialDeliveryResult {
	const order = params.originalOrder || params.order;
	if (!order) {
		throw new Error("processPartialDeliveryAndRework: missing order or originalOrder parameter");
	}
	const readyRaw = params.readyTeeth || params.deliveredTeeth || [];
	const reworkRaw = params.reworkTeeth || [];
	const readyTeeth: number[] = readyRaw.map((t) => typeof t === "number" ? t : Number.parseInt(String(t), 10) || 0).filter(Boolean);
	const reworkTeeth: number[] = reworkRaw.map((t) => typeof t === "number" ? t : Number.parseInt(String(t), 10) || 0).filter(Boolean);
	const liabilityType = params.warrantyLiabilityType || params.liabilityType || "lab_defect";
	const reworkReason = params.reworkReason || "Гарантийная рекламация";

	const allTeeth = order.teethFdi || (order.teeth as readonly number[]) || [16];
	const totalCount = Math.max(1, allTeeth.length);
	const readyCount = readyTeeth.length;
	const reworkCount = reworkTeeth.length;

	const pricePerUnitKop = Math.round(order.patientPriceKopecks / totalCount);
	const costPerUnitKop = Math.round(order.ztlCostKopecks / totalCount);

	const deliveredPatientPriceKop = pricePerUnitKop * readyCount;
	const deliveredZtlCostKop = costPerUnitKop * readyCount;

	const now = new Date().toISOString();

	// 1. Принятая часть наряда: доступна для записи и фиксации
	const deliveredOrder: DentalLabOrderRecord = {
		...order,
		teethFdi: readyTeeth,
		teeth: readyTeeth,
		deliveredTeeth: readyTeeth,
		reworkTeeth,
		isPartialDelivery: true,
		patientPriceKopecks: deliveredPatientPriceKop,
		priceRub: Math.round(deliveredPatientPriceKop / 100),
		ztlCostKopecks: deliveredZtlCostKop,
		status: "ready_in_clinic",
		clinicalNotes: `${order.clinicalNotes || ""}\n• ЧАСТИЧНАЯ ПРИЕМКА: Зубы [${readyTeeth.join(", ")}] готовы в клинике к фиксации. Зубы [${reworkTeeth.join(", ")}] направлены на гарантийную переделку.`.trim(),
		updatedAt: now,
	};

	// 2. Гарантийная переделка: строго 0 ₽ для пациента!
	const reworkZtlCostKop = liabilityType === "lab_defect" ? 0 : costPerUnitKop * reworkCount;

	const reworkOrder: DentalLabOrderRecord = {
		...order,
		id: `${order.id}-REW-1`,
		orderNumber: `${order.orderNumber}-REW-1`,
		teethFdi: reworkTeeth,
		teeth: reworkTeeth,
		deliveredTeeth: undefined,
		reworkTeeth,
		isPartialDelivery: true,
		originalOrderId: order.id,
		originalOrderNumber: order.orderNumber,
		status: "warranty_rework",
		patientPriceKopecks: 0, // 0 ₽ для пациента
		priceRub: 0,
		ztlCostKopecks: reworkZtlCostKop,
		isWarrantyRemake: true,
		isWarrantyRework: true,
		warrantyReason: reworkReason || "Гарантийная доработка одиночной единицы",
		reworkReason: reworkReason || "Гарантийная доработка одиночной единицы",
		warrantyLiabilityType: liabilityType,
		clinicalNotes: `• ГАРАНТИЙНАЯ ПЕРЕДЕЛКА ЕДИНИЦЫ (0 ₽ ДЛЯ ПАЦИЕНТА)\n• Исходный наряд ЗТЛ: № ${order.orderNumber}\n• Зубы на доработку: [${reworkTeeth.join(", ")}]\n• Причина рекламации: ${reworkReason || "Коррекция прилегания/окклюзии/оттенка"}\n• Тип ответственности: ${liabilityType === "lab_defect" ? "Брак ЗТЛ (0 ₽)" : "Гарантия клиники"}`,
		createdAt: now,
		updatedAt: now,
	};

	const summaryRu = `Частичная приемка оформлена: наряд № ${order.orderNumber}, зубы ${readyTeeth.join(", ")} готовы к примерке/фиксации, зуб(ы) ${reworkTeeth.join(", ")} направлены на гарантийную переделку (0 ₽ для пациента).`;

	return {
		deliveredOrder,
		reworkOrder,
		summaryRu,
		summaryMessageRu: summaryRu,
	};
}

/**
 * Возвращает следующий канонический статус в цепочке ортопедического протокола.
 */
export function getNextLabStatus(current: DentalLabOrderStatus): DentalLabOrderStatus | null {
	switch (current) {
		case "sent_to_lab":
			return "in_progress";
		case "in_progress":
			return "ready_in_clinic";
		case "ready_in_clinic":
			return "try_in";
		case "try_in":
			return "delivered_to_patient";
		case "warranty_rework":
			return "sent_to_lab";
		case "delivered_to_patient":
			return null;
		default:
			return null;
	}
}

/**
 * Проверка допустимости перехода между статусами наряда ЗТЛ.
 */
export function canTransitionLabStatus(from: DentalLabOrderStatus, to: DentalLabOrderStatus): boolean {
	if (from === to) return true;
	if (to === "warranty_rework") {
		// Рекламацию можно оформить после сдачи, примерки или готовности
		return from === "delivered_to_patient" || from === "try_in" || from === "ready_in_clinic";
	}
	if (from === "warranty_rework") {
		return to === "sent_to_lab" || to === "in_progress" || to === "ready_in_clinic";
	}
	return true; // Свобода врача и администратора
}

let _labOrderSequenceCounter = 100;

/**
 * Генерирует детерминированный номер наряда ЗТЛ без Math.random() и синтетических фасадов.
 * Формат: ЗТЛ-ГГГГ-НОМЕР (например ЗТЛ-2026-100).
 */
export function generateDeterministicLabOrderNumber(params?: {
	date?: Date | string;
	patientId?: string;
	patientName?: string;
	sequence?: number;
}): string {
	const d = params?.date ? (typeof params.date === "string" ? new Date(params.date) : params.date) : new Date();
	const year = d.getFullYear();
	const seq = params?.sequence ?? (_labOrderSequenceCounter++);
	return `ЗТЛ-${year}-${String(seq).padStart(3, "0")}`;
}

/**
 * Генерирует детерминированный строковый ID наряда ЗТЛ без Math.random().
 * Формат: ztl-ord-<timestamp>-<patientSlug>-<seq>.
 */
export function generateDeterministicLabOrderId(params?: {
	patientId?: string;
	date?: Date | string;
	sequence?: number;
}): string {
	const d = params?.date ? (typeof params.date === "string" ? new Date(params.date) : params.date) : new Date();
	const pat = (params?.patientId || "pat").replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "0001";
	const seq = params?.sequence ?? (_labOrderSequenceCounter++);
	return `ztl-ord-${d.getTime()}-${pat}-${seq}`;
}

export function createDentalLabOrderRecord(partial: any): DentalLabOrderRecord {
	const construction = partial.constructionType || "crown_zirconia";
	const def = DENTAL_LAB_CONSTRUCTIONS[construction];
	const sentDate = partial.sentDate || toIsoDate(new Date());
	const deadline = partial.deadlineDate || partial.dueDate || calculateLabReadinessDate(sentDate, def?.standardTurnaroundDays ?? 5);
	const collision = checkFittingAppointmentCollision(deadline, partial.scheduledVisitDate);

	const rawTeeth = partial.teethFdi || partial.teeth || [16];
	const teeth: number[] = Array.isArray(rawTeeth)
		? rawTeeth.map((t: any) => typeof t === "number" ? t : Number.parseInt(String(t), 10) || 16)
		: [16];

	const totalPatientPriceKop = partial.patientPriceKopecks ?? (partial.priceRub != null ? partial.priceRub * 100 : (def?.defaultPatientPriceKopecks ?? 2400000) * teeth.length);
	const unitPatientPriceKop = Math.round(totalPatientPriceKop / Math.max(1, teeth.length));
	const totalZtlCostKop = partial.ztlCostKopecks ?? (def?.defaultZtlCostKopecks ?? 750000) * teeth.length;
	const unitZtlCostKop = Math.round(totalZtlCostKop / Math.max(1, teeth.length));

	const financials = calculateZtlWageFinancials({
		unitsCount: teeth.length,
		patientPriceKopecks: unitPatientPriceKop,
		ztlCostKopecks: unitZtlCostKop,
		doctorSharePercent: partial.doctorSharePercent ?? 20,
		isWarrantyRework: partial.isWarrantyRemake || partial.isWarrantyRework,
		warrantyLiabilityType: partial.warrantyLiabilityType,
	});

	const shade = partial.vitaShade || partial.colorVita || "A2";
	const now = new Date().toISOString();

	return {
		id: partial.id || generateDeterministicLabOrderId({ patientId: partial.patientId, date: sentDate }),
		orderNumber: partial.orderNumber || generateDeterministicLabOrderNumber({ patientId: partial.patientId, date: sentDate }),
		patientId: partial.patientId || "pat-default",
		patientName: partial.patientName || "Пациент",
		doctorId: partial.doctorId || "doc-ortho",
		doctorName: partial.doctorName || "Врач-ортопед",
		labName: partial.labName || "CAD/CAM Центр Дентал-Мастер",
		technicianName: partial.technicianName,
		teethFdi: teeth,
		teeth,
		constructionType: construction,
		materialRu: partial.materialRu || partial.material || def?.defaultMaterialRu || "Диоксид циркония Katana ML",
		material: partial.material || partial.materialRu || def?.defaultMaterialRu || "Диоксид циркония Katana ML",
		vitaShade: shade,
		colorVita: shade,
		shadeSystem: partial.shadeSystem || "classical",
		translucency: partial.translucency || "MT",
		stumpShade: partial.stumpShade || "ND2",
		sentDate,
		deadlineDate: deadline,
		dueDate: deadline,
		status: partial.status || "sent_to_lab",
		patientPriceKopecks: financials.patientPriceKopecks,
		priceRub: Math.round(financials.patientPriceKopecks / 100),
		ztlCostKopecks: financials.ztlCostKopecks,
		doctorSharePercent: financials.doctorSharePercent,
		scheduledVisitDate: partial.scheduledVisitDate,
		appointmentId: partial.appointmentId,
		isWarrantyRemake: Boolean(partial.isWarrantyRemake || partial.isWarrantyRework),
		isWarrantyRework: Boolean(partial.isWarrantyRemake || partial.isWarrantyRework),
		warrantyReason: partial.warrantyReason || partial.reworkReason,
		reworkReason: partial.warrantyReason || partial.reworkReason,
		clinicalNotes: partial.clinicalNotes,
		attachedScanUrl: partial.attachedScanUrl,
		deliveredTeeth: partial.deliveredTeeth,
		reworkTeeth: partial.reworkTeeth,
		isPartialDelivery: partial.isPartialDelivery || false,
		originalOrderId: partial.originalOrderId,
		originalOrderNumber: partial.originalOrderNumber,
		warrantyLiabilityType: partial.warrantyLiabilityType,
		fittingCollisionWarning: collision.warningRu ?? partial.fittingCollisionWarning,
		anatomicalFeatures: { translucencyLevel: partial.translucency || partial.anatomicalFeatures?.translucencyLevel || "MT", mamelons: partial.mamelons ?? partial.anatomicalFeatures?.mamelons ?? false, opalescence: partial.opalescence ?? partial.anatomicalFeatures?.opalescence ?? false, calcifications: partial.calcifications ?? partial.anatomicalFeatures?.calcifications ?? false, stumpShade: partial.stumpShade || partial.anatomicalFeatures?.stumpShade },
		createdAt: partial.createdAt || now,
		updatedAt: partial.updatedAt || now,
	};
}
export { getDemoDentalLabOrderRecords, getDemoDentalLabOrderData } from "./dentalLabDemoData";
