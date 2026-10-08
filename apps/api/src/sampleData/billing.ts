/**
 * @file billing.ts
 * @description Layer 2: Billing summary, checklists, payments, fiscal receipts.
 */
import { randomUUID } from "node:crypto";
import { inMemoryDomainState } from "./domainState.js";
import { normalizeDateOnlyInput } from "./organizations.js";
import { recordAuditEvent } from "./audit.js";


import type {
	BillingSummary,
	CreatePaymentInput,
	Payment,
	Visit,
} from "@dental/shared";
import {
	buildVisitLedger,
	QuantityContractError,
	rublesFromKopecks,
	visitOutstandingKopecks,
	visitOverpaidKopecks,
} from "../money/patientDebt.js";
import { buildVisitCloseChecklist, type VisitCloseChecklistFacts } from "../visitCloseChecklist.js";
import { getServiceCatalogItem, serviceCatalog, serviceCatalogMap } from "./priceList.js";
import { treatmentPlanItems } from "./clinicalRecords.js";
import { buildClinicalRuleSummary } from "./clinicalRules.js";
import { documents } from "./documents.js";
import { organizationId, marinaPatientId, activeVisitId, nowIso } from "./fixtureIds.js";
import { persistMutableState } from "./stateNotifier.js";

export const payments: Payment[] = [
	{
		id: "baf18e54-608e-4bc5-9f20-57df0f742795",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		documentId: "59b724c7-c988-45a7-91d8-1ad11a6e74c7",
		amountRub: 3000,
		method: "card",
		status: "paid",
		paidAt: "2026-05-12T10:05:00+04:00",
		createdAt: nowIso,
		fiscalReceiptNumber: "FN-2026-000001",
		fiscalReceiptIssuedAt: "2026-05-12T10:05:00+04:00",
		fiscalReceiptUrl: "https://example.com/fiscal/FN-2026-000001",
		fiscalReceipt: {
			fn: "9287440300000001",
			fd: "123456",
			fpd: "9876543210",
			cashierName: "Администратор DENTE",
			receiptUrl: "https://example.com/fiscal/FN-2026-000001",
			operationType: "income",
		},
		payerFullName: "Иванова Марина Сергеевна",
		payerInn: "123456789012",
		payerBirthDate: "1988-04-21",
		payerIdentityDocument: "паспорт РФ 3600 000000, выдан 01.01.2018",
		payerRelationship: "пациент",
		taxDeductionCode: "1",
		note: "Частичная оплата лечения 36.",
	},
];

let uiPreferences: UiPreferences | null = null;


