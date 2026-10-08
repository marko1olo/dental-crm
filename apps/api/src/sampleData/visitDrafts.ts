/**
 * @file visitDrafts.ts
 * @description Layer 3: Visit draft autosaves and save receipt handling.
 */
import { visitCloseChecklistFactsFor } from "./billing.js";
import { recordAuditEvent } from "./audit.js";


import { createHash } from "node:crypto";
import type {
	AcceptVisitDraftInput,
	AcceptVisitDraftResponse,
	VisitDraftAutosave,
	VisitDraftAutosaveRequest,
	VisitSaveReceipt,
} from "@dental/shared";
import { activeVisit } from "./clinicalRecords.js";
import { persistMutableState } from "./stateNotifier.js";

const visitSaveReceipts: VisitSaveReceipt[] = [];
const visitDraftAutosaves: VisitDraftAutosave[] = [];

function currentVisitRevision(): number {
	const revision = Number.isFinite(activeVisit.revision)
		? activeVisit.revision
		: 1;
	activeVisit.revision = revision;
	return revision;
}

function hashTranscript(value: string): string {
	return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function assertActiveVisitDraftMutationAllowed(): void {
	if (activeVisit.status !== "draft") {
		throw new Error("Прием уже закрыт или аннулирован");
	}
}

function _getVisitDraftAutosave(visitId: string): VisitDraftAutosave | null {
	if (visitId !== activeVisit.id) return null;
	if (activeVisit.status !== "draft") return null;
	return visitDraftAutosaves.find((draft) => draft.visitId === visitId) ?? null;
}

function _upsertVisitDraftAutosave(
	input: VisitDraftAutosaveRequest,
): VisitDraftAutosave {
	if (
		input.visitId !== activeVisit.id ||
		input.patientId !== activeVisit.patientId
	) {
		throw new Error("Визит не найден");
	}
	assertActiveVisitDraftMutationAllowed();

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
				input.draft.treatmentPlan,
			]
				.filter(Boolean)
				.join("\n"),
		),
	};

	const existingIndex = visitDraftAutosaves.findIndex(
		(draft) => draft.visitId === input.visitId,
	);
	if (existingIndex >= 0) {
		visitDraftAutosaves[existingIndex] = serverDraft;
	} else {
		visitDraftAutosaves.unshift(serverDraft);
	}
	visitDraftAutosaves.splice(100);
	persistMutableState();
	return serverDraft;
}

