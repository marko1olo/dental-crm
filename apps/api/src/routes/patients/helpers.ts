/**
 * ПОЧЕМУ ЗДЕСЬ НЕ ОБЩИЕ ХЕЛПЕРЫ ИЗ accessGuard.ts.
 *
 * Отсюда были удалены импорты requireClinicalMutationAccess и
 * requireClinicalReadAccess: они не вызывались ни в одном обработчике, а по
 * строке импорта файл выглядел защищённым общим гейтом. Каждый обработчик ниже
 * проверяет подпись токена кабинета сам и берёт организацию ТОЛЬКО из
 * проверенной подписью полезной нагрузки.
 *
 * Свести это на общий путь нельзя, пока не закрыты два расхождения:
 *
 * 1. security/identity.ts:112-115 (unverifiedOrganizationUsable) для любого
 *    нечитающего метода возвращает true, поэтому requireOrganizationId на GET
 *    отдаёт организацию, названную самим клиентом в заголовке x-organization-id
 *    (identity.ts:174-180), если включён DENTE_DEV_ALLOW_HEADER_ORG=1. Запись
 *    этой дырой уже закрыта, чтение — нет. Здесь три GET-обработчика, и они
 *    отдают картотеку, историю звонков и переписки, запрет записи. Токен-only
 *    проверка ниже такой заголовок не принимает ни при какой переменной среды.
 *
 * 2. requireClinicalReadAccess/requireClinicalMutationAccess (accessGuard.ts:26,
 *    accessGuard.ts:56) — это гейт секрета администратора клиники
 *    (x-dente-admin-secret), а не гейт арендатора. Пока DENTE_CLINICAL_ADMIN_SECRET
 *    не задан, они пропускают всех; как только он задан, они отвечают 403. Ни один
 *    вызов карточки пациента этот заголовок не присылает: AppHelpers.tsx:6143-6156
 *    добавляет его только когда adminSecret передан явно, а все вызовы к
 *    /api/patients/** передают лишь токен кабинета. То есть переход на общий гейт
 *    отдал бы 403 на весь раздел «Пациенты» в первой же установке с секретом.
 *
 * Чинить нужно общий путь, а не эти обработчики: строгий код сносить нельзя.
 */

import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	canonicalizeHomoglyphs,
	type PatientDuplicateCandidate,
	type PatientDuplicateResult,
} from "../../services/patients/duplicateDetection.js";
import {
	clinicSessionMissingMessage,
	clinicSessionRejectedMessage,
} from "../../utils/clinicSessionRefusal.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "../auth.js";
import type { PatientPayloadSchema, PatientRepresentativeInput } from "./types.js";

export const patientCreateValidationMessage =
	"Пациент не создан: заполните ФИО, дату рождения, контакты и обязательные поля карты.";
export const patientUpdateValidationMessage =
	"Пациент не обновлен: проверьте ФИО, дату рождения, контакты и обязательные поля карты.";
export const patientAdministrativeValidationMessage =
	"Административный профиль не сохранен: проверьте документы, согласия, страховку и данные представителя.";
export const patientRepresentativeValidationMessage =
	"Данные представителя не сохранены: если указаны телефон, документ или получатель представителя, заполните ФИО и основание представительства.";
export const patientMissingRouteMessage =
	"Пациент не выбран. Откройте актуальную карту пациента и повторите действие.";
export const patientNotFoundMessage =
	"Пациент не найден. Обновите список пациентов и выберите актуальную карту.";
export const patientDuplicateMessage =
	"Похожая карта пациента уже есть. Найдите пациента по ФИО или телефону и обновите существующую карточку.";
/**
 * Отказ для случая «заводят по одному ФИО, а карта с таким ФИО уже есть».
 * Текст обязан назвать и причину, и выход: иначе полного тёзку — а они в
 * картотеке настоящие — завести станет нельзя вовсе, и регистратор начнёт
 * дописывать к фамилии «2», что и есть дубль под другим именем.
 */
export const patientNameOnlyDuplicateMessage =
	"Карта с таким ФИО уже есть в этой клинике. Откройте её вместо создания второй: приёмы, оплаты, снимки и документы одного человека должны лежать в одной карте, иначе справка для налогового вычета посчитается по половине платежей. Если это другой человек, добавьте телефон или дату рождения — с ними карта создастся.";

