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
 * а не глобальная переменная. При переезде тексты, признаки `ready`/`blocking`,
 * порядок пунктов и формула счёта не менялись ни на символ.
 *
 * ЧТО ИЗМЕНИЛОСЬ ПОТОМ, И ЭТО ЕДИНСТВЕННАЯ СОДЕРЖАТЕЛЬНАЯ ПРАВКА В ФАЙЛЕ: пункт
 * «Оплата связана» показывал остаток по ВСЕЙ КЛИНИКЕ. Он читал
 * `buildBillingSummary().totalDueRub` — сумму всех позиций лечения минус сумма
 * всех платежей клиники, посчитанную функцией БЕЗ АРГУМЕНТОВ, в которую приём не
 * входил вообще. Замер на живой базе 2026-07-29: все десять приёмов клиники
 * `d0000000-…-d001` получали одну и ту же строку «Остаток по плану 51 400 ₽», в
 * том числе полностью оплаченные. Теперь пункт получает остаток ПО ЭТОМУ ПРИЁМУ в
 * копейках, посчитанный единым домом формулы долга
 * (`apps/api/src/money/patientDebt.ts`, `buildVisitLedger`), плюс отдельный ответ
 * на случай «по приёму нет ни позиций, ни оплат» — там галочка НЕ закрывается.
 *
 * ЧЕГО ЗДЕСЬ НЕТ И БЫТЬ НЕ ДОЛЖНО: чтения базы, чтения общих массивов, дат «сейчас»
 * и любой другой скрытой связи с окружением. Все входные данные — в аргументе;
 * поэтому один и тот же приём даёт один и тот же ответ и в живом маршруте, и в тесте.
 * Денег этот файл тоже НЕ СЧИТАЕТ: он получает готовые копейки и печатает их общей
 * `formatKopecksRu` — своей арифметики и своего форматирования суммы здесь нет.
 */

import {
	type DocumentKind,
	formatKopecksRu,
	type VisitCloseChecklist,
} from "@dental/shared";

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

/**
 * Деньги ЭТОГО приёма. Считает их вызывающий через единый дом формулы долга
 * (apps/api/src/money/patientDebt.ts, `buildVisitLedger`) — здесь ни одной новой
 * формулы, только текст пункта.
 *
 * ЧТО ЗДЕСЬ БЫЛО И ПОЧЕМУ ЭТО ВРЕДИЛО КЛИНИКЕ. Поле называлось `totalDueRub` и
 * приходило из `buildBillingSummary()` — функции БЕЗ АРГУМЕНТОВ, которая
 * складывает все позиции лечения и все платежи КЛИНИКИ и вычитает одно из
 * другого. Приём в расчёт не входил вообще. Замер на живой базе 2026-07-29: все
 * ДЕСЯТЬ приёмов клиники `d0000000-…-d001` получали одну и ту же строку «Остаток
 * по плану 51 400 ₽» и незакрытую галочку — включая приём `…-000000000401`, где
 * пациент заплатил 5 400,00 из 5 400,00, то есть ровно всё. Администратор,
 * закрывающий такой приём, требовал с пациента 51 400 ₽, которых тот не должен.
 *
 * ПОЧЕМУ КОПЕЙКИ, А НЕ РУБЛИ. Число приходит из `numeric(12, 2)` и печатается
 * пациенту. Рубли в плавающей точке этого не выдерживают: `1000.00 + 1001.82 +
 * 1489.67` даёт `3491.4900000000002`. Целые копейки плюс общая печать
 * `formatKopecksRu` — единственный путь, на котором сумма в карточке равна сумме
 * в базе.
 */
export type VisitCloseChecklistBillingFacts =
	| {
			/**
			 * Ответ ЕСТЬ. Остаток по приёму в копейках, ≥ 0
			 * (`visitOutstandingKopecks`).
			 */
			readonly known: true;
			readonly outstandingKopecks: number;
			/**
			 * Переплата по приёму в копейках, ≥ 0 (`visitOverpaidKopecks`). Без неё
			 * нулевой остаток означал бы сразу «рассчитались ровно» и «переплатили».
			 */
			readonly overpaidKopecks: number;
			/** Сколько позиций и оплат приёма посчитано — чтобы число было проверяемо. */
			readonly billedLineCount: number;
			readonly paidPaymentCount: number;
	  }
	| {
			/**
			 * Ответа НЕТ, и это не ноль.
			 *
			 * Отдельная ветка, а не `outstandingKopecks: 0`, ровно по той причине,
			 * которая уже записана в этом дереве для печатных документов
			 * (`apps/api/src/tests/unknownIsNotZero.test.ts`): «остаток 0» читается
			 * как «доплачивать нечего». Галочка, закрытая по незнанию, хуже
			 * незакрытой — незакрытую администратор проверит, закрытую нет.
			 */
			readonly known: false;
			/** Причина попадает в текст пункта, а не теряется по дороге. */
			readonly reason: string;
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

/**
 * Пункт «Оплата связана» — про ЭТОТ приём, а не про клинику.
 *
 * Три исхода, и ни один из них не выглядит как другой:
 *   • остаток известен и больше нуля — сумма ПО ПРИЁМУ плюс счётчики строк,
 *     чтобы «недоплатил 26 500» отличалось от «оплату не привязали к приёму»;
 *   • остаток известен и равен нулю — оплата закрыта, галочка закрыта; переплата,
 *     если она есть, называется здесь же, иначе клиника не узнает, что должна
 *     вернуть деньги;
 *   • ответа нет — галочка НЕ закрывается, а текст говорит причину.
 */
function buildPaymentLinkChecklistItem(
	visit: VisitCloseChecklistVisit,
	billing: VisitCloseChecklistBillingFacts,
): ChecklistItem {
	const detail = paymentLinkDetail(billing);
	return {
		id: "payment-link",
		visitId: visit.id,
		title: "Оплата связана",
		detail,
		/*
		 * Тернарник, а не `billing.known && …`: при `known: undefined` (вызывающий
		 * прислал объект не той формы — например, старую сводку по клинике)
		 * конъюнкция вернула бы `undefined`, а поле `ready` в контракте
		 * (`visitCloseChecklistItemSchema`) объявлено булевым, и карточка перестала
		 * бы разбираться схемой уже ПОСЛЕ подписания приёма. Незакрытая галочка —
		 * правильный ответ на непонятную форму фактов.
		 */
		ready: billing.known ? billing.outstandingKopecks === 0 : false,
		blocking: false,
		ownerRole: "administrator",
		section: "finance",
		actionLabel: "Проверить оплату",
	};
}

function paymentLinkDetail(billing: VisitCloseChecklistBillingFacts): string {
	if (!billing.known) {
		return `Остаток по приёму не рассчитан: ${billing.reason}`;
	}
	if (billing.outstandingKopecks > 0) {
		return (
			`Остаток по приёму ${formatKopecksRu(billing.outstandingKopecks)} ` +
			`(позиций ${billing.billedLineCount}, оплат ${billing.paidPaymentCount}).`
		);
	}
	if (billing.overpaidKopecks > 0) {
		return (
			`Приём оплачен полностью, переплата ${formatKopecksRu(billing.overpaidKopecks)} — ` +
			"вернуть пациенту или зачесть в счёт следующего приёма."
		);
	}
	return `Оплата по приёму закрыта: остаток ${formatKopecksRu(0)}.`;
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