function _acceptVisitDraft(
	input: AcceptVisitDraftInput,
): AcceptVisitDraftResponse {
	if (input.visitId !== activeVisit.id) {
		throw new Error("Визит не найден");
	}
	assertActiveVisitDraftMutationAllowed();

	const clientMutationId = input.clientMutationId?.trim() || null;
	const duplicateReceipt = clientMutationId
		? visitSaveReceipts.find(
				(receipt) =>
					receipt.visitId === input.visitId &&
					receipt.clientMutationId === clientMutationId,
			)
		: null;
	if (duplicateReceipt) {
		return {
			visit: activeVisit,
			visitCloseChecklist: buildVisitCloseChecklist(
				visitCloseChecklistFactsFor(activeVisit),
			),
			saveReceipt: {
				...duplicateReceipt,
				status: "duplicate",
				serverRevision: currentVisitRevision(),
			},
		};
	}

	const baseRevision = input.baseRevision ?? null;
	const previousRevision = currentVisitRevision();
	const conflictWarning =
		baseRevision !== null && baseRevision < previousRevision
			? `На сервере уже была ревизия ${previousRevision}, сохранение пришло с ревизии ${baseRevision}. Правки врача приняты, конфликт отмечен в аудите.`
			: null;

	activeVisit.complaint = input.draft.complaint ?? activeVisit.complaint;
	activeVisit.anamnesis = input.draft.anamnesis ?? activeVisit.anamnesis;
	activeVisit.objectiveStatus =
		input.draft.objectiveStatus ?? activeVisit.objectiveStatus;
	activeVisit.diagnosis = input.draft.diagnosis ?? activeVisit.diagnosis;
	activeVisit.treatmentPlan =
		input.draft.treatmentPlan ?? activeVisit.treatmentPlan;
	const summary = input.doctorSummary ?? input.draft.warnings.join(" ");
	activeVisit.doctorSummary = summary || "Черновик ЭМК принят врачом.";
	activeVisit.revision = previousRevision + 1;
	activeVisit.updatedAt = new Date().toISOString();

	const saveReceipt: VisitSaveReceipt = {
		visitId: activeVisit.id,
		clientMutationId,
		status: conflictWarning ? "conflict_accepted" : "accepted",
		serverRevision: activeVisit.revision,
		savedAt: activeVisit.updatedAt,
		warning: conflictWarning,
	};
	visitSaveReceipts.unshift(saveReceipt);
	visitSaveReceipts.splice(200);

	recordAuditEvent({
		entityType: "visit",
		entityId: activeVisit.id,
		action: "visit_draft_accepted",
		reason: [
			"Врач принял AI/диктовочный черновик в ЭМК. Подпись приема остается отдельным действием.",
			`Ревизия ${previousRevision} -> ${activeVisit.revision}.`,
			clientMutationId ? `Клиентская операция ${clientMutationId}.` : null,
			conflictWarning,
		]
			.filter(Boolean)
			.join(" "),
	});

	return {
		visit: activeVisit,
		visitCloseChecklist: buildVisitCloseChecklist(
			visitCloseChecklistFactsFor(activeVisit),
		),
		saveReceipt,
	};
}

/**
 * Журнал аудита пути БЕЗ базы (память процесса + снимок состояния на диске).
 *
 * АВТОР БОЛЬШЕ НЕ ПОДДЕЛЫВАЕТСЯ. Было: `actorUserId: doctorUserId`, где
 * `doctorUserId` — модульная константа демо-врача `8356141b-...`
 * (`sampleData.ts:184`). Параметра для автора в сигнатуре не было вовсе,
 * поэтому подделка была не риском, а свойством конструкции: кто бы ни выполнил
 * действие — регистратор, администратор, телеграм-бот от имени пациента — в
 * журнале оказывался один и тот же врач. Событие журнала, которое отвечает на
 * вопрос «кто» одинаково для всех, хуже отсутствующего: отсутствующее видно,
 * а это выглядит как полноценная запись и вводит в заблуждение при разборе.
 *
 * СТАЛО: автор берётся из аргумента, а если вызывающий его не передал — `null`,
 * то есть честное «неизвестен». Это уже принятый в дереве способ: боевой путь
 * подписания приёма пишет ровно `actorUserId: null` и поясняет причину в тексте
 * события (`db/visitsQuery.ts:373-374` и строка причины `:365`).
 *
 * ОБЪЁМ ИЗМЕНЕНИЯ ПОВЕДЕНИЯ — НАЗЫВАЮ ЧЕСТНО. Сигнатура расширена
 * необязательным полем, поэтому ни одно из 34 мест вызова внутри этого файла
 * не правится и не ломается. Но значение по умолчанию изменилось с выдуманного
 * врача на `null`, и это видно в двух местах:
 *   • витрина дашборда — `sampleData.ts:10503` отдаёт 12 верхних событий в UI;
 *     `apps/web/src/AuditLogsPanel.tsx:278` уже написан под nullable
 *     (`event.actorUserId ? ... : ничего`), поэтому подпись «сотрудник 8356141b…»
 *     просто исчезнет вместо того, чтобы врать;
 *   • снимок состояния `.data/dental-crm-state.json`.
 * Логику это не задевает: все четыре чтения журнала в этом файле
 * (`:9031, :9078, :9119, :9285`) фильтруют по `entityType`/`entityId`/`action`
 * и `actorUserId` не смотрят. Ни один тест значение автора не проверяет.
 */

export { visitDraftAutosaves, visitSaveReceipts };
