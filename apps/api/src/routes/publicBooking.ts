import { and, eq, gte, lt, notInArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
  appointments,
  clinics,
  organizations,
  patients,
  users,
} from "../db/schema.js";
/*
 * Перевод слов разборщика в слова человека — ОДИН на весь сервер, рядом с домом
 * текстов отказа по кабинету клиники (utils/clinicSessionRefusal.ts). Этот
 * маршрут — единственное место того класса, обращённое к ПАЦИЕНТУ, а не к
 * сотруднику: пациент, не понявший отказ, не звонит в поддержку, он уходит.
 */
import {
  schemaIssuePhrase,
  schemaRefusalMessage,
} from "../utils/schemaRefusalWords.js";

/**
 * Статусы записей, которые НЕ занимают время в расписании.
 */
const FREED_APPOINTMENT_STATUSES = ["cancelled", "no_show"] as const;

// --- Abuse protection for the public (unauthenticated) booking surface ---
// These endpoints are reachable without any token, so they must be rate limited
// to prevent booking spam and unbounded patient/appointment row creation.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Формат даты: YYYY-MM-DD");

/**
 * Идентификатор клиники из адреса ссылки.
 */
const organizationIdSchema = z.string().uuid();

/**
 * Единый текст про мёртвую ссылку: и в списке врачей, и в свободном времени.
 *
 * Читает его ПАЦИЕНТ, поэтому названа причина (ссылка не ведёт ни к одной
 * клинике) и оба доступных ему действия. Прежнее «Организация не найдена»
 * называло факт без действия, а слово «организация» пациенту вообще ни о чём не
 * говорит: он записывается в клинику.
 */
const CLINIC_LINK_DEAD_MESSAGE =
  "Клиника по этой ссылке не найдена: ссылка на онлайн-запись устарела или скопирована не полностью. Откройте запись заново с сайта клиники или позвоните в клинику, чтобы записаться.";

const DEFAULT_TIMEZONE = "Europe/Samara";
// Fallback working window when a clinic has no configured schedule for the day.
const DEFAULT_OPEN_MINUTE = 9 * 60;
const DEFAULT_CLOSE_MINUTE = 18 * 60;
const DEFAULT_SLOT_MINUTES = 30;

const weekdayKeys = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

interface DaySchedule {
  isWorking: boolean;
  openMinute: number;
  closeMinute: number;
}

function clockToMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number.parseInt(match[1] as string, 10);
  const minutes = Number.parseInt(match[2] as string, 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Resolves the working window (in local minutes-of-day) for a given weekday
 * from the org clinicSchedule blob, e.g.
 *   { monday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" }, ... }.
 * Falls back to a 09:00–18:00 open day when the schedule is missing/invalid.
 */
function resolveDaySchedule(
  clinicSchedule: unknown,
  weekday: number,
): DaySchedule {
  const key = weekdayKeys[weekday];
  const schedule =
    clinicSchedule && typeof clinicSchedule === "object"
      ? (clinicSchedule as Record<string, unknown>)
      : null;
  const day =
    schedule && key && typeof schedule[key] === "object"
      ? (schedule[key] as Record<string, unknown>)
      : null;

  if (!day) {
    const workdayOpen = clockToMinutes(schedule?.workdayStart);
    const workdayClose = clockToMinutes(schedule?.workdayEnd);
    if (
      workdayOpen !== null &&
      workdayClose !== null &&
      workdayClose > workdayOpen
    ) {
      const settingsWorkingDays = Array.isArray(schedule?.workingDays)
        ? (schedule.workingDays as unknown[]).map((value) => Number(value))
        : null;
      return {
        // Пустой список рабочих дней — не «работаем всегда». Схема настроек
        // требует от одного до семи дней, поэтому его отсутствие означает
        // «дни не заданы», и здесь безопаснее Пн–Сб с выходным воскресеньем,
        // как в общем запасе ниже, чем открытая клиника семь дней в неделю.
        isWorking:
          settingsWorkingDays && settingsWorkingDays.length > 0
            ? settingsWorkingDays.includes(weekday)
            : weekday !== 0,
        openMinute: workdayOpen,
        closeMinute: workdayClose,
      };
    }

    // Онбординг (routes/workspaceProfile.ts) сохраняет расписание в другом
    // формате: { workHours: [8, 20], workingDays: [1..5] }. Раньше читатель
    // искал только ключи вида "monday", не находил их НИКОГДА и подставлял
    // 09:00–18:00 на все семь дней — клиника с графиком 8–20 теряла утренние
    // и вечерние часы, а по воскресеньям виджет записывал в закрытую клинику.
    const workHours = schedule?.workHours;
    if (Array.isArray(workHours) && workHours.length === 2) {
      const openHour = Number(workHours[0]);
      const closeHour = Number(workHours[1]);
      const workingDays = Array.isArray(schedule?.workingDays)
        ? (schedule.workingDays as unknown[]).map((value) => Number(value))
        : null;
      if (
        Number.isFinite(openHour) &&
        Number.isFinite(closeHour) &&
        closeHour > openHour
      ) {
        return {
          // Если список рабочих дней не задан, считаем рабочими Пн–Сб,
          // а воскресенье выходным — это безопаснее, чем «открыто всегда».
          isWorking: workingDays
            ? workingDays.includes(weekday)
            : weekday !== 0,
          openMinute: Math.round(openHour * 60),
          closeMinute: Math.round(closeHour * 60),
        };
      }
    }
    return {
      isWorking: weekday !== 0,
      openMinute: DEFAULT_OPEN_MINUTE,
      closeMinute: DEFAULT_CLOSE_MINUTE,
    };
  }

  const openMinute = clockToMinutes(day.startsAt) ?? DEFAULT_OPEN_MINUTE;
  const closeMinute = clockToMinutes(day.endsAt) ?? DEFAULT_CLOSE_MINUTE;
  return {
    isWorking: day.isWorking !== false,
    openMinute,
    closeMinute,
  };
}

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = offsetFormatters.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  });
  offsetFormatters.set(timeZone, formatter);
  return formatter;
}

/**
 * Returns the UTC offset (in minutes) that `timeZone` had at the given instant.
 * Handles DST by probing the actual instant rather than assuming a fixed offset.
 */
function timezoneOffsetMinutes(instant: Date, timeZone: string): number {
  try {
    const parts = getOffsetFormatter(timeZone).formatToParts(instant);
    const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
    if (!match) return 0;
    const sign = match[1] === "-" ? -1 : 1;
    const hours = Number.parseInt(match[2] as string, 10);
    const minutes = match[3] ? Number.parseInt(match[3], 10) : 0;
    return sign * (hours * 60 + minutes);
  } catch {
    return 0;
  }
}

/**
 * Обратное преобразование к localWallTimeToUtc: из UTC-момента получаем
 * настенное время в часовом поясе клиники (день недели, часы, минуты).
 * Нужно, чтобы проверять попадание записи в рабочие часы именно по местному
 * времени клиники, а не по времени сервера.
 */
