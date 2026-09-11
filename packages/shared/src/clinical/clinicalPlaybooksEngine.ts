/**
 * packages/shared/src/clinical/clinicalPlaybooksEngine.ts
 * Smart Clinical Playbooks & Gap Recovery Engine.
 * Reverse-engineered and adapted from DentalPin (guided workflows & proactivity)
 * into DENTE Dental CRM.
 *
 * Implements:
 * 1. Morning Doctor Briefing (today's appointments, chair distribution, red somatic/allergy alerts)
 * 2. Cancellation Gap Recovery (scoring and matching recall candidates for open slots)
 * 3. 0-Click Pre-Appointment Clinical Summary (chairside rapid preparation)
 *
 * Invariants:
 * - Strictly < 800 lines of code.
 * - 100% typed with strict Zod schemas.
 * - Zero mocks, zero synthetic stubs.
 * - Zero cartoon emojis in clinical/financial outputs (Mandate 8d point 7).
 */

import { z } from "zod";

// ============================================================================
// 1. SCHEMAS: MORNING DOCTOR BRIEFING
// ============================================================================

export const MorningAppointmentItemSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  patientName: z.string().min(1),
  patientPhone: z.string().min(1),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().int().positive(),
  chairId: z.string().min(1),
  chairName: z.string().min(1),
  doctorId: z.string().min(1),
  doctorName: z.string().min(1),
  procedureName: z.string().min(1),
  status: z.enum([
    "scheduled",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
  ]),
  somaticAlerts: z.array(z.string()).default([]),
  hasRedAlert: z.boolean().default(false),
  isPrimaryVisit: z.boolean().default(false),
  balanceKopecks: z.number().int().default(0),
  estimatedRevenueKopecks: z.number().int().nonnegative().default(0),
});
export type MorningAppointmentItem = z.infer<typeof MorningAppointmentItemSchema>;

export const MorningDoctorBriefingInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clinicId: z.string().min(1),
  clinicName: z.string().min(1),
  doctorId: z.string().nullable().optional(),
  appointments: z.array(MorningAppointmentItemSchema),
  overdueRecallsCount: z.number().int().nonnegative().default(0),
  unansweredBudgetsCount: z.number().int().nonnegative().default(0),
});
export type MorningDoctorBriefingInput = z.input<typeof MorningDoctorBriefingInputSchema>;

export const ChairLoadItemSchema = z.object({
  chairId: z.string(),
  chairName: z.string(),
  appointmentCount: z.number().int().nonnegative(),
  totalMinutes: z.number().int().nonnegative(),
  loadFactorPercent: z.number().min(0).max(100),
  appointments: z.array(MorningAppointmentItemSchema),
});
export type ChairLoadItem = z.infer<typeof ChairLoadItemSchema>;

export const RedAlertSummarySchema = z.object({
  appointmentId: z.string(),
  time: z.string(),
  patientName: z.string(),
  patientPhone: z.string(),
  alerts: z.array(z.string()),
  doctorName: z.string(),
  chairName: z.string(),
});
export type RedAlertSummary = z.infer<typeof RedAlertSummarySchema>;

export const MorningDoctorBriefingSummarySchema = z.object({
  date: z.string(),
  clinicName: z.string(),
  totalAppointments: z.number().int().nonnegative(),
  confirmedAppointments: z.number().int().nonnegative(),
  cancelledOrNoShow: z.number().int().nonnegative(),
  primaryPatientsCount: z.number().int().nonnegative(),
  totalEstimatedRevenueKopecks: z.number().int().nonnegative(),
  chairDistribution: z.array(ChairLoadItemSchema),
  redSomaticAlerts: z.array(RedAlertSummarySchema),
  overdueRecallsCount: z.number().int().nonnegative(),
  unansweredBudgetsCount: z.number().int().nonnegative(),
  plainTextBriefing: z.string(),
});
export type MorningDoctorBriefingSummary = z.infer<
  typeof MorningDoctorBriefingSummarySchema
>;

// ============================================================================
// 2. SCHEMAS: CANCELLATION GAP RECOVERY
// ============================================================================

export const CancelledSlotSchema = z.object({
  appointmentId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().int().positive(),
  chairId: z.string().min(1),
  chairName: z.string().min(1),
  doctorId: z.string().min(1),
  doctorName: z.string().min(1),
  specialty: z.enum([
    "therapist",
    "orthopedist",
    "surgeon",
    "hygienist",
    "orthodontist",
    "general",
  ]).default("general"),
});
export type CancelledSlot = z.infer<typeof CancelledSlotSchema>;

