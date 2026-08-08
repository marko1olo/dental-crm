import type {
	MigrationColumnMapping,
	MigrationEntityKind,
	MigrationFieldLineage,
	MigrationQuarantineReason,
	MigrationTargetField,
} from "@dental/shared";
import {
	formatKopecksRu,
	MIGRATION_MAX_ROW_CHARS,
	parseKopecks,
} from "@dental/shared";
import type { ColumnProfile } from "./columnProfile.js";
import {
	combineNameParts,
	type DateFormatHint,
	dateOnlyPart,
	formatNormalizedDateTime,
	isNullToken,
	type NormalizedValue,
	normalizeDateTimeValue,
	normalizeDateValue,
	normalizeEmailValue,
	normalizeEnumValue,
	normalizeGenderValue,
	normalizeMoneyRubles,
	normalizeMoneyValue,
	normalizeNameValue,
	normalizePhoneValue,
	normalizeText,
	normalizeToothCode,
	truncateForMessage,
} from "./valueNormalize.js";

/**
 * Превращение исходной строки в значения нашей модели.
 *
 * Каждое поле получает происхождение: из какой колонки, какими преобразованиями,
 * по чьему решению и с какой уверенностью. Без этого через год невозможно
 * ответить, откуда в карточке взялась именно эта дата рождения — а спрашивают
 * об этом ровно тогда, когда что-то пошло не так.
 *
 * Строка НИКОГДА не отбрасывается молча. Любая проблема становится записью
 * карантина с причиной; исходная строка при этом целиком лежит в стейджинге.
 */

export interface RowIssue {
	reason: MigrationQuarantineReason;
	/** true — строку нельзя загрузить как есть. false — можно, но оператор должен знать. */
	blocking: boolean;
	fieldPath: string | null;
	message: string;
	suggestedFix: string | null;
}

export interface TransformedRow {
	entityKind: MigrationEntityKind;
	/** Значения по целевым полям. Ключи — без префикса сущности. */
	values: Record<string, unknown>;
	lineage: MigrationFieldLineage[];
	issues: RowIssue[];
	/** Наименьшая уверенность среди заполненных полей. */
	confidence: number;
}

/** Статусы записей в расписании у чужих систем. */
const APPOINTMENT_STATUS_SYNONYMS: Record<string, string> = {
	запланирован: "planned",
	запланирована: "planned",
	запланировано: "planned",
	план: "planned",
	новая: "planned",
	scheduled: "planned",
	planned: "planned",
	подтвержден: "confirmed",
	подтверждена: "confirmed",
	подтверждено: "confirmed",
	confirmed: "confirmed",
	пришел: "arrived",
	пришёл: "arrived",
	пришла: "arrived",
	вкабинете: "arrived",
	arrived: "arrived",
	лечение: "in_treatment",
	наприеме: "in_treatment",
	вработе: "in_treatment",
	intreatment: "in_treatment",
	завершен: "completed",
	завершён: "completed",
	завершена: "completed",
	завершено: "completed",
	выполнен: "completed",
	выполнена: "completed",
	оказана: "completed",
	completed: "completed",
	complete: "completed",
	отменен: "cancelled",
	отменён: "cancelled",
	отменена: "cancelled",
	отменено: "cancelled",
	отказ: "cancelled",
	cancelled: "cancelled",
	canceled: "cancelled",
	неявка: "no_show",
	неприше: "no_show",
	непришел: "no_show",
	непришёл: "no_show",
	неявился: "no_show",
	noshow: "no_show",
};

/** Способы оплаты. */
const PAYMENT_METHOD_SYNONYMS: Record<string, string> = {
	карта: "card",
	картой: "card",
	банковскаякарта: "card",
	безнал: "card",
	card: "card",
	наличные: "cash",
	наличными: "cash",
	нал: "cash",
	касса: "cash",
	cash: "cash",
	перевод: "transfer",
	переводом: "transfer",
	счет: "transfer",
	безналичный: "transfer",
	transfer: "transfer",
	страховка: "insurance",
	страховая: "insurance",
	дмс: "insurance",
	омс: "insurance",
	insurance: "insurance",
};

