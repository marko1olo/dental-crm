/**
 * DENTE Dental CRM — Smart Sequential Visits & Multi-Stage Clinical Protocols Engine
 *
 * Клинический инвариант:
 * 1. 1-клик быстрое смарт-копирование повторных визитов для многоэтапного стоматологического лечения:
 *    - Эндодонтия этап 1 -> этап 2 (обтурация) через 7-14 дней
 *    - Хирургия / Имплантация -> снятие швов через 10-14 дней
 *    - Ортодонтия -> активация аппаратуры / замена дуги через 21-28 дней
 *    - Имплантация -> ортопедический этап (коронка/слепки) через 3 мес (90 дней)
 *    - Контрольный осмотр / пришлифовка через 7 дней
 * 2. Наследование контекста приёма:
 *    - ID пациента, номер зуба (FDI 11..48), диагноз МКБ-10, лечащий врач, кабинет/кресло.
 * 3. O(1) квантовый подбор времени через ScheduleQuantumCollisionIndex:
 *    - Поиск свободного 15-мин квантованного слота без коллизий врача, кресла и пациента.
 * 4. Автономия врача (Мандат 8e):
 *    - 0 блокирующих модалок, мгновенное создание с 5-секундным Rollback Toast (Gmail Undo Stack).
 */

import type { Appointment } from "@dental/shared";
import {
  CLINIC_DAY_END_MINUTES,
  CLINIC_DAY_START_MINUTES,
  formatMinutesToTime,
  parseTimeToMinutes,
  ScheduleQuantumCollisionIndex,
  snapMinutesTo15Min,
} from "./grid/scheduleQuantumEngine";
import { showRollbackToast, showToast } from "../GlobalToast";

import {
  type SmartClinicalProtocolKey,
  type SmartClinicalProtocol,
  type RepeatIntervalPreset,
  REPEAT_INTERVAL_PRESETS,
  SMART_CLINICAL_PROTOCOLS,
  detectRecommendedProtocol,
} from "./smartSequentialProtocols";

export {
  type SmartClinicalProtocolKey,
  type SmartClinicalProtocol,
  type RepeatIntervalPreset,
  REPEAT_INTERVAL_PRESETS,
  SMART_CLINICAL_PROTOCOLS,
  detectRecommendedProtocol,
};

/**
 * Форматирует дату YYYY-MM-DD
 */
export function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Форматирует дату для отображения врачу: "15 мар (Ср)"
 */
export function formatRuDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-").map(Number);
    const d = new Date(parts[0]!, parts[1]! - 1, parts[2]!);
    const months = [
      "янв", "фев", "мар", "апр", "май", "июн",
      "июл", "авг", "сен", "окт", "ноя", "дек",
    ];
    const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    return `${d.getDate()} ${months[d.getMonth()]} (${weekdays[d.getDay()]})`;
  } catch {
    return dateStr;
  }
}

export interface SmartNextStageSlotResult {
  targetDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  startsAtIso: string;
  endsAtIso: string;
  isAlternativeTime: boolean;
  intervalDaysUsed: number;
}

/**
 * O(1) поиск идеального свободного квантованного слота для следующего этапа.
 * Учитывает занятость кресла, врача и пациента, сдвигает время при коллизии.
 */
