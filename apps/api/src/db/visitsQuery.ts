import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and } from "drizzle-orm";
import type { VisitDraftAutosaveRequest, VisitDraftAutosave, AcceptVisitDraftInput } from "@dental/shared";
import { createHash } from "node:crypto";

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

export async function acceptVisitDraftInDb(organizationId: string, input: AcceptVisitDraftInput): Promise<{ acceptedVisitId: string, newRevision: number }> {
  const [visit] = await db.select().from(schema.visits).where(and(eq(schema.visits.id, input.visitId), eq(schema.visits.organizationId, organizationId))).limit(1);
  if (!visit) throw new Error("Визит не найден");
  if (visit.status !== "draft") throw new Error("Прием уже закрыт или аннулирован");

  const newRevision = visit.revision + 1;
  
  await db.update(schema.visits)
    .set({
      status: "signed",
      revision: newRevision,
      complaint: input.draft.complaint,
      anamnesis: input.draft.anamnesis,
      objectiveStatus: input.draft.objectiveStatus,
      diagnosis: input.draft.diagnosis,
      treatmentPlan: input.draft.treatmentPlan,
      doctorSummary: input.doctorSummary,
      signedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(schema.visits.id, input.visitId));

  return { acceptedVisitId: visit.id, newRevision };
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