const PATIENT_STATUS_SYNONYMS: Record<string, string> = {
	активный: "active",
	активен: "active",
	активна: "active",
	действующий: "active",
	да: "active",
	active: "active",
	архив: "archived",
	архивный: "archived",
	архивная: "archived",
	вархиве: "archived",
	удален: "archived",
	удалён: "archived",
	неактивный: "archived",
	нет: "archived",
	archived: "archived",
	inactive: "archived",
	deleted: "archived",
};

/** Поля, куда допустимо писать из нескольких колонок — склеиваются. */
const CONCATENATED_FIELDS = new Set<MigrationTargetField>([
	"patient.notes",
	"patient.address",
	"appointment.comment",
	"visit.complaint",
	"visit.anamnesis",
	"visit.objectiveStatus",
	"visit.diagnosis",
	"visit.treatmentPlan",
	"visit.doctorSummary",
	"payment.note",
	"toothState.note",
]);

/** Отсекает префикс сущности: «patient.fullName» → «fullName». */
function fieldName(targetField: MigrationTargetField): string {
	const dot = targetField.indexOf(".");
	return dot === -1 ? targetField : targetField.slice(dot + 1);
}

/** Значение исходной колонки для происхождения, обрезанное до безопасной длины. */
function lineageSourceValue(value: string): string | null {
	if (value === "") return null;
	return value.length > 120 ? `${value.slice(0, 120)}…` : value;
}

export interface TransformRowInput {
	entityKind: MigrationEntityKind;
	columns: string[];
	row: string[];
	mapping: MigrationColumnMapping[];
	/** Подсказки о формате даты по колонкам, посчитанные один раз на таблицу. */
	dateHints: Map<string, DateFormatHint>;
	/** Порог уверенности, ниже которого строка уходит в карантин. */
	confidenceThreshold: number;
}