function roundToKopecks(value: number): number {
	return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function treatmentLineTotal(item: TreatmentPlanItem): number {
	return Math.max(
		0,
		roundToKopecks(item.unitPriceRub * item.quantity - item.discountRub),
	);
}

export function buildBillingSummary(
	state: DomainState = inMemoryDomainState,
): BillingSummary {
	const { treatmentPlanItems, payments, documents } = state;
	let totalPlannedRub = 0;
	let totalDiscountRub = 0;
	let taxDeductionEligibleRub = 0;
	let openTreatmentItems = 0;

	for (let i = 0; i < treatmentPlanItems.length; i++) {
		const item = treatmentPlanItems[i];
		if (!item || item.status === "cancelled") continue;

		const lineTotal = treatmentLineTotal(item);
		totalPlannedRub += lineTotal;
		totalDiscountRub += item.discountRub;

		const service = getServiceCatalogItem(item.serviceId, state);
		if (service?.taxDeductible) {
			taxDeductionEligibleRub += lineTotal;
		}

		if (item.status !== "completed") {
			openTreatmentItems += 1;
		}
	}

	let totalPaidRub = 0;
	const paidDocumentIds = new Set<string>();
	for (let i = 0; i < payments.length; i++) {
		const payment = payments[i];
		if (!payment) continue;

		if (payment.status === "paid") {
			totalPaidRub += payment.amountRub;
			if (payment.documentId) {
				paidDocumentIds.add(payment.documentId);
			}
		}
	}

	let draftDocumentAmountRub = 0;
	let unpaidDocuments = 0;
	for (let i = 0; i < documents.length; i++) {
		const document = documents[i];
		if (!document) continue;

		if (document.status === "draft") {
			const amount = document.totalAmountRub ?? 0;
			draftDocumentAmountRub += amount;

			if (amount > 0 && !paidDocumentIds.has(document.id)) {
				unpaidDocuments += 1;
			}
		}
	}

	return {
		totalPlannedRub: roundToKopecks(totalPlannedRub),
		totalDiscountRub: roundToKopecks(totalDiscountRub),
		totalPaidRub: roundToKopecks(totalPaidRub),
		totalDueRub: Math.max(0, roundToKopecks(totalPlannedRub - totalPaidRub)),
		taxDeductionEligibleRub: roundToKopecks(taxDeductionEligibleRub),
		draftDocumentAmountRub: roundToKopecks(draftDocumentAmountRub),
		openTreatmentItems,
		unpaidDocuments,
	};
}

/**
 * Деньги ЭТОГО приёма для карточки закрытия — через единый дом формулы долга.
 *
 * ЧТО БЫЛО НЕ ТАК. Здесь стояло `billing: buildBillingSummary()`. Эта функция не
 * принимает аргументов и складывает ВСЕ позиции лечения и ВСЕ платежи клиники,
 * вычитая одно из другого одним действием (`:1349`, `totalDueRub`). Приём в
 * расчёт не входил вообще, поэтому карточка любого приёма показывала одно и то же
 * число — нетто по клинике. Замер на живой базе 2026-07-29: 51 400,00 ₽ во всех
 * десяти приёмах клиники `d0000000-…-d001`, включая приём `…-000000000401`, где
 * получено 5 400,00 из 5 400,00. Разбор величины и приговор ей —
 * `.agents/lead/recon-debt-formula-sprawl.md` (место #3, «иная семантика: нетто
 * по клинике, а не долг пациента»).
 *
 * ШЕСТОЙ ФОРМУЛЫ ЗДЕСЬ НЕ ЗАВЕДЕНО. Сальдо приёма считает
 * `money/patientDebt.ts` (`buildVisitLedger`) — тот же дом, что отвечает на
 * вопросы про пациента и клинику, и та же первичная величина
 * `назначено − оплачено`. В этом файле осталась только пересадка полей
 * коллекций в строки модуля.
 *
 * ПОЧЕМУ ОТКАЗ МОДУЛЯ ЛОВИТСЯ, А НЕ ЛЕТИТ НАВЕРХ. Модуль отвергает суммы,
 * потерявшие точность, и нецелое количество — это правильно для расчёта, но эти
 * факты собираются в том числе на пути ПОДПИСАНИЯ приёма, где исключение
 * означает HTTP 500 на уже подписанной карте (ровно тот дефект, из-за которого
 * появился `visitCloseChecklist.ts`; см. `db/visitsQuery.ts`,
 * `VisitSignedResponseIncompleteError`). Врач теряет подтверждение подписи из-за
 * испорченной цены в чужой позиции — цена несоразмерная. Поэтому отказ
 * превращается в честное «остаток по приёму не рассчитан» С ПРИЧИНОЙ: галочка
 * остаётся незакрытой, число не выдумывается, а причина уходит на экран
 * администратору. Любая ДРУГАЯ ошибка летит наверх как раньше.
 */
function visitBillingChecklistFacts(
	visit: Visit,
	state: DomainState = inMemoryDomainState,
): VisitCloseChecklistFacts["billing"] {
	const { treatmentPlanItems, payments } = state;
	let ledger: VisitLedger;
	try {
		ledger = buildVisitLedger(visit.id, treatmentPlanItems, payments);
	} catch (error) {
		if (
			error instanceof MoneyPrecisionError ||
			error instanceof QuantityContractError
		) {
			return { known: false, reason: error.message };
		}
		throw error;
	}

	const outstandingKopecks = visitOutstandingKopecks(ledger);
	const overpaidKopecks = visitOverpaidKopecks(ledger);
	if (outstandingKopecks === null || overpaidKopecks === null) {
		// «Ноль» и «неизвестно» — разные ответы, и второй обязан выглядеть иначе.
		return {
			known: false,
			reason:
				"по приёму не заведено ни одной позиции лечения и ни одной оплаты. " +
				"Свяжите позиции плана и платежи с этим приёмом, иначе закрывать оплату нечем.",
		};
	}

	return {
		known: true,
		outstandingKopecks,
		overpaidKopecks,
		billedLineCount: ledger.billedLineCount,
		paidPaymentCount: ledger.paidPaymentCount,
	};
}

/**
 * Факты для карточки закрытия КОНКРЕТНОГО приёма.
 *
 * Сам расчёт переехал в visitCloseChecklist.ts и он один на весь проект. Здесь
 * остался только сбор данных из доменных коллекций — тех же, что читались
 * раньше, поэтому главный экран собирается прежним. Разница в одном: приём
 * передаётся аргументом, а не берётся из общей переменной `activeVisit`.
 *
 * Почему это важно: слой доступа к базе (db/visitsQuery.ts) подписывает
 * КОНКРЕТНЫЙ приём и обязан отдать карточку именно по нему. Пока приём брался из
 * общего состояния, воспользоваться этим расчётом он не мог — и врач на
 * подписании карты получал HTTP 500 при уже подписанном приёме.
 *
 * ЭКСПОРТИРУЕТСЯ РАДИ ЕДИНСТВЕННОГО СБОРЩИКА ФАКТОВ. Слой доступа собирал этот
 * же объект своим литералом (`db/visitsQuery.ts`), то есть сборка фактов
 * существовала в двух копиях при одном расчёте. Пока в фактах были только
 * коллекции, копии совпадали; с появлением денег ПО ПРИЁМУ вторая копия стала бы
 * тем самым местом, куда правку не внесли. Теперь обе стороны зовут одну функцию.
 */
export function visitCloseChecklistFactsFor(
	visit: Visit,
	state: DomainState = inMemoryDomainState,
): VisitCloseChecklistFacts {
	const { imagingStudies, documents, aiRecognitionJobs, communicationTasks } =
		state;
	return {
		visit,
		imagingStudies,
		documents,
		aiRecognitionJobs,
		communicationTasks,
		clinical: buildClinicalRuleSummary(visit.patientId, state),
		billing: visitBillingChecklistFacts(visit, state),
	};
}

function normalizeFiscalReceiptDetails(
	input: CreatePaymentInput["fiscalReceipt"],
): Payment["fiscalReceipt"] {
	if (!input) return null;
	const fn = cleanNullableText(input.fn);
	const fd = cleanNullableText(input.fd);
	const fpd = cleanNullableText(input.fpd);
	const cashierName = cleanNullableText(input.cashierName);
	const receiptUrl = cleanNullableText(input.receiptUrl);
	if (!fn && !fd && !fpd && !cashierName && !receiptUrl) return null;
	const fiscalReceipt = {
		fn,
		fd,
		fpd,
		cashierName,
		receiptUrl,
		operationType: input.operationType ?? "income",
	};
	return fiscalReceipt;
}

function fiscalReceiptLabel(
	fiscalReceipt: Payment["fiscalReceipt"],
): string | null {
	if (!fiscalReceipt) return null;
	const parts = [
		fiscalReceipt.fn ? `ФН ${fiscalReceipt.fn}` : null,
		fiscalReceipt.fd ? `ФД ${fiscalReceipt.fd}` : null,
		fiscalReceipt.fpd ? `ФПД ${fiscalReceipt.fpd}` : null,
	].filter(Boolean);
	return parts.length ? parts.join("; ") : null;
}

function assertPaidPaymentFiscalReceiptOperation(
	input: CreatePaymentInput,
): void {
	if (input.fiscalReceipt?.operationType === "income_return") {
		throw new Error(
			"Возвратный фискальный чек нельзя записывать как новую оплату",
		);
	}
}

function _findPaymentByClientMutationId(
	clientMutationId: string | null | undefined,
): Payment | null {
	const normalizedClientMutationId = clientMutationId?.trim();
	if (!normalizedClientMutationId) return null;
	return (
		payments.find(
			(payment) => payment.clientMutationId === normalizedClientMutationId,
		) ?? null
	);
}

function _createPayment(input: CreatePaymentInput): Payment {
	const createdAt = new Date().toISOString();
	assertPaidPaymentFiscalReceiptOperation(input);
	const fiscalReceipt = normalizeFiscalReceiptDetails(input.fiscalReceipt);
	const clientMutationId = input.clientMutationId?.trim() || null;
	const effectiveMethod =
		input.method === "split" || input.method === "mixed"
			? "card"
			: input.method;
	const payment: Payment = {
		id: randomUUID(),
		organizationId,
		patientId: input.patientId,
		visitId: input.visitId ?? null,
		documentId: input.documentId ?? null,
		amountRub: input.amountRub,
		method: effectiveMethod,
		status: "paid",
		paidAt: createdAt,
		createdAt,
		fiscalReceiptNumber:
			input.fiscalReceiptNumber?.trim() ||
			fiscalReceiptLabel(fiscalReceipt) ||
			null,
		fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt?.trim() || null,
		fiscalReceiptUrl:
			input.fiscalReceiptUrl?.trim() ||
			fiscalReceipt?.receiptUrl?.trim() ||
			null,
		fiscalReceipt,
		clientMutationId,
		payerFullName: input.payerFullName?.trim() || null,
		payerInn: input.payerInn?.trim() || null,
		payerBirthDate: normalizeDateOnlyInput(
			input.payerBirthDate,
			"Дата рождения плательщика",
		),
		payerIdentityDocument: input.payerIdentityDocument?.trim() || null,
		payerRelationship: input.payerRelationship?.trim() || null,
		taxDeductionCode: input.taxDeductionCode ?? null,
		note: input.note ?? null,
	};
	payments.unshift(payment);
	recordAuditEvent({
		entityType: "payment",
		entityId: payment.id,
		action: "payment_recorded",
		reason: [
			`Оплата ${payment.amountRub.toLocaleString("ru-RU")} ₽ записана из рабочего экрана.`,
			clientMutationId ? `Клиентская операция ${clientMutationId}.` : null,
		]
			.filter(Boolean)
			.join(" "),
	});
	return payment;
}

