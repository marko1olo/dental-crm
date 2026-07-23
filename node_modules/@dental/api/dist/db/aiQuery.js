import { db } from "./client.js";
import { aiJobs } from "./schema.js";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { recordAuditEventInDb } from "./auditQuery.js";
function buildRecognitionOutput(input) {
    const normalized = input.inputText.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
    const hasPhone = /(?:\+7|8)\s?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/.test(normalized);
    const hasDate = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(normalized);
    if (input.target === "patient_import" || input.kind === "paper_ocr") {
        const resultText = normalized.includes(";")
            ? normalized
            : `ИМЯ;ТЕЛЕФОН;ДАТА_РОЖДЕНИЯ\n${normalized}`;
        return {
            resultText,
            confidence: hasPhone ? 0.82 : 0.48,
            warnings: [
                "OCR/распознавание текста может ошибаться. Проверьте данные перед сохранением.",
                ...(hasPhone ? [] : ["Номер телефона не найден в тексте."])
            ],
            suggestedNextStep: "Проверить извлеченные данные и импортировать в базу."
        };
    }
    if (input.target === "imaging_summary" || input.kind === "image_summary") {
        return {
            resultText: `Описание снимка: ${normalized}. Требуется подтверждение врачом.`,
            confidence: hasDate ? 0.68 : 0.58,
            warnings: [
                "AI не ставит диагнозы. Только описывает снимок.",
                "Для полноты картины нужен очный осмотр."
            ],
            suggestedNextStep: "Перейти к просмотру снимка и подтвердить описание."
        };
    }
    if (input.target === "document_draft" || input.kind === "document_draft") {
        return {
            resultText: `Черновик документа: ${normalized}`,
            confidence: 0.64,
            warnings: ["Черновик требует тщательной проверки перед подписанием."],
            suggestedNextStep: "Открыть черновик в редакторе, внести правки."
        };
    }
    return {
        resultText: `Распознанный текст: ${normalized}`,
        confidence: 0.72,
        warnings: [
            "Качество распознавания зависит от четкости аудио.",
            "Диктовка может содержать ошибки из-за шума."
        ],
        suggestedNextStep: "Скопировать текст и использовать для заполнения приема."
    };
}
export async function listAiRecognitionJobsFromDb(organizationId) {
    const jobs = await db
        .select()
        .from(aiJobs)
        .where(eq(aiJobs.organizationId, organizationId))
        .orderBy(desc(aiJobs.createdAt))
        .limit(50);
    return jobs.map(j => ({
        id: j.id,
        organizationId: j.organizationId,
        patientId: j.patientId,
        imagingStudyId: j.imagingStudyId,
        kind: j.kind,
        target: j.target,
        status: j.status,
        sourceLabel: j.sourceLabel,
        inputText: j.inputText ?? "",
        resultText: j.resultText ?? "",
        confidence: j.confidence ?? 0,
        warnings: j.warnings ?? [],
        suggestedNextStep: j.suggestedNextStep ?? "",
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString()
    }));
}
export async function createAiRecognitionJobInDb(organizationId, input) {
    const output = buildRecognitionOutput(input);
    const [job] = await db.insert(aiJobs).values({
        id: randomUUID(),
        organizationId,
        patientId: input.patientId ?? null,
        imagingStudyId: input.imagingStudyId ?? null,
        kind: input.kind,
        target: input.target,
        status: "needs_review",
        sourceLabel: input.sourceLabel,
        inputText: input.inputText,
        resultText: output.resultText,
        confidence: output.confidence ?? 0,
        warnings: output.warnings ?? [],
        suggestedNextStep: output.suggestedNextStep ?? "review_result"
    }).returning();
    if (!job)
        throw new Error("Failed to create AI job in DB");
    const aiJob = {
        id: job.id,
        organizationId: job.organizationId,
        patientId: job.patientId,
        imagingStudyId: job.imagingStudyId,
        kind: job.kind,
        target: job.target,
        status: job.status,
        sourceLabel: job.sourceLabel,
        inputText: job.inputText ?? "",
        resultText: job.resultText ?? "",
        confidence: job.confidence ?? 0,
        warnings: job.warnings ?? [],
        suggestedNextStep: job.suggestedNextStep ?? "",
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString()
    };
    try {
        await recordAuditEventInDb(organizationId, {
            entityType: "ai_job",
            entityId: job.id,
            action: "ai_recognition_prepared",
            reason: `${job.kind} подготовлен для ${job.target}.`
        });
    }
    catch (e) { }
    return aiJob;
}