export function findSmartNextStageSlot(options: {
  baseDate: Date | string;
  preferredTime?: string | null | undefined;
  protocol: SmartClinicalProtocol;
  existingAppointments?: readonly Appointment[] | undefined;
  chairId?: string | null | undefined;
  doctorUserId?: string | null | undefined;
  patientId?: string | null | undefined;
  customIntervalDays?: number | undefined;
}): SmartNextStageSlotResult {
  const {
    baseDate,
    preferredTime,
    protocol,
    existingAppointments = [],
    chairId,
    doctorUserId,
    patientId,
    customIntervalDays,
  } = options;

  const originDate = typeof baseDate === "string" ? new Date(baseDate) : new Date(baseDate.getTime());
  const intervalDays = customIntervalDays ?? protocol.defaultIntervalDays;

  // Исходное предпочтительное время (например время текущего приёма)
  let initialTime = preferredTime;
  if (!initialTime) {
    if (typeof baseDate === "string" && baseDate.includes("T")) {
      initialTime = baseDate.slice(11, 16);
    } else {
      const h = String(originDate.getHours()).padStart(2, "0");
      const m = String(originDate.getMinutes()).padStart(2, "0");
      initialTime = `${h}:${m}`;
    }
  }

  // Квантование времени к ближайшему 15-мин интервалу
  const initialMinutes = parseTimeToMinutes(initialTime);
  const quantizedInitialMinutes = snapMinutesTo15Min(initialMinutes);
  const preferredSlotTime = formatMinutesToTime(quantizedInitialMinutes);
  const duration = protocol.durationMinutes;

  // Кандидаты дат для поиска: целевая дата, затем +1, -1, +2 дня в пределах диапазона
  const dateDeltas = [0, 1, -1, 2, -2];
  
  for (const delta of dateDeltas) {
    const candidateDays = intervalDays + delta;
    if (
      candidateDays < protocol.allowedIntervalDaysRange[0] ||
      candidateDays > protocol.allowedIntervalDaysRange[1]
    ) {
      // Выход за пределы медицинского клинического протокола
      continue;
    }

    const targetDateObj = new Date(originDate.getTime() + candidateDays * 24 * 60 * 60 * 1000);
    // Пропускаем воскресенье (день недели 0)
    if (targetDateObj.getDay() === 0) {
      continue;
    }

    const dateKey = formatDateIso(targetDateObj);

    // Фильтруем записи только на целевую дату для индекса
    const dayAppointments = existingAppointments.filter((a) => {
      if (!a.startsAt) return false;
      return a.startsAt.startsWith(dateKey);
    });

    const index = new ScheduleQuantumCollisionIndex({
      dateKey,
      appointments: dayAppointments,
    });

    // 1. Проверяем предпочтительное время
    const collisionAtPreferred = index.checkCollision({
      chairId: chairId ?? null,
      doctorUserId: doctorUserId ?? null,
      patientId: patientId ?? null,
      slotHour: preferredSlotTime,
      durationMinutes: duration,
    });

    if (!collisionAtPreferred.hasCollision) {
      const startMin = quantizedInitialMinutes;
      const endMin = startMin + duration;
      const startStr = formatMinutesToTime(startMin);
      const endStr = formatMinutesToTime(endMin);
      return {
        targetDate: dateKey,
        startTime: startStr,
        endTime: endStr,
        startsAtIso: `${dateKey}T${startStr}:00.000Z`,
        endsAtIso: `${dateKey}T${endStr}:00.000Z`,
        isAlternativeTime: delta !== 0,
        intervalDaysUsed: candidateDays,
      };
    }

    // 2. Если предпочтительное занято - ищем ближайшее свободное окно в этот же день
    const nearest = index.findNearestFreeWindow({
      chairId: chairId ?? null,
      doctorUserId: doctorUserId ?? null,
      patientId: patientId ?? null,
      startingHour: preferredSlotTime,
      durationMinutes: duration,
    });

    if (nearest) {
      const sHour = nearest.startsAt.slice(11, 16);
      const eHour = nearest.endsAt.slice(11, 16);
      return {
        targetDate: dateKey,
        startTime: sHour,
        endTime: eHour,
        startsAtIso: nearest.startsAt,
        endsAtIso: nearest.endsAt,
        isAlternativeTime: true,
        intervalDaysUsed: candidateDays,
      };
    }
  }

  // Fallback: если всё плотно забито, возвращаем точную целевую дату с предпочтительным временем
  const fallbackDateObj = new Date(originDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  const fallbackDateKey = formatDateIso(fallbackDateObj);
  const startMin = quantizedInitialMinutes;
  const endMin = startMin + duration;
  const startStr = formatMinutesToTime(startMin);
  const endStr = formatMinutesToTime(endMin);

  return {
    targetDate: fallbackDateKey,
    startTime: startStr,
    endTime: endStr,
    startsAtIso: `${fallbackDateKey}T${startStr}:00.000Z`,
    endsAtIso: `${fallbackDateKey}T${endStr}:00.000Z`,
    isAlternativeTime: false,
    intervalDaysUsed: intervalDays,
  };
}

export interface CreateSmartSequentialAppointmentParams {
  parentAppointment: {
    id: string;
    patientId: string;
    doctorUserId?: string | null;
    chairId?: string | null;
    startsAt?: string | null;
    toothNumber?: number | null;
    diagnosisMkb10?: string | null;
    reason?: string | null;
    clinicalStage?: string | null;
    stageIndex?: number | null;
  };
  protocolKey: SmartClinicalProtocolKey;
  existingAppointments?: readonly Appointment[];
  customIntervalDays?: number;
  onSuccess?: (createdAppointment: any) => void;
  onRollback?: (cancelledAppointmentId: string) => void;
  apiUrlPrefix?: string;
}

/**
 * 1-клик создание следующего этапа визита с мгновенным Rollback Toast на 5 секунд.
 * Не блокирует экран, не открывает модалки.
 */
export async function createSmartSequentialAppointment(
  params: CreateSmartSequentialAppointmentParams,
): Promise<{ success: boolean; appointment?: any; error?: string }> {
  const {
    parentAppointment,
    protocolKey,
    existingAppointments = [],
    customIntervalDays,
    onSuccess,
    onRollback,
    apiUrlPrefix = "",
  } = params;

  const protocol = SMART_CLINICAL_PROTOCOLS[protocolKey];
  if (!protocol) {
    showToast("Неизвестный клинический протокол", "error");
    return { success: false, error: "Unknown protocol" };
  }

  // Вычисляем оптимальный квантованный слот
  const baseDate = parentAppointment.startsAt || new Date().toISOString();
  const slot = findSmartNextStageSlot({
    baseDate,
    protocol,
    existingAppointments,
    chairId: parentAppointment.chairId ?? null,
    doctorUserId: parentAppointment.doctorUserId ?? null,
    patientId: parentAppointment.patientId,
    ...(customIntervalDays !== undefined ? { customIntervalDays } : {}),
  });

  const nextStageIndex = (parentAppointment.stageIndex ?? 1) + 1;
  const toothBadge = parentAppointment.toothNumber
    ? `Зуб ${parentAppointment.toothNumber}`
    : null;

  const reasonTitle = [
    protocol.shortLabel,
    toothBadge,
    parentAppointment.diagnosisMkb10 ? `[${parentAppointment.diagnosisMkb10}]` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const payload = {
    patientId: parentAppointment.patientId,
    doctorUserId: parentAppointment.doctorUserId,
    chairId: parentAppointment.chairId,
    startsAt: slot.startsAtIso,
    endsAt: slot.endsAtIso,
    stageIndex: nextStageIndex,
    clinicalStage: protocol.nextStageName,
    intervalDays: slot.intervalDaysUsed,
    durationMinutes: protocol.durationMinutes,
    toothNumber: parentAppointment.toothNumber ?? null,
    diagnosisMkb10: parentAppointment.diagnosisMkb10 ?? null,
    reason: reasonTitle,
    comment: `Создано в 1 клик по протоколу «${protocol.title}» из визита ${parentAppointment.id}`,
  };

  const isDemoOrOffline =
    typeof window !== "undefined" &&
    (window.location.search.includes("demo=true") ||
      window.localStorage?.getItem("dente_demo_showcase") === "true" ||
      window.localStorage?.getItem("dente_offline_autonomy_mode") === "true");

  try {
    const url = `${apiUrlPrefix}/api/appointments/${parentAppointment.id}/next-stage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let created: any;
    if (!res.ok) {
      if (isDemoOrOffline) {
        created = { id: `stage-${Date.now()}`, status: "planned", ...payload };
      } else {
        const errData = await res.json().catch(() => ({}));
        let message = errData?.message || "Не удалось запланировать следующий этап";
        if (Array.isArray(errData?.suggestedSlots) && errData.suggestedSlots.length > 0) {
          message += ` (свободно: ${errData.suggestedSlots.slice(0, 3).join(", ")})`;
        }
        showToast(message, "error");
        return { success: false, error: message };
      }
    } else {
      const data = await res.json();
      created = data?.appointment || data;
    }

    onSuccess?.(created);
    const dateFormatted = formatRuDate(slot.targetDate);
    const toastText = `Визит на 2-й этап («${protocol.shortLabel}») создан на ${dateFormatted} в ${slot.startTime}`;

    showRollbackToast(
      toastText,
      async () => {
        try {
          const rollbackUrl = `${apiUrlPrefix}/api/appointments/${created.id}/status`;
          const undoRes = await fetch(rollbackUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "cancelled", reason: "Отмена врачом (Undo)" }),
          });
          if (undoRes.ok || isDemoOrOffline) {
            showToast("Визит успешно отменен", "info");
            onRollback?.(created.id);
          } else {
            showToast("Не удалось отменить запись", "warning");
          }
        } catch {
          showToast("Сетевая ошибка при отмене", "error");
        }
      },
      5000,
      "Отменить",
    );

    return { success: true, appointment: created };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Ошибка создания визита";
    showToast(msg, "error");
    return { success: false, error: msg };
  }
}

export function createRepeatVisitByDays(
  parentAppointment: CreateSmartSequentialAppointmentParams["parentAppointment"],
  days: 3 | 7 | 14 | 180,
  options?: Partial<CreateSmartSequentialAppointmentParams>
) {
  const map: Record<number, SmartClinicalProtocolKey> = {
    3: "interval_3d",
    7: "interval_7d",
    14: "interval_14d",
    180: "interval_6m",
  };
  const key = map[days] || "interval_7d";
  return createSmartSequentialAppointment({
    parentAppointment,
    protocolKey: key,
    customIntervalDays: days,
    ...options,
  });
}