export function transformRow(input: TransformRowInput): TransformedRow {
	const values: Record<string, unknown> = {};
	const lineage: MigrationFieldLineage[] = [];
	const issues: RowIssue[] = [];
	let minConfidence = 1;

	const columnIndex = new Map(
		input.columns.map((column, index) => [column, index]),
	);

	const totalLength = input.row.reduce((sum, cell) => sum + cell.length, 0);
	if (totalLength > MIGRATION_MAX_ROW_CHARS) {
		issues.push({
			reason: "row_too_large",
			blocking: true,
			fieldPath: null,
			message: `Строка занимает ${totalLength} символов при пределе ${MIGRATION_MAX_ROW_CHARS}. Обычно причина — неверный разделитель, из-за которого в одну строку попал весь файл.`,
			suggestedFix:
				"Проверьте разделитель и кодировку источника, затем повторите разбор.",
		});
		return {
			entityKind: input.entityKind,
			values,
			lineage,
			issues,
			confidence: 0,
		};
	}

	/** Записывает разобранное значение, происхождение и проблему, если есть. */
	const apply = <T>(
		targetField: MigrationTargetField,
		sourceColumn: string,
		rawValue: string,
		parsed: NormalizedValue<T>,
		decidedBy: MigrationColumnMapping["decidedBy"],
		mappingConfidence: number,
		transform: (value: T) => unknown = (value) => value,
	): void => {
		const key = fieldName(targetField);

		if (parsed.issue) {
			/**
			 * Значение не разобрано. Блокирующей проблему делает не тип поля, а его
			 * обязательность: непонятная дата рождения не мешает завести пациента,
			 * а непонятная сумма платежа делает платёж бессмысленным.
			 */
			const blocking = isRequiredField(input.entityKind, targetField);
			issues.push({
				reason: parsed.issue.includes("кодировк")
					? "encoding_damage"
					: "unparsable_value",
				blocking,
				fieldPath: key,
				message: `Колонка «${sourceColumn}»: ${parsed.issue}`,
				suggestedFix: blocking
					? "Исправьте значение в источнике и повторите перенос этой строки из карантина."
					: "Поле оставлено пустым; остальные данные строки перенесены.",
			});
			// Происхождение записывается и для отказа: видно, что поле не пустое случайно.
			lineage.push({
				field: targetField,
				sourceColumn,
				sourceValue: lineageSourceValue(rawValue),
				transforms: [...parsed.transforms, "rejected"],
				decidedBy,
				confidence: 0,
			});
			return;
		}

		if (parsed.value === null) {
			// Пустое значение — не проблема, происхождение не нужно.
			return;
		}

		const finalValue = transform(parsed.value);
		/**
		 * Итоговая уверенность — произведение уверенности в сопоставлении колонки и
		 * уверенности в разборе значения. Обе могут быть неполными, и они
		 * независимы: «скорее всего это дата рождения» × «скорее всего это дата».
		 */
		const confidence = mappingConfidence * parsed.confidence;

		if (
			CONCATENATED_FIELDS.has(targetField) &&
			typeof finalValue === "string" &&
			typeof values[key] === "string"
		) {
			// Несколько колонок в одно текстовое поле: склеиваем с подписью колонки.
			values[key] = `${values[key] as string}\n${sourceColumn}: ${finalValue}`;
		} else {
			values[key] = finalValue;
		}

		lineage.push({
			field: targetField,
			sourceColumn,
			sourceValue: lineageSourceValue(rawValue),
			transforms: parsed.transforms,
			decidedBy,
			confidence,
		});

		if (confidence < minConfidence) minConfidence = confidence;
	};

	// ------------------------------------------------------------------
	// Разбор по карте соответствия.
	// ------------------------------------------------------------------
	for (const column of input.mapping) {
		if (column.targetField === "ignore") continue;
		const index = columnIndex.get(column.sourceColumn);
		if (index === undefined) continue;
		const rawValue = input.row[index] ?? "";
		const field = column.targetField;
		const dateHint = input.dateHints.get(column.sourceColumn);

		switch (field) {
			case "patient.birthDate":
				/**
				 * Дата рождения — именно дата. Время «00:00:00», которым чужие системы
				 * заполняют колонку типа datetime, отбрасывается сознательно.
				 */
				apply(
					field,
					column.sourceColumn,
					rawValue,
					normalizeDateValue(rawValue, dateHint),
					column.decidedBy,
					column.confidence,
				);
				break;

			case "patient.createdAt":
			case "appointment.startsAt":
			case "appointment.endsAt":
			case "visit.date":
			case "payment.paidAt":
				/**
				 * Здесь время суток — содержательная часть значения. Приём в 14:30 и
				 * приём в 09:00 — разные события, и перенос, теряющий время, оставляет
				 * клинику с графиком, где все приёмы стоят в один час.
				 *
				 * Значение сохраняется как местное время клиники; в абсолютное его
				 * переводит загрузчик, знающий часовой пояс организации.
				 */
				apply(
					field,
					column.sourceColumn,
					rawValue,
					normalizeDateTimeValue(rawValue, dateHint),
					column.decidedBy,
					column.confidence,
					formatNormalizedDateTime,
				);
				break;

			case "patient.phone":
			case "patient.secondaryPhone":
			case "doctor.phone":
				apply(
					field,
					column.sourceColumn,
					rawValue,
					normalizePhoneValue(rawValue),
					column.decidedBy,
					column.confidence,
					// В базе телефон хранится строкой E.164; добавочный уходит в примечание.
					(phone) => phone.e164,
				);
				// Добавочный номер — тоже данные, и терять его нельзя.
				{
					const parsedPhone = normalizePhoneValue(rawValue);
					if (parsedPhone.value?.extension) {
						const noteKey =
							input.entityKind === "doctor" ? "specialty" : "notes";
						const existing =
							typeof values[noteKey] === "string"
								? `${values[noteKey] as string}\n`
								: "";
						values[noteKey] =
							`${existing}Добавочный номер: ${parsedPhone.value.extension}`;
					}
				}
				break;

			case "patient.email":
			case "doctor.email":
				apply(
					field,
					column.sourceColumn,
					rawValue,
					normalizeEmailValue(rawValue),
					column.decidedBy,
					column.confidence,
				);
				break;

			case "patient.fullName":
			case "doctor.fullName":
				apply(
					field,
					column.sourceColumn,
					rawValue,
					normalizeNameValue(rawValue),
					column.decidedBy,
					column.confidence,
					(name) => name.fullName,
				);
				break;

			case "patient.gender":
				apply(
					field,
					column.sourceColumn,
					rawValue,
					normalizeGenderValue(rawValue),
					column.decidedBy,
					column.confidence,
				);
				break;

			case "service.priceRub":
			case "payment.amountRub": {
				/**
				 * В боевую колонку идёт сумма С КОПЕЙКАМИ: payments.amount_rub —
				 * numeric(12, 2), а не integer. Прежний комментарий здесь утверждал
				 * обратное («в боевую колонку идут целые рубли — она так объявлена»), и
				 * из-за него normalizeMoneyRubles округляла каждый перенесённый платёж
				 * до рубля, уже посчитав точное значение строкой ниже.
				 *
				 * Точные копейки продолжают сохраняться рядом, в normalized_json: это
				 * независимая от загрузчика точка отсчёта, по которой сверка доказывает,
				 * что колонка получила ровно разобранную сумму (reconcile.ts).
				 */
				apply(
					field,
					column.sourceColumn,
					rawValue,
					normalizeMoneyRubles(rawValue),
					column.decidedBy,
					column.confidence,
				);
				const exact = normalizeMoneyValue(rawValue);
				if (exact.value !== null) {
					values[
						field === "payment.amountRub" ? "amountKopecks" : "priceKopecks"
					] = exact.value;
				}
				break;
			}

			case "appointment.durationMinutes": {
				// Длительность — не деньги; у денежного разбора берётся только умение
				// читать разделители разрядов и дробной части. Целым число делает
				// Math.round ниже: сама функция копейки больше не округляет.
				const parsed = normalizeMoneyRubles(rawValue);
				apply(
					field,
					column.sourceColumn,
					rawValue,
					parsed,
					column.decidedBy,
					column.confidence,
					(minutes) => Math.max(5, Math.min(600, Math.round(minutes))),
				);
				break;
			}

			case "appointment.status":
				apply(
					field,
					column.sourceColumn,
					rawValue,
					normalizeEnumValue(rawValue, APPOINTMENT_STATUS_SYNONYMS, "planned"),
					column.decidedBy,
					column.confidence,
				);
				break;

			case "payment.method":
				apply(
					field,
					column.sourceColumn,
					rawValue,
					normalizeEnumValue(rawValue, PAYMENT_METHOD_SYNONYMS, "card"),
					column.decidedBy,
					column.confidence,
				);
				break;

			case "patient.status":
				apply(
					field,
					column.sourceColumn,
					rawValue,
					normalizeEnumValue(rawValue, PATIENT_STATUS_SYNONYMS, "active"),
					column.decidedBy,
					column.confidence,
				);
				break;

			case "toothState.toothCode":
				apply(
					field,
					column.sourceColumn,
					rawValue,
					normalizeToothCode(rawValue),
					column.decidedBy,
					column.confidence,
				);
				break;

			case "patient.externalId":
			case "doctor.externalId":
			case "service.externalId":
			case "service.code":
			case "appointment.externalId":
			case "appointment.patientRef":
			case "appointment.doctorRef":
			case "visit.externalId":
			case "visit.patientRef":
			case "visit.appointmentRef":
			case "payment.externalId":
			case "payment.patientRef":
			case "payment.visitRef":
			case "toothState.patientRef": {
				/**
				 * Идентификаторы и ссылки не нормализуются: значение из старой системы
				 * должно попасть в таблицу соответствий ровно таким, каким было, иначе
				 * ссылка из другой таблицы той же выгрузки не найдёт свою запись.
				 */
				const trimmed = rawValue.trim();
				if (trimmed === "" || isNullToken(trimmed)) break;
				values[fieldName(field)] = trimmed;
				lineage.push({
					field,
					sourceColumn: column.sourceColumn,
					sourceValue: lineageSourceValue(rawValue),
					transforms: ["trim"],
					decidedBy: column.decidedBy,
					confidence: column.confidence,
				});
				if (column.confidence < minConfidence)
					minConfidence = column.confidence;
				break;
			}

			default:
				// Текстовые поля: имя, отчество, адрес, жалобы, диагноз, примечания.
				apply(
					field,
					column.sourceColumn,
					rawValue,
					normalizeText(rawValue),
					column.decidedBy,
					column.confidence,
				);
				break;
		}
	}

	// ------------------------------------------------------------------
	// Сборка ФИО из частей, если целиком его не было.
	// ------------------------------------------------------------------
	if (!values.fullName && (values.lastName || values.firstName)) {
		const combined = combineNameParts(
			values.lastName as string | null,
			values.firstName as string | null,
			values.middleName as string | null,
		);
		if (combined.value) {
			values.fullName = combined.value.fullName;
			const nameField: MigrationTargetField =
				input.entityKind === "doctor" ? "doctor.fullName" : "patient.fullName";
			lineage.push({
				field: nameField,
				sourceColumn: "фамилия + имя + отчество",
				sourceValue: null,
				transforms: combined.transforms,
				decidedBy: "deterministic",
				confidence: combined.confidence,
			});
		}
	}

	// ------------------------------------------------------------------
	// Обязательные поля и доменные правила.
	// ------------------------------------------------------------------
	for (const field of requiredFieldsFor(input.entityKind)) {
		const key = fieldName(field);
		if (
			values[key] === undefined ||
			values[key] === null ||
			values[key] === ""
		) {
			// Уже есть отказ разбора по этому полю — второй раз не сообщаем.
			if (issues.some((issue) => issue.fieldPath === key)) continue;
			issues.push({
				reason: "missing_required_field",
				blocking: true,
				fieldPath: key,
				message: `Не заполнено обязательное поле «${key}»: в источнике нет колонки с этими данными либо значение пустое.`,
				suggestedFix:
					"Сопоставьте нужную колонку вручную либо заполните значение и перенесите строку из карантина.",
			});
		}
	}

	issues.push(...domainRuleIssues(input.entityKind, values));

	// ------------------------------------------------------------------
	// Порог уверенности.
	// ------------------------------------------------------------------
	const confidence = lineage.some((entry) => entry.confidence > 0)
		? minConfidence
		: 0;
	if (
		confidence > 0 &&
		confidence < input.confidenceThreshold &&
		!issues.some((issue) => issue.blocking)
	) {
		const weakest = [...lineage]
			.filter((entry) => entry.confidence > 0)
			.sort((left, right) => left.confidence - right.confidence)[0];
		issues.push({
			reason: "low_confidence",
			blocking: false,
			fieldPath: weakest ? fieldName(weakest.field) : null,
			message: `Уверенность разбора строки ${Math.round(confidence * 100)}% ниже порога ${Math.round(
				input.confidenceThreshold * 100,
			)}%${weakest ? `; слабое место — колонка «${weakest.sourceColumn}»` : ""}.`,
			suggestedFix:
				"Проверьте строку в предпросмотре; при верном разборе подтвердите её из карантина.",
		});
	}

	return { entityKind: input.entityKind, values, lineage, issues, confidence };
}