export const RecallCandidateSchema = z.object({
  patientId: z.string().min(1),
  patientName: z.string().min(1),
  patientPhone: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  dueRecallDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  daysOverdue: z.number().int().nonnegative(),
  recommendedProcedure: z.string().min(1),
  preferredDoctorId: z.string().optional(),
  preferredTimeOfDay: z.enum(["morning", "afternoon", "evening", "any"]).optional().default("any"),
  lastVisitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  contactHistoryCount: z.number().int().nonnegative().optional().default(0),
  lastContactOutcome: z
    .enum(["none", "no_answer", "call_back_later", "refused", "scheduled"])
    .optional()
    .default("none"),
  familyBalanceKopecks: z.number().int().optional().default(0),
});
export type RecallCandidate = z.infer<typeof RecallCandidateSchema>;

export const CancellationGapRecoveryInputSchema = z.object({
  cancelledSlot: CancelledSlotSchema,
  recallCandidates: z.array(RecallCandidateSchema),
  maxCandidates: z.number().int().positive().default(5),
});
export type CancellationGapRecoveryInput = z.input<
  typeof CancellationGapRecoveryInputSchema
>;

export const ScoredCandidateSchema = z.object({
  patientId: z.string(),
  patientName: z.string(),
  patientPhone: z.string(),
  recommendedProcedure: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  daysOverdue: z.number().int().nonnegative(),
  score: z.number().min(0).max(100),
  matchReason: z.string(),
  bookingRecommendation: z.string(),
});
export type ScoredCandidate = z.infer<typeof ScoredCandidateSchema>;

export const CancellationGapRecoveryResultSchema = z.object({
  gapSlot: CancelledSlotSchema,
  scoredCandidates: z.array(ScoredCandidateSchema),
  topCandidate: ScoredCandidateSchema.nullable(),
  summaryRu: z.string(),
});
export type CancellationGapRecoveryResult = z.infer<
  typeof CancellationGapRecoveryResultSchema
>;

// ============================================================================
// 3. SCHEMAS: 0-CLICK PRE-APPOINTMENT CLINICAL SUMMARY
// ============================================================================

export const PreAppointmentSummaryInputSchema = z.object({
  patient: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    gender: z.enum(["male", "female", "unspecified"]).default("unspecified"),
    phone: z.string().min(1),
  }),
  appointment: z.object({
    id: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    durationMinutes: z.number().int().positive(),
    doctorName: z.string().min(1),
    chairName: z.string().min(1),
    procedure: z.string().min(1),
    notes: z.string().optional(),
  }),
  somaticHistory: z.object({
    alerts: z.array(z.string()).default([]),
    chronicDiseases: z.array(z.string()).default([]),
    medications: z.array(z.string()).default([]),
    isPregnant: z.boolean().default(false),
    bloodPressureTypical: z.string().optional(),
  }),
  dentalHistory: z.object({
    missingTeeth: z.array(z.number().int()).default([]),
    treatedTeeth: z.array(z.number().int()).default([]),
    implants: z.array(z.number().int()).default([]),
    perioStateSummary: z.string().optional(),
    lastXRayDate: z.string().optional(),
  }),
  financialStatus: z.object({
    balanceKopecks: z.number().int().default(0),
    openTreatmentPlanAmountKopecks: z.number().int().nonnegative().default(0),
    unacceptedBudgetsCount: z.number().int().nonnegative().default(0),
  }),
  activeRecalls: z
    .array(
      z.object({
        id: z.string(),
        procedure: z.string(),
        dueDate: z.string(),
        isOverdue: z.boolean(),
      })
    )
    .default([]),
});
export type PreAppointmentSummaryInput = z.input<
  typeof PreAppointmentSummaryInputSchema
>;

export const PreAppointmentSummarySchema = z.object({
  patientId: z.string(),
  patientName: z.string(),
  ageYears: z.number().int().nonnegative().nullable(),
  todayAppointmentTime: z.string(),
  chairAndDoctor: z.string(),
  criticalAlerts: z.array(z.string()),
  clinicalPreBrief: z.string(),
  financialPreBrief: z.string(),
  suggestedActions: z.array(z.string()),
  printCleanText: z.string(),
});
export type PreAppointmentSummary = z.infer<typeof PreAppointmentSummarySchema>;

