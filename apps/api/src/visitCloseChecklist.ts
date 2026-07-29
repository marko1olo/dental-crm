/**
 * visitCloseChecklist.ts — карточка закрытия приёма. ОДИН расчёт на весь проект.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ ПОЯВИЛСЯ
 *
 * Расчёт жил внутри sampleData.ts и читал модульное общее состояние: приём брался
 * из `activeVisit`, снимки, документы и задачи — из общих массивов. Из-за этого
 * им не мог воспользоваться маршрут, который подписывает КОНКРЕТНЫЙ приём
 * (POST /api/visits/:visitId/draft/accept): `activeVisit` — это «последний
 * черновик клиники» (db/domainStateHydration.ts, applyActiveVisit), то есть
 * почти никогда не тот приём, который врач только что подписал. После подписания
 * приём перестаёт быть черновиком, и `activeVisit` уезжает на чужой визит.
 *
 * Что из этого выходило, измерено (apps/api/src/tests/routes/chainWeldProof.ts,
 * шаг 9): маршрут подписывал приём в базе, но собрать ответ по контракту
 * acceptVisitDraftResponseSchema было нечем, и врач на своём главном действии
 * ВСЕГДА получал HTTP 500. Карта закрыта, а экран показывает ошибку.
 *
 * ПОЧЕМУ НЕ ВТОРОЙ ПОСТРОИТЕЛЬ РЯДОМ. Завести отдельный расчёт «для базы» — это
 * ровно та болезнь, из которой в этом дереве выросли четыре разных расчёта долга,
 * дающие на разных экранах разные ответы на один вопрос. Поэтому построитель
 * ПЕРЕЕХАЛ сюда целиком и получил факты параметром: приём — обязательный аргумент,
 * а не глобальная переменная. Тексты, признаки `ready`/`blocking`, порядок пунктов
 * и формула счёта не изменены ни на символ — вызывающий из sampleData.ts передаёт
 * те же самые данные, что читались раньше, и главный экран собирается прежним.
 *
 * ЧЕГО ЗДЕСЬ НЕТ И БЫТЬ НЕ ДОЛЖНО: чтения базы, чтения общих массивов, дат «сейчас»
 * и любой другой скрытой связи с окружением. Все входные данные — в аргументе;
 * поэтому один и тот же приём даёт один и тот же ответ и в живом маршруте, и в тесте.
 */

import type { DocumentKind, VisitCloseChecklist } from "@dental/shared";

type ChecklistItem = VisitCloseChecklist["items"][number];

/**
 * Приём, для которого собирается карточка. Ровно те поля, которые нужны расчёту:
 * шире брать нельзя, иначе построитель снова начнёт зависеть от того, откуда
 * приехал приём — из базы, из демо-состояния или из ответа маршрута.
 */
export type VisitCloseChecklistVisit = {
	readonly id: string;
	readonly patientId: string;
	readonly complaint: string | null;
	readonly objectiveStatus: string | null;
	readonly diagnosis: string | null;
	readonly treatmentPlan: string | null;
};

export type VisitCloseChecklistImagingStudy = {
	readonly patientId: string;
	readonly visitId: string | null;
	readonly status: string;
};

export type VisitCloseChecklistDocument = {
	readonly patientId: string;
	readonly visitId: string | null;
	readonly kind: string;
	readonly status: string;
};

export type VisitCloseChecklistAiJob = {
	readonly patientId: string | null;
	readonly target: string;
	readonly status: string;
};

export type VisitCloseChecklistCommunicationTask = {
	readonly visitId: string | null;
	readonly intent: string;
	readonly status: string;
};

/** Клинические правила: только итоги, которые видит пункт карточки. */
export type VisitCloseChecklistClinicalFacts = {
	readonly unresolved: number;
	readonly blockers: number;
};

/** Деньги: остаток к оплате. Считает его вызывающий — здесь ни одной новой формулы. */
export type VisitCloseChecklistBillingFacts = {
	readonly totalDueRub: number;
};

