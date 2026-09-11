/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL RADIOLOGY & CBCT: SURGICAL GUIDE VALIDATION ENGINE (WAVE 127)
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical engine for 3D-printing and drill-safety validation
 * of dental surgical navigation guides:
 *
 *  1. Housing wall thickness check (MIN_WALL_MM = 1.0 mm for SLA/DLP resins).
 *  2. Guided-bur drill channel diameter verification (MIN_DRILL_MM = 1.8 mm).
 *  3. Inter-channel fragile web thickness (MIN_WALL_MM = 1.0 mm) between adjacent
 *     drill cylinders taking bur overshoot into account.
 *  4. Drill trajectory overshoot safety verification (DRILL_OVERSHOOT_MM = 2.0 mm):
 *     calculates clearance from extended bur path [entry -> apex + overshoot]
 *     to inferior alveolar nerve (IAN) canal and maxillary sinus floor polylines.
 *  5. A4 clinical validation protocol generator (100% emoji-free per Mandate 8d #7).
 *
 * Adapted from DenCT core/guideValidate.ts reference.
 * 100% pure TypeScript, zero DOM/VTK/WASM dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { Vec3 } from "./cprMath.js";
import { distSegmentToPolyline3 } from "./cbctSafetyEngine.js";

export type { Vec3 };
export type Polyline3D = Vec3[];

/** Minimum printable wall thickness (mm) for typical SLA/DLP dental resin. */
export const MIN_WALL_MM = 1.0;

/** Smallest sensible guided-drill bur diameter (mm). */
export const MIN_DRILL_MM = 1.8;

/** Standard clinical extra depth (mm) the surgical drill bur travels past the implant apex. */
export const DRILL_OVERSHOOT_MM = 2.0;

// ── Zod Schemas & Types ──────────────────────────────────────────

export const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export const polyline3DSchema = z.array(vec3Schema);

/**
 * Planned implant definition for surgical guide validation.
 */
export const guideCheckImplantSchema = z.object({
  /** Optional identifier of the planned implant (e.g. tooth FDI or fixture ID) */
  id: z.string().optional(),
  /** Coronal platform bone entry point coordinates [X, Y, Z] in mm */
  entry: vec3Schema,
  /** Unit vector directed along the apical insertion axis (entry -> apex) */
  axis: vec3Schema,
  /** Implant fixture body length in mm */
  length: z.number().positive(),
  /** Outer diameter of the guide metal sleeve cylinder in mm */
  sleeveDiameter: z.number().positive(),
  /** Offset distance from implant platform to bottom of sleeve along axis in mm */
  sleeveOffset: z.number().nonnegative(),
  /** Metal sleeve cylinder height along axis in mm */
  sleeveHeight: z.number().positive(),
});

export type GuideCheckImplant = z.infer<typeof guideCheckImplantSchema>;

/**
 * Surgical guide template manufacturing and design parameters.
 */
export const guideParamsSchema = z.object({
  /** Outer resin wall thickness around guide sleeve housings in mm */
  wallMm: z.number().positive(),
  /** Flag indicating presence of a mechanical stop shoulder (seat) for sleeve */
  sleeveSeat: z.boolean(),
  /** Metal guide sleeve bushing wall thickness in mm */
  sleeveWallMm: z.number().nonnegative(),
  /** Radial clearance / tolerance of the drill guide channel in mm */
  channelTolMm: z.number().nonnegative(),
  /** Optional base bar cross-section width in mm */
  baseWidthMm: z.number().positive().optional(),
  /** Optional base bar cross-section height along Z in mm */
  baseHeightMm: z.number().positive().optional(),
  /** Optional radial clearance for metal sleeve fit in mm */
  seatClearanceMm: z.number().nonnegative().optional(),
  /** Optional angular resolution segments */
  segments: z.number().int().positive().optional(),
});

export type GuideParams = z.infer<typeof guideParamsSchema>;

/** Standard clinical defaults for 3D surgical drill guides */
export const DEFAULT_GUIDE_PARAMS: GuideParams = {
  wallMm: 1.5,
  sleeveSeat: true,
  sleeveWallMm: 0.9,
  channelTolMm: 0.1,
  baseWidthMm: 5.0,
  baseHeightMm: 4.0,
  seatClearanceMm: 0.05,
  segments: 48,
};

export const GUIDE_DEFAULTS = DEFAULT_GUIDE_PARAMS;

export const guideIssueSeveritySchema = z.enum(["error", "warning"]);
export type GuideIssueSeverity = z.infer<typeof guideIssueSeveritySchema>;

/**
 * Single safety or printability issue detected during surgical guide validation.
 */
export const guideIssueSchema = z.object({
  /** Issue code: 'thinWall' | 'narrowChannel' | 'thinWeb' | 'drillHitsNerve' | 'drillHitsSinus' */
  code: z.string(),
  /** Severity level: 'error' (blocking) or 'warning' (clinical precaution) */
  severity: guideIssueSeveritySchema,
  /** Clinical description in Russian */
  messageRu: z.string(),
  /** Formatted measured clearance or dimension in mm */
  detail: z.string().optional(),
  /** Primary implant identifier associated with the issue */
  implantId: z.string().optional(),
  /** Secondary implant identifier for pair-wise proximity or web issues */
  pairImplantId: z.string().optional(),
});

export type GuideIssue = z.infer<typeof guideIssueSchema>;

/**
 * Traced anatomical landmark polyline (e.g. mandibular nerve, maxillary sinus floor).
 */
export const anatomyMarkerSchema = z.object({
  id: z.string(),
  type: z.enum(["nerve", "sinus"]),
  radius: z.number().positive(),
  points: z.array(vec3Schema),
  name: z.string().optional(),
  color: z.string().optional(),
  visible: z.boolean().optional(),
});

export type AnatomyMarker = z.infer<typeof anatomyMarkerSchema>;

/**
 * Complete input payload for surgical drill guide validation.
 */
export const guideCheckInputSchema = z.object({
  implants: z.array(guideCheckImplantSchema),
  params: guideParamsSchema,
  anatomy: z.array(anatomyMarkerSchema).optional(),
  thresholds: z
    .object({
      nerve: z.number().nonnegative(),
      sinus: z.number().nonnegative(),
    })
    .optional(),
});

export type GuideCheckInput = z.infer<typeof guideCheckInputSchema>;

// ── Math & Geometric Helpers ─────────────────────────────────────

/** Format number with 1 decimal digit */
export const f1 = (x: number): string => (Math.round(x * 10) / 10).toFixed(1);

/**
 * Computes 3D point along implant axis at distance t from coronal entry point.
 */
export function atPoint(imp: GuideCheckImplant, t: number): Vec3 {
  return [
    imp.entry[0] + imp.axis[0] * t,
    imp.entry[1] + imp.axis[1] * t,
    imp.entry[2] + imp.axis[2] * t,
  ];
}

/**
 * Computes inner drill-channel radius for an implant, honoring sleeve-seat mode.
 */
export function drillRadius(
  imp: GuideCheckImplant,
  params: GuideParams,
): number {
  if (params.sleeveSeat) {
    const innerD = Math.max(0.5, imp.sleeveDiameter - 2 * params.sleeveWallMm);
    return innerD / 2 + params.channelTolMm;
  }
  return (imp.sleeveDiameter + params.channelTolMm) / 2;
}

// ── Validation Engine ────────────────────────────────────────────

/**
 * Validates a surgical drill guide plan for 3D-printing viability, drill bur diameter,
 * inter-channel web thickness, and anatomical overshoot clearance.
 *
 * Returns issues sorted with 'error' first, then 'warning'.
 * An empty array signifies complete clearance and printability.
 */
export function validateGuide(input: GuideCheckInput): GuideIssue[] {
  const { implants, params } = input;
  const thr = input.thresholds ?? { nerve: 2.0, sinus: 1.0 };
  const issues: GuideIssue[] = [];

  // 1. Sleeve housing resin wall thickness check (radial resin around sleeve seat)
  if (params.wallMm < MIN_WALL_MM) {
    issues.push({
      code: "thinWall",
      severity: "warning",
      messageRu: `Толщина стенки шаблона (${f1(params.wallMm)} мм) меньше технологического минимума для 3D-печати (${f1(MIN_WALL_MM)} мм)`,
      detail: `${f1(params.wallMm)} мм`,
    });
  }

  // 2. Drill channel diameter check for guided burs
  for (const imp of implants) {
    const d = drillRadius(imp, params) * 2;
    if (d < MIN_DRILL_MM) {
      issues.push({
        code: "narrowChannel",
        severity: "warning",
        messageRu: `Диаметр направляющего канала (${f1(d)} мм) меньше минимального диаметра хирургического сверла (${f1(MIN_DRILL_MM)} мм)`,
        detail: `${f1(d)} мм`,
        ...(imp.id ? { implantId: imp.id } : {}),
      });
      break; // One summary note is sufficient
    }
  }

  // 3. Inter-channel web thickness check between adjacent drill shafts
  // Each drill runs from entry to apex (+ DRILL_OVERSHOOT_MM). If the gap
  // between two expanded drill cylinders is below MIN_WALL_MM, the printed
  // resin wall is fragile or intersecting.
  for (let i = 0; i < implants.length; i++) {
    for (let j = i + 1; j < implants.length; j++) {
      const A = implants[i]!;
      const B = implants[j]!;
      const aTip = atPoint(A, A.length + DRILL_OVERSHOOT_MM);
      const bTip = atPoint(B, B.length + DRILL_OVERSHOOT_MM);
      const centerDist = distSegmentToPolyline3(A.entry, aTip, [B.entry, bTip]);
      const gap =
        centerDist - drillRadius(A, params) - drillRadius(B, params);

      if (gap < MIN_WALL_MM) {
        issues.push({
          code: "thinWeb",
          severity: "error",
          messageRu:
            gap < 0
              ? `Пересечение сверлильных каналов имплантатов (коллизия на ${f1(-gap)} мм)`
              : `Недостаточная толщина перемычки между каналами сверления (${f1(gap)} мм < ${f1(MIN_WALL_MM)} мм)`,
          detail: `${f1(Math.max(0, gap))} мм`,
          ...(A.id ? { implantId: A.id } : {}),
          ...(B.id ? { pairImplantId: B.id } : {}),
        });
      }
    }
  }

  // 4. Drill overshoot anatomy collision check
  // The drill bur penetrates length + DRILL_OVERSHOOT_MM into bone.
  // Evaluate extended bur trajectory [entry -> apex + overshoot] against
  // anatomical markers (inferior alveolar nerve, maxillary sinus floor).
  const markers = (input.anatomy ?? []).filter(
    (m) => m.points && m.points.length > 0,
  );

  for (const imp of implants) {
    const tip = atPoint(imp, imp.length + DRILL_OVERSHOOT_MM);
    const dr = drillRadius(imp, params);
    for (const m of markers) {
      const clearance =
        distSegmentToPolyline3(imp.entry, tip, m.points) - m.radius - dr;
      const limit = m.type === "nerve" ? thr.nerve : thr.sinus;
      if (clearance < limit) {
        if (m.type === "nerve") {
          issues.push({
            code: "drillHitsNerve",
            severity: "error",
            messageRu:
              clearance < 0
                ? `Прямая коллизия сверла с нижнечелюстным нервом (внедрение ${f1(-clearance)} мм)`
                : `Траектория сверла опасно близко к нижнечелюстному нерву (${f1(clearance)} мм < норма ${f1(thr.nerve)} мм)`,
            detail: `${f1(clearance)} мм`,
            ...(imp.id ? { implantId: imp.id } : {}),
          });
        } else {
          const isError = clearance < 0;
          issues.push({
            code: "drillHitsSinus",
            severity: isError ? "error" : "warning",
            messageRu:
              isError
                ? `Перфорация дна верхнечелюстной пазухи сверлом (выход ${f1(-clearance)} мм)`
                : `Траектория сверла сближается с дном верхнечелюстной пазухи (${f1(clearance)} мм < норма ${f1(thr.sinus)} мм)`,
            detail: `${f1(clearance)} мм`,
            ...(imp.id ? { implantId: imp.id } : {}),
          });
        }
      }
    }
  }

  // Errors first, then warnings; stable within a severity
  return issues.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1,
  );
}

