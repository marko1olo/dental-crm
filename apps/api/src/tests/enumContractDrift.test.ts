import assert from "node:assert/strict";
import test from "node:test";
import {
	appointmentStatusSchema,
	communicationChannelSchema,
	communicationIntentSchema,
	communicationPrioritySchema,
	communicationStatusSchema,
	documentKindSchema,
	imagingStudyKindSchema,
	patientStatusSchema,
	paymentMethodSchema,
	paymentStatusSchema,
	treatmentPlanItemStatusSchema,
	visitStatusSchema
} from "@dental/shared";
import * as schema from "../db/schema.js";

/**
 * Расхождение между pgEnum в базе и z.enum в контракте — тихая потеря данных.
 *
 * ЧТО СЛУЧИЛОСЬ. В "communication_channel" восемь значений, включая vk и max;
 * в communicationChannelSchema их было шесть. routes/vk.ts и routes/max.ts
 * пишут задачи и события с этими каналами, база принимает их без возражений,
 * а db/domainStateHydration.ts прогоняет строки через safeParse и молча
 * отбрасывает непрошедшие (функция collect: `else skipped += 1`). Переписка во
 * «ВКонтакте» и MAX исчезала из рабочего кабинета, оставляя после себя одну
 * строку в отчёте о гидратации, которую никто не читает.
 *
 * НАПРАВЛЕНИЕ ПРОВЕРКИ. Каждое значение из базы обязано быть и в контракте.
 * Обратное допустимо: контракт может знать о значении, которого ещё нет в
 * pgEnum, — такие строки просто не появятся, а вот потерять существующие
 * нельзя.
 */

type EnumPair = {
	readonly name: string;
	readonly database: readonly string[];
	readonly contract: readonly string[];
};

// users.role объявлена как text, а не pgEnum, поэтому в список не входит:
// сверять там нечего, роль ничем не ограничена на уровне базы.
const pairs: readonly EnumPair[] = [
	{ name: "patient_status", database: schema.patientStatus.enumValues, contract: patientStatusSchema.options },
	{ name: "appointment_status", database: schema.appointmentStatus.enumValues, contract: appointmentStatusSchema.options },
	{ name: "visit_status", database: schema.visitStatus.enumValues, contract: visitStatusSchema.options },
	{ name: "document_kind", database: schema.documentKind.enumValues, contract: documentKindSchema.options },
	{ name: "payment_method", database: schema.paymentMethod.enumValues, contract: paymentMethodSchema.options },
	{ name: "payment_status", database: schema.paymentStatus.enumValues, contract: paymentStatusSchema.options },
	{
		name: "communication_channel",
		database: schema.communicationChannel.enumValues,
		contract: communicationChannelSchema.options
	},
	{
		name: "communication_intent",
		database: schema.communicationIntent.enumValues,
		contract: communicationIntentSchema.options
	},
	{
		name: "communication_status",
		database: schema.communicationStatus.enumValues,
		contract: communicationStatusSchema.options
	},
	{
		name: "communication_priority",
		database: schema.communicationPriority.enumValues,
		contract: communicationPrioritySchema.options
	},
	{ name: "imaging_study_kind", database: schema.imagingStudyKind.enumValues, contract: imagingStudyKindSchema.options },
	{
		name: "treatment_plan_item_status",
		database: schema.treatmentPlanItemStatus.enumValues,
		contract: treatmentPlanItemStatusSchema.options
	}
];

test("значения перечислений базы не теряются в контракте", () => {
	const drift: string[] = [];

	for (const pair of pairs) {
		const known = new Set(pair.contract);
		const missing = pair.database.filter((value) => !known.has(value));
		if (missing.length > 0) {
			drift.push(
				`${pair.name}: в базе есть ${missing.map((value) => `«${value}»`).join(", ")}, ` +
					"в контракте @dental/shared таких значений нет — такие строки будут молча отброшены при гидратации."
			);
		}
	}

	assert.deepEqual(drift, [], drift.join("\n"));
});

test("каждая пара перечислений непуста — проверка не выродилась", () => {
	// Если pgEnum переименуют, ссылка станет undefined и тест выше начнёт
	// «проходить» на пустом множестве. Здесь это ловится.
	for (const pair of pairs) {
		assert.ok(pair.database.length > 0, `${pair.name}: пустое перечисление в базе`);
		assert.ok(pair.contract.length > 0, `${pair.name}: пустое перечисление в контракте`);
	}
});

test("канал связи содержит vk и max — из-за их отсутствия терялась переписка", () => {
	assert.ok(communicationChannelSchema.options.includes("vk"));
	assert.ok(communicationChannelSchema.options.includes("max"));
});