export type VisitCloseChecklistFacts = {
	readonly visit: VisitCloseChecklistVisit;
	readonly imagingStudies: readonly VisitCloseChecklistImagingStudy[];
	readonly documents: readonly VisitCloseChecklistDocument[];
	readonly aiRecognitionJobs: readonly VisitCloseChecklistAiJob[];
	readonly communicationTasks: readonly VisitCloseChecklistCommunicationTask[];
	readonly clinical: VisitCloseChecklistClinicalFacts;
	readonly billing: VisitCloseChecklistBillingFacts;
};

function buildVisitNoteChecklistItem(visit: VisitCloseChecklistVisit): ChecklistItem {
	const visitNoteReady = Boolean(
		visit.complaint && visit.objectiveStatus && visit.diagnosis && visit.treatmentPlan,
	);
	return {
		id: "visit-note",
		visitId: visit.id,
		title: "ЭМК заполнена",
		detail: visitNoteReady
			? "Жалобы, статус, диагноз и план готовы к подписи."
			: "Заполните жалобы, объективный статус, диагноз и план лечения.",
		ready: visitNoteReady,
		blocking: true,
		ownerRole: "doctor",
		section: "visit",
		actionLabel: "Проверить запись",
	};
}

function buildClinicalRulesChecklistItem(
	visit: VisitCloseChecklistVisit,
	clinical: VisitCloseChecklistClinicalFacts,
): ChecklistItem {
	return {
		id: "clinical-rules",
		visitId: visit.id,
		title: "Клинические предупреждения",
		detail: clinical.unresolved
			? `${clinical.unresolved} правил требуют внимания, важных предупреждений ${clinical.blockers}.`
			: "Бандлы, ограничения и предупреждения закрыты.",
		ready: clinical.blockers === 0,
		blocking: clinical.blockers > 0,
		ownerRole: "doctor",
		section: "visit",
		actionLabel:
			clinical.blockers > 0 ? "Проверить предупреждения" : "Посмотреть правила",
	};
}

function buildImagingReviewChecklistItem(
	visit: VisitCloseChecklistVisit,
	imagingStudies: readonly VisitCloseChecklistImagingStudy[],
): ChecklistItem {
	const activeImages = imagingStudies.filter(
		(study) => study.patientId === visit.patientId && study.visitId === visit.id,
	);
	const reviewImages = activeImages.filter((study) => study.status === "needs_review");
	return {
		id: "imaging-review",
		visitId: visit.id,
		title: "Снимки проверены",
		detail: reviewImages.length
			? `${reviewImages.length} снимок требует врачебной проверки перед закрытием.`
			: activeImages.length
				? "Снимки связаны с приемом и не ждут проверки."
				: "К приему не прикреплены снимки.",
		ready: reviewImages.length === 0,
		blocking: reviewImages.length > 0,
		ownerRole: "doctor",
		section: "visit",
		actionLabel: "Открыть снимки",
	};
}

function buildLegalDocumentsChecklistItem(
	visit: VisitCloseChecklistVisit,
	documents: readonly VisitCloseChecklistDocument[],
): ChecklistItem {
	const activeDocuments = documents.filter(
		(document) =>
			document.patientId === visit.patientId &&
			document.visitId === visit.id &&
			document.status !== "voided",
	);
	const requiredDocumentKinds: DocumentKind[] = [
		"paid_medical_services_contract",
		"informed_consent",
		"completed_works_act",
	];
	const missingDocumentKinds = requiredDocumentKinds.filter(
		(kind) => !activeDocuments.some((document) => document.kind === kind),
	);
	return {
		id: "legal-documents",
		visitId: visit.id,
		title: "Документы готовы",
		detail: missingDocumentKinds.length
			? `Не хватает документов: ${missingDocumentKinds.length}.`
			: "Договор, согласие и акт привязаны к приему.",
		ready: missingDocumentKinds.length === 0,
		blocking: missingDocumentKinds.length > 0,
		ownerRole: "administrator",
		section: "documents",
		actionLabel: "Собрать документы",
	};
}

