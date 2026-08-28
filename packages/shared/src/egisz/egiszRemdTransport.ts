/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD TRANSPORT & LIFECYCLE STATE MACHINE (МИНЗДРАВ РФ / ФРЭМД)
 * (ПРИКАЗ 911Н / ЕГИСЗ РЭМД SOAP 1.2 / REST V3 / ГОСТ Р 34.10-2012)
 *
 * Statutory implementation of Federal REMD EGISZ communication protocol:
 * 1. SOAP 1.2 / MTOM and REST transport envelopes for document submission.
 * 2. Strict SEMD lifecycle state machine:
 *    DRAFT -> SIGNED_DOCTOR -> SIGNED_CLINIC -> SENT_TO_REMD -> REGISTERED_SUCCESS / REJECTED_ERROR.
 * 3. Diagnostic catalog and parser for REMD validation error codes:
 *    (FRMR SNILS mismatch, expired certificate, XSD violation, Nomenclature 804n OID error, etc.)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import { EGISZ_OIDS } from "../cda/oids.js";
import { canonicalizeCdaXml, computeCdaSha256Hex, escapeXml, formatHl7DateTime } from "../cda/c14n.js";
import { generateUuidV7 } from "../sync/hashing.js";
import {
	computeGost3411_2012_256Hex,
	type CadesBesSignature,
	type DualUkepSigningSession,
} from "./egiszCryptoProEngine.js";

// ─── 1. Типы и Схемы жизненного цикла СЭМД ─────────────────────────────────

export type SemdLifecycleState =
	| "DRAFT"
	| "SIGNED_DOCTOR"
	| "SIGNED_CLINIC"
	| "SENT_TO_REMD"
	| "REGISTERED_SUCCESS"
	| "REJECTED_ERROR"
	| "CANCELLED";

export type SemdLifecycleAction =
	| "SIGN_DOCTOR"
	| "SIGN_CLINIC"
	| "SUBMIT_TO_REMD"
	| "CONFIRM_REGISTRATION"
	| "REJECT_REGISTRATION"
	| "RETRY_SUBMISSION"
	| "CANCEL_DOCUMENT";

export const semdLifecycleStateSchema = z.enum([
	"DRAFT",
	"SIGNED_DOCTOR",
	"SIGNED_CLINIC",
	"SENT_TO_REMD",
	"REGISTERED_SUCCESS",
	"REJECTED_ERROR",
	"CANCELLED",
]);

export const semdLifecycleActionSchema = z.enum([
	"SIGN_DOCTOR",
	"SIGN_CLINIC",
	"SUBMIT_TO_REMD",
	"CONFIRM_REGISTRATION",
	"REJECT_REGISTRATION",
	"RETRY_SUBMISSION",
	"CANCEL_DOCUMENT",
]);

export interface SemdStateTransitionRecord {
	id: string;
	fromState: SemdLifecycleState;
	toState: SemdLifecycleState;
	action: SemdLifecycleAction;
	timestamp: string; // ISO 8601
	performedBy: {
		snils?: string | undefined;
		userId?: string | undefined;
		userName?: string | undefined;
		role?: string | undefined;
	};
	notes?: string | undefined;
	error?: RemdErrorDiagnostic | undefined;
	metadata?: Record<string, unknown> | undefined;
}

export interface SemdDocumentLifecycleRecord {
	documentId: string;
	documentVersion: number;
	docTypeNsiCode: string;
	currentState: SemdLifecycleState;
	transitions: SemdStateTransitionRecord[];
	remdRegistrationNumber: string | null;
	remdRegisteredAt: string | null;
	lastError: RemdErrorDiagnostic | null;
	clinicOid: string;
	clinicOgrn: string;
	patientSnils: string | null;
	doctorSnils: string;
	createdAt: string;
	updatedAt: string;
}

// ─── 2. Каталог типовых кодов ошибок валидации ФРЭМД ───────────────────────