/** Обязательные целевые поля сущности. */
function requiredFieldsFor(
	entityKind: MigrationEntityKind,
): MigrationTargetField[] {
	switch (entityKind) {
		case "patient":
			return ["patient.fullName"];
		case "doctor":
			return ["doctor.fullName"];
		case "service":
			return ["service.name"];
		case "appointment":
			return ["appointment.patientRef", "appointment.startsAt"];
		case "visit":
			return ["visit.patientRef"];
		case "payment":
			return ["payment.patientRef", "payment.amountRub"];
		case "tooth_state":
			return ["toothState.patientRef", "toothState.toothCode"];
		default:
			return [];
	}
}

function isRequiredField(
	entityKind: MigrationEntityKind,
	field: MigrationTargetField,
): boolean {
	return requiredFieldsFor(entityKind).includes(field);
}

/**
 * Доменные правила, которые нельзя выразить нормализацией отдельного значения.
 *
 * Проверяется то, что делает запись бессмысленной или опасной, а не то, что
 * просто выглядит необычно: перенос не место для наведения порядка в чужой базе.
 */
/**
 * Самая поздняя календарная дата, которая существует на Земле в этот момент.
 *
 * ЗАЧЕМ НЕ `new Date().toISOString().slice(0, 10)`. Здесь стояло именно оно, то
 * есть «сегодня» по UTC. У всех российских поясов смещение ПОЛОЖИТЕЛЬНОЕ, поэтому
 * UTC отстаёт от местного календаря каждую ночь: в Самаре до 04:00, на Камчатке
 * половину суток. Оператор, который переносит чужую базу в вечернюю или ночную
 * смену, получал предупреждение «Дата рождения находится в будущем» на дате
 * СЕГОДНЯШНЕЙ — то есть на верных данных. Предупреждение, которое врёт по часам,
 * учит не читать предупреждения.
 *
 * ПОЧЕМУ НЕ ПОЯС КЛИНИКИ, ХОТЯ ОН ТОЧНЕЕ. Дата рождения находится в будущем
 * только если она в будущем ВЕЗДЕ, а не в поясе конкретной клиники. Сравнение с
 * максимальной датой на Земле (UTC+14) даёт это бесплатно и не требует тащить
 * пояс через четыре точки вызова `transformRow` в трёх файлах — из такого
 * протягивания в этом дереве уже рождались вторые источники истины: копий
 * `clinicTimeZone` набралось ТРИ, и одна из них подставляет пояс по умолчанию
 * вместо «неизвестно».
 *
 * ЧЕМ ЗА ЭТО ПЛАТИМ, честно. Клиника в поясе UTC−11 получает сутки запаса: дата,
 * которая для неё уже «завтра», предупреждения не вызовет. Проверка
 * НЕБЛОКИРУЮЩАЯ (`blocking: false`) и советует оператору посмотреть значение, а
 * не отвергает строку, поэтому сутки запаса в редком поясе дешевле гарантированно
 * ложного предупреждения каждую ночь во всех российских.
 */
