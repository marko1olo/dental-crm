import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and } from "drizzle-orm";
import { createHash } from "node:crypto";
function hashTranscript(value) {
    return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
export async function getVisitDraftAutosaveFromDb(organizationId, visitId) {
    const [visit] = await db.select().from(schema.visits).where(and(eq(schema.visits.id, visitId), eq(schema.visits.organizationId, organizationId))).limit(1);
    if (!visit)
        return null;
    if (visit.status !== "draft")
        return null;
    if (visit.draftAutosave) {
        return visit.draftAutosave;
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
export async function upsertVisitDraftAutosaveInDb(organizationId, input) {
    const [visit] = await db.select().from(schema.visits).where(and(eq(schema.visits.id, input.visitId), eq(schema.visits.organizationId, organizationId))).limit(1);
    if (!visit)
        throw new Error("Визит не найден");
    if (visit.status !== "draft")
        throw new Error("Прием уже закрыт или аннулирован");
    const serverDraft = {
        visitId: input.visitId,
        patientId: input.patientId,
        selectedSpecialty: input.selectedSpecialty,
        transcript: input.transcript,
        draft: input.draft,
        baseRevision: input.baseRevision ?? null,
        clientDraftId: input.clientDraftId?.trim() || null,
        clientSavedAt: input.clientSavedAt ?? null,
        serverSavedAt: new Date().toISOString(),
        transcriptHash: hashTranscript([
            input.transcript,
            input.draft.complaint,
            input.draft.anamnesis,
            input.draft.objectiveStatus,
            input.draft.diagnosis,
            input.draft.treatmentPlan
        ]
            .filter(Boolean)
            .join("|"))
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
export async function acceptVisitDraftInDb(organizationId, input) {
    const [visit] = await db.select().from(schema.visits).where(and(eq(schema.visits.id, input.visitId), eq(schema.visits.organizationId, organizationId))).limit(1);
    if (!visit)
        throw new Error("Визит не найден");
    if (visit.status !== "draft")
        throw new Error("Прием уже закрыт или аннулирован");
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
export async function getVisitByIdInDb(organizationId, id) {
    const [res] = await db.select().from(schema.visits).where(and(eq(schema.visits.organizationId, organizationId), eq(schema.visits.id, id))).limit(1);
    return res || null;
}