export type RemdErrorCategory =
	| "CERTIFICATE"
	| "FRMR_DOCTOR"
	| "FRMO_CLINIC"
	| "XSD_SCHEMA"
	| "OID_CLASSIFIER"
	| "CHECKSUM_SIGNATURE"
	| "DUPLICATE"
	| "SYSTEM"
	| "DOCUMENT";

export interface RemdErrorDiagnostic {
	code: string;
	category: RemdErrorCategory;
	title: string;
	description: string;
	technicalDetail?: string | undefined;
	remediation: string;
	isRetryable: boolean;
	affectedEntity: "DOCTOR" | "CLINIC" | "PATIENT" | "DOCUMENT" | "NETWORK";
}

export const REMD_ERROR_CATALOG: Record<string, Omit<RemdErrorDiagnostic, "technicalDetail">> = {
	REMD_ERR_001: {
		code: "REMD_ERR_001",
		category: "FRMR_DOCTOR",
		title: "Несовпадение СНИЛС врача со сведениями в ФРМР",
		description: "СНИЛС автора документа не найден в Федеральном регистре медицинских работников (ФРМР) или врач не прикреплен к данной медицинской организации.",
		remediation: "Проверьте профиль врача в ЕГИСЗ ФРМР и убедитесь, что СНИЛС внесен корректно и трудовой договор активен.",
		isRetryable: false,
		affectedEntity: "DOCTOR",
	},
	REMD_ERR_002: {
		code: "REMD_ERR_002",
		category: "CERTIFICATE",
		title: "Недействительный сертификат УКЭП",
		description: "Квалифицированный сертификат электронной подписи истек, отозван аккредитованным УЦ или имеет недействительную цепочку доверия Головного УЦ Минцифры.",
		remediation: "Обновите квалифицированный сертификат врача или МО в УЦ (ФНС / Минцифры / Казначейство).",
		isRetryable: false,
		affectedEntity: "DOCTOR",
	},
	REMD_ERR_003: {
		code: "REMD_ERR_003",
		category: "XSD_SCHEMA",
		title: "Нарушение XSD-схемы клинического документа",
		description: "XML-структура документа не соответствует официальной XSD-схеме СЭМД Минздрава РФ (отсутствуют обязательные теги или нарушен порядок элементов).",
		remediation: "Проверьте генератор CDA XML на соответствие спецификации СЭМД и заполните все обязательные клинические секции.",
		isRetryable: false,
		affectedEntity: "DOCUMENT",
	},
	REMD_ERR_004: {
		code: "REMD_ERR_004",
		category: "OID_CLASSIFIER",
		title: "Некорректный код услуги по Номенклатуре 804н",
		description: "Указанный код медицинской услуги отсутствует в реестре НСИ Минздрава (OID 1.2.643.5.1.13.13.11.1070, Приказ 804н).",
		remediation: "Используйте официальные коды Номенклатуры 804н (например, A16.07.002.001, B01.065.001).",
		isRetryable: false,
		affectedEntity: "DOCUMENT",
	},
	REMD_ERR_005: {
		code: "REMD_ERR_005",
		category: "FRMO_CLINIC",
		title: "Медицинская организация не найдена в ФРМО",
		description: "OID организации (1.2.643.5.1.13.13.12.2...) или ОГРН не зарегистрированы в Федеральном реестре медицинских организаций ЕГИСЗ.",
		remediation: "Проверьте OID клиники в паспорте медицинской организации в ЕГИСЗ ФРМО.",
		isRetryable: false,
		affectedEntity: "CLINIC",
	},
	REMD_ERR_006: {
		code: "REMD_ERR_006",
		category: "CHECKSUM_SIGNATURE",
		title: "Несоответствие контрольной суммы C14N XML и подписи CAdES-BES",
		description: "Хэш-сумма документа ГОСТ Р 34.11-2012 не совпадает со значением messageDigest внутри открепленной подписи .p7s (документ был изменен после подписания).",
		remediation: "Выполните повторную канонизацию W3C C14N и переподпишите документ квалифицированной ЭП врача.",
		isRetryable: true,
		affectedEntity: "DOCUMENT",
	},
	REMD_ERR_007: {
		code: "REMD_ERR_007",
		category: "DUPLICATE",
		title: "Дубликат идентификатора документа в РЭМД",
		description: "Документ с данным идентификатором и номером версии уже зарегистрирован в Федеральном РЭМД.",
		remediation: "Для внесения изменений увеличьте номер версии документа (documentVersion) или сформируйте новый уникальный UUID документа.",
		isRetryable: false,
		affectedEntity: "DOCUMENT",
	},
	REMD_ERR_008: {
		code: "REMD_ERR_008",
		category: "CERTIFICATE",
		title: "Отсутствует обязательная подпись медицинской организации (УКЭП МО)",
		description: "Федеральный РЭМД требует двухфакторное подписание: подпись врача и подпись медицинской организации (Главного врача).",
		remediation: "Накложите подпись медицинской организации (УКЭП МО) на документ перед отправкой.",
		isRetryable: true,
		affectedEntity: "CLINIC",
	},
	REMD_ERR_009: {
		code: "REMD_ERR_009",
		category: "OID_CLASSIFIER",
		title: "Некорректный код должности/специальности врача",
		description: "Код должности врача не соответствует справочнику НСИ Минздрава 1.2.643.5.1.13.13.11.1002.",
		remediation: "Укажите верный цифровой код должности по справочнику (например, 71 для врача-стоматолога-терапевта).",
		isRetryable: false,
		affectedEntity: "DOCTOR",
	},
	REMD_ERR_010: {
		code: "REMD_ERR_010",
		category: "DOCUMENT",
		title: "Невалидный СНИЛС пациента",
		description: "Контрольная сумма 11-значного номера СНИЛС пациента не сходится по алгоритму ПФР № 192п.",
		remediation: "Проверьте и исправьте номер СНИЛС в карточке пациента.",
		isRetryable: false,
		affectedEntity: "PATIENT",
	},
	REMD_ERR_011: {
		code: "REMD_ERR_011",
		category: "DOCUMENT",
		title: "Несоответствие версии шаблона СЭМД",
		description: "Версия структуры СЭМД устарела или не поддерживается контуром ФРЭМД.",
		remediation: "Обновите генератор клинических документов до актуальной редакции шаблонов Минздрава.",
		isRetryable: false,
		affectedEntity: "DOCUMENT",
	},
	REMD_ERR_012: {
		code: "REMD_ERR_012",
		category: "DOCUMENT",
		title: "Превышен максимальный размер пакета РЭМД",
		description: "Размер транспортного пакета с вложениями превышает установленный лимит 50 МБ.",
		remediation: "Оптимизируйте размер вложений или исключите тяжелые несжатые растровые файлы.",
		isRetryable: false,
		affectedEntity: "DOCUMENT",
	},
	REMD_ERR_099: {
		code: "REMD_ERR_099",
		category: "SYSTEM",
		title: "Внутренняя ошибка сервиса интеграции ФРЭМД",
		description: "Временный технологический сбой или регламентные работы на стороне Федерального РЭМД ЕГИСЗ.",
		remediation: "Повторите отправку документа через несколько минут (экспоненциальный бэкофф).",
		isRetryable: true,
		affectedEntity: "NETWORK",
	},
};