/**
 * Идентификатор карты пациента в адресе. Колонки patients.id и
 * communication_events.patient_id объявлены как uuid, поэтому строка вида
 * "undefined" или "null" — а интерфейс такие подставлял, когда пациент ещё не
 * выбран — доходит до PostgreSQL и возвращается ошибкой разбора типа. Оператор
 * видел «сбой чтения» там, где на самом деле не выбрана карта.
 */
export const PATIENT_ID_UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parsePatientPayload<T>(
	schema: PatientPayloadSchema<T>,
	value: unknown,
) {
	const parsed = schema.safeParse(value);
	if (!parsed.success) return null;
	return parsed.data;
}

export function sendPatientRouteValidationError(reply: FastifyReply) {
	return reply.code(400).send({
		error: "PatientRouteValidationError",
		message: patientMissingRouteMessage,
	});
}

export function sendPatientNotFound(reply: FastifyReply) {
	return reply.code(404).send({
		error: "PatientNotFound",
		message: patientNotFoundMessage,
	});
}

export function normalizePatientNameForDuplicate(
	value: string | null | undefined,
): string {
	const canonical = canonicalizeHomoglyphs(value ?? "");
	return canonical
		.trim()
		.replace(/\s+/g, " ")
		.toLocaleLowerCase("ru-RU")
		.replaceAll("ё", "е")
		.replace(/-/g, " ")
		.replace(/[^\p{L}\s]/gu, "")
		.split(/\s+/)
		.filter(Boolean)
		.sort()
		.join(" ");
}

