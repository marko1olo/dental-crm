import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and } from "drizzle-orm";
import type {
  AcceptVisitDraftInput,
  AcceptVisitDraftResponse,
  Visit,
  VisitDraftAutosave,
  VisitDraftAutosaveRequest,
  VisitSaveReceipt
} from "@dental/shared";
import { createHash } from "node:crypto";
import {
  aiRecognitionJobs,
  buildBillingSummary,
  buildClinicalRuleSummary,
  communicationTasks,
  documents,
  imagingStudies
} from "../sampleData.js";
import { buildVisitCloseChecklist } from "../visitCloseChecklist.js";
import { withHydratedDomainState } from "./domainStateHydration.js";
import { projectVisitRow } from "./visitsProjection.js";

function hashTranscript(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export async function getVisitDraftAutosaveFromDb(organizationId: string, visitId: string): Promise<VisitDraftAutosave | null> {
  const [visit] = await db.select().from(schema.visits).where(and(eq(schema.visits.id, visitId), eq(schema.visits.organizationId, organizationId))).limit(1);
  if (!visit) return null;
  if (visit.status !== "draft") return null;
  
  if (visit.draftAutosave) {
    return visit.draftAutosave as VisitDraftAutosave;
  }
  
  // Return empty skeleton if no draft autosave exists
  return {
    visitId: visit.id,
    patientId: visit.patientId,
    selectedSpecialty: "therapist", // default fallback
    transcript: visit.transcript || "",
    draft: {
      warnings: [],
      complaint: visit.complaint || "",
      anamnesis: visit.anamnesis || "",
      objectiveStatus: visit.objectiveStatus || "",
      diagnosis: visit.diagnosis || "",
      treatmentPlan: visit.treatmentPlan || ""
    },
    baseRevision: visit.revision,
    clientDraftId: null,
    clientSavedAt: null,
    serverSavedAt: visit.updatedAt.toISOString(),
    transcriptHash: ""
  };
}

export async function upsertVisitDraftAutosaveInDb(organizationId: string, input: VisitDraftAutosaveRequest): Promise<VisitDraftAutosave> {
  const [visit] = await db.select().from(schema.visits).where(and(eq(schema.visits.id, input.visitId), eq(schema.visits.organizationId, organizationId))).limit(1);
  if (!visit) throw new Error("Визит не найден");
  if (visit.status !== "draft") throw new Error("Прием уже закрыт или аннулирован");
  
  const serverDraft: VisitDraftAutosave = {
    visitId: input.visitId,
    patientId: input.patientId,
    selectedSpecialty: input.selectedSpecialty,
    transcript: input.transcript,
    draft: input.draft,
    baseRevision: input.baseRevision ?? null,
    clientDraftId: input.clientDraftId?.trim() || null,
    clientSavedAt: input.clientSavedAt ?? null,
    serverSavedAt: new Date().toISOString(),
    transcriptHash: hashTranscript(
      [
        input.transcript,
        input.draft.complaint,
        input.draft.anamnesis,
        input.draft.objectiveStatus,
        input.draft.diagnosis,
        input.draft.treatmentPlan
      ]
        .filter(Boolean)
        .join("|")
    )
  };

  await db.update(schema.visits)
    .set({
      draftAutosave: serverDraft,
      transcript: input.transcript,
      updatedAt: new Date()
    })
    .where(eq(schema.visits.id, input.visitId));

  return serverDraft;
}

/**
 * ПРИЁМ ПОДПИСАН, А ОТВЕТ СОБРАТЬ НЕ УДАЛОСЬ.
 *
 * Отдельный тип нужен из-за порядка: запись в базе уже зафиксирована. Любая
 * ошибка ПОСЛЕ этого не смеет доехать до общего разбора доменных отказов
 * (routes/visits.ts, sendVisitDraftMutationError) — тот отвечает 409 «обновите
 * прием и повторите действие», а повторить нельзя: приём больше не черновик, и
 * повтор упрётся в «этот прием уже недоступен для изменений». Врач при этом
 * считает, что его запись не сохранилась.
 *
 * Здесь несётся то, что уже стало фактом: приём и его новая ревизия. Маршрут
 * обязан назвать состояние честно.
 */
export class VisitSignedResponseIncompleteError extends Error {
  readonly acceptedVisitId: string;
  readonly newRevision: number;

  constructor(acceptedVisitId: string, newRevision: number, cause: unknown) {
    super("Прием подписан, но ответ по контракту собрать не удалось.", { cause });
    this.name = "VisitSignedResponseIncompleteError";
    this.acceptedVisitId = acceptedVisitId;
    this.newRevision = newRevision;
  }
}

/**
 * Подписать карту приёма и отдать ПОЛНЫЙ ответ по контракту
 * acceptVisitDraftResponseSchema: подписанный приём, карточку закрытия приёма и
 * квитанцию сохранения.
 *
 * ЧТО БЫЛО НЕ ТАК (измерено: apps/api/src/tests/routes/chainWeldProof.ts, шаг 9).
 * Функция возвращала `{ acceptedVisitId, newRevision }` — два поля, которых в
 * контракте нет вовсе. Маршрут разбирал этот результат схемой ответа, разбор не
 * сходился НИКОГДА, и врач на своём главном действии всегда получал ошибку при
 * подписанном приёме.
 *
 * ОТКУДА БЕРУТСЯ ФАКТЫ КАРТОЧКИ. Из тех же доменных коллекций, по которым
 * собирается главный экран (db/domainStateHydration.ts наполняет их строками этой
 * клиники, db/dashboardQuery.ts делает то же самое перед buildDashboard). Это
 * сделано сознательно: расчёт карточки в проекте ОДИН
 * (apps/api/src/visitCloseChecklist.ts), и числа в ответе на подписание обязаны
 * совпадать с тем, что врач видит на экране. Второй расчёт «для базы» здесь
 * заводить нельзя — из этого выросли четыре разошедшихся расчёта долга.
 *
 * ПОЧЕМУ ГИДРАТАЦИЯ ВНУТРИ ОДНОГО ЗАМКА. Коллекции общие на процесс. Прочитать их
 * после того, как гидратация отпустила очередь, значит рискнуть собрать карточку
 * по данным ДРУГОЙ клиники, успевшей вклиниться. `withHydratedDomainState`
 * выполняет сбор внутри той же очереди. Цена — полное чтение данных клиники на
 * одно подписание; подписание бывает раз на приём, а сводка главного экрана делает
 * то же самое на каждый запрос.
 *
 * ПРИЁМ БЕРЁТСЯ ИЗ RETURNING, А НЕ ИЗ КОЛЛЕКЦИЙ. Он только что перестал быть
 * черновиком, поэтому `activeVisit` («последний черновик клиники») укажет уже на
 * другой визит. В ответ и в карточку идёт именно подписанная строка.
 */
export async function acceptVisitDraftInDb(
  organizationId: string,
  input: AcceptVisitDraftInput
): Promise<AcceptVisitDraftResponse> {
  const [visit] = await db.select().from(schema.visits).where(and(eq(schema.visits.id, input.visitId), eq(schema.visits.organizationId, organizationId))).limit(1);
  if (!visit) throw new Error("Визит не найден");
  if (visit.status !== "draft") throw new Error("Прием уже закрыт или аннулирован");

  const previousRevision = visit.revision;
  const newRevision = previousRevision + 1;
  const savedAt = new Date();

  const [signedRow] = await db.update(schema.visits)
    .set({
      status: "signed",
      revision: newRevision,
      complaint: input.draft.complaint,
      anamnesis: input.draft.anamnesis,
      objectiveStatus: input.draft.objectiveStatus,
      diagnosis: input.draft.diagnosis,
      treatmentPlan: input.draft.treatmentPlan,
      doctorSummary: input.doctorSummary,
      signedAt: savedAt,
      updatedAt: savedAt
    })
    .where(eq(schema.visits.id, input.visitId))
    .returning();
  // До этой строки приём ещё черновик: пустой RETURNING значит, что подписания не
  // случилось, и обычный доменный отказ здесь правдив.
  if (!signedRow) throw new Error("Прием не подписан");

  const signedVisit = projectVisitRow(signedRow);

  try {
    const visitCloseChecklist = await withHydratedDomainState(organizationId, (report) => {
      /*
       * Клиника не подтверждена — карточку собирать НЕЛЬЗЯ. Гидратация в этом
       * случае сознательно не трогает общие коллекции, поэтому в них осталось то,
       * что прочитал предыдущий запрос, то есть данные ДРУГОЙ клиники. Отдать их
       * врачу хуже, чем не отдать ничего. По внешнему ключу visits ->
       * organizations такого быть не должно; сюда попадает только сбой чтения
       * самой строки клиники, и он обязан кончиться честным отказом.
       */
      if (!report.organizationFound) {
        throw new Error("Клиника приема не подтверждена в базе: карточку закрытия собирать не по чему.");
      }
      return buildVisitCloseChecklist({
        visit: signedVisit,
        imagingStudies,
        documents,
        aiRecognitionJobs,
        communicationTasks,
        clinical: buildClinicalRuleSummary(signedVisit.patientId),
        billing: buildBillingSummary()
      });
    });

    return {
      visit: signedVisit,
      visitCloseChecklist,
      saveReceipt: buildVisitSaveReceipt(input, signedVisit, previousRevision)
    };
  } catch (error) {
    throw new VisitSignedResponseIncompleteError(signedVisit.id, signedVisit.revision, error);
  }
}

/**
 * Квитанция сохранения — по фактически сохранённой строке приёма.
 *
 * `serverRevision` и `savedAt` берутся из подписанного приёма, а не из времени
 * ответа: врач сверяет по ним, что на сервере лежит именно его правка, а панель
 * ЭМК сверяет `visitId` и чужую квитанцию не показывает
 * (apps/web/src/components/visit/visitFlowResultOwner.ts).
 *
 * `conflict_accepted` — настоящее состояние, а не украшение: клиент присылает
 * `baseRevision` — ревизию, с которой он правил. Если на сервере она уже была
 * выше, правки всё равно приняты (приём подписан), но врач обязан узнать, что
 * поверх его версии уже была другая.
 *
 * СТАТУС `duplicate` ЭТОТ ПУТЬ НЕ ВЫДАЁТ, И ЭТО ДОЛГ, А НЕ НЕДОСМОТР. Чтобы
 * отличить повторную отправку той же операции от новой, нужен след
 * `clientMutationId` в базе. У платежей такой столбец есть
 * (payments.client_mutation_id, db/billingQuery.ts), у приёмов — нет. Пока его
 * нет, повторный POST по уже подписанному приёму получает отказ «этот прием уже
 * недоступен для изменений» (409), а не квитанцию-дубликат. Объём долга: столбец
 * в `visits` + миграция (.sql + журнал + снимок) + проверка в этой функции.
 */
function buildVisitSaveReceipt(
  input: AcceptVisitDraftInput,
  signedVisit: Visit,
  previousRevision: number
): VisitSaveReceipt {
  const baseRevision = input.baseRevision ?? null;
  const conflictWarning =
    baseRevision !== null && baseRevision < previousRevision
      ? `На сервере уже была ревизия ${previousRevision}, сохранение пришло с ревизии ${baseRevision}. ` +
        "Правки врача приняты и подписаны; сверьте запись, если приём правили с двух рабочих мест."
      : null;

  return {
    visitId: signedVisit.id,
    clientMutationId: input.clientMutationId?.trim() || null,
    status: conflictWarning ? "conflict_accepted" : "accepted",
    serverRevision: signedVisit.revision,
    savedAt: signedVisit.updatedAt,
    warning: conflictWarning
  };
}

export async function getVisitByIdInDb(organizationId: string, id: string) {
  const [res] = await db.select().from(schema.visits).where(and(eq(schema.visits.organizationId, organizationId), eq(schema.visits.id, id))).limit(1);
  return res || null;
}

/** Приём, открытый по записи расписания. */
export type OpenedVisitForAppointment = {
  readonly id: string;
  readonly organizationId: string;
  readonly patientId: string;
  readonly appointmentId: string | null;
  readonly status: "draft" | "signed" | "voided";
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type OpenVisitForAppointmentResult = {
  readonly visit: OpenedVisitForAppointment;
  /** true — приём открыт этим вызовом, false — он уже был открыт раньше. */
  readonly created: boolean;
};

/**
 * ЗАЧЕМ ЭТА ФУНКЦИЯ СУЩЕСТВУЕТ.
 *
 * До неё в apps/api не было НИ ОДНОГО боевого маршрута, создающего строку в
 * `visits`. Вставки жили только в разовом переносе состояния
 * (scripts/migrateStateToDb.ts), демо-пресете мастера первого запуска
 * (routes/workspaceProfile.ts), посеве для снимков
 * (scripts/seedOpsScreenshotDemo.ts) и импорте из чужой системы
 * (migration/loader.ts). То есть карта приёма в продукте не открывалась ничем:
 * клиент берёт `dashboard.activeVisit`, а это «последний ЧЕРНОВИК клиники,
 * иначе последний визит любого статуса» (db/domainStateHydration.ts,
 * applyActiveVisit). На живой базе там оказывался ПОДПИСАННЫЙ визит, и
 * автосохранение черновика отвечало 404/409 — врач у кресла не мог записать
 * приём вовсе, а текст отказа предлагал «выберите актуальный прием», которого
 * не существовало.
 *
 * Отсюда же тянулась касса: оплата отклонялась, если открытый приём принадлежит
 * другому пациенту (apps/web/src/hooks/domains/usePatientLogic.ts), а сменить
 * открытый приём было нечем. Теперь способ есть: открыть приём по записи
 * расписания того пациента, которому принимают оплату.
 *
 * ИДЕМПОТЕНТНОСТЬ ОБЯЗАТЕЛЬНА. Повторное нажатие «Открыть приём» не смеет
 * создавать второй визит по одной записи: второй визит увёл бы за собой
 * `activeVisit`, ЭМК врача осталась бы в первом, а `payments.visit_id`
 * указывал бы на пустой второй — деньги перестали бы относиться к лечению.
 * Поэтому существующий визит записи возвращается как есть, а строка записи
 * блокируется `for update`: два кресла, нажавшие одновременно, выстраиваются в
 * очередь, и второй вызов видит визит первого.
 */
export async function openVisitForAppointmentInDb(
  organizationId: string,
  appointmentId: string
): Promise<OpenVisitForAppointmentResult> {
  return db.transaction(async (tx) => {
    const [appointment] = await tx
      .select({
        id: schema.appointments.id,
        patientId: schema.appointments.patientId,
        status: schema.appointments.status
      })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.id, appointmentId),
          eq(schema.appointments.organizationId, organizationId)
        )
      )
      .for("update")
      .limit(1);
    if (!appointment) throw new Error("Запись не найдена");
    if (!appointment.patientId) throw new Error("У записи нет пациента");
    // Отменённый приём и неявку лечить нечем: открытый по ним визит стал бы
    // носителем ЭМК и денег по приёму, которого не было.
    if (appointment.status === "cancelled" || appointment.status === "no_show") {
      throw new Error("Запись отменена");
    }

    const [existing] = await tx
      .select()
      .from(schema.visits)
      .where(
        and(
          eq(schema.visits.appointmentId, appointmentId),
          eq(schema.visits.organizationId, organizationId)
        )
      )
      .orderBy(schema.visits.createdAt)
      .limit(1);
    if (existing) {
      return {
        visit: {
          id: existing.id,
          organizationId: existing.organizationId,
          patientId: existing.patientId,
          appointmentId: existing.appointmentId,
          status: existing.status,
          createdAt: existing.createdAt.toISOString(),
          updatedAt: existing.updatedAt.toISOString()
        },
        created: false
      };
    }

    const [created] = await tx
      .insert(schema.visits)
      .values({
        organizationId,
        patientId: appointment.patientId,
        appointmentId,
        status: "draft",
        revision: 1
      })
      .returning();
    if (!created) throw new Error("Прием не открыт");

    return {
      visit: {
        id: created.id,
        organizationId: created.organizationId,
        patientId: created.patientId,
        appointmentId: created.appointmentId,
        status: created.status,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString()
      },
      created: true
    };
  });
}
