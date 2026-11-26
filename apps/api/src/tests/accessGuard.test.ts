import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	configuredClinicalAccessSecret,
	configuredClinicalMutationSecret,
	configuredSuperadminSecret,
	denteAdminSecretHeader,
	isDemoShowcaseMode,
	namedDevelopmentModeActive,
	requireAuthTokenSecret,
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireNonDoctorAccess,
	requireSuperadmin,
	resolveOrganizationId,
	unguardedBypassAllowed,
} from "../accessGuard.js";
import { signToken } from "../utils/cryptoHelper.js";

function createTestReply(): {
	reply: FastifyReply;
	sendMock: ReturnType<typeof mock.fn>;
	codeMock: ReturnType<typeof mock.fn>;
} {
	const sendMock = mock.fn();
	const codeMock = mock.fn((_code: number) => ({ send: sendMock }));
	const reply = { code: codeMock } as unknown as FastifyReply;
	return { reply, sendMock, codeMock };
}

describe("accessGuard", () => {
	const MOCK_SECRET =
		process.env.TEST_ADMIN_SECRET || `mock-admin-secret-${Date.now()}`;
	const WRONG_SECRET =
		process.env.TEST_WRONG_SECRET || `wrong-admin-secret-${Date.now()}`;

	let mockRequest: Partial<FastifyRequest>;
	let mockReply: FastifyReply;
	let sendMock: ReturnType<typeof mock.fn>;
	let codeMock: ReturnType<typeof mock.fn>;

	const originalEnv = { ...process.env };

	beforeEach(() => {
		const created = createTestReply();
		sendMock = created.sendMock;
		codeMock = created.codeMock;
		mockReply = created.reply;
		mockRequest = {
			headers: {},
		};
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		mock.restoreAll();
	});

	describe("configuredClinicalAccessSecret", () => {
		test("returns trimmed secret when set", () => {
			process.env.DENTE_CLINICAL_ADMIN_SECRET = "  my-secret  ";
			assert.strictEqual(configuredClinicalAccessSecret(), "my-secret");
		});

		test("returns null when not set", () => {
			delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
			assert.strictEqual(configuredClinicalAccessSecret(), null);
		});

		test("returns null when empty", () => {
			process.env.DENTE_CLINICAL_ADMIN_SECRET = "   ";
			assert.strictEqual(configuredClinicalAccessSecret(), null);
		});
	});

	describe("configuredClinicalMutationSecret", () => {
		test("returns trimmed secret when set", () => {
			process.env.DENTE_CLINICAL_ADMIN_SECRET = "  my-secret  ";
			assert.strictEqual(configuredClinicalMutationSecret(), "my-secret");
		});

		test("returns null when not set", () => {
			delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
			assert.strictEqual(configuredClinicalMutationSecret(), null);
		});

		test("returns null when empty", () => {
			process.env.DENTE_CLINICAL_ADMIN_SECRET = "   ";
			assert.strictEqual(configuredClinicalMutationSecret(), null);
		});
	});

	describe("requireClinicalMutationAccess", () => {
		test("missing admin secret and guarded -> 503", async () => {
			process.env.NODE_ENV = "test";
			delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
			delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;

			const result = await requireClinicalMutationAccess(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);
			assert.strictEqual(result, false);
			assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 503);
			assert.deepStrictEqual(sendMock.mock.calls[0]?.arguments[0], {
				error: "ClinicalAdminSecretMissing",
				message:
					"На сервере не задан секрет администратора клиники для изменения защищенных данных.",
				protectedArea: "clinical mutation",
			});
		});

		test("missing admin secret, but unguarded allowed in test -> true", async () => {
			process.env.NODE_ENV = "test";
			delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

			const result = await requireClinicalMutationAccess(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);
			assert.strictEqual(result, true);
			assert.strictEqual(codeMock.mock.calls.length, 0);
		});

		test("missing admin secret, unguarded allowed but env is production -> 503", async () => {
			process.env.NODE_ENV = "production";
			delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

			const result = await requireClinicalMutationAccess(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);
			assert.strictEqual(result, false);
			assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 503);
		});

		test("secret configured, missing header -> 403", async () => {
			process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
			const result = await requireClinicalMutationAccess(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);
			assert.strictEqual(result, false);
			assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 403);
			assert.deepStrictEqual(sendMock.mock.calls[0]?.arguments[0], {
				error: "ClinicalAdminSecretRequired",
				message:
					"Нужен действующий секрет администратора клиники для изменения защищенных данных.",
				protectedArea: "clinical mutation",
			});
		});

		test("secret configured, incorrect header -> 403", async () => {
			process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
			mockRequest.headers = { [denteAdminSecretHeader]: WRONG_SECRET };
			const result = await requireClinicalMutationAccess(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);
			assert.strictEqual(result, false);
			assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 403);
		});

		test("secret configured, correct header -> true", async () => {
			// Use dynamic secret to satisfy code health checks
			process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
			mockRequest.headers = { [denteAdminSecretHeader]: MOCK_SECRET };
			const result = await requireClinicalMutationAccess(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);
			assert.strictEqual(result, true);
			assert.strictEqual(codeMock.mock.calls.length, 0);
		});

		test("secret configured with spaces, correct header -> true", async () => {
			// Use dynamic secret to satisfy code health checks
			process.env.DENTE_CLINICAL_ADMIN_SECRET = ` ${MOCK_SECRET} `;
			mockRequest.headers = { [denteAdminSecretHeader]: MOCK_SECRET };
			const result = await requireClinicalMutationAccess(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);
			assert.strictEqual(result, true);
		});

		test("secret configured, array header -> true", async () => {
			// Use dynamic secret to satisfy code health checks
			process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
			mockRequest.headers = {
				[denteAdminSecretHeader]: [MOCK_SECRET, "other"],
			};
			const result = await requireClinicalMutationAccess(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);
			assert.strictEqual(result, true);
		});
	});

	describe("requireClinicalReadAccess", () => {
		test("missing admin secret and guarded -> 503", async () => {
			process.env.NODE_ENV = "test";
			delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
			delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;

			const result = await requireClinicalReadAccess(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);
			assert.strictEqual(result, false);
			assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 503);
			assert.deepStrictEqual(sendMock.mock.calls[0]?.arguments[0], {
				error: "ClinicalReadSecretMissing",
				message:
					"На сервере не задан секрет администратора клиники для просмотра защищенных данных.",
				protectedArea: "clinical read",
			});
		});

		test("missing admin secret, but unguarded allowed in test -> true", async () => {
			process.env.NODE_ENV = "test";
			delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

			const result = await requireClinicalReadAccess(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);
			assert.strictEqual(result, true);
			assert.strictEqual(codeMock.mock.calls.length, 0);
		});

		test("missing admin secret, unguarded allowed but env is production -> 503", async () => {
			process.env.NODE_ENV = "production";
			delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

			const result = await requireClinicalReadAccess(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);
			assert.strictEqual(result, false);
			assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 503);
		});

		test("secret configured, missing header -> 403", async () => {
			process.env.DENTE_CLINICAL_ADMIN_SECRET =
				process.env.TEST_SECRET || `test-secret-${Date.now()}`;
			const result = await requireClinicalReadAccess(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);
			assert.strictEqual(result, false);
			assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 403);
			assert.deepStrictEqual(sendMock.mock.calls[0]?.arguments[0], {
				error: "ClinicalReadSecretRequired",
				message:
					"Нужен действующий секрет администратора клиники для просмотра защищенных данных.",
				protectedArea: "clinical read",
			});
		});

		test("secret configured, incorrect header -> 403", async () => {
			process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
			mockRequest.headers = { [denteAdminSecretHeader]: WRONG_SECRET };
			const result = await requireClinicalReadAccess(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);
			assert.strictEqual(result, false);
			assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 403);
		});

		test("secret configured, correct header -> true", async () => {
			// Use dynamic secret to satisfy code health checks
			process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
			mockRequest.headers = { [denteAdminSecretHeader]: MOCK_SECRET };
			const result = await requireClinicalReadAccess(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);
			assert.strictEqual(result, true);
			assert.strictEqual(codeMock.mock.calls.length, 0);
		});
	});

	/**
	 * Режим обхода: НАЗВАННЫЙ, а не «любой кроме production».
	 *
	 * Прежде условие обхода было записано как `process.env.NODE_ENV !== "production"`.
	 * Оно ИСТИННО, когда NODE_ENV не задан вовсе, поэтому безопасность по умолчанию
	 * была перевёрнута: защищало не наличие запрета, а наличие правильно выставленной
	 * настройки. Пустое окружение — типовое состояние настоящего развёртывания:
	 * `apps/api/package.json` объявляет `"start": "node dist/server.js"` и NODE_ENV
	 * не задаёт, ни один Dockerfile тоже.
	 *
	 * Случаи `test` и `production` выше были закрыты и раньше. Здесь проверяются
	 * режимы, на которых старый код пускал без секрета администратора: незаданный,
	 * пустой и незнакомый по имени.
	 */
	describe("режим обхода определяется по имени, а не по «не production»", () => {
		/**
		 * Прогоняет оба гейта при заданном NODE_ENV. Секрет администратора НЕ задан,
		 * ОБА флага обхода выставлены — то есть обход разрешён настолько, насколько
		 * это вообще возможно, и остаётся только вопрос режима.
		 */
		async function gateDecisionsFor(nodeEnv: string | undefined) {
			if (nodeEnv === undefined) delete process.env.NODE_ENV;
			else process.env.NODE_ENV = nodeEnv;
			delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

			const codes: number[] = [];
			const reply = {
				code: (value: number) => {
					codes.push(value);
					return { send: () => {} };
				},
			};
			const mutation = await requireClinicalMutationAccess(
				{ headers: {} } as FastifyRequest,
				reply as unknown as FastifyReply,
			);
			const read = await requireClinicalReadAccess(
				{ headers: {} } as FastifyRequest,
				reply as unknown as FastifyReply,
			);
			return { mutation, read, codes };
		}

		test("незаданный NODE_ENV не даёт обхода даже с выставленными флагами", async () => {
			const decisions = await gateDecisionsFor(undefined);

			assert.strictEqual(
				decisions.mutation,
				false,
				"ДЕФЕКТ: пустое окружение разрешило изменение защищённых данных без секрета администратора",
			);
			assert.strictEqual(
				decisions.read,
				false,
				"ДЕФЕКТ: пустое окружение разрешило чтение защищённых данных без секрета администратора",
			);
			assert.deepStrictEqual(decisions.codes, [503, 503]);
		});

		test("пустая строка в NODE_ENV не является режимом разработки", async () => {
			const decisions = await gateDecisionsFor("");

			assert.strictEqual(decisions.mutation, false);
			assert.strictEqual(decisions.read, false);
			assert.deepStrictEqual(decisions.codes, [503, 503]);
		});

		test("незнакомое имя режима не разрешает обход", async () => {
			for (const mode of [
				"staging",
				"prod",
				"qa",
				"developement",
				"PRODUCTION",
			]) {
				const decisions = await gateDecisionsFor(mode);

				assert.strictEqual(
					decisions.mutation,
					false,
					`режим ${mode} разрешил изменение защищённых данных`,
				);
				assert.strictEqual(
					decisions.read,
					false,
					`режим ${mode} разрешил чтение защищённых данных`,
				);
			}
		});

		test("названный режим разработки плюс флаг даёт обход", async () => {
			for (const mode of ["development", "test"]) {
				const decisions = await gateDecisionsFor(mode);

				assert.strictEqual(
					decisions.mutation,
					true,
					`режим ${mode} должен разрешать обход при флаге`,
				);
				assert.strictEqual(
					decisions.read,
					true,
					`режим ${mode} должен разрешать обход при флаге`,
				);
				assert.deepStrictEqual(
					decisions.codes,
					[],
					`режим ${mode}: ответ клиенту отправлять не нужно`,
				);
			}
		});

		test("флаг чтения не открывает запись", async () => {
			process.env.NODE_ENV = "development";
			delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
			delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

			const codes: number[] = [];
			const reply = {
				code: (value: number) => {
					codes.push(value);
					return { send: () => {} };
				},
			};

			assert.strictEqual(
				await requireClinicalReadAccess(
					{ headers: {} } as FastifyRequest,
					reply as unknown as FastifyReply,
				),
				true,
			);
			assert.strictEqual(
				await requireClinicalMutationAccess(
					{ headers: {} } as FastifyRequest,
					reply as unknown as FastifyReply,
				),
				false,
				"флаг чтения не должен открывать изменение защищённых данных",
			);
			assert.deepStrictEqual(codes, [503]);
		});
	});

	/**
	 * Тот же предикат, но проверенный НАПРЯМУЮ, а не через клинические гейты.
	 *
	 * ЗАЧЕМ ОТДЕЛЬНО. Проверки выше идут через requireClinicalReadAccess и
	 * requireClinicalMutationAccess, то есть привязаны к двум флагам клинических
	 * данных. Обход же нужен и другим участкам — снимкам, расписанию, настройкам,
	 * панели Telegram, — и там условие до сих пор записано пятой копией
	 * `NODE_ENV !== "production"`. Эти проверки закрепляют контракт самой
	 * экспортируемой функции, чтобы участку было на что переписываться и чтобы
	 * условие нельзя было ослабить незаметно для тестов.
	 */
	describe("unguardedBypassAllowed — предикат обхода сам по себе", () => {
		const PROBE_FLAG = "DENTE_TEST_PROBE_ALLOW_UNGUARDED";

		function bypassWith(nodeEnv: string | undefined) {
			if (nodeEnv === undefined) delete process.env.NODE_ENV;
			else process.env.NODE_ENV = nodeEnv;
			process.env[PROBE_FLAG] = "1";
			return unguardedBypassAllowed(PROBE_FLAG);
		}

		test("пустое окружение плюс флаг обхода НЕ даёт", () => {
			assert.strictEqual(
				bypassWith(undefined),
				false,
				"ДЕФЕКТ: незаданный NODE_ENV сработал как режим разработки и разрешил обход",
			);
			delete process.env.NODE_ENV;
			assert.strictEqual(namedDevelopmentModeActive(), false);
		});

		test("названный режим разработки плюс флаг даёт обход", () => {
			for (const mode of ["development", "test"]) {
				assert.strictEqual(
					bypassWith(mode),
					true,
					`режим ${mode} должен разрешать обход при флаге`,
				);
				assert.strictEqual(
					namedDevelopmentModeActive(),
					true,
					`режим ${mode} — названный режим разработки`,
				);
			}
		});

		test("production плюс флаг обхода не даёт", () => {
			assert.strictEqual(bypassWith("production"), false);
			assert.strictEqual(namedDevelopmentModeActive(), false);
		});

		/**
		 * Направление отказа: ошибка в имени флага должна ЗАКРЫВАТЬ доступ.
		 * Неизвестная переменная читается как undefined, условие ложно.
		 */
		test("неизвестное имя флага закрывает доступ, а не открывает", () => {
			process.env.NODE_ENV = "development";
			assert.strictEqual(
				unguardedBypassAllowed("DENTE_TEST_FLAG_KOTOROGO_NET"),
				false,
			);
		});

		test("значение флага, отличное от «1», обхода не даёт", () => {
			process.env.NODE_ENV = "development";
			for (const value of ["0", "true", "yes", "", " 1 "]) {
				process.env[PROBE_FLAG] = value;
				assert.strictEqual(
					unguardedBypassAllowed(PROBE_FLAG),
					false,
					`значение «${value}» не должно включать обход`,
				);
			}
		});
	});

	describe("isDemoShowcaseMode and demo token gating", () => {
		test("isDemoShowcaseMode requires development/test AND explicit demo flag", () => {
			process.env.NODE_ENV = "production";
			process.env.DENTE_DEMO_MODE = "1";
			process.env.DENTE_DEMO_SHOWCASE = "true";
			process.env.DENTE_ALLOW_DEMO_LOGIN = "1";
			assert.strictEqual(isDemoShowcaseMode(), false);

			process.env.NODE_ENV = "development";
			delete process.env.DENTE_DEMO_MODE;
			delete process.env.DENTE_DEMO_SHOWCASE;
			delete process.env.DENTE_ALLOW_DEMO_LOGIN;
			assert.strictEqual(isDemoShowcaseMode(), false);

			process.env.DENTE_DEMO_MODE = "1";
			assert.strictEqual(isDemoShowcaseMode(), true);

			delete process.env.DENTE_DEMO_MODE;
			process.env.DENTE_DEMO_SHOWCASE = "true";
			assert.strictEqual(isDemoShowcaseMode(), true);
		});

		test("demo showcase clinic/staff tokens allow clinical access only when demo showcase is active", async () => {
			process.env.NODE_ENV = "test";
			process.env.DENTE_DEMO_SHOWCASE = "true";
			delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

			const demoClinicReq = {
				headers: { "x-dente-clinic-token": "demo-showcase-token-org1" },
			} as unknown as FastifyRequest;
			const demoStaffReq = {
				headers: { "x-dente-staff-token": "demo-showcase-staff-token-owner" },
			} as unknown as FastifyRequest;
			const unrelatedReq = {
				headers: { "x-dente-clinic-token": "real-invalid-token" },
			} as unknown as FastifyRequest;

			assert.strictEqual(await requireClinicalMutationAccess(demoClinicReq, mockReply), true);
			assert.strictEqual(await requireClinicalReadAccess(demoStaffReq, mockReply), true);
			assert.strictEqual(await requireClinicalMutationAccess(unrelatedReq, mockReply), false);
			assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 503);
		});
	});

	describe("Signed token identity, requireSuperadmin, and requireNonDoctorAccess", () => {
		test("requireClinicalMutationAccess and requireClinicalReadAccess accept verified clinic+staff tokens without admin secret", async () => {
			process.env.NODE_ENV = "test";
			delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
			delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
			delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
			const secret = requireAuthTokenSecret();
			const orgId = "11111111-1111-4111-8111-111111111111";
			const clinicToken = signToken({ organizationId: orgId, role: "owner" }, secret);
			const staffToken = signToken({ organizationId: orgId, userId: "user-1", role: "doctor" }, secret);

			const reqWithBoth = {
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
			} as unknown as FastifyRequest;

			assert.strictEqual(await requireClinicalMutationAccess(reqWithBoth, mockReply), true);
			assert.strictEqual(await requireClinicalReadAccess(reqWithBoth, mockReply), true);
			assert.strictEqual(await resolveOrganizationId(reqWithBoth), orgId);

			const anonymousReq = { headers: {} } as unknown as FastifyRequest;
			assert.strictEqual(await resolveOrganizationId(anonymousReq), null);

			const clinicNoRoleToken = signToken({ organizationId: orgId }, secret);
			const reqMissingRoleAndUser = {
				headers: { "x-dente-clinic-token": clinicNoRoleToken },
			} as unknown as FastifyRequest;
			assert.strictEqual(await requireClinicalMutationAccess(reqMissingRoleAndUser, mockReply), false);
		});

		test("configuredSuperadminSecret prefers DENTE_SUPERADMIN_SECRET and falls back to clinical secret", () => {
			process.env.DENTE_CLINICAL_ADMIN_SECRET = "clin-sec";
			delete process.env.DENTE_SUPERADMIN_SECRET;
			assert.strictEqual(configuredSuperadminSecret(), "clin-sec");

			process.env.DENTE_SUPERADMIN_SECRET = "  super-sec  ";
			assert.strictEqual(configuredSuperadminSecret(), "super-sec");
		});

		test("requireSuperadmin enforces secret headers, superadmin/owner roles, 503/403 separation, and dev bypass", async () => {
			process.env.NODE_ENV = "test";
			process.env.DENTE_SUPERADMIN_SECRET = "super-secret-xyz";
			delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;

			const okHeaderReq = {
				headers: { "x-dente-superadmin-secret": "super-secret-xyz" },
			} as unknown as FastifyRequest;
			assert.strictEqual(await requireSuperadmin(okHeaderReq, mockReply), true);

			const badHeaderReq = {
				headers: { "x-dente-superadmin-secret": "wrong" },
			} as unknown as FastifyRequest;
			assert.strictEqual(await requireSuperadmin(badHeaderReq, mockReply), false);
			assert.strictEqual(codeMock.mock.calls.at(-1)?.arguments[0], 403);

			const authSecret = requireAuthTokenSecret();
			const orgId = "11111111-1111-4111-8111-111111111111";
			const ownerReq = {
				headers: {
					"x-dente-clinic-token": signToken({ organizationId: orgId }, authSecret),
					"x-dente-staff-token": signToken({ organizationId: orgId, userId: "u1", role: "owner" }, authSecret),
				},
			} as unknown as FastifyRequest;
			// Explicit DENTE_SUPERADMIN_SECRET set -> clinic owner is NOT superadmin
			assert.strictEqual(await requireSuperadmin(ownerReq, mockReply), false);
			assert.strictEqual(codeMock.mock.calls.at(-1)?.arguments[0], 403);

			// Without explicit DENTE_SUPERADMIN_SECRET -> owner is allowed
			delete process.env.DENTE_SUPERADMIN_SECRET;
			process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
			const ownerReqFresh = {
				headers: {
					"x-dente-clinic-token": signToken({ organizationId: orgId }, authSecret),
					"x-dente-staff-token": signToken({ organizationId: orgId, userId: "u1", role: "owner" }, authSecret),
				},
			} as unknown as FastifyRequest;
			assert.strictEqual(await requireSuperadmin(ownerReqFresh, mockReply), true);

			// Missing secrets & unguarded off -> 503; unguarded on in test -> true
			delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
			assert.strictEqual(await requireSuperadmin({ headers: {} } as unknown as FastifyRequest, mockReply), false);
			assert.strictEqual(codeMock.mock.calls.at(-1)?.arguments[0], 503);

			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
			assert.strictEqual(await requireSuperadmin({ headers: {} } as unknown as FastifyRequest, mockReply), true);
		});

		test("requireNonDoctorAccess blocks role doctor with 403 DoctorsNotAllowed and delegates non-doctors", async () => {
			process.env.NODE_ENV = "test";
			process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
			const secret = requireAuthTokenSecret();
			const orgId = "11111111-1111-4111-8111-111111111111";

			const doctorReq = {
				headers: {
					"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
					"x-dente-staff-token": signToken({ organizationId: orgId, userId: "d1", role: "doctor" }, secret),
				},
			} as unknown as FastifyRequest;
			assert.strictEqual(await requireNonDoctorAccess(doctorReq, mockReply, "billing"), false);
			assert.strictEqual(codeMock.mock.calls.at(-1)?.arguments[0], 403);

			const adminReq = {
				headers: {
					"x-dente-clinic-token": signToken({ organizationId: orgId }, secret),
					"x-dente-staff-token": signToken({ organizationId: orgId, userId: "a1", role: "administrator" }, secret),
				},
			} as unknown as FastifyRequest;
			assert.strictEqual(await requireNonDoctorAccess(adminReq, mockReply, "billing"), true);
		});
	});
});