/**
 * Ищет ошибку в каталоге по коду или тексту сообщения
 */
export function lookupRemdErrorCode(codeOrText: string): RemdErrorDiagnostic {
	if (!codeOrText) {
		return {
			...REMD_ERROR_CATALOG.REMD_ERR_099!,
			technicalDetail: "Неизвестная ошибка",
		};
	}

	const upper = codeOrText.toUpperCase();

	// Прямой поиск по коду
	for (const key of Object.keys(REMD_ERROR_CATALOG)) {
		if (upper.includes(key)) {
			return {
				...REMD_ERROR_CATALOG[key]!,
				technicalDetail: codeOrText,
			};
		}
	}

	// Поиск по ключевым словам
	if (upper.includes("ФРМР") || upper.includes("FRMR") || upper.includes("СНИЛС ВРАЧА")) {
		return { ...REMD_ERROR_CATALOG.REMD_ERR_001!, technicalDetail: codeOrText };
	}
	if (upper.includes("СЕРТИФИКАТ") || upper.includes("CERTIFICATE") || upper.includes("ИСТЕК") || upper.includes("ОТОЗВАН")) {
		return { ...REMD_ERROR_CATALOG.REMD_ERR_002!, technicalDetail: codeOrText };
	}
	if (upper.includes("XSD") || upper.includes("SCHEMA") || upper.includes("ВАЛИДАЦИИ СХЕМЫ")) {
		return { ...REMD_ERROR_CATALOG.REMD_ERR_003!, technicalDetail: codeOrText };
	}
	if (upper.includes("804Н") || upper.includes("НОМЕНКЛАТУР") || upper.includes("SERVICE CODE")) {
		return { ...REMD_ERROR_CATALOG.REMD_ERR_004!, technicalDetail: codeOrText };
	}
	if (upper.includes("ФРМО") || upper.includes("FRMO") || upper.includes("ОГРН КЛИНИКИ")) {
		return { ...REMD_ERROR_CATALOG.REMD_ERR_005!, technicalDetail: codeOrText };
	}
	if (upper.includes("ХЭШ") || upper.includes("DIGEST") || upper.includes("CHECKSUM") || upper.includes("CADES")) {
		return { ...REMD_ERROR_CATALOG.REMD_ERR_006!, technicalDetail: codeOrText };
	}
	if (upper.includes("ДУБЛИКАТ") || upper.includes("DUPLICATE") || upper.includes("УЖЕ ЗАРЕГИСТРИРОВАН")) {
		return { ...REMD_ERROR_CATALOG.REMD_ERR_007!, technicalDetail: codeOrText };
	}
	if (upper.includes("УКЭП МО") || upper.includes("ПОДПИСЬ ОРГАНИЗАЦИИ") || upper.includes("ГЛАВНОГО ВРАЧА")) {
		return { ...REMD_ERROR_CATALOG.REMD_ERR_008!, technicalDetail: codeOrText };
	}

	return {
		code: "REMD_ERR_099",
		category: "SYSTEM",
		title: "Ошибка обработки документа в РЭМД",
		description: codeOrText,
		technicalDetail: codeOrText,
		remediation: "Проверьте журнал интеграции и повторите операцию или обратитесь в службу поддержки ЕГИСЗ.",
		isRetryable: true,
		affectedEntity: "NETWORK",
	};
}

