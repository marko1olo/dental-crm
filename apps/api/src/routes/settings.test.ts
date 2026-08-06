import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import type { FastifyReply } from "fastify";
import { clinicProfileMutationRejection } from "./settings.js";

/*
 * ПОЧЕМУ ТЕЛО ОТВЕТА ПРОВЕРЯЕТСЯ ПО ВОЗВРАЩЁННОМУ ЗНАЧЕНИЮ, А НЕ ПО ВЫЗОВУ
 * `reply.send`.
 *
 * `clinicProfileMutationRejection` больше не зовёт `send`: она ставит код и
 * ВОЗВРАЩАЕТ тело, а отправляет его fastify — уже после того, как разрешился
 * промис обработчика. Это не косметика. server.ts (хук onRoute) оборачивает
 * каждый обработчик в withTenantCtx, то есть в транзакцию, и ждёт разрешения
 * его промиса, чтобы зафиксировать её. `return reply.code(N).send(x)` возвращал
 * сам `reply`, а он thenable: `Reply.prototype.then` (fastify/lib/reply.js:466)
 * разрешается по `eos(reply.raw)` — когда ответ уже ушёл клиенту. COMMIT в
 * итоге уходил ПОСЛЕ ответа, а отказ на самом COMMIT fastify мог только
 * записать в журнал (lib/wrap-thenable.js:63), оставив клиенту 2xx при нуле
 * записанных строк.
 *
 * Проверяемое поведение прежнее: тот же код ответа, то же тело, те же машинные
 * коды и тексты. Изменился только способ, которым тело доходит до клиента,
 * поэтому заглушка ответа здесь оставлена, но снимает она теперь `code`, а тело
 * берётся из возврата.
 */
describe("clinicProfileMutationRejection", () => {
	let mockReply: Partial<FastifyReply>;
	let codeMock: ReturnType<typeof mock.fn>;

	beforeEach(() => {
		codeMock = mock.fn((_code: number) => mockReply as FastifyReply);
		mockReply = {
			code: codeMock as any,
		};
	});

	afterEach(() => {
		mock.restoreAll();
	});

	test("returns 409 and clinic_time_zone_invalid when error message includes часовой пояс", () => {
		const error = new Error("Неправильный часовой пояс.");
		const body = clinicProfileMutationRejection(mockReply as FastifyReply, error);

		assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 409);
		assert.deepStrictEqual(body, {
			error: "ClinicProfileMutationRejected",
			reason: "clinic_time_zone_invalid",
			message:
				"Профиль клиники не сохранен: выберите реальный часовой пояс клиники.",
		});
	});

	test("returns 409 and active_schedule_conflict when error message includes активная запись", () => {
		const error = new Error("Есть активная запись.");
		const body = clinicProfileMutationRejection(mockReply as FastifyReply, error);

		assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 409);
		assert.deepStrictEqual(body, {
			error: "ClinicProfileMutationRejected",
			reason: "active_schedule_conflict",
			message:
				"Профиль клиники не сохранен: активные записи должны оставаться в рабочем окне клиники.",
		});
	});

	test("returns 409 and active_schedule_conflict when error message includes активные записи", () => {
		const error = new Error("Есть активные записи.");
		const body = clinicProfileMutationRejection(mockReply as FastifyReply, error);

		assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 409);
		assert.deepStrictEqual(body, {
			error: "ClinicProfileMutationRejected",
			reason: "active_schedule_conflict",
			message:
				"Профиль клиники не сохранен: активные записи должны оставаться в рабочем окне клиники.",
		});
	});

	test("returns 409 and clinic_profile_rejected for other errors", () => {
		const error = new Error("Неизвестная ошибка.");
		const body = clinicProfileMutationRejection(mockReply as FastifyReply, error);

		assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 409);
		assert.deepStrictEqual(body, {
			error: "ClinicProfileMutationRejected",
			reason: "clinic_profile_rejected",
			message:
				"Профиль клиники не сохранен: проверьте профиль, расписание и активные записи клиники.",
		});
	});

	test("handles non-Error objects gracefully", () => {
		const error = "Just a string error";
		const body = clinicProfileMutationRejection(mockReply as FastifyReply, error);

		assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 409);
		assert.deepStrictEqual(body, {
			error: "ClinicProfileMutationRejected",
			reason: "clinic_profile_rejected",
			message:
				"Профиль клиники не сохранен: проверьте профиль, расписание и активные записи клиники.",
		});
	});
});
