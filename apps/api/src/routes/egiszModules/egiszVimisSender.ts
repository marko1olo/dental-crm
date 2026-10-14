import { EgiszOutboxDispatcher } from "../../services/egisz/EgiszOutboxDispatcher.js";
import type { EgiszRemdPackage } from "../../services/cda/index.js";
import { isValidSnils } from "../../utils/snils.js";
import type { EgiszTransmissionStatus, VimisReceipt } from "./egiszTypes.js";

export const STATUTORY_FLK_ERROR_DICTIONARY: Record<string, string> = {
	"FLK-001": "Некорректный формат СНИЛС пациента (ошибка контрольной суммы).",
	"FLK-002": "Лечащий врач с указанным СНИЛС не найден в реестре ФРМР.",
	"FLK-003": "Медицинская организация с данным OID не зарегистрирована в ФРМО.",
	"FLK-004": "Недействительный сертификат ЭЦП врача (истёк срок действия или отозван).",
	"FLK-005": "Код МКБ-10 отсутствует в классификаторе Минздрава РФ.",
	"FLK-006": "Код услуги отсутствует в номенклатуре медицинских услуг 804н.",
	"FLK-007": "Нарушена структура XML CDA R2 (ошибка XSD-схемы Минздрава).",
	"FLK-008": "Пациент оформил отказ от выгрузки в ЕГИСЗ (152-ФЗ / 323-ФЗ).",
};

export interface SendVimisPackageOptions {
	organizationId: string;
	patientId: string;
	visitId: string;
	doctorId: string;
	pkg: EgiszRemdPackage;
	actorUserId?: string | null | undefined;
	isSync?: boolean;
}

export interface VimisSendResult {
	success: boolean;
	queued: boolean;
	outboxId: string;
	logId: string;
	status: EgiszTransmissionStatus;
	regNumber: string;
	transactionId: string;
	canonicalXmlLength: number;
	flkErrors?: readonly string[] | undefined;
	message?: string;
}

/**
 * Расшифровка кодов ошибок форматно-логического контроля (ФЛК) ЕГИСЗ/ВИМИС.
 */
export function parseFlkErrors(rawErrors: unknown): readonly string[] {
	if (!Array.isArray(rawErrors)) {
		if (typeof rawErrors === "string" && rawErrors.trim().length > 0) {
			const found = STATUTORY_FLK_ERROR_DICTIONARY[rawErrors.trim()];
			return [found ?? rawErrors.trim()];
		}
		return [];
	}

	return rawErrors.map((err) => {
		if (typeof err === "string") {
			return STATUTORY_FLK_ERROR_DICTIONARY[err] ?? err;
		}
		if (err && typeof err === "object" && "code" in err) {
			const code = String((err as { code: unknown }).code);
			return STATUTORY_FLK_ERROR_DICTIONARY[code] ?? String((err as { message?: unknown }).message ?? code);
		}
		return JSON.stringify(err);
	});
}

/**
 * Отправка пакета СЭМД в подсистему ВИМИС «Стоматология» / РЭМД ЕГИСЗ.
 * Включает предварительный ФЛК, постановку в Outbox и обработку квитанций.
 */
export async function dispatchPackageToVimis(
	options: SendVimisPackageOptions,
): Promise<VimisSendResult> {
	// Предварительный форматно-логический контроль на стороне клиники
	const flkIssues: string[] = [];
	const patientSnils = options.pkg.metadata.patientSnils ?? "";
	if (!isValidSnils(patientSnils)) {
		const flk001 = STATUTORY_FLK_ERROR_DICTIONARY["FLK-001"];
		if (flk001) flkIssues.push(flk001);
	}

	if (flkIssues.length > 0) {
		return {
			success: false,
			queued: false,
			outboxId: options.visitId,
			logId: options.visitId,
			status: "Rejected",
			regNumber: "",
			transactionId: options.visitId,
			canonicalXmlLength: options.pkg.xmlCanonicalPayload.length,
			flkErrors: flkIssues,
			message: "Пакет отклонен входным форматно-логическим контролем (ФЛК)",
		};
	}

	const dispatcher = new EgiszOutboxDispatcher();

	const enqueueRes = await dispatcher.enqueueSignedPackage({
		organizationId: options.organizationId,
		patientId: options.patientId,
		visitId: options.visitId,
		doctorId: options.doctorId,
		documentId: options.pkg.documentId,
		pkg: options.pkg,
		actorUserId: options.actorUserId || undefined,
	});

	if (options.isSync) {
		const dispatchResult = await dispatcher.processPendingQueue(options.organizationId, 1);
		const itemResult = dispatchResult.results.find(
			(r) => r.outboxId === enqueueRes.outboxId || r.visitId === options.visitId,
		);
		const isSuccess =
			itemResult?.status === "Registered" ||
			itemResult?.status === "Sent" ||
			itemResult?.status === "registered_in_remd";

		const rawErr = itemResult?.error;
		const decodedErrors = rawErr ? parseFlkErrors(rawErr) : undefined;

		const rawStatus = itemResult?.status;
		const mappedStatus: EgiszTransmissionStatus =
			rawStatus === "registered_in_remd" || rawStatus === "Registered"
				? "Registered"
				: rawStatus === "rejected_by_remd" || rawStatus === "Rejected"
					? "Rejected"
					: rawStatus === "failed" || rawStatus === "Error"
						? "Error"
						: isSuccess
							? "Sent"
							: itemResult
								? "Error"
								: "Pending";

		return {
			success: isSuccess,
			queued: false,
			outboxId: enqueueRes.outboxId,
			logId: enqueueRes.logId,
			status: mappedStatus,
			transactionId: itemResult?.transactionId || enqueueRes.outboxId,
			regNumber: itemResult?.transactionId || enqueueRes.outboxId,
			canonicalXmlLength: enqueueRes.canonicalXmlLength,
			...(decodedErrors !== undefined ? { flkErrors: decodedErrors } : {}),
			...(rawErr ? { message: String(rawErr) } : !isSuccess ? { message: "Ошибка при передаче документа в РЭМД" } : {}),
		};
	}

	const regNumber = `РЭМД-77-2026-${enqueueRes.outboxId.slice(0, 8).toUpperCase()}`;

	return {
		success: true,
		queued: true,
		outboxId: enqueueRes.outboxId,
		logId: enqueueRes.logId,
		status: enqueueRes.status as EgiszTransmissionStatus,
		transactionId: enqueueRes.outboxId,
		regNumber,
		canonicalXmlLength: enqueueRes.canonicalXmlLength,
		message: "Пакет СЭМД успешно принят в очередь отправки в РЭМД ЕГИСЗ Минздрава",
	};
}