/** Aliases for integration compatibility */
export const validateGuidePlan = validateGuide;
export const validateSurgicalGuide = validateGuide;

// ── Printable Clinical A4 Protocol (0 Emojis, Mandate 8d #7) ──────

export interface GuideValidationProtocolOptions {
  input: GuideCheckInput;
  issues?: GuideIssue[];
  patientName?: string;
  doctorName?: string;
  clinicName?: string;
  date?: string;
}

/**
 * Formats a formal A4-printable surgical guide validation protocol.
 * Strictly compliant with Mandate 8d item 7: zero cartoon emojis, pure clinical typography.
 */
export function formatGuideValidationA4Protocol(
  optionsOrInput: GuideValidationProtocolOptions | GuideCheckInput,
  issuesArg?: GuideIssue[],
  patientNameArg?: string,
  doctorNameArg?: string,
): string {
  let input: GuideCheckInput;
  let issues: GuideIssue[];
  let patientName = "Не указан";
  let doctorName = "Врач-стоматолог хирург-имплантолог";
  let clinicName = "Стоматологическая клиника";
  let dateStr = new Date().toISOString().slice(0, 10);

  if ("input" in optionsOrInput && "params" in optionsOrInput.input) {
    const opts = optionsOrInput as GuideValidationProtocolOptions;
    input = opts.input;
    issues = opts.issues ?? validateGuide(input);
    if (opts.patientName) patientName = opts.patientName.trim();
    if (opts.doctorName) doctorName = opts.doctorName.trim();
    if (opts.clinicName) clinicName = opts.clinicName.trim();
    if (opts.date) dateStr = opts.date.trim();
  } else {
    input = optionsOrInput as GuideCheckInput;
    issues = issuesArg ?? validateGuide(input);
    if (patientNameArg) patientName = patientNameArg.trim();
    if (doctorNameArg) doctorName = doctorNameArg.trim();
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  let statusText = "[ДОПУЩЕНО К 3D-ПЕЧАТИ И КЛИНИЧЕСКОМУ ИСПОЛЬЗОВАНИЮ]";
  if (errors.length > 0) {
    statusText = "[ОТКЛОНЕНО: ОБНАРУЖЕНЫ КРИТИЧЕСКИЕ КОЛЛИЗИИ ИЛИ ОШИБКИ МОДЕЛИРОВАНИЯ]";
  } else if (warnings.length > 0) {
    statusText = "[ТРЕБУЕТСЯ ВНИМАНИЕ: ВЫЯВЛЕНЫ ТЕХНОЛОГИЧЕСКИЕ ПРЕДУПРЕЖДЕНИЯ]";
  }

  const lines: string[] = [
    "================================================================================",
    "             ПРОТОКОЛ ВАЛИДАЦИИ ХИРУРГИЧЕСКОГО НАВИГАЦИОННОГО ШАБЛОНА           ",
    "               (SURGICAL GUIDE 3D-PRINTING & DRILL SAFETY PROTOCOL)             ",
    "================================================================================",
    "",
    `Медицинская организация: ${clinicName}`,
    `Пациент                : ${patientName}`,
    `Лечащий врач-хирург    : ${doctorName}`,
    `Дата формирования      : ${dateStr}`,
    "Нормативный регламент  : Форма 043/у / Номенклатура 804н / Предоперационное 3D-планирование",
    "",
    "--------------------------------------------------------------------------------",
    "1. ТЕХНОЛОГИЧЕСКИЕ ПАРАМЕТРЫ ШАБЛОНА (SLA/DLP 3D-PRINTING)",
    "--------------------------------------------------------------------------------",
    `Толщина стенки корпуса шаблона     : ${f1(input.params.wallMm)} мм (норма >= ${f1(MIN_WALL_MM)} мм)`,
    `Конструкция посадочного места      : ${input.params.sleeveSeat ? "Со ступенькой упора (sleeveSeat)" : "Сквозная шахта"}`,
    `Толщина стенки металлической гильзы: ${f1(input.params.sleeveWallMm)} мм`,
    `Радиальный допуск канала сверления : ${f1(input.params.channelTolMm)} мм`,
    `Вылет сверла за апекс имплантата   : +${f1(DRILL_OVERSHOOT_MM)} мм (стандарт клинической безопасности)`,
    `Количество спланированных лож      : ${input.implants.length}`,
    "",
    "--------------------------------------------------------------------------------",
    "2. СПЕЦИФИКАЦИЯ ИМПЛАНТАТОВ И ТРАЕКТОРИЙ СВЕРЛЕНИЯ",
    "--------------------------------------------------------------------------------",
  ];

  if (input.implants.length === 0) {
    lines.push("Имплантаты не добавлены в проект шаблона.");
  } else {
    for (let idx = 0; idx < input.implants.length; idx++) {
      const imp = input.implants[idx]!;
      const label = imp.id ?? `Ложе #${idx + 1}`;
      const dr = drillRadius(imp, input.params);
      const burDiam = dr * 2;
      const tip = atPoint(imp, imp.length + DRILL_OVERSHOOT_MM);
      lines.push(
        `[${label}] Длина: ${f1(imp.length)} мм | Втулка D: ${f1(imp.sleeveDiameter)} мм | Сверло D: ${f1(burDiam)} мм (радиус ${f1(dr)} мм)`,
      );
      lines.push(
        `       Точка входа (Entry): [${f1(imp.entry[0])}, ${f1(imp.entry[1])}, ${f1(imp.entry[2])}] мм`,
      );
      lines.push(
        `       Апекс сверла (+2мм): [${f1(tip[0])}, ${f1(tip[1])}, ${f1(tip[2])}] мм`,
      );
    }
  }

  lines.push("");
  lines.push("--------------------------------------------------------------------------------");
  lines.push("3. РЕЗУЛЬТАТЫ ПРОВЕРКИ БЕЗОПАСНОСТИ И ВЫЯВЛЕННЫЕ ЗАМЕЧАНИЯ");
  lines.push("--------------------------------------------------------------------------------");

  if (issues.length === 0) {
    lines.push("[НЕТ ЗАМЕЧАНИЙ: ШАБЛОН ПОЛНОСТЬЮ БЕЗОПАСЕН И ГОТОВ К 3D-ПЕЧАТИ]");
    lines.push("  - Толщина полимерных стенок достаточна для прецизионной фотополимеризации;");
    lines.push("  - Все диаметры каналов соответствуют калибру направляющих хирургических сверл;");
    lines.push("  - Межимплантатные перемычки устойчивы к механическим нагрузкам при сверлении;");
    lines.push("  - Траектории сверл с учетом вылета 2.0 мм сохраняют безопасную дистанцию до нервов и пазух.");
  } else {
    lines.push(`Всего замечаний: ${issues.length} (Ошибок: ${errors.length}, Предупреждений: ${warnings.length})`);
    lines.push("");
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i]!;
      const tag = issue.severity === "error" ? "[ОШИБКА]" : "[ПРЕДУПРЕЖДЕНИЕ]";
      const impRef = issue.implantId
        ? ` (${issue.implantId}${issue.pairImplantId ? " <-> " + issue.pairImplantId : ""})`
        : "";
      lines.push(`${i + 1}. ${tag} [${issue.code}]${impRef}: ${issue.messageRu}`);
      if (issue.detail) {
        lines.push(`   Измеренное значение: ${issue.detail}`);
      }
    }
  }

  lines.push("");
  lines.push("--------------------------------------------------------------------------------");
  lines.push("4. ИТОГОВЫЙ КЛИНИЧЕСКИЙ ВЕРДИКТ");
  lines.push("--------------------------------------------------------------------------------");
  lines.push(`Статус верификации: ${statusText}`);
  lines.push("");
  if (errors.length > 0) {
    lines.push("Заключение: Обнаружены критические риски (коллизия сверла с анатомическими структурами");
    lines.push("или недопустимое сближение шахт). 3D-печать хирургического шаблона заблокирована до");
    lines.push("ручной корректировки позиции имплантатов или глубины сверления.");
  } else if (warnings.length > 0) {
    lines.push("Заключение: Геометрия шаблона не имеет критических коллизий, но содержит технологические");
    lines.push("предупреждения. Рекомендуется повышенный контроль при печати и примерке шаблона.");
  } else {
    lines.push("Заключение: Хирургический шаблон полностью соответствует критериям клинической безопасности");
    lines.push("и технологическим допускам SLA/DLP 3D-печати. Шаблон одобрен для изготовления.");
  }

  lines.push("");
  lines.push("--------------------------------------------------------------------------------");
  lines.push("5. ВЕРИФИКАЦИЯ И ПОДПИСИ");
  lines.push("--------------------------------------------------------------------------------");
  lines.push("Протокол проверен врачом-стоматологом хирургом-имплантологом в соответствии");
  lines.push("с клиническими рекомендациями Стоматологической Ассоциации России (СтАР).");
  lines.push("");
  lines.push(`Врач-стоматолог хирург-имплантолог: ____________________ / ${doctorName} /`);
  lines.push("");
  lines.push("Ответственный оператор 3D-печати  : ____________________ / ____________________ /");
  lines.push("");
  lines.push("М.П. Клиники");
  lines.push("================================================================================");

  return lines.join("\n");
}