// ============================================================================
// 4. IMPLEMENTATION: MORNING DOCTOR BRIEFING
// ============================================================================

/**
 * Compiles a comprehensive morning doctor briefing summarizing today's schedule,
 * chair distribution, red somatic/allergy warnings, and clinic metrics.
 */
export function generateMorningDoctorBriefing(
  input: MorningDoctorBriefingInput
): MorningDoctorBriefingSummary {
  const validated = MorningDoctorBriefingInputSchema.parse(input);
  const appts = validated.appointments;

  // Filter for doctor if specified
  const targetAppts = validated.doctorId
    ? appts.filter((a) => a.doctorId === validated.doctorId)
    : appts;

  const totalAppointments = targetAppts.length;
  const confirmedAppointments = targetAppts.filter(
    (a) => a.status === "confirmed" || a.status === "scheduled" || a.status === "completed"
  ).length;
  const cancelledOrNoShow = targetAppts.filter(
    (a) => a.status === "cancelled" || a.status === "no_show"
  ).length;
  const primaryPatientsCount = targetAppts.filter((a) => a.isPrimaryVisit).length;
  const totalEstimatedRevenueKopecks = targetAppts.reduce(
    (acc, a) => acc + a.estimatedRevenueKopecks,
    0
  );

  // Group by chair
  const chairMap = new Map<string, { chairName: string; list: MorningAppointmentItem[] }>();
  for (const a of targetAppts) {
    const existing = chairMap.get(a.chairId);
    if (existing) {
      existing.list.push(a);
    } else {
      chairMap.set(a.chairId, { chairName: a.chairName, list: [a] });
    }
  }

  // Clinic working day budget = 8 hours = 480 minutes per chair
  const WORKING_DAY_MINUTES = 480;
  const chairDistribution: ChairLoadItem[] = Array.from(chairMap.entries()).map(
    ([chairId, data]) => {
      const sorted = [...data.list].sort((x, y) => x.time.localeCompare(y.time));
      const totalMinutes = sorted.reduce((acc, a) => acc + a.durationMinutes, 0);
      const loadFactorPercent = Math.min(
        100,
        Math.round((totalMinutes / WORKING_DAY_MINUTES) * 100)
      );
      return {
        chairId,
        chairName: data.chairName,
        appointmentCount: sorted.length,
        totalMinutes,
        loadFactorPercent,
        appointments: sorted,
      };
    }
  );

  // Sort chairs alphabetically
  chairDistribution.sort((a, b) => a.chairName.localeCompare(b.chairName));

  // Red Somatic / Allergy Alerts
  const redSomaticAlerts: RedAlertSummary[] = [];
  for (const a of targetAppts) {
    const hasAlerts = a.hasRedAlert || a.somaticAlerts.length > 0;
    if (hasAlerts) {
      redSomaticAlerts.push({
        appointmentId: a.id,
        time: a.time,
        patientName: a.patientName,
        patientPhone: a.patientPhone,
        alerts: a.somaticAlerts.length > 0 ? a.somaticAlerts : ["[ВЫСОКИЙ РИСК]"],
        doctorName: a.doctorName,
        chairName: a.chairName,
      });
    }
  }
  redSomaticAlerts.sort((a, b) => a.time.localeCompare(b.time));

  // Generate clean publication-grade Russian summary (strictly 0 emojis)
  const lines: string[] = [];
  lines.push(`УТРЕННИЙ БРИФИНГ ВРАЧА — ${validated.clinicName}`);
  lines.push(`Дата: ${validated.date}`);
  lines.push("--------------------------------------------------");
  lines.push(
    `Всего приёмов: ${totalAppointments} (подтверждено: ${confirmedAppointments}, отмен/неявок: ${cancelledOrNoShow})`
  );
  lines.push(`Первичных пациентов: ${primaryPatientsCount}`);
  const rublesEst = (totalEstimatedRevenueKopecks / 100).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
  });
  lines.push(`Ожидаемая выручка по смете: ${rublesEst} руб.`);

  if (redSomaticAlerts.length > 0) {
    lines.push("");
    lines.push(`КРИТИЧЕСКИЕ ПРЕДУПРЕЖДЕНИЯ (СОМАТИКА / АЛЛЕРГИЯ) [${redSomaticAlerts.length}]:`);
    for (const r of redSomaticAlerts) {
      lines.push(
        `* ${r.time} | ${r.patientName} (${r.chairName}, врач: ${r.doctorName}) -> ${r.alerts.join("; ")}`
      );
    }
  } else {
    lines.push("");
    lines.push("Критических соматических предупреждений на сегодня нет.");
  }

  lines.push("");
  lines.push("ЗАГРУЗКА КРЕСЕЛ И КАБИНЕТОВ:");
  for (const c of chairDistribution) {
    lines.push(
      `* ${c.chairName}: ${c.appointmentCount} приёмов, ${c.totalMinutes} мин. (загрузка ${c.loadFactorPercent}%)`
    );
  }

  lines.push("");
  lines.push("ЗАДАЧИ АДМИНИСТРАТОРА И РЕКОЛЛ:");
  lines.push(`* Просроченных диспансерных осмотров (реколл): ${validated.overdueRecallsCount}`);
  lines.push(`* Отправленных смет без ответа пациента: ${validated.unansweredBudgetsCount}`);
  lines.push("==================================================");

  return MorningDoctorBriefingSummarySchema.parse({
    date: validated.date,
    clinicName: validated.clinicName,
    totalAppointments,
    confirmedAppointments,
    cancelledOrNoShow,
    primaryPatientsCount,
    totalEstimatedRevenueKopecks,
    chairDistribution,
    redSomaticAlerts,
    overdueRecallsCount: validated.overdueRecallsCount,
    unansweredBudgetsCount: validated.unansweredBudgetsCount,
    plainTextBriefing: lines.join("\n"),
  });
}