function buildAiDraftReviewChecklistItem(
	visit: VisitCloseChecklistVisit,
	aiRecognitionJobs: readonly VisitCloseChecklistAiJob[],
): ChecklistItem {
	const hasReviewedAiDraft = aiRecognitionJobs.some(
		(job) =>
			job.patientId === visit.patientId &&
			job.target === "visit_note" &&
			(job.status === "accepted" || job.status === "needs_review"),
	);
	return {
		id: "ai-draft-review",
		visitId: visit.id,
		title: "AI-черновик проверен",
		detail: hasReviewedAiDraft
			? "AI-черновик уже прошел врачебный контроль."
			: "AI не подписывает прием: врач сверяет текст вручную.",
		ready: hasReviewedAiDraft,
		blocking: false,
		ownerRole: "doctor",
		section: "visit",
		actionLabel: "Сверить черновик",
	};
}

function buildPaymentLinkChecklistItem(
	visit: VisitCloseChecklistVisit,
	billing: VisitCloseChecklistBillingFacts,
): ChecklistItem {
	const formatRub = (amountRub: number) => `${amountRub.toLocaleString("ru-RU")} ₽`;
	return {
		id: "payment-link",
		visitId: visit.id,
		title: "Оплата связана",
		detail: billing.totalDueRub
			? `Остаток по плану ${formatRub(billing.totalDueRub)}.`
			: "Оплата закрыта или не требуется.",
		ready: billing.totalDueRub === 0,
		blocking: false,
		ownerRole: "administrator",
		section: "finance",
		actionLabel: "Проверить оплату",
	};
}

function buildPostVisitInstructionsChecklistItem(
	visit: VisitCloseChecklistVisit,
	communicationTasks: readonly VisitCloseChecklistCommunicationTask[],
): ChecklistItem {
	const postVisitInstruction = communicationTasks.find(
		(task) => task.visitId === visit.id && task.intent === "post_visit_instruction",
	);
	const postVisitInstructionReady =
		postVisitInstruction?.status === "completed" || postVisitInstruction?.status === "sent";
	return {
		id: "post-visit-instructions",
		visitId: visit.id,
		title: "Рекомендации пациенту",
		detail: postVisitInstructionReady
			? "Пациент получил рекомендации после приема."
			: "Ассистенту нужно отправить короткую памятку после лечения.",
		ready: Boolean(postVisitInstructionReady),
		blocking: false,
		ownerRole: "assistant",
		section: "communications",
		actionLabel: "Отправить памятку",
	};
}

/**
 * Карточка закрытия ЭТОГО приёма.
 *
 * `facts.visit` обязателен и определяет всё: `visitId` каждого пункта, отбор
 * снимков, документов и памяток. Два разных приёма дают две разные карточки —
 * это проверяется в apps/api/src/db/visitsQuery.test.ts.
 */
export function buildVisitCloseChecklist(facts: VisitCloseChecklistFacts): VisitCloseChecklist {
	const { visit } = facts;

	const items: VisitCloseChecklist["items"] = [
		buildVisitNoteChecklistItem(visit),
		buildClinicalRulesChecklistItem(visit, facts.clinical),
		buildImagingReviewChecklistItem(visit, facts.imagingStudies),
		buildLegalDocumentsChecklistItem(visit, facts.documents),
		buildAiDraftReviewChecklistItem(visit, facts.aiRecognitionJobs),
		buildPaymentLinkChecklistItem(visit, facts.billing),
		buildPostVisitInstructionsChecklistItem(visit, facts.communicationTasks),
	];

	const readyItems = items.filter((item) => item.ready).length;
	const firstOpenBlocking = items.find((item) => item.blocking && !item.ready);
	const firstOpenOptional = items.find((item) => !item.ready);
	const blockingItems = items.filter((item) => item.blocking && !item.ready).length;

	return {
		visitId: visit.id,
		readyToSign: blockingItems === 0,
		score: Math.round((readyItems / items.length) * 100),
		nextAction:
			firstOpenBlocking?.actionLabel ??
			firstOpenOptional?.actionLabel ??
			"Можно подписывать прием",
		blockingItems,
		items,
	};
}