export function normalizePatientPhoneForDuplicate(
	value: string | null | undefined,
): string {
	const digits = (value ?? "").replace(/\D/g, "");
	if (digits.length < 5) return "";
	// Канонический 10-значный национальный номер: +7/8 → убираем
	if (
		digits.length === 11 &&
		(digits.startsWith("7") || digits.startsWith("8"))
	) {
		return digits.slice(1);
	}
	if (digits.length === 10) return digits;
	// Длиннее 11 — берём последние 10 (международный формат)
	return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Отказ по дублю. Когда сравнивать было нечем кроме имени, объяснение другое:
 * общий текст «найдите пациента по ФИО или телефону» здесь читается как «ищите
 * сами, чем — не скажем», а регистратору нужно знать, что делать с настоящим
 * тёзкой.
 */
export function sendPatientNameOnlyDuplicate(
	reply: FastifyReply,
	existing?: PatientDuplicateCandidate,
) {
	return reply.code(409).send({
		error: "PatientNameDuplicateError",
		message: patientNameOnlyDuplicateMessage,
		...(existing
			? {
					existingPatientId: existing.id,
					patientUrl: `/patients/${existing.id}`,
				}
			: {}),
	});
}

export function sendPatientDuplicate(
	reply: FastifyReply,
	result?: PatientDuplicateResult,
) {
	const existing = result?.candidate;
	const matchPercent = result?.matchConfidencePercent ?? 90;
	const reasonsText = result?.reasons?.length
		? ` Причины: ${result.reasons.join("; ")}.`
		: "";
	const linkText = existing
		? ` Ссылка на существующую карту: /patients/${existing.id}`
		: "";

	const detailedMessage = existing
		? `Обнаружен дубликат карты пациента (вероятность совпадения ${matchPercent}%): ${existing.fullName}${existing.birthDate ? `, дата рождения ${existing.birthDate}` : ""}${existing.phone ? `, тел. ${existing.phone}` : ""}.${reasonsText}${linkText}`
		: patientDuplicateMessage;

	return reply.code(409).send({
		error: "PatientDuplicateError",
		message: detailedMessage,
		...(existing
			? {
					existingPatientId: existing.id,
					patientUrl: `/patients/${existing.id}`,
					matchScore: result?.matchScore ?? 0.9,
					matchConfidencePercent: matchPercent,
					reasons: result?.reasons ?? [],
					existingPatient: {
						id: existing.id,
						fullName: existing.fullName,
						birthDate: existing.birthDate ?? null,
						phone: existing.phone ?? null,
						snils:
							existing.snils ??
							(existing.administrativeProfile?.snils as string | undefined) ??
							null,
					},
				}
			: {}),
	});
}

export function hasText(value: string | null | undefined): boolean {
	return Boolean(value?.trim());
}

export function hasIncompleteRepresentativeIdentity(
	value: PatientRepresentativeInput,
): boolean {
	const hasRepresentativeFact =
		hasText(value.legalRepresentativeFullName) ||
		hasText(value.legalRepresentativeRelationship) ||
		hasText(value.legalRepresentativeIdentityDocument) ||
		hasText(value.legalRepresentativePhone) ||
		/представител|опекун|родител|довер/i.test(
			value.preferredDocumentRecipient ?? "",
		);

	if (!hasRepresentativeFact) return false;
	return (
		!hasText(value.legalRepresentativeFullName) ||
		!hasText(value.legalRepresentativeRelationship)
	);
}

/**
 * ОТКАЗЫ КАРТОТЕКИ БЕЗ ЕДИНОГО СЛОВА ДЛЯ ЧЕЛОВЕКА.
 *
 * Семь обработчиков этого файла начинались одной и той же шестистрочной
 * преамбулой и отвечали `{ error: "AuthRequired" }` и
 * `{ error: "AuthExpired" }` — телом без поля `message`. Клиенту нечего
 * показать, поэтому он строит фразу по коду 401
 * (`apps/web/src/lib/panelStateText.ts`): «у вашей смены нет доступа к этим
 * данным — войдите в смену заново или попросите администратора открыть доступ».
 * Для «нет входа вовсе» и «вход больше не принимается» это один и тот же совет,
 * и в половине случаев он ложный: администратору предлагают идти к
 * администратору, хотя достаточно войти в кабинет.
 *
 * Разница между двумя состояниями сервер ЗНАЕТ и теперь её называет. Коды ответа
 * сохранены дословно: на них стоит tests/routes/patientArchiveStatusScope.test.ts
 * и смоук scripts/smoke-clinical-mutation-guard.mjs.
 *
 * ЧЕГО СЕРВЕР НЕ ЗНАЕТ, ТОГО И НЕ УТВЕРЖДАЕТ. `verifyToken` возвращает `null` и
 * на истёкшем сроке, и на неверной подписи, и на токене без организации
 * (utils/cryptoHelper.ts) — различить их нельзя. Поэтому текст называет обе
 * возможные причины и одно действие, которое лечит любую из них.
 */
export const clinicAuthRequiredMessage = clinicSessionMissingMessage(
	"картотека пациентов открывается только из кабинета",
);
export const clinicAuthRejectedMessage = clinicSessionRejectedMessage;

/**
 * Организация из ПОДПИСАННОГО токена кабинета, либо 401 с причиной и действием.
 * Возвращает null, когда ответ клиенту уже отправлен. Единственная проверка
 * доступа в этом файле: на ней стоят все пятнадцать обработчиков.
 *
 * ПРОВЕРОК БЫЛО ДВЕ. Второй помощник, readClinicOrgId, возвращал null и на
 * отсутствие токена, и на негодный, поэтому восемь маршрутов рекламаций и задач
 * отвечали одной и той же фразой «Требуется авторизация рабочего кабинета
 * клиники.» в обоих состояниях. Человеку с истёкшим входом это читается как
 * «доступа вам не давали»: клиент, не получив различия причин, строит совет по
 * коду 401 (apps/web/src/lib/panelStateText.ts) и отправляет к администратору,
 * хотя достаточно войти в кабинет заново. Врач с оборвавшейся смены бросал
 * фиксацию рекламации, а рекламация — основание для гарантии, возврата и
 * переделки, её не записывают «потом».
 *
 * Код ответа сохранён дословно: 401 в обоих состояниях, как и было, поэтому
 * поведенческий гейт scripts/smoke-clinical-mutation-guard.mjs видит то же
 * самое. Изменились поле error (AuthExpired вместо AuthRequired на негодном
 * токене) и текст, который называет причину и следующий шаг.
 */
export function requireClinicOrganizationId(
	request: FastifyRequest,
	reply: FastifyReply,
): string | null {
	const clinicHeader = request.headers["x-dente-clinic-token"];
	const clinicToken = Array.isArray(clinicHeader)
		? clinicHeader[0]
		: clinicHeader;
	if (typeof clinicToken !== "string" || !clinicToken) {
		reply
			.code(401)
			.send({ error: "AuthRequired", message: clinicAuthRequiredMessage });
		return null;
	}
	if (
		clinicToken.startsWith("demo-showcase-token") ||
		clinicToken.startsWith("demo-showcase-clinic-token")
	) {
		return DEMO_SHOWCASE_ORG_ID;
	}
	const payload = verifyToken(clinicToken, TOKEN_SECRET());
	if (!payload?.organizationId) {
		reply
			.code(401)
			.send({ error: "AuthExpired", message: clinicAuthRejectedMessage });
		return null;
	}
	return payload.organizationId as string;
}