function utcToLocalWallTime(
  instant: Date,
  timeZone: string,
): { weekday: number; hours: number; minutes: number } {
  const offset = timezoneOffsetMinutes(instant, timeZone);
  const shifted = new Date(instant.getTime() + offset * 60_000);
  return {
    weekday: shifted.getUTCDay(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

/**
 * Приводит телефон к сравнимому виду: только цифры, российская «8» в начале
 * заменяется на «7», берутся последние 10 цифр (номер без кода страны).
 */
function normalizePhoneDigits(phone: string): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  const national =
    digits.startsWith("8") && digits.length === 11
      ? `7${digits.slice(1)}`
      : digits;
  return national.length > 10 ? national.slice(-10) : national;
}

/**
 * Converts a wall-clock time (date + minutes-of-day) in `timeZone` to the exact
 * UTC instant. Resolves the offset at the target instant so DST transitions are
 * respected (offset is re-derived from a first approximation).
 */
function localWallTimeToUtc(
  date: string,
  minuteOfDay: number,
  timeZone: string,
): Date {
  const [year, month, day] = date.split("-").map((n) => Number.parseInt(n, 10));
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  // First approximation: treat the wall time as if it were UTC.
  const naiveUtc = Date.UTC(
    year as number,
    (month as number) - 1,
    day as number,
    hour,
    minute,
  );
  // Derive the offset at that instant, then correct. A second pass absorbs the
  // rare case where the first guess landed on the wrong side of a DST switch.
  let offset = timezoneOffsetMinutes(new Date(naiveUtc), timeZone);
  let corrected = naiveUtc - offset * 60_000;
  const refinedOffset = timezoneOffsetMinutes(new Date(corrected), timeZone);
  if (refinedOffset !== offset) {
    offset = refinedOffset;
    corrected = naiveUtc - offset * 60_000;
  }
  return new Date(corrected);
}

const bookingRequestSchema = z.object({
  doctorId: z.string().uuid("Некорректный идентификатор врача"),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  patientName: z.string().trim().min(2).max(120),
  patientPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, "Неверный формат номера телефона"),
  comment: z.string().trim().max(500).optional(),
});

/**
 * Русские подписи полей формы записи: ключ схемы → подпись, которую пациент
 * видит в виджете на сайте клиники.
 *
 * Без словаря отказ называл бы поле латинским ключом (`patientPhone` — 12
 * знаков), а виджет печатает текст пациенту без всякого фильтра.
 */
const publicBookingFieldLabels: Record<string, string> = {
  doctorId: "врач",
  startsAt: "начало приёма",
  endsAt: "окончание приёма",
  patientName: "имя пациента",
  patientPhone: "телефон",
  comment: "комментарий",
};

export const registerPublicBookingRoutes = async (server: FastifyInstance) => {
  // 1. Get doctors for an organization
  server.get<{ Params: { organizationId: string } }>(
    "/:organizationId/doctors",
    async (request, reply) => {
      if (isRateLimited(request.ip ?? "unknown")) {
        return reply.status(429).send({ error: "Слишком много запросов." });
      }
      const { organizationId } = request.params;
      if (!organizationIdSchema.safeParse(organizationId).success) {
        return reply.status(404).send({
          error: "ClinicLinkInvalid",
          message: CLINIC_LINK_DEAD_MESSAGE,
        });
      }

      return withTenantCtx(organizationId, async () => {
        const [organization] = await db
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.id, organizationId))
          .limit(1);
        if (!organization) {
          return reply.status(404).send({
            error: "ClinicNotFound",
            message: CLINIC_LINK_DEAD_MESSAGE,
          });
        }

        const doctorsList = await db
          .select({
            id: users.id,
            fullName: users.fullName,
            specialties: users.specialties,
          })
          .from(users)
          .where(
            and(
              eq(users.organizationId, organizationId),
              eq(users.role, "doctor"),
            ),
          )
          .limit(50);

        if (doctorsList.length === 0) {
          // Клиника существует, но записываться не к кому. Причина у сервера
          // установлена ровно такая; ПОЧЕМУ врачей нет (не заведены, у всех
          // снята роль врача) он не знает и не сочиняет.
          return reply.status(503).send({
            error: "NoBookableDoctors",
            message:
              "В этой клинике пока нет ни одного врача, открытого для записи через сайт, поэтому выбрать специалиста не из кого. Позвоните в клинику — там запишут на приём.",
          });
        }

        return doctorsList;
      });
    },
  );

  // 2. Get available slots for a doctor on a specific date (YYYY-MM-DD)
  server.get<{
    Params: { organizationId: string; doctorId: string };
    Querystring: { date: string };
  }>("/:organizationId/slots/:doctorId", async (request, reply) => {
    if (isRateLimited(request.ip ?? "unknown")) {
      return reply.status(429).send({ error: "Слишком много запросов." });
    }
    const { organizationId, doctorId } = request.params;
    const { date } = request.query;

    // «Missing params» уходило ПАЦИЕНТУ и печаталось дословно: латиница вместо
    // причины. Причина у сервера есть — в запросе нет даты.
    if (!organizationId || !doctorId || !date) {
      return reply.status(400).send({
        error: "BookingDateMissing",
        message:
          "Запрос свободного времени пришёл без даты приёма. Выберите дату в поле «Выберите дату», а если оно не открывается — обновите страницу записи.",
      });
    }
    if (!organizationIdSchema.safeParse(organizationId).success) {
      return reply.status(404).send({
        error: "ClinicLinkInvalid",
        message: CLINIC_LINK_DEAD_MESSAGE,
      });
    }
    if (!dateSchema.safeParse(date).success) {
      return reply.status(400).send({
        error: "BookingDateInvalid",
        message:
          "Дату приёма сервер не разобрал. Выберите дату в поле «Выберите дату» ещё раз, а если она не подставляется — обновите страницу записи.",
      });
    }

    /*
     * КОНТЕКСТ АРЕНДАТОРА НА ПУБЛИЧНОМ МАРШРУТЕ.
     *
     * Токена здесь нет и быть не может — ссылку открывает пациент, — поэтому
     * `request.tenantId` не выставлен, и глобальная обёртка server.ts (onRoute,
     * строки 339–355) этот обработчик НЕ оборачивает. Под FORCE RLS все три
     * запроса ниже возвращали ноль строк без единой ошибки: первый же из них не
     * находил организацию, и живая клиника отвечала пациенту 404 «ссылка
     * устарела». Обхода здесь не нужно: арендатор ЗНАЕТ СЕБЯ — он назван в
     * адресе ссылки и уже проверен на форму UUID выше. Соседний маршрут
     * `/:organizationId/doctors` устроен ровно так же.
     */
    return withTenantCtx(organizationId, async (tx) => {
      // Resolve the clinic timezone + working schedule so slots reflect the
      // clinic's actual local hours, not a hardcoded UTC 09–18 window.
      const [org] = await tx
        .select({ clinicSchedule: organizations.clinicSchedule })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!org) {
        return reply
          .status(404)
          .send({ error: "ClinicNotFound", message: CLINIC_LINK_DEAD_MESSAGE });
      }

      const [clinic] = await tx
        .select({ timezone: clinics.timezone })
        .from(clinics)
        .where(eq(clinics.organizationId, organizationId))
        .limit(1);

      const timeZone = clinic?.timezone || DEFAULT_TIMEZONE;
      const schedule = org.clinicSchedule as unknown;
      const slotMinutes = (() => {
        const raw = (schedule as Record<string, unknown> | null)
          ?.defaultVisitMinutes;
        return typeof raw === "number" && raw >= 5 && raw <= 240
          ? raw
          : DEFAULT_SLOT_MINUTES;
      })();

      // `date` is already the clinic-local calendar date, so the weekday comes
      // straight from it (no timezone math needed for the day-of-week lookup).
      const [wy, wm, wd] = date
        .split("-")
        .map((n) => Number.parseInt(n, 10)) as [number, number, number];
      const calendarWeekday = new Date(Date.UTC(wy, wm - 1, wd)).getUTCDay();
      const daySchedule = resolveDaySchedule(schedule, calendarWeekday);

      if (!daySchedule.isWorking) {
        // 409, как и в POST /book ниже на этот же случай: день существует, но
        // приёма в нём нет. Текст тот же, что там, — теперь пациент прочитает
        // его до заполнения формы, а не после.
        return reply.status(409).send({
          error: "ClinicClosedThatDay",
          message: "В этот день клиника не работает. Выберите другую дату.",
        });
      }
      if (daySchedule.closeMinute <= daySchedule.openMinute) {
        // Это НЕ выходной: клиника считает день рабочим, а часы заданы так, что
        // рабочего времени не остаётся. Причина другая, значит и текст другой.
        return reply.status(409).send({
          error: "ClinicHoursMisconfigured",
          message:
            "Часы приёма на этот день у клиники заданы неверно: окончание рабочего дня не позже начала, поэтому свободного времени нет ни одного. Выберите другую дату или позвоните в клинику.",
        });
      }

      // The clinic day, expressed as a UTC instant range, for the appointment query.
      const dayStartUtc = localWallTimeToUtc(date, 0, timeZone);
      const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60_000);

      const existingApps = await tx
        .select({
          startsAt: appointments.startsAt,
          endsAt: appointments.endsAt,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.organizationId, organizationId),
            eq(appointments.doctorUserId, doctorId),
            gte(appointments.startsAt, dayStartUtc),
            lt(appointments.startsAt, dayEndUtc),
            // Отменённые записи и неявки освобождают слот (см. FREED_APPOINTMENT_STATUSES).
            notInArray(appointments.status, [...FREED_APPOINTMENT_STATUSES]),
          ),
        );

      const nowMs = Date.now();
      const slots: { time: string; startsAt: string; endsAt: string }[] = [];
      /*
       * Два счётчика вместо одного пустого массива: без них «окон в этом дне не
       * бывает», «окна были, но все прошли» и «окна есть, все заняты»
       * неразличимы, а действия у пациента в них разные.
       *
       * windowSlots — сколько приёмов вообще укладывается в рабочее окно;
       * upcomingSlots — сколько из них ещё не наступило.
       */
      let windowSlots = 0;
      let upcomingSlots = 0;

      for (
        let minute = daySchedule.openMinute;
        minute + slotMinutes <= daySchedule.closeMinute;
        minute += slotMinutes
      ) {
        windowSlots += 1;
        const slotStart = localWallTimeToUtc(date, minute, timeZone);
        const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60_000);

        // Don't offer slots in the past.
        if (slotStart.getTime() <= nowMs) continue;
        upcomingSlots += 1;

        const isTaken = existingApps.some((app) => {
          const appStart = new Date(app.startsAt).getTime();
          const appEnd = new Date(app.endsAt).getTime();
          return slotStart.getTime() < appEnd && slotEnd.getTime() > appStart;
        });

        if (!isTaken) {
          const hh = Math.floor(minute / 60)
            .toString()
            .padStart(2, "0");
          const mm = (minute % 60).toString().padStart(2, "0");
          slots.push({
            time: `${hh}:${mm}`,
            startsAt: slotStart.toISOString(),
            endsAt: slotEnd.toISOString(),
          });
        }
      }

      if (windowSlots === 0) {
        // Рабочий день короче одного приёма: 20 минут работы при приёме в 30
        // минут не дают ни одного окна. Для пациента это не «занято».
        return reply.status(409).send({
          error: "ClinicDayShorterThanVisit",
          message:
            "Рабочее время клиники в этот день короче одного приёма, поэтому записаться на него нельзя. Выберите другую дату или позвоните в клинику.",
        });
      }
      if (upcomingSlots === 0) {
        // Окна в дне были, но все они уже прошли: сегодняшний день после
        // закрытия и любая прошедшая дата. «Всё занято» здесь ложь.
        return reply.status(409).send({
          error: "ClinicDayAlreadyOver",
          message:
            "Приёмные часы этого дня уже прошли, записаться на него больше нельзя. Выберите другую дату.",
        });
      }

      // Дальше пустой список означает ровно одно: окна есть, все заняты.
      return slots;
    });
  });

  // 3. Book an appointment
  server.post<{
    Params: { organizationId: string };
    Body: {
      doctorId: string;
      startsAt: string;
      endsAt: string;
      patientName: string;
      patientPhone: string;
      comment?: string;
    };
  }>("/:organizationId/book", async (request, reply) => {
    if (isRateLimited(request.ip ?? "unknown")) {
      return reply.status(429).send({ error: "Слишком много запросов." });
    }
    const { organizationId } = request.params;
    if (!organizationId) {
      return reply.status(400).send({ error: "Missing organizationId" });
    }
    /*
     * Форма идентификатора проверяется ЗДЕСЬ, как в двух соседних маршрутах, и
     * это не косметика. Ниже он уходит в `withTenantCtx`, то есть в
     * `set_config('app.current_tenant', …)`, а политики RLS приводят это
     * значение к `uuid`. Непохожая на UUID строка из адреса дала бы 22P02
     * (invalid input syntax for type uuid) и ответ 500 вместо внятного отказа.
     */
    if (!organizationIdSchema.safeParse(organizationId).success) {
      return reply.status(404).send({
        error: "ClinicLinkInvalid",
        message: CLINIC_LINK_DEAD_MESSAGE,
      });
    }

    const parsed = bookingRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Некорректные данные записи",
        message: schemaRefusalMessage({
          issues: parsed.error.issues,
          fieldLabels: publicBookingFieldLabels,
          retryAction: "запись на приём",
          fallbackMessage:
            "Форма записи заполнена не полностью. Заполните врача, дату, время, имя и телефон и повторите запись на приём.",
        }),
        details: parsed.error.issues.map((issue) =>
          schemaIssuePhrase(issue, publicBookingFieldLabels),
        ),
      });
    }
    const { doctorId, startsAt, endsAt, patientName, patientPhone, comment } =
      parsed.data;

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);

    // Reject malformed / illogical time ranges before touching the database.
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return reply.status(400).send({ error: "Некорректное время записи" });
    }
    if (endDate.getTime() <= startDate.getTime()) {
      return reply
        .status(400)
        .send({ error: "Время окончания должно быть позже начала" });
    }
    const durationMinutes = (endDate.getTime() - startDate.getTime()) / 60_000;
    if (durationMinutes > 8 * 60) {
      return reply
        .status(400)
        .send({ error: "Слишком большая длительность записи" });
    }
    if (startDate.getTime() <= Date.now()) {
      return reply
        .status(400)
        .send({ error: "Нельзя записаться на прошедшее время" });
    }

    /*
     * КОНТЕКСТ АРЕНДАТОРА НА ПУБЛИЧНОМ МАРШРУТЕ (см. пояснение в маршруте
     * свободного времени выше). Без него под FORCE RLS ломалось ВСЁ, что ниже,
     * и ломалось по-разному: поиск врача возвращал ноль строк и пациент получал
     * «Врач не найден» на работающего врача, а если бы дошло до вставки —
     * `INSERT` в patients/appointments отвергался бы кодом 42501, и пациент
     * видел бы 500. Арендатор назван в адресе ссылки и проверен на форму UUID.
     */
    return withTenantCtx(organizationId, async (tenantTx) => {
      // The doctor must belong to this organization. Without this check the
      // public endpoint would let a caller attach appointments to any doctor
      // UUID across organizations.
      const [doctor] = await tenantTx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, doctorId),
            eq(users.organizationId, organizationId),
            eq(users.role, "doctor"),
          ),
        )
        .limit(1);
      if (!doctor) {
        return reply.status(404).send({ error: "Врач не найден" });
      }

      // ── Проверка рабочего времени клиники ────────────────────────────────
      const [clinicRow] = await tenantTx
        .select({ timezone: clinics.timezone })
        .from(clinics)
        .where(eq(clinics.organizationId, organizationId))
        .limit(1);
      const [bookingOrg] = await tenantTx
        .select({ clinicSchedule: organizations.clinicSchedule })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      const bookingTimeZone = clinicRow?.timezone || DEFAULT_TIMEZONE;
      const localDate = utcToLocalWallTime(startDate, bookingTimeZone);
      const bookingDaySchedule = resolveDaySchedule(
        bookingOrg?.clinicSchedule as unknown,
        localDate.weekday,
      );

      if (!bookingDaySchedule.isWorking) {
        return reply.status(409).send({
          error: "В этот день клиника не работает. Выберите другую дату.",
        });
      }

      const localEnd = utcToLocalWallTime(endDate, bookingTimeZone);
      const startMinute = localDate.hours * 60 + localDate.minutes;
      const endMinute = localEnd.hours * 60 + localEnd.minutes;
      if (
        startMinute < bookingDaySchedule.openMinute ||
        endMinute > bookingDaySchedule.closeMinute ||
        endMinute <= startMinute
      ) {
        return reply.status(409).send({
          error:
            "Выбранное время вне часов работы клиники. Обновите список слотов.",
        });
      }

      // ── Атомарная проверка занятости и создание записи ───────────────────
      // Вложенная транзакция — это SAVEPOINT внутри транзакции арендатора:
      // соединение то же, значит `app.current_tenant` продолжает действовать,
      // а откат конфликта не уносит с собой весь контекст.
      try {
        const result = await tenantTx.transaction(async (tx) => {
          // Блокируем строку врача: сериализует параллельные записи к нему.
          await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, doctorId))
            .limit(1)
            .for("update");

          const sameDayApps = await tx
            .select({
              startsAt: appointments.startsAt,
              endsAt: appointments.endsAt,
            })
            .from(appointments)
            .where(
              and(
                eq(appointments.organizationId, organizationId),
                eq(appointments.doctorUserId, doctorId),
                gte(
                  appointments.startsAt,
                  new Date(startDate.getTime() - 24 * 60 * 60_000),
                ),
                lt(
                  appointments.startsAt,
                  new Date(startDate.getTime() + 24 * 60 * 60_000),
                ),
                // Отменённые записи не блокируют время.
                notInArray(appointments.status, [
                  ...FREED_APPOINTMENT_STATUSES,
                ]),
              ),
            );

          const hasConflict = sameDayApps.some((app) => {
            const appStart = new Date(app.startsAt).getTime();
            const appEnd = new Date(app.endsAt).getTime();
            return startDate.getTime() < appEnd && endDate.getTime() > appStart;
          });
          if (hasConflict) return { conflict: true as const };

          const phoneDigits = normalizePhoneDigits(patientPhone);
          const candidates = await tx
            .select({ id: patients.id, phone: patients.phone })
            .from(patients)
            .where(eq(patients.organizationId, organizationId));
          const existingPatient = candidates.find(
            (candidate) =>
              normalizePhoneDigits(candidate.phone ?? "") === phoneDigits,
          );

          let patientId: string;
          if (existingPatient) {
            patientId = existingPatient.id;
          } else {
            const [createdPatient] = await tx
              .insert(patients)
              .values({
                organizationId,
                fullName: patientName,
                phone: patientPhone,
                status: "active",
              })
              .returning({ id: patients.id });
            if (!createdPatient) throw new Error("patient_insert_failed");
            patientId = createdPatient.id;
          }

          const [created] = await tx
            .insert(appointments)
            .values({
              organizationId,
              patientId,
              doctorUserId: doctorId,
              status: "planned",
              startsAt: startDate,
              endsAt: endDate,
              comment: comment || "Запись через виджет на сайте",
            })
            .returning();
          if (!created) throw new Error("appointment_insert_failed");
          return { conflict: false as const, appointment: created };
        });

        if (result.conflict) {
          return reply.status(409).send({
            error: "Выбранное время уже занято. Обновите список слотов.",
          });
        }
        return { success: true, appointment: result.appointment };
      } catch (error) {
        request.log.error(
          { err: error },
          "[publicBooking] Не удалось создать запись",
        );
        return reply
          .status(500)
          .send({ error: "Не удалось создать запись. Повторите попытку." });
      }
    });
  });
};