// ============================================================================
// 5. IMPLEMENTATION: CANCELLATION GAP RECOVERY
// ============================================================================

/**
 * Evaluates recall and waitlist candidates to fill an open appointment gap.
 * Scores candidates deterministically based on priority, overdue urgency,
 * doctor preference, and contact responsiveness.
 */
export function recoverCancellationGap(
  input: CancellationGapRecoveryInput
): CancellationGapRecoveryResult {
  const validated = CancellationGapRecoveryInputSchema.parse(input);
  const slot = validated.cancelledSlot;

  // Determine slot time of day
  const hourStr = slot.startTime.split(":")[0] ?? "12";
  const hour = parseInt(hourStr, 10);
  let slotTimeOfDay: "morning" | "afternoon" | "evening" = "afternoon";
  if (hour < 12) slotTimeOfDay = "morning";
  else if (hour >= 17) slotTimeOfDay = "evening";

  const scored: ScoredCandidate[] = [];

  for (const cand of validated.recallCandidates) {
    let score = 0;
    const reasons: string[] = [];

    // 1. Clinical Priority (max 40 pts)
    if (cand.priority === "high") {
      score += 40;
      reasons.push("Высокий клинический приоритет");
    } else if (cand.priority === "medium") {
      score += 25;
      reasons.push("Средний клинический приоритет");
    } else {
      score += 10;
    }

    // 2. Overdue Urgency (max 30 pts)
    if (cand.daysOverdue >= 60) {
      score += 30;
      reasons.push(`Просрочка осмотра ${cand.daysOverdue} дн.`);
    } else if (cand.daysOverdue >= 30) {
      score += 20;
      reasons.push(`Просрочка осмотра ${cand.daysOverdue} дн.`);
    } else if (cand.daysOverdue > 0) {
      score += 10;
      reasons.push(`Просрочка осмотра ${cand.daysOverdue} дн.`);
    }

    // 3. Preferred Doctor Match (max 15 pts)
    if (cand.preferredDoctorId && cand.preferredDoctorId === slot.doctorId) {
      score += 15;
      reasons.push(`Совпадение лечащего врача (${slot.doctorName})`);
    }

    // 4. Preferred Time of Day Match (max 10 pts)
    if (cand.preferredTimeOfDay === "any" || cand.preferredTimeOfDay === slotTimeOfDay) {
      score += 10;
      reasons.push(`Подходит время приёма (${slot.startTime})`);
    }

    // 5. Positive Contact Responsiveness / Balance (max 5 pts)
    if (cand.lastContactOutcome === "call_back_later") {
      score += 5;
      reasons.push("Пациент просил перезвонить при наличии окна");
    } else if (cand.lastContactOutcome === "refused") {
      score = Math.max(0, score - 25);
      reasons.push("Недавний отказ от записи");
    }

    if (cand.familyBalanceKopecks > 0) {
      score += 5;
      reasons.push("Положительный авансовый баланс");
    }

    const finalScore = Math.min(100, Math.max(0, score));
    const matchReason = reasons.join("; ");
    const bookingRecommendation = `Предложить пациенту ${cand.patientName} (${cand.patientPhone}) слот ${slot.date} ${slot.startTime}-${slot.endTime} к врачу ${slot.doctorName} (${slot.chairName}) на процедуру: ${cand.recommendedProcedure}`;

    scored.push({
      patientId: cand.patientId,
      patientName: cand.patientName,
      patientPhone: cand.patientPhone,
      recommendedProcedure: cand.recommendedProcedure,
      priority: cand.priority,
      daysOverdue: cand.daysOverdue,
      score: finalScore,
      matchReason,
      bookingRecommendation,
    });
  }

  // Sort descending by score, then by days overdue
  scored.sort((a, b) => b.score - a.score || b.daysOverdue - a.daysOverdue);

  const topCandidates = scored.slice(0, validated.maxCandidates);
  const topCandidate = topCandidates.length > 0 ? topCandidates[0] : null;

  // Build Russian summary
  const summaryLines: string[] = [];
  summaryLines.push("ПОДБОР ПАЦИЕНТОВ В ОСВОБОДИВШЕЕСЯ ОКНО (GAP RECOVERY)");
  summaryLines.push(
    `Окно: ${slot.date} ${slot.startTime}–${slot.endTime} (${slot.durationMinutes} мин.) | Врач: ${slot.doctorName} | ${slot.chairName}`
  );
  summaryLines.push("--------------------------------------------------");

  if (topCandidates.length === 0) {
    summaryLines.push("Подходящих кандидатов в базе реколла не найдено.");
  } else {
    summaryLines.push(`Найдено подходящих кандидатов: ${topCandidates.length}`);
    topCandidates.forEach((c, idx) => {
      summaryLines.push(
        `${idx + 1}. [${c.score} баллов] ${c.patientName} (${c.patientPhone})`
      );
      summaryLines.push(`   Процедура: ${c.recommendedProcedure} | Приоритет: ${c.priority}`);
      summaryLines.push(`   Обоснование: ${c.matchReason}`);
    });
    if (topCandidate) {
      summaryLines.push("");
      summaryLines.push(
        `РЕКОМЕНДАЦИЯ: Позвонить пациенту ${topCandidate.patientName} (${topCandidate.patientPhone}) и предложить запись.`
      );
    }
  }
  summaryLines.push("==================================================");

  return CancellationGapRecoveryResultSchema.parse({
    gapSlot: slot,
    scoredCandidates: topCandidates,
    topCandidate,
    summaryRu: summaryLines.join("\n"),
  });
}