/**
 * Парсит SOAP Fault ответ от Федерального РЭМД
 */
export function parseRemdSoapFault(soapFaultXml: string): RemdErrorDiagnostic {
	if (!soapFaultXml || typeof soapFaultXml !== "string") {
		return lookupRemdErrorCode("");
	}

	// Извлекаем faultcode / faultstring / detail
	const faultCodeMatch = soapFaultXml.match(/<(?:[a-zA-Z0-9_-]+:)?faultcode>([^<]+)<\//i);
	const faultStringMatch = soapFaultXml.match(/<(?:[a-zA-Z0-9_-]+:)?faultstring>([^<]+)<\//i);
	const detailMatch = soapFaultXml.match(/<(?:[a-zA-Z0-9_-]+:)?detail>([\s\S]*?)<\//i);

	const codeText = faultCodeMatch ? faultCodeMatch[1]!.trim() : "";
	const stringText = faultStringMatch ? faultStringMatch[1]!.trim() : "";
	const detailText = detailMatch ? detailMatch[1]!.trim() : "";

	const combined = `${codeText} ${stringText} ${detailText}`.trim();
	const diag = lookupRemdErrorCode(combined);

	return {
		...diag,
		technicalDetail: combined || soapFaultXml,
	};
}

/**
 * Форматирует понятное для врача или администратора клиническое заключение об ошибке
 */
export function formatRemdDiagnosticSummary(diagnostic: RemdErrorDiagnostic): string {
	return `[ЕГИСЗ РЭМД: ${diagnostic.code}] ${diagnostic.title}
Описание: ${diagnostic.description}
Действие для исправления: ${diagnostic.remediation}
Сущность: ${diagnostic.affectedEntity} | Повторная отправка: ${diagnostic.isRetryable ? "Да" : "Нет"}`;
}

// ─── 3. Стейт-машина жизненного цикла СЭМД ─────────────────────────────────

const ALLOWED_TRANSITIONS: Record<SemdLifecycleState, SemdLifecycleAction[]> = {
	DRAFT: ["SIGN_DOCTOR", "CANCEL_DOCUMENT"],
	SIGNED_DOCTOR: ["SIGN_CLINIC", "CANCEL_DOCUMENT"],
	SIGNED_CLINIC: ["SUBMIT_TO_REMD", "CANCEL_DOCUMENT"],
	SENT_TO_REMD: ["CONFIRM_REGISTRATION", "REJECT_REGISTRATION"],
	REGISTERED_SUCCESS: ["CANCEL_DOCUMENT"],
	REJECTED_ERROR: ["RETRY_SUBMISSION", "CANCEL_DOCUMENT"],
	CANCELLED: [],
};

const ACTION_NEXT_STATE_MAP: Record<
	SemdLifecycleState,
	Partial<Record<SemdLifecycleAction, SemdLifecycleState>>
> = {
	DRAFT: {
		SIGN_DOCTOR: "SIGNED_DOCTOR",
		CANCEL_DOCUMENT: "CANCELLED",
	},
	SIGNED_DOCTOR: {
		SIGN_CLINIC: "SIGNED_CLINIC",
		CANCEL_DOCUMENT: "CANCELLED",
	},
	SIGNED_CLINIC: {
		SUBMIT_TO_REMD: "SENT_TO_REMD",
		CANCEL_DOCUMENT: "CANCELLED",
	},
	SENT_TO_REMD: {
		CONFIRM_REGISTRATION: "REGISTERED_SUCCESS",
		REJECT_REGISTRATION: "REJECTED_ERROR",
	},
	REGISTERED_SUCCESS: {
		CANCEL_DOCUMENT: "CANCELLED",
	},
	REJECTED_ERROR: {
		RETRY_SUBMISSION: "SENT_TO_REMD",
		CANCEL_DOCUMENT: "CANCELLED",
	},
	CANCELLED: {},
};

/**
 * Проверяет допустимость перехода состояния в стейт-машине
 */
export function canTransitionSemdState(
	currentState: SemdLifecycleState,
	action: SemdLifecycleAction,
): boolean {
	const allowed = ALLOWED_TRANSITIONS[currentState] || [];
	return allowed.includes(action);
}

/**
 * Возвращает следующее состояние стейт-машины при заданном действии
 */
export function getNextSemdState(
	currentState: SemdLifecycleState,
	action: SemdLifecycleAction,
): SemdLifecycleState {
	const nextMap = ACTION_NEXT_STATE_MAP[currentState];
	const next = nextMap ? nextMap[action] : undefined;
	if (!next) {
		throw new Error(
			`Недопустимый переход стейт-машины СЭМД: действие "${action}" невозможно в состоянии "${currentState}".`,
		);
	}
	return next;
}

/**
 * Создает начальную карточку жизненного цикла документа СЭМД
 */
export function createInitialSemdLifecycleRecord(params: {
	documentId: string;
	documentVersion?: number | undefined;
	docTypeNsiCode: string;
	clinicOid: string;
	clinicOgrn: string;
	doctorSnils: string;
	patientSnils?: string | undefined;
	performedBy?: {
		userId?: string | undefined;
		userName?: string | undefined;
		role?: string | undefined;
	} | undefined;
}): SemdDocumentLifecycleRecord {
	const now = new Date().toISOString();
	const initialTransition: SemdStateTransitionRecord = {
		id: generateUuidV7(),
		fromState: "DRAFT",
		toState: "DRAFT",
		action: "SIGN_DOCTOR",
		timestamp: now,
		performedBy: {
			snils: params.doctorSnils,
			userId: params.performedBy?.userId,
			userName: params.performedBy?.userName || "Лечащий врач",
			role: params.performedBy?.role || "DOCTOR",
		},
		notes: "Создан черновик документа СЭМД",
	};

	return {
		documentId: params.documentId,
		documentVersion: params.documentVersion ?? 1,
		docTypeNsiCode: params.docTypeNsiCode,
		currentState: "DRAFT",
		transitions: [initialTransition],
		remdRegistrationNumber: null,
		remdRegisteredAt: null,
		lastError: null,
		clinicOid: params.clinicOid,
		clinicOgrn: params.clinicOgrn,
		patientSnils: params.patientSnils ?? null,
		doctorSnils: params.doctorSnils,
		createdAt: now,
		updatedAt: now,
	};
}

/**
 * Выполняет атомарный переход жизненного цикла СЭМД с сохранением аудиторского следа
 */
export function transitionSemdDocumentState(
	record: SemdDocumentLifecycleRecord,
	action: SemdLifecycleAction,
	payload?: {
		performedBy?: {
			snils?: string | undefined;
			userId?: string | undefined;
			userName?: string | undefined;
			role?: string | undefined;
		} | undefined;
		remdRegistrationNumber?: string | undefined;
		error?: RemdErrorDiagnostic | string | undefined;
		notes?: string | undefined;
		metadata?: Record<string, unknown> | undefined;
	},
): SemdDocumentLifecycleRecord {
	if (!canTransitionSemdState(record.currentState, action)) {
		throw new Error(
			`Ошибка стейт-машины СЭМД: действие "${action}" недопустимо для документа ${record.documentId} в статусе "${record.currentState}".`,
		);
	}

	const nextState = getNextSemdState(record.currentState, action);
	const now = new Date().toISOString();

	let parsedError: RemdErrorDiagnostic | undefined;
	if (payload?.error) {
		parsedError = typeof payload.error === "string" ? lookupRemdErrorCode(payload.error) : payload.error;
	}

	const transition: SemdStateTransitionRecord = {
		id: generateUuidV7(),
		fromState: record.currentState,
		toState: nextState,
		action,
		timestamp: now,
		performedBy: {
			snils: payload?.performedBy?.snils || record.doctorSnils,
			userId: payload?.performedBy?.userId,
			userName: payload?.performedBy?.userName || "Сотрудник клиники",
			role: payload?.performedBy?.role || "CLINIC_USER",
		},
		notes: payload?.notes,
		error: parsedError,
		metadata: payload?.metadata,
	};

	let regNumber = record.remdRegistrationNumber;
	let regAt = record.remdRegisteredAt;

	if (nextState === "REGISTERED_SUCCESS") {
		regNumber = payload?.remdRegistrationNumber || `EGISZ-REMD-${new Date().getFullYear()}-${generateUuidV7().slice(0, 8).toUpperCase()}`;
		regAt = now;
	}

	return {
		...record,
		currentState: nextState,
		transitions: [...record.transitions, transition],
		remdRegistrationNumber: regNumber,
		remdRegisteredAt: regAt,
		lastError: nextState === "REJECTED_ERROR" ? parsedError ?? record.lastError : null,
		updatedAt: now,
	};
}

// ─── 4. Формирование транспортных конвертов SOAP 1.2 и REST для ФРЭМД ───────

export interface RemdSoapEnvelopeParams {
	documentId: string;
	documentVersion?: number | undefined;
	docTypeNsiCode: string;
	docTypeOid?: string | undefined;
	canonicalXml: string;
	doctorSignature: CadesBesSignature | string;
	moSignature?: CadesBesSignature | string | undefined;
	patientSnils?: string | undefined;
	patientBirthDate?: Date | string | undefined;
	patientGender?: "male" | "female" | string | undefined;
	doctorSnils: string;
	doctorPositionCode?: string | undefined;
	doctorFullName: string;
	clinicOid: string;
	clinicOgrn: string;
	clinicInn?: string | undefined;
	clinicName: string;
	documentDateTime?: Date | string | undefined;
	endpointUrl?: string | undefined;
	messageId?: string | undefined;
}

export interface RemdRestSubmissionPayload {
	messageId: string;
	documentId: string;
	documentVersion: number;
	docTypeNsiCode: string;
	docTypeOid: string;
	clinic: {
		oid: string;
		ogrn: string;
		inn: string | null;
		name: string;
	};
	doctor: {
		snils: string;
		positionCode: string;
		fullName: string;
	};
	patient: {
		snils: string | null;
		birthDate: string | null;
		gender: string | null;
	};
	documentDateTime: string;
	checksums: {
		sha256Hex: string;
		gost3411Hex: string;
		byteLength: number;
	};
	attachments: {
		cdaXmlBase64: string;
		doctorSignatureBase64: string;
		moSignatureBase64: string | null;
	};
	submissionTime: string;
}

/**
 * Генерирует официальный SOAP 1.2 / MTOM конверт для отправки в Федеральный РЭМД ЕГИСЗ
 */
export function buildRemdSoapEnvelope(params: RemdSoapEnvelopeParams): {
	soapXml: string;
	messageId: string;
	action: string;
	sha256Hex: string;
	gostDigestHex: string;
} {
	const canonical = canonicalizeCdaXml(params.canonicalXml);
	const sha256Hex = computeCdaSha256Hex(canonical);
	const gostDigestHex = computeGost3411_2012_256Hex(canonical);
	const cdaBase64 = Buffer.from(canonical, "utf8").toString("base64");

	const doctorSigBase64 =
		typeof params.doctorSignature === "string"
			? params.doctorSignature
			: params.doctorSignature.signatureBase64;

	const moSigBase64 = params.moSignature
		? typeof params.moSignature === "string"
			? params.moSignature
			: params.moSignature.signatureBase64
		: "";

	const messageId = params.messageId || `urn:uuid:${generateUuidV7()}`;
	const action = "urn:egisz:remd:v1:SendDocument";
	const endpoint = params.endpointUrl || "https://remd.egisz.rosminzdrav.ru/ws/remd";
	const docOid = params.docTypeOid || EGISZ_OIDS.SEMD_TEMPLATE_101;
	const docVer = params.documentVersion ?? 1;
	const nowHl7 = formatHl7DateTime(params.documentDateTime ?? new Date());

	const patientSnilsXml = params.patientSnils
		? `<remd:patientSnils>${escapeXml(params.patientSnils)}</remd:patientSnils>`
		: "";

	const moSigXml = moSigBase64
		? `\n\t\t\t\t<remd:moSignature>${moSigBase64}</remd:moSignature>`
		: "";

	const soapXml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
	xmlns:wsa="http://www.w3.org/2005/08/addressing"
	xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
	xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"
	xmlns:remd="http://egisz.rosminzdrav.ru/remd/v1/types">
	<soap:Header>
		<wsa:Action soap:mustUnderstand="true">${action}</wsa:Action>
		<wsa:MessageID>${messageId}</wsa:MessageID>
		<wsa:To soap:mustUnderstand="true">${endpoint}</wsa:To>
		<wsse:Security soap:mustUnderstand="true">
			<wsu:Timestamp wsu:Id="TS-${messageId}">
				<wsu:Created>${new Date().toISOString()}</wsu:Created>
				<wsu:Expires>${new Date(Date.now() + 300000).toISOString()}</wsu:Expires>
			</wsu:Timestamp>
		</wsse:Security>
	</soap:Header>
	<soap:Body>
		<remd:SendDocumentRequest>
			<remd:documentMetadata>
				<remd:documentId>${escapeXml(params.documentId)}</remd:documentId>
				<remd:documentVersion>${docVer}</remd:documentVersion>
				<remd:docTypeNsiCode>${escapeXml(params.docTypeNsiCode)}</remd:docTypeNsiCode>
				<remd:docTypeOid>${escapeXml(docOid)}</remd:docTypeOid>
				<remd:documentDateTime>${nowHl7}</remd:documentDateTime>
				<remd:clinicOid>${escapeXml(params.clinicOid)}</remd:clinicOid>
				<remd:clinicOgrn>${escapeXml(params.clinicOgrn)}</remd:clinicOgrn>
				<remd:clinicName>${escapeXml(params.clinicName)}</remd:clinicName>
				<remd:doctorSnils>${escapeXml(params.doctorSnils)}</remd:doctorSnils>
				<remd:doctorPositionCode>${escapeXml(params.doctorPositionCode || "71")}</remd:doctorPositionCode>
				<remd:doctorFullName>${escapeXml(params.doctorFullName)}</remd:doctorFullName>
				${patientSnilsXml}
			</remd:documentMetadata>
			<remd:documentPayload>
				<remd:checksums>
					<remd:checksum algorithm="SHA-256">${sha256Hex}</remd:checksum>
					<remd:checksum algorithm="GOST-34.11-2012-256">${gostDigestHex}</remd:checksum>
				</remd:checksums>
				<remd:cdaDocument format="HL7_CDA_R2_XML">${cdaBase64}</remd:cdaDocument>
				<remd:doctorSignature>${doctorSigBase64}</remd:doctorSignature>${moSigXml}
			</remd:documentPayload>
		</remd:SendDocumentRequest>
	</soap:Body>
</soap:Envelope>`;

	return {
		soapXml: canonicalizeCdaXml(soapXml),
		messageId,
		action,
		sha256Hex,
		gostDigestHex,
	};
}

/**
 * Генерирует официальный REST DTO для отправки в Федеральный РЭМД через шлюз REST API
 */
export function buildRemdRestSubmissionPayload(params: RemdSoapEnvelopeParams): RemdRestSubmissionPayload {
	const canonical = canonicalizeCdaXml(params.canonicalXml);
	const sha256 = computeCdaSha256Hex(canonical);
	const gostDigest = computeGost3411_2012_256Hex(canonical);
	const cdaXmlBase64 = Buffer.from(canonical, "utf8").toString("base64");

	const doctorSigBase64 =
		typeof params.doctorSignature === "string"
			? params.doctorSignature
			: params.doctorSignature.signatureBase64;

	const moSigBase64 = params.moSignature
		? typeof params.moSignature === "string"
			? params.moSignature
			: params.moSignature.signatureBase64
		: null;

	const messageId = params.messageId || generateUuidV7();

	return {
		messageId,
		documentId: params.documentId,
		documentVersion: params.documentVersion ?? 1,
		docTypeNsiCode: params.docTypeNsiCode,
		docTypeOid: params.docTypeOid || EGISZ_OIDS.SEMD_TEMPLATE_101,
		clinic: {
			oid: params.clinicOid,
			ogrn: params.clinicOgrn,
			inn: params.clinicInn || null,
			name: params.clinicName,
		},
		doctor: {
			snils: params.doctorSnils,
			positionCode: params.doctorPositionCode || "71",
			fullName: params.doctorFullName,
		},
		patient: {
			snils: params.patientSnils || null,
			birthDate: params.patientBirthDate ? String(params.patientBirthDate) : null,
			gender: params.patientGender || null,
		},
		documentDateTime: new Date(params.documentDateTime ?? Date.now()).toISOString(),
		checksums: {
			sha256Hex: sha256,
			gost3411Hex: gostDigest,
			byteLength: Buffer.byteLength(canonical, "utf8"),
		},
		attachments: {
			cdaXmlBase64,
			doctorSignatureBase64: doctorSigBase64,
			moSignatureBase64: moSigBase64,
		},
		submissionTime: new Date().toISOString(),
	};
}