export function latestCalendarDateOnEarth(now: Date): string {
	// Pacific/Kiritimati — UTC+14, самое раннее наступление новых суток в мире.
	// `en-CA` выбран потому, что даёт ровно YYYY-MM-DD без сборки строки руками.
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Pacific/Kiritimati",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(now);
}

function domainRuleIssues(
	entityKind: MigrationEntityKind,
	values: Record<string, unknown>,
): RowIssue[] {
	const issues: RowIssue[] = [];
	const today = latestCalendarDateOnEarth(new Date());

	if (entityKind === "patient") {
		const birthDate = values.birthDate as string | undefined;
		if (birthDate && birthDate > today) {
			issues.push({
				reason: "validation_failed",
				blocking: false,
				fieldPath: "birthDate",
				message: `Дата рождения ${birthDate} находится в будущем.`,
				suggestedFix:
					"Проверьте значение в источнике; поле перенесено как есть и требует исправления.",
			});
		}
	}

	if (entityKind === "appointment") {
		const startsAt = values.startsAt as string | undefined;
		const endsAt = values.endsAt as string | undefined;
		/**
		 * Формат хранения даты со временем сортируется лексикографически, поэтому
		 * сравнение строк корректно. Суффикс «Z» на сравнение внутри одной колонки
		 * не влияет: либо он есть у всех значений, либо ни у одного.
		 */
		if (startsAt && endsAt && endsAt < startsAt) {
			issues.push({
				reason: "validation_failed",
				blocking: false,
				fieldPath: "endsAt",
				message: `Окончание приёма (${endsAt}) раньше начала (${startsAt}).`,
				suggestedFix:
					"Окончание будет рассчитано по длительности приёма по умолчанию.",
			});
		}
	}

	if (entityKind === "payment") {
		const amount = values.amountRub as number | undefined;
		if (typeof amount === "number" && amount < 0) {
			/**
			 * Отрицательный платёж — это возврат. Он осмыслен, но в нашей модели
			 * возврат отдельная сущность, а не платёж с минусом, поэтому строка
			 * выносится на разбор человеку, а не пишется как есть.
			 */
			issues.push({
				reason: "validation_failed",
				blocking: true,
				fieldPath: "amountRub",
				message: `Сумма платежа отрицательная (${formatKopecksRu(parseKopecks(amount))}) — вероятно, это возврат.`,
				suggestedFix:
					"Возвраты переносятся отдельно. Подтвердите строку из карантина, если это действительно платёж.",
			});
		}
		const paidAt = values.paidAt as string | undefined;
		// Сравниваем календарную часть: платёж сегодня в 18:00 не «в будущем».
		if (paidAt && dateOnlyPart(paidAt) > today) {
			issues.push({
				reason: "validation_failed",
				blocking: false,
				fieldPath: "paidAt",
				message: `Дата платежа ${dateOnlyPart(paidAt)} находится в будущем.`,
				suggestedFix: "Значение перенесено как есть; проверьте источник.",
			});
		}
	}

	return issues;
}

/** Краткое описание строки для сообщений — без персональных данных. */
function _describeRowForOperator(
	profile: ColumnProfile[],
	row: string[],
): string {
	const parts = profile
		.slice(0, 3)
		.map(
			(column, index) =>
				`${column.name}=${truncateForMessage(row[index] ?? "", 20)}`,
		);
	return parts.join("; ");
}