// ============================================================================
// 6. IMPLEMENTATION: 0-CLICK PRE-APPOINTMENT SUMMARY
// ============================================================================

/**
 * Calculates patient age from birthDate.
 */
function calculateAge(birthDateStr?: string): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Generates an instant 0-click chairside clinical briefing for the doctor
 * before the patient sits down.
 */
export function generatePreAppointmentSummary(
  input: PreAppointmentSummaryInput
): PreAppointmentSummary {
  const v = PreAppointmentSummaryInputSchema.parse(input);
  const p = v.patient;
  const a = v.appointment;
  const s = v.somaticHistory;
  const d = v.dentalHistory;
  const f = v.financialStatus;

  const age = calculateAge(p.birthDate);
  const criticalAlerts: string[] = [];

  for (const alert of s.alerts) {
    criticalAlerts.push(`[ВНИМАНИЕ: ${alert.toUpperCase()}]`);
  }
  if (s.isPregnant) {
    criticalAlerts.push("[БЕРЕМЕННОСТЬ: ограничение рентгенографии и анестетиков]");
  }
  if (s.chronicDiseases.length > 0) {
    criticalAlerts.push(`[СОМАТИКА: ${s.chronicDiseases.join(", ").toUpperCase()}]`);
  }

  // Clinical pre-brief text
  const clinicalBriefParts: string[] = [];
  clinicalBriefParts.push(`Запланировано: ${a.procedure} (${a.durationMinutes} мин.).`);
  if (d.treatedTeeth.length > 0) {
    clinicalBriefParts.push(`Леченые зубы: ${d.treatedTeeth.join(", ")}.`);
  }
  if (d.implants.length > 0) {
    clinicalBriefParts.push(`Имплантаты: ${d.implants.join(", ")}.`);
  }
  if (d.missingTeeth.length > 0) {
    clinicalBriefParts.push(`Отсутствуют: ${d.missingTeeth.join(", ")}.`);
  }
  if (d.perioStateSummary) {
    clinicalBriefParts.push(`Пародонт: ${d.perioStateSummary}.`);
  }
  if (s.medications.length > 0) {
    clinicalBriefParts.push(`Постоянный приём лекарств: ${s.medications.join(", ")}.`);
  }

  // Financial pre-brief text
  const balanceRub = (f.balanceKopecks / 100).toFixed(2);
  const planRub = (f.openTreatmentPlanAmountKopecks / 100).toFixed(2);
  let financialBrief = `Баланс пациента: ${balanceRub} руб.`;
  if (f.balanceKopecks < 0) {
    financialBrief += ` (ЗАДОЛЖЕННОСТЬ: ${Math.abs(f.balanceKopecks / 100).toFixed(2)} руб.)`;
  } else if (f.balanceKopecks > 0) {
    financialBrief += ` (АВАНС: ${balanceRub} руб.)`;
  }
  if (f.openTreatmentPlanAmountKopecks > 0) {
    financialBrief += ` | Открытый план лечения: ${planRub} руб.`;
  }
  if (f.unacceptedBudgetsCount > 0) {
    financialBrief += ` | Несогласованных смет: ${f.unacceptedBudgetsCount}`;
  }

  // Suggested actions
  const suggestedActions: string[] = [];
  if (d.lastXRayDate) {
    const lastXRay = new Date(d.lastXRayDate);
    const monthsAgo = Math.floor(
      (Date.now() - lastXRay.getTime()) / (1000 * 60 * 60 * 24 * 30.5)
    );
    if (monthsAgo >= 12) {
      suggestedActions.push(
        `Контрольная рентгенография/КТ (последний снимок сделан ${monthsAgo} мес. назад: ${d.lastXRayDate})`
      );
    }
  } else {
    suggestedActions.push("Первичный прицельный снимок или КТ (в карте нет данных)");
  }

  const overdueRecall = v.activeRecalls.find((r) => r.isOverdue);
  if (overdueRecall) {
    suggestedActions.push(
      `Провести диспансерный осмотр: ${overdueRecall.procedure} (срок был ${overdueRecall.dueDate})`
    );
  }

  suggestedActions.push("Заполнить электронный дневник 043/у по протоколу СтАР");

  // Format clean print/display text
  const textLines: string[] = [];
  textLines.push("ПРЕДВАРИТЕЛЬНАЯ СВОДКА ПЕРЕД ПРИЁМОМ (0-CLICK PRE-APPOINTMENT BRIEF)");
  textLines.push(`Пациент: ${p.name}${age !== null ? `, ${age} лет` : ""}`);
  textLines.push(`Приём: ${a.date} в ${a.time} | Врач: ${a.doctorName} (${a.chairName})`);
  textLines.push("--------------------------------------------------");
  if (criticalAlerts.length > 0) {
    textLines.push(`ФЛАГИ БЕЗОПАСНОСТИ: ${criticalAlerts.join(" ")}`);
  } else {
    textLines.push("Флаги безопасности: противопоказаний и аллергий не зафиксировано.");
  }
  textLines.push(`Клинический статус: ${clinicalBriefParts.join(" ")}`);
  textLines.push(`Финансы: ${financialBrief}`);
  textLines.push("Рекомендуемые действия у кресла:");
  for (const act of suggestedActions) {
    textLines.push(`* ${act}`);
  }
  textLines.push("==================================================");

  return PreAppointmentSummarySchema.parse({
    patientId: p.id,
    patientName: p.name,
    ageYears: age,
    todayAppointmentTime: a.time,
    chairAndDoctor: `${a.chairName} / ${a.doctorName}`,
    criticalAlerts,
    clinicalPreBrief: clinicalBriefParts.join(" "),
    financialPreBrief: financialBrief,
    suggestedActions,
    printCleanText: textLines.join("\n"),
  });
}
